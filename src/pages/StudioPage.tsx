import { useState, useRef, useMemo, ReactNode } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { ArrowUpRight, ArrowLeft, Mail, Instagram, ArrowDown } from 'lucide-react';
import type { Studio, StudioProject } from '../data';

type T = (key: string) => string;

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

      {/* ── 4. Services list ── */}
      {studio.services.length > 0 && (
        <section className="px-6 sm:px-10 md:px-16 py-16 md:py-24 border-t border-[#501a2c]/15">
          <div className="max-w-6xl mx-auto">
            <Reveal>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#501a2c]/40 mb-8">{t('studio.services.title')}</p>
            </Reveal>
            <div className="border-t border-[#501a2c]/20">
              {studio.services.map((service, i) => (
                <Reveal key={i} delay={i * 0.05}>
                  <div className="group flex items-baseline gap-6 py-5 md:py-6 border-b border-[#501a2c]/20 hover:bg-[#E8DED5]/50 transition-colors px-2 -mx-2">
                    <span className="font-mono text-[11px] text-[#C9A690] w-8 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                    <span className="font-serif text-2xl md:text-4xl text-[#501a2c] group-hover:translate-x-2 transition-transform">{service}</span>
                  </div>
                </Reveal>
              ))}
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

      {/* ── 9. Contact / CTA ── */}
      <section className="px-6 sm:px-10 md:px-16 py-16 md:py-28">
        <Reveal className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-10">
            <div>
              <p className="font-serif text-3xl md:text-5xl text-[#501a2c] mb-3 max-w-lg leading-tight">{t('studio.cta.title')}</p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/40">{t('studio.cta.desc')}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
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
                  className="flex items-center gap-3 px-7 py-4 font-mono text-xs uppercase tracking-widest bg-[#501a2c] text-[#F5F0EB] hover:bg-[#3d1421] transition-all duration-300 w-fit"
                >
                  <Mail size={15} /> {t('studio.cta.email')}
                </a>
              )}
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
