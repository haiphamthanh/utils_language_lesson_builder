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
           (id, user_id, topic_id, language, level, title, status,
            max_cycles, planned_lesson_count)
         VALUES ($1, $2, $3, $4, $5, $6, 'active', 2, $7)`,
        [journeyId, userId, topic.id, language, level, outline.title, outline.steps.length],
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
}
