"use strict";

/* EPRIS FORMS — анкеты для авторов.
 *
 * Зачем свой механизм, а не Google Forms: анкета автора — это редакционный
 * документ. Он содержит имя, почту, иногда гонорарные и паспортные данные, и
 * отдавать его чужому сервису значит терять контроль над тем, где эти данные
 * лежат и кто их видит. Плюс ответы нужны РЯДОМ с материалом — в той же
 * админке, где редактор ведёт статью, а не в отдельной вкладке чужого сайта.
 *
 * Отдельный процесс, как у Interview Studio: выкат сайта перезапускает
 * deploy-webhook несколько раз в день, и незачем ронять вместе с ним приём
 * ответов, который может идти в этот момент.
 *
 * Хранение — файлы JSON, по одному на форму и по одному на пачку ответов.
 * База данных здесь не окупается: форм десятки, ответов сотни, а файл можно
 * скопировать, прочитать глазами и положить в бэкап без дампов.
 */

const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const crypto = require("crypto");

const ROOT = process.env.FORMS_DIR || "/opt/epris-forms";
const FORMS_DIR = path.join(ROOT, "forms");
const RESPONSES_DIR = path.join(ROOT, "responses");
const UPLOADS_DIR = path.join(ROOT, "uploads");

/* ФАЙЛЫ АВТОРА.
 *
 * Портфолио, макеты, оригиналы фотографий — то, ради чего анкету и заводят.
 * Формально «без ограничений» не бывает: на диске VPS шесть с небольшим
 * свободных гигабайт, и анкета, забившая его под ноль, уронит вместе с собой
 * сайт, радио и админку. Поэтому пределы щедрые, но названные, и они
 * настраиваются переменными окружения без правки кода:
 *   FORMS_MAX_FILE_MB     — один файл (по умолчанию 512 МБ)
 *   FORMS_MAX_RESPONSE_MB — все файлы одного ответа (по умолчанию 2 ГБ)
 *   FORMS_MIN_FREE_GB     — сколько места на диске беречь (по умолчанию 2 ГБ)
 * Тип файла не ограничен вовсе: «любые» здесь означает буквально любые. Файл
 * никогда не отдаётся по прямому пути и не исполняется — он лежит под
 * случайным именем и скачивается только редакцией, по паролю. */
const MAX_FILE_BYTES = Math.round((Number(process.env.FORMS_MAX_FILE_MB) || 512) * 1024 * 1024);
const MAX_RESPONSE_BYTES = Math.round((Number(process.env.FORMS_MAX_RESPONSE_MB) || 2048) * 1024 * 1024);
const MIN_FREE_BYTES = Math.round((Number(process.env.FORMS_MIN_FREE_GB) || 2) * 1024 * 1024 * 1024);
/* Файл, загруженный и брошенный (человек передумал отправлять анкету), живёт
   сутки. Иначе диск копит чужие черновики вечно. */
const ORPHAN_FILE_TTL_MS = 24 * 60 * 60 * 1000;

const MAX_BODY_BYTES = 512 * 1024;      // анкета — это текст, не медиатека
const MAX_FIELDS = 60;
const MAX_ANSWER_CHARS = 8000;
const MAX_RESPONSES_PER_FORM = 5000;
/* Один IP — десять ответов в час. Живой автор столько не отправляет, а
   скрипту этого мало, чтобы засорить анкету. */
const RATE_LIMIT_PER_HOUR = 10;

const FIELD_TYPES = new Set([
  "short-text", "long-text", "email", "url", "number", "date",
  "single-choice", "multi-choice", "consent", "section", "files",
]);

function ensureDirs() {
  for (const dir of [ROOT, FORMS_DIR, RESPONSES_DIR, UPLOADS_DIR]) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch { /* уже есть */ }
  }
}
ensureDirs();

const nowIso = () => new Date().toISOString();
const newId = () => crypto.randomBytes(9).toString("hex");
const clean = (value, max = 300) => String(value == null ? "" : value).replace(/\s+/g, " ").trim().slice(0, max);
const cleanMultiline = (value, max = MAX_ANSWER_CHARS) => String(value == null ? "" : value).replace(/\r\n/g, "\n").trim().slice(0, max);

/* Ссылка на анкету должна читаться и диктоваться по телефону, поэтому slug —
   из букв заголовка, а не случайная строка.

   Кириллический заголовок превращать в транслит («anketa-avtora-osennyi-nomer»)
   — плохой выход: такую ссылку не прочитает ни русскоязычный, ни иностранный
   автор, а именно её отправляют людям, для которых журнал англоязычный.
   Поэтому заголовок на кириллице даёт короткий английский адрес по словарю
   ходовых слов анкет, а редактор всегда может задать свой явно. */
