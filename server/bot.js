"use strict";

/* ТЕЛЕГРАМ-БОТ РЕДАКЦИИ EPRIS.
 *
 * Зачем отдельная служба. Уведомления об анкетах служба анкет отправляла сама,
 * и для одной задачи этого хватало. Но событий в редакции больше: статью
 * создали, черновик опубликовали, материал скрыли или удалили. Их источник —
 * другая служба (deploy-webhook), и повторять в каждой отправку в телеграм
 * означало бы держать токен в двух местах и чинить один и тот же разбор ответа
 * дважды.
 *
 * Поэтому бот один и делает ровно две вещи:
 *   • принимает события по HTTP на 127.0.0.1 и пересылает их в чат редакции;
 *   • отвечает на команды, чтобы не открывать панель ради одного вопроса
 *     «а что там с анкетами».
 *
 * Наружу бот не смотрит: порт слушается только на петле, а телеграм опрашивается
 * исходящими запросами. Открывать вебхук ради одного чата не нужно.
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const cards = require("./bot-cards");

const TOKEN = process.env.EPRIS_BOT_TOKEN || "";
const CHAT = process.env.EPRIS_BOT_CHAT || "";
const PORT = Number(process.env.EPRIS_BOT_PORT || 9879);
const CONTENT_FILE = process.env.EPRIS_CONTENT_FILE || "/opt/epris-content/site-content.json";
const FORMS_API = process.env.EPRIS_FORMS_API || "http://127.0.0.1:9878";
const FORMS_PASSWORD = process.env.ADMIN_PASSWORD || "";
const CONTENT_API = process.env.EPRIS_CONTENT_API || "https://api.eprisjournal.com";
const SITE = "https://eprisjournal.com";

if (!TOKEN || !CHAT) {
  console.error("[bot] нет EPRIS_BOT_TOKEN или EPRIS_BOT_CHAT — служба бессмысленна, выходим");
  process.exit(1);
}

const api = (method) => `https://api.telegram.org/bot${TOKEN}/${method}`;

/* Телеграм отклоняет сообщения длиннее 4096 символов целиком, а не обрезает.
   Режем сами и по строкам, чтобы не рвать слово посередине.

   ОДНА СТРОКА ДЛИННЕЕ ЛИМИТА РАНЬШЕ ТЕРЯЛАСЬ. Прежняя версия делала
   `line.slice(0, limit)` — то есть от длинной строки оставляла начало, а
   хвост выбрасывала молча. На тексте в 9000 символов без переносов
   уходило 3900, а 5100 исчезали, и никто бы не заметил: телеграм отвечал
   «ок», в чате лежало обрезанное сообщение. Заметно это стало на выводе
   du и списков служб, где перенос строки не гарантирован.

   Теперь длинная строка нарезается на куски целиком, ничего не теряя. */
function chunk(text, limit = 3900) {
  const out = [];
  let current = "";
  const flush = () => { if (current) { out.push(current); current = ""; } };

  for (const line of String(text).split("\n")) {
    // Строка, которая не помещается даже одна, режется на части сама.
    if (line.length > limit) {
      flush();
      for (let i = 0; i < line.length; i += limit) out.push(line.slice(i, i + limit));
      continue;
    }
    if (current && (current.length + 1 + line.length) > limit) flush();
    current += (current ? "\n" : "") + line;
  }
  flush();
  return out;
}

