import { validateGeneratedJourney } from '../domain/generated-journey.js';
import { AppError } from '../http/errors.js';

export class CreateJourneyService {
  constructor({
    topicRepository,
    journeyRepository,
    journeyGenerator,
    lessonGenerationService,
    currentLessonService,
  }) {
    this.topicRepository = topicRepository;
    this.journeyRepository = journeyRepository;
    this.journeyGenerator = journeyGenerator;
    this.lessonGenerationService = lessonGenerationService;
    this.currentLessonService = currentLessonService;
  }

  async createForUser({ userId, topicId, language, level }) {
    if (!topicId || !language || !level) {
      throw new AppError(
        400,
        'INVALID_JOURNEY_REQUEST',
        'A topic, language, and level are required to create a journey.',
      );
    }

    const topic = await this.topicRepository.findById(topicId);
    if (!topic) {
      throw new AppError(404, 'TOPIC_NOT_FOUND', 'The selected topic was not found.');
    }

    const outline = validateGeneratedJourney(
      await this.journeyGenerator.generate({
        topic: { name: topic.name, description: topic.description },
        language,
        level,
      }),
    );

    const { lessonId } = await this.journeyRepository.create({
      userId,
      topic,
      language,
      level,
      outline,
    });

    await this.lessonGenerationService.generateForUser({ userId, lessonId });

    return this.currentLessonService.getForUser(userId);
  }
}
