import assert from 'node:assert/strict';
import test from 'node:test';

import {
  generatedJourneySchema,
  validateGeneratedJourney,
} from '../src/domain/generated-journey.js';

function validJourney() {
  return {
    title: 'Travel Writing Journey',
    steps: [
      { title: 'Introducing Travel', objective: 'Introduce your travel interests.', continuation_hint: 'Describe a place.' },
      { title: 'A Place', objective: 'Describe one place you love.', continuation_hint: 'Share a story.' },
      { title: 'A Story', objective: 'Share a short travel story.', continuation_hint: 'Summarize what you learned.' },
    ],
  };
}

test('generated journey schema requires a title and 3-8 steps', () => {
  assert.equal(generatedJourneySchema.required.includes('title'), true);
  assert.equal(generatedJourneySchema.properties.steps.minItems, 3);
  assert.equal(generatedJourneySchema.properties.steps.maxItems, 8);
  assert.equal(
    generatedJourneySchema.properties.steps.items.required.includes('continuation_hint'),
    true,
  );
});

test('validateGeneratedJourney accepts a valid outline', () => {
  const journey = validJourney();
  assert.equal(validateGeneratedJourney(journey), journey);
});

test('validateGeneratedJourney rejects a missing title', () => {
  const journey = validJourney();
  delete journey.title;
  assert.throws(() => validateGeneratedJourney(journey), /"title" must be non-empty/);
});

test('validateGeneratedJourney rejects fewer than 3 steps', () => {
  const journey = validJourney();
  journey.steps = journey.steps.slice(0, 2);
  assert.throws(() => validateGeneratedJourney(journey), /between 3 and 8/);
});

test('validateGeneratedJourney rejects a step without an objective', () => {
  const journey = validJourney();
  delete journey.steps[0].objective;
  assert.throws(() => validateGeneratedJourney(journey), /"steps\[0\]\.objective"/);
});
