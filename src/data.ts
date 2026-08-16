import rawContent from './content/site-content.json';

export const DEFAULT_LANGUAGE = 'EN';

export interface Item {
  /** Internal media-record id. It is never presented as a Pics of the week id. */
  id: number;
  /** Stable public/editorial identity for a Pics of the week photo card. */
  picsId?: string;
  /**
   * Weekly-release membership for Pics of the week. This is intentionally
   * separate from the internal media id and from an article id: a fresh draft
   * can exist in the library without replacing the release readers see.
   */
  picsReleaseId?: string;
  /**
   * Explicit membership in the independent Pics of the week collection.
   * Article covers and article-gallery images must keep this unset, even when
   * they happen to have a visually similar category.
   */
  picsOfWeek?: boolean;
  /** Optional editorial source reference retained for attribution only. */
  articleId?: number;
  title: string;
  subtitle: string;
  fig: string;
  description: string;
  imageSeed: string;
  imageUrl?: string;
  /** Optional additional photos for contexts that support a detail view. */
  images?: { url: string; caption?: string }[];
  /** Hidden from the public site until unset. */
  draft?: boolean;
  /** ISO datetime; hidden from the public site until this moment passes. */
  publishAt?: string;
  /** Server-stamped on every /content/entity save — see mergeLocalizedArray. */
  updatedAt?: string;
  /** Legacy placement retained for backwards-compatible content imports. */
  homeSlot?: 'left' | 'center' | 'right';
  /** Homepage Pics of the week category id (for example "sculpture"). */
  homeCategory?: string;
  /** Optional short label shown below a homepage card (for example "week 32"). */
  homeLabel?: string;
  /** Standalone artwork metadata used by Pics of the week; keeps article metadata separate. */
  homeTitle?: string;
  homeSubtitle?: string;
  homeDescription?: string;
  homeCredit?: string;
  homeSourceUrl?: string;
}

/**
 * The image strip has a namespace of its own. `Item.id` is an internal media
 * record and can coincide with an article id; it must never be used as the
 * public/editorial identity of a Pics of the week card.
 */
export function getPicsId(item: Pick<Item, 'picsId' | 'imageUrl' | 'imageSeed' | 'homeTitle' | 'title'>): string {
  const explicit = String(item.picsId || '').trim();
  if (explicit) return explicit;
  // Safe fallback for old VPS snapshots until the admin migration writes a
  // permanent PICS id. It is derived from the image/card fingerprint, never
  // from an article or media record id.
  const source = [item.imageUrl || item.imageSeed || '', item.homeTitle || item.title || ''].join('|');
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `PICS-L-${(hash >>> 0).toString(36).toUpperCase().padStart(6, '0')}`;
}

/** A frozen snapshot of one published "Pics of the week" composition. */
export interface HomepageArchiveCard {
  /** Legacy internal media id, retained only to read old archive entries. */
  id: number;
  /** Independent Pics of the week card id. Preferred over the legacy media id. */
  picsId?: string;
  category?: string;
  categoryLabel?: string;
  title: string;
  subtitle?: string;
  description?: string;
  /** Attribution stays with the frozen weekly card when it is reused later. */
  credit?: string;
  /** Original image/source link retained with the archived card. */
  sourceUrl?: string;
  imageSeed?: string;
  imageUrl?: string;
  /**
   * Optional frozen localized copy. Older entries only contain the base copy;
   * the public reader falls back safely without rewriting that historical
   * snapshot from a later edit of the source card.
   */
  localized?: Record<string, Partial<Pick<HomepageArchiveCard, 'categoryLabel' | 'title' | 'subtitle' | 'description' | 'credit' | 'sourceUrl' | 'imageSeed' | 'imageUrl'>>>;
}

export interface HomepageArchiveEntry {
  id: string;
  label?: string;
  publishedAt: string;
  /** Stable card-id signature prevents duplicate entries on repeated publish. */
  signature?: string;
  /**
   * `false` hides this historical week from the public archive while keeping
   * it available to the editorial team. Missing keeps legacy entries public.
   */
  publicArchive?: boolean;
  /** Legacy-friendly alias for integrations that used a generic visibility flag. */
  visibleOnSite?: boolean;
  archivedAt?: string;
  cards: HomepageArchiveCard[];
}

/** A release is a deliberate five-card weekly composition, not a LIFO bucket. */
export interface HomepagePicsRelease {
  id: string;
  label?: string;
  status: 'draft' | 'published' | 'archived';
  createdAt?: string;
  publishedAt?: string;
  archivedAt?: string;
  /** `false` keeps an archived release in the editorial history only. */
  publicArchive?: boolean;
  /** Ordered PICS ids, never internal media or article ids. */
  picsIds: string[];
}

