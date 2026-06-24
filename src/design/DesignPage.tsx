import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, X, Loader2, ExternalLink, ChevronRight } from 'lucide-react';
import { CATALOG, CATALOG_BY_ID, SHOP_CATEGORIES, SETS, type CatalogItem, type ShopCategory, type SetDesign } from './catalog';
import { resolveMany, formatPrice, type ResolvedProduct } from './shopApi';

function Label({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-[#C9A690]">{children}</span>;
}

type Resolved = Record<number, ResolvedProduct | null>;

// ── Product card ──────────────────────────────────────────────────────────────
function ProductCard({
  item, data, index, onOpen,
}: {
  item: CatalogItem;
  data: ResolvedProduct | null | undefined;
  index: number;
  onOpen: (item: CatalogItem, data: ResolvedProduct) => void;
}) {
  const loading = data === undefined;
  if (data === null) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-4%' }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.05, 0.25) }}
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
              <Loader2 size={16} className="animate-spin text-[#501a2c]/20" />
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
          <div className="absolute top-2 left-2">
            <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#501a2c] bg-[#F5F0EB]/90 backdrop-blur-sm px-2 py-0.5">
              {item.category}
            </span>
          </div>
        </div>
      </button>
      <div className="mt-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-serif text-sm text-[#501a2c] leading-snug line-clamp-1">
            {loading ? item.name : data!.title}
          </h3>
          {data?.price && (
            <span className="font-mono text-xs text-[#501a2c] shrink-0">{formatPrice(data)}</span>
          )}
        </div>
        <p className="font-mono text-[9px] uppercase tracking-widest text-[#501a2c]/40 mt-0.5">
          {data?.brand || item.retailer}
        </p>
      </div>
    </motion.div>
  );
}

// ── Product modal ─────────────────────────────────────────────────────────────
function ProductModal({ item, data, onClose }: {
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
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="bg-[#F5F0EB] max-w-3xl w-full max-h-[90vh] overflow-y-auto grid md:grid-cols-2"
      >
        <div className="aspect-square md:aspect-auto bg-[#EDE6DD]">
          <img src={data.image} alt={data.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
        </div>
        <div className="p-7 md:p-9 relative flex flex-col">
          <button onClick={onClose} className="absolute top-4 right-4 text-[#501a2c]/35 hover:text-[#501a2c] transition-colors">
            <X size={18} />
          </button>
          <Label>{item.category} · {data.brand || item.retailer}</Label>
          <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[clamp(22px,3vw,34px)] leading-tight text-[#501a2c] mt-3 mb-2">
            {data.title}
          </h2>
          {data.price && <p className="font-mono text-base text-[#501a2c] mb-4">{formatPrice(data)}</p>}
          {data.description && (
            <p className="font-serif text-sm text-[#501a2c]/65 leading-relaxed mb-5 line-clamp-5">{data.description}</p>
          )}
          <div className="flex flex-wrap gap-1.5 mb-6">
            {item.styles.map((s) => (
              <span key={s} className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#501a2c]/50 border border-[#501a2c]/18 px-2 py-0.5">{s}</span>
            ))}
          </div>
          <a
            href={data.url} target="_blank" rel="noopener noreferrer"
            className="mt-auto inline-flex items-center justify-center gap-2 bg-[#501a2c] text-[#F5F0EB] font-mono text-[11px] uppercase tracking-widest px-5 py-3.5 hover:bg-[#3d1421] transition-colors"
          >
            Shop at {data.siteName || item.retailer} <ArrowUpRight size={13} />
          </a>
          <p className="font-mono text-[8px] uppercase tracking-widest text-[#501a2c]/28 mt-2.5 text-center">
            Opens {data.siteName || item.retailer} · live price applies
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Set-design card ───────────────────────────────────────────────────────────
function SetCard({ set, active, onClick }: {
  set: SetDesign;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative group block w-full text-left overflow-hidden"
    >
      <div className="aspect-[4/3] overflow-hidden bg-[#2a1018]">
        <img
          src={set.photo}
          alt={set.title}
          loading="lazy"
          className={`w-full h-full object-cover transition-all duration-700 ${
            active ? 'scale-105 brightness-75' : 'brightness-85 group-hover:scale-105 group-hover:brightness-75'
          }`}
        />
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#1a0812]/80 via-[#1a0812]/15 to-transparent" />

      <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
        <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-[#C9A690] mb-1.5">{set.style} · {set.room}</p>
        <h3 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[clamp(20px,2.5vw,30px)] leading-tight text-white mb-1">
          {set.title}
        </h3>
        <p className="font-serif text-[13px] text-white/60 italic leading-snug mb-3">{set.subtitle}</p>
        <div className={`inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest transition-colors ${
          active ? 'text-[#C9A690]' : 'text-white/50 group-hover:text-[#C9A690]'
        }`}>
          {active ? 'Viewing the look' : 'Shop this look'}
          <ChevronRight size={11} className={`transition-transform ${active ? 'rotate-90' : ''}`} />
        </div>
      </div>

      {active && (
        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#C9A690]" />
      )}
    </button>
  );
}

// ── Shop This Look strip ──────────────────────────────────────────────────────
function ShopThisLook({ set, resolved, onOpen, onClose }: {
  set: SetDesign;
  resolved: Resolved;
  onOpen: (item: CatalogItem, data: ResolvedProduct) => void;
  onClose: () => void;
}) {
  const items = set.catalogIds.map((id) => CATALOG_BY_ID.get(id)).filter((c): c is CatalogItem => !!c);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden"
    >
      <div className="bg-[#EDE6DD] px-6 md:px-10 lg:px-16 py-10 md:py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <Label>Shop this look</Label>
              <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[clamp(24px,3vw,40px)] text-[#501a2c] leading-tight mt-1">
                {set.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="font-mono text-[9px] uppercase tracking-widest text-[#501a2c]/40 hover:text-[#501a2c] flex items-center gap-1 transition-colors mt-1 shrink-0"
            >
              <X size={11} /> Close
            </button>
          </div>
          <p className="font-serif text-sm italic text-[#501a2c]/55 mb-8">{set.subtitle}</p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-5 gap-y-8">
            {items.map((item, i) => (
              <ProductCard
                key={item.id}
                item={item}
                data={resolved[item.id]}
                index={i}
                onOpen={onOpen}
              />
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
  const lookRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    resolveMany(CATALOG, (item, data) => {
      if (alive) setResolved((prev) => ({ ...prev, [item.id]: data }));
    });
    return () => { alive = false; };
  }, []);

  const openModal = useCallback((item: CatalogItem, data: ResolvedProduct) => setModal({ item, data }), []);

  const handleSetClick = useCallback((id: number) => {
    if (activeSetId === id) {
      setActiveSetId(null);
      return;
    }
    setActiveSetId(id);
    setTimeout(() => {
      lookRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }, [activeSetId]);

  const activeSet = useMemo(() => SETS.find((s) => s.id === activeSetId) ?? null, [activeSetId]);

  const filtered = useMemo(
    () => (activeCat === '__all' ? CATALOG : CATALOG.filter((c) => c.category === activeCat)),
    [activeCat],
  );

  return (
    <div className="pt-16 min-h-screen bg-[#F5F0EB]">

      {/* Hero */}
      <div className="border-b border-[#501a2c]/15 px-6 md:px-10 lg:px-16 py-12 md:py-16">
        <div className="max-w-6xl mx-auto grid md:grid-cols-[1fr_auto] gap-6 items-end">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.32em] text-[#C9A690] mb-4">EPRIS · Design</p>
            <h1 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[clamp(42px,7vw,88px)] leading-[0.92] text-[#501a2c]">
              Real rooms.<br />Real things.
            </h1>
          </div>
          <p className="font-serif text-sm text-[#501a2c]/50 leading-relaxed max-w-xs">
            Curated interiors, sourced to the last detail. Pick a room — shop every piece in it.
          </p>
        </div>
      </div>

      {/* Set-designs grid */}
      <div className="px-6 md:px-10 lg:px-16 pt-10 md:pt-14 pb-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-baseline justify-between mb-6">
            <Label>Curated rooms</Label>
            <span className="font-mono text-[9px] uppercase tracking-widest text-[#501a2c]/35">{SETS.length} compositions</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[#501a2c]/10">
            {SETS.map((set) => (
              <SetCard
                key={set.id}
                set={set}
                active={activeSetId === set.id}
                onClick={() => handleSetClick(set.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Shop This Look — slides open below the grid */}
      <div ref={lookRef} className="scroll-mt-20">
        <AnimatePresence>
          {activeSet && (
            <ShopThisLook
              key={activeSet.id}
              set={activeSet}
              resolved={resolved}
              onOpen={openModal}
              onClose={() => setActiveSetId(null)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* The Edit — full catalogue */}
      <div className="max-w-6xl mx-auto px-6 md:px-10 lg:px-16 py-14 md:py-20">

        <div className="flex items-baseline justify-between gap-4 mb-2">
          <Label>The Edit</Label>
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/35">{filtered.length} pieces</span>
        </div>
        <p className="font-serif text-sm text-[#501a2c]/50 mb-7">Everything in the shop. Filter by category.</p>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-9 font-mono text-[10px] uppercase tracking-widest">
          {(['__all', ...SHOP_CATEGORIES] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              className={`px-3.5 py-2 border transition-colors ${
                activeCat === cat
                  ? 'bg-[#501a2c] text-[#F5F0EB] border-[#501a2c]'
                  : 'border-[#501a2c]/20 text-[#501a2c]/50 hover:border-[#501a2c] hover:text-[#501a2c]'
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

        <div className="mt-14 pt-7 border-t border-[#501a2c]/12">
          <p className="font-mono text-[9px] uppercase tracking-widest text-[#501a2c]/30 leading-relaxed max-w-xl flex items-start gap-2">
            <ExternalLink size={10} className="mt-0.5 shrink-0" />
            Images and prices fetched live from each retailer. EPRIS does not hold stock — every Shop link opens the maker's own site.
          </p>
        </div>
      </div>

      <AnimatePresence>
        {modal && <ProductModal item={modal.item} data={modal.data} onClose={() => setModal(null)} />}
      </AnimatePresence>

    </div>
  );
}
