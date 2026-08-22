"use strict";

/* Брендованные карточки для бота: SVG → PNG через sharp, без headless-браузера
 * (служба живёт в MemoryMax=200M, puppeteer туда не поместится).
 *
 * Палитра и шрифты — из public/brandbook/data.js, снято с самого сайта:
 *   Бордо #4a1728, Золото #b8956e, Бумага #f5f0eb, Чернила #1a0b10.
 *   Playfair Display — заголовки, PT Serif — тело, моно — служебные метки
 *   (место OCR-B: шрифт не свободный, картон/трекинг те же).
 */

const sharp = require("sharp");

const COLOR = {
  bordeaux: "#4a1728",
  gold: "#b8956e",
  paper: "#f5f0eb",
  ink: "#1a0b10",
  cream: "#ede1c6",
  success: "#4a7c59",
  error: "#b33939",
  warn: "#b8860b",
};

const FONT_DISPLAY = "'Playfair Display', 'PT Serif', serif";
const FONT_SERIF = "'PT Serif', serif";
const FONT_MONO = "'PT Mono', 'Courier New', monospace";

const esc = (v) => String(v == null ? "" : v)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* Разбивает строку на несколько <tspan>, чтобы длинный заголовок не вылезал
   за карточку — SVG сам не переносит текст. */
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

function frame(inner) {
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" fill="${COLOR.paper}"/>
    <rect x="0" y="0" width="${W}" height="8" fill="${COLOR.gold}"/>
    <text x="60" y="70" font-family="${FONT_MONO}" font-size="20" letter-spacing="6" fill="${COLOR.bordeaux}">EPRIS</text>
    <text x="${W - 60}" y="70" font-family="${FONT_MONO}" font-size="14" letter-spacing="3" fill="${COLOR.gold}" text-anchor="end">РЕДАКЦИЯ</text>
    <line x1="60" y1="92" x2="${W - 60}" y2="92" stroke="${COLOR.bordeaux}" stroke-width="1" opacity="0.25"/>
    ${inner}
    <rect x="0" y="${H - 6}" width="${W}" height="6" fill="${COLOR.bordeaux}"/>
  </svg>`;
}

/* ── Карточка статуса ────────────────────────────────────────────────────── */
function statusCard({ checks, counts, disk, updatedAt }) {
  const rows = checks.map((c, i) => {
    const y = 170 + i * 56;
    const dot = c.ok ? COLOR.success : COLOR.error;
    return `
      <circle cx="80" cy="${y - 8}" r="7" fill="${dot}"/>
      <text x="104" y="${y}" font-family="${FONT_SERIF}" font-size="24" fill="${COLOR.ink}">${esc(c.label)}</text>
      <text x="${W - 60}" y="${y}" font-family="${FONT_MONO}" font-size="16" letter-spacing="1" fill="${c.ok ? COLOR.success : COLOR.error}" text-anchor="end">${esc(c.detail)}</text>`;
  }).join("");

  const countsY = 170 + checks.length * 56 + 30;
  const countsText = counts.map((c) => `${c.n} ${c.label}`).join("   ·   ");

  return frame(`
    <text x="60" y="140" font-family="${FONT_DISPLAY}" font-size="36" fill="${COLOR.bordeaux}">Состояние редакции</text>
    ${rows}
    <line x1="60" y1="${countsY - 34}" x2="${W - 60}" y2="${countsY - 34}" stroke="${COLOR.bordeaux}" stroke-width="1" opacity="0.15"/>
    <text x="60" y="${countsY}" font-family="${FONT_MONO}" font-size="18" letter-spacing="1" fill="${COLOR.ink}" opacity="0.8">${esc(countsText)}</text>
    <text x="60" y="${countsY + 40}" font-family="${FONT_MONO}" font-size="14" letter-spacing="1" fill="${COLOR.bordeaux}" opacity="0.6">свободно на диске: ${esc(disk)}</text>
    <text x="${W - 60}" y="${H - 40}" font-family="${FONT_MONO}" font-size="13" letter-spacing="1" fill="${COLOR.gold}" text-anchor="end">${esc(updatedAt)}</text>
  `);
}

/* ── Карточка «последнее опубликованное» — обложка одного материала ───────── */
function lastCard({ kind, title, when }) {
  const lines = wrap(title, 26).slice(0, 4);
  const titleY = 300 - (lines.length - 1) * 27;
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" fill="${COLOR.ink}"/>
    <rect x="0" y="0" width="${W}" height="8" fill="${COLOR.gold}"/>
    <text x="60" y="70" font-family="${FONT_MONO}" font-size="20" letter-spacing="6" fill="${COLOR.paper}">EPRIS</text>
    <text x="${W - 60}" y="70" font-family="${FONT_MONO}" font-size="14" letter-spacing="3" fill="${COLOR.gold}" text-anchor="end">${esc(when || "")}</text>
    <line x1="60" y1="92" x2="${W - 60}" y2="92" stroke="${COLOR.paper}" stroke-width="1" opacity="0.2"/>
    <text x="60" y="150" font-family="${FONT_MONO}" font-size="16" letter-spacing="4" fill="${COLOR.gold}">ОПУБЛИКОВАНО · ${esc((kind || "").toUpperCase())}</text>
    <text x="60" y="${titleY}" font-family="${FONT_DISPLAY}" font-size="54" fill="${COLOR.paper}" font-style="italic">${tspans(lines, 60, titleY, 62)}</text>
    <rect x="0" y="${H - 6}" width="${W}" height="6" fill="${COLOR.gold}"/>
  </svg>`;
}

/* ── Карточка чернеток — «шпальта» списком ─────────────────────────────────── */
function draftsCard(items) {
  const rows = items.slice(0, 8).map((it, i) => {
    const y = 190 + i * 56;
    const lines = wrap(it.title, 44);
    return `
      <text x="60" y="${y}" font-family="${FONT_MONO}" font-size="14" fill="${COLOR.gold}">${String(i + 1).padStart(2, "0")}</text>
      <text x="94" y="${y}" font-family="${FONT_SERIF}" font-size="22" fill="${COLOR.ink}">${lines[0]}</text>
      <text x="${W - 60}" y="${y}" font-family="${FONT_MONO}" font-size="13" letter-spacing="1" fill="${COLOR.bordeaux}" opacity="0.6" text-anchor="end">${esc(it.kind)}</text>`;
  }).join("");

  return frame(`
    <text x="60" y="140" font-family="${FONT_DISPLAY}" font-size="36" fill="${COLOR.bordeaux}">Черновики — ${items.length}</text>
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
};
