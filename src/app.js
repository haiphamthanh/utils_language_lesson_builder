import express from 'express';

import { config } from './config/env.js';
import { errorHandler, notFoundHandler } from './http/error-handler.js';
import { pool } from './db/pool.js';
import { createJourneyGenerator } from './integrations/create-journey-generator.js';
import { createLessonGenerator } from './integrations/create-lesson-generator.js';
import { JourneyRepository } from './repositories/journey-repository.js';
import { BookRepository } from './repositories/book-repository.js';
import { GenerationStateRepository } from './repositories/generation-state-repository.js';
import { HighlightRepository } from './repositories/highlight-repository.js';
import { LessonRepository } from './repositories/lesson-repository.js';
import { LessonWorkflowRepository } from './repositories/lesson-workflow-repository.js';
import { StatsRepository } from './repositories/stats-repository.js';
import { TopicRepository } from './repositories/topic-repository.js';
import { CompleteLessonService } from './services/complete-lesson-service.js';
import { CreateJourneyService } from './services/create-journey-service.js';
import { CurrentLessonService } from './services/current-lesson-service.js';
import { HighlightService } from './services/highlight-service.js';
import { JourneyService } from './services/journey-service.js';
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
  topicRepository = new TopicRepository(database),
  createJourneyService,
  highlightService = new HighlightService(new HighlightRepository(database)),
  journeyService,
  generationStateRepository = new GenerationStateRepository(database),
  bookRepository = new BookRepository(),
} = {}) {
  const app = express();
  const workflowRepository = new LessonWorkflowRepository(database);
  const generator = createLessonGenerator(config.generationProvider, config.opencode);
  app.locals.lessonGenerator = generator;
  const journeyGenerator = createJourneyGenerator(
    config.generationProvider,
    config.opencode,
  );
  app.locals.journeyGenerator = journeyGenerator;
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
      generationStateRepository,
    );
  const resolvedRegenerateLessonService =
    regenerateLessonService ??
    new RegenerateLessonService(
      workflowRepository,
      generator,
      currentLessonService,
      generationStateRepository,
    );
  const resolvedCreateJourneyService =
    createJourneyService ??
    new CreateJourneyService({
      topicRepository,
      journeyRepository: new JourneyRepository(database),
      journeyGenerator,
      lessonGenerationService: generationService,
      currentLessonService,
      generationStateRepository,
    });
  const resolvedJourneyService =
    journeyService ??
    new JourneyService({
      journeyRepository: new JourneyRepository(database),
      currentLessonService,
    });

  app.disable('x-powered-by');
  app.use(express.json({ limit: '5mb' }));

  app.get('/api/health', async (_request, response, next) => {
    try {
      await database.query('SELECT 1');
      response.json({ status: 'ok' });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/status', async (_request, response, next) => {
    try {
      const state = await generationStateRepository.getForUser(config.demoUserId);
      response.json({
        data: {
          busy: Boolean(state),
          requestType: state?.request_type ?? null,
        },
      });
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

  app.get('/api/lessons/history', async (request, response, next) => {
    try {
      const lessons = await currentLessonService.getHistoryForUser(
        config.demoUserId,
        request.query.journeyId,
      );
      response.json({ data: lessons });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/lessons/:lessonId', async (request, response, next) => {
    try {
      const lesson = await currentLessonService.getByIdForUser({
        userId: config.demoUserId,
        lessonId: request.params.lessonId,
      });
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

  app.get('/api/topics', async (_request, response, next) => {
    try {
      const topics = await topicRepository.listAvailable(config.demoUserId);
      response.json({ data: topics });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/journeys', async (request, response, next) => {
    try {
      const { topicId, language, level } = request.body ?? {};
      const lesson = await resolvedCreateJourneyService.createForUser({
        userId: config.demoUserId,
        topicId,
        language,
        level,
      });
      response.status(201).json({ data: lesson });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/journeys', async (_request, response, next) => {
    try {
      const journeys = await resolvedJourneyService.listForUser(
        config.demoUserId,
      );
      response.json({ data: journeys });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/books', async (_request, response, next) => {
    try {
      response.json({ data: await bookRepository.list() });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/books', async (request, response, next) => {
    try {
      const { fileName, content } = request.body ?? {};
      const book = await bookRepository.create({ fileName, content });
      response.status(201).json({ data: book });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/books/:bookId', async (request, response, next) => {
    try {
      response.json({ data: await bookRepository.getById(request.params.bookId) });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/journeys/:journeyId/open', async (request, response, next) => {
    try {
      const result = await resolvedJourneyService.openForUser({
        userId: config.demoUserId,
        journeyId: request.params.journeyId,
      });
      response.json({ data: result });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/lessons/:lessonId/highlights', async (request, response, next) => {
    try {
      const highlights = await highlightService.listForLesson({
        userId: config.demoUserId,
        lessonId: request.params.lessonId,
      });
      response.json({ data: highlights });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/lessons/:lessonId/highlights', async (request, response, next) => {
    try {
      const {
        paragraphIndex,
        startOffset,
        endOffset,
        text,
        comment,
      } = request.body ?? {};
      const highlight = await highlightService.create({
        userId: config.demoUserId,
        lessonId: request.params.lessonId,
        paragraphIndex,
        startOffset,
        endOffset,
        text,
        comment,
      });
      response.status(201).json({ data: highlight });
    } catch (error) {
      next(error);
    }
  });

  app.patch('/api/highlights/:highlightId', async (request, response, next) => {
    try {
      const { comment } = request.body ?? {};
      const highlight = await highlightService.updateComment({
        userId: config.demoUserId,
        highlightId: request.params.highlightId,
        comment,
      });
      response.json({ data: highlight });
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/highlights/:highlightId', async (request, response, next) => {
    try {
      await highlightService.delete({
        userId: config.demoUserId,
        highlightId: request.params.highlightId,
      });
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.use(express.static('public'));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
