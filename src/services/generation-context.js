function collectEncounteredItems(previousLessons) {
  const encountered = new Map();

  for (const lesson of previousLessons) {
    for (const groupName of ['vocabulary', 'phrases']) {
      for (const item of lesson.review?.[groupName] ?? []) {
        const normalized = item.text.trim().toLocaleLowerCase();
        if (!encountered.has(normalized)) {
          encountered.set(normalized, {
            type: groupName === 'vocabulary' ? 'vocabulary' : 'phrase',
            text: item.text,
            meaning: item.meaning,
            firstSeenInLesson: lesson.sequenceNumber,
          });
        }
      }
    }
  }

  return [...encountered.values()];
}

export function buildGenerationContext(lesson, previousLessonRows) {
  const previousLessons = previousLessonRows.map((row) => ({
    id: row.id,
    sequenceNumber: row.sequence_number,
    title: row.title,
    content: row.content,
    summary: row.summary,
    review: row.review_content,
  }));

  return {
    lessonId: lesson.id,
    sequenceNumber: lesson.sequence_number,
    cycleNumber: lesson.cycle_number,
    journey: {
      id: lesson.journey_id,
      title: lesson.journey_title,
      language: lesson.language,
      level: lesson.level,
      plannedLessonCount: lesson.planned_lesson_count,
    },
    topic: {
      name: lesson.topic_name,
      description: lesson.topic_description,
    },
    step: {
      title: lesson.step_title,
      objective: lesson.objective,
      continuationHint: lesson.continuation_hint,
      isFinal: lesson.is_final_step,
    },
    previousLesson: previousLessons.at(-1) ?? null,
    previousLessons,
    encounteredItems: collectEncounteredItems(previousLessons),
    currentVersion: lesson.active_version_id
      ? {
          number: lesson.version_number,
          title: lesson.current_title,
          content: lesson.current_content,
          summary: lesson.current_summary,
          review: lesson.current_review,
        }
      : null,
  };
}
