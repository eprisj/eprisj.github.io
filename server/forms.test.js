"use strict";

/* Тесты службы анкет.
 *
 * Здесь проверяется не «работает ли код вообще», а те места, где он уже
 * ломался на живых людях: предел в один символ вместо пяти тысяч, перевод
 * удалённой записи поверх живой, ссылка, переставшая открываться после
 * переименования. Каждый такой случай стоит отдельным тестом с пояснением,
 * чтобы починку нельзя было отменить по невнимательности.
 *
 * Запуск: node --test server/
 * Зависимостей нет: встроенный тест-раннер Node и временная папка на диске.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

// Хранилище на время прогона: тесты пишут файлы, и делать это в рабочей
// папке службы нельзя — один прогон затёр бы настоящие анкеты.
process.env.FORMS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "epris-forms-test-"));

const F = require("./forms.js");
const { buildZip } = require("./zip.js");

test.after(() => fs.rmSync(process.env.FORMS_DIR, { recursive: true, force: true }));

/* ── Пределы длины ─────────────────────────────────────────────────────── */

test("пустой предел длины означает пять тысяч знаков, а не один", () => {
  // Именно здесь Number(null) → 0 → зажим в диапазон → 1, и анкета
  // показывала «0 / 1», не давая написать ни слова.
  const form = F.normaliseForm({
    title: "T",
    fields: [
      { type: "long-text", label: "без настроек" },
      { type: "long-text", label: "явный null", maxLength: null },
      { type: "short-text", label: "пустая строка", maxLength: "" },
    ],
  });
  for (const field of form.fields) assert.equal(field.maxLength, 5000, field.label);
});

test("заданный предел длины сохраняется", () => {
  const form = F.normaliseForm({ title: "T", fields: [{ type: "long-text", label: "q", maxLength: 900, minLength: 40 }] });
  assert.equal(form.fields[0].maxLength, 900);
  assert.equal(form.fields[0].minLength, 40);
});

/* ── Адреса ───────────────────────────────────────────────────────────── */

test("русский заголовок даёт английский адрес", () => {
  assert.equal(F.slugify("Анкета автора · осенний номер"), "questionnaire-author-autumn-issue");
  assert.equal(F.slugify("Портфолио фотографа"), "portfolio");
});

test("латинский заголовок проходит как есть, незнакомое слово транслитерируется", () => {
  assert.equal(F.slugify("Author questionnaire"), "author-questionnaire");
  assert.equal(F.slugify("Всякая всячина №7"), "vsiakaia-vsiachyna-7");
});

test("переименованная анкета продолжает открываться по прежнему адресу", async () => {
  const first = F.normaliseForm({ title: "Interview A", slug: "interview-a", fields: [] });
  await F.writeJsonAtomic(F.formPath(first.id), first);
  const renamed = F.normaliseForm({ id: first.id, title: "Interview A", slug: "interview" }, first);
  await F.writeJsonAtomic(F.formPath(renamed.id), renamed);

  assert.equal(F.findFormBySlug("interview")?.id, first.id, "новый адрес");
  assert.equal(F.findFormBySlug("interview-a")?.id, first.id, "письмо со старой ссылкой");
  assert.equal(F.findFormBySlug("nothing-like-this"), null);
});

/* ── Проверка ответов ─────────────────────────────────────────────────── */

const askForm = () => F.normaliseForm({
  title: "Ask",
  fields: [
    { id: "who", type: "single-choice", label: "Кто вы", options: ["Фотограф", "Автор"], required: true },
    { id: "gear", type: "short-text", label: "Камера", required: true, showIf: { fieldId: "who", value: "Фотограф" } },
    { id: "mail", type: "email", label: "Почта", required: true },
    { id: "pitch", type: "long-text", label: "О чём", minLength: 20 },
    { id: "years", type: "number", label: "Стаж", min: 1, max: 60 },
  ],
});

test("обязательный вопрос без ответа не пропускается", () => {
  const { errors } = F.validateAnswers(askForm(), {});
  assert.ok(errors.includes("Кто вы"));
  assert.ok(errors.includes("Почта"));
});

test("скрытый условием вопрос не требуется", () => {
  const form = askForm();
  const asAuthor = F.validateAnswers(form, { who: "Автор", mail: "a@b.co" });
  assert.deepEqual(asAuthor.errors, [], "автору камера не нужна");

  const asPhotographer = F.validateAnswers(form, { who: "Фотограф", mail: "a@b.co" });
  assert.ok(asPhotographer.errors.includes("Камера"), "фотографу нужна");
});

