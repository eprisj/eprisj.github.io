// ─────────────────────────────────────────────────────────────────────────────
// EPRIS · DESIGN — query / relational layer
//
// Everything the UI needs goes through this module. Today it resolves against the
// in-bundle seed (designData.ts); to move to the VPS Postgres/Prisma API later,
// only the getters here change (e.g. become async fetches) — the components and
// the relation logic stay put. Reverse relations are DERIVED from Project, which
// is the single source of truth, exactly like SQL joins over a projects table.
// ─────────────────────────────────────────────────────────────────────────────

import {
  PROJECTS, PRODUCTS, BRANDS, STUDIOS,
  type Project, type Product, type Brand, type DesignStudio,
  type ProjectType, type ProductCategory, type BudgetRange,
  PROJECT_TYPES, PRODUCT_CATEGORIES, BUDGET_RANGES,
} from './designData';

export type { Project, Product, Brand, DesignStudio, ProjectType, ProductCategory, BudgetRange };
export { PROJECT_TYPES, PRODUCT_CATEGORIES, BUDGET_RANGES };

// ── Indexes ──────────────────────────────────────────────────────────────────
const projectById = new Map(PROJECTS.map((p) => [p.id, p]));
const productById = new Map(PRODUCTS.map((p) => [p.id, p]));
const brandById = new Map(BRANDS.map((b) => [b.id, b]));
const studioById = new Map(STUDIOS.map((s) => [s.id, s]));

