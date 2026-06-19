import { useState, useRef, useMemo, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { ArrowUpRight, ArrowLeft, Mail, Instagram, ArrowDown, MoveHorizontal, Check, Copy } from 'lucide-react';
import type { Studio, StudioProject } from '../data';

type T = (key: string) => string;

// ─── Before / After comparison slider ────────────────────────────────────────

function BeforeAfter({ before, after, t }: { before: string; after: string; t: T }) {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const setFromClientX = useCallback((clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, pct)));
  }, []);

  return (
    <div
      ref={ref}
      className="relative aspect-[16/10] md:aspect-[2/1] bg-[#1a0812] overflow-hidden select-none cursor-ew-resize"
      onPointerDown={(e) => { dragging.current = true; try { (e.target as Element).setPointerCapture?.(e.pointerId); } catch { /* capture optional */ } setFromClientX(e.clientX); }}
      onPointerMove={(e) => { if (dragging.current) setFromClientX(e.clientX); }}
      onPointerUp={() => { dragging.current = false; }}
      onPointerLeave={() => { dragging.current = false; }}
    >
      {/* After (full) */}
      <img src={after} alt={t('studio.case.after')} className="absolute inset-0 w-full h-full object-cover pointer-events-none" draggable={false} />
      {/* Before (clipped to the left of the handle) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ width: `${pos}%` }}>
        <img
          src={before}
          alt={t('studio.case.before')}
          className="absolute inset-0 h-full object-cover max-w-none"
          style={{ width: ref.current ? ref.current.clientWidth : '100%' }}
          draggable={false}
        />
      </div>
      {/* Labels */}
      <span className="absolute top-3 left-3 bg-[#1a0812]/70 text-[#F5F0EB] font-mono text-[9px] uppercase tracking-[0.2em] px-2.5 py-1 pointer-events-none">{t('studio.case.before')}</span>
      <span className="absolute top-3 right-3 bg-[#1a0812]/70 text-[#F5F0EB] font-mono text-[9px] uppercase tracking-[0.2em] px-2.5 py-1 pointer-events-none">{t('studio.case.after')}</span>
      {/* Handle */}
      <div className="absolute top-0 bottom-0 w-[2px] bg-[#F5F0EB] pointer-events-none" style={{ left: `${pos}%` }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#F5F0EB] text-[#501a2c] flex items-center justify-center shadow-lg">
          <MoveHorizontal size={16} />
        </div>
      </div>
    </div>
  );
}

