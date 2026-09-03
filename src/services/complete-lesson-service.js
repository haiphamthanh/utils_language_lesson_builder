export class CompleteLessonService {
  constructor(
    workflowRepository,
    generationService,
    currentLessonService,
    generationStateRepository,
  ) {
    this.workflowRepository = workflowRepository;
    this.generationService = generationService;
    this.currentLessonService = currentLessonService;
    this.generationStateRepository = generationStateRepository;
  }

  async completeForUser({ userId, lessonId }) {
    await this.generationStateRepository.begin({
      userId,
      requestType: 'lesson_generation',
    });

    try {
      const result = await this.workflowRepository.completeCurrent({
        userId,
        lessonId,
      });

      if (result.nextLessonNeedsGeneration) {
        await this.generationService.generateForUser({
          userId,
          lessonId: result.nextLessonId,
        });
      }

      return {
        alreadyCompleted: result.alreadyCompleted,
        journeyCompleted: result.journeyCompleted,
        nextLesson: result.journeyCompleted
          ? null
          : await this.currentLessonService.getForUser(userId),
      };
    } finally {
      await this.generationStateRepository.finish({ userId });
    }
  }
}
