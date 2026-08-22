"use strict";

/* Брендованные карточки для бота: SVG → PNG через sharp, без headless-браузера
 * (служба живёт в MemoryMax=200M, puppeteer туда не поместится).
 *
 * Макет и шрифты сняты С ЖИВОГО САЙТА (не с brandbook/data.js — тот описывает
 * старую бордо-золотую версию, которую сайт больше не носит):
 *   чёрная шапка с трекованным «EPRIS», тонкая (1px) чёрная рамка карточки,
 *   мелкая caps-метка категории, заголовок Crimson Text обычным начертанием
 *   (не курсив), тонкая линия-разделитель, pill-кнопка с чёрной обводкой.
 *   Тело/подписи — системный serif сайта (ui-serif → Iowan Old Style на Mac),
 *   здесь его роль играет PT Serif — она уже установлена и близка по духу.
 */

const sharp = require("sharp");

const COLOR = {
  ink: "#111111",
  paper: "#ffffff",
  muted: "rgba(17,17,17,0.55)",
  rule: "rgba(17,17,17,0.15)",
  success: "#3f6b4a",
  error: "#a13b3b",
};

const FONT_TITLE = "'Crimson Text', 'PT Serif', serif";
const FONT_BODY = "'PT Serif', Georgia, serif";
const FONT_LABEL = "'PT Mono', 'PT Serif', monospace";

