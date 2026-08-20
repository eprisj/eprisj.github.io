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

const TOKEN = process.env.EPRIS_BOT_TOKEN || "";
const CHAT = process.env.EPRIS_BOT_CHAT || "";
const PORT = Number(process.env.EPRIS_BOT_PORT || 9879);
const CONTENT_FILE = process.env.EPRIS_CONTENT_FILE || "/opt/epris-content/site-content.json";
const FORMS_API = process.env.EPRIS_FORMS_API || "http://127.0.0.1:9878";
const FORMS_PASSWORD = process.env.ADMIN_PASSWORD || "";
const SITE = "https://eprisjournal.com";

if (!TOKEN || !CHAT) {
  console.error("[bot] нет EPRIS_BOT_TOKEN или EPRIS_BOT_CHAT — служба бессмысленна, выходим");
  process.exit(1);
}

const api = (method) => `https://api.telegram.org/bot${TOKEN}/${method}`;

/* Телеграм отклоняет сообщения длиннее 4096 символов целиком, а не обрезает.
   Режем сами и по строкам, чтобы не рвать слово посередине. */
function chunk(text, limit = 3900) {
  const lines = String(text).split("\n");
  const out = [];
  let current = "";
  for (const line of lines) {
    if ((current + line).length > limit && current) { out.push(current); current = ""; }
    current += (current ? "\n" : "") + line.slice(0, limit);
  }
  if (current) out.push(current);
  return out;
}

async function send(text) {
  for (const part of chunk(text)) {
    try {
      const response = await fetch(api("sendMessage"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: CHAT, text: part, disable_web_page_preview: true }),
      });
      const data = await response.json().catch(() => null);
      if (!data || !data.ok) console.error("[bot] отправка не удалась:", data && data.description);
    } catch (error) {
      console.error("[bot] отправка не удалась:", error.message);
    }
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

async function formsList() {
  if (!FORMS_PASSWORD) return null;
  try {
    const response = await fetch(`${FORMS_API}/list`, { headers: { "X-Admin-Password": FORMS_PASSWORD } });
    const data = await response.json();
    return Array.isArray(data && data.forms) ? data.forms : null;
  } catch { return null; }
}

// ── Команды ──────────────────────────────────────────────────────────────────

const COMMANDS = [
  ["/status", "что живо: сайт, контент, анкеты, место на диске"],
  ["/forms", "анкеты и сколько ответов пришло"],
  ["/drafts", "черновики со ссылками для автора"],
  ["/last", "что опубликовано последним"],
  ["/help", "этот список"],
];

function cmdHelp() {
  return ["EPRIS. Что я умею:", "", ...COMMANDS.map(([name, what]) => `${name} — ${what}`)].join("\n");
}

async function cmdStatus() {
  const lines = ["EPRIS, состояние:"];

  const check = async (label, url) => {
    const started = Date.now();
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      lines.push(`${response.ok ? "✓" : "✗"} ${label}: ${response.status}, ${Date.now() - started} мс`);
    } catch (error) {
      lines.push(`✗ ${label}: не отвечает (${error.name === "TimeoutError" ? "таймаут" : error.message})`);
    }
  };

  await check("сайт", SITE);
  await check("контент", "https://api.eprisjournal.com/content");
  await check("анкеты", `${FORMS_API}/list`);

  const content = readContent();
  if (content) {
    const count = (key) => (Array.isArray(content[key]) ? content[key].length : 0);
    const drafts = ["articles", "reviews"].reduce(
      (total, key) => total + (Array.isArray(content[key]) ? content[key].filter((entry) => entry && entry.draft).length : 0), 0);
    lines.push("", `материалов: статей ${count("articles")}, обзоров ${count("reviews")}, в галерее ${count("items")}`);
    lines.push(`из них черновиков: ${drafts}`);
    try {
      const stat = fs.statSync(CONTENT_FILE);
      lines.push(`последняя правка контента: ${new Date(stat.mtime).toLocaleString("ru-RU")}`);
    } catch { /* нет файла — уже сказано выше */ }
  } else {
    lines.push("", "файл контента прочитать не удалось");
  }

  try {
    const stat = fs.statfsSync("/");
    const freeGb = (stat.bavail * stat.bsize) / 1073741824;
    lines.push(`свободно на диске: ${freeGb.toFixed(1)} ГБ${freeGb < 2 ? " ← мало, загрузка файлов начнёт отказывать" : ""}`);
  } catch { /* не критично */ }

  return lines.join("\n");
}

async function cmdForms() {
  const forms = await formsList();
  if (!forms) return "Список анкет получить не удалось.";
  if (!forms.length) return "Анкет пока нет.";
  const label = { draft: "черновик", open: "открыта", closed: "закрыта" };
  return ["Анкеты:", "", ...forms.map((form) => {
    const count = Number(form.responses) || 0;
    return `${form.title}\n  ${label[form.status] || form.status}, ответов: ${count}\n  ${SITE}/f/${form.slug}`;
  })].join("\n");
}

function cmdDrafts() {
  const content = readContent();
  if (!content) return "Контент прочитать не удалось.";
  const out = [];
  for (const [key, title] of [["articles", "Статьи"], ["reviews", "Обзоры"]]) {
    const list = Array.isArray(content[key]) ? content[key].filter((entry) => entry && entry.draft) : [];
    if (!list.length) continue;
    out.push(`${title}:`);
    for (const entry of list.slice(0, 15)) {
      out.push(`• ${entry.title || "без названия"}\n  ${draftUrl(key, entry)}`);
    }
    out.push("");
  }
  return out.length ? ["Черновики:", "", ...out].join("\n") : "Черновиков нет — всё опубликовано.";
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

async function handleCommand(text) {
  const command = String(text || "").trim().split(/\s+/)[0].toLowerCase().replace(/@.*$/, "");
  switch (command) {
    case "/start":
    case "/help": return cmdHelp();
    case "/status": return cmdStatus();
    case "/forms": return cmdForms();
    case "/drafts": return cmdDrafts();
    case "/last": return cmdLast();
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
    try { text = String(JSON.parse(body).text || ""); } catch { text = body.slice(0, 2000); }
    if (text.trim()) void send(text.trim());
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
      const message = update.message || update.channel_post;
      if (!message || !message.text) continue;
      // Чужие чаты игнорируем: бот отвечает только редакции.
      if (String(message.chat && message.chat.id) !== String(CHAT)) continue;
      const answer = await handleCommand(message.text);
      if (answer) await send(answer);
    }
  } catch (error) {
    if (error.name !== "TimeoutError") console.error("[bot] опрос:", error.message);
  } finally {
    setTimeout(poll, 500);
  }
}
poll();

/* Список команд в меню телеграма: человек видит их по нажатию «/», а не
   вспоминает. Ставится один раз при старте, ошибка тут ничего не ломает. */
void fetch(api("setMyCommands"), {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ commands: COMMANDS.map(([name, what]) => ({ command: name.slice(1), description: what })) }),
}).catch(() => {});

module.exports = { chunk, slugify, draftUrl };
