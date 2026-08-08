import assert from 'node:assert/strict';
import test from 'node:test';

import { CompleteLessonService } from '../src/services/complete-lesson-service.js';

test('completion generates the next lesson after the transaction', async () => {
  const calls = [];
  const workflowRepository = {
    async completeCurrent() {
      calls.push('complete');
      return {
        alreadyCompleted: false,
        journeyCompleted: false,
        nextLessonId: 'lesson-2',
        nextLessonNeedsGeneration: true,
      };
    },
  };
  const generationService = {
    async generateForUser() {
      calls.push('generate');
    },
  };
  const currentLessonService = {
    async getForUser() {
      calls.push('read-current');
      return { id: 'lesson-2' };
    },
  };
  const service = new CompleteLessonService(
    workflowRepository,
    generationService,
    currentLessonService,
  );

  const result = await service.completeForUser({
    userId: 'user-1',
    lessonId: 'lesson-1',
  });

  assert.deepEqual(calls, ['complete', 'generate', 'read-current']);
  assert.deepEqual(result.nextLesson, { id: 'lesson-2' });
});

test('idempotent completion does not generate another lesson', async () => {
  let generationCount = 0;
  const workflowRepository = {
    async completeCurrent() {
      return {
        alreadyCompleted: true,
        journeyCompleted: false,
        nextLessonId: 'lesson-2',
        nextLessonNeedsGeneration: false,
      };
    },
  };
  const generationService = {
    async generateForUser() {
      generationCount += 1;
    },
  };
  const currentLessonService = {
    async getForUser() {
      return { id: 'lesson-2' };
    },
  };
  const service = new CompleteLessonService(
    workflowRepository,
    generationService,
    currentLessonService,
  );

  const result = await service.completeForUser({
    userId: 'user-1',
    lessonId: 'lesson-1',
  });

  assert.equal(generationCount, 0);
  assert.equal(result.alreadyCompleted, true);
});

test('idempotent completion retries a failed next-lesson generation', async () => {
  let generationCount = 0;
  const workflowRepository = {
    async completeCurrent() {
      return {
        alreadyCompleted: true,
        journeyCompleted: false,
        nextLessonId: 'lesson-2',
        nextLessonNeedsGeneration: true,
      };
    },
  };
  const generationService = {
    async generateForUser() {
      generationCount += 1;
    },
  };
  const currentLessonService = {
    async getForUser() {
      return { id: 'lesson-2', status: 'ready' };
    },
  };
  const service = new CompleteLessonService(
    workflowRepository,
    generationService,
    currentLessonService,
  );

  const result = await service.completeForUser({
    userId: 'user-1',
    lessonId: 'lesson-1',
  });

  assert.equal(generationCount, 1);
  assert.equal(result.alreadyCompleted, true);
  assert.equal(result.nextLesson.status, 'ready');
});
