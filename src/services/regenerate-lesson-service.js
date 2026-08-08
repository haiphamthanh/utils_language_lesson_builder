import { validateGeneratedLesson } from '../domain/generated-lesson.js';

export class RegenerateLessonService {
  constructor(
    workflowRepository,
    generator,
    currentLessonService,
    generationStateRepository,
  ) {
    this.workflowRepository = workflowRepository;
    this.generator = generator;
    this.currentLessonService = currentLessonService;
    this.generationStateRepository = generationStateRepository;
  }

  async regenerateForUser({ userId, lessonId }) {
    await this.generationStateRepository.begin({
      userId,
      requestType: 'regeneration',
    });

    try {
      const { requestId, context } =
        await this.workflowRepository.claimForRegeneration({
          userId,
          lessonId,
          promptVersion: this.generator.promptVersion,
        });

      try {
        const generatedLesson = validateGeneratedLesson(
          await this.generator.generate(context),
        );
        await this.workflowRepository.finishRegeneration({
          lessonId,
          requestId,
          generatedLesson,
        });
      } catch (error) {
        await this.workflowRepository.failRegeneration({
          lessonId,
          requestId,
          error,
        });
        throw error;
      }

      return this.currentLessonService.getForUser(userId);
    } finally {
      await this.generationStateRepository.finish({ userId });
    }
  }
}
