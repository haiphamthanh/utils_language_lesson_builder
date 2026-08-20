const elements = {
  loading: document.querySelector("#loading"),
  error: document.querySelector("#error"),
  mastheadEyebrow: document.querySelector("#masthead-eyebrow"),
  themeToggle: document.querySelector("#theme-toggle"),
  stageThemeToggle: document.querySelector("#stage-theme-toggle"),
  lessonTitle: document.querySelector("#lesson-title"),
  objective: document.querySelector("#objective"),
  objectiveToggle: document.querySelector("#objective-toggle"),
  objectivePopover: document.querySelector("#objective-popover"),
  lessonContent: document.querySelector("#lesson-content"),
  reviewList: document.querySelector("#review-list"),
  lessonStatus: document.querySelector("#lesson-status"),
  completeButton: document.querySelector("#complete-button"),
  regenerateButton: document.querySelector("#regenerate-button"),
  completedCount: document.querySelector("#completed-count"),
  studyDaysCount: document.querySelector("#study-days-count"),
  streakCount: document.querySelector("#streak-count"),
  vocabularyCount: document.querySelector("#vocabulary-count"),
  journeySetup: document.querySelector("#journey-setup"),
  topicList: document.querySelector("#topic-list"),
  languageList: document.querySelector("#language-list"),
  levelList: document.querySelector("#level-list"),
  createJourneyButton: document.querySelector("#create-journey-button"),
  setupStatus: document.querySelector("#setup-status"),
  completion: document.querySelector("#completion"),
  completionJourneyTitle: document.querySelector("#completion-journey-title"),
  newJourneyButton: document.querySelector("#new-journey-button"),
  highlightPopover: document.querySelector("#highlight-popover"),
  highlightCreateView: document.querySelector("#highlight-create-view"),
  highlightViewView: document.querySelector("#highlight-view-view"),
  highlightPreview: document.querySelector("#highlight-preview"),
  highlightCommentInput: document.querySelector("#highlight-comment-input"),
  highlightSaveButton: document.querySelector("#highlight-save-button"),
  highlightCancelButton: document.querySelector("#highlight-cancel-button"),
  highlightViewText: document.querySelector("#highlight-view-text"),
  highlightViewComment: document.querySelector("#highlight-view-comment"),
  highlightEditButton: document.querySelector("#highlight-edit-button"),
  highlightDeleteButton: document.querySelector("#highlight-delete-button"),
  home: document.querySelector("#home"),
  homeCreateButton: document.querySelector("#home-create-button"),
  homeUploadButton: document.querySelector("#home-upload-button"),
  homeUploadInput: document.querySelector("#home-upload-input"),
  homeUploadStatus: document.querySelector("#home-upload-status"),
  homeSearchInput: document.querySelector("#home-search-input"),
  homeLanguageFilter: document.querySelector("#home-language-filter"),
  homeShelf: document.querySelector("#home-shelf"),
  homeEmpty: document.querySelector("#home-empty"),
  backHomeButton: document.querySelector("#back-home-button"),
  busyOverlay: document.querySelector("#busy-overlay"),
  busyMessage: document.querySelector("#busy-message"),
  bookStage: document.querySelector("#book-stage"),
  antiqueBook: document.querySelector(".book-rig .antique-book"),
  stageTitle: document.querySelector("#stage-title"),
  stageDescription: document.querySelector("#stage-description"),
  stageCollection: document.querySelector("#stage-collection"),
  coverTitle: document.querySelector("#cover-title"),
  coverSubtitle: document.querySelector("#cover-subtitle"),
  stateLabelText: document.querySelector("#state-label-text"),
  statePulse: document.querySelector("#state-pulse"),
  stateLabelTop: document.querySelector("#state-label-top"),
  stateLabelTextTop: document.querySelector("#state-label-text-top"),
  stateLabelBottom: document.querySelector("#state-label-bottom"),
  closeBookButton: document.querySelector("#close-book-button"),
  readerPrev: document.querySelector("#reader-prev"),
  readerNext: document.querySelector("#reader-next"),
  readerPageLabel: document.querySelector("#reader-page-label"),
  readerIndexButton: document.querySelector("#reader-index-button"),
  readerIndexPanel: document.querySelector("#reader-index-panel"),
  readerIndexClose: document.querySelector("#reader-index-close"),
  readerPageJumpForm: document.querySelector("#reader-page-jump-form"),
  readerPageJumpInput: document.querySelector("#reader-page-jump-input"),
  readerIndexList: document.querySelector("#reader-index-list"),
  reviewTitle: document.querySelector("#review-title"),
  reviewDetail: document.querySelector("#review-detail"),
  reviewDetailKind: document.querySelector("#review-detail-kind"),
  reviewDetailMeaning: document.querySelector("#review-detail-meaning"),
  reviewDetailExamples: document.querySelector("#review-detail-examples"),
  reviewDetailClose: document.querySelector("#review-detail-close"),
  uploadedLeftPage: document.querySelector("#uploaded-left-page"),
  uploadedRightPage: document.querySelector("#uploaded-right-page"),
};

const LANGUAGES = ["English", "Japanese", "Chinese"];
const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const THEME_STORAGE_KEY = "writing-journey:theme";
const OPEN_VIEW_STORAGE_KEY = "writing-journey:open-view";

function readReadingState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(OPEN_VIEW_STORAGE_KEY) ?? "null");
    if (!parsed || typeof parsed !== "object") {
      return { uploaded: {}, journey: {}, lastUploaded: null, lastJourney: null };
    }
    return {
      uploaded:
        parsed.uploaded && typeof parsed.uploaded === "object"
          ? parsed.uploaded
          : {},
      journey:
        parsed.journey && typeof parsed.journey === "object"
          ? parsed.journey
          : {},
      lastUploaded: typeof parsed.lastUploaded === "string" ? parsed.lastUploaded : null,
      lastJourney: typeof parsed.lastJourney === "string" ? parsed.lastJourney : null,
    };
  } catch {
    // A broken or unavailable localStorage entry should never block the shelf.
    return { uploaded: {}, journey: {}, lastUploaded: null, lastJourney: null };
  }
}

function writeReadingState(state) {
  try {
    localStorage.setItem(OPEN_VIEW_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // The book remains usable when storage is unavailable.
  }
}

function readStoredOpenView() {
  const state = readReadingState();
  if (state.lastUploaded) {
    const spreadIndex = Number(state.uploaded[state.lastUploaded]);
    if (Number.isInteger(spreadIndex) && spreadIndex >= 0) {
      return { kind: "uploaded", bookId: state.lastUploaded, spreadIndex };
    }
  }
  if (state.lastJourney) {
    const lessonId = state.journey[state.lastJourney];
    if (typeof lessonId === "string") {
      return { kind: "journey", journeyId: state.lastJourney, lessonId };
    }
  }
  return null;
}

function getStoredUploadedSpread(bookId) {
  const state = readReadingState();
  const spreadIndex = Number(state.uploaded[bookId]);
  return Number.isInteger(spreadIndex) && spreadIndex >= 0 ? spreadIndex : 0;
}

function getStoredJourneyLesson(journeyId) {
  const state = readReadingState();
  const lessonId = state.journey[journeyId];
  return typeof lessonId === "string" ? lessonId : null;
}

function saveOpenView(view) {
  const state = readReadingState();
  if (view.kind === "uploaded" && typeof view.bookId === "string") {
    state.uploaded[view.bookId] = Math.max(0, Number(view.spreadIndex) || 0);
    state.lastUploaded = view.bookId;
  } else if (
    view.kind === "journey" &&
    typeof view.journeyId === "string" &&
    typeof view.lessonId === "string"
  ) {
    state.journey[view.journeyId] = view.lessonId;
    state.lastJourney = view.journeyId;
  }
  writeReadingState(state);
}

function clearOpenView() {
  const state = readReadingState();
  state.lastUploaded = null;
  state.lastJourney = null;
  writeReadingState(state);
}

function saveCurrentOpenView() {
  if (currentLesson?.kind === "uploaded" && currentUploadedBook?.id) {
    const spreadIndex = lessonTimeline.findIndex(
      (item) => item.id === currentLesson.id,
    );
    saveOpenView({
      kind: "uploaded",
      bookId: currentUploadedBook.id,
      spreadIndex: Math.max(0, spreadIndex),
    });
    return;
  }
  if (currentLesson?.journey?.id && currentLesson.id) {
    saveOpenView({
      kind: "journey",
      journeyId: currentLesson.journey.id,
      lessonId: currentLesson.id,
    });
  }
}

function getStoredTheme() {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return ["auto", "light", "dark"].includes(value) ? value : "auto";
  } catch {
    return "auto";
  }
}

function getResolvedTheme() {
  const theme = getStoredTheme();
  if (theme === "light" || theme === "dark") return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme() {
  document.body.dataset.theme = getResolvedTheme();
}

function cycleTheme() {
  const current = getStoredTheme();
  const next =
    current === "auto" ? "light" : current === "light" ? "dark" : "auto";
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // The theme still applies for this session when storage is unavailable.
  }
  applyTheme();
}

elements.themeToggle.addEventListener("click", () => {
  cycleTheme();
});

elements.stageThemeToggle.addEventListener("click", () => {
  cycleTheme();
});

window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", applyTheme);

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
let uploadedBooks = [];
let libraryQuery = "";
let libraryLanguageFilter = "ALL";
let activeJourneyId = null;
let activeLibraryBookKey = null;
let currentUploadedBook = null;
const lessonCache = new Map();
const lessonLoadPromises = new Map();

/* ---------- Busy (single-flight generation) ---------- */

const BUSY_MESSAGES = {
  journey_creation:
    "Đang vẽ lộ trình và sinh bài đầu tiên… có thể mất một chút thời gian.",
  lesson_generation:
    "Đang chuẩn bị bài tiếp theo… có thể mất một chút thời gian.",
  regeneration: "Đang tạo một phiên bản khác… có thể mất một chút thời gian.",
};
const BUSY_POLL_MS = 3_000;
let busyPollTimer = null;

function showBusy(message) {
  elements.busyMessage.textContent = message ?? "Đang xử lý…";
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
    const response = await fetch("/api/status");
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
  showBusy(BUSY_MESSAGES[status.requestType] ?? "Đang xử lý…");
  busyPollTimer = window.setTimeout(pollUntilIdle, BUSY_POLL_MS);
}

function reviewGroups(review) {
  return [
    {
      number: "I",
      kind: "Từ vựng",
      items: (review?.vocabulary ?? []).map((item) => ({
        text: item.text,
        meaning: item.meaning,
        examples: item.examples ?? [],
      })),
    },
    {
      number: "II",
      kind: "Cụm từ",
      items: (review?.phrases ?? []).map((item) => ({
        text: item.text,
        meaning: item.meaning,
        examples: item.examples ?? [],
      })),
    },
    {
      number: "III",
      kind: "Cấu trúc",
      items: (review?.grammar ?? []).map((item) => ({
        text: item.pattern,
        meaning: item.meaning,
        examples: item.examples ?? [],
      })),
    },
  ];
}

function openReviewDetail(item) {
  if (!item) return;
  elements.reviewDetail.closest(".review")?.classList.add("is-detail-open");
  elements.reviewTitle.textContent = item.text;
  elements.reviewTitle.classList.add("is-item-detail");
  elements.reviewDetailKind.textContent = item.kind;
  elements.reviewDetailMeaning.textContent = item.meaning;
  const examples = elements.reviewDetailExamples;
  examples.replaceChildren();
  for (const example of item.examples ?? []) {
    const listItem = document.createElement("li");
    listItem.textContent = example;
    examples.append(listItem);
  }
  elements.reviewList.hidden = true;
  elements.reviewDetail.hidden = false;
  elements.reviewDetailClose.hidden = false;
}

