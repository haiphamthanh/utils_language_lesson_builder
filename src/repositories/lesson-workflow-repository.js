import { randomUUID } from 'node:crypto';

import { inTransaction } from '../db/transaction.js';
import { AppError } from '../http/errors.js';

export class LessonWorkflowRepository {
  constructor(database) {
    this.database = database;
  }

  async completeCurrent({ userId, lessonId, completedAt = new Date() }) {
    return inTransaction(this.database, async (client) => {
      const lessonResult = await client.query(
        `SELECT
           l.id,
           l.journey_id,
           l.sequence_number,
           l.cycle_number,
           l.status,
           l.is_locked,
           l.active_version_id,
           p.current_lesson_id,
           j.max_cycles,
           j.status AS journey_status,
           js.is_final_step,
           u.timezone
         FROM lessons l
         JOIN journeys j ON j.id = l.journey_id
         JOIN users u ON u.id = j.user_id
         JOIN journey_steps js ON js.id = l.journey_step_id
         JOIN user_journey_progress p
           ON p.journey_id = j.id AND p.user_id = j.user_id
         WHERE l.id = $1 AND j.user_id = $2
         FOR UPDATE OF l, j, p`,
        [lessonId, userId],
      );
      const lesson = lessonResult.rows[0];

      if (!lesson) {
        throw new AppError(404, 'LESSON_NOT_FOUND', 'The lesson was not found.');
      }

      if (lesson.status === 'completed') {
        return {
          alreadyCompleted: true,
          journeyCompleted: lesson.journey_status === 'completed',
          nextLessonId:
            lesson.current_lesson_id === lesson.id
              ? null
              : lesson.current_lesson_id,
          nextLessonNeedsGeneration: false,
        };
      }

      if (lesson.current_lesson_id !== lesson.id) {
        throw new AppError(
          409,
          'NOT_CURRENT_LESSON',
          'Only the current lesson can be completed.',
        );
      }

      if (lesson.status !== 'ready' || lesson.is_locked) {
        throw new AppError(
          409,
          'LESSON_NOT_READY',
          'Only a ready, unlocked lesson can be completed.',
        );
      }

      await client.query(
        `UPDATE lessons
         SET status = 'completed',
             is_locked = true,
             completed_at = $2,
             locked_at = $2,
             updated_at = $2
         WHERE id = $1`,
        [lesson.id, completedAt],
      );

      const cycleCompleted = lesson.is_final_step ? 1 : 0;
      await client.query(
        `INSERT INTO study_days
           (id, user_id, study_date, lessons_completed, cycles_completed,
            first_completed_at, last_completed_at)
         VALUES (
           $1,
           $2,
           ($3::timestamptz AT TIME ZONE $4)::date,
           1,
           $5,
           $3,
           $3
         )
         ON CONFLICT (user_id, study_date) DO UPDATE
         SET lessons_completed = study_days.lessons_completed + 1,
             cycles_completed = study_days.cycles_completed + EXCLUDED.cycles_completed,
             last_completed_at = EXCLUDED.last_completed_at,
             updated_at = EXCLUDED.last_completed_at`,
        [randomUUID(), userId, completedAt, lesson.timezone, cycleCompleted],
      );

      return this.#moveBookmark(client, lesson, userId, completedAt);
    });
  }

  async #moveBookmark(client, lesson, userId, completedAt) {
    if (lesson.is_final_step && lesson.cycle_number >= lesson.max_cycles) {
      await client.query(
        `UPDATE journeys
         SET status = 'completed', completed_at = $2, updated_at = $2
         WHERE id = $1`,
        [lesson.journey_id, completedAt],
      );
      return {
        alreadyCompleted: false,
        journeyCompleted: true,
        nextLessonId: null,
        nextLessonNeedsGeneration: false,
      };
    }

    const nextCycle = lesson.is_final_step
      ? lesson.cycle_number + 1
      : lesson.cycle_number;
    const nextSequence = lesson.is_final_step
      ? 1
      : lesson.sequence_number + 1;
    const stepResult = await client.query(
      `SELECT id
       FROM journey_steps
       WHERE journey_id = $1 AND sequence_number = $2`,
      [lesson.journey_id, nextSequence],
    );
    const nextStep = stepResult.rows[0];

    if (!nextStep) {
      throw new AppError(
        409,
        'JOURNEY_STEP_MISSING',
        'The next journey step has not been planned.',
      );
    }

    const nextLessonId = randomUUID();
    const isReviewCycle = nextCycle > 1;
    let sourceLesson = null;