async function send(text, keyboard) {
  const parts = chunk(text);
  for (let i = 0; i < parts.length; i += 1) {
    try {
      const response = await fetch(api("sendMessage"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Клавиатура — только под последним куском, как и в sendRich: иначе
        // при разбивке длинного события на части она повторилась бы на каждой.
        body: JSON.stringify({
          chat_id: CHAT, text: parts[i], disable_web_page_preview: true,
          ...(keyboard && i === parts.length - 1 ? { reply_markup: keyboard } : {}),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!data || !data.ok) console.error("[bot] отправка не удалась:", data && data.description);
    } catch (error) {
      console.error("[bot] отправка не удалась:", error.message);
    }
  }
}


/* ── Телеграм: то, что в боте до сих пор не использовалось ───────────────────
 * Бот умел ровно одно — послать простой текст. Ни разметки, ни кнопок, ни
 * ответа на нажатие. Ниже добавлены родные возможности телеграма, ради
 * которых не нужно ничего, кроме тех же исходящих запросов: HTML-разметка,
 * inline-клавиатуры, ответ на callback и правка уже отправленного сообщения.
 */

/* В HTML-режиме телеграм падает на голых < > &, а в заголовках материалов
   они встречаются. Экранируем всё, что пришло из контента. */
const esc = (value) => String(value == null ? "" : value)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function tg(method, payload) {
  try {
    const response = await fetch(api(method), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => null);
    if (!data || !data.ok) console.error(`[bot] ${method}:`, data && data.description);
    return data;
  } catch (error) {
    console.error(`[bot] ${method}:`, error.message);
    return null;
  }
}

/* Кнопки под сообщением. Раскладка задаётся массивом рядов, чтобы длинные
   подписи не сжимались в нечитаемые столбцы. */
const kb = (rows) => ({ inline_keyboard: rows.map((row) => row.map(([text, data]) => ({ text, callback_data: data }))) });

const MENU = kb([
  [["📋 Состояние", "cmd:status"], ["✉️ Анкеты", "cmd:forms"]],
  [["📝 Черновики", "cmd:drafts"], ["📰 Последнее", "cmd:last"]],
  [["👥 Контакты", "cmd:contacts"], ["🎙 Интервью", "cmd:interviews"]],
  [["🛠 Службы", "cmd:services"], ["💾 Диск", "cmd:disk"]],
  [["🔒 Сертификат", "cmd:ssl"], ["🔗 Ссылки", "cmd:links"]],
  [["👁 Сторож", "cmd:alerts"]],
]);

/* Отправка PNG-карточки вместо текста. Телеграм ждёт multipart, а не JSON —
   Node 22 даёт глобальные FormData/Blob, отдельный пакет не нужен. */
async function sendPhoto(buffer, caption, extra = {}) {
  const form = new FormData();
  form.append("chat_id", CHAT);
  if (caption) {
    form.append("caption", caption.slice(0, 1024));
    form.append("parse_mode", "HTML");
  }
  if (extra.reply_markup) form.append("reply_markup", JSON.stringify(extra.reply_markup));
  form.append("photo", new Blob([buffer], { type: "image/png" }), "card.png");
  try {
    const response = await fetch(api("sendPhoto"), { method: "POST", body: form });
    const data = await response.json().catch(() => null);
    if (!data || !data.ok) console.error("[bot] sendPhoto:", data && data.description);
    return data;
  } catch (error) {
    console.error("[bot] sendPhoto:", error.message);
    return null;
  }
}

async function sendRich(text, extra = {}) {
  const parts = chunk(text);
  for (let i = 0; i < parts.length; i += 1) {
    await tg("sendMessage", {
      chat_id: CHAT,
      text: parts[i],
      parse_mode: "HTML",
      disable_web_page_preview: true,
      // Клавиатура только под последним куском: иначе она повторится
      // столько раз, на сколько частей разрезано сообщение.
      ...(i === parts.length - 1 ? extra : {}),
    });
  }
}

// ── Данные редакции ──────────────────────────────────────────────────────────

function readContent() {
  try { return JSON.parse(fs.readFileSync(CONTENT_FILE, "utf8")); } catch { return null; }
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function articleUrl(entry) {
  const slug = slugify(entry && entry.title);
  return slug ? `${SITE}/article/${slug}` : `${SITE}/articles`;
}

/* Черновик открывается по своему токену. Ссылка без него ведёт в никуда, а
   редакции нужна именно та, которую можно переслать автору. */
function draftUrl(collection, entry) {
  const base = collection === "reviews" ? `${SITE}/review/${entry.id}` : articleUrl(entry);
  return entry.previewToken ? `${base}?preview=${entry.previewToken}` : base;
}

/* ── Правка контента прямо из чата ────────────────────────────────────────────
 * Пишем не в локальный файл, а через PATCH /content/entity на самом API:
 * там же лежит проверка версии (оптимистичная блокировка — не перезаписать
 * правку, сделанную в панели параллельно) и валидация формы сущности.
 * Бот только читает актуальную версию сущности из локального файла, меняет
 * одно поле и отправляет её целиком обратно — meta.version берём заново
 * перед каждой отправкой, чтобы не словить 409 на ровном месте. */
async function patchEntity(section, id, mutate, lang) {
  const metaRes = await fetch(`${CONTENT_API}/content/meta`);
  const meta = await metaRes.json().catch(() => null);
  if (!meta || !meta.ok || !meta.version) throw new Error("не удалось получить версию контента");

  const content = readContent();
  if (!content) throw new Error("контент прочитать не удалось");
  const arr = lang && lang !== "EN"
    ? (content.localizedCollections && content.localizedCollections[lang] && content.localizedCollections[lang][section]) || []
    : content[section] || [];
  const entity = arr.find((e) => Number(e && e.id) === Number(id));
  if (!entity) throw new Error("материал не найден");

  const next = { ...entity };
  mutate(next);

  const response = await fetch(`${CONTENT_API}/content/entity`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "X-Admin-Password": FORMS_PASSWORD },
    body: JSON.stringify({ section, id, entity: next, lang, expectedVersion: meta.version }),
  });
  const data = await response.json().catch(() => null);
  if (!data || !data.ok) throw new Error((data && data.error) || `PATCH ${response.status}`);
  return next;
}

async function formsList() {
  if (!FORMS_PASSWORD) return null;
  try {
    const response = await fetch(`${FORMS_API}/list`, { headers: { "X-Admin-Password": FORMS_PASSWORD } });
    const data = await response.json();
    return Array.isArray(data && data.forms) ? data.forms : null;
  } catch { return null; }
}

// ── CRM: контакты, интервью, заметки — тот же /crm, что и у Mini App ─────────
async function fetchCrm() {
  const response = await fetch(`${CONTENT_API}/crm`, { headers: { "X-Admin-Password": FORMS_PASSWORD } });
  const data = await response.json();
  if (!data || !data.ok) throw new Error((data && data.error) || `HTTP ${response.status}`);
  return { contacts: data.contacts || [], interviews: data.interviews || [], notes: data.notes || [] };
}
async function saveCrm(crm) {
  const response = await fetch(`${CONTENT_API}/crm`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Admin-Password": FORMS_PASSWORD },
    body: JSON.stringify(crm),
  });
  const data = await response.json();
  if (!data || !data.ok) throw new Error((data && data.error) || `HTTP ${response.status}`);
}

const STATUS_LABEL_RU = { planned: "запланировано", done: "проведено", transcribing: "расшифровка", ready: "готово" };

/* <blockquote> — не украшение ради украшения: список из десятка контактов
   сплошным текстом сливается в кашу, а рамка вокруг каждой записи держит
   взгляд построчно. Телеграм поддерживает тег без каких-то доп. настроек
   бота — он есть в HTML-режиме давно, просто раньше не пригождался. */
async function cmdContacts() {
  let crm;
  try { crm = await fetchCrm(); } catch (e) { return `CRM недоступна: ${esc(e.message)}`; }
  if (!crm.contacts.length) return "Контактов пока нет — добавьте через App.";
  const typeLabel = { author: "автор", partner: "партнёр", speaker: "спикер", other: "" };
  const sorted = [...crm.contacts].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  return [`<b>👥 Контакты</b> — ${sorted.length}`, "", ...sorted.map((c) => {
    const bits = [typeLabel[c.type] || "", c.telegram, c.phone, c.email].filter(Boolean).join(" · ");
    return `<blockquote><b>${esc(c.name || "без имени")}</b>${bits ? `\n${esc(bits)}` : ""}</blockquote>`;
  })].join("\n");
}

/* Карточные версии — тот же язык, что у /status, /last, /drafts: чёрно-белая
   рамка, Crimson Text, тонкие линии. Текстовые cmdContacts/cmdInterviews
   остаются как есть — используются в /help и как запасной путь, если
   sharp/рендер вдруг подведёт. */
async function cmdContactsCard() {
  let crm;
  try { crm = await fetchCrm(); } catch (e) { return { text: `CRM недоступна: ${esc(e.message)}` }; }
  if (!crm.contacts.length) return { text: "Контактов пока нет — добавьте через App." };
  const sorted = [...crm.contacts].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  const buffer = await cards.renderContacts(sorted);
  return { buffer, caption: `Контактов: ${sorted.length}` };
}

const STATUS_EMOJI = { planned: "🗓", done: "✅", transcribing: "📝", ready: "✨" };

async function cmdInterviewsCard() {
  let crm;
  try { crm = await fetchCrm(); } catch (e) { return { text: `CRM недоступна: ${esc(e.message)}` }; }
  if (!crm.interviews.length) return { text: "Интервью пока нет — добавьте через App." };
  const contactName = (id) => { const c = crm.contacts.find((x) => String(x.id) === String(id)); return c ? c.name : null; };
  const sorted = [...crm.interviews]
    .sort((a, b) => String(a.scheduledAt || "").localeCompare(String(b.scheduledAt || "")))
    .map((iv) => ({
      ...iv,
      contactName: contactName(iv.contactId),
      when: iv.scheduledAt ? new Date(iv.scheduledAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "без даты",
    }));
  const buffer = await cards.renderInterviews(sorted);
  return { buffer, caption: `Интервью: ${sorted.length}` };
}

async function cmdInterviews() {
  let crm;
  try { crm = await fetchCrm(); } catch (e) { return `CRM недоступна: ${esc(e.message)}`; }
  if (!crm.interviews.length) return "Интервью пока нет — добавьте через App.";
  const contactName = (id) => { const c = crm.contacts.find((x) => String(x.id) === String(id)); return c ? c.name : "—"; };
  const sorted = [...crm.interviews].sort((a, b) => String(a.scheduledAt || "").localeCompare(String(b.scheduledAt || "")));
  return [`<b>🎙 Интервью</b> — ${sorted.length}`, "", ...sorted.map((iv) => {
    const when = iv.scheduledAt ? new Date(iv.scheduledAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "без даты";
    const mark = STATUS_EMOJI[iv.status] || "•";
    const link = iv.meetLink ? `\n<a href="${esc(iv.meetLink)}">🎥 Встреча</a>` : "";
    return `<blockquote>${mark} <b>${esc(iv.subject || "без темы")}</b> — ${esc(STATUS_LABEL_RU[iv.status] || iv.status)}\n${esc(contactName(iv.contactId))} · ${esc(when)}${link}</blockquote>`;
  })].join("\n");
}

async function cmdNote(text) {
  const body = String(text || "").replace(/^\/note(@\S+)?\s*/i, "").trim();
  if (!body) return "Формат: /note текст заметки";
  let crm;
  try { crm = await fetchCrm(); } catch (e) { return `CRM недоступна: ${esc(e.message)}`; }
  const maxId = crm.notes.reduce((m, n) => Math.max(m, Number(n.id) || 0), 0);
  crm.notes.unshift({ id: maxId + 1, text: body, createdAt: new Date().toISOString() });
  try { await saveCrm(crm); } catch (e) { return `Не удалось сохранить: ${esc(e.message)}`; }
  return "📌 Заметка сохранена.";
}

async function cmdNotes() {
  let crm;
  try { crm = await fetchCrm(); } catch (e) { return `CRM недоступна: ${esc(e.message)}`; }
  if (!crm.notes.length) return "Заметок пока нет.";
  const sorted = [...crm.notes].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))).slice(0, 15);
  return ["<b>📌 Заметки</b>", "", ...sorted.map((n) => `• ${esc(n.text)}${n.createdAt ? `\n  <i>${esc(String(n.createdAt).slice(0, 10))}</i>` : ""}`)].join("\n");
}

