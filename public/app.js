const elements = {
  loading: document.querySelector('#loading'),
  error: document.querySelector('#error'),
  mastheadEyebrow: document.querySelector('#masthead-eyebrow'),
  lesson: document.querySelector('#lesson'),
  journeyTitle: document.querySelector('#journey-title'),
  lessonTitle: document.querySelector('#lesson-title'),
  lessonPosition: document.querySelector('#lesson-position'),
  objective: document.querySelector('#objective'),
  lessonContent: document.querySelector('#lesson-content'),
  reviewList: document.querySelector('#review-list'),
  reviewDetail: document.querySelector('#review-detail'),
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
  journeySetup: document.querySelector('#journey-setup'),
  topicList: document.querySelector('#topic-list'),
  languageList: document.querySelector('#language-list'),
  levelList: document.querySelector('#level-list'),
  createJourneyButton: document.querySelector('#create-journey-button'),
  setupStatus: document.querySelector('#setup-status'),
  completion: document.querySelector('#completion'),
  completionJourneyTitle: document.querySelector('#completion-journey-title'),
  newJourneyButton: document.querySelector('#new-journey-button'),
};

const LANGUAGES = ['English', 'Japanese'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

let currentLesson = null;
let bookmarkedLesson = null;
let lessonTimeline = [];
let topics = [];
let selectedTopicId = null;
let selectedLanguage = null;
let selectedLevel = null;
let reviewItems = [];
let selectedReviewIndex = 0;

function reviewGroups(review) {
  return [
    {
      kind: 'Từ vựng',
      items: (review?.vocabulary ?? []).map((item) => ({
        text: item.text,
        meaning: item.meaning,
        examples: item.examples ?? [],
      })),
    },
    {
      kind: 'Cụm từ',
      items: (review?.phrases ?? []).map((item) => ({
        text: item.text,
        meaning: item.meaning,
        examples: item.examples ?? [],
      })),
    },
    {
      kind: 'Cấu trúc',
      items: (review?.grammar ?? []).map((item) => ({
        text: item.pattern,
        meaning: item.meaning,
        examples: item.examples ?? [],
      })),
    },
  ].filter((group) => group.items.length > 0);
}

function renderReviewDetail(item) {
  const detail = elements.reviewDetail;
  detail.replaceChildren();

  if (!item) {
    const placeholder = document.createElement('div');
    placeholder.className = 'review-detail-placeholder';
    const icon = document.createElement('div');
    icon.className = 'review-detail-placeholder-icon';
    icon.textContent = '→';
    const text = document.createElement('p');
    text.textContent = 'Chọn một mục bên trái để xem nghĩa và ví dụ.';
    placeholder.append(icon, text);
    detail.append(placeholder);
    return;
  }

  const card = document.createElement('div');
  card.className = 'review-detail-card';

  const kind = document.createElement('small');
  kind.className = 'review-detail-kind';
  kind.textContent = item.kind;

  const word = document.createElement('h3');
  word.className = 'review-detail-word';
  word.textContent = item.text;

  const meaning = document.createElement('p');
  meaning.className = 'review-detail-meaning';
  meaning.textContent = item.meaning;

  const examplesTitle = document.createElement('span');
  examplesTitle.className = 'review-detail-examples-title';
  examplesTitle.textContent = 'Ví dụ';

  const examples = document.createElement('ol');
  examples.className = 'review-detail-examples';
  for (const example of item.examples) {
    const listItem = document.createElement('li');
    listItem.textContent = example;
    examples.append(listItem);
  }

  card.append(kind, word, meaning, examplesTitle, examples);
  detail.append(card);
}

function selectReviewItem(index) {
  selectedReviewIndex = index;
  elements.reviewList.querySelectorAll('.review-item-button').forEach((button, i) => {
    const selected = i === index;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-selected', selected ? 'true' : 'false');
  });
  renderReviewDetail(reviewItems[index] ?? null);
}

function renderReview(lesson) {
  const groups = reviewGroups(lesson.review);
  reviewItems = groups.flatMap((group) =>
    group.items.map((item) => ({ ...item, kind: group.kind })),
  );
  selectedReviewIndex = 0;

  const list = elements.reviewList;
  list.replaceChildren();

  if (reviewItems.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'review-empty';
    empty.textContent = 'Bài này không có mục ôn tập.';
    list.append(empty);
    renderReviewDetail(null);
    return;
  }

  let flatIndex = 0;
  for (const group of groups) {
    const groupEl = document.createElement('div');
    groupEl.className = 'review-group';

    const groupTitle = document.createElement('h3');
    groupTitle.className = 'review-group-title';
    groupTitle.textContent = group.kind;
    groupEl.append(groupTitle);

    const listEl = document.createElement('ul');
    listEl.className = 'review-group-items';
    for (const item of group.items) {
      const index = flatIndex;
      const listItem = document.createElement('li');

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'review-item-button';
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', 'false');

      const kindLabel = document.createElement('span');
      kindLabel.className = 'review-item-kind';
      kindLabel.textContent = group.kind;

      const text = document.createElement('span');
      text.className = 'review-item-text';
      text.textContent = item.text;

      button.append(kindLabel, text);
      button.addEventListener('click', () => selectReviewItem(index));
      listItem.append(button);
      listEl.append(listItem);
      flatIndex += 1;
    }
    groupEl.append(listEl);
    list.append(groupEl);
  }

  selectReviewItem(0);
}

function showLesson(lesson) {
  currentLesson = lesson;
  elements.mastheadEyebrow.textContent = 'Bài học hôm nay';
  elements.journeyTitle.textContent = `${lesson.journey.title} · ${lesson.journey.level}`;
  elements.lessonTitle.textContent = lesson.title;
  elements.lessonPosition.textContent = `Bài ${lesson.sequenceNumber}/${lesson.journey.plannedLessonCount} · Vòng ${lesson.cycleNumber}`;
  elements.objective.textContent = lesson.objective;
  elements.lessonContent.textContent = lesson.content;
  renderReview(lesson);

  elements.loading.hidden = true;
  elements.error.hidden = true;
  elements.journeySetup.hidden = true;
  elements.completion.hidden = true;
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

function showJourneyCompleted(journey) {
  currentLesson = null;
  bookmarkedLesson = null;
  elements.mastheadEyebrow.textContent = 'Hành trình hoàn thành';
  elements.completionJourneyTitle.textContent = journey?.title ?? '';
  elements.loading.hidden = true;
  elements.error.hidden = true;
  elements.lesson.hidden = true;
  elements.journeySetup.hidden = true;
  elements.completion.hidden = false;
}

function showJourneySetup() {
  currentLesson = null;
  bookmarkedLesson = null;
  elements.mastheadEyebrow.textContent = 'Hành trình mới';
  elements.loading.hidden = true;
  elements.error.hidden = true;
  elements.lesson.hidden = true;
  elements.completion.hidden = true;
  elements.journeySetup.hidden = false;
  renderSetup();
}

async function loadTopics() {
  const response = await fetch('/api/topics');
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message ?? 'Không thể tải danh sách chủ đề.');
  return payload.data;
}

function markSelected(container, selector, value) {
  container.querySelectorAll(selector).forEach((button) => {
    const selected = button.dataset.value === value;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-checked', selected ? 'true' : 'false');
  });
}

function renderTopicList() {
  elements.topicList.replaceChildren();
  for (const topic of topics) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'topic-option';
    button.dataset.topicId = topic.id;
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', topic.id === selectedTopicId ? 'true' : 'false');

    const title = document.createElement('strong');
    title.textContent = topic.name;
    const description = document.createElement('span');
    description.textContent = topic.description;

    const check = document.createElement('span');
    check.className = 'topic-option-check';
    check.setAttribute('aria-hidden', 'true');
    check.textContent = '✓';

    button.append(title, description, check);
    button.addEventListener('click', () => selectTopic(topic.id));
    elements.topicList.append(button);
  }
}

