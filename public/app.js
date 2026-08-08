const elements = {
  loading: document.querySelector('#loading'),
  error: document.querySelector('#error'),
  lesson: document.querySelector('#lesson'),
  journeyTitle: document.querySelector('#journey-title'),
  lessonTitle: document.querySelector('#lesson-title'),
  lessonPosition: document.querySelector('#lesson-position'),
  objective: document.querySelector('#objective'),
  lessonContent: document.querySelector('#lesson-content'),
  reviewContent: document.querySelector('#review-content'),
};

function reviewItems(review) {
  return [
    ...(review.vocabulary ?? []).map((item) => ({
      title: item.text,
      detail: `${item.meaning} · ${item.example}`,
    })),
    ...(review.phrases ?? []).map((item) => ({
      title: item.text,
      detail: item.meaning,
    })),
    ...(review.grammar ?? []).map((item) => ({
      title: item.pattern,
      detail: item.example,
    })),
  ];
}

function showLesson(lesson) {
  elements.journeyTitle.textContent = `${lesson.journey.title} · ${lesson.journey.level}`;
  elements.lessonTitle.textContent = lesson.title;
  elements.lessonPosition.textContent = `Bài ${lesson.sequenceNumber}/${lesson.journey.plannedLessonCount} · Vòng ${lesson.cycleNumber}`;
  elements.objective.textContent = lesson.objective;
  elements.lessonContent.textContent = lesson.content;
  elements.reviewContent.replaceChildren(
    ...reviewItems(lesson.review).map((item) => {
      const container = document.createElement('div');
      container.className = 'review-item';

      const title = document.createElement('strong');
      title.textContent = item.title;
      const detail = document.createElement('span');
      detail.textContent = item.detail;
      container.append(title, detail);
      return container;
    }),
  );

  elements.loading.hidden = true;
  elements.lesson.hidden = false;
}

async function loadCurrentLesson() {
  try {
    const response = await fetch('/api/lessons/current');
    const payload = await response.json();

    if (!response.ok) throw new Error(payload.message ?? 'Không thể tải bài học.');
    showLesson(payload.data);
  } catch (error) {
    elements.loading.hidden = true;
    elements.error.textContent = error.message;
    elements.error.hidden = false;
  }
}

loadCurrentLesson();