const TRANSLIT = {
  а:"a",б:"b",в:"v",г:"g",ґ:"g",д:"d",е:"e",є:"ie",ж:"zh",з:"z",и:"y",і:"i",ї:"i",й:"i",к:"k",л:"l",м:"m",
  н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"shch",ъ:"",ы:"y",ь:"",э:"e",ю:"iu",я:"ia",
};
/* Словарь на те слова, из которых редакция реально составляет названия
   анкет. Промахнулись — редактор правит адрес руками, поле для этого есть. */
const SLUG_WORDS = {
  анкета: "questionnaire", анкети: "questionnaire", анкета_автора: "author-questionnaire",
  автор: "author", автора: "author", авторов: "authors", авторська: "author",
  интервью: "interview", интервʼю: "interview", інтервю: "interview", інтерв: "interview",
  вопросы: "questions", питання: "questions", опрос: "survey", опитування: "survey",
  заявка: "application", заявки: "application", подача: "submission", матеріал: "story",
  материал: "story", статья: "story", стаття: "story", номер: "issue", выпуск: "issue",
  осенний: "autumn", осінній: "autumn", зимний: "winter", весенний: "spring", летний: "summer",
  фото: "photo", фотограф: "photographer", портфолио: "portfolio", портфоліо: "portfolio",
  редакция: "editorial", редакція: "editorial", обратная: "feedback", связь: "feedback",
  сотрудничество: "collaboration", співпраця: "collaboration", участие: "participation",
};

function slugify(value) {
  const raw = String(value || "").toLowerCase().trim();
  const latin = raw.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  // Заголовок уже латиницей — берём как есть, ничего не выдумывая.
  if (latin.length >= 3) return latin.slice(0, 60);

  const words = raw.split(/[^a-zа-яёіїєґ0-9]+/i).filter(Boolean);
  const mapped = words.map((word) => SLUG_WORDS[word] || "").filter(Boolean);
  if (mapped.length) return [...new Set(mapped)].join("-").slice(0, 60);

  const translit = raw.split("").map((ch) => TRANSLIT[ch] ?? ch).join("")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return translit.slice(0, 60) || `form-${newId().slice(0, 6)}`;
}

const formPath = (id) => path.join(FORMS_DIR, `${id}.json`);
const responsesPath = (id) => path.join(RESPONSES_DIR, `${id}.json`);

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}
/* Запись через временный файл: половина анкеты на диске хуже, чем её
   отсутствие, а отключение питания посреди fs.writeFile даёт именно её. */
async function writeJsonAtomic(file, data) {
  const tmp = `${file}.tmp-${process.pid}`;
  await fsp.writeFile(tmp, JSON.stringify(data, null, 2));
  await fsp.rename(tmp, file);
}

function listForms() {
  ensureDirs();
  return fs.readdirSync(FORMS_DIR)
    .filter((name) => name.endsWith(".json"))
    .map((name) => readJson(path.join(FORMS_DIR, name), null))
    .filter(Boolean)
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
}

function findFormBySlug(slug) {
  const target = clean(slug, 80).toLowerCase();
  return listForms().find((form) => String(form.slug).toLowerCase() === target) || null;
}

function readResponses(formId) {
  const stored = readJson(responsesPath(formId), null);
  return Array.isArray(stored?.responses) ? stored.responses : [];
}

async function writeResponses(formId, responses) {
  await writeJsonAtomic(responsesPath(formId), { formId, updatedAt: nowIso(), responses });
}


/* ── Файлы ────────────────────────────────────────────────────────────────── */
const uploadDirFor = (formId) => path.join(UPLOADS_DIR, String(formId));
const uploadPath = (formId, fileId) => path.join(uploadDirFor(formId), fileId);

function freeBytes() {
  try {
    const stat = fs.statfsSync(ROOT);
    return stat.bavail * stat.bsize;
  } catch {
    // Нет statfs — не притворяемся, что места нет: проверку просто пропускаем.
    return Number.MAX_SAFE_INTEGER;
  }
}

function diskHasRoom(expectedBytes = 0) {
  return freeBytes() - expectedBytes > MIN_FREE_BYTES;
}

/* Имя файла показывается редактору, но НЕ участвует в пути на диске: путь
   строится из случайного идентификатора. Иначе «../../etc/passwd» в имени
   стал бы путём, а два автора с «portfolio.pdf» затёрли бы друг друга. */