const esc = (v) => String(v == null ? "" : v)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function wrap(text, maxChars) {
  const words = esc(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) { lines.push(line); line = word; }
    else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function tspans(lines, x, startY, lineHeight) {
  return lines.map((l, i) => `<tspan x="${x}" y="${startY + i * lineHeight}">${l}</tspan>`).join("");
}

const W = 1200;
const H = 630;
const BAR = 76;

/* Pill-кнопка с чёрной обводкой и стрелкой — как «READ PREVIEW ↗» на сайте. */
function pill(x, y, label) {
  const w = label.length * 9 + 56;
  return `
    <rect x="${x}" y="${y}" width="${w}" height="40" rx="20" fill="none" stroke="${COLOR.ink}" stroke-width="1"/>
    <text x="${x + 22}" y="${y + 25}" font-family="${FONT_LABEL}" font-size="12" letter-spacing="1.5" fill="${COLOR.ink}">${esc(label)}</text>
    <path d="M ${x + w - 26} ${y + 13} L ${x + w - 16} ${y + 13} L ${x + w - 16} ${y + 23} M ${x + w - 26} ${y + 23} L ${x + w - 16} ${y + 13}"
      stroke="${COLOR.ink}" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
}

/* Чёрная шапка-масштхед, один в один с навигацией сайта: слева трекованный
   логотип на чёрном, справа мелкая caps-метка раздела. */
function masthead(right) {
  return `
    <rect x="0" y="0" width="${W}" height="${BAR}" fill="${COLOR.ink}"/>
    <text x="40" y="${BAR / 2 + 7}" font-family="${FONT_BODY}" font-size="22" letter-spacing="5" fill="${COLOR.paper}">EPRIS</text>
    <text x="${W - 40}" y="${BAR / 2 + 5}" font-family="${FONT_LABEL}" font-size="11" letter-spacing="2" fill="rgba(255,255,255,0.6)" text-anchor="end">${esc(right)}</text>`;
}

/* Тонкая рамка вокруг всей карточки — так собраны блоки материалов на сайте. */
function frame(right, inner) {
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" fill="${COLOR.paper}"/>
    ${masthead(right)}
    <rect x="1" y="${BAR + 1}" width="${W - 2}" height="${H - BAR - 2}" fill="none" stroke="${COLOR.ink}" stroke-width="1"/>
    ${inner}
  </svg>`;
}

/* ── Карточка статуса ────────────────────────────────────────────────────── */
function statusCard({ checks, counts, disk, updatedAt }) {
  const top = BAR + 60;
  const rows = checks.map((c, i) => {
    const y = top + 64 + i * 58;
    const markColor = c.ok ? COLOR.success : COLOR.error;
    const mark = c.ok
      ? `<path d="M 33 ${y - 12} L 38 ${y - 6} L 48 ${y - 18}" stroke="${markColor}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
      : `<path d="M 33 ${y - 18} L 47 ${y - 6} M 47 ${y - 18} L 33 ${y - 6}" stroke="${markColor}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    return `
      ${mark}
      <text x="72" y="${y}" font-family="${FONT_BODY}" font-size="22" fill="${COLOR.ink}">${esc(c.label)}</text>
      <text x="${W - 40}" y="${y}" font-family="${FONT_LABEL}" font-size="14" letter-spacing="0.5" fill="${COLOR.muted}" text-anchor="end">${esc(c.detail)}</text>
      <line x1="40" y1="${y + 20}" x2="${W - 40}" y2="${y + 20}" stroke="${COLOR.rule}" stroke-width="1"/>`;
  }).join("");

  const countsY = top + 64 + checks.length * 58 + 26;
  const countsText = counts.map((c) => `${c.n} ${c.label}`).join("   ·   ");

  return frame("СОСТОЯНИЕ", `
    <text x="40" y="${top}" font-family="${FONT_LABEL}" font-size="11" letter-spacing="1.5" fill="${COLOR.muted}">РЕДАКЦИЯ · СЕГОДНЯ</text>
    <text x="40" y="${top + 36}" font-family="${FONT_TITLE}" font-size="34" fill="${COLOR.ink}">Состояние редакции</text>
    ${rows}
    <text x="40" y="${countsY}" font-family="${FONT_BODY}" font-size="17" fill="${COLOR.muted}">${esc(countsText)}</text>
    <text x="40" y="${countsY + 30}" font-family="${FONT_LABEL}" font-size="12" letter-spacing="1" fill="${COLOR.muted}">свободно на диске: ${esc(disk)}</text>
    ${pill(40, H - 76, "ОБНОВЛЕНО")}
    <text x="${W - 40}" y="${H - 46}" font-family="${FONT_LABEL}" font-size="11" letter-spacing="1" fill="${COLOR.muted}" text-anchor="end">${esc(updatedAt)}</text>
  `);
}

/* ── Карточка «последнее опубликованное» ───────────────────────────────────── */
function lastCard({ kind, title, when }) {
  const top = BAR + 100;
  const lines = wrap(title, 30).slice(0, 4);
  return frame("ОПУБЛИКОВАНО", `
    <text x="40" y="${BAR + 50}" font-family="${FONT_LABEL}" font-size="11" letter-spacing="1.5" fill="${COLOR.muted}">${esc((kind || "").toUpperCase())}</text>
    <text x="40" y="${top}" font-family="${FONT_TITLE}" font-size="46" fill="${COLOR.ink}">${tspans(lines, 40, top, 54)}</text>
    <line x1="40" y1="${top + lines.length * 54 + 20}" x2="${W - 40}" y2="${top + lines.length * 54 + 20}" stroke="${COLOR.rule}" stroke-width="1"/>
    <text x="40" y="${top + lines.length * 54 + 56}" font-family="${FONT_LABEL}" font-size="12" letter-spacing="1" fill="${COLOR.muted}">${esc(when || "")}</text>
    ${pill(40, H - 76, "ЧИТАТЬ")}
  `);
}

/* ── Карточка чернеток ──────────────────────────────────────────────────────── */
function draftsCard(items) {
  const top = BAR + 100;
  const listTop = top + 40;
  const rows = items.slice(0, 6).map((it, i) => {
    const y = listTop + i * 66;
    return `
      <text x="40" y="${y}" font-family="${FONT_LABEL}" font-size="11" letter-spacing="1" fill="${COLOR.muted}">${esc((it.kind || "").toUpperCase())}</text>
      <text x="40" y="${y + 30}" font-family="${FONT_TITLE}" font-size="24" fill="${COLOR.ink}">${wrap(it.title, 52)[0]}</text>
      <line x1="40" y1="${y + 46}" x2="${W - 40}" y2="${y + 46}" stroke="${COLOR.rule}" stroke-width="1"/>`;
  }).join("");

  return frame("ЧЕРНОВИКИ", `
    <text x="40" y="${BAR + 50}" font-family="${FONT_LABEL}" font-size="11" letter-spacing="1.5" fill="${COLOR.muted}">РЕДАКЦИЯ · К ПУБЛИКАЦИИ</text>
    <text x="40" y="${BAR + 90}" font-family="${FONT_TITLE}" font-size="34" fill="${COLOR.ink}">Черновики — ${items.length}</text>
    ${rows}
  `);
}

/* ── Карточка контактов ──────────────────────────────────────────────────── */
function contactsCard(items) {
  const top = BAR + 100;
  const listTop = top + 30;
  const typeLabel = { author: "автор", partner: "партнёр", speaker: "спикер", other: "" };
  const rows = items.slice(0, 6).map((c, i) => {
    const y = listTop + i * 66;
    const meta = [typeLabel[c.type] || "", c.telegram, c.phone].filter(Boolean).join("  ·  ");
    return `
      <text x="40" y="${y}" font-family="${FONT_TITLE}" font-size="24" fill="${COLOR.ink}">${wrap(c.name || "без имени", 44)[0]}</text>
      <text x="${W - 40}" y="${y}" font-family="${FONT_LABEL}" font-size="12" letter-spacing="0.5" fill="${COLOR.muted}" text-anchor="end">${wrap(meta, 40)[0] || ""}</text>
      <line x1="40" y1="${y + 20}" x2="${W - 40}" y2="${y + 20}" stroke="${COLOR.rule}" stroke-width="1"/>`;
  }).join("");

  return frame("КОНТАКТЫ", `
    <text x="40" y="${BAR + 50}" font-family="${FONT_LABEL}" font-size="11" letter-spacing="1.5" fill="${COLOR.muted}">РЕДАКЦИЯ · АВТОРЫ И ПАРТНЁРЫ</text>
    <text x="40" y="${BAR + 90}" font-family="${FONT_TITLE}" font-size="34" fill="${COLOR.ink}">Контакты — ${items.length}</text>
    ${rows}
  `);
}

/* ── Карточка интервью ────────────────────────────────────────────────────── */
const STATUS_COLOR = { planned: COLOR.muted, done: COLOR.success, transcribing: "#b8860b", ready: COLOR.success };
const STATUS_LABEL = { planned: "запланировано", done: "проведено", transcribing: "расшифровка", ready: "готово" };

function interviewsCard(items) {
  const top = BAR + 100;
  const listTop = top + 30;
  const rows = items.slice(0, 6).map((iv, i) => {
    const y = listTop + i * 66;
    const dot = STATUS_COLOR[iv.status] || COLOR.muted;
    const meta = [iv.contactName, iv.when].filter(Boolean).join("  ·  ");
    return `
      <circle cx="34" cy="${y - 8}" r="6" fill="${dot}"/>
      <text x="56" y="${y}" font-family="${FONT_TITLE}" font-size="24" fill="${COLOR.ink}">${wrap(iv.subject || "без темы", 40)[0]}</text>
      <text x="${W - 40}" y="${y}" font-family="${FONT_LABEL}" font-size="12" letter-spacing="0.5" fill="${dot}" text-anchor="end">${esc(STATUS_LABEL[iv.status] || iv.status || "")}</text>
      <text x="56" y="${y + 24}" font-family="${FONT_LABEL}" font-size="12" letter-spacing="0.3" fill="${COLOR.muted}">${esc(meta)}</text>
      <line x1="40" y1="${y + 40}" x2="${W - 40}" y2="${y + 40}" stroke="${COLOR.rule}" stroke-width="1"/>`;
  }).join("");

  return frame("ИНТЕРВЬЮ", `
    <text x="40" y="${BAR + 50}" font-family="${FONT_LABEL}" font-size="11" letter-spacing="1.5" fill="${COLOR.muted}">РЕДАКЦИЯ · ПЛАНИРОВАНИЕ</text>
    <text x="40" y="${BAR + 90}" font-family="${FONT_TITLE}" font-size="34" fill="${COLOR.ink}">Интервью — ${items.length}</text>
    ${rows}
  `);
}

async function toPng(svg) {
  return sharp(Buffer.from(svg)).png().toBuffer();
}

module.exports = {
  COLOR,
  toPng,
  renderStatus: (data) => toPng(statusCard(data)),
  renderLast: (data) => toPng(lastCard(data)),
  renderDrafts: (items) => toPng(draftsCard(items)),
  renderContacts: (items) => toPng(contactsCard(items)),
  renderInterviews: (items) => toPng(interviewsCard(items)),
};
