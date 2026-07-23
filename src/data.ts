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
  /** Extra photos shown in the "read" detail view, each with its own caption. Falls back to just imageUrl/imageSeed when absent. */
  images?: { url: string; caption?: string }[];
  /** Hidden from the public site until unset. */
  draft?: boolean;
  /** ISO datetime; hidden from the public site until this moment passes. */
  publishAt?: string;
  /** Server-stamped on every /content/entity save — see mergeLocalizedArray. */
  updatedAt?: string;
}

export interface ContentBlock {
  type: 'text' | 'header' | 'image' | 'quote' | 'map' | 'link' | 'video' | 'audio' | 'gallery' | 'checklist' | 'poll' | 'note' | 'mosaic';
  content: string | string[] | { question: string; options: { label: string; votes: number }[] } | { items: string[] };
  caption?: string;
  coordinates?: { lat: number; lng: number };
  url?: string;
  level?: number;
  stretched?: boolean;
  align?: 'left' | 'center' | 'right' | 'full';
  width?: number;
  alts?: string[]; // per-photo alt text for gallery blocks, index-aligned with content
}

export interface Author {
  id: string;
  name: string;
  role?: string;
  bio?: string;
  photoUrl?: string;
  website?: string;
  instagram?: string;
  active?: boolean;
}

export interface Article {
  id: number;
  title: string;
  author: string;
  role?: string;
  /** Optional link to an entry in SiteContent.authors; falls back to the `author`/`role` strings when absent. */
  authorId?: string;
  date: string;
  excerpt: string;
  category: string;
  subcategory?: string;
  tags: string[];
  imageSeed: string;
  imageUrl?: string;
  content: ContentBlock[];
  /** Hidden from the public site until unset. */
  draft?: boolean;
  /** ISO datetime; hidden from the public site until this moment passes. */
  publishAt?: string;
  /** Server-stamped on every /content/entity save — see mergeLocalizedArray. */
  updatedAt?: string;
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
  /** Hidden from the public site until unset. */
  draft?: boolean;
  /** ISO datetime; hidden from the public site until this moment passes. */
  publishAt?: string;
  /** Server-stamped on every /content/entity save — see mergeLocalizedArray. */
  updatedAt?: string;
}

export interface LibraryItem {
  id: number;
  title: string;
  type: string;
  size: string;
  year: string;
  url?: string;
  /** Hidden from the public site until unset. */
  draft?: boolean;
  /** ISO datetime; hidden from the public site until this moment passes. */
  publishAt?: string;
  /** Server-stamped on every /content/entity save — see mergeLocalizedArray. */
  updatedAt?: string;
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
  letterSignature?: string;
}

