import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { ReactNode, useState, useEffect, useCallback, useMemo, FormEvent, useRef, Suspense, lazy, Component } from 'react';
// Heavy, rarely-visited tabs are code-split out of the critical bundle —
// e.g. DesignPage alone carries a 244-item catalogue that has no business
// loading for a reader who just opened an article. Each only downloads once
// its tab is actually clicked.
const MateriePage = lazy(() => import('./pages/MateriePage').then((m) => ({ default: m.MateriePage })));
const IssuePage = lazy(() => import('./pages/IssuePage').then((m) => ({ default: m.IssuePage })));
const StudioPage = lazy(() => import('./pages/StudioPage').then((m) => ({ default: m.StudioPage })));
const RadioPage = lazy(() => import('./pages/RadioPage').then((m) => ({ default: m.RadioPage })));
const PodcastsPage = lazy(() => import('./pages/PodcastsPage').then((m) => ({ default: m.PodcastsPage })));
const PassportPage = lazy(() => import('./pages/passport/PassportPage').then((m) => ({ default: m.PassportPage })));
const DesignPage = lazy(() => import('./design/DesignPage').then((m) => ({ default: m.DesignPage })));
import {
  Article,
  ContentBlock,
  DEFAULT_LANGUAGE,
  getAvailableLanguages,
  getContentForLanguage,
  getIssueArchive,
  getStudio,
  Item,
  LibraryItem,
  Review,
  setPreviewOverride,
  getTranslations,
  getTheme,
  loadLiveContent,
  subscribeContent
} from './data';
import type { SiteTheme } from './data';
import { Search, Folder, Bookmark, Star, ArrowUpRight, Download, FileText, BookOpen, Menu, X, Globe, MapPin, ExternalLink, ArrowLeft, Quote, Play, Music, Image as ImageIcon, CheckSquare, Square, BarChart, Lightbulb, Share2, Link2, Check } from 'lucide-react';

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
const RICH_ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'MARK', 'CODE', 'BR', 'A', 'SPAN']);
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
      transition={{ duration: 0.7, delay: Math.min(delay, 0.35), ease: [0.22, 1, 0.36, 1] }}
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

// Shown briefly while a code-split tab (materie/issue/design/studio/radio/
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
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};
const staggerItem = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

