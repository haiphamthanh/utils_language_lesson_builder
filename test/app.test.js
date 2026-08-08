import assert from 'node:assert/strict';
import test from 'node:test';

import { createApp } from '../src/app.js';

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
  });
}

test('GET /api/health checks the database dependency', async (context) => {
  const database = { query: async () => ({ rows: [{ '?column?': 1 }] }) };
  const app = createApp({ database });
  const server = await listen(app);
  context.after(() => server.close());

  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
});

test('GET /api/lessons/current returns the restored bookmark', async (context) => {
  const currentLessonService = {
    async getForUser() {
      return { id: 'lesson-1', title: 'My Job' };
    },
  };
  const database = { query: async () => ({ rows: [] }) };
  const app = createApp({ database, currentLessonService });
  const server = await listen(app);
  context.after(() => server.close());

  const address = server.address();
  const response = await fetch(
    `http://127.0.0.1:${address.port}/api/lessons/current`,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    data: { id: 'lesson-1', title: 'My Job' },
  });
});

test('POST /api/lessons/:id/complete advances the lesson', async (context) => {
  const completeLessonService = {
    async completeForUser({ lessonId }) {
      return {
        alreadyCompleted: false,
        journeyCompleted: false,
        nextLesson: { id: `${lessonId}-next`, title: 'My Daily Tasks' },
      };
    },
  };
  const database = { query: async () => ({ rows: [] }) };
  const currentLessonService = { getForUser: async () => null };
  const app = createApp({
    database,
    currentLessonService,
    completeLessonService,
  });
  const server = await listen(app);
  context.after(() => server.close());

  const address = server.address();
  const response = await fetch(
    `http://127.0.0.1:${address.port}/api/lessons/lesson-1/complete`,
    { method: 'POST' },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    data: {
      alreadyCompleted: false,
      journeyCompleted: false,
      nextLesson: { id: 'lesson-1-next', title: 'My Daily Tasks' },
    },
  });
});

test('POST /api/lessons/:id/regenerate returns the active version', async (context) => {
  const regenerateLessonService = {
    async regenerateForUser({ lessonId }) {
      return { id: lessonId, title: 'A New Developer', versionNumber: 2 };
    },
  };
  const database = { query: async () => ({ rows: [] }) };
  const currentLessonService = { getForUser: async () => null };
  const app = createApp({
    database,
    currentLessonService,
    regenerateLessonService,
  });
  const server = await listen(app);
  context.after(() => server.close());

  const address = server.address();
  const response = await fetch(
    `http://127.0.0.1:${address.port}/api/lessons/lesson-1/regenerate`,
    { method: 'POST' },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    data: { id: 'lesson-1', title: 'A New Developer', versionNumber: 2 },
  });
});

test('GET /api/stats/overview returns objective progress', async (context) => {
  const statsService = {
    async getOverview() {
      return {
        lessons: { completed: 3, reviewCompletions: 1, totalCompletions: 4 },
        studyDays: { total: 2, currentStreak: 2, longestStreak: 2 },
        vocabulary: { encountered: 8, repeated: 1 },
      };
    },
  };
  const database = { query: async () => ({ rows: [] }) };
  const app = createApp({ database, statsService });
  const server = await listen(app);
  context.after(() => server.close());

  const address = server.address();
  const response = await fetch(
    `http://127.0.0.1:${address.port}/api/stats/overview`,
  );

  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.vocabulary.encountered, 8);
});
