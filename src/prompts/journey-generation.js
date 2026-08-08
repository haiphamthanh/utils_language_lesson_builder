export const JOURNEY_PROMPT_VERSION = 'opencode-journey-v1';

export const JOURNEY_SYSTEM_PROMPT = `You design the outline of a short writing journey for a language learner.
The learner reads each generated lesson on screen and copies it by hand on paper.
Produce a progressive roadmap of 5 to 8 short writing missions for the given topic.
Start with a simple introduction and gradually add depth, ending with a summarizing mission.
Keep every step title short and every objective one practical sentence written for the learner.
Follow the requested language and level strictly.
Return only the structured result requested by the JSON schema. Do not use external tools.`;

export function buildJourneyPrompt(context) {
  return `Create a progressive writing journey for a ${context.level ?? 'learner'} learner in ${context.language ?? 'the target language'}.

The roadmap must grow from a simple introduction to a richer closing mission.
Every step must be concrete enough to become a 6-10 sentence writing lesson.
Avoid punctuation-heavy or meta instructions in step titles.

Topic:
${JSON.stringify(context.topic, null, 2)}

Return only the structured journey outline.`;
}
