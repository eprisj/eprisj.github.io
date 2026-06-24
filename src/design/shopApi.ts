// Client layer for the Design shop: resolves real product data live from the
// VPS resolver and asks the AI curator for a board. Resolved data is cached in
// memory + localStorage (12h) so the grid is instant on repeat visits and we
// never hammer the resolver.

import { CATALOG, type CatalogItem } from './catalog';

const API_BASE = 'https://api.eprisjournal.com';
const LS_KEY = 'epris_design_products_v2';
const TTL = 1000 * 60 * 60 * 12;

export interface ResolvedProduct {
  url: string;
  title: string;
  image: string;
  price: string;
  currency: string;
  brand: string;
  siteName: string;
  description: string;
}

type CacheEntry = { data: ResolvedProduct; ts: number };
const mem = new Map<string, ResolvedProduct>();

function loadLS(): Record<string, CacheEntry> {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; }
}
function saveLS(store: Record<string, CacheEntry>) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(store)); } catch { /* quota */ }
}

export async function resolveProduct(url: string): Promise<ResolvedProduct | null> {
  if (mem.has(url)) return mem.get(url)!;
  const store = loadLS();
  const hit = store[url];
  if (hit && Date.now() - hit.ts < TTL && hit.data?.image) {
    mem.set(url, hit.data);
    return hit.data;
  }
  try {
    const r = await fetch(`${API_BASE}/design/resolve?url=${encodeURIComponent(url)}`);
    const j = await r.json();
    if (!j.ok || !j.data?.image) return null;
    const data: ResolvedProduct = j.data;
    mem.set(url, data);
    store[url] = { data, ts: Date.now() };
    saveLS(store);
    return data;
  } catch {
    return null;
  }
}

// Resolve many with a small concurrency cap; calls onItem as each finishes.
export async function resolveMany(
  items: CatalogItem[],
  onItem: (item: CatalogItem, data: ResolvedProduct | null) => void,
  concurrency = 4,
) {
  const queue = [...items];
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length) {
      const item = queue.shift()!;
      const data = await resolveProduct(item.url);
      onItem(item, data);
    }
  });
  await Promise.all(workers);
}

export interface CurateResult {
  ok: boolean;
  title?: string;
  summary?: string;
  picks?: number[];
  notes?: Record<string, string>;
  error?: string;
}

export async function curateBoard(brief: string): Promise<CurateResult> {
  const items = CATALOG.map((c) => ({
    id: c.id, title: c.name, category: c.category,
    style: c.styles.join('/'), room: c.room, price: '',
  }));
  try {
    const r = await fetch(`${API_BASE}/design/curate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief, items }),
    });
    return await r.json();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export function formatPrice(p: ResolvedProduct): string {
  if (!p.price) return '';
  const sym = p.currency === 'USD' ? '$' : p.currency === 'EUR' ? '€' : p.currency === 'GBP' ? '£' : '';
  const num = Number(p.price.replace(/,/g, ''));
  const shown = Number.isFinite(num) ? num.toLocaleString() : p.price;
  return sym ? `${sym}${shown}` : `${shown} ${p.currency}`.trim();
}
