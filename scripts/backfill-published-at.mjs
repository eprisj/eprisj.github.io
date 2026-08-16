#!/usr/bin/env node
/**
 * Give every article a machine-readable publication date.
 *
 * Why this exists: `date` is a free-text field an editor types, and the live
 * content already holds "July 18, 2026", "Jul 30, 2026", "Aug 2, 2026" and
 * "August 15, 2026" side by side. Everything that ordered articles ran that
 * string through Date.parse, so the day someone writes a Cyrillic month or
 * 15.08.2026 the article silently drops to wherever `updatedAt` and `id` put
 * it. `publishedAt` (ISO) is now the field that answers "when", and `date`
 * goes back to being the line a reader sees.
 *
 * Deliberately conservative:
 *   - it never overwrites an existing publishedAt;
 *   - it only writes a date it could parse without guessing. A date it cannot
 *     read is REPORTED, not invented — a wrong date is worse than a missing
 *     one, because a missing one is visible in the admin and a wrong one is
 *     not;
 *   - --dry-run by default. Nothing is written unless --write is passed.
 *
 * WHERE TO RUN IT: on the VPS, against the live content, because that is the
 * copy editors work in. The repository copy arrives by nightly snapshot and a
 * migration made here would be overwritten by the next one.
 *
 *   node scripts/backfill-published-at.mjs <path-to-site-content.json>
 *   node scripts/backfill-published-at.mjs <path> --write
 */
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';

const args = process.argv.slice(2);
const write = args.includes('--write');
const file = args.find((a) => !a.startsWith('--')) || 'src/content/site-content.json';

/**
 * The BASE article list only. publishedAt is base-authoritative (see
 * BASE_AUTHORITATIVE_FIELDS in src/data.ts): a translation bucket's copy is
 * ignored by the merge, so writing one there would create a value that looks
 * authoritative in the JSON and changes nothing on the site.
 */
function articleBuckets(content) {
  return Array.isArray(content.articles) ? [{ label: 'base', list: content.articles }] : [];
}

/**
 * Parse an editor-written date to an ISO day, or return null.
 *
 * Date.parse handles the English forms already in the content. Two shapes it
 * gets wrong rather than rejects are handled first: dd.mm.yyyy and dd/mm/yyyy
 * are read as day-first here, because that is what a European editor means by
 * them, while Date.parse would read 03.04.2026 as March 4th.
 */
function toIso(raw) {
  const value = String(raw || '').trim();
  if (!value) return null;

  const dmy = value.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const day = Number(d), month = Number(m);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return null;
  }

  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  // Local components, NOT toISOString: "July 18, 2026" parses to local
  // midnight, and converting that to UTC moves it back a day east of
  // Greenwich. The first run of this script turned every July 18th into the
  // 17th before this line existed.
  const d = new Date(parsed);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const content = JSON.parse(readFileSync(file, 'utf8'));
const filled = [];
const already = [];
const unreadable = [];

for (const { label, list } of articleBuckets(content)) {
  for (const article of list) {
    if (!article || typeof article !== 'object') continue;
    const where = `${label} #${article.id} "${String(article.title || '').slice(0, 46)}"`;
    if (article.publishedAt) { already.push(where); continue; }
    const iso = toIso(article.date);
    if (iso) {
      article.publishedAt = iso;
      filled.push(`${where}  ${JSON.stringify(article.date)} -> ${iso}`);
    } else {
      unreadable.push(`${where}  date=${JSON.stringify(article.date ?? null)}`);
    }
  }
}

console.log(`file: ${file}`);
console.log(`filled: ${filled.length}   already had publishedAt: ${already.length}   unreadable: ${unreadable.length}`);
if (filled.length) console.log('\nfilled:\n  ' + filled.join('\n  '));
if (unreadable.length) {
  console.log('\nNOT filled — set the date by hand in the admin, these were not guessed:\n  ' + unreadable.join('\n  '));
}

if (!write) {
  console.log('\nDry run. Nothing written. Re-run with --write to apply.');
  process.exit(unreadable.length ? 1 : 0);
}

if (filled.length) {
  const backup = `${file}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  copyFileSync(file, backup);
  writeFileSync(file, JSON.stringify(content, null, 2) + '\n');
  console.log(`\nWritten. Backup: ${backup}`);
} else {
  console.log('\nNothing to write.');
}
process.exit(unreadable.length ? 1 : 0);