function closeReviewDetail() {
  elements.reviewDetail.closest(".review")?.classList.remove("is-detail-open");
  elements.reviewTitle.textContent = "Từ vựng và Cấu trúc";
  elements.reviewTitle.classList.remove("is-item-detail");
  elements.reviewList.hidden = false;
  elements.reviewDetail.hidden = true;
  elements.reviewDetailClose.hidden = true;
}

function selectReviewItem(index) {
  selectedReviewIndex = index;
  elements.reviewList
    .querySelectorAll(".review-item-button")
    .forEach((button, i) => {
      const selected = i === index;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
  openReviewDetail(reviewItems[index]);
}

function buildReviewFragment(lesson) {
  const groups = reviewGroups(lesson.review);
  const items = groups.flatMap((group) =>
    group.items.map((item) => ({ ...item, kind: group.kind })),
  );
  const fragment = document.createDocumentFragment();

  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "review-empty";
    empty.textContent = "Bài này không có mục ôn tập.";
    fragment.append(empty);
    return { fragment, items };
  }

  let flatIndex = 0;
  for (const [groupIndex, group] of groups.entries()) {
    const groupEl = document.createElement("section");
    groupEl.className =
      "review-group review-rhythm-section is-collapsed";

    const groupTitle = document.createElement("button");
    groupTitle.type = "button";
    groupTitle.className = "review-group-title review-rhythm-heading";
    groupTitle.setAttribute("aria-expanded", "false");

    const groupIcon = document.createElement("span");
    groupIcon.className = "review-group-icon";
    groupIcon.setAttribute("aria-hidden", "true");
    groupIcon.textContent = "⌄";

    const groupNumber = document.createElement("span");
    groupNumber.className = "review-group-number";
    groupNumber.textContent = `${group.number}.`;

    const groupLabel = document.createElement("strong");
    groupLabel.className = "review-group-label";
    groupLabel.textContent = group.kind;

    groupTitle.append(groupNumber, groupLabel, groupIcon);
    groupEl.append(groupTitle);

    const collapsedHint = document.createElement("button");
    collapsedHint.type = "button";
    collapsedHint.className = "review-group-collapsed-hint";
    collapsedHint.textContent = `(${group.items.length} mục · Nhấn để xem thêm)`;
    collapsedHint.setAttribute(
      "aria-label",
      `Mở nhóm ${group.kind.toLowerCase()} gồm ${group.items.length} mục`,
    );
    collapsedHint.setAttribute("aria-expanded", "false");

    const listEl = document.createElement("ol");
    listEl.className = "review-group-items review-rhythm-track";
    listEl.id = `review-group-${groupIndex + 1}`;
    listEl.hidden = true;
    groupTitle.setAttribute("aria-controls", listEl.id);
    collapsedHint.setAttribute("aria-controls", listEl.id);
    if (group.items.length === 0) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "review-group-empty";
      emptyItem.textContent = "Chưa có mục nào.";
      listEl.append(emptyItem);
    }
    for (const item of group.items) {
      const index = flatIndex;
      const listItem = document.createElement("li");
      listItem.className = "review-rhythm-row";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "review-item-button";
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-label", `${item.text} — ${item.meaning}`);

      const node = document.createElement("span");
      node.className = "review-item-node";
      node.setAttribute("aria-hidden", "true");
      node.dataset.itemNumber = String(index + 1);

      const text = document.createElement("span");
      text.className = "review-item-text";
      text.textContent = item.text;

      button.append(node, text);
      button.addEventListener("click", () => selectReviewItem(index));
      listItem.append(button);
      listEl.append(listItem);
      flatIndex += 1;
    }
    groupEl.append(collapsedHint, listEl);
    const toggleGroup = () => toggleReviewGroup(groupEl);
    groupTitle.addEventListener("click", toggleGroup);
    collapsedHint.addEventListener("click", toggleGroup);
    fragment.append(groupEl);
  }
  return { fragment, items };
}

function renderReview(lesson, prepared = null) {
  const { fragment, items } = prepared ?? buildReviewFragment(lesson);
  reviewItems = items;
  selectedReviewIndex = -1;

  const list = elements.reviewList;
  list.replaceChildren(fragment);
  closeReviewDetail();
}

function toggleReviewGroup(groupEl) {
  const collapsed = groupEl.classList.contains("is-collapsed");
  groupEl.classList.toggle("is-collapsed", !collapsed);
  const listEl = groupEl.querySelector(".review-group-items");
  const titleEl = groupEl.querySelector(".review-group-title");
  const hintEl = groupEl.querySelector(".review-group-collapsed-hint");
  if (listEl) listEl.hidden = !collapsed;
  if (hintEl) hintEl.hidden = collapsed;
  if (titleEl) titleEl.setAttribute("aria-expanded", String(collapsed));
}

/* ---------- Highlights ---------- */

function normalizeSelectionText(text) {
  return String(text ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function getPlainTextFromNode(root) {
  if (!root) return "";
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return node.parentElement?.closest(".highlight-index-badge")
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT;
    },
  });

  let result = "";
  let current = walker.nextNode();
  while (current) {
    result += current.nodeValue || "";
    current = walker.nextNode();
  }
  return result;
}

function getClosestParagraph(node) {
  if (!node) return null;
  if (node.nodeType === Node.TEXT_NODE) {
    return node.parentElement?.closest("[data-paragraph-index]") || null;
  }
  if (typeof node.closest === "function") {
    return node.closest("[data-paragraph-index]");
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
  const source = String(rawText || "");
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
      acc.push({ ...item, type: "saved", startOffset, endOffset });
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
        id: "__pending__",
        ...pendingHighlight,
        type: "pending",
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
      fragment.append(
        document.createTextNode(text.slice(cursor, range.startOffset)),
      );
    }

    const mark = document.createElement("mark");
    mark.className =
      range.type === "pending"
        ? "pending-note-highlight"
        : "saved-note-highlight";
    mark.setAttribute("role", "button");
    mark.setAttribute("tabindex", "0");

    if (range.type === "saved") {
      mark.dataset.highlightId = range.id;
      const badge = document.createElement("span");
      badge.className = "highlight-index-badge";
      badge.setAttribute("aria-hidden", "true");
      badge.textContent = String(index + 1);
      mark.append(badge);
      mark.addEventListener("click", (event) => {
        event.stopPropagation();
        openHighlightPopover(range.id, mark);
      });
      mark.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openHighlightPopover(range.id, mark);
        }
      });
    }

    mark.append(
      document.createTextNode(text.slice(range.startOffset, range.endOffset)),
    );
    fragment.append(mark);
    cursor = range.endOffset;
  });

  if (cursor < text.length) {
    fragment.append(document.createTextNode(text.slice(cursor)));
  }

  return fragment;
}

function buildLessonContentFragment(content) {
  const fragment = document.createDocumentFragment();
  const paragraphs = String(content ?? "").split("\n");
  paragraphs.forEach((text, index) => {
    const paragraph = document.createElement("p");
    paragraph.className = "lesson-paragraph";
    paragraph.dataset.paragraphIndex = String(index);
    paragraph.append(buildParagraphFragment(index, text));
    fragment.append(paragraph);
  });
  return fragment;
}

function renderLessonContent(content, preparedFragment = null) {
  const container = elements.lessonContent;
  const fragment = preparedFragment ?? buildLessonContentFragment(content);
  container.replaceChildren(fragment);
}

/* ---------- Uploaded Markdown books ---------- */

