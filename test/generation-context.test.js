import assert from 'node:assert/strict';
import test from 'node:test';

import { buildGenerationContext } from '../src/services/generation-context.js';

test('generation context carries the journey, prior content, and encountered words', () => {
  const lesson = {
    id: 'lesson-2',
    sequence_number: 2,
    cycle_number: 1,
    journey_id: 'journey-1',
    journey_title: 'Software English',
    language: 'English',
    level: 'Beginner',
    planned_lesson_count: 3,
    topic_name: 'Software Engineering',
    topic_description: 'Daily software work.',
    step_title: 'Daily Tasks',
    objective: 'Describe daily work.',
    continuation_hint: 'Continue with a feature.',
    is_final_step: false,
    active_version_id: null,
  };
  const previous = [
    {
      id: 'lesson-1',
      sequence_number: 1,
      title: 'My Job',
      content: 'I am a developer.',
      summary: 'The learner introduces their job.',
      review_content: {
        vocabulary: [{ text: 'Developer', meaning: 'lập trình viên' }],
        phrases: [{ text: 'work with', meaning: 'làm việc với' }],
      },
    },
  ];

  const context = buildGenerationContext(lesson, previous);

  assert.equal(context.topic.name, 'Software Engineering');
  assert.equal(context.previousLesson.content, 'I am a developer.');
  assert.deepEqual(
    context.encounteredItems.map((item) => item.text),
    ['Developer', 'work with'],
  );
  assert.equal(context.sequenceNumber, 2);
});
