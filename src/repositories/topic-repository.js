export class TopicRepository {
  constructor(database) {
    this.database = database;
  }

  async findById(id) {
    const result = await this.database.query(
      `SELECT id, name, slug, description, language_scope
       FROM topics
       WHERE id = $1`,
      [id],
    );

    return result.rows[0] ?? null;
  }

  async listAvailable(userId) {
    const result = await this.database.query(
      `SELECT id, name, slug, description, language_scope
       FROM topics
       WHERE is_system = true OR created_by_user_id = $1
       ORDER BY name`,
      [userId],
    );

    return result.rows;
  }
}
