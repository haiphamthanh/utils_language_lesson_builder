export class LessonRepository {
  constructor(database) {
    this.database = database;
  }

  async findCurrentStateByUserId(userId) {
    const result = await this.database.query(
      `SELECT l.id, l.status
       FROM user_journey_progress p
       JOIN journeys j ON j.id = p.journey_id
       JOIN lessons l ON l.id = p.current_lesson_id
       WHERE p.user_id = $1
         AND j.status IN ('active', 'reviewing')
       ORDER BY p.last_opened_at DESC
       LIMIT 1`,
      [userId],
    );

    return result.rows[0] ?? null;
  }

  async findCurrentByUserId(userId) {
    const result = await this.database.query(
      `SELECT
         l.id,
         l.sequence_number,
         l.cycle_number,
         l.status,
         l.is_locked,
         l.completed_at,
         lv.title,
         lv.content,
         lv.summary,
         lv.review_content,
         lv.version_number,
         j.id AS journey_id,
         j.title AS journey_title,
         j.language,
         j.level,
         j.planned_lesson_count,
         js.objective
       FROM user_journey_progress p
       JOIN journeys j ON j.id = p.journey_id
       JOIN lessons l ON l.id = p.current_lesson_id
       JOIN journey_steps js ON js.id = l.journey_step_id
       JOIN lesson_versions lv ON lv.id = l.active_version_id
       WHERE p.user_id = $1
         AND j.status IN ('active', 'reviewing')
       ORDER BY p.last_opened_at DESC
       LIMIT 1`,
      [userId],
    );

    return result.rows[0] ?? null;
  }
}
