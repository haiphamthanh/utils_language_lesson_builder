import 'dotenv/config';

const DEFAULT_DEMO_USER_ID = '00000000-0000-4000-8000-000000000001';

function positiveInteger(value, name, fallback) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

export function loadConfig(environment = process.env) {
  const port = Number(environment.PORT ?? 9999);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  return Object.freeze({
    port,
    databaseUrl:
      environment.DATABASE_URL ??
      'postgres://lesson_builder:lesson_builder@localhost:5432/lesson_builder',
    timeZone: environment.APP_TIME_ZONE ?? 'Asia/Ho_Chi_Minh',
    demoUserId: environment.DEMO_USER_ID ?? DEFAULT_DEMO_USER_ID,
    generationProvider: environment.GENERATION_PROVIDER ?? 'opencode',
    opencode: Object.freeze({
      hostname: environment.OPENCODE_HOSTNAME ?? '127.0.0.1',
      port: positiveInteger(environment.OPENCODE_PORT, 'OPENCODE_PORT', 4096),
      startTimeoutMs: positiveInteger(
        environment.OPENCODE_START_TIMEOUT_MS,
        'OPENCODE_START_TIMEOUT_MS',
        10_000,
      ),
      generationTimeoutMs: positiveInteger(
        environment.OPENCODE_GENERATION_TIMEOUT_MS,
        'OPENCODE_GENERATION_TIMEOUT_MS',
        180_000,
      ),
      model: environment.OPENCODE_MODEL?.trim() || null,
    }),
  });
}

export const config = loadConfig();
