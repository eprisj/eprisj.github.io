"use strict";

/* Тесты разбора изменений контента.
 *
 * Проверяется то, из-за чего уведомления были бы вредны: ложное «удалено»
 * при сбое сохранения, молчание там, где произошло важное, и шум там, где
 * редакция просто правила текст. */

const test = require("node:test");
const assert = require("node:assert/strict");
const { diffContent, formatEvents } = require("./content-events.js");

const snapshot = (articles, extra = {}) => ({ articles, reviews: [], items: [], issues: [], ...extra });

test("создание, публикация, скрытие и удаление называются своими словами", () => {
  const before = snapshot([
    { id: 1, title: 'Живая', draft: false },
    { id: 2, title: 'Черновик', draft: true },
    { id: 3, title: 'Уйдёт', draft: false },
  ]);
  const after = snapshot([
    { id: 1, title: 'Живая', draft: true },          // сняли с публикации
    { id: 2, title: 'Черновик', draft: false },      // опубликовали
    { id: 4, title: 'Новая', draft: true },          // создали черновик
  ]);
  const events = diffContent(before, after).join('\n');
  assert.match(events, /Опубликовано: статья «Черновик»/);
  assert.match(events, /черновики: статья «Живая»/);
  assert.match(events, /Создан черновик: статья «Новая»/);
  assert.match(events, /Удалено: статья «Уйдёт»/);
});

test("правка текста внутри статьи не поднимает шум", () => {
  /* Редакция сохраняет панель десятки раз за вечер. Если сообщать о каждом
     сохранении, чат перестанут читать — и пропустят настоящее событие. */
  const before = snapshot([{ id: 1, title: 'Статья', draft: false, content: 'было' }]);
  const after = snapshot([{ id: 1, title: 'Статья', draft: false, content: 'стало' }]);
  assert.deepEqual(diffContent(before, after), []);
});

test("опустевшая коллекция читается как сбой, а не как массовое удаление", () => {
  /* Так выглядит битое сохранение. Разослать «удалено 12 статей» — значит
     напугать редакцию ровно в тот момент, когда ей нужно спокойно откатиться. */
  const before = snapshot(Array.from({ length: 12 }, (_, i) => ({ id: i, title: `Статья ${i}` })));
  const after = snapshot([]);
  const events = diffContent(before, after);
  assert.equal(events.length, 1);
  assert.match(events[0], /опустела: было 12/);
  assert.doesNotMatch(events[0], /Удалено/);
});

test("порядок материалов не считается изменением", () => {
  // Редакция переставляет карточки руками; позиция в массиве ничего не значит.
  const a = { id: 1, title: 'Первая' };
  const b = { id: 2, title: 'Вторая' };
  assert.deepEqual(diffContent(snapshot([a, b]), snapshot([b, a])), []);
});

test("скрытый раздел замечается, битый снимок игнорируется", () => {
  const before = snapshot([], { visibility: { radio: { page: true } } });
  const after = snapshot([], { visibility: { radio: { page: false } } });
  assert.match(diffContent(before, after).join(''), /Раздел скрыт с сайта: radio/);
  assert.deepEqual(diffContent(null, after), []);
  assert.deepEqual(diffContent(before, 'не объект'), []);
});

test("события уходят одним сообщением", () => {
  const events = ['✅ Опубликовано: статья «А»', '🗑 Удалено: обзор «Б»'];
  const text = formatEvents(events, { author: 'editor' });
  assert.match(text, /изменений: 2/);
  assert.match(text, /Сохранил: editor/);
  assert.equal(formatEvents([]), '');
});