function safeFileName(name) {
  const cleaned = String(name || "file").replace(/[\r\n\t]/g, " ").replace(/[/\\]/g, "-").trim();
  return cleaned.slice(0, 180) || "file";
}

function fileMeta(formId, fileId) {
  const meta = readJson(`${uploadPath(formId, fileId)}.json`, null);
  return meta && meta.id === fileId ? meta : null;
}

async function saveFileMeta(formId, meta) {
  await writeJsonAtomic(`${uploadPath(formId, meta.id)}.json`, meta);
}

/* Файлы, на которые не сослался ни один ответ, — это брошенные черновики.
   Собираются раз в час и после суток жизни удаляются вместе с описанием. */
function sweepOrphanFiles() {
  ensureDirs();
  let removed = 0;
  for (const formDir of fs.readdirSync(UPLOADS_DIR, { withFileTypes: true })) {
    if (!formDir.isDirectory()) continue;
    const formId = formDir.name;
    const used = new Set();
    for (const response of readResponses(formId)) {
      for (const value of Object.values(response.answers || {})) {
        if (Array.isArray(value)) for (const item of value) if (item && item.fileId) used.add(item.fileId);
      }
    }
    for (const entry of fs.readdirSync(uploadDirFor(formId))) {
      if (entry.endsWith(".json")) continue;
      if (used.has(entry)) continue;
      const file = uploadPath(formId, entry);
      try {
        if (Date.now() - fs.statSync(file).mtimeMs < ORPHAN_FILE_TTL_MS) continue;
        fs.unlinkSync(file);
        fs.rmSync(`${file}.json`, { force: true });
        removed += 1;
      } catch { /* уже удалён */ }
    }
  }
  return removed;
}

/* Ответ удаляют вместе с приложенными файлами: иначе «удалить ответ» означало
   бы «спрятать текст, оставив портфолио на диске навсегда». */
function removeResponseFiles(formId, response) {
  for (const value of Object.values(response?.answers || {})) {
    if (!Array.isArray(value)) continue;
    for (const item of value) {
      if (!item || !item.fileId) continue;
      try {
        fs.rmSync(uploadPath(formId, item.fileId), { force: true });
        fs.rmSync(`${uploadPath(formId, item.fileId)}.json`, { force: true });
      } catch { /* уже удалён */ }
    }
  }
}

/* ── Нормализация формы ─────────────────────────────────────────────────────
   Всё, что приходит из админки, приводится к известной форме здесь, а не в
   браузере: анкета живёт годами и переживает несколько версий редактора. */
function normaliseField(raw, index) {
  const type = FIELD_TYPES.has(raw?.type) ? raw.type : "short-text";
  const options = Array.isArray(raw?.options)
    ? raw.options.map((option) => clean(option, 160)).filter(Boolean).slice(0, 30)
    : [];
  const num = (value, min, max) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.round(parsed))) : null;
  };
  /* УСЛОВНЫЙ ПОКАЗ.
     Половина вопросов в анкете нужна не всем: «какой у вас формат съёмки»
     спрашивают только фотографа. Раньше редакция обходила это двумя анкетами
     и двумя ссылками; теперь вопрос показывается, когда в другом выбран
     нужный вариант. Условие хранится ссылкой на поле и значение. */
  const showIf = raw?.showIf && clean(raw.showIf.fieldId, 40)
    ? { fieldId: clean(raw.showIf.fieldId, 40), value: clean(raw.showIf.value, 160) }
    : null;
  return {
    id: clean(raw?.id, 40) || `f${index + 1}-${newId().slice(0, 4)}`,
    type,
    label: clean(raw?.label, 300) || `Вопрос ${index + 1}`,
    hint: clean(raw?.hint, 400),
    placeholder: clean(raw?.placeholder, 160),
    // У раздела и согласия обязательность смысла не имеет — у первого нет
    // ответа, у второго она означает «нельзя отправить без галочки».
    required: type === "section" ? false : Boolean(raw?.required),
    options: (type === "single-choice" || type === "multi-choice") ? options : [],
    /* Рамки ответа. Пустое значение означает «без ограничения» — это не то же
       самое, что ноль, поэтому null, а не 0. */
    minLength: ["short-text", "long-text"].includes(type) ? num(raw?.minLength, 0, 20000) : null,
    maxLength: ["short-text", "long-text"].includes(type) ? num(raw?.maxLength, 1, 20000) : null,
    min: type === "number" ? num(raw?.min, -1e9, 1e9) : null,
    max: type === "number" ? num(raw?.max, -1e9, 1e9) : null,
    maxFiles: type === "files" ? num(raw?.maxFiles, 1, 30) : null,
    accept: type === "files" ? clean(raw?.accept, 160) : "",
    showIf,
  };
}