// ── Команды ──────────────────────────────────────────────────────────────────

const COMMANDS = [
  ["/menu", "всё меню кнопками"],
  ["/status", "что живо: сайт, контент, анкеты, место на диске"],
  ["/forms", "анкеты и сколько ответов пришло"],
  ["/responses", "где сколько ответов накопилось"],
  ["/drafts", "черновики со ссылками для автора"],
  ["/last", "что опубликовано последним"],
  ["/contacts", "контакты редакции: авторы, партнёры, спикеры"],
  ["/interviews", "запланированные и проведённые интервью"],
  ["/note", "быстрая заметка: /note текст"],
  ["/notes", "последние заметки"],
  ["/services", "состояние служб на сервере"],
  ["/disk", "место на диске и что его занимает"],
  ["/ssl", "сколько осталось сертификату"],
  ["/links", "быстрые ссылки"],
  ["/alerts", "что сторож проверяет сам"],
  ["/digest", "утренний дайджест прямо сейчас (в 9:00 — сам)"],
  ["/mute", "тишина на N часов (по умолчанию 4)"],
  ["/unmute", "вернуть алерты"],
  ["/help", "этот список"],
];

/* Разбито по смыслу, а не одним полотном — так за секунду видно, в какой
   раздел лезть, а не читаешь список из пятнадцати команд подряд. */
const HELP_GROUPS = [
  ["📋 Редакция", ["/status", "/last", "/drafts", "/digest"]],
  ["👥 CRM", ["/contacts", "/interviews", "/note", "/notes"]],
  ["✉️ Анкеты", ["/forms", "/responses"]],
  ["🛠 Сервер", ["/services", "/disk", "/ssl", "/links"]],
  ["👁 Сторож", ["/alerts", "/mute", "/unmute"]],
];

function cmdHelp() {
  const byName = new Map(COMMANDS);
  const out = ["<b>EPRIS.</b> Что я умею:", ""];
  for (const [title, names] of HELP_GROUPS) {
    out.push(`<b>${title}</b>`);
    for (const name of names) out.push(`${name} — ${esc(byName.get(name) || "")}`);
    out.push("");
  }
  out.push("<i>Ниже — то же самое кнопками, набирать не обязательно.</i>");
  return out.join("\n");
}

async function collectStatus() {
  const checks = [];
  const check = async (label, url) => {
    const started = Date.now();
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      checks.push({ label, ok: response.ok, detail: `${response.status}, ${Date.now() - started} мс` });
    } catch (error) {
      checks.push({ label, ok: false, detail: error.name === "TimeoutError" ? "таймаут" : error.message });
    }
  };

  await check("сайт", SITE);
  await check("контент", "https://api.eprisjournal.com/content");
  await check("анкеты", `${FORMS_API}/health`);   // /list закрыт паролем, см. сторож

  const content = readContent();
  const counts = [];
  let contentModified = null;
  if (content) {
    const count = (key) => (Array.isArray(content[key]) ? content[key].length : 0);
    const drafts = ["articles", "reviews"].reduce(
      (total, key) => total + (Array.isArray(content[key]) ? content[key].filter((entry) => entry && entry.draft).length : 0), 0);
    counts.push({ n: count("articles"), label: "статей" }, { n: count("reviews"), label: "обзоров" },
      { n: count("items"), label: "в галерее" }, { n: drafts, label: "черновиков" });
    try { contentModified = fs.statSync(CONTENT_FILE).mtime; } catch { /* нет файла */ }
  }

  let freeGb = null;
  try {
    const stat = fs.statfsSync("/");
    freeGb = (stat.bavail * stat.bsize) / 1073741824;
  } catch { /* не критично */ }

  return { checks, counts, contentModified, freeGb };
}

async function cmdStatus() {
  const { checks, counts, contentModified, freeGb } = await collectStatus();
  const lines = ["EPRIS, состояние:", ...checks.map((c) => `${c.ok ? "✓" : "✗"} ${c.label}: ${c.detail}`)];
  if (counts.length) {
    lines.push("", counts.map((c) => `${c.label === "черновиков" ? "из них " : ""}${c.label}: ${c.n}`).join(", "));
  } else {
    lines.push("", "файл контента прочитать не удалось");
  }
  if (contentModified) lines.push(`последняя правка контента: ${contentModified.toLocaleString("ru-RU")}`);
  if (freeGb !== null) lines.push(`свободно на диске: ${freeGb.toFixed(1)} ГБ${freeGb < 2 ? " ← мало, загрузка файлов начнёт отказывать" : ""}`);
  return lines.join("\n");
}

/* Та же сводка, но карточкой в айдентике EPRIS — на неё удобнее взглянуть
   мельком, чем разбирать текстовый список галочек. */
