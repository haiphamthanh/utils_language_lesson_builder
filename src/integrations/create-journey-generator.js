import { OpenCodeJourneyGenerator } from './opencode-journey-generator.js';
import { SampleJourneyGenerator } from './sample-journey-generator.js';

export function createJourneyGenerator(providerName, options = {}) {
  if (providerName === 'opencode') return new OpenCodeJourneyGenerator(options);
  if (providerName === 'sample') return new SampleJourneyGenerator();

  throw new Error(
    `Unsupported GENERATION_PROVIDER "${providerName}". Available providers: opencode, sample.`,
  );
}
