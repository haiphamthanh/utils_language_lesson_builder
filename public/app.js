const elements = {
  loading: document.querySelector('#loading'),
  error: document.querySelector('#error'),
  mastheadEyebrow: document.querySelector('#masthead-eyebrow'),
  themeToggle: document.querySelector('#theme-toggle'),
  stageThemeToggle: document.querySelector('#stage-theme-toggle'),
  lessonTitle: document.querySelector('#lesson-title'),
  objective: document.querySelector('#objective'),
  objectiveToggle: document.querySelector('#objective-toggle'),
  objectivePopover: document.querySelector('#objective-popover'),
  lessonContent: document.querySelector('#lesson-content'),
  reviewList: document.querySelector('#review-list'),
  lessonStatus: document.querySelector('#lesson-status'),
  completeButton: document.querySelector('#complete-button'),
  regenerateButton: document.querySelector('#regenerate-button'),
  completedCount: document.querySelector('#completed-count'),
  studyDaysCount: document.querySelector('#study-days-count'),
  streakCount: document.querySelector('#streak-count'),
  vocabularyCount: document.querySelector('#vocabulary-count'),
  journeySetup: document.querySelector('#journey-setup'),
  topicList: document.querySelector('#topic-list'),
  languageList: document.querySelector('#language-list'),
  levelList: document.querySelector('#level-list'),
  createJourneyButton: document.querySelector('#create-journey-button'),
  setupStatus: document.querySelector('#setup-status'),
  completion: document.querySelector('#completion'),
  completionJourneyTitle: document.querySelector('#completion-journey-title'),
  newJourneyButton: document.querySelector('#new-journey-button'),
  highlightPopover: document.querySelector('#highlight-popover'),
  highlightCreateView: document.querySelector('#highlight-create-view'),
  highlightViewView: document.querySelector('#highlight-view-view'),
  highlightPreview: document.querySelector('#highlight-preview'),
  highlightCommentInput: document.querySelector('#highlight-comment-input'),
  highlightSaveButton: document.querySelector('#highlight-save-button'),
  highlightCancelButton: document.querySelector('#highlight-cancel-button'),
  highlightViewText: document.querySelector('#highlight-view-text'),
  highlightViewComment: document.querySelector('#highlight-view-comment'),
  highlightEditButton: document.querySelector('#highlight-edit-button'),
  highlightDeleteButton: document.querySelector('#highlight-delete-button'),
  home: document.querySelector('#home'),
  homeCreateButton: document.querySelector('#home-create-button'),
  homeSearchInput: document.querySelector('#home-search-input'),
  homeLanguageFilter: document.querySelector('#home-language-filter'),
  homeShelf: document.querySelector('#home-shelf'),
  homeEmpty: document.querySelector('#home-empty'),
  backHomeButton: document.querySelector('#back-home-button'),
  busyOverlay: document.querySelector('#busy-overlay'),
  busyMessage: document.querySelector('#busy-message'),
  bookStage: document.querySelector('#book-stage'),
  antiqueBook: document.querySelector('.book-rig .antique-book'),
  stageTitle: document.querySelector('#stage-title'),
  stageDescription: document.querySelector('#stage-description'),
  stageCollection: document.querySelector('#stage-collection'),
  coverTitle: document.querySelector('#cover-title'),
  coverSubtitle: document.querySelector('#cover-subtitle'),
  stateLabelText: document.querySelector('#state-label-text'),
  statePulse: document.querySelector('#state-pulse'),
  closeBookButton: document.querySelector('#close-book-button'),
  readerPrev: document.querySelector('#reader-prev'),
  readerNext: document.querySelector('#reader-next'),
  readerPageLabel: document.querySelector('#reader-page-label'),
  reviewTitle: document.querySelector('#review-title'),
  reviewDetail: document.querySelector('#review-detail'),
  reviewDetailKind: document.querySelector('#review-detail-kind'),
  reviewDetailMeaning: document.querySelector('#review-detail-meaning'),
  reviewDetailExamples: document.querySelector('#review-detail-examples'),
  reviewDetailClose: document.querySelector('#review-detail-close'),
};

const LANGUAGES = ['English', 'Japanese', 'Chinese'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const THEME_STORAGE_KEY = 'writing-journey:theme';

function getStoredTheme() {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return ['auto', 'light', 'dark'].includes(value) ? value : 'auto';
  } catch {
    return 'auto';
  }
}

function getResolvedTheme() {
  const theme = getStoredTheme();
  if (theme === 'light' || theme === 'dark') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function applyTheme() {
  document.body.dataset.theme = getResolvedTheme();
}

function cycleTheme() {
  const current = getStoredTheme();
  const next =
    current === 'auto' ? 'light' : current === 'light' ? 'dark' : 'auto';
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // The theme still applies for this session when storage is unavailable.
  }
  applyTheme();
}

elements.themeToggle.addEventListener('click', () => {
  cycleTheme();
});

elements.stageThemeToggle.addEventListener('click', () => {
  cycleTheme();
});

window
  .matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', applyTheme);

applyTheme();

let currentLesson = null;
let bookmarkedLesson = null;
let lessonTimeline = [];
let topics = [];
let selectedTopicId = null;
let selectedLanguage = null;
let selectedLevel = null;
let reviewItems = [];
let selectedReviewIndex = -1;
let lessonHighlights = [];
let pendingHighlight = null;
let editingHighlightId = null;
let popoverActiveHighlight = null;
let journeys = [];
let libraryQuery = '';
let libraryLanguageFilter = 'ALL';
let activeJourneyId = null;
const lessonCache = new Map();
const lessonLoadPromises = new Map();

/* ---------- Busy (single-flight generation) ---------- */

const BUSY_MESSAGES = {
  journey_creation:
    'Đang vẽ lộ trình và sinh bài đầu tiên… có thể mất một chút thời gian.',
  lesson_generation: 'Đang chuẩn bị bài tiếp theo… có thể mất một chút thời gian.',
  regeneration: 'Đang tạo một phiên bản khác… có thể mất một chút thời gian.',
};
const BUSY_POLL_MS = 3_000;
let busyPollTimer = null;

function showBusy(message) {
  elements.busyMessage.textContent = message ?? 'Đang xử lý…';
  elements.busyOverlay.hidden = false;
}