export interface ContentBlock {
  type: 'text' | 'header' | 'image' | 'quote' | 'map' | 'link' | 'video' | 'audio' | 'gallery' | 'checklist' | 'poll' | 'note' | 'mosaic';
  content: string | string[] | { question: string; options: { label: string; votes: number }[] } | { items: string[] };
  caption?: string;
  /** Accessible description for a single editorial image. Falls back to caption. */
  alt?: string;
  /** Photographer, studio, archive or other image/video credit. */
  credit?: string;
  /** Optional source / rights link displayed next to the credit. */
  sourceUrl?: string;
  /** Poster image for Vimeo or self-hosted video. */
  poster?: string;
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
  /** Controls whether the author appears in the public About / Team section. */
  showOnTeam?: boolean;
  /** Lower numbers appear first in the About / Team section. */
  teamOrder?: number;
}

export interface Article {
  id: number;
  title: string;
  author: string;
  role?: string;
  /** Optional link to an entry in SiteContent.authors; falls back to the `author`/`role` strings when absent. */
  authorId?: string;
  /**
   * Human-facing date, exactly as an editor typed it ("Jul 30, 2026",
   * "15 серпня 2026"). Display only.
   */
  date: string;
  /**
   * Machine-readable publication date (ISO 8601) and the ONLY key the feed
   * sorts by. `date` used to carry both jobs and could not: the base content
   * holds "July 18, 2026", "Jul 30, 2026" and "Aug 2, 2026" side by side, and
   * the moment an editor writes a date in any other shape (a Cyrillic month,
   * 15.08.2026, a typo) Date.parse returns NaN and the article slides silently
   * to wherever `updatedAt` and `id` happen to put it. Backfilled by
   * scripts/backfill-published-at.mjs; new articles get it from the admin.
   */
  publishedAt?: string;
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

  /* ── How this article looks as a CARD ──────────────────────────────────────
     The gallery has had per-surface preview fields (homeTitle, homeSubtitle,
     homeDescription, homeCredit) for a while; articles had none, so a headline
     written for the top of a page had to also work at 18px in a grid, and an
     editor who wanted a shorter line had to damage the article to get it.

     All of these are optional and fall back to the real field, so an article
     that sets none behaves exactly as before. The two text ones are ordinary
     translatable copy; the image and the layout switches are base-owned (see
     BASE_AUTHORITATIVE_FIELDS), because a card that is a different size or
     shows a different photo per language is a bug, not a translation. */
  /** Card headline. Falls back to `title`. */
  previewTitle?: string;
  /** Card standfirst. Falls back to `excerpt`. */
  previewExcerpt?: string;
  /** Card cover. Falls back to `imageUrl`/`imageSeed`. */
  previewImageUrl?: string;
  /**
   * Focal point of the card cover as `x% y%`, fed to object-position. Cards
   * are square while covers rarely are, so the default centre crop is what
   * decapitates a portrait.
   */
  previewFocus?: string;
  /** Hide the standfirst on this card even where the surface shows one. */
  previewHideExcerpt?: boolean;
  /** Hide the byline on this card. */
  previewHideAuthor?: boolean;
  /**
   * Keep the article out of the homepage feed while leaving it in /articles.
   * Not the same as a draft: the piece is published and readable, it just does
   * not belong on the front page (a short note, a correction, a re-run).
   */
  hideOnHome?: boolean;
  /** The mirror image: on the homepage, absent from the /articles grid. */
  hideInList?: boolean;
}

