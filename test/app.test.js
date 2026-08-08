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

test('GET /api/lessons/history lists locked lessons without moving the bookmark', async (context) => {
  const currentLessonService = {
    async getHistoryForUser() {
      return [
        {
          id: 'lesson-1',
          title: 'My Job',
          sequenceNumber: 1,
          cycleNumber: 1,
        },
      ];
    },
  };
  const database = { query: async () => ({ rows: [] }) };
  const app = createApp({ database, currentLessonService });
  const server = await listen(app);
  context.after(() => server.close());

  const address = server.address();
  const response = await fetch(
    `http://127.0.0.1:${address.port}/api/lessons/history`,
  );

  assert.equal(response.status, 200);
  assert.equal((await response.json()).data[0].id, 'lesson-1');
});

test('GET /api/lessons/:id returns an owned historical lesson', async (context) => {
  const currentLessonService = {
    async getByIdForUser({ lessonId }) {
      return { id: lessonId, status: 'completed', isLocked: true };
    },
  };
  const database = { query: async () => ({ rows: [] }) };
  const app = createApp({ database, currentLessonService });
  const server = await listen(app);
  context.after(() => server.close());

  const address = server.address();
  const response = await fetch(
    `http://127.0.0.1:${address.port}/api/lessons/lesson-1`,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    data: { id: 'lesson-1', status: 'completed', isLocked: true },
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

test('GET /api/topics lists available topics', async (context) => {
  const topicRepository = {
    async listAvailable() {
      return [{ id: 'topic-1', name: 'Travel', slug: 'travel' }];
    },
  };
  const database = { query: async () => ({ rows: [] }) };
  const app = createApp({ database, topicRepository });
  const server = await listen(app);
  context.after(() => server.close());

  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/topics`);

  assert.equal(response.status, 200);
  assert.equal((await response.json()).data[0].name, 'Travel');
});

test('POST /api/journeys creates a journey and returns the first lesson', async (context) => {
  const createJourneyService = {
    async createForUser({ topicId, language, level }) {
      return { id: 'lesson-1', title: 'Introducing Travel', journey: { title: 'Travel' } };
    },
  };
  const database = { query: async () => ({ rows: [] }) };
  const app = createApp({ database, createJourneyService });
  const server = await listen(app);
  context.after(() => server.close());

  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/journeys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topicId: 'topic-1',
      language: 'English',
      level: 'Beginner',
    }),
  });

  assert.equal(response.status, 201);
  assert.equal((await response.json()).data.title, 'Introducing Travel');
});

test('GET /api/journeys lists the learner journeys', async (context) => {
  const journeyService = {
    async listForUser() {
      return [
        {
          id: 'journey-1',
          title: 'Software Engineering English',
          language: 'English',
          level: 'Beginner',
          status: 'active',
          completedLessons: 1,
          totalLessons: 6,
        },
      ];
    },
  };
  const database = { query: async () => ({ rows: [] }) };
  const app = createApp({ database, journeyService });
  const server = await listen(app);
  context.after(() => server.close());

  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/journeys`);

  assert.equal(response.status, 200);
  assert.equal((await response.json()).data[0].language, 'English');
});

test('POST /api/journeys/:id/open resumes a paused journey', async (context) => {
  const journeyService = {
    async openForUser({ journeyId }) {
      return {
        journeyCompleted: false,
        journey: { id: journeyId, title: 'Travel English' },
        lesson: { id: 'lesson-9', title: 'Packing', isCurrent: true },
      };
    },
  };
  const database = { query: async () => ({ rows: [] }) };
  const app = createApp({ database, journeyService });
  const server = await listen(app);
  context.after(() => server.close());

  const address = server.address();
  const response = await fetch(
    `http://127.0.0.1:${address.port}/api/journeys/journey-1/open`,
    { method: 'POST' },
  );

  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.lesson.id, 'lesson-9');
});

test('GET /api/lessons/:id/highlights lists the lesson highlights', async (context) => {  const highlightService = {
    async listForLesson({ lessonId }) {
      return [{ id: 'h1', lessonId, text: 'developer' }];
    },
  };
  const database = { query: async () => ({ rows: [] }) };
  const app = createApp({ database, highlightService });
  const server = await listen(app);
  context.after(() => server.close());

  const address = server.address();
  const response = await fetch(
    `http://127.0.0.1:${address.port}/api/lessons/lesson-1/highlights`,
  );

  assert.equal(response.status, 200);
  assert.equal((await response.json()).data[0].text, 'developer');
});

test('POST /api/lessons/:id/highlights creates a highlight', async (context) => {
  const highlightService = {
    async create({ lessonId, text }) {
      return { id: 'h1', lessonId, text, comment: 'a verb' };
    },
  };
  const database = { query: async () => ({ rows: [] }) };
  const app = createApp({ database, highlightService });
  const server = await listen(app);
  context.after(() => server.close());

  const address = server.address();
  const response = await fetch(
    `http://127.0.0.1:${address.port}/api/lessons/lesson-1/highlights`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paragraphIndex: 0,
        startOffset: 0,
        endOffset: 4,
        text: 'hello',
        comment: 'a verb',
      }),
    },
  );

  assert.equal(response.status, 201);
  assert.equal((await response.json()).data.comment, 'a verb');
});

test('PATCH /api/highlights/:id updates the comment', async (context) => {
  const highlightService = {
    async updateComment({ highlightId, comment }) {
      return { id: highlightId, comment };
    },
  };
  const database = { query: async () => ({ rows: [] }) };
  const app = createApp({ database, highlightService });
  const server = await listen(app);
  context.after(() => server.close());

  const address = server.address();
  const response = await fetch(
    `http://127.0.0.1:${address.port}/api/highlights/h1`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment: 'updated note' }),
    },
  );

  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.comment, 'updated note');
});

test('DELETE /api/highlights/:id removes a highlight', async (context) => {
  let deleted = null;
  const highlightService = {
    async delete({ highlightId }) {
      deleted = highlightId;
    },
  };
  const database = { query: async () => ({ rows: [] }) };
  const app = createApp({ database, highlightService });
  const server = await listen(app);
  context.after(() => server.close());

  const address = server.address();
  const response = await fetch(
    `http://127.0.0.1:${address.port}/api/highlights/h1`,
    { method: 'DELETE' },
  );

  assert.equal(response.status, 204);
  assert.equal(deleted, 'h1');
});
