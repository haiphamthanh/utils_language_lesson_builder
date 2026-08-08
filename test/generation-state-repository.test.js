import assert from 'node:assert/strict';
import test from 'node:test';

import { GenerationStateRepository } from '../src/repositories/generation-state-repository.js';

function fakeDatabase() {
  const rows = { begin: [], query: [] };
  const client = {
    release() {},
    async query(sql, params = []) {
      if (sql.startsWith('BEGIN')) return { rowCount: 0 };
      if (sql.startsWith('COMMIT')) return { rowCount: 0 };
      if (sql.startsWith('ROLLBACK')) return { rowCount: 0 };
      if (/INSERT INTO user_generation_state/.test(sql)) {
        rows.begin.push({ sql, params });
        return { rowCount: 1 };
      }
      if (/DELETE FROM user_generation_state/.test(sql)) {
        rows.query.push({ sql, params });
        return { rowCount: 1 };
      }
      if (/SELECT request_type/.test(sql)) {
        rows.query.push({ sql, params });
        return { rows: [] };
      }
      return { rows: [] };
    },
  };
  return {
    client,
    rows,
    async connect() {
      return client;
    },
    async query(sql, params) {
      return client.query(sql, params);
    },
  };
}

test('begin acquires the single-flight lock for a user', async () => {
  const database = fakeDatabase();
  const repository = new GenerationStateRepository(database);

  await repository.begin({ userId: 'user-1', requestType: 'journey_creation' });

  const insert = database.rows.begin.find((entry) =>
    /INSERT INTO user_generation_state/.test(entry.sql),
  );
  assert.ok(insert);
  assert.equal(insert.params[0], 'user-1');
  assert.equal(insert.params[1], 'journey_creation');
});

test('getForUser reports the in-flight generation type', async () => {
  const database = fakeDatabase();
  const repository = new GenerationStateRepository(database);
  database.client.query = async (sql) => {
    if (/SELECT request_type/.test(sql)) {
      return { rows: [{ request_type: 'regeneration', started_at: new Date() }] };
    }
    return { rows: [] };
  };

  const state = await repository.getForUser('user-1');

  assert.equal(state.request_type, 'regeneration');
});

test('finish releases the lock', async () => {
  const database = fakeDatabase();
  const repository = new GenerationStateRepository(database);

  await repository.finish({ userId: 'user-1' });

  const deletes = database.rows.query.filter((entry) =>
    /DELETE FROM user_generation_state/.test(entry.sql),
  );
  assert.ok(deletes.length >= 1);
  assert.equal(deletes[0].params[0], 'user-1');
});
