import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');
const contentPath = join(rootDir, 'src', 'content', 'site-content.json');

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
    if (raw.startsWith('/')) return `https://eprisj.github.io${raw}`;
    return raw;
  }
  return `https://picsum.photos/seed/${encodeURIComponent(raw)}/1200/630?grayscale`;
}

function escapeAttr(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

const indexHtml = readFileSync(join(distDir, 'index.html'), 'utf-8');
const content = JSON.parse(readFileSync(contentPath, 'utf-8'));

// Strip all existing OG/twitter/description meta tags and title from template
let template = indexHtml
  .replace(/<title>[^<]*<\/title>/, '<!--TITLE-->')
  .replace(/<meta\s+(?:property|name)="(?:og:|twitter:|description)[^"]*"\s+content="[^"]*"\s*\/?>/g, '')
  .replace(/\n\s*\n/g, '\n');

for (const article of content.articles) {
  const slug = generateSlug(article.title);
  const imageUrl = resolveImage(article);
  const excerpt = escapeAttr(article.excerpt);
  const title = escapeAttr(article.title);
  const url = `https://eprisj.github.io/article/${slug}`;

  const headBlock = `<title>${article.title} \u2014 EPRIS Journal</title>
    <meta name="description" content="${excerpt}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${excerpt}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${url}" />
    <meta property="og:site_name" content="EPRIS Journal" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${excerpt}" />
    <meta name="twitter:image" content="${imageUrl}" />`;

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
  materie: 'Materie',
  studio: 'Studio',
  issue: 'Issue',
  design: 'Design',
  radio: 'Radio',
  podcasts: 'Podcasts',
};

function routeHead(label) {
  return `<title>${label} — EPRIS Journal</title>
    <meta name="description" content="EPRIS Journal — a living archive of taste, design and slow living." />
    <meta property="og:title" content="${label} — EPRIS Journal" />
    <meta property="og:description" content="EPRIS Journal — a living archive of taste, design and slow living." />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="EPRIS Journal" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${label} — EPRIS Journal" />`;
}

for (const [route, label] of Object.entries(ROUTES)) {
  const pageHtml = template.replace('<!--TITLE-->', routeHead(label));
  const routeDir = join(distDir, route);
  mkdirSync(routeDir, { recursive: true });
  writeFileSync(join(routeDir, 'index.html'), pageHtml);
  console.log(`Generated: /${route}`);
}

// Catch-all 404 (also a copy of the shell) for any unmatched path.
const notFoundHtml = template.replace('<!--TITLE-->', routeHead('EPRIS Journal'));
writeFileSync(join(distDir, '404.html'), notFoundHtml);
console.log('Generated: /404.html (SPA catch-all)');