test("почта проверяется, короткий текст и число вне рамок отклоняются", () => {
  const form = askForm();
  assert.ok(F.validateAnswers(form, { who: "Автор", mail: "не почта" }).errors.some((e) => /Почта/.test(e)));
  assert.ok(F.validateAnswers(form, { who: "Автор", mail: "a@b.co", pitch: "мало" }).errors.some((e) => /20 знаков/.test(e)));
  assert.ok(F.validateAnswers(form, { who: "Автор", mail: "a@b.co", years: "99" }).errors.some((e) => /не больше 60/.test(e)));
});

test("к ответу нельзя приложить чужой или несуществующий файл", () => {
  const form = F.normaliseForm({ title: "Files", fields: [{ id: "ph", type: "files", label: "Фото", required: true }] });
  const { errors } = F.validateAnswers(form, { ph: [{ fileId: "deadbeefdeadbeef" }] });
  assert.ok(errors.includes("Фото"), "выдуманный идентификатор не проходит");
});

test("видимость поля понимает список, набор и согласие", () => {
  const byValue = { showIf: { fieldId: "a", value: "x" } };
  assert.equal(F.fieldVisible(byValue, { a: "x" }), true);
  assert.equal(F.fieldVisible(byValue, { a: "y" }), false);
  assert.equal(F.fieldVisible(byValue, { a: ["x", "z"] }), true);
  assert.equal(F.fieldVisible({ showIf: { fieldId: "c", value: "true" } }, { c: true }), true);
  assert.equal(F.fieldVisible({}, {}), true, "без условия виден всегда");
});

/* ── Закрытие анкеты ──────────────────────────────────────────────────── */

test("анкета закрывается по сроку и по числу ответов", async () => {
  const past = F.normaliseForm({ title: "Past", slug: "past", status: "open", closesAt: "2020-01-01", fields: [] });
  await F.writeJsonAtomic(F.formPath(past.id), past);
  assert.equal(F.formClosedReason(past), "deadline passed");

  const limited = F.normaliseForm({ title: "Limited", slug: "limited", status: "open", maxResponses: 1, fields: [] });
  await F.writeJsonAtomic(F.formPath(limited.id), limited);
  assert.equal(F.formClosedReason(limited), "", "пока пусто, приём открыт");
  await F.writeResponses(limited.id, [{ id: "r1", submittedAt: F.nowIso(), answers: {} }]);
  assert.equal(F.formClosedReason(limited), "response limit reached");
});

test("ограничение частоты считает только недавние ответы одного источника", () => {
  const source = F.ipFingerprint("203.0.113.7");
  const hourAgo = new Date(Date.now() - 61 * 60 * 1000).toISOString();
  const recent = Array.from({ length: 10 }, () => ({ source, submittedAt: F.nowIso() }));
  assert.equal(F.tooManyRecent(recent, source), true);
  assert.equal(F.tooManyRecent(recent.map((r) => ({ ...r, submittedAt: hourAgo })), source), false, "вчерашние не считаются");
  assert.equal(F.tooManyRecent(recent, F.ipFingerprint("198.51.100.1")), false, "чужие не считаются");
});

test("отпечаток источника не содержит самого адреса", () => {
  const ip = "203.0.113.7";
  assert.ok(!F.ipFingerprint(ip).includes(ip));
  assert.equal(F.ipFingerprint(ip), F.ipFingerprint(ip), "одинаков для одного адреса");
});

/* ── Выгрузка ─────────────────────────────────────────────────────────── */

test("в CSV попадают имена файлов, а не их идентификаторы", () => {
  const form = F.normaliseForm({
    title: "Csv",
    fields: [
      { id: "n", type: "short-text", label: "Имя" },
      { id: "ph", type: "files", label: "Файлы" },
      { id: "s", type: "section", label: "Раздел" },
    ],
  });
  const csv = F.responsesCsv(form, [{
    submittedAt: "2026-08-18T10:00:00.000Z",
    inviteLabel: "Abbie",
    answers: { n: "Мария, Иванова", ph: [{ fileId: "abc123", name: "фасад.jpg" }] },
  }]);
  assert.ok(csv.includes("фасад.jpg"));
  assert.ok(!csv.includes("abc123"), "служебный идентификатор в отчёте не нужен");
  assert.ok(csv.includes('"Мария, Иванова"'), "запятая внутри значения экранируется");
  assert.ok(!csv.includes("Раздел"), "раздел не колонка");
});

