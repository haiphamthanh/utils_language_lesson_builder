import assert from 'node:assert/strict';
import test from 'node:test';

import { CreateJourneyService } from '../src/services/create-journey-service.js';

function outlineFixture() {
  return {
    title: 'Travel Writing Journey',
    steps: [
      { title: 'Introducing Travel', objective: 'Introduce travel.', continuation_hint: 'Go deeper.' },
      { title: 'A Place', objective: 'Describe a place.', continuation_hint: 'Tell a story.' },
      { title: 'A Story', objective: 'Share a story.', continuation_hint: 'Close it.' },
    ],
  };
}

test('creating a journey generates an outline, persists it, and generates the first lesson', async () => {
  const calls = [];
  const topicRepository = {
    async findById(id) {
      calls.push('find-topic');
      return { id, name: 'Travel', description: 'Trips.' };
    },
  };
  const journeyGenerator = {
    async generate(context) {
      calls.push('generate-outline');
      return outlineFixture();
    },
  };
  const journeyRepository = {
    async create({ userId, topic, language, level, outline }) {
      calls.push('create-journey');
      assert.equal(userId, 'user-1');
      assert.equal(topic.id, 'topic-1');
      assert.equal(language, 'English');
      assert.equal(level, 'Beginner');
      assert.equal(outline.steps.length, 3);
      return { journeyId: 'journey-1', lessonId: 'lesson-1' };
    },
  };
  const lessonGenerationService = {
    async generateForUser({ userId, lessonId }) {
      calls.push('generate-lesson');
      assert.equal(userId, 'user-1');
      assert.equal(lessonId, 'lesson-1');
    },
  };
  const currentLessonService = {
    async getForUser() {
      calls.push('read-current');
      return { id: 'lesson-1', title: 'Introducing Travel' };
    },
  };
  const service = new CreateJourneyService({
    topicRepository,
    journeyRepository,
    journeyGenerator,
    lessonGenerationService,
    currentLessonService,
  });

  const result = await service.createForUser({
    userId: 'user-1',
    topicId: 'topic-1',
    language: 'English',
    level: 'Beginner',
  });

  assert.deepEqual(calls, [
    'find-topic',
    'generate-outline',
    'create-journey',
    'generate-lesson',
    'read-current',
  ]);
  assert.equal(result.id, 'lesson-1');
});

test('creating a journey rejects an unknown topic', async () => {
  const service = new CreateJourneyService({
    topicRepository: { async findById() { return null; } },
    journeyRepository: {},
    journeyGenerator: {},
    lessonGenerationService: {},
    currentLessonService: {},
  });

  await assert.rejects(
    service.createForUser({
      userId: 'user-1',
      topicId: 'missing',
      language: 'English',
      level: 'Beginner',
    }),
    (error) => error.code === 'TOPIC_NOT_FOUND',
  );
});

test('creating a journey rejects missing request fields', async () => {
  const service = new CreateJourneyService({
    topicRepository: {},
    journeyRepository: {},
    journeyGenerator: {},
    lessonGenerationService: {},
    currentLessonService: {},
  });

  await assert.rejects(
    service.createForUser({ userId: 'user-1', topicId: 'topic-1', language: '', level: '' }),
    (error) => error.code === 'INVALID_JOURNEY_REQUEST',
  );
});
