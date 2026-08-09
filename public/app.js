const elements = {
  loading: document.querySelector('#loading'),
  error: document.querySelector('#error'),
  mastheadEyebrow: document.querySelector('#masthead-eyebrow'),
  themeToggle: document.querySelector('#theme-toggle'),
  journeyTitle: document.querySelector('#journey-title'),
  lessonTitle: document.querySelector('#lesson-title'),
  lessonPosition: document.querySelector('#lesson-position'),
  objective: document.querySelector('#objective'),
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
  pauseReadingButton: document.querySelector('#pause-reading-button'),
  busyOverlay: document.querySelector('#busy-overlay'),
  busyMessage: document.querySelector('#busy-message'),
  bookFlip: document.querySelector('#book-flip'),
  bookStage: document.querySelector('#book-stage'),
  stageTitle: document.querySelector('#stage-title'),
  stageDescription: document.querySelector('#stage-description'),
  coverTitle: document.querySelector('#cover-title'),
  coverSubtitle: document.querySelector('#cover-subtitle'),
  stateLabelText: document.querySelector('#state-label-text'),
  statePulse: document.querySelector('#state-pulse'),
  reviewPopover: document.querySelector('#review-popover'),
  reviewPopoverKind: document.querySelector('#review-popover-kind'),
  reviewPopoverWord: document.querySelector('#review-popover-word'),
  reviewPopoverMeaning: document.querySelector('#review-popover-meaning'),
  reviewPopoverExamples: document.querySelector('#review-popover-examples'),
  reviewPopoverClose: document.querySelector('#review-popover-close'),
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
let selectedReviewIndex = 0;
let lessonHighlights = [];
let pendingHighlight = null;
let editingHighlightId = null;
let popoverActiveHighlight = null;
let journeys = [];
let libraryQuery = '';
let libraryLanguageFilter = 'ALL';
let activeJourneyId = null;

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

function openReviewPopover(item) {
  if (!item) return;
  elements.reviewPopoverKind.textContent = item.kind;
  elements.reviewPopoverWord.textContent = item.text;
  elements.reviewPopoverMeaning.textContent = item.meaning;
  const examples = elements.reviewPopoverExamples;
  examples.replaceChildren();
  for (const example of item.examples ?? []) {
    const listItem = document.createElement('li');
    listItem.textContent = example;
    examples.append(listItem);
  }
  elements.reviewPopover.hidden = false;
}

function closeReviewPopover() {
  elements.reviewPopover.hidden = true;
}

function selectReviewItem(index, { open = false } = {}) {
  selectedReviewIndex = index;
  elements.reviewList.querySelectorAll('.review-item-button').forEach((button, i) => {
    const selected = i === index;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-selected', selected ? 'true' : 'false');
  });
  if (open) openReviewPopover(reviewItems[index]);
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
      button.addEventListener('click', () => selectReviewItem(index, { open: true }));
      listItem.append(button);
      listEl.append(listItem);
      flatIndex += 1;
    }
    groupEl.append(listEl);
    list.append(groupEl);
  }

  selectReviewItem(0);
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
  currentLesson = lesson;
  lessonHighlights = [];
  pendingHighlight = null;
  editingHighlightId = null;
  popoverActiveHighlight = null;
  elements.highlightPopover.hidden = true;
  closeReviewPopover();
  activeJourneyId = lesson.journey?.id ?? null;
  elements.mastheadEyebrow.textContent = 'Hành trình chi tiết';
  elements.journeyTitle.textContent = `${lesson.journey.title} · ${lesson.journey.level}`;
  elements.lessonTitle.textContent = lesson.title;
  elements.lessonPosition.textContent = `Bài ${lesson.sequenceNumber}/${lesson.journey.plannedLessonCount} · Vòng ${lesson.cycleNumber}`;
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
  closeReviewPopover();
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
  closeReviewPopover();
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
  const current = journey.currentLesson;
  position.textContent = current
    ? `Bài ${current.sequenceNumber}/${journey.plannedLessonCount} · Vòng ${current.cycleNumber}`
    : `${journey.completedLessons}/${journey.totalLessons} bài`;

  footer.append(meta, position);
  button.append(spine, dot, title, progress, footer);
  button.addEventListener('click', () => openJourney(journey.id));
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
  closeReviewPopover();
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