function splitMarkdownBlocks(markdown) {
  const lines = String(markdown ?? "").replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let current = [];
  let inFence = false;

  const flush = () => {
    const block = current.join("\n").trimEnd();
    if (block.trim()) blocks.push(block);
    current = [];
  };

  for (const line of lines) {
    if (/^```/.test(line.trim())) {
      current.push(line);
      inFence = !inFence;
      if (!inFence) flush();
      continue;
    }
    if (inFence) {
      current.push(line);
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    const startsStandalone = /^(?:#{1,6}\s|---+$|___+$|\*\*\*+$)/.test(
      line.trim(),
    );
    if (startsStandalone && current.length) flush();
    current.push(line);
    if (startsStandalone) flush();
  }
  flush();
  return blocks.flatMap(splitOversizedMarkdownBlock);
}

function splitOversizedMarkdownBlock(block) {
  if (!block.startsWith("```")) return [block];
  const lines = block.split("\n");
  if (lines.length <= 17) return [block];
  const opening = lines[0];
  const closing = lines.at(-1).startsWith("```") ? lines.at(-1) : "```";
  const body = lines.slice(1, lines.at(-1).startsWith("```") ? -1 : undefined);
  const chunks = [];
  for (let index = 0; index < body.length; index += 14) {
    chunks.push([opening, ...body.slice(index, index + 14), closing].join("\n"));
  }
  return chunks;
}

function paginateMarkdown(markdown) {
  const blocks = splitMarkdownBlocks(markdown);
  const pages = [];
  let page = [];
  const measurer = document.createElement("article");
  measurer.className = "uploaded-book-page markdown-page-measurer";
  measurer.setAttribute("aria-hidden", "true");
  document.body.append(measurer);

  const resetMeasurer = () => {
    measurer.replaceChildren();
    const folio = document.createElement("p");
    folio.className = "uploaded-page-folio";
    folio.textContent = "— 1 / 1 —";
    measurer.append(folio);
  };

  resetMeasurer();
  for (const block of blocks) {
    const renderedBlock = renderMarkdownBlock(block);
    measurer.append(renderedBlock);
    if (
      page.length &&
      measurer.scrollHeight > measurer.clientHeight + 1
    ) {
      renderedBlock.remove();
      pages.push(page);
      page = [];
      resetMeasurer();
      measurer.append(renderMarkdownBlock(block));
    }
    page.push(block);
  }
  if (page.length) pages.push(page);
  measurer.remove();
  return pages.length ? pages : [["Sách chưa có nội dung."]];
}

function appendInlineMarkdown(parent, source) {
  const text = String(source ?? "");
  const tokenPattern = /(`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_)/g;
  let cursor = 0;
  for (const match of text.matchAll(tokenPattern)) {
    if (match.index > cursor) parent.append(document.createTextNode(text.slice(cursor, match.index)));
    const token = match[0];
    const element = document.createElement(
      token.startsWith("`") ? "code" : token.startsWith("**") || token.startsWith("__") ? "strong" : "em",
    );
    const edge = token.startsWith("**") || token.startsWith("__") ? 2 : 1;
    element.textContent = token.slice(edge, -edge);
    parent.append(element);
    cursor = match.index + token.length;
  }
  if (cursor < text.length) parent.append(document.createTextNode(text.slice(cursor)));
}

function appendMarkdownLines(parent, lines) {
  lines.forEach((line, index) => {
    appendInlineMarkdown(parent, line.replace(/\s{2}$/, ""));
    if (index < lines.length - 1) parent.append(document.createElement("br"));
  });
}

function renderMarkdownBlock(block) {
  const trimmed = block.trim();
  const fence = trimmed.match(/^```([^\n]*)\n([\s\S]*?)\n```$/);
  if (fence) {
    const pre = document.createElement("pre");
    const code = document.createElement("code");
    if (fence[1].trim()) code.dataset.language = fence[1].trim();
    code.textContent = fence[2];
    pre.append(code);
    return pre;
  }

  const heading = trimmed.match(/^(#{1,6})\s+([\s\S]+)$/);
  if (heading) {
    const level = Math.min(4, heading[1].length + 1);
    const element = document.createElement(`h${level}`);
    appendInlineMarkdown(element, heading[2]);
    return element;
  }

  if (/^(?:---+|___+|\*\*\*+)$/.test(trimmed)) return document.createElement("hr");

  const lines = trimmed.split("\n");
  if (lines.every((line) => /^>\s?/.test(line))) {
    const quote = document.createElement("blockquote");
    appendMarkdownLines(quote, lines.map((line) => line.replace(/^>\s?/, "")));
    return quote;
  }

  const unordered = lines.every((line) => /^\s*[-+*]\s+/.test(line));
  const ordered = lines.every((line) => /^\s*\d+[.)]\s+/.test(line));
  if (unordered || ordered) {
    const list = document.createElement(ordered ? "ol" : "ul");
    for (const line of lines) {
      const item = document.createElement("li");
      appendInlineMarkdown(item, line.replace(/^\s*(?:[-+*]|\d+[.)])\s+/, ""));
      list.append(item);
    }
    return list;
  }

  const paragraph = document.createElement("p");
  appendMarkdownLines(paragraph, lines);
  return paragraph;
}

function renderUploadedPage(container, blocks, pageNumber, totalPages) {
  container.replaceChildren();
  const folio = document.createElement("p");
  folio.className = "uploaded-page-folio";
  folio.textContent = blocks?.length ? `— ${pageNumber} / ${totalPages} —` : "";
  container.append(folio);
  for (const block of blocks ?? []) container.append(renderMarkdownBlock(block));
}

function setReaderMode(mode) {
  const uploaded = mode === "uploaded";
  elements.antiqueBook.classList.toggle("reader-mode-uploaded", uploaded);
  elements.uploadedLeftPage.hidden = !uploaded;
  elements.uploadedRightPage.hidden = !uploaded;
  elements.readerIndexButton.hidden = !uploaded;
  if (!uploaded) closeUploadedReaderIndex();
}

function getUploadedPageIndexEntry(blocks, pageNumber) {
  const heading = (blocks ?? []).find((block) => /^#{1,6}\s+/.test(block.trim()));
  const source = heading ?? blocks?.[0] ?? "";
  const title = source
    .replace(/^#{1,6}\s+/, "")
    .replace(/[`*_]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return {
    pageNumber,
    title: title ? title.slice(0, 72) : `Trang ${pageNumber}`,
    isHeading: Boolean(heading),
  };
}

function createUploadedSpreads(book) {
  const pages = paginateMarkdown(book.content);
  const indexedBook = {
    ...book,
    pageIndex: pages.map((blocks, index) =>
      getUploadedPageIndexEntry(blocks, index + 1),
    ),
  };
  const spreads = [];
  for (let index = 0; index < pages.length; index += 2) {
    spreads.push({
      id: `uploaded-${book.id}-${index / 2}`,
      kind: "uploaded",
      book: indexedBook,
      leftBlocks: pages[index] ?? [],
      rightBlocks: pages[index + 1] ?? [],
      leftPageNumber: index + 1,
      rightPageNumber: Math.min(index + 2, pages.length),
      totalPages: pages.length,
      isCurrent: false,
      status: "ready",
      journey: {
        id: `uploaded:${book.id}`,
        title: book.title,
        description: book.description,
        language: book.language,
        level: "Sách Markdown",
      },
    });
  }
  return spreads;
}

function renderUploadedSpread(spread) {
  renderUploadedPage(
    elements.uploadedLeftPage,
    spread.leftBlocks,
    spread.leftPageNumber,
    spread.totalPages,
  );
  renderUploadedPage(
    elements.uploadedRightPage,
    spread.rightBlocks,
    spread.rightPageNumber,
    spread.totalPages,
  );
}

function renderUploadedReaderIndex(spread) {
  const entries = spread.book.pageIndex ?? [];
  const activePage = spread.leftPageNumber;
  elements.readerPageJumpInput.max = String(spread.totalPages);
  elements.readerPageJumpInput.placeholder = `1–${spread.totalPages}`;
  elements.readerIndexList.replaceChildren();

  for (const entry of entries) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "reader-index-item";
    item.dataset.pageNumber = String(entry.pageNumber);
    item.setAttribute("aria-label", `Trang ${entry.pageNumber}: ${entry.title}`);
    item.setAttribute(
      "aria-current",
      entry.pageNumber === activePage || entry.pageNumber === activePage + 1
        ? "page"
        : "false",
    );

    const page = document.createElement("span");
    page.className = "reader-index-page";
    page.textContent = String(entry.pageNumber).padStart(2, "0");
    const title = document.createElement("span");
    title.className = "reader-index-title";
    title.textContent = entry.title;
    item.append(page, title);
    item.addEventListener("click", () => goToUploadedPage(entry.pageNumber));
    elements.readerIndexList.append(item);
  }
}

async function loadHighlights(lessonId) {
  try {
    const response = await fetch(`/api/lessons/${lessonId}/highlights`);
    const payload = await response.json();
    if (!response.ok)
      throw new Error(payload.message ?? "Không thể tải các đánh dấu.");
    if (currentLesson?.id !== lessonId) return;
    lessonHighlights = payload.data ?? [];
    if (lessonHighlights.length === 0) return;
    renderLessonContent(currentLesson?.content ?? "");
  } catch {
    lessonHighlights = [];
  }
}

function hideHighlightPopover({
  clearSelection = true,
  skipRerender = false,
} = {}) {
  pendingHighlight = null;
  editingHighlightId = null;
  popoverActiveHighlight = null;
  elements.highlightPopover.hidden = true;
  elements.highlightPopover.style.left = "";
  elements.highlightPopover.style.top = "";
  elements.highlightCommentInput.value = "";
  if (clearSelection) window.getSelection()?.removeAllRanges();
  if (currentLesson && !skipRerender)
    renderLessonContent(currentLesson.content);
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

function showHighlightCreateView(selectionData, anchorRect, comment = "") {
  popoverActiveHighlight = null;
  elements.highlightViewView.hidden = true;
  elements.highlightCreateView.hidden = false;
  elements.highlightPreview.textContent = `“${selectionData.text}”`;
  elements.highlightCommentInput.value = comment;
  elements.highlightSaveButton.textContent = editingHighlightId
    ? "Lưu"
    : "Đánh dấu";
  elements.highlightPopover.hidden = false;
  positionHighlightPopover(anchorRect);
  window.setTimeout(() => elements.highlightCommentInput.focus(), 0);
}

function showHighlightViewPopover(highlight, anchorElement) {
  elements.highlightCreateView.hidden = true;
  elements.highlightViewView.hidden = false;
  elements.highlightViewText.textContent = `“${highlight.text}”`;
  const hasComment = Boolean(highlight.comment?.trim());
  elements.highlightViewComment.textContent = highlight.comment ?? "";
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
  const trimmed = getTrimmedSelectionRange(
    rawText,
    rawStartOffset,
    rawEndOffset,
  );

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
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.message ?? "Không thể lưu ghi chú.");
    } else {
      const response = await fetch(
        `/api/lessons/${currentLesson.id}/highlights`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...pendingHighlight, comment }),
        },
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.message ?? "Không thể tạo đánh dấu.");
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
      { method: "DELETE" },
    );
    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload.message ?? "Không thể xoá đánh dấu.");
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

function renderLessonPage(lesson, preparedContent = null) {
  elements.lessonTitle.textContent = lesson.title;
  elements.objective.textContent = lesson.objective;
  renderLessonContent(lesson.content, preparedContent);
}

function showLesson(
  lesson,
  prepared = null,
  {
    deferHighlights = false,
    lessonPageAlreadyRendered = false,
    reviewPageAlreadyRendered = false,
  } = {},
) {
  setReaderMode("journey");
  currentUploadedBook = null;
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
  activeLibraryBookKey = `journey:${activeJourneyId}`;
  if (lesson.journey?.id && lesson.id) {
    saveOpenView({
      kind: "journey",
      journeyId: lesson.journey.id,
      lessonId: lesson.id,
    });
  }
  elements.mastheadEyebrow.textContent = "Hành trình chi tiết";
  if (!lessonPageAlreadyRendered) {
    renderLessonPage(lesson, prepared?.content);
  }
  if (!reviewPageAlreadyRendered) {
    renderReview(lesson, prepared?.review);
  }

  elements.loading.hidden = true;
  elements.error.hidden = true;
  elements.home.hidden = true;
  elements.journeySetup.hidden = true;
  elements.completion.hidden = true;

  updateLessonActionAvailability();
  elements.lessonStatus.textContent = "";
  updateOpenStateLabel();
  updateNavigation(lesson.id, lesson.isCurrent);
  if (!deferHighlights) loadHighlights(lesson.id);
}

function showUploadedSpread(spread) {
  setReaderMode("uploaded");
  currentLesson = spread;
  currentUploadedBook = spread.book;
  activeJourneyId = `uploaded:${spread.book.id}`;
  activeLibraryBookKey = `uploaded:${spread.book.id}`;
  const spreadIndex = lessonTimeline.findIndex((item) => item.id === spread.id);
  saveOpenView({
    kind: "uploaded",
    bookId: spread.book.id,
    spreadIndex: Math.max(0, spreadIndex),
  });
  hideHighlightPopover({ skipRerender: true });
  closeObjectivePopover();
  closeReviewDetail();
  renderUploadedSpread(spread);
  renderUploadedReaderIndex(spread);

  elements.mastheadEyebrow.textContent = "Sách Markdown";
  elements.loading.hidden = true;
  elements.error.hidden = true;
  elements.home.hidden = true;
  elements.journeySetup.hidden = true;
  elements.completion.hidden = true;
  elements.lessonStatus.textContent = "";
  updateLessonActionAvailability();
  updateOpenStateLabel();
  updateNavigation(spread.id, false);
}

function updateLessonActionAvailability() {
  if (currentLesson?.kind === "uploaded") {
    elements.completeButton.hidden = true;
    elements.regenerateButton.hidden = true;
    return;
  }
  const canComplete = Boolean(
    currentLesson?.isCurrent && currentLesson.status !== "completed",
  );
  const canRegenerate = Boolean(
    currentLesson?.isCurrent &&
    currentLesson.status === "ready" &&
    !currentLesson.isLocked &&
    currentLesson.cycleNumber === 1,
  );

  elements.completeButton.hidden =
    !currentLesson?.isCurrent || currentLesson.status === "completed";
  elements.regenerateButton.hidden = !canRegenerate;
  elements.completeButton.disabled = isFlipping || !canComplete;
  elements.regenerateButton.disabled = isFlipping || !canRegenerate;
}

function updateOpenStateLabel() {
  if (bookStageState !== "open") return;
  const suffix = currentLesson?.isLocked
    ? " (Bài đã hoàn thành và được khóa)"
    : "";
  elements.stateLabelTextTop.textContent = `${BOOK_PHASES.open}${suffix}`;
}

function showJourneyCompleted(journey) {
  clearOpenView();
  setReaderMode("journey");
  currentUploadedBook = null;
  currentLesson = null;
  bookmarkedLesson = null;
  activeJourneyId = journey?.id ?? null;
  activeLibraryBookKey = journey?.id ? `journey:${journey.id}` : null;
  hideHighlightPopover();
  closeReviewDetail();
  resetBook();
  elements.mastheadEyebrow.textContent = "Hành trình hoàn thành";
  elements.completionJourneyTitle.textContent = journey?.title ?? "";
  elements.loading.hidden = true;
  elements.error.hidden = true;
  elements.home.hidden = true;
  elements.journeySetup.hidden = true;
  elements.completion.hidden = false;
}

function showJourneySetup() {
  clearOpenView();
  setReaderMode("journey");
  currentUploadedBook = null;
  currentLesson = null;
  bookmarkedLesson = null;
  activeJourneyId = null;
  activeLibraryBookKey = null;
  hideHighlightPopover();
  closeReviewDetail();
  resetBook();
  elements.mastheadEyebrow.textContent = "Hành trình mới";
  elements.loading.hidden = true;
  elements.error.hidden = true;
  elements.home.hidden = true;
  elements.completion.hidden = true;
  elements.journeySetup.hidden = false;
  renderSetup();
}

async function loadTopics() {
  const response = await fetch("/api/topics");
  const payload = await response.json();
  if (!response.ok)
    throw new Error(payload.message ?? "Không thể tải danh sách chủ đề.");
  return payload.data;
}

/* ---------- Home screen (journey library) ---------- */

const JOURNEY_STATUS_LABELS = {
  active: "Đang học",
  reviewing: "Đang ôn",
  completed: "Đã hoàn thành",
  paused: "Tạm dừng",
};

function refreshActiveJourney() {
  const current = journeys.find(
    (journey) => journey.status === "active" || journey.status === "reviewing",
  );
  if (current && !activeLibraryBookKey?.startsWith("uploaded:")) {
    activeJourneyId = current.id;
    activeLibraryBookKey = `journey:${current.id}`;
  }
  else if (!journeys.some((journey) => journey.id === activeJourneyId)) {
    if (!activeLibraryBookKey?.startsWith("uploaded:")) {
      activeJourneyId = null;
      activeLibraryBookKey = null;
    }
  }
}

async function loadLibrary() {
  const [journeyResult, bookResult] = await Promise.allSettled([
    fetch("/api/journeys").then(async (response) => ({
      ok: response.ok,
      payload: await response.json(),
    })),
    fetch("/api/books").then(async (response) => ({
      ok: response.ok,
      payload: await response.json(),
    })),
  ]);
  if (journeyResult.status === "fulfilled" && journeyResult.value.ok) {
    journeys = journeyResult.value.payload.data ?? [];
  }
  if (bookResult.status === "fulfilled" && bookResult.value.ok) {
    uploadedBooks = bookResult.value.payload.data ?? [];
  }
  renderHome();
}

function getLibraryItems() {
  return [
    ...journeys.map((journey) => ({ ...journey, type: "journey" })),
    ...uploadedBooks.map((book) => ({ ...book, type: "uploaded" })),
  ];
}

function renderHomeLanguageFilter() {
  const container = elements.homeLanguageFilter;
  container.replaceChildren();

  const languages = [
    "ALL",
    ...new Set(getLibraryItems().map((item) => item.language).filter(Boolean)),
  ];

  for (const language of languages) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "library-filter-chip";
    button.dataset.value = language;
    button.textContent = language === "ALL" ? "Tất cả" : language;
    button.setAttribute("role", "radio");
    button.setAttribute("aria-checked", "false");
    button.addEventListener("click", () => {
      libraryLanguageFilter = language;
      markSelected(container, ".library-filter-chip", language);
      renderHomeShelf();
    });
    container.append(button);
  }

  markSelected(container, ".library-filter-chip", libraryLanguageFilter);
}

function getFilteredLibraryItems() {
  const query = libraryQuery.trim().toLowerCase();
  return getLibraryItems().filter((item) => {
    const matchesQuery = !query || item.title.toLowerCase().includes(query);
    const matchesLanguage =
      libraryLanguageFilter === "ALL" ||
      item.language === libraryLanguageFilter;
    return matchesQuery && matchesLanguage;
  });
}

const BOOK_HEIGHTS = [198, 178, 212, 186, 204, 172, 218, 192];

function getBooksPerRow() {
  const shelf = elements.homeShelf;
  if (!shelf || shelf.clientWidth <= 0) return 7;

  const probe = document.createElement("div");
  probe.className = "bookshelf-row";
  probe.style.visibility = "hidden";
  probe.style.position = "absolute";
  shelf.append(probe);

  const rowStyle = getComputedStyle(probe);
  const rowPadding =
    parseFloat(rowStyle.paddingLeft) + parseFloat(rowStyle.paddingRight);

  const book = document.createElement("span");
  book.className = "book";
  probe.append(book);
  const bookWidth = book.getBoundingClientRect().width;
  const gap = parseFloat(rowStyle.gap) || 0;

  probe.remove();

  const shelfStyle = getComputedStyle(shelf);
  const shelfPadding =
    parseFloat(shelfStyle.paddingLeft) + parseFloat(shelfStyle.paddingRight);

  const available = shelf.clientWidth - shelfPadding - rowPadding;
  return Math.max(1, Math.floor((available + gap) / (bookWidth + gap)));
}

const BOOK_COLOR_PALETTE = [
  ["#3a8a6d", "#1c4a3b"],
  ["#c07a60", "#7c4432"],
  ["#7b88c0", "#434f82"],
  ["#c2a24e", "#82641f"],
  ["#9a7d47", "#5d4626"],
  ["#4b88a0", "#28505c"],
  ["#8a6d3f", "#5d4626"],
];

function getBookColors(bookId) {
  const key = String(bookId ?? "book");
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) | 0;
  }
  return BOOK_COLOR_PALETTE[Math.abs(hash) % BOOK_COLOR_PALETTE.length];
}

function applyBookColors(element, bookId) {
  const [top, bottom] = getBookColors(bookId);
  element.style.setProperty("--book-top", top);
  element.style.setProperty("--book-bottom", bottom);
}

function buildBookCard(item, index = 0) {
  const uploaded = item.type === "uploaded";
  const itemKey = `${item.type}:${item.id}`;
  const button = document.createElement("button");
  button.type = "button";
  button.className = `book${uploaded ? " book-uploaded" : ""}`;
  button.dataset.bookKey = itemKey;
  button.dataset.language = item.language ?? "";
  applyBookColors(button, itemKey);
  if (itemKey === activeLibraryBookKey) button.classList.add("is-open");
  button.style.height = `${BOOK_HEIGHTS[index % BOOK_HEIGHTS.length]}px`;
  if (uploaded) {
    button.setAttribute(
      "aria-label",
      `Mở sách đã upload ${item.title} (${item.language}, khoảng ${item.readingMinutes} phút đọc).`,
    );
    button.title = `${item.title}\n${item.language} · Sách Markdown\n${item.wordCount} từ`;
  } else {
    button.setAttribute(
      "aria-label",
      `Mở hành trình ${item.title} (${item.language} · ${item.level}). Tiến độ ${item.completedLessons}/${item.totalLessons}.`,
    );
    button.title = `${item.title}\n${item.language} · ${item.level}\n${
      JOURNEY_STATUS_LABELS[item.status] ?? item.status
    }`;
  }

  const spine = document.createElement("span");
  spine.className = "book-spine";
  spine.setAttribute("aria-hidden", "true");

  const dot = document.createElement("span");
  dot.className = `book-status-dot book-status-${uploaded ? "uploaded" : item.status}`;
  dot.setAttribute("aria-hidden", "true");

  const title = document.createElement("strong");
  title.className = "book-title";
  title.textContent = item.title;

  const progress = document.createElement("span");
  progress.className = "book-progress";
  progress.setAttribute("aria-hidden", "true");
  const progressFill = document.createElement("span");
  progressFill.className = "book-progress-fill";
  const percent =
    !uploaded && item.totalLessons > 0
      ? Math.min(
          100,
          Math.round((item.completedLessons / item.totalLessons) * 100),
        )
      : 0;
  progressFill.style.height = `${percent}%`;
  progress.append(progressFill);

  const footer = document.createElement("span");
  footer.className = "book-footer";

  const meta = document.createElement("span");
  meta.className = "book-meta";
  meta.textContent = uploaded
    ? `${item.language} · MD`
    : `${item.language} · ${item.level}`;

  const position = document.createElement("span");
  position.className = "book-position";
  position.textContent = uploaded
    ? `${item.readingMinutes} phút đọc`
    : `${item.completedLessons}/${item.totalLessons} bài`;

  footer.append(meta, position);
  button.append(spine, dot, title, progress, footer);
  button.addEventListener("click", () =>
    uploaded ? openUploadedBook(item.id, button) : openJourney(item.id, button),
  );
  return button;
}

function renderHomeShelf() {
  const filtered = getFilteredLibraryItems();
  const shelf = elements.homeShelf;
  shelf.replaceChildren();

  const booksPerRow = getBooksPerRow();
  for (let start = 0; start < filtered.length; start += booksPerRow) {
    const row = document.createElement("div");
    row.className = "bookshelf-row";
    filtered
      .slice(start, start + booksPerRow)
      .forEach((item, index) =>
        row.append(buildBookCard(item, start + index)),
      );
    shelf.append(row);
  }

  elements.homeEmpty.hidden = filtered.length > 0;
  elements.homeEmpty.textContent =
    getLibraryItems().length === 0
      ? "Kệ sách đang trống. Hãy tạo hành trình hoặc upload một file Markdown."
      : "Không có quyển sách nào khớp với bộ lọc.";
}

function renderHome() {
  refreshActiveJourney();
  renderHomeLanguageFilter();
  renderHomeShelf();
}

function showHome() {
  clearOpenView();
  currentLesson = null;
  bookmarkedLesson = null;
  hideHighlightPopover();
  closeReviewDetail();
  resetBook();
  elements.mastheadEyebrow.textContent = "Kệ sách của bạn";
  elements.loading.hidden = true;
  elements.error.hidden = true;
  elements.journeySetup.hidden = true;
  elements.completion.hidden = true;
  elements.home.hidden = false;
  void elements.home.offsetWidth;
  renderHome();
}

function showHomeOrSetup() {
  showHome();
}

async function openJourney(journeyId, originEl) {
  hideHighlightPopover();
  closeReviewDetail();
  elements.error.hidden = true;
  showBusy("Đang mở hành trình…");

  bookFlyOriginRect = originEl ? originEl.getBoundingClientRect() : null;

  try {
    const response = await fetch(`/api/journeys/${journeyId}/open`, {
      method: "POST",
    });
    const payload = await response.json();
    if (!response.ok)
      throw new Error(payload.message ?? "Không thể mở hành trình.");

    activeJourneyId = journeyId;
    activeLibraryBookKey = `journey:${journeyId}`;

    if (payload.data.journeyCompleted) {
      hideBusy();
      showJourneyCompleted(payload.data.journey);
      await loadHistory(null);
    } else {
      hideBusy();
      bookmarkedLesson = payload.data.lesson;
      await loadHistory(payload.data.lesson);

      const storedLessonId = getStoredJourneyLesson(journeyId);
      let lessonToShow = payload.data.lesson;
      let restoredSavedPage = false;
      if (storedLessonId && storedLessonId !== payload.data.lesson.id) {
        try {
          lessonToShow = await loadTimelineLesson(storedLessonId);
          restoredSavedPage = Boolean(lessonToShow);
        } catch {
          // Keep the current bookmark open if the historical page is unavailable.
        }
      }
      showLesson(lessonToShow);
      if (restoredSavedPage) {
        playBookOpening(lessonToShow);
      } else {
        playBookOpening(lessonToShow, { skipPageTurns: true });
        waitForBookStageOpen().then(() => {
          elements.bookStage.classList.remove("skip-page-turns");
        });
      }
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

async function openUploadedBook(
  bookId,
  originEl,
  requestedSpreadIndex = null,
) {
  elements.error.hidden = true;
  showBusy("Đang mở sách Markdown…");
  bookFlyOriginRect = originEl ? originEl.getBoundingClientRect() : null;

  try {
    const response = await fetch(`/api/books/${encodeURIComponent(bookId)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message ?? "Không thể mở sách.");

    const spreads = createUploadedSpreads(payload.data);
    lessonTimeline = spreads.map((spread, index) => ({
      id: spread.id,
      sequenceNumber: index + 1,
      isCurrent: false,
    }));
    lessonCache.clear();
    spreads.forEach((spread) => lessonCache.set(spread.id, spread));
    activeLibraryBookKey = `uploaded:${bookId}`;
    activeJourneyId = `uploaded:${bookId}`;
    const savedIndex = Number.isInteger(requestedSpreadIndex)
      ? requestedSpreadIndex
      : getStoredUploadedSpread(bookId);
    const spreadIndex = Math.min(
      Math.max(0, Number(savedIndex) || 0),
      spreads.length - 1,
    );
    hideBusy();
    showUploadedSpread(spreads[spreadIndex]);
    playBookOpening(spreads[spreadIndex]);
    await waitForBookStageOpen();
  } catch (error) {
    elements.error.textContent = error.message;
    elements.error.hidden = false;
  } finally {
    hideBusy();
  }
}

async function restoreOpenView(view) {
  if (view.kind === "uploaded") {
    if (!uploadedBooks.some((book) => book.id === view.bookId)) return false;
    await openUploadedBook(view.bookId, null, view.spreadIndex);
    return currentLesson?.kind === "uploaded";
  }

  const response = await fetch(`/api/journeys/${encodeURIComponent(view.journeyId)}/open`, {
    method: "POST",
  });
  const payload = await response.json();
  if (!response.ok || payload.data?.journeyCompleted) return false;

  bookmarkedLesson = payload.data.lesson;
  bookFlyOriginRect = null;
  await loadHistory(payload.data.lesson);

  const storedLesson = lessonTimeline.find(
    (lesson) => lesson.id === view.lessonId,
  );
  if (storedLesson && storedLesson.id !== payload.data.lesson.id) {
    try {
      const lesson = await loadTimelineLesson(storedLesson.id);
      showLesson(lesson);
    } catch {
      // Keep the current bookmark open if the historical page is unavailable.
    }
  } else {
    showLesson(payload.data.lesson);
  }

  playBookOpening(currentLesson);
  await waitForBookStageOpen();
  await loadLibrary();
  loadStats();
  return true;
}

function markSelected(container, selector, value) {
  container.querySelectorAll(selector).forEach((button) => {
    const selected = button.dataset.value === value;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-checked", selected ? "true" : "false");
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
    const empty = document.createElement("p");
    empty.className = "review-empty";
    empty.textContent = "Chưa có chủ đề phù hợp với ngôn ngữ này.";
    elements.topicList.append(empty);
    updateCreateJourneyButton();
    return;
  }

  if (!available.some((topic) => topic.id === selectedTopicId)) {
    selectedTopicId = available[0].id;
  }

  for (const topic of available) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "topic-option";
    button.dataset.topicId = topic.id;
    button.classList.toggle("is-selected", topic.id === selectedTopicId);
    button.setAttribute("role", "radio");
    button.setAttribute(
      "aria-checked",
      topic.id === selectedTopicId ? "true" : "false",
    );

    const title = document.createElement("strong");
    title.textContent = topic.name;
    const description = document.createElement("span");
    description.textContent = topic.description;

    const check = document.createElement("span");
    check.className = "topic-option-check";
    check.setAttribute("aria-hidden", "true");
    check.textContent = "✓";

    button.append(title, description, check);
    button.addEventListener("click", () => selectTopic(topic.id));
    elements.topicList.append(button);
  }

  updateCreateJourneyButton();
}

function renderChoiceList(container, values, key) {
  container.replaceChildren();
  for (const value of values) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-option";
    button.dataset.value = value;
    button.setAttribute("role", "radio");
    button.setAttribute("aria-checked", "false");
    button.textContent = value;
    button.addEventListener("click", () => {
      if (key === "language") selectLanguage(value);
      else selectLevel(value);
    });
    container.append(button);
  }
}

function selectTopic(id) {
  selectedTopicId = id;
  elements.topicList.querySelectorAll(".topic-option").forEach((button) => {
    const selected = button.dataset.topicId === id;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-checked", selected ? "true" : "false");
  });
  updateCreateJourneyButton();
}

function selectLanguage(value) {
  selectedLanguage = value;
  markSelected(elements.languageList, ".choice-option", value);
  renderTopicList();
  updateCreateJourneyButton();
}

function selectLevel(value) {
  selectedLevel = value;
  markSelected(elements.levelList, ".choice-option", value);
  updateCreateJourneyButton();
}

function updateCreateJourneyButton() {
  elements.createJourneyButton.disabled = !(
    selectedTopicId &&
    selectedLanguage &&
    selectedLevel
  );
}

async function renderSetup() {
  elements.createJourneyButton.disabled = true;
  elements.setupStatus.textContent = "";

  if (topics.length === 0) {
    try {
      topics = await loadTopics();
    } catch (error) {
      elements.setupStatus.textContent = error.message;
      return;
    }
  }

  renderChoiceList(elements.languageList, LANGUAGES, "language");
  renderChoiceList(elements.levelList, LEVELS, "level");

  selectLanguage(LANGUAGES[0]);
  selectLevel(LEVELS[0]);
}

async function loadHistory(activeLesson = bookmarkedLesson) {
  if (activeLesson?.id) lessonCache.set(activeLesson.id, activeLesson);
  try {
    const journeyId = currentLesson?.journey?.id;
    const url = journeyId
      ? `/api/lessons/history?journeyId=${encodeURIComponent(journeyId)}`
      : "/api/lessons/history";
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
    lessonTimeline = activeLesson
      ? [{ id: activeLesson.id, isCurrent: true }]
      : [];
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
        throw new Error(payload.message ?? "Không thể tải trang sách.");
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

  const adjacent = [
    lessonTimeline[index - 1],
    lessonTimeline[index + 1],
  ].filter(Boolean);
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
  const leftPage = elements.bookStage.querySelector(".left-paper");
  const rightPage = elements.bookStage.querySelector(".right-paper");
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

  leftPage.classList.toggle("can-flip", canPrev);
  rightPage.classList.toggle("can-flip", canNext);
  leftPage.classList.toggle("is-preloading", Boolean(previousIsLoading));
  rightPage.classList.toggle("is-preloading", Boolean(nextIsLoading));
  elements.bookStage.querySelector(".zone-prev").disabled = !canPrev;
  elements.bookStage.querySelector(".zone-next").disabled = !canNext;
  elements.readerPrev.disabled = !canPrev;
  elements.readerNext.disabled = !canNext;
  elements.readerPrev.classList.toggle(
    "is-preloading",
    Boolean(previousIsLoading),
  );
  elements.readerNext.classList.toggle("is-preloading", Boolean(nextIsLoading));
  elements.readerPrev.setAttribute(
    "aria-label",
    previousIsLoading ? "Đang tải bài trước" : "Bài trước",
  );
  elements.readerNext.setAttribute(
    "aria-label",
    nextIsLoading ? "Đang tải bài tiếp theo" : "Bài tiếp theo",
  );

  const timelineLesson = lessonTimeline[index];
  const isUploadedBook = currentLesson?.kind === "uploaded";
  elements.readerIndexButton.hidden = !isUploadedBook;
  elements.readerIndexButton.disabled = !isUploadedBook || isFlipping;
  if (isUploadedBook) {
    const endPage = Math.min(
      currentLesson.rightPageNumber,
      currentLesson.totalPages,
    );
    elements.readerPageLabel.textContent = timelineLesson
      ? `Trang ${currentLesson.leftPageNumber}–${endPage} / ${currentLesson.totalPages}`
      : "";
  } else {
    elements.readerPageLabel.textContent = timelineLesson
      ? `Trang ${index * 2 + 1}–${index * 2 + 2} / ${lessonTimeline.length * 2}`
      : "";
  }
}

function openUploadedReaderIndex() {
  if (currentLesson?.kind !== "uploaded" || isFlipping) return;
  elements.readerIndexPanel.hidden = false;
  elements.readerIndexButton.setAttribute("aria-expanded", "true");
  elements.readerPageJumpInput.value = "";
  requestAnimationFrame(() => elements.readerPageJumpInput.focus());
}

function closeUploadedReaderIndex() {
  elements.readerIndexPanel.hidden = true;
  elements.readerIndexButton?.setAttribute("aria-expanded", "false");
}

function goToUploadedPage(value) {
  if (currentLesson?.kind !== "uploaded" || isFlipping) return;
  const pageNumber = Number(value);
  const totalPages = currentLesson.totalPages;
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > totalPages) {
    elements.readerPageJumpInput.setCustomValidity(
      `Nhập một trang từ 1 đến ${totalPages}.`,
    );
    elements.readerPageJumpInput.reportValidity();
    return;
  }
  elements.readerPageJumpInput.setCustomValidity("");
  const targetIndex = Math.floor((pageNumber - 1) / 2);
  const currentIndex = lessonTimeline.findIndex(
    (item) => item.id === currentLesson.id,
  );
  // Persist the reader's intent before the animation starts. If the page is
  // reloaded or the book is closed during the flight, restoration still lands
  // on the page they chose from the index.
  saveOpenView({
    kind: "uploaded",
    bookId: currentUploadedBook.id,
    spreadIndex: targetIndex,
  });
  closeUploadedReaderIndex();
  if (targetIndex === currentIndex) return;
  flipUploadedSpread(targetIndex > currentIndex ? 1 : -1, {
    targetIndex,
    durationMs: FAST_PAGE_TURN_MS,
    rapid: true,
  });
}

/* ---------- Antique book-stage opening & page flipping ---------- */

const BOOK_CLOSE_MS = 1800;
const BOOK_STAGE_DISMISS_MS = 600;
const SPINE_TURN_MS = 720;
// A symmetric timeline keeps the sheet perpendicular to the spread exactly
// halfway through the turn. The underlying spread is updated only after the
// sheet has landed, so its reverse never duplicates content below mid-flight.
const PAGE_TURN_MS = 1180;
// Restore and quick-jump turns keep the same paper-flight treatment, but move
// quickly enough that a long Markdown book feels like it is riffling itself.
const FAST_PAGE_TURN_MS = 240;
let bookStageState = "idle";
let bookStageTimers = [];
let isFlipping = false;
let bookFlyOriginRect = null;
let currentFlyer = null;
let currentFlyerCleanup = null;

const BOOK_PHASES = {
  idle: "Đang nằm trên giá",
  presenting: "Đang load dữ liệu sách …",
  opening: "Đang mở sách",
  turning: "Đang mở sách",
  open: "Sẵn sàng để đọc",
  closing: "Đang cất sách",
};

const BOOK_STAGE_STATES = [
  "state-idle",
  "state-presenting",
  "state-opening",
  "state-turning",
  "state-open",
  "state-closing",
];

function setBookStageState(state) {
  bookStageState = state;
  elements.bookStage.classList.remove(...BOOK_STAGE_STATES);
  elements.bookStage.classList.add(`state-${state}`);
  elements.stateLabelText.textContent = BOOK_PHASES[state] ?? "";
  elements.stateLabelTop.hidden = state !== "open";
  elements.stateLabelBottom.hidden = state === "open";
  elements.stateLabelTextTop.textContent = BOOK_PHASES[state] ?? "";
  updateOpenStateLabel();
  elements.statePulse.classList.toggle(
    "pulse",
    !["idle", "open"].includes(state),
  );
  elements.closeBookButton.disabled = state !== "open";
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
  currentFlyerCleanup?.();
  currentFlyerCleanup = null;
}

function resetBook() {
  clearBookStageTimers();
  clearBookFlyer();
  elements.antiqueBook
    .querySelectorAll(".turn-leaf")
    .forEach((leaf) => leaf.remove());
  elements.bookStage.classList.remove(...BOOK_STAGE_STATES);
  elements.bookStage.classList.remove("is-dismissed");
  elements.bookStage.classList.remove("is-flying");
  elements.bookStage.classList.remove("is-spined");
  elements.bookStage.classList.remove("skip-page-turns");
  elements.bookStage.style.removeProperty("--fold-scale");
  elements.bookStage.hidden = true;
  elements.stateLabelTop.hidden = true;
  elements.stateLabelBottom.hidden = false;
  bookStageState = "idle";
}

function updateBookScale() {
  const bookStageContainer = elements.bookStage.querySelector(".book-stage");
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
  elements.bookStage.style.setProperty("--book-scale", scale.toFixed(3));
}

function populateBookStage(lesson) {
  const journey = lesson?.journey ?? {};
  const uploaded = lesson?.kind === "uploaded";
  const title = journey.title ?? "";
  const language = journey.language ?? "";
  const level = journey.level ?? "";

  elements.coverTitle.textContent = title;
  elements.coverSubtitle.textContent =
    uploaded
      ? [language, `${lesson.book.readingMinutes} phút đọc`].filter(Boolean).join(" · ")
      : [language, level].filter(Boolean).join(" · ") || "Writing Journey";
  elements.stageTitle.textContent = title;
  elements.stageCollection.textContent = "";
  const collectionRule = document.createElement("span");
  elements.stageCollection.append(
    collectionRule,
    uploaded
      ? ` Sách tải lên · ${language}`
      : ` Hành trình · ${[language, level].filter(Boolean).join(" · ")}`,
  );
  elements.antiqueBook.dataset.language = language;
  applyBookColors(elements.antiqueBook, journey.id ?? title);
  elements.stageDescription.textContent = journey.description ?? "";
}

function playBookOpening(
  lesson,
  { skipPageTurns = false } = {},
) {
  populateBookStage(lesson);
  clearBookStageTimers();
  clearBookFlyer();
  elements.bookStage.classList.remove("is-dismissed");
  elements.bookStage.classList.remove("is-flying");
  elements.bookStage.classList.toggle("skip-page-turns", skipPageTurns);
  const willFly = Boolean(bookFlyOriginRect);
  elements.bookStage.hidden = false;
  void elements.bookStage.offsetWidth;
  updateBookScale();

  const schedule = (state, delay) => {
    bookStageTimers.push(
      window.setTimeout(() => setBookStageState(state), delay),
    );
  };

  if (willFly) {
    setBookStageState("presenting");
    const rig = elements.bookStage.querySelector(".book-rig");
    const target = getSettledClosedCoverRect(rig);
    const duration = 1050;
    if (target && bookFlyOriginRect) {
      elements.bookStage.classList.add("is-flying");
      const reveal = () => {
        rig.style.transition = "none";
        elements.bookStage.classList.remove("is-flying");
        void elements.bookStage.offsetWidth;
        rig.style.transition = "";
        // Keep the flyer in place for the paint immediately after the rig is
        // revealed, then remove it. This makes the arrival read as one object
        // settling into the standing cover instead of a fade/cut.
        requestAnimationFrame(() => clearBookFlyer());
      };
      launchBookFlyer(bookFlyOriginRect, target, duration, {
        fadeIn: true,
        keepAtEnd: true,
      })
        .then(() => {
          if (elements.bookStage.classList.contains("is-flying")) {
            reveal();
          }
        })
        .catch(reveal);
    }
    schedule("opening", duration + 220);
    if (!skipPageTurns) schedule("turning", duration + 1470);
    schedule("open", duration + (skipPageTurns ? 1700 : 2970));
    return;
  }

  setBookStageState("presenting");
  schedule("opening", 900);
  if (!skipPageTurns) schedule("turning", 2150);
  schedule("open", skipPageTurns ? 2400 : 3650);
}

function getClosedCoverRect() {
  const cover = elements.bookStage.querySelector(".front-cover");
  if (!cover) return null;
  const r = cover.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

function getSettledClosedCoverRect(rig) {
  rig.style.transition = "none";
  void rig.offsetWidth;
  const rect = getClosedCoverRect();
  rig.style.transition = "";
  return rect;
}

function launchBookFlyer(
  fromRect,
  toRect,
  duration,
  { fadeIn = false, keepAtEnd = false } = {},
) {
  clearBookFlyer();

  const flyer = document.createElement("div");
  flyer.className = "book-flyer";
  const antiqueStyle = getComputedStyle(elements.antiqueBook);
  flyer.style.setProperty(
    "--book-top",
    antiqueStyle.getPropertyValue("--book-top").trim() || "#704015",
  );
  flyer.style.setProperty(
    "--book-bottom",
    antiqueStyle.getPropertyValue("--book-bottom").trim() || "#4a2a12",
  );
  const frontCover = elements.bookStage.querySelector(".cover-front");
  const coverClone = frontCover?.cloneNode(true);
  if (coverClone) {
    coverClone.removeAttribute("id");
    coverClone
      .querySelectorAll("[id]")
      .forEach((node) => node.removeAttribute("id"));
    coverClone.classList.add("book-flyer-cover");
    coverClone.setAttribute("aria-hidden", "true");
    flyer.append(coverClone);
  }
  const spineEl = elements.bookStage.querySelector(".spine");
  const spineClone = spineEl?.cloneNode(true);
  if (spineClone) {
    spineClone
      .querySelectorAll("[id]")
      .forEach((node) => node.removeAttribute("id"));
    spineClone.classList.add("book-flyer-spine-edge");
    spineClone.setAttribute("aria-hidden", "true");
    flyer.append(spineClone);
  }
  document.body.append(flyer);
  currentFlyer = flyer;

  const coverWidth = 450;
  const coverHeight = 590;
  const fromTransform =
    `translate(${fromRect.left}px, ${fromRect.top}px) ` +
    `scale(${fromRect.width / coverWidth}, ${fromRect.height / coverHeight})`;
  const toTransform =
    `translate(${toRect.left}px, ${toRect.top}px) ` +
    `scale(${toRect.width / coverWidth}, ${toRect.height / coverHeight})`;

  const keyframes = fadeIn
    ? [
        { transform: fromTransform, opacity: 0 },
        { transform: fromTransform, opacity: 1, offset: 0.12 },
        { transform: toTransform, opacity: 1 },
      ]
    : [
        { transform: fromTransform, opacity: 1 },
        { transform: toTransform, opacity: 1, offset: 0.86 },
        { transform: toTransform, opacity: 0 },
      ];

  const animation = flyer.animate(keyframes, {
    duration,
    easing: "cubic-bezier(0.25, 0.6, 0.2, 1)",
    fill: "forwards",
  });

  if (!keepAtEnd) {
    animation.finished
      .then(() => clearBookFlyer())
      .catch(() => clearBookFlyer());
  }
  return animation.finished.catch(() => undefined);
}

function getShelfBook(bookKey) {
  return [...elements.homeShelf.querySelectorAll(".book")].find(
    (book) => book.dataset.bookKey === String(bookKey),
  );
}

function launchShelfBookFlyer(fromRect, targetBook, duration) {
  clearBookFlyer();

  const targetRect = targetBook.getBoundingClientRect();
  const flyer = document.createElement("div");
  flyer.className = "book-flyer book-flyer-shelf";
  flyer.style.width = `${targetBook.offsetWidth}px`;
  flyer.style.height = `${targetBook.offsetHeight}px`;
  const bookClone = targetBook.cloneNode(true);
  bookClone.classList.add("book-flyer-shelf-book");
  bookClone.disabled = true;
  bookClone.setAttribute("aria-hidden", "true");
  flyer.append(bookClone);
  document.body.append(flyer);
  currentFlyer = flyer;
  const originalVisibility = targetBook.style.visibility;
  targetBook.style.visibility = "hidden";
  currentFlyerCleanup = () => {
    targetBook.style.visibility = originalVisibility;
  };

  const fromTransform =
    `translate(${fromRect.left}px, ${fromRect.top}px) ` +
    `scale(${fromRect.width / targetRect.width}, ${fromRect.height / targetRect.height})`;
  const toTransform =
    `translate(${targetRect.left}px, ${targetRect.top}px) ` + "scale(1)";

  const keyframes = [
    { transform: fromTransform, opacity: 1 },
    { transform: toTransform, opacity: 1, offset: 0.88 },
    { transform: toTransform, opacity: 1 },
  ];

  const animation = flyer.animate(keyframes, {
    duration,
    easing: "cubic-bezier(0.22, 0.72, 0.2, 1)",
    fill: "forwards",
  });

  animation.finished
    .then(() => requestAnimationFrame(() => clearBookFlyer()))
    .catch(() => clearBookFlyer());
  return animation.finished.catch(() => undefined);
}

function closeBookAndReturn() {
  if (isFlipping) return;

  saveCurrentOpenView();
  closeUploadedReaderIndex();
  clearBookStageTimers();
  elements.bookStage.classList.remove("is-dismissed");
  elements.bookStage.hidden = false;
  setBookStageState("closing");

  bookStageTimers.push(
    window.setTimeout(() => {
      const coverRect = getClosedCoverRect();
      const targetRect = bookFlyOriginRect;
      const foldScale =
        targetRect && coverRect ? targetRect.height / coverRect.height : 1;
      elements.bookStage.style.setProperty(
        "--fold-scale",
        Math.max(0.2, Math.min(1.2, foldScale)).toFixed(3),
      );
      elements.bookStage.classList.add("is-spined");
      bookStageTimers.push(
        window.setTimeout(async () => {
          await loadLibrary();
          showHomeBackdrop();

          const finish = () => {
            elements.bookStage.hidden = true;
            elements.bookStage.classList.remove("is-dismissed");
            elements.bookStage.classList.remove("is-flying");
            elements.bookStage.classList.remove("is-spined");
            bookStageState = "idle";
            loadStats();
          };

          const targetBook = getShelfBook(activeLibraryBookKey);
          if (targetBook) {
            const coverRect = getClosedCoverRect();
            const targetRect = targetBook.getBoundingClientRect();
            if (coverRect && targetRect) {
              const spineW = Math.max(24, Math.round(targetRect.width * 0.68));
              const spineH = targetRect.height;
              const fromRect = {
                left: coverRect.left,
                top: coverRect.top + (coverRect.height - spineH) / 2,
                width: spineW,
                height: spineH,
              };
              elements.bookStage.classList.add("is-flying");
              elements.bookStage.classList.add("is-dismissed");
              await launchShelfBookFlyer(fromRect, targetBook, 1150);
              finish();
              return;
            }
          }

          elements.bookStage.classList.add("is-dismissed");
          bookStageTimers.push(
            window.setTimeout(finish, BOOK_STAGE_DISMISS_MS + 80),
          );
        }, SPINE_TURN_MS),
      );
    }, BOOK_CLOSE_MS),
  );
}

function showHomeBackdrop() {
  currentLesson = null;
  bookmarkedLesson = null;
  hideHighlightPopover();
  closeReviewDetail();
  renderHome();
  elements.mastheadEyebrow.textContent = "Kệ sách của bạn";
  elements.loading.hidden = true;
  elements.error.hidden = true;
  elements.journeySetup.hidden = true;
  elements.completion.hidden = true;
  elements.home.hidden = false;
}

function makeTurningPageInert(page) {
  page.removeAttribute("id");
  page.querySelectorAll("[id]").forEach((element) =>
    element.removeAttribute("id"),
  );
  page.querySelectorAll("button, a, input, textarea, select").forEach(
    (element) => {
      element.tabIndex = -1;
      element.setAttribute("aria-hidden", "true");
    },
  );
  page.setAttribute("aria-hidden", "true");
  return page;
}

function createTurningPageSnapshot(side, lesson, { useCurrentDom = false } = {}) {
  const sourcePaper = elements.bookStage.querySelector(`.${side}-paper`);
  const sourceContent = sourcePaper.querySelector(".page-content");
  const page = sourceContent.cloneNode(true);
  page.classList.add("turning-page-content");

  if (!useCurrentDom && lesson.kind === "uploaded") {
    const uploadedPage = page.querySelector(".uploaded-book-page");
    const isLeft = side === "left";
    uploadedPage.hidden = false;
    renderUploadedPage(
      uploadedPage,
      isLeft ? lesson.leftBlocks : lesson.rightBlocks,
      isLeft ? lesson.leftPageNumber : lesson.rightPageNumber,
      lesson.totalPages,
    );
  }

  if (!useCurrentDom && lesson.kind !== "uploaded" && side === "left") {
    page.querySelector(".book-page-head h1").textContent = lesson.title;
    const objective = page.querySelector(".objective-popover p");
    if (objective) objective.textContent = lesson.objective;
    const objectivePopover = page.querySelector(".objective-popover");
    if (objectivePopover) objectivePopover.hidden = true;
    const objectiveToggle = page.querySelector(".objective-info-button");
    if (objectiveToggle) objectiveToggle.setAttribute("aria-expanded", "false");
    page
      .querySelector(".lesson-content")
      .replaceChildren(buildLessonContentFragment(lesson.content));
  }

  if (!useCurrentDom && lesson.kind !== "uploaded" && side === "right") {
    const review = buildReviewFragment(lesson);
    const reviewRoot = page.querySelector(".review");
    reviewRoot?.classList.remove("is-detail-open");
    const title = page.querySelector(".review-title");
    title.textContent = "Từ vựng và Cấu trúc";
    title.classList.remove("is-item-detail");
    const list = page.querySelector(".review-list");
    list.hidden = false;
    list.replaceChildren(review.fragment);
    const detail = page.querySelector(".review-detail");
    if (detail) detail.hidden = true;
    const close = page.querySelector(".review-detail-close");
    if (close) close.hidden = true;
  }

  return makeTurningPageInert(page);
}

function flipUploadedSpread(
  offset,
  { targetIndex = null, durationMs = PAGE_TURN_MS, rapid = false } = {},
) {
  if (isFlipping) return;
  const index = lessonTimeline.findIndex((item) => item.id === currentLesson?.id);
  const resolvedTargetIndex = Number.isInteger(targetIndex)
    ? targetIndex
    : index + offset;
  const target = lessonTimeline[resolvedTargetIndex];
  const spread = target ? lessonCache.get(target.id) : null;
  if (!spread) return;
  const direction = resolvedTargetIndex > index ? "next" : "prev";

  isFlipping = true;
  elements.antiqueBook.classList.add("is-page-turning");
  updateNavigation(currentLesson.id, false);
  updateLessonActionAvailability();
  elements.closeBookButton.disabled = true;

  const leaf = createTurningLeaf(
    direction,
    currentLesson,
    spread,
    { durationMs, rapid },
  );

  if (direction === "prev") {
    renderUploadedPage(
      elements.uploadedLeftPage,
      spread.leftBlocks,
      spread.leftPageNumber,
      spread.totalPages,
    );
  } else {
    renderUploadedPage(
      elements.uploadedRightPage,
      spread.rightBlocks,
      spread.rightPageNumber,
      spread.totalPages,
    );
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      leaf.classList.add("is-animating");
      playPageTurnSound(direction);
    });
  });

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    showUploadedSpread(spread);
    requestAnimationFrame(() => {
      leaf.remove();
      elements.antiqueBook.classList.remove("is-page-turning");
      elements.closeBookButton.disabled = false;
      isFlipping = false;
      updateLessonActionAvailability();
      updateNavigation(spread.id, false);
    });
  };
  const onTurnEnd = (event) => {
    if (event.target !== leaf) return;
    leaf.removeEventListener("animationend", onTurnEnd);
    finish();
  };
  leaf.addEventListener("animationend", onTurnEnd);
  window.setTimeout(() => {
    if (leaf.isConnected) finish();
  }, durationMs + 120);
}

