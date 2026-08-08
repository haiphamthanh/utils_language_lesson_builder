import { pool } from './pool.js';
import { config } from '../config/env.js';

const ids = {
  topic: '00000000-0000-4000-8000-000000000010',
  journey: '00000000-0000-4000-8000-000000000020',
  steps: [
    '00000000-0000-4000-8000-000000000031',
    '00000000-0000-4000-8000-000000000032',
    '00000000-0000-4000-8000-000000000033',
  ],
  lesson: '00000000-0000-4000-8000-000000000041',
  progress: '00000000-0000-4000-8000-000000000061',
};

export async function seed(database = pool) {
  const client = await database.connect();

  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO users (id, email, display_name, timezone)
       VALUES ($1, 'demo@example.com', 'Demo Learner', $2)
       ON CONFLICT (id) DO NOTHING`,
      [config.demoUserId, config.timeZone],
    );
    await client.query(
      `INSERT INTO topics (id, name, slug, description, language_scope, is_system)
       VALUES ($1, 'Software Engineering', 'software-engineering',
         'Practice describing everyday software work.', 'English', true)
       ON CONFLICT (id) DO NOTHING`,
      [ids.topic],
    );
    await client.query(
      `INSERT INTO journeys
         (id, user_id, topic_id, language, level, title, status, max_cycles, planned_lesson_count)
       VALUES ($1, $2, $3, 'English', 'Beginner', 'Software Engineering English', 'active', 2, 3)
       ON CONFLICT (id) DO NOTHING`,
      [ids.journey, config.demoUserId, ids.topic],
    );

    const steps = [
      ['My Job', 'Introduce your role and workplace.', 'Continue with daily tasks.', false],
      ['My Daily Tasks', 'Describe a normal working day.', 'Continue with a small feature.', false],
      ['A Small Feature', 'Explain a feature you helped build.', 'Close the journey.', true],
    ];
    for (const [index, step] of steps.entries()) {
      await client.query(
        `INSERT INTO journey_steps
           (id, journey_id, sequence_number, title, objective, continuation_hint, is_final_step)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [ids.steps[index], ids.journey, index + 1, ...step],
      );
    }

    await client.query(
      `INSERT INTO lessons
         (id, journey_id, journey_step_id, sequence_number, cycle_number, status, generated_at)
       VALUES ($1, $2, $3, 1, 1, 'draft', NULL)
       ON CONFLICT (id) DO NOTHING`,
      [ids.lesson, ids.journey, ids.steps[0]],
    );
    await client.query(
      `INSERT INTO user_journey_progress
         (id, user_id, journey_id, current_lesson_id, current_step_number, current_cycle)
       VALUES ($1, $2, $3, $4, 1, 1)
       ON CONFLICT (id) DO NOTHING`,
      [ids.progress, config.demoUserId, ids.journey, ids.lesson],
    );
    await client.query('COMMIT');
    console.log('Seeded the example writing journey.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  seed()
    .then(() => pool.end())
    .catch(async (error) => {
      console.error(error);
      await pool.end();
      process.exitCode = 1;
    });
}
