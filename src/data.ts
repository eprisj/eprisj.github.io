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
  type: 'text' | 'image' | 'quote' | 'map' | 'link' | 'video' | 'audio' | 'gallery' | 'checklist' | 'poll' | 'note';
  content: string | string[] | { question: string; options: { label: string; votes: number }[] } | { items: string[] };
  caption?: string;
  coordinates?: { lat: number; lng: number };
  url?: string;
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

export interface StudioProject {
  id: number;
  title: string;
  category: string;
  year: string;
  imageUrl: string;
}

export interface Studio {
  name: string;
  instagram: string;
  email?: string;
  heroImage: string;
  services: string[];
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
}

export interface SiteContent {
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
const localizedCollections = content.localizedCollections || {};

function mergeLocalizedArray<T extends { id: number }>(value: T[] | undefined, fallback: T[]): T[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  // Only override items that exist in root (fallback). Never add extra localized-only items.
  const localizedById = new Map(value.map((entry) => [Number(entry.id), entry]));
  return fallback.map((entry) => localizedById.get(Number(entry.id)) || entry);
}

export function getAvailableLanguages(): string[] {
  const allLangs = Object.keys(content.translations);
  if (!allLangs.includes(DEFAULT_LANGUAGE)) {
    allLangs.unshift(DEFAULT_LANGUAGE);
  }
  return allLangs;
}

export function getContentForLanguage(lang: string): LanguageContent {
  const bucket = localizedCollections[lang] || {};

  return {
    items: mergeLocalizedArray(bucket.items, content.items),
    articles: mergeLocalizedArray(bucket.articles, content.articles),
    reviews: mergeLocalizedArray(bucket.reviews, content.reviews),
    libraryItems: mergeLocalizedArray(bucket.libraryItems, content.libraryItems)
  };
}

export const translations = content.translations;

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
  if (Array.isArray(content.issues) && content.issues.length > 0) {
    return content.issues;
  }
  if (content.issue) {
    return [{ ...content.issue, id: content.issue.id ?? 1 }];
  }
  return [DEFAULT_ISSUE];
}

/**
 * Returns the issue to show by default: the published one, or the most
 * recent one if none is marked published.
 */
export function getLiveIssue(): Issue {
  const issues = getAllIssues();
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
  services: [],
  projects: [],
};

/**
 * Returns the design studio profile (bio/services/portfolio shown on /studio).
 */
export function getStudio(): Studio {
  return content.studio || DEFAULT_STUDIO;
}

export function getIssueArchive(lang: string = DEFAULT_LANGUAGE): { issue: Issue; articles: Article[] }[] {
  const issues = getAllIssues().filter((i) => i.status !== 'draft');
  const live = getLiveIssue();
  const rest = issues
    .filter((i) => i.id !== live.id)
    .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
  return [live, ...rest].map((issue) => ({ issue, articles: resolveIssueArticles(issue, lang) }));
}
