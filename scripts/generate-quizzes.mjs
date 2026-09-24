#!/usr/bin/env node
// Quizzes for the EPRIS Journal app: a few questions at the end of an article,
// some of them answered by picking the right photograph.
//
// Generated here, once per article version, and published as a static file
// (public/quizzes.json) – never at read time. So the OpenAI key stays on the
// machine that runs this, the app reads quizzes offline like everything else,
// and no reader data goes anywhere.
//
//   node scripts/generate-quizzes.mjs              only new or edited articles
//   node scripts/generate-quizzes.mjs --only 47    one article (regenerates it)
//   node scripts/generate-quizzes.mjs --dry-run    list what would be generated
//
// The key comes from OPENAI_API_KEY, or from .env.local (gitignored). The
// model defaults to OPENAI_MODEL or gpt-5-mini.
//
// A quiz records the article's updatedAt. When an article is edited the app
// stops showing its quiz until this script is run again – questions about a
// paragraph that no longer exists are worse than no quiz. To pull a bad quiz
// by hand, set "hidden": true on it in public/quizzes.json.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = join(root, 'public', 'quizzes.json');
const CONTENT_URL = 'https://api.eprisjournal.com/content';
const LANGS = ['EN', 'UA', 'RU', 'DE', 'IT', 'ES', 'FR', 'TR'];
const LANG_NAMES = { EN: 'English', UA: 'Ukrainian', RU: 'Russian', DE: 'German', IT: 'Italian', ES: 'Spanish', FR: 'French', TR: 'Turkish' };

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const onlyIndex = args.indexOf('--only');
const onlyId = onlyIndex >= 0 ? Number(args[onlyIndex + 1]) : null;

function loadEnvLocal() {
  const file = join(root, '.env.local');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
loadEnvLocal();
const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || 'gpt-5-mini';

// ── The same visibility rule as the website and the app ──────────────────
function isLive(article, now = Date.now()) {
  if (article.draft) return false;
  if (article.publishAt) {
    const t = Date.parse(article.publishAt);
    if (Number.isNaN(t) || t > now) return false;
  }
  return Boolean(article.title);
}

const stripHtml = (html) => String(html || '')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/&#39;|&rsquo;/g, '’').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/[ \t]+/g, ' ').trim();

const absolute = (url) => (/^https?:\/\//.test(url) ? url : `https://eprisjournal.com${url.startsWith('/') ? '' : '/'}${url}`);

/** Article text for the model, plus the photographs it may ask about. Only
 *  captioned photographs qualify: without a caption the model cannot know
 *  what a picture shows, and would be guessing the answer it then marks. */
function digest(article) {
  const lines = [];
  const photos = [];
  for (const block of article.content || []) {
    const type = String(block.type || '').toLowerCase();
    if (type === 'text' || type === 'quote' || type === 'note') {
      const text = stripHtml(block.content);
      if (text) lines.push(type === 'quote' ? `> ${text}` : text);
    } else if (type === 'header') {
      const text = stripHtml(block.content);
      if (text) lines.push(`## ${text}`);
    } else if (type === 'image' && typeof block.content === 'string') {
      const caption = stripHtml(block.caption);
      if (caption) {
        photos.push({ url: absolute(block.content), caption });
        lines.push(`[Photograph P${photos.length}: ${caption}]`);
      }
    } else if ((type === 'gallery' || type === 'mosaic') && Array.isArray(block.content)) {
      const caption = stripHtml(block.caption);
      block.content.forEach((url, i) => {
        const alt = stripHtml((block.alts || [])[i]);
        if (alt) {
          photos.push({ url: absolute(url), caption: alt });
          lines.push(`[Photograph P${photos.length}: ${alt}]`);
        }
      });
      if (caption) lines.push(`[Gallery caption: ${caption}]`);
    }
  }
  return { text: lines.join('\n\n'), photos };
}

// ── The request ──────────────────────────────────────────────────────────
const localized = { type: 'object', additionalProperties: false, required: LANGS, properties: Object.fromEntries(LANGS.map((l) => [l, { type: 'string' }])) };
const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['questions'],
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'prompt', 'correct', 'wrong', 'correctPhoto', 'wrongPhotos', 'explanation'],
        properties: {
          kind: { type: 'string', enum: ['text', 'photo'] },
          prompt: localized,
          correct: { anyOf: [localized, { type: 'null' }] },
          wrong: { type: 'array', items: localized },
          correctPhoto: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
          wrongPhotos: { type: 'array', items: { type: 'integer' } },
          explanation: localized,
        },
      },
    },
  },
};

