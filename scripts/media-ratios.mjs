// Writes src/content/media-ratios.json: width-over-height of every picture in
// public/uploads, read from file headers (no decoding, no dependencies).
//
// The article page uses it to reserve each photograph's box before the file
// arrives. Without it an <img> with `height: auto` is 0px tall until it loads,
// and everything below it jumps down mid-scroll.
import { readdirSync, readFileSync, writeFileSync, openSync, readSync, closeSync, statSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'public', 'uploads');
const out = join(root, 'src', 'content', 'media-ratios.json');

function head(file, bytes) {
  const fd = openSync(file, 'r');
  try {
    const buf = Buffer.alloc(bytes);
    const n = readSync(fd, buf, 0, bytes, 0);
    return buf.subarray(0, n);
  } finally { closeSync(fd); }
}

function jpeg(file) {
  const buf = readFileSync(file);
  let orientation = 1;
  let i = 2;
  while (i + 4 < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    if (marker === 0xff) { i++; continue; }
    const len = buf.readUInt16BE(i + 2);
    if (marker === 0xe1 && buf.toString('latin1', i + 4, i + 8) === 'Exif') {
      const t = i + 10;
      const le = buf.toString('latin1', t, t + 2) === 'II';
      const u16 = (o) => (le ? buf.readUInt16LE(o) : buf.readUInt16BE(o));
      const u32 = (o) => (le ? buf.readUInt32LE(o) : buf.readUInt32BE(o));
      const ifd = t + u32(t + 4);
      const count = u16(ifd);
      for (let k = 0; k < count; k++) {
        const e = ifd + 2 + k * 12;
        if (u16(e) === 0x0112) orientation = u16(e + 8);
      }
    }
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      const h = buf.readUInt16BE(i + 5), w = buf.readUInt16BE(i + 7);
      return orientation >= 5 ? [h, w] : [w, h];
    }
    i += 2 + len;
  }
  return null;
}

function size(file) {
  const ext = extname(file).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return jpeg(file);
  const b = head(file, 64);
  if (ext === '.png') return b.toString('latin1', 1, 4) === 'PNG' ? [b.readUInt32BE(16), b.readUInt32BE(20)] : null;
  if (ext === '.gif') return [b.readUInt16LE(6), b.readUInt16LE(8)];
  if (ext === '.webp') {
    const kind = b.toString('latin1', 12, 16);
    if (kind === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
    if (kind === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
    if (kind === 'VP8L') {
      const v = b.readUInt32LE(21);
      return [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1];
    }
  }
  return null;
}

const ratios = {};
for (const name of readdirSync(dir).sort()) {
  const file = join(dir, name);
  try {
    if (!statSync(file).isFile()) continue;
    const s = size(file);
    if (s && s[0] > 0 && s[1] > 0) ratios[name] = Math.round((s[0] / s[1]) * 1000) / 1000;
  } catch { /* an unreadable file just has no entry: the page falls back to learning it on load */ }
}
writeFileSync(out, JSON.stringify(ratios));
console.log(`media-ratios: ${Object.keys(ratios).length} pictures`);
