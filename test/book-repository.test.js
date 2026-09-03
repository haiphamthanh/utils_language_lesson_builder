import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { BookRepository, bookInternals } from '../src/repositories/book-repository.js';

test('parseFrontMatter separates supported metadata from Markdown content', () => {
  const parsed = bookInternals.parseFrontMatter(`---
id: sample-book
title: 'Sách mẫu'
description: Mạch phát triển ngữ pháp theo năng lực
  diễn đạt.
language: vi-VN
tags:
- grammar
- japanese
---

# Sách mẫu

Nội dung.`);

  assert.equal(parsed.attributes.title, 'Sách mẫu');
  assert.equal(
    parsed.attributes.description,
    'Mạch phát triển ngữ pháp theo năng lực diễn đạt.',
  );
  assert.deepEqual(parsed.attributes.tags, ['grammar', 'japanese']);
  assert.match(parsed.content, /^# Sách mẫu/);
});

test('BookRepository stores content and metadata in a named books directory', async (context) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'lesson-books-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const repository = new BookRepository(directory);

  const metadata = await repository.create({
    fileName: 'grammar-flow.md',
    content: `---
id: minna-grammar
title: Minna Grammar
description: Một mạch ngữ pháp.
language: vi-VN
---

# Minna Grammar

Nội dung của sách.`,
  });

  assert.equal(metadata.id, 'minna-grammar');
  assert.equal(metadata.type, 'uploaded');
  assert.equal((await repository.list())[0].title, 'Minna Grammar');
  assert.match((await repository.getById(metadata.id)).content, /Nội dung của sách/);

  const storedMetadata = JSON.parse(
    await readFile(path.join(directory, 'minna-grammar', 'metadata.json'), 'utf8'),
  );
  assert.equal(storedMetadata.originalFileName, 'grammar-flow.md');
});

test('BookRepository rejects non-Markdown uploads', async () => {
  const repository = new BookRepository('/tmp/unused-book-repository');
  await assert.rejects(
    repository.create({ fileName: 'notes.txt', content: 'hello' }),
    (error) => error.code === 'INVALID_BOOK_FILE' && error.status === 400,
  );
});
