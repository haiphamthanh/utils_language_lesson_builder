import { AppError } from '../http/errors.js';

export function normalizeSelectionText(text) {
  return String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isInteger(value) {
  return Number.isInteger(value);
}

export class HighlightService {
  constructor(highlightRepository) {
    this.highlightRepository = highlightRepository;
  }

  async listForLesson({ userId, lessonId }) {
    return this.highlightRepository.listByLesson({ userId, lessonId });
  }

  async create({ userId, lessonId, paragraphIndex, startOffset, endOffset, text, comment }) {
    this.#validateRange({ paragraphIndex, startOffset, endOffset, text });

    const content = await this.highlightRepository.findActiveContent({
      userId,
      lessonId,
    });
    this.#validateSlice(content, { paragraphIndex, startOffset, endOffset, text });

    return this.highlightRepository.create({
      userId,
      lessonId,
      paragraphIndex,
      startOffset,
      endOffset,
      text,
      comment,
    });
  }

  async updateComment({ userId, highlightId, comment }) {
    if (comment !== undefined && typeof comment !== 'string') {
      throw new AppError(400, 'INVALID_HIGHLIGHT', 'The comment must be text.');
    }
    return this.highlightRepository.updateComment({ userId, highlightId, comment });
  }

  async delete({ userId, highlightId }) {
    await this.highlightRepository.delete({ userId, highlightId });
  }

  #validateRange({ paragraphIndex, startOffset, endOffset, text }) {
    const invalid =
      !isInteger(paragraphIndex) ||
      paragraphIndex < 0 ||
      !isInteger(startOffset) ||
      startOffset < 0 ||
      !isInteger(endOffset) ||
      endOffset <= startOffset ||
      typeof text !== 'string' ||
      text.trim() === '';
    if (invalid) {
      throw new AppError(400, 'INVALID_HIGHLIGHT', 'The highlight range is invalid.');
    }
  }

  #validateSlice(content, { paragraphIndex, startOffset, endOffset, text }) {
    if (!content) {
      throw new AppError(409, 'LESSON_CONTENT_MISSING', 'The lesson has no content yet.');
    }

    const paragraphs = content.split('\n');
    const paragraphText = paragraphs[paragraphIndex] ?? '';
    const normalizedSlice = normalizeSelectionText(
      paragraphText.slice(startOffset, endOffset),
    );

    if (!normalizedSlice || normalizedSlice !== normalizeSelectionText(text)) {
      throw new AppError(
        409,
        'HIGHLIGHT_MISMATCH',
        'The highlight text no longer matches the lesson content.',
      );
    }
  }
}
