export class StatsRepository {
  constructor(database) {
    this.database = database;
  }

  async getCompletionCounts(userId) {
    const result = await this.database.query(
      `SELECT
         COUNT(*) FILTER (WHERE l.status = 'completed')::integer AS total_completions,
         COUNT(*) FILTER (
           WHERE l.status = 'completed' AND l.cycle_number = 1
         )::integer AS completed_lessons,
         COUNT(*) FILTER (
           WHERE l.status = 'completed' AND l.cycle_number > 1
         )::integer AS review_completions
       FROM lessons l
       JOIN journeys j ON j.id = l.journey_id
       WHERE j.user_id = $1`,
      [userId],
    );

    return result.rows[0];
  }

  async getStudyActivity(userId) {
    const result = await this.database.query(
      `SELECT
         COALESCE(
           array_agg(to_char(sd.study_date, 'YYYY-MM-DD') ORDER BY sd.study_date DESC)
             FILTER (WHERE sd.study_date IS NOT NULL),
           ARRAY[]::text[]
         ) AS study_dates,
         COUNT(sd.id)::integer AS total_study_days,
         COUNT(sd.id) FILTER (
           WHERE sd.study_date >= (now() AT TIME ZONE u.timezone)::date - 6
         )::integer AS days_in_last_7,
         COUNT(sd.id) FILTER (
           WHERE sd.study_date >= (now() AT TIME ZONE u.timezone)::date - 29
         )::integer AS days_in_last_30,
         to_char((now() AT TIME ZONE u.timezone)::date, 'YYYY-MM-DD') AS current_date
       FROM users u
       LEFT JOIN study_days sd ON sd.user_id = u.id
       WHERE u.id = $1
       GROUP BY u.id, u.timezone`,
      [userId],
    );

    return (
      result.rows[0] ?? {
        study_dates: [],
        total_study_days: 0,
        days_in_last_7: 0,
        days_in_last_30: 0,
        current_date: null,
      }
    );
  }

  async getVocabularyCounts(userId) {
    const result = await this.database.query(
      `WITH completed_items AS (
         SELECT
           l.id AS lesson_id,
           lower(trim(item ->> 'text')) AS normalized_text
         FROM lessons l
         JOIN journeys j ON j.id = l.journey_id
         JOIN lesson_versions lv ON lv.id = l.active_version_id
         CROSS JOIN LATERAL jsonb_array_elements(
           COALESCE(lv.review_content -> 'vocabulary', '[]'::jsonb)
           || COALESCE(lv.review_content -> 'phrases', '[]'::jsonb)
         ) item
         WHERE j.user_id = $1
           AND l.status = 'completed'
           AND l.cycle_number = 1
       ), item_frequency AS (
         SELECT normalized_text, COUNT(DISTINCT lesson_id) AS lesson_count
         FROM completed_items
         WHERE normalized_text <> ''
         GROUP BY normalized_text
       )
       SELECT
         COUNT(*)::integer AS encountered_items,
         COUNT(*) FILTER (WHERE lesson_count >= 2)::integer AS repeated_items
       FROM item_frequency`,
      [userId],
    );

    return result.rows[0];
  }
}
