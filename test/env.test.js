import assert from 'node:assert/strict';
import test from 'node:test';

import { loadConfig } from '../src/config/env.js';

test('loadConfig provides small local defaults', () => {
  const result = loadConfig({});

  assert.equal(result.port, 9999);
  assert.equal(result.timeZone, 'Asia/Ho_Chi_Minh');
  assert.equal(result.generationProvider, 'sample');
  assert.match(result.databaseUrl, /^postgres:/);
});

test('loadConfig rejects invalid ports early', () => {
  assert.throws(() => loadConfig({ PORT: 'zero' }), /PORT must be an integer/);
});
