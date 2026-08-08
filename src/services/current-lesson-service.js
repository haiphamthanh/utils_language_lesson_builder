import { AppError } from '../http/errors.js';

export class CurrentLessonService {
  constructor(lessonRepository) {
    this.lessonRepository = lessonRepository;
  }

  async getForUser(userId) {
    const lesson = await this.lessonRepository.findCurrentByUserId(userId);

    if (!lesson) {
      throw new AppError(
        404,
        'CURRENT_LESSON_NOT_FOUND',
        'No active lesson was found for this learner.',
      );
    }

    return this.#toView(lesson, true);
  }

  async getByIdForUser({ userId, lessonId }) {
    const lesson = await this.lessonRepository.findViewableById({
      userId,
      lessonId,
    });

    if (!lesson) {
      throw new AppError(
        404,
        'LESSON_NOT_FOUND',
        'The lesson was not found or is not available to this learner.',
      );
    }

    return this.#toView(lesson, lesson.is_current);
  }

  async getHistoryForUser(userId) {
    const lessons = await this.lessonRepository.findCompletedHistoryByUserId(
      userId,
    );

    return lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      sequenceNumber: lesson.sequence_number,
      cycleNumber: lesson.cycle_number,
      completedAt: lesson.completed_at,
    }));
  }

  #toView(lesson, isCurrent) {
    return {
      id: lesson.id,
      isCurrent,
      status: lesson.status,
      isLocked: lesson.is_locked,
      completedAt: lesson.completed_at,
      sequenceNumber: lesson.sequence_number,
      cycleNumber: lesson.cycle_number,
      title: lesson.title,
      content: lesson.content,
      summary: lesson.summary,
      objective: lesson.objective,
      review: lesson.review_content,
      versionNumber: lesson.version_number,
      journey: {
        id: lesson.journey_id,
        title: lesson.journey_title,
        language: lesson.language,
        level: lesson.level,
        plannedLessonCount: lesson.planned_lesson_count,
      },
    };
  }
}