function renderChoiceList(container, values, key) {
  container.replaceChildren();
  for (const value of values) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'choice-option';
    button.dataset.value = value;
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', 'false');
    button.textContent = value;
    button.addEventListener('click', () => {
      if (key === 'language') selectLanguage(value);
      else selectLevel(value);
    });
    container.append(button);
  }
}

function selectTopic(id) {
  selectedTopicId = id;
  elements.topicList.querySelectorAll('.topic-option').forEach((button) => {
    const selected = button.dataset.topicId === id;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-checked', selected ? 'true' : 'false');
  });
  updateCreateJourneyButton();
}

function selectLanguage(value) {
  selectedLanguage = value;
  markSelected(elements.languageList, '.choice-option', value);
  updateCreateJourneyButton();
}

function selectLevel(value) {
  selectedLevel = value;
  markSelected(elements.levelList, '.choice-option', value);
  updateCreateJourneyButton();
}

function updateCreateJourneyButton() {
  elements.createJourneyButton.disabled = !(
    selectedTopicId && selectedLanguage && selectedLevel
  );
}

async function renderSetup() {
  elements.createJourneyButton.disabled = true;
  elements.setupStatus.textContent = '';

  if (topics.length === 0) {
    try {
      topics = await loadTopics();
    } catch (error) {
      elements.setupStatus.textContent = error.message;
      return;
    }
  }

  renderTopicList();
  renderChoiceList(elements.languageList, LANGUAGES, 'language');
  renderChoiceList(elements.levelList, LEVELS, 'level');

  selectTopic(topics[0]?.id ?? null);
  selectLanguage(LANGUAGES[0]);
  selectLevel(LEVELS[0]);
}