function hideBusy() {
  if (busyPollTimer) {
    clearTimeout(busyPollTimer);
    busyPollTimer = null;
  }
  elements.busyOverlay.hidden = true;
}

async function loadStatus() {
  try {
    const response = await fetch('/api/status');
    const payload = await response.json();
    if (!response.ok) return null;
    return payload.data;
  } catch {
    return null;
  }
}

async function refreshAfterGeneration() {
  loadStats();
  await loadLibrary();
  showHomeOrSetup();
}

async function pollUntilIdle() {
  const status = await loadStatus();
  if (!status || !status.busy) {
    hideBusy();
    await refreshAfterGeneration();
    return;
  }
  showBusy(BUSY_MESSAGES[status.requestType] ?? 'Đang xử lý…');
  busyPollTimer = window.setTimeout(pollUntilIdle, BUSY_POLL_MS);
}

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

function openReviewDetail(item) {
  if (!item) return;
  elements.reviewTitle.textContent = item.text;
  elements.reviewDetailKind.textContent = item.kind;
  elements.reviewDetailMeaning.textContent = item.meaning;
  const examples = elements.reviewDetailExamples;
  examples.replaceChildren();
  for (const example of item.examples ?? []) {
    const listItem = document.createElement('li');
    listItem.textContent = example;
    examples.append(listItem);
  }
  elements.reviewList.hidden = true;
  elements.reviewDetail.hidden = false;
  elements.reviewDetailClose.hidden = false;
}

function closeReviewDetail() {
  selectedReviewIndex = -1;
  elements.reviewTitle.textContent = 'Từ vựng và cấu trúc';
  elements.reviewList.hidden = false;
  elements.reviewDetail.hidden = true;
  elements.reviewDetailClose.hidden = true;
  elements.reviewList.querySelectorAll('.review-item-button').forEach((button) => {
    button.classList.remove('is-active');
    button.setAttribute('aria-pressed', 'false');
  });
}

function selectReviewItem(index) {
  selectedReviewIndex = index;
  elements.reviewList.querySelectorAll('.review-item-button').forEach((button, i) => {
    const selected = i === index;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', selected ? 'true' : 'false');
  });
  openReviewDetail(reviewItems[index]);
}

function renderReview(lesson) {
  const groups = reviewGroups(lesson.review);
  reviewItems = groups.flatMap((group) =>
    group.items.map((item) => ({ ...item, kind: group.kind })),
  );
  selectedReviewIndex = -1;

  const list = elements.reviewList;
  list.replaceChildren();
  closeReviewDetail();

  if (reviewItems.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'review-empty';
    empty.textContent = 'Bài này không có mục ôn tập.';
    list.append(empty);
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
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-label', `${item.text} — ${item.meaning}`);

      const text = document.createElement('span');
      text.className = 'review-item-text';
      text.textContent = item.text;

      button.append(text);
      button.addEventListener('click', () => selectReviewItem(index));
      listItem.append(button);
      listEl.append(listItem);
      flatIndex += 1;
    }
    groupEl.append(listEl);
    list.append(groupEl);
  }

}

/* ---------- Highlights ---------- */

function normalizeSelectionText(text) {
  return String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getPlainTextFromNode(root) {
  if (!root) return '';
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return node.parentElement?.closest('.highlight-index-badge')
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT;
    },
  });

  let result = '';
  let current = walker.nextNode();
  while (current) {
    result += current.nodeValue || '';
    current = walker.nextNode();
  }
  return result;
}

function getClosestParagraph(node) {
  if (!node) return null;
  if (node.nodeType === Node.TEXT_NODE) {
    return node.parentElement?.closest('[data-paragraph-index]') || null;
  }
  if (typeof node.closest === 'function') {
    return node.closest('[data-paragraph-index]');
  }
  return null;
}

function getOffsetWithinParagraph(paragraphElement, container, offset) {
  const range = document.createRange();
  range.selectNodeContents(paragraphElement);
  range.setEnd(container, offset);
  return getPlainTextFromNode(range.cloneContents()).length;
}

function getTrimmedSelectionRange(rawText, startOffset, endOffset) {
  const source = String(rawText || '');
  const leadingWhitespace = source.match(/^\s*/u)?.[0].length || 0;
  const trailingWhitespace = source.match(/\s*$/u)?.[0].length || 0;
  return {
    startOffset: startOffset + leadingWhitespace,
    endOffset: Math.max(
      startOffset + leadingWhitespace,
      endOffset - trailingWhitespace,
    ),
    text: normalizeSelectionText(source),
  };
}

function getHighlightRangesForParagraph(paragraphIndex, text) {
  const ranges = lessonHighlights
    .filter((item) => item.paragraphIndex === paragraphIndex)
    .filter((item) => {
      const storedText = normalizeSelectionText(item.text);
      const currentText = normalizeSelectionText(
        text.slice(item.startOffset, item.endOffset),
      );
      return storedText === currentText;
    })
    .sort((left, right) => left.startOffset - right.startOffset)
    .reduce((acc, item) => {
      const startOffset = Math.max(0, item.startOffset);
      const endOffset = Math.min(text.length, item.endOffset);
      const previous = acc.at(-1);
      if (endOffset <= startOffset) return acc;
      if (previous && startOffset < previous.endOffset) return acc;
      acc.push({ ...item, type: 'saved', startOffset, endOffset });
      return acc;
    }, []);

  if (
    pendingHighlight &&
    pendingHighlight.paragraphIndex === paragraphIndex &&
    pendingHighlight.endOffset > pendingHighlight.startOffset
  ) {
    const overlaps = ranges.some(
      (item) =>
        pendingHighlight.startOffset < item.endOffset &&
        pendingHighlight.endOffset > item.startOffset,
    );
    if (!overlaps) {
      ranges.push({
        id: '__pending__',
        ...pendingHighlight,
        type: 'pending',
      });
    }
  }

  return ranges.sort((left, right) => left.startOffset - right.startOffset);
}