function NavBar({
  activeTab,
  setActiveTab,
  currentLang,
  setCurrentLang,
  t,
  languages,
  libraryCount,
  onSearch,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentLang: string;
  setCurrentLang: (lang: string) => void;
  t: (key: string) => string;
  languages: string[];
  libraryCount: number;
  onSearch: (q: string) => void;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const tabs = [
    { id: 'gallery', label: t('nav.gallery') },
    { id: 'articles', label: t('nav.articles') },
    { id: 'reviews', label: t('nav.reviews') },
    { id: 'library', label: t('nav.library') },
    { id: 'about', label: t('nav.about') },
    { id: 'materie', label: t('nav.materie') },
    { id: 'issue', label: t('nav.issue') },
    { id: 'design', label: 'Design' },
    { id: 'studio', label: t('nav.studio') },
    { id: 'radio', label: t('nav.radio') },
    { id: 'podcasts', label: t('nav.podcasts') },
  ];

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
      {/* ── Mobile header: hamburger · EPRIS · ISSUE ── */}
      <nav className="lg:hidden fixed top-0 left-0 w-full z-50 bg-[var(--c-bg)] border-b border-[rgb(var(--c-accent-rgb)_/_0.25)] h-16 grid grid-cols-[1fr_auto_1fr] items-center px-4">
        <button
          type="button"
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="justify-self-start text-[var(--c-accent)] p-1"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('gallery'); setIsMenuOpen(false); }}
          aria-label="EPRIS — home"
          className="justify-self-center leading-none font-mono"
        >
          <span className="text-xl tracking-[0.22em] text-[var(--c-accent)] pl-[0.22em]">EPRIS</span>
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('issue'); setIsMenuOpen(false); }}
          className="justify-self-end bg-[var(--c-accent)] text-[var(--c-bg)] rounded-full px-5 py-2.5 font-mono text-[11px] tracking-[0.18em] uppercase hover:bg-[#3d1421] transition-colors"
        >
          {t('nav.issue')}
        </button>
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
          <div className="grid flex-1 grid-cols-11 divide-x divide-[var(--c-accent)]">
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
            {isLangOpen && (
              <div className="absolute top-full right-0 w-16 bg-[var(--c-bg)] border-x border-b border-[var(--c-accent)] z-50">
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
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('library')}
            aria-label={`${t('files')} (${libraryCount})`}
            title={`${t('files')} (${libraryCount})`}
            className={`w-16 flex items-center justify-center transition-colors ${
              activeTab === 'library' ? 'bg-[var(--c-accent)] text-[var(--c-bg)]' : 'hover:bg-[var(--c-accent)] hover:text-[var(--c-bg)]'
            }`}
          >
            <Bookmark size={16} />
          </button>
        </div>
      </nav>

      {/* Search Overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-[rgb(var(--c-bg-rgb)_/_0.95)] backdrop-blur-sm flex items-center justify-center p-4"
          >
            <button
              type="button"
              onClick={() => setIsSearchOpen(false)}
              aria-label="Close search"
              className="absolute top-8 right-8 p-2 hover:bg-[var(--c-accent)] hover:text-[var(--c-bg)] rounded-full transition-colors border border-[var(--c-accent)]"
            >
              <X size={24} />
            </button>
            <form onSubmit={handleSearch} className="w-full max-w-3xl">
              <input 
                type="text" 
                placeholder={t('search.placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-b-2 border-[var(--c-accent)] text-3xl md:text-5xl font-serif text-[var(--c-accent)] placeholder-[rgb(var(--c-accent-rgb)_/_0.2)] focus:outline-none py-4 text-center"
                autoFocus
              />
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-0 w-full h-[calc(100vh-4rem)] bg-[var(--c-bg)] z-40 flex flex-col lg:hidden overflow-y-auto"
          >
            <div className="flex flex-col divide-y divide-[var(--c-accent)] border-b border-[var(--c-accent)]">
              {tabs.map((tab) => (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsMenuOpen(false);
                  }}
                  className={`p-6 flex items-center justify-between text-left ${
                    activeTab === tab.id ? 'bg-[var(--c-accent)] text-[var(--c-bg)]' : ''
                  }`}
                >
                  <span className="font-bold text-lg">{tab.label}</span>
                </button>
              ))}
            </div>
            
            <div className="mt-auto border-t border-[var(--c-accent)]">
              <div className="grid grid-cols-3 sm:grid-cols-4 divide-x divide-[var(--c-accent)] border-b border-[var(--c-accent)]">
                {languages.map(lang => (
                  <button
                    type="button"
                    key={lang}
                    onClick={() => setCurrentLang(lang)}
                    className={`p-4 text-center hover:bg-[var(--c-accent)] hover:text-[var(--c-bg)] ${currentLang === lang ? 'bg-[var(--c-accent)] text-[var(--c-bg)]' : ''}`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
              <div className="p-4 flex justify-center gap-8">
                <button type="button" aria-label="Open search" onClick={() => { setIsMenuOpen(false); setIsSearchOpen(true); }}>
                  <Search size={24} />
                </button>
                <button type="button" aria-label="Open library" onClick={() => { setIsMenuOpen(false); setActiveTab('library'); }}>
                  <Folder size={24} />
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
      <div className="px-5 sm:px-10 md:px-16 pt-14 pb-10 sm:pt-20 sm:pb-14 flex items-end justify-between gap-4 sm:gap-8 text-[var(--c-accent)]">
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
      {/* Plain (photo-less) masthead — EPRIS journal lockup on the page background */}
      <SectionMasthead t={t} variant="plain" />

      {/* Full-bleed dotted rule */}
      <div className="border-b border-dotted border-[rgb(var(--c-accent-rgb)_/_0.4)]" />

      {/* "explore our latest article" kicker */}
      <div className="flex items-center justify-center gap-4 sm:gap-6 py-8 sm:py-10 px-5">
        <span className="h-px w-10 sm:w-16 bg-[rgb(var(--c-accent-rgb)_/_0.3)]" />
        <span className="font-crimson italic text-sm sm:text-base tracking-wide text-[rgb(var(--c-accent-rgb)_/_0.75)]">
          explore our latest article
        </span>
        <span className="h-px w-10 sm:w-16 bg-[rgb(var(--c-accent-rgb)_/_0.3)]" />
      </div>
    </div>
  );
}

