import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Sparkles, X, Loader2, ExternalLink } from 'lucide-react';
import { CATALOG, CATALOG_BY_ID, SHOP_CATEGORIES, type CatalogItem, type ShopCategory } from './catalog';
import { resolveMany, curateBoard, formatPrice, type ResolvedProduct, type CurateResult } from './shopApi';

// ── shared bits ───────────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-[#C9A690]">{children}</span>;
}

type Resolved = Record<number, ResolvedProduct | null>; // id -> data (null = failed)

// ── Product card ──────────────────────────────────────────────────────────────
function ProductCard({
  item, data, index, note, onOpen,
}: {
  item: CatalogItem;
  data: ResolvedProduct | null | undefined;
  index: number;
  note?: string;
  onOpen: (item: CatalogItem, data: ResolvedProduct) => void;
}) {
  const loading = data === undefined;
  const failed = data === null;
  if (failed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-6%' }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.04, 0.2) }}
      className="group"
    >
      <button
        type="button"
        onClick={() => data && onOpen(item, data)}
        className="block w-full text-left"
        disabled={loading}
      >
        <div className="relative aspect-square overflow-hidden bg-[#EDE6DD]">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 size={18} className="animate-spin text-[#501a2c]/25" />
            </div>
          ) : (
            <img
              src={data!.image}
              alt={data!.title}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          )}
          <div className="absolute top-2.5 left-2.5">
            <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#501a2c] bg-[#F5F0EB]/90 backdrop-blur-sm px-2 py-0.5">
              {item.category}
            </span>
          </div>
        </div>
      </button>
      <div className="mt-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-serif text-sm text-[#501a2c] leading-snug line-clamp-1">
            {loading ? item.name : data!.title}
          </h3>
          {data?.price && <span className="font-mono text-xs text-[#501a2c] shrink-0">{formatPrice(data)}</span>}
        </div>
        <p className="font-mono text-[9px] uppercase tracking-widest text-[#501a2c]/40 mt-1">
          {data?.brand || item.retailer}
        </p>
        {note && (
          <p className="font-serif text-xs italic text-[#C9A690] mt-1.5 leading-snug">“{note}”</p>
        )}
      </div>
    </motion.div>
  );
}