function waitForBookStageOpen(timeoutMs = 6_000) {
  return waitForBookStageState("open", timeoutMs);
}

function waitForBookStageState(targetState, timeoutMs = 10_000) {
  return new Promise((resolve) => {
    const startedAt = performance.now();
    const check = () => {
      if (
        bookStageState === targetState ||
        performance.now() - startedAt >= timeoutMs
      ) {
        resolve();
        return;
      }
      window.setTimeout(check, 50);
    };
    check();
  });
}

function createTurningFace(side, lesson, options) {
  const face = document.createElement("div");
  face.className = `turning-sheet-face turning-sheet-${options.face}`;

  const ornament = document.createElement("div");
  ornament.className = "turning-sheet-ornament";
  ornament.setAttribute("aria-hidden", "true");
  face.append(ornament, createTurningPageSnapshot(side, lesson, options));
  return face;
}

function createTurningLeaf(
  direction,
  sourceLesson,
  targetLesson,
  { durationMs = PAGE_TURN_MS, rapid = false } = {},
) {
  const leaf = document.createElement("div");
  leaf.className = `turn-leaf manual-turn-leaf turn-${direction}${rapid ? " is-rapid-turn" : ""}`;
  leaf.style.setProperty("--page-duration", `${durationMs}ms`);

  const sheet = document.createElement("div");
  sheet.className = "turning-sheet";

  // A real sheet carries the page being left on its leading face and the
  // page being revealed on its reverse. Keeping the content inside each 3D
  // face makes text and ornaments share the paper's perspective in Safari.
  const front =
    direction === "next"
      ? createTurningFace("right", sourceLesson, {
          face: "front",
          useCurrentDom: true,
        })
      : createTurningFace("right", targetLesson, { face: "front" });
  const back =
    direction === "next"
      ? createTurningFace("left", targetLesson, { face: "back" })
      : createTurningFace("left", sourceLesson, {
          face: "back",
          useCurrentDom: true,
        });

  sheet.append(front, back);

  const shadow = document.createElement("div");
  shadow.className = "moving-page-shadow";

  leaf.append(shadow, sheet);
  elements.antiqueBook.append(leaf);
  return leaf;
}