function AboutSection({ t }: { t: (key: string) => string }) {
  return (
    <div className="max-w-4xl mx-auto">
      <Reveal>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-24">
          <div className="aspect-[3/4] bg-[#E8DED5] relative overflow-hidden">
             <img
               src="https://raw.githubusercontent.com/eprisj/eprisj.github.io/refs/heads/main/%D1%81over/mashapeut_1768216703_3808400198850843332_4043713819.jpg"
               alt="Mariia Ivanova"
               className="w-full h-full object-cover object-[50%_18%] grayscale"
             />
          </div>
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.6)] mb-4">
              {t('editor')}
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-6xl text-[var(--c-accent)] mb-6 sm:mb-8">
              Mariia Ivanova
            </h2>
            <div className="prose prose-lg prose-stone font-serif text-[rgb(var(--c-accent-rgb)_/_0.8)]">
              <p className="mb-6">
                {t('about.quote1')}
              </p>
              <p>
                {t('about.bio')}
              </p>
            </div>
            <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-[rgb(var(--c-accent-rgb)_/_0.2)]">
              <div className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.4)] mb-1">{t('about.social')}</div>
              <div className="flex gap-4 font-serif text-lg text-[var(--c-accent)]">
                <a href="https://www.instagram.com/mashapeut/" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--c-gold)] transition-colors">Instagram</a>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.2}>
        <div className="border-t border-[var(--c-accent)] pt-24">
          <h3 className="font-serif text-3xl md:text-4xl text-[var(--c-accent)] mb-12 text-center">{t('about.manifesto')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div>
              <div className="w-12 h-12 rounded-full border border-[var(--c-accent)] flex items-center justify-center mx-auto mb-6 text-[var(--c-accent)]">01</div>
                            <h4 className="font-mono text-xs uppercase tracking-widest mb-4">{t('about.slowdown')}</h4>
                            <p className="font-serif text-[rgb(var(--c-accent-rgb)_/_0.8)]">{t('about.slowdown.desc')}</p>
            </div>
            <div>
              <div className="w-12 h-12 rounded-full border border-[var(--c-accent)] flex items-center justify-center mx-auto mb-6 text-[var(--c-accent)]">02</div>
                            <h4 className="font-mono text-xs uppercase tracking-widest mb-4">{t('about.curate')}</h4>
                            <p className="font-serif text-[rgb(var(--c-accent-rgb)_/_0.8)]">{t('about.curate.desc')}</p>
            </div>
            <div>
              <div className="w-12 h-12 rounded-full border border-[var(--c-accent)] flex items-center justify-center mx-auto mb-6 text-[var(--c-accent)]">03</div>
                            <h4 className="font-mono text-xs uppercase tracking-widest mb-4">{t('about.preserve')}</h4>
                            <p className="font-serif text-[rgb(var(--c-accent-rgb)_/_0.8)]">{t('about.preserve.desc')}</p>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

function GallerySection({ items, onItemClick, articles, onReadArticle }: { items: Item[]; onItemClick: (item: Item) => void; articles: Article[]; onReadArticle: (article: Article) => void }) {
  if (items.length === 0) return null;
  const [featured, ...rest] = items;
  const featuredArticle = findMatchingArticle(featured, articles);

  return (
    <div>
      {/* Featured article — offset corner-bracket frame, no card border */}
      <Reveal>
        <div className="relative p-4 sm:p-5 mb-20 sm:mb-28">
          <span className="absolute top-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-t border-l border-[var(--c-accent)]" />
          <span className="absolute top-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-t border-r border-[var(--c-accent)]" />
          <span className="absolute bottom-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-b border-l border-[var(--c-accent)]" />
          <span className="absolute bottom-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-b border-r border-[var(--c-accent)]" />
          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10 group cursor-pointer"
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
            <div className="flex flex-col justify-center py-2">
              <h2 className="font-crimson text-2xl sm:text-3xl text-[var(--c-accent)] underline decoration-1 underline-offset-4 decoration-[rgb(var(--c-accent-rgb)_/_0.35)] group-hover:decoration-[var(--c-gold)] group-hover:text-[var(--c-gold)] transition-colors duration-300 mb-2">
                {featured.title}
              </h2>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.6)] mb-5">
                {featured.subtitle}
              </p>
              <p className="font-serif text-sm sm:text-base text-[rgb(var(--c-accent-rgb)_/_0.75)] leading-relaxed mb-6">
                {featured.description}
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                <span className="inline-flex items-center self-start border border-[var(--c-accent)] rounded-full px-5 py-1.5 font-mono text-[10px] uppercase tracking-widest text-[var(--c-accent)] group-hover:bg-[var(--c-accent)] group-hover:text-[var(--c-bg)] transition-colors w-fit">
                  read
                </span>
                {featuredArticle && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onReadArticle(featuredArticle); }}
                    className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.6)] hover:text-[var(--c-gold)] underline underline-offset-4 transition-colors"
                  >
                    Full article →
                  </button>
                )}
              </div>
            </div>
          </div>
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
          const matchedArticle = findMatchingArticle(item, articles);
          return (
          <motion.div
            key={item.id}
            variants={staggerItem}
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
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center border border-[var(--c-accent)] rounded-full px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest text-[var(--c-accent)] group-hover:bg-[var(--c-accent)] group-hover:text-[var(--c-bg)] transition-colors">
                    read
                  </span>
                  {matchedArticle && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onReadArticle(matchedArticle); }}
                      className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.6)] hover:text-[var(--c-gold)] underline underline-offset-4 transition-colors"
                    >
                      full article →
                    </button>
                  )}
                </div>
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

