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
  previousLessonButton: document.querySelector('#previous-lesson-button'),
  nextLessonButton: document.querySelector('#next-lesson-button'),
  viewingStatus: document.querySelector('#viewing-status'),
};

let currentLesson = null;
let bookmarkedLesson = null;
let lessonTimeline = [];

function reviewItems(review) {
  return [
    ...(review.vocabulary ?? []).map((item) => ({
      kind: 'Từ vựng',
      title: item.text,
      detail: item.meaning,
      examples: item.examples ?? [item.example].filter(Boolean),
    })),
    ...(review.phrases ?? []).map((item) => ({
      kind: 'Cụm từ',
      title: item.text,
      detail: item.meaning,
      examples: item.examples ?? [item.example].filter(Boolean),
    })),
    ...(review.grammar ?? []).map((item) => ({
      kind: 'Cấu trúc',
      title: item.pattern,
      detail: item.meaning ?? '',
      examples: item.examples ?? [item.example].filter(Boolean),
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

      const kind = document.createElement('small');
      kind.textContent = item.kind;
      const title = document.createElement('strong');
      title.textContent = item.title;
      const detail = document.createElement('span');
      detail.textContent = item.detail;
      const examples = document.createElement('ol');
      for (const example of item.examples) {
        const listItem = document.createElement('li');
        listItem.textContent = example;
        examples.append(listItem);
      }
      container.append(kind, title, detail, examples);
      return container;
    }),
  );

  elements.loading.hidden = true;
  elements.lesson.hidden = false;
  elements.completeButton.hidden =
    !lesson.isCurrent || lesson.status === 'completed';
  elements.regenerateButton.hidden =
    !lesson.isCurrent ||
    lesson.status !== 'ready' ||
    lesson.isLocked ||
    lesson.cycleNumber !== 1;
  elements.lessonStatus.textContent = lesson.isLocked
    ? 'Bài đã hoàn thành và được khóa.'
    : '';
  updateNavigation(lesson.id, lesson.isCurrent);
}

async function loadCurrentLesson() {
  try {
    const response = await fetch('/api/lessons/current');
    const payload = await response.json();

    if (!response.ok) throw new Error(payload.message ?? 'Không thể tải bài học.');
    bookmarkedLesson = payload.data;
    showLesson(payload.data);
    return payload.data;
  } catch (error) {
    elements.loading.hidden = true;
    elements.error.textContent = error.message;
    elements.error.hidden = false;
    return null;
  }
}

async function loadHistory(activeLesson = bookmarkedLesson) {
  try {
    const response = await fetch('/api/lessons/history');
    const payload = await response.json();
    if (!response.ok) return;

    lessonTimeline = [...payload.data];
    if (
      activeLesson &&
      !lessonTimeline.some((lesson) => lesson.id === activeLesson.id)
    ) {
      lessonTimeline.push({
        id: activeLesson.id,
        title: activeLesson.title,
        sequenceNumber: activeLesson.sequenceNumber,
        cycleNumber: activeLesson.cycleNumber,
        isCurrent: true,
      });
    }
    updateNavigation(currentLesson?.id, currentLesson?.isCurrent);
  } catch {
    lessonTimeline = activeLesson ? [{ id: activeLesson.id, isCurrent: true }] : [];
  }
}

function updateNavigation(lessonId, isCurrent) {
  const index = lessonTimeline.findIndex((lesson) => lesson.id === lessonId);
  elements.previousLessonButton.disabled = index <= 0;
  elements.nextLessonButton.disabled =
    index < 0 || index >= lessonTimeline.length - 1;
  elements.viewingStatus.textContent = isCurrent ? 'Bài hiện tại' : 'Bài đã khóa';
}

async function openTimelineLesson(offset) {
  const index = lessonTimeline.findIndex(
    (lesson) => lesson.id === currentLesson?.id,
  );
  const target = lessonTimeline[index + offset];
  if (!target) return;

  elements.previousLessonButton.disabled = true;
  elements.nextLessonButton.disabled = true;
  try {
    if (target.id === bookmarkedLesson?.id) {
      showLesson(bookmarkedLesson);
      return;
    }

    const response = await fetch(`/api/lessons/${target.id}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message ?? 'Không thể mở bài cũ.');
    showLesson(payload.data);
  } catch (error) {
    elements.lessonStatus.textContent = error.message;
    updateNavigation(currentLesson?.id, currentLesson?.isCurrent);
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

async function initialize() {
  const lesson = await loadCurrentLesson();
  if (lesson) await loadHistory(lesson);
}

initialize();
loadStats();

elements.previousLessonButton.addEventListener('click', () => {
  openTimelineLesson(-1);
});

elements.nextLessonButton.addEventListener('click', () => {
  openTimelineLesson(1);
});

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
      bookmarkedLesson = null;
      showLesson({
        ...currentLesson,
        isCurrent: false,
        status: 'completed',
        isLocked: true,
      });
      elements.lessonStatus.textContent = 'Bạn đã hoàn thành hành trình này.';
      elements.completeButton.hidden = true;
      await loadHistory(null);
      loadStats();
      return;
    }

    bookmarkedLesson = payload.data.nextLesson;
    showLesson(payload.data.nextLesson);
    elements.lessonStatus.textContent = payload.data.alreadyCompleted
      ? 'Bài này đã được ghi nhận trước đó.'
      : 'Đã khóa bài trước. Đây là bài tiếp theo.';
    await loadHistory(payload.data.nextLesson);
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
    bookmarkedLesson = payload.data;
    showLesson(payload.data);
    await loadHistory(payload.data);
    elements.lessonStatus.textContent = `Đang dùng phiên bản ${payload.data.versionNumber}.`;
  } catch (error) {
    elements.lessonStatus.textContent = error.message;
  } finally {
    elements.regenerateButton.disabled = false;
    elements.completeButton.disabled = false;
  }
});
