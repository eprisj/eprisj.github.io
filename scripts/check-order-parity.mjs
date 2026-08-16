#!/usr/bin/env node
/**
 * The order of articles is decided twice, and this checks the two agree.
 *
 * src/data.ts owns the real rule (orderArticles). The admin's "Порядок статей"
 * screen has to show the same sequence while you arrange it, and it is a static
 * page that cannot import the site's TypeScript, so it carries a small copy
 * (resolveArticleOrder in public/admin/app.js). A copy that quietly drifts is
 * worse than no preview at all: the editor would arrange one order and readers
 * would get another.
 *
 * So: bundle the real one, lift the admin's one out of app.js by name, run both
 * over the same articles across every ordering shape, and fail on any
 * disagreement.
 *
 *   node scripts/check-order-parity.mjs
 */
import { build } from 'esbuild';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Pull a top-level `function name(...) { ... }` out of a source file by brace matching. */
function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`${name} not found`);
  let depth = 0;
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`${name} has no closing brace`);
}

const entry = join(tmpdir(), `epris-order-entry-${process.pid}.ts`);
const bundle = join(tmpdir(), `epris-order-bundle-${process.pid}.cjs`);
writeFileSync(entry, `export { orderArticles } from ${JSON.stringify(new URL('../src/data.ts', import.meta.url).pathname)};\n`);
await build({
  entryPoints: [entry],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: bundle,
  loader: { '.json': 'json' },
  logLevel: 'error',
});
const { orderArticles } = await import(bundle);

const adminSource = readFileSync(new URL('../public/admin/app.js', import.meta.url), 'utf8');
/* The extracted function closes over two tiny helpers from the same IIFE.
   They are lifted out by name as well, so this check keeps testing the admin's
   real code rather than a re-typed approximation of it. */
const adminHelpers = `
  const num = (v) => Number(v);
  ${extractFunction(adminSource, 'stampOf')}
`;
const resolveArticleOrder = new Function(
  `${adminHelpers}\n${extractFunction(adminSource, 'resolveArticleOrder')}\nreturn resolveArticleOrder;`,
)();

const articles = [
  { id: 8, publishedAt: '2026-03-14' },
  { id: 9, publishedAt: '2026-05-20' },
  { id: 17, publishedAt: '2026-07-30' },
  { id: 19, publishedAt: '2026-08-11' },
  { id: 22, publishedAt: '2026-08-15' },
  { id: 77, date: 'Aug 20, 2026' },      // legacy: display date only
  { id: 99, date: 'не дата' },           // unreadable: must sink, not crash
];

const cases = [
  {},
  { mode: 'chronological' },
  { pinned: [9, 8] },
  { pinned: [4242, 9] },                 // pinned id that no longer exists
  { pinned: [9, 9, 8] },                 // duplicate pin
  { mode: 'manual', manualOrder: [8, 9] },
  { mode: 'manual', manualOrder: [8, 9], unplaced: 'bottom' },
  { mode: 'manual', manualOrder: [22, 21, 20], unplaced: 'bottom', pinned: [8] },
  { mode: 'manual', manualOrder: [] },
];

const ids = (list) => list.map((a) => Number(a.id)).join(',');
let failed = 0;
for (const [i, settings] of cases.entries()) {
  const site = ids(orderArticles(articles, settings));
  const admin = ids(resolveArticleOrder(articles, settings));
  const complete = new Set(orderArticles(articles, settings).map((a) => a.id)).size === articles.length;
  const ok = site === admin && complete;
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} case ${i}  ${JSON.stringify(settings)}`);
  if (!ok) console.log(`      site : ${site}\n      admin: ${admin}\n      keeps every article: ${complete}`);
}

unlinkSync(entry);
unlinkSync(bundle);
console.log(failed ? `\n${failed} case(s) disagree.` : `\nAll ${cases.length} cases agree.`);
process.exit(failed ? 1 : 0);