async function openJourney(journeyId) {
  hideHighlightPopover();
  closeReviewPopover();
  elements.error.hidden = true;
  showBusy('Đang mở hành trình…');

  try {
    const response = await fetch(`/api/journeys/${journeyId}/open`, {
      method: 'POST',
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message ?? 'Không thể mở hành trình.');

    activeJourneyId = journeyId;

    if (payload.data.journeyCompleted) {
      showJourneyCompleted(payload.data.journey);
      await loadHistory(null);
    } else {
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
  } catch {
    lessonTimeline = activeLesson ? [{ id: activeLesson.id, isCurrent: true }] : [];
  }
}

function updateNavigation(lessonId, isCurrent) {
  const index = lessonTimeline.findIndex((lesson) => lesson.id === lessonId);
  const leftPage = elements.bookStage.querySelector('.left-paper');
  const rightPage = elements.bookStage.querySelector('.right-paper');
  leftPage.classList.toggle('can-flip', index > 0);
  rightPage.classList.toggle(
    'can-flip',
    index >= 0 && index < lessonTimeline.length - 1,
  );
}

/* ---------- Antique book-stage opening & page flipping ---------- */

const BOOK_FLIP_MS = 620;
const BOOK_CLOSE_MS = 2100;
const BOOK_STAGE_DISMISS_MS = 600;
let bookStageState = 'idle';
let bookStageTimers = [];
let isFlipping = false;

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
}

function clearBookStageTimers() {
  bookStageTimers.forEach(window.clearTimeout);
  bookStageTimers = [];
}

function resetBook() {
  clearBookStageTimers();
  elements.bookFlip.replaceChildren();
  elements.bookStage.classList.remove(...BOOK_STAGE_STATES);
  elements.bookStage.classList.remove('is-dismissed');
  elements.bookStage.hidden = true;
  bookStageState = 'idle';
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
  elements.stageDescription.textContent =
    lesson?.objective ||
    'Một hành trình rèn viết ngoại ngữ, được gìn giữ như một cổ thư sống động.';
}

function playBookOpening(lesson) {
  populateBookStage(lesson);
  clearBookStageTimers();
  elements.bookStage.classList.remove('is-dismissed');
  elements.bookStage.hidden = false;
  void elements.bookStage.offsetWidth;

  const schedule = (state, delay) => {
    bookStageTimers.push(window.setTimeout(() => setBookStageState(state), delay));
  };

  setBookStageState('lifting');
  schedule('presenting', 850);
  schedule('opening', 1550);
  schedule('turning', 2850);
  schedule('open', 5150);
}

function closeBook(onDone) {
  clearBookStageTimers();
  elements.bookStage.classList.remove('is-dismissed');
  elements.bookStage.hidden = false;
  setBookStageState('closing');

  bookStageTimers.push(
    window.setTimeout(() => {
      setBookStageState('idle');
      elements.bookStage.classList.add('is-dismissed');
    }, BOOK_CLOSE_MS),
  );
  bookStageTimers.push(
    window.setTimeout(() => {
      elements.bookStage.hidden = true;
      elements.bookStage.classList.remove('is-dismissed');
      bookStageState = 'idle';
      onDone?.();
    }, BOOK_CLOSE_MS + BOOK_STAGE_DISMISS_MS + 80),
  );
}

function createFlipSheet(offset) {
  const sheet = document.createElement('div');
  sheet.className = 'book-flip-sheet';
  sheet.classList.add(offset > 0 ? 'is-next' : 'is-prev');

  const front = document.createElement('div');
  front.className = 'book-flip-front';
  const source = offset > 0
    ? elements.bookStage.querySelector('.right-paper')
    : elements.bookStage.querySelector('.left-paper');
  front.append(source?.cloneNode(true) ?? document.createElement('span'));
  sheet.append(front);
  elements.bookFlip.append(sheet);
  return sheet;
}

async function flipTimelineLesson(offset) {
  if (isFlipping) return;

  const index = lessonTimeline.findIndex(
    (lesson) => lesson.id === currentLesson?.id,
  );
  const target = lessonTimeline[index + offset];
  if (!target) return;

  isFlipping = true;
  hideHighlightPopover();

  let lesson;
  try {
    if (target.id === bookmarkedLesson?.id) {
      lesson = bookmarkedLesson;
    } else {
      const response = await fetch(`/api/lessons/${target.id}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? 'Không thể mở bài cũ.');
      lesson = payload.data;
    }
  } catch (error) {
    isFlipping = false;
    elements.lessonStatus.textContent = error.message;
    updateNavigation(currentLesson?.id, currentLesson?.isCurrent);
    return;
  }

  const sheet = createFlipSheet(offset);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => sheet.classList.add('is-flipping'));
  });

  window.setTimeout(() => {
    showLesson(lesson);
  }, BOOK_FLIP_MS / 2);

  window.setTimeout(() => {
    sheet.remove();
    updateNavigation(lesson.id, lesson.isCurrent);
    isFlipping = false;
  }, BOOK_FLIP_MS + 80);
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

elements.pauseReadingButton.addEventListener('click', () => {
  closeBook(() => goHome());
});

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
  if (elements.highlightPopover.hidden) return;
  if (elements.highlightPopover.contains(event.target)) return;
  if (event.target.closest?.('.saved-note-highlight')) return;
  hideHighlightPopover();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !elements.highlightPopover.hidden) {
    hideHighlightPopover();
  }
  if (event.key === 'Escape' && !elements.reviewPopover.hidden) {
    closeReviewPopover();
  }
});

elements.reviewPopoverClose.addEventListener('click', () => {
  closeReviewPopover();
});

elements.reviewPopover.addEventListener('click', (event) => {
  if (event.target === elements.reviewPopover) closeReviewPopover();
});
