import express from 'express';

import { config } from './config/env.js';
import { errorHandler, notFoundHandler } from './http/error-handler.js';
import { pool } from './db/pool.js';
import { LessonRepository } from './repositories/lesson-repository.js';
import { CurrentLessonService } from './services/current-lesson-service.js';

export function createApp({
  database = pool,
  currentLessonService = new CurrentLessonService(
    new LessonRepository(database),
  ),
} = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));

  app.get('/api/health', async (_request, response, next) => {
    try {
      await database.query('SELECT 1');
      response.json({ status: 'ok' });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/lessons/current', async (_request, response, next) => {
    try {
      const lesson = await currentLessonService.getForUser(config.demoUserId);
      response.json({ data: lesson });
    } catch (error) {
      next(error);
    }
  });

  app.use(express.static('public'));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
