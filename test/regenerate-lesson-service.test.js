import assert from 'node:assert/strict';
import test from 'node:test';

import { RegenerateLessonService } from '../src/services/regenerate-lesson-service.js';
import { generatedLessonFixture } from './fixtures/generated-lesson.js';

test('regenerate preserves the workflow order and returns the new active version', async () => {
  const calls = [];
  const workflowRepository = {
    async claimForRegeneration() {
      calls.push('claim');
      return {
        requestId: 'request-1',
        context: { sequence_number: 1, request_type: 'regenerate' },
      };
    },
    async finishRegeneration(input) {
      calls.push(`finish:${input.requestId}`);
    },
    async failRegeneration() {
      calls.push('fail');
    },
  };
  const generator = {
    async generate() {
      calls.push('generate');
      return generatedLessonFixture({ title: 'New version' });
    },
  };
  const currentLessonService = {
    async getForUser() {
      calls.push('read-current');
      return { id: 'lesson-1', versionNumber: 2 };
    },
  };
  const service = new RegenerateLessonService(
    workflowRepository,
    generator,
    currentLessonService,
  );

  const lesson = await service.regenerateForUser({
    userId: 'user-1',
    lessonId: 'lesson-1',
  });

  assert.deepEqual(calls, ['claim', 'generate', 'finish:request-1', 'read-current']);
  assert.equal(lesson.versionNumber, 2);
});

test('regenerate restores the prior ready lesson when generation fails', async () => {
  let recordedError;
  const workflowRepository = {
    async claimForRegeneration() {
      return { requestId: 'request-1', context: {} };
    },
    async finishRegeneration() {},
    async failRegeneration(input) {
      recordedError = input.error;
    },
  };
  const expectedError = new Error('provider unavailable');
  const generator = {
    async generate() {
      throw expectedError;
    },
  };
  const service = new RegenerateLessonService(
    workflowRepository,
    generator,
    { getForUser: async () => null },
  );

  await assert.rejects(
    service.regenerateForUser({ userId: 'user-1', lessonId: 'lesson-1' }),
    /provider unavailable/,
  );
  assert.equal(recordedError, expectedError);
});
