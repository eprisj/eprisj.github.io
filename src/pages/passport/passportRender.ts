import QRCode from 'qrcode';
import { generateSignatureString } from '../../lib/passportCode';
import { buildMRZ } from '../../lib/mrz';

export interface PassportFields {
  surname: string;
  givenNames: string;
  dob: string;
  country: string;
  city: string;
  field: string;
  membershipType: string;
  memberNumber: string;
  link: string;
  issueDate: string;
  expiryDate: string;
  motto: string;
  /** ICAO 9303 sex marker: 'M' | 'F' | 'X' (unspecified). Feeds the MRZ's sex position. */
  sex: string;
}

// Single combined sheet (observations on top, data page below), matching the
// on-screen PassportPage in PassportPreview.tsx — this used to be an entirely
// separate, hand-drawn "vintage passport book" (guilloche patterns, a 2-page
// spread with a spine) that had drifted far from that modern design. Ported
// to canvas rather than photographing the live DOM (tried html-to-image:
// its automatic @font-face inlining hung for a minute-plus on this page's
// ~20 Google Fonts weights, and re-fetching the cross-origin uploaded photo
// to embed it hit a 404/CORS dead end) — canvas drawing has neither problem
// since cross-origin images are only ever drawn via loadImage()'s blob-URL
// fetch below, which never taints the canvas.
const W = 1200;
const H = 1600; // 3:4, matches PassportPage's aspectRatio
export const EXPORT_W = W;
export const EXPORT_H = H;

const C = {
  bg: '#e1dbd7',
  burgundy: '#4a1728',
  burgundyDark: '#36111d',
  sand: '#b8956e',
  ink: '#1a0b10',
  cream: '#f5eddc',
};

const IDENTITY_ART_SRC = '/passport-assets/passport-page-bg.png';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => { resolve(img); URL.revokeObjectURL(objUrl); };
      img.onerror = reject;
      img.src = objUrl;
    } catch (e) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    }
  });
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, focusY = 0.5) {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale, dh = img.height * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) * focusY;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

// ── Field (bilingual label + value, mirrors <F/> in PassportPreview) ─────────
function fld(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, maxW: number,
  label: string, label2: string | undefined, value: string,
  opts: { big?: boolean; mono?: boolean } = {},
) {
  ctx.save();
  ctx.textAlign = 'left';
  ctx.fillStyle = C.burgundy; ctx.globalAlpha = 0.65;
  ctx.font = `italic 400 15px "PT Sans", sans-serif`;
  const labelText = label2 ? `${label} · ${label2}` : label;
  ctx.fillText(labelText, x, y, maxW);
  ctx.globalAlpha = 1;
  ctx.fillStyle = C.ink;
  const size = opts.big ? 30 : 19;
  ctx.font = opts.mono
    ? `500 ${size}px "Courier New", monospace`
    : `${opts.big ? 700 : 600} ${size}px "Playfair Display", "PT Serif", serif`;
  ctx.fillText(value || '—', x, y + size + 4, maxW);
  ctx.restore();
}

function dottedLine(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number) {
  ctx.save();
  ctx.strokeStyle = C.burgundy; ctx.globalAlpha = 0.4; ctx.lineWidth = 1.5;
  ctx.setLineDash([2, 6]);
  ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
  ctx.restore();
}

