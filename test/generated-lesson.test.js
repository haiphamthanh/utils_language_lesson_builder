import assert from 'node:assert/strict';
import test from 'node:test';

import {
  countWords,
  MAX_GENERATED_LESSON_WORDS,
  validateGeneratedLesson,
} from '../src/domain/generated-lesson.js';
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

test('generated lesson content is limited to 170 words', () => {
  const lesson = generatedLessonFixture({
    content: Array.from(
      { length: MAX_GENERATED_LESSON_WORDS + 1 },
      (_, index) => `word${index}`,
    ).join(' '),
  });

  assert.equal(countWords(lesson.content), 171);
  assert.throws(
    () => validateGeneratedLesson(lesson),
    /content.*at most 170 words.*received 171/,
  );
});

test('generated lesson accepts content at the 170-word boundary', () => {
  const lesson = generatedLessonFixture({
    content: Array.from(
      { length: MAX_GENERATED_LESSON_WORDS },
      (_, index) => `word${index}`,
    ).join(' '),
  });

  assert.equal(validateGeneratedLesson(lesson), lesson);
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
