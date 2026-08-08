import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateStreaks, StatsService } from '../src/services/stats-service.js';

test('current streak may end today', () => {
  assert.deepEqual(
    calculateStreaks(
      ['2026-08-08', '2026-08-07', '2026-08-06', '2026-08-03'],
      '2026-08-08',
    ),
    { current: 3, longest: 3 },
  );
});

test('current streak remains visible until the day after last study', () => {
  assert.deepEqual(
    calculateStreaks(['2026-08-07', '2026-08-06'], '2026-08-08'),
    { current: 2, longest: 2 },
  );
});

test('current streak resets after a full missed day', () => {
  assert.deepEqual(
    calculateStreaks(['2026-08-06', '2026-08-05'], '2026-08-08'),
    { current: 0, longest: 2 },
  );
});

test('overview keeps completion, activity, and vocabulary semantics separate', async () => {
  const repository = {
    async getCompletionCounts() {
      return {
        completed_lessons: 3,
        review_completions: 2,
        total_completions: 5,
      };
    },
    async getStudyActivity() {
      return {
        study_dates: ['2026-08-08'],
        current_date: '2026-08-08',
        total_study_days: 1,
        days_in_last_7: 1,
        days_in_last_30: 1,
      };
    },
    async getVocabularyCounts() {
      return { encountered_items: 7, repeated_items: 2 };
    },
  };
  const overview = await new StatsService(repository).getOverview('user-1');

  assert.equal(overview.lessons.completed, 3);
  assert.equal(overview.lessons.totalCompletions, 5);
  assert.equal(overview.studyDays.currentStreak, 1);
  assert.equal(overview.vocabulary.encountered, 7);
});