function flipTimelineLesson(
  offset,
  { durationMs = PAGE_TURN_MS, rapid = false } = {},
) {
  if (currentLesson?.kind === "uploaded") {
    flipUploadedSpread(offset, { durationMs, rapid });
    return;
  }
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
  elements.antiqueBook.classList.add("is-page-turning");
  updateNavigation(currentLesson?.id, currentLesson?.isCurrent);
  updateLessonActionAvailability();
  elements.closeBookButton.disabled = true;
  hideHighlightPopover({ skipRerender: true });
  closeObjectivePopover();

  // Build the incoming spread off-screen, but keep the visible spread intact
  // until the turning sheet has completely landed.
  lessonHighlights = [];
  const prepared = { content: null, review: null };
  const prepareContent = () => {
    if (prepared.content) return;
    prepared.content = buildLessonContentFragment(lesson.content);
    prepared.review = buildReviewFragment(lesson);
  };

  // Build the detached fragments before the animation starts. Doing this on
  // its first requestAnimationFrame made Safari occasionally miss an early
  // frame and gave the turn a small initial stutter.
  prepareContent();
  const leaf = createTurningLeaf(
    offset > 0 ? "next" : "prev",
    currentLesson,
    lesson,
    { durationMs, rapid },
  );

  // Stage only the page that physically sits underneath the moving sheet.
  // Keeping the outgoing page there produced two copies of the same glyphs;
  // as their 3D projections diverged, Safari rendered that as shaking text.
  // The other half of the spread stays unchanged until the sheet covers it.
  const stagedLessonPage = offset < 0;
  const stagedReviewPage = offset > 0;
  if (stagedLessonPage) {
    renderLessonPage(lesson, prepared.content);
  } else {
    renderReview(lesson, prepared.review);
  }

  // Give WebKit a complete paint with the sheet resting on the source page
  // before promoting it into an animated 3D layer. Starting the animation in
  // the insertion frame can make Safari rasterize the text one frame late.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      leaf.classList.add("is-animating");
      playPageTurnSound(offset > 0 ? "next" : "prev");
    });
  });

  let contentSwapped = false;
  const swapContent = () => {
    if (contentSwapped) return;
    contentSwapped = true;
    prepareContent();
    showLesson(lesson, prepared, {
      deferHighlights: true,
      lessonPageAlreadyRendered: stagedLessonPage,
      reviewPageAlreadyRendered: stagedReviewPage,
    });
  };
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    // The back face now fully covers the destination page. Let Safari paint
    // the new static spread underneath that face for one frame before taking
    // the moving layer away; replacing both in one task causes a tiny text
    // rasterization flash on WebKit.
    swapContent();
    requestAnimationFrame(() => {
      leaf.remove();
      elements.antiqueBook.classList.remove("is-page-turning");
      elements.closeBookButton.disabled = false;
      isFlipping = false;
      updateLessonActionAvailability();
      updateNavigation(lesson.id, lesson.isCurrent);
      preloadAdjacentLessons(lesson.id);
      loadHighlights(lesson.id);
    });
  };
  const onTurnEnd = (event) => {
    if (event.target !== leaf) return;
    leaf.removeEventListener("animationend", onTurnEnd);
    finish();
  };
  leaf.addEventListener("animationend", onTurnEnd);
  window.setTimeout(() => {
    if (leaf.isConnected) finish();
  }, durationMs + 120);
}

