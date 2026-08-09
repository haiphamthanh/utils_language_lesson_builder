export const MAX_GENERATED_LESSON_WORDS = 170;

const exampleListSchema = {
  type: 'array',
  description: 'Exactly five short, natural example sentences.',
  minItems: 5,
  maxItems: 5,
  items: { type: 'string', minLength: 1 },
};

const vocabularyItemSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['text', 'meaning', 'examples'],
  properties: {
    text: { type: 'string', minLength: 1 },
    meaning: { type: 'string', minLength: 1 },
    examples: exampleListSchema,
  },
};

const grammarItemSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['pattern', 'meaning', 'examples'],
  properties: {
    pattern: { type: 'string', minLength: 1 },
    meaning: { type: 'string', minLength: 1 },
    examples: exampleListSchema,
  },
};

export const generatedLessonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'content', 'summary', 'review'],
  properties: {
    title: { type: 'string', minLength: 1 },
    content: {
      type: 'string',
      minLength: 1,
      description: `The lesson passage, with no more than ${MAX_GENERATED_LESSON_WORDS} words.`,
    },
    summary: { type: 'string', minLength: 1 },
    review: {
      type: 'object',
      additionalProperties: false,
      required: ['vocabulary', 'phrases', 'grammar'],
      properties: {
        vocabulary: {
          type: 'array',
          minItems: 2,
          items: vocabularyItemSchema,
        },
        phrases: {
          type: 'array',
          minItems: 1,
          items: vocabularyItemSchema,
        },
        grammar: {
          type: 'array',
          minItems: 1,
          items: grammarItemSchema,
        },
      },
    },
  },
};

function requireText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Generated lesson field "${field}" must be non-empty text.`);
  }
}

export function countWords(value) {
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
  return [...segmenter.segment(value)].filter((segment) => segment.isWordLike).length;
}

function requireFiveExamples(item, field) {
  if (!Array.isArray(item.examples) || item.examples.length !== 5) {
    throw new Error(`Generated lesson field "${field}.examples" must contain exactly 5 items.`);
  }

  item.examples.forEach((example, index) => {
    requireText(example, `${field}.examples[${index}]`);
  });
}

export function validateGeneratedLesson(lesson) {
  if (!lesson || typeof lesson !== 'object' || Array.isArray(lesson)) {
    throw new Error('Generated lesson must be an object.');
  }

  requireText(lesson.title, 'title');
  requireText(lesson.content, 'content');
  const contentWordCount = countWords(lesson.content);
  if (contentWordCount > MAX_GENERATED_LESSON_WORDS) {
    throw new Error(
      `Generated lesson field "content" must contain at most ${MAX_GENERATED_LESSON_WORDS} words; received ${contentWordCount}.`,
    );
  }
  requireText(lesson.summary, 'summary');

  const review = lesson.review;
  if (!review || typeof review !== 'object') {
    throw new Error('Generated lesson field "review" must be an object.');
  }

  const groups = [
    ['vocabulary', 2],
    ['phrases', 1],
    ['grammar', 1],
  ];

  for (const [groupName, minimum] of groups) {
    const items = review[groupName];
    if (!Array.isArray(items) || items.length < minimum) {
      throw new Error(`Generated lesson field "review.${groupName}" requires at least ${minimum} item(s).`);
    }

    items.forEach((item, index) => {
      const field = `review.${groupName}[${index}]`;
      requireText(
        groupName === 'grammar' ? item.pattern : item.text,
        groupName === 'grammar' ? `${field}.pattern` : `${field}.text`,
      );
      requireText(item.meaning, `${field}.meaning`);
      requireFiveExamples(item, field);
    });
  }

  return lesson;
}
