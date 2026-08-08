import assert from 'node:assert/strict';
import test from 'node:test';

import { JourneyService } from '../src/services/journey-service.js';

test('listing journeys maps rows into book summaries', async () => {
  const journeyRepository = {
    async listForUser(userId) {
      assert.equal(userId, 'user-1');
      return [
        {
          id: 'journey-1',
          title: 'Software Engineering English',
          language: 'English',
          level: 'Beginner',
          status: 'active',
          max_cycles: 2,
          planned_lesson_count: 3,
          current_lesson_id: 'lesson-2',
          current_lesson_title: 'My Daily Tasks',
          current_lesson_sequence: 2,
          current_lesson_cycle: 1,
          current_lesson_status: 'ready',
          completed_lessons: 1,
          last_opened_at: '2026-08-09T01:00:00Z',
          completed_at: null,
        },
      ];
    },
  };
  const service = new JourneyService({ journeyRepository, currentLessonService: {} });

  const result = await service.listForUser('user-1');

  assert.equal(result[0].currentLesson.title, 'My Daily Tasks');
  assert.equal(result[0].completedLessons, 1);
  assert.equal(result[0].totalLessons, 6);
});

test('opening a paused journey reactivates it and returns the current lesson', async () => {
  const calls = [];
  const journeyRepository = {
    async findByIdForUser({ userId, journeyId }) {
      calls.push('find');
      return {
        id: journeyId,
        title: 'Travel English',
        language: 'English',
        level: 'Intermediate',
        status: 'paused',
      };
    },
    async reactivate({ userId, journeyId }) {
      calls.push('reactivate');
      assert.equal(userId, 'user-1');
      assert.equal(journeyId, 'journey-1');
    },
  };
  const currentLessonService = {
    async getForUser() {
      calls.push('lesson');
      return { id: 'lesson-2', title: 'Packing', isCurrent: true };
    },
  };
  const service = new JourneyService({
    journeyRepository,
    currentLessonService,
  });

  const result = await service.openForUser({
    userId: 'user-1',
    journeyId: 'journey-1',
  });

  assert.deepEqual(calls, ['find', 'reactivate', 'lesson']);
  assert.equal(result.journeyCompleted, false);
  assert.equal(result.lesson.id, 'lesson-2');
});

test('opening a completed journey returns the completion payload without reactivating', async () => {
  const calls = [];
  const journeyRepository = {
    async findByIdForUser() {
      return {
        id: 'journey-1',
        title: 'Finished Journey',
        language: 'Japanese',
        level: 'Beginner',
        status: 'completed',
      };
    },
    async touch({ userId, journeyId }) {
      calls.push('touch');
      assert.equal(userId, 'user-1');
      assert.equal(journeyId, 'journey-1');
    },
    async reactivate() {
      calls.push('reactivate');
    },
  };
  const currentLessonService = {
    async getForUser() {
      return null;
    },
  };
  const service = new JourneyService({
    journeyRepository,
    currentLessonService,
  });

  const result = await service.openForUser({
    userId: 'user-1',
    journeyId: 'journey-1',
  });

  assert.deepEqual(calls, ['touch']);
  assert.equal(result.journeyCompleted, true);
  assert.equal(result.lesson, null);
});

test('opening an unknown journey is rejected', async () => {
  const service = new JourneyService({
    journeyRepository: {
      async findByIdForUser() {
        return null;
      },
    },
    currentLessonService: {},
  });

  await assert.rejects(
    service.openForUser({ userId: 'user-1', journeyId: 'missing' }),
    (error) => error.code === 'JOURNEY_NOT_FOUND',
  );
});