const POLL_COUNTER_NAMESPACE = 'eprisj-github-io';
const POLL_COUNTER_BASE_URL = 'https://api.counterapi.dev/v1';

function getPollCounterName(pollKey: string, optionIndex: number) {
  return `${pollKey}-option-${optionIndex}`
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

async function readPollCounter(pollKey: string, optionIndex: number): Promise<number> {
  const name = getPollCounterName(pollKey, optionIndex);
  const response = await fetch(`${POLL_COUNTER_BASE_URL}/${POLL_COUNTER_NAMESPACE}/${encodeURIComponent(name)}/`, {
    cache: 'no-store'
  });

  if (response.status === 400 || response.status === 404) {
    return 0;
  }

  if (!response.ok) {
    throw new Error(`Poll counter read failed: ${response.status}`);
  }

  const payload = await response.json();
  return Number(payload.count) || 0;
}

async function incrementPollCounter(pollKey: string, optionIndex: number): Promise<number> {
  const name = getPollCounterName(pollKey, optionIndex);
  const response = await fetch(`${POLL_COUNTER_BASE_URL}/${POLL_COUNTER_NAMESPACE}/${encodeURIComponent(name)}/up`, {
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Poll counter write failed: ${response.status}`);
  }

  const payload = await response.json();
  return Number(payload.count) || 0;
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

    Promise.all(options.map((_, index) => readPollCounter(pollKey, index)))
      .then((counts) => {
        if (!cancelled) {
          setOnlineVotes(counts);
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
  }, [pollKey, options]);

  const handleVote = async (index: number) => {
    if (votedIndex !== null || isVoting) return;
    setIsVoting(true);
    setVoteError('');

    const previousOnlineVotes = onlineVotes;
    setVotedIndex(index);
    setOnlineVotes((votes) => votes.map((count, i) => i === index ? count + 1 : count));

    try {
      const count = await incrementPollCounter(pollKey, index);
      const nextOnlineVotes = previousOnlineVotes.map((value, i) => i === index ? count : value);
      setOnlineVotes(nextOnlineVotes);
      localStorage.setItem(storageKey, JSON.stringify({
        question,
        pollKey,
        votedIndex: index,
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

const LANG_LABELS: Record<string, string> = {
  EN: 'English',
  RU: 'Русский',
  UA: 'Українська',
  TR: 'Türkçe',
  DE: 'Deutsch',
  IT: 'Italiano',
  ES: 'Español'
};

function ArticleView({ article, related, onArticleClick, onTagClick, onClose, onImageClick, t, currentLang, setCurrentLang, languages }: { article: Article; related: Article[]; onArticleClick: (article: Article) => void; onTagClick: (tag: string) => void; onClose: () => void; onImageClick: (src: string, alt: string) => void; t: (key: string) => string; currentLang: string; setCurrentLang: (lang: string) => void; languages: string[] }) {
  const [isArticleLangOpen, setIsArticleLangOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
              className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[var(--c-accent)] bg-[rgb(var(--c-bg-rgb)_/_0.8)] backdrop-blur-sm px-3 py-2 sm:px-4 rounded-full border border-[rgb(var(--c-accent-rgb)_/_0.1)] hover:opacity-60 transition-opacity"
            >
              <Globe size={14} />
              {currentLang}
            </button>
            {isArticleLangOpen && (
              <div className="absolute top-full right-0 mt-1 bg-[var(--c-bg)] border border-[rgb(var(--c-accent-rgb)_/_0.2)] rounded-lg shadow-lg overflow-hidden min-w-[140px] z-50">
                {languages.map(lang => (
                  <button
                    type="button"
                    key={lang}
                    onClick={() => { setCurrentLang(lang); setIsArticleLangOpen(false); }}
                    className={`w-full px-4 py-2 text-left font-mono text-xs tracking-wider hover:bg-[var(--c-accent)] hover:text-[var(--c-bg)] transition-colors flex items-center justify-between gap-3 ${currentLang === lang ? 'bg-[var(--c-accent)] text-[var(--c-bg)]' : 'text-[var(--c-accent)]'}`}
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

                            const altText = (Array.isArray(block.alts) && block.alts[i]?.trim()) || `Gallery image ${i + 1}`;
                            return (
                              <div key={i} className="aspect-square bg-[#E8DED5] overflow-hidden cursor-pointer" onClick={() => onImageClick(gallerySource, altText)}>
                                <img
                                  src={gallerySource}
                                  alt={altText}
                                  className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
                                  referrerPolicy="no-referrer"
                                />
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
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[var(--c-accent)] flex items-center justify-center text-[var(--c-bg)] font-serif text-lg sm:text-xl shrink-0">
                {article.author.charAt(0)}
              </div>
              <div>
                <p className="font-serif text-xl mb-1">{article.author}</p>
                <p className="font-mono text-xs uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.6)] mb-3">{article.role}</p>
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

function RatingStars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-1">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={size}
          className={i < Math.round(rating) ? 'fill-[var(--c-accent)] text-[var(--c-accent)]' : 'text-[rgb(var(--c-accent-rgb)_/_0.2)]'}
        />
      ))}
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
              <div className="flex items-center justify-between mb-5">
                <RatingStars rating={featured.rating} />
                {featured.category && (
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--c-gold)]">{featured.category}</span>
                )}
              </div>
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
                <div className="flex justify-between items-start mb-4">
                  <RatingStars rating={review.rating} />
                  {!review.imageUrl && review.category && (
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--c-gold)]">{review.category}</span>
                  )}
                </div>
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

function LibrarySection({ libraryItems, t }: { libraryItems: LibraryItem[]; t: (key: string) => string }) {
  return (
    <div className="border border-[var(--c-accent)]">
      <div className="grid grid-cols-12 border-b border-[var(--c-accent)] bg-[var(--c-accent)] text-[var(--c-bg)] p-3 sm:p-4 font-mono text-[10px] sm:text-xs uppercase tracking-widest">
        <div className="col-span-9 sm:col-span-8 md:col-span-5">{t('library.title')}</div>
        <div className="col-span-2 hidden md:block">{t('library.type')}</div>
        <div className="col-span-2 hidden md:block">{t('library.size')}</div>
        <div className="col-span-2 hidden md:block">{t('library.year')}</div>
        <div className="col-span-3 sm:col-span-4 md:col-span-1 text-right">{t('library.action')}</div>
      </div>
      {libraryItems.map((item, index) => (
        <div key={item.id}>
          <Reveal delay={index * 0.05}>
            <div className="grid grid-cols-12 p-3 sm:p-4 border-b border-[rgb(var(--c-accent-rgb)_/_0.2)] items-center hover:bg-[#E8DED5] transition-colors group font-mono text-xs sm:text-sm text-[var(--c-accent)]">
              <div className="col-span-9 sm:col-span-8 md:col-span-5 font-medium flex items-center gap-2 sm:gap-3 min-w-0">
                <BookOpen size={16} className="text-[rgb(var(--c-accent-rgb)_/_0.4)] group-hover:text-[var(--c-accent)] shrink-0 hidden sm:block" />
                <span className="truncate">{item.title}</span>
              </div>
              <div className="col-span-2 hidden md:block opacity-60">{item.type}</div>
              <div className="col-span-2 hidden md:block opacity-60">{item.size}</div>
              <div className="col-span-2 hidden md:block opacity-60">{item.year}</div>
              <div className="col-span-3 sm:col-span-4 md:col-span-1 text-right">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open ${item.title}`}
                  className={`inline-flex items-center justify-center w-8 h-8 border border-[var(--c-accent)] rounded-full transition-colors ${
                    item.url
                      ? 'hover:bg-[var(--c-accent)] hover:text-[var(--c-bg)]'
                      : 'pointer-events-none opacity-40'
                  }`}
                >
                  <Download size={14} />
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      ))}
    </div>
  );
}

