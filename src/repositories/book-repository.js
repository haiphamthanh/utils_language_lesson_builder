import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { AppError } from '../http/errors.js';

const BOOK_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_MARKDOWN_BYTES = 2 * 1024 * 1024;

function unquote(value) {
  const text = String(value ?? '').trim();
  if (
    (text.startsWith("'") && text.endsWith("'")) ||
    (text.startsWith('"') && text.endsWith('"'))
  ) {
    return text.slice(1, -1).replace(/''/g, "'");
  }
  return text;
}

function parseFrontMatter(markdown) {
  const normalized = String(markdown ?? '').replace(/^\uFEFF/, '');
  const match = normalized.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
  if (!match) return { attributes: {}, content: normalized.trim() };

  const attributes = {};
  let activeList = null;
  let activeKey = null;
  for (const line of match[1].split(/\r?\n/)) {
    const listItem = line.match(/^\s*-\s+(.+)$/);
    if (listItem && activeList) {
      attributes[activeList].push(unquote(listItem[1]));
      continue;
    }

    const continuation = line.match(/^\s+(.+)$/);
    if (
      continuation &&
      activeKey &&
      typeof attributes[activeKey] === 'string'
    ) {
      attributes[activeKey] = `${attributes[activeKey]} ${unquote(continuation[1])}`;
      continue;
    }

    const entry = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
    if (!entry) continue;
    const [, key, rawValue] = entry;
    activeKey = key;
    if (!rawValue.trim()) {
      attributes[key] = [];
      activeList = key;
    } else {
      attributes[key] = unquote(rawValue);
      activeList = null;
    }
  }

  return {
    attributes,
    content: normalized.slice(match[0].length).trim(),
  };
}

function slugify(value) {
  const slug = String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
  return slug || 'uploaded-book';
}

function titleFromContent(content, fileName) {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (heading) return heading.replace(/[*_`]/g, '');
  return path.basename(fileName, path.extname(fileName)).replace(/[-_]+/g, ' ');
}

function descriptionFromContent(content) {
  const paragraph = content
    .split(/\r?\n\s*\r?\n/)
    .find((block) => {
      const trimmed = block.trim();
      return (
        trimmed &&
        !trimmed.startsWith('#') &&
        !trimmed.startsWith('```') &&
        !/^(?:---+|___+|\*\*\*+)$/.test(trimmed)
      );
    });
  return String(paragraph ?? '')
    .replace(/^>\s?/gm, '')
    .replace(/[*_`[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);
}

function assertMarkdownInput({ fileName, content }) {
  const name = String(fileName ?? '').trim();
  if (!/\.(?:md|markdown)$/i.test(name)) {
    throw new AppError(400, 'INVALID_BOOK_FILE', 'Chỉ có thể tải lên file Markdown (.md hoặc .markdown).');
  }
  if (typeof content !== 'string' || !content.trim()) {
    throw new AppError(400, 'EMPTY_BOOK_FILE', 'File Markdown không có nội dung.');
  }
  if (Buffer.byteLength(content, 'utf8') > MAX_MARKDOWN_BYTES) {
    throw new AppError(413, 'BOOK_FILE_TOO_LARGE', 'File Markdown phải nhỏ hơn hoặc bằng 2 MB.');
  }
}

export class BookRepository {
  constructor(rootDirectory = path.resolve('books')) {
    this.rootDirectory = rootDirectory;
  }

  async #ensureRoot() {
    await mkdir(this.rootDirectory, { recursive: true });
  }

  async #availableId(preferredId) {
    const entries = new Set(await readdir(this.rootDirectory));
    if (!entries.has(preferredId)) return preferredId;
    let suffix = 2;
    while (entries.has(`${preferredId}-${suffix}`)) suffix += 1;
    return `${preferredId}-${suffix}`;
  }

  async list() {
    await this.#ensureRoot();
    const entries = await readdir(this.rootDirectory, { withFileTypes: true });
    const books = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
        .map(async (entry) => {
          try {
            const raw = await readFile(
              path.join(this.rootDirectory, entry.name, 'metadata.json'),
              'utf8',
            );
            return JSON.parse(raw);
          } catch {
            return null;
          }
        }),
    );

    return books
      .filter(Boolean)
      .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
  }

  async getById(bookId) {
    if (!BOOK_ID_PATTERN.test(String(bookId ?? ''))) {
      throw new AppError(404, 'BOOK_NOT_FOUND', 'Không tìm thấy sách.');
    }

    try {
      const directory = path.join(this.rootDirectory, bookId);
      const [rawMetadata, content] = await Promise.all([
        readFile(path.join(directory, 'metadata.json'), 'utf8'),
        readFile(path.join(directory, 'content.md'), 'utf8'),
      ]);
      return { ...JSON.parse(rawMetadata), content };
    } catch (error) {
      if (error?.code === 'ENOENT' || error instanceof SyntaxError) {
        throw new AppError(404, 'BOOK_NOT_FOUND', 'Không tìm thấy sách.');
      }
      throw error;
    }
  }

  async create({ fileName, content }) {
    assertMarkdownInput({ fileName, content });
    await this.#ensureRoot();

    const parsed = parseFrontMatter(content);
    if (!parsed.content) {
      throw new AppError(400, 'EMPTY_BOOK_FILE', 'File Markdown không có nội dung sách.');
    }

    const title = String(
      parsed.attributes.title || titleFromContent(parsed.content, fileName),
    ).trim();
    const preferredId = slugify(parsed.attributes.id || title || fileName);
    const id = await this.#availableId(preferredId);
    const wordCount = parsed.content.split(/\s+/u).filter(Boolean).length;
    const metadata = {
      schemaVersion: 1,
      id,
      type: 'uploaded',
      title: title.slice(0, 180),
      description: String(
        parsed.attributes.description || descriptionFromContent(parsed.content),
      ).trim().slice(0, 500),
      language: String(parsed.attributes.language || 'Không xác định').trim(),
      tags: Array.isArray(parsed.attributes.tags) ? parsed.attributes.tags : [],
      originalFileName: path.basename(fileName),
      wordCount,
      readingMinutes: Math.max(1, Math.ceil(wordCount / 220)),
      createdAt: new Date().toISOString(),
    };

    const temporaryDirectory = path.join(
      this.rootDirectory,
      `.upload-${id}-${randomUUID()}`,
    );
    const finalDirectory = path.join(this.rootDirectory, id);
    await mkdir(temporaryDirectory);
    try {
      await Promise.all([
        writeFile(
          path.join(temporaryDirectory, 'metadata.json'),
          `${JSON.stringify(metadata, null, 2)}\n`,
          'utf8',
        ),
        writeFile(path.join(temporaryDirectory, 'content.md'), `${parsed.content}\n`, 'utf8'),
      ]);
      await rename(temporaryDirectory, finalDirectory);
    } catch (error) {
      await rm(temporaryDirectory, { recursive: true, force: true });
      throw error;
    }

    return metadata;
  }
}

export const bookInternals = { parseFrontMatter, slugify };
