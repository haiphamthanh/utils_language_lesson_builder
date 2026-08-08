export const generatedJourneySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'steps'],
  properties: {
    title: { type: 'string', minLength: 1 },
    steps: {
      type: 'array',
      minItems: 3,
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'objective', 'continuation_hint'],
        properties: {
          title: { type: 'string', minLength: 1 },
          objective: { type: 'string', minLength: 1 },
          continuation_hint: { type: 'string', minLength: 1 },
        },
      },
    },
  },
};

function requireText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Generated journey field "${field}" must be non-empty text.`);
  }
}

export function validateGeneratedJourney(journey) {
  if (!journey || typeof journey !== 'object' || Array.isArray(journey)) {
    throw new Error('Generated journey must be an object.');
  }

  requireText(journey.title, 'title');

  const steps = journey.steps;
  if (!Array.isArray(steps) || steps.length < 3 || steps.length > 8) {
    throw new Error('Generated journey field "steps" must contain between 3 and 8 items.');
  }

  steps.forEach((step, index) => {
    if (!step || typeof step !== 'object' || Array.isArray(step)) {
      throw new Error(`Generated journey field "steps[${index}]" must be an object.`);
    }
    const field = `steps[${index}]`;
    requireText(step.title, `${field}.title`);
    requireText(step.objective, `${field}.objective`);
    requireText(step.continuation_hint, `${field}.continuation_hint`);
  });

  return journey;
}
