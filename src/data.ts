import rawContent from './content/site-content.json';

export const DEFAULT_LANGUAGE = 'EN';

export interface Item {
  id: number;
  title: string;
  subtitle: string;
  fig: string;
  description: string;
  imageSeed: string;
  imageUrl?: string;
}

export interface ContentBlock {
  type: 'text' | 'header' | 'image' | 'quote' | 'map' | 'link' | 'video' | 'audio' | 'gallery' | 'checklist' | 'poll' | 'note';
  content: string | string[] | { question: string; options: { label: string; votes: number }[] } | { items: string[] };
  caption?: string;
  coordinates?: { lat: number; lng: number };
  url?: string;
  level?: number;
  stretched?: boolean;
}

export interface Article {
  id: number;
  title: string;
  author: string;
  role?: string;
  date: string;
  excerpt: string;
  category: string;
  subcategory?: string;
  tags: string[];
  imageSeed: string;
  imageUrl?: string;
  content: ContentBlock[];
}

export interface Review {
  id: number;
  title: string;
  subject: string;
  rating: number;
  content: string;
  author: string;
  category?: string;
  imageUrl?: string;
  verdict?: string;
  pros?: string[];
  cons?: string[];
  meta?: string;
  link?: string;
  date?: string;
  featured?: boolean;
}

export interface LibraryItem {
  id: number;
  title: string;
  type: string;
  size: string;
  year: string;
  url?: string;
}

export interface LocalizedContentCollection {
  items?: Item[];
  articles?: Article[];
  reviews?: Review[];
  libraryItems?: LibraryItem[];
}

export interface LanguageContent {
  items: Item[];
  articles: Article[];
  reviews: Review[];
  libraryItems: LibraryItem[];
}

export interface StudioCaseStep {
  title: string;
  detail: string;
}

export interface StudioProject {
  id: number;
  title: string;
  category: string;
  year: string;
  imageUrl: string;
  location?: string;
  description?: string;
  role?: string;
  gallery?: string[];
  featured?: boolean;
  beforeImage?: string;
  materials?: string[];
  caseSteps?: StudioCaseStep[];
}

export interface StudioOffering {
  title: string;
  summary: string;
  items: string[];
  kind?: 'service' | 'ergonomics';
}

export interface StudioStat {
  value: string;
  key: string;
}

export interface StudioPackage {
  name: string;
  price: string;
  desc: string;
  features: string[];
  highlight?: boolean;
}

export interface Studio {
  name: string;
  instagram: string;
  email?: string;
  heroImage: string;
  statement?: string;
  services: string[];
  offerings?: StudioOffering[];
  stats?: StudioStat[];
  packages?: StudioPackage[];
  availability?: string;
  projects: StudioProject[];
}

export interface Issue {
  id: number;
  name: string;
  season: string;
  tagline?: string;
  coverUrl: string;
  articleIds: number[];
  status: 'draft' | 'published' | 'archived';
  publishedAt?: string;
  number?: string;
  letterHeading?: string;
  letterBody?: string;
}

export interface SiteTheme {
  accent?: string;       // burgundy / primary text+accent (hex)
  gold?: string;         // gold accent (hex)
  bg?: string;           // page background (hex)
  fontDisplay?: string;  // heading font family name (Google Font)
  fontBody?: string;     // body font family name (Google Font)
}

export interface SiteContent {
  theme?: SiteTheme;
  translations: Record<string, Record<string, string>>;
  items: Item[];
  articles: Article[];
  reviews: Review[];
  libraryItems: LibraryItem[];
  localizedCollections?: Record<string, LocalizedContentCollection>;
  issue?: Issue;
  issues?: Issue[];
  studio?: Studio;
}

const content = rawContent as SiteContent;

// ── Live content layer (VPS is the source of truth) ──────────────────────────
// The admin saves content to the VPS API, and the public site fetches it live
// on startup via loadLiveContent(). The bundled `content` above is the offline
// fallback: if the VPS is unreachable, the site keeps rendering the last build.
export const CONTENT_API = 'https://api.eprisjournal.com/content';

let liveContent: SiteContent | null = null;
const contentListeners = new Set<() => void>();

/** Subscribe to live-content swaps; returns an unsubscribe fn. */
export function subscribeContent(cb: () => void): () => void {
  contentListeners.add(cb);
  return () => { contentListeners.delete(cb); };
}
function notifyContentChanged(): void {
  contentListeners.forEach((cb) => { try { cb(); } catch { /* ignore */ } });
}

export function applyLiveContent(json: SiteContent): void {
  liveContent = json;
  notifyContentChanged();
}

/**
 * Fetches the live content from the VPS and swaps it in. Resolves to true on
 * success, false on any failure (network, timeout, bad shape) — in which case
 * the bundled fallback stays active and the site is unaffected.
 */
export async function loadLiveContent(timeoutMs = 4000): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(CONTENT_API, { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(timer);
    if (!res.ok) return false;
    const json = await res.json();
    if (!json || typeof json !== 'object' || !json.translations || !Array.isArray(json.articles)) {
      return false;
    }
    applyLiveContent(json as SiteContent);
    return true;
  } catch {
    return false; // keep bundled fallback
  }
}

