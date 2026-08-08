import 'dotenv/config';

const DEFAULT_DEMO_USER_ID = '00000000-0000-4000-8000-000000000001';

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
    generationProvider: environment.GENERATION_PROVIDER ?? 'sample',
  });
}

export const config = loadConfig();
