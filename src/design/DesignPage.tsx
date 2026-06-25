import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, X, Loader2, ExternalLink, ArrowRight, Sparkles } from 'lucide-react';
import { CATALOG, CATALOG_BY_ID, SHOP_CATEGORIES, SETS, type CatalogItem, type ShopCategory, type SetDesign } from './catalog';
import { resolveMany, curateBoard, localCurate, formatPrice, parseBudget, type ResolvedProduct, type CurateResult, type StylistBrief } from './shopApi';
import { getUI, getLook, getRoomLabel, STYLIST_ROOMS, STYLIST_STYLES, STYLIST_BUDGETS } from './designI18n';

type Resolved = Record<number, ResolvedProduct | null>;

// ── Product modal ─────────────────────────────────────────────────────────────
function ProductModal({ item, data, onClose, lang }: {
  item: CatalogItem; data: ResolvedProduct; onClose: () => void; lang: string;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 32, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        className="bg-[#0d0408] max-w-3xl w-full max-h-[92vh] overflow-y-auto grid md:grid-cols-2"
      >
        <div className="aspect-square md:aspect-auto min-h-[260px] bg-[#1a0a12] flex items-center justify-center">
          <img src={data.image} alt={data.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
        </div>
        <div className="p-8 md:p-10 relative flex flex-col bg-[#0d0408]">
          <button onClick={onClose} className="absolute top-5 right-5 text-white/20 hover:text-white transition-colors">
            <X size={18} />
          </button>
          <span className="font-mono text-[8px] uppercase tracking-[0.35em] text-[#C9A690]/70">{item.category} · {data.brand || item.retailer}</span>
          <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[clamp(20px,2.8vw,34px)] leading-tight text-white mt-3 mb-2">
            {data.title}
          </h2>
          {data.price && <p className="font-mono text-2xl font-bold text-[#C9A690] mb-4">{formatPrice(data)}</p>}
          {data.description && (
            <p className="text-sm text-white/40 leading-relaxed mb-6 line-clamp-4">{data.description}</p>
          )}
          <div className="flex flex-wrap gap-1.5 mb-8">
            {item.styles.map((s) => (
              <span key={s} className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/25 border border-white/10 px-2 py-0.5">{s}</span>
            ))}
          </div>
          <a
            href={data.url} target="_blank" rel="noopener noreferrer"
            className="mt-auto inline-flex items-center justify-center gap-2 bg-white text-[#0d0408] font-mono text-[10px] uppercase tracking-widest px-5 py-4 hover:bg-[#C9A690] transition-colors"
          >
            {getUI(lang).shopAt} {data.siteName || item.retailer} <ArrowUpRight size={12} />
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Dark product card (for The Edit section) ──────────────────────────────────
function DarkProductCard({ item, data, index, onOpen }: {
  item: CatalogItem; data: ResolvedProduct | null | undefined; index: number;
  onOpen: (item: CatalogItem, data: ResolvedProduct) => void;
}) {
  if (data === null) return null;
  const loading = data === undefined;

  return (
    <motion.div
      initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-5%' }}
      transition={{ duration: 0.6, delay: Math.min(index * 0.05, 0.3) }}
      className="group"
    >
      <button type="button" onClick={() => data && onOpen(item, data)} disabled={loading} className="block w-full text-left">
        <div className={`relative overflow-hidden bg-[#1a0a12] ${item.category === 'Art' ? 'aspect-[3/4]' : 'aspect-square'}`}>
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 size={14} className="animate-spin text-white/15" />
            </div>
          ) : (
            <>
              <img src={data!.image} alt={data!.title} loading="lazy" referrerPolicy="no-referrer"
                className="w-full h-full object-cover opacity-85 transition-all duration-700 group-hover:opacity-100 group-hover:scale-[1.06]" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between p-3 bg-gradient-to-t from-black/80 to-transparent">
                <span className="font-mono text-[8px] uppercase tracking-wider text-white/70 leading-none">{formatPrice(data!) || '—'}</span>
                <ArrowUpRight size={12} className="text-[#C9A690]" />
              </div>
            </>
          )}
        </div>
        <div className="mt-3 px-0.5">
          <p className="font-mono text-[7px] uppercase tracking-[0.25em] text-[#C9A690]/50 mb-1">{item.category}</p>
          <h3 className="font-serif text-sm text-white/80 leading-snug line-clamp-2 group-hover:text-white transition-colors">
            {loading ? item.name : data!.title}
          </h3>
        </div>
      </button>
    </motion.div>
  );
}

// ── Horizontal product strip in look panels ───────────────────────────────────
function LookProductStrip({ set, resolved, onOpen, lang }: {
  set: SetDesign; resolved: Resolved;
  onOpen: (item: CatalogItem, data: ResolvedProduct) => void; lang: string;
}) {
  const ui = getUI(lang);
  const items = set.catalogIds.map((id) => CATALOG_BY_ID.get(id)).filter((c): c is CatalogItem => !!c);
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="border-t border-white/8"
    >
      <div className="flex items-center justify-between px-6 md:px-10 py-4">
        <p className="font-mono text-[8px] uppercase tracking-[0.32em] text-white/35">{ui.shopPieces} · {items.length} {ui.items}</p>
        <div className="flex gap-1">
          <button onClick={() => scrollRef.current?.scrollBy({ left: -280, behavior: 'smooth' })}
            className="w-7 h-7 border border-white/12 text-white/30 hover:text-white hover:border-white/30 transition-colors flex items-center justify-center font-mono text-xs">←</button>
          <button onClick={() => scrollRef.current?.scrollBy({ left: 280, behavior: 'smooth' })}
            className="w-7 h-7 border border-white/12 text-white/30 hover:text-white hover:border-white/30 transition-colors flex items-center justify-center font-mono text-xs">→</button>
        </div>
      </div>
      <div ref={scrollRef} className="flex gap-px overflow-x-auto scrollbar-hide pl-6 md:pl-10 pr-6">
        {items.map((item) => {
          const data = resolved[item.id];
          return (
            <button key={item.id} type="button"
              onClick={() => data && onOpen(item, data)}
              disabled={!data}
              className="group shrink-0 w-48 md:w-56 text-left pb-6"
            >
              <div className="relative aspect-square overflow-hidden bg-[#1a0a12] mb-3">
                {data === undefined ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 size={12} className="animate-spin text-white/15" />
                  </div>
                ) : data === null ? null : (
                  <>
                    <img src={data.image} alt={data.title} referrerPolicy="no-referrer" loading="lazy"
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-[1.05] transition-all duration-500" />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 flex items-center justify-center">
                      <ArrowUpRight size={20} className="text-white" />
                    </div>
                  </>
                )}
              </div>
              <p className="font-mono text-[7px] uppercase tracking-widest text-[#C9A690]/50 mb-0.5">{item.category}</p>
              <p className="font-serif text-xs text-white/65 group-hover:text-white transition-colors line-clamp-2 leading-snug">
                {data?.title || item.name}
              </p>
              {data?.price && <p className="font-mono text-xs text-white/50 mt-1">{formatPrice(data)}</p>}
            </button>
          );
        })}
        {/* Spacer */}
        <div className="shrink-0 w-4" />
      </div>
    </motion.div>
  );
}

