import { motion, AnimatePresence, LayoutGroup, MotionConfig } from 'framer-motion';
import { ReactNode, useState, useEffect, useCallback, useMemo, FormEvent, useRef, Suspense, lazy, Component } from 'react';
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
import {
  Article,
  Author,
  ContentBlock,
  DEFAULT_LANGUAGE,
  getAvailableLanguages,
  getAuthors,
  getManifest,
  getContentForLanguage,
  getIssueArchive,
  getStudio,
  resolveAuthor,
  translateRole,
  Item,
  Review,
  setPreviewOverride,
  getTranslations,
  getTheme,
  isSectionEnabled,
  isSectionInNavigation,
  loadLiveContent,
  subscribeContent
} from './data';
import type { SiteTheme, VisibilitySectionKey } from './data';
import { Search, ArrowUpRight, FileText, Menu, X, Globe, MapPin, ExternalLink, ArrowLeft, Quote, Play, Music, Image as ImageIcon, CheckSquare, Square, BarChart, Lightbulb, Share2, Link2, Check } from 'lucide-react';

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

function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
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
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/80 hover:bg-white/10 rounded-full transition-colors z-10"
      >
        <X size={24} />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-full object-contain select-none"
        referrerPolicy="no-referrer"
      />
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

function getTranslation(lang: string, key: string) {
  const tr = getTranslations();
  return tr[lang]?.[key] || tr[DEFAULT_LANGUAGE]?.[key] || key;
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

  return `https://picsum.photos/seed/${encodeURIComponent(normalized)}/${width}/${height}?grayscale`;
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

// Extracts an 11-char YouTube video id from watch/share/embed/shorts URLs.
function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

// Click-to-play YouTube embed — shows the real thumbnail + play button, only
// loads the YouTube iframe (and its trackers) once a reader actually clicks.
function VideoBlock({ content, caption }: { content: string; caption?: string }) {
  const [playing, setPlaying] = useState(false);
  const ytId = extractYouTubeId(content);

  return (
    <figure className="my-8 sm:my-12">
      <div className="aspect-video bg-black relative overflow-hidden">
        {playing && ytId ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1`}
            title={caption || 'Video'}
            className="w-full h-full"
            allow="accelerated-video-playback; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="w-full h-full relative flex items-center justify-center group cursor-pointer"
            aria-label={caption || 'Play video'}
          >
            {ytId && (
              <img
                src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                alt="" loading="lazy" referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-85 transition-opacity"
              />
            )}
            <Play size={48} className="relative text-white opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all" />
          </button>
        )}
      </div>
      {caption && (
        <figcaption className="text-center font-mono text-xs text-[rgb(var(--c-accent-rgb)_/_0.6)] mt-3 sm:mt-4 uppercase tracking-widest">
          {caption}
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
// Card hover-lift on desktop; press feedback on touch (no hover there).
const cardHover = { y: -6, transition: { duration: 0.28, ease: EASE } };
const cardTap = { scale: 0.985, transition: { duration: 0.15, ease: EASE } };
// A hairline that draws itself in when scrolled into view.
const drawLine = {
  hidden: { scaleX: 0, opacity: 0 },
  show: { scaleX: 1, opacity: 1, transition: { duration: 0.46, ease: EASE } },
};

const ROUTE_SEQUENCE = ['gallery', 'articles', 'reviews', 'about', 'manifest', 'issue', 'design', 'studio', 'radio', 'podcasts', 'passport'];
const routeVariants = {
  enter: (direction: number) => ({ opacity: 0, x: direction * 24, y: 8 }),
  center: { opacity: 1, x: 0, y: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction * -14, y: -4 }),
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
        transition={{
          opacity: { duration: 0.22, ease: EASE },
          x: { duration: 0.32, ease: EASE },
          y: { duration: 0.28, ease: EASE },
        }}
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
  currentLang,
  setCurrentLang,
  t,
  languages,
  onSearch,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentLang: string;
  setCurrentLang: (lang: string) => void;
  t: (key: string) => string;
  languages: string[];
  onSearch: (q: string) => void;
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
    { id: 'gallery', label: t('nav.gallery') },
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
        <button
          type="button"
          onClick={() => { setActiveTab('gallery'); setIsMenuOpen(false); }}
          aria-label="EPRIS — home"
          className="absolute left-1/2 -translate-x-1/2 leading-none font-mono"
        >
          <span className="text-lg min-[360px]:text-xl tracking-[0.22em] text-[var(--c-accent)] pl-[0.22em]">EPRIS</span>
        </button>
        <div className="relative z-10 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => { setIsMenuOpen(false); setIsLangOpen(true); }}
            aria-label={`${LANG_LABELS[currentLang] || currentLang}. Select language`}
            aria-haspopup="dialog"
            aria-expanded={isLangOpen}
            className="h-11 min-w-14 px-3 inline-flex items-center justify-center gap-1.5 rounded-full border border-[rgb(var(--c-accent-rgb)_/_0.28)] bg-[rgb(var(--c-bg-rgb)_/_0.92)] font-mono text-[11px] font-bold tracking-[0.12em] uppercase hover:bg-[rgb(var(--c-accent-rgb)_/_0.08)] active:scale-95 transition"
          >
            <Globe size={14} aria-hidden="true" />
            {currentLang}
          </button>
          {isSectionInNavigation('issue') && <button
            type="button"
            onClick={() => { setActiveTab('issue'); setIsMenuOpen(false); }}
            aria-label={t('nav.issue')}
            title={t('nav.issue')}
            className="hidden min-[360px]:inline-flex h-11 min-w-[4.25rem] items-center justify-center gap-1.5 bg-[var(--c-accent)] text-[var(--c-bg)] rounded-full px-3 font-mono text-[10px] tracking-[0.12em] uppercase hover:bg-[#3d1421] active:scale-95 transition shadow-[0_10px_24px_-18px_rgb(var(--c-accent-rgb)_/_0.85)]"
          >
            <FileText size={13} aria-hidden="true" />
            Issue
          </button>}
        </div>
      </nav>

      {/* ── Desktop header ── */}
      <nav className="hidden lg:flex fixed top-0 left-0 w-full z-50 bg-[var(--c-bg)] border-b border-[var(--c-accent)] text-xs font-mono uppercase tracking-widest text-[var(--c-accent)] h-16">
        {/* Logo Section */}
        <div className="w-64 border-r border-[var(--c-accent)] px-6 flex items-center shrink-0 bg-[var(--c-bg)] z-50">
          <button type="button" className="flex items-center font-mono" onClick={() => setActiveTab('gallery')} aria-label="Go to home">
            <span className="text-xl tracking-[0.2em] text-[var(--c-accent)] pl-[0.2em] normal-case leading-none">EPRIS</span>
          </button>
        </div>

        {/* Desktop Navigation */}
        <LayoutGroup id="nav-tabs">
          <div
            className="grid flex-1 divide-x divide-[var(--c-accent)]"
            style={{ gridTemplateColumns: `repeat(${Math.max(tabs.length, 1)}, minmax(0, 1fr))` }}
          >
            {tabs.map((tab) => (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
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
              </button>
            ))}
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
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.28, ease: EASE }}
              className="absolute inset-x-0 bottom-0 max-h-[78dvh] overflow-y-auto rounded-t-[28px] border-t border-[rgb(var(--c-accent-rgb)_/_0.24)] bg-[var(--c-bg)] px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl"
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[rgb(var(--c-accent-rgb)_/_0.22)]" aria-hidden="true" />
              <div className="flex items-center justify-between gap-4 px-1 pb-3">
                <div>
                  <p className="font-serif text-xl leading-tight">Language</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] opacity-55">Choose edition</p>
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
              {tabs.map((tab) => (
                <motion.button
                  type="button"
                  key={tab.id}
                  variants={{
                    hidden: { opacity: 0, x: -14 },
                    show: { opacity: 1, x: 0, transition: { duration: 0.22, ease: EASE } },
                  }}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsMenuOpen(false);
                  }}
                  className={`min-h-[64px] px-6 py-4 flex items-center justify-between text-left transition-colors active:scale-[0.99] ${
                    activeTab === tab.id ? 'bg-[var(--c-accent)] text-[var(--c-bg)]' : ''
                  }`}
                >
                  <span className="font-serif font-normal text-xl leading-tight">{tab.label}</span>
                </motion.button>
              ))}
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

function SectionMasthead({ t, variant = 'photo' }: { t: (key: string) => string; variant?: 'photo' | 'plain' }) {
  const lockup = (
    <>
      <div className="leading-none shrink-0 font-mono">
        <div className="text-lg sm:text-2xl tracking-[0.18em]">EPRIS</div>
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

function GalleryMasthead({ t }: { t: (key: string) => string }) {
  return (
    <div className="bg-[var(--c-bg)] pt-16">
      {/* Full-bleed masthead photo — no inset frame around the lead visual */}
      <SectionMasthead t={t} variant="photo" />

      {/* Full-bleed dotted rule */}
      <div className="border-b border-dotted border-[rgb(var(--c-accent-rgb)_/_0.4)]" />

      {/* "explore our latest article" kicker */}
      <motion.div
        className="flex items-center justify-center gap-4 sm:gap-6 py-6 sm:py-8 px-5"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-10%' }}
      >
        <motion.span variants={drawLine} className="h-px w-10 sm:w-16 bg-[rgb(var(--c-accent-rgb)_/_0.3)] origin-right" />
        <motion.span
          initial={{ opacity: 0, y: 8 }}
          variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE, delay: 0.15 } } }}
          className="font-crimson italic text-sm sm:text-base tracking-wide text-[rgb(var(--c-accent-rgb)_/_0.75)]"
        >
          {t('hero.exploreLatest')}
        </motion.span>
        <motion.span variants={drawLine} className="h-px w-10 sm:w-16 bg-[rgb(var(--c-accent-rgb)_/_0.3)] origin-left" />
      </motion.div>
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

function GallerySection({ items, onItemClick }: { items: Item[]; onItemClick: (item: Item) => void }) {
  if (items.length === 0) return null;
  const [featured, ...rest] = items;

  return (
    <div>
      {/* Featured article — offset corner-bracket frame, no card border */}
      <Reveal>
        <div className="relative -mx-4 sm:mx-0 sm:p-5 mb-14 sm:mb-28">
          <span className="absolute top-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-t border-l border-[var(--c-accent)]" />
          <span className="absolute top-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-t border-r border-[var(--c-accent)]" />
          <span className="absolute bottom-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-b border-l border-[var(--c-accent)]" />
          <span className="absolute bottom-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-b border-r border-[var(--c-accent)]" />
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10 group cursor-pointer"
            whileHover={cardHover}
            whileTap={cardTap}
            role="button"
            tabIndex={0}
            onClick={() => onItemClick(featured)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onItemClick(featured)}
            aria-label={`View: ${featured.title}`}
          >
            <div className="md:col-span-2 aspect-[4/3] overflow-hidden bg-[#E8DED5]">
              <img
                src={resolveMediaSource(featured.imageUrl || featured.imageSeed, 1000, 750)}
                alt={featured.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex flex-col justify-center px-4 pt-5 pb-2 sm:px-0 sm:py-2">
              <h2 className="font-crimson text-2xl sm:text-3xl text-[var(--c-accent)] underline decoration-1 underline-offset-4 decoration-[rgb(var(--c-accent-rgb)_/_0.35)] group-hover:decoration-[var(--c-gold)] group-hover:text-[var(--c-gold)] transition-colors duration-300 mb-2">
                {featured.title}
              </h2>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.6)] mb-5">
                {featured.subtitle}
              </p>
              <p className="font-serif text-sm sm:text-base text-[rgb(var(--c-accent-rgb)_/_0.75)] leading-relaxed mb-6">
                {featured.description}
              </p>
              <span className="inline-flex items-center self-start border border-[var(--c-accent)] rounded-full px-5 py-2.5 sm:py-1.5 font-mono text-[10px] uppercase tracking-widest text-[var(--c-accent)] group-hover:bg-[var(--c-accent)] group-hover:text-[var(--c-bg)] transition-colors w-fit">
                read
              </span>
            </div>
          </motion.div>
        </div>
      </Reveal>

      {/* Article list — thumbnail / title / kicker+read, no borders, generous whitespace */}
      <motion.div
        className="flex flex-col gap-14 sm:gap-20"
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-6%' }}
      >
        {rest.map((item) => {
          return (
          <motion.div
            key={item.id}
            variants={staggerItem}
            whileHover={cardHover}
            whileTap={cardTap}
            className="group cursor-pointer flex flex-col sm:flex-row gap-5 sm:gap-8"
            role="button"
            tabIndex={0}
            onClick={() => onItemClick(item)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onItemClick(item)}
            aria-label={`View: ${item.title}`}
          >
            <div className="w-full sm:w-44 md:w-48 aspect-square overflow-hidden bg-[#E8DED5] shrink-0">
              <motion.img
                src={resolveMediaSource(item.imageUrl || item.imageSeed, 400, 400)}
                alt={item.title}
                className="w-full h-full object-cover"
                whileHover={{ scale: 1.04 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex-1 flex flex-col sm:flex-row justify-between gap-4 sm:gap-10">
              <div className="flex flex-col gap-2 max-w-md self-start">
                <h3 className="font-crimson text-xl sm:text-2xl text-[var(--c-accent)] leading-snug group-hover:text-[var(--c-gold)] transition-colors duration-300">
                  {item.title}
                </h3>
                {item.description && (
                  <p className="font-serif text-sm text-[rgb(var(--c-accent-rgb)_/_0.75)] leading-relaxed line-clamp-3">
                    {item.description}
                  </p>
                )}
              </div>
              <div className="flex sm:flex-col items-start sm:items-end justify-between shrink-0 gap-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.6)]">
                  {item.subtitle}
                </span>
                <span className="inline-flex items-center border border-[var(--c-accent)] rounded-full px-4 py-2 sm:py-1.5 font-mono text-[10px] uppercase tracking-widest text-[var(--c-accent)] group-hover:bg-[var(--c-accent)] group-hover:text-[var(--c-bg)] transition-colors">
                  read
                </span>
              </div>
            </div>
          </motion.div>
          );
        })}
      </motion.div>
    </div>
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
  const resolvedAuthor = resolveAuthor(article);
  const authorName = resolvedAuthor?.name || article.author;
  // article.role is per-language (each locale bucket carries its own translated
  // string, e.g. "Arts Desk" vs "Arts Desk" translated); the Author record's
  // role is a single global string entered once in the admin, so it can only
  // ever show in whatever language it was typed in. Prefer the localized
  // article.role and only fall back to the author record's role when the
  // article doesn't specify one — otherwise the byline "role" freezes in
  // one language regardless of the reader's selected language.
  const authorRole = article.role || translateRole(resolvedAuthor?.role, currentLang);
  const authorPhoto = resolvedAuthor?.photoUrl;

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
              className="aspect-[4/3] sm:aspect-[16/9] overflow-hidden bg-[#E8DED5] mb-8 sm:mb-12 cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label="View full image"
              onClick={() => onImageClick(resolveMediaSource(article.imageUrl || article.imageSeed, 1200, 675), article.title)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onImageClick(resolveMediaSource(article.imageUrl || article.imageSeed, 1200, 675), article.title)}
            >
              <img
                src={resolveMediaSource(article.imageUrl || article.imageSeed, 1200, 675)}
                alt={article.title}
                className="w-full h-full object-cover grayscale"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 md:gap-4 font-mono text-[10px] md:text-xs text-[rgb(var(--c-accent-rgb)_/_0.6)] uppercase tracking-widest mb-6 flex-wrap">
                <span>{article.date}</span>
                <span className="w-1 h-1 bg-[rgb(var(--c-accent-rgb)_/_0.4)] rounded-full" />
                <span>{article.author}</span>
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
                      className={`font-bold text-[var(--c-accent)] mt-10 mb-4 ${lvl === 3 ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'}`}
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
                        alt={block.caption || "Article image"}
                        className="w-full h-auto grayscale cursor-pointer hover:opacity-90 transition-opacity"
                        referrerPolicy="no-referrer"
                        onClick={() => onImageClick(imageSource, block.caption || 'Article image')}
                      />
                      {block.caption && (
                        <figcaption className="text-center font-mono text-xs text-[rgb(var(--c-accent-rgb)_/_0.6)] mt-3 sm:mt-4 uppercase tracking-widest px-4 sm:px-0">
                          {block.caption}
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
                            style={{ border: 0, filter: 'grayscale(100%) contrast(1.1)' }}
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
                  return <VideoBlock key={index} content={typeof block.content === 'string' ? block.content : ''} caption={block.caption} />;
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
                                    className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
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
                                className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
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
                {t('article.related') === 'article.related' ? (currentLang === 'RU' ? 'Читать также' : 'Read also') : t('article.related')}
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
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
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

function ArticlesSection({
  articles,
  onArticleClick,
  t
}: {
  articles: Article[];
  onArticleClick: (article: Article) => void;
  t: (key: string) => string;
}) {
  const filteredArticles = articles;

  return (
    <div>
      <SectionMasthead t={t} />

      <div className="max-w-4xl mx-auto px-5 sm:px-0 pt-8 sm:pt-10">
      <motion.div variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-5%' }} className="space-y-10 sm:space-y-14">
      {filteredArticles.map((article, index) => (
        <motion.div key={article.id} variants={staggerItem}>
          {index === 0 ? (
            // Featured (first) article — larger side-by-side card, whole card is the link
            <motion.article
              className="border border-[var(--c-accent)] group cursor-pointer grid grid-cols-1 md:grid-cols-[64%_1fr] items-stretch overflow-hidden"
              onClick={() => onArticleClick(article)}
              tabIndex={0}
              role="button"
              aria-label={`Read article: ${article.title}`}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onArticleClick(article)}
              whileHover={{ x: 4 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="aspect-[3/2] md:aspect-auto overflow-hidden bg-[#E8DED5]">
                <motion.img
                  src={resolveMediaSource(article.imageUrl || article.imageSeed, 800, 520)}
                  alt={article.title}
                  className="w-full h-full object-cover"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex flex-col p-6 sm:p-8">
                <span className="inline-block border border-[var(--c-accent)] px-2 py-0.5 mb-3 font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--c-accent)] w-fit">
                  {t('articles.newArticle') === 'articles.newArticle' ? 'New article' : t('articles.newArticle')}
                </span>
                <h2 className="font-crimson text-2xl sm:text-[32px] text-[var(--c-accent)] underline decoration-1 underline-offset-4 decoration-[rgb(var(--c-accent-rgb)_/_0.35)] group-hover:decoration-[var(--c-gold)] group-hover:text-[var(--c-gold)] transition-colors duration-300">
                  {article.title}
                </h2>
                {article.category && (
                  <p className="font-mono text-[10px] text-[rgb(var(--c-accent-rgb)_/_0.55)] uppercase tracking-widest mt-1 mb-4">
                    {article.category}
                  </p>
                )}
                <p className="font-serif text-base text-[rgb(var(--c-accent-rgb)_/_0.8)] leading-relaxed">
                  {article.excerpt}
                </p>
              </div>
            </motion.article>
          ) : (
            // Rest of the list — same card family, compact: landscape thumb, category + title + excerpt + read button
            <motion.article
              className="border border-[var(--c-accent)] group cursor-pointer grid grid-cols-1 sm:grid-cols-[45%_1fr] items-stretch overflow-hidden"
              onClick={() => onArticleClick(article)}
              tabIndex={0}
              role="button"
              aria-label={`Read article: ${article.title}`}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onArticleClick(article)}
              whileHover={{ x: 4 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="aspect-square overflow-hidden bg-[#E8DED5]">
                <motion.img
                  src={resolveMediaSource(article.imageUrl || article.imageSeed, 480, 480)}
                  alt={article.title}
                  className="w-full h-full object-cover"
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
                  {article.title}
                </h3>
                <p className="font-serif text-sm text-[rgb(var(--c-accent-rgb)_/_0.75)] leading-relaxed mb-4 line-clamp-3">
                  {article.excerpt}
                </p>
                <span className="mt-auto inline-flex items-center gap-2 self-start border border-[var(--c-accent)] rounded-full px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest text-[var(--c-accent)] group-hover:bg-[var(--c-accent)] group-hover:text-[var(--c-bg)] transition-colors">
                  read
                </span>
              </div>
            </motion.article>
          )}
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

function ReviewsSection({ reviews, t }: { reviews: Review[]; t: (key: string) => string }) {
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
              <p className="font-serif text-base leading-relaxed text-[rgb(var(--c-accent-rgb)_/_0.75)]">{featured.content}</p>
              <ProsCons pros={featured.pros} cons={featured.cons} t={t} />
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
                <p className="font-serif text-base leading-relaxed text-[rgb(var(--c-accent-rgb)_/_0.75)]">{review.content}</p>
                <ProsCons pros={review.pros} cons={review.cons} t={t} />
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

function parsePath(pathname: string, search = ''): { tab?: string; articleId?: number; passportCode?: string; searchQuery?: string } {
  const p = pathname.replace(/^\//, '').replace(/\/$/, '');
  if (!p) return {};
  if (p === 'search') {
    const query = new URLSearchParams(search).get('q')?.trim().slice(0, 120);
    return { tab: 'gallery', searchQuery: query || undefined };
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

function updateMetaTags(article: Article | null, activeTab: string, activeSearch: string) {
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
  const siteNode = {
    '@type': 'WebSite',
    name: 'EPRIS Journal',
    url: 'https://eprisjournal.com/',
    publisher: { '@type': 'Organization', name: 'EPRIS Journal', url: 'https://eprisjournal.com/', logo: 'https://eprisjournal.com/images/featured.png' },
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://eprisjournal.com/search?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };
  const routeLabel = ROUTE_META[activeTab]?.title?.replace(/\s+—\s+EPRIS Journal$/, '') || 'EPRIS Journal';

  if (article) {
    const imageUrl = resolveMediaSource(article.imageUrl || article.imageSeed, 1200, 630);
    const canonicalUrl = `https://eprisjournal.com/article/${getSlugForArticle(article)}`;
    const keywords = Array.from(new Set([...(article.tags || []), article.category, article.subcategory, 'EPRIS Journal', 'architecture', 'design', 'contemporary art'].filter(Boolean))).join(', ');
    document.title = `${article.title} — EPRIS Journal`;
    setMeta('og:title', article.title);
    setMeta('og:description', article.excerpt);
    setMeta('og:image', imageUrl);
    setMeta('og:type', 'article');
    setMeta('og:url', canonicalUrl);
    setMeta('og:site_name', 'EPRIS Journal');
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
  } else if (activeSearch) {
    const title = `Search: ${activeSearch} — EPRIS Journal`;
    const description = `Search results for “${activeSearch}” across EPRIS Journal.`;
    document.title = title;
    setMeta('og:title', title);
    setMeta('og:description', description);
    setMeta('og:image', 'https://eprisjournal.com/images/featured.png');
    setMeta('og:type', 'website');
    setMeta('og:url', window.location.href);
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
    setMeta('twitter:image', 'https://eprisjournal.com/images/featured.png');
    setMeta('description', description);
    setMeta('keywords', 'EPRIS Journal search, art search, design search, architecture search');
    setMeta('robots', 'noindex, follow');
    setCanonical('https://eprisjournal.com/search');
    clearJsonLd('runtime-seo');
  } else {
    const routeMeta = ROUTE_META[activeTab] || ROUTE_META.gallery;
    const canonicalUrl = activeTab === 'gallery' ? 'https://eprisjournal.com/' : `https://eprisjournal.com/${activeTab}`;
    document.title = routeMeta.title;
    setMeta('og:title', routeMeta.title);
    setMeta('og:description', routeMeta.description);
    setMeta('og:image', 'https://eprisjournal.com/images/featured.png');
    setMeta('og:type', 'website');
    setMeta('og:url', canonicalUrl);
    setMeta('og:site_name', 'EPRIS Journal');
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', routeMeta.title);
    setMeta('twitter:description', routeMeta.description);
    setMeta('twitter:image', 'https://eprisjournal.com/images/featured.png');
    setMeta('description', routeMeta.description);
    setMeta('keywords', 'EPRIS Journal, contemporary art, architecture, interior design, design journal, art interviews, design interviews, cultural journalism');
    setMeta('robots', 'index, follow, max-image-preview:large');
    setCanonical(canonicalUrl);
    setJsonLd('runtime-seo', {
      '@context': 'https://schema.org',
      '@graph': [
        siteNode,
        {
          '@type': activeTab === 'gallery' ? 'WebPage' : 'CollectionPage',
          name: routeMeta.title,
          description: routeMeta.description,
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
  if (/^\/(?:collaboation|collaboration)\/?$/.test(window.location.pathname)) {
    if (/^\/collaboation\/?$/.test(window.location.pathname)) {
      window.history.replaceState(null, '', '/collaboration');
    }
    return <Suspense fallback={<div className="min-h-screen bg-[#f5f0ea]" />}><CollaborationPage /></Suspense>;
  }
  const initialRoute = parsePath(window.location.pathname, window.location.search);
  const [activeTab, setActiveTab] = useState(initialRoute.tab || 'gallery');
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(initialRoute.articleId ?? null);
  const [passportCode, setPassportCode] = useState<string | undefined>(initialRoute.passportCode);
  const [currentLang, setCurrentLang] = useState(() => {
    try {
      const stored = localStorage.getItem('epris_language');
      return stored && getAvailableLanguages().includes(stored) ? stored : DEFAULT_LANGUAGE;
    } catch {
      return DEFAULT_LANGUAGE;
    }
  });
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);
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
  const languageOptions = getAvailableLanguages();
  useEffect(() => {
    try { localStorage.setItem('epris_language', currentLang); } catch { /* storage may be unavailable */ }
    const languageTags: Record<string, string> = { EN: 'en', RU: 'ru', UA: 'uk', TR: 'tr', DE: 'de', IT: 'it', ES: 'es' };
    document.documentElement.lang = languageTags[currentLang] || currentLang.toLowerCase();
  }, [currentLang]);
  const { items, articles, reviews } = getContentForLanguage(currentLang);
  const issueArchive = getIssueArchive(currentLang);
  const studio = getStudio();
  const defaultContent = getContentForLanguage(DEFAULT_LANGUAGE);
  const selectedArticle = selectedArticleId !== null
    ? articles.find((article) => article.id === selectedArticleId)
      || defaultContent.articles.find((article) => article.id === selectedArticleId)
      || null
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
  const fallbackTab = VISIBILITY_TABS.find((tab) => isSectionEnabled(tab)) || 'gallery';

  useEffect(() => {
    updateMetaTags(selectedArticle, activeTab, activeSearch);
  }, [selectedArticle, activeTab, activeSearch]);

  const handleImageClick = useCallback((src: string, alt: string) => {
    setLightboxImage({ src, alt });
  }, []);

  const navigate = useCallback((path: string) => {
    window.history.pushState(null, '', path);
  }, []);

  const handleSearch = useCallback((q: string) => {
    const normalizedQuery = q.trim().replace(/\s+/g, ' ').slice(0, 120);
    if (!normalizedQuery) return;
    setActiveSearch(normalizedQuery);
    setSelectedArticleId(null);
    setActiveTab('gallery');
    navigate(`/search?q=${encodeURIComponent(normalizedQuery)}`);
  }, [navigate]);

  const handleSetTab = useCallback((tab: string) => {
    const managedTab = VISIBILITY_TABS.includes(tab as VisibilitySectionKey) ? tab as VisibilitySectionKey : null;
    const target = managedTab && !isSectionEnabled(managedTab) ? fallbackTab : tab;
    setActiveTab(target);
    setSelectedArticleId(null);
    setActiveSearch('');
    setPassportCode(undefined);
    navigate(target === 'gallery' ? '/' : `/${target}`);
  }, [fallbackTab, navigate]);

  const handleSelectArticle = useCallback((id: number, article?: Article) => {
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
        currentLang={currentLang}
        setCurrentLang={setCurrentLang}
        t={t}
        languages={languageOptions}
        onSearch={handleSearch}
      />
      
      <RouteTransition routeKey={routeKey} direction={routeDirection}>
      <div className={activeTab === 'gallery' ? '' : 'lg:pr-12'}>
        {activeTab === 'gallery' && !activeSearch && (
          <GalleryMasthead t={t} />
        )}

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
          <main className="max-w-[1600px] mx-auto px-4 sm:px-8 md:px-16 py-8 sm:py-12 md:py-24">
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
                  <GallerySection items={items} onItemClick={setSelectedGalleryItem} />
                )}
                {activeTab === 'articles' && <ArticlesSection articles={articles} onArticleClick={(article) => handleSelectArticle(article.id, article)} t={t} />}
                {activeTab === 'reviews' && <ReviewsSection reviews={reviews} t={t} />}
                {activeTab === 'about' && <AboutSection t={t} currentLang={currentLang} onOpenManifest={() => handleSetTab('manifest')} />}
                {activeTab === 'manifest' && <ManifestPage t={t} currentLang={currentLang} />}
              </>
            )}
          </main>
        )}

        {activeTab !== 'issue' && activeTab !== 'design' && activeTab !== 'studio' && activeTab !== 'radio' && activeTab !== 'podcasts' && activeTab !== 'passport' && <footer className="border-t border-[var(--c-accent)] bg-[var(--c-accent)] text-[var(--c-bg)] py-8 sm:py-12 md:py-24 px-4 sm:px-8 md:px-16">
          <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center md:items-end gap-8 sm:gap-12 text-center md:text-left">
            <div>
              <h2 className="font-serif text-3xl sm:text-4xl md:text-6xl mb-6 sm:mb-8 text-[#c2542f]">EPRIS JOURNAL</h2>
              <div className="font-mono text-xs uppercase tracking-widest opacity-60 max-w-xs mx-auto md:mx-0 leading-relaxed">
                <p>{t('hero.subtitle2')}</p>
                <p>{t('hero.subtitle1')}</p>
              </div>
            </div>
            <div className="text-center md:text-right font-mono text-xs uppercase tracking-widest opacity-40">
              <p>© 2026 Epris Journal</p>
              <p>{t('footer.rights')}</p>
            </div>
          </div>
        </footer>}
      </div>
      </RouteTransition>
      
      <AnimatePresence initial={false}>
        {activeTab !== 'gallery' && <Sidebar key="section-sidebar" t={t} />}
      </AnimatePresence>

      <AnimatePresence>
        {selectedArticle && (
          <ArticleView article={selectedArticle} related={relatedArticles} onArticleClick={(a) => handleSelectArticle(a.id, a)} onTagClick={handleSearch} onClose={handleCloseArticle} onImageClick={handleImageClick} t={t} currentLang={currentLang} setCurrentLang={setCurrentLang} languages={languageOptions} />
        )}
      </AnimatePresence>

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
              <h1 className="font-serif text-3xl sm:text-4xl text-[var(--c-accent)] mb-4">Article not found</h1>
              <p className="font-serif text-[rgb(var(--c-accent-rgb)_/_0.7)] mb-8">This link may be broken, or the article has moved.</p>
              <button
                type="button"
                onClick={() => { window.history.replaceState(null, '', '/articles'); setActiveTab('articles'); }}
                className="font-mono text-xs uppercase tracking-widest border border-[var(--c-accent)] rounded-full px-6 py-3 hover:bg-[var(--c-accent)] hover:text-[var(--c-bg)] transition-colors"
              >
                Back to Articles
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
