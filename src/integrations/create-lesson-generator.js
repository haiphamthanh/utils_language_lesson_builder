import { SampleLessonGenerator } from './sample-lesson-generator.js';

export function createLessonGenerator(providerName) {
  if (providerName === 'sample') return new SampleLessonGenerator();

  throw new Error(
    `Unsupported GENERATION_PROVIDER "${providerName}". Available provider: sample.`,
  );
}
