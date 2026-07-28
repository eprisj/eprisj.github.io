import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');
const contentPath = join(rootDir, 'src', 'content', 'site-content.json');
const SITE_ORIGIN = 'https://eprisjournal.com';
const DEFAULT_IMAGE = `${SITE_ORIGIN}/images/featured.png`;

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

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

const indexHtml = readFileSync(join(distDir, 'index.html'), 'utf-8');
const content = JSON.parse(readFileSync(contentPath, 'utf-8'));

// Strip all existing OG/twitter/description meta tags and title from template
let template = indexHtml
  .replace(/<title>[^<]*<\/title>/, '<!--TITLE-->')
  .replace(/<meta\s+(?:property|name)="(?:og:|twitter:|description)[^"]*"\s+content="[^"]*"\s*\/?>/g, '')
  .replace(/<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/g, '')
  .replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/g, '')
  .replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/g, '')
  .replace(/\n\s*\n/g, '\n');

for (const article of content.articles) {
  const slug = generateSlug(article.title);
  const imageUrl = resolveImage(article);
  const excerpt = escapeAttr(article.excerpt);
  const title = escapeAttr(article.title);
  const url = `${SITE_ORIGIN}/article/${slug}`;
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt || '',
    image: [imageUrl],
    datePublished: article.date || undefined,
    dateModified: article.updatedAt || article.date || undefined,
    author: { '@type': 'Person', name: article.author || 'EPRIS Editorial' },
    mainEntityOfPage: url,
    publisher: {
      '@type': 'Organization',
      name: 'EPRIS Journal',
      url: SITE_ORIGIN,
      logo: { '@type': 'ImageObject', url: DEFAULT_IMAGE },
    },
  };

  const headBlock = `<title>${article.title} \u2014 EPRIS Journal</title>
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
    <script type="application/ld+json">${safeJson(articleSchema)}</script>`;

  const pageHtml = template.replace('<!--TITLE-->', headBlock);

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

console.log(`\nGenerated OG pages for ${content.articles.length} articles.`);

// ── SPA deep-link routes ─────────────────────────────────────────────────────
// GitHub Pages has no SPA fallback: a direct hit on /studio, /materie, etc.
// returns its own 404. We emit a static <route>/index.html (a copy of the app
// shell) for every known tab route so deep-links resolve with HTTP 200, and a
// catch-all 404.html so any other path still boots the SPA (client router then
// reads window.location.pathname and renders the right view).
const ROUTES = {
  articles: 'Articles',
  reviews: 'Reviews',
  library: 'Library',
  about: 'About',
  manifest: 'Manifesto',
  materie: 'Materie',
  studio: 'Studio',
  issue: 'Issue',
  design: 'Design',
  radio: 'Radio',
  podcasts: 'Podcasts',
  collaboation: 'Collaboration Registry',
  collaboration: 'Collaboration Registry',
};

const ROUTE_DESCRIPTIONS = {
  articles: 'Editorial stories, interviews and research on contemporary art, architecture, interiors, design and cultural cities.',
  reviews: 'Independent EPRIS reviews of exhibitions, books, design, architecture and contemporary visual culture.',
  library: 'Explore the EPRIS cultural library and long-term digital archive.',
  about: 'Meet EPRIS, an independent international journal and cultural platform for art, architecture and interior design.',
  manifest: 'The EPRIS declaration on meaningful modernity, cultural accessibility and independent editorial practice.',
  materie: 'EPRIS Materie explores materials, craft and the physical intelligence of contemporary design.',
  studio: 'Editorial, visual and cultural projects by EPRIS Studio.',
  issue: 'Read the current digital issue of EPRIS Journal.',
  design: 'A curated selection of contemporary furniture, objects and interior design by EPRIS.',
  radio: 'Listen to EPRIS Radio: sound, music and cultural programming.',
  podcasts: 'Conversations and audio stories about contemporary art, architecture, design and cities.',
  collaboation: 'Discover and suggest emerging architects, designers and artists for EPRIS Journal interviews and editorial collaborations.',
  collaboration: 'Discover and suggest emerging architects, designers and artists for EPRIS Journal interviews and editorial collaborations.',
};

function routeHead(route, label) {
  const url = route ? `${SITE_ORIGIN}/${route}` : `${SITE_ORIGIN}/`;
  const description = ROUTE_DESCRIPTIONS[route] || 'Independent international journal and cultural platform exploring contemporary art, architecture, interior design and cities in context.';
  const schema = {
    '@context': 'https://schema.org',
    '@type': route ? 'CollectionPage' : 'WebSite',
    name: `${label} — EPRIS Journal`,
    url,
    description,
    isPartOf: route ? { '@type': 'WebSite', name: 'EPRIS Journal', url: SITE_ORIGIN } : undefined,
  };
  return `<title>${label} — EPRIS Journal</title>
    <meta name="description" content="${escapeAttr(description)}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
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
    <script type="application/ld+json">${safeJson(schema)}</script>`;
}

for (const [route, label] of Object.entries(ROUTES)) {
  const pageHtml = template.replace('<!--TITLE-->', routeHead(route, label));
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

const sitemapRoutes = ['', ...Object.keys(ROUTES)];
const sitemapEntries = [
  ...sitemapRoutes.map((route) => ({ loc: route ? `${SITE_ORIGIN}/${route}` : `${SITE_ORIGIN}/`, priority: route ? '0.7' : '1.0', changefreq: route === 'articles' ? 'daily' : 'weekly' })),
  ...content.articles.map((article) => ({ loc: `${SITE_ORIGIN}/article/${generateSlug(article.title)}`, priority: '0.8', changefreq: 'monthly', lastmod: article.updatedAt || article.date || '' })),
];
const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries.map((entry) => `  <url>\n    <loc>${entry.loc}</loc>${entry.lastmod ? `\n    <lastmod>${String(entry.lastmod).slice(0, 10)}</lastmod>` : ''}\n    <changefreq>${entry.changefreq}</changefreq>\n    <priority>${entry.priority}</priority>\n  </url>`).join('\n')}\n</urlset>\n`;
writeFileSync(join(distDir, 'sitemap.xml'), sitemapXml);
console.log(`Generated: /sitemap.xml (${sitemapEntries.length} URLs)`);

// Catch-all 404 (also a copy of the shell) for any unmatched path.
const notFoundHtml = template.replace('<!--TITLE-->', routeHead('', 'EPRIS Journal'));
writeFileSync(join(distDir, '404.html'), notFoundHtml);
console.log('Generated: /404.html (SPA catch-all)');
