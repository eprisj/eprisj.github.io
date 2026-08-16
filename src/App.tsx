import { motion, AnimatePresence, LayoutGroup, MotionConfig } from 'framer-motion';
import { ReactNode, useState, useEffect, useCallback, useMemo, FormEvent, MouseEvent, PointerEvent as ReactPointerEvent, TouchEvent as ReactTouchEvent, CSSProperties, useRef, Suspense, lazy, Component } from 'react';
// Heavy, rarely-visited tabs are code-split out of the critical bundle —
// e.g. DesignPage alone carries a 244-item catalogue that has no business
// loading for a reader who just opened an article. Each only downloads once
// its tab is actually clicked.
const IssuePage = lazy(() => import('./pages/IssuePage').then((m) => ({ default: m.IssuePage })));
const StudioPage = lazy(() => import('./pages/StudioPage').then((m) => ({ default: m.StudioPage })));
const RadioPage = lazy(() => import('./pages/RadioPage').then((m) => ({ default: m.RadioPage })));
const PodcastsPage = lazy(() => import('./pages/PodcastsPage').then((m) => ({ default: m.PodcastsPage })));
const PassportPage = lazy(() => import('./pages/passport/PassportPage').then((m) => ({ default: m.PassportPage })));
const DesignPage = lazy(() => import('./design/DesignPage').then((m) => ({ default: m.DesignPage })));
const CollaborationPage = lazy(() => import('./pages/CollaborationPage').then((m) => ({ default: m.CollaborationPage })));
const ShowcasePage = lazy(() => import('./showcase/ShowcasePage').then((m) => ({ default: m.ShowcasePage })));
const BureauPage = lazy(() => import('./showcase/BureauPage').then((m) => ({ default: m.BureauPage })));
const ShowcaseTeaser = lazy(() => import('./showcase/ShowcaseTeaser').then((m) => ({ default: m.ShowcaseTeaser })));
const StagePage = lazy(() => import('./stage/StagePage').then((m) => ({ default: m.StagePage })));
import {
  Article,
  Author,
  ContentBlock,
  DEFAULT_LANGUAGE,
  getAvailableLanguages,
  getAuthors,
  getManifest,
  getContentForLanguage,
  orderArticles,
  getHomepageArchive,
  getIssueArchive,
  getStudio,
  getHomepageSettings,
  getActiveHomepagePicsRelease,
  resolveAuthor,
  translateRole,
  Item,
  Review,
  setPreviewOverride,
  getTranslations,
  getTheme,
  getSiteSettings,
  getPicsId,
  isSectionEnabled,
  isSectionInNavigation,
  loadLiveContent,
  subscribeContent
} from './data';
import { DEFAULT_HOMEPAGE_PICS_CATEGORIES } from './data';
import type { HomepageArchiveEntry, HomepagePicsCategory, SiteSettings, SiteTheme, VisibilitySectionKey } from './data';
import { Search, ArrowUpRight, FileText, Menu, X, Globe, MapPin, ExternalLink, ArrowLeft, ArrowRight, Quote, Play, Music, Image as ImageIcon, CheckSquare, Square, BarChart, Lightbulb, Share2, Link2, Check } from 'lucide-react';