function buildParagraphFragment(paragraphIndex, text) {
  const ranges = getHighlightRangesForParagraph(paragraphIndex, text);
  const fragment = document.createDocumentFragment();
  let cursor = 0;

  ranges.forEach((range, index) => {
    if (range.startOffset > cursor) {
      fragment.append(document.createTextNode(text.slice(cursor, range.startOffset)));
    }

    const mark = document.createElement('mark');
    mark.className =
      range.type === 'pending' ? 'pending-note-highlight' : 'saved-note-highlight';
    mark.setAttribute('role', 'button');
    mark.setAttribute('tabindex', '0');

    if (range.type === 'saved') {
      mark.dataset.highlightId = range.id;
      const badge = document.createElement('span');
      badge.className = 'highlight-index-badge';
      badge.setAttribute('aria-hidden', 'true');
      badge.textContent = String(index + 1);
      mark.append(badge);
      mark.addEventListener('click', (event) => {
        event.stopPropagation();
        openHighlightPopover(range.id, mark);
      });
      mark.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openHighlightPopover(range.id, mark);
        }
      });
    }

    mark.append(document.createTextNode(text.slice(range.startOffset, range.endOffset)));
    fragment.append(mark);
    cursor = range.endOffset;
  });

  if (cursor < text.length) {
    fragment.append(document.createTextNode(text.slice(cursor)));
  }

  return fragment;
}

function renderLessonContent(content) {
  const container = elements.lessonContent;
  container.replaceChildren();

  const paragraphs = String(content ?? '').split('\n');
  paragraphs.forEach((text, index) => {
    const paragraph = document.createElement('p');
    paragraph.className = 'lesson-paragraph';
    paragraph.dataset.paragraphIndex = String(index);
    paragraph.append(buildParagraphFragment(index, text));
    container.append(paragraph);
  });
}

async function loadHighlights(lessonId) {
  try {
    const response = await fetch(`/api/lessons/${lessonId}/highlights`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message ?? 'Không thể tải các đánh dấu.');
    lessonHighlights = payload.data ?? [];
    renderLessonContent(currentLesson?.content ?? '');
  } catch {
    lessonHighlights = [];
  }
}

function hideHighlightPopover({ clearSelection = true } = {}) {
  pendingHighlight = null;
  editingHighlightId = null;
  popoverActiveHighlight = null;
  elements.highlightPopover.hidden = true;
  elements.highlightPopover.style.left = '';
  elements.highlightPopover.style.top = '';
  elements.highlightCommentInput.value = '';
  if (clearSelection) window.getSelection()?.removeAllRanges();
  if (currentLesson) renderLessonContent(currentLesson.content);
}

function positionHighlightPopover(anchorRect) {
  const popover = elements.highlightPopover;
  const width = popover.offsetWidth || 320;
  const gap = 10;
  const centerX = anchorRect
    ? anchorRect.left + anchorRect.width / 2
    : window.innerWidth / 2;
  const centerY = anchorRect
    ? anchorRect.top + anchorRect.height / 2
    : window.innerHeight / 2;
  const left = Math.min(
    Math.max(gap, centerX - width / 2),
    window.innerWidth - width - gap,
  );
  const top = anchorRect ? centerY + gap : Math.max(gap, centerY);
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}

function showHighlightCreateView(selectionData, anchorRect, comment = '') {
  popoverActiveHighlight = null;
  elements.highlightViewView.hidden = true;
  elements.highlightCreateView.hidden = false;
  elements.highlightPreview.textContent = `“${selectionData.text}”`;
  elements.highlightCommentInput.value = comment;
  elements.highlightSaveButton.textContent = editingHighlightId ? 'Lưu' : 'Đánh dấu';
  elements.highlightPopover.hidden = false;
  positionHighlightPopover(anchorRect);
  window.setTimeout(() => elements.highlightCommentInput.focus(), 0);
}

function showHighlightViewPopover(highlight, anchorElement) {
  elements.highlightCreateView.hidden = true;
  elements.highlightViewView.hidden = false;
  elements.highlightViewText.textContent = `“${highlight.text}”`;
  const hasComment = Boolean(highlight.comment?.trim());
  elements.highlightViewComment.textContent = highlight.comment ?? '';
  elements.highlightViewComment.hidden = !hasComment;
  elements.highlightPopover.hidden = false;
  const rect =
    anchorElement?.getBoundingClientRect() ??
    elements.highlightViewText.getBoundingClientRect();
  positionHighlightPopover(rect);
}

function getSelectionAnchorRect(range) {
  const rects = [...range.getClientRects()].filter(
    (rect) => rect.width || rect.height,
  );
  if (rects.length) return rects[rects.length - 1];
  const bounding = range.getBoundingClientRect();
  if (bounding.width || bounding.height) return bounding;
  return undefined;
}

function maybeShowHighlightPopover() {
  if (!currentLesson) {
    hideHighlightPopover();
    return;
  }

  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !selection.rangeCount) {
    hideHighlightPopover();
    return;
  }

  const range = selection.getRangeAt(0);
  const anchorRect = getSelectionAnchorRect(range);
  const startParagraph = getClosestParagraph(range.startContainer);
  const endParagraph = getClosestParagraph(range.endContainer);
  if (
    !startParagraph ||
    startParagraph !== endParagraph ||
    !elements.lessonContent.contains(startParagraph)
  ) {
    hideHighlightPopover();
    return;
  }

  const rawText = getPlainTextFromNode(range.cloneContents());
  const normalizedText = normalizeSelectionText(rawText);
  if (!normalizedText) {
    hideHighlightPopover();
    return;
  }

  const paragraphIndex = Number(startParagraph.dataset.paragraphIndex);
  const rawStartOffset = getOffsetWithinParagraph(
    startParagraph,
    range.startContainer,
    range.startOffset,
  );
  const rawEndOffset = getOffsetWithinParagraph(
    startParagraph,
    range.endContainer,
    range.endOffset,
  );
  const trimmed = getTrimmedSelectionRange(rawText, rawStartOffset, rawEndOffset);

  if (
    !Number.isInteger(paragraphIndex) ||
    trimmed.endOffset <= trimmed.startOffset
  ) {
    hideHighlightPopover();
    return;
  }

  pendingHighlight = {
    paragraphIndex,
    startOffset: trimmed.startOffset,
    endOffset: trimmed.endOffset,
    text: trimmed.text,
  };
  editingHighlightId = null;
  renderLessonContent(currentLesson.content);
  showHighlightCreateView(pendingHighlight, anchorRect);
}

function openHighlightPopover(highlightId, anchorElement) {
  const highlight = lessonHighlights.find((item) => item.id === highlightId);
  if (!highlight) return;
  popoverActiveHighlight = highlight;
  window.getSelection()?.removeAllRanges();
  showHighlightViewPopover(highlight, anchorElement);
}

