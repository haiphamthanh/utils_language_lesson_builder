import { generatedJourneySchema } from '../domain/generated-journey.js';
import {
  buildJourneyPrompt,
  JOURNEY_PROMPT_VERSION,
  JOURNEY_SYSTEM_PROMPT,
} from '../prompts/journey-generation.js';
import { OpenCodeStructuredGenerator } from './opencode-structured-generator.js';

export class OpenCodeJourneyGenerator extends OpenCodeStructuredGenerator {
  promptVersion = JOURNEY_PROMPT_VERSION;

  constructor(options = {}) {
    super({
      ...options,
      sessionTitle: (context) =>
        `Journey outline for ${context.topic?.name ?? 'writing'}`,
      systemPrompt: JOURNEY_SYSTEM_PROMPT,
      schema: generatedJourneySchema,
      buildPrompt: buildJourneyPrompt,
    });
  }
}
