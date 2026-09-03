import { randomUUID } from 'node:crypto';

import { inTransaction } from '../db/transaction.js';

export class JourneyRepository {
  constructor(database) {
    this.database = database;
  }

  async create({ userId, topic, language, level, outline }) {
    return inTransaction(this.database, async (client) => {
      const journeyId = randomUUID();
      const progressId = randomUUID();
      const lessonId = randomUUID();
      const stepIds = outline.steps.map(() => randomUUID());

      await client.query(
        `UPDATE journeys
         SET status = 'paused', updated_at = now()
         WHERE user_id = $1 AND status IN ('active', 'reviewing')`,
        [userId],
      );

      await client.query(
        `INSERT INTO journeys
           (id, user_id, topic_id, language, level, title, description, status,
            max_cycles, planned_lesson_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', 2, $8)`,
        [
          journeyId,
          userId,
          topic.id,
          language,
          level,
          outline.title,
          outline.description,
          outline.steps.length,
        ],
      );

      for (const [index, step] of outline.steps.entries()) {
        const isFinal = index === outline.steps.length - 1;
        await client.query(
          `INSERT INTO journey_steps
             (id, journey_id, sequence_number, title, objective,
              continuation_hint, is_final_step)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            stepIds[index],
            journeyId,
            index + 1,
            step.title,
            step.objective,
            step.continuation_hint,
            isFinal,
          ],
        );
      }

      await client.query(
        `INSERT INTO lessons
           (id, journey_id, journey_step_id, sequence_number, cycle_number,
            status, generated_at)
         VALUES ($1, $2, $3, 1, 1, 'draft', NULL)`,
        [lessonId, journeyId, stepIds[0]],
      );

      await client.query(
        `INSERT INTO user_journey_progress
           (id, user_id, journey_id, current_lesson_id, current_step_number, current_cycle)
         VALUES ($1, $2, $3, $4, 1, 1)`,
        [progressId, userId, journeyId, lessonId],
      );

      return { journeyId, lessonId };
    });
  }

  async listForUser(userId) {
    const result = await this.database.query(
      `SELECT
         j.id,
         j.language,
         j.level,
         j.title,
         j.description,
         j.status,
         j.max_cycles,
         j.planned_lesson_count,
         j.started_at,
         j.completed_at,
         j.updated_at,
         p.current_lesson_id,
         p.last_opened_at,
         lv.title AS current_lesson_title,
         l.status AS current_lesson_status,
         l.sequence_number AS current_lesson_sequence,
         l.cycle_number AS current_lesson_cycle,
         (SELECT COUNT(*)::integer
          FROM lessons cl
          WHERE cl.journey_id = j.id AND cl.status = 'completed') AS completed_lessons
       FROM journeys j
       JOIN user_journey_progress p
         ON p.journey_id = j.id AND p.user_id = j.user_id
       LEFT JOIN lessons l ON l.id = p.current_lesson_id
       LEFT JOIN lesson_versions lv ON lv.id = l.active_version_id
       WHERE j.user_id = $1
       ORDER BY
         CASE j.language
           WHEN 'Japanese' THEN 1
           WHEN 'English' THEN 2
           WHEN 'Chinese' THEN 3
           ELSE 4
         END,
         j.created_at ASC`,
      [userId],
    );

    return result.rows;
  }

  async findByIdForUser({ userId, journeyId }) {
    const result = await this.database.query(
      `SELECT id, title, description, language, level, status, max_cycles, planned_lesson_count
       FROM journeys
       WHERE id = $1 AND user_id = $2`,
      [journeyId, userId],
    );

    return result.rows[0] ?? null;
  }

  async reactivate({ userId, journeyId, openedAt = new Date() }) {
    return inTransaction(this.database, async (client) => {
      await client.query(
        `UPDATE journeys
         SET status = 'paused', updated_at = now()
         WHERE user_id = $1 AND status IN ('active', 'reviewing') AND id <> $2`,
        [userId, journeyId],
      );

      await client.query(
        `UPDATE journeys
         SET status = 'active', updated_at = now()
         WHERE id = $1 AND user_id = $2 AND status = 'paused'`,
        [journeyId, userId],
      );

      await client.query(
        `UPDATE user_journey_progress
         SET last_opened_at = $3, updated_at = $3
         WHERE user_id = $1 AND journey_id = $2`,
        [userId, journeyId, openedAt],
      );
    });
  }

  async touch({ userId, journeyId, openedAt = new Date() }) {
    return inTransaction(this.database, async (client) => {
      await client.query(
        `UPDATE user_journey_progress
         SET last_opened_at = $3, updated_at = $3
         WHERE user_id = $1 AND journey_id = $2`,
        [userId, journeyId, openedAt],
      );
    });
  }
}