async function cmdStatusCard() {
  const { checks, counts, freeGb } = await collectStatus();
  const buffer = await cards.renderStatus({
    checks,
    counts: counts.filter((c) => c.label !== "черновиков"),
    disk: freeGb !== null ? `${freeGb.toFixed(1)} ГБ` : "н/д",
    updatedAt: new Date().toLocaleString("ru-RU"),
  });
  const bad = checks.filter((c) => !c.ok).length;
  const caption = bad ? `⚠ ${bad} проверк${bad === 1 ? "а" : "и"} не в порядке` : "Всё в порядке";
  return { buffer, caption };
}

async function cmdForms() {
  const forms = await formsList();
  if (!forms) return "Список анкет получить не удалось.";
  if (!forms.length) return "Анкет пока нет.";
  const label = { draft: "черновик", open: "открыта", closed: "закрыта" };
  return ["✉️ Анкеты:", "", ...forms.map((form) => {
    const count = Number(form.responses) || 0;
    return `${form.title}\n  ${label[form.status] || form.status}, ответов: ${count}\n  ${SITE}/f/${form.slug}`;
  })].join("\n");
}

function draftsList() {
  const content = readContent();
  if (!content) return null;
  const out = [];
  for (const [key, kind] of [["articles", "статья"], ["reviews", "обзор"]]) {
    const list = Array.isArray(content[key]) ? content[key].filter((entry) => entry && entry.draft) : [];
    for (const entry of list) out.push({ section: key, kind, id: entry.id, title: entry.title || "без названия", entry });
  }
  return out;
}

function cmdDrafts() {
  const drafts = draftsList();
  if (!drafts) return "Контент прочитать не удалось.";
  if (!drafts.length) return "Черновиков нет — всё опубликовано.";
  const out = [];
  for (const [key, title] of [["articles", "Статьи"], ["reviews", "Обзоры"]]) {
    const list = drafts.filter((d) => d.section === key).slice(0, 15);
    if (!list.length) continue;
    out.push(`${title}:`);
    for (const d of list) out.push(`• ${d.title}\n  ${draftUrl(key, d.entry)}`);
    out.push("");
  }
  return ["📝 Черновики:", "", ...out].join("\n");
}

/* Список черновиков карточкой + кнопки «Опубликовать»/«Правка заголовка» под
   каждым — не нужно открывать панель ради одного клика. lastDraftsIndex
   хранит, какая кнопка на какую (section,id) ссылается, между сообщениями. */
let lastDraftsIndex = [];

async function cmdDraftsCard() {
  const drafts = draftsList();
  if (!drafts) return { text: "Контент прочитать не удалось." };
  if (!drafts.length) return { text: "Черновиков нет — всё опубликовано." };
  lastDraftsIndex = drafts.slice(0, 8);
  const buffer = await cards.renderDrafts(lastDraftsIndex);
  // Четыре действия на черновик в один ряд (не четыре строки) — иначе
  // клавиатура на восемь черновиков растягивается на два экрана. Четвёртая
  // кнопка — не callback, а web_app: открывает Mini App сразу в редакторе
  // этого материала (?open=section-id), не с дашборда.
  const rows = lastDraftsIndex.map((d, i) => [
    { text: `${i + 1} ✓`, callback_data: `pub:${i}` },
    { text: `${i + 1} ✏️`, callback_data: `edit:${i}` },
    { text: `${i + 1} 🖼`, callback_data: `photo:${i}` },
    { text: `${i + 1} 📱`, web_app: { url: `${SITE}/tgapp/?open=${d.section}-${d.id}` } },
  ]);
  return { buffer, caption: `Черновиков: ${drafts.length}`, keyboard: { inline_keyboard: rows } };
}

function cmdLast() {
  const content = readContent();
  if (!content) return "Контент прочитать не удалось.";
  const published = [];
  for (const [key, kind] of [["articles", "статья"], ["reviews", "обзор"]]) {
    const list = Array.isArray(content[key]) ? content[key] : [];
    for (const entry of list) {
      if (!entry || entry.draft) continue;
      published.push({ kind, title: entry.title || "без названия", when: entry.updatedAt || entry.date || "", url: articleUrl(entry) });
    }
  }
  published.sort((a, b) => String(b.when).localeCompare(String(a.when)));
  if (!published.length) return "Опубликованного пока нет.";
  return ["Последнее опубликованное:", "", ...published.slice(0, 5).map(
    (entry) => `• ${entry.title} (${entry.kind})${entry.when ? `\n  ${String(entry.when).slice(0, 10)}` : ""}\n  ${entry.url}`,
  )].join("\n");
}

async function cmdLastCard() {
  const content = readContent();
  if (!content) return { text: "Контент прочитать не удалось." };
  const published = [];
  for (const [key, kind] of [["articles", "статья"], ["reviews", "обзор"]]) {
    const list = Array.isArray(content[key]) ? content[key] : [];
    for (const entry of list) {
      if (!entry || entry.draft) continue;
      published.push({ kind, title: entry.title || "без названия", when: entry.updatedAt || entry.date || "", url: articleUrl(entry) });
    }
  }
  published.sort((a, b) => String(b.when).localeCompare(String(a.when)));
  if (!published.length) return { text: "Опубликованного пока нет." };
  const top = published[0];
  const buffer = await cards.renderLast({ kind: top.kind, title: top.title, when: String(top.when).slice(0, 10) });
  return { buffer, caption: `${esc(top.title)}\n${top.url}` };
}

/* ── Сторож: алерты сами, без вопроса ────────────────────────────────────────
 * До сих пор бот был только реактивным: спросили — ответил. Значит про упавший
 * сайт или кончившийся диск редакция узнавала последней, от читателя.
 *
 * Сторож обходит проверки по кругу и пишет в чат сам. Два правила, без
 * которых он превратился бы в шум и его отключили бы через день:
 *
 *   • сообщаем ПЕРЕХОД, а не состояние. «Сайт лежит» приходит один раз, а не
 *     каждые пять минут, пока лежит. Восстановление тоже приходит — иначе
 *     непонятно, кончилось ли уже.
 *   • состояние переживает перезапуск (файл на диске), иначе рестарт службы
 *     заново разошлёт всё, о чём уже сообщили.
 */

const STATE_FILE = process.env.EPRIS_BOT_STATE || "/opt/epris-bot/state.json";
const WATCH_INTERVAL_MS = Number(process.env.EPRIS_BOT_WATCH_MS || 5 * 60 * 1000);
const DISK_ALERT_GB = Number(process.env.EPRIS_BOT_DISK_GB || 2);
const SSL_ALERT_DAYS = Number(process.env.EPRIS_BOT_SSL_DAYS || 14);

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) || {}; } catch { return {}; }
}
function saveState(state) {
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(state), "utf8"); } catch (e) { console.error("[bot] state:", e.message); }
}
let state = loadState();

/* Тишина по просьбе. Дежурный уходит спать — алерты не должны будить, но и
   теряться не должны: после срока сторож продолжит с того же места. */
function muted() {
  return Boolean(state.muteUntil && Date.now() < state.muteUntil);
}

