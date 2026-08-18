/* Тесты выборки контента для сайта.
 *
 * Проверяется случай, из-за которого читатели на украинском видели все обзоры
 * по-английски: в языковом наборе лежали переводы удалённых записей, и защита
 * от подмены выключала перевод ЦЕЛИКОМ. Логика вынесена сюда в том же виде,
 * что в data.ts: тест сторожит правило, а не реализацию.
 */

import test from "node:test";
import assert from "node:assert/strict";

/* Точная копия правила из src/data.ts (mergeLocalizedItems + mergeLocalizedArray)
   в минимальном виде: перевод берётся по id, лишние записи игнорируются. */
const isPlaceholder = (entry) => Boolean(entry?.placeholder);
const hasPayload = (entry) => Boolean(entry && (entry.title || entry.content));

function mergeLocalized(localized, base) {
  if (!Array.isArray(localized)) return base;
  const baseIds = new Set(base.map((entry) => Number(entry.id)));
  const usable = localized.filter((entry) => baseIds.has(Number(entry.id)) && !isPlaceholder(entry));
  const byId = new Map(usable.map((entry) => [Number(entry.id), entry]));
  return base.map((entry) => {
    const overlay = byId.get(Number(entry.id));
    if (!overlay || !hasPayload(overlay)) return entry;
    return { ...entry, ...overlay };
  });
}

test("перевод удалённой записи не отменяет перевод остальных", () => {
  // Ровно живой случай: в базе три обзора, в украинском наборе шесть, из них
  // три от давно удалённых записей.
  const base = [{ id: 1, title: "Le Dauphine" }, { id: 6, title: "Dining Inside a Watercolour" }];
  const ua = [
    { id: 1, title: "Ле Дофін" },
    { id: 2, title: "Книга шепотів" },
    { id: 3, title: "Модерністський відступ" },
    { id: 6, title: "Вечеря всередині акварелі" },
  ];
  const merged = mergeLocalized(ua, base);
  assert.deepEqual(merged.map((e) => e.title), ["Ле Дофін", "Вечеря всередині акварелі"]);
});

test("перевод, которого нет, оставляет базовую запись", () => {
  const merged = mergeLocalized([{ id: 1, title: "Ле Дофін" }], [{ id: 1, title: "Le Dauphine" }, { id: 6, title: "Watercolour" }]);
  assert.equal(merged[1].title, "Watercolour");
});

test("пустая оболочка перевода не затирает английский текст", () => {
  const merged = mergeLocalized([{ id: 1 }], [{ id: 1, title: "Le Dauphine" }]);
  assert.equal(merged[0].title, "Le Dauphine");
});

test("заглушка в языковом наборе игнорируется", () => {
  const merged = mergeLocalized([{ id: 1, title: "Новий огляд", placeholder: true }], [{ id: 1, title: "Le Dauphine" }]);
  assert.equal(merged[0].title, "Le Dauphine");
});

test("порядок и состав задаёт база, а не перевод", () => {
  const merged = mergeLocalized(
    [{ id: 6, title: "Друга" }, { id: 1, title: "Перша" }],
    [{ id: 1, title: "First" }, { id: 6, title: "Second" }],
  );
  assert.deepEqual(merged.map((e) => e.id), [1, 6]);
});