function normaliseForm(raw, existing = null) {
  const title = clean(raw?.title, 200) || existing?.title || "Анкета автора";
  const id = existing?.id || clean(raw?.id, 40) || newId();
  const requestedSlug = clean(raw?.slug, 80);
  const fields = Array.isArray(raw?.fields) ? raw.fields.slice(0, MAX_FIELDS).map(normaliseField) : (existing?.fields || []);
  const status = ["draft", "open", "closed"].includes(raw?.status) ? raw.status : (existing?.status || "draft");
  const access = ["link", "invite"].includes(raw?.access) ? raw.access : (existing?.access || "link");
  return {
    id,
    slug: slugify(requestedSlug || existing?.slug || title),
    title,
    description: cleanMultiline(raw?.description, 2000) || existing?.description || "",
    /* Что автор увидит после отправки. Пустая страница «спасибо» — самый
       частый способ заставить человека отправить анкету дважды. */
    thankYou: cleanMultiline(raw?.thankYou, 800) || existing?.thankYou || "",
    language: clean(raw?.language, 5).toUpperCase() || existing?.language || "EN",
    status,
    access,
    /* Анкета закрывается сама: по дате или по числу ответов. Без этого
       редакция вспоминает закрыть приём через месяц после дедлайна, и автор
       присылает работу в пустоту. */
    closesAt: clean(raw?.closesAt, 40) || existing?.closesAt || "",
    maxResponses: Number.isFinite(Number(raw?.maxResponses)) && Number(raw?.maxResponses) > 0
      ? Math.min(MAX_RESPONSES_PER_FORM, Math.round(Number(raw.maxResponses)))
      : (existing?.maxResponses || 0),
    fields,
    invites: Array.isArray(existing?.invites) ? existing.invites : [],
    createdAt: existing?.createdAt || nowIso(),
    updatedAt: nowIso(),
  };
}

/* Публичный вид анкеты: без приглашений и без служебных полей. Отдавать
   наружу целиком объект формы значило бы раздать все токены приглашений. */
function publicForm(form) {
  return {
    id: form.id, slug: form.slug, title: form.title, description: form.description,
    thankYou: form.thankYou, language: form.language, status: form.status,
    access: form.access, fields: form.fields,
    closesAt: form.closesAt || "", maxResponses: form.maxResponses || 0,
  };
}

/* Анкета может быть открыта, но уже не принимать: вышел срок или набрано
   нужное число ответов. Причина возвращается наружу, чтобы страница написала
   человеку по-человечески, а не «403». */
function formClosedReason(form) {
  if (form.closesAt) {
    const deadline = Date.parse(form.closesAt);
    if (Number.isFinite(deadline) && deadline < Date.now()) return "deadline passed";
  }
  if (form.maxResponses && readResponses(form.id).length >= form.maxResponses) return "response limit reached";
  return "";
}

/* ── Проверка ответа ────────────────────────────────────────────────────────
   Проверяем на сервере, а не только в браузере: форма открыта миру, и до
   диска доходит ровно то, что мы согласились принять. */
/* Виден ли вопрос при таких ответах. Скрытый вопрос не спрашивают — и не
   требуют: иначе анкета отказывалась бы отправляться из-за поля, которого
   автор в глаза не видел. */
function fieldVisible(field, answers) {
  if (!field.showIf || !field.showIf.fieldId) return true;
  const source = answers?.[field.showIf.fieldId];
  if (Array.isArray(source)) return source.includes(field.showIf.value);
  if (typeof source === "boolean") return source === (field.showIf.value === "true" || field.showIf.value === "да");
  return String(source ?? "") === field.showIf.value;
}