/* Ядро антиспама. Сообщение уходит, только если состояние изменилось. */
async function transition(key, isBad, badText, goodText) {
  const was = state[key] === "bad";
  if (isBad === was) return;
  state[key] = isBad ? "bad" : "ok";
  saveState(state);
  if (muted()) return;
  await sendRich(isBad ? `🔴 ${badText}` : `🟢 ${goodText}`);
}

async function reachable(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(9000) });
    return response.ok;
  } catch { return false; }
}

async function watchdog() {
  try {
    // 1. Сайт и его API
    await transition("site", !(await reachable(SITE)),
      `<b>Сайт не отвечает</b>\n${SITE}`, `Сайт снова отвечает\n${SITE}`);
    await transition("api", !(await reachable("https://api.eprisjournal.com/content")),
      "<b>API контента не отвечает</b>\nСайт откроется, но материалы не подтянутся.",
      "API контента снова отвечает");
    /* Проверять надо /health, а не /list: /list закрыт паролем и без него
       честно отвечает 401, то есть «служба жива и охраняется». Сторож на
       первом же круге принял это за падение и прислал ложную тревогу —
       поймано при проверке после выката. /health открыт намеренно и
       отвечает {"ok":true}. */
    await transition("forms", !(await reachable(`${FORMS_API}/health`)),
      "<b>Служба анкет не отвечает</b>\nОтветы авторов сейчас не принимаются.",
      "Служба анкет снова принимает ответы");

    // 2. Системные службы
    for (const s of await serviceStates()) {
      await transition(`svc:${s.unit}`, !s.ok,
        `<b>Служба «${esc(s.label)}» не работает</b>\n<code>${esc(s.unit)}: ${esc(s.state)}</code>`,
        `Служба «${esc(s.label)}» снова работает`);
    }

    // 3. Диск
    const disk = diskFree();
    if (disk) {
      await transition("disk", disk.freeGb < DISK_ALERT_GB,
        `<b>Мало места на диске</b>\nОсталось ${disk.freeGb.toFixed(1)} ГБ — загрузка фото и аудио начнёт отказывать.`,
        `Место на диске в норме (${disk.freeGb.toFixed(1)} ГБ)`);
    }

    // 4. Сертификат
    const days = await sslDaysLeft();
    if (days !== null) {
      await transition("ssl", days <= SSL_ALERT_DAYS,
        `<b>Сертификат истекает</b>\nОсталось ${days} дн. Проверьте таймер certbot.`,
        "Сертификат продлён");
    }

    // 5. Новые ответы в анкетах — считаем по нарастающей сумме, а не по
    //    отдельным ответам: служба анкет отдаёт только количество.
    const forms = await formsList();
    if (forms) {
      const seen = state.formCounts || {};
      const next = {};
      const fresh = [];
      for (const form of forms) {
        const count = Number(form.responses) || 0;
        next[form.slug] = count;
        const before = Number(seen[form.slug]);
        if (Number.isFinite(before) && count > before) {
          fresh.push(`${esc(form.title)} — <b>+${count - before}</b> (всего ${count})`);
        }
      }
      state.formCounts = next;
      saveState(state);
      if (fresh.length && !muted()) {
        await sendRich(["✉️ <b>Новые ответы в анкетах</b>", "", ...fresh].join("\n"),
          { reply_markup: kb([[["Открыть анкеты", "cmd:forms"]]]) });
      }
    }

    // 6. Счётчик черновиков на самой кнопке App — видно, не открывая бота.
    await updateMenuBadge();

    // 7. Напоминания об интервью — за час до назначенного времени, один раз
    //    (reminded=true), и только пока оно ещё «запланировано»: если статус
    //    сменили или время перенесли, Mini App уже сбросил reminded сама.
    await remindInterviews();
  } catch (error) {
    console.error("[bot] сторож:", error.message);
  } finally {
    setTimeout(watchdog, WATCH_INTERVAL_MS);
  }
}

/* Раньше /alerts показывал только настройки сторожа — что именно проверяется
   и с каким порогом, но не отвечал на первый вопрос, с которым сюда идут:
   «а сейчас-то всё в порядке?». Состояние уже посчитано в transition() на
   каждом круге и лежит в state[key] — просто читаем, не гоняя проверки
   заново ради одной команды. */
function cmdAlerts() {
  const live = (key, label) => {
    const s = state[key];
    const mark = s === "bad" ? "🔴" : s === "ok" ? "🟢" : "⚪";
    return `${mark} ${label}`;
  };
  const rows = [
    "<b>👁 Сторож</b>", "",
    "<blockquote>" + [
      live("site", "сайт"), live("api", "API контента"), live("forms", "служба анкет"),
      ...WATCHED_SERVICES.map(([unit, label]) => live(`svc:${unit}`, label)),
      live("disk", "диск"), live("ssl", "сертификат"),
    ].join("\n") + "</blockquote>",
    "",
    `проверка каждые ${Math.round(WATCH_INTERVAL_MS / 60000)} мин · порог диска ${DISK_ALERT_GB} ГБ · сертификат за ${SSL_ALERT_DAYS} дн.`,
    "• новые ответы в анкетах",
    "• интервью: напоминание за час, отметка о просрочке через 2 часа без смены статуса",
    "",
    muted()
      ? `🔕 тишина до ${new Date(state.muteUntil).toLocaleString("ru-RU")}`
      : "🔔 алерты включены",
    "",
    "<i>⚪ — ещё не проверялось с последнего перезапуска. Сообщается смена состояния, а не само состояние: «упало» и «поднялось» по разу, без повторов.</i>",
  ];
  return rows.join("\n");
}

function cmdMute(text) {
  const hours = Math.min(72, Math.max(1, Number(String(text).split(/\s+/)[1]) || 4));
  state.muteUntil = Date.now() + hours * 3600000;
  saveState(state);
  return `🔕 Тишина на ${hours} ч — до ${new Date(state.muteUntil).toLocaleString("ru-RU")}.\nСторож продолжит следить и сообщит, что накопилось, когда срок выйдет.`;
}

function cmdUnmute() {
  state.muteUntil = 0;
  saveState(state);
  return "🔔 Алерты снова включены.";
}

/* ── Новые команды: инфраструктура под рукой ─────────────────────────────────
 * Всё, ради чего раньше приходилось лезть по ssh: живы ли службы, не кончился
 * ли диск, когда протухнет сертификат. Редактор такими вопросами не задаётся,
 * а вот дежурный по сайту — постоянно.
 */

const { execFile } = require("child_process");

/* Обёртка над внешней командой с таймаутом. Без него зависший systemctl
   держал бы обработчик до бесконечности, и бот переставал бы отвечать. */
function run(command, args, timeout = 6000) {
  return new Promise((resolve) => {
    execFile(command, args, { timeout, encoding: "utf8" }, (error, stdout) => {
      resolve(error && !stdout ? "" : String(stdout || ""));
    });
  });
}

const WATCHED_SERVICES = [
  ["epris-forms", "анкеты"],
  ["epris-bot", "бот"],
  ["epris-interviews", "интервью"],
  ["epris-radio", "радио"],
  ["epris-showcase", "витрина"],
  ["eprisjournal-webhook", "деплой"],
  ["nginx", "nginx"],
];

