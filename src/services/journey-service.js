import { AppError } from '../http/errors.js';

export class JourneyService {
  constructor({ journeyRepository, currentLessonService }) {
    this.journeyRepository = journeyRepository;
    this.currentLessonService = currentLessonService;
  }

  async listForUser(userId) {
    const rows = await this.journeyRepository.listForUser(userId);

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      language: row.language,
      level: row.level,
      status: row.status,
      plannedLessonCount: row.planned_lesson_count,
      maxCycles: row.max_cycles,
      currentLesson: row.current_lesson_id
        ? {
            id: row.current_lesson_id,
            title: row.current_lesson_title,
            sequenceNumber: row.current_lesson_sequence,
            cycleNumber: row.current_lesson_cycle,
            status: row.current_lesson_status,
          }
        : null,
      completedLessons: row.completed_lessons,
      totalLessons: row.planned_lesson_count * row.max_cycles,
      lastOpenedAt: row.last_opened_at,
      completedAt: row.completed_at,
    }));
  }

  async openForUser({ userId, journeyId }) {
    const journey = await this.journeyRepository.findByIdForUser({
      userId,
      journeyId,
    });

    if (!journey) {
      throw new AppError(404, 'JOURNEY_NOT_FOUND', 'The journey was not found.');
    }

    const summary = {
      id: journey.id,
      title: journey.title,
      description: journey.description,
      language: journey.language,
      level: journey.level,
    };

    if (journey.status === 'completed') {
      await this.journeyRepository.touch({ userId, journeyId });
      return {
        journeyCompleted: true,
        journey: summary,
        lesson: null,
      };
    }

    await this.journeyRepository.reactivate({ userId, journeyId });
    const lesson = await this.currentLessonService.getForUser(userId);

    return {
      journeyCompleted: false,
      journey: summary,
      lesson,
    };
  }
}