async function loadStats() {
  try {
    const response = await fetch("/api/stats/overview");
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
    showBusy(BUSY_MESSAGES[status.requestType] ?? "Đang xử lý…");
    busyPollTimer = window.setTimeout(pollUntilIdle, BUSY_POLL_MS);
    return;
  }

  const storedOpenView = readStoredOpenView();
  if (storedOpenView) {
    try {
      if (await restoreOpenView(storedOpenView)) return;
    } catch {
      // A deleted book or unavailable journey should fall back to the shelf.
    }
    clearOpenView();
  }

  showHomeOrSetup();
}

initialize();

async function goHome() {
  await loadLibrary();
  showHome();
}

elements.homeSearchInput.addEventListener("input", (event) => {
  libraryQuery = event.target.value;
  renderHomeShelf();
});

elements.homeCreateButton.addEventListener("click", () => {
  showJourneySetup();
});

elements.homeUploadButton.addEventListener("click", () => {
  elements.homeUploadInput.click();
});

elements.homeUploadInput.addEventListener("change", async () => {
  const file = elements.homeUploadInput.files?.[0];
  if (!file) return;
  elements.homeUploadStatus.textContent = "";

  if (!/\.(?:md|markdown)$/i.test(file.name)) {
    elements.homeUploadStatus.textContent =
      "Vui lòng chọn file Markdown có đuôi .md hoặc .markdown.";
    elements.homeUploadInput.value = "";
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    elements.homeUploadStatus.textContent = "File Markdown phải nhỏ hơn hoặc bằng 2 MB.";
    elements.homeUploadInput.value = "";
    return;
  }

  elements.homeUploadButton.disabled = true;
  showBusy(`Đang đưa “${file.name}” lên kệ sách…`);
  try {
    const response = await fetch("/api/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: file.name, content: await file.text() }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message ?? "Không thể upload sách.");

    await loadLibrary();
    showHome();
    elements.homeUploadStatus.textContent = `Đã đặt “${payload.data.title}” lên kệ sách.`;
    const uploadedBook = getShelfBook(`uploaded:${payload.data.id}`);
    uploadedBook?.focus();
  } catch (error) {
    elements.homeUploadStatus.textContent = error.message;
  } finally {
    elements.homeUploadInput.value = "";
    elements.homeUploadButton.disabled = false;
    hideBusy();
  }
});

elements.backHomeButton.addEventListener("click", () => {
  goHome();
});

elements.closeBookButton.addEventListener("click", () => {
  closeBookAndReturn();
});

elements.readerIndexButton.addEventListener("click", () => {
  if (elements.readerIndexPanel.hidden) openUploadedReaderIndex();
  else closeUploadedReaderIndex();
});

elements.readerIndexClose.addEventListener("click", closeUploadedReaderIndex);

elements.readerPageJumpForm.addEventListener("submit", (event) => {
  event.preventDefault();
  goToUploadedPage(elements.readerPageJumpInput.value);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !elements.readerIndexPanel.hidden) {
    closeUploadedReaderIndex();
    elements.readerIndexButton.focus();
  }
});

