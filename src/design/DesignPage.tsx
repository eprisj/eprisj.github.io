import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, X, Loader2, ExternalLink, ArrowDown } from 'lucide-react';
import { CATALOG, CATALOG_BY_ID, SHOP_CATEGORIES, SETS, type CatalogItem, type ShopCategory, type SetDesign } from './catalog';
import { resolveMany, formatPrice, type ResolvedProduct } from './shopApi';

type Resolved = Record<number, ResolvedProduct | null>;

// ── Product modal ─────────────────────────────────────────────────────────────
function ProductModal({ item, data, onClose }: {
  item: CatalogItem; data: ResolvedProduct; onClose: () => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[#0d0408]/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="bg-[#F5F0EB] max-w-3xl w-full max-h-[92vh] overflow-y-auto grid md:grid-cols-2"
      >
        <div className="aspect-square md:aspect-auto bg-[#EDE6DD] min-h-[280px]">
          <img src={data.image} alt={data.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
        </div>
        <div className="p-7 md:p-10 relative flex flex-col">
          <button onClick={onClose} className="absolute top-5 right-5 text-[#501a2c]/30 hover:text-[#501a2c] transition-colors">
            <X size={18} />
          </button>
          <span className="font-mono text-[8px] uppercase tracking-[0.3em] text-[#C9A690]">{item.category} · {data.brand || item.retailer}</span>
          <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[clamp(22px,3vw,36px)] leading-tight text-[#501a2c] mt-3 mb-2">
            {data.title}
          </h2>
          {data.price && <p className="font-mono text-xl font-semibold text-[#501a2c] mb-4">{formatPrice(data)}</p>}
          {data.description && (
            <p className="font-serif text-sm text-[#501a2c]/60 leading-relaxed mb-5 line-clamp-5">{data.description}</p>
          )}
          <div className="flex flex-wrap gap-1.5 mb-7">
            {item.styles.map((s) => (
              <span key={s} className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#501a2c]/45 border border-[#501a2c]/15 px-2 py-0.5">{s}</span>
            ))}
          </div>
          <a
            href={data.url} target="_blank" rel="noopener noreferrer"
            className="mt-auto inline-flex items-center justify-center gap-2 bg-[#501a2c] text-[#F5F0EB] font-mono text-[11px] uppercase tracking-widest px-5 py-4 hover:bg-[#3d1421] transition-colors"
          >
            Shop at {data.siteName || item.retailer} <ArrowUpRight size={13} />
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Small product card (used in shop strip) ───────────────────────────────────
function ProductCard({ item, data, index, onOpen }: {
  item: CatalogItem; data: ResolvedProduct | null | undefined; index: number;
  onOpen: (item: CatalogItem, data: ResolvedProduct) => void;
}) {
  if (data === null) return null;
  const loading = data === undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-4%' }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.06, 0.3) }}
      className="group"
    >
      <button type="button" onClick={() => data && onOpen(item, data)} disabled={loading} className="block w-full text-left">
        <div className="relative aspect-square overflow-hidden bg-[#E8E0D5]">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 size={16} className="animate-spin text-[#501a2c]/20" />
            </div>
          ) : (
            <>
              <img src={data!.image} alt={data!.title} loading="lazy" referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-all duration-700 group-hover:scale-[1.08]" />
              <div className="absolute inset-0 bg-[#1a0812]/0 group-hover:bg-[#1a0812]/25 transition-colors duration-300 flex items-end justify-end p-3 opacity-0 group-hover:opacity-100">
                <span className="font-mono text-[8px] uppercase tracking-widest text-white bg-[#501a2c] px-2 py-1">View</span>
              </div>
            </>
          )}
        </div>
        <div className="mt-2.5 px-0.5">
          <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#501a2c]/40 mb-0.5">{item.category}</p>
          <h3 className="font-serif text-[13px] text-[#501a2c] leading-snug line-clamp-2">{loading ? item.name : data!.title}</h3>
          {data?.price && <p className="font-mono text-xs text-[#501a2c] mt-1 font-medium">{formatPrice(data)}</p>}
        </div>
      </button>
    </motion.div>
  );
}

// ── Hero look (full-viewport first set) ──────────────────────────────────────
function HeroLook({ set, onClick }: { set: SetDesign; onClick: () => void }) {
  return (
    <div className="relative w-full h-[100svh] min-h-[600px] overflow-hidden">
      <img
        src={set.photo} alt={set.title} loading="eager"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0d0408]/80 via-[#0d0408]/20 to-transparent" />

      {/* Top labels */}
      <div className="absolute top-8 left-8 md:left-12">
        <p className="font-mono text-[9px] uppercase tracking-[0.35em] text-white/50">EPRIS · Design</p>
      </div>
      <div className="absolute top-8 right-8 md:right-12">
        <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-white/40">Look 01 of {SETS.length}</span>
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 px-8 md:px-12 pb-10 md:pb-14">
        <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-[#C9A690] mb-3">{set.style} · {set.room}</p>
        <h1 style={{ fontFamily: "'Playfair Display', serif" }}
          className="text-[clamp(48px,8vw,110px)] leading-[0.9] text-white mb-4 max-w-[14ch]">
          {set.title}
        </h1>
        <p className="font-serif text-base md:text-lg text-white/55 italic mb-8 max-w-sm">{set.subtitle}</p>
        <button
          onClick={onClick}
          className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white font-mono text-[10px] uppercase tracking-widest px-6 py-3.5 hover:bg-[#501a2c] hover:border-[#501a2c] transition-all duration-300"
        >
          Shop this look <ArrowUpRight size={13} />
        </button>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-10 right-10 md:right-14 flex flex-col items-center gap-2 opacity-40">
        <ArrowDown size={14} className="text-white animate-bounce" />
      </div>
    </div>
  );
}

// ── Editorial look card (for looks 2-5) ──────────────────────────────────────
function EditorialCard({ set, lookNum, active, onClick, tall }: {
  set: SetDesign; lookNum: number; active: boolean; onClick: () => void; tall?: boolean;
}) {
  return (
    <button
      type="button" onClick={onClick}
      className={`group relative block w-full overflow-hidden text-left ${tall ? 'aspect-[3/4]' : 'aspect-[4/3]'}`}
    >
      <img
        src={set.photo} alt={set.title} loading="lazy"
        className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${active ? 'scale-105 brightness-70' : 'brightness-80 group-hover:scale-105 group-hover:brightness-65'}`}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0d0408]/85 via-transparent to-transparent" />

      {/* Look number */}
      <div className="absolute top-5 left-5">
        <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/40">Look {String(lookNum).padStart(2, '0')}</span>
      </div>

      {active && <div className="absolute top-5 right-5 w-2 h-2 rounded-full bg-[#C9A690]" />}

      {/* Info panel */}
      <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
        <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-[#C9A690] mb-1.5">{set.style}</p>
        <h3 style={{ fontFamily: "'Playfair Display', serif" }}
          className="text-[clamp(22px,2.8vw,36px)] leading-tight text-white mb-3">
          {set.title}
        </h3>
        <div className={`inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest transition-colors ${active ? 'text-[#C9A690]' : 'text-white/40 group-hover:text-[#C9A690]'}`}>
          {active ? '— viewing —' : 'Shop this look'} {!active && <ArrowUpRight size={10} />}
        </div>
      </div>
    </button>
  );
}

// ── Shop the look full reveal ─────────────────────────────────────────────────
function ShopReveal({ set, lookNum, resolved, onOpen, onClose }: {
  set: SetDesign; lookNum: number; resolved: Resolved;
  onOpen: (item: CatalogItem, data: ResolvedProduct) => void;
  onClose: () => void;
}) {
  const items = set.catalogIds.map((id) => CATALOG_BY_ID.get(id)).filter((c): c is CatalogItem => !!c);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden"
    >
      <div className="bg-[#F0E8DF]">
        {/* Look header */}
        <div className="relative h-[45vw] max-h-[520px] min-h-[260px] overflow-hidden">
          <img src={set.photo} alt={set.title} className="absolute inset-0 w-full h-full object-cover brightness-75" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0d0408]/70 to-transparent" />
          <div className="absolute inset-0 flex items-end px-8 md:px-14 pb-10 md:pb-14">
            <div>
              <span className="font-mono text-[9px] uppercase tracking-[0.32em] text-[#C9A690]">Look {String(lookNum).padStart(2,'0')} · {set.style}</span>
              <h2 style={{ fontFamily: "'Playfair Display', serif" }}
                className="text-[clamp(36px,6vw,80px)] leading-[0.92] text-white mt-2 mb-3">
                {set.title}
              </h2>
              <p className="font-serif text-sm md:text-base text-white/55 italic">{set.subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center bg-white/10 backdrop-blur-sm text-white/60 hover:text-white hover:bg-white/20 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Products */}
        <div className="px-6 md:px-14 py-10 md:py-14">
          <div className="flex items-baseline justify-between mb-8">
            <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-[#501a2c]/50">Shop the pieces</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#501a2c]/35">{items.length} items</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {items.map((item, i) => (
              <ProductCard key={item.id} item={item} data={resolved[item.id]} index={i} onOpen={onOpen} />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function DesignPage() {
  const [resolved, setResolved] = useState<Resolved>({});
  const [activeCat, setActiveCat] = useState<ShopCategory | '__all'>('__all');
  const [activeSetId, setActiveSetId] = useState<number | null>(null);
  const [modal, setModal] = useState<{ item: CatalogItem; data: ResolvedProduct } | null>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    resolveMany(CATALOG, (item, data) => {
      if (alive) setResolved((prev) => ({ ...prev, [item.id]: data }));
    });
    return () => { alive = false; };
  }, []);

  const openModal = useCallback((item: CatalogItem, data: ResolvedProduct) => setModal({ item, data }), []);

  const handleSetClick = useCallback((id: number) => {
    if (activeSetId === id) { setActiveSetId(null); return; }
    setActiveSetId(id);
    setTimeout(() => {
      revealRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  }, [activeSetId]);

  const activeSet = useMemo(() => SETS.find((s) => s.id === activeSetId) ?? null, [activeSetId]);
  const activeLookNum = useMemo(() => activeSetId ? SETS.findIndex((s) => s.id === activeSetId) + 1 : 0, [activeSetId]);

  const filtered = useMemo(
    () => (activeCat === '__all' ? CATALOG : CATALOG.filter((c) => c.category === activeCat)),
    [activeCat],
  );

  const [heroSet, ...restSets] = SETS;

  return (
    <div className="bg-[#F5F0EB] min-h-screen">

      {/* ── 1. HERO — full viewport first look ── */}
      <HeroLook set={heroSet} onClick={() => handleSetClick(heroSet.id)} />

      {/* Reveal for hero */}
      <div ref={revealRef} className="scroll-mt-0">
        <AnimatePresence>
          {activeSet?.id === heroSet.id && (
            <ShopReveal key="hero" set={activeSet} lookNum={1} resolved={resolved} onOpen={openModal} onClose={() => setActiveSetId(null)} />
          )}
        </AnimatePresence>
      </div>

      {/* ── 2. EDITORIAL LOOKS GRID ── */}
      <div className="pt-2">
        {/* Row 1: wide + narrow */}
        <div className="grid grid-cols-1 md:grid-cols-[60fr_40fr] gap-px bg-[#1a0812]/8">
          {restSets[0] && (
            <EditorialCard set={restSets[0]} lookNum={2} active={activeSetId === restSets[0].id} onClick={() => handleSetClick(restSets[0].id)} tall />
          )}
          {restSets[1] && (
            <EditorialCard set={restSets[1]} lookNum={3} active={activeSetId === restSets[1].id} onClick={() => handleSetClick(restSets[1].id)} tall />
          )}
        </div>

        {/* Reveal for looks 2–3 */}
        <AnimatePresence>
          {(activeSet?.id === restSets[0]?.id || activeSet?.id === restSets[1]?.id) && activeSet && (
            <ShopReveal key="row1" set={activeSet} lookNum={activeLookNum} resolved={resolved} onOpen={openModal} onClose={() => setActiveSetId(null)} />
          )}
        </AnimatePresence>

        {/* Row 2: narrow + wide */}
        <div className="grid grid-cols-1 md:grid-cols-[40fr_60fr] gap-px bg-[#1a0812]/8">
          {restSets[2] && (
            <EditorialCard set={restSets[2]} lookNum={4} active={activeSetId === restSets[2].id} onClick={() => handleSetClick(restSets[2].id)} />
          )}
          {restSets[3] && (
            <EditorialCard set={restSets[3]} lookNum={5} active={activeSetId === restSets[3].id} onClick={() => handleSetClick(restSets[3].id)} />
          )}
        </div>

        {/* Reveal for looks 4–5 */}
        <AnimatePresence>
          {(activeSet?.id === restSets[2]?.id || activeSet?.id === restSets[3]?.id) && activeSet && (
            <ShopReveal key="row2" set={activeSet} lookNum={activeLookNum} resolved={resolved} onOpen={openModal} onClose={() => setActiveSetId(null)} />
          )}
        </AnimatePresence>
      </div>

      {/* ── 3. THE EDIT — full catalogue ── */}
      <div ref={editRef} className="border-t-2 border-[#501a2c] mt-2">
        <div className="px-6 md:px-12 lg:px-16 pt-12 pb-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.32em] text-[#C9A690] mb-2">Full catalogue</p>
              <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[clamp(42px,7vw,88px)] leading-[0.9] text-[#501a2c]">
                The Edit
              </h2>
            </div>
            {/* Category filter — horizontal on desktop */}
            <div className="hidden md:flex flex-wrap justify-end gap-1.5 max-w-sm mb-1">
              {(['__all', ...SHOP_CATEGORIES] as const).map((cat) => (
                <button key={cat} onClick={() => setActiveCat(cat)}
                  className={`font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 border transition-colors ${
                    activeCat === cat ? 'bg-[#501a2c] text-[#F5F0EB] border-[#501a2c]' : 'border-[#501a2c]/20 text-[#501a2c]/45 hover:border-[#501a2c] hover:text-[#501a2c]'
                  }`}>
                  {cat === '__all' ? 'All' : cat}
                </button>
              ))}
            </div>
          </div>
          {/* Mobile category filter */}
          <div className="flex md:hidden flex-wrap gap-1.5 mt-5">
            {(['__all', ...SHOP_CATEGORIES] as const).map((cat) => (
              <button key={cat} onClick={() => setActiveCat(cat)}
                className={`font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 border transition-colors ${
                  activeCat === cat ? 'bg-[#501a2c] text-[#F5F0EB] border-[#501a2c]' : 'border-[#501a2c]/20 text-[#501a2c]/45'
                }`}>
                {cat === '__all' ? 'All' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Featured first item — large */}
        {filtered.length > 0 && resolved[filtered[0].id] && (
          <motion.div
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="px-6 md:px-12 lg:px-16 mb-8"
          >
            <div className="grid md:grid-cols-2 gap-px bg-[#501a2c]/8">
              <button
                type="button"
                onClick={() => { const d = resolved[filtered[0].id]; if (d) openModal(filtered[0], d); }}
                className="group relative aspect-square overflow-hidden bg-[#E8E0D5] block"
              >
                {resolved[filtered[0].id] && (
                  <>
                    <img src={resolved[filtered[0].id]!.image} alt={filtered[0].name} referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-[#1a0812]/0 group-hover:bg-[#1a0812]/15 transition-colors duration-300" />
                  </>
                )}
              </button>
              <div className="bg-[#EDE6DD] flex flex-col justify-end p-8 md:p-12">
                <span className="font-mono text-[8px] uppercase tracking-[0.3em] text-[#C9A690] mb-3">Featured · {filtered[0].category}</span>
                <h3 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[clamp(28px,4vw,52px)] leading-tight text-[#501a2c] mb-3">
                  {resolved[filtered[0].id]?.title || filtered[0].name}
                </h3>
                {resolved[filtered[0].id]?.price && (
                  <p className="font-mono text-2xl font-semibold text-[#501a2c] mb-4">{formatPrice(resolved[filtered[0].id]!)}</p>
                )}
                <p className="font-serif text-sm text-[#501a2c]/55 leading-relaxed mb-7 line-clamp-3">{resolved[filtered[0].id]?.description}</p>
                <a
                  href={filtered[0].url} target="_blank" rel="noopener noreferrer"
                  className="self-start inline-flex items-center gap-2 bg-[#501a2c] text-[#F5F0EB] font-mono text-[10px] uppercase tracking-widest px-6 py-3.5 hover:bg-[#3d1421] transition-colors"
                >
                  Shop at {filtered[0].retailer} <ArrowUpRight size={12} />
                </a>
              </div>
            </div>
          </motion.div>
        )}

        {/* Rest of catalogue */}
        <div className="px-6 md:px-12 lg:px-16 pb-16">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
            {filtered.slice(1).map((item, i) => (
              <ProductCard key={item.id} item={item} data={resolved[item.id]} index={i} onOpen={openModal} />
            ))}
          </div>
        </div>

        <div className="px-6 md:px-12 lg:px-16 pb-10 border-t border-[#501a2c]/12 pt-6 mt-2">
          <p className="font-mono text-[8px] uppercase tracking-widest text-[#501a2c]/28 flex items-start gap-2 max-w-lg">
            <ExternalLink size={10} className="mt-0.5 shrink-0" />
            Images and prices fetched live from retailer pages. EPRIS doesn't hold stock — Shop links open the maker's site.
          </p>
        </div>
      </div>

      <AnimatePresence>
        {modal && <ProductModal item={modal.item} data={modal.data} onClose={() => setModal(null)} />}
      </AnimatePresence>
    </div>
  );
}
