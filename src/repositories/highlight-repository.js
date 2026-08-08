import { randomUUID } from 'node:crypto';

import { AppError } from '../http/errors.js';

export class HighlightRepository {
  constructor(database) {
    this.database = database;
  }

  async listByLesson({ userId, lessonId }) {
    const result = await this.database.query(
      `SELECT h.id, h.lesson_id, h.paragraph_index, h.start_offset,
              h.end_offset, h.text, h.comment, h.created_at, h.updated_at
       FROM lesson_highlights h
       JOIN lessons l ON l.id = h.lesson_id
       JOIN journeys j ON j.id = l.journey_id
       WHERE l.id = $1 AND j.user_id = $2
       ORDER BY h.paragraph_index, h.start_offset, h.created_at`,
      [lessonId, userId],
    );

    return result.rows.map((row) => this.#toView(row));
  }

  async create({
    userId,
    lessonId,
    paragraphIndex,
    startOffset,
    endOffset,
    text,
    comment,
  }) {
    const ownership = await this.#ownsLesson(userId, lessonId);
    if (!ownership) {
      throw new AppError(404, 'LESSON_NOT_FOUND', 'The lesson was not found.');
    }

    const id = randomUUID();
    await this.database.query(
      `INSERT INTO lesson_highlights
         (id, lesson_id, paragraph_index, start_offset, end_offset, text, comment)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, lessonId, paragraphIndex, startOffset, endOffset, text, comment ?? ''],
    );

    return this.#findById(id);
  }

  async updateComment({ userId, highlightId, comment }) {
    const result = await this.database.query(
      `UPDATE lesson_highlights h
       SET comment = $3, updated_at = now()
       FROM lessons l
       JOIN journeys j ON j.id = l.journey_id
       WHERE h.id = $1
         AND h.lesson_id = l.id
         AND j.user_id = $2
       RETURNING h.*`,
      [highlightId, userId, comment ?? ''],
    );

    if (!result.rows[0]) {
      throw new AppError(404, 'HIGHLIGHT_NOT_FOUND', 'The highlight was not found.');
    }

    return this.#toView(result.rows[0]);
  }

  async delete({ userId, highlightId }) {
    const result = await this.database.query(
      `DELETE FROM lesson_highlights h
       USING lessons l
       JOIN journeys j ON j.id = l.journey_id
       WHERE h.id = $1
         AND h.lesson_id = l.id
         AND j.user_id = $2
       RETURNING h.id`,
      [highlightId, userId],
    );

    if (!result.rows[0]) {
      throw new AppError(404, 'HIGHLIGHT_NOT_FOUND', 'The highlight was not found.');
    }
  }

  async findActiveContent({ userId, lessonId }) {
    const result = await this.database.query(
      `SELECT lv.content
       FROM lessons l
       JOIN journeys j ON j.id = l.journey_id
       JOIN lesson_versions lv ON lv.id = l.active_version_id
       WHERE l.id = $1 AND j.user_id = $2`,
      [lessonId, userId],
    );

    return result.rows[0]?.content ?? null;
  }

  async #ownsLesson(userId, lessonId) {
    const result = await this.database.query(
      `SELECT 1
       FROM lessons l
       JOIN journeys j ON j.id = l.journey_id
       WHERE l.id = $1 AND j.user_id = $2`,
      [lessonId, userId],
    );

    return result.rows.length > 0;
  }

  async #findById(id) {
    const result = await this.database.query(
      `SELECT id, lesson_id, paragraph_index, start_offset, end_offset,
              text, comment, created_at, updated_at
       FROM lesson_highlights
       WHERE id = $1`,
      [id],
    );

    return result.rows[0] ? this.#toView(result.rows[0]) : null;
  }

  #toView(row) {
    return {
      id: row.id,
      lessonId: row.lesson_id,
      paragraphIndex: row.paragraph_index,
      startOffset: row.start_offset,
      endOffset: row.end_offset,
      text: row.text,
      comment: row.comment,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