async function saveHighlight() {
  if (!currentLesson || !pendingHighlight) return;

  const comment = elements.highlightCommentInput.value.trim();
  elements.highlightSaveButton.disabled = true;

  try {
    if (editingHighlightId) {
      const response = await fetch(`/api/highlights/${editingHighlightId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? 'Không thể lưu ghi chú.');
    } else {
      const response = await fetch(
        `/api/lessons/${currentLesson.id}/highlights`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...pendingHighlight, comment }),
        },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? 'Không thể tạo đánh dấu.');
    }

    hideHighlightPopover();
    await loadHighlights(currentLesson.id);
  } catch (error) {
    elements.highlightPreview.textContent = error.message;
  } finally {
    elements.highlightSaveButton.disabled = false;
  }
}

async function deleteHighlight() {
  if (!currentLesson || !popoverActiveHighlight) return;

  elements.highlightDeleteButton.disabled = true;
  try {
    const response = await fetch(
      `/api/highlights/${popoverActiveHighlight.id}`,
      { method: 'DELETE' },
    );
    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload.message ?? 'Không thể xoá đánh dấu.');
    }
    hideHighlightPopover();
    await loadHighlights(currentLesson.id);
  } catch (error) {
    elements.highlightViewComment.textContent = error.message;
    elements.highlightViewComment.hidden = false;
  } finally {
    elements.highlightDeleteButton.disabled = false;
  }
}

function showLesson(lesson) {
  lessonCache.set(lesson.id, lesson);
  currentLesson = lesson;
  lessonHighlights = [];
  pendingHighlight = null;
  editingHighlightId = null;
  popoverActiveHighlight = null;
  elements.highlightPopover.hidden = true;
  closeObjectivePopover();
  closeReviewDetail();
  activeJourneyId = lesson.journey?.id ?? null;
  elements.mastheadEyebrow.textContent = 'Hành trình chi tiết';
  elements.lessonTitle.textContent = lesson.title;
  elements.objective.textContent = lesson.objective;
  renderLessonContent(lesson.content);
  renderReview(lesson);

  elements.loading.hidden = true;
  elements.error.hidden = true;
  elements.home.hidden = true;
  elements.journeySetup.hidden = true;
  elements.completion.hidden = true;

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
  loadHighlights(lesson.id);
}

function showJourneyCompleted(journey) {
  currentLesson = null;
  bookmarkedLesson = null;
  activeJourneyId = journey?.id ?? null;
  hideHighlightPopover();
  closeReviewDetail();
  resetBook();
  elements.mastheadEyebrow.textContent = 'Hành trình hoàn thành';
  elements.completionJourneyTitle.textContent = journey?.title ?? '';
  elements.loading.hidden = true;
  elements.error.hidden = true;
  elements.home.hidden = true;
  elements.journeySetup.hidden = true;
  elements.completion.hidden = false;
}

function showJourneySetup() {
  currentLesson = null;
  bookmarkedLesson = null;
  activeJourneyId = null;
  hideHighlightPopover();
  closeReviewDetail();
  resetBook();
  elements.mastheadEyebrow.textContent = 'Hành trình mới';
  elements.loading.hidden = true;
  elements.error.hidden = true;
  elements.home.hidden = true;
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

/* ---------- Home screen (journey library) ---------- */

const JOURNEY_STATUS_LABELS = {
  active: 'Đang học',
  reviewing: 'Đang ôn',
  completed: 'Đã hoàn thành',
  paused: 'Tạm dừng',
};

function refreshActiveJourney() {
  const current = journeys.find(
    (journey) => journey.status === 'active' || journey.status === 'reviewing',
  );
  if (current) activeJourneyId = current.id;
  else if (!journeys.some((journey) => journey.id === activeJourneyId)) {
    activeJourneyId = null;
  }
}

async function loadLibrary() {
  try {
    const response = await fetch('/api/journeys');
    const payload = await response.json();
    if (!response.ok) return;
    journeys = payload.data ?? [];
  } catch {
    // The shelf stays usable even when the library cannot load.
  }
  renderHome();
}

function renderHomeLanguageFilter() {
  const container = elements.homeLanguageFilter;
  container.replaceChildren();

  const languages = [
    'ALL',
    ...new Set(journeys.map((journey) => journey.language).filter(Boolean)),
  ];

  for (const language of languages) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'library-filter-chip';
    button.dataset.value = language;
    button.textContent = language === 'ALL' ? 'Tất cả' : language;
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', 'false');
    button.addEventListener('click', () => {
      libraryLanguageFilter = language;
      markSelected(container, '.library-filter-chip', language);
      renderHomeShelf();
    });
    container.append(button);
  }

  markSelected(container, '.library-filter-chip', libraryLanguageFilter);
}

function getFilteredJourneys() {
  const query = libraryQuery.trim().toLowerCase();
  return journeys.filter((journey) => {
    const matchesQuery =
      !query || journey.title.toLowerCase().includes(query);
    const matchesLanguage =
      libraryLanguageFilter === 'ALL' ||
      journey.language === libraryLanguageFilter;
    return matchesQuery && matchesLanguage;
  });
}

const BOOK_HEIGHTS = [168, 152, 182, 158, 176, 146, 188, 162];
const BOOKS_PER_ROW = 7;

function buildBookCard(journey, index = 0) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'book';
  button.dataset.journeyId = journey.id;
  button.dataset.language = journey.language ?? '';
  if (journey.id === activeJourneyId) button.classList.add('is-open');
  button.style.height = `${BOOK_HEIGHTS[index % BOOK_HEIGHTS.length]}px`;
  button.setAttribute(
    'aria-label',
    `Mở hành trình ${journey.title} (${journey.language} · ${journey.level}). Tiến độ ${journey.completedLessons}/${journey.totalLessons}.`,
  );
  button.title = `${journey.title}\n${journey.language} · ${journey.level}\n${
    JOURNEY_STATUS_LABELS[journey.status] ?? journey.status
  }`;

  const spine = document.createElement('span');
  spine.className = 'book-spine';
  spine.setAttribute('aria-hidden', 'true');

  const dot = document.createElement('span');
  dot.className = `book-status-dot book-status-${journey.status}`;
  dot.setAttribute('aria-hidden', 'true');

  const title = document.createElement('strong');
  title.className = 'book-title';
  title.textContent = journey.title;

  const progress = document.createElement('span');
  progress.className = 'book-progress';
  progress.setAttribute('aria-hidden', 'true');
  const progressFill = document.createElement('span');
  progressFill.className = 'book-progress-fill';
  const percent =
    journey.totalLessons > 0
      ? Math.min(
          100,
          Math.round((journey.completedLessons / journey.totalLessons) * 100),
        )
      : 0;
  progressFill.style.height = `${percent}%`;
  progress.append(progressFill);

  const footer = document.createElement('span');
  footer.className = 'book-footer';

  const meta = document.createElement('span');
  meta.className = 'book-meta';
  meta.textContent = `${journey.language} · ${journey.level}`;

  const position = document.createElement('span');
  position.className = 'book-position';
  position.textContent = `${journey.completedLessons}/${journey.totalLessons} bài`;

  footer.append(meta, position);
  button.append(spine, dot, title, progress, footer);
  button.addEventListener('click', () => openJourney(journey.id, button));
  return button;
}

function renderHomeShelf() {
  const filtered = getFilteredJourneys();
  const shelf = elements.homeShelf;
  shelf.replaceChildren();

  for (let start = 0; start < filtered.length; start += BOOKS_PER_ROW) {
    const row = document.createElement('div');
    row.className = 'bookshelf-row';
    filtered
      .slice(start, start + BOOKS_PER_ROW)
      .forEach((journey, index) => row.append(buildBookCard(journey, start + index)));
    shelf.append(row);
  }

  elements.homeEmpty.hidden = filtered.length > 0;
  elements.homeEmpty.textContent =
    journeys.length === 0
      ? 'Chưa có hành trình nào. Hãy bắt đầu một hành trình mới.'
      : 'Không có hành trình nào khớp với bộ lọc.';
}

function renderHome() {
  refreshActiveJourney();
  renderHomeLanguageFilter();
  renderHomeShelf();
}

function showHome() {
  currentLesson = null;
  bookmarkedLesson = null;
  hideHighlightPopover();
  closeReviewDetail();
  resetBook();
  renderHome();
  elements.mastheadEyebrow.textContent = 'Kệ sách hành trình';
  elements.loading.hidden = true;
  elements.error.hidden = true;
  elements.journeySetup.hidden = true;
  elements.completion.hidden = true;
  elements.home.hidden = false;
}

function showHomeOrSetup() {
  if (journeys.length === 0) showJourneySetup();
  else showHome();
}

async function openJourney(journeyId, originEl) {
  hideHighlightPopover();
  closeReviewDetail();
  elements.error.hidden = true;
  showBusy('Đang mở hành trình…');

  bookFlyOriginRect = originEl ? originEl.getBoundingClientRect() : null;
  const journey = journeys.find((item) => item.id === journeyId);
  bookFlyTitle = journey?.title ?? '';

  try {
    const response = await fetch(`/api/journeys/${journeyId}/open`, {
      method: 'POST',
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message ?? 'Không thể mở hành trình.');

    activeJourneyId = journeyId;

    if (payload.data.journeyCompleted) {
      hideBusy();
      showJourneyCompleted(payload.data.journey);
      await loadHistory(null);
    } else {
      hideBusy();
      bookmarkedLesson = payload.data.lesson;
      showLesson(payload.data.lesson);
      playBookOpening(payload.data.lesson);
      await loadHistory(payload.data.lesson);
    }
    await loadLibrary();
    loadStats();
  } catch (error) {
    elements.error.textContent = error.message;
    elements.error.hidden = false;
  } finally {
    hideBusy();
  }
}

function markSelected(container, selector, value) {
  container.querySelectorAll(selector).forEach((button) => {
    const selected = button.dataset.value === value;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-checked', selected ? 'true' : 'false');
  });
}

function getAvailableTopics() {
  return topics.filter(
    (topic) =>
      !topic.language_scope || topic.language_scope === selectedLanguage,
  );
}

function renderTopicList() {
  elements.topicList.replaceChildren();
  const available = getAvailableTopics();

  if (available.length === 0) {
    selectedTopicId = null;
    const empty = document.createElement('p');
    empty.className = 'review-empty';
    empty.textContent = 'Chưa có chủ đề phù hợp với ngôn ngữ này.';
    elements.topicList.append(empty);
    updateCreateJourneyButton();
    return;
  }

  if (!available.some((topic) => topic.id === selectedTopicId)) {
    selectedTopicId = available[0].id;
  }

  for (const topic of available) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'topic-option';
    button.dataset.topicId = topic.id;
    button.classList.toggle('is-selected', topic.id === selectedTopicId);
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

  updateCreateJourneyButton();
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
  renderTopicList();
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

  renderChoiceList(elements.languageList, LANGUAGES, 'language');
  renderChoiceList(elements.levelList, LEVELS, 'level');

  selectLanguage(LANGUAGES[0]);
  selectLevel(LEVELS[0]);
}

async function loadHistory(activeLesson = bookmarkedLesson) {
  if (activeLesson?.id) lessonCache.set(activeLesson.id, activeLesson);
  try {
    const journeyId = currentLesson?.journey?.id;
    const url = journeyId
      ? `/api/lessons/history?journeyId=${encodeURIComponent(journeyId)}`
      : '/api/lessons/history';
    const response = await fetch(url);
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
    preloadAdjacentLessons(currentLesson?.id);
  } catch {
    lessonTimeline = activeLesson ? [{ id: activeLesson.id, isCurrent: true }] : [];
    updateNavigation(currentLesson?.id, currentLesson?.isCurrent);
  }
}

async function loadTimelineLesson(lessonId) {
  if (!lessonId) return null;
  if (lessonCache.has(lessonId)) return lessonCache.get(lessonId);
  if (lessonLoadPromises.has(lessonId)) return lessonLoadPromises.get(lessonId);

  const request = fetch(`/api/lessons/${lessonId}`)
    .then(async (response) => {
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message ?? 'Không thể tải trang sách.');
      }
      lessonCache.set(lessonId, payload.data);
      return payload.data;
    })
    .finally(() => lessonLoadPromises.delete(lessonId));

  lessonLoadPromises.set(lessonId, request);
  return request;
}

function preloadAdjacentLessons(lessonId) {
  const index = lessonTimeline.findIndex((lesson) => lesson.id === lessonId);
  if (index < 0) return;

  const adjacent = [lessonTimeline[index - 1], lessonTimeline[index + 1]].filter(
    Boolean,
  );
  for (const lesson of adjacent) {
    loadTimelineLesson(lesson.id)
      .then(() => {
        if (currentLesson?.id === lessonId && !isFlipping) {
          updateNavigation(lessonId, currentLesson.isCurrent);
        }
      })
      .catch(() => {
        if (currentLesson?.id === lessonId && !isFlipping) {
          updateNavigation(lessonId, currentLesson.isCurrent);
        }
      });
  }
}

function updateNavigation(lessonId, isCurrent) {
  const index = lessonTimeline.findIndex((lesson) => lesson.id === lessonId);
  const leftPage = elements.bookStage.querySelector('.left-paper');
  const rightPage = elements.bookStage.querySelector('.right-paper');
  const previousLesson = index > 0 ? lessonTimeline[index - 1] : null;
  const nextLesson =
    index >= 0 && index < lessonTimeline.length - 1
      ? lessonTimeline[index + 1]
      : null;
  const previousIsLoading =
    previousLesson && !lessonCache.has(previousLesson.id);
  const nextIsLoading = nextLesson && !lessonCache.has(nextLesson.id);
  const canPrev = !isFlipping && previousLesson && !previousIsLoading;
  const canNext = !isFlipping && nextLesson && !nextIsLoading;

  leftPage.classList.toggle('can-flip', canPrev);
  rightPage.classList.toggle('can-flip', canNext);
  leftPage.classList.toggle('is-preloading', Boolean(previousIsLoading));
  rightPage.classList.toggle('is-preloading', Boolean(nextIsLoading));
  elements.bookStage.querySelector('.zone-prev').disabled = !canPrev;
  elements.bookStage.querySelector('.zone-next').disabled = !canNext;
  elements.readerPrev.disabled = !canPrev;
  elements.readerNext.disabled = !canNext;
  elements.readerPrev.classList.toggle('is-preloading', Boolean(previousIsLoading));
  elements.readerNext.classList.toggle('is-preloading', Boolean(nextIsLoading));
  elements.readerPrev.setAttribute(
    'aria-label',
    previousIsLoading ? 'Đang tải bài trước' : 'Bài trước',
  );
  elements.readerNext.setAttribute(
    'aria-label',
    nextIsLoading ? 'Đang tải bài tiếp theo' : 'Bài tiếp theo',
  );

  const timelineLesson = lessonTimeline[index];
  elements.readerPageLabel.textContent = timelineLesson
    ? `Trang ${index * 2 + 1}–${index * 2 + 2} / ${lessonTimeline.length * 2}`
    : '';
}

/* ---------- Antique book-stage opening & page flipping ---------- */

const BOOK_CLOSE_MS = 2100;
const BOOK_STAGE_DISMISS_MS = 600;
let bookStageState = 'idle';
let bookStageTimers = [];
let isFlipping = false;
let bookFlyOriginRect = null;
let bookFlyTitle = '';
let currentFlyer = null;

const BOOK_PHASES = {
  idle: 'Đang nằm trên giá',
  lifting: 'Rời khỏi giá sách',
  presenting: 'Xoay về phía người đọc',
  opening: 'Mở bìa theo trục gáy',
  turning: 'Lật qua những trang đầu',
  open: 'Sẵn sàng để đọc',
  closing: 'Khép sách',
};

const BOOK_STAGE_STATES = [
  'state-idle',
  'state-lifting',
  'state-presenting',
  'state-opening',
  'state-turning',
  'state-open',
  'state-closing',
];

function setBookStageState(state) {
  bookStageState = state;
  elements.bookStage.classList.remove(...BOOK_STAGE_STATES);
  elements.bookStage.classList.add(`state-${state}`);
  elements.stateLabelText.textContent = BOOK_PHASES[state] ?? '';
  elements.statePulse.classList.toggle('pulse', !['idle', 'open'].includes(state));
  elements.closeBookButton.disabled = state !== 'open';
}

function clearBookStageTimers() {
  bookStageTimers.forEach(window.clearTimeout);
  bookStageTimers = [];
}

function clearBookFlyer() {
  if (currentFlyer) {
    currentFlyer.remove();
    currentFlyer = null;
  }
}

function resetBook() {
  clearBookStageTimers();
  clearBookFlyer();
  elements.antiqueBook.querySelectorAll('.turn-leaf').forEach((leaf) => leaf.remove());
  elements.bookStage.classList.remove(...BOOK_STAGE_STATES);
  elements.bookStage.classList.remove('is-dismissed');
  elements.bookStage.classList.remove('is-flying');
  elements.bookStage.hidden = true;
  bookStageState = 'idle';
}

function updateBookScale() {
  const bookStageContainer = elements.bookStage.querySelector('.book-stage');
  const availableHeight = bookStageContainer?.clientHeight
    ? bookStageContainer.clientHeight - 30
    : window.innerHeight - 300;
  const availableWidth = bookStageContainer?.clientWidth
    ? bookStageContainer.clientWidth - 40
    : window.innerWidth - 400;
  const scale = Math.max(
    0.6,
    Math.min(1.4, availableHeight / 613, availableWidth / 968),
  );
  elements.bookStage.style.setProperty('--book-scale', scale.toFixed(3));
}

function populateBookStage(lesson) {
  const journey = lesson?.journey ?? {};
  const title = journey.title ?? '';
  const language = journey.language ?? '';
  const level = journey.level ?? '';

  elements.coverTitle.textContent = title;
  elements.coverSubtitle.textContent =
    [language, level].filter(Boolean).join(' · ') || 'Writing Journey';
  elements.stageTitle.textContent = title;
  elements.stageCollection.textContent = '';
  const collectionRule = document.createElement('span');
  elements.stageCollection.append(
    collectionRule,
    ` Hành trình · ${[language, level].filter(Boolean).join(' · ')}`,
  );
  elements.stageDescription.textContent = journey.description ?? '';
}

function playBookOpening(lesson) {
  populateBookStage(lesson);
  clearBookStageTimers();
  clearBookFlyer();
  elements.bookStage.classList.remove('is-dismissed');
  elements.bookStage.classList.remove('is-flying');
  const willFly = Boolean(bookFlyOriginRect);
  if (willFly) elements.bookStage.classList.add('is-flying');
  elements.bookStage.hidden = false;
  void elements.bookStage.offsetWidth;
  updateBookScale();

  const schedule = (state, delay) => {
    bookStageTimers.push(window.setTimeout(() => setBookStageState(state), delay));
  };

  if (willFly) {
    const target = getPresentingCoverRect();
    setBookStageState('presenting');
    launchBookFlyer(bookFlyOriginRect, target, 1100);
    bookStageTimers.push(
      window.setTimeout(() => {
        elements.bookStage.classList.remove('is-flying');
      }, 1100),
    );
    schedule('opening', 1850);
    schedule('turning', 3150);
    schedule('open', 5450);
    return;
  }

  setBookStageState('lifting');
  schedule('presenting', 850);
  schedule('opening', 1550);
  schedule('turning', 2850);
  schedule('open', 5150);
}

function getPresentingCoverRect() {
  const container = elements.bookStage.querySelector('.book-stage');
  if (!container) return null;
  const r = container.getBoundingClientRect();
  const w = 450 * 0.76;
  const h = 590 * 0.76;
  return {
    left: r.left + r.width / 2 - w / 2,
    top: r.top + r.height / 2 - h / 2,
    width: w,
    height: h,
  };
}

function getClosedCoverRect() {
  const cover = elements.bookStage.querySelector('.front-cover');
  if (!cover) return null;
  const r = cover.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

function launchBookFlyer(fromRect, toRect, duration) {
  clearBookFlyer();

  const flyer = document.createElement('div');
  flyer.className = 'book-flyer';
  const title = document.createElement('span');
  title.className = 'book-flyer-title';
  title.textContent = bookFlyTitle || 'Writing Journey';
  flyer.append(title);
  flyer.style.left = `${fromRect.left}px`;
  flyer.style.top = `${fromRect.top}px`;
  flyer.style.width = `${fromRect.width}px`;
  flyer.style.height = `${fromRect.height}px`;
  document.body.append(flyer);
  currentFlyer = flyer;

  const fromCx = fromRect.left + fromRect.width / 2;
  const fromCy = fromRect.top + fromRect.height / 2;
  const toCx = toRect.left + toRect.width / 2;
  const toCy = toRect.top + toRect.height / 2;
  const dx = toCx - fromCx;
  const dy = toCy - fromCy;
  const sx = toRect.width / fromRect.width;
  const sy = toRect.height / fromRect.height;

  const animation = flyer.animate(
    [
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      {
        transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
        opacity: 1,
        offset: 0.86,
      },
      {
        transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
        opacity: 0,
      },
    ],
    { duration, easing: 'cubic-bezier(0.25, 0.6, 0.2, 1)', fill: 'forwards' },
  );

  animation.finished.then(() => clearBookFlyer()).catch(() => clearBookFlyer());
  return animation.finished.catch(() => undefined);
}

function closeBookAndReturn() {
  if (isFlipping) return;

  clearBookStageTimers();
  elements.bookStage.classList.remove('is-dismissed');
  elements.bookStage.hidden = false;
  setBookStageState('closing');

  bookStageTimers.push(
    window.setTimeout(async () => {
      await loadLibrary();
      showHomeBackdrop();

      const finish = () => {
        elements.bookStage.hidden = true;
        elements.bookStage.classList.remove('is-dismissed');
        elements.bookStage.classList.remove('is-flying');
        bookStageState = 'idle';
        loadStats();
      };

      if (bookFlyOriginRect) {
        const fromRect = getClosedCoverRect();
        if (fromRect) {
          elements.bookStage.classList.add('is-flying');
          elements.bookStage.classList.add('is-dismissed');
          await launchBookFlyer(fromRect, bookFlyOriginRect, 850);
          finish();
          return;
        }
      }

      elements.bookStage.classList.add('is-dismissed');
      bookStageTimers.push(window.setTimeout(finish, BOOK_STAGE_DISMISS_MS + 80));
    }, BOOK_CLOSE_MS),
  );
}

function showHomeBackdrop() {
  currentLesson = null;
  bookmarkedLesson = null;
  hideHighlightPopover();
  closeReviewDetail();
  renderHome();
  elements.mastheadEyebrow.textContent = 'Kệ sách hành trình';
  elements.loading.hidden = true;
  elements.error.hidden = true;
  elements.journeySetup.hidden = true;
  elements.completion.hidden = true;
  elements.home.hidden = false;
}

function createTurningLeaf(direction) {
  const leaf = document.createElement('div');
  leaf.className = `turn-leaf manual-turn-leaf turn-${direction}`;

  const sheet = document.createElement('div');
  sheet.className = 'turning-sheet';

  const front = document.createElement('div');
  front.className = 'turning-sheet-face turning-sheet-front';
  const back = document.createElement('div');
  back.className = 'turning-sheet-face turning-sheet-back';
  sheet.append(front, back);

  const glint = document.createElement('div');
  glint.className = 'page-glint';
  const shadow = document.createElement('div');
  shadow.className = 'moving-page-shadow';

  leaf.append(sheet, glint, shadow);
  elements.antiqueBook.append(leaf);
  return leaf;
}

function flipTimelineLesson(offset) {
  if (isFlipping) return;

  const index = lessonTimeline.findIndex(
    (lesson) => lesson.id === currentLesson?.id,
  );
  const target = lessonTimeline[index + offset];
  if (!target) return;
  const lesson = lessonCache.get(target.id);
  if (!lesson) {
    preloadAdjacentLessons(currentLesson?.id);
    return;
  }

  isFlipping = true;
  updateNavigation(currentLesson?.id, currentLesson?.isCurrent);
  elements.closeBookButton.disabled = true;
  hideHighlightPopover();
  closeObjectivePopover();

  createTurningLeaf(offset > 0 ? 'next' : 'prev');

  window.setTimeout(() => {
    showLesson(lesson);
  }, 560);

  window.setTimeout(() => {
    elements.antiqueBook
      .querySelectorAll('.turn-leaf.manual-turn-leaf')
      .forEach((leaf) => leaf.remove());
    elements.closeBookButton.disabled = false;
    isFlipping = false;
    updateNavigation(lesson.id, lesson.isCurrent);
    preloadAdjacentLessons(lesson.id);
  }, 1220);
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
  await loadLibrary();

  const status = await loadStatus();
  if (status?.busy) {
    showBusy(BUSY_MESSAGES[status.requestType] ?? 'Đang xử lý…');
    busyPollTimer = window.setTimeout(pollUntilIdle, BUSY_POLL_MS);
    return;
  }

  showHomeOrSetup();
}

initialize();

async function goHome() {
  await loadLibrary();
  showHome();
}

elements.homeSearchInput.addEventListener('input', (event) => {
  libraryQuery = event.target.value;
  renderHomeShelf();
});

elements.homeCreateButton.addEventListener('click', () => {
  showJourneySetup();
});

elements.backHomeButton.addEventListener('click', () => {
  goHome();
});

elements.closeBookButton.addEventListener('click', () => {
  closeBookAndReturn();
});

window.addEventListener('resize', updateBookScale);

elements.bookStage
  .querySelector('.zone-prev')
  .addEventListener('click', () => flipTimelineLesson(-1));
elements.bookStage
  .querySelector('.zone-next')
  .addEventListener('click', () => flipTimelineLesson(1));
elements.readerPrev.addEventListener('click', () => flipTimelineLesson(-1));
elements.readerNext.addEventListener('click', () => flipTimelineLesson(1));

function handlePageClick(event, offset) {
  if (!elements.highlightPopover.hidden) return;
  if (
    event.target.closest?.(
      'button, a, input, textarea, select, summary, mark, [role="button"], [role="tab"], [role="radio"]',
    )
  ) {
    return;
  }
  const selection = window.getSelection?.();
  if (selection && !selection.isCollapsed) return;
  flipTimelineLesson(offset);
}

elements.bookStage
  .querySelector('.right-paper')
  .addEventListener('click', (event) => handlePageClick(event, 1));

elements.bookStage
  .querySelector('.left-paper')
  .addEventListener('click', (event) => handlePageClick(event, -1));

elements.newJourneyButton.addEventListener('click', () => {
  showJourneySetup();
});

elements.createJourneyButton.addEventListener('click', async () => {
  elements.createJourneyButton.disabled = true;
  showBusy(
    'Đang vẽ lộ trình và sinh bài đầu tiên… có thể mất một chút thời gian.',
  );

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
    await loadLibrary();
    loadStats();
  } catch (error) {
    elements.setupStatus.textContent = error.message;
    updateCreateJourneyButton();
  } finally {
    hideBusy();
  }
});

elements.completeButton.addEventListener('click', async () => {
  if (!currentLesson) return;

  const completedJourney = currentLesson.journey;
  elements.completeButton.disabled = true;
  showBusy('Đang khóa bài và chuẩn bị bài tiếp theo…');

  try {
    const response = await fetch(`/api/lessons/${currentLesson.id}/complete`, {
      method: 'POST',
    });
    const payload = await response.json();

    if (!response.ok) throw new Error(payload.message ?? 'Không thể hoàn thành bài.');

    if (payload.data.journeyCompleted) {
      showJourneyCompleted(completedJourney);
      await loadHistory(null);
      await loadLibrary();
      loadStats();
      return;
    }

    bookmarkedLesson = payload.data.nextLesson;
    showLesson(payload.data.nextLesson);
    elements.lessonStatus.textContent = payload.data.alreadyCompleted
      ? 'Bài này đã được ghi nhận trước đó.'
      : 'Đã khóa bài trước. Đây là bài tiếp theo.';
    await loadHistory(payload.data.nextLesson);
    await loadLibrary();
    loadStats();
  } catch (error) {
    elements.lessonStatus.textContent = error.message;
  } finally {
    elements.completeButton.disabled = false;
    hideBusy();
  }
});

elements.regenerateButton.addEventListener('click', async () => {
  if (!currentLesson) return;

  elements.regenerateButton.disabled = true;
  elements.completeButton.disabled = true;
  showBusy('Đang tạo một phiên bản khác…');

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
    hideBusy();
  }
});

elements.lessonContent.addEventListener('mouseup', (event) => {
  if (event.target.closest?.('.saved-note-highlight')) return;
  window.setTimeout(() => maybeShowHighlightPopover(), 0);
});

elements.lessonContent.addEventListener('keyup', (event) => {
  if (event.target.closest?.('.saved-note-highlight')) return;
  window.setTimeout(() => maybeShowHighlightPopover(), 0);
});

elements.highlightSaveButton.addEventListener('click', () => {
  saveHighlight();
});

elements.highlightCommentInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    saveHighlight();
  }
});

elements.highlightCancelButton.addEventListener('click', () => {
  hideHighlightPopover();
});

elements.highlightEditButton.addEventListener('click', () => {
  const highlight = popoverActiveHighlight;
  if (!highlight || !currentLesson) return;
  pendingHighlight = {
    paragraphIndex: highlight.paragraphIndex,
    startOffset: highlight.startOffset,
    endOffset: highlight.endOffset,
    text: highlight.text,
  };
  editingHighlightId = highlight.id;
  renderLessonContent(currentLesson.content);
  showHighlightCreateView(pendingHighlight, undefined, highlight.comment ?? '');
});

elements.highlightDeleteButton.addEventListener('click', () => {
  deleteHighlight();
});

document.addEventListener('click', (event) => {
  if (
    !elements.objectivePopover.hidden &&
    !elements.objectivePopover.contains(event.target) &&
    !elements.objectiveToggle.contains(event.target)
  ) {
    closeObjectivePopover();
  }
  if (elements.highlightPopover.hidden) return;
  if (elements.highlightPopover.contains(event.target)) return;
  if (event.target.closest?.('.saved-note-highlight')) return;
  hideHighlightPopover();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !elements.objectivePopover.hidden) {
    closeObjectivePopover();
    elements.objectiveToggle.focus();
  }
  if (event.key === 'Escape' && !elements.highlightPopover.hidden) {
    hideHighlightPopover();
  }
  if (event.key === 'Escape' && !elements.reviewDetail.hidden) {
    closeReviewDetail();
  }
});

elements.reviewDetailClose.addEventListener('click', () => {
  closeReviewDetail();
});

function closeObjectivePopover() {
  elements.objectivePopover.hidden = true;
  elements.objectiveToggle.setAttribute('aria-expanded', 'false');
}

elements.objectiveToggle.addEventListener('click', () => {
  const shouldOpen = elements.objectivePopover.hidden;
  closeObjectivePopover();
  if (shouldOpen) {
    elements.objectivePopover.hidden = false;
    elements.objectiveToggle.setAttribute('aria-expanded', 'true');
  }
});