// ── Preview override ─────────────────────────────────────────────────────────
// The admin can preview an unsaved issue draft by writing its full content JSON
// to localStorage and opening /issue?preview=1. App.tsx reads it and calls
// setPreviewOverride before render; the issue/studio/content read-paths below
// then resolve against the override instead of the live/bundled content.
let previewContent: SiteContent | null = null;
let previewIssueId: number | null = null;
export function setPreviewOverride(json: SiteContent | null, issueId?: number | null): void {
  previewContent = json;
  previewIssueId = issueId ?? null;
}
function src(): SiteContent {
  return previewContent || liveContent || content;
}
function isPreview(): boolean {
  return previewContent !== null;
}

function mergeLocalizedArray<T extends { id: number }>(value: T[] | undefined, fallback: T[]): T[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  // Only override items that exist in root (fallback). Never add extra localized-only items.
  const localizedById = new Map(value.map((entry) => [Number(entry.id), entry]));
  return fallback.map((entry) => localizedById.get(Number(entry.id)) || entry);
}

export function getAvailableLanguages(): string[] {
  const allLangs = Object.keys(src().translations);
  if (!allLangs.includes(DEFAULT_LANGUAGE)) {
    allLangs.unshift(DEFAULT_LANGUAGE);
  }
  return allLangs;
}

export function getContentForLanguage(lang: string): LanguageContent {
  const c = src();
  const bucket = (c.localizedCollections || {})[lang] || {};

  return {
    items: mergeLocalizedArray(bucket.items, c.items),
    articles: mergeLocalizedArray(bucket.articles, c.articles),
    reviews: mergeLocalizedArray(bucket.reviews, c.reviews),
    libraryItems: mergeLocalizedArray(bucket.libraryItems, c.libraryItems)
  };
}

// Back-compat: the bundled translations map. Prefer getTranslations() for
// live-aware lookups (it resolves against the active content source).
export const translations = content.translations;

/** Live-aware translations map (preview → live → bundled). */
export function getTranslations(): Record<string, Record<string, string>> {
  return src().translations;
}

/** Site theme (colors/fonts) from content; empty object falls back to CSS defaults. */
export function getTheme(): SiteTheme {
  return src().theme || {};
}

const DEFAULT_ISSUE: Issue = {
  id: 1,
  name: 'Issue 15',
  season: 'Spring 2026',
  coverUrl: 'https://raw.githubusercontent.com/eprisj/eprisj.github.io/main/%D1%81over/main_cover.PNG',
  articleIds: content.articles.map((a) => a.id),
  status: 'published',
};

/**
 * Returns every issue (current schema: content.issues[]). Falls back to the
 * legacy single content.issue object (wrapped in an array) for older saves.
 */
export function getAllIssues(): Issue[] {
  const c = src();
  if (Array.isArray(c.issues) && c.issues.length > 0) {
    return c.issues;
  }
  if (c.issue) {
    return [{ ...c.issue, id: c.issue.id ?? 1 }];
  }
  return [DEFAULT_ISSUE];
}

/**
 * Returns the issue to show by default: the published one, or the most
 * recent one if none is marked published.
 */
export function getLiveIssue(): Issue {
  const issues = getAllIssues();
  if (isPreview() && previewIssueId != null) {
    const target = issues.find((i) => i.id === previewIssueId);
    if (target) return target;
  }
  return issues.find((i) => i.status === 'published') || issues[issues.length - 1] || DEFAULT_ISSUE;
}

/**
 * Resolves an issue's articleIds into localized Article objects, in order.
 * Falls back to every article if nothing resolves.
 */
export function resolveIssueArticles(issue: Issue, lang: string = DEFAULT_LANGUAGE): Article[] {
  const localizedArticles = getContentForLanguage(lang).articles;
  const byId = new Map(localizedArticles.map((a) => [Number(a.id), a]));

  const ordered = Array.isArray(issue.articleIds) ? issue.articleIds : [];
  let resolved = ordered
    .map((id) => byId.get(Number(id)))
    .filter((a): a is Article => Boolean(a));

  if (resolved.length === 0) {
    resolved = localizedArticles;
  }

  return resolved;
}

/**
 * Returns the published issue (or the most recent one) with its articles
 * resolved for the given language. id, if provided, selects a specific issue
 * from the archive instead.
 */
export function getIssue(lang: string = DEFAULT_LANGUAGE, id?: number): { issue: Issue; articles: Article[] } {
  const issues = getAllIssues();
  const issue = (id != null ? issues.find((i) => i.id === id) : null) || getLiveIssue();
  return { issue, articles: resolveIssueArticles(issue, lang) };
}

/**
 * Returns all issues (archive + live) with their articles resolved, ordered
 * with the live (published) issue first, then the rest by publishedAt desc.
 */
const DEFAULT_STUDIO: Studio = {
  name: 'Masha Peut Studio',
  instagram: 'https://www.instagram.com/mashapeut/',
  heroImage: '/images/mariia-ivanova.jpg',
  statement: '',
  services: [],
  stats: [],
  projects: [],
};

/**
 * Returns the design studio profile (bio/services/portfolio shown on /studio).
 */
export function getStudio(): Studio {
  return src().studio || DEFAULT_STUDIO;
}

export function getIssueArchive(lang: string = DEFAULT_LANGUAGE): { issue: Issue; articles: Article[] }[] {
  // In preview mode, keep drafts so an unpublished issue can be previewed.
  const issues = getAllIssues().filter((i) => isPreview() || i.status !== 'draft');
  const live = getLiveIssue();
  const rest = issues
    .filter((i) => i.id !== live.id)
    .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
  return [live, ...rest].map((issue) => ({ issue, articles: resolveIssueArticles(issue, lang) }));
}
