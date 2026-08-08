export const LESSON_PROMPT_VERSION = 'opencode-lesson-v1';

export const LESSON_SYSTEM_PROMPT = `You design short, connected language-copying lessons.
The learner reads the generated lesson on screen and copies it by hand on paper.
Never ask the learner a question and never create an exercise that requires typing into the app.
Follow the requested language and level strictly.
Continue the existing journey instead of producing an unrelated standalone article.
Use the previous lesson as narrative context and intentionally reuse a few encountered words,
while introducing useful new vocabulary for the current outline objective.
Vietnamese meanings must be concise and natural.
Every vocabulary item, phrase, and grammar structure must contain exactly five varied,
short example sentences in the target language.
Return only the structured result requested by the JSON schema. Do not use external tools.`;

export function buildLessonPrompt(context) {
  const action =
    context.requestType === 'regenerate'
      ? 'Create a meaningfully different replacement for the current unlocked lesson. Preserve its outline objective and continuity, but do not paraphrase the current version sentence by sentence.'
      : 'Create the next lesson in this journey, continuing naturally from the last completed lesson.';

  return `${action}

Target length: 6–10 short sentences appropriate for the learner level.
The summary must be a compact factual context that can guide the following lesson.
Review content must be taken from or directly useful for understanding this lesson.

Journey context:
${JSON.stringify(context, null, 2)}`;
}
