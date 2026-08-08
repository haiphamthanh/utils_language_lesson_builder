import assert from 'node:assert/strict';
import test from 'node:test';

import { HighlightService } from '../src/services/highlight-service.js';

test('creating a highlight validates the range against the lesson content', async () => {
  const calls = [];
  const repository = {
    async findActiveContent({ userId, lessonId }) {
      calls.push(['content', userId, lessonId]);
      return 'I am a developer.\nI write code.';
    },
    async create(args) {
      calls.push(['create', args]);
      return { id: 'h1', ...args };
    },
    async listByLesson() {
      return [];
    },
  };
  const service = new HighlightService(repository);

  const result = await service.create({
    userId: 'u1',
    lessonId: 'l1',
    paragraphIndex: 1,
    startOffset: 2,
    endOffset: 7,
    text: 'write',
    comment: 'a verb',
  });

  assert.deepEqual(calls, [
    ['content', 'u1', 'l1'],
    ['create', {
      userId: 'u1',
      lessonId: 'l1',
      paragraphIndex: 1,
      startOffset: 2,
      endOffset: 7,
      text: 'write',
      comment: 'a verb',
    }],
  ]);
  assert.equal(result.id, 'h1');
});

test('creating a highlight rejects an empty text', async () => {
  const service = new HighlightService({});

  await assert.rejects(
    service.create({
      userId: 'u1',
      lessonId: 'l1',
      paragraphIndex: 0,
      startOffset: 0,
      endOffset: 1,
      text: '   ',
    }),
    (error) => error.code === 'INVALID_HIGHLIGHT',
  );
});

test('creating a highlight rejects an inverted range', async () => {
  const service = new HighlightService({});

  await assert.rejects(
    service.create({
      userId: 'u1',
      lessonId: 'l1',
      paragraphIndex: 0,
      startOffset: 4,
      endOffset: 2,
      text: 'ab',
    }),
    (error) => error.code === 'INVALID_HIGHLIGHT',
  );
});

test('creating a highlight rejects text that does not match the paragraph', async () => {
  const repository = {
    async findActiveContent() {
      return 'I am a developer.';
    },
  };
  const service = new HighlightService(repository);

  await assert.rejects(
    service.create({
      userId: 'u1',
      lessonId: 'l1',
      paragraphIndex: 0,
      startOffset: 0,
      endOffset: 3,
      text: 'xyz',
    }),
    (error) => error.code === 'HIGHLIGHT_MISMATCH',
  );
});

test('updating a comment rejects a non-text value', async () => {
  const service = new HighlightService({});

  await assert.rejects(
    service.updateComment({ userId: 'u1', highlightId: 'h1', comment: 42 }),
    (error) => error.code === 'INVALID_HIGHLIGHT',
  );
});
