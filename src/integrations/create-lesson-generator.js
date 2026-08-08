import { OpenCodeLessonGenerator } from './opencode-lesson-generator.js';
import { SampleLessonGenerator } from './sample-lesson-generator.js';

export function createLessonGenerator(providerName, options = {}) {
  if (providerName === 'opencode') return new OpenCodeLessonGenerator(options);
  if (providerName === 'sample') return new SampleLessonGenerator();

  throw new Error(
    `Unsupported GENERATION_PROVIDER "${providerName}". Available providers: opencode, sample.`,
  );
}
