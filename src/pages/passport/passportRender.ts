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

// Portrait passport page: 88mm × 125mm at ~200dpi → 693×984 px per page
// Export = two pages side by side (for print/download)
const PAGE_W = 693;
const PAGE_H = 984;
const SPINE = 24;
export const EXPORT_W = PAGE_W * 2 + SPINE;
export const EXPORT_H = PAGE_H;

const C = {
  cream:    '#f4eadb',
  creamMid: '#ece0c6',
  creamDeep:'#e4d5b5',
  burgundy: '#4a1728',
  sand:     '#b8956e',
  ink:      '#1a0b10',
};

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

// MRZ generation lives in ../../lib/mrz (single shared ICAO 9303 implementation).

// ── Guilloche ─────────────────────────────────────────────────────────────────
function drawGuilloche(ctx: CanvasRenderingContext2D, ox: number, w: number, h: number) {
  ctx.save();
  ctx.lineWidth = 0.7;

  // Family A — horizontal
  ctx.globalAlpha = 0.13;
  ctx.strokeStyle = '#3d5a8a';
  for (let i = 0; i <= 52; i++) {
    const yBase = (i / 52) * h, amp = 4 + Math.sin(i * 0.47) * 3;
    const freq = (0.008 + Math.sin(i * 0.27) * 0.003) * Math.PI * 2, ph = i * 0.72;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 2) {
      const y = yBase + amp * Math.sin(x * freq + ph);
      x === 0 ? ctx.moveTo(ox + x, y) : ctx.lineTo(ox + x, y);
    }
    ctx.stroke();
  }

  // Family B — diagonal
  ctx.globalAlpha = 0.09;
  ctx.strokeStyle = '#5a7a3a';
  for (let i = 0; i <= 34; i++) {
    const xBase = (i / 34) * w, amp = 3.5 + Math.cos(i * 0.6) * 2.5;
    const freq = (0.007 + Math.cos(i * 0.37) * 0.002) * Math.PI * 2, ph = i * 0.55;
    ctx.beginPath();
    for (let y = 0; y <= h; y += 2) {
      const x = xBase + amp * Math.sin(y * freq + ph);
      y === 0 ? ctx.moveTo(ox + x, y) : ctx.lineTo(ox + x, y);
    }
    ctx.stroke();
  }

  ctx.restore();
}

