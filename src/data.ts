import rawContent from './content/site-content.json';

export const DEFAULT_LANGUAGE = 'EN';

export interface Item {
  id: number;
  title: string;
  subtitle: string;
  fig: string;
  description: string;
  imageSeed: string;
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

export interface SiteContent {
  translations: Record<string, Record<string, string>>;
  items: Item[];
  articles: Article[];
  reviews: Review[];
  libraryItems: LibraryItem[];
  localizedCollections?: Record<string, LocalizedContentCollection>;
}

const content = rawContent as SiteContent;
const localizedCollections = content.localizedCollections || {};

function pickLocalizedArray<T>(value: T[] | undefined, fallback: T[]): T[] {
  return Array.isArray(value) ? value : fallback;
}

function hasFullLocalizedContent(lang: string): boolean {
  const bucket = localizedCollections[lang];
  return Boolean(
    bucket &&
      Array.isArray(bucket.items) &&
      Array.isArray(bucket.articles) &&
      Array.isArray(bucket.reviews) &&
      Array.isArray(bucket.libraryItems)
  );
}

export function getAvailableLanguages(): string[] {
  const localized = Object.keys(localizedCollections).filter(
    (lang) => lang !== DEFAULT_LANGUAGE && hasFullLocalizedContent(lang)
  );

  return [DEFAULT_LANGUAGE, ...localized];
}

export function getContentForLanguage(lang: string): LanguageContent {
  const bucket = localizedCollections[lang] || {};

  return {
    items: pickLocalizedArray(bucket.items, content.items),
    articles: pickLocalizedArray(bucket.articles, content.articles),
    reviews: pickLocalizedArray(bucket.reviews, content.reviews),
    libraryItems: pickLocalizedArray(bucket.libraryItems, content.libraryItems)
  };
}

export const translations = content.translations;