// ── Product detail modal ──────────────────────────────────────────────────────
function ProductModal({
  item, data, onClose,
}: {
  item: CatalogItem;
  data: ResolvedProduct;
  onClose: () => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[#1a0812]/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="bg-[#F5F0EB] max-w-4xl w-full max-h-[90vh] overflow-y-auto grid md:grid-cols-2"
      >
        <div className="aspect-square md:aspect-auto bg-[#EDE6DD]">
          <img src={data.image} alt={data.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
        </div>
        <div className="p-7 md:p-9 relative flex flex-col">
          <button onClick={onClose} className="absolute top-4 right-4 text-[#501a2c]/40 hover:text-[#501a2c] transition-colors">
            <X size={20} />
          </button>
          <Label>{item.category} · {data.brand || item.retailer}</Label>
          <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[clamp(24px,3vw,38px)] leading-tight text-[#501a2c] mt-3 mb-3">
            {data.title}
          </h2>
          {data.price && <p className="font-mono text-lg text-[#501a2c] mb-5">{formatPrice(data)}</p>}
          {data.description && (
            <p className="font-serif text-sm text-[#501a2c]/70 leading-relaxed mb-6 line-clamp-6">{data.description}</p>
          )}
          <div className="flex flex-wrap gap-2 mb-7">
            {item.styles.map((s) => (
              <span key={s} className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#501a2c]/55 border border-[#501a2c]/20 px-2 py-0.5">{s}</span>
            ))}
          </div>
          <a
            href={data.url} target="_blank" rel="noopener noreferrer"
            className="mt-auto inline-flex items-center justify-center gap-2 bg-[#501a2c] text-[#F5F0EB] font-mono text-[11px] uppercase tracking-widest px-6 py-4 hover:bg-[#3d1421] transition-colors"
          >
            Shop at {data.siteName || item.retailer} <ArrowUpRight size={14} />
          </a>
          <p className="font-mono text-[8px] uppercase tracking-widest text-[#501a2c]/30 mt-3 text-center">
            Live price from {data.siteName || item.retailer} · opens retailer site
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── AI curator panel ──────────────────────────────────────────────────────────
const ROOM_CHIPS = ['Living room', 'Bedroom', 'Home office', 'Dining', 'Entryway'];
const STYLE_CHIPS = ['Warm minimalism', 'Mid-century', 'Scandinavian', 'Classic & elevated', 'Modern & moody'];
const BUDGET_CHIPS = ['Budget-friendly', 'Mid-range', 'Elevated / no limit'];

function CuratorPanel({
  onResult, onScrollToBoard,
}: {
  onResult: (r: CurateResult) => void;
  onScrollToBoard: () => void;
}) {
  const [room, setRoom] = useState('');
  const [style, setStyle] = useState('');
  const [budget, setBudget] = useState('');
  const [extra, setExtra] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const buildBrief = () => {
    const parts = [];
    if (room) parts.push(`Room: ${room}.`);
    if (style) parts.push(`Style: ${style}.`);
    if (budget) parts.push(`Budget: ${budget}.`);
    if (extra.trim()) parts.push(extra.trim());
    return parts.join(' ');
  };

  const run = async () => {
    const brief = buildBrief();
    if (!brief) { setError('Pick a room or describe what you want.'); return; }
    setError(''); setLoading(true);
    const res = await curateBoard(brief);
    setLoading(false);
    if (!res.ok || !res.picks?.length) {
      setError(res.error ? `Curator unavailable (${res.error}). Try again.` : 'Curator could not build a board — try again.');
      return;
    }
    onResult(res);
    setTimeout(onScrollToBoard, 120);
  };

  const Chip = ({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className={`font-mono text-[10px] uppercase tracking-widest px-3 py-2 border transition-colors ${
        active ? 'bg-[#501a2c] text-[#F5F0EB] border-[#501a2c]' : 'border-[#501a2c]/25 text-[#501a2c]/60 hover:border-[#501a2c] hover:text-[#501a2c]'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="border border-[#501a2c]/20 bg-[#F5F0EB] p-6 md:p-9">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={14} className="text-[#C9A690]" />
        <Label>AI Reference Curator</Label>
      </div>
      <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[clamp(22px,3vw,34px)] text-[#501a2c] leading-tight mb-6">
        Describe the room. Get a shoppable board.
      </h2>

      <div className="space-y-5">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-widest text-[#501a2c]/40 mb-2">Room</p>
          <div className="flex flex-wrap gap-2">
            {ROOM_CHIPS.map((r) => <Chip key={r} label={r} active={room === r} onClick={() => setRoom(room === r ? '' : r)} />)}
          </div>
        </div>
        <div>
          <p className="font-mono text-[9px] uppercase tracking-widest text-[#501a2c]/40 mb-2">Style</p>
          <div className="flex flex-wrap gap-2">
            {STYLE_CHIPS.map((s) => <Chip key={s} label={s} active={style === s} onClick={() => setStyle(style === s ? '' : s)} />)}
          </div>
        </div>
        <div>
          <p className="font-mono text-[9px] uppercase tracking-widest text-[#501a2c]/40 mb-2">Budget</p>
          <div className="flex flex-wrap gap-2">
            {BUDGET_CHIPS.map((b) => <Chip key={b} label={b} active={budget === b} onClick={() => setBudget(budget === b ? '' : b)} />)}
          </div>
        </div>
        <div>
          <p className="font-mono text-[9px] uppercase tracking-widest text-[#501a2c]/40 mb-2">Anything else (optional)</p>
          <textarea
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            rows={2}
            placeholder="e.g. small apartment, lots of natural light, prefer light wood and bouclé…"
            className="w-full bg-transparent border border-[#501a2c]/25 font-serif text-sm text-[#501a2c] placeholder-[#501a2c]/30 focus:outline-none focus:border-[#501a2c] p-3 resize-none"
          />
        </div>
      </div>

      {error && <p className="font-mono text-[10px] text-red-700/70 mt-4">{error}</p>}

      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-[#501a2c] text-[#F5F0EB] font-mono text-[11px] uppercase tracking-widest px-6 py-4 hover:bg-[#3d1421] transition-colors disabled:opacity-60"
      >
        {loading ? <><Loader2 size={14} className="animate-spin" /> Curating your board…</> : <>Curate my board <ArrowRight size={14} /></>}
      </button>
      <p className="font-mono text-[8px] uppercase tracking-widest text-[#501a2c]/30 mt-3 text-center">
        AI selects from {CATALOG.length} real products · live prices · nothing invented
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function DesignPage() {
  const [resolved, setResolved] = useState<Resolved>({});
  const [activeCat, setActiveCat] = useState<ShopCategory | '__all'>('__all');
  const [board, setBoard] = useState<CurateResult | null>(null);
  const [modal, setModal] = useState<{ item: CatalogItem; data: ResolvedProduct } | null>(null);

  // Resolve the whole catalogue live on mount (cached after first load).
  useEffect(() => {
    let alive = true;
    resolveMany(CATALOG, (item, data) => {
      if (alive) setResolved((prev) => ({ ...prev, [item.id]: data }));
    });
    return () => { alive = false; };
  }, []);

  const openModal = useCallback((item: CatalogItem, data: ResolvedProduct) => setModal({ item, data }), []);
  const scrollToBoard = useCallback(() => {
    document.getElementById('epris-board')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const filtered = useMemo(
    () => (activeCat === '__all' ? CATALOG : CATALOG.filter((c) => c.category === activeCat)),
    [activeCat],
  );

  const boardItems = useMemo(
    () => (board?.picks || []).map((id) => CATALOG_BY_ID.get(id)).filter((c): c is CatalogItem => !!c),
    [board],
  );

  return (
    <div className="pt-16 min-h-screen bg-[#F5F0EB]">
      {/* Hero */}
      <div className="border-b border-[#501a2c]/20 px-6 md:px-10 lg:px-16 py-14 md:py-20">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-end">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.32em] text-[#C9A690] mb-5">EPRIS · Design Shop</p>
            <h1 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[clamp(42px,7vw,96px)] leading-[0.95] text-[#501a2c]">
              Source the look
            </h1>
          </div>
          <div className="flex md:justify-end">
            <p className="font-serif text-base md:text-lg text-[#501a2c]/55 leading-relaxed max-w-md">
              Real furniture, real prices, pulled live from the makers. Tell our AI curator about your space and get a shoppable moodboard in seconds — or browse the edit below.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 md:px-10 lg:px-16 py-12 md:py-16">
        {/* Curator */}
        <CuratorPanel onResult={setBoard} onScrollToBoard={scrollToBoard} />

        {/* AI board result */}
        <AnimatePresence>
          {board?.picks?.length ? (
            <motion.section
              id="epris-board"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="mt-14 md:mt-20 scroll-mt-24"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <Label>Your curated board</Label>
                <button onClick={() => setBoard(null)} className="font-mono text-[9px] uppercase tracking-widest text-[#501a2c]/40 hover:text-[#501a2c] flex items-center gap-1 transition-colors">
                  <X size={11} /> Clear
                </button>
              </div>
              {board.title && (
                <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[clamp(26px,4vw,46px)] text-[#501a2c] leading-tight mb-3">
                  {board.title}
                </h2>
              )}
              {board.summary && (
                <p className="font-serif text-base md:text-lg text-[#501a2c]/65 leading-relaxed max-w-2xl mb-8">{board.summary}</p>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-9">
                {boardItems.map((item, i) => (
                  <ProductCard
                    key={item.id}
                    item={item}
                    data={resolved[item.id]}
                    index={i}
                    note={board.notes?.[String(item.id)]}
                    onOpen={openModal}
                  />
                ))}
              </div>
              <div className="border-t border-[#501a2c]/15 mt-12 pt-6" />
            </motion.section>
          ) : null}
        </AnimatePresence>

        {/* Catalogue */}
        <section className="mt-14 md:mt-20">
          <div className="flex items-baseline justify-between gap-4 mb-7">
            <Label>The Edit</Label>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/40">{filtered.length} pieces</span>
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap gap-2 mb-9 font-mono text-[10px] uppercase tracking-widest">
            {(['__all', ...SHOP_CATEGORIES] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCat(cat)}
                className={`px-3.5 py-2 border transition-colors ${
                  activeCat === cat ? 'bg-[#501a2c] text-[#F5F0EB] border-[#501a2c]' : 'border-[#501a2c]/20 text-[#501a2c]/55 hover:border-[#501a2c] hover:text-[#501a2c]'
                }`}
              >
                {cat === '__all' ? 'All' : cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-9">
            {filtered.map((item, i) => (
              <ProductCard key={item.id} item={item} data={resolved[item.id]} index={i} onOpen={openModal} />
            ))}
          </div>
        </section>

        {/* Honest footer note */}
        <div className="mt-16 pt-8 border-t border-[#501a2c]/15">
          <p className="font-mono text-[9px] uppercase tracking-widest text-[#501a2c]/35 leading-relaxed max-w-2xl flex items-start gap-2">
            <ExternalLink size={11} className="mt-0.5 shrink-0" />
            All products, images and prices are fetched live from the retailers' own pages. EPRIS does not sell or hold stock — every “Shop” link opens the maker's site, where the current price and availability apply.
          </p>
        </div>
      </div>

      <AnimatePresence>
        {modal && <ProductModal item={modal.item} data={modal.data} onClose={() => setModal(null)} />}
      </AnimatePresence>
    </div>
  );
}