async function loadCurrentLesson() {
  try {
    const response = await fetch('/api/lessons/current');
    const payload = await response.json();

    if (response.status === 404) {
      showJourneySetup();
      return null;
    }
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
  loadStats();
  const lesson = await loadCurrentLesson();
  if (lesson) await loadHistory(lesson);
}

initialize();

elements.previousLessonButton.addEventListener('click', () => {
  openTimelineLesson(-1);
});

elements.nextLessonButton.addEventListener('click', () => {
  openTimelineLesson(1);
});

elements.newJourneyButton.addEventListener('click', () => {
  showJourneySetup();
});

elements.createJourneyButton.addEventListener('click', async () => {
  elements.createJourneyButton.disabled = true;
  elements.setupStatus.textContent =
    'Đang vẽ lộ trình và sinh bài đầu tiên… có thể mất một chút thời gian.';

  try {
    const response = await fetch('/api/journeys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topicId: selectedTopicId,
        language: selectedLanguage,
        level: selectedLevel,
      }),
    });
    const payload = await response.json();

    if (!response.ok) throw new Error(payload.message ?? 'Không thể tạo hành trình.');

    bookmarkedLesson = payload.data;
    elements.journeySetup.hidden = true;
    showLesson(payload.data);
    await loadHistory(payload.data);
    loadStats();
  } catch (error) {
    elements.setupStatus.textContent = error.message;
    updateCreateJourneyButton();
  }
});

elements.completeButton.addEventListener('click', async () => {
  if (!currentLesson) return;

  const completedJourney = currentLesson.journey;
  elements.completeButton.disabled = true;
  elements.lessonStatus.textContent = 'Đang khóa bài và chuẩn bị bài tiếp theo…';

  try {
    const response = await fetch(`/api/lessons/${currentLesson.id}/complete`, {
      method: 'POST',
    });
    const payload = await response.json();

    if (!response.ok) throw new Error(payload.message ?? 'Không thể hoàn thành bài.');

    if (payload.data.journeyCompleted) {
      showJourneyCompleted(completedJourney);
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
