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

export const EXPORT_W = 2400;
export const EXPORT_H = 1520;

const COLORS = {
  cream: '#f7f2ea',
  creamDeep: '#efe6d8',
  burgundy: '#501a2c',
  burgundyDeep: '#3a1120',
  sand: '#c9a690',
  paleBlue: 'rgba(120, 150, 190, 0.16)',
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
function drawGuilloche(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save();
  ctx.strokeStyle = COLORS.paleBlueLine;
  ctx.lineWidth = 1;
  const spacing = 26;
  for (let offset = -h; offset < w + h; offset += spacing) {
    ctx.beginPath();
    for (let x = 0; x <= w; x += 8) {
      const y = offset + Math.sin((x + offset) * 0.018) * 34 + Math.sin((x + offset) * 0.006) * 60;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.globalAlpha = 0.5;
    ctx.stroke();
  }
  ctx.restore();
}

function drawMicrotext(ctx: CanvasRenderingContext2D, w: number, y: number) {
  const text = 'EPRIS JOURNAL • REVEAL THE INVISIBLE • DIGITAL MEMBER   ';
  ctx.save();
  ctx.font = '9px "Orbit", monospace';
  ctx.fillStyle = 'rgba(80, 26, 44, 0.35)';
  const unit = ctx.measureText(text).width;
  let x = 0;
  while (x < w) {
    ctx.fillText(text, x, y);
    x += unit;
  }
  ctx.restore();
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
    ctx.font = '600 22px "Crimson Text", serif';
    ctx.textAlign = 'center';
    ctx.fillText('PHOTO', x + w / 2, y + h / 2);
    ctx.textAlign = 'left';
  }
  ctx.restore();
}

function field(ctx: CanvasRenderingContext2D, x: number, y: number, labelEn: string, labelFr: string, value: string, valueSize = 26) {
  ctx.save();
  ctx.fillStyle = 'rgba(80,26,44,0.62)';
  ctx.font = '11px "Orbit", monospace';
  ctx.fillText(`${labelEn.toUpperCase()} / ${labelFr.toUpperCase()}`, x, y);
  ctx.fillStyle = COLORS.ink;
  ctx.font = `600 ${valueSize}px "Crimson Text", serif`;
  ctx.fillText(value || '—', x, y + 34);
  ctx.restore();
}

export async function renderPassportPNG(fields: PassportFields, photoDataUrl: string | null, code: string, verifyUrl: string): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = EXPORT_W;
  canvas.height = EXPORT_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unsupported');

  // Background
  const grad = ctx.createLinearGradient(0, 0, EXPORT_W, EXPORT_H);
  grad.addColorStop(0, COLORS.cream);
  grad.addColorStop(1, COLORS.creamDeep);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, EXPORT_W, EXPORT_H);
  drawGuilloche(ctx, EXPORT_W, EXPORT_H);

  // Outer border
  ctx.strokeStyle = COLORS.burgundy;
  ctx.lineWidth = 6;
  ctx.strokeRect(16, 16, EXPORT_W - 32, EXPORT_H - 32);
  ctx.strokeStyle = COLORS.sand;
  ctx.lineWidth = 2;
  ctx.strokeRect(30, 30, EXPORT_W - 60, EXPORT_H - 60);

  drawMicrotext(ctx, EXPORT_W - 60, 54);
  drawMicrotext(ctx, EXPORT_W - 60, EXPORT_H - 44);

  // Header
  ctx.fillStyle = COLORS.burgundy;
  ctx.font = '700 40px "Playfair Display", serif';
  ctx.fillText('EPRIS JOURNAL', 90, 130);
  ctx.font = '13px "Orbit", monospace';
  ctx.fillStyle = 'rgba(80,26,44,0.75)';
  ctx.fillText('DIGITAL MEMBER PASSPORT · PASSEPORT NUMÉRIQUE DE MEMBRE', 90, 158);

  // Fictional banner (prominent, permanent — cannot be disabled)
  const bannerY = 178;
  ctx.fillStyle = COLORS.burgundy;
  ctx.fillRect(90, bannerY, EXPORT_W - 180, 44);
  ctx.fillStyle = COLORS.cream;
  ctx.font = '700 17px "Orbit", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('NOT A GOVERNMENT DOCUMENT  ·  FICTIONAL MEMBER ID  ·  EPRIS JOURNAL ONLY', EXPORT_W / 2, bannerY + 29);
  ctx.textAlign = 'left';

  // Photo
  const photoX = 90, photoY = 260, photoW = 420, photoH = 560;
  await drawPhoto(ctx, photoDataUrl, photoX, photoY, photoW, photoH);

  // Fields — two columns to the right of the photo
  const colX1 = photoX + photoW + 70;
  const colX2 = colX1 + 620;
  let rowY = 300;
  const rowGap = 96;
  field(ctx, colX1, rowY, 'Surname', 'Nom', fields.surname.toUpperCase(), 32); rowY += rowGap;
  field(ctx, colX1, rowY, 'Given Names', 'Prénoms', fields.givenNames.toUpperCase(), 32); rowY += rowGap;
  field(ctx, colX1, rowY, 'Member No.', "N° d'adhérent", code);
  field(ctx, colX2, rowY, 'Membership Type', "Type d'adhésion", fields.membershipType); rowY += rowGap;
  field(ctx, colX1, rowY, 'Country', 'Pays', fields.country);
  field(ctx, colX2, rowY, 'City', 'Ville', fields.city); rowY += rowGap;
  field(ctx, colX1, rowY, 'Date of Birth', 'Date de naissance', fields.dob);
  field(ctx, colX2, rowY, 'Field', 'Domaine', fields.field); rowY += rowGap;
  field(ctx, colX1, rowY, 'Issue Date', "Date d'émission", fields.issueDate);
  field(ctx, colX2, rowY, 'Expiry Date', "Date d'expiration", fields.expiryDate); rowY += rowGap;
  field(ctx, colX1, rowY, 'Issuing Authority', 'Autorité de délivrance', 'EPRIS JOURNAL');

  // Motto
  if (fields.motto) {
    ctx.save();
    ctx.fillStyle = COLORS.burgundy;
    ctx.font = 'italic 24px "Crimson Text", serif';
    ctx.fillText(`“${fields.motto}”`, photoX, photoY + photoH + 60);
    ctx.restore();
  }

  // QR + code
  const qrSize = 220;
  const qrX = EXPORT_W - 90 - qrSize;
  const qrY = photoY + photoH - qrSize;
  try {
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 0, width: qrSize, color: { dark: COLORS.ink, light: '#ffffff00' } });
    const qrImg = await loadImage(qrDataUrl);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(qrX - 12, qrY - 12, qrSize + 24, qrSize + 24);
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  } catch { /* QR is decorative-only if it fails */ }
  ctx.fillStyle = 'rgba(80,26,44,0.7)';
  ctx.font = '10px "Orbit", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SCAN TO VERIFY', qrX + qrSize / 2, qrY + qrSize + 34);
  ctx.textAlign = 'left';

  // Cosmetic "digital signature" line — explicitly NOT an MRZ
  const sigY = EXPORT_H - 130;
  roundRect(ctx, 90, sigY - 40, EXPORT_W - 180, 60, 6);
  ctx.fillStyle = 'rgba(80,26,44,0.06)';
  ctx.fill();
  ctx.fillStyle = COLORS.burgundy;
  ctx.font = '20px "Orbit", monospace';
  ctx.fillText(generateSignatureString(code, fields), 112, sigY - 4);

  // Diagonal watermark — structural safeguard, always rendered, not a toggle.
  ctx.save();
  ctx.translate(EXPORT_W / 2, EXPORT_H / 2);
  ctx.rotate(-Math.PI / 10);
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = COLORS.burgundy;
  ctx.font = '700 90px "Orbit", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('FICTIONAL MEMBER ID', 0, 0);
  ctx.fillText('EPRIS JOURNAL SPECIMEN', 0, 100);
  ctx.restore();

  return canvas.toDataURL('image/png');
}
