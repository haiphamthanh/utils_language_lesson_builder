import assert from 'node:assert/strict';
import test from 'node:test';

import { OpenCodeStructuredGenerator } from '../src/integrations/opencode-structured-generator.js';

function fakeRuntime(promptResponses) {
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
          return promptResponses.shift()(parameters);
        },
        async delete() {
          calls.push('delete');
          return { data: true };
        },
      },
    },
    server: { close() {} },
  });
  return { calls, runtimeFactory };
}

function generatorWith(runtimeFactory) {
  const schema = {
    type: 'object',
    required: ['title'],
    properties: { title: { type: 'string' } },
  };
  return new OpenCodeStructuredGenerator({
    runtimeFactory,
    generationTimeoutMs: 1_000,
    systemPrompt: 'System',
    schema,
    buildPrompt: () => 'Return JSON.',
  });
}

test('structured output is used when the provider supports it', async () => {
  const { calls, runtimeFactory } = fakeRuntime([
    () => ({
      data: {
        info: {
          structured: { title: 'Structured lesson' },
          providerID: 'opencode-go',
          modelID: 'test-model',
          cost: 0,
        },
        parts: [],
      },
    }),
  ]);
  const generator = generatorWith(runtimeFactory);

  const result = await generator.generate({ sequenceNumber: 1 });

  assert.equal(result.title, 'Structured lesson');
  assert.equal(result.generationMetadata.structured, true);
  assert.equal(calls.filter((call) => call === 'prompt').length, 1);
  assert.deepEqual(calls, ['create', 'prompt', 'delete']);
});

test('thinking-mode tool_choice error falls back to plain-text JSON', async () => {
  const { calls, runtimeFactory } = fakeRuntime([
    () => ({
      data: {
        info: {
          error: {
            name: 'APIError',
            data: { message: 'Thinking mode does not support this tool_choice' },
          },
        },
        parts: [],
      },
    }),
    () => ({
      data: {
        info: { providerID: 'opencode-go', modelID: 'test-model', cost: 0 },
        parts: [{ type: 'text', text: '{"title":"Fallback lesson"}' }],
      },
    }),
  ]);
  const generator = generatorWith(runtimeFactory);

  const result = await generator.generate({ sequenceNumber: 1 });

  assert.equal(result.title, 'Fallback lesson');
  assert.equal(result.generationMetadata.structured, false);
  assert.equal(calls.filter((call) => call === 'prompt').length, 2);
});

test('plain-text fallback extracts JSON wrapped in markdown fences', async () => {
  const { runtimeFactory } = fakeRuntime([
    () => ({
      data: {
        info: {
          error: { name: 'APIError', data: { message: 'Thinking mode does not support this tool_choice' } },
        },
        parts: [],
      },
    }),
    () => ({
      data: {
        info: { providerID: 'opencode-go', modelID: 'test-model' },
        parts: [
          { type: 'text', text: 'Here is the lesson you asked for:\n```json\n{"title":"Fenced lesson"}\n```' },
        ],
      },
    }),
  ]);
  const generator = generatorWith(runtimeFactory);

  const result = await generator.generate({ sequenceNumber: 1 });

  assert.equal(result.title, 'Fenced lesson');
});

test('plain-text fallback rejects output that is not JSON', async () => {
  const { runtimeFactory } = fakeRuntime([
    () => ({
      data: {
        info: {
          error: { name: 'APIError', data: { message: 'Thinking mode does not support this tool_choice' } },
        },
        parts: [],
      },
    }),
    () => ({
      data: {
        info: { providerID: 'opencode-go', modelID: 'test-model' },
        parts: [{ type: 'text', text: 'Sorry, I cannot answer that.' }],
      },
    }),
  ]);
  const generator = generatorWith(runtimeFactory);

  await assert.rejects(
    generator.generate({ sequenceNumber: 1 }),
    /did not return parseable JSON/,
  );
});