function validateAnswers(form, rawAnswers) {
  const answers = {};
  const errors = [];
  for (const field of form.fields) {
    if (field.type === "section") continue;
    if (!fieldVisible(field, rawAnswers)) { answers[field.id] = ""; continue; }
    const raw = rawAnswers?.[field.id];
    let value;
    if (field.type === "multi-choice") {
      const list = Array.isArray(raw) ? raw : (raw ? [raw] : []);
      value = list.map((item) => clean(item, 160)).filter((item) => field.options.includes(item)).slice(0, 30);
      if (field.required && !value.length) errors.push(field.label);
    } else if (field.type === "single-choice") {
      value = clean(raw, 160);
      if (value && !field.options.includes(value)) value = "";
      if (field.required && !value) errors.push(field.label);
    } else if (field.type === "files") {
      /* В ответе приходят не сами файлы, а ссылки на уже загруженные. Каждую
         сверяем с описанием на диске: без этого можно было бы приписать
         своему ответу чужой файл, подставив его идентификатор. */
      const list = Array.isArray(raw) ? raw : [];
      value = list.slice(0, field.maxFiles || 30).map((item) => {
        const meta = fileMeta(form.id, clean(item?.fileId, 40));
        return meta ? { fileId: meta.id, name: meta.name, size: meta.size, type: meta.type } : null;
      }).filter(Boolean);
      if (field.required && !value.length) errors.push(field.label);
    } else if (field.type === "consent") {
      value = Boolean(raw);
      if (field.required && !value) errors.push(field.label);
    } else if (field.type === "number") {
      value = raw === "" || raw == null ? "" : String(Number(raw));
      if (value === "NaN") value = "";
      if (field.required && value === "") errors.push(field.label);
      if (value !== "") {
        const parsed = Number(value);
        if (field.min !== null && field.min !== undefined && parsed < field.min) errors.push(`${field.label} — не меньше ${field.min}`);
        if (field.max !== null && field.max !== undefined && parsed > field.max) errors.push(`${field.label} — не больше ${field.max}`);
      }
    } else if (field.type === "email") {
      value = clean(raw, 200).toLowerCase();
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) errors.push(`${field.label} — неверный адрес`);
      else if (field.required && !value) errors.push(field.label);
    } else {
      value = field.type === "long-text" ? cleanMultiline(raw) : clean(raw, 500);
      if (field.required && !value) errors.push(field.label);
      else if (value) {
        if (field.minLength && value.length < field.minLength) errors.push(`${field.label} — не короче ${field.minLength} знаков`);
        if (field.maxLength && value.length > field.maxLength) value = value.slice(0, field.maxLength);
      }
    }
    answers[field.id] = value;
  }
  return { answers, errors };
}

/* IP не храним. Для ограничения частоты хватает отпечатка: он позволяет
   отличить один источник от другого и бесполезен для установления личности. */
function ipFingerprint(ip) {
  return crypto.createHash("sha256").update(`epris-forms:${ip || "unknown"}`).digest("hex").slice(0, 16);
}

function tooManyRecent(responses, fingerprint) {
  const hourAgo = Date.now() - 60 * 60 * 1000;
  const recent = responses.filter((item) => item.source === fingerprint && Date.parse(item.submittedAt) > hourAgo);
  return recent.length >= RATE_LIMIT_PER_HOUR;
}

function csvEscape(value) {
  const list = Array.isArray(value)
    // Файлы в таблице — это их имена: идентификатор на диске в отчёте не нужен.
    ? value.map((item) => (item && typeof item === "object" && item.name ? item.name : item))
    : null;
  const text = list ? list.join("; ") : String(value == null ? "" : value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function responsesCsv(form, responses) {
  const columns = form.fields.filter((field) => field.type !== "section");
  const header = ["submittedAt", "invite", ...columns.map((field) => field.label)];
  const rows = responses.map((response) => [
    response.submittedAt,
    response.inviteLabel || "",
    ...columns.map((field) => response.answers?.[field.id] ?? ""),
  ]);
  // BOM — иначе Excel открывает кириллицу как «ÐÐ½ÐºÐµÑ‚Ð°».
  return "﻿" + [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");
}

module.exports = {
  ROOT, FORMS_DIR, RESPONSES_DIR, UPLOADS_DIR, MAX_BODY_BYTES, MAX_RESPONSES_PER_FORM, FIELD_TYPES,
  MAX_FILE_BYTES, MAX_RESPONSE_BYTES, MIN_FREE_BYTES,
  uploadDirFor, uploadPath, freeBytes, diskHasRoom, safeFileName, fileMeta, saveFileMeta,
  sweepOrphanFiles, removeResponseFiles,
  ensureDirs, nowIso, newId, clean, cleanMultiline, slugify,
  formPath, responsesPath, readJson, writeJsonAtomic,
  listForms, findFormBySlug, readResponses, writeResponses,
  normaliseForm, publicForm, validateAnswers, fieldVisible, formClosedReason,
  ipFingerprint, tooManyRecent, responsesCsv,
};