function Sidebar({ t }: { t: (key: string) => string }) {
  const labels = [t('sidebar.lifestyle'), t('sidebar.travel'), t('sidebar.taste'), t('sidebar.design'), t('sidebar.culture'), t('sidebar.lifestyle'), t('sidebar.travel')];
  return (
    <aside className="hidden lg:flex w-12 border-l border-[var(--c-accent)] flex-col justify-between items-center py-8 fixed right-0 top-0 h-full bg-[var(--c-bg)] z-40 pt-24">
      <div className="h-full w-full relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-max h-full pt-4">
          <p className="writing-vertical-rl text-[10px] font-mono uppercase tracking-[0.3em] text-[rgb(var(--c-accent-rgb)_/_0.4)] flex gap-8 whitespace-nowrap">
            {labels.map((label, i) => (
              <span key={i}>{i > 0 && <span className="text-[var(--c-gold)] mr-8">•</span>}{label}</span>
            ))}
          </p>
        </div>
      </div>
    </aside>
  );
}

function SearchResults({
  query,
  articles,
  onClear,
  onArticleClick,
  t,
}: {
  query: string;
  articles: Article[];
  onClear: () => void;
  onArticleClick: (article: Article) => void;
  t: (key: string) => string;
}) {
  const q = query.toLowerCase();
  const results = articles.filter(a =>
    a.title.toLowerCase().includes(q) ||
    (a.excerpt || '').toLowerCase().includes(q) ||
    (a.category || '').toLowerCase().includes(q) ||
    (a.author || '').toLowerCase().includes(q) ||
    (a.tags || []).some(tag => tag.toLowerCase().includes(q)) ||
    (a.content || []).some(b => typeof b.content === 'string' && b.content.toLowerCase().includes(q))
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-[rgb(var(--c-accent-rgb)_/_0.2)]">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.4)] mb-1">Search results</p>
          <h2 className="font-serif text-2xl text-[var(--c-accent)]">
            "{query}" — <span className="text-[var(--c-gold)]">{results.length}</span>
          </h2>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.6)] hover:text-[var(--c-accent)] transition-colors border border-[rgb(var(--c-accent-rgb)_/_0.2)] px-4 py-2 rounded-full"
        >
          <X size={12} /> Clear
        </button>
      </div>
      {results.length === 0 ? (
        <div className="text-center py-24">
          <p className="font-mono text-xs uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.3)]">Nothing found</p>
        </div>
      ) : (
        <ArticlesSection articles={results} onArticleClick={onArticleClick} t={t} />
      )}
    </div>
  );
}