// Issue-draft preview: when the admin opens /issue?preview=1, load the unsaved
// content JSON it stashed in localStorage and override the data layer before any
// render reads it. Same-origin (both on eprisj.github.io), so this is safe.
(function initIssuePreview() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('preview') !== '1') return;
    const raw = localStorage.getItem('epris_preview');
    if (!raw) return;
    const json = JSON.parse(raw);
    const issueId = Number(localStorage.getItem('epris_preview_issue'));
    setPreviewOverride(json, Number.isFinite(issueId) ? issueId : null);
  } catch {
    /* ignore malformed preview payloads */
  }
})();

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function ImageLightbox({ src, alt, title, description, onClose }: { src: string; alt: string; title?: string; description?: string; onClose: () => void }) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-0 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={alt || 'Image preview'}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/25 p-2 text-white/80 transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        aria-label="Close image preview"
      >
        <X size={24} />
      </button>
      <div className="flex max-h-[100dvh] max-w-full flex-col items-center sm:max-h-[92vh] sm:max-w-[92vw]">
        <motion.img
          src={src}
          alt={alt}
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.99 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className="max-h-[calc(100dvh-6rem)] max-w-full object-contain select-none shadow-2xl sm:max-h-[calc(92vh-5rem)]"
          referrerPolicy="no-referrer"
        />
        {(title || description) && (
          <div className="mt-4 max-w-[70ch] px-4 text-center">
            {title && <p className="font-serif text-sm text-white/90 sm:text-base">{title}</p>}
            {description && <p className="mt-1 font-serif text-xs leading-relaxed text-white/60 sm:text-sm">{description}</p>}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function GalleryItemView({ item, onClose, articles, onReadArticle }: { item: Item; onClose: () => void; articles: Article[]; onReadArticle: (article: Article) => void }) {
  const photos = item.images && item.images.length > 0
    ? item.images
    : [{ url: resolveMediaSource(item.imageUrl || item.imageSeed, 1000, 750) }];
  const matchedArticle = findMatchingArticle(item, articles);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[100] bg-[var(--c-bg)] overflow-y-auto"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="fixed top-4 right-4 sm:top-8 sm:right-8 z-10 p-2 border border-[var(--c-accent)] rounded-full text-[var(--c-accent)] hover:bg-[var(--c-accent)] hover:text-[var(--c-bg)] transition-colors bg-[var(--c-bg)]"
      >
        <X size={20} />
      </button>
      <div className="max-w-3xl mx-auto px-5 sm:px-10 py-16 sm:py-24">
        <p className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.6)] mb-3">
          {item.subtitle}
        </p>
        <h2 className="font-crimson text-3xl sm:text-4xl text-[var(--c-accent)] mb-6">
          {item.title}
        </h2>
        <p className="font-serif text-base sm:text-lg text-[rgb(var(--c-accent-rgb)_/_0.75)] leading-relaxed mb-6 max-w-xl">
          {item.description}
        </p>
        {matchedArticle && (
          <button
            type="button"
            onClick={() => onReadArticle(matchedArticle)}
            className="inline-flex items-center gap-2 mb-12 border border-[var(--c-accent)] rounded-full px-5 py-1.5 font-mono text-[10px] uppercase tracking-widest text-[var(--c-accent)] hover:bg-[var(--c-accent)] hover:text-[var(--c-bg)] transition-colors"
          >
            Read the full article →
          </button>
        )}
        <div className="space-y-10">
          {photos.map((photo, i) => (
            <figure key={i}>
              <div className="aspect-[4/3] overflow-hidden bg-[#E8DED5]">
                <img
                  src={resolveMediaSource(photo.url, 900, 675)}
                  alt={photo.caption || item.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              {photo.caption && (
                <figcaption className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.5)] mt-3">
                  {photo.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// UI strings introduced in code, before the editable translation table on the
// server has an entry for them. Content (site-content.json) is owned by the VPS
// and re-snapshotted nightly, so a key added to the repo copy would be
// overwritten; shipping the fallback here keeps new labels translated in every
// locale until an editor overrides them in the admin.
const UI_STRING_FALLBACK: Record<string, Record<string, string>> = {
  'nav.home': { EN: 'Home', RU: 'Главная', UA: 'Головна', DE: 'Startseite', IT: 'Home', ES: 'Inicio', TR: 'Ana sayfa' },
  'reviews.read': { EN: 'Read', RU: 'Читать', UA: 'Читати', DE: 'Lesen', IT: 'Leggi', ES: 'Leer', TR: 'Oku' },
  'homepage.picsTitle': { EN: 'Pics of the week', RU: 'Фото недели', UA: 'Фото тижня', DE: 'Bilder der Woche', IT: 'Foto della settimana', ES: 'Fotos de la semana', TR: 'Haftanın fotoğrafları' },
  'homepage.previous': { EN: 'Previous images', RU: 'Предыдущие изображения', UA: 'Попередні зображення', DE: 'Vorherige Bilder', IT: 'Immagini precedenti', ES: 'Imágenes anteriores', TR: 'Önceki görseller' },
  'homepage.next': { EN: 'Next images', RU: 'Следующие изображения', UA: 'Наступні зображення', DE: 'Nächste Bilder', IT: 'Immagini successive', ES: 'Imágenes siguientes', TR: 'Sonraki görseller' },
  'homepage.openImage': { EN: 'Open image', RU: 'Открыть изображение', UA: 'Відкрити зображення', DE: 'Bild öffnen', IT: 'Apri immagine', ES: 'Abrir imagen', TR: 'Görseli aç' },
  'homepage.carouselLabel': { EN: 'Pics of the week categories', RU: 'Категории фото недели', UA: 'Категорії фото тижня', DE: 'Kategorien der Bilder der Woche', IT: 'Categorie delle foto della settimana', ES: 'Categorías de fotos de la semana', TR: 'Haftanın fotoğraf kategorileri' },
  'homepage.archiveEyebrow': { EN: 'Archive', RU: 'Архив', UA: 'Архів', DE: 'Archiv', IT: 'Archivio', ES: 'Archivo', TR: 'Arşiv' },
  'homepage.archiveTitle': { EN: 'Daily picks', RU: 'Ежедневный выбор', UA: 'Щоденний вибір', DE: 'Tägliche Auswahl', IT: 'Scelte quotidiane', ES: 'Selección diaria', TR: 'Günün seçkisi' },
  'homepage.archiveDescription': { EN: 'Every weekly composition stays here after the next one takes its place.', RU: 'Каждая недельная композиция остаётся здесь после выхода следующей.', UA: 'Кожна тижнева композиція залишається тут після виходу наступної.', DE: 'Jede Wochenkomposition bleibt hier, wenn die nächste erscheint.', IT: 'Ogni composizione settimanale resta qui quando arriva la successiva.', ES: 'Cada composición semanal permanece aquí cuando llega la siguiente.', TR: 'Bir sonraki yayınlandığında her haftalık kompozisyon burada kalır.' },
  'homepage.descriptionUnavailable': { EN: 'Short description coming soon.', RU: 'Краткое описание появится скоро.', UA: 'Короткий опис з’явиться незабаром.', DE: 'Eine kurze Beschreibung folgt in Kürze.', IT: 'Una breve descrizione arriverà presto.', ES: 'La breve descripción llegará pronto.', TR: 'Kısa açıklama yakında eklenecek.' },
  'homepage.showDetails': { EN: 'Show description', RU: 'Показать описание', UA: 'Показати опис', DE: 'Beschreibung zeigen', IT: 'Mostra descrizione', ES: 'Mostrar descripción', TR: 'Açıklamayı göster' },
  'homepage.hideDetails': { EN: 'Hide description', RU: 'Скрыть описание', UA: 'Сховати опис', DE: 'Beschreibung ausblenden', IT: 'Nascondi descrizione', ES: 'Ocultar descripción', TR: 'Açıklamayı gizle' },
  'homepage.articlesEyebrow': { EN: 'EPRIS / editorial', RU: 'EPRIS / редакция', UA: 'EPRIS / редакція', DE: 'EPRIS / Redaktion', IT: 'EPRIS / redazione', ES: 'EPRIS / editorial', TR: 'EPRIS / editoryal' },
  'homepage.articlesTitle': { EN: 'Articles', RU: 'Статьи', UA: 'Статті', DE: 'Artikel', IT: 'Articoli', ES: 'Artículos', TR: 'Makaleler' },
  'homepage.articlesDescription': { EN: 'The latest writing from the journal, newest first.', RU: 'Свежие тексты журнала — сначала самые новые.', UA: 'Свіжі тексти журналу — спочатку найновіші.', DE: 'Die neuesten Texte des Journals, zuerst die aktuellsten.', IT: 'Gli ultimi testi del journal, dal più recente.', ES: 'Los textos más recientes de la revista, primero los nuevos.', TR: 'Derginin en yeni yazıları, en yeniler önce.' },
  'articles.readPreview': { EN: 'Read preview', RU: 'Читать превью', UA: 'Читати прев’ю', DE: 'Vorschau lesen', IT: 'Leggi anteprima', ES: 'Leer vista previa', TR: 'Önizlemeyi oku' },
  'articles.readFull': { EN: 'Read full article', RU: 'Читать полностью', UA: 'Читати повністю', DE: 'Vollständigen Artikel lesen', IT: 'Leggi l’articolo completo', ES: 'Leer el artículo completo', TR: 'Makalenin tamamını oku' },
  'articles.closePreview': { EN: 'Close preview', RU: 'Закрыть превью', UA: 'Закрити прев’ю', DE: 'Vorschau schließen', IT: 'Chiudi anteprima', ES: 'Cerrar vista previa', TR: 'Önizlemeyi kapat' },
  'articles.by': { EN: 'By', RU: 'Автор', UA: 'Автор', DE: 'Von', IT: 'Di', ES: 'Por', TR: 'Yazan' },
  'video.openVideo': { EN: 'Open video', RU: 'Открыть видео', UA: 'Відкрити відео', DE: 'Video öffnen', IT: 'Apri video', ES: 'Abrir vídeo', TR: 'Videoyu aç' },
  'lang.title': { EN: 'Language', RU: 'Язык', UA: 'Мова', DE: 'Sprache', IT: 'Lingua', ES: 'Idioma', TR: 'Dil' },
  'lang.chooseEdition': { EN: 'Choose edition', RU: 'Выберите версию', UA: 'Виберіть версію', DE: 'Ausgabe wählen', IT: 'Scegli edizione', ES: 'Elegir edición', TR: 'Baskı seç' },
  'article.notFound': { EN: 'Article not found', RU: 'Статья не найдена', UA: 'Статтю не знайдено', DE: 'Artikel nicht gefunden', IT: 'Articolo non trovato', ES: 'Artículo no encontrado', TR: 'Makale bulunamadı' },
  'article.notFound.body': { EN: 'This link may be broken, or the article has moved.', RU: 'Ссылка могла устареть, либо статья была перемещена.', UA: 'Посилання могло застаріти, або статтю було переміщено.', DE: 'Dieser Link ist möglicherweise defekt oder der Artikel wurde verschoben.', IT: 'Questo link potrebbe essere non valido o l\'articolo è stato spostato.', ES: 'Este enlace puede estar roto o el artículo se ha movido.', TR: 'Bu bağlantı bozuk olabilir veya makale taşınmış olabilir.' },
  'article.backToArticles': { EN: 'Back to Articles', RU: 'Назад к статьям', UA: 'Назад до статей', DE: 'Zurück zu Artikeln', IT: 'Torna agli articoli', ES: 'Volver a artículos', TR: 'Makalelere dön' },
  'article.related': { EN: 'Read also', RU: 'Читать также', UA: 'Читати також', DE: 'Auch lesen', IT: 'Leggi anche', ES: 'Leer también', TR: 'Ayrıca okuyun' },
};

function getTranslation(lang: string, key: string) {
  const tr = getTranslations();
  return tr[lang]?.[key]
    || UI_STRING_FALLBACK[key]?.[lang]
    || tr[DEFAULT_LANGUAGE]?.[key]
    || UI_STRING_FALLBACK[key]?.[DEFAULT_LANGUAGE]
    || key;
}

function isCustomMediaReference(value: string): boolean {
  return /^(https?:)?\/\//i.test(value) || value.startsWith('/') || value.startsWith('./') || value.startsWith('../') || value.startsWith('data:') || value.startsWith('blob:');
}

function resolveMediaSource(value: string | undefined, width: number, height: number): string {
  const normalized = (value || '').trim();
  if (!normalized) {
    return '';
  }

  if (isCustomMediaReference(normalized)) {
    return normalized;
  }

  return `https://picsum.photos/seed/${encodeURIComponent(normalized)}/${width}/${height}`;
}

// Pixel-heart silhouette for the 'mosaic' content block — each 'X' becomes one photo tile.
const HEART_PATTERN = [
  '.XX...XX.',
  'XXXXXXXXX',
  'XXXXXXXXX',
  'XXXXXXXXX',
  '.XXXXXXX.',
  '..XXXXX..',
  '...XXX...',
  '....X....',
];
const HEART_CELLS: [number, number][] = HEART_PATTERN.flatMap((row, r) =>
  row.split('').map((cell, c) => (cell === 'X' ? [r, c] as [number, number] : null)).filter((v): v is [number, number] => v !== null)
);

// Allow-list sanitizer for rich inline text coming from the admin editor. Only a
// small set of inline formatting tags survive; everything else is unwrapped to
// its text. Anchors keep a safe href only. Rebuilding the tree (rather than
// regex-stripping) is what makes it XSS-safe.
const RICH_ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'MARK', 'CODE', 'BR', 'A', 'SPAN', 'P', 'H2', 'H3', 'H4', 'UL', 'OL', 'LI', 'HR', 'BLOCKQUOTE']);
// Editorial layout classes an article body may ask for. A closed list, because
// the alternative — passing `class` through — would let stored content reach
// into the app's own stylesheet. Anything not named here is dropped silently.
const RICH_ALLOWED_CLASSES = new Set(['stats', 'stat-figure', 'stat-label', 'kicker', 'dek', 'sources']);
function escapeTextNode(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function sanitizeRichText(html: string): string {
  const input = String(html == null ? '' : html);
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    // Build/SSR fallback: strip all tags to plain text.
    return escapeTextNode(input.replace(/<[^>]*>/g, ''));
  }
  let root: HTMLElement | null = null;
  try {
    const doc = new DOMParser().parseFromString('<div id="r">' + input + '</div>', 'text/html');
    root = doc.getElementById('r');
  } catch {
    return escapeTextNode(input.replace(/<[^>]*>/g, ''));
  }
  const walk = (node: Node): string => {
    let out = '';
    node.childNodes.forEach((child) => {
      if (child.nodeType === 3) {
        out += escapeTextNode(child.textContent || '');
      } else if (child.nodeType === 1) {
        const el = child as HTMLElement;
        const tag = el.tagName;
        if (tag === 'BR') { out += '<br>'; return; }
        if (RICH_ALLOWED_TAGS.has(tag)) {
          let attrs = '';
          if (tag === 'A') {
            const href = el.getAttribute('href') || '';
            if (/^(https?:|mailto:)/i.test(href)) {
              attrs = ` href="${href.replace(/"/g, '&quot;')}" target="_blank" rel="noopener noreferrer"`;
            }
          }
          const kept = (el.getAttribute('class') || '').split(/\s+/).filter((c) => RICH_ALLOWED_CLASSES.has(c));
          if (kept.length) attrs += ` class="${kept.join(' ')}"`;
          const t = tag.toLowerCase();
          out += `<${t}${attrs}>${walk(el)}</${t}>`;
        } else {
          out += walk(el); // drop disallowed tag, keep its contents
        }
      }
    });
    return out;
  };
  return root ? walk(root) : '';
}

// ── Site theme application (colors + fonts from content.theme) ───────────────
function hexToRgbChannels(hex: string): string | null {
  const h = String(hex || '').trim().replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}
const __loadedFonts = new Set<string>();
function ensureGoogleFont(name: string) {
  const fam = String(name || '').trim();
  if (!fam || fam === 'Playfair Display' || fam.startsWith('Iowan')) return; // defaults already present
  const key = fam.toLowerCase();
  if (__loadedFonts.has(key)) return;
  __loadedFonts.add(key);
  const id = 'gf-' + key.replace(/[^a-z0-9]/g, '');
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=' + fam.replace(/ /g, '+') + ':wght@400;700&display=swap';
  document.head.appendChild(link);
}
function applySiteTheme(theme: SiteTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement.style;
  const setColor = (varName: string, rgbVar: string, hex?: string) => {
    if (!hex) return;
    const rgb = hexToRgbChannels(hex);
    if (!rgb) return;
    root.setProperty(varName, hex);
    root.setProperty(rgbVar, rgb);
  };
  setColor('--c-accent', '--c-accent-rgb', theme.accent);
  setColor('--c-gold', '--c-gold-rgb', theme.gold);
  setColor('--c-bg', '--c-bg-rgb', theme.bg);
  if (theme.fontDisplay) { ensureGoogleFont(theme.fontDisplay); root.setProperty('--font-display', `'${theme.fontDisplay}', serif`); }
  if (theme.fontBody) { ensureGoogleFont(theme.fontBody); root.setProperty('--font-body', `'${theme.fontBody}', serif`); }
  if (theme.bgImage) { root.setProperty('--bg-image', `url("${theme.bgImage}")`); } else { root.removeProperty('--bg-image'); }
}

function Reveal({ children, delay = 0, y = 28, className = '' }: { children: ReactNode; delay?: number; y?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-8%' }}
      transition={{ duration: 0.42, delay: Math.min(delay, 0.24), ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Extracts a YouTube id from watch/share/embed/shorts URLs.
function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function extractVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:.*\/)?(\d+)(?:$|[?#/])/i);
  return m ? m[1] : null;
}

function isDirectVideoUrl(url: string): boolean {
  return /\.(?:mp4|webm|ogv|ogg)(?:$|[?#])/i.test(url);
}

function safeExternalUrl(value?: string): string | null {
  const url = String(value || '').trim();
  return /^https?:\/\//i.test(url) ? url : null;
}

// Privacy-friendly click-to-play embeds for YouTube/Vimeo. Direct MP4/WebM
// stays native, so it is fast, accessible and never needs a third-party player.
function VideoBlock({ content, caption, poster, credit, sourceUrl, t }: { content: string; caption?: string; poster?: string; credit?: string; sourceUrl?: string; t: (key: string) => string }) {
  const [playing, setPlaying] = useState(false);
  const ytId = extractYouTubeId(content);
  const vimeoId = extractVimeoId(content);
  const directVideo = isDirectVideoUrl(content);
  const embedUrl = ytId
    ? `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1`
    : vimeoId
      ? `https://player.vimeo.com/video/${vimeoId}?autoplay=1&dnt=1`
      : null;
  const openVideoLabel = t('video.openVideo');
  const provider = ytId ? 'YouTube' : vimeoId ? 'Vimeo' : directVideo ? 'Video' : openVideoLabel;
  const cleanSource = safeExternalUrl(sourceUrl);

  return (
    <figure className="my-8 sm:my-12">
      <div className="aspect-video bg-black relative overflow-hidden">
        {directVideo ? (
          <video className="w-full h-full object-cover" controls preload="metadata" poster={poster || undefined}>
            <source src={content} />
            Your browser does not support this video.
          </video>
        ) : playing && embedUrl ? (
          <iframe
            src={embedUrl}
            title={caption || 'Video'}
            className="w-full h-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : (
          embedUrl ? (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="w-full h-full relative flex items-center justify-center group cursor-pointer"
              aria-label={caption || `Play ${provider} video`}
            >
              {(ytId || poster) && (
              <img
                src={poster || `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                alt="" loading="lazy" referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-85 transition-opacity"
              />
              )}
              {!ytId && !poster && <span className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,.12),transparent_58%)]" />}
              <span className="relative inline-flex flex-col items-center gap-3 text-white">
                <Play size={48} className="opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em]">{provider}</span>
              </span>
            </button>
          ) : (
            <a
              href={safeExternalUrl(content) || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-full relative flex flex-col gap-3 items-center justify-center text-white hover:bg-white/10 transition-colors"
              aria-label={caption || openVideoLabel}
            >
              <ExternalLink size={28} />
              <span className="font-mono text-[10px] uppercase tracking-[0.16em]">{openVideoLabel}</span>
            </a>
          )
        )}
      </div>
      {(caption || credit) && (
        <figcaption className="text-center font-mono text-xs text-[rgb(var(--c-accent-rgb)_/_0.6)] mt-3 sm:mt-4 uppercase tracking-widest px-4">
          {caption}{caption && credit ? ' · ' : ''}{credit}
          {cleanSource && <a href={cleanSource} target="_blank" rel="noopener noreferrer" className="ml-2 underline underline-offset-4 hover:text-[var(--c-gold)] transition-colors">source</a>}
        </figcaption>
      )}
    </figure>
  );
}

// Shown briefly while a code-split tab (issue/design/studio/radio/
// podcasts) downloads its chunk. On a warm cache this basically never shows.
function TabLoadingFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--c-accent)] opacity-50"
      >
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--c-accent)] animate-pulse" />
        Loading
      </motion.div>
    </div>
  );
}

// True cause of the intermittent white screen: every deploy replaces the
// whole dist/ folder with newly content-hashed chunk filenames, so a tab a
// visitor already has open (or a link/bookmark to a lazy route like /issue)
// can ask for a JS chunk that no longer exists on the server. That 404
// surfaces as a rejected dynamic import(), which React re-throws as a render
// error on the next tick — Suspense only handles the *loading* state, not
// this, so with no error boundary anywhere the whole app unmounted to a
// blank white screen with nothing in the UI to explain why or recover.
const CHUNK_ERROR_PATTERN = /fetch dynamically imported module|Importing a module script failed|Loading chunk/i;
const RELOAD_GUARD_KEY = 'epris_chunk_reload_once';

class TabErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    // A stale chunk is only fixable by a fresh page load (new index.html →
    // new chunk manifest) — not a React retry, which would just throw again.
    // Guard against loop: only auto-reload once per session.
    if (CHUNK_ERROR_PATTERN.test(message) && !sessionStorage.getItem(RELOAD_GUARD_KEY)) {
      sessionStorage.setItem(RELOAD_GUARD_KEY, '1');
      window.location.reload();
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.6)]">
            This section couldn't load — likely a new version just went live.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="border border-[var(--c-accent)] rounded-full px-6 py-2 font-mono text-[10px] uppercase tracking-widest text-[var(--c-accent)] hover:bg-[var(--c-accent)] hover:text-[var(--c-bg)] transition-colors"
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function LazyTab({ children }: { children: ReactNode }) {
  return (
    <TabErrorBoundary>
      <Suspense fallback={<TabLoadingFallback />}>{children}</Suspense>
    </TabErrorBoundary>
  );
}

// Stagger container for lists
const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.035 } },
};
const staggerItem = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } },
};

// Shared motion tokens so interactions read as one system.
const EASE = [0.22, 1, 0.36, 1] as const;
const ROUTE_SEQUENCE = ['gallery', 'articles', 'reviews', 'about', 'manifest', 'issue', 'design', 'studio', 'radio', 'podcasts', 'passport'];
/* Route transitions run in mode="wait", so the old page leaves BEFORE the new
   one arrives and the two durations add up. Symmetrical timings therefore read
   as a lag, not as grace: the eye is waiting on nothing for the whole exit.
   Leaving is quick and small, arriving is longer and does the expressive work —
   which is also how it feels in print, where a page is turned away sharply and
   the next one settles.

   The scale is deliberately tiny. At 0.99 it reads as depth; anything more and
   an editorial page looks like it is being thrown at the reader. */
const routeVariants = {
  enter: (direction: number) => ({ opacity: 0, x: direction * 20, y: 10, scale: 0.99 }),
  center: {
    opacity: 1, x: 0, y: 0, scale: 1,
    transition: {
      opacity: { duration: 0.3, ease: EASE },
      x: { duration: 0.42, ease: EASE },
      y: { duration: 0.42, ease: EASE },
      scale: { duration: 0.42, ease: EASE },
    },
  },
  exit: (direction: number) => ({
    opacity: 0, x: direction * -10, y: -5, scale: 0.997,
    transition: { duration: 0.16, ease: [0.4, 0, 1, 1] as const },
  }),
};

function routePosition(routeKey: string): number {
  if (routeKey.startsWith('search-')) return 0.5;
  const index = ROUTE_SEQUENCE.indexOf(routeKey);
  return index === -1 ? 0 : index;
}

function RouteTransition({ routeKey, direction, children }: { routeKey: string; direction: number; children: ReactNode }) {
  return (
    <AnimatePresence initial={false} mode="wait" custom={direction}>
      <motion.div
        key={routeKey}
        custom={direction}
        variants={routeVariants}
        initial="enter"
        animate="center"
        exit="exit"
        className="route-motion-surface min-h-[calc(100dvh-4rem)]"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

const LANG_LABELS: Record<string, string> = {
  EN: 'English',
  RU: 'Русский',
  UA: 'Українська',
  TR: 'Türkçe',
  DE: 'Deutsch',
  IT: 'Italiano',
  ES: 'Español'
};

function NavBar({
  activeTab,
  setActiveTab,
  onHome,
  currentLang,
  setCurrentLang,
  t,
  languages,
  onSearch,
  brandName,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onHome: () => void;
  currentLang: string;
  setCurrentLang: (lang: string) => void;
  t: (key: string) => string;
  languages: string[];
  onSearch: (q: string) => void;
  brandName: string;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const locked = isSearchOpen || isMenuOpen || isLangOpen;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsSearchOpen(false);
      setIsMenuOpen(false);
      setIsLangOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    if (locked) document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isSearchOpen, isMenuOpen, isLangOpen]);

  const tabs: { id: VisibilitySectionKey; label: string }[] = [
    { id: 'articles', label: t('nav.articles') },
    { id: 'reviews', label: t('nav.reviews') },
    { id: 'about', label: t('nav.about') },
    { id: 'manifest', label: t('nav.manifest') },
    { id: 'issue', label: t('nav.issue') },
    { id: 'design', label: 'Design' },
    { id: 'studio', label: t('nav.studio') },
    { id: 'radio', label: t('nav.radio') },
    { id: 'podcasts', label: t('nav.podcasts') },
  ].filter((tab) => isSectionInNavigation(tab.id));

  const tabHref = (tab: string) => tab === 'gallery' ? '/' : `/${tab}`;
  const handleTabLink = (event: MouseEvent<HTMLAnchorElement>, tab: string) => {
    // Keep native link behaviour for Cmd/Ctrl-click, middle click and new-tab
    // gestures while making ordinary navigation instant inside the SPA.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setActiveTab(tab);
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      onSearch(q);
      setSearchQuery('');
    }
    setIsSearchOpen(false);
  };

  return (
    <>
      {/* ── Mobile header: menu · centred wordmark · language + issue ── */}
      <nav className="lg:hidden fixed top-0 left-0 w-full z-50 bg-[rgb(var(--c-bg-rgb)_/_0.94)] border-b border-[rgb(var(--c-accent-rgb)_/_0.25)] h-16 flex items-center justify-between px-3 backdrop-blur-xl supports-[backdrop-filter]:bg-[rgb(var(--c-bg-rgb)_/_0.78)]">
        <button
          type="button"
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="relative z-10 w-11 h-11 inline-flex items-center justify-center rounded-full text-[var(--c-accent)] hover:bg-[rgb(var(--c-accent-rgb)_/_0.08)] active:scale-95 transition"
        >
          <AnimatePresence initial={false} mode="wait">
            <motion.span
              key={isMenuOpen ? 'close' : 'menu'}
              initial={{ opacity: 0, rotate: isMenuOpen ? -18 : 18, scale: 0.86 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: isMenuOpen ? 18 : -18, scale: 0.86 }}
              transition={{ duration: 0.16, ease: EASE }}
              className="inline-flex"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </motion.span>
          </AnimatePresence>
        </button>
        <a
          href="/"
          onClick={(event) => { event.preventDefault(); onHome(); setIsMenuOpen(false); }}
          aria-label={`${brandName} — home`}
          aria-current={activeTab === 'gallery' ? 'page' : undefined}
          className="absolute left-1/2 -translate-x-1/2 leading-none font-mono px-3 py-2 text-[var(--c-accent)]"
        >
          <span className="text-lg min-[360px]:text-xl tracking-[0.22em] pl-[0.22em]">{brandName}</span>
        </a>
        {/* Language is the only control that earns a place beside the wordmark
            here. Issue used to sit next to it as a filled pill, which made the
            header compete with the page: two buttons plus the mark, the loudest
            of them a shortcut to one section among eleven — all of which the
            menu already lists. The pill is small and quiet on purpose; the tap
            target underneath it is not, hence the inset ::after. */}
        <div className="relative z-10 flex items-center">
          <button
            type="button"
            onClick={() => { setIsMenuOpen(false); setIsLangOpen(true); }}
            aria-label={`${LANG_LABELS[currentLang] || currentLang}. Select language`}
            aria-haspopup="dialog"
            aria-expanded={isLangOpen}
            className="relative h-11 px-2.5 inline-flex items-center justify-center gap-1 rounded-full border border-[rgb(var(--c-accent-rgb)_/_0.24)] font-mono text-[10px] font-bold tracking-[0.14em] uppercase text-[var(--c-accent)] hover:bg-[rgb(var(--c-accent-rgb)_/_0.07)] active:scale-95 transition after:absolute after:-inset-1.5 after:content-['']"
          >
            <Globe size={12} aria-hidden="true" className="opacity-70" />
            {currentLang}
          </button>
        </div>
      </nav>

      {/* ── Desktop header ── */}
      <nav className="hidden lg:flex fixed top-0 left-0 w-full z-50 bg-[var(--c-bg)] border-b border-[var(--c-accent)] text-xs font-mono uppercase tracking-widest text-[var(--c-accent)] h-16">
        {/* Logo Section */}
        <div className={`w-64 border-r border-[var(--c-accent)] px-6 flex items-center shrink-0 z-50 ${activeTab === 'gallery' ? 'bg-[var(--c-accent)] text-[var(--c-bg)]' : 'bg-[var(--c-bg)] text-[var(--c-accent)]'} transition-colors duration-200`}>
          <a href="/" className="flex items-center font-mono text-current" onClick={(event) => { event.preventDefault(); onHome(); }} aria-label={`${brandName} — home`} aria-current={activeTab === 'gallery' ? 'page' : undefined}>
            <span className="text-xl tracking-[0.2em] pl-[0.2em] normal-case leading-none">{brandName}</span>
          </a>
        </div>

        {/* Desktop Navigation */}
        <LayoutGroup id="nav-tabs">
          <div
            className="grid flex-1 divide-x divide-[var(--c-accent)]"
            style={{ gridTemplateColumns: `repeat(${Math.max(tabs.length + 1, 2)}, minmax(0, 1fr))` }}
          >
            {tabs.map((tab) => (
              <a
                key={tab.id}
                href={tabHref(tab.id)}
                onClick={(event) => handleTabLink(event, tab.id)}
                aria-current={activeTab === tab.id ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center group h-full overflow-hidden ${
                  activeTab === tab.id ? 'bg-[var(--c-accent)] text-[var(--c-bg)]' : 'hover:bg-[rgb(var(--c-accent-rgb)_/_0.08)] text-[var(--c-accent)]'
                } transition-colors duration-200`}
              >
                <span className="font-bold relative z-10">{tab.label}</span>
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-[var(--c-accent)]"
                    style={{ zIndex: 0 }}
                    transition={{ type: 'spring', bounce: 0.18, duration: 0.55 }}
                  />
                )}
              </a>
            ))}
            {/* Ссылка, а не вкладка: /showcase — собственный маршрут вне
                управляемого набора секций, поэтому и переход обычный. */}
            <a
              href="/showcase"
              className="relative flex flex-col items-center justify-center group h-full overflow-hidden text-[var(--c-accent)] hover:bg-[rgb(var(--c-accent-rgb)_/_0.08)] transition-colors duration-200"
            >
              <span className="font-bold relative z-10">Showcase</span>
            </a>
          </div>
        </LayoutGroup>

        {/* Desktop Right Section */}
        <div className="flex divide-x divide-[var(--c-accent)] border-l border-[var(--c-accent)]">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            aria-label="Open search"
            className="w-16 flex items-center justify-center hover:bg-[var(--c-accent)] hover:text-[var(--c-bg)] transition-colors"
          >
            <Search size={16} />
          </button>
          
          <div className="relative w-16">
            <button
              type="button"
              className="w-full h-full flex items-center justify-center hover:bg-[var(--c-accent)] hover:text-[var(--c-bg)] transition-colors"
              onClick={() => setIsLangOpen(!isLangOpen)}
              aria-label="Select language"
            >
              {currentLang}
            </button>
            <AnimatePresence>
            {isLangOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.18, ease: EASE }}
                className="absolute top-full right-0 w-16 bg-[var(--c-bg)] border-x border-b border-[var(--c-accent)] z-50"
              >
                {languages.filter(l => l !== currentLang).map(lang => (
                  <button
                    type="button"
                    key={lang}
                    onClick={() => { setCurrentLang(lang); setIsLangOpen(false); }}
                    className="w-full py-2 hover:bg-[var(--c-accent)] hover:text-[var(--c-bg)] transition-colors block text-center border-b border-[rgb(var(--c-accent-rgb)_/_0.2)] last:border-0"
                  >
                    {lang}
                  </button>
                ))}
              </motion.div>
            )}
            </AnimatePresence>
          </div>

        </div>
      </nav>

      {/* Mobile language sheet — reachable directly from the header, with
          full language names and thumb-sized targets. */}
      <AnimatePresence>
        {isLangOpen && (
          <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true" aria-label="Select language">
            <motion.button
              type="button"
              aria-label="Close language selector"
              className="absolute inset-0 w-full h-full bg-[rgb(var(--c-accent-rgb)_/_0.28)] backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLangOpen(false)}
            />
            {/* A sheet the thumb pulls up should answer like a physical one, so
                it arrives on a spring — damped hard enough not to wobble, which
                on a serif magazine would read as a toy. It leaves on a tween:
                springing away makes dismissal feel hesitant. */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%', transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }}
              transition={{ type: 'spring', stiffness: 420, damping: 40, mass: 0.9 }}
              className="absolute inset-x-0 bottom-0 max-h-[78dvh] overflow-y-auto rounded-t-[28px] border-t border-[rgb(var(--c-accent-rgb)_/_0.24)] bg-[var(--c-bg)] px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl"
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[rgb(var(--c-accent-rgb)_/_0.22)]" aria-hidden="true" />
              <div className="flex items-center justify-between gap-4 px-1 pb-3">
                <div>
                  <p className="font-serif text-xl leading-tight">{t('lang.title')}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] opacity-55">{t('lang.chooseEdition')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLangOpen(false)}
                  aria-label="Close language selector"
                  className="h-11 w-11 inline-flex items-center justify-center rounded-full border border-[rgb(var(--c-accent-rgb)_/_0.25)] active:scale-95 transition"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="grid grid-cols-1 min-[430px]:grid-cols-2 gap-2">
                {languages.map(lang => {
                  const active = currentLang === lang;
                  return (
                    <button
                      type="button"
                      key={lang}
                      onClick={() => { setCurrentLang(lang); setIsLangOpen(false); }}
                      aria-pressed={active}
                      className={`min-h-14 px-4 rounded-2xl border flex items-center justify-between gap-4 text-left transition active:scale-[0.98] ${active ? 'bg-[var(--c-accent)] text-[var(--c-bg)] border-[var(--c-accent)]' : 'border-[rgb(var(--c-accent-rgb)_/_0.2)] hover:bg-[rgb(var(--c-accent-rgb)_/_0.07)]'}`}
                    >
                      <span className="font-serif text-[17px]">{LANG_LABELS[lang] || lang}</span>
                      <span className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.14em] opacity-70">
                        {lang}{active && <Check size={16} aria-hidden="true" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Search Overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="fixed inset-0 z-[70] bg-[rgb(var(--c-bg-rgb)_/_0.96)] backdrop-blur-sm flex items-center justify-center p-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="site-search-title"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setIsSearchOpen(false);
            }}
          >
            <button
              type="button"
              onClick={() => setIsSearchOpen(false)}
              aria-label="Close search"
              className="absolute top-[calc(1rem+env(safe-area-inset-top))] right-4 sm:top-8 sm:right-8 h-11 w-11 inline-flex items-center justify-center hover:bg-[var(--c-accent)] hover:text-[var(--c-bg)] rounded-full transition-colors border border-[var(--c-accent)]"
            >
              <X size={24} />
            </button>
            <motion.form
              initial={{ opacity: 0, y: 22, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.28, ease: EASE }}
              onSubmit={handleSearch}
              className="w-full max-w-3xl rounded-[28px] border border-[rgb(var(--c-accent-rgb)_/_0.16)] bg-[rgb(var(--c-bg-rgb)_/_0.68)] p-5 shadow-[0_24px_80px_-52px_rgb(var(--c-accent-rgb)_/_0.72)] sm:p-8"
            >
              <label id="site-search-title" htmlFor="site-search-input" className="sr-only">{t('search.dialogTitle')}</label>
              <input 
                id="site-search-input"
                type="search"
                placeholder={t('search.placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                maxLength={120}
                autoComplete="off"
                enterKeyHint="search"
                className="w-full bg-transparent border-b-2 border-[var(--c-accent)] text-3xl md:text-5xl font-serif text-[var(--c-accent)] placeholder-[rgb(var(--c-accent-rgb)_/_0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-gold)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--c-bg)] py-4 text-center"
                autoFocus
              />
              <div className="mt-6 flex items-center justify-center gap-4">
                <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-widest opacity-50">{t('search.hint')}</span>
                <button
                  type="submit"
                  disabled={!searchQuery.trim()}
                  className="min-h-11 px-6 rounded-full bg-[var(--c-accent)] text-[var(--c-bg)] font-mono text-xs uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-gold)]"
                >
                  {t('search.submit')}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.24, ease: EASE }}
            className="fixed top-16 left-0 w-full h-[calc(100dvh-4rem)] bg-[rgb(var(--c-bg-rgb)_/_0.98)] z-40 flex flex-col lg:hidden overflow-y-auto shadow-[0_28px_80px_-50px_rgb(var(--c-accent-rgb)_/_0.65)] backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
          >
            <motion.div
              initial="hidden"
              animate="show"
              exit="hidden"
              variants={{
                hidden: { transition: { staggerChildren: 0.018, staggerDirection: -1 } },
                show: { transition: { delayChildren: 0.035, staggerChildren: 0.035 } },
              }}
              className="flex flex-col divide-y divide-[var(--c-accent)] border-b border-[var(--c-accent)]"
            >
              <motion.a
                href={tabHref('gallery')}
                variants={{
                  hidden: { opacity: 0, x: -14 },
                  show: { opacity: 1, x: 0, transition: { duration: 0.22, ease: EASE } },
                }}
                onClick={(event) => {
                  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                  event.preventDefault();
                  onHome();
                  setIsMenuOpen(false);
                }}
                aria-current={activeTab === 'gallery' ? 'page' : undefined}
                className={`min-h-[64px] px-6 py-4 flex items-center justify-between text-left transition-colors active:scale-[0.99] ${
                  activeTab === 'gallery' ? 'bg-[var(--c-accent)] text-[var(--c-bg)]' : ''
                }`}
              >
                <span className="font-serif font-normal text-xl leading-tight">{t('nav.home')}</span>
              </motion.a>
              {tabs.map((tab) => (
                <motion.a
                  key={tab.id}
                  href={tabHref(tab.id)}
                  variants={{
                    hidden: { opacity: 0, x: -14 },
                    show: { opacity: 1, x: 0, transition: { duration: 0.22, ease: EASE } },
                  }}
                  onClick={(event) => { handleTabLink(event, tab.id); if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) setIsMenuOpen(false); }}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                  className={`min-h-[64px] px-6 py-4 flex items-center justify-between text-left transition-colors active:scale-[0.99] ${
                    activeTab === tab.id ? 'bg-[var(--c-accent)] text-[var(--c-bg)]' : ''
                  }`}
                >
                  <span className="font-serif font-normal text-xl leading-tight">{tab.label}</span>
                </motion.a>
              ))}
              <motion.a
                href="/showcase"
                variants={{
                  hidden: { opacity: 0, x: -14 },
                  show: { opacity: 1, x: 0, transition: { duration: 0.22, ease: EASE } },
                }}
                onClick={() => setIsMenuOpen(false)}
                className="min-h-[64px] px-6 py-4 flex items-center justify-between text-left transition-colors active:scale-[0.99]"
              >
                <span className="font-serif font-normal text-xl leading-tight">Showcase</span>
              </motion.a>
            </motion.div>
            
            <div className="mt-auto border-t border-[var(--c-accent)]">
              <button
                type="button"
                onClick={() => { setIsMenuOpen(false); setIsLangOpen(true); }}
                className="w-full min-h-14 px-5 border-b border-[var(--c-accent)] flex items-center justify-between text-left"
              >
                <span className="flex items-center gap-3 font-serif text-lg"><Globe size={20} /> {LANG_LABELS[currentLang] || currentLang}</span>
                <span className="font-mono text-xs font-bold tracking-widest">{currentLang}</span>
              </button>
              <div className="p-4 flex justify-center">
                <button type="button" aria-label="Open search" className="h-12 min-w-12 rounded-full border border-[rgb(var(--c-accent-rgb)_/_0.25)] inline-flex items-center justify-center" onClick={() => { setIsMenuOpen(false); setIsSearchOpen(true); }}>
                  <Search size={24} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function SectionMasthead({ t, brandName = 'EPRIS', variant = 'photo' }: { t: (key: string) => string; brandName?: string; variant?: 'photo' | 'plain' }) {
  const lockup = (
    <>
      <div className="leading-none shrink-0 font-mono">
        <div className="text-lg sm:text-2xl tracking-[0.18em]">{brandName}</div>
        <div className="font-mono text-[8px] sm:text-[9px] tracking-[0.3em] uppercase opacity-70 mt-1">journal</div>
      </div>
      <div className="hidden sm:flex items-center gap-4 flex-1 justify-center min-w-0">
        <span className="h-px flex-1 max-w-[80px] bg-current opacity-40" />
        <span className="font-mono text-[10px] tracking-[0.28em] uppercase whitespace-nowrap">{t('hero.tagline1')}</span>
        <span className="h-px flex-1 max-w-[80px] bg-current opacity-40" />
      </div>
      <div className="font-mono text-[9px] sm:text-[10px] tracking-[0.28em] uppercase shrink-0 opacity-90">
        {t('hero.tagline2')}
      </div>
    </>
  );

  if (variant === 'plain') {
    return (
      <div className="px-5 sm:px-10 md:px-16 pt-9 pb-8 sm:pt-20 sm:pb-14 flex items-end justify-between gap-4 sm:gap-8 text-[var(--c-accent)]">
        {lockup}
      </div>
    );
  }

  return (
    <div className="relative h-[240px] sm:h-[320px] md:h-[360px] overflow-hidden">
      <img
        src="/images/hero-kitchen.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />
      {/* Film grain */}
      <div
        className="absolute inset-0 opacity-[0.35] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
        }}
      />
      {/* Legibility scrim */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(10,8,6,.1) 0%, rgba(10,8,6,.15) 40%, rgba(10,8,6,.62) 100%)' }}
      />
      <div className="absolute inset-x-0 bottom-0 px-5 sm:px-10 md:px-16 pb-5 sm:pb-8 flex items-end justify-between gap-4 sm:gap-8 text-[#F7F2EC]">
        {lockup}
      </div>
    </div>
  );
}

// Preserve the original order for existing records that predate the admin's
// team controls. New and edited members receive an explicit teamOrder.
const LEGACY_TEAM_ORDER = new Map([
  ['author-1784896384236-4fokw', 1],
  ['author-1785148692253-eva', 2],
  ['author-1784732936927-kw554', 3],
]);

function TeamMemberCard({
  author,
  roleLabel,
  bioText,
  websiteLabel,
}: {
  author: Author;
  roleLabel: string;
  bioText?: ReactNode;
  websiteLabel: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 sm:gap-12 max-w-2xl mx-auto">
      {author.photoUrl && (
        <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden shrink-0 border border-[rgb(var(--c-accent-rgb)_/_0.2)]">
          <img src={author.photoUrl} alt={author.name} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="text-center sm:text-left">
        <h4 className="font-serif text-2xl md:text-3xl text-[var(--c-accent)] mb-1">{author.name}</h4>
        <div className="font-mono text-xs uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.6)] mb-4">
          {roleLabel}
        </div>
        {bioText && (
          <div className="font-serif text-[rgb(var(--c-accent-rgb)_/_0.8)] [&>p]:mb-4 last:[&>p]:mb-4">{bioText}</div>
        )}
        {(author.website || author.instagram) && (
          <div className="flex justify-center sm:justify-start gap-4 font-serif text-sm text-[var(--c-accent)]">
            {author.website && (
              <a href={author.website} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--c-gold)] transition-colors">
                {websiteLabel}
              </a>
            )}
            {author.instagram && (
              <a
                href={`https://instagram.com/${author.instagram.replace(/^@/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[var(--c-gold)] transition-colors"
              >
                Instagram
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AboutSection({ t, currentLang, onOpenManifest }: { t: (key: string) => string; currentLang: string; onOpenManifest: () => void }) {
  const team = getAuthors()
    .filter((author) => author.active !== false && author.showOnTeam !== false)
    .sort((a, b) => {
      const aOrder = a.teamOrder ?? LEGACY_TEAM_ORDER.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const bOrder = b.teamOrder ?? LEGACY_TEAM_ORDER.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder || a.name.localeCompare(b.name);
    });

  return (
    <div className="max-w-4xl mx-auto">
      {/*
        One team, one list, one card pattern — Mariia isn't a separate
        "editor-in-chief spread" bolted onto the team below her, she's the
        first card in it. A link to the manifesto closes out the "who we
        are" story with "what we believe".
      */}
      {team.length > 0 && (
        <Reveal>
          <div className="mb-16">
            <h3 className="font-serif text-3xl md:text-4xl text-[var(--c-accent)] mb-12 text-center">{t('about.team')}</h3>
            <div className="flex flex-col gap-16 sm:gap-20">
              {team.map((member) => {
                const isEditor = member.id === 'author-1784896384236-4fokw';
                const isTechDirector = member.id === 'author-1784732936927-kw554';

                // Mariia's role/quote/bio and the tech director's role/bio were
                // localized under fixed translation keys before this was a
                // uniform list; keep that behavior for them specifically, and
                // fall back to the Author record's own fields for anyone
                // added after (currently English-only, e.g. Eva).
                const roleKey = `about.team.${member.id}.role`;
                const bioKey = `about.team.${member.id}.bio`;
                const translatedRole = t(roleKey);
                const translatedBio = t(bioKey);
                let roleLabel = translatedRole !== roleKey ? translatedRole : (translateRole(member.role, currentLang) || member.role || '');
                let bioText: ReactNode = member.bio;
                if (isEditor) {
                  roleLabel = t('editor');
                  bioText = (
                    <>
                      <p>{t('about.quote1')}</p>
                      <p>{t('about.bio')}</p>
                    </>
                  );
                } else if (isTechDirector) {
                  roleLabel = t('about.techDirector.role');
                  const localizedBio = t('about.techDirector.bio');
                  bioText = <p>{localizedBio !== 'about.techDirector.bio' ? localizedBio : member.bio}</p>;
                } else if (translatedBio !== bioKey || member.bio) {
                  bioText = <p>{translatedBio !== bioKey ? translatedBio : member.bio}</p>;
                }

                return (
                  <TeamMemberCard key={member.id} author={member} roleLabel={roleLabel} bioText={bioText} websiteLabel={t('about.website')} />
                );
              })}
            </div>
          </div>
        </Reveal>
      )}

      <Reveal delay={0.15}>
        <div className="border-t border-[var(--c-accent)] pt-16 mt-24 text-center">
          <button
            type="button"
            onClick={onOpenManifest}
            className="inline-flex flex-col items-center gap-2 group"
          >
            <span className="font-mono text-xs uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.5)]">
              {t('nav.manifest')}
            </span>
            <span className="font-serif text-2xl sm:text-3xl text-[var(--c-accent)] group-hover:text-[var(--c-gold)] transition-colors underline decoration-1 underline-offset-4 decoration-[rgb(var(--c-accent-rgb)_/_0.3)]">
              {t('about.readManifest')} →
            </span>
          </button>
        </div>
      </Reveal>
    </div>
  );
}

function ManifestPage({ t, currentLang }: { t: (key: string) => string; currentLang: string }) {
  const entry = getManifest(currentLang);
  const title = entry.title || t('nav.manifest');
  const body = entry.body || '';
  return (
    <div className="max-w-3xl mx-auto py-8 sm:py-16">
      <Reveal>
        <div className="font-mono text-xs uppercase tracking-[0.3em] text-[rgb(var(--c-accent-rgb)_/_0.5)] mb-6 text-center">
          EPRIS Journal
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl md:text-7xl text-[var(--c-accent)] mb-10 sm:mb-16 text-center leading-tight">
          {title}
        </h1>
      </Reveal>
      <Reveal delay={0.15}>
        {body ? (
          <div
            className="manifest-body font-serif text-lg sm:text-xl leading-relaxed text-[rgb(var(--c-accent-rgb)_/_0.85)] rich-text"
            dangerouslySetInnerHTML={{ __html: sanitizeRichText(body) }}
          />
        ) : (
          <p className="font-serif text-lg text-[rgb(var(--c-accent-rgb)_/_0.6)] text-center italic">
            {t('manifest.empty')}
          </p>
        )}
      </Reveal>
    </div>
  );
}

const HOMEPAGE_CATEGORY_LABEL_TRANSLATIONS: Record<string, Record<string, string>> = {
  sculpture: { EN: 'Sculpture', RU: 'Скульптура', UA: 'Скульптура', DE: 'Skulptur', IT: 'Scultura', ES: 'Escultura', TR: 'Heykel' },
  painting: { EN: 'Painting', RU: 'Живопись', UA: 'Живопис', DE: 'Malerei', IT: 'Pittura', ES: 'Pintura', TR: 'Resim' },
  architecture: { EN: 'Architecture', RU: 'Архитектура', UA: 'Архітектура', DE: 'Architektur', IT: 'Architettura', ES: 'Arquitectura', TR: 'Mimarlık' },
  design: { EN: 'Design', RU: 'Дизайн', UA: 'Дизайн', DE: 'Design', IT: 'Design', ES: 'Diseño', TR: 'Tasarım' },
  photography: { EN: 'Photography', RU: 'Фотография', UA: 'Фотографія', DE: 'Fotografie', IT: 'Fotografia', ES: 'Fotografía', TR: 'Fotoğraf' },
};

function localizedHomepageCategoryLabel(category: HomepagePicsCategory, lang: string): string {
  return category.labels?.[lang]?.trim()
    || HOMEPAGE_CATEGORY_LABEL_TRANSLATIONS[category.id]?.[lang]
    || category.label;
}

function homepageItemTitle(item: Item): string {
  return item.homeTitle?.trim() || item.title?.trim() || '';
}

function homepageItemDescription(item: Item, fallback: string): string {
  return item.homeDescription?.trim() || item.description?.trim() || item.homeSubtitle?.trim() || item.subtitle?.trim() || homepageItemTitle(item) || fallback;
}

// An article owns its byline. A linked author card enriches that byline but
// never replaces a named contributor with one default person: guest writers,
// editors and studios must remain distinct on every screen size.
type BylineEntity = Pick<Article, 'author' | 'authorId' | 'role'>;

function resolveBylineAuthor(entity: BylineEntity): Author | null {
  const direct = resolveAuthor(entity);
  if (direct) return direct;
  // Older editor versions wrote the selected person's name into `role` while
  // leaving `author` as "EPRIS Journal". Recover that unambiguous legacy shape
  // for readers; the content audit also migrates those records permanently.
  const namedAuthor = entity.author?.trim() || '';
  const legacyName = entity.role?.trim().toLocaleLowerCase() || '';
  if ((!namedAuthor || /^epris\s+journal$/i.test(namedAuthor)) && legacyName) {
    return getAuthors().find((author) => author.name.trim().toLocaleLowerCase() === legacyName) || null;
  }
  return null;
}

function displayArticleAuthor(article: BylineEntity): string {
  const namedAuthor = article.author?.trim() || '';
  // The text stored on the material is the publication credit. An author card
  // only fills the generic EPRIS Journal fallback; it must never turn a guest
  // piece into somebody else's byline just because an older editor left an
  // authorId behind.
  if (namedAuthor && !/^epris\s+journal$/i.test(namedAuthor)) return namedAuthor;
  return resolveBylineAuthor(article)?.name?.trim() || namedAuthor || 'EPRIS Journal';
}

function GallerySection({ items, onImageClick, currentLang, t }: { items: Item[]; onImageClick: (src: string, alt: string) => void; currentLang: string; t: (key: string) => string }) {
  const homepageSettings = getHomepageSettings();
  const picsSettings = homepageSettings.picsOfWeek || {};
  const picsLayout = homepageSettings.layout?.pics || {};
  const showDescriptions = picsLayout.showDescriptions !== false;
  const showCategory = picsLayout.showCategory !== false;
  const showNavigation = picsLayout.showNavigation !== false;
  const captionsOverlay = picsLayout.captionPlacement === 'overlay';
  const mobilePeek = picsLayout.mobileMode === 'peek';
  const compactCards = picsLayout.cardStyle === 'compact';
  const picksMode = picsSettings.mode === 'auto' ? 'auto' : 'manual';
  const useLifo = picsSettings.ordering !== 'manual';
  const activeRelease = getActiveHomepagePicsRelease();
  // Pics of the week is an independent curated collection. Article covers and
  // inline article media are deliberately excluded even when they carry the
  // same category words or an image URL.
  const publishedPhotoItems = items.filter((item) => item.picsOfWeek === true && Boolean(String(item.imageUrl || '').trim()));
  // Once an editor publishes a release, its PICS ids are the single source of
  // truth for the live carousel. New cards may be prepared in the library,
  // but cannot displace the current week merely because they are newer. Sites
  // without release data retain the original LIFO/manual behaviour below.
  const activeReleaseIds = new Set((activeRelease?.picsIds || []).map((id) => String(id).trim()).filter(Boolean));
  const releasePhotoItems = activeRelease
    ? publishedPhotoItems.filter((item) => activeReleaseIds.has(getPicsId(item)) || item.picsReleaseId === activeRelease.id)
    : publishedPhotoItems;
  const orderedItems = picksMode === 'auto' || useLifo
    ? [...releasePhotoItems].sort((a, b) => {
        const stamp = (value?: string) => {
          const parsed = value ? Date.parse(value) : Number.NaN;
          return Number.isFinite(parsed) ? parsed : 0;
        };
        return stamp(b.updatedAt || b.publishAt) - stamp(a.updatedAt || a.publishAt)
          || getPicsId(b).localeCompare(getPicsId(a));
      })
    : activeRelease
      ? [...releasePhotoItems].sort((a, b) => {
          const aIndex = activeReleaseIds.size ? activeRelease.picsIds.indexOf(getPicsId(a)) : Number.MAX_SAFE_INTEGER;
          const bIndex = activeReleaseIds.size ? activeRelease.picsIds.indexOf(getPicsId(b)) : Number.MAX_SAFE_INTEGER;
          return aIndex - bIndex;
        })
      : publishedPhotoItems;
  const configuredCategories = Array.isArray(picsSettings.categories) ? picsSettings.categories : [];
  const categories = [...configuredCategories, ...DEFAULT_HOMEPAGE_PICS_CATEGORIES]
    .filter((category, index, all) => category && category.id && all.findIndex((candidate) => candidate?.id === category.id) === index)
    .slice(0, 5)
    .map((category, index) => ({
      ...(DEFAULT_HOMEPAGE_PICS_CATEGORIES.find((fallback) => fallback.id === category.id) || DEFAULT_HOMEPAGE_PICS_CATEGORIES[index]),
      ...category,
      matches: Array.isArray(category.matches) && category.matches.length ? category.matches : (DEFAULT_HOMEPAGE_PICS_CATEGORIES[index]?.matches || []),
    })) as HomepagePicsCategory[];
  const classify = (item: Item) => {
    const text = `${item.subtitle || ''} ${item.title || ''}`.toLowerCase();
    return item.homeCategory && categories.some((category) => category.id === item.homeCategory)
      ? item.homeCategory
      : categories.find((category) => (category.matches || []).some((match) => text.includes(String(match).toLowerCase())))?.id || categories[0]?.id;
  };
  const categorized = categories.map((category) => ({
    ...category,
    items: orderedItems.filter((item) => classify(item) === category.id),
  }));
  const featuredItems = categorized.map((category) => ({
    category,
    item: category.items[0] || null,
  }));
  // Keep the selected work in the visual centre (position 3) while the
  // surrounding four works stay smaller. Wrapping the order makes the arrows
  // feel continuous instead of running into an artificial end.
  const configuredCenterCategory = String(picsSettings.centerCategory || '').trim();
  const configuredCenterIndex = categories.findIndex((category) => category.id === configuredCenterCategory);
  const defaultCenterIndex = configuredCenterIndex >= 0 ? configuredCenterIndex : Math.min(2, Math.max(0, featuredItems.length - 1));
  const [centerIndex, setCenterIndex] = useState(defaultCenterIndex);
  const [carouselDirection, setCarouselDirection] = useState<-1 | 1>(1);
  const [expandedPicsId, setExpandedPicsId] = useState('');
  const previousConfiguredCenterIndexRef = useRef(configuredCenterIndex);
  const itemCount = featuredItems.length;
  const safeCenterIndex = itemCount ? ((centerIndex % itemCount) + itemCount) % itemCount : 0;
  const dragStateRef = useRef<{ pointerId: number; x: number; y: number; moved: boolean } | null>(null);
  const touchStateRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  // Safari/WebViews can expose Pointer Events inconsistently. Whichever input
  // stream starts first owns this gesture; the other becomes a harmless
  // fallback rather than advancing the carousel twice.
  const gestureSourceRef = useRef<{ source: 'pointer' | 'touch'; startedAt: number } | null>(null);
  const suppressCardClickRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const centeredItems = itemCount
    ? Array.from({ length: itemCount }, (_, position) => featuredItems[(safeCenterIndex + position - 2 + itemCount) % itemCount])
    : [];

  useEffect(() => {
    // The admin value is the starting centre, not a lock. Readers must still
    // be able to move through every work with a swipe, dot, or arrow.
    if (previousConfiguredCenterIndexRef.current !== configuredCenterIndex) {
      previousConfiguredCenterIndexRef.current = configuredCenterIndex;
      if (configuredCenterIndex >= 0) setCenterIndex(configuredCenterIndex);
    }
  }, [configuredCenterIndex]);

  useEffect(() => {
    if (!itemCount) return;
    if (centerIndex !== safeCenterIndex) setCenterIndex(safeCenterIndex);
  }, [centerIndex, itemCount, safeCenterIndex]);

  const moveCarousel = (direction: -1 | 1) => {
    if (!itemCount) return;
    setCarouselDirection(direction);
    setExpandedPicsId('');
    setCenterIndex((current) => (current + direction + itemCount) % itemCount);
  };
  const suppressNextCardClick = () => {
    suppressCardClickRef.current = true;
    window.setTimeout(() => { suppressCardClickRef.current = false; }, 500);
  };
  const finishCarouselGesture = (drag: { x: number; y: number; moved: boolean }, clientX: number, clientY: number, cancelled = false) => {
    if (cancelled) return;
    const deltaX = clientX - drag.x;
    const deltaY = clientY - drag.y;
    const horizontalSwipe = Math.abs(deltaX) >= 36 && Math.abs(deltaX) > Math.abs(deltaY) * 1.15;
    if (drag.moved) suppressNextCardClick();
    if (horizontalSwipe) moveCarousel(deltaX < 0 ? 1 : -1);
  };
  const handleCarouselPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    // iOS/WebViews may dispatch Pointer Events and Touch Events for the same
    // finger. Let the dedicated touch path own every touch gesture: it keeps
    // working even when Safari sends pointercancel during a normal swipe.
    if (event.pointerType === 'touch') return;
    if ((event.pointerType === 'mouse' && event.button !== 0) || event.isPrimary === false) return;
    const activeGesture = gestureSourceRef.current;
    if (activeGesture?.source === 'touch' && Date.now() - activeGesture.startedAt < 1200) return;
    gestureSourceRef.current = { source: 'pointer', startedAt: Date.now() };
    dragStateRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    setIsDragging(true);
  };
  const handleCarouselPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') return;
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 8 && !drag.moved) {
      drag.moved = true;
      // Capture only after it is proven to be a drag. Capturing on mousedown
      // retargets a normal click from the image button to this container in
      // Chromium, which made the centred photograph look unresponsive.
      try { event.currentTarget.setPointerCapture?.(event.pointerId); } catch { /* capture is optional */ }
    }
  };
  const handleCarouselPointerEnd = (event: ReactPointerEvent<HTMLDivElement>, cancelled = false) => {
    if (event.pointerType === 'touch') return;
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragStateRef.current = null;
    if (gestureSourceRef.current?.source === 'pointer') gestureSourceRef.current = null;
    setIsDragging(false);
    if (event.pointerType === 'mouse' && drag.moved) {
      try { event.currentTarget.releasePointerCapture?.(event.pointerId); } catch { /* capture may already be released */ }
    }
    finishCarouselGesture(drag, event.clientX, event.clientY, cancelled);
  };
  const handleCarouselTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    const activeGesture = gestureSourceRef.current;
    if (activeGesture?.source === 'pointer' && Date.now() - activeGesture.startedAt < 1200) return;
    const touch = event.touches[0];
    if (!touch) return;
    gestureSourceRef.current = { source: 'touch', startedAt: Date.now() };
    touchStateRef.current = { x: touch.clientX, y: touch.clientY, moved: false };
    setIsDragging(true);
  };
  const handleCarouselTouchMove = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (gestureSourceRef.current?.source !== 'touch') return;
    const drag = touchStateRef.current;
    const touch = event.touches[0];
    if (!drag || !touch) return;
    if (Math.hypot(touch.clientX - drag.x, touch.clientY - drag.y) > 8) drag.moved = true;
  };
  const handleCarouselTouchEnd = (event: ReactTouchEvent<HTMLDivElement>, cancelled = false) => {
    if (gestureSourceRef.current?.source !== 'touch') return;
    const drag = touchStateRef.current;
    const touch = event.changedTouches[0];
    touchStateRef.current = null;
    gestureSourceRef.current = null;
    setIsDragging(false);
    if (!drag || !touch) return;
    finishCarouselGesture(drag, touch.clientX, touch.clientY, cancelled);
  };
  const handleCarouselArtworkClick = (position: number, src: string, alt: string) => {
    if (suppressCardClickRef.current) {
      suppressCardClickRef.current = false;
      return;
    }
    // The centred photograph is the only work opened in the lightbox. A
    // click on a desktop side preview first brings that work to the centre;
    // the next click opens it full-screen. This prevents a reader from
    // unexpectedly losing their place while browsing the strip.
    if (position === 2) {
      onImageClick(src, alt);
      return;
    }
    const offset = position - 2;
    setCarouselDirection(offset > 0 ? 1 : -1);
    setExpandedPicsId('');
    setCenterIndex((current) => (current + offset + itemCount) % itemCount);
  };
  const centerScale = Math.max(0.96, Math.min(1.14, Number(picsSettings.centerScale) || 1));
  const sideScale = Math.max(0.72, Math.min(0.94, Number(picsSettings.sideScale) || 0.88));
  const carouselGap = Math.max(12, Math.min(40, Number(picsSettings.gap) || 24));
  const carouselStyle = {
    '--home-carousel-gap': `${carouselGap}px`,
    '--home-carousel-center-scale': String(centerScale),
    '--home-carousel-side-scale': String(sideScale),
  } as CSSProperties;

  return (
    <section className="home-pics-section" aria-labelledby="pics-of-week-title">
      <Reveal>
        <div className="mb-7 flex items-center justify-between gap-4 border-b border-[rgb(var(--c-accent-rgb)_/_0.2)] pb-4">
          <h1 id="pics-of-week-title" className="font-crimson text-3xl text-[var(--c-accent)] sm:text-4xl">{t('homepage.picsTitle')}</h1>
        </div>
        {showNavigation && <div className="home-carousel-mobile-controls" aria-label={t('homepage.carouselLabel')}>
          <div className="home-carousel-mobile-status">
            <span className="home-carousel-mobile-count" aria-hidden="true">
              {String(safeCenterIndex + 1).padStart(2, '0')} / {String(Math.max(itemCount, 1)).padStart(2, '0')}
            </span>
            <div className="home-carousel-mobile-dots" role="tablist" aria-label={t('homepage.carouselLabel')}>
              {featuredItems.map(({ category }, index) => {
                const label = localizedHomepageCategoryLabel(category, currentLang);
                const isActive = index === safeCenterIndex;
                return (
                  <button
                    key={category.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`${label} ${index + 1}`}
                    className={`home-carousel-mobile-dot${isActive ? ' is-active' : ''}`}
                    onClick={() => {
                      setCarouselDirection(index >= safeCenterIndex ? 1 : -1);
                      setExpandedPicsId('');
                      setCenterIndex(index);
                    }}
                  >
                    <span aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>}
        <div className="home-carousel-frame">
          {showNavigation && <button type="button" onClick={() => moveCarousel(-1)} className="home-carousel-edge-arrow home-carousel-edge-arrow--prev" aria-label={t('homepage.previous')}><ArrowLeft size={17} strokeWidth={1.5} aria-hidden="true" /></button>}
          <div
            style={carouselStyle}
            className={`home-carousel${isDragging ? ' is-dragging' : ''}${captionsOverlay ? ' home-carousel--captions-overlay' : ''}${mobilePeek ? ' home-carousel--mobile-peek' : ''}${compactCards ? ' home-carousel--compact' : ''}`}
            tabIndex={-1}
            aria-label={t('homepage.carouselLabel')}
            onPointerDown={handleCarouselPointerDown}
            onPointerMove={handleCarouselPointerMove}
            onPointerUp={handleCarouselPointerEnd}
            onPointerCancel={(event) => handleCarouselPointerEnd(event, true)}
            onTouchStart={handleCarouselTouchStart}
            onTouchMove={handleCarouselTouchMove}
            onTouchEnd={handleCarouselTouchEnd}
            onTouchCancel={(event) => handleCarouselTouchEnd(event, true)}
          >
          {centeredItems.map(({ category, item }, position) => {
            const isCenter = position === 2;
            const slotClass = `home-carousel-slot ${isCenter ? 'home-carousel-slot--center' : 'home-carousel-slot--side'}`;
            if (!item) {
              return <div key={`slot-${position}`} className={`${slotClass} home-carousel-empty`}><span className="font-mono text-[10px] uppercase tracking-[0.2em]">{localizedHomepageCategoryLabel(category, currentLang)}</span><p>{t('homepage.descriptionUnavailable')}</p></div>;
            }
            const categoryLabel = localizedHomepageCategoryLabel(category, currentLang);
            const title = homepageItemTitle(item);
            const description = homepageItemDescription(item, t('homepage.descriptionUnavailable'));
            const picsId = getPicsId(item);
            const detailsOpen = isCenter && expandedPicsId === picsId;
            return (
              <div key={`slot-${position}`} className={slotClass}>
                <AnimatePresence initial={false} mode="sync">
                  <motion.article
                    key={`${getPicsId(item)}-${position}`}
                    initial={{ opacity: 0, x: carouselDirection > 0 ? 9 : -9, scale: isCenter ? centerScale * 0.992 : sideScale * 0.992 }}
                    animate={{ opacity: isCenter ? 1 : 0.8, x: 0, scale: isCenter ? centerScale : sideScale }}
                    exit={{ opacity: 0, x: carouselDirection > 0 ? -7 : 7, scale: isCenter ? centerScale * 0.996 : sideScale * 0.996 }}
                    transition={{ duration: 0.29, ease: [0.22, 1, 0.36, 1], opacity: { duration: 0.2, ease: 'easeOut' } }}
                    data-carousel-position={isCenter ? 'center' : 'side'}
                    className={`home-carousel-card group ${isCenter ? 'home-carousel-card--center' : 'home-carousel-card--side'}`}
                  >
                    <button type="button" className="home-carousel-artwork" onClick={() => handleCarouselArtworkClick(position, resolveMediaSource(item.imageUrl || item.imageSeed, 2000, 1400), `${categoryLabel}: ${title}`)} aria-label={isCenter ? `${t('homepage.openImage')}: ${categoryLabel}` : `${categoryLabel}: ${title}`} title={isCenter ? t('homepage.openImage') : undefined}>
                      <div className="home-carousel-media relative aspect-[4/5] overflow-hidden bg-[#E8DED5]">
                        <img src={resolveMediaSource(item.imageUrl || item.imageSeed, 720, 900)} alt={title} className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]" loading="lazy" referrerPolicy="no-referrer" draggable={false} />
                      </div>
                    </button>
                    <div className="home-carousel-caption">
                      {showCategory && <span className="home-carousel-caption-category">{categoryLabel}</span>}
                      <h2>{title}</h2>
                      {isCenter && showDescriptions && <button type="button" className="home-carousel-caption-toggle" aria-expanded={detailsOpen} aria-controls={`pics-details-${picsId}`} onClick={() => setExpandedPicsId((current) => current === picsId ? '' : picsId)}>{t(detailsOpen ? 'homepage.hideDetails' : 'homepage.showDetails')}</button>}
                      <AnimatePresence initial={false}>
                        {isCenter && showDescriptions && detailsOpen && <motion.div id={`pics-details-${picsId}`} className="home-carousel-caption-details" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: 0.2, ease: 'easeOut' }}><p>{description}</p></motion.div>}
                      </AnimatePresence>
                    </div>
                  </motion.article>
                </AnimatePresence>
              </div>
            );
          })}
          </div>
          {showNavigation && <button type="button" onClick={() => moveCarousel(1)} className="home-carousel-edge-arrow home-carousel-edge-arrow--next" aria-label={t('homepage.next')}><ArrowRight size={17} strokeWidth={1.5} aria-hidden="true" /></button>}
        </div>
      </Reveal>
    </section>
  );
}

/* Ordering moved to data.ts (orderArticles). It used to live here as a local
   sort by Date.parse(article.date), which the Articles grid and the homepage
   feed each called for themselves — two places deciding one thing, with no way
   for an editor to influence either. The rule now belongs to the content
   layer, where pins and the manual sequence live with it. */
function homepageArticleFeed(articles: Article[]): Article[] {
  const settings = getHomepageSettings().articles || {};
  if (settings.enabled === false) return [];
  // hideOnHome is per article and separate from `draft`: the piece is
  // published and reachable, it just does not belong on the front page.
  const sorted = orderArticles(articles).filter((article) => !article.hideOnHome);
  const limit = Number(settings.limit);
  return Number.isFinite(limit) && limit > 0 ? sorted.slice(0, Math.max(1, Math.floor(limit))) : sorted;
}

function DailyPicksArchive({ archive, items, onImageClick, currentLang, t }: { archive: HomepageArchiveEntry[]; items: Item[]; onImageClick: (src: string, alt: string, description?: string, title?: string) => void; currentLang: string; t: (key: string) => string }) {
  if (!archive.length) return null;
  const currentByPicsId = new Map(items.map((item) => [getPicsId(item), item]));
  const currentById = new Map(items.map((item) => [Number(item.id), item]));
  const archiveCategories = [
    ...(getHomepageSettings().picsOfWeek?.categories || []),
    ...DEFAULT_HOMEPAGE_PICS_CATEGORIES,
  ].filter((category, index, all) => category?.id && all.findIndex((candidate) => candidate?.id === category.id) === index);
  const languageTags: Record<string, string> = { EN: 'en', RU: 'ru', UA: 'uk', TR: 'tr', DE: 'de', IT: 'it', ES: 'es' };
  const formatDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(languageTags[currentLang] || 'en', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <section id="daily-picks" className="border-t border-[rgb(var(--c-accent-rgb)_/_0.2)] pt-12 sm:pt-16 md:pt-24" aria-labelledby="daily-picks-title">
      <div className="flex flex-col gap-4 border-b border-[rgb(var(--c-accent-rgb)_/_0.2)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--c-accent-rgb)_/_0.55)]">{t('homepage.archiveEyebrow')}</p>
          <h2 id="daily-picks-title" className="mt-2 font-crimson text-3xl text-[var(--c-accent)] sm:text-4xl">{t('homepage.archiveTitle')}</h2>
        </div>
        <p className="max-w-[38ch] font-serif text-sm leading-relaxed text-[rgb(var(--c-accent-rgb)_/_0.68)] sm:text-right">
          {t('homepage.archiveDescription')}
        </p>
      </div>
      <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {archive.slice(0, 12).map((entry) => (
          <article key={entry.id} className="group min-w-0">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--c-accent-rgb)_/_0.58)]">{entry.label || 'week'}</span>
              <time dateTime={entry.publishedAt} className="font-mono text-[9px] uppercase tracking-[0.12em] text-[rgb(var(--c-accent-rgb)_/_0.45)]">{formatDate(entry.publishedAt)}</time>
            </div>
            <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
              {entry.cards.slice(0, 5).map((card) => {
                // Archive cards are historical snapshots. Prefer their frozen
                // image and copy (including a future per-language snapshot)
                // over a mutable card that may have been edited for a newer
                // release. The live card remains a legacy fallback only when
                // an older snapshot did not include a specific field.
                const frozen = { ...card, ...(card.localized?.[currentLang] || card.localized?.[DEFAULT_LANGUAGE] || {}) };
                const localized = currentByPicsId.get(String(card.picsId || '')) || currentById.get(Number(card.id));
                const image = frozen.imageUrl || frozen.imageSeed || localized?.imageUrl || localized?.imageSeed;
                const categoryId = String(card.category || localized?.homeCategory || '').trim();
                const categoryConfig = archiveCategories.find((candidate) => candidate.id === categoryId);
                const category = categoryId
                  ? localizedHomepageCategoryLabel(categoryConfig || { id: categoryId, label: frozen.categoryLabel || categoryId }, currentLang)
                  : frozen.categoryLabel || entry.label || 'Pics';
                const title = String(frozen.title || '').trim() || homepageItemTitle(localized || ({ id: Number(card.id), title: '', subtitle: '', fig: '', description: '', imageSeed: '' } as Item)) || category;
                const description = String(frozen.description || frozen.subtitle || '').trim()
                  || (localized ? homepageItemDescription(localized, t('homepage.descriptionUnavailable')) : t('homepage.descriptionUnavailable'));
                return (
                  <div
                    key={`${entry.id}-${card.picsId || card.id}`}
                    className="group relative min-w-0 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--c-accent)] focus-visible:outline-offset-2"
                    role="button"
                    tabIndex={image ? 0 : -1}
                    aria-label={`${t('homepage.openImage')}: ${category}`}
                    onClick={() => image && onImageClick(resolveMediaSource(image, 2000, 1400), `${category}: ${title}`, description, title)}
                    onKeyDown={(event) => { if (image && (event.key === 'Enter' || event.key === ' ')) onImageClick(resolveMediaSource(image, 2000, 1400), `${category}: ${title}`, description, title); }}
                  >
                    <div className="relative aspect-[4/5] overflow-hidden bg-[#E8DED5]">
                      {image ? <img src={resolveMediaSource(image, 360, 450)} alt={category} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]" referrerPolicy="no-referrer" /> : <span className="flex h-full items-center justify-center font-mono text-[9px] text-[rgb(var(--c-accent-rgb)_/_0.45)]">{t('homepage.descriptionUnavailable')}</span>}
                    </div>
                    <div className="home-carousel-caption home-carousel-caption--archive">
                      <span className="home-carousel-caption-category">{category}</span>
                      <h3>{title}</h3>
                      <p>{description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ChecklistBlock({ items, caption }: { items: string[], caption?: string }) {
  const [checkedState, setCheckedState] = useState<boolean[]>(new Array(items.length).fill(false));

  const toggle = (index: number) => {
    const updated = [...checkedState];
    updated[index] = !updated[index];
    setCheckedState(updated);
  };

  return (
    <div className="my-12 p-8 bg-[var(--c-bg)] border border-[rgb(var(--c-accent-rgb)_/_0.2)] rounded-xl">
      {caption && (
        <h4 className="font-mono text-xs uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.6)] mb-6 flex items-center gap-2">
          <CheckSquare size={14} /> {caption}
        </h4>
      )}
      <ul className="space-y-4">
        {items.map((item, index) => (
          <li
            key={index}
            role="button"
            tabIndex={0}
            onClick={() => toggle(index)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggle(index)}
            className="flex items-start gap-4 cursor-pointer group"
          >
            <div className={`mt-1 w-5 h-5 border border-[var(--c-accent)] flex items-center justify-center transition-colors ${checkedState[index] ? 'bg-[var(--c-accent)]' : 'bg-transparent'}`}>
              {checkedState[index] && <CheckSquare size={14} className="text-[var(--c-bg)]" />}
            </div>
            <span className={`font-serif text-lg transition-opacity ${checkedState[index] ? 'opacity-40 line-through' : 'opacity-100'}`}>
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function getLegacyPollStorageKey(question: string) {
  return 'epris-poll-' + question.replace(/\s+/g, '-').toLowerCase().slice(0, 60);
}

function getPollStorageKey(pollKey: string) {
  return 'epris-poll-v2-' + pollKey;
}

// Own API (api.eprisjournal.com), not a third-party counter service — votes
// are deduped server-side by (hashed) IP, so clearing localStorage or using
// incognito no longer allows a repeat vote, and results no longer depend on
// an external service's uptime.
const POLL_API_BASE = 'https://api.eprisjournal.com';

interface PollResults { counts: Record<number, number>; votedIndex: number | null }
interface PollVoteResult extends PollResults { alreadyVoted: boolean }

async function fetchPollResults(pollKey: string): Promise<PollResults> {
  const response = await fetch(`${POLL_API_BASE}/poll-results?key=${encodeURIComponent(pollKey)}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Poll results fetch failed: ${response.status}`);
  const payload = await response.json();
  return { counts: payload.counts || {}, votedIndex: payload.votedIndex ?? null };
}

async function castPollVote(pollKey: string, optionIndex: number): Promise<PollVoteResult> {
  const response = await fetch(`${POLL_API_BASE}/poll-vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pollKey, optionIndex }),
  });
  if (!response.ok) throw new Error(`Poll vote failed: ${response.status}`);
  const payload = await response.json();
  return { counts: payload.counts || {}, votedIndex: payload.votedIndex ?? null, alreadyVoted: Boolean(payload.alreadyVoted) };
}

function readSavedPoll(storageKey: string, legacyKey: string) {
  try {
    const saved = localStorage.getItem(storageKey) || localStorage.getItem(legacyKey);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function PollBlock({ question, options, t, pollKey }: { question: string, options: { label: string, votes: number }[], t: (key: string) => string; pollKey: string }) {
  const storageKey = getPollStorageKey(pollKey);
  const legacyKey = getLegacyPollStorageKey(question);
  const [onlineVotes, setOnlineVotes] = useState<number[]>(() => options.map(() => 0));
  const [isLoadingVotes, setIsLoadingVotes] = useState(true);
  const [voteError, setVoteError] = useState('');
  const [isVoting, setIsVoting] = useState(false);

  const [votedIndex, setVotedIndex] = useState<number | null>(() => {
    const parsed = readSavedPoll(storageKey, legacyKey);
    if (parsed && typeof parsed.votedIndex === 'number') return parsed.votedIndex;
    return null;
  });

  const [localOptions, setLocalOptions] = useState(() => {
    return options;
  });

  useEffect(() => {
    const parsed = readSavedPoll(storageKey, legacyKey);
    setVotedIndex(parsed && typeof parsed.votedIndex === 'number' ? parsed.votedIndex : null);
    setLocalOptions(options);
  }, [storageKey, legacyKey, options]);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingVotes(true);
    setVoteError('');

    fetchPollResults(pollKey)
      .then(({ counts, votedIndex: serverVotedIndex }) => {
        if (cancelled) return;
        setOnlineVotes(options.map((_, i) => Number(counts[i]) || 0));
        // The server (IP-based) is authoritative: it catches repeat votes
        // even after localStorage was cleared or from a different browser.
        // Only trust localStorage's own vote when the server has no record
        // for this poll yet (e.g. it was just deployed).
        setVotedIndex(serverVotedIndex);
        if (serverVotedIndex !== null) {
          localStorage.setItem(storageKey, JSON.stringify({ question, pollKey, votedIndex: serverVotedIndex, timestamp: Date.now() }));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVoteError('Online poll is temporarily unavailable');
          setOnlineVotes(options.map(() => 0));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingVotes(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pollKey, options, storageKey, question]);

  const handleVote = async (index: number) => {
    if (votedIndex !== null || isVoting) return;
    setIsVoting(true);
    setVoteError('');

    const previousOnlineVotes = onlineVotes;
    setVotedIndex(index);
    setOnlineVotes((votes) => votes.map((count, i) => i === index ? count + 1 : count));

    try {
      const { counts, votedIndex: serverVotedIndex, alreadyVoted } = await castPollVote(pollKey, index);
      setOnlineVotes(options.map((_, i) => Number(counts[i]) || 0));
      setVotedIndex(serverVotedIndex);
      if (alreadyVoted) setVoteError('You already voted in this poll.');
      localStorage.setItem(storageKey, JSON.stringify({
        question,
        pollKey,
        votedIndex: serverVotedIndex,
        timestamp: Date.now()
      }));
    } catch {
      setVotedIndex(null);
      setOnlineVotes(previousOnlineVotes);
      setVoteError('Could not save your vote online. Please try again.');
    } finally {
      setIsVoting(false);
    }
  };

  const displayedOptions = localOptions.map((option, index) => ({
    ...option,
    votes: option.votes + (onlineVotes[index] || 0)
  }));
  const totalVotes = displayedOptions.reduce((acc, curr) => acc + curr.votes, 0);

  return (
    <div className="my-12 p-8 bg-[var(--c-accent)] text-[var(--c-bg)] rounded-xl">
      <h4 className="font-serif text-2xl mb-8 flex items-center gap-3">
        <BarChart size={24} className="opacity-60" />
        {question}
      </h4>
      <div className="space-y-4">
        {displayedOptions.map((opt, index) => {
          const percentage = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
          return (
            <div key={index} onClick={() => handleVote(index)} className={`cursor-pointer ${votedIndex !== null || isVoting ? 'pointer-events-none' : ''}`}>
              <div className="flex justify-between text-sm font-mono uppercase tracking-widest mb-2 opacity-80">
                <span>{opt.label}</span>
                {votedIndex !== null && <span>{percentage}% · {opt.votes}</span>}
              </div>
              <div className="h-12 border border-[rgb(var(--c-bg-rgb)_/_0.2)] relative overflow-hidden group">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: votedIndex !== null ? `${percentage}%` : '0%' }}
                  className="absolute top-0 left-0 h-full bg-[rgb(var(--c-gold-rgb)_/_0.4)]"
                />
                <div className={`absolute inset-0 flex items-center px-4 transition-colors ${votedIndex === index ? 'bg-[rgb(var(--c-gold-rgb)_/_0.2)]' : 'group-hover:bg-[rgb(var(--c-bg-rgb)_/_0.05)]'}`}>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {isLoadingVotes && (
        <p className="mt-6 text-center font-mono text-xs uppercase tracking-widest opacity-40">
          Loading live votes...
        </p>
      )}
      {voteError && (
        <p className="mt-6 text-center font-mono text-xs uppercase tracking-widest text-[var(--c-gold)]">
          {voteError}
        </p>
      )}
      {votedIndex !== null && (
        <p className="mt-6 text-center font-mono text-xs uppercase tracking-widest opacity-40">
          {t('poll.thanks')} · {totalVotes.toLocaleString()} {t('poll.total')}
        </p>
      )}
    </div>
  );
}

function NoteBlock({ content }: { content: string }) {
  return (
    <div className="my-12 p-6 bg-[rgb(var(--c-gold-rgb)_/_0.1)] border-l-4 border-[var(--c-gold)] flex gap-4">
      <Lightbulb className="w-6 h-6 text-[var(--c-gold)] shrink-0" />
      <p className="font-serif text-lg text-[var(--c-accent)] italic">
        {content}
      </p>
    </div>
  );
}

function ArticleView({ article, related, onArticleClick, onTagClick, onClose, onImageClick, t, currentLang, setCurrentLang, languages }: { article: Article; related: Article[]; onArticleClick: (article: Article) => void; onTagClick: (tag: string) => void; onClose: () => void; onImageClick: (src: string, alt: string) => void; t: (key: string) => string; currentLang: string; setCurrentLang: (lang: string) => void; languages: string[] }) {
  const [isArticleLangOpen, setIsArticleLangOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Resolve the linked author record (by authorId or name) so the byline can
  // show a real photo + bio; falls back to the plain author/role strings.
  const resolvedAuthor = resolveBylineAuthor(article);
  const authorName = displayArticleAuthor(article);
  const explicitAuthor = article.author?.trim() || '';
  // Only show a linked profile when it belongs to the visible byline. This
  // keeps a stale authorId from attaching Mariia's photo/role to another
  // contributor's article on desktop or mobile.
  const hasEditorialFallback = !explicitAuthor || /^epris\s+journal$/i.test(explicitAuthor);
  const isMatchingProfile = Boolean(
    resolvedAuthor
      && (hasEditorialFallback || resolvedAuthor.name.trim().toLocaleLowerCase() === authorName.toLocaleLowerCase())
  );
  // article.role is per-language (each locale bucket carries its own translated
  // string, e.g. "Arts Desk" vs "Arts Desk" translated); the Author record's
  // role is a single global string entered once in the admin, so it can only
  // ever show in whatever language it was typed in. Prefer the localized
  // article.role and only fall back to the author record's role when the
  // article doesn't specify one — otherwise the byline "role" freezes in
  // one language regardless of the reader's selected language.
  const roleWasLegacyAuthorName = Boolean(
    resolvedAuthor && article.role?.trim().toLocaleLowerCase() === resolvedAuthor.name.trim().toLocaleLowerCase()
  );
  const authorRole = roleWasLegacyAuthorName
    ? translateRole(resolvedAuthor?.role, currentLang)
    : (article.role || (isMatchingProfile ? translateRole(resolvedAuthor?.role, currentLang) : undefined));
  const authorPhoto = isMatchingProfile ? resolvedAuthor?.photoUrl : undefined;

  // Jumping to a related article swaps content inside the same overlay — snap
  // the scroll back to the top so the reader starts at the new article's hero.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [article.id]);

  // Count the read once per browser session per article. Fire-and-forget: the
  // counter is a nicety and must never affect reading.
  useEffect(() => {
    const key = `epris_viewed_${article.id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch { /* private mode etc. — just count every time */ }
    fetch('https://api.eprisjournal.com/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: article.id }),
      keepalive: true
    }).catch(() => {});
  }, [article.id]);

  const handleShare = async () => {
    const url = window.location.href;
    const title = article.title;
    const text = article.excerpt || '';

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    }
  };

  return (
    <motion.div
      ref={scrollRef}
      // Only the horizontal slide animates on entry — the backdrop itself
      // must be fully opaque from frame one, or fading its opacity from 0
      // fades the solid bg-[var(--c-bg)] along with it, letting the page
      // underneath show through for the whole transition (a genuine "ghost
      // of the homepage behind the article" flash on every open, not a
      // rendering artifact). Exit still fades — closing back onto the page
      // behind it is the correct, intentional cross-fade.
      initial={{ opacity: 1, x: '3%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '3%' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[60] bg-[var(--c-bg)] overflow-y-auto overflow-x-hidden"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12 md:py-24 relative">
        <div className="fixed top-4 left-4 right-4 sm:top-8 sm:left-8 sm:right-8 md:left-16 md:right-16 z-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[var(--c-accent)] hover:opacity-60 transition-opacity bg-[rgb(var(--c-bg-rgb)_/_0.8)] backdrop-blur-sm px-3 py-2 sm:px-4 rounded-full border border-[rgb(var(--c-accent-rgb)_/_0.1)]"
          >
            <ArrowLeft size={16} /> {t('back')}
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsArticleLangOpen(!isArticleLangOpen)}
              aria-label="Select language"
              className="min-h-11 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[var(--c-accent)] bg-[rgb(var(--c-bg-rgb)_/_0.8)] backdrop-blur-sm px-3 sm:px-4 rounded-full border border-[rgb(var(--c-accent-rgb)_/_0.18)] hover:opacity-60 transition-opacity"
            >
              <Globe size={14} />
              {currentLang}
            </button>
            {isArticleLangOpen && (
              <div className="absolute top-full right-0 mt-1 bg-[var(--c-bg)] border border-[rgb(var(--c-accent-rgb)_/_0.2)] rounded-xl shadow-lg overflow-hidden min-w-[170px] max-h-[70dvh] overflow-y-auto z-50">
                {languages.map(lang => (
                  <button
                    type="button"
                    key={lang}
                    onClick={() => { setCurrentLang(lang); setIsArticleLangOpen(false); }}
                    className={`w-full min-h-11 px-4 py-2 text-left font-mono text-xs tracking-wider hover:bg-[var(--c-accent)] hover:text-[var(--c-bg)] transition-colors flex items-center justify-between gap-3 ${currentLang === lang ? 'bg-[var(--c-accent)] text-[var(--c-bg)]' : 'text-[var(--c-accent)]'}`}
                  >
                    <span>{LANG_LABELS[lang] || lang}</span>
                    <span className="opacity-50">{lang}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <article className="mt-12">
          <header className="mb-16">
            {/* Hero image first — matches Figma layout */}
            <div
              className="relative left-1/2 w-screen -translate-x-1/2 aspect-[4/3] sm:aspect-[16/8] lg:aspect-[21/8] overflow-hidden bg-[#E8DED5] mb-8 sm:mb-12 cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label="View full image"
              onClick={() => onImageClick(resolveMediaSource(article.imageUrl || article.imageSeed, 2000, 1143), article.title)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onImageClick(resolveMediaSource(article.imageUrl || article.imageSeed, 2000, 1143), article.title)}
            >
              <img
                src={resolveMediaSource(article.imageUrl || article.imageSeed, 2000, 1143)}
                alt={article.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 md:gap-4 font-mono text-[10px] md:text-xs text-[rgb(var(--c-accent-rgb)_/_0.6)] uppercase tracking-widest mb-6 flex-wrap">
                <span>{article.date}</span>
                <span className="w-1 h-1 bg-[rgb(var(--c-accent-rgb)_/_0.4)] rounded-full" />
                <span>{authorName}</span>
                {article.role && (
                  <>
                    <span className="w-1 h-1 bg-[rgb(var(--c-accent-rgb)_/_0.4)] rounded-full" />
                    <span className="text-[var(--c-gold)]">{article.role}</span>
                  </>
                )}
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl md:text-7xl text-[var(--c-accent)] mb-8 leading-tight">
                {article.title}
              </h1>
              <div className="flex justify-center gap-2 flex-wrap">
                {article.tags.map(tag => (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => onTagClick(tag)}
                    className="border border-[var(--c-accent)] px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-[var(--c-accent)] hover:bg-[var(--c-accent)] hover:text-[var(--c-bg)] transition-colors cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </header>

          <div className="prose prose-lg prose-stone mx-auto font-serif text-[rgb(var(--c-accent-rgb)_/_0.8)]">
            {article.content?.map((block, index) => {
              // Skip the first image block if it duplicates the hero cover photo
              if (
                block.type === 'image' &&
                typeof block.content === 'string' &&
                index === 0 &&
                article.imageUrl &&
                block.content.trim() === article.imageUrl.trim()
              ) return null;
              switch (block.type) {
                case 'text': {
                  if (typeof block.content !== 'string') return null;
                  return <p key={index} className="mb-6 sm:mb-8 leading-relaxed text-base sm:text-lg md:text-xl rich-text" dangerouslySetInnerHTML={{ __html: sanitizeRichText(block.content) }} />;
                }
                case 'header': {
                  if (typeof block.content !== 'string') return null;
                  const lvl = block.level === 3 ? 3 : 2;
                  const Tag = (lvl === 3 ? 'h3' : 'h2') as keyof JSX.IntrinsicElements;
                  return (
                    <Tag
                      key={index}
                      className={`rich-text font-bold text-[var(--c-accent)] mt-10 mb-4 ${lvl === 3 ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'}`}
                      style={{ fontFamily: "var(--font-display)" }}
                      dangerouslySetInnerHTML={{ __html: sanitizeRichText(block.content) }}
                    />
                  );
                }
                case 'quote': {
                  if (typeof block.content !== 'string') return null;
                  return (
                    <blockquote key={index} className="border-l-2 border-[var(--c-gold)] pl-4 sm:pl-6 my-8 sm:my-12 italic text-lg sm:text-xl md:text-2xl text-[var(--c-accent)]">
                      <Quote className="inline-block w-5 h-5 sm:w-6 sm:h-6 text-[var(--c-gold)] mb-2 mr-2 opacity-50" />
                      <span className="rich-text" dangerouslySetInnerHTML={{ __html: sanitizeRichText(block.content) }} />
                    </blockquote>
                  );
                }
                case 'image': {
                  if (typeof block.content !== 'string') return null;
                  const stretched = !!block.stretched;
                  const align = block.align || (stretched ? 'full' : 'center');
                  const imageSource = resolveMediaSource(block.content, stretched || align === 'full' ? 1600 : 800, stretched || align === 'full' ? 900 : 500);
                  if (!imageSource) return null;
                  const imageAlt = block.alt?.trim() || block.caption || 'Article image';
                  const sourceUrl = safeExternalUrl(block.sourceUrl);
                  const widthPct = block.width && block.width > 0 && block.width <= 100 ? block.width : undefined;
                  const figureClass =
                    stretched || align === 'full'
                      ? 'my-10 sm:my-14 -mx-4 sm:-mx-12 lg:-mx-24'
                      : align === 'left'
                        ? 'my-6 sm:my-8 float-left mr-6 mb-2 max-w-[80%] sm:max-w-[55%] clear-left'
                        : align === 'right'
                          ? 'my-6 sm:my-8 float-right ml-6 mb-2 max-w-[80%] sm:max-w-[55%] clear-right'
                          : 'my-8 sm:my-12 -mx-4 sm:mx-0';
                  const figureStyle = widthPct && align !== 'full' && !stretched ? { width: `${widthPct}%`, maxWidth: '100%' } : undefined;
                  return (
                    <figure key={index} className={figureClass} style={figureStyle}>
                      <img
                        src={imageSource}
                        alt={imageAlt}
                        className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                        referrerPolicy="no-referrer"
                        onClick={() => onImageClick(imageSource, imageAlt)}
                      />
                      {(block.caption || block.credit) && (
                        <figcaption className="text-center font-mono text-xs text-[rgb(var(--c-accent-rgb)_/_0.6)] mt-3 sm:mt-4 uppercase tracking-widest px-4 sm:px-0">
                          {block.caption}{block.caption && block.credit ? ' · ' : ''}{block.credit}
                          {sourceUrl && <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="ml-2 underline underline-offset-4 hover:text-[var(--c-gold)] transition-colors">source</a>}
                        </figcaption>
                      )}
                    </figure>
                  );
                }
                case 'map': {
                  if (typeof block.content !== 'string') return null;
                  const lat = block.coordinates?.lat;
                  const lng = block.coordinates?.lng;
                  return (
                    <div key={index} className="my-12 p-6 bg-[#E8DED5] border border-[rgb(var(--c-accent-rgb)_/_0.2)]">
                      <div className="flex items-center gap-3 mb-4 text-[var(--c-accent)]">
                        <MapPin size={20} />
                        <span className="font-mono text-sm uppercase tracking-widest">{block.content}</span>
                      </div>
                      {lat !== undefined && lng !== undefined && (
                        <div className="aspect-video overflow-hidden">
                          <iframe
                            title={block.content}
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.02}%2C${lat - 0.01}%2C${lng + 0.02}%2C${lat + 0.01}&layer=mapnik&marker=${lat}%2C${lng}`}
                          />
                        </div>
                      )}
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mt-4 text-xs font-mono uppercase tracking-widest text-[var(--c-accent)] hover:text-[var(--c-gold)] transition-colors"
                      >
                        {t('maps.open')} <ExternalLink size={12} />
                      </a>
                    </div>
                  );
                }
                case 'link': {
                  if (typeof block.content !== 'string') return null;
                  return (
                    <div key={index} className="my-8">
                      <a 
                        href={block.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-lg font-serif text-[var(--c-accent)] border-b border-[var(--c-accent)] hover:text-[var(--c-gold)] hover:border-[var(--c-gold)] transition-colors pb-1"
                      >
                        {block.content} <ArrowUpRight size={16} />
                      </a>
                    </div>
                  );
                }
                case 'video':
                  return <VideoBlock key={index} content={typeof block.content === 'string' ? block.content : ''} caption={block.caption} poster={block.poster} credit={block.credit} sourceUrl={block.sourceUrl} t={t} />;
                case 'audio':
                  return (
                    <figure key={index} className="my-8 sm:my-12 p-4 sm:p-6 bg-[#E8DED5] border border-[rgb(var(--c-accent-rgb)_/_0.2)] flex items-center gap-3 sm:gap-4">
                      <div className="w-12 h-12 rounded-full bg-[var(--c-accent)] flex items-center justify-center text-[var(--c-bg)]">
                        <Music size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="h-1 bg-[rgb(var(--c-accent-rgb)_/_0.2)] rounded-full overflow-hidden">
                          <div className="h-full w-1/3 bg-[var(--c-accent)]" />
                        </div>
                        {block.caption && (
                          <figcaption className="font-mono text-xs text-[rgb(var(--c-accent-rgb)_/_0.6)] mt-2 uppercase tracking-widest">
                            {block.caption}
                          </figcaption>
                        )}
                      </div>
                    </figure>
                  );
                case 'gallery':
                  return (
                    <figure key={index} className="my-8 sm:my-12 -mx-4 sm:mx-0">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4">
                        {Array.isArray(block.content) &&
                          block.content.map((img, i) => {
                            if (typeof img !== 'string') return null;
                            const gallerySource = resolveMediaSource(img, 400, 400);
                            if (!gallerySource) return null;

                            const rawAlt = Array.isArray(block.alts) ? block.alts[i]?.trim() : '';
                            const altText = rawAlt || `Gallery image ${i + 1}`;
                            return (
                              <div key={i} className="flex flex-col gap-1.5">
                                <div className="aspect-square bg-[#E8DED5] overflow-hidden cursor-pointer" onClick={() => onImageClick(gallerySource, altText)}>
                                  <img
                                    src={gallerySource}
                                    alt={altText}
                                    className="w-full h-full object-cover transition-all duration-500"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                                {rawAlt && (
                                  <p className="font-mono text-[11px] leading-snug text-[rgb(var(--c-accent-rgb)_/_0.55)] px-0.5">
                                    {rawAlt}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                      </div>
                      {block.caption && (
                        <figcaption className="text-center font-mono text-xs text-[rgb(var(--c-accent-rgb)_/_0.6)] mt-3 sm:mt-4 uppercase tracking-widest px-4 sm:px-0">
                          {block.caption}
                        </figcaption>
                      )}
                    </figure>
                  );
                case 'mosaic': {
                  const tiles = Array.isArray(block.content) ? block.content : [];
                  return (
                    <figure key={index} className="my-8 sm:my-12 flex flex-col items-center">
                      <div
                        className="grid gap-1 sm:gap-1.5 w-full max-w-[400px] sm:max-w-[460px] aspect-square"
                        style={{
                          gridTemplateColumns: `repeat(${HEART_PATTERN[0].length}, 1fr)`,
                          gridTemplateRows: `repeat(${HEART_PATTERN.length}, 1fr)`,
                        }}
                      >
                        {HEART_CELLS.map(([r, c], i) => {
                          const img = tiles.length ? tiles[i % tiles.length] : '';
                          const tileSource = resolveMediaSource(typeof img === 'string' ? img : '', 200, 200);
                          if (!tileSource) return null;
                          return (
                            <div
                              key={`${r}-${c}`}
                              style={{ gridRow: r + 1, gridColumn: c + 1 }}
                              className="overflow-hidden bg-[#E8DED5] rounded-sm cursor-pointer"
                              onClick={() => onImageClick(tileSource, `Mosaic tile ${i + 1}`)}
                            >
                              <img
                                src={tileSource}
                                alt=""
                                className="w-full h-full object-cover transition-all duration-500"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          );
                        })}
                      </div>
                      {block.caption && (
                        <figcaption className="text-center font-mono text-xs text-[rgb(var(--c-accent-rgb)_/_0.6)] mt-4 sm:mt-6 uppercase tracking-widest px-4 max-w-md">
                          {block.caption}
                        </figcaption>
                      )}
                    </figure>
                  );
                }
                case 'checklist':
                  if (typeof block.content === 'object' && !Array.isArray(block.content) && 'items' in block.content && Array.isArray(block.content.items)) {
                    return <ChecklistBlock key={index} items={block.content.items} caption={block.caption} />;
                  }
                  return null;
                case 'poll':
                  if (
                    typeof block.content === 'object' &&
                    !Array.isArray(block.content) &&
                    'question' in block.content &&
                    typeof block.content.question === 'string' &&
                    'options' in block.content &&
                    Array.isArray(block.content.options)
                  ) {
                    return <PollBlock key={index} question={block.content.question} options={block.content.options} t={t} pollKey={`article-${article.id}-block-${index}`} />;
                  }
                  return null;
                case 'note':
                  if (typeof block.content !== 'string') return null;
                  return <NoteBlock key={index} content={block.content} />;
                default:
                  return null;
              }
            })}
          </div>

          <footer className="mt-10 sm:mt-16 pt-8 sm:pt-12 border-t border-[rgb(var(--c-accent-rgb)_/_0.2)]">
            <div className="flex items-start gap-4 sm:gap-6">
              {authorPhoto ? (
                <img
                  src={authorPhoto}
                  alt={authorName}
                  loading="lazy"
                  className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover shrink-0 border border-[rgb(var(--c-accent-rgb)_/_0.2)]"
                />
              ) : (
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[var(--c-accent)] flex items-center justify-center text-[var(--c-bg)] font-serif text-lg sm:text-xl shrink-0">
                  {(authorName || '').charAt(0)}
                </div>
              )}
              <div>
                <p className="font-serif text-xl mb-1">{authorName}</p>
                {authorRole && (
                  <p className="font-mono text-xs uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.6)] mb-3">{authorRole}</p>
                )}
                {resolvedAuthor?.bio && (
                  <p className="font-serif text-sm text-[rgb(var(--c-accent-rgb)_/_0.7)] leading-relaxed mb-3 max-w-xl">{resolvedAuthor.bio}</p>
                )}
                {(resolvedAuthor?.website || resolvedAuthor?.instagram) && (
                  <div className="flex items-center gap-4 mb-3">
                    {resolvedAuthor.website && (
                      <a
                        href={resolvedAuthor.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.6)] hover:text-[var(--c-gold)] underline underline-offset-4 transition-colors"
                      >
                        Website
                      </a>
                    )}
                    {resolvedAuthor.instagram && (
                      <a
                        href={`https://instagram.com/${resolvedAuthor.instagram.replace(/^@/, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.6)] hover:text-[var(--c-gold)] underline underline-offset-4 transition-colors"
                      >
                        {resolvedAuthor.instagram}
                      </a>
                    )}
                  </div>
                )}
                <p className="font-mono text-xs text-[rgb(var(--c-accent-rgb)_/_0.5)]">{article.date}</p>
              </div>
            </div>
            {article.tags && (
              <div className="flex flex-wrap gap-2 mt-8">
                {article.tags.map((tag: string, i: number) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => onTagClick(tag)}
                    className="px-3 py-1 border border-[rgb(var(--c-accent-rgb)_/_0.2)] font-mono text-xs uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.6)] hover:border-[var(--c-accent)] hover:text-[var(--c-accent)] transition-colors cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-10 pt-8 border-t border-[rgb(var(--c-accent-rgb)_/_0.1)] flex justify-center">
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-3 px-6 py-3 border border-[rgb(var(--c-accent-rgb)_/_0.2)] rounded-full font-mono text-xs uppercase tracking-widest text-[var(--c-accent)] hover:bg-[var(--c-accent)] hover:text-[var(--c-bg)] transition-colors"
              >
                {copied ? <Check size={16} /> : <Share2 size={16} />}
                {copied ? t('share.copied') : t('share')}
              </button>
            </div>
          </footer>

          {related.length > 0 && (
            <section className="mt-12 sm:mt-20 pt-10 sm:pt-14 border-t border-[rgb(var(--c-accent-rgb)_/_0.2)]">
              <h2 className="font-mono text-xs uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.5)] mb-8">
                {t('article.related')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
                {related.map((rel) => (
                  <button
                    type="button"
                    key={rel.id}
                    onClick={() => onArticleClick(rel)}
                    className="text-left group"
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-[#E8DED5] mb-4">
                      <img
                        src={resolveMediaSource(rel.imageUrl || rel.imageSeed, 600, 450)}
                        alt={rel.title}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                      />
                    </div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--c-gold)] mb-2">{rel.category}</p>
                    <h3 className="font-serif text-lg sm:text-xl leading-snug text-[var(--c-accent)] group-hover:opacity-70 transition-opacity">{rel.title}</h3>
                  </button>
                ))}
              </div>
            </section>
          )}
        </article>
      </div>
    </motion.div>
  );
}

function ArticlePreviewDialog({ article, onClose, onReadFull, onImageClick, t }: { article: Article; onClose: () => void; onReadFull: () => void; onImageClick: (src: string, alt: string) => void; t: (key: string) => string }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="article-preview-title"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 18, scale: .985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: .985 }}
        transition={{ duration: .24, ease: [0.22, 1, 0.36, 1] }}
        className="relative max-h-[min(90dvh,48rem)] w-full max-w-3xl overflow-y-auto bg-[var(--c-bg)] text-[var(--c-accent)] shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t('articles.closePreview')}
          className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-[rgb(var(--c-accent-rgb)_/_0.22)] bg-[rgb(var(--c-bg-rgb)_/_0.84)] text-[var(--c-accent)] backdrop-blur-sm transition hover:bg-[var(--c-accent)] hover:text-[var(--c-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--c-accent)]"
        >
          <X size={18} />
        </button>
        <button
          type="button"
          onClick={() => onImageClick(resolveMediaSource(article.imageUrl || article.imageSeed, 2000, 1143), article.title)}
          className="group block w-full cursor-zoom-in text-left"
          aria-label={`${t('homepage.openImage')}: ${article.title}`}
        >
          <div className="aspect-[16/8] overflow-hidden bg-[#E8DED5]">
            <img src={resolveMediaSource(article.imageUrl || article.imageSeed, 1200, 600)} alt={article.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]" referrerPolicy="no-referrer" />
          </div>
        </button>
        <div className="px-6 pb-8 pt-7 sm:px-10 sm:pb-10 sm:pt-8">
          <div className="mb-4 flex flex-wrap items-center gap-3 font-mono text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--c-accent-rgb)_/_0.55)]">
            {article.category && <span>{article.category}</span>}
            {article.date && <><span className="h-1 w-1 rounded-full bg-[rgb(var(--c-accent-rgb)_/_0.35)]" /><span>{article.date}</span></>}
          </div>
          <h2 id="article-preview-title" className="max-w-2xl font-crimson text-3xl leading-tight sm:text-5xl">{article.title}</h2>
          <p className="mt-5 max-w-2xl font-serif text-base leading-relaxed text-[rgb(var(--c-accent-rgb)_/_0.76)] sm:text-lg">{article.excerpt}</p>
          <div className="mt-8 flex justify-center border-t border-[rgb(var(--c-accent-rgb)_/_0.14)] pt-7">
            <button
              type="button"
              onClick={onReadFull}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--c-accent)] px-6 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] transition hover:bg-[var(--c-accent)] hover:text-[var(--c-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--c-accent)]"
            >
              {t('articles.readFull')} <ArrowUpRight size={15} />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ArticlesSection({
  articles,
  onArticleClick,
  onArticlePreview,
  t,
  showDescription = true,
  showPreview = true,
  showReadAll = true,
  columns = 1,
}: {
  articles: Article[];
  onArticleClick: (article: Article) => void;
  onArticlePreview?: (article: Article) => void;
  t: (key: string) => string;
  showDescription?: boolean;
  showPreview?: boolean;
  showReadAll?: boolean;
  columns?: 1 | 2 | 3;
}) {
  const filteredArticles = orderArticles(articles).filter((article) => !article.hideInList);
  const openArticle = showPreview ? (onArticlePreview || onArticleClick) : onArticleClick;
  const listClass = columns === 3
    ? 'grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-3'
    : columns === 2
      ? 'grid grid-cols-1 gap-8 md:grid-cols-2'
      : 'space-y-10 sm:space-y-14';

  return (
    <div>
      <div className="max-w-4xl mx-auto px-5 sm:px-0 pt-8 sm:pt-10">
      <motion.div variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-5%' }} className={listClass}>
      {filteredArticles.map((article) => (
        <motion.div key={article.id} variants={staggerItem}>
          <motion.button
            type="button"
            className="w-full border border-[var(--c-accent)] bg-transparent p-0 text-left group cursor-pointer grid grid-cols-1 sm:grid-cols-[45%_1fr] items-stretch overflow-hidden"
            onClick={() => openArticle(article)}
            aria-label={`${t('articles.readPreview')}: ${article.title}`}
            whileHover={{ x: 4 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Card-specific cover, headline and standfirst when the editor set
                them, the article's own otherwise (see the preview* fields in
                data.ts). objectPosition carries the focal point: the frame is
                square and covers rarely are, so a centre crop is what cuts the
                top off a portrait. */}
            <div className="aspect-square overflow-hidden bg-[#E8DED5]">
              <motion.img
                src={resolveMediaSource(article.previewImageUrl || article.imageUrl || article.imageSeed, 480, 480)}
                alt={article.previewTitle || article.title}
                className="w-full h-full object-cover"
                style={article.previewFocus ? { objectPosition: article.previewFocus } : undefined}
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex flex-col p-4 sm:p-6">
              {article.category && (
                <span className="font-mono text-[10px] text-[rgb(var(--c-accent-rgb)_/_0.55)] uppercase tracking-widest mb-1">
                  {article.category}
                </span>
              )}
              <h3 className="font-crimson text-lg sm:text-xl text-[var(--c-accent)] mb-2 group-hover:text-[var(--c-gold)] transition-colors duration-300">
                {article.previewTitle || article.title}
              </h3>
              {showDescription && !article.previewHideExcerpt && <p className="font-serif text-sm text-[rgb(var(--c-accent-rgb)_/_0.75)] leading-relaxed mb-4">
                {article.previewExcerpt || article.excerpt}
              </p>}
              {!article.previewHideAuthor && <div className="mt-auto border-t border-[rgb(var(--c-accent-rgb)_/_0.14)] pt-3 font-mono text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--c-accent-rgb)_/_0.58)]">
                {t('articles.by')} {displayArticleAuthor(article)}
              </div>}
              {showReadAll && <span className="mt-auto inline-flex items-center gap-2 self-start border border-[var(--c-accent)] rounded-full px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest text-[var(--c-accent)] group-hover:bg-[var(--c-accent)] group-hover:text-[var(--c-bg)] transition-colors">
                {showPreview ? t('articles.readPreview') : t('articles.readFull')} <ArrowUpRight size={14} />
              </span>}
            </div>
          </motion.button>
        </motion.div>
      ))}
      </motion.div>
      </div>
    </div>
  );
}

function ProsCons({ pros, cons, t }: { pros?: string[]; cons?: string[]; t: (key: string) => string }) {
  if ((!pros || !pros.length) && (!cons || !cons.length)) return null;
  return (
    <div className="grid grid-cols-2 gap-4 mt-6">
      {pros && pros.length > 0 && (
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#4A7C59] mb-2">{t('reviews.pros')}</p>
          <ul className="space-y-1.5">
            {pros.map((p, i) => (
              <li key={i} className="flex items-baseline gap-2 font-serif text-sm text-[rgb(var(--c-accent-rgb)_/_0.75)]">
                <span className="text-[#4A7C59] text-[10px] shrink-0">+</span>{p}
              </li>
            ))}
          </ul>
        </div>
      )}
      {cons && cons.length > 0 && (
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#8B3A3A] mb-2">{t('reviews.cons')}</p>
          <ul className="space-y-1.5">
            {cons.map((c, i) => (
              <li key={i} className="flex items-baseline gap-2 font-serif text-sm text-[rgb(var(--c-accent-rgb)_/_0.75)]">
                <span className="text-[#8B3A3A] text-[10px] shrink-0">−</span>{c}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// The review editor's "Structure" button appends a skeleton of section headers
// with prompt text underneath ("FIRST IMPRESSION" / "What stays with you after
// the first encounter?"). It is a writing aid, not content: on Le Dauphine it
// was pressed twice and never filled in, so readers got eight lines of editor
// instructions. A prompt still verbatim means that section was never written —
// drop the header with it. Once an editor replaces the prompt, both stay.
const REVIEW_SCAFFOLD_PROMPTS: Record<string, string> = {
  'FIRST IMPRESSION': 'What stays with you after the first encounter?',
  'DETAILS THAT MATTER': 'Describe the material, rhythm, service or object in concrete terms.',
  'IN CONTEXT': 'Place the subject in its cultural or local context.',
  'WHO IT IS FOR': 'A concise editorial recommendation.',
};

const norm = (value: unknown) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';

function stripUnfilledScaffold(blocks: ContentBlock[]): ContentBlock[] {
  const skip = new Set<number>();
  blocks.forEach((block, i) => {
    if (block.type !== 'header') return;
    const prompt = REVIEW_SCAFFOLD_PROMPTS[norm(block.content).toUpperCase()];
    if (!prompt) return;
    const next = blocks[i + 1];
    // A scaffold header on its own (nothing after it, or another header) is
    // just as unwritten as one still carrying its prompt.
    if (!next || next.type === 'header') { skip.add(i); return; }
    if (next.type === 'text' && norm(next.content).toLowerCase() === prompt.toLowerCase()) {
      skip.add(i);
      skip.add(i + 1);
    }
  });
  return skip.size ? blocks.filter((_, i) => !skip.has(i)) : blocks;
}

const reviewBlocks = (content: Review['content']): ContentBlock[] =>
  Array.isArray(content) ? stripUnfilledScaffold(content) : [];

const reviewPlainText = (content: Review['content']) => typeof content === 'string'
  ? content
  : reviewBlocks(content).map(block => typeof block.content === 'string' ? block.content : block.type === 'checklist' && !Array.isArray(block.content) && 'items' in block.content ? block.content.items.join(' ') : '').filter(Boolean).join(' ');

function ReviewBody({ content }: { content: Review['content'] }) {
  if (typeof content === 'string') return <p className="font-serif text-lg leading-relaxed text-[rgb(var(--c-accent-rgb)_/_0.78)] whitespace-pre-line">{content}</p>;
  return <div className="space-y-7 sm:space-y-10">{reviewBlocks(content).map((block, index) => {
    const text = typeof block.content === 'string' ? block.content : '';
    if (block.type === 'header' && text) return <h2 key={index} className="font-serif text-3xl sm:text-4xl leading-tight">{text}</h2>;
    if (block.type === 'quote' && text) return <blockquote key={index} className="border-l-2 border-[var(--c-gold)] pl-5 font-serif text-2xl italic leading-snug">{text}</blockquote>;
    if (block.type === 'note' && text) return <aside key={index} className="border-y border-[rgb(var(--c-accent-rgb)_/_.18)] py-5 font-serif italic text-xl">{text}</aside>;
    if (block.type === 'image' && text) return <figure key={index} className="space-y-2"><img src={text} alt={block.alt || block.caption || ''} className="w-full object-cover" />{block.caption && <figcaption className="font-mono text-[10px] uppercase tracking-widest opacity-60">{block.caption}</figcaption>}</figure>;
    if (block.type === 'gallery' && Array.isArray(block.content)) return <figure key={index} className="grid grid-cols-2 gap-2">{block.content.map((src, i) => <img key={i} src={src} alt={block.alts?.[i] || ''} className="aspect-square w-full object-cover" />)}</figure>;
    if (block.type === 'video' && text) return <div key={index} className="aspect-video bg-black"><iframe className="h-full w-full" src={text} title={block.caption || 'Review video'} allowFullScreen /></div>;
    if (block.type === 'link' && text) return <a key={index} href={block.url || text} target="_blank" rel="noopener noreferrer" className="inline-flex border-b border-[var(--c-accent)] pb-1 font-mono text-xs uppercase tracking-widest">{text}<ArrowUpRight size={14} className="ml-2" /></a>;
    if (block.type === 'checklist' && !Array.isArray(block.content) && 'items' in block.content) return <ul key={index} className="space-y-2 font-serif text-lg">{block.content.items.map((item, i) => <li key={i} className="flex gap-3"><Check size={16} className="mt-1 shrink-0 text-[var(--c-gold)]" />{item}</li>)}</ul>;
    return text ? <p key={index} className="font-serif text-lg leading-relaxed text-[rgb(var(--c-accent-rgb)_/_0.78)] whitespace-pre-line">{text}</p> : null;
  })}</div>;
}

function ReviewView({ review, t, onClose, currentLang }: { review: Review; t: (key: string) => string; onClose: () => void; currentLang: string }) {
  const resolvedAuthor = resolveAuthor(review);
  const authorName = review.author?.trim() || resolvedAuthor?.name?.trim() || 'EPRIS Journal';
  const explicitAuthor = review.author?.trim() || '';
  const hasEditorialFallback = !explicitAuthor || /^epris\s+journal$/i.test(explicitAuthor);
  const isMatchingProfile = Boolean(
    resolvedAuthor
      && (hasEditorialFallback || resolvedAuthor.name.trim().toLocaleLowerCase() === authorName.toLocaleLowerCase())
  );
  const authorProfile = isMatchingProfile ? resolvedAuthor : null;
  const authorRole = translateRole(review.role || authorProfile?.role, currentLang);
  const authorPhoto = authorProfile?.photoUrl;

  return <motion.article initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="fixed inset-0 z-[90] overflow-y-auto bg-[var(--c-bg)]">
    <div className="mx-auto max-w-5xl px-5 py-6 sm:px-10 sm:py-10"><button onClick={onClose} className="mb-12 inline-flex min-h-11 items-center gap-2 font-mono text-[10px] uppercase tracking-widest"><ArrowLeft size={15} /> {t('nav.reviews')}</button>
      {review.imageUrl && <img src={review.imageUrl} alt={review.title} className="mb-10 aspect-[16/8] w-full object-cover" />}
      <header className="mx-auto mb-12 max-w-3xl border-b border-[var(--c-accent)] pb-10">
        <p className="font-mono text-[10px] uppercase tracking-[.2em] text-[var(--c-gold)]">{review.category || 'Review'}</p>
        <h1 className="mt-4 font-serif text-5xl leading-[.94] sm:text-7xl">{review.title}</h1>
        <p className="mt-5 font-mono text-[11px] uppercase tracking-widest opacity-60">{review.subject}</p>
        <div className="mt-5 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[rgb(var(--c-accent-rgb)_/_0.56)]">
          {review.date && <><span>{review.date}</span><span aria-hidden="true" className="h-1 w-1 rounded-full bg-[rgb(var(--c-accent-rgb)_/_0.3)]" /></>}
          <span>{authorName}</span>
          {authorRole && <><span aria-hidden="true" className="h-1 w-1 rounded-full bg-[rgb(var(--c-accent-rgb)_/_0.3)]" /><span className="text-[var(--c-gold)]">{authorRole}</span></>}
        </div>
        {review.verdict && <p className="mt-8 border-l-2 border-[var(--c-gold)] pl-5 font-serif text-2xl italic leading-snug">{review.verdict}</p>}
      </header>
      <div className="mx-auto max-w-3xl">
        <ReviewBody content={review.content} />
        <ProsCons pros={review.pros} cons={review.cons} t={t} />
        <footer className="mt-10 border-t border-[rgb(var(--c-accent-rgb)_/_0.2)] pt-8 sm:mt-16 sm:pt-12">
          <div className="flex items-start gap-4 sm:gap-6">
            {authorPhoto ? (
              <img
                src={authorPhoto}
                alt={authorName}
                loading="lazy"
                className="h-12 w-12 shrink-0 rounded-full border border-[rgb(var(--c-accent-rgb)_/_0.2)] object-cover sm:h-16 sm:w-16"
              />
            ) : (
              <div aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--c-accent)] font-serif text-lg text-[var(--c-bg)] sm:h-16 sm:w-16 sm:text-xl">
                {authorName.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <p className="mb-1 font-serif text-xl">{authorName}</p>
              {authorRole && <p className="mb-3 font-mono text-xs uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.6)]">{authorRole}</p>}
              {authorProfile?.bio && <p className="mb-3 max-w-xl font-serif text-sm leading-relaxed text-[rgb(var(--c-accent-rgb)_/_0.7)]">{authorProfile.bio}</p>}
              {(authorProfile?.website || authorProfile?.instagram) && (
                <div className="mb-3 flex flex-wrap items-center gap-4">
                  {authorProfile.website && <a href={authorProfile.website} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.6)] underline underline-offset-4 transition-colors hover:text-[var(--c-gold)]">Website</a>}
                  {authorProfile.instagram && <a href={`https://instagram.com/${authorProfile.instagram.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.6)] underline underline-offset-4 transition-colors hover:text-[var(--c-gold)]">{authorProfile.instagram}</a>}
                </div>
              )}
              {(review.date || review.meta) && <p className="font-mono text-xs text-[rgb(var(--c-accent-rgb)_/_0.5)]">{[review.date, review.meta].filter(Boolean).join(' · ')}</p>}
            </div>
          </div>
        </footer>
      </div>
    </div>
  </motion.article>;
}

function ReviewsSection({ reviews, t, onReviewClick }: { reviews: Review[]; t: (key: string) => string; onReviewClick: (review: Review) => void }) {
  const [activeCategory, setActiveCategory] = useState('__all');
  const categories = useMemo(() => {
    const set = Array.from(new Set(reviews.map((r) => r.category).filter((c): c is string => Boolean(c))));
    return ['__all', ...set];
  }, [reviews]);

  const featured = reviews.find((r) => r.featured);
  const rest = reviews.filter((r) => r.id !== (featured?.id ?? -1));
  const filtered = activeCategory === '__all' ? rest : rest.filter((r) => r.category === activeCategory);

  return (
    <div>
      {/* Featured review */}
      {featured && (
        <Reveal>
          <div className="mb-12 md:mb-16 border border-[var(--c-accent)] grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
            {featured.imageUrl && (
              <div className="relative aspect-[4/3] lg:aspect-auto bg-[#1a0812] overflow-hidden">
                <img src={featured.imageUrl} alt={featured.title} className="w-full h-full object-cover" />
                <span className="absolute top-4 left-4 bg-[rgb(var(--c-bg-rgb)_/_0.9)] text-[var(--c-accent)] font-mono text-[9px] uppercase tracking-[0.2em] px-3 py-1.5">
                  {t('reviews.featured')}
                </span>
              </div>
            )}
            <div className="p-7 sm:p-10 md:p-12 bg-[#E8DED5] flex flex-col">
              {featured.category && (
                <span className="mb-5 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--c-gold)]">{featured.category}</span>
              )}
              <h3 className="font-serif text-3xl md:text-4xl text-[var(--c-accent)] mb-1.5">{featured.title}</h3>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.55)] mb-5">{featured.subject}</p>
              {featured.verdict && (
                <p className="font-serif text-xl md:text-2xl italic text-[var(--c-accent)] leading-snug mb-5 border-l-2 border-[var(--c-gold)] pl-4">
                  {featured.verdict}
                </p>
              )}
              <p className="font-serif text-base leading-relaxed text-[rgb(var(--c-accent-rgb)_/_0.75)]">{reviewPlainText(featured.content).slice(0, 260)}{reviewPlainText(featured.content).length > 260 ? '…' : ''}</p>
              <button onClick={() => onReviewClick(featured)} className="mt-6 inline-flex min-h-11 items-center gap-2 border-b border-[var(--c-accent)] font-mono text-[10px] uppercase tracking-widest">{t('reviews.read')} <ArrowUpRight size={14} /></button>
              <div className="mt-auto pt-6 flex items-center justify-between">
                {featured.meta && <span className="font-mono text-[9px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.4)]">{featured.meta}</span>}
                <span className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.6)] ml-auto">— {featured.author}</span>
              </div>
            </div>
          </div>
        </Reveal>
      )}

      {/* Category filter */}
      {categories.length > 2 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest border transition-colors ${
                activeCategory === cat
                  ? 'bg-[var(--c-accent)] text-[var(--c-bg)] border-[var(--c-accent)]'
                  : 'text-[var(--c-accent)] border-[rgb(var(--c-accent-rgb)_/_0.3)] hover:border-[var(--c-accent)]'
              }`}
            >
              {cat === '__all' ? t('reviews.all') : cat}
            </button>
          ))}
        </div>
      )}

      {/* Review grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        {filtered.map((review, index) => (
          <Reveal key={review.id} delay={(index % 2) * 0.08}>
            <div className="bg-[#E8DED5] border border-[var(--c-accent)] h-full flex flex-col overflow-hidden">
              {review.imageUrl && (
                <div className="relative aspect-[16/9] bg-[#1a0812] overflow-hidden">
                  <img src={review.imageUrl} alt={review.title} className="w-full h-full object-cover" />
                  {review.category && (
                    <span className="absolute top-3 left-3 bg-[rgb(var(--c-bg-rgb)_/_0.9)] text-[var(--c-accent)] font-mono text-[8px] uppercase tracking-[0.2em] px-2.5 py-1">
                      {review.category}
                    </span>
                  )}
                </div>
              )}
              <div className="p-6 sm:p-8 flex flex-col flex-1">
                {!review.imageUrl && review.category && (
                  <span className="mb-4 font-mono text-[10px] uppercase tracking-widest text-[var(--c-gold)]">{review.category}</span>
                )}
                <h3 className="font-serif text-2xl md:text-3xl text-[var(--c-accent)] mb-1.5">{review.title}</h3>
                <p className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.55)] mb-4">{review.subject}</p>
                {review.verdict && (
                  <p className="font-serif text-lg italic text-[var(--c-accent)] leading-snug mb-4 border-l-2 border-[var(--c-gold)] pl-3">
                    {review.verdict}
                  </p>
                )}
                <p className="font-serif text-base leading-relaxed text-[rgb(var(--c-accent-rgb)_/_0.75)]">{reviewPlainText(review.content).slice(0, 190)}{reviewPlainText(review.content).length > 190 ? '…' : ''}</p>
                <button onClick={() => onReviewClick(review)} className="mt-6 inline-flex min-h-11 items-center gap-2 border-b border-[var(--c-accent)] font-mono text-[10px] uppercase tracking-widest">{t('reviews.read')} <ArrowUpRight size={14} /></button>
                <div className="mt-auto pt-6 flex items-center justify-between gap-3">
                  {review.meta && <span className="font-mono text-[9px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.4)]">{review.meta}</span>}
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.6)] ml-auto">— {review.author}</span>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

function Sidebar({ t }: { t: (key: string) => string }) {
  const labels = [t('sidebar.lifestyle'), t('sidebar.travel'), t('sidebar.taste'), t('sidebar.design'), t('sidebar.culture'), t('sidebar.lifestyle'), t('sidebar.travel')];
  return (
    <motion.aside
      initial={{ opacity: 0, x: 48 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 32 }}
      transition={{ duration: 0.26, ease: EASE }}
      className="hidden lg:flex w-12 border-l border-[var(--c-accent)] flex-col justify-between items-center py-8 fixed right-0 top-0 h-full bg-[var(--c-bg)] z-40 pt-24"
    >
      <div className="h-full w-full relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-max h-full pt-4">
          <p className="writing-vertical-rl text-[10px] font-mono uppercase tracking-[0.3em] text-[rgb(var(--c-accent-rgb)_/_0.4)] flex gap-8 whitespace-nowrap">
            {labels.map((label, i) => (
              <span key={i}>{i > 0 && <span className="text-[var(--c-gold)] mr-8">•</span>}{label}</span>
            ))}
          </p>
        </div>
      </div>
    </motion.aside>
  );
}

// ── Search ────────────────────────────────────────────────────────────────
// The old search was a single raw substring check across every article's raw
// body text with no word boundaries — "ando" matched "abandoned", a query
// like "design" (a word that turns up in passing in most captions) surfaced
// nearly the entire article list in no particular order, and Gallery and
// Reviews weren't searched at all. Net effect: results looked
// arbitrary, so the feature read as broken even though it "worked".
//
// Tokenize (Unicode-aware, so this holds up across every UI language) and
// score whole-word / prefix matches per field, weighted by how much that
// field says about relevance (title outweighs a stray mention in a content
// block), then rank. Covers Articles, Gallery and Reviews in one
// pass so a search actually finds whatever the reader is looking for.
function normalizeSearchText(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[\u2018\u2019ʼ]/g, "'");
}

function tokenize(text: string): string[] {
  return normalizeSearchText(text).match(/[\p{L}\p{N}]+/gu) || [];
}

function editDistanceAtMostOne(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (a.length > b.length) i += 1;
    else if (b.length > a.length) j += 1;
    else {
      i += 1;
      j += 1;
    }
  }
  return edits + Number(i < a.length || j < b.length) <= 1;
}

function tokenMatch(fieldToken: string, queryToken: string): number {
  if (fieldToken === queryToken) return 1;
  if (queryToken.length >= 2 && fieldToken.startsWith(queryToken)) return 0.62;
  if (queryToken.length >= 4 && fieldToken.includes(queryToken)) return 0.34;
  if (queryToken.length >= 5 && editDistanceAtMostOne(fieldToken, queryToken)) return 0.28;
  return 0;
}

/** Score exact, prefix, partial and one-character typo matches within a field. */
function scoreField(fieldTokens: string[], queryTokens: string[], weight: number): number {
  if (fieldTokens.length === 0) return 0;
  let score = 0;
  for (const qt of queryTokens) {
    const bestMatch = fieldTokens.reduce((best, ft) => Math.max(best, tokenMatch(ft, qt)), 0);
    score += bestMatch * weight;
  }
  return score;
}

function matchesEveryQueryToken(fieldTokens: string[], queryTokens: string[]): boolean {
  return queryTokens.every((queryToken) => fieldTokens.some((fieldToken) => tokenMatch(fieldToken, queryToken) > 0));
}

interface SearchHit {
  key: string;
  score: number;
  kind: 'article' | 'item' | 'review';
  title: string;
  meta: string;
  excerpt: string;
  imageUrl?: string;
  onOpen: () => void;
}

function buildSearchIndex(
  queryTokens: string[],
  { articles, items, reviews }: { articles: Article[]; items: Item[]; reviews: Review[] },
  handlers: { onArticleClick: (a: Article) => void; onItemClick: (i: Item) => void; onGoToTab: (tab: string) => void },
): SearchHit[] {
  const hits: SearchHit[] = [];

  for (const a of articles) {
    const bodyText = (a.content || []).map((b) => (typeof b.content === 'string' ? b.content : '')).join(' ');
    const allTokens = tokenize([a.title, a.category, (a.tags || []).join(' '), a.author, a.excerpt, bodyText].filter(Boolean).join(' '));
    const score =
      scoreField(tokenize(a.title), queryTokens, 10) +
      scoreField(tokenize(a.category || ''), queryTokens, 6) +
      scoreField(tokenize((a.tags || []).join(' ')), queryTokens, 6) +
      scoreField(tokenize(a.author || ''), queryTokens, 4) +
      scoreField(tokenize(a.excerpt || ''), queryTokens, 3) +
      scoreField(tokenize(bodyText), queryTokens, 1);
    if (score > 0 && matchesEveryQueryToken(allTokens, queryTokens)) {
      hits.push({
        key: `article-${a.id}`, score, kind: 'article', title: a.title,
        meta: [a.category, a.author].filter(Boolean).join(' · '),
        excerpt: a.excerpt || '', imageUrl: a.imageUrl,
        onOpen: () => handlers.onArticleClick(a),
      });
    }
  }

  for (const i of items) {
    const allTokens = tokenize([i.title, i.subtitle, i.description].filter(Boolean).join(' '));
    const score =
      scoreField(tokenize(i.title), queryTokens, 10) +
      scoreField(tokenize(i.subtitle || ''), queryTokens, 6) +
      scoreField(tokenize(i.description || ''), queryTokens, 3);
    if (score > 0 && matchesEveryQueryToken(allTokens, queryTokens)) {
      hits.push({
        key: `item-${i.id}`, score, kind: 'item', title: i.title,
        meta: i.subtitle || 'Gallery', excerpt: i.description || '', imageUrl: i.imageUrl,
        onOpen: () => handlers.onItemClick(i),
      });
    }
  }

  for (const r of reviews) {
    const allTokens = tokenize([r.title, r.subject, r.category, r.author, r.content].filter(Boolean).join(' '));
    const score =
      scoreField(tokenize(r.title), queryTokens, 10) +
      scoreField(tokenize(r.subject || ''), queryTokens, 6) +
      scoreField(tokenize(r.category || ''), queryTokens, 6) +
      scoreField(tokenize(r.author || ''), queryTokens, 4) +
      scoreField(tokenize(r.content || ''), queryTokens, 2);
    if (score > 0 && matchesEveryQueryToken(allTokens, queryTokens)) {
      hits.push({
        key: `review-${r.id}`, score, kind: 'review', title: r.title,
        meta: [r.category, r.subject].filter(Boolean).join(' · '),
        excerpt: r.verdict || r.content || '', imageUrl: r.imageUrl,
        onOpen: () => handlers.onGoToTab('reviews'),
      });
    }
  }

  return hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, 100);
}

const SEARCH_KIND_KEY: Record<SearchHit['kind'], string> = {
  article: 'search.kind.article', item: 'search.kind.gallery', review: 'search.kind.review',
};

function SearchResults({
  query,
  articles,
  items,
  reviews,
  onClear,
  onArticleClick,
  onItemClick,
  onGoToTab,
  onSearch,
  t,
}: {
  query: string;
  articles: Article[];
  items: Item[];
  reviews: Review[];
  onClear: () => void;
  onArticleClick: (article: Article) => void;
  onItemClick: (item: Item) => void;
  onGoToTab: (tab: string) => void;
  onSearch: (query: string) => void;
  t: (key: string) => string;
}) {
  const [draftQuery, setDraftQuery] = useState(query);
  useEffect(() => setDraftQuery(query), [query]);
  const queryTokens = Array.from(new Set(tokenize(query)));
  const results = queryTokens.length > 0
    ? buildSearchIndex(queryTokens, { articles, items, reviews }, { onArticleClick, onItemClick, onGoToTab })
    : [];

  return (
    <div className="max-w-4xl mx-auto">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          const nextQuery = draftQuery.trim();
          if (nextQuery) onSearch(nextQuery);
        }}
        className="flex flex-col sm:flex-row gap-3 mb-8"
      >
        <label htmlFor="results-search-input" className="sr-only">{t('search.dialogTitle')}</label>
        <input
          id="results-search-input"
          type="search"
          value={draftQuery}
          onChange={(event) => setDraftQuery(event.target.value)}
          maxLength={120}
          autoComplete="off"
          enterKeyHint="search"
          className="min-h-12 flex-1 bg-transparent border border-[rgb(var(--c-accent-rgb)_/_0.35)] px-4 font-serif text-lg placeholder:opacity-45 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-gold)]"
          placeholder={t('search.inputHint')}
        />
        <button
          type="submit"
          disabled={!draftQuery.trim()}
          className="min-h-12 px-6 bg-[var(--c-accent)] text-[var(--c-bg)] font-mono text-xs uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-gold)]"
        >
          {t('search.submit')}
        </button>
      </form>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 mb-8 pb-6 border-b border-[rgb(var(--c-accent-rgb)_/_0.2)]" aria-live="polite">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.4)] mb-1">{t('search.results')}</p>
          <h2 className="font-serif text-2xl text-[var(--c-accent)]">
            "{query}" — <span className="text-[var(--c-gold)]">{results.length}</span>
          </h2>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="min-h-11 flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.65)] hover:text-[var(--c-accent)] transition-colors border border-[rgb(var(--c-accent-rgb)_/_0.3)] px-4 py-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-gold)]"
        >
          <X size={12} /> {t('search.clear')}
        </button>
      </div>
      {results.length === 0 ? (
        <div className="text-center py-24">
          <Search size={28} className="mx-auto mb-5 opacity-30" aria-hidden="true" />
          <p className="font-serif text-2xl mb-2">{t('search.emptyTitle').replace('{query}', query)}</p>
          <p className="font-mono text-xs tracking-wide text-[rgb(var(--c-accent-rgb)_/_0.55)]">{t('search.emptyHint')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {results.map((hit) => (
            <button
              key={hit.key}
              type="button"
              onClick={hit.onOpen}
              className="min-h-24 flex items-center gap-5 text-left border border-[rgb(var(--c-accent-rgb)_/_0.25)] hover:border-[var(--c-accent)] transition-colors p-4 sm:p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-gold)]"
            >
              {hit.imageUrl ? (
                <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 bg-[#E8DED5] overflow-hidden">
                  <img src={resolveMediaSource(hit.imageUrl, 160, 160)} alt="" loading="lazy" width="160" height="160" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 bg-[#E8DED5] flex items-center justify-center">
                  <FileText size={20} className="opacity-30" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--c-gold)]">{t(SEARCH_KIND_KEY[hit.kind])}</span>
                  {hit.meta && <span className="font-mono text-[9px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.4)]">{hit.meta}</span>}
                </div>
                <h3 className="font-serif text-lg sm:text-xl text-[var(--c-accent)] line-clamp-2">{hit.title}</h3>
                {hit.excerpt && (
                  <p className="font-serif text-sm text-[rgb(var(--c-accent-rgb)_/_0.65)] line-clamp-1 mt-0.5">{hit.excerpt}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const VALID_TABS = ['gallery', 'articles', 'reviews', 'about', 'manifest', 'issue', 'studio', 'radio', 'podcasts', 'design', 'passport'];
const VISIBILITY_TABS: VisibilitySectionKey[] = ['gallery', 'articles', 'reviews', 'about', 'manifest', 'issue', 'design', 'studio', 'radio', 'podcasts'];

function buildSlugMap(): Map<string, number> {
  const allArticles = getContentForLanguage(DEFAULT_LANGUAGE).articles;
  const map = new Map<string, number>();
  for (const a of allArticles) {
    map.set(generateSlug(a.title), a.id);
    map.set(String(a.id), a.id);
  }
  return map;
}

const SLUG_MAP = buildSlugMap();

function getSlugForArticle(article: Article): string {
  const canonical = getContentForLanguage(DEFAULT_LANGUAGE).articles.find((a) => a.id === article.id);
  return generateSlug(canonical?.title || article.title);
}

// Reviews used bare numeric URLs (/review/1) while articles have had readable
// slugs for a while. Slugs come from the DEFAULT_LANGUAGE title so one review
// keeps one canonical URL in every locale; a title with no latin characters
// leaves an empty slug, in which case the id stays the address.
function buildReviewSlugMap(): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of getContentForLanguage(DEFAULT_LANGUAGE).reviews) {
    const slug = generateSlug(r.title || '');
    if (slug) map.set(slug, r.id);
    map.set(String(r.id), r.id);
  }
  return map;
}

const REVIEW_SLUG_MAP = buildReviewSlugMap();

function getSlugForReview(review: Review): string {
  const canonical = getContentForLanguage(DEFAULT_LANGUAGE).reviews.find((r) => r.id === review.id);
  return generateSlug(canonical?.title || review.title || '') || String(review.id);
}

// Gallery items and full Articles have no shared id/slug field — some Gallery
// pieces happen to also exist as a full standalone Article (same title, its
// own /article/<slug> page with more room for photos/blocks). Matching by
// exact title is the only signal the data model offers; when it doesn't
// match anything, no link renders — deliberately conservative so this can't
// point at the wrong piece.
function findMatchingArticle(item: Item, articles: Article[]): Article | undefined {
  const title = item.title?.trim();
  if (!title) return undefined;
  // Exact title is the strongest signal.
  const exact = articles.find((a) => a.title?.trim() === title);
  if (exact) return exact;
  // Fallback: a gallery piece often carries a "Name: subtitle" headline while
  // the full article is filed under just "Name" (or vice-versa). Compare the
  // part before the first colon so the featured piece still links to its
  // article — without loosening into arbitrary substring matches.
  const base = (s: string) => s.split(':')[0].trim().toLowerCase();
  const itemBase = base(title);
  if (itemBase.length < 4) return undefined;
  return articles.find((a) => a.title && base(a.title) === itemBase);
}

function parsePath(pathname: string, search = ''): { tab?: string; articleId?: number; reviewId?: number; passportCode?: string; searchQuery?: string } {
  const p = pathname.replace(/^\//, '').replace(/\/$/, '');
  if (!p) return {};
  if (p === 'search') {
    const query = new URLSearchParams(search).get('q')?.trim().slice(0, 120);
    return { tab: 'gallery', searchQuery: query || undefined };
  }
  const reviewMatch = p.match(/^review\/(.+)$/);
  if (reviewMatch) {
    const id = REVIEW_SLUG_MAP.get(reviewMatch[1]);
    if (id !== undefined) return { tab: 'reviews', reviewId: id };
    // Old numeric bookmarks for a review that is no longer bundled locally:
    // keep the id so live content can still resolve it.
    if (/^\d+$/.test(reviewMatch[1])) return { tab: 'reviews', reviewId: parseInt(reviewMatch[1], 10) };
    return { tab: 'reviews' };
  }
  // Keep old bookmarks useful after the public Library section was retired.
  if (p === 'library' || p === 'materie') return { tab: 'articles' };
  const numericMatch = p.match(/^article\/(\d+)$/);
  if (numericMatch) return { tab: 'articles', articleId: parseInt(numericMatch[1], 10) };
  const slugMatch = p.match(/^article\/(.+)$/);
  if (slugMatch) {
    const id = SLUG_MAP.get(slugMatch[1]);
    if (id !== undefined) return { tab: 'articles', articleId: id };
  }
  const passportMatch = p.match(/^passport(?:\/([A-Za-z0-9-]+))?$/);
  if (passportMatch) return { tab: 'passport', passportCode: passportMatch[1] || undefined };
  if (VALID_TABS.includes(p)) return { tab: p };
  return {};
}

const ROUTE_META: Record<string, { title: string; description: string }> = {
  gallery: { title: 'EPRIS Journal — Contemporary Art, Architecture & Interior Design', description: 'Independent international journal and cultural platform exploring contemporary art, architecture, interior design and cities in context.' },
  articles: { title: 'Articles — EPRIS Journal', description: 'Editorial stories, interviews and research on contemporary art, architecture, interiors, design and cultural cities.' },
  reviews: { title: 'Reviews — EPRIS Journal', description: 'Independent EPRIS reviews of exhibitions, books, design, architecture and contemporary visual culture.' },
  about: { title: 'About EPRIS Journal', description: 'Meet EPRIS, an independent international journal and cultural platform for art, architecture and interior design.' },
  manifest: { title: 'Manifesto — EPRIS Journal', description: 'The EPRIS declaration on meaningful modernity, cultural accessibility and independent editorial practice.' },
  issue: { title: 'Current Issue — EPRIS Journal', description: 'Read the current digital issue of EPRIS Journal.' },
  studio: { title: 'EPRIS Studio', description: 'Editorial, visual and cultural projects by EPRIS Studio.' },
  design: { title: 'The Edit — EPRIS Design', description: 'A curated selection of contemporary furniture, objects and interior design by EPRIS.' },
  radio: { title: 'EPRIS Radio', description: 'Listen to EPRIS Radio: sound, music and cultural programming.' },
  podcasts: { title: 'EPRIS Podcasts', description: 'Conversations and audio stories about contemporary art, architecture, design and cities.' },
};

function updateMetaTags(article: Article | null, review: Review | null, activeTab: string, activeSearch: string, settings: SiteSettings) {
  const setMeta = (property: string, content: string) => {
    let el = document.querySelector(`meta[property="${property}"]`) || document.querySelector(`meta[name="${property}"]`);
    if (!el) {
      el = document.createElement('meta');
      if (property.startsWith('og:') || property.startsWith('article:')) {
        el.setAttribute('property', property);
      } else {
        el.setAttribute('name', property);
      }
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };
  const setCanonical = (href: string) => {
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = href;
  };
  const setJsonLd = (id: string, data: unknown) => {
    let script = document.querySelector<HTMLScriptElement>(`script[type="application/ld+json"][data-epris-id="${id}"]`);
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.eprisId = id;
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
  };
  const clearJsonLd = (id: string) => {
    document.querySelector<HTMLScriptElement>(`script[type="application/ld+json"][data-epris-id="${id}"]`)?.remove();
  };
  const brandName = String(settings.brandName || 'EPRIS').trim() || 'EPRIS';
  const publicationName = /journal/i.test(brandName) ? brandName : `${brandName} Journal`;
  const defaultDescription = String(settings.seoDescription || '').trim();
  const defaultKeywords = String(settings.seoKeywords || '').trim() || `${publicationName}, contemporary art, architecture, interior design, design journal, art interviews, design interviews, cultural journalism`;
  const defaultOgImage = safeExternalUrl(settings.ogImage) || 'https://eprisjournal.com/images/featured.png';
  const siteNode = {
    '@type': 'WebSite',
    name: publicationName,
    url: 'https://eprisjournal.com/',
    publisher: { '@type': 'Organization', name: publicationName, url: 'https://eprisjournal.com/', logo: defaultOgImage },
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://eprisjournal.com/search?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };
  const routeLabel = ROUTE_META[activeTab]?.title?.replace(/\s+—\s+EPRIS Journal$/, '') || publicationName;

  if (article) {
    const imageUrl = resolveMediaSource(article.imageUrl || article.imageSeed, 1200, 630);
    const canonicalUrl = `https://eprisjournal.com/article/${getSlugForArticle(article)}`;
    const keywords = Array.from(new Set([...(article.tags || []), article.category, article.subcategory, publicationName, 'architecture', 'design', 'contemporary art'].filter(Boolean))).join(', ');
    document.title = `${article.title} — ${publicationName}`;
    setMeta('og:title', article.title);
    setMeta('og:description', article.excerpt);
    setMeta('og:image', imageUrl);
    setMeta('og:type', 'article');
    setMeta('og:url', canonicalUrl);
    setMeta('og:site_name', publicationName);
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', article.title);
    setMeta('twitter:description', article.excerpt);
    setMeta('twitter:image', imageUrl);
    setMeta('description', article.excerpt);
    setMeta('keywords', keywords);
    setMeta('robots', 'index, follow, max-image-preview:large');
    setCanonical(canonicalUrl);
    setJsonLd('runtime-seo', {
      '@context': 'https://schema.org',
      '@graph': [
        siteNode,
        {
          '@type': 'NewsArticle',
          headline: article.title,
          description: article.excerpt,
          image: [imageUrl],
          datePublished: article.date,
          dateModified: article.updatedAt || article.date,
          author: { '@type': 'Person', name: article.author || 'EPRIS Editorial' },
          publisher: siteNode.publisher,
          articleSection: article.category,
          keywords,
          mainEntityOfPage: canonicalUrl,
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'EPRIS Journal', item: 'https://eprisjournal.com/' },
            { '@type': 'ListItem', position: 2, name: 'Articles', item: 'https://eprisjournal.com/articles' },
            { '@type': 'ListItem', position: 3, name: article.title, item: canonicalUrl },
          ],
        },
      ],
    });
  } else if (review) {
    // Without this the SPA overwrote the build-time review page's own title and
    // canonical with the generic /reviews ones as soon as it booted.
    const imageUrl = resolveMediaSource(review.imageUrl, 1200, 630);
    const canonicalUrl = `https://eprisjournal.com/review/${getSlugForReview(review)}`;
    const summary = review.verdict || reviewPlainText(review.content).slice(0, 200);
    document.title = `${review.title} — ${publicationName}`;
    setMeta('og:title', review.title);
    setMeta('og:description', summary);
    setMeta('og:image', imageUrl);
    setMeta('og:type', 'article');
    setMeta('og:url', canonicalUrl);
    setMeta('og:site_name', publicationName);
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', review.title);
    setMeta('twitter:description', summary);
    setMeta('twitter:image', imageUrl);
    setMeta('description', summary);
    setMeta('robots', 'index, follow, max-image-preview:large');
    setCanonical(canonicalUrl);
    setJsonLd('runtime-seo', {
      '@context': 'https://schema.org',
      '@graph': [
        siteNode,
        {
          '@type': 'Review',
          name: review.title,
          reviewBody: reviewPlainText(review.content),
          itemReviewed: { '@type': 'Thing', name: review.subject || review.title },
          author: { '@type': 'Person', name: review.author || 'EPRIS Editorial' },
          image: [imageUrl],
          publisher: siteNode.publisher,
          mainEntityOfPage: canonicalUrl,
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'EPRIS Journal', item: 'https://eprisjournal.com/' },
            { '@type': 'ListItem', position: 2, name: 'Reviews', item: 'https://eprisjournal.com/reviews' },
            { '@type': 'ListItem', position: 3, name: review.title, item: canonicalUrl },
          ],
        },
      ],
    });
  } else if (activeSearch) {
    const title = `Search: ${activeSearch} — ${publicationName}`;
    const description = `Search results for “${activeSearch}” across ${publicationName}.`;
    document.title = title;
    setMeta('og:title', title);
    setMeta('og:description', description);
    setMeta('og:image', defaultOgImage);
    setMeta('og:type', 'website');
    setMeta('og:url', window.location.href);
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
    setMeta('twitter:image', defaultOgImage);
    setMeta('description', description);
    setMeta('keywords', `${publicationName} search, art search, design search, architecture search`);
    setMeta('robots', 'noindex, follow');
    setCanonical('https://eprisjournal.com/search');
    clearJsonLd('runtime-seo');
  } else {
    const routeMeta = ROUTE_META[activeTab] || ROUTE_META.gallery;
    const routeTitle = activeTab === 'gallery' && settings.seoTitle?.trim() ? settings.seoTitle.trim() : routeMeta.title;
    const routeDescription = activeTab === 'gallery' && defaultDescription ? defaultDescription : routeMeta.description;
    const canonicalUrl = activeTab === 'gallery' ? 'https://eprisjournal.com/' : `https://eprisjournal.com/${activeTab}`;
    document.title = routeTitle;
    setMeta('og:title', routeTitle);
    setMeta('og:description', routeDescription);
    setMeta('og:image', defaultOgImage);
    setMeta('og:type', 'website');
    setMeta('og:url', canonicalUrl);
    setMeta('og:site_name', publicationName);
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', routeTitle);
    setMeta('twitter:description', routeDescription);
    setMeta('twitter:image', defaultOgImage);
    setMeta('description', routeDescription);
    setMeta('keywords', defaultKeywords);
    setMeta('robots', 'index, follow, max-image-preview:large');
    setCanonical(canonicalUrl);
    setJsonLd('runtime-seo', {
      '@context': 'https://schema.org',
      '@graph': [
        siteNode,
        {
          '@type': activeTab === 'gallery' ? 'WebPage' : 'CollectionPage',
          name: routeTitle,
          description: routeDescription,
          url: canonicalUrl,
          isPartOf: siteNode,
        },
        ...(activeTab === 'gallery' ? [] : [{
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'EPRIS Journal', item: 'https://eprisjournal.com/' },
            { '@type': 'ListItem', position: 2, name: routeLabel, item: canonicalUrl },
          ],
        }]),
      ],
    });
  }
}

export default function App() {
  if (/^\/(?:collaboation|collaboration|collab)\/?$/.test(window.location.pathname)) {
    if (!/^\/collaboration\/?$/.test(window.location.pathname)) {
      window.history.replaceState(null, '', '/collaboration');
    }
    return <Suspense fallback={<div className="min-h-screen bg-[#f5f0ea]" />}><CollaborationPage /></Suspense>;
  }
  /* Бюро — і список, і окремий розбір. Глибокі адреси віддає SPA-заглушка
     404.html, тож посилання на конкретний розбір працює напряму. */
  if (/^\/bureau(?:\/[^/]+)?\/?$/.test(window.location.pathname)) {
    return <Suspense fallback={<div className="min-h-screen bg-[#1a0b10]" />}><BureauPage /></Suspense>;
  }
  if (/^\/stage\/?$/.test(window.location.pathname)) {
    return <Suspense fallback={<div className="min-h-screen bg-[#1a0b10]" />}><StagePage /></Suspense>;
  }
  if (/^\/(?:showcase|works|set)\/?$/.test(window.location.pathname)) {
    if (!/^\/showcase\/?$/.test(window.location.pathname)) {
      window.history.replaceState(null, '', '/showcase');
    }
    return <Suspense fallback={<div className="min-h-screen bg-[#f5f0ea]" />}><ShowcasePage /></Suspense>;
  }
  const initialRoute = parsePath(window.location.pathname, window.location.search);
  const [activeTab, setActiveTab] = useState(initialRoute.tab || 'gallery');
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(initialRoute.articleId ?? null);
  const [previewArticleId, setPreviewArticleId] = useState<number | null>(null);
  const [selectedReviewId, setSelectedReviewId] = useState<number | null>(initialRoute.reviewId ?? null);
  const [passportCode, setPassportCode] = useState<string | undefined>(initialRoute.passportCode);
  const [currentLang, setCurrentLang] = useState(() => {
    try {
      const stored = localStorage.getItem('epris_language');
      return stored && getAvailableLanguages().includes(stored) ? stored : DEFAULT_LANGUAGE;
    } catch {
      return DEFAULT_LANGUAGE;
    }
  });
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string; title?: string; description?: string } | null>(null);
  const [selectedGalleryItem, setSelectedGalleryItem] = useState<Item | null>(null);
  const [activeSearch, setActiveSearch] = useState(initialRoute.searchQuery || '');
  // Live content: fetch the latest from the VPS on mount and re-render when it
  // swaps in. Until then (or if the VPS is unreachable) the bundled JSON renders.
  const [contentVersion, setContentVersion] = useState(0);
  // Fresh loads of /article/<slug> only have the bundled fallback articles to match
  // against until the live fetch resolves (SLUG_MAP at module scope is built once,
  // from that same stale bundle) — so any article published after the last deploy
  // 404s silently on direct load/refresh/share instead of resolving once live data
  // arrives. Track whether the live-content attempt has settled so we know when a
  // still-unresolved /article/ path is a genuine 404 rather than "still loading."
  const [contentLoadAttempted, setContentLoadAttempted] = useState(false);
  useEffect(() => {
    applySiteTheme(getTheme()); // bundled/default theme on first paint
    const unsubscribe = subscribeContent(() => { setContentVersion((v) => v + 1); applySiteTheme(getTheme()); });
    loadLiveContent().then(() => { applySiteTheme(getTheme()); setContentLoadAttempted(true); });
    return unsubscribe;
  }, []);
  // Keep the homepage editorial feed live when a reader leaves it open. The
  // first load above remains the fast path; this lightweight refresh only runs
  // on Home, pauses in hidden tabs, and respects the admin's auto-sync switch.
  useEffect(() => {
    if (activeTab !== 'gallery' || getHomepageSettings().articles?.autoSync === false) return;
    const refresh = () => {
      if (document.visibilityState === 'visible') void loadLiveContent(5000);
    };
    const onVisibility = () => { if (document.visibilityState === 'visible') refresh(); };
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', refresh);
    };
  }, [activeTab, contentVersion]);
  const languageOptions = getAvailableLanguages();
  useEffect(() => {
    try { localStorage.setItem('epris_language', currentLang); } catch { /* storage may be unavailable */ }
    const languageTags: Record<string, string> = { EN: 'en', RU: 'ru', UA: 'uk', TR: 'tr', DE: 'de', IT: 'it', ES: 'es' };
    document.documentElement.lang = languageTags[currentLang] || currentLang.toLowerCase();
  }, [currentLang]);
  const { items, articles, reviews } = getContentForLanguage(currentLang);
  const homepageArchive = getHomepageArchive();
  const homepageArticles = homepageArticleFeed(articles);
  const issueArchive = getIssueArchive(currentLang);
  const studio = getStudio();
  const defaultContent = getContentForLanguage(DEFAULT_LANGUAGE);
  const selectedArticle = selectedArticleId !== null
    ? articles.find((article) => article.id === selectedArticleId)
      || defaultContent.articles.find((article) => article.id === selectedArticleId)
      || null
    : null;
  const previewArticle = previewArticleId !== null
    ? articles.find((article) => article.id === previewArticleId)
      || defaultContent.articles.find((article) => article.id === previewArticleId)
      || null
    : null;
  const selectedReview = selectedReviewId !== null
    ? reviews.find((review) => review.id === selectedReviewId) || defaultContent.reviews.find((review) => review.id === selectedReviewId) || null
    : null;
  // Retry resolving /article/<slug> against live articles once they load — the
  // synchronous initial parse only had the stale bundled SLUG_MAP to check against.
  useEffect(() => {
    if (selectedArticleId !== null) return;
    const m = window.location.pathname.match(/^\/article\/([^/]+)\/?$/);
    if (!m) return;
    const slug = decodeURIComponent(m[1]);
    if (/^\d+$/.test(slug)) return; // numeric ids already resolved by parsePath
    const match = defaultContent.articles.find((a) => getSlugForArticle(a) === slug);
    if (match) {
      setSelectedArticleId(match.id);
      setActiveTab('articles');
    }
  }, [defaultContent.articles, selectedArticleId]);
  // Only a genuine 404 once the live fetch has had its chance — otherwise a
  // fresh load would flash "not found" before the retry effect above can run.
  const articleSlugNotFound = contentLoadAttempted
    && selectedArticleId === null
    && /^\/article\/([^/]+)\/?$/.test(window.location.pathname);
  // "Read also": same-category articles first, then the rest (newest ids first
  // as a recency proxy), excluding the one being read. Three cards max.
  const relatedArticles = selectedArticle
    ? [...articles]
        .filter((a) => a.id !== selectedArticle.id)
        .sort((a, b) => {
          const sameA = a.category === selectedArticle.category ? 1 : 0;
          const sameB = b.category === selectedArticle.category ? 1 : 0;
          return sameB - sameA || b.id - a.id;
        })
        .slice(0, 3)
    : [];
  const t = (key: string) => getTranslation(currentLang, key);
  const siteSettings = getSiteSettings();
  const brandName = String(siteSettings.brandName || 'EPRIS').trim().slice(0, 32) || 'EPRIS';
  const publicationName = /journal/i.test(brandName) ? brandName : `${brandName} Journal`;
  const footerTitle = String(siteSettings.footerTitle || publicationName).trim() || publicationName;
  const footerDescription = String(siteSettings.footerDescription || '').trim();
  const instagramUrl = safeExternalUrl(siteSettings.instagramUrl);
  const contactEmail = String(siteSettings.contactEmail || '').trim();
  const fallbackTab = VISIBILITY_TABS.find((tab) => isSectionEnabled(tab)) || 'gallery';
  const homepageLayout = getHomepageSettings().layout || {};
  const homepageDefaultSectionOrder = ['pics', 'articles', 'showcase', 'archive'];
  const homepageSectionOrder = Array.from(new Set([
    ...(Array.isArray(homepageLayout.sectionOrder) ? homepageLayout.sectionOrder : []),
    ...homepageDefaultSectionOrder,
  ])).filter((section) => homepageDefaultSectionOrder.includes(section));
  const homepageSectionVisible = (section: string) => homepageLayout.visibility?.[section as 'pics' | 'articles' | 'showcase' | 'archive'] !== false;
  const homepageArticleLayout = homepageLayout.articles || {};
  const homepageArticleColumns = homepageArticleLayout.columns === 2 || homepageArticleLayout.columns === 3 ? homepageArticleLayout.columns : 1;
  const renderHomepageSection = (section: string) => {
    if (!homepageSectionVisible(section)) return null;
    if (section === 'pics') {
      return <GallerySection items={items} onImageClick={handleImageClick} currentLang={currentLang} t={t} />;
    }
    if (section === 'articles') {
      if (!homepageArticles.length) return null;
      return <section className="homepage-articles mt-12 border-t border-[rgb(var(--c-accent-rgb)_/_0.2)] pt-10 sm:mt-16 sm:pt-12" aria-labelledby="homepage-articles-title">
        <div className="mb-8 flex flex-col gap-2 border-b border-[rgb(var(--c-accent-rgb)_/_0.2)] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--c-accent-rgb)_/_0.5)]">{t('homepage.articlesEyebrow')}</p>
            <h2 id="homepage-articles-title" className="mt-2 font-crimson text-3xl text-[var(--c-accent)] sm:text-4xl">{t('homepage.articlesTitle')}</h2>
          </div>
          <p className="max-w-[34ch] font-serif text-sm leading-relaxed text-[rgb(var(--c-accent-rgb)_/_0.68)] sm:text-right">{t('homepage.articlesDescription')}</p>
        </div>
        <ArticlesSection
          articles={homepageArticles}
          onArticleClick={(article) => handleSelectArticle(article.id, article)}
          onArticlePreview={handlePreviewArticle}
          t={t}
          showDescription={homepageArticleLayout.showDescription !== false}
          showPreview={homepageArticleLayout.showPreview !== false}
          showReadAll={homepageArticleLayout.showReadAll !== false}
          columns={homepageArticleColumns}
        />
      </section>;
    }
    if (section === 'archive') {
      return <DailyPicksArchive archive={homepageArchive} items={items} onImageClick={handleImageClick} currentLang={currentLang} t={t} />;
    }
    return <Suspense fallback={null}><ShowcaseTeaser /></Suspense>;
  };

  useEffect(() => {
    updateMetaTags(selectedArticle, selectedReview, activeTab, activeSearch, siteSettings);
  }, [selectedArticle, selectedReview, activeTab, activeSearch, contentVersion]);

  const handleImageClick = useCallback((src: string, alt: string, description?: string, title?: string) => {
    setLightboxImage({ src, alt, description, title });
  }, []);

  const navigate = useCallback((path: string) => {
    window.history.pushState(null, '', path);
  }, []);

  const handleSearch = useCallback((q: string) => {
    const normalizedQuery = q.trim().replace(/\s+/g, ' ').slice(0, 120);
    if (!normalizedQuery) return;
    setActiveSearch(normalizedQuery);
    setSelectedArticleId(null);
    setPreviewArticleId(null);
    setActiveTab('gallery');
    navigate(`/search?q=${encodeURIComponent(normalizedQuery)}`);
  }, [navigate]);

  const handleSetTab = useCallback((tab: string) => {
    const managedTab = VISIBILITY_TABS.includes(tab as VisibilitySectionKey) ? tab as VisibilitySectionKey : null;
    const target = managedTab && !isSectionEnabled(managedTab) ? fallbackTab : tab;
    setActiveTab(target);
    setSelectedArticleId(null);
    setPreviewArticleId(null);
    setSelectedReviewId(null);
    setActiveSearch('');
    setPassportCode(undefined);
    navigate(target === 'gallery' ? '/' : `/${target}`);
  }, [fallbackTab, navigate]);

  const handleHome = useCallback(() => {
    handleSetTab('gallery');
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }, [handleSetTab]);

  const handleSelectArticle = useCallback((id: number, article?: Article) => {
    setPreviewArticleId(null);
    setSelectedArticleId(id);
    if (article) {
      navigate(`/article/${getSlugForArticle(article)}`);
    } else {
      const a = defaultContent.articles.find(a => a.id === id);
      navigate(`/article/${a ? getSlugForArticle(a) : id}`);
    }
  }, [navigate, defaultContent.articles]);

  const handleCloseArticle = useCallback(() => {
    setSelectedArticleId(null);
    navigate(activeTab === 'gallery' ? '/' : `/${activeTab}`);
  }, [activeTab, navigate]);
  const handlePreviewArticle = useCallback((article: Article) => {
    setPreviewArticleId(article.id);
  }, []);
  const handleCloseArticlePreview = useCallback(() => {
    setPreviewArticleId(null);
  }, []);
  const handleSelectReview = useCallback((review: Review) => {
    setPreviewArticleId(null);
    setSelectedArticleId(null);
    setSelectedReviewId(review.id);
    setActiveTab('reviews');
    navigate(`/review/${getSlugForReview(review)}`);
  }, [navigate]);
  const handleCloseReview = useCallback(() => {
    setSelectedReviewId(null);
    navigate('/reviews');
  }, [navigate]);

  useEffect(() => {
    const onPopState = () => {
      const parsed = parsePath(window.location.pathname, window.location.search);
      if (/^\/(?:library|materie)\/?$/.test(window.location.pathname)) {
        window.history.replaceState(null, '', '/articles');
      }
      setActiveSearch(parsed.searchQuery || '');
      if (parsed.articleId !== undefined) {
        setSelectedArticleId(parsed.articleId);
        setActiveTab('articles');
        setPassportCode(undefined);
      } else {
        setSelectedArticleId(null);
        setSelectedReviewId(parsed.reviewId ?? null);
        setActiveTab(parsed.tab || 'gallery');
        setPassportCode(parsed.passportCode);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (/^\/(?:library|materie)\/?$/.test(window.location.pathname)) {
      window.history.replaceState(null, '', '/articles');
    }
    if (initialRoute.articleId !== undefined) {
      const slug = window.location.pathname.match(/\/article\/(\d+)$/);
      if (slug) {
        const a = defaultContent.articles.find(a => a.id === initialRoute.articleId);
        if (a) {
          window.history.replaceState(null, '', `/article/${getSlugForArticle(a)}`);
        }
      }
    }
    // Same upgrade for the numeric review URLs that are already out there.
    // The static landing pages are directories, so the server hands the reader
    // /review/1/ with a trailing slash — match it or the address bar keeps the id.
    if (initialRoute.reviewId !== undefined && /\/review\/\d+\/?$/.test(window.location.pathname)) {
      const r = defaultContent.reviews.find((review) => review.id === initialRoute.reviewId);
      if (r) window.history.replaceState(null, '', `/review/${getSlugForReview(r)}`);
    }
  }, []);

  // Visibility is loaded live from the CMS. If an editor disables the route
  // currently open in a reader's browser, move to the first enabled section
  // instead of leaving a blank or stale page behind.
  useEffect(() => {
    if (!VISIBILITY_TABS.includes(activeTab as VisibilitySectionKey)) return;
    if (isSectionEnabled(activeTab as VisibilitySectionKey)) return;
    setActiveTab(fallbackTab);
    setSelectedArticleId(null);
    setActiveSearch('');
    setPassportCode(undefined);
    window.history.replaceState(null, '', fallbackTab === 'gallery' ? '/' : `/${fallbackTab}`);
  }, [activeTab, contentVersion, fallbackTab]);

  const routeKey = activeSearch ? `search-${activeSearch}` : activeTab;
  const previousRouteKey = useRef(routeKey);
  const routeDirection = routePosition(routeKey) >= routePosition(previousRouteKey.current) ? 1 : -1;
  useEffect(() => {
    previousRouteKey.current = routeKey;
  }, [routeKey]);

  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen bg-[var(--c-bg)] text-[var(--c-accent)] selection:bg-[var(--c-gold)] selection:text-white">
      <NavBar
        activeTab={activeTab}
        setActiveTab={handleSetTab}
        onHome={handleHome}
        currentLang={currentLang}
        setCurrentLang={setCurrentLang}
        t={t}
        languages={languageOptions}
        onSearch={handleSearch}
        brandName={brandName}
      />

      <RouteTransition routeKey={routeKey} direction={routeDirection}>
      <div className={activeTab === 'gallery' ? '' : 'lg:pr-12'}>
        {activeTab === 'issue' ? (
          <LazyTab>
            <IssuePage archive={issueArchive} t={t} />
          </LazyTab>
        ) : activeTab === 'design' ? (
          <LazyTab>
            <DesignPage lang={currentLang} />
          </LazyTab>
        ) : activeTab === 'studio' ? (
          <LazyTab>
            <StudioPage studio={studio} t={t} />
          </LazyTab>
        ) : activeTab === 'radio' ? (
          <LazyTab>
            <RadioPage t={t} />
          </LazyTab>
        ) : activeTab === 'podcasts' ? (
          <LazyTab>
            <PodcastsPage t={t} />
          </LazyTab>
        ) : activeTab === 'passport' ? (
          <LazyTab>
            <PassportPage viewCode={passportCode ?? null} onBack={() => handleSetTab('gallery')} />
          </LazyTab>
        ) : (
          <main className="site-main max-w-[1600px] mx-auto px-4 sm:px-8 md:px-16 pb-8 sm:pb-12 md:pb-24">
            {activeSearch ? (
              <SearchResults
                query={activeSearch}
                articles={articles}
                items={items}
                reviews={reviews}
                onClear={() => { setActiveSearch(''); navigate(activeTab === 'gallery' ? '/' : `/${activeTab}`); }}
                onArticleClick={(article) => handleSelectArticle(article.id, article)}
                onItemClick={(item) => { setActiveSearch(''); handleSetTab('gallery'); setSelectedGalleryItem(item); }}
                onGoToTab={handleSetTab}
                onSearch={handleSearch}
                t={t}
              />
            ) : (
              <>
                {activeTab === 'gallery' && (
                  <>{homepageSectionOrder.map((section) => <div key={section} className="contents">{renderHomepageSection(section)}</div>)}</>
                )}
                {activeTab === 'articles' && <ArticlesSection articles={articles} onArticleClick={(article) => handleSelectArticle(article.id, article)} t={t} />}
                    {activeTab === 'reviews' && <ReviewsSection reviews={reviews} t={t} onReviewClick={handleSelectReview} />}
                {activeTab === 'about' && <AboutSection t={t} currentLang={currentLang} onOpenManifest={() => handleSetTab('manifest')} />}
                {activeTab === 'manifest' && <ManifestPage t={t} currentLang={currentLang} />}
              </>
            )}
          </main>
        )}

        {activeTab !== 'issue' && activeTab !== 'design' && activeTab !== 'studio' && activeTab !== 'radio' && activeTab !== 'podcasts' && activeTab !== 'passport' && <footer className="border-t border-[rgba(209,181,149,0.45)] bg-[#180D13] text-[#F7F2EC] py-8 sm:py-12 md:py-24 px-4 sm:px-8 md:px-16">
          <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center md:items-end gap-8 sm:gap-12 text-center md:text-left">
            <div>
              <h2 className="font-serif text-3xl sm:text-4xl md:text-6xl mb-6 sm:mb-8 text-[#F7F2EC]">{footerTitle}</h2>
              <div className="font-mono text-xs uppercase tracking-widest text-[#D9C7BA] max-w-xs mx-auto md:mx-0 leading-relaxed">
                {footerDescription ? <p>{footerDescription}</p> : <><p>{t('hero.subtitle2')}</p><p>{t('hero.subtitle1')}</p></>}
              </div>
            </div>
            <div className="text-center md:text-right font-mono text-xs uppercase tracking-widest text-[#BFAFA4]">
              <p>© 2026 {publicationName}</p>
              <p>{t('footer.rights')}</p>
              {(instagramUrl || contactEmail) && <div className="mt-4 flex flex-wrap justify-center md:justify-end gap-x-4 gap-y-2 text-[#D9C7BA]">
                {instagramUrl && <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="hover:text-[#F7F2EC] underline underline-offset-4 transition-colors">Instagram</a>}
                {contactEmail && <a href={`mailto:${contactEmail}`} className="hover:text-[#F7F2EC] underline underline-offset-4 transition-colors">{contactEmail}</a>}
              </div>}
            </div>
          </div>
        </footer>}
      </div>
      </RouteTransition>
      
      <AnimatePresence initial={false}>
        {activeTab !== 'gallery' && <Sidebar key="section-sidebar" t={t} />}
      </AnimatePresence>

      <AnimatePresence>
        {previewArticle && (
          <ArticlePreviewDialog
            article={previewArticle}
            onClose={handleCloseArticlePreview}
            onReadFull={() => handleSelectArticle(previewArticle.id, previewArticle)}
            onImageClick={handleImageClick}
            t={t}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedArticle && (
          <ArticleView article={selectedArticle} related={relatedArticles} onArticleClick={(a) => handleSelectArticle(a.id, a)} onTagClick={handleSearch} onClose={handleCloseArticle} onImageClick={handleImageClick} t={t} currentLang={currentLang} setCurrentLang={setCurrentLang} languages={languageOptions} />
        )}
      </AnimatePresence>
      <AnimatePresence>{selectedReview && <ReviewView review={selectedReview} t={t} onClose={handleCloseReview} currentLang={currentLang} />}</AnimatePresence>

      <AnimatePresence>
        {articleSlugNotFound && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[var(--c-bg)] flex items-center justify-center px-6"
          >
            <div className="text-center max-w-md">
              <p className="font-mono text-xs uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.5)] mb-4">404</p>
              <h1 className="font-serif text-3xl sm:text-4xl text-[var(--c-accent)] mb-4">{t('article.notFound')}</h1>
              <p className="font-serif text-[rgb(var(--c-accent-rgb)_/_0.7)] mb-8">{t('article.notFound.body')}</p>
              <button
                type="button"
                onClick={() => { window.history.replaceState(null, '', '/articles'); setActiveTab('articles'); }}
                className="font-mono text-xs uppercase tracking-widest border border-[var(--c-accent)] rounded-full px-6 py-3 hover:bg-[var(--c-accent)] hover:text-[var(--c-bg)] transition-colors"
              >
                {t('article.backToArticles')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lightboxImage && (
          <ImageLightbox
            src={lightboxImage.src}
            alt={lightboxImage.alt}
            title={lightboxImage.title}
            description={lightboxImage.description}
            onClose={() => setLightboxImage(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedGalleryItem && (
          <GalleryItemView
            item={selectedGalleryItem}
            onClose={() => setSelectedGalleryItem(null)}
            articles={articles}
            onReadArticle={(a) => { setSelectedGalleryItem(null); handleSelectArticle(a.id, a); }}
          />
        )}
      </AnimatePresence>
    </div>
    </MotionConfig>
  );
}