test("публичный вид анкеты не раскрывает приглашения", () => {
  const form = F.normaliseForm({ title: "Inv", access: "invite", fields: [] });
  form.invites = [{ token: "abbie-downey", label: "Abbie" }];
  const shown = F.publicForm(form);
  assert.equal(shown.invites, undefined);
  assert.ok(shown.support, "блок поддержки отдаётся всем");
});

test("блок поддержки говорит на языке анкеты", () => {
  assert.match(F.supportNoteFor("EN").free, /free/i);
  assert.match(F.supportNoteFor("UA").free, /безкоштовна/);
  assert.match(F.supportNoteFor("ZZ").free, /free/i, "незнакомый язык падает на английский");
  assert.equal(F.supportNoteFor("EN").methods.length, 3);
});

/* ── Архив ────────────────────────────────────────────────────────────── */

test("архив сохраняет папки и разводит одинаковые имена", () => {
  const zip = buildZip([
    { name: "01 Abbie Downey/фасад.jpg", data: Buffer.from("a") },
    { name: "01 Abbie Downey/фасад.jpg", data: Buffer.from("b") },
    { name: "02 ответ 2/скан.pdf", data: Buffer.from("c") },
  ]);
  const text = zip.toString("latin1");
  assert.equal(zip.readUInt32LE(0), 0x04034b50, "локальный заголовок на месте");
  assert.ok(zip.includes(Buffer.from("01 Abbie Downey/фасад.jpg", "utf8")), "папка сохранена");
  assert.ok(zip.includes(Buffer.from("01 Abbie Downey/фасад (2).jpg", "utf8")), "дубль разведён");
  assert.equal(text.lastIndexOf("PK\x05\x06") > 0, true, "центральный каталог закрыт");
});

test("имя файла не может увести запись из архива", () => {
  const zip = buildZip([{ name: "../../etc/passwd", data: Buffer.from("x") }]);
  assert.ok(!zip.includes(Buffer.from("../../etc/passwd", "utf8")));
});

/* ── Приём ответов ──────────────────────────────────────────────────────── */

test("одновременные ответы не затирают друг друга", async () => {
  /* Раньше приём был «прочитать список, дописать, записать целиком». Два
     человека, нажавшие «отправить» в одну секунду, читали одинаковый список, и
     тот, кто записал позже, стирал чужой ответ. Ошибки при этом не возникало:
     оба видели «спасибо», а до редакции доходил один. */
  const formId = "race-" + F.newId();
  const many = Array.from({ length: 12 }, (_, i) => ({
    id: F.newId(), submittedAt: F.nowIso(), answers: { q: `ответ ${i}` },
  }));

  await Promise.all(many.map((response) => F.appendResponse(formId, response)));

  const stored = F.readResponses(formId);
  assert.equal(stored.length, many.length, "часть ответов потерялась при одновременной записи");
  for (const response of many) {
    assert.ok(stored.some((item) => item.id === response.id), `ответ ${response.id} не сохранился`);
  }
});

test("журнал приёма хранит ответ отдельно от основного файла", async () => {
  /* Журнал — страховка на случай, когда основной файл пострадал: перезапись во
     время выката, кончившееся место, чужая правка. Ответ уже принят, человек
     второй раз анкету не пришлёт, поэтому строка в журнале пишется до того,
     как трогается основной файл. */
  const formId = "log-" + F.newId();
  const response = { id: F.newId(), submittedAt: F.nowIso(), answers: { q: "важный ответ" } };

  await F.appendResponse(formId, response);
  fs.rmSync(F.responsesPath(formId), { force: true });   // основной файл потерян

  const rescued = F.readResponseLog(formId);
  assert.equal(rescued.length, 1);
  assert.equal(rescued[0].answers.q, "важный ответ");
  assert.equal(F.readResponses(formId).length, 0, "проверяем именно журнал, а не основной файл");
});

test("уведомление молчит, пока почта не настроена, и не мешает приёму", async () => {
  /* Письмо редакции — довесок к приёму, а не его часть. Без настроек SMTP
     служба обязана работать ровно как раньше. */
  const form = F.normaliseForm({ title: "Notify", fields: [{ type: "short-text", label: "Имя" }] });
  const sent = await F.notifyNewResponse(form, { submittedAt: F.nowIso(), answers: {} }, 1);
  assert.equal(F.mailConfigured(), false);
  assert.equal(sent, false);
});