function emblem(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.save();
  ctx.strokeStyle = C.cream; ctx.globalAlpha = 0.85;
  ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(cx, cy, r * 0.96, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 0.7; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 0.7;
  const pts = Array.from({ length: 8 }, (_, i) => {
    const a = (i * 45 - 90) * Math.PI / 180, ro = i % 2 === 0 ? r * 0.88 : r * 0.54;
    return [cx + ro * Math.cos(a), cy + ro * Math.sin(a)];
  });
  ctx.lineWidth = 1;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath(); ctx.stroke();
  ctx.globalAlpha = 0.92; ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 0.5); ctx.lineTo(cx + r * 0.3, cy);
  ctx.lineTo(cx, cy + r * 0.5); ctx.lineTo(cx - r * 0.3, cy);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function verificationStamp(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase();
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(-15 * Math.PI / 180);
  ctx.globalAlpha = 0.65; ctx.strokeStyle = '#b33939';
  ctx.setLineDash([4, 3]); ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#b33939'; ctx.textAlign = 'center';
  ctx.font = `bold ${r * 0.16}px monospace`;
  ctx.fillText('VERIFIED', 0, -r * 0.15);
  ctx.font = `bold ${r * 0.11}px monospace`;
  ctx.fillText('EPRIS J.', 0, r * 0.1);
  ctx.font = `${r * 0.09}px monospace`;
  ctx.fillText(dateStr, 0, r * 0.3);
  ctx.restore();
}

// ── Export ────────────────────────────────────────────────────────────────────
export async function renderPassportPNG(
  fields: PassportFields,
  photoDataUrl: string | null,
  code: string,
  verifyUrl: string,
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unsupported');

  const mrz = buildMRZ(fields, code);

  let qrImg: HTMLImageElement | null = null;
  try {
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 0, width: 240 });
    qrImg = await loadImage(qrDataUrl);
  } catch { /* renders without the QR if generation fails */ }

  let identityArt: HTMLImageElement | null = null;
  try { identityArt = await loadImage(IDENTITY_ART_SRC); } catch { /* falls back to flat background */ }

  let photoImg: HTMLImageElement | null = null;
  if (photoDataUrl) { try { photoImg = await loadImage(photoDataUrl); } catch { /* falls back to blank photo box */ } }

  // ── Base ──────────────────────────────────────────────────────────────────
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  if (identityArt) drawCover(ctx, identityArt, 0, 0, W, H, 0.42);

  // Cool-gold-to-teal security tint, same cross-sheet wash as the on-screen page
  const tint = ctx.createLinearGradient(0, 0, 0, H);
  tint.addColorStop(0, 'rgba(120,140,160,0.16)');
  tint.addColorStop(0.38, 'rgba(184,149,110,0.14)');
  tint.addColorStop(0.55, 'rgba(184,149,110,0.08)');
  tint.addColorStop(0.78, 'rgba(74,120,120,0.16)');
  tint.addColorStop(1, 'rgba(74,120,120,0.22)');
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = tint; ctx.fillRect(0, 0, W, H); ctx.restore();

  // Watermark
  ctx.save();
  ctx.globalAlpha = 0.042; ctx.fillStyle = C.burgundy;
  ctx.font = `700 ${Math.round(W * 0.2)}px "Playfair Display", serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.translate(W / 2, H / 2); ctx.rotate(-16 * Math.PI / 180);
  ctx.fillText('EPRIS', 0, 0);
  ctx.restore();
  ctx.textBaseline = 'alphabetic';

  // Single frame
  const inset = W * 0.014;
  ctx.save(); ctx.strokeStyle = C.burgundy; ctx.globalAlpha = 0.7; ctx.lineWidth = 2;
  ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
  ctx.restore();

  const padX = W * 0.045;
  const contentW = W - padX * 2;

  // ══════════════════════ TOP HALF — OBSERVATIONS ══════════════════════════
  const topY = H * 0.02;
  const topH = H * 0.32;

  ctx.textAlign = 'right';
  ctx.fillStyle = C.ink; ctx.globalAlpha = 0.75;
  ctx.font = `400 40px "PT Sans", sans-serif`;
  ctx.fillText('01', W - padX - 34, topY + 32);
  ctx.globalAlpha = 1;
  const ejSize = 30;
  ctx.save();
  ctx.fillStyle = C.burgundy; ctx.globalAlpha = 0.85;
  const ejX = W - padX - ejSize / 2, ejY = topY + 14;
  ctx.beginPath();
  const cut = ejSize * 0.2;
  ctx.moveTo(ejX - ejSize / 2 + cut, ejY - ejSize / 2);
  ctx.lineTo(ejX + ejSize / 2 - cut, ejY - ejSize / 2);
  ctx.lineTo(ejX + ejSize / 2, ejY - ejSize / 2 + cut);
  ctx.lineTo(ejX + ejSize / 2, ejY + ejSize / 2 - cut);
  ctx.lineTo(ejX + ejSize / 2 - cut, ejY + ejSize / 2);
  ctx.lineTo(ejX - ejSize / 2 + cut, ejY + ejSize / 2);
  ctx.lineTo(ejX - ejSize / 2, ejY + ejSize / 2 - cut);
  ctx.lineTo(ejX - ejSize / 2, ejY - ejSize / 2 + cut);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = C.cream; ctx.textAlign = 'center'; ctx.font = `700 13px serif`;
  ctx.fillText('EJ', ejX, ejY + 5);
  ctx.restore();
  ctx.textAlign = 'left';

  dottedLine(ctx, padX, W - padX, topY + topH * 0.18);

  const topContentY = topY + topH * 0.22;
  const topContentH = topY + topH - topContentY;
  const qrSize = contentW * 0.26;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(padX, topContentY, qrSize, qrSize);
  if (qrImg) {
    const pad = qrSize * 0.07;
    ctx.drawImage(qrImg, padX + pad, topContentY + pad, qrSize - pad * 2, qrSize - pad * 2);
  }

  const fCol1X = padX + qrSize + contentW * 0.04;
  const fColW = padX + contentW - fCol1X;
  let ty = topContentY + 6;
  fld(ctx, fCol1X, ty, fColW * 0.48, 'Membership Type', 'Tipo di appartenenza', fields.membershipType || '—');
  fld(ctx, fCol1X + fColW * 0.5, ty, fColW * 0.48, 'Verification', 'Verifica', code, { mono: true });
  ty += 56;
  fld(ctx, fCol1X, ty, fColW, 'Digital Signature', 'Firma digitale', generateSignatureString(code, fields), { mono: true });
  ty += 50;
  fld(ctx, fCol1X, ty, fColW, 'Scan to Verify', 'Scansiona per verificare', `eprisjournal.com/passport/${code}`);
  ty += 54;

  ctx.save();
  ctx.fillStyle = C.burgundy; ctx.globalAlpha = 0.55; ctx.font = `400 13px "PT Sans", sans-serif`;
  ctx.fillText('OFFICIAL OBSERVATIONS · OSSERVAZIONI UFFICIALI', fCol1X, ty);
  ctx.restore();
  ty += 10;
  ctx.strokeStyle = C.burgundy; ctx.globalAlpha = 0.25; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(fCol1X, ty); ctx.lineTo(fCol1X + fColW, ty); ctx.stroke(); ctx.globalAlpha = 1;
  ty += 24;
  ctx.save();
  ctx.fillStyle = '#3a1520'; ctx.globalAlpha = 0.85; ctx.font = `italic 600 15px "Playfair Display", serif`;
  const obs1 = 'This is not a travel document or a state-issued identification. It certifies membership in the EPRIS Journal cultural system only.';
  const obs2 = "Questo non è un documento di viaggio né un documento d'identità statale. Certifica esclusivamente l'appartenenza al sistema culturale EPRIS Journal.";
  wrapText(ctx, obs1, fCol1X, ty, fColW, 19);
  wrapText(ctx, obs2, fCol1X, ty + 40, fColW, 19);
  ctx.restore();

  // ══════════════════════ DIVIDER ═══════════════════════════════════════════
  dottedLine(ctx, W * 0.02, W - W * 0.02, H * 0.36);

  // ══════════════════════ BOTTOM HALF — DATA PAGE ═══════════════════════════
  const botY = H * 0.39;
  const botH = H - H * 0.02 - botY;

  const bandH = botH * 0.13;
  const bandGrad = ctx.createLinearGradient(padX, 0, W - padX, 0);
  bandGrad.addColorStop(0, 'rgba(74,23,40,0.92)');
  bandGrad.addColorStop(0.5, 'rgba(90,28,48,0.88)');
  bandGrad.addColorStop(1, 'rgba(74,23,40,0.92)');
  ctx.fillStyle = bandGrad;
  roundRect(ctx, padX - W * 0.01, botY, contentW + W * 0.02, bandH, 4); ctx.fill();
  emblem(ctx, padX + 24, botY + bandH / 2, 20);
  emblem(ctx, W - padX - 24, botY + bandH / 2, 20);
  ctx.textAlign = 'center'; ctx.fillStyle = C.cream;
  ctx.font = `700 24px "Playfair Display", serif`;
  ctx.fillText('EPRIS JOURNAL', W / 2, botY + bandH * 0.44);
  ctx.globalAlpha = 0.85; ctx.font = `400 11px "PT Sans", sans-serif`;
  ctx.fillText('DIGITAL MEMBER PASSPORT', W / 2, botY + bandH * 0.44 + 18);
  ctx.globalAlpha = 1; ctx.textAlign = 'left';

  const typeRowY = botY + botH * 0.16;
  fld(ctx, padX, typeRowY, contentW * 0.12, 'Type', 'Tipo', 'P');
  fld(ctx, padX + contentW * 0.14, typeRowY, contentW * 0.2, 'Code', 'Codice', 'EPR');
  fld(ctx, padX + contentW * 0.34, typeRowY, contentW * 0.5, 'Member No.', 'Numero', code, { mono: true });

  ctx.strokeStyle = C.sand; ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
  const divY = botY + botH * 0.22;
  ctx.beginPath(); ctx.moveTo(padX, divY); ctx.lineTo(padX + contentW, divY); ctx.stroke(); ctx.globalAlpha = 1;

  const contentTop = botY + botH * 0.25;
  const contentBottom = botY + botH * 0.85;
  const photoW = contentW * 0.3;
  const photoH = photoW * (45 / 35);

  ctx.fillStyle = '#f8f4ed'; ctx.fillRect(padX, contentTop, photoW, photoH);
  if (photoImg) {
    ctx.save();
    ctx.beginPath(); ctx.rect(padX, contentTop, photoW, photoH); ctx.clip();
    drawCover(ctx, photoImg, padX, contentTop, photoW, photoH);
    ctx.restore();
  }
  const badgeY = contentTop + photoH + photoH * 0.06;
  ctx.fillStyle = 'rgba(74,23,40,0.06)';
  ctx.fillRect(padX, badgeY, photoW, 56);
  ctx.textAlign = 'center'; ctx.fillStyle = C.burgundy; ctx.globalAlpha = 0.6;
  ctx.font = `400 11px "PT Sans", sans-serif`;
  ctx.fillText('MEMBERSHIP TYPE', padX + photoW / 2, badgeY + 20);
  ctx.globalAlpha = 1; ctx.font = `700 16px "Playfair Display", serif`;
  ctx.fillText(fields.membershipType || 'Author', padX + photoW / 2, badgeY + 42);
  ctx.textAlign = 'left';

  const rCol1 = padX + photoW + contentW * 0.035;
  const rColW = padX + contentW - rCol1;
  const half = (rColW - rColW * 0.08) / 2;
  let ry = contentTop + 4;
  const rowGap = (contentBottom - contentTop) / 8.4;
  fld(ctx, rCol1, ry, rColW, 'Surname', 'Cognome', fields.surname.toUpperCase(), { big: true }); ry += rowGap;
  fld(ctx, rCol1, ry, rColW, 'Given Names', 'Nome', fields.givenNames.toUpperCase(), { big: true }); ry += rowGap;
  fld(ctx, rCol1, ry, rColW, 'Nationality', 'Cittadinanza', `EPRIS · ${fields.country || '—'}`.toUpperCase()); ry += rowGap;
  fld(ctx, rCol1, ry, half, 'Date of birth', 'Data di nascita', fields.dob || '—');
  fld(ctx, rCol1 + half + rColW * 0.08, ry, half, 'Record No.', 'Numero di registro', code, { mono: true }); ry += rowGap;
  fld(ctx, rCol1, ry, half, 'Sex', 'Sesso', (fields.sex || 'X').toUpperCase());
  fld(ctx, rCol1 + half + rColW * 0.08, ry, half, 'City', 'Città', fields.city || '—'); ry += rowGap;
  fld(ctx, rCol1, ry, half, 'Date of issue', 'Data di rilascio', fields.issueDate || '—');
  fld(ctx, rCol1 + half + rColW * 0.08, ry, half, 'Authority', 'Autorità', 'EPRIS J.'); ry += rowGap;
  fld(ctx, rCol1, ry, half, 'Date of expiry', 'Data di scadenza', fields.expiryDate || '—');
  ctx.save();
  const sigX = rCol1 + half + rColW * 0.08;
  ctx.fillStyle = C.burgundy; ctx.globalAlpha = 0.65; ctx.font = `italic 400 13px "PT Sans", sans-serif`;
  ctx.fillText("Holder's signature · Firma del titolare", sigX, ry);
  ctx.strokeStyle = C.sand; ctx.globalAlpha = 0.45; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(sigX, ry + 20); ctx.lineTo(sigX + half * 0.82, ry + 20); ctx.stroke();
  ctx.restore();
  ry += rowGap;
  fld(ctx, rCol1, ry, rColW, 'Professional Field', 'Campo professionale', (fields.field || '—').toUpperCase());

  verificationStamp(ctx, padX + contentW - contentW * 0.08, contentBottom - (contentBottom - contentTop) * 0.05, contentW * 0.06);

  // MRZ
  const mrzY = botY + botH * 0.94;
  ctx.font = `bold 26px "Courier New", monospace`;
  ctx.fillStyle = C.ink; ctx.textAlign = 'left';
  const cW = contentW / 43;
  for (let i = 0; i < 44; i++) {
    ctx.fillText(mrz[0][i] ?? '', padX + i * cW, mrzY);
    ctx.fillText(mrz[1][i] ?? '', padX + i * cW, mrzY + 32);
  }

  return canvas.toDataURL('image/jpeg', 0.94);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number) {
  const words = text.split(' ');
  let line = '', cy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, cy);
      line = w; cy += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cy);
}
