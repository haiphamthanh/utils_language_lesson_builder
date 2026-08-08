import { validateGeneratedLesson } from '../domain/generated-lesson.js';

export class LessonGenerationService {
  constructor(workflowRepository, generator) {
    this.workflowRepository = workflowRepository;
    this.generator = generator;
  }

  async generateForUser({ userId, lessonId }) {
    const { requestId, context } =
      await this.workflowRepository.claimForGeneration({
        userId,
        lessonId,
        promptVersion: this.generator.promptVersion,
      });

    try {
      const generatedLesson = validateGeneratedLesson(
        await this.generator.generate(context),
      );
      await this.workflowRepository.finishGeneration({
        lessonId,
        requestId,
        generatedLesson,
      });
    } catch (error) {
      await this.workflowRepository.failGeneration({
        lessonId,
        requestId,
        error,
      });
      throw error;
    }
  }
}
