import assert from 'node:assert/strict';
import test from 'node:test';

import { validateGeneratedLesson } from '../src/domain/generated-lesson.js';
import { SampleLessonGenerator } from '../src/integrations/sample-lesson-generator.js';
import { generatedLessonFixture } from './fixtures/generated-lesson.js';

test('generated lesson requires exactly five examples for every review item', () => {
  const lesson = generatedLessonFixture();
  lesson.review.vocabulary[0].examples = ['Only one example.'];

  assert.throws(
    () => validateGeneratedLesson(lesson),
    /must contain exactly 5 items/,
  );
});

test('sample next lesson follows the same validated contract', async () => {
  const lesson = await new SampleLessonGenerator().generate({
    requestType: 'next_lesson',
    sequenceNumber: 2,
  });

  assert.equal(validateGeneratedLesson(lesson), lesson);
});

test('sample provider can bootstrap the first lesson without seeded content', async () => {
  const lesson = await new SampleLessonGenerator().generate({
    requestType: 'next_lesson',
    sequenceNumber: 1,
  });

  assert.equal(validateGeneratedLesson(lesson), lesson);
});

test('sample regeneration follows the same validated contract', async () => {
  const lesson = await new SampleLessonGenerator().generate({
    requestType: 'regenerate',
    sequenceNumber: 1,
  });

  assert.equal(validateGeneratedLesson(lesson), lesson);
});