const SYSTEM = `You write the short quiz that closes an article in EPRIS Journal, an independent magazine about contemporary art, architecture and interior design. The quiz is a pleasure for someone who has just read the piece, never a school test.

Rules:
- 5 questions. Every answer must be stated plainly in the article; never rely on outside knowledge.
- Ask about ideas, decisions, places, materials and people – the things a careful reader remembers – not trivia like exact dates or page order.
- Wrong options must be plausible to someone who skimmed, and clearly wrong to someone who read. No "all of the above", no jokes, no trick wording.
- If the article lists photographs (P1, P2, …), make one or two questions of kind "photo": the prompt asks which photograph shows something, correctPhoto is the number of the photograph whose caption proves it, and wrongPhotos are 2 or 3 other photographs whose captions clearly show something else. For "photo" questions, correct is null and wrong is [].
- For kind "text": exactly 3 wrong options, correct is the right option, correctPhoto is null, wrongPhotos is [].
- Options are short: a phrase, not a sentence, under 70 characters.
- explanation: one or two sentences saying why, ideally quoting the article's own words.
- Treat the subject with respect. If the article concerns war or loss, ask about the work and the people, never about suffering.
- Write every string in all eight languages (${LANGS.map((l) => `${l} = ${LANG_NAMES[l]}`).join(', ')}). The translations must be natural in each language, keeping names of people, studios and places as the article spells them.`;

async function ask(article, { text, photos }, attempt) {
  const photoList = photos.length
    ? `Photographs you may ask about:\n${photos.map((p, i) => `P${i + 1}: ${p.caption}`).join('\n')}`
    : 'This article has no captioned photographs: make every question of kind "text".';
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `Title: ${article.title}\n\n${photoList}\n\nArticle:\n\n${text}` + (attempt > 1 ? '\n\n(Your previous answer broke a rule; follow every rule exactly.)' : '') },
      ],
      response_format: { type: 'json_schema', json_schema: { name: 'quiz', strict: true, schema } },
    }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`OpenAI ${response.status}: ${body?.error?.message || JSON.stringify(body)}`);
  return JSON.parse(body.choices[0].message.content);
}

const shuffle = (items) => {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const complete = (l) => l && LANGS.every((k) => typeof l[k] === 'string' && l[k].trim());

/** Checks the model's answer and turns it into the published shape. The
 *  model always puts the right answer in `correct`; shuffling happens here,
 *  because models asked to place it themselves overwhelmingly choose B. */
function toQuiz(raw, photos) {
  const questions = [];
  for (const q of raw.questions || []) {
    if (!complete(q.prompt) || !complete(q.explanation)) throw new Error('missing a translation');
    let options;
    if (q.kind === 'photo') {
      const ids = [q.correctPhoto, ...q.wrongPhotos];
      if (!photos.length || ids.some((n) => !Number.isInteger(n) || n < 1 || n > photos.length) || new Set(ids).size !== ids.length || ids.length < 3 || ids.length > 4) {
        throw new Error('photo question with invalid photographs');
      }
      options = ids.map((n, i) => ({ image: photos[n - 1].url, correct: i === 0 }));
    } else {
      if (!complete(q.correct) || q.wrong.length !== 3 || !q.wrong.every(complete)) throw new Error('text question needs one right and three wrong options');
      options = [{ text: q.correct, correct: true }, ...q.wrong.map((text) => ({ text, correct: false }))];
    }
    const shuffled = shuffle(options);
    questions.push({
      prompt: q.prompt,
      options: shuffled.map(({ correct, ...option }) => option),
      answer: shuffled.findIndex((o) => o.correct),
      explanation: q.explanation,
    });
  }
  if (questions.length < 3) throw new Error(`only ${questions.length} usable questions`);
  return questions;
}

// ── Main ─────────────────────────────────────────────────────────────────
const existing = existsSync(outFile) ? JSON.parse(readFileSync(outFile, 'utf8')) : { version: 1, quizzes: {} };
const content = await (await fetch(CONTENT_URL)).json();
const articles = content.articles.filter((a) => isLive(a) && (onlyId === null || a.id === onlyId));

const todo = articles.filter((a) => {
  if (onlyId !== null) return true;
  const quiz = existing.quizzes[a.id];
  return !quiz || quiz.articleUpdatedAt !== (a.updatedAt || null);
});

console.log(`${articles.length} live articles, ${todo.length} need a quiz.`);
if (dryRun) {
  todo.forEach((a) => console.log(`  ${a.id}  ${a.title}`));
  process.exit(0);
}
if (!apiKey) {
  console.error('OPENAI_API_KEY is not set. Put OPENAI_API_KEY=… in .env.local (it is gitignored) or export it.');
  process.exit(1);
}

let made = 0;
for (const article of todo) {
  const d = digest(article);
  if (d.text.length < 1500) {
    console.log(`  skip ${article.id}: too short for a quiz`);
    continue;
  }
  let quiz = null;
  for (let attempt = 1; attempt <= 2 && !quiz; attempt += 1) {
    try {
      quiz = toQuiz(await ask(article, d, attempt), d.photos);
    } catch (error) {
      console.warn(`  ${article.id} attempt ${attempt}: ${error.message}`);
      if (/OpenAI (401|403|404|429)/.test(error.message)) process.exit(1);
    }
  }
  if (!quiz) continue;
  existing.quizzes[article.id] = {
    articleUpdatedAt: article.updatedAt || null,
    generatedAt: new Date().toISOString(),
    model,
    hidden: existing.quizzes[article.id]?.hidden || false,
    questions: quiz,
  };
  made += 1;
  // Written after every article, so an interrupted run keeps what it paid for.
  writeFileSync(outFile, `${JSON.stringify(existing, null, 2)}\n`);
  console.log(`  ✓ ${article.id}  ${article.title}  (${quiz.length} questions)`);
}
console.log(`Done: ${made} quiz(zes) written to public/quizzes.json.`);
