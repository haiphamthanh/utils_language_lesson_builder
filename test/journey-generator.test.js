import assert from 'node:assert/strict';
import test from 'node:test';

import { OpenCodeJourneyGenerator } from '../src/integrations/opencode-journey-generator.js';

test('OpenCode journey generator requests the journey schema and cleans up', async () => {
  const calls = [];
  const runtimeFactory = async () => ({
    client: {
      session: {
        async create() {
          calls.push('create');
          return { data: { id: 'session-1' } };
        },
        async prompt(parameters) {
          calls.push('prompt');
          return {
            data: {
              info: {
                structured: {
                  title: 'Travel Journey',
                  description: 'Một hành trình đi qua những miền đất mới và lưu giữ trải nghiệm bằng từng trang viết.',
                  steps: [
                    { title: 'Intro', objective: 'Introduce.', continuation_hint: 'Continue.' },
                    { title: 'Place', objective: 'Describe.', continuation_hint: 'Share.' },
                    { title: 'Story', objective: 'Tell.', continuation_hint: 'Close.' },
                  ],
                },
                providerID: 'opencode',
                modelID: 'test-model',
              },
            },
          };
        },
        async delete() {
          calls.push('delete');
          return { data: true };
        },
      },
    },
    server: { close() {} },
  });
  const generator = new OpenCodeJourneyGenerator({
    runtimeFactory,
    generationTimeoutMs: 1_000,
  });

  const journey = await generator.generate({
    topic: { name: 'Travel' },
    language: 'English',
    level: 'Beginner',
  });

  assert.equal(journey.title, 'Travel Journey');
  assert.match(journey.description, /hành trình/);
  assert.equal(journey.steps.length, 3);
  assert.match(journey.promptVersion, /journey/);
  assert.deepEqual(calls, ['create', 'prompt', 'delete']);
});

test('Sample journey generator produces a valid progressive outline', async () => {
  const { SampleJourneyGenerator } = await import(
    '../src/integrations/sample-journey-generator.js'
  );
  const generator = new SampleJourneyGenerator();

  const journey = await generator.generate({
    topic: { name: 'Travel', description: 'Trips.' },
    language: 'English',
    level: 'Beginner',
  });

  assert.equal(journey.title, 'Travel Writing Journey');
  assert.match(journey.description, /hành trình/);
  assert.ok(journey.steps.length >= 3);
  assert.match(journey.steps[0].objective, /Travel/);
});
