import { createOpencode } from '@opencode-ai/sdk/v2';
import net from 'node:net';

function isPortAvailable(hostname, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(700);
    socket.once('connect', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(true));
    socket.connect(port, hostname);
  });
}

async function findAvailablePort(hostname, startPort, maxAttempts = 32) {
  let port = startPort;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (await isPortAvailable(hostname, port)) return port;
    port += 1;
  }
  return startPort;
}

export { findAvailablePort, isPortAvailable };

class OpenCodeProviderError extends Error {
  constructor(infoError) {
    super(
      `OpenCode generation failed (${infoError.name}): ${infoError.data?.message ?? 'unknown error'}`,
    );
    this.name = 'OpenCodeProviderError';
    this.infoError = infoError;
  }
}

function isThinkingToolChoiceError(error) {
  const source =
    error?.infoError?.data?.message ?? error?.infoError?.message ?? error?.message ?? '';
  return /thinking mode|tool_choice/i.test(String(source));
}

function messageText(parts) {
  const texts = (parts ?? [])
    .filter((part) => part?.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text);
  return texts.join('\n');
}

function extractJsonObject(text) {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) {
    throw new Error('OpenCode returned an empty response.');
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidates = [fenced?.[1]?.trim(), trimmed].filter(Boolean);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try to isolate the outermost JSON object below.
    }
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        // Keep trying other candidates.
      }
    }
  }

  throw new Error('OpenCode did not return parseable JSON output.');
}

export class OpenCodeStructuredGenerator {
  constructor({
    hostname = '127.0.0.1',
    port = 4096,
    startTimeoutMs = 10_000,
    generationTimeoutMs = 180_000,
    model = null,
    directory = process.cwd(),
    runtimeFactory = createOpencode,
    sessionTitle = 'Language content generation',
    systemPrompt,
    schema,
    buildPrompt,
  } = {}) {
    this.hostname = hostname;
    this.port = port;
    this.startTimeoutMs = startTimeoutMs;
    this.generationTimeoutMs = generationTimeoutMs;
    this.model = model;
    this.directory = directory;
    this.runtimeFactory = runtimeFactory;
    this.sessionTitle = sessionTitle;
    this.systemPrompt = systemPrompt;
    this.schema = schema;
    this.buildPrompt = buildPrompt;
    this.runtimePromise = null;
  }

  async #runtime() {
    if (!this.runtimePromise) {
      const port = await findAvailablePort(this.hostname, this.port);
      this.runtimePromise = this.runtimeFactory({
        hostname: this.hostname,
        port,
        timeout: this.startTimeoutMs,
        config: this.model ? { model: this.model } : {},
      });
    }

    return this.runtimePromise;
  }

  async #prompt({ client, session, context, format }) {
    const promptText = format
      ? this.buildPrompt(context)
      : `${this.buildPrompt(context)}

Return ONLY a valid JSON object that matches this JSON Schema exactly:
${JSON.stringify(this.schema, null, 2)}
Do not include markdown code fences, commentary, or any text outside the JSON object.`;

    const promptResult = await client.session.prompt(
      {
        sessionID: session.id,
        directory: this.directory,
        system: this.systemPrompt,
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
        parts: [{ type: 'text', text: promptText }],
        ...(format ? { format } : {}),
      },
      { throwOnError: true, signal: this.abortSignal },
    );
    const info = promptResult.data?.info;

    if (info?.error) {
      throw new OpenCodeProviderError(info.error);
    }
    if (format && (!info?.structured || typeof info.structured !== 'object')) {
      throw new Error('OpenCode did not return structured output.');
    }

    return { info, structured: info?.structured, text: messageText(promptResult.data?.parts) };
  }

  async generate(context) {
    const { client } = await this.#runtime();
    const sessionResult = await client.session.create(
      {
        directory: this.directory,
        title:
          typeof this.sessionTitle === 'function'
            ? this.sessionTitle(context)
            : this.sessionTitle,
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
    this.abortSignal = abortController.signal;

    try {
      let response;
      try {
        response = await this.#prompt({
          client,
          session,
          context,
          format: { type: 'json_schema', schema: this.schema, retryCount: 2 },
        });
      } catch (error) {
        if (!isThinkingToolChoiceError(error)) throw error;
        response = await this.#prompt({ client, session, context, format: undefined });
      }

      const payload = response.structured ?? extractJsonObject(response.text);
      return {
        ...payload,
        promptVersion: this.promptVersion,
        generationMetadata: {
          provider: response.info?.providerID,
          model: response.info?.modelID,
          sessionId: session.id,
          cost: response.info?.cost,
          tokens: response.info?.tokens,
          structured: Boolean(response.structured),
        },
      };
    } finally {
      this.abortSignal = undefined;
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