// ── Image resolution (color editorial photography via picsum seeds) ──────────
export function designImage(seed: string, w: number, h: number): string {
  if (/^(https?:)?\/\//i.test(seed) || seed.startsWith('/')) return seed;
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
}

// ── Primary getters ──────────────────────────────────────────────────────────
export const getProjects = (): Project[] => PROJECTS;
export const getProducts = (): Product[] => PRODUCTS;
export const getBrands = (): Brand[] => BRANDS;
export const getStudios = (): DesignStudio[] => STUDIOS;

export const getProject = (slug: string) => PROJECTS.find((p) => p.slug === slug) ?? null;
export const getProduct = (slug: string) => PRODUCTS.find((p) => p.slug === slug) ?? null;
export const getBrand = (slug: string) => BRANDS.find((b) => b.slug === slug) ?? null;
export const getStudio = (slug: string) => STUDIOS.find((s) => s.slug === slug) ?? null;

export const studioForProject = (p: Project) => studioById.get(p.studioId) ?? null;
export const brandForProduct = (pr: Product) => brandById.get(pr.brandId) ?? null;

export const brandsForProject = (p: Project): Brand[] =>
  p.brandIds.map((id) => brandById.get(id)).filter((b): b is Brand => !!b);
export const productsForProject = (p: Project): Product[] =>
  p.productIds.map((id) => productById.get(id)).filter((pr): pr is Product => !!pr);

// ── Derived (reverse) relations — the "auto-update" behaviour ────────────────
// A brand's project list, a studio's portfolio, a product's appearances: never
// stored, always computed from PROJECTS. Publish a project → these all change.
export const projectsForBrand = (brandId: number): Project[] =>
  PROJECTS.filter((p) => p.brandIds.includes(brandId));
export const productsForBrand = (brandId: number): Product[] =>
  PRODUCTS.filter((pr) => pr.brandId === brandId);
export const projectsForStudio = (studioId: number): Project[] =>
  PROJECTS.filter((p) => p.studioId === studioId);
export const projectsForProduct = (productId: number): Project[] =>
  PROJECTS.filter((p) => p.productIds.includes(productId));

// "Similar interiors": score by shared type / style / tag overlap.
export function similarProjects(p: Project, limit = 4): Project[] {
  const tags = new Set(p.tags);
  return PROJECTS
    .filter((o) => o.id !== p.id)
    .map((o) => {
      let score = 0;
      if (o.projectType === p.projectType) score += 3;
      if (o.style === p.style) score += 3;
      if (o.studioId === p.studioId) score += 1;
      score += o.tags.filter((t) => tags.has(t)).length;
      return { o, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.o.year - a.o.year)
    .slice(0, limit)
    .map((x) => x.o);
}

// ── Faceted filtering for the Projects index ─────────────────────────────────
export interface ProjectFilters {
  query?: string;
  types?: ProjectType[];
  countries?: string[];
  styles?: string[];
  budgets?: BudgetRange[];
  years?: number[];
}

function matchesProject(p: Project, f: ProjectFilters): boolean {
  if (f.types?.length && !f.types.includes(p.projectType)) return false;
  if (f.countries?.length && !f.countries.includes(p.country)) return false;
  if (f.styles?.length && !f.styles.includes(p.style)) return false;
  if (f.budgets?.length && !f.budgets.includes(p.budgetRange)) return false;
  if (f.years?.length && !f.years.includes(p.year)) return false;
  if (f.query?.trim()) {
    const q = f.query.toLowerCase();
    const studio = studioById.get(p.studioId)?.name ?? '';
    const hay = [
      p.title, p.architect, studio, p.location, p.country, p.style,
      p.projectType, p.description, p.excerpt,
      ...p.tags, ...p.materials, ...p.furniture, ...p.lighting,
      ...brandsForProject(p).map((b) => b.name),
    ].join(' ').toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

export function filterProjects(f: ProjectFilters): Project[] {
  return PROJECTS.filter((p) => matchesProject(p, f));
}

export interface Facet<T> { value: T; count: number }
function countBy<T>(items: Project[], pick: (p: Project) => T): Facet<T>[] {
  const m = new Map<T, number>();
  for (const it of items) m.set(pick(it), (m.get(pick(it)) ?? 0) + 1);
  return [...m.entries()].map(([value, count]) => ({ value, count }));
}

// Facet counts reflect the CURRENT filter result (classic faceted search).
export function computeFacets(filtered: Project[]) {
  const byType = new Map(countBy(filtered, (p) => p.projectType).map((f) => [f.value, f.count]));
  const styles = countBy(filtered, (p) => p.style).sort((a, b) => b.count - a.count);
  const countries = countBy(filtered, (p) => p.country).sort((a, b) => b.count - a.count);
  const budgets = new Map(countBy(filtered, (p) => p.budgetRange).map((f) => [f.value, f.count]));
  const years = countBy(filtered, (p) => p.year).sort((a, b) => b.value - a.value);
  return {
    types: PROJECT_TYPES.map((value) => ({ value, count: byType.get(value) ?? 0 })),
    styles,
    countries,
    budgets: BUDGET_RANGES.map((value) => ({ value, count: budgets.get(value) ?? 0 })),
    years,
  };
}

// ── Global full-text search across all entities ──────────────────────────────
export interface SearchResults {
  projects: Project[];
  products: Product[];
  brands: Brand[];
  studios: DesignStudio[];
}

export function searchAll(query: string): SearchResults {
  const q = query.trim().toLowerCase();
  if (!q) return { projects: [], products: [], brands: [], studios: [] };
  const has = (s: string) => s.toLowerCase().includes(q);
  return {
    projects: PROJECTS.filter((p) =>
      [p.title, p.architect, p.location, p.country, p.style, p.projectType, ...p.tags]
        .some(has) || (studioById.get(p.studioId)?.name ?? '').toLowerCase().includes(q)),
    products: PRODUCTS.filter((pr) =>
      [pr.name, pr.category, pr.country, ...pr.materials].some(has) ||
      (brandById.get(pr.brandId)?.name ?? '').toLowerCase().includes(q)),
    brands: BRANDS.filter((b) => [b.name, b.country, b.description].some(has)),
    studios: STUDIOS.filter((s) => [s.name, s.city, s.country, s.description].some(has)),
  };
}
