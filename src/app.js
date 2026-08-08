import express from 'express';

import { config } from './config/env.js';
import { errorHandler, notFoundHandler } from './http/error-handler.js';
import { pool } from './db/pool.js';
import { createLessonGenerator } from './integrations/create-lesson-generator.js';
import { LessonRepository } from './repositories/lesson-repository.js';
import { LessonWorkflowRepository } from './repositories/lesson-workflow-repository.js';
import { StatsRepository } from './repositories/stats-repository.js';
import { CompleteLessonService } from './services/complete-lesson-service.js';
import { CurrentLessonService } from './services/current-lesson-service.js';
import { LessonGenerationService } from './services/lesson-generation-service.js';
import { RegenerateLessonService } from './services/regenerate-lesson-service.js';
import { StatsService } from './services/stats-service.js';

export function createApp({
  database = pool,
  currentLessonService = new CurrentLessonService(
    new LessonRepository(database),
  ),
  completeLessonService,
  regenerateLessonService,
  statsService = new StatsService(new StatsRepository(database)),
} = {}) {
  const app = express();
  const workflowRepository = new LessonWorkflowRepository(database);
  const generator = createLessonGenerator(config.generationProvider);
  const generationService = new LessonGenerationService(
    workflowRepository,
    generator,
  );
  const resolvedCompleteLessonService =
    completeLessonService ??
    new CompleteLessonService(
      workflowRepository,
      generationService,
      currentLessonService,
    );
  const resolvedRegenerateLessonService =
    regenerateLessonService ??
    new RegenerateLessonService(
      workflowRepository,
      generator,
      currentLessonService,
    );

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

  app.post('/api/lessons/:lessonId/complete', async (request, response, next) => {
    try {
      const result = await resolvedCompleteLessonService.completeForUser({
        userId: config.demoUserId,
        lessonId: request.params.lessonId,
      });
      response.json({ data: result });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/lessons/:lessonId/regenerate', async (request, response, next) => {
    try {
      const lesson = await resolvedRegenerateLessonService.regenerateForUser({
        userId: config.demoUserId,
        lessonId: request.params.lessonId,
      });
      response.json({ data: lesson });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/stats/overview', async (_request, response, next) => {
    try {
      const overview = await statsService.getOverview(config.demoUserId);
      response.json({ data: overview });
    } catch (error) {
      next(error);
    }
  });

  app.use(express.static('public'));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
