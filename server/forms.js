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

const MAX_BODY_BYTES = 512 * 1024;      // анкета — это текст, не медиатека
const MAX_FIELDS = 60;
const MAX_ANSWER_CHARS = 8000;
const MAX_RESPONSES_PER_FORM = 5000;
/* Один IP — десять ответов в час. Живой автор столько не отправляет, а
   скрипту этого мало, чтобы засорить анкету. */
const RATE_LIMIT_PER_HOUR = 10;

const FIELD_TYPES = new Set([
  "short-text", "long-text", "email", "url", "number", "date",
  "single-choice", "multi-choice", "consent", "section",
]);

function ensureDirs() {
  for (const dir of [ROOT, FORMS_DIR, RESPONSES_DIR]) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch { /* уже есть */ }
  }
}
ensureDirs();

const nowIso = () => new Date().toISOString();
const newId = () => crypto.randomBytes(9).toString("hex");
const clean = (value, max = 300) => String(value == null ? "" : value).replace(/\s+/g, " ").trim().slice(0, max);
const cleanMultiline = (value, max = MAX_ANSWER_CHARS) => String(value == null ? "" : value).replace(/\r\n/g, "\n").trim().slice(0, max);

/* Ссылка на анкету должна читаться и диктоваться по телефону, поэтому slug —
   из букв заголовка, а не случайная строка. Кириллица транслитерируется: в
   адресе %D0%B0%D0%B2… не читается вообще. */
const TRANSLIT = {
  а:"a",б:"b",в:"v",г:"g",ґ:"g",д:"d",е:"e",є:"ie",ж:"zh",з:"z",и:"y",і:"i",ї:"i",й:"i",к:"k",л:"l",м:"m",
  н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"shch",ъ:"",ы:"y",ь:"",э:"e",ю:"iu",я:"ia",
};
function slugify(value) {
  const base = String(value || "").toLowerCase().split("").map((ch) => TRANSLIT[ch] ?? ch).join("");
  return base.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || `form-${newId().slice(0, 6)}`;
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

/* ── Нормализация формы ─────────────────────────────────────────────────────
   Всё, что приходит из админки, приводится к известной форме здесь, а не в
   браузере: анкета живёт годами и переживает несколько версий редактора. */
function normaliseField(raw, index) {
  const type = FIELD_TYPES.has(raw?.type) ? raw.type : "short-text";
  const options = Array.isArray(raw?.options)
    ? raw.options.map((option) => clean(option, 160)).filter(Boolean).slice(0, 30)
    : [];
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
  };
}

/* ── Проверка ответа ────────────────────────────────────────────────────────
   Проверяем на сервере, а не только в браузере: форма открыта миру, и до
   диска доходит ровно то, что мы согласились принять. */
function validateAnswers(form, rawAnswers) {
  const answers = {};
  const errors = [];
  for (const field of form.fields) {
    if (field.type === "section") continue;
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
    } else if (field.type === "consent") {
      value = Boolean(raw);
      if (field.required && !value) errors.push(field.label);
    } else if (field.type === "number") {
      value = raw === "" || raw == null ? "" : String(Number(raw));
      if (value === "NaN") value = "";
      if (field.required && value === "") errors.push(field.label);
    } else if (field.type === "email") {
      value = clean(raw, 200).toLowerCase();
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) errors.push(`${field.label} — неверный адрес`);
      else if (field.required && !value) errors.push(field.label);
    } else {
      value = field.type === "long-text" ? cleanMultiline(raw) : clean(raw, 500);
      if (field.required && !value) errors.push(field.label);
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
  const text = Array.isArray(value) ? value.join("; ") : String(value == null ? "" : value);
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
  ROOT, FORMS_DIR, RESPONSES_DIR, MAX_BODY_BYTES, MAX_RESPONSES_PER_FORM, FIELD_TYPES,
  ensureDirs, nowIso, newId, clean, cleanMultiline, slugify,
  formPath, responsesPath, readJson, writeJsonAtomic,
  listForms, findFormBySlug, readResponses, writeResponses,
  normaliseForm, publicForm, validateAnswers,
  ipFingerprint, tooManyRecent, responsesCsv,
};
