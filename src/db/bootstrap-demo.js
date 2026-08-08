import { config } from '../config/env.js';
import { createLessonGenerator } from '../integrations/create-lesson-generator.js';
import { LessonRepository } from '../repositories/lesson-repository.js';
import { LessonWorkflowRepository } from '../repositories/lesson-workflow-repository.js';
import { LessonGenerationService } from '../services/lesson-generation-service.js';
import { pool } from './pool.js';

export async function bootstrapDemo(database = pool) {
  const lessonRepository = new LessonRepository(database);
  const current = await lessonRepository.findCurrentStateByUserId(
    config.demoUserId,
  );

  if (!current || ['ready', 'completed'].includes(current.status)) {
    return { generated: false, status: current?.status ?? null };
  }
  if (current.status === 'generating') {
    throw new Error('The current demo lesson is already being generated.');
  }

  const generator = createLessonGenerator(
    config.generationProvider,
    config.opencode,
  );
  const generationService = new LessonGenerationService(
    new LessonWorkflowRepository(database),
    generator,
  );

  try {
    await generationService.generateForUser({
      userId: config.demoUserId,
      lessonId: current.id,
    });
    return { generated: true, status: 'ready' };
  } finally {
    await generator.close?.();
  }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  bootstrapDemo()
    .then((result) => {
      console.log(
        result.generated
          ? 'Generated the first demo lesson.'
          : `Demo lesson already ${result.status ?? 'unavailable'}; skipped generation.`,
      );
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
