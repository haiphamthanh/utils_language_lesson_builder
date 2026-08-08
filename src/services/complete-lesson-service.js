export class CompleteLessonService {
  constructor(workflowRepository, generationService, currentLessonService) {
    this.workflowRepository = workflowRepository;
    this.generationService = generationService;
    this.currentLessonService = currentLessonService;
  }

  async completeForUser({ userId, lessonId }) {
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
  }
}