    if (isReviewCycle) {
      const sourceResult = await client.query(
        `SELECT id, active_version_id
         FROM lessons
         WHERE journey_id = $1
           AND sequence_number = $2
           AND cycle_number = 1
           AND status = 'completed'`,
        [lesson.journey_id, nextSequence],
      );
      sourceLesson = sourceResult.rows[0];

      if (!sourceLesson) {
        throw new AppError(
          409,
          'REVIEW_SOURCE_MISSING',
          'The locked source lesson for this review is missing.',
        );
      }
    }

    await client.query(
      `INSERT INTO lessons
         (id, journey_id, journey_step_id, sequence_number, cycle_number,
          status, active_version_id, previous_lesson_id, source_lesson_id,
          generated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        nextLessonId,
        lesson.journey_id,
        nextStep.id,
        nextSequence,
        nextCycle,
        isReviewCycle ? 'ready' : 'draft',
        sourceLesson?.active_version_id ?? null,
        lesson.id,
        sourceLesson?.id ?? null,
        isReviewCycle ? completedAt : null,
      ],
    );

    await client.query(
      `UPDATE user_journey_progress
       SET current_lesson_id = $3,
           current_step_number = $4,
           current_cycle = $5,
           last_opened_at = $6,
           updated_at = $6
       WHERE user_id = $1 AND journey_id = $2`,
      [userId, lesson.journey_id, nextLessonId, nextSequence, nextCycle, completedAt],
    );

    if (isReviewCycle) {
      await client.query(
        `UPDATE journeys
         SET status = 'reviewing', updated_at = $2
         WHERE id = $1`,
        [lesson.journey_id, completedAt],
      );
    }

    return {
      alreadyCompleted: false,
      journeyCompleted: false,
      nextLessonId,
      nextLessonNeedsGeneration: !isReviewCycle,
    };
  }

  async claimForGeneration({ userId, lessonId }) {
    const result = await this.database.query(
      `UPDATE lessons l
       SET status = 'generating', updated_at = now()
       FROM journeys j,
            journey_steps js,
            user_journey_progress p
       WHERE l.id = $1
         AND l.journey_id = j.id
         AND l.journey_step_id = js.id
         AND p.journey_id = j.id
         AND p.user_id = j.user_id
         AND p.current_lesson_id = l.id
         AND j.user_id = $2
         AND l.status IN ('draft', 'failed')
       RETURNING
         l.id,
         l.sequence_number,
         j.language,
         j.level,
         j.title AS journey_title,
         js.title AS step_title,
         js.objective`,
      [lessonId, userId],
    );

    if (!result.rows[0]) {
      throw new AppError(
        409,
        'LESSON_NOT_GENERATABLE',
        'The lesson cannot be generated in its current state.',
      );
    }

    return result.rows[0];
  }

  async finishGeneration(lessonId, generatedLesson) {
    return inTransaction(this.database, async (client) => {
      const lessonResult = await client.query(
        `SELECT id
         FROM lessons
         WHERE id = $1 AND status = 'generating'
         FOR UPDATE`,
        [lessonId],
      );

      if (!lessonResult.rows[0]) {
        throw new AppError(
          409,
          'GENERATION_STATE_CHANGED',
          'The lesson generation state changed before it could be saved.',
        );
      }

      const versionResult = await client.query(
        `SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version
         FROM lesson_versions
         WHERE lesson_id = $1`,
        [lessonId],
      );
      const versionId = randomUUID();

      await client.query(
        `INSERT INTO lesson_versions
           (id, lesson_id, version_number, title, content, summary,
            review_content, prompt_version, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, true)`,
        [
          versionId,
          lessonId,
          versionResult.rows[0].next_version,
          generatedLesson.title,
          generatedLesson.content,
          generatedLesson.summary,
          JSON.stringify(generatedLesson.review),
          generatedLesson.promptVersion,
        ],
      );
      await client.query(
        `UPDATE lessons
         SET status = 'ready',
             active_version_id = $2,
             generated_at = now(),
             updated_at = now()
         WHERE id = $1`,
        [lessonId, versionId],
      );

      return versionId;
    });
  }

  async failGeneration(lessonId) {
    await this.database.query(
      `UPDATE lessons
       SET status = 'failed', updated_at = now()
       WHERE id = $1 AND status = 'generating'`,
      [lessonId],
    );
  }

  async claimForRegeneration({ userId, lessonId }) {
    return inTransaction(this.database, async (client) => {
      const result = await client.query(
        `SELECT
           l.id,
           l.status,
           l.is_locked,
           l.cycle_number,
           l.sequence_number,
           l.active_version_id,
           p.current_lesson_id,
           j.id AS journey_id,
           j.language,
           j.level,
           j.title AS journey_title,
           js.title AS step_title,
           js.objective,
           lv.version_number
         FROM lessons l
         JOIN journeys j ON j.id = l.journey_id
         JOIN journey_steps js ON js.id = l.journey_step_id
         JOIN user_journey_progress p
           ON p.journey_id = j.id AND p.user_id = j.user_id
         JOIN lesson_versions lv ON lv.id = l.active_version_id
         WHERE l.id = $1 AND j.user_id = $2
         FOR UPDATE OF l`,
        [lessonId, userId],
      );
      const lesson = result.rows[0];

      if (!lesson) {
        throw new AppError(404, 'LESSON_NOT_FOUND', 'The lesson was not found.');
      }
      if (lesson.status === 'completed' || lesson.is_locked) {
        throw new AppError(
          403,
          'LESSON_LOCKED',
          'Completed lessons cannot be regenerated.',
        );
      }
      if (lesson.current_lesson_id !== lesson.id) {
        throw new AppError(
          403,
          'NOT_CURRENT_LESSON',
          'Only the current lesson can be regenerated.',
        );
      }
      if (lesson.cycle_number !== 1) {
        throw new AppError(
          403,
          'REVIEW_LESSON_LOCKED',
          'Review-cycle lessons reuse locked content and cannot be regenerated.',
        );
      }
      if (lesson.status !== 'ready') {
        throw new AppError(
          409,
          'LESSON_NOT_READY',
          'The lesson is not ready to be regenerated.',
        );
      }

      const requestId = randomUUID();
      const context = {
        ...lesson,
        request_type: 'regenerate',
        next_version_number: lesson.version_number + 1,
      };

      await client.query(
        `UPDATE lessons
         SET status = 'generating', updated_at = now()
         WHERE id = $1`,
        [lesson.id],
      );
      await client.query(
        `INSERT INTO ai_generation_requests
           (id, user_id, journey_id, lesson_id, request_type, prompt_version,
            input_context, status)
         VALUES ($1, $2, $3, $4, 'regenerate', 'sample-v1', $5::jsonb, 'pending')`,
        [
          requestId,
          userId,
          lesson.journey_id,
          lesson.id,
          JSON.stringify({
            language: lesson.language,
            level: lesson.level,
            journeyTitle: lesson.journey_title,
            stepTitle: lesson.step_title,
            objective: lesson.objective,
            sequenceNumber: lesson.sequence_number,
            previousVersionNumber: lesson.version_number,
          }),
        ],
      );

      return { requestId, context };
    });
  }

  async finishRegeneration({ lessonId, requestId, generatedLesson }) {
    return inTransaction(this.database, async (client) => {
      const lessonResult = await client.query(
        `SELECT id
         FROM lessons
         WHERE id = $1 AND status = 'generating'
         FOR UPDATE`,
        [lessonId],
      );

      if (!lessonResult.rows[0]) {
        throw new AppError(
          409,
          'GENERATION_STATE_CHANGED',
          'The lesson generation state changed before it could be saved.',
        );
      }

      const versionResult = await client.query(
        `SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version
         FROM lesson_versions
         WHERE lesson_id = $1`,
        [lessonId],
      );
      const versionId = randomUUID();

      await client.query(
        `UPDATE lesson_versions SET is_active = false
         WHERE lesson_id = $1 AND is_active = true`,
        [lessonId],
      );
      await client.query(
        `INSERT INTO lesson_versions
           (id, lesson_id, version_number, title, content, summary,
            review_content, prompt_version, generation_request_id, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, true)`,
        [
          versionId,
          lessonId,
          versionResult.rows[0].next_version,
          generatedLesson.title,
          generatedLesson.content,
          generatedLesson.summary,
          JSON.stringify(generatedLesson.review),
          generatedLesson.promptVersion,
          requestId,
        ],
      );
      await client.query(
        `UPDATE lessons
         SET status = 'ready',
             active_version_id = $2,
             generated_at = now(),
             updated_at = now()
         WHERE id = $1`,
        [lessonId, versionId],
      );
      await client.query(
        `UPDATE ai_generation_requests
         SET status = 'success',
             output_payload = $2::jsonb,
             completed_at = now()
         WHERE id = $1 AND status = 'pending'`,
        [requestId, JSON.stringify(generatedLesson)],
      );

      return versionId;
    });
  }

  async failRegeneration({ lessonId, requestId, error }) {
    await inTransaction(this.database, async (client) => {
      await client.query(
        `UPDATE lessons
         SET status = 'ready', updated_at = now()
         WHERE id = $1 AND status = 'generating'`,
        [lessonId],
      );
      await client.query(
        `UPDATE ai_generation_requests
         SET status = 'failed', error_message = $2, completed_at = now()
         WHERE id = $1 AND status = 'pending'`,
        [requestId, error.message.slice(0, 2_000)],
      );
    });
  }
}