async function serviceStates() {
  const out = [];
  for (const [unit, label] of WATCHED_SERVICES) {
    const state = (await run("/usr/bin/systemctl", ["is-active", unit])).trim() || "unknown";
    out.push({ unit, label, state, ok: state === "active" });
  }
  return out;
}

async function cmdServices() {
  const states = await serviceStates();
  const bad = states.filter((s) => !s.ok);
  const lines = [`<b>🛠 Службы</b> — ${bad.length ? `не в порядке: ${bad.length}` : "все на ходу"}`, ""];
  for (const s of states) lines.push(`${s.ok ? "✓" : "✗"} ${esc(s.label)} — <code>${esc(s.state)}</code>`);
  return lines.join("\n");
}

function diskFree() {
  try {
    const stat = fs.statfsSync("/");
    return {
      freeGb: (stat.bavail * stat.bsize) / 1073741824,
      totalGb: (stat.blocks * stat.bsize) / 1073741824,
    };
  } catch { return null; }
}

async function cmdDisk() {
  const disk = diskFree();
  if (!disk) return "Размер диска получить не удалось.";
  const usedPct = 100 - (disk.freeGb / disk.totalGb) * 100;
  const lines = [
    "<b>💾 Диск</b>", "",
    `свободно: <b>${disk.freeGb.toFixed(1)} ГБ</b> из ${disk.totalGb.toFixed(0)} ГБ`,
    `занято: ${usedPct.toFixed(0)}%`,
  ];
  if (disk.freeGb < DISK_ALERT_GB) lines.push("", "⚠ мало места: загрузка файлов начнёт отказывать");
  // Крупнейшие каталоги — чтобы сразу видеть, что именно съело место.
  const du = await run("/usr/bin/du", ["-sh", "/opt/epris-forms/data", "/var/www/eprisjournal", "/opt/builds"], 9000);
  if (du.trim()) lines.push("", "<b>Что занимает:</b>", `<code>${esc(du.trim())}</code>`);
  return lines.join("\n");
}

async function cmdSsl() {
  const days = await sslDaysLeft();
  if (days === null) return "Срок сертификата определить не удалось.";
  const mark = days <= SSL_ALERT_DAYS ? "⚠" : "✓";
  return `<b>🔒 Сертификат</b>\n\n${mark} eprisjournal.com — осталось <b>${days}</b> дн.` +
    (days <= SSL_ALERT_DAYS ? "\n\nПора продлевать: certbot обычно делает это сам, но раз счёт пошёл на дни — стоит проверить таймер." : "");
}

async function sslDaysLeft() {
  const out = await run("/usr/bin/openssl", [
    "s_client", "-connect", "eprisjournal.com:443", "-servername", "eprisjournal.com",
  ], 8000).catch(() => "");
  let text = out;
  if (!/notAfter/.test(text)) {
    // Через сокет не вышло — пробуем файл сертификата на диске.
    text = await run("/usr/bin/openssl", ["x509", "-enddate", "-noout", "-in",
      "/etc/letsencrypt/live/eprisjournal.com/fullchain.pem"], 5000);
  }
  const match = /notAfter=(.+)/.exec(text);
  if (!match) return null;
  const end = Date.parse(match[1].trim());
  if (!Number.isFinite(end)) return null;
  return Math.round((end - Date.now()) / 86400000);
}

function cmdLinks() {
  return [
    "<b>🔗 Ссылки</b>", "",
    `Сайт — ${SITE}`,
    `Панель — ${SITE}/admin/`,
    `Анкеты — ${SITE}/admin/#forms`,
    `Статьи — ${SITE}/articles`,
    `Витрина — ${SITE}/showcase`,
  ].join("\n");
}

async function cmdResponses() {
  const forms = await formsList();
  if (!forms) return "Список анкет получить не удалось.";
  const withAnswers = forms.filter((f) => Number(f.responses) > 0);
  if (!withAnswers.length) return "Ответов пока нет ни в одной анкете.";
  withAnswers.sort((a, b) => Number(b.responses) - Number(a.responses));
  const total = withAnswers.reduce((sum, f) => sum + Number(f.responses), 0);
  return [`<b>✉️ Ответы</b> — всего ${total}`, "",
    ...withAnswers.map((f) => `${esc(f.title)} — <b>${Number(f.responses)}</b>\n  ${SITE}/f/${esc(f.slug)}`)].join("\n");
}

/* Команды, у которых есть карточный вариант — берём приоритет над текстом
   в обоих местах, откуда бота можно спросить (сообщение и кнопка меню). */
const PHOTO_COMMANDS = {
  "/status": cmdStatusCard,
  "/last": cmdLastCard,
  "/drafts": cmdDraftsCard,
  "/contacts": cmdContactsCard,
  "/interviews": cmdInterviewsCard,
};

async function sendCommandResult(command) {
  if (command === "/digest") { await sendDigest(); return; }
  const photoFn = PHOTO_COMMANDS[command];
  if (photoFn) {
    const result = await photoFn();
    if (result.buffer) { await sendPhoto(result.buffer, result.caption, { reply_markup: result.keyboard || MENU }); return; }
    if (result.text) { await sendRich(result.text, { reply_markup: MENU }); return; }
  }
  const answer = await handleCommand(command);
  if (answer) await sendRich(answer, { reply_markup: MENU });
}

// ── Правка одним кликом: публикация и смена заголовка из карточки черновиков ─

let pendingEdit = null;   // { section, id, title } — ждём следующий текст как новый заголовок

async function handlePublish(index) {
  const d = lastDraftsIndex[index];
  if (!d) return sendRich("Список черновиков устарел — откройте /drafts заново.");
  try {
    await patchEntity(d.section, d.id, (e) => { e.draft = false; });
    await sendRich(`✓ Опубликовано: <b>${esc(d.title)}</b>`, { reply_markup: MENU });
  } catch (error) {
    await sendRich(`✗ Не удалось опубликовать: ${esc(error.message)}`);
  }
}

async function handleEditStart(index) {
  const d = lastDraftsIndex[index];
  if (!d) return sendRich("Список черновиков устарел — откройте /drafts заново.");
  pendingEdit = { section: d.section, id: d.id, title: d.title };
  await sendRich(`Пришлите новый заголовок для «${esc(d.title)}» одним сообщением.`);
}

async function handleEditApply(newTitle) {
  const p = pendingEdit;
  pendingEdit = null;
  const title = newTitle.trim();
  if (!title) return sendRich("Пустой заголовок — правка отменена.");
  try {
    await patchEntity(p.section, p.id, (e) => { e.title = title; });
    await sendRich(`✓ Заголовок обновлён: «${esc(p.title)}» → «${esc(title)}»`, { reply_markup: MENU });
  } catch (error) {
    await sendRich(`✗ Не удалось сохранить: ${esc(error.message)}`);
  }
}

// ── Фото прямо из чата: телеграм → /upload на API → imageUrl материала ───────