export interface Review {
  id: number;
  title: string;
  subject: string;
  rating: number;
  /** Reviews use the same block model as articles; legacy plain text remains supported. */
  content: string | ContentBlock[];
  author: string;
  role?: string;
  /** Optional link to the shared author registry, matching the article byline model. */
  authorId?: string;
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

export interface FuturoshockWork {
  id: string;
  title: string;
  author: string;
  year: string;
  format: '2d' | '3d';
  medium: string;
  statement: string;
  imageUrl?: string;
  modelUrl?: string;
  /** Built-in display study used while a commissioned GLB/GLTF is not supplied. */
  openingScene?: 'amber' | 'fold' | 'orbit' | 'totem';
  /** Curatorial room placement for the digital exhibition. */
  room?: 'room-01' | 'room-02' | 'room-03';
  /** Physical position in the Futuroshock shelf, counted left-to-right and top-to-bottom. */
  shelfSlot?: number;
  /** Optional object scale tuned for the fixed Futuroshock shelf. */
  shelfScale?: number;
  /** A concise physical description displayed in the object dossier. */
  textureNote?: string;
  /** Dimensions or edition scale, for example "28 x 16 x 12 cm". */
  dimensions?: string;
  materials?: string[];
  edition?: string;
  relatedArticleUrl?: string;
  draft?: boolean;
  publishAt?: string;
  updatedAt?: string;
}

/** A per-language manifesto shown at /manifest. Each locale carries its own
 *  title + HTML body; the page falls back to DEFAULT_LANGUAGE when a locale is
 *  missing. Edited from the admin "Manifest" tab. */
export interface ManifestEntry {
  title?: string;
  body?: string; // HTML (rendered with the same sanitizer as article text)
}
export type Manifest = Record<string, ManifestEntry>;

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

/** Homepage feature controls edited from the admin's Homepage tab. */
export interface HomepageShowcaseSettings {
  /** Hide the homepage teaser without removing its editorial configuration. */
  enabled?: boolean;
  mode?: 'auto' | 'manual';
  /** Ordering used by automatic selection and by the full Showcase route. */
  sort?: 'editorial' | 'score' | 'newest' | 'oldest';
  /** Minimum editorial score. Zero keeps every published, image-backed work. */
  minScore?: number;
  /** Number of cards in the homepage teaser (2–6 in the admin). */
  limit?: number;
  eyebrow?: string;
  title?: string;
  description?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  /** Showcase work ids, in the order used by the four-card teaser. */
  featuredWorkIds?: string[];
}

/**
 * Ordering for every list of articles on the site.
 *
 * `mode` decides the base sequence and `pinned` sits on top of it, in the order
 * given. Chronological is the default because that is what a journal is; manual
 * exists for an editor who wants a run of pieces to read in a set order.
 *
 * `manualOrder` is a LIST of ids, not a number on each article. The per-article
 * `order` field this replaces is exactly the failure a list avoids: it holds
 * 1..11 on the older articles, nothing at all on the four newest, and no code
 * has read it since the feed started sorting by date. A list cannot half-exist,
 * cannot need renumbering, and an article missing from it has one obvious
 * meaning (it has not been placed yet) instead of an ambiguous undefined.
 *
 * Ordering lives on the base content, never inside a translation bucket: a
 * per-language order would drift apart the same way translated article bodies
 * did before the text-overlay fix.
 */
export interface ArticleOrderSettings {
  mode?: 'chronological' | 'manual';
  /** Article ids shown first, in this order, in both modes. */
  pinned?: number[];
  /** Article ids in editor-defined order; used when mode is 'manual'. */
  manualOrder?: number[];
  /**
   * Where articles absent from `manualOrder` go. 'top' suits a journal that
   * keeps publishing into a hand-arranged run; 'bottom' suits a fixed
   * anthology whose tail is deliberate.
   */
  unplaced?: 'top' | 'bottom';
}

export type HomepageSectionKey = 'pics' | 'articles' | 'showcase' | 'archive';

/**
 * Editorial layout controls for the public homepage. These values intentionally
 * stay data-driven so an editor can change the composition without a code deploy.
 */
export interface HomepageLayoutSettings {
  /** Ordered list of homepage sections. Unknown/duplicate keys are ignored. */
  sectionOrder?: HomepageSectionKey[];
  /** Per-section visibility switches; missing values use the public defaults. */
  visibility?: Partial<Record<HomepageSectionKey, boolean>>;
  /** Visual controls for the five-card Pics of the week composition. */
  pics?: {
    captionPlacement?: 'below' | 'overlay';
    showDescriptions?: boolean;
    showCategory?: boolean;
    showNavigation?: boolean;
    mobileMode?: 'single' | 'peek';
    cardStyle?: 'editorial' | 'compact';
  };
  /** Editorial controls for the article feed below the image selection. */
  articles?: {
    showDescription?: boolean;
    showPreview?: boolean;
    showReadAll?: boolean;
    columns?: 1 | 2 | 3;
  };
}

export interface HomepagePicsCategory {
  id: string;
  label: string;
  /** Optional per-locale category labels; standard categories also have code fallbacks. */
  labels?: Record<string, string>;
  /** Words used by the safe fallback classifier when an item has no explicit category. */
  matches?: string[];
}

/** Stable public defaults; the admin can rename the labels and keywords without a code deploy. */
export const DEFAULT_HOMEPAGE_PICS_CATEGORIES: HomepagePicsCategory[] = [
  { id: 'sculpture', label: 'Sculpture', matches: ['sculpture', 'sculptural', 'statue', 'object', 'installation', 'ceramic', 'vase'] },
  { id: 'painting', label: 'Painting', matches: ['painting', 'paint', 'canvas', 'portrait', 'art', 'culture', 'history', 'restoration'] },
  { id: 'architecture', label: 'Architecture', matches: ['architecture', 'building', 'urban', 'space', 'city'] },
  { id: 'design', label: 'Design', matches: ['design', 'interior', 'furniture', 'travel', 'material'] },
  { id: 'photography', label: 'Photography', matches: ['photography', 'photograph', 'photo', 'lens', 'camera', 'visual'] },
];

export interface HomepageSettings {
  /** Select newest items using LIFO or preserve the explicit items order. */
  picsOfWeek?: {
    mode?: 'auto' | 'manual';
    ordering?: 'lifo' | 'manual';
    categories?: HomepagePicsCategory[];
    /** Category shown in the centre of the five-card carousel. */
    centerCategory?: string;
    /** Visual tuning values edited in the homepage admin controls. */
    centerScale?: number;
    sideScale?: number;
    gap?: number;
    /** The only weekly release eligible for the public carousel. */
    activeReleaseId?: string;
    /** Historical/current release records. Omitted content keeps legacy LIFO behaviour. */
    releases?: HomepagePicsRelease[];
  };
  /** Homepage editorial feed. New published articles are included by default. */
  articles?: {
    enabled?: boolean;
    /** Keep the homepage feed live while a reader leaves the page open. */
    autoSync?: boolean;
    /** 0 means all published articles, otherwise show the newest N. */
    limit?: number;
  };
  /**
   * How every article surface is ordered. One setting, not one per surface:
   * the homepage feed, the Articles grid and search all used to sort for
   * themselves, which is how two of them could already disagree.
   */
  articleOrder?: ArticleOrderSettings;
  layout?: HomepageLayoutSettings;
  /** When enabled, safe homepage edits are pushed after a short debounce. */
  autoPublish?: boolean;
  showcase?: HomepageShowcaseSettings;
}

/** Public-shell copy, contacts and default SEO set in the editorial admin. */
export interface SiteSettings {
  brandName?: string;
  footerTitle?: string;
  footerDescription?: string;
  instagramUrl?: string;
  contactEmail?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  ogImage?: string;
}

export type VisibilitySectionKey = 'gallery' | 'articles' | 'reviews' | 'about' | 'manifest' | 'issue' | 'design' | 'studio' | 'radio' | 'podcasts';
export type VisibilityEntityKey = 'articles' | 'items' | 'reviews' | 'libraryItems' | 'authors' | 'studioProjects';

export interface SectionVisibility {
  /** Whether the route itself can be opened. */
  page?: boolean;
  /** Whether the route is listed in the public navigation. */
  navigation?: boolean;
}

export interface SiteVisibility {
  sections?: Partial<Record<VisibilitySectionKey, SectionVisibility>>;
  /** Record ids are stringified so numeric articles and string author ids share one stable schema. */
  entities?: Partial<Record<VisibilityEntityKey, Record<string, boolean>>>;
}

export interface SiteContent {
  theme?: SiteTheme;
  site?: SiteSettings;
  homepage?: HomepageSettings;
  visibility?: SiteVisibility;
  translations: Record<string, Record<string, string>>;
  items: Item[];
  homepageArchive?: HomepageArchiveEntry[];
  articles: Article[];
  reviews: Review[];
  libraryItems: LibraryItem[];
  localizedCollections?: Record<string, LocalizedContentCollection>;
  issue?: Issue;
  issues?: Issue[];
  studio?: Studio;
  authors?: Author[];
  manifest?: Manifest;
  futuroshock?: FuturoshockWork[];
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

const DEFAULT_SECTION_VISIBILITY: Record<VisibilitySectionKey, Required<SectionVisibility>> = {
  gallery:   { page: true, navigation: true },
  articles:  { page: true, navigation: true },
  reviews:   { page: true, navigation: true },
  about:     { page: true, navigation: true },
  manifest:  { page: true, navigation: false },
  issue:     { page: true, navigation: true },
  design:    { page: true, navigation: true },
  studio:    { page: true, navigation: false },
  radio:     { page: true, navigation: true },
  podcasts:  { page: true, navigation: true },
};

export function getSectionVisibility(key: VisibilitySectionKey): Required<SectionVisibility> {
  const fallback = DEFAULT_SECTION_VISIBILITY[key];
  const configured = src().visibility?.sections?.[key];
  return {
    page: typeof configured?.page === 'boolean' ? configured.page : fallback.page,
    navigation: typeof configured?.navigation === 'boolean' ? configured.navigation : fallback.navigation,
  };
}

export function isSectionEnabled(key: VisibilitySectionKey): boolean {
  return getSectionVisibility(key).page;
}

export function isSectionInNavigation(key: VisibilitySectionKey): boolean {
  const state = getSectionVisibility(key);
  return state.page && state.navigation;
}

function isEntityVisible(collection: VisibilityEntityKey, id: string | number): boolean {
  if (isPreview()) return true;
  return src().visibility?.entities?.[collection]?.[String(id)] !== false;
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
// Blueprint titles, EN seeds + the AI-translated forms found in every locale.
// An unedited stub keeps one of these titles verbatim; real content never does.
const PLACEHOLDER_TITLES = new Set([
  // EN blueprint titles (admin)
  'new editorial story', 'new practical guide', 'new photo essay',
  'new review', 'new gallery item', 'new file',
  // "New gallery item" translated
  'neues galerieelement', 'nuevo elemento de la galería', 'yeni galeri öğesi',
  'nuovo elemento della galleria', 'новый элемент галереи', 'новий елемент галереї',
  // "New editorial story" translated
  'neue redaktionelle geschichte', 'nueva historia editorial', 'yeni editoryal hikaye',
  'nuova storia editoriale', 'новая редакционная история', 'нова редакційна історія',
]);
// The "…— replace me" subtitle imperative, one distinctive token per language.
// These never appear in real prose (unlike the fragment "замін", which is inside
// real words like "незамінне"), so substring matching is safe.
const PLACEHOLDER_PHRASES = [
  'replace me', 'replace with real copy before publishing',
  'замініть мене', 'замініть на справжню копію',     // UA
  'замените меня', 'замените реальной копией',        // RU
  'ersetze mich',                                     // DE
  'reemplázame',                                      // ES
  'beni değiştir',                                    // TR
  'sostituiscimi',                                    // IT
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
  const textKeys = ['title', 'excerpt', 'content', 'subject', 'author', 'category', 'caption', 'alt', 'credit', 'description'];
  return textKeys.some((key) => {
    const value = record[key];
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return value && typeof value === 'object' && Object.keys(value).length > 0;
  });
}

// A localized entry is a full deep-clone snapshot of the base entry, taken when
// its translation was first created (admin app.js: getSectionArray →
// deepClone(base)). It then drifts: later edits to the BASE entry — a swapped
// hero image, added/removed content blocks, a new gallery — never reach the
// snapshot, so a whole-object override froze every language at translation time
// while English moved on. That is the root cause of "content differs by
// language": readers saw stale images and truncated articles in every locale
// that had ever been translated.
//
// The fix is to treat a localized entry as a TEXT OVERLAY, not a replacement:
// the base entry is authoritative for structure and media, and only translated
// text fields are overlaid from the localized copy. These fields are structure/
// media/state/links — never translated prose — so they always come from base.
const BASE_AUTHORITATIVE_FIELDS = new Set([
  // A person's name is identity, not translated copy. Keeping both author
  // fields base-owned prevents a stale locale from showing a different writer
  // (or an old placeholder) on the same article/review.
  'id', 'picsId', 'imageSeed', 'imageUrl', 'author', 'authorId', 'draft', 'publishAt', 'updatedAt',
  'url', 'link', 'rating', 'featured', 'coordinates',
  // When an article was published is a fact about the article, not a translated
  // string. Left overlayable, a stale locale bucket could order that language's
  // feed differently from every other one — the same class of drift that made
  // translated article bodies diverge from the base before the text-overlay fix.
  'publishedAt',
  // Card media and card layout are properties of the design, not of a
  // language. Translations may override previewTitle/previewExcerpt, which are
  // copy, and nothing else about the card.
  'previewImageUrl', 'previewFocus', 'previewHideExcerpt', 'previewHideAuthor',
  // Where a piece appears is an editorial decision about the whole article,
  // taken once, not per language.
  'hideOnHome', 'hideInList',
]);

// Content-block types whose `content` field is translatable prose (a string).
// For every other block type `content` is media/data (an image URL, a gallery
// URL array, a map's coordinates) and must come from the base block.
const BLOCK_PROSE_TYPES = new Set(['text', 'header', 'quote', 'note']);

// Merge one localized block's text onto a base block, keeping the base block's
// structure and media. Blocks are matched positionally; if the types differ at
// this index the localized array has structurally diverged from base, so we keep
// the base block wholesale (English but correct) rather than paint mismatched
// text onto it.
function mergeContentBlock(base: ContentBlock, localized: ContentBlock | undefined): ContentBlock {
  if (!localized || base.type !== localized.type) return base;
  const merged: ContentBlock = { ...base };
  if (typeof localized.caption === 'string' && localized.caption.trim()) merged.caption = localized.caption;
  if (typeof localized.alt === 'string' && localized.alt.trim()) merged.alt = localized.alt;
  if (typeof localized.credit === 'string' && localized.credit.trim()) merged.credit = localized.credit;
  if (Array.isArray(localized.alts) && localized.alts.length) merged.alts = localized.alts;

  if (BLOCK_PROSE_TYPES.has(base.type)) {
    if (typeof localized.content === 'string') merged.content = localized.content;
  } else if (base.type === 'checklist') {
    const lc = localized.content as { items?: string[] } | undefined;
    if (lc && typeof lc === 'object' && Array.isArray(lc.items)) merged.content = localized.content;
  } else if (base.type === 'poll') {
    // Translate question + option labels, but keep vote counts from base (they
    // are live data, not text, and the localized snapshot's counts are stale).
    const bc = base.content as { question?: string; options?: { label: string; votes: number }[] } | undefined;
    const lc = localized.content as { question?: string; options?: { label: string; votes: number }[] } | undefined;
    if (bc && lc && Array.isArray(bc.options) && Array.isArray(lc.options)) {
      merged.content = {
        question: typeof lc.question === 'string' ? lc.question : (bc.question || ''),
        options: bc.options.map((opt, i) => ({
          ...opt,
          label: (lc.options![i] && typeof lc.options![i].label === 'string') ? lc.options![i].label : opt.label,
        })),
      };
    }
  }
  // image / gallery / mosaic / video / audio / link / map: content stays base.
  return merged;
}

// Base defines the block count and structure; localized supplies text where an
// index exists and its type matches. Extra base blocks (added after translation)
// render in the base language instead of vanishing — a full article beats a
// silently truncated one.
function mergeContentBlocks(base: ContentBlock[], localized: unknown): ContentBlock[] {
  if (!Array.isArray(localized)) return base;
  return base.map((b, i) => mergeContentBlock(b, (localized as ContentBlock[])[i]));
}

// Overlay a localized entry's translated text onto the base entry. Structure and
// media always come from base (see BASE_AUTHORITATIVE_FIELDS); `content` blocks
// and item `images` get a per-index text merge so their media stays base-owned.
function mergeEntryTextOntoBase<T extends { id: number }>(base: T, localized: T): T {
  const merged: Record<string, unknown> = { ...base };
  const baseRec = base as Record<string, unknown>;
  const localizedRec = localized as Record<string, unknown>;
  for (const [key, value] of Object.entries(localized as Record<string, unknown>)) {
    if (BASE_AUTHORITATIVE_FIELDS.has(key)) continue;

    if (key === 'content' && Array.isArray(baseRec.content)) {
      merged.content = mergeContentBlocks(baseRec.content as ContentBlock[], value);
      continue;
    }
    if (key === 'images' && Array.isArray(baseRec.images)) {
      // Item detail photos: URLs are media (base), only captions are translated.
      const localizedImages = Array.isArray(value) ? (value as { url: string; caption?: string }[]) : [];
      merged.images = (baseRec.images as { url: string; caption?: string }[]).map((img, i) => {
        const li = localizedImages[i];
        return (li && typeof li.caption === 'string' && li.caption.trim()) ? { ...img, caption: li.caption } : img;
      });
      continue;
    }

    // Generic translated text field: overlay only when it carries real payload,
    // so an empty/missing localized field never blanks a populated base one.
    if (typeof value === 'string') { if (value.trim()) merged[key] = value; }
    else if (Array.isArray(value)) { if (value.length) merged[key] = value; }
    else if (value && typeof value === 'object') { if (Object.keys(value).length) merged[key] = value; }
  }
  // Homepage artwork fields inherit from the localized editorial source when
  // an older translation snapshot has no dedicated home copy. This keeps the
  // always-inherited card metadata multilingual instead of leaking EN values
  // into RU/UA/DE/IT/ES/TR until somebody manually opens every card.
  if (!String(localizedRec.homeTitle || '').trim() && typeof localizedRec.title === 'string' && localizedRec.title.trim()) {
    merged.homeTitle = localizedRec.title;
  }
  if (!String(localizedRec.homeSubtitle || '').trim() && typeof localizedRec.subtitle === 'string' && localizedRec.subtitle.trim()) {
    merged.homeSubtitle = localizedRec.subtitle;
  }
  if (!String(localizedRec.homeDescription || '').trim() && typeof localizedRec.description === 'string' && localizedRec.description.trim()) {
    merged.homeDescription = localizedRec.description;
  }
  return merged as T;
}

// A localized snapshot with a different content shape belongs to an older
// version of the record. Never let its title/metadata overlay the current
// entry: that is how a recycled review id ended up showing the Olea title on
// top of the Le Dauphine photo essay. The current base remains the safe,
// structure-authoritative fallback until the locale is repaired.
function hasContentShapeMismatch<T extends { id: number }>(base: T, localized: T): boolean {
  const baseRec = base as Record<string, unknown>;
  const localizedRec = localized as Record<string, unknown>;
  if (!('content' in baseRec) || !('content' in localizedRec)) return false;
  const baseContent = baseRec.content;
  const localizedContent = localizedRec.content;
  if (Array.isArray(baseContent) !== Array.isArray(localizedContent)) return true;
  return Array.isArray(baseContent)
    && Array.isArray(localizedContent)
    && baseContent.length !== localizedContent.length;
}

function mergeLocalizedArray<T extends { id: number }>(value: T[] | undefined, fallback: T[]): T[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  // Only override entries that exist in root (fallback). Never add extra
  // localized-only entries. Prefer a localized entry whenever it has real
  // payload; fall back for empty shells so language switching never silently
  // drops back to English. The overlay itself (mergeEntryTextOntoBase) keeps
  // structure/media base-owned so a stale snapshot can't freeze this language.
  const localizedById = new Map(value.map((entry) => [Number(entry.id), entry]));
  return fallback.map((entry) => {
    const localized = localizedById.get(Number(entry.id));
    if (!localized) return entry;
    if (!hasLocalizedPayload(localized)) return entry;
    if (hasContentShapeMismatch(entry, localized)) return entry;
    return mergeEntryTextOntoBase(entry, localized);
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
// Two cheap, unambiguous signals that need no admin-side bookkeeping — if
// either fires, the whole locale items bucket is untrustworthy and it's safer
// to show the current English items than a bucket that may no longer correspond
// to the same entries:
//   1. Different LENGTH than the current root — structurally diverged.
//   2. Contains a placeholder stub ("New gallery item" and its translations) —
//      an unfinished/stale translation pass, so the "real-looking" siblings in
//      the same bucket (which the per-id merge can't tell are stale) can't be
//      trusted either. This is what caught the recycled-id incident again: every
//      locale's items still translated the OLD deleted pieces on reused ids.
function mergeLocalizedItems<T extends { id: number }>(value: T[] | undefined, fallback: T[]): T[] {
  if (Array.isArray(value) && value.length !== fallback.length) return fallback;
  if (Array.isArray(value) && value.some(isPlaceholderEntity)) return fallback;
  if (Array.isArray(value) && value.some((localized) => {
    const base = fallback.find((entry) => Number(entry.id) === Number(localized.id));
    return Boolean(base && hasContentShapeMismatch(base, localized));
  })) return fallback;
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
  const publishTimestamp = e.publishAt ? Date.parse(e.publishAt) : NaN;
  // A blueprint is never reader-facing content. Older admin versions could
  // remove `draft` before the first real edit, which made a template look
  // published on mobile clients. A title/copy placeholder stays hidden until
  // the editor replaces it with actual material, regardless of legacy flags.
  if (isPlaceholderEntity(e)) return false;
  if (e.publishAt) {
    if (Number.isFinite(publishTimestamp) && publishTimestamp > Date.now()) return false;
  }
  return true;
}

/** @deprecated use isEntityLive — kept as an alias for back-compat. */
export const isArticleLive = isEntityLive;

export function getContentForLanguage(lang: string): LanguageContent {
  const c = src();
  const bucket = (c.localizedCollections || {})[lang] || {};

  // "Is this an unfilled blueprint stub?" is a property of the BASE entry, not
  // of any translation. A localized overlay carries the *translated* stub text
  // (e.g. base "New editorial story" → UA "Нова редакційна історія"), which a
  // post-merge check can't recognise. So drop placeholder base entries here,
  // before the merge — mergeLocalizedArray never adds locale-only entries, so
  // an orphaned localized stub for the same id is dropped along with it. Admin
  // preview keeps everything so stubs remain visible for editing.
  const liveBase = <T,>(arr: T[]): T[] => isPreview() ? arr : arr.filter((e) => !isPlaceholderEntity(e));

  const articles = mergeLocalizedArray(bucket.articles, liveBase(c.articles));
  // Reviews hit the same recycled-id trap the Gallery did: every locale still
  // carries a translation of a deleted restaurant review on id 1, so readers of
  // UA/RU/DE opened "Симфонія смаків / Ресторан «Олеа», Лімасол" sitting on top
  // of the Le Dauphine body. The buckets also hold a "New review" stub and one
  // entry more than the root. Both signals are exactly what mergeLocalizedItems
  // screens for, so reviews get the same guard: an untrustworthy bucket falls
  // back to the base language instead of mixing two different reviews together.
  const reviews = mergeLocalizedItems(bucket.reviews, liveBase(c.reviews));
  const items = mergeLocalizedItems(bucket.items, liveBase(c.items));
  const libraryItems = mergeLocalizedArray(bucket.libraryItems, liveBase(c.libraryItems));

  const liveArticles = isPreview() ? articles : articles.filter((entry) => isEntityLive(entry) && isEntityVisible('articles', entry.id));
  const liveItems = isPreview() ? items : items.filter((entry) => isEntityLive(entry) && isEntityVisible('items', entry.id));

  return {
    // Pics of the week is a photo-only editorial collection. Articles remain
    // available in the Articles section below the gallery, but are never
    // promoted into this image strip automatically.
    items: liveItems,
    articles: liveArticles,
    reviews: isPreview() ? reviews : reviews.filter((entry) => isEntityLive(entry) && isEntityVisible('reviews', entry.id)),
    libraryItems: isPreview() ? libraryItems : libraryItems.filter((entry) => isEntityLive(entry) && isEntityVisible('libraryItems', entry.id))
  };
}

/** Live-aware authors list (preview → live → bundled). Only active authors are returned. */
export function getAuthors(): Author[] {
  return (src().authors || []).filter((a) => a && a.active !== false && isEntityVisible('authors', a.id));
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

export function getSiteSettings(): SiteSettings {
  return src().site || {};
}

/**
 * The publication moment of an article, as a number.
 *
 * `publishedAt` first: it is the field that exists to answer this. `date` is a
 * free-text display string and is only a fallback for content written before
 * the backfill; `updatedAt` after it, and 0 last, which sorts an undated piece
 * to the end rather than to the top.
 */
export function articleTimestamp(article: { publishedAt?: string; date?: string; updatedAt?: string }): number {
  for (const value of [article.publishedAt, article.date, article.updatedAt]) {
    const timestamp = value ? Date.parse(value) : Number.NaN;
    if (Number.isFinite(timestamp)) return timestamp;
  }
  return 0;
}

/**
 * THE order of articles. Every surface calls this one function, so the
 * homepage feed, the Articles grid, an issue and search cannot answer the same
 * question differently — which they already did, with two separate sorts in
 * App.tsx and a dead `order` field in the data.
 *
 * Pinned ids come first in the order the editor pinned them. The rest follow
 * the mode. Ids that no longer exist are ignored rather than leaving holes.
 */
export function orderArticles<T extends { id: number; publishedAt?: string; date?: string; updatedAt?: string }>(
  articles: T[],
  settings: ArticleOrderSettings = getHomepageSettings().articleOrder || {},
): T[] {
  const byId = new Map(articles.map((article) => [Number(article.id), article]));
  const taken = new Set<number>();
  const out: T[] = [];

  const take = (id: number) => {
    const key = Number(id);
    if (taken.has(key)) return;
    const article = byId.get(key);
    if (!article) return;      // deleted since it was pinned/placed
    taken.add(key);
    out.push(article);
  };

  (settings.pinned || []).forEach(take);

  const chronological = articles
    .slice()
    .sort((a, b) => articleTimestamp(b) - articleTimestamp(a) || Number(b.id) - Number(a.id));

  if (settings.mode === 'manual') {
    const placed = (settings.manualOrder || []).filter((id) => byId.has(Number(id)));
    const unplaced = chronological.filter((article) => !placed.includes(Number(article.id)));
    // Newly published pieces should not vanish into the middle of a hand-made
    // run: they go to one deliberate end of it, and which end is a setting.
    if (settings.unplaced === 'bottom') {
      placed.forEach(take);
      unplaced.forEach((article) => take(article.id));
    } else {
      unplaced.forEach((article) => take(article.id));
      placed.forEach(take);
    }
  } else {
    chronological.forEach((article) => take(article.id));
  }

  return out;
}

export function getHomepageSettings(): HomepageSettings {
  return src().homepage || {};
}

/**
 * Resolve the deliberately published five-card composition. Returning null is
 * significant: old content did not have release records, so public pages must
 * keep their established category/LIFO fallback until an editor publishes the
 * first explicit release.
 */
export function getActiveHomepagePicsRelease(): HomepagePicsRelease | null {
  const pics = getHomepageSettings().picsOfWeek;
  const activeId = String(pics?.activeReleaseId || '').trim();
  if (!activeId || !Array.isArray(pics?.releases)) return null;
  const release = pics.releases.find((candidate) => String(candidate?.id || '').trim() === activeId);
  if (!release || release.status !== 'published' || !Array.isArray(release.picsIds)) return null;
  return release;
}

/** Published weekly homepage snapshots, newest first. */
export function getHomepageArchive(): HomepageArchiveEntry[] {
  const archive = Array.isArray(src().homepageArchive) ? src().homepageArchive : [];
  return archive
    .filter((entry): entry is HomepageArchiveEntry => Boolean(
      entry
      && Array.isArray(entry.cards)
      && entry.cards.length
      && entry.publicArchive !== false
      && entry.visibleOnSite !== false
    ))
    .slice()
    .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
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
  const studio = src().studio || DEFAULT_STUDIO;
  if (isPreview()) return studio;
  return {
    ...studio,
    projects: (studio.projects || []).filter((project) => isEntityVisible('studioProjects', project.id)),
  };
}

export function getFuturoshock(): FuturoshockWork[] {
  return (src().futuroshock || []).filter((work) => isEntityLive(work));
}

/**
 * Returns the manifesto entry for a language, falling back to DEFAULT_LANGUAGE
 * (and then to an empty entry) so /manifest always has something to render.
 */
export function getManifest(lang: string = DEFAULT_LANGUAGE): ManifestEntry {
  const all = src().manifest || {};
  return all[lang] || all[DEFAULT_LANGUAGE] || {};
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