export interface SiteTheme {
  accent?: string;       // burgundy / primary text+accent (hex)
  gold?: string;         // gold accent (hex)
  bg?: string;           // page background (hex)
  bgImage?: string;      // optional page background image URL (overlays bg color)
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
  authors?: Author[];
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

// Admin "add new" seeds every collection with a blueprint stub whose fields are
// obvious placeholders ("New editorial story", "…— replace me"). If the author
// never fills it in, that stub used to leak onto the public site — and once an
// AI translate pass ran over it, translated placeholders ("замініть мене") got
// stored per-locale and overrode the real base content for that language even
// after the base entry was rewritten into a real piece. Both are the same bug:
// unedited blueprint text being treated as real content.
//
// Detection is anchored on the FULL, distinctive seed strings (exact blueprint
// titles + whole "replace me"/"before publishing" phrases and their translated
// forms) — never on short fragments, because fragments like "замін" also occur
// inside real words ("незамінне"/"irreplaceable") and would wrongly hide real
// translations. Any real edit changes the title or copy and clears the flag.
const PLACEHOLDER_TITLES = new Set([
  'new editorial story', 'new practical guide', 'new photo essay',
  'new review', 'new gallery item', 'new file',
]);
const PLACEHOLDER_PHRASES = [
  // EN seeds (admin blueprints)
  'one-line context — replace me', 'replace me',
  'replace with real copy before publishing',
  'a focused opening paragraph for a new editorial story',
  // UA translated stubs seen in live data
  'замініть мене', 'замініть на справжню копію',
  // RU translated stubs seen in live data
  'замените меня', 'замените реальной копией',
];

/**
 * True when an entity is still an unedited blueprint stub (its title is a known
 * seed title, or its subtitle/description/excerpt still carries a placeholder
 * phrase). Used to hide such stubs from the public site and to ignore
 * placeholder localized overrides so they fall back to the real base content.
 */
export function isPlaceholderEntity(entry: unknown): boolean {
  if (!entry || typeof entry !== 'object') return false;
  const e = entry as Record<string, unknown>;
  const title = typeof e.title === 'string' ? e.title.trim().toLowerCase() : '';
  if (title && PLACEHOLDER_TITLES.has(title)) return true;
  const haystack = [e.subtitle, e.description, e.excerpt]
    .filter((v): v is string => typeof v === 'string')
    .join(' ')
    .toLowerCase();
  return PLACEHOLDER_PHRASES.some((p) => haystack.includes(p));
}

function hasLocalizedPayload(entry: unknown): boolean {
  // A localized entry that is still a translated placeholder must not override
  // real base content — treat it as no payload so the merge falls back.
  if (isPlaceholderEntity(entry)) return false;
  if (!entry || typeof entry !== 'object') return false;
  const record = entry as Record<string, unknown>;
  const textKeys = ['title', 'excerpt', 'content', 'subject', 'author', 'category', 'caption', 'description'];
  return textKeys.some((key) => {
    const value = record[key];
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return value && typeof value === 'object' && Object.keys(value).length > 0;
  });
}

function mergeLocalizedArray<T extends { id: number }>(value: T[] | undefined, fallback: T[]): T[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  // Only override items that exist in root (fallback). Never add extra localized-only items.
  //
  // Localized copies are real reader-facing translations. Older content often
  // has no updatedAt, while the EN root receives updatedAt on every admin save.
  // Timestamp comparison made valid translations disappear after any EN edit.
  // Prefer a localized entry whenever it has actual payload; fallback only for
  // empty shells so language switching never silently drops back to English.
  const localizedById = new Map(value.map((entry) => [Number(entry.id), entry]));
  return fallback.map((entry) => {
    const localized = localizedById.get(Number(entry.id));
    if (!localized) return entry;
    if (!hasLocalizedPayload(localized)) return entry;
    // A translation pass only ever touches text fields (title/excerpt/content/...);
    // it has no reason to carry the author link along. If the localized copy is
    // missing authorId/author/role (translated before that field existed, or a
    // sync script that doesn't know about it), silently swapping in the whole
    // localized object would blank the byline in that language even though the
    // root article has it. Backfill just those three fields from root.
    const merged: Record<string, unknown> = { ...localized };
    for (const key of ['authorId', 'author', 'role'] as const) {
      const localizedValue = (localized as Record<string, unknown>)[key];
      const rootValue = (entry as Record<string, unknown>)[key];
      if ((localizedValue === undefined || localizedValue === null || localizedValue === '') && rootValue !== undefined) {
        merged[key] = rootValue;
      }
    }
    return merged as T;
  });
}

// The homepage Gallery ("items") had a real incident: its root collection was
// completely restructured (old travel captions replaced with new long-form
// pieces, ids reused) while stale per-locale translations for those same ids
// were never cleared — every non-English reader kept seeing the old, unrelated
// item merged with the new one's id. mergeLocalizedArray's per-id merge can't
// tell "this id still means the same thing" from "this id was recycled for
// different content," and a timestamp-based check was already tried and
// reverted elsewhere in this file for making valid translations disappear.
// A cheap, unambiguous signal that doesn't need any admin-side bookkeeping:
// if a locale's items array is a different LENGTH than the current root, the
// two have structurally diverged (an item was added/removed/replaced) and the
// whole locale bucket for items is untrustworthy until it's rebuilt to match
// — safer to show the current English items than a locale-shaped bucket of
// content that may no longer correspond to the same entries at all.
function mergeLocalizedItems<T extends { id: number }>(value: T[] | undefined, fallback: T[]): T[] {
  if (Array.isArray(value) && value.length !== fallback.length) return fallback;
  return mergeLocalizedArray(value, fallback);
}

export function getAvailableLanguages(): string[] {
  const allLangs = Object.keys(src().translations);
  if (!allLangs.includes(DEFAULT_LANGUAGE)) {
    allLangs.unshift(DEFAULT_LANGUAGE);
  }
  return allLangs;
}

/**
 * True when an entity (article, review, item, library item) should be
 * visible to readers: not a draft, and its publishAt moment (if any) has
 * passed. The admin preview bypasses this so drafts can be proofread on
 * the real site.
 */
export function isEntityLive(e: { draft?: boolean; publishAt?: string }): boolean {
  if (e.draft) return false;
  // Unedited blueprint stubs ("New editorial story", "…— replace me") never
  // belong on the public site, even if nobody remembered to mark them draft.
  if (isPlaceholderEntity(e)) return false;
  if (e.publishAt) {
    const ts = Date.parse(e.publishAt);
    if (!Number.isNaN(ts) && ts > Date.now()) return false;
  }
  return true;
}

/** @deprecated use isEntityLive — kept as an alias for back-compat. */
export const isArticleLive = isEntityLive;

export function getContentForLanguage(lang: string): LanguageContent {
  const c = src();
  const bucket = (c.localizedCollections || {})[lang] || {};
  const articles = mergeLocalizedArray(bucket.articles, c.articles);
  const reviews = mergeLocalizedArray(bucket.reviews, c.reviews);
  const items = mergeLocalizedItems(bucket.items, c.items);
  const libraryItems = mergeLocalizedArray(bucket.libraryItems, c.libraryItems);

  return {
    items: isPreview() ? items : items.filter(isEntityLive),
    articles: isPreview() ? articles : articles.filter(isEntityLive),
    reviews: isPreview() ? reviews : reviews.filter(isEntityLive),
    libraryItems: isPreview() ? libraryItems : libraryItems.filter(isEntityLive)
  };
}

/** Live-aware authors list (preview → live → bundled). Only active authors are returned. */
export function getAuthors(): Author[] {
  return (src().authors || []).filter((a) => a && a.active !== false);
}

/**
 * Resolve the Author record for an article: by explicit authorId first, then by
 * a case-insensitive name match against the `author` string. Returns null when
 * nothing matches so callers can fall back to the plain `author`/`role` fields.
 */
export function resolveAuthor(article: { authorId?: string; author?: string }): Author | null {
  const all = src().authors || [];
  if (article.authorId) {
    const byId = all.find((a) => a.id === article.authorId);
    if (byId) return byId;
  }
  const name = (article.author || '').trim().toLowerCase();
  if (name) {
    const byName = all.find((a) => (a.name || '').trim().toLowerCase() === name);
    if (byName) return byName;
  }
  return null;
}

// Author.role is entered once in the admin in a single language, so it would
// otherwise freeze in that language regardless of the reader's selected
// locale. This lookup translates known role strings per language; unknown
// roles fall back to the raw string as typed.
const ROLE_TRANSLATIONS: Record<string, Record<string, string>> = {
  'Автор': { EN: 'Author', RU: 'Автор', UA: 'Автор', DE: 'Autor', ES: 'Autor', TR: 'Yazar', IT: 'Autore' },
};

/** Translate an Author record's `role` string into the given language, if known. */
export function translateRole(role: string | undefined, lang: string): string | undefined {
  if (!role) return role;
  return ROLE_TRANSLATIONS[role]?.[lang] || role;
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
