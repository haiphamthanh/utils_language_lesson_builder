import assert from 'node:assert/strict';
import test from 'node:test';

import { CurrentLessonService } from '../src/services/current-lesson-service.js';

function lessonRow(overrides = {}) {
  return {
    id: 'lesson-1',
    sequence_number: 1,
    cycle_number: 1,
    status: 'completed',
    is_locked: true,
    completed_at: new Date('2026-08-08T00:00:00Z'),
    title: 'My Job',
    content: 'I am a developer.',
    summary: 'A developer introduces their job.',
    review_content: { vocabulary: [], phrases: [], grammar: [] },
    version_number: 1,
    journey_id: 'journey-1',
    journey_title: 'Software English',
    journey_description: 'Một hành trình viết về công việc phần mềm.',
    language: 'English',
    level: 'Beginner',
    planned_lesson_count: 3,
    objective: 'Introduce your job.',
    is_current: false,
    ...overrides,
  };
}

test('historical lesson view is marked as non-current and locked', async () => {
  const repository = {
    async findViewableById() {
      return lessonRow();
    },
  };
  const lesson = await new CurrentLessonService(repository).getByIdForUser({
    userId: 'user-1',
    lessonId: 'lesson-1',
  });

  assert.equal(lesson.isCurrent, false);
  assert.equal(lesson.isLocked, true);
  assert.equal(lesson.journey.description, 'Một hành trình viết về công việc phần mềm.');
});

test('history exposes navigation metadata without lesson content', async () => {
  const repository = {
    async findCompletedHistoryByUserId() {
      return [lessonRow()];
    },
  };
  const history = await new CurrentLessonService(repository).getHistoryForUser(
    'user-1',
  );

  assert.deepEqual(Object.keys(history[0]).sort(), [
    'completedAt',
    'cycleNumber',
    'id',
    'sequenceNumber',
    'title',
  ]);
});
