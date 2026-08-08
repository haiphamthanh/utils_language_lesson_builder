import { createApp } from './app.js';
import { config } from './config/env.js';
import { pool } from './db/pool.js';

const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`Language Lesson Builder is running at http://localhost:${config.port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received; shutting down.`);
  server.close(async () => {
    await app.locals.lessonGenerator?.close?.();
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
