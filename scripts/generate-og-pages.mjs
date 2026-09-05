import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');
const contentPath = join(rootDir, 'src', 'content', 'site-content.json');
const SITE_ORIGIN = 'https://eprisjournal.com';
const DEFAULT_IMAGE = `${SITE_ORIGIN}/images/featured.png`;
const SITE_NAME = 'EPRIS Journal';
const SITE_DESCRIPTION = 'Independent international journal and cultural platform exploring contemporary art, architecture, interior design, artists, designers and cities in context.';
const SITE_KEYWORDS = [
  'EPRIS Journal',
  'contemporary art',
  'architecture',
  'interior design',
  'design journal',
  'art interviews',
  'design interviews',
  'emerging architects',
  'emerging artists',
  'cultural journalism',
];
const HREFLANG = {
  EN: 'en',
  RU: 'ru',
  UA: 'uk',
  TR: 'tr',
  DE: 'de',
  IT: 'it',
  ES: 'es',
};

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function resolveImage(article) {
  const raw = article.imageUrl || article.imageSeed || '';
  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('/')) {
    if (raw.startsWith('/')) return `${SITE_ORIGIN}${raw}`;
    return raw;
  }
  return raw ? `https://picsum.photos/seed/${encodeURIComponent(raw)}/1200/630?grayscale` : DEFAULT_IMAGE;
}

