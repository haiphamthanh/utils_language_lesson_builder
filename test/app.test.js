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