// ── Watermark ─────────────────────────────────────────────────────────────────
function drawWatermark(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  ctx.globalAlpha = 0.04;
  ctx.fillStyle = C.burgundy;
  ctx.font = `900 ${Math.round(PAGE_W * 0.38)}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.translate(cx, cy);
  ctx.rotate(-0.3);
  ctx.fillText('EPRIS', 0, 0);
  ctx.restore();
}

// ── Microtext ─────────────────────────────────────────────────────────────────
function drawMicrotext(ctx: CanvasRenderingContext2D, ox: number, w: number, y: number) {
  const text = 'EPRIS JOURNAL · REVEAL THE INVISIBLE · ';
  ctx.save();
  ctx.font = '8px monospace'; ctx.fillStyle = C.burgundy; ctx.globalAlpha = 0.15;
  const unit = ctx.measureText(text).width;
  for (let x = 0; x < w; x += unit) ctx.fillText(text, ox + x, y);
  ctx.restore();
}

// ── Emblem ────────────────────────────────────────────────────────────────────
function drawEmblem(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.save();
  ctx.strokeStyle = C.burgundy;
  // Outer ring
  ctx.globalAlpha = 0.6; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke();
  ctx.globalAlpha = 0.32; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.arc(cx, cy, r*0.8, 0, Math.PI*2); ctx.stroke();
  // Star
  ctx.globalAlpha = 0.42;
  const pts = Array.from({length:8}, (_,i) => {
    const a=(i*45-90)*Math.PI/180, ro=i%2===0?r*0.9:r*0.55;
    return [cx+ro*Math.cos(a), cy+ro*Math.sin(a)];
  });
  ctx.beginPath();
  pts.forEach(([x,y],i)=> i===0?ctx.moveTo(x,y):ctx.lineTo(x,y));
  ctx.closePath(); ctx.lineWidth=0.7; ctx.stroke();
  // Diamond
  ctx.globalAlpha=0.78; ctx.lineWidth=1.2;
  ctx.beginPath();
  ctx.moveTo(cx,cy-r*0.5); ctx.lineTo(cx+r*0.3,cy);
  ctx.lineTo(cx,cy+r*0.5); ctx.lineTo(cx-r*0.3,cy);
  ctx.closePath();
  ctx.fillStyle=C.cream; ctx.fill();
  ctx.strokeStyle=C.burgundy; ctx.stroke();
  // Center
  ctx.globalAlpha=0.7; ctx.fillStyle=C.burgundy;
  ctx.beginPath(); ctx.arc(cx,cy,r*0.1,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

// ── Field helper ──────────────────────────────────────────────────────────────
function fld(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  label: string, value: string,
  valSize: number, bold = false, mono = false,
) {
  ctx.save();
  ctx.fillStyle = 'rgba(74,23,40,0.55)';
  ctx.font = `italic 11px "PT Sans", sans-serif`;
  ctx.fillText(label, x, y);
  ctx.fillStyle = C.ink;
  ctx.font = bold
    ? `700 ${valSize}px "Playfair Display", serif`
    : mono
      ? `500 ${valSize}px "Courier New", monospace`
      : `600 ${valSize}px "PT Serif", serif`;
  ctx.fillText(value || '—', x, y + valSize + 3);
  ctx.restore();
}

// ── Draw one passport page ────────────────────────────────────────────────────
async function drawPage(
  ctx: CanvasRenderingContext2D,
  ox: number,
  f: PassportFields,
  photoDataUrl: string | null,
  code: string,
  page2: boolean,
  qrDataUrl?: string,
) {
  const W = PAGE_W, H = PAGE_H;

  // Background
  const bg = ctx.createLinearGradient(ox, 0, ox + W, H);
  bg.addColorStop(0, C.cream); bg.addColorStop(0.5, C.creamMid); bg.addColorStop(1, C.creamDeep);
  ctx.fillStyle = bg; ctx.fillRect(ox, 0, W, H);

  drawGuilloche(ctx, ox, W, H);
  drawWatermark(ctx, ox + W/2, H/2);

  // Double frame
  ctx.strokeStyle = C.burgundy; ctx.lineWidth = 4; ctx.globalAlpha = 0.72;
  ctx.strokeRect(ox+10, 10, W-20, H-20);
  ctx.strokeStyle = C.sand; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.5;
  ctx.strokeRect(ox+17, 17, W-34, H-34);
  ctx.globalAlpha = 1;

  // Microtext
  drawMicrotext(ctx, ox+24, W-48, 30);

  const PAD = 26;

  // ── Header ────────────────────────────────────────────────────────────────
  const emblR = 18;
  drawEmblem(ctx, ox + PAD + emblR + 2, 60, emblR);
  drawEmblem(ctx, ox + W - PAD - emblR - 2, 60, emblR);

  ctx.fillStyle = C.burgundy;
  ctx.font = `700 ${page2?22:26}px "Playfair Display", serif`;
  ctx.textAlign = 'center';
  ctx.fillText(page2 ? 'OBSERVATIONS' : 'EPRIS JOURNAL', ox + W/2, 58);
  ctx.fillStyle = 'rgba(74,23,40,0.55)';
  ctx.font = '10px monospace';
  ctx.fillText(
    page2 ? 'MENTIONS SPÉCIALES' : 'DIGITAL MEMBER PASSPORT · PASSEPORT NUMÉRIQUE DE MEMBRE',
    ox + W/2, 74,
  );
  ctx.textAlign = 'left';

  // Divider
  ctx.strokeStyle = C.burgundy; ctx.lineWidth = 1; ctx.globalAlpha = 0.2;
  ctx.beginPath(); ctx.moveTo(ox+PAD, 88); ctx.lineTo(ox+W-PAD, 88); ctx.stroke();
  ctx.globalAlpha = 1;

  if (!page2) {
    // ── Type / Code / Number row ─────────────────────────────────────────────
    fld(ctx, ox+PAD, 100, 'Type', 'P', 17, true);
    fld(ctx, ox+PAD+80, 100, 'Code', 'EPR', 17, true);
    fld(ctx, ox+PAD+180, 100, 'Member No.', code, 16, false, true);

    // Divider
    ctx.strokeStyle = C.sand; ctx.lineWidth = 1; ctx.globalAlpha = 0.4;
    ctx.beginPath(); ctx.moveTo(ox+PAD, 140); ctx.lineTo(ox+W-PAD, 140); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // ── Content area ──────────────────────────────────────────────────────────
  const contentTop = page2 ? 100 : 152;
  const photoW = Math.round(W * 0.33);
  const photoH = Math.round(photoW * 45/35);
  const photoX = ox + PAD;
  const photoY = contentTop;

  // Photo/QR box
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = C.burgundy; ctx.lineWidth = 2;
  ctx.fillRect(photoX, photoY, photoW, photoH);
  ctx.strokeRect(photoX, photoY, photoW, photoH);
  if (!page2 && photoDataUrl) {
    try { const img = await loadImage(photoDataUrl); ctx.drawImage(img, photoX, photoY, photoW, photoH); ctx.strokeRect(photoX, photoY, photoW, photoH); } catch {}
  } else if (page2 && qrDataUrl) {
    try {
      const pad = 18;
      const qrSize = Math.min(photoW, photoH) - pad*2;
      const img = await loadImage(qrDataUrl);
      ctx.drawImage(img, photoX + (photoW-qrSize)/2, photoY + (photoH-qrSize)/2, qrSize, qrSize);
    } catch {}
  }
  ctx.restore();

  // Membership badge below photo (page 1 only)
  if (!page2) {
    const badgeY = photoY + photoH + 12;
    ctx.save();
    ctx.strokeStyle = C.sand; ctx.lineWidth = 0.8; ctx.globalAlpha = 0.5;
    ctx.strokeRect(photoX, badgeY, photoW, 42);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(74,23,40,0.5)'; ctx.font = 'italic 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MEMBERSHIP TYPE', photoX + photoW/2, badgeY + 13);
    ctx.fillStyle = C.burgundy; ctx.font = `700 14px "PT Serif",serif`;
    ctx.fillText(f.membershipType || 'Author', photoX + photoW/2, badgeY + 32);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  // ── Right column: fields ──────────────────────────────────────────────────
  const colX = photoX + photoW + 22;
  const colW = ox + W - PAD - colX;
  const half = (colW - 10) / 2;

  if (!page2) {
    let ry = contentTop + 2;
    const rg = 58;
    fld(ctx, colX, ry, 'Surname', f.surname.toUpperCase(), 20, true); ry += rg;
    fld(ctx, colX, ry, 'Given Names', f.givenNames.toUpperCase(), 20, true); ry += rg;
    fld(ctx, colX, ry, 'Nationality', `EPRIS · ${f.country||'—'}`.toUpperCase(), 15); ry += rg;

    fld(ctx, colX,          ry, 'Date of birth', f.dob||'—', 14);
    fld(ctx, colX+half+10,  ry, 'Record No.', code, 13, false, true); ry += rg;

    fld(ctx, colX,          ry, 'Sex', (f.sex || 'X').toUpperCase(), 14);
    fld(ctx, colX+half+10,  ry, 'City', f.city||'—', 14); ry += rg;

    fld(ctx, colX,          ry, 'Date of issue', f.issueDate||'—', 14);
    fld(ctx, colX+half+10,  ry, 'Authority', 'EPRIS J.', 14); ry += rg;

    fld(ctx, colX,          ry, 'Date of expiry', f.expiryDate||'—', 14);

    // Signature line
    ctx.save();
    ctx.fillStyle = 'rgba(74,23,40,0.5)'; ctx.font = 'italic 9px monospace';
    ctx.fillText("Holder's signature", colX+half+10, ry);
    ctx.strokeStyle = C.sand; ctx.lineWidth = 1; ctx.globalAlpha = 0.45;
    ctx.beginPath(); ctx.moveTo(colX+half+10, ry+24); ctx.lineTo(colX+half+10+colW*0.42, ry+24); ctx.stroke();
    ctx.restore();

    ry += rg;
    fld(ctx, colX, ry, 'Professional Field', (f.field||'—').toUpperCase(), 14);

    // ── Holographic strip ──────────────────────────────────────────────────
    const holoY = H - 108;
    const holoGrad = ctx.createLinearGradient(ox+PAD, 0, ox+W-PAD, 0);
    holoGrad.addColorStop(0, 'transparent');
    holoGrad.addColorStop(0.08, 'rgba(100,160,240,0.12)');
    holoGrad.addColorStop(0.22, 'rgba(60,200,120,0.1)');
    holoGrad.addColorStop(0.38, 'rgba(220,180,40,0.1)');
    holoGrad.addColorStop(0.55, 'rgba(200,60,160,0.1)');
    holoGrad.addColorStop(0.72, 'rgba(60,140,220,0.12)');
    holoGrad.addColorStop(0.9, 'rgba(40,200,160,0.08)');
    holoGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = holoGrad;
    ctx.fillRect(ox+PAD, holoY, W-PAD*2, 7);

    // ── MRZ zone ───────────────────────────────────────────────────────────
    const mrz = buildMRZ(f, code);
    const mrzY = H - 88;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(ox+PAD, mrzY-6, W-PAD*2, 72);
    ctx.strokeStyle = 'rgba(74,23,40,0.2)'; ctx.lineWidth=1;
    ctx.strokeRect(ox+PAD, mrzY-6, W-PAD*2, 72);
    ctx.fillStyle = 'rgba(26,11,16,0.85)';
    ctx.font = 'bold 22px "Courier New", monospace';
    
    // Stretch to fill width perfectly
    const mrzBoxW = W - PAD*2 - 20; // 10px padding on each side
    const cW = mrzBoxW / 43; // 43 intervals between 44 chars
    for (let i = 0; i < 44; i++) {
      ctx.fillText(mrz[0][i], ox+PAD+10 + i*cW, mrzY+20);
      ctx.fillText(mrz[1][i], ox+PAD+10 + i*cW, mrzY+50);
    }
    ctx.restore();

  } else {
    // Page 2 fields
    let ry = contentTop + 2;
    const rg = 58;
    fld(ctx, colX, ry, 'Personal Motto', f.motto||'—', 17, true); ry += rg;
    fld(ctx, colX, ry, 'Website · ORCID · Social', f.link||'—', 14); ry += rg;
    fld(ctx, colX,         ry, "Membership Type", f.membershipType||'—', 14);
    fld(ctx, colX+half+10, ry, 'Verification', code, 13, false, true); ry += rg;
    fld(ctx, colX, ry, 'Digital Signature', generateSignatureString(code, f), 13, false, true); ry += rg;
    fld(ctx, colX, ry, 'Scan to Verify', `eprisjournal.com/passport/${code}`, 14);

    // Oval stamp
    const stampCX = ox + W/2, stampCY = H - 160;
    ctx.save(); ctx.globalAlpha = 0.07; ctx.strokeStyle = C.burgundy;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(stampCX, stampCY, 160, 55, 0, 0, Math.PI*2); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(stampCX, stampCY, 144, 45, 0, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = C.burgundy;
    ctx.font = '700 22px serif'; ctx.textAlign = 'center';
    ctx.fillText('EPRIS JOURNAL', stampCX, stampCY - 5);
    ctx.font = '11px monospace';
    ctx.fillText('REVEAL THE INVISIBLE', stampCX, stampCY + 15);
    ctx.restore();

    // Disclaimer
    ctx.save(); ctx.fillStyle = 'rgba(74,23,40,0.22)'; ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CULTURAL MEMBERSHIP · NOT A GOVERNMENT DOCUMENT · FICTIONAL MEMBER ID', ox + W/2, H-28);
    ctx.restore();
  }

  // Page number
  ctx.save(); ctx.fillStyle = 'rgba(74,23,40,0.28)'; ctx.font = '9px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`${page2?'3':'2'} / 32`, ox + W - PAD, H - 14);
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
  canvas.width = EXPORT_W; canvas.height = EXPORT_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unsupported');

  // Fill background with white to avoid black backgrounds in JPEG
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, EXPORT_W, EXPORT_H);

  await drawPage(ctx, 0, fields, photoDataUrl, code, false);
  
  // Draw Spine
  const spineGrad = ctx.createLinearGradient(PAGE_W, 0, PAGE_W + SPINE, 0);
  spineGrad.addColorStop(0, 'rgba(0,0,0,0.22)');
  spineGrad.addColorStop(0.5, 'rgba(0,0,0,0.4)');
  spineGrad.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = spineGrad;
  ctx.fillRect(PAGE_W, 0, SPINE, PAGE_H);

  // QR for page 2
  let qrDataUrl: string | undefined;
  try {
    qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin:0, width:200, color:{ dark:C.ink, light:'#ffffff00' } });
  } catch {}

  await drawPage(ctx, PAGE_W + SPINE, fields, photoDataUrl, code, true, qrDataUrl);

  // Return JPEG to drastically reduce memory/data URI size for react-pdf
  return canvas.toDataURL('image/jpeg', 0.92);
}
