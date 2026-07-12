import QRCode from 'qrcode';
import { generateSignatureString } from '../../lib/passportCode';

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
}

const PAGE_W = 1400;
const PAGE_H = 1700;
const SPINE_W = 36;
export const EXPORT_W = PAGE_W * 2 + SPINE_W;
export const EXPORT_H = PAGE_H;

const COLORS = {
  cream: '#f7f2ea',
  creamDeep: '#efe6d8',
  burgundy: '#501a2c',
  sand: '#c9a690',
  paleBlueLine: 'rgba(90, 120, 165, 0.28)',
  ink: '#241016',
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
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

// Decorative wave pattern reminiscent of fine engraving — purely ornamental,
// not modeled on any specific document's anti-counterfeit guilloché.
function drawGuilloche(ctx: CanvasRenderingContext2D, ox: number, w: number, h: number) {
  ctx.save();
  ctx.strokeStyle = COLORS.paleBlueLine;
  ctx.lineWidth = 1;
  const spacing = 26;
  for (let offset = -h; offset < w + h; offset += spacing) {
    ctx.beginPath();
    for (let x = 0; x <= w; x += 8) {
      const y = offset + Math.sin((x + offset) * 0.018) * 34 + Math.sin((x + offset) * 0.006) * 60;
      if (x === 0) ctx.moveTo(ox + x, y); else ctx.lineTo(ox + x, y);
    }
    ctx.globalAlpha = 0.5;
    ctx.stroke();
  }
  ctx.restore();
}

function drawMicrotext(ctx: CanvasRenderingContext2D, ox: number, w: number, y: number) {
  const text = 'EPRIS JOURNAL • REVEAL THE INVISIBLE • DIGITAL MEMBER   ';
  ctx.save();
  ctx.font = '9px "Orbit", monospace';
  ctx.fillStyle = 'rgba(80, 26, 44, 0.35)';
  const unit = ctx.measureText(text).width;
  let x = 0;
  while (x < w) {
    ctx.fillText(text, ox + x, y);
    x += unit;
  }
  ctx.restore();
}

function drawPageFrame(ctx: CanvasRenderingContext2D, ox: number, w: number, h: number) {
  const grad = ctx.createLinearGradient(ox, 0, ox + w, h);
  grad.addColorStop(0, COLORS.cream);
  grad.addColorStop(1, COLORS.creamDeep);
  ctx.fillStyle = grad;
  ctx.fillRect(ox, 0, w, h);
  drawGuilloche(ctx, ox, w, h);

  ctx.strokeStyle = COLORS.burgundy;
  ctx.lineWidth = 5;
  ctx.strokeRect(ox + 14, 14, w - 28, h - 28);
  ctx.strokeStyle = COLORS.sand;
  ctx.lineWidth = 2;
  ctx.strokeRect(ox + 26, 26, w - 52, h - 52);

  drawMicrotext(ctx, ox + 50, w - 100, 48);
  drawMicrotext(ctx, ox + 50, w - 100, h - 36);

  // diagonal watermark — always on, not a toggle
  ctx.save();
  ctx.translate(ox + w / 2, h / 2);
  ctx.rotate(-Math.PI / 10);
  ctx.globalAlpha = 0.09;
  ctx.fillStyle = COLORS.burgundy;
  ctx.font = '700 60px "Orbit", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('FICTIONAL MEMBER ID', 0, 0);
  ctx.font = '700 42px "Orbit", monospace';
  ctx.fillText('EPRIS JOURNAL SPECIMEN', 0, 65);
  ctx.restore();
}

function drawBanner(ctx: CanvasRenderingContext2D, ox: number, y: number, w: number, text: string) {
  ctx.fillStyle = COLORS.burgundy;
  ctx.fillRect(ox + 70, y, w - 140, 46);
  ctx.fillStyle = COLORS.cream;
  ctx.font = '700 15px "Orbit", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(text, ox + w / 2, y + 30);
  ctx.textAlign = 'left';
}

async function drawPhoto(ctx: CanvasRenderingContext2D, photoDataUrl: string | null, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = COLORS.burgundy;
  ctx.lineWidth = 3;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
  if (photoDataUrl) {
    try {
      const img = await loadImage(photoDataUrl);
      ctx.drawImage(img, x, y, w, h);
      ctx.strokeRect(x, y, w, h);
    } catch { /* fall back to empty frame */ }
  } else {
    ctx.fillStyle = 'rgba(80,26,44,0.25)';
    ctx.font = '600 20px "Crimson Text", serif';
    ctx.textAlign = 'center';
    ctx.fillText('PHOTO', x + w / 2, y + h / 2);
    ctx.textAlign = 'left';
  }
  ctx.restore();
}

function field(ctx: CanvasRenderingContext2D, x: number, y: number, labelEn: string, labelFr: string, value: string, valueSize = 24) {
  ctx.save();
  ctx.fillStyle = 'rgba(80,26,44,0.62)';
  ctx.font = '10px "Orbit", monospace';
  ctx.fillText(`${labelEn.toUpperCase()} / ${labelFr.toUpperCase()}`, x, y);
  ctx.fillStyle = COLORS.ink;
  ctx.font = `600 ${valueSize}px "Crimson Text", serif`;
  ctx.fillText(value || '—', x, y + 30);
  ctx.restore();
}

function drawPage1(ctx: CanvasRenderingContext2D, ox: number, fields: PassportFields, photoDataUrl: string | null, code: string): Promise<void> {
  drawPageFrame(ctx, ox, PAGE_W, PAGE_H);

  ctx.fillStyle = COLORS.burgundy;
  ctx.font = '700 34px "Playfair Display", serif';
  ctx.fillText('EPRIS JOURNAL', ox + 70, 110);
  ctx.font = '11px "Orbit", monospace';
  ctx.fillStyle = 'rgba(80,26,44,0.75)';
  ctx.fillText('DIGITAL MEMBER PASSPORT · PASSEPORT NUMÉRIQUE DE MEMBRE', ox + 70, 134);

  drawBanner(ctx, ox, 154, PAGE_W, 'NOT A GOVERNMENT DOCUMENT · FICTIONAL MEMBER ID · EPRIS JOURNAL ONLY');

  const photoX = ox + 70, photoY = 240, photoW = 340, photoH = 453;
  const colX = photoX + photoW + 60;
  let rowY = 300;
  const rowGap = 90;

  field(ctx, colX, rowY, 'Surname', 'Nom', fields.surname.toUpperCase(), 30); rowY += rowGap;
  field(ctx, colX, rowY, 'Given Names', 'Prénoms', fields.givenNames.toUpperCase(), 30); rowY += rowGap + 10;
  field(ctx, colX, rowY, 'Member No.', "N° d'adhérent", code);
  field(ctx, colX + 340, rowY, 'Membership Type', "Type d'adhésion", fields.membershipType); rowY += rowGap;
  field(ctx, colX, rowY, 'Country', 'Pays', fields.country);
  field(ctx, colX + 340, rowY, 'City', 'Ville', fields.city);

  rowY = photoY + photoH + 60;
  field(ctx, photoX, rowY, 'Date of Birth', 'Date de naissance', fields.dob);
  field(ctx, photoX + 340, rowY, 'Field', 'Domaine', fields.field);
  field(ctx, photoX + 680, rowY, 'Issue Date', "Date d'émission", fields.issueDate); rowY += rowGap;
  field(ctx, photoX + 680, rowY, 'Expiry Date', "Date d'expiration", fields.expiryDate);

  const authY = PAGE_H - 100;
  ctx.strokeStyle = COLORS.sand;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(photoX, authY - 30);
  ctx.lineTo(ox + PAGE_W - 70, authY - 30);
  ctx.stroke();
  field(ctx, photoX, authY, 'Issuing Authority', 'Autorité de délivrance', 'EPRIS JOURNAL');

  return drawPhoto(ctx, photoDataUrl, photoX, photoY, photoW, photoH);
}

async function drawQRBox(ctx: CanvasRenderingContext2D, verifyUrl: string, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = COLORS.burgundy;
  ctx.lineWidth = 3;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
  try {
    const qrSize = Math.min(w, h) - 40;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 0, width: qrSize, color: { dark: COLORS.ink, light: '#ffffff00' } });
    const qrImg = await loadImage(qrDataUrl);
    ctx.drawImage(qrImg, x + (w - qrSize) / 2, y + (h - qrSize) / 2, qrSize, qrSize);
  } catch { /* QR is decorative-only if it fails */ }
  ctx.restore();
}