const VALID_TABS = ['gallery', 'articles', 'reviews', 'library', 'about', 'materie', 'issue', 'studio', 'radio', 'podcasts', 'design', 'passport'];

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
  return articles.find((a) => a.title?.trim() === title);
}

function parsePath(pathname: string): { tab?: string; articleId?: number; passportCode?: string } {
  const p = pathname.replace(/^\//, '').replace(/\/$/, '');
  if (!p) return {};
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

function updateMetaTags(article: Article | null) {
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

  if (article) {
    const imageUrl = resolveMediaSource(article.imageUrl || article.imageSeed, 1200, 630);
    document.title = `${article.title} — EPRIS Journal`;
    setMeta('og:title', article.title);
    setMeta('og:description', article.excerpt);
    setMeta('og:image', imageUrl);
    setMeta('og:type', 'article');
    setMeta('og:url', window.location.href);
    setMeta('og:site_name', 'EPRIS Journal');
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', article.title);
    setMeta('twitter:description', article.excerpt);
    setMeta('twitter:image', imageUrl);
    setMeta('description', article.excerpt);
  } else {
    document.title = 'EPRIS Journal';
    setMeta('og:title', 'EPRIS Journal');
    setMeta('og:description', 'Your personal archive. The taste of life.');
    setMeta('og:image', 'https://eprisj.github.io/images/featured.png');
    setMeta('og:type', 'website');
    setMeta('og:url', window.location.href);
    setMeta('og:site_name', 'EPRIS Journal');
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', 'EPRIS Journal');
    setMeta('twitter:description', 'Your personal archive. The taste of life.');
    setMeta('twitter:image', 'https://eprisj.github.io/images/featured.png');
    setMeta('description', 'Your personal archive. The taste of life.');
  }
}

export default function App() {
  const initialRoute = parsePath(window.location.pathname);
  const [activeTab, setActiveTab] = useState(initialRoute.tab || 'gallery');
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(initialRoute.articleId ?? null);
  const [passportCode, setPassportCode] = useState<string | undefined>(initialRoute.passportCode);
  const [currentLang, setCurrentLang] = useState(DEFAULT_LANGUAGE);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);
  const [selectedGalleryItem, setSelectedGalleryItem] = useState<Item | null>(null);
  const [activeSearch, setActiveSearch] = useState('');
  // Live content: fetch the latest from the VPS on mount and re-render when it
  // swaps in. Until then (or if the VPS is unreachable) the bundled JSON renders.
  const [, setContentVersion] = useState(0);
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
  const { items, articles, reviews, libraryItems } = getContentForLanguage(currentLang);
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

  useEffect(() => {
    updateMetaTags(selectedArticle);
  }, [selectedArticle]);

  const handleImageClick = useCallback((src: string, alt: string) => {
    setLightboxImage({ src, alt });
  }, []);

  const navigate = useCallback((path: string) => {
    window.history.pushState(null, '', path);
  }, []);

  const handleSearch = useCallback((q: string) => {
    setActiveSearch(q);
    setSelectedArticleId(null);
    navigate('/search');
  }, [navigate]);

  const handleSetTab = useCallback((tab: string) => {
    setActiveTab(tab);
    setSelectedArticleId(null);
    setActiveSearch('');
    setPassportCode(undefined);
    navigate(tab === 'gallery' ? '/' : `/${tab}`);
  }, [navigate]);

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
      const parsed = parsePath(window.location.pathname);
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

  return (
    <div className="min-h-screen bg-[var(--c-bg)] text-[var(--c-accent)] selection:bg-[var(--c-gold)] selection:text-white">
      <NavBar
        activeTab={activeTab}
        setActiveTab={handleSetTab}
        currentLang={currentLang}
        setCurrentLang={setCurrentLang}
        t={t}
        languages={languageOptions}
        libraryCount={libraryItems.length}
        onSearch={handleSearch}
      />
      
      <div className={activeTab === 'gallery' ? '' : 'lg:pr-12'}>
        {activeTab === 'gallery' && !activeSearch && (
          <GalleryMasthead t={t} />
        )}

        {activeTab === 'materie' ? (
          <LazyTab>
            <div className="pt-16">
              <MateriePage t={t} />
            </div>
          </LazyTab>
        ) : activeTab === 'issue' ? (
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
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSearch ? `search-${activeSearch}` : activeTab}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                {activeSearch ? (
                  <SearchResults
                    query={activeSearch}
                    articles={articles}
                    onClear={() => { setActiveSearch(''); navigate(activeTab === 'gallery' ? '/' : `/${activeTab}`); }}
                    onArticleClick={(article) => handleSelectArticle(article.id, article)}
                    t={t}
                  />
                ) : (
                  <>
                    {activeTab === 'gallery' && (
                      <GallerySection items={items} onItemClick={setSelectedGalleryItem} articles={articles} onReadArticle={(a) => handleSelectArticle(a.id, a)} />
                    )}
                    {activeTab === 'articles' && <ArticlesSection articles={articles} onArticleClick={(article) => handleSelectArticle(article.id, article)} t={t} />}
                    {activeTab === 'reviews' && <ReviewsSection reviews={reviews} t={t} />}
                    {activeTab === 'library' && <LibrarySection libraryItems={libraryItems} t={t} />}
                    {activeTab === 'about' && <AboutSection t={t} />}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        )}

        {activeTab !== 'materie' && activeTab !== 'issue' && activeTab !== 'design' && activeTab !== 'studio' && activeTab !== 'radio' && activeTab !== 'podcasts' && activeTab !== 'passport' && <footer className="border-t border-[var(--c-accent)] bg-[var(--c-accent)] text-[var(--c-bg)] py-8 sm:py-12 md:py-24 px-4 sm:px-8 md:px-16">
          <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-12">
            <div>
              <h2 className="font-serif text-3xl sm:text-4xl md:text-6xl mb-6 sm:mb-8 text-[#c2542f]">EPRIS JOURNAL</h2>
              <div className="font-mono text-xs uppercase tracking-widest opacity-60 max-w-xs leading-relaxed">
                <p>{t('hero.subtitle2')}</p>
                <p>{t('hero.subtitle1')}</p>
              </div>
            </div>
            <div className="text-left md:text-right font-mono text-xs uppercase tracking-widest opacity-40">
              <p>© 2026 Epris Journal</p>
              <p>{t('footer.rights')}</p>
              <a href="/admin/index.html" className="inline-block mt-4 opacity-60 hover:opacity-100 transition-opacity border-b border-[rgb(var(--c-bg-rgb)_/_0.3)]">Admin</a>
            </div>
          </div>
        </footer>}
      </div>
      
      {activeTab !== 'gallery' && <Sidebar t={t} />}

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
  );
}