let pendingPhoto = null;   // { section, id, title } — ждём следующее фото

async function handlePhotoStart(index) {
  const d = lastDraftsIndex[index];
  if (!d) return sendRich("Список черновиков устарел — откройте /drafts заново.");
  pendingPhoto = { section: d.section, id: d.id, title: d.title };
  await sendRich(`Пришлите фото для «${esc(d.title)}» одним сообщением (как фото, не файлом).`);
}

async function handlePhotoApply(photoSizes) {
  const p = pendingPhoto;
  pendingPhoto = null;
  try {
    // Телеграм присылает один file_id на несколько уменьшенных копий — берём
    // последнюю в массиве, она самая крупная.
    const best = photoSizes[photoSizes.length - 1];
    const fileInfo = await tg("getFile", { file_id: best.file_id });
    const filePath = fileInfo && fileInfo.result && fileInfo.result.file_path;
    if (!filePath) throw new Error("не удалось получить файл из телеграма");
    const fileRes = await fetch(`https://api.telegram.org/file/bot${TOKEN}/${filePath}`);
    const buf = Buffer.from(await fileRes.arrayBuffer());
    const uploadRes = await fetch(`${CONTENT_API}/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Password": FORMS_PASSWORD },
      body: JSON.stringify({ data: buf.toString("base64"), contentType: "image/jpeg", filename: "telegram.jpg" }),
    });
    const uploadData = await uploadRes.json().catch(() => null);
    if (!uploadData || !uploadData.ok) throw new Error((uploadData && uploadData.error) || `upload ${uploadRes.status}`);
    await patchEntity(p.section, p.id, (e) => { e.imageUrl = uploadData.url; });
    await sendRich(`✓ Фото добавлено к «${esc(p.title)}»`, { reply_markup: MENU });
  } catch (error) {
    await sendRich(`✗ Не удалось сохранить фото: ${esc(error.message)}`);
  }
}

async function handleCommand(text) {
  const command = String(text || "").trim().split(/\s+/)[0].toLowerCase().replace(/@.*$/, "");
  switch (command) {
    case "/start": return `👋 На связи бот редакции EPRIS.\n\n<b>App</b> внизу слева открывает панель — там дашборд, поиск по материалам и правка прямо с телефона. Каждое утро сам пришлёт дайджест, а всё остальное — по кнопкам ниже или командой, если так привычнее.\n\n<i>/help — полный список.</i>`;
    case "/menu":
    case "/help": return cmdHelp();
    case "/status": return cmdStatus();
    case "/forms": return cmdForms();
    case "/responses": return cmdResponses();
    case "/drafts": return cmdDrafts();
    case "/last": return cmdLast();
    case "/contacts": return cmdContacts();
    case "/interviews": return cmdInterviews();
    case "/note": return cmdNote(text);
    case "/notes": return cmdNotes();
    case "/services": return cmdServices();
    case "/disk": return cmdDisk();
    case "/ssl": return cmdSsl();
    case "/links": return cmdLinks();
    case "/alerts": return cmdAlerts();
    case "/mute": return cmdMute(text);
    case "/unmute": return cmdUnmute();
    default: return null;   // молчим на обычные сообщения, а не спорим с человеком
  }
}

// ── Приём событий от других служб ────────────────────────────────────────────

const server = http.createServer((req, res) => {
  if (req.method !== "POST" || !req.url.startsWith("/notify")) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end('{"ok":false}');
    return;
  }
  let body = "";
  req.on("data", (chunkOfBody) => {
    body += chunkOfBody;
    if (body.length > 100000) req.destroy();   // событие такого размера — уже не событие
  });
  req.on("end", () => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end('{"ok":true}');
    let text = "";
    let keyboard;
    try {
      const parsed = JSON.parse(body);
      text = String(parsed.text || "");
      if (parsed.keyboard && parsed.keyboard.inline_keyboard) keyboard = parsed.keyboard;
    } catch { text = body.slice(0, 2000); }
    if (text.trim()) void send(text.trim(), keyboard);
  });
});
server.listen(PORT, "127.0.0.1", () => console.log(`[bot] события на 127.0.0.1:${PORT}`));

// ── Опрос телеграма ──────────────────────────────────────────────────────────

/* Long polling, а не вебхук: вебхук требует публичного адреса, сертификата и
   ещё одного места в nginx ради одного чата. Здесь достаточно исходящих
   запросов, которые переживают и перезапуск, и смену адреса сервера. */
let offset = 0;
async function poll() {
  try {
    const response = await fetch(api("getUpdates") + `?timeout=50&offset=${offset}`, {
      signal: AbortSignal.timeout(70000),
    });
    const data = await response.json();
    for (const update of (data && data.result) || []) {
      offset = update.update_id + 1;

      /* Нажатие кнопки под сообщением. Телеграм ждёт answerCallbackQuery в
         течение нескольких секунд, иначе у человека висят «часики» на
         кнопке — отвечаем сразу, до выполнения самой команды. */
      if (update.callback_query) {
        const q = update.callback_query;
        if (String(q.message && q.message.chat && q.message.chat.id) !== String(CHAT)) continue;
        void tg("answerCallbackQuery", { callback_query_id: q.id });
        const data = String(q.data || "");
        if (data.startsWith("cmd:")) await sendCommandResult("/" + data.slice(4));
        else if (data.startsWith("pub:")) await handlePublish(Number(data.slice(4)));
        else if (data.startsWith("edit:")) await handleEditStart(Number(data.slice(5)));
        else if (data.startsWith("photo:")) await handlePhotoStart(Number(data.slice(6)));
        continue;
      }

      const message = update.message || update.channel_post;
      if (!message) continue;
      // Чужие чаты игнорируем: бот отвечает только редакции.
      if (String(message.chat && message.chat.id) !== String(CHAT)) continue;

      // Ждём фото после «🖼 Фото» — оно приходит отдельным апдейтом, без текста.
      if (pendingPhoto && Array.isArray(message.photo) && message.photo.length) {
        await handlePhotoApply(message.photo);
        continue;
      }
      if (!message.text) continue;

      // Ждём новый заголовок после «✏️ Заголовок» — обычный текст, не команда.
      if (pendingEdit && !message.text.startsWith("/")) {
        await handleEditApply(message.text);
        continue;
      }

      const firstWord = message.text.trim().split(/\s+/)[0].toLowerCase();
      if (PHOTO_COMMANDS[firstWord] || firstWord === "/digest") {
        await sendCommandResult(firstWord);
        continue;
      }
      const answer = await handleCommand(message.text);
      // Меню вешаем на ответ всегда: следующий вопрос почти никогда не
      // единственный, и заставлять набирать вторую команду руками незачем.
      if (answer) await sendRich(answer, { reply_markup: MENU });
    }
  } catch (error) {
    if (error.name !== "TimeoutError") console.error("[bot] опрос:", error.message);
  } finally {
    setTimeout(poll, 500);
  }
}
poll();

// ── Утренний дайджест: карточка сама, без вопроса ────────────────────────────

const DIGEST_HOUR = Number(process.env.EPRIS_BOT_DIGEST_HOUR || 9);
const DIGEST_TZ = process.env.EPRIS_BOT_DIGEST_TZ || "Europe/Kyiv";

/* Следующий запуск считаем не прибавлением 24 часов от прошлого раза (тогда
   переход на летнее/зимнее время постепенно сдвинул бы дайджест), а заново
   от текущего момента: смотрим который час сейчас в Киеве и считаем разницу
   до ближайшего DIGEST_HOUR:00 там же. */
function msUntilDigest() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DIGEST_TZ, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(now);
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  const y = get("year"), mo = get("month"), d = get("day"), h = get("hour"), mi = get("minute"), s = get("second");
  const asIfUtc = Date.UTC(y, mo - 1, d, h, mi, s);
  const offsetMs = asIfUtc - now.getTime();   // на сколько DIGEST_TZ впереди/позади UTC
  let target = Date.UTC(y, mo - 1, d, DIGEST_HOUR, 0, 0) - offsetMs;
  if (target <= now.getTime()) target += 86400000;
  return target - now.getTime();
}

async function sendDigest() {
  try {
    const status = await cmdStatusCard();
    await sendPhoto(status.buffer, `Доброе утро, редакция.\n${status.caption}`, { reply_markup: MENU });
    const drafts = await cmdDraftsCard();
    if (drafts.buffer) await sendPhoto(drafts.buffer, drafts.caption, { reply_markup: drafts.keyboard || MENU });
  } catch (error) {
    console.error("[bot] дайджест:", error.message);
  }
}

function scheduleDigest() {
  setTimeout(async () => { await sendDigest(); scheduleDigest(); }, msUntilDigest());
}
scheduleDigest();

/* Список команд в меню телеграма: человек видит их по нажатию «/», а не
   вспоминает. Ставится один раз при старте, ошибка тут ничего не ломает. */
/* Сторож стартует с задержкой: сразу после перезапуска службы соседи ещё
   поднимаются, и проверка застала бы их «упавшими» — получили бы ложную
   тревогу на каждом рестарте. */
setTimeout(watchdog, 20000);

void fetch(api("setMyCommands"), {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ commands: COMMANDS.map(([name, what]) => ({ command: name.slice(1), description: what })) }),
}).catch(() => {});

/* Кнопка слева от поля ввода открывает Mini App — полноценную панель
   вместо построчных команд. Глобальный дефолт ставится для приватных чатов
   вообще, но у чата редакции уже мог осесть персональный оверрайд типа
   "default" (Телеграм заводит его сам при первом /start, до того как бот
   вообще узнал про web_app) — он перебивает глобальный молча, кнопка не
   появляется. Поэтому ставим ЕЩЁ РАЗ явно с chat_id: персональная запись
   имеет приоритет, значит и чинить нужно именно её. */
const MENU_BUTTON = { type: "web_app", text: "App", web_app: { url: `${SITE}/tgapp/` } };

/* Число черновиков прямо в подписи кнопки — видно до открытия бота, а не
   после команды. Дёргаем API только когда счётчик реально сменился: у
   setChatMenuButton нет отдельного лимита, но незачем стучаться в Telegram
   каждые пять минут ради одного и того же текста. */
async function updateMenuBadge() {
  const drafts = draftsList();
  const count = Array.isArray(drafts) ? drafts.length : 0;
  if (state.menuDraftCount === count) return;
  state.menuDraftCount = count;
  saveState(state);
  const button = { ...MENU_BUTTON, text: count ? `App · ${count}` : "App" };
  await fetch(api("setChatMenuButton"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT, menu_button: button }),
  }).catch(() => {});
}

/* Час до интервью — не раньше и не за неделю: слишком заблаговременно, и
   уведомление потеряется среди прочего. reminded — чтобы не слать одно и
   то же на каждом круге сторожа (раз в 5 минут), пока час не истёк. */
async function remindInterviews() {
  let crm;
  try { crm = await fetchCrm(); } catch { return; }   // CRM недоступна — не критично, попробуем на следующем круге
  const now = Date.now();
  const contactName = (id) => { const c = crm.contacts.find((x) => String(x.id) === String(id)); return c ? c.name : null; };
  let changed = false;

  const due = crm.interviews.filter((iv) => {
    if (iv.reminded || iv.status !== "planned" || !iv.scheduledAt) return false;
    const at = Date.parse(iv.scheduledAt);
    return Number.isFinite(at) && at - now > 0 && at - now <= 3600000;
  });
  for (const iv of due) {
    const when = new Date(iv.scheduledAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    const who = contactName(iv.contactId);
    // Ссылка — отдельной кнопкой, не просто текстом: за час до созвона это
    // единственное, что реально нужно нажать, не разбирая сообщение. Полное
    // MENU сюда не приплюсовываем — оно и так на одну команду /menu дальше,
    // а десяток лишних кнопок под алертом только мешает найти нужную.
    const keyboard = iv.meetLink ? { inline_keyboard: [[{ text: "🎥 Присоединиться", url: iv.meetLink }]] } : MENU;
    await sendRich(`🎙 <b>Интервью через час</b>\n\n<blockquote>${esc(iv.subject || "без темы")}${who ? `\n${esc(who)}` : ""}\n${esc(when)}</blockquote>`,
      { reply_markup: keyboard });
    iv.reminded = true;
    changed = true;
  }

  /* Время прошло, а статус так и остался «запланировано» — либо забыли
     отметить, либо интервью сорвалось. Раздражает не меньше, чем молчание:
     поэтому один раз, не на каждом круге (overdueNotified), и не сразу —
     двух часов достаточно, чтобы не дёргать из-за короткой задержки. */
  const overdue = crm.interviews.filter((iv) => {
    if (iv.overdueNotified || iv.status !== "planned" || !iv.scheduledAt) return false;
    const at = Date.parse(iv.scheduledAt);
    return Number.isFinite(at) && now - at >= 7200000;
  });
  for (const iv of overdue) {
    const when = new Date(iv.scheduledAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    const who = contactName(iv.contactId);
    await sendRich(`⚠️ <b>Интервью прошло, статус не менялся</b>\n\n<blockquote>${esc(iv.subject || "без темы")}${who ? `\n${esc(who)}` : ""}\n${esc(when)}</blockquote>\nОтметьте в App, как прошло — или перенесите дату.`,
      { reply_markup: MENU });
    iv.overdueNotified = true;
    changed = true;
  }

  if (changed) await saveCrm(crm).catch((e) => console.error("[bot] не удалось сохранить reminded:", e.message));
}

void fetch(api("setChatMenuButton"), {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ menu_button: MENU_BUTTON }),
}).catch(() => {});
void fetch(api("setChatMenuButton"), {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ chat_id: CHAT, menu_button: MENU_BUTTON }),
}).catch(() => {});

module.exports = { chunk, slugify, draftUrl, esc, kb };
