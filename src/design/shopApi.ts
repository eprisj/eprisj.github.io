// Client layer for the Design shop: resolves real product data live from the
// VPS resolver and asks the AI curator for a board. Resolved data is cached in
// memory + localStorage (12h) so the grid is instant on repeat visits and we
// never hammer the resolver.

import { CATALOG, CATALOG_BY_ID, type CatalogItem, type ShopCategory } from './catalog';

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

// ── Stylist: structured brief → curated board with real reasoning ─────────────

export interface StylistBrief {
  text: string;              // freeform description
  room?: string;             // 'living' | 'bedroom' | 'office' | 'dining' | 'entry'
  styles?: string[];         // chosen style tags
  budget?: number;           // USD cap, 0/undefined = no cap
}

export type PickRole = 'anchor' | 'support' | 'accent';

export interface Pick {
  id: number;
  role: PickRole;
  reason: string;            // a real justifying sentence
}

export interface CurateResult {
  ok: boolean;
  title?: string;
  concept?: string;          // the design vision, 2–3 sentences
  palette?: string[];        // 3–5 colour / material words
  picks?: Pick[];            // ordered, with role + reasoning
  total?: number;            // estimated total (USD), computed from real prices
  budgetNote?: string;       // budget verdict prose
  tips?: string[];           // styling tips
  source?: 'ai' | 'local';
  error?: string;
}

// Pull a budget number out of freeform text: "$800", "800$", "budget 1,200",
// "до 800", "under 1500", "€900". Returns 0 if none found.
export function parseBudget(text: string): number {
  if (!text) return 0;
  const m = text.match(/(?:[$€£]|budget|under|до|менее|бюджет)\s*([\d][\d.,\s]{1,8})|([\d][\d.,\s]{1,8})\s*(?:[$€£]|usd|eur|долл|грн)/i);
  const raw = m && (m[1] || m[2]);
  if (!raw) return 0;
  const n = Number(raw.replace(/[\s,]/g, ''));
  return Number.isFinite(n) && n > 30 ? Math.round(n) : 0;
}

