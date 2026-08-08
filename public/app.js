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
  lessonStatus: document.querySelector('#lesson-status'),
  completeButton: document.querySelector('#complete-button'),
  regenerateButton: document.querySelector('#regenerate-button'),
  completedCount: document.querySelector('#completed-count'),
  studyDaysCount: document.querySelector('#study-days-count'),
  streakCount: document.querySelector('#streak-count'),
  vocabularyCount: document.querySelector('#vocabulary-count'),
};

let currentLesson = null;

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
  currentLesson = lesson;
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
  elements.completeButton.hidden = lesson.status === 'completed';
  elements.regenerateButton.hidden =
    lesson.status !== 'ready' || lesson.isLocked || lesson.cycleNumber !== 1;
  elements.lessonStatus.textContent = lesson.isLocked
    ? 'Bài đã hoàn thành và được khóa.'
    : '';
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

async function loadStats() {
  try {
    const response = await fetch('/api/stats/overview');
    const payload = await response.json();
    if (!response.ok) return;

    elements.completedCount.textContent = payload.data.lessons.completed;
    elements.studyDaysCount.textContent = payload.data.studyDays.total;
    elements.streakCount.textContent = payload.data.studyDays.currentStreak;
    elements.vocabularyCount.textContent = payload.data.vocabulary.encountered;
  } catch {
    // The lesson remains usable when optional statistics cannot be loaded.
  }
}

loadCurrentLesson();
loadStats();

elements.completeButton.addEventListener('click', async () => {
  if (!currentLesson) return;

  elements.completeButton.disabled = true;
  elements.lessonStatus.textContent = 'Đang khóa bài và chuẩn bị bài tiếp theo…';

  try {
    const response = await fetch(`/api/lessons/${currentLesson.id}/complete`, {
      method: 'POST',
    });
    const payload = await response.json();

    if (!response.ok) throw new Error(payload.message ?? 'Không thể hoàn thành bài.');

    if (payload.data.journeyCompleted) {
      elements.lessonStatus.textContent = 'Bạn đã hoàn thành hành trình này.';
      elements.completeButton.hidden = true;
      loadStats();
      return;
    }

    showLesson(payload.data.nextLesson);
    elements.lessonStatus.textContent = payload.data.alreadyCompleted
      ? 'Bài này đã được ghi nhận trước đó.'
      : 'Đã khóa bài trước. Đây là bài tiếp theo.';
    loadStats();
  } catch (error) {
    elements.lessonStatus.textContent = error.message;
  } finally {
    elements.completeButton.disabled = false;
  }
});

elements.regenerateButton.addEventListener('click', async () => {
  if (!currentLesson) return;

  elements.regenerateButton.disabled = true;
  elements.completeButton.disabled = true;
  elements.lessonStatus.textContent = 'Đang tạo một phiên bản khác…';

  try {
    const response = await fetch(`/api/lessons/${currentLesson.id}/regenerate`, {
      method: 'POST',
    });
    const payload = await response.json();

    if (!response.ok) throw new Error(payload.message ?? 'Không thể tạo lại bài.');
    showLesson(payload.data);
    elements.lessonStatus.textContent = `Đang dùng phiên bản ${payload.data.versionNumber}.`;
  } catch (error) {
    elements.lessonStatus.textContent = error.message;
  } finally {
    elements.regenerateButton.disabled = false;
    elements.completeButton.disabled = false;
  }
});