// Local scroll-reveal (Reveal in App.tsx isn't exported)
function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-8%' }}
      transition={{ duration: 0.5, delay: Math.min(delay, 0.3), ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Project case view ───────────────────────────────────────────────────────

function CaseView({ project, t, onBack }: { project: StudioProject; t: T; onBack: () => void }) {
  const gallery = project.gallery && project.gallery.length ? project.gallery : [project.imageUrl];
  return (
    <motion.div
      key={`case-${project.id}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35 }}
      className="pt-16 min-h-screen bg-[#F5F0EB]"
    >
      {/* Lead image */}
      <div className="relative aspect-[16/9] md:aspect-[2/1] bg-[#1a0812] overflow-hidden">
        <img src={gallery[0]} alt={project.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a0812]/80 via-transparent to-transparent" />
        <button
          type="button"
          onClick={onBack}
          className="absolute top-5 left-4 sm:left-8 flex items-center gap-2 px-4 py-2 font-mono text-[10px] uppercase tracking-widest bg-[#F5F0EB]/90 text-[#501a2c] hover:bg-[#F5F0EB] transition-colors"
        >
          <ArrowLeft size={13} /> {t('studio.case.back')}
        </button>
        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-8 md:px-16 pb-6 md:pb-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#C9A690] mb-2">{project.category}</p>
          <h1 className="font-serif text-4xl md:text-6xl text-[#F5F0EB] leading-none">{project.title}</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 md:px-16 py-12 md:py-20">
        {/* Meta + description */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-16 mb-14 md:mb-20">
          <div className="md:col-span-1 space-y-6">
            {[
              ['studio.case.location', project.location],
              ['studio.case.year', project.year],
              ['studio.case.role', project.role],
            ]
              .filter(([, v]) => !!v)
              .map(([labelKey, value]) => (
                <div key={labelKey} className="border-t border-[#501a2c]/20 pt-3">
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#501a2c]/40 mb-1">{t(labelKey as string)}</p>
                  <p className="font-serif text-lg text-[#501a2c]">{value}</p>
                </div>
              ))}
          </div>
          <div className="md:col-span-2">
            {project.description && (
              <>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#501a2c]/40 mb-4">{t('studio.case.about')}</p>
                <p className="font-serif text-xl md:text-2xl text-[#501a2c]/80 leading-relaxed">{project.description}</p>
              </>
            )}
          </div>
        </div>

        {/* Before / After */}
        {project.beforeImage && (
          <Reveal className="mb-14 md:mb-20">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#501a2c]/40 mb-4">{t('studio.case.beforeafter')}</p>
            <BeforeAfter before={project.beforeImage} after={project.imageUrl} t={t} />
          </Reveal>
        )}

        {/* Materials + Process */}
        {((project.materials && project.materials.length > 0) || (project.caseSteps && project.caseSteps.length > 0)) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-16 mb-14 md:mb-20">
            {project.materials && project.materials.length > 0 && (
              <Reveal className="md:col-span-1">
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#501a2c]/40 mb-4">{t('studio.case.materials')}</p>
                <div className="flex flex-wrap gap-2">
                  {project.materials.map((m, i) => (
                    <span key={i} className="border border-[#501a2c]/25 px-3 py-1.5 font-serif text-sm text-[#501a2c]/75">{m}</span>
                  ))}
                </div>
              </Reveal>
            )}
            {project.caseSteps && project.caseSteps.length > 0 && (
              <Reveal className="md:col-span-2">
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#501a2c]/40 mb-5">{t('studio.case.process')}</p>
                <div className="space-y-5">
                  {project.caseSteps.map((step, i) => (
                    <div key={i} className="flex gap-4 border-t border-[#501a2c]/15 pt-4">
                      <span className="font-mono text-[11px] text-[#C9A690] shrink-0 mt-1">0{i + 1}</span>
                      <div>
                        <h4 className="font-serif text-lg text-[#501a2c] mb-1">{step.title}</h4>
                        <p className="font-serif text-sm text-[#501a2c]/65 leading-relaxed">{step.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Reveal>
            )}
          </div>
        )}

        {/* Gallery */}
        {gallery.length > 1 && (
          <div className="space-y-6 md:space-y-10">
            {gallery.slice(1).map((src, i) => (
              <Reveal key={i}>
                <div className="aspect-[4/3] bg-[#1a0812] overflow-hidden shadow-md">
                  <img src={src} alt={`${project.title} — ${i + 2}`} className="w-full h-full object-cover" />
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── "Start a project" brief form (no backend — composes a mailto) ────────────

const BRIEF_TYPES = ['Apartment', 'House', 'Commercial', 'Single room', 'Styling only'];
const BRIEF_BUDGETS = ['Under €10k', '€10–30k', '€30–60k', '€60k+', 'To discuss'];

function BriefForm({ studio, t }: { studio: Studio; t: T }) {
  const [form, setForm] = useState({ name: '', email: '', type: '', area: '', budget: '', timeline: '', message: '' });
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const buildBrief = () =>
    [
      `${t('studio.brief.name')}: ${form.name}`,
      `${t('studio.brief.email')}: ${form.email}`,
      `${t('studio.brief.type')}: ${form.type}`,
      `${t('studio.brief.area')}: ${form.area}`,
      `${t('studio.brief.budget')}: ${form.budget}`,
      `${t('studio.brief.timeline')}: ${form.timeline}`,
      '',
      `${t('studio.brief.message')}:`,
      form.message,
    ].join('\n');

  const handleSend = () => {
    if (!form.name.trim() || !form.email.trim()) { setError(true); return; }
    setError(false);
    const subject = `${t('studio.brief.kicker')} — ${form.name}`;
    const to = studio.email || '';
    const href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(buildBrief())}`;
    // Most reliable cross-device mailto: create hidden anchor and click it.
    // This avoids navigation away from the page (window.location.href quirk) and
    // works on iOS Safari even when no default mail app is configured — the OS
    // shows a picker. Falls back to visible email address on the same click.
    const a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setSent(true);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildBrief());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  const field = 'w-full bg-transparent border border-[#501a2c]/25 px-4 py-3 font-serif text-[#501a2c] focus:border-[#501a2c] focus:outline-none transition-colors placeholder:text-[#501a2c]/35';
  const label = 'font-mono text-[9px] uppercase tracking-[0.2em] text-[#501a2c]/45 mb-2 block';

  return (
    <section className="px-6 sm:px-10 md:px-16 py-16 md:py-28 border-t border-[#501a2c]/15 bg-[#E8DED5]/40">
      <Reveal className="max-w-3xl mx-auto">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#C9A690] mb-3">{t('studio.brief.kicker')}</p>
        <h2 className="font-serif text-3xl md:text-5xl text-[#501a2c] mb-3 leading-tight">{t('studio.brief.title')}</h2>
        <p className="font-serif text-base text-[#501a2c]/60 mb-10">{t('studio.brief.desc')}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <span className={label}>{t('studio.brief.name')}</span>
            <input className={field} value={form.name} onChange={set('name')} />
          </div>
          <div>
            <span className={label}>{t('studio.brief.email')}</span>
            <input type="email" className={field} value={form.email} onChange={set('email')} />
          </div>
          <div>
            <span className={label}>{t('studio.brief.type')} <span className="text-[#501a2c]/30">· {t('studio.brief.optional')}</span></span>
            <select className={field} value={form.type} onChange={set('type')}>
              <option value="">{t('studio.brief.choose')}</option>
              {BRIEF_TYPES.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <span className={label}>{t('studio.brief.budget')} <span className="text-[#501a2c]/30">· {t('studio.brief.optional')}</span></span>
            <select className={field} value={form.budget} onChange={set('budget')}>
              <option value="">{t('studio.brief.choose')}</option>
              {BRIEF_BUDGETS.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <span className={label}>{t('studio.brief.area')} <span className="text-[#501a2c]/30">· {t('studio.brief.optional')}</span></span>
            <input className={field} value={form.area} onChange={set('area')} placeholder="—" />
          </div>
          <div>
            <span className={label}>{t('studio.brief.timeline')} <span className="text-[#501a2c]/30">· {t('studio.brief.optional')}</span></span>
            <input className={field} value={form.timeline} onChange={set('timeline')} placeholder="—" />
          </div>
          <div className="sm:col-span-2">
            <span className={label}>{t('studio.brief.message')} <span className="text-[#501a2c]/30">· {t('studio.brief.optional')}</span></span>
            <textarea className={`${field} min-h-[120px] resize-y`} value={form.message} onChange={set('message')} />
          </div>
        </div>

        {error && <p className="font-mono text-[10px] uppercase tracking-widest text-[#8B3A3A] mt-4">{t('studio.brief.required')}</p>}

        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <button
            type="button"
            onClick={handleSend}
            className="flex items-center justify-center gap-3 px-8 py-4 font-mono text-xs uppercase tracking-widest bg-[#501a2c] text-[#F5F0EB] hover:bg-[#3d1421] transition-colors w-full sm:w-auto"
          >
            <Mail size={15} /> {t('studio.brief.send')}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center justify-center gap-3 px-8 py-4 font-mono text-xs uppercase tracking-widest border border-[#501a2c] text-[#501a2c] hover:bg-[#501a2c] hover:text-[#F5F0EB] transition-colors w-full sm:w-auto"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? t('studio.brief.copied') : t('studio.brief.copy')}
          </button>
        </div>

        {/* Fallback: visible email address — works on any device even without a mail app */}
        {studio.email && (
          <div className="mt-6 pt-6 border-t border-[#501a2c]/15">
            {sent && (
              <p className="font-mono text-[9px] uppercase tracking-widest text-[#501a2c]/50 mb-3">
                Если почта не открылась — напишите напрямую:
              </p>
            )}
            <a
              href={`mailto:${studio.email}`}
              className="inline-flex items-center gap-2 font-mono text-sm text-[#501a2c] underline underline-offset-4 hover:text-[#C9A690] transition-colors break-all"
            >
              <Mail size={13} />
              {studio.email}
            </a>
          </div>
        )}
      </Reveal>
    </section>
  );
}

// ─── Main studio landing ─────────────────────────────────────────────────────

export function StudioPage({ studio, t }: { studio: Studio; t: T }) {
  const [selected, setSelected] = useState<StudioProject | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const heroRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '22%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [0.45, 0.12]);

  const categories = useMemo(() => {
    const set = Array.from(new Set(studio.projects.map((p) => p.category).filter(Boolean)));
    return ['All', ...set];
  }, [studio.projects]);

  const featured = studio.projects.find((p) => p.featured) || studio.projects[0];
  const gridProjects = studio.projects.filter((p) => p.id !== (featured?.id ?? -1));
  const filtered = activeCategory === 'All' ? gridProjects : gridProjects.filter((p) => p.category === activeCategory);

  if (selected) {
    return (
      <AnimatePresence mode="wait">
        <CaseView project={selected} t={t} onBack={() => setSelected(null)} />
      </AnimatePresence>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0EB]">
      {/* ── 1. Cinematic hero ── */}
      <section ref={heroRef} className="relative pt-16 overflow-hidden border-b border-[#501a2c]/20">
        <motion.img
          src={studio.heroImage}
          alt={studio.name}
          aria-hidden="true"
          style={{ y: heroY, opacity: heroOpacity }}
          className="absolute inset-0 w-full h-[120%] object-cover object-center grayscale pointer-events-none select-none"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#F5F0EB]/40 via-[#F5F0EB]/10 to-[#F5F0EB]" />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative z-10 px-6 sm:px-10 md:px-16 pt-20 pb-16 md:pt-32 md:pb-28"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#501a2c]/50 mb-5">{t('studio.kicker')}</p>
          <h1 className="font-serif text-[15vw] md:text-[10vw] leading-[0.85] text-[#501a2c] mb-6">{studio.name}</h1>
          <p className="font-mono text-xs md:text-sm uppercase tracking-[0.2em] text-[#C9A690] max-w-xl">{t('studio.tagline')}</p>
          <div className="flex items-center gap-2 mt-14 font-mono text-[9px] uppercase tracking-[0.2em] text-[#501a2c]/40">
            <ArrowDown size={13} className="animate-bounce" /> Scroll
          </div>
        </motion.div>
      </section>

      {/* ── Statement ── */}
      <section className="px-6 sm:px-10 md:px-16 py-16 md:py-24 border-b border-[#501a2c]/15">
        <Reveal className="max-w-4xl">
          <p className="font-serif text-2xl md:text-4xl text-[#501a2c]/85 leading-snug">{t('studio.statement')}</p>
          <p className="font-serif text-base md:text-lg text-[#501a2c]/60 leading-relaxed max-w-2xl mt-8">{t('studio.bio')}</p>
        </Reveal>
      </section>

      {/* ── 2. Discipline marquee ── */}
      {studio.services.length > 0 && (
        <section className="bg-[#501a2c] text-[#F5F0EB] py-5 overflow-hidden border-b border-[#501a2c]">
          <motion.div
            className="flex whitespace-nowrap"
            animate={{ x: ['0%', '-50%'] }}
            transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
          >
            {[...studio.services, ...studio.services, ...studio.services, ...studio.services].map((service, i) => (
              <span key={i} className="flex items-center font-mono text-sm md:text-base uppercase tracking-[0.2em]">
                <span className="px-6">{service}</span>
                <span className="text-[#C9A690]">/</span>
              </span>
            ))}
          </motion.div>
        </section>
      )}

      {/* ── 3. Philosophy / manifesto ── */}
      <section className="px-6 sm:px-10 md:px-16 py-16 md:py-28">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#501a2c]/40 mb-10 md:mb-14">{t('studio.principles.title')}</p>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
            {[1, 2, 3].map((n, i) => (
              <Reveal key={n} delay={i * 0.08}>
                <div className="border-t border-[#501a2c]/25 pt-5">
                  <span className="font-mono text-[10px] text-[#C9A690]">0{n}</span>
                  <h3 className="font-serif text-2xl md:text-3xl text-[#501a2c] mt-3 mb-4">{t(`studio.principle.${n}.title`)}</h3>
                  <p className="font-serif text-base text-[#501a2c]/65 leading-relaxed">{t(`studio.principle.${n}.desc`)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Services & expertise (offerings) ── */}
      {studio.offerings && studio.offerings.length > 0 && (
        <section className="px-6 sm:px-10 md:px-16 py-16 md:py-24 border-t border-[#501a2c]/15">
          <div className="max-w-6xl mx-auto">
            <Reveal>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#501a2c]/40 mb-10 md:mb-12">{t('studio.offerings.title')}</p>
            </Reveal>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
              {studio.offerings.map((o, i) => {
                const ergo = o.kind === 'ergonomics';
                return (
                  <Reveal key={i} delay={(i % 2) * 0.06}>
                    <div
                      className={`h-full p-6 md:p-8 border transition-colors ${
                        ergo
                          ? 'bg-[#E8DED5]/40 border-[#501a2c]/15 border-l-2 border-l-[#C9A690]'
                          : 'border-[#501a2c]/15 hover:border-[#501a2c]/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-[10px] text-[#C9A690]">{String(i + 1).padStart(2, '0')}</span>
                        {ergo && (
                          <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#C9A690] border border-[#C9A690]/40 px-2 py-0.5">
                            {t('studio.offerings.ergonomics')}
                          </span>
                        )}
                      </div>
                      <h3 className="font-serif text-2xl md:text-3xl text-[#501a2c] mb-3">{o.title}</h3>
                      <p className="font-serif text-base text-[#501a2c]/65 leading-relaxed mb-5">{o.summary}</p>
                      {o.items && o.items.length > 0 && (
                        <>
                          <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#501a2c]/35 mb-2.5">{t('studio.offerings.includes')}</p>
                          <ul className="space-y-1.5">
                            {o.items.map((it, j) => (
                              <li key={j} className="flex items-baseline gap-2.5 font-serif text-sm text-[#501a2c]/75">
                                <span className="text-[#C9A690] text-[10px] shrink-0 translate-y-[-1px]">—</span>
                                {it}
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── 5. Featured project ── */}
      {featured && (
        <section className="px-6 sm:px-10 md:px-16 py-16 md:py-24 border-t border-[#501a2c]/15">
          <div className="max-w-6xl mx-auto">
            <Reveal>
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#C9A690] mb-8">{t('studio.featured.kicker')}</p>
            </Reveal>
            <button type="button" onClick={() => setSelected(featured)} className="group block w-full text-left">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-center">
                <div className="lg:col-span-3 relative aspect-[4/3] bg-[#1a0812] overflow-hidden shadow-lg">
                  <img src={featured.imageUrl} alt={featured.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />
                </div>
                <div className="lg:col-span-2">
                  <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/40 mb-4">
                    <span>{featured.category}</span>
                    {featured.location && <span className="text-[#C9A690]">· {featured.location}</span>}
                  </div>
                  <h2 className="font-serif text-4xl md:text-5xl text-[#501a2c] mb-5 group-hover:text-[#C9A690] transition-colors">{featured.title}</h2>
                  {featured.description && (
                    <p className="font-serif text-lg text-[#501a2c]/70 leading-relaxed mb-6">{featured.description}</p>
                  )}
                  <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-[#501a2c] border-b border-[#501a2c] pb-1 group-hover:gap-3 transition-all">
                    {t('studio.case.about')} <ArrowUpRight size={14} />
                  </span>
                </div>
              </div>
            </button>
          </div>
        </section>
      )}

      {/* ── 6. Projects grid (filterable) ── */}
      {gridProjects.length > 0 && (
        <section className="px-6 sm:px-10 md:px-16 py-16 md:py-24 border-t border-[#501a2c]/15">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-10">
              <Reveal>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#501a2c]/40">{t('studio.projects.title')}</p>
              </Reveal>
              {categories.length > 2 && (
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={`px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest border transition-colors ${
                        activeCategory === cat
                          ? 'bg-[#501a2c] text-[#F5F0EB] border-[#501a2c]'
                          : 'text-[#501a2c] border-[#501a2c]/30 hover:border-[#501a2c]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
              <AnimatePresence mode="popLayout">
                {filtered.map((project, index) => (
                  <motion.button
                    layout
                    key={project.id}
                    type="button"
                    onClick={() => setSelected(project)}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.4, delay: Math.min(index * 0.06, 0.3) }}
                    className={`group text-left ${index % 3 === 0 ? 'sm:col-span-2' : ''}`}
                  >
                    <div className={`relative bg-[#1a0812] overflow-hidden shadow-md ${index % 3 === 0 ? 'aspect-[16/9]' : 'aspect-[4/3]'}`}>
                      <img src={project.imageUrl} alt={project.title} className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700" />
                      <div className="absolute inset-0 bg-[#1a0812]/0 group-hover:bg-[#1a0812]/40 transition-colors duration-300" />
                      <div className="absolute inset-0 flex items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="p-5 md:p-6">
                          <span className="font-mono text-[10px] text-[#C9A690]">{String(index + 1).padStart(2, '0')} /</span>
                          <p className="font-mono text-[10px] uppercase tracking-widest text-[#F5F0EB]/70 mt-1">{project.category}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between gap-3">
                      <h3 className="font-serif text-xl md:text-2xl text-[#501a2c] group-hover:text-[#C9A690] transition-colors">{project.title}</h3>
                      <span className="font-mono text-[9px] uppercase tracking-widest text-[#501a2c]/35 shrink-0">{project.year}</span>
                    </div>
                    {project.location && (
                      <p className="font-mono text-[9px] uppercase tracking-widest text-[#501a2c]/35 mt-0.5">{project.location}</p>
                    )}
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </section>
      )}

      {/* ── 7. Process ── */}
      <section className="bg-[#501a2c] text-[#F5F0EB] px-6 sm:px-10 md:px-16 py-16 md:py-28">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#C9A690] mb-12 md:mb-16">{t('studio.process.title')}</p>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8">
            {[1, 2, 3, 4].map((n, i) => (
              <Reveal key={n} delay={i * 0.08}>
                <div className="border-t border-[#F5F0EB]/20 pt-5">
                  <span className="font-mono text-[10px] text-[#C9A690]">0{n}</span>
                  <h3 className="font-serif text-2xl text-[#F5F0EB] mt-3 mb-4">{t(`studio.process.${n}.title`)}</h3>
                  <p className="font-serif text-sm text-[#F5F0EB]/60 leading-relaxed">{t(`studio.process.${n}.desc`)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7b. Packages / pricing ── */}
      {studio.packages && studio.packages.length > 0 && (
        <section className="px-6 sm:px-10 md:px-16 py-16 md:py-28 border-b border-[#501a2c]/15">
          <div className="max-w-6xl mx-auto">
            <Reveal>
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#501a2c]/40 mb-3">{t('studio.packages.title')}</p>
              <p className="font-serif text-sm text-[#501a2c]/55 mb-12 md:mb-16 max-w-xl">{t('studio.packages.note')}</p>
            </Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#501a2c]/15 border border-[#501a2c]/15">
              {studio.packages.map((pkg, i) => (
                <Reveal key={i} delay={i * 0.08}>
                  <div className={`h-full flex flex-col p-6 md:p-8 ${pkg.highlight ? 'bg-[#501a2c] text-[#F5F0EB]' : 'bg-[#F5F0EB] text-[#501a2c]'}`}>
                    <h3 className="font-serif text-2xl mb-1">{t(pkg.name)}</h3>
                    <p className={`font-mono text-[11px] uppercase tracking-widest mb-4 ${pkg.highlight ? 'text-[#C9A690]' : 'text-[#501a2c]/50'}`}>{pkg.price}</p>
                    <p className={`font-serif text-sm leading-relaxed mb-6 ${pkg.highlight ? 'text-[#F5F0EB]/70' : 'text-[#501a2c]/65'}`}>{t(pkg.desc)}</p>
                    <ul className="space-y-2 mt-auto">
                      {pkg.features.map((f, j) => (
                        <li key={j} className={`font-mono text-[10px] uppercase tracking-wider flex items-start gap-2 ${pkg.highlight ? 'text-[#F5F0EB]/80' : 'text-[#501a2c]/60'}`}>
                          <span className="text-[#C9A690] mt-px">—</span> {t(f)}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 8. Stats ── */}
      {studio.stats && studio.stats.length > 0 && (
        <section className="px-6 sm:px-10 md:px-16 py-14 md:py-20 border-b border-[#501a2c]/15">
          <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-px sm:bg-[#501a2c]/15 border-y border-[#501a2c]/15 sm:border-0">
            {studio.stats.map((stat, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <div className="bg-[#F5F0EB] sm:px-8 py-6 text-center sm:text-left">
                  <p className="font-serif text-5xl md:text-6xl text-[#501a2c] leading-none mb-2">{stat.value}</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#501a2c]/45">{t(stat.key)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ── 9. Start a project — brief form ── */}
      <BriefForm studio={studio} t={t} />

      {/* ── 10. Contact / CTA ── */}
      <section className="px-6 sm:px-10 md:px-16 py-16 md:py-28">
        <Reveal className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-10">
            <div>
              {studio.availability && (
                <p className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/60 mb-4 px-3 py-1.5 border border-[#501a2c]/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C9A690]" />
                  {t(studio.availability)}
                </p>
              )}
              <p className="font-serif text-3xl md:text-5xl text-[#501a2c] mb-3 max-w-lg leading-tight">{t('studio.cta.title')}</p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/40">{t('studio.cta.desc')}</p>
            </div>
            <div className="flex flex-col gap-3 shrink-0">
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={studio.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-7 py-4 font-mono text-xs uppercase tracking-widest border border-[#501a2c] text-[#501a2c] hover:bg-[#501a2c] hover:text-[#F5F0EB] transition-all duration-300 w-fit"
                >
                  <Instagram size={15} /> {t('studio.cta.button')}
                </a>
                {studio.email && (
                  <a
                    href={`mailto:${studio.email}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-7 py-4 font-mono text-xs uppercase tracking-widest bg-[#501a2c] text-[#F5F0EB] hover:bg-[#3d1421] transition-all duration-300 w-fit"
                  >
                    <Mail size={15} /> {t('studio.cta.email')}
                  </a>
                )}
              </div>
              {/* Plain email address — always visible, copyable on any device */}
              {studio.email && (
                <p className="font-mono text-[11px] text-[#501a2c]/50 tracking-widest flex items-center gap-1.5">
                  <Mail size={11} />
                  <a
                    href={`mailto:${studio.email}`}
                    className="hover:text-[#501a2c] transition-colors"
                  >
                    {studio.email}
                  </a>
                </p>
              )}
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
