import { AppError } from '../http/errors.js';
import { inTransaction } from '../db/transaction.js';

const STALE_AFTER_MS = 10 * 60 * 1000;

export class GenerationStateRepository {
  constructor(database) {
    this.database = database;
  }

  async getForUser(userId) {
    const result = await this.database.query(
      `SELECT request_type, started_at
       FROM user_generation_state
       WHERE user_id = $1
         AND started_at > now() - ($2::int || ' milliseconds')::interval`,
      [userId, STALE_AFTER_MS],
    );
    const state = result.rows[0] ?? null;

    if (!state) {
      await this.database.query(
        `DELETE FROM user_generation_state WHERE user_id = $1`,
        [userId],
      );
    }

    return state;
  }

  async begin({ userId, requestType }) {
    return inTransaction(this.database, async (client) => {
      await client.query(
        `DELETE FROM user_generation_state
         WHERE user_id = $1
           AND started_at < now() - ($2::int || ' milliseconds')::interval`,
        [userId, STALE_AFTER_MS],
      );

      const result = await client.query(
        `INSERT INTO user_generation_state (user_id, request_type)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId, requestType],
      );

      if (result.rowCount === 0) {
        throw new AppError(
          409,
          'GENERATION_IN_PROGRESS',
          'Another generation is already running for this learner.',
        );
      }
    });
  }

  async finish({ userId }) {
    await this.database.query(
      `DELETE FROM user_generation_state WHERE user_id = $1`,
      [userId],
    );
  }
}