window.addEventListener("resize", updateBookScale);

let shelfResizeTimer = null;
window.addEventListener("resize", () => {
  window.clearTimeout(shelfResizeTimer);
  shelfResizeTimer = window.setTimeout(() => {
    if (!elements.home.hidden) renderHomeShelf();
  }, 150);
});

/* ---------- Hover & page-turn sound ---------- */

let audioContext = null;
let sharedNoiseBuffer = null;
const sharedNoiseSamples = new Float32Array(8192);
for (let index = 0; index < sharedNoiseSamples.length; index += 1) {
  sharedNoiseSamples[index] = Math.random() * 2 - 1;
}
let lastHoverSoundAt = 0;
let hoveredBook = null;

function ensureAudioContext() {
  if (!audioContext) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (Ctor) audioContext = new Ctor();
  }
  if (audioContext?.state === "suspended") {
    audioContext.resume().catch(() => undefined);
  }
  return audioContext;
}

function getSharedNoiseBuffer(ctx) {
  if (!sharedNoiseBuffer) {
    sharedNoiseBuffer = ctx.createBuffer(
      1,
      sharedNoiseSamples.length,
      ctx.sampleRate,
    );
    sharedNoiseBuffer.copyToChannel(sharedNoiseSamples, 0);
  }
  return sharedNoiseBuffer;
}