// ── Single look panel ─────────────────────────────────────────────────────────
function LookPanel({ set, lookIndex, activeId, onSelect, resolved, onOpen, lang }: {
  set: SetDesign; lookIndex: number; activeId: number | null;
  onSelect: (id: number) => void; resolved: Resolved;
  onOpen: (item: CatalogItem, data: ResolvedProduct) => void; lang: string;
}) {
  const ui = getUI(lang);
  const look = getLook(set.id, lang);
  const num = String(lookIndex + 1).padStart(2, '0');
  const isEven = lookIndex % 2 === 0;
  const isActive = activeId === set.id;

  return (
    <div className="w-full">
      {/* Panel */}
      <div
        className={`relative grid grid-cols-1 md:grid-cols-2 min-h-[70vh] md:min-h-[80vh] cursor-pointer group ${isActive ? 'md:min-h-[85vh]' : ''}`}
        style={{ direction: isEven ? 'ltr' : 'rtl' }}
        onClick={() => onSelect(set.id)}
      >
        {/* Photo side */}
        <div className="relative overflow-hidden min-h-[50vw] md:min-h-0" style={{ direction: 'ltr' }}>
          <img
            src={set.photo} alt={set.title} loading="lazy"
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${isActive ? 'scale-[1.03] brightness-60' : 'brightness-75 group-hover:scale-[1.02] group-hover:brightness-65'}`}
          />
          {/* Look number — huge background watermark */}
          <div className="absolute inset-0 flex items-end justify-end p-6 md:p-10 overflow-hidden pointer-events-none">
            <span
              className="font-mono font-bold leading-none text-white select-none pointer-events-none"
              style={{ fontSize: 'clamp(120px, 22vw, 280px)', opacity: 0.07, lineHeight: 1, letterSpacing: '-0.05em' }}
            >{num}</span>
          </div>
          {/* Active indicator */}
          {isActive && (
            <div className="absolute top-5 left-5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C9A690] animate-pulse" />
              <span className="font-mono text-[8px] uppercase tracking-widest text-[#C9A690]">{ui.viewing}</span>
            </div>
          )}
        </div>

        {/* Text side */}
        <div
          className={`relative flex flex-col justify-end p-8 md:p-12 lg:p-16 ${isActive ? 'bg-[#100610]' : 'bg-[#0d0408] group-hover:bg-[#12060e]'} transition-colors duration-500`}
          style={{ direction: 'ltr' }}
        >
          {/* Big number */}
          <span
            className="font-mono font-bold leading-none text-white/5 absolute top-0 right-0 select-none pointer-events-none overflow-hidden"
            style={{ fontSize: 'clamp(100px, 18vw, 240px)', lineHeight: 1, letterSpacing: '-0.06em', top: '-0.1em' }}
          >{num}</span>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1 max-w-12 bg-[#C9A690]/30" />
              <span className="font-mono text-[8px] uppercase tracking-[0.35em] text-[#C9A690]/60">Look {num}</span>
            </div>
            <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-white/55 mb-3">{set.style} · {set.room}</p>
            <h2
              style={{ fontFamily: "'Playfair Display', serif" }}
              className="text-[clamp(36px,5.5vw,72px)] leading-[0.93] text-white mb-5"
            >{look.title || set.title}</h2>
            <p className="font-serif italic text-base md:text-lg text-white/70 mb-5 max-w-xs">{look.subtitle || set.subtitle}</p>
            <p className="text-sm text-white/75 leading-relaxed mb-8 max-w-sm">{look.story || set.story}</p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSelect(set.id); }}
              className={`inline-flex items-center gap-3 border font-mono text-[9px] uppercase tracking-[0.28em] px-6 py-3.5 transition-all duration-300 ${
                isActive
                  ? 'border-[#C9A690]/60 text-[#C9A690] hover:bg-[#C9A690]/10'
                  : 'border-white/30 text-white/70 hover:border-[#C9A690] hover:text-[#C9A690]'
              }`}
            >
              {isActive ? ui.closeLook : ui.shopThisLook} <ArrowRight size={11} />
            </button>
          </div>
        </div>
      </div>

      {/* Product strip — slides open */}
      <AnimatePresence>
        {isActive && (
          <div className="bg-[#100610]">
            <LookProductStrip set={set} resolved={resolved} onOpen={onOpen} lang={lang} />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── AI Stylist panel ──────────────────────────────────────────────────────────
const ROLE_ORDER: Record<string, number> = { anchor: 0, support: 1, accent: 2 };

function RoleBadge({ role, ui }: { role: string; ui: ReturnType<typeof getUI> }) {
  const label = role === 'anchor' ? ui.roleAnchor : role === 'accent' ? ui.roleAccent : ui.roleSupport;
  const tone = role === 'anchor'
    ? 'text-[#0d0408] bg-[#C9A690]'
    : role === 'accent'
      ? 'text-[#C9A690] border border-[#C9A690]/40'
      : 'text-white/45 border border-white/15';
  return (
    <span className={`font-mono text-[7px] uppercase tracking-[0.2em] px-2 py-0.5 ${tone}`}>{label}</span>
  );
}

function StylistPanel({ resolved, onOpen, lang }: {
  resolved: Resolved;
  onOpen: (item: CatalogItem, data: ResolvedProduct) => void;
  lang: string;
}) {
  const ui = getUI(lang);
  const [room, setRoom] = useState<string | null>(null);
  const [styles, setStyles] = useState<string[]>([]);
  const [budget, setBudget] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [refining, setRefining] = useState(false);
  const [result, setResult] = useState<CurateResult | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const runRef = useRef(0);

  const toggleStyle = (s: string) =>
    setStyles((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : prev.length < 3 ? [...prev, s] : prev);

  const canSubmit = !!(room || styles.length || text.trim());

  // Progressive: show a strong local board instantly, then upgrade to the AI
  // composition once it returns (free models can be slow under load).
  const handleSubmit = async () => {
    if (!canSubmit || loading) return;
    const run = ++runRef.current;
    const brief: StylistBrief = {
      text: text.trim(),
      room: room || undefined,
      styles: styles.length ? styles.map((s) => s.toLowerCase()) : undefined,
      budget: budget || parseBudget(text) || undefined,
    };
    setLoading(true);
    setResult(null);
    // instant local board
    const local = localCurate(brief, resolved);
    setResult(local);
    setLoading(false);
    setRefining(true);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    // background AI upgrade
    try {
      const ai = await curateBoard(brief, resolved);
      if (run === runRef.current && ai.ok && ai.source === 'ai') setResult(ai);
    } finally {
      if (run === runRef.current) setRefining(false);
    }
  };

  const reset = () => { runRef.current++; setResult(null); setRefining(false); setRoom(null); setStyles([]); setBudget(null); setText(''); };

  const picks = result?.ok
    ? (result.picks || [])
        .map((p) => ({ pick: p, item: CATALOG_BY_ID.get(p.id) }))
        .filter((x): x is { pick: typeof x.pick; item: CatalogItem } => !!x.item)
        .sort((a, b) => (ROLE_ORDER[a.pick.role] ?? 1) - (ROLE_ORDER[b.pick.role] ?? 1))
    : [];

  const effBudget = budget || (result && parseBudget(text)) || 0;
  const overBudget = !!(effBudget && result?.total && result.total > effBudget);

  return (
    <div className="border-b border-white/5 bg-[#0a0306]">
      <div className="px-6 md:px-12 lg:px-16 py-12 md:py-16">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="h-px w-6 bg-[#C9A690]/40" />
          <Sparkles size={9} className="text-[#C9A690]/50" />
          <span className="font-mono text-[8px] uppercase tracking-[0.4em] text-[#C9A690]/60">{ui.stylistLabel}</span>
        </div>
        <h2
          style={{ fontFamily: "'Playfair Display', serif" }}
          className="text-[clamp(32px,6vw,80px)] leading-[0.92] text-white mb-3"
        >{ui.stylistTitle}</h2>
        <p className="text-sm text-white/30 mb-9 max-w-md leading-relaxed">{ui.stylistSub}</p>

        {/* ── Structured brief builder ── */}
        <div className="max-w-2xl space-y-6">
          {/* Room */}
          <div>
            <p className="font-mono text-[8px] uppercase tracking-[0.3em] text-white/35 mb-2.5">{ui.stylistRoom}</p>
            <div className="flex flex-wrap gap-2">
              {STYLIST_ROOMS.map((r) => {
                const on = room === r.key;
                return (
                  <button key={r.key} onClick={() => setRoom(on ? null : r.key)}
                    className={`font-mono text-[9px] uppercase tracking-wider px-3.5 py-2 border transition-all duration-200 ${on ? 'bg-[#C9A690] text-[#0d0408] border-[#C9A690]' : 'text-white/40 border-white/10 hover:border-[#C9A690]/35 hover:text-[#C9A690]/60'}`}>
                    {getRoomLabel(r.key, lang)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Style */}
          <div>
            <p className="font-mono text-[8px] uppercase tracking-[0.3em] text-white/35 mb-2.5">{ui.stylistStyle} <span className="text-white/45">· max 3</span></p>
            <div className="flex flex-wrap gap-2">
              {STYLIST_STYLES.map((s) => {
                const on = styles.includes(s);
                return (
                  <button key={s} onClick={() => toggleStyle(s)}
                    className={`font-mono text-[9px] uppercase tracking-wider px-3.5 py-2 border transition-all duration-200 ${on ? 'bg-white text-[#0d0408] border-white' : 'text-white/40 border-white/10 hover:border-white/30 hover:text-white/70'}`}>
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Budget */}
          <div>
            <p className="font-mono text-[8px] uppercase tracking-[0.3em] text-white/35 mb-2.5">{ui.stylistBudget}</p>
            <div className="flex flex-wrap gap-2">
              {STYLIST_BUDGETS.map((b) => {
                const on = budget === b;
                const label = b === 0 ? ui.stylistAnyBudget : `$${b.toLocaleString()}`;
                return (
                  <button key={b} onClick={() => setBudget(on ? null : b)}
                    className={`font-mono text-[9px] uppercase tracking-wider px-3.5 py-2 border transition-all duration-200 ${on ? 'bg-[#C9A690] text-[#0d0408] border-[#C9A690]' : 'text-white/40 border-white/10 hover:border-[#C9A690]/35 hover:text-[#C9A690]/60'}`}>
                    {b === 0 ? label : `≤ ${label}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Freeform refine */}
          <div className="border border-white/10 focus-within:border-[#C9A690]/40 transition-colors duration-300">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={ui.stylistRefine}
              rows={2}
              className="w-full bg-transparent text-white text-sm px-5 py-4 resize-none outline-none placeholder:text-white/40 font-sans leading-relaxed"
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSubmit(); } }}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className="inline-flex items-center gap-2.5 bg-[#C9A690] text-[#0d0408] font-mono text-[9px] uppercase tracking-widest px-7 py-3.5 hover:bg-white transition-colors duration-200 disabled:opacity-25 disabled:cursor-not-allowed"
          >
            {loading
              ? <><Loader2 size={11} className="animate-spin" /> {ui.stylistLoading}</>
              : <>{ui.stylistCompose} <ArrowRight size={11} /></>}
          </button>
        </div>

        {/* Error */}
        {result && !result.ok && (
          <p className="mt-6 font-mono text-[9px] uppercase tracking-wider text-red-400/50">
            {result.error || 'Something went wrong'}
          </p>
        )}

        {/* ── Curated board with reasoning ── */}
        {result?.ok && picks.length > 0 && (
          <motion.div
            ref={resultRef}
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mt-14 border-t border-white/8 pt-12"
          >
            {/* Concept header */}
            <div className="grid md:grid-cols-[1.4fr_1fr] gap-8 md:gap-12 mb-12">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <p className="font-mono text-[7px] uppercase tracking-[0.35em] text-[#C9A690]/45">{ui.stylistConcept}</p>
                  {refining ? (
                    <span className="inline-flex items-center gap-1.5 font-mono text-[7px] uppercase tracking-[0.2em] text-white/30">
                      <Loader2 size={9} className="animate-spin" /> AI
                    </span>
                  ) : (
                    <span className="font-mono text-[7px] uppercase tracking-[0.2em] text-[#C9A690]/40 border border-[#C9A690]/20 px-1.5 py-0.5">
                      {result.source === 'ai' ? 'AI-composed' : "Stylist's pick"}
                    </span>
                  )}
                </div>
                <h3
                  style={{ fontFamily: "'Playfair Display', serif" }}
                  className="text-[clamp(26px,4.4vw,56px)] leading-[1.02] text-white mb-4"
                >{result.title}</h3>
                <p className="text-sm md:text-[15px] text-white/40 max-w-lg leading-relaxed">{result.concept}</p>
              </div>

              <div className="space-y-7 md:pt-7">
                {/* Palette */}
                {result.palette && result.palette.length > 0 && (
                  <div>
                    <p className="font-mono text-[7px] uppercase tracking-[0.3em] text-white/30 mb-2.5">{ui.stylistPalette}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                      {result.palette.map((c) => (
                        <span key={c} className="font-serif text-xs text-white/55 flex items-center gap-1.5">
                          <span className="inline-block w-2 h-2 rounded-full" style={{ background: swatch(c) }} />
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {/* Total + budget verdict */}
                {result.total != null && result.total > 0 && (
                  <div>
                    <p className="font-mono text-[7px] uppercase tracking-[0.3em] text-white/30 mb-1.5">{ui.stylistEstimate}</p>
                    <p className="flex items-baseline gap-2.5">
                      <span style={{ fontFamily: "'Playfair Display', serif" }} className="text-3xl text-white">${result.total.toLocaleString()}</span>
                      {effBudget > 0 && (
                        <span className={`font-mono text-[8px] uppercase tracking-wider px-2 py-0.5 ${overBudget ? 'text-red-300/70 border border-red-400/30' : 'text-[#C9A690] border border-[#C9A690]/35'}`}>
                          {overBudget ? `over $${effBudget.toLocaleString()}` : `within $${effBudget.toLocaleString()}`}
                        </span>
                      )}
                    </p>
                    {result.budgetNote && <p className="text-[11px] text-white/30 leading-relaxed mt-2 max-w-xs">{result.budgetNote}</p>}
                  </div>
                )}
              </div>
            </div>

            {/* Picks — image + role + reasoning */}
            <p className="font-mono text-[7px] uppercase tracking-[0.35em] text-white/30 mb-5">{ui.stylistWhy} · {picks.length} {ui.items}</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-9">
              {picks.map(({ pick, item }, i) => (
                <div key={item.id} className="flex gap-4">
                  <div className="w-24 sm:w-28 shrink-0">
                    <DarkProductCard item={item} data={resolved[item.id]} index={i} onOpen={onOpen} />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center gap-2 mb-2">
                      <RoleBadge role={pick.role} ui={ui} />
                      {resolved[item.id]?.price && (
                        <span className="font-mono text-[8px] text-white/35">{formatPrice(resolved[item.id]!)}</span>
                      )}
                    </div>
                    <p className="text-[13px] text-white/45 leading-relaxed">{pick.reason}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Styling tips */}
            {result.tips && result.tips.length > 0 && (
              <div className="mt-12 border-t border-white/8 pt-8">
                <p className="font-mono text-[7px] uppercase tracking-[0.35em] text-[#C9A690]/45 mb-4">{ui.stylistTips}</p>
                <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
                  {result.tips.map((tip, i) => (
                    <li key={i} className="flex gap-2.5 text-[13px] text-white/40 leading-relaxed">
                      <span className="font-mono text-[#C9A690]/40 text-[10px] pt-0.5">{String(i + 1).padStart(2, '0')}</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={reset}
              className="mt-10 font-mono text-[8px] uppercase tracking-widest text-white/20 hover:text-[#C9A690]/55 transition-colors border border-white/8 hover:border-[#C9A690]/25 px-4 py-2 duration-200"
            >
              {ui.stylistTryAgain}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// Map a palette word to a rough swatch colour for the dots.
function swatch(word: string): string {
  const w = word.toLowerCase();
  if (/brass|gold|honey|amber/.test(w)) return '#b8925a';
  if (/oat|bone|cream|linen|warm white|beige|greige/.test(w)) return '#d8cbb8';
  if (/clay|terracotta|rust|warm/.test(w)) return '#b08365';
  if (/oak|wood|ash|natural/.test(w)) return '#a98c6b';
  if (/ink|charcoal|black|moody|dark/.test(w)) return '#2a2530';
  if (/sage|green|olive/.test(w)) return '#7e8a6f';
  if (/blue|navy|slate/.test(w)) return '#5a6b7e';
  return '#9a8f86';
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function DesignPage({ lang = 'EN' }: { lang?: string }) {
  const ui = getUI(lang);
  const [resolved, setResolved] = useState<Resolved>({});
  const [activeCat, setActiveCat] = useState<ShopCategory | '__all'>('__all');
  const [activeSetId, setActiveSetId] = useState<number | null>(null);
  const [modal, setModal] = useState<{ item: CatalogItem; data: ResolvedProduct } | null>(null);
  const stripRef = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    let alive = true;
    resolveMany(CATALOG, (item, data) => {
      if (alive) setResolved((prev) => ({ ...prev, [item.id]: data }));
    });
    return () => { alive = false; };
  }, []);

  const openModal = useCallback((item: CatalogItem, data: ResolvedProduct) => setModal({ item, data }), []);

  const handleSetClick = useCallback((id: number) => {
    setActiveSetId((prev) => {
      if (prev === id) return null;
      setTimeout(() => {
        const el = stripRef.current.get(id);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
      return id;
    });
  }, []);

  const filtered = useMemo(
    () => (activeCat === '__all' ? CATALOG : CATALOG.filter((c) => c.category === activeCat)),
    [activeCat],
  );

  return (
    <div className="bg-[#0d0408] min-h-screen">

      {/* ── MASTHEAD ── */}
      <div className="relative overflow-hidden border-b border-white/5">
        {/* Huge background word */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none select-none">
          <span
            className="font-mono font-bold uppercase text-white leading-none"
            style={{ fontSize: 'clamp(100px, 28vw, 400px)', opacity: 0.025, letterSpacing: '-0.04em', whiteSpace: 'nowrap' }}
          >DESIGN</span>
        </div>

        <div className="relative z-10 px-6 md:px-12 lg:px-16 pt-10 pb-12 md:pt-14 md:pb-16">
          <div className="flex items-start justify-between gap-8">
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="h-px w-8 bg-[#C9A690]/40" />
                <span className="font-mono text-[8px] uppercase tracking-[0.4em] text-[#C9A690]/60">EPRIS · Journal</span>
              </div>
              <h1
                style={{ fontFamily: "'Playfair Display', serif" }}
                className="text-[clamp(48px,10vw,140px)] leading-[0.88] text-white"
              >{ui.masthead}<br />{ui.masthead2}</h1>
            </div>
            <div className="hidden lg:block text-right mt-4">
              <p className="font-mono text-[8px] uppercase tracking-[0.3em] text-white/55 leading-relaxed">
                {SETS.length} {ui.looksBelow.split(' ').slice(1).join(' ')}<br />
                {CATALOG.length} real products<br />
                IKEA · HAY · Muuto · CB2<br />
                Ferm Living · West Elm · Amazon
              </p>
            </div>
          </div>
          {/* Intro — 2 paragraphs explaining the section */}
          <div className="mt-10 grid md:grid-cols-2 gap-6 md:gap-12 max-w-4xl">
            <p className="text-[15px] text-white/70 leading-relaxed">{ui.intro1}</p>
            <p className="text-[15px] text-white/70 leading-relaxed">{ui.intro2}</p>
          </div>

          {/* Divider */}
          <div className="mt-10 flex items-center gap-4">
            <div className="h-px flex-1 bg-white/6" />
            <span className="font-mono text-[7px] uppercase tracking-[0.4em] text-white/45">{SETS.length} {ui.looksBelow}</span>
          </div>
        </div>
      </div>

      {/* ── AI STYLIST ── */}
      <StylistPanel resolved={resolved} onOpen={openModal} lang={lang} />

      {/* ── LOOKS — alternating panels ── */}
      <div>
        {SETS.map((set, i) => (
          <div key={set.id} ref={(el) => { if (el) stripRef.current.set(set.id, el); }}>
            <LookPanel
              set={set} lookIndex={i} activeId={activeSetId}
              onSelect={handleSetClick} resolved={resolved} onOpen={openModal} lang={lang}
            />
            {i < SETS.length - 1 && <div className="h-px bg-white/5" />}
          </div>
        ))}
      </div>

      {/* ── THE EDIT — dark catalogue ── */}
      <div className="border-t border-white/5 mt-0">
        {/* Section header */}
        <div className="relative overflow-hidden border-b border-white/5">
          <span
            className="absolute right-0 top-1/2 -translate-y-1/2 font-mono font-bold text-white leading-none select-none pointer-events-none"
            style={{ fontSize: 'clamp(80px, 18vw, 220px)', opacity: 0.03, letterSpacing: '-0.05em', right: '-0.05em' }}
          >SHOP</span>
          <div className="relative z-10 px-6 md:px-12 lg:px-16 py-10 md:py-14">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px w-6 bg-[#C9A690]/40" />
                  <span className="font-mono text-[8px] uppercase tracking-[0.4em] text-[#C9A690]/60">{ui.catalogKicker}</span>
                </div>
                <h2
                  style={{ fontFamily: "'Playfair Display', serif" }}
                  className="text-[clamp(40px,8vw,100px)] leading-[0.9] text-white"
                >{ui.catalogTitle}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['__all', ...SHOP_CATEGORIES] as const).map((cat) => (
                  <button key={cat} onClick={() => setActiveCat(cat)}
                    className={`font-mono text-[8px] uppercase tracking-[0.22em] px-3.5 py-2 border transition-all duration-200 ${
                      activeCat === cat
                        ? 'border-[#C9A690] text-[#C9A690] bg-[#C9A690]/8'
                        : 'border-white/10 text-white/30 hover:border-white/30 hover:text-white/60'
                    }`}>
                    {cat === '__all' ? ui.allFilter : cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Featured item */}
        {filtered.length > 0 && (
          <div className="border-b border-white/5">
            <div className="grid md:grid-cols-[55fr_45fr]">
              {/* Large photo */}
              <button type="button"
                onClick={() => { const d = resolved[filtered[0].id]; if (d) openModal(filtered[0], d); }}
                className="group relative aspect-[4/3] md:aspect-auto md:min-h-[480px] overflow-hidden bg-[#1a0a12] block"
              >
                {resolved[filtered[0].id] ? (
                  <>
                    <img
                      src={resolved[filtered[0].id]!.image} alt={filtered[0].name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-[1.04] transition-all duration-700"
                    />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20 flex items-center justify-center">
                      <span className="font-mono text-[9px] uppercase tracking-widest text-white border border-white/30 px-4 py-2">{ui.quickView}</span>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 size={20} className="animate-spin text-white/15" />
                  </div>
                )}
              </button>

              {/* Info */}
              <div className="flex flex-col justify-between p-8 md:p-12 lg:p-14 border-l border-white/5">
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-[0.35em] text-[#C9A690]/60 mb-4">{ui.featuredLabel} · {filtered[0].category}</p>
                  <h3
                    style={{ fontFamily: "'Playfair Display', serif" }}
                    className="text-[clamp(26px,3.5vw,48px)] leading-tight text-white mb-3"
                  >{resolved[filtered[0].id]?.title || filtered[0].name}</h3>
                  {resolved[filtered[0].id]?.price && (
                    <p className="font-mono text-2xl md:text-3xl font-bold text-[#C9A690] mb-5">{formatPrice(resolved[filtered[0].id]!)}</p>
                  )}
                  <p className="text-sm text-white/30 leading-relaxed line-clamp-3 mb-6">
                    {resolved[filtered[0].id]?.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-8">
                    {filtered[0].styles.map((s) => (
                      <span key={s} className="font-mono text-[7px] uppercase tracking-widest text-white/20 border border-white/8 px-2 py-0.5">{s}</span>
                    ))}
                  </div>
                </div>
                <a
                  href={filtered[0].url} target="_blank" rel="noopener noreferrer"
                  className="self-start inline-flex items-center gap-2 bg-white text-[#0d0408] font-mono text-[10px] uppercase tracking-widest px-6 py-4 hover:bg-[#C9A690] transition-colors"
                >
                  {ui.shopAt} {filtered[0].retailer} <ArrowUpRight size={12} />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="px-6 md:px-12 lg:px-16 py-10 md:py-14">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {filtered.slice(1).map((item, i) => (
              <DarkProductCard key={item.id} item={item} data={resolved[item.id]} index={i} onOpen={openModal} />
            ))}
          </div>
        </div>

        {/* Footer note */}
        <div className="px-6 md:px-12 lg:px-16 pb-12 border-t border-white/5 pt-6">
          <p className="font-mono text-[7px] uppercase tracking-widest text-white/45 flex items-start gap-2 max-w-md">
            <ExternalLink size={9} className="mt-0.5 shrink-0" />
            {ui.priceNote}
          </p>
        </div>
      </div>

      <AnimatePresence>
        {modal && <ProductModal item={modal.item} data={modal.data} onClose={() => setModal(null)} lang={lang} />}
      </AnimatePresence>
    </div>
  );
}
