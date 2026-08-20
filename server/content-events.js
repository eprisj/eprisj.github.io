"use strict";

/* ЧТО ИМЕННО ИЗМЕНИЛОСЬ В КОНТЕНТЕ.
 *
 * Панель сохраняет содержимое сайта целиком: один POST — весь файл. Поэтому
 * «создали статью», «опубликовали черновик» и «скрыли материал» на уровне
 * службы выглядят одинаково — как перезапись двух мегабайт. Разница видна
 * только при сравнении с предыдущей версией, и вот это сравнение здесь.
 *
 * Сравниваем по идентификаторам, а не по позиции в массиве: редакция меняет
 * порядок материалов руками, и порядковый номер не значит ничего.
 *
 * Осторожность важнее полноты: если что-то непонятно, лучше промолчать, чем
 * прислать в чат «удалено 14 статей» из-за того, что файл пришёл битым.
 */

const COLLECTIONS = [
  ["articles", "статья"],
  ["reviews", "обзор"],
  ["items", "карточка галереи"],
  ["issues", "выпуск"],
];

function byId(list) {
  const map = new Map();
  if (!Array.isArray(list)) return map;
  for (const entry of list) {
    if (entry && entry.id !== undefined && entry.id !== null) map.set(String(entry.id), entry);
  }
  return map;
}

const titleOf = (entry) => String((entry && entry.title) || "без названия").slice(0, 90);

/* Сравнение двух снимков контента. Возвращает список строк для чата.
   Пустой список означает «ничего заметного не произошло» — например, правку
   текста внутри статьи, о которой сообщать в чат незачем. */
function diffContent(previous, next) {
  if (!previous || !next || typeof previous !== "object" || typeof next !== "object") return [];
  const events = [];

  for (const [key, kind] of COLLECTIONS) {
    const before = byId(previous[key]);
    const after = byId(next[key]);

    /* Пустая коллекция там, где раньше было содержимое, — это почти наверняка
       сбой сохранения, а не редакция, удалившая всё разом. О таком стоит
       сказать отдельно и не расписывать удаление каждой записи. */
    if (before.size > 2 && after.size === 0) {
      events.push(`⚠️ Коллекция «${key}» опустела: было ${before.size}. Похоже на сбой сохранения, а не на правку.`);
      continue;
    }

    for (const [id, entry] of after) {
      const old = before.get(id);
      if (!old) {
        events.push(entry.draft
          ? `📝 Создан черновик: ${kind} «${titleOf(entry)}»`
          : `✳️ Создана и опубликована ${kind}: «${titleOf(entry)}»`);
        continue;
      }
      if (old.draft && !entry.draft) events.push(`✅ Опубликовано: ${kind} «${titleOf(entry)}»`);
      if (!old.draft && entry.draft) events.push(`🙈 Снято с публикации в черновики: ${kind} «${titleOf(entry)}»`);
      if (titleOf(old) !== titleOf(entry)) events.push(`✏️ Переименовано: ${kind} «${titleOf(old)}» → «${titleOf(entry)}»`);
    }

    for (const [id, entry] of before) {
      if (!after.has(id)) events.push(`🗑 Удалено: ${kind} «${titleOf(entry)}»`);
    }
  }

  // Видимость разделов: скрытая вкладка выглядит как пропавший раздел сайта,
  // и заметить это по самому сайту можно не сразу.
  const visibilityBefore = (previous.visibility && typeof previous.visibility === "object") ? previous.visibility : {};
  const visibilityAfter = (next.visibility && typeof next.visibility === "object") ? next.visibility : {};
  for (const section of new Set([...Object.keys(visibilityBefore), ...Object.keys(visibilityAfter)])) {
    const was = visibilityBefore[section] && visibilityBefore[section].page !== false;
    const now = visibilityAfter[section] && visibilityAfter[section].page !== false;
    if (was && !now) events.push(`🚫 Раздел скрыт с сайта: ${section}`);
    if (!was && now && section in visibilityBefore) events.push(`👁 Раздел снова виден: ${section}`);
  }

  return events;
}

/* Одно сообщение вместо десяти: редакция сохраняет панель пачкой, и каждое
   действие отдельным уведомлением превратило бы чат в ленту. */
function formatEvents(events, { author } = {}) {
  if (!events.length) return "";
  const head = events.length === 1 ? "EPRIS, изменение:" : `EPRIS, изменений: ${events.length}`;
  const tail = author ? `\n\nСохранил: ${author}` : "";
  return `${head}\n\n${events.slice(0, 25).join("\n")}${events.length > 25 ? `\n… и ещё ${events.length - 25}` : ""}${tail}`;
}

module.exports = { diffContent, formatEvents };