function playPageTurnSound(direction = "next") {
  const ctx = ensureAudioContext();
  if (!ctx) return;

  const t = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, t);
  master.gain.exponentialRampToValueAtTime(0.072, t + 0.025);
  master.gain.setValueAtTime(0.068, t + 0.58);
  master.gain.exponentialRampToValueAtTime(0.0001, t + 1.02);
  master.connect(ctx.destination);

  const addSweep = (
    start,
    duration,
    fromFrequency,
    toFrequency,
    level,
    fromPan,
    toPan,
  ) => {
    const noise = ctx.createBufferSource();
    noise.buffer = getSharedNoiseBuffer(ctx);
    noise.loop = true;

    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.setValueAtTime(260, start);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.setValueAtTime(0.72, start);
    filter.frequency.setValueAtTime(fromFrequency, start);
    filter.frequency.exponentialRampToValueAtTime(
      toFrequency,
      start + duration,
    );

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(level, start + 0.025);
    gain.gain.exponentialRampToValueAtTime(
      level * 0.42,
      start + duration * 0.48,
    );
    gain.gain.exponentialRampToValueAtTime(
      level * 0.72,
      start + duration * 0.67,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    const panner = ctx.createStereoPanner?.();
    if (panner) {
      panner.pan.setValueAtTime(fromPan, start);
      panner.pan.linearRampToValueAtTime(toPan, start + duration);
      noise
        .connect(highpass)
        .connect(filter)
        .connect(gain)
        .connect(panner)
        .connect(master);
    } else {
      noise.connect(highpass).connect(filter).connect(gain).connect(master);
    }
    noise.start(start, Math.random() * noise.buffer.duration * 0.6);
    noise.stop(start + duration + 0.02);
  };

  const panFrom = direction === "next" ? 0.62 : -0.62;
  const panTo = -panFrom;
  // Paper lifting off and sweeping over the spine.
  addSweep(t + 0.02, 0.48, 720, 2850, 0.52, panFrom, 0);
  // Paper settling onto the other side.
  addSweep(t + 0.46, 0.47, 2500, 520, 0.46, 0, panTo);

  // Soft landing thump.
  const thump = ctx.createOscillator();
  thump.type = "sine";
  thump.frequency.setValueAtTime(185, t + 0.9);
  thump.frequency.exponentialRampToValueAtTime(82, t + 1.01);
  const thumpGain = ctx.createGain();
  thumpGain.gain.setValueAtTime(0.0001, t + 0.9);
  thumpGain.gain.exponentialRampToValueAtTime(0.038, t + 0.92);
  thumpGain.gain.exponentialRampToValueAtTime(0.0001, t + 1.03);
  thump.connect(thumpGain).connect(master);
  thump.start(t + 0.9);
  thump.stop(t + 1.04);
}

function playBookHoverSound() {
  const now = performance.now();
  if (now - lastHoverSoundAt < 100) return;
  lastHoverSoundAt = now;

  const ctx = ensureAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, t);
  master.gain.exponentialRampToValueAtTime(0.15, t + 0.012);
  master.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
  master.connect(ctx.destination);

  const freq = 140 + Math.random() * 90;
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.55, t + 0.09);
  osc.connect(master);
  osc.start(t);
  osc.stop(t + 0.14);

  const noise = ctx.createBufferSource();
  noise.buffer = getSharedNoiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(700 + Math.random() * 500, t);
  filter.Q.value = 1.4;
  const tick = ctx.createGain();
  tick.gain.setValueAtTime(0.06, t);
  tick.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  noise.connect(filter).connect(tick).connect(master);
  noise.start(t, Math.random() * noise.buffer.duration * 0.2, 0.05);
  noise.stop(t + 0.05);
}

elements.homeShelf.addEventListener("mouseover", (event) => {
  const book = event.target.closest?.(".book");
  if (book && book !== hoveredBook) {
    hoveredBook = book;
    playBookHoverSound();
  }
});
elements.homeShelf.addEventListener("mouseout", (event) => {
  if (hoveredBook && !event.target.closest?.(".book")) hoveredBook = null;
});

elements.bookStage
  .querySelector(".zone-prev")
  .addEventListener("click", () => flipTimelineLesson(-1));
elements.bookStage
  .querySelector(".zone-next")
  .addEventListener("click", () => flipTimelineLesson(1));
elements.readerPrev.addEventListener("click", () => flipTimelineLesson(-1));
elements.readerNext.addEventListener("click", () => flipTimelineLesson(1));

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
  .querySelector(".right-paper")
  .addEventListener("click", (event) => handlePageClick(event, 1));

elements.bookStage
  .querySelector(".left-paper")
  .addEventListener("click", (event) => handlePageClick(event, -1));

elements.newJourneyButton.addEventListener("click", () => {
  showJourneySetup();
});

elements.createJourneyButton.addEventListener("click", async () => {
  elements.createJourneyButton.disabled = true;
  showBusy(
    "Đang vẽ lộ trình và sinh bài đầu tiên… có thể mất một chút thời gian.",
  );

  try {
    const response = await fetch("/api/journeys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topicId: selectedTopicId,
        language: selectedLanguage,
        level: selectedLevel,
      }),
    });
    const payload = await response.json();

    if (!response.ok)
      throw new Error(payload.message ?? "Không thể tạo hành trình.");

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

elements.completeButton.addEventListener("click", async () => {
  if (!currentLesson) return;

  const completedJourney = currentLesson.journey;
  elements.completeButton.disabled = true;
  showBusy("Đang khóa bài và chuẩn bị bài tiếp theo…");

  try {
    const response = await fetch(`/api/lessons/${currentLesson.id}/complete`, {
      method: "POST",
    });
    const payload = await response.json();

    if (!response.ok)
      throw new Error(payload.message ?? "Không thể hoàn thành bài.");

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
      ? "Bài này đã được ghi nhận trước đó."
      : "Đã khóa bài trước. Đây là bài tiếp theo.";
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

elements.regenerateButton.addEventListener("click", async () => {
  if (!currentLesson) return;

  elements.regenerateButton.disabled = true;
  elements.completeButton.disabled = true;
  showBusy("Đang tạo một phiên bản khác…");

  try {
    const response = await fetch(
      `/api/lessons/${currentLesson.id}/regenerate`,
      {
        method: "POST",
      },
    );
    const payload = await response.json();

    if (!response.ok)
      throw new Error(payload.message ?? "Không thể tạo lại bài.");
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

elements.lessonContent.addEventListener("mouseup", (event) => {
  if (event.target.closest?.(".saved-note-highlight")) return;
  window.setTimeout(() => maybeShowHighlightPopover(), 0);
});

elements.lessonContent.addEventListener("keyup", (event) => {
  if (event.target.closest?.(".saved-note-highlight")) return;
  window.setTimeout(() => maybeShowHighlightPopover(), 0);
});

elements.highlightSaveButton.addEventListener("click", () => {
  saveHighlight();
});

elements.highlightCommentInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    saveHighlight();
  }
});

elements.highlightCancelButton.addEventListener("click", () => {
  hideHighlightPopover();
});

elements.highlightEditButton.addEventListener("click", () => {
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
  showHighlightCreateView(pendingHighlight, undefined, highlight.comment ?? "");
});

elements.highlightDeleteButton.addEventListener("click", () => {
  deleteHighlight();
});

document.addEventListener("click", (event) => {
  if (
    !elements.objectivePopover.hidden &&
    !elements.objectivePopover.contains(event.target) &&
    !elements.objectiveToggle.contains(event.target)
  ) {
    closeObjectivePopover();
  }
  if (elements.highlightPopover.hidden) return;
  if (elements.highlightPopover.contains(event.target)) return;
  if (event.target.closest?.(".saved-note-highlight")) return;
  hideHighlightPopover();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !elements.objectivePopover.hidden) {
    closeObjectivePopover();
    elements.objectiveToggle.focus();
  }
  if (event.key === "Escape" && !elements.highlightPopover.hidden) {
    hideHighlightPopover();
  }
  if (event.key === "Escape" && !elements.reviewDetail.hidden) {
    closeReviewDetail();
  }
});

elements.reviewDetailClose.addEventListener("click", () => {
  closeReviewDetail();
});

function closeObjectivePopover() {
  elements.objectivePopover.hidden = true;
  elements.objectiveToggle.setAttribute("aria-expanded", "false");
}

elements.objectiveToggle.addEventListener("click", () => {
  const shouldOpen = elements.objectivePopover.hidden;
  closeObjectivePopover();
  if (shouldOpen) {
    elements.objectivePopover.hidden = false;
    elements.objectiveToggle.setAttribute("aria-expanded", "true");
  }
});