function escapeAttr(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/* Пошуковий сніпет — не те саме поле, що редакційний вступний абзац.
 *
 * article.excerpt пишеться як перший абзац під заголовком на самій сторінці:
 * там йому природно бути на чотириста-п'ятсот символів. У <meta
 * name="description">, og:description і twitter:description той самий
 * текст лягав без жодного обрізання — Google різав його на середині слова
 * десь у районі 155-160 символів (а частіше просто ігнорував і сам
 * переписував сніпет з тіла статті, тобто вся ретельно написана фраза йшла
 * в нікуди), а картка в Telegram/Twitter показувала абзац, обірваний на
 * середині речення. Structured data (NewsArticle.description) лишає повний
 * excerpt — там довжина не карається так само жорстко і опис справді описує
 * статтю, а не намагається вміститись в один рядок видачі. */
function metaDescription(text, max = 155) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const sentence = clean.slice(0, max + 1).match(/^.*[.!?](?=\s|$)/);
  if (sentence && sentence[0].length >= max * 0.55) return sentence[0].trim();
  const cut = clean.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' '))}\u2026`;
}

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function formatDate(value) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function stripHtml(value = '') {
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function blockText(block) {
  if (!block || typeof block.content !== 'string') return '';
  if (!['text', 'header', 'quote', 'note'].includes(block.type)) return '';
  return stripHtml(block.content);
}

function articleBody(article) {
  return (article.content || []).map(blockText).filter(Boolean).join('\n\n');
}


/* Пререндер бачив лише <title> і мету: у тілі сторінки не було ні тексту,
   ні посилань, ні h1 — статтю індексувати було нічим. React під час
   монтування вміст #root затирає, тому цей блок нічого не ламає, зате
   краулер без JS бачить справжній матеріал, а користувач на повільному
   зв'язку читає текст ще до завантаження застосунку. */
const PRERENDER_STYLE = `<style>
    /* Видно лише до монтування React (createRoot затирає вміст #root).
       Мета не намалювати сторінку наново, а щоб ці півсекунди на
       повільному зв'язку виглядали як текст, а не як зламана верстка. */
    .pre-doc{max-width:44rem;margin:0 auto;padding:5vh 6vw 12vh;
      font-family:'PT Serif',Georgia,serif;line-height:1.65;color:#2b2b2b}
    .pre-doc h1{font-family:'Playfair Display',Georgia,serif;font-weight:600;
      font-size:clamp(28px,4.6vw,44px);line-height:1.15;margin:0 0 .6em}
    .pre-doc h2{font-family:'Playfair Display',Georgia,serif;font-weight:600;
      font-size:clamp(19px,2.4vw,25px);margin:2em 0 .5em}
    .pre-doc p{margin:0 0 1.15em}
    .pre-doc small{color:#777;font-family:'PT Sans',system-ui,sans-serif;font-size:14px}
    .pre-doc blockquote{margin:1.6em 0;padding-left:1.1em;border-left:2px solid #ddd;
      font-style:italic;color:#555}
    .pre-doc ul{padding-left:1.1em}
    .pre-doc li{margin:0 0 .5em}
    .pre-doc a{color:#2b2b2b}
    .pre-doc img{max-width:100%;height:auto;display:block;margin:0 0 1.4em}
  </style>`;

function prerenderBody(html) {
  return `<div id="root">${PRERENDER_STYLE}<div class="pre-doc">${html}</div></div>`;
}

function articleParagraphs(article) {
  return (article.content || [])
    .map((block) => {
      if (!block || typeof block.content !== 'string') return '';
      const text = stripHtml(block.content).trim();
      if (!text) return '';
      if (block.type === 'header') return `<h2>${escapeHtml(text)}</h2>`;
      if (block.type === 'quote') return `<blockquote><p>${escapeHtml(text)}</p></blockquote>`;
      if (['text', 'note'].includes(block.type)) return `<p>${escapeHtml(text)}</p>`;
      return '';
    })
    .filter(Boolean)
    .join('\n');
}

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}


function relatedLinks(current) {
  const same = publicArticles.filter((a) =>
    a.id !== current.id && a.category && a.category === current.category);
  const rest = publicArticles.filter((a) =>
    a.id !== current.id && !same.includes(a));
  const picked = [...same, ...rest].slice(0, 6);
  if (!picked.length) return '';
  return `<h2>Read next</h2><ul>${picked.map((a) =>
    `<li><a href="${SITE_ORIGIN}/article/${generateSlug(a.title)}/">${escapeHtml(a.title)}</a></li>`
  ).join('')}</ul>`;
}

function articleKeywords(article) {
  return Array.from(new Set([
    ...(article.tags || []),
    article.category,
    article.subcategory,
    'EPRIS Journal',
    'architecture',
    'design',
    'contemporary art',
  ].filter(Boolean))).join(', ');
}

function alternateLinks() {
  /* Раніше сюди йшло сім тегів hreflang, і всі вели на ту саму адресу.
     Анотація має пов'язувати РІЗНІ URL різними мовами; коли адреса одна,
     Google групу просто відкидає. Переклад у журналі перемикається на
     клієнті й окремих адрес не має, тому теги прибрані. Повернути їх
     можна буде разом із маршрутами виду /ru/article/<slug>/. */
  return '';
}

function breadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

const indexHtml = readFileSync(join(distDir, 'index.html'), 'utf-8');
const content = JSON.parse(readFileSync(contentPath, 'utf-8'));

// Static route/SEO pages must follow the same publication rules as the app.
// Otherwise an untouched editor blueprint is hidden in the React feed but its
// URL (and an indexable sitemap entry) is still generated during deployment.
const PLACEHOLDER_TITLES = new Set([
  'new editorial story', 'new practical guide', 'new photo essay',
  'new review', 'new gallery item', 'new file',
  'neues galerieelement', 'nuevo elemento de la galería', 'yeni galeri öğesi',
  'nuovo elemento della galleria', 'новый элемент галереи', 'новий елемент галереї',
  'neue redaktionelle geschichte', 'nueva historia editorial', 'yeni editoryal hikaye',
  'nuova storia editoriale', 'новая редакционная история', 'нова редакційна історія',
]);
const PLACEHOLDER_PHRASES = [
  'replace me', 'replace with real copy before publishing',
  'замініть мене', 'замініть на справжню копію', 'замените меня',
  'замените реальной копией', 'ersetze mich', 'reemplázame',
  'beni değiştir', 'sostituiscimi',
];
function isPublicEntry(entry) {
  if (!entry || entry.draft === true) return false;
  const title = String(entry.title || '').trim().toLowerCase();
  if (PLACEHOLDER_TITLES.has(title)) return false;
  const copy = [entry.subtitle, entry.description, entry.excerpt]
    .filter((value) => typeof value === 'string')
    .join(' ')
    .toLowerCase();
  if (PLACEHOLDER_PHRASES.some((phrase) => copy.includes(phrase))) return false;
  const publishAt = entry.publishAt ? Date.parse(entry.publishAt) : NaN;
  return !(Number.isFinite(publishAt) && publishAt > Date.now());
}
const publicArticles = (content.articles || []).filter(isPublicEntry);
const publicReviews = (content.reviews || []).filter(isPublicEntry);

// Strip all existing OG/twitter/description meta tags and title from template
let template = indexHtml
  .replace(/<title>[^<]*<\/title>/, '<!--TITLE-->')
  .replace(/<meta\s+(?:property|name)="(?:og:|twitter:|description)[^"]*"\s+content="[^"]*"\s*\/?>/g, '')
  .replace(/<meta\s+name="keywords"\s+content="[^"]*"\s*\/?>/g, '')
  .replace(/<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/g, '')
  .replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/g, '')
  .replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/g, '')
  .replace(/\n\s*\n/g, '\n');

for (const article of publicArticles) {
  const slug = generateSlug(article.title);
  const imageUrl = resolveImage(article);
  // Повний текст іде тільки в structured data (нижче, articleSchema.description);
  // усе, що показується як сніпет чи картка, обрізане metaDescription().
  const excerpt = escapeAttr(metaDescription(article.excerpt));
  const title = escapeAttr(article.title);
  const url = `${SITE_ORIGIN}/article/${slug}/`;
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    alternativeHeadline: article.subcategory || undefined,
    description: article.excerpt || '',
    image: [imageUrl],
    datePublished: formatDate(article.date),
    dateModified: formatDate(article.updatedAt) || formatDate(article.date),
    author: { '@type': 'Person', name: article.author || 'EPRIS Editorial' },
    articleSection: article.category || undefined,
    keywords: articleKeywords(article),
    articleBody: articleBody(article) || undefined,
    wordCount: articleBody(article).split(/\s+/).filter(Boolean).length || undefined,
    inLanguage: 'en',
    mainEntityOfPage: url,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_ORIGIN,
      logo: { '@type': 'ImageObject', url: DEFAULT_IMAGE },
    },
  };
  const breadcrumbs = breadcrumbSchema([
    { name: 'EPRIS Journal', url: `${SITE_ORIGIN}/` },
    { name: 'Articles', url: `${SITE_ORIGIN}/articles` },
    { name: article.title, url },
  ]);

  const headBlock = `<title>${article.title} \u2014 EPRIS Journal</title>
    ${imageUrl ? `<link rel="preload" as="image" href="${escapeAttr(imageUrl)}" fetchpriority="high" />` : ''}
    <meta name="description" content="${excerpt}" />
    <meta name="keywords" content="${escapeAttr(articleKeywords(article))}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <link rel="canonical" href="${url}" />
        <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${excerpt}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:alt" content="${title}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${url}" />
    <meta property="og:site_name" content="EPRIS Journal" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${excerpt}" />
    <meta name="twitter:image" content="${imageUrl}" />
    <script type="application/ld+json">${safeJson(articleSchema)}</script>
    <script type="application/ld+json">${safeJson(breadcrumbs)}</script>`;

  const bodyHtml = prerenderBody(`<article>
      <h1>${escapeHtml(article.title)}</h1>
      ${article.subcategory ? `<p><strong>${escapeHtml(article.subcategory)}</strong></p>` : ''}
      ${article.excerpt ? `<p>${escapeHtml(article.excerpt)}</p>` : ''}
      <p><small>${escapeHtml(article.author || 'EPRIS Editorial')}${
        formatDate(article.date) ? ` · ${String(formatDate(article.date)).slice(0, 10)}` : ''}</small></p>
      ${imageUrl ? `<p><img src="${escapeAttr(imageUrl)}" alt="${title}" width="1200" height="800" /></p>` : ''}
      ${articleParagraphs(article)}
      ${relatedLinks(article)}
      <nav><a href="${SITE_ORIGIN}/articles/">All articles</a> · <a href="${SITE_ORIGIN}/">EPRIS Journal</a></nav>
    </article>`);
  const pageHtml = template
    .replace('<!--TITLE-->', headBlock)
    .replace('<div id="root"></div>', bodyHtml);

  // Write slug-based path
  const slugDir = join(distDir, 'article', slug);
  mkdirSync(slugDir, { recursive: true });
  writeFileSync(join(slugDir, 'index.html'), pageHtml);

  // Also write numeric ID path for backward compatibility
  const idDir = join(distDir, 'article', String(article.id));
  mkdirSync(idDir, { recursive: true });
  writeFileSync(join(idDir, 'index.html'), pageHtml);

  console.log(`Generated: /article/${slug} (id=${article.id})`);
}

console.log(`\nGenerated OG pages for ${publicArticles.length} articles.`);

// ── Reviews ──────────────────────────────────────────────────────────────────
// Reviews live at readable /review/<slug> URLs like articles do, so they get
// the same real landing page: correct <title>, a share preview, and Review
// schema. The numeric /review/<id> path stays as a redirect-free duplicate so
// links handed out before slugs existed keep resolving.
const reviewPlainBody = (review) => Array.isArray(review.content)
  ? review.content.map(blockText).filter(Boolean).join('\n\n')
  : String(review.content || '');

for (const review of publicReviews) {
  const slug = generateSlug(review.title || '');
  const imageUrl = resolveImage(review);
  const summary = review.verdict || reviewPlainBody(review).slice(0, 200);
  const excerpt = escapeAttr(metaDescription(summary));
  const title = escapeAttr(review.title || '');
  const url = `${SITE_ORIGIN}/review/${slug || review.id}/`;
  const reviewSchema = {
    '@context': 'https://schema.org',
    '@type': 'Review',
    name: review.title,
    reviewBody: reviewPlainBody(review),
    itemReviewed: { '@type': 'Thing', name: review.subject || review.title },
    author: { '@type': 'Person', name: review.author || 'EPRIS Editorial' },
    image: [imageUrl],
    inLanguage: 'en',
    mainEntityOfPage: url,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_ORIGIN,
      logo: { '@type': 'ImageObject', url: DEFAULT_IMAGE },
    },
  };
  const breadcrumbs = breadcrumbSchema([
    { name: 'EPRIS Journal', url: `${SITE_ORIGIN}/` },
    { name: 'Reviews', url: `${SITE_ORIGIN}/reviews` },
    { name: review.title, url },
  ]);

  const headBlock = `<title>${review.title} — EPRIS Journal</title>
    <meta name="description" content="${excerpt}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <link rel="canonical" href="${url}" />
        <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${excerpt}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:alt" content="${title}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${url}" />
    <meta property="og:site_name" content="EPRIS Journal" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${excerpt}" />
    <meta name="twitter:image" content="${imageUrl}" />
    <script type="application/ld+json">${safeJson(reviewSchema)}</script>
    <script type="application/ld+json">${safeJson(breadcrumbs)}</script>`;

  const bodyHtml = prerenderBody(`<article>
      <h1>${escapeHtml(review.title || '')}</h1>
      ${review.subject ? `<p><strong>${escapeHtml(review.subject)}</strong></p>` : ''}
      ${review.verdict ? `<p>${escapeHtml(review.verdict)}</p>` : ''}
      <p><small>${escapeHtml(review.author || 'EPRIS Editorial')}${
        formatDate(review.date) ? ` · ${String(formatDate(review.date)).slice(0, 10)}` : ''}</small></p>
      ${articleParagraphs(review)}
      <nav><a href="${SITE_ORIGIN}/reviews/">All reviews</a> · <a href="${SITE_ORIGIN}/">EPRIS Journal</a></nav>
    </article>`);
  const pageHtml = template
    .replace('<!--TITLE-->', headBlock)
    .replace('<div id="root"></div>', bodyHtml);

  if (slug) {
    const slugDir = join(distDir, 'review', slug);
    mkdirSync(slugDir, { recursive: true });
    writeFileSync(join(slugDir, 'index.html'), pageHtml);
  }
  const idDir = join(distDir, 'review', String(review.id));
  mkdirSync(idDir, { recursive: true });
  writeFileSync(join(idDir, 'index.html'), pageHtml);

  console.log(`Generated: /review/${slug || review.id} (id=${review.id})`);
}

// ── SPA deep-link routes ─────────────────────────────────────────────────────
// GitHub Pages has no SPA fallback: a direct hit on /studio, /issue, etc.
// returns its own 404. We emit a static <route>/index.html (a copy of the app
// shell) for every known tab route so deep-links resolve with HTTP 200, and a
// catch-all 404.html so any other path still boots the SPA (client router then
// reads window.location.pathname and renders the right view).
const ROUTES = {
  articles: 'Articles',
  reviews: 'Reviews',
  music: 'Music',
  about: 'About',
  manifest: 'Manifesto',
  studio: 'Studio',
  issue: 'Issue',
  design: 'Design',
  radio: 'Radio',
  podcasts: 'Podcasts',
  collaboation: 'Collaboration Registry',
  collaboration: 'Collaboration Registry',
  collab: 'Collaboration Registry',
  bureau: 'Bureau — how the work is put together',
  museum: 'EPRIS Museum',
  vitrine: 'EPRIS Museum',
  futuroshock: 'EPRIS Museum',
  showcase: 'Showcase — Set Design & Conceptual Art',
  works: 'Showcase — Set Design & Conceptual Art',
  set: 'Showcase — Set Design & Conceptual Art',
  stage: 'Stage — a scene-building tool by EPRIS Bureau',
  codex: 'Как работать с машиной · мануал редакции',
  expertise: 'Машина в искусствоведческой экспертизе · курс',
};

const SHOWCASE_DESCRIPTION = 'A vitrine of set design, scenography and conceptual art by emerging authors worldwide, curated and open for submissions by EPRIS Journal.';
// «museum» на цьому хості лише перенаправляє на museum.eprisjournal.com
// (правило в nginx), тож у карті сайту йому не місце: адреса, яка
// відповідає редиректом, марно витрачає обхід і світиться помилкою.
// «music» тим самим: DEFAULT_SECTION_VISIBILITY в src/data.ts тримає
// page:false, доки немає реального контенту - SPA миттєво відкидає
// відвідувача з /music на запасну вкладку. Прибрати звідси, коли розділ
// увімкнуть (переставити visibility на true в data.ts чи через адмінку).
const HIDDEN_PUBLIC_ROUTES = new Set(['showcase', 'works', 'set', 'museum', 'music']);

const ROUTE_DESCRIPTIONS = {
  articles: 'Editorial stories, interviews and research on contemporary art, architecture, interiors, design and cultural cities.',
  reviews: 'Independent EPRIS reviews of exhibitions, books, design, architecture and contemporary visual culture.',
  music: 'Interviews with musicians and artists, and EPRIS reviews of albums, releases and live performances.',
  about: 'Meet EPRIS, an independent international journal and cultural platform for art, architecture and interior design.',
  manifest: 'The EPRIS declaration on meaningful modernity, cultural accessibility and independent editorial practice.',
  studio: 'Editorial, visual and cultural projects by EPRIS Studio.',
  issue: 'Read the current digital issue of EPRIS Journal.',
  design: 'A curated selection of contemporary furniture, objects and interior design by EPRIS.',
  radio: 'Listen to EPRIS Radio: sound, music and cultural programming.',
  podcasts: 'Conversations and audio stories about contemporary art, architecture, design and cities.',
  collaboation: 'Discover and suggest emerging architects, designers and artists for EPRIS Journal interviews and editorial collaborations.',
  collaboration: 'Discover and suggest emerging architects, designers and artists for EPRIS Journal interviews and editorial collaborations.',
  collab: 'Discover and suggest emerging architects, designers and artists for EPRIS Journal interviews and editorial collaborations.',
  bureau: 'Breakdowns of the moves behind set design and installation: the gesture, what holds it up and where it breaks — written by the EPRIS editorial.',
  museum: 'A living museum collection of works by Ukrainian artists, designers and architects, curated by EPRIS Journal.',
  vitrine: 'A living museum collection of works by Ukrainian artists, designers and architects, curated by EPRIS Journal.',
  futuroshock: 'A living museum collection of works by Ukrainian artists, designers and architects, curated by EPRIS Journal.',
  showcase: SHOWCASE_DESCRIPTION,
  works: SHOWCASE_DESCRIPTION,
  set: SHOWCASE_DESCRIPTION,
  stage: 'Build a scene in metres — plan, section and volume driven by one model — and try the moves from EPRIS Bureau on it.',
  codex: 'Мануал для тех, кто ведёт исследование в искусстве: как превратить тему в вопрос, смотреть на вещь и работать с фрагментом, не смешать первоисточник с чужим выводом, разобрать корпус текстов, проверить цитаты, собрать и посчитать данные о собрании. Токены и цена простыми словами. Полные разборы на живых музейных данных, включая случай, где честный ответ это «по этим данным нельзя». С адресами источников и библиотекой запросов.',
  expertise: 'Курс Вячеслава Мунистера для тех, кто подписывает экспертные заключения. Девять модулей: провенанс и его разрывы, границы стилистической атрибуции, тиражная скульптура и посмертные отливки, датировка по материалу и документам, чтение лабораторных отчётов, признаки сконструированной истории бытования, структура заключения и ответственность. С заданиями на собственном материале.',
};

// Aliases that must not compete with their canonical route in search results.
const ALIAS_ROUTES = { collaboation: 'collaboration', collab: 'collaboration', works: 'showcase', set: 'showcase', futuroshock: 'museum', vitrine: 'museum' };

function routeHead(route, label) {
  const canonicalRoute = ALIAS_ROUTES[route] || route;
  const url = canonicalRoute ? `${SITE_ORIGIN}/${canonicalRoute}/` : `${SITE_ORIGIN}/`;
  const description = ROUTE_DESCRIPTIONS[route] || 'Independent international journal and cultural platform exploring contemporary art, architecture, interior design and cities in context.';
  const schema = {
    '@context': 'https://schema.org',
    '@type': route ? (route === 'issue' ? 'PublicationIssue' : 'CollectionPage') : 'WebSite',
    name: `${label} — EPRIS Journal`,
    url,
    description,
    isPartOf: route ? { '@type': 'WebSite', name: SITE_NAME, url: SITE_ORIGIN } : undefined,
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_ORIGIN, logo: DEFAULT_IMAGE },
  };
  const organizationSchema = !route ? {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    alternateName: 'EPRIS',
    url: SITE_ORIGIN,
    logo: DEFAULT_IMAGE,
  } : null;
  const breadcrumbs = route ? breadcrumbSchema([
    { name: SITE_NAME, url: `${SITE_ORIGIN}/` },
    { name: label, url },
  ]) : null;
  return `<title>${label} — EPRIS Journal</title>
    <meta name="description" content="${escapeAttr(description)}" />
    <meta name="keywords" content="${escapeAttr(SITE_KEYWORDS.join(', '))}" />
    <meta name="robots" content="${ALIAS_ROUTES[route] || HIDDEN_PUBLIC_ROUTES.has(route) ? 'noindex, follow' : 'index, follow, max-image-preview:large'}" />
    <link rel="canonical" href="${url}" />
        <meta property="og:title" content="${label} — EPRIS Journal" />
    <meta property="og:description" content="${escapeAttr(description)}" />
    <meta property="og:image" content="${DEFAULT_IMAGE}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${url}" />
    <meta property="og:site_name" content="EPRIS Journal" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${label} — EPRIS Journal" />
    <meta name="twitter:description" content="${escapeAttr(description)}" />
    <meta name="twitter:image" content="${DEFAULT_IMAGE}" />
    <script type="application/ld+json">${safeJson(schema)}</script>
    ${organizationSchema ? `<script type="application/ld+json">${safeJson(organizationSchema)}</script>` : ''}
    ${breadcrumbs ? `<script type="application/ld+json">${safeJson(breadcrumbs)}</script>` : ''}`;
}

const articleLinks = publicArticles.map((a) =>
  `<li><a href="${SITE_ORIGIN}/article/${generateSlug(a.title)}/">${escapeHtml(a.title)}</a>` +
  `${a.excerpt ? ` — ${escapeHtml(String(a.excerpt).slice(0, 140))}` : ''}</li>`).join('\n');
const reviewLinks = publicReviews.map((r) => {
  const sl = generateSlug(r.title || '');
  return `<li><a href="${SITE_ORIGIN}/review/${sl || r.id}/">${escapeHtml(r.title || '')}</a></li>`;
}).join('\n');
const sectionLinks = Object.entries(ROUTES)
  .filter(([r]) => !ALIAS_ROUTES[r] && !HIDDEN_PUBLIC_ROUTES.has(r) && r)
  .map(([r, l]) => `<li><a href="${SITE_ORIGIN}/${r}/">${escapeHtml(l)}</a></li>`).join('\n');

function routeBody(route, label) {
  let list = sectionLinks;
  if (route === 'articles') list = articleLinks;
  else if (route === 'reviews') list = reviewLinks;
  const heading = route ? label : SITE_NAME;
  return prerenderBody(`<main>
      <h1>${escapeHtml(heading)}</h1>
      <p>${escapeAttr(ROUTE_DESCRIPTIONS[route] || '')}</p>
      <ul>${list}</ul>
      ${route !== 'articles' ? `<h2>Latest articles</h2><ul>${articleLinks}</ul>` : ''}
    </main>`);
}

for (const [route, label] of Object.entries(ROUTES)) {
  const pageHtml = template
    .replace('<!--TITLE-->', routeHead(route, label))
    .replace('<div id="root"></div>', routeBody(route, label));
  const routeDir = join(distDir, route);
  mkdirSync(routeDir, { recursive: true });
  writeFileSync(join(routeDir, 'index.html'), pageHtml);
  console.log(`Generated: /${route}`);
}

const searchHead = `<title>Search — EPRIS Journal</title>
    <meta name="description" content="Search articles, authors, places and topics across EPRIS Journal." />
    <meta name="robots" content="noindex, follow" />
    <link rel="canonical" href="${SITE_ORIGIN}/search" />`;
const searchDir = join(distDir, 'search');
mkdirSync(searchDir, { recursive: true });
writeFileSync(join(searchDir, 'index.html'), template.replace('<!--TITLE-->', searchHead));
console.log('Generated: /search');

const sitemapRoutes = ['', ...Object.keys(ROUTES).filter((route) => !ALIAS_ROUTES[route] && !HIDDEN_PUBLIC_ROUTES.has(route))];
const sitemapEntries = [
  // Слеш у кінці обов'язковий: сервер віддає сторінку саме так, а адреса
  // без нього відповідає 301. Карта з редиректами марно витрачає обхід
  // і світиться помилкою в Search Console.
  ...sitemapRoutes.map((route) => ({ loc: route ? `${SITE_ORIGIN}/${route}/` : `${SITE_ORIGIN}/`, priority: route ? '0.7' : '1.0', changefreq: route === 'articles' ? 'daily' : 'weekly', image: route ? '' : DEFAULT_IMAGE })),
  ...publicArticles.map((article) => ({ loc: `${SITE_ORIGIN}/article/${generateSlug(article.title)}/`, priority: '0.8', changefreq: 'monthly', lastmod: formatDate(article.updatedAt) || formatDate(article.date) || '', image: resolveImage(article), imageTitle: article.title })),
  ...publicReviews.map((review) => ({ loc: `${SITE_ORIGIN}/review/${generateSlug(review.title || '') || review.id}/`, priority: '0.7', changefreq: 'monthly', lastmod: formatDate(review.updatedAt) || formatDate(review.date) || '', image: resolveImage(review), imageTitle: review.title })),
];
const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${sitemapEntries.map((entry) => `  <url>\n    <loc>${entry.loc}</loc>${entry.lastmod ? `\n    <lastmod>${String(entry.lastmod).slice(0, 10)}</lastmod>` : ''}${entry.image ? `\n    <image:image>\n      <image:loc>${escapeAttr(entry.image)}</image:loc>${entry.imageTitle ? `\n      <image:title>${escapeAttr(entry.imageTitle)}</image:title>` : ''}\n    </image:image>` : ''}\n    <changefreq>${entry.changefreq}</changefreq>\n    <priority>${entry.priority}</priority>\n  </url>`).join('\n')}\n</urlset>\n`;
writeFileSync(join(distDir, 'sitemap.xml'), sitemapXml);
console.log(`Generated: /sitemap.xml (${sitemapEntries.length} URLs)`);

/* ── Стрічка ──────────────────────────────────────────────────────────
   Повний текст у <content:encoded>, а не лише анонс: агрегатори й
   читалки беруть матеріал цілком, і сторінка встигає розійтись раніше,
   ніж її обійде пошуковик. */
const feedItems = publicArticles.slice(0, 30).map((article) => {
  const slug = generateSlug(article.title);
  const link = `${SITE_ORIGIN}/article/${slug}/`;
  const pub = formatDate(article.date) || formatDate(article.updatedAt);
  const body = articleParagraphs(article);
  const img = resolveImage(article);
  return `  <item>
    <title>${escapeXml(article.title)}</title>
    <link>${link}</link>
    <guid isPermaLink="true">${link}</guid>
    ${pub ? `<pubDate>${new Date(pub).toUTCString()}</pubDate>` : ''}
    <dc:creator>${escapeXml(article.author || 'EPRIS Editorial')}</dc:creator>
    ${article.category ? `<category>${escapeXml(article.category)}</category>` : ''}
    <description>${escapeXml(article.excerpt || '')}</description>
    ${img ? `<enclosure url="${escapeAttr(img)}" type="image/jpeg" />` : ''}
    <content:encoded><![CDATA[${img ? `<p><img src="${img}" alt="${escapeAttr(article.title)}" /></p>` : ''}${body}]]></content:encoded>
  </item>`;
}).join('\n');

const feedXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${escapeXml(SITE_NAME)}</title>
  <link>${SITE_ORIGIN}/</link>
  <atom:link href="${SITE_ORIGIN}/rss.xml" rel="self" type="application/rss+xml" />
  <description>Independent international journal on contemporary art, architecture and interior design.</description>
  <language>en</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  <image><url>${DEFAULT_IMAGE}</url><title>${escapeXml(SITE_NAME)}</title><link>${SITE_ORIGIN}/</link></image>
${feedItems}
</channel>
</rss>
`;
writeFileSync(join(distDir, 'rss.xml'), feedXml);
writeFileSync(join(distDir, 'feed.xml'), feedXml);
console.log(`Generated: /rss.xml (${publicArticles.slice(0, 30).length} items)`);

/* IndexNow: Bing, Yandex, Seznam і Naver забирають адресу за хвилини,
   а не чекають наступного обходу. Ключ лежить файлом у корені сайту,
   інакше сервіс відмовляє. Сам список надсилає deploy-скрипт. */
const INDEXNOW_KEY = 'b7f3d9a14c2e48f0b6d5a83e1c7f9024';
writeFileSync(join(distDir, `${INDEXNOW_KEY}.txt`), INDEXNOW_KEY);
writeFileSync(join(distDir, 'indexnow-urls.txt'),
  sitemapEntries.map((e) => e.loc).join('\n') + '\n');
console.log('Generated: IndexNow key + url list');

// Catch-all 404 (also a copy of the shell) for any unmatched path.
const notFoundHtml = template.replace('<!--TITLE-->', routeHead('', 'EPRIS Journal'));
writeFileSync(join(distDir, '404.html'), notFoundHtml);
console.log('Generated: /404.html (SPA catch-all)');
