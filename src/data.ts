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

export interface Issue {
  name: string;
  season: string;
  tagline?: string;
  coverUrl: string;
  articleIds: number[];
  status: 'draft' | 'published';
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
  name: 'Issue 15',
  season: 'Spring 2026',
  coverUrl: 'https://raw.githubusercontent.com/eprisj/eprisj.github.io/main/%D1%81over/main_cover.PNG',
  articleIds: content.articles.map((a) => a.id),
  status: 'published',
};

/**
 * Returns the published issue with its articles resolved for the given language.
 * Articles are returned in the exact order listed in issue.articleIds, filtered
 * to those that still exist in the content. Falls back to all articles if the
 * issue config is missing or has no valid article references.
 */
export function getIssue(lang: string = DEFAULT_LANGUAGE): { issue: Issue; articles: Article[] } {
  const issue = content.issue || DEFAULT_ISSUE;
  const localizedArticles = getContentForLanguage(lang).articles;
  const byId = new Map(localizedArticles.map((a) => [Number(a.id), a]));

  const ordered = Array.isArray(issue.articleIds) ? issue.articleIds : [];
  let resolved = ordered
    .map((id) => byId.get(Number(id)))
    .filter((a): a is Article => Boolean(a));

  // Fallback: if nothing resolved, use every article.
  if (resolved.length === 0) {
    resolved = localizedArticles;
  }

  return { issue, articles: resolved };
}
