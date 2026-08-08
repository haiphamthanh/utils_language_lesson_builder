import assert from 'node:assert/strict';
import test from 'node:test';

import { OpenCodeLessonGenerator } from '../src/integrations/opencode-lesson-generator.js';
import { generatedLessonFixture } from './fixtures/generated-lesson.js';

test('OpenCode generator requests structured output and cleans up its session', async () => {
  const calls = [];
  const { promptVersion: _promptVersion, ...structuredLesson } =
    generatedLessonFixture();
  const runtimeFactory = async (options) => {
    calls.push({ type: 'runtime', options });
    return {
      client: {
        session: {
          async create(parameters) {
            calls.push({ type: 'create', parameters });
            return { data: { id: 'session-1' } };
          },
          async prompt(parameters) {
            calls.push({ type: 'prompt', parameters });
            return {
              data: {
                info: {
                  structured: structuredLesson,
                  providerID: 'opencode',
                  modelID: 'test-model',
                  cost: 0,
                  tokens: { input: 10, output: 20 },
                },
              },
            };
          },
          async delete(parameters) {
            calls.push({ type: 'delete', parameters });
            return { data: true };
          },
        },
      },
      server: { close() {} },
    };
  };
  const generator = new OpenCodeLessonGenerator({
    runtimeFactory,
    generationTimeoutMs: 1_000,
  });

  const lesson = await generator.generate({
    sequenceNumber: 2,
    requestType: 'next_lesson',
    topic: { name: 'Software Engineering' },
    previousLesson: { content: 'I am a developer.' },
  });

  const promptCall = calls.find((call) => call.type === 'prompt');
  assert.equal(promptCall.parameters.format.type, 'json_schema');
  assert.equal(
    promptCall.parameters.format.schema.properties.review.properties.vocabulary
      .items.properties.examples.maxItems,
    5,
  );
  assert.match(promptCall.parameters.parts[0].text, /I am a developer/);
  assert.equal(lesson.generationMetadata.model, 'test-model');
  assert.deepEqual(
    calls.map((call) => call.type),
    ['runtime', 'create', 'prompt', 'delete'],
  );
});

test('OpenCode generator closes its embedded server', async () => {
  let closed = false;
  const generator = new OpenCodeLessonGenerator({
    runtimeFactory: async () => ({
      client: {},
      server: { close: () => (closed = true) },
    }),
  });

  await generator.close();
  assert.equal(closed, false);

  await assert.rejects(generator.generate({ sequenceNumber: 1 }), /create/);
  await generator.close();
  assert.equal(closed, true);
});
