import { generatedLessonSchema } from '../domain/generated-lesson.js';
import {
  buildLessonPrompt,
  LESSON_PROMPT_VERSION,
  LESSON_SYSTEM_PROMPT,
} from '../prompts/lesson-generation.js';
import { OpenCodeStructuredGenerator } from './opencode-structured-generator.js';

export class OpenCodeLessonGenerator extends OpenCodeStructuredGenerator {
  promptVersion = LESSON_PROMPT_VERSION;

  constructor(options = {}) {
    super({
      ...options,
      sessionTitle: (context) => `Language lesson ${context.sequenceNumber}`,
      systemPrompt: LESSON_SYSTEM_PROMPT,
      schema: generatedLessonSchema,
      buildPrompt: buildLessonPrompt,
    });
  }
}