function numericPrice(p: ResolvedProduct | null | undefined): number {
  if (!p?.price) return 0;
  const n = Number(p.price.replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

// Sum the real resolved prices for a set of picks. Items without a scrapable
// price contribute 0 (honest — we never invent numbers).
export function boardTotal(ids: number[], resolved: Record<number, ResolvedProduct | null>): number {
  return ids.reduce((sum, id) => sum + numericPrice(resolved[id]), 0);
}

export async function curateBoard(
  brief: StylistBrief,
  resolved: Record<number, ResolvedProduct | null>,
): Promise<CurateResult> {
  // Send the AI a relevance-ranked shortlist (not the whole catalogue): a
  // smaller, focused prompt is faster and yields tighter boards. We keep enough
  // variety by ensuring every category that scored is represented.
  const shortlist = scoreCatalog(brief, resolved).slice(0, 22).map((s) => s.c);
  const items = shortlist.map((c) => {
    const r = resolved[c.id];
    const price = numericPrice(r);
    return {
      id: c.id,
      title: r?.title || c.name,
      category: c.category,
      style: c.styles.join('/'),
      room: c.room,
      retailer: c.retailer,
      price: price || '',
    };
  });

  // The AI path is best, but the backend tries several free models in sequence
  // and can be slow. Race it against a timeout so the reader always gets a board
  // quickly — the deterministic local stylist is a strong fallback.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 28000);
  try {
    const res = await fetch(`${API_BASE}/design/curate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief, items }),
      signal: ctrl.signal,
    });
    const j = await res.json();
    const norm = normalizeCurate(j);
    if (norm.ok && norm.picks && norm.picks.length >= 4) {
      norm.source = 'ai';
      norm.total = boardTotal(norm.picks.map((p) => p.id), resolved);
      // Backfill any missing reasons from the local generator so no card is bare.
      norm.picks = norm.picks.map((p) =>
        p.reason ? p : { ...p, reason: localReason(p.id, p.role, brief) });
      return norm;
    }
    // AI returned something thin/broken → fall back to the local stylist.
    return localCurate(brief, resolved);
  } catch {
    return localCurate(brief, resolved);
  } finally {
    clearTimeout(timer);
  }
}

function localReason(id: number, role: PickRole, brief: StylistBrief): string {
  const c = CATALOG_BY_ID.get(id);
  return c ? reasonFor(c, role, inferRoom(brief)) : '';
}

// Accept either the new rich schema or the legacy {picks:number[], notes:{}} one.
function normalizeCurate(j: any): CurateResult {
  if (!j || j.ok === false) return { ok: false, error: j?.error };
  let picks: Pick[] = [];
  if (Array.isArray(j.picks) && j.picks.length && typeof j.picks[0] === 'object') {
    picks = j.picks
      .map((p: any): Pick => ({
        id: Number(p.id),
        role: (['anchor', 'support', 'accent'].includes(p.role) ? p.role : 'support') as PickRole,
        reason: String(p.reason || '').trim(),
      }))
      .filter((p: Pick) => CATALOG_BY_ID.has(p.id));
  } else if (Array.isArray(j.picks)) {
    picks = j.picks
      .map(Number)
      .filter((id: number) => CATALOG_BY_ID.has(id))
      .map((id: number, i: number): Pick => ({
        id,
        role: i === 0 ? 'anchor' : 'support',
        reason: (j.notes && j.notes[String(id)]) || '',
      }));
  }
  return {
    ok: picks.length > 0,
    title: j.title,
    concept: j.concept || j.summary,
    palette: Array.isArray(j.palette) ? j.palette.slice(0, 5) : undefined,
    picks,
    budgetNote: j.budgetNote,
    tips: Array.isArray(j.tips) ? j.tips.slice(0, 4) : undefined,
  };
}

// ── Local stylist: deterministic scoring so a board always appears, even if
// the AI is unreachable. Scores every catalogue item against the brief, keeps a
// category-balanced selection inside budget, and writes a reasoning line each.
const ROOM_WORDS: Record<string, string[]> = {
  living: ['living', 'lounge', 'sitting', 'family', 'гостин', 'salon', 'salotto', 'wohnzimmer'],
  bedroom: ['bedroom', 'bed', 'sleep', 'спальн', 'camera', 'schlaf', 'dormitor', 'night', 'master'],
  office: ['office', 'study', 'work', 'desk', 'кабинет', 'офис', 'studio', 'arbeits', 'home office'],
  dining: ['dining', 'dinner', 'kitchen', 'столов', 'кухн', 'esszimmer', 'sala da pranzo', 'eat'],
  entry: ['entry', 'hall', 'hallway', 'foyer', 'прихож', 'коридор', 'eingang', 'ingresso'],
  outdoor: ['outdoor', 'balcony', 'terrace', 'patio', 'балкон', 'terras', 'garden'],
};

function inferRoom(brief: StylistBrief): string | null {
  if (brief.room) return brief.room;
  const t = brief.text.toLowerCase();
  for (const [room, words] of Object.entries(ROOM_WORDS)) {
    if (words.some((w) => t.includes(w))) return room;
  }
  return null;
}

function briefStyleTokens(brief: StylistBrief): string[] {
  const fromChips = (brief.styles || []).map((s) => s.toLowerCase());
  const fromText = brief.text.toLowerCase().match(/[a-zа-яё-]{3,}/gi) || [];
  return Array.from(new Set([...fromChips, ...fromText]));
}

function reasonFor(c: CatalogItem, role: PickRole, room: string | null): string {
  const style = c.styles[0] || 'considered';
  const anchorL = [
    `The anchor — its ${style} presence sets the tone for everything else.`,
    `Start here: a ${style} ${c.category.toLowerCase().replace(/s$/, '')} the rest of the room can lean on.`,
  ];
  const supportL = [
    `${cap(style)} lines that echo the anchor without competing with it.`,
    `Carries the ${style} language across the room and keeps the eye moving.`,
    `A quiet workhorse — ${style}, useful, never loud.`,
  ];
  const accentL = [
    `The finishing note: a ${style} accent that makes the board feel intentional.`,
    `Small, deliberate, ${style} — the detail people notice last and remember most.`,
  ];
  const pool = role === 'anchor' ? anchorL : role === 'accent' ? accentL : supportL;
  const base = pool[(c.id + (room ? room.length : 0)) % pool.length];
  return room ? base.replace('the room', `the ${room}`) : base;
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

// Anchor categories lead a board; accents finish it.
const ANCHOR_CATS: ShopCategory[] = ['Sofas', 'Armchairs', 'Beds', 'Dining', 'Storage', 'Tables'];
const ACCENT_CATS: ShopCategory[] = ['Art', 'Mirrors', 'Rugs', 'Textiles', 'Lighting', 'Outdoor'];

// Relevance score of every catalogue item against the brief (room + style +
// price availability). Shared by the AI shortlist and the local stylist.
export function scoreCatalog(
  brief: StylistBrief,
  resolved: Record<number, ResolvedProduct | null>,
): { c: CatalogItem; score: number }[] {
  const room = inferRoom(brief);
  const tokens = briefStyleTokens(brief);
  return CATALOG.map((c) => {
    let score = 1;
    if (room && c.room === room) score += 4;
    const styleHits = c.styles.filter((s) => tokens.some((t) => s.includes(t) || t.includes(s))).length;
    score += styleHits * 3;
    if (numericPrice(resolved[c.id]) > 0) score += 0.5; // nudge toward priced items
    return { c, score };
  }).sort((a, b) => b.score - a.score);
}

export function localCurate(
  brief: StylistBrief,
  resolved: Record<number, ResolvedProduct | null>,
): CurateResult {
  const room = inferRoom(brief);
  const tokens = briefStyleTokens(brief);
  const budget = brief.budget || parseBudget(brief.text);

  const scored = scoreCatalog(brief, resolved);

  // Category-balanced greedy pick within budget.
  const perCat = new Map<ShopCategory, number>();
  const chosen: CatalogItem[] = [];
  let spend = 0;
  const maxPerCat = 2;
  const budgetCap = budget ? budget * 1.04 : Infinity; // tiny tolerance

  for (const { c } of scored) {
    if (chosen.length >= 8) break;
    if ((perCat.get(c.category) || 0) >= maxPerCat) continue;
    const price = numericPrice(resolved[c.id]);
    if (budget && spend + price > budgetCap && chosen.length >= 4) continue;
    chosen.push(c);
    perCat.set(c.category, (perCat.get(c.category) || 0) + 1);
    spend += price;
  }
  // Guarantee at least 6 items if catalogue allows (relax budget last).
  if (chosen.length < 6) {
    for (const { c } of scored) {
      if (chosen.length >= 6) break;
      if (chosen.includes(c)) continue;
      chosen.push(c);
    }
  }

  // Order: anchors first, accents last.
  chosen.sort((a, b) => {
    const ra = ANCHOR_CATS.includes(a.category) ? 0 : ACCENT_CATS.includes(a.category) ? 2 : 1;
    const rb = ANCHOR_CATS.includes(b.category) ? 0 : ACCENT_CATS.includes(b.category) ? 2 : 1;
    return ra - rb;
  });

  const picks: Pick[] = chosen.map((c, i) => {
    const role: PickRole = i === 0 && ANCHOR_CATS.includes(c.category)
      ? 'anchor'
      : ACCENT_CATS.includes(c.category) ? 'accent' : 'support';
    return { id: c.id, role, reason: reasonFor(c, role, room) };
  });

  const total = boardTotal(picks.map((p) => p.id), resolved);
  const styleLabel = (brief.styles && brief.styles[0]) || tokens.find((t) => t.length > 4) || 'considered';
  const roomLabel = room ? cap0(room) : 'space';

  let budgetNote: string | undefined;
  if (budget) {
    budgetNote = total <= budget
      ? `Comes in around $${total.toLocaleString()} — inside your $${budget.toLocaleString()} budget, with room left for textiles and the small things.`
      : `Around $${total.toLocaleString()} as shown; a touch over $${budget.toLocaleString()}. Drop the accent piece or swap to the budget option to land under.`;
  }

  return {
    ok: picks.length > 0,
    source: 'local',
    title: `${cap0(styleLabel)} ${roomLabel}`,
    concept: `A ${styleLabel} ${roomLabel.toLowerCase()} built around one strong anchor, then layered with pieces that share its material language. Balanced across seating, light and surface so the room reads as composed rather than collected.`,
    palette: paletteFor(tokens, room),
    picks,
    total,
    budgetNote,
    tips: [
      'Buy the anchor first — let every later choice answer to it.',
      'Keep to two or three materials so the room feels intentional.',
      'Layer light at three heights: floor, table, and overhead.',
    ],
  };
}

function cap0(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

function paletteFor(tokens: string[], room: string | null): string[] {
  const has = (w: string) => tokens.some((t) => t.includes(w));
  const out: string[] = [];
  if (has('warm') || has('cozy') || has('boho')) out.push('Warm oat', 'Soft clay');
  else if (has('dark') || has('moody') || has('industrial')) out.push('Ink', 'Charcoal');
  else out.push('Bone white', 'Soft greige');
  if (has('mid-century') || has('wood') || has('natural')) out.push('Honey oak');
  else out.push('Pale ash');
  out.push(has('gold') || has('elevated') ? 'Aged brass' : 'Matte black');
  if (room === 'bedroom') out.push('Muted linen');
  return Array.from(new Set(out)).slice(0, 5);
}

export function formatPrice(p: ResolvedProduct): string {
  if (!p.price) return '';
  const sym = p.currency === 'USD' ? '$' : p.currency === 'EUR' ? '€' : p.currency === 'GBP' ? '£' : '';
  const num = Number(p.price.replace(/,/g, ''));
  const shown = Number.isFinite(num) ? num.toLocaleString() : p.price;
  return sym ? `${sym}${shown}` : `${shown} ${p.currency}`.trim();
}
