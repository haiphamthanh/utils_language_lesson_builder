import { createOpencode } from '@opencode-ai/sdk/v2';

import { generatedLessonSchema } from '../domain/generated-lesson.js';
import {
  buildLessonPrompt,
  LESSON_PROMPT_VERSION,
  LESSON_SYSTEM_PROMPT,
} from '../prompts/lesson-generation.js';

export class OpenCodeLessonGenerator {
  promptVersion = LESSON_PROMPT_VERSION;

  constructor({
    hostname = '127.0.0.1',
    port = 4096,
    startTimeoutMs = 10_000,
    generationTimeoutMs = 180_000,
    model = null,
    directory = process.cwd(),
    runtimeFactory = createOpencode,
  } = {}) {
    this.hostname = hostname;
    this.port = port;
    this.startTimeoutMs = startTimeoutMs;
    this.generationTimeoutMs = generationTimeoutMs;
    this.model = model;
    this.directory = directory;
    this.runtimeFactory = runtimeFactory;
    this.runtimePromise = null;
  }

  async #runtime() {
    if (!this.runtimePromise) {
      this.runtimePromise = this.runtimeFactory({
        hostname: this.hostname,
        port: this.port,
        timeout: this.startTimeoutMs,
        config: this.model ? { model: this.model } : {},
      });
    }

    return this.runtimePromise;
  }

  async generate(context) {
    const { client } = await this.#runtime();
    const sessionResult = await client.session.create(
      {
        directory: this.directory,
        title: `Language lesson ${context.sequenceNumber}`,
      },
      { throwOnError: true },
    );
    const session = sessionResult.data;

    if (!session?.id) {
      throw new Error('OpenCode did not return a session id.');
    }

    const abortController = new AbortController();
    const timeout = setTimeout(
      () => abortController.abort(),
      this.generationTimeoutMs,
    );
    timeout.unref?.();

    try {
      const promptResult = await client.session.prompt(
        {
          sessionID: session.id,
          directory: this.directory,
          system: LESSON_SYSTEM_PROMPT,
          tools: {
            bash: false,
            edit: false,
            write: false,
            read: false,
            glob: false,
            grep: false,
            task: false,
            webfetch: false,
            websearch: false,
          },
          parts: [{ type: 'text', text: buildLessonPrompt(context) }],
          format: {
            type: 'json_schema',
            schema: generatedLessonSchema,
            retryCount: 2,
          },
        },
        { throwOnError: true, signal: abortController.signal },
      );
      const info = promptResult.data?.info;

      if (info?.error) {
        throw new Error(
          `OpenCode generation failed (${info.error.name}): ${info.error.data?.message ?? 'unknown error'}`,
        );
      }
      if (!info?.structured || typeof info.structured !== 'object') {
        throw new Error('OpenCode did not return structured lesson output.');
      }

      return {
        ...info.structured,
        promptVersion: this.promptVersion,
        generationMetadata: {
          provider: info.providerID,
          model: info.modelID,
          sessionId: session.id,
          cost: info.cost,
          tokens: info.tokens,
        },
      };
    } finally {
      clearTimeout(timeout);
      await client.session
        .delete(
          { sessionID: session.id, directory: this.directory },
          { throwOnError: false },
        )
        .catch(() => undefined);
    }
  }

  async close() {
    if (!this.runtimePromise) return;
    const runtime = await this.runtimePromise;
    runtime.server.close();
    this.runtimePromise = null;
  }
}