// Page 2 mirrors page 1's skeleton exactly (header, banner, box + field grid,
// bottom bar) — the QR takes the photo's place, fields are the remaining data.
async function drawPage2(ctx: CanvasRenderingContext2D, ox: number, fields: PassportFields, code: string, verifyUrl: string): Promise<void> {
  drawPageFrame(ctx, ox, PAGE_W, PAGE_H);

  ctx.fillStyle = COLORS.burgundy;
  ctx.font = '700 34px "Playfair Display", serif';
  ctx.fillText('EPRIS JOURNAL', ox + 70, 110);
  ctx.font = '11px "Orbit", monospace';
  ctx.fillStyle = 'rgba(80,26,44,0.75)';
  ctx.fillText('OBSERVATIONS · MENTIONS SPÉCIALES', ox + 70, 134);

  drawBanner(ctx, ox, 154, PAGE_W, 'NOT A GOVERNMENT DOCUMENT · FICTIONAL MEMBER ID · EPRIS JOURNAL ONLY');

  const boxX = ox + 70, boxY = 240, boxW = 340, boxH = 453;
  const colX = boxX + boxW + 60;
  let rowY = 300;
  const rowGap = 90;

  field(ctx, colX, rowY, 'Personal Motto', 'Devise personnelle', fields.motto, 22); rowY += rowGap;
  field(ctx, colX, rowY, 'Website / ORCID / Social', 'Site web / ORCID / Réseau', fields.link, 22); rowY += rowGap + 10;
  field(ctx, colX, rowY, 'Membership Type', "Type d'adhésion", fields.membershipType);
  field(ctx, colX + 340, rowY, 'Verification Code', 'Code de vérification', code); rowY += rowGap;
  field(ctx, colX, rowY, 'Digital Signature', 'Signature numérique', generateSignatureString(code, fields), 18);

  rowY = boxY + boxH + 60;
  ctx.fillStyle = 'rgba(80,26,44,0.62)';
  ctx.font = '10px "Orbit", monospace';
  ctx.fillText("SCAN TO VERIFY / SCANNER POUR VÉRIFIER", boxX, rowY);
  ctx.fillStyle = COLORS.ink;
  ctx.font = '600 22px "Crimson Text", serif';
  ctx.fillText(`eprisjournal.com/passport/${code}`, boxX, rowY + 30);

  const authY = PAGE_H - 100;
  ctx.strokeStyle = COLORS.sand;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(boxX, authY - 30);
  ctx.lineTo(ox + PAGE_W - 70, authY - 30);
  ctx.stroke();
  field(ctx, boxX, authY, 'Issuing Authority', 'Autorité de délivrance', 'EPRIS JOURNAL');

  await drawQRBox(ctx, verifyUrl, boxX, boxY, boxW, boxH);
}

export async function renderPassportPNG(fields: PassportFields, photoDataUrl: string | null, code: string, verifyUrl: string): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = EXPORT_W;
  canvas.height = EXPORT_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unsupported');

  ctx.fillStyle = '#00000022';
  ctx.fillRect(PAGE_W, 0, SPINE_W, PAGE_H);

  await drawPage1(ctx, 0, fields, photoDataUrl, code);
  await drawPage2(ctx, PAGE_W + SPINE_W, fields, code, verifyUrl);

  return canvas.toDataURL('image/png');
}
