import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, ImageOff,
  Instagram, Loader2, MapPin, Plus, Search, SlidersHorizontal, X,
} from 'lucide-react';
import {
  DISCIPLINES, EMPTY_WORK_DRAFT, Work, WorkDraft,
  externalUrl, fetchWorks, flag, normalizeInstagram, submitWork,
} from './showcaseApi';

const PAGE_SIZE = 24;
const ALL_DISCIPLINES = 'All disciplines';
const ALL_COUNTRIES = 'All countries';

const inputClass = 'min-h-12 w-full rounded-xl border border-[#4a1728]/15 bg-[#fdfaf6] px-4 text-[15px] text-[#4a1728] outline-none transition-shadow placeholder:text-[#4a1728]/40 focus:border-[#b8956e] focus:ring-2 focus:ring-[#b8956e]/20';

function ModalShell({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', onKey); };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-[#4a1728]/55 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className={`max-h-[94dvh] w-full overflow-y-auto rounded-t-[28px] bg-[#f5f0eb] shadow-2xl sm:rounded-[28px] ${wide ? 'sm:max-w-4xl' : 'sm:max-w-xl'}`}>
        <div className="sticky top-0 z-10 flex min-h-16 items-center justify-between border-b border-[#4a1728]/10 bg-[#f5f0eb]/95 px-5 backdrop-blur-md sm:px-7">
          <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-[#4a1728]/65">{title}</p>
          <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full border border-[#4a1728]/15 transition-colors hover:bg-[#fdfaf6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8956e]" aria-label="Close">
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* The vitrine is image-first, so a broken or missing photograph must still read
   as a designed tile rather than a hole in the grid. */
function WorkPlate({ work, index, className = '' }: { work: Work; index: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const image = work.images?.[0];
  const tint = ['#e9dece', '#e5d8c6', '#e2d4c0', '#efe7dc', '#ddccb5'][index % 5];

  if (!image?.url || failed) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 ${className}`} style={{ backgroundColor: tint }}>
        <ImageOff size={22} className="text-[#4a1728]/25" aria-hidden="true" />
        <p className="max-w-[70%] text-center font-display text-base italic leading-snug text-[#4a1728]/45">{work.title}</p>
      </div>
    );
  }

  return (
    <img
      src={image.url}
      alt={image.caption || `${work.title} — ${work.author}`}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04] ${className}`}
      style={{ backgroundColor: tint }}
    />
  );
}

function WorkDetail({ work, onClose }: { work: Work; onClose: () => void }) {
  const [active, setActive] = useState(0);
  const handle = normalizeInstagram(work.authorInstagram);
  const images = work.images?.filter((image) => image?.url) || [];
  const current = images[active];

  return (
    <ModalShell title={work.discipline || 'Work'} onClose={onClose} wide>
      <div className="p-5 sm:p-8">
        <div className="overflow-hidden rounded-2xl bg-[#e9dece]">
          {current ? (
            <img src={current.url} alt={current.caption || work.title} className="max-h-[62dvh] w-full object-contain" />
          ) : (
            <div className="grid aspect-[4/3] place-items-center text-[#4a1728]/30"><ImageOff size={28} /></div>
          )}
        </div>
        {images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {images.map((image, index) => (
              <button key={`${image.url}-${index}`} type="button" onClick={() => setActive(index)} className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${index === active ? 'border-[#4a1728]' : 'border-transparent opacity-70 hover:opacity-100'}`} aria-label={`Image ${index + 1}`}>
                <img src={image.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
        {current?.credit && <p className="mt-3 font-sans text-[9px] uppercase tracking-[0.16em] text-[#4a1728]/55">Photo — {current.credit}</p>}

        <div className="mt-7 flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <h2 className="font-display text-3xl leading-[1.05] text-[#4a1728] sm:text-5xl">{work.title}</h2>
            <p className="mt-3 font-display text-xl italic text-[#b8956e]">{work.author}{work.year ? `, ${work.year}` : ''}</p>
            <p className="mt-3 flex items-center gap-2 text-sm text-[#4a1728]/65"><MapPin size={15} /> {[work.venue, work.city, work.country].filter(Boolean).join(', ') || 'Location not specified'}</p>
          </div>
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#fdfaf6] text-3xl shadow-sm" aria-hidden="true">{flag(work.countryCode)}</span>
        </div>

        <div className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-[#4a1728]/10 bg-[#4a1728]/10 sm:grid-cols-3">
          <div className="bg-[#fdfaf6] p-4"><p className="font-sans text-[9px] uppercase tracking-[0.18em] text-[#4a1728]/55">Discipline</p><p className="mt-2 font-display text-lg">{work.discipline || '—'}</p></div>
          <div className="bg-[#fdfaf6] p-4"><p className="font-sans text-[9px] uppercase tracking-[0.18em] text-[#4a1728]/55">Medium</p><p className="mt-2 font-display text-lg">{work.medium || '—'}</p></div>
          <div className="bg-[#fdfaf6] p-4"><p className="font-sans text-[9px] uppercase tracking-[0.18em] text-[#4a1728]/55">Added</p><p className="mt-2 font-display text-lg">{work.addedAt ? new Date(work.addedAt).toLocaleDateString('en-GB') : '—'}</p></div>
        </div>

        {work.statement && <section className="mt-8">
          <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-[#b8956e]">Statement</p>
          <p className="mt-3 font-display text-xl leading-relaxed text-[#4a1728]/85 sm:text-2xl">{work.statement}</p>
        </section>}

        {!!work.tags?.length && <div className="mt-7 flex flex-wrap gap-2">
          {work.tags.map((tag) => <span key={tag} className="rounded-full bg-[#ece2d5] px-3 py-1.5 font-sans text-[8px] uppercase tracking-[0.12em] text-[#4a1728]/80">{tag}</span>)}
        </div>}

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          {handle && <a href={`https://www.instagram.com/${encodeURIComponent(handle)}/`} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#4a1728] px-6 font-sans text-[10px] uppercase tracking-[0.18em] text-white transition-transform hover:-translate-y-0.5"><Instagram size={16} /> @{handle}</a>}
          {work.portfolio && <a href={externalUrl(work.portfolio)} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#4a1728]/20 px-6 font-sans text-[10px] uppercase tracking-[0.18em] transition-colors hover:bg-[#fdfaf6]">Portfolio <ArrowUpRight size={15} /></a>}
          {work.sourceUrl && work.sourceUrl !== work.portfolio && <a href={externalUrl(work.sourceUrl)} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#4a1728]/20 px-6 font-sans text-[10px] uppercase tracking-[0.18em] transition-colors hover:bg-[#fdfaf6]">Source <ArrowUpRight size={15} /></a>}
        </div>
      </div>
    </ModalShell>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block font-sans text-[10px] uppercase tracking-[0.16em] text-[#4a1728]/65">{label}{required && <span className="text-[#b8956e]"> *</span>}</span>{children}</label>;
}

function SubmitWork({ onClose, onAdded }: { onClose: () => void; onAdded: (work: Work) => void }) {
  const [draft, setDraft] = useState<WorkDraft>(EMPTY_WORK_DRAFT);
  const [state, setState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const set = (key: keyof WorkDraft, value: string) => setDraft((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setState('sending'); setMessage('');
    try {
      const work = await submitWork(draft);
      setState('success');
      setMessage('The work is in the queue and marked for editorial review.');
      onAdded(work);
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Could not submit the work');
    }
  }

  return <ModalShell title="Submit a work" onClose={onClose} wide>
    <form onSubmit={submit} className="p-5 sm:p-8">
      <div className="mb-7 max-w-xl">
        <h2 className="font-display text-3xl text-[#4a1728] sm:text-4xl">Show us what you built</h2>
        <p className="mt-3 text-sm leading-relaxed text-[#4a1728]/65">Sets, scenography, installations and conceptual pieces. Submissions appear with “Under review” status — the EPRIS editorial team verifies authorship and credits before publishing.</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Work title" required><input className={inputClass} value={draft.title} onChange={(e) => set('title', e.target.value)} maxLength={140} required autoFocus /></Field>
        <Field label="Year"><input className={inputClass} value={draft.year} onChange={(e) => set('year', e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" placeholder="2026" /></Field>
        <Field label="Author / studio" required><input className={inputClass} value={draft.author} onChange={(e) => set('author', e.target.value)} maxLength={120} required /></Field>
        <Field label="Instagram"><input className={inputClass} value={draft.authorInstagram} onChange={(e) => set('authorInstagram', e.target.value)} maxLength={80} placeholder="@handle" autoCapitalize="none" /></Field>
        <Field label="Discipline"><select className={inputClass} value={draft.discipline} onChange={(e) => set('discipline', e.target.value)}>{DISCIPLINES.map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Medium / materials"><input className={inputClass} value={draft.medium} onChange={(e) => set('medium', e.target.value)} maxLength={140} placeholder="Steel, textile, projection…" /></Field>
        <Field label="Country" required><input className={inputClass} value={draft.country} onChange={(e) => set('country', e.target.value)} maxLength={80} required /></Field>
        <Field label="Country code"><input className={inputClass} value={draft.countryCode} onChange={(e) => set('countryCode', e.target.value.toUpperCase().slice(0, 2))} maxLength={2} placeholder="GB" /></Field>
        <Field label="City"><input className={inputClass} value={draft.city} onChange={(e) => set('city', e.target.value)} maxLength={80} /></Field>
        <Field label="Venue / production"><input className={inputClass} value={draft.venue} onChange={(e) => set('venue', e.target.value)} maxLength={140} /></Field>
        <div className="sm:col-span-2"><Field label="Image URL" required><input className={inputClass} value={draft.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} type="url" maxLength={500} required placeholder="https://" /></Field></div>
        <div className="sm:col-span-2"><Field label="Portfolio link"><input className={inputClass} value={draft.portfolio} onChange={(e) => set('portfolio', e.target.value)} type="url" maxLength={300} placeholder="https://" /></Field></div>
        <div className="sm:col-span-2"><Field label="Statement — what is this work about?" required><textarea className={`${inputClass} min-h-28 resize-y py-3`} value={draft.statement} onChange={(e) => set('statement', e.target.value)} maxLength={800} required /></Field></div>
        <div className="sm:col-span-2"><Field label="Your contact (kept private)"><input className={inputClass} value={draft.contact} onChange={(e) => set('contact', e.target.value)} maxLength={160} placeholder="Email or Instagram" /></Field></div>
        <input tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" value={draft.website} onChange={(e) => set('website', e.target.value)} />
      </div>
      {message && <div role="status" className={`mt-6 rounded-xl border p-4 text-sm ${state === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-900'}`}>{state === 'success' && <Check size={16} className="mr-2 inline" />}{message}</div>}
      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className="min-h-12 rounded-full border border-[#4a1728]/20 px-6 font-sans text-[10px] uppercase tracking-[0.18em] hover:bg-[#fdfaf6]">{state === 'success' ? 'Close' : 'Cancel'}</button>
        {state !== 'success' && <button type="submit" disabled={state === 'sending'} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#4a1728] px-7 font-sans text-[10px] uppercase tracking-[0.18em] text-white disabled:opacity-60">{state === 'sending' ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Submit work</button>}
      </div>
    </form>
  </ModalShell>;
}

export function ShowcasePage() {
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState(ALL_COUNTRIES);
  const [discipline, setDiscipline] = useState(ALL_DISCIPLINES);
  const [author, setAuthor] = useState('');
  const [withImageOnly, setWithImageOnly] = useState(false);
  const [recentOnly, setRecentOnly] = useState(false);
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Work | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    document.title = 'Showcase — Set Design & Conceptual Art — EPRIS Journal';
    document.documentElement.lang = 'en';
    const description = 'A vitrine of set design, scenography and conceptual art by emerging authors worldwide, curated and open for submissions by EPRIS Journal.';
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
    meta.content = description;
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = 'https://eprisjournal.com/showcase';
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchWorks(controller.signal)
      .then(setWorks)
      .catch((reason) => { if (reason.name !== 'AbortError') setError('The showcase could not be loaded. Please try again.'); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const countries = useMemo(() => [...new Set(works.map((work) => work.country).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b)), [works]);

  /* Authors stand in for the shop's brand column: the same ranked list with a
     count each, and the same chip rail above the grid. */
  const authorList = useMemo(() => {
    const counts = new Map<string, number>();
    works.forEach((work) => { if (work.author) counts.set(work.author, (counts.get(work.author) || 0) + 1); });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  }, [works]);

  const segments = useMemo(() => [
    { label: 'All works', value: ALL_DISCIPLINES },
    ...['Set design', 'Scenography', 'Installation', 'Conceptual art']
      .filter((name) => works.some((work) => work.discipline === name))
      .map((name) => ({ label: name, value: name })),
  ], [works]);

  const selectedSegment = discipline === ALL_DISCIPLINES ? 'All works' : discipline;
  const disciplineTabs = useMemo(() => {
    const counts = new Map<string, number>();
    works.forEach((work) => { if (work.discipline) counts.set(work.discipline, (counts.get(work.discipline) || 0) + 1); });
    const pinned = ['Set design', 'Scenography', 'Conceptual art'];
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
    const ordered = [...pinned.filter((name) => counts.has(name)), ...ranked.filter((name) => !pinned.includes(name))];
    return ordered.slice(0, 8).map((name) => ({ name, count: counts.get(name) || 0 }));
  }, [works]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const recentCutoff = new Date().getFullYear() - 2;
    const result = works.filter((work) => {
      const haystack = [work.title, work.author, work.country, work.city, work.venue, work.discipline, work.medium, work.statement, ...(work.tags || [])].join(' ').toLocaleLowerCase();
      if (needle && !haystack.includes(needle)) return false;
      if (country !== ALL_COUNTRIES && work.country !== country) return false;
      if (author && work.author !== author) return false;
      if (discipline !== ALL_DISCIPLINES && work.discipline !== discipline) return false;
      if (withImageOnly && !work.images?.some((image) => image?.url)) return false;
      if (recentOnly && !(work.year && work.year >= recentCutoff)) return false;
      return true;
    });
    return [...result].sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title);
      if (sort === 'author') return a.author.localeCompare(b.author);
      if (sort === 'oldest') return String(a.addedAt || '').localeCompare(String(b.addedAt || ''));
      return String(b.addedAt || '').localeCompare(String(a.addedAt || ''));
    });
  }, [works, query, country, discipline, author, withImageOnly, recentOnly, sort]);

  useEffect(() => setPage(1), [query, country, discipline, author, withImageOnly, recentOnly, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, filtered.length);
  const activeFilterCount = Number(country !== ALL_COUNTRIES) + Number(discipline !== ALL_DISCIPLINES) + Number(Boolean(author)) + Number(withImageOnly) + Number(recentOnly);
  const resetFilters = () => { setCountry(ALL_COUNTRIES); setDiscipline(ALL_DISCIPLINES); setAuthor(''); setWithImageOnly(false); setRecentOnly(false); };

  return <div className="min-h-screen bg-[#f5f0eb] text-[#4a1728] selection:bg-[#4a1728] selection:text-white">
    <p className="bg-[#4a1728] px-4 py-2.5 text-center font-sans text-[8px] uppercase tracking-[0.22em] text-[#ece2d5] sm:text-[9px]">
      Open call — set design &amp; conceptual art · Worldwide · Reviewed by EPRIS editorial
    </p>

    <header className="sticky top-0 z-40 border-b border-[#4a1728]/10 bg-[#f5f0eb]/95 backdrop-blur-xl">
      <div className="mx-auto grid min-h-16 max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-8 lg:px-12">
        <label className="relative hidden sm:block">
          <span className="sr-only">Search works</span>
          <Search className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-[#4a1728]/55" size={15} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="SEARCH" className="min-h-11 w-40 border-0 bg-transparent pl-6 font-sans text-[9px] uppercase tracking-[0.2em] text-[#4a1728] outline-none placeholder:text-[#4a1728]/55 focus:w-56" />
        </label>
        <span className="sm:hidden" />
        <a href="/" className="inline-flex min-h-11 items-center justify-center gap-3 rounded-full px-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b8956e]" aria-label="EPRIS Journal home">
          <span className="font-display text-xl tracking-[0.18em] sm:text-2xl">EPRIS</span>
          <span className="hidden h-5 w-px bg-[#4a1728]/20 sm:block" />
          <span className="hidden font-sans text-[9px] uppercase tracking-[0.2em] text-[#4a1728]/55 sm:block">Showcase</span>
        </a>
        <div className="flex items-center justify-end">
          <button type="button" onClick={() => setSubmitting(true)} aria-label="Submit work" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#4a1728] px-4 font-sans text-[9px] uppercase tracking-[0.16em] text-white transition-transform hover:-translate-y-0.5 sm:px-5">
            <Plus size={15} /><span className="hidden sm:inline">Submit work</span><span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      <nav aria-label="Disciplines" className="border-t border-[#4a1728]/10">
        <div className="mx-auto flex max-w-[1600px] items-center gap-6 overflow-x-auto px-4 py-3 font-sans text-[9px] uppercase tracking-[0.18em] sm:justify-center sm:px-8 lg:px-12">
          <button type="button" onClick={() => setDiscipline(ALL_DISCIPLINES)} className={`whitespace-nowrap transition-colors ${discipline === ALL_DISCIPLINES ? 'text-[#4a1728]' : 'text-[#4a1728]/55 hover:text-[#4a1728]'}`}>All works</button>
          {disciplineTabs.map((tab) => (
            <button key={tab.name} type="button" onClick={() => setDiscipline((current) => (current === tab.name ? ALL_DISCIPLINES : tab.name))} className={`whitespace-nowrap transition-colors ${discipline === tab.name ? 'text-[#4a1728]' : 'text-[#4a1728]/55 hover:text-[#4a1728]'}`}>
              {tab.name}
            </button>
          ))}
        </div>
      </nav>
    </header>

    <main>
      {/* Catalogue head, in the shop's order: crumb, title with a count, then
          the segment row — no editorial hero in front of the goods. */}
      <section className="px-4 pt-6 sm:px-8 lg:px-12 lg:pt-9">
        <div className="mx-auto max-w-[1600px]">
          <nav aria-label="Breadcrumb" className="font-sans text-[9px] uppercase tracking-[0.2em] text-[#4a1728]/55">
            <a href="/" className="hover:text-[#4a1728]">Journal</a> / <span className="text-[#4a1728]">Showcase</span>
          </nav>

          <div className="mt-5 flex flex-wrap items-baseline gap-x-5 gap-y-2">
            <h1 className="font-display text-4xl leading-none sm:text-5xl">{selectedSegment}</h1>
            <p className="font-sans text-[9px] uppercase tracking-[0.2em] text-[#4a1728]/55">
              {loading ? 'Loading…' : `${filtered.length} ${filtered.length === 1 ? 'work' : 'works'}`}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {segments.map((segment) => {
              const active = discipline === segment.value;
              return (
                <button
                  key={segment.label}
                  type="button"
                  onClick={() => setDiscipline(segment.value)}
                  className={`inline-flex min-h-10 items-center border px-5 font-sans text-[9px] uppercase tracking-[0.16em] transition-colors ${active ? 'border-[#4a1728] bg-[#4a1728] text-white' : 'border-[#4a1728]/15 bg-[#fdfaf6] text-[#4a1728]/80 hover:border-[#4a1728]/40'}`}
                >
                  {segment.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
        <div className="mx-auto grid max-w-[1600px] gap-8 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-10">
          <aside className="lg:sticky lg:top-32 lg:self-start">
            <button type="button" onClick={() => setFiltersOpen((value) => !value)} className="flex min-h-12 w-full items-center justify-between rounded-xl border border-[#4a1728]/15 bg-[#fdfaf6] px-4 text-left text-sm lg:hidden">
              <span className="flex items-center gap-2"><SlidersHorizontal size={16} /> Filters {activeFilterCount ? `(${activeFilterCount})` : ''}</span>
              <ChevronDown size={16} className={filtersOpen ? 'rotate-180' : ''} />
            </button>

            <div className={`${filtersOpen ? 'block' : 'hidden'} mt-4 space-y-7 lg:mt-0 lg:block`}>
              <label className="relative block lg:hidden">
                <span className="sr-only">Search works</span>
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#4a1728]/55" size={17} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} className={`${inputClass} pl-11`} placeholder="Search title, author, place…" />
              </label>

              <div className="space-y-3">
                {[
                  { label: 'Only with photo', value: withImageOnly, toggle: () => setWithImageOnly((value) => !value) },
                  { label: 'Last two years', value: recentOnly, toggle: () => setRecentOnly((value) => !value) },
                ].map((row) => (
                  <button key={row.label} type="button" role="switch" aria-checked={row.value} onClick={row.toggle} className="flex min-h-11 w-full items-center justify-between gap-3 text-left">
                    <span className="font-sans text-[9px] uppercase tracking-[0.15em] text-[#4a1728]/80">{row.label}</span>
                    <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${row.value ? 'bg-[#4a1728]' : 'bg-[#4a1728]/15'}`}>
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-[#fdfaf6] transition-transform ${row.value ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                    </span>
                  </button>
                ))}
              </div>

              <div className="border-t border-[#4a1728]/12 pt-6">
                <p className="mb-4 font-sans text-[9px] uppercase tracking-[0.2em] text-[#4a1728]">Disciplines</p>
                <ul className="space-y-2.5">
                  <li><button type="button" onClick={() => setDiscipline(ALL_DISCIPLINES)} className={`min-h-8 text-left text-sm transition-colors ${discipline === ALL_DISCIPLINES ? 'text-[#4a1728]' : 'text-[#4a1728]/65 hover:text-[#4a1728]'}`}>All disciplines</button></li>
                  {disciplineTabs.map((tab) => (
                    <li key={tab.name} className="flex items-baseline justify-between gap-2">
                      <button type="button" onClick={() => setDiscipline((current) => (current === tab.name ? ALL_DISCIPLINES : tab.name))} className={`min-h-8 text-left text-sm transition-colors ${discipline === tab.name ? 'text-[#4a1728]' : 'text-[#4a1728]/65 hover:text-[#4a1728]'}`}>{tab.name}</button>
                      <span className="font-sans text-[9px] text-[#4a1728]/40">{tab.count}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {authorList.length > 0 && (
                <div className="border-t border-[#4a1728]/12 pt-6">
                  <p className="mb-4 font-sans text-[9px] uppercase tracking-[0.2em] text-[#4a1728]">Authors</p>
                  <ul className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
                    {authorList.map((entry) => (
                      <li key={entry.name} className="flex items-baseline justify-between gap-2">
                        <button type="button" onClick={() => setAuthor((current) => (current === entry.name ? '' : entry.name))} className={`min-h-8 text-left text-sm leading-snug transition-colors ${author === entry.name ? 'text-[#4a1728] underline underline-offset-4' : 'text-[#4a1728]/65 hover:text-[#4a1728]'}`}>{entry.name}</button>
                        <span className="font-sans text-[9px] text-[#4a1728]/40">{entry.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="border-t border-[#4a1728]/12 pt-6">
                <p className="mb-4 font-sans text-[9px] uppercase tracking-[0.2em] text-[#4a1728]">Country</p>
                <label className="relative block">
                  <span className="sr-only">Country</span>
                  <select className={`${inputClass} appearance-none pr-10`} value={country} onChange={(event) => setCountry(event.target.value)}>
                    <option>{ALL_COUNTRIES}</option>
                    {countries.map((item) => <option key={item}>{item}</option>)}
                  </select>
                  <ChevronDown size={15} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" />
                </label>
              </div>

              {activeFilterCount > 0 && (
                <button type="button" onClick={resetFilters} className="min-h-11 font-sans text-[9px] uppercase tracking-[0.15em] text-[#b8956e]">Clear filters</button>
              )}
            </div>
          </aside>

          <div>
            {authorList.length > 1 && (
              <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
                {authorList.slice(0, 24).map((entry) => {
                  const active = author === entry.name;
                  return (
                    <button
                      key={entry.name}
                      type="button"
                      onClick={() => setAuthor(active ? '' : entry.name)}
                      className={`inline-flex min-h-9 shrink-0 items-center gap-2 border px-4 font-sans text-[9px] uppercase tracking-[0.14em] transition-colors ${active ? 'border-[#4a1728] bg-[#4a1728] text-white' : 'border-[#4a1728]/15 bg-[#fdfaf6] text-[#4a1728]/80 hover:border-[#4a1728]/40'}`}
                    >
                      {entry.name}
                      <span className={active ? 'text-white/60' : 'text-[#4a1728]/40'}>{entry.count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#4a1728]/10 pb-4">
              <p className="font-sans text-[9px] uppercase tracking-[0.17em] text-[#4a1728]/55">
                {loading ? 'Loading vitrine…' : `${rangeStart}–${rangeEnd} of ${filtered.length}`}
              </p>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-sans text-[9px] uppercase tracking-[0.15em]">
                <span className="text-[#4a1728]/55">Sort:</span>
                {[
                  { value: 'newest', label: 'Newest first' },
                  { value: 'oldest', label: 'Oldest first' },
                  { value: 'author', label: 'Author A–Z' },
                  { value: 'title', label: 'Title A–Z' },
                ].map((option) => (
                  <button key={option.value} type="button" onClick={() => setSort(option.value)} className={`transition-colors ${sort === option.value ? 'text-[#4a1728] underline underline-offset-4' : 'text-[#4a1728]/55 hover:text-[#4a1728]'}`}>{option.label}</button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="grid min-h-80 place-items-center"><div className="flex items-center gap-3 font-sans text-[10px] uppercase tracking-[0.18em] text-[#4a1728]/55"><Loader2 className="animate-spin" size={19} /> Loading works</div></div>
            ) : error ? (
              <div className="my-12 rounded-2xl border border-red-200 bg-red-50 p-7 text-red-900">
                <p>{error}</p>
                <button type="button" onClick={() => window.location.reload()} className="mt-4 min-h-11 rounded-full border border-red-300 px-5 font-sans text-[9px] uppercase tracking-[0.15em]">Try again</button>
              </div>
            ) : visible.length === 0 ? (
              <div className="grid min-h-[26rem] place-items-center px-6 text-center">
                <div className="max-w-md">
                  <Search size={26} className="mx-auto text-[#4a1728]/40" />
                  <p className="mt-5 font-display text-3xl leading-tight">{works.length === 0 ? 'The vitrine is being assembled.' : 'No works match these filters.'}</p>
                  <p className="mt-4 text-sm leading-relaxed text-[#4a1728]/65">{works.length === 0 ? 'Submissions are open — the first works are under editorial review. Send yours and it goes into the queue.' : 'Try clearing a filter or widening the search.'}</p>
                  <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                    {works.length > 0 && activeFilterCount > 0 && <button type="button" onClick={resetFilters} className="min-h-12 rounded-full border border-[#4a1728]/20 px-6 font-sans text-[10px] uppercase tracking-[0.18em] hover:bg-[#fdfaf6]">Clear filters</button>}
                    <button type="button" onClick={() => setSubmitting(true)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#4a1728] px-7 font-sans text-[10px] uppercase tracking-[0.18em] text-white"><Plus size={16} /> Submit work</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-8 grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((work, index) => (
                  <button key={work.id} type="button" onClick={() => setSelected(work)} aria-label={`${work.title} — ${work.author}`} className="group flex flex-col text-left">
                    <div className="relative aspect-[4/5] overflow-hidden bg-[#e9dece]">
                      <WorkPlate work={work} index={index} className="absolute inset-0 h-full w-full" />
                      {work.status === 'Under review' && (
                        <span className="absolute left-3 top-3 rounded-full bg-[#f5f0eb]/90 px-2.5 py-1 font-sans text-[7px] uppercase tracking-[0.14em] text-[#b8956e]">Under review</span>
                      )}
                      {/* The journal never covers a picture with a button —
                          the image itself answers the hover. */}
                      <span className="pointer-events-none absolute inset-0 bg-[#4a1728]/0 transition-colors duration-300 group-hover:bg-[#4a1728]/8" />
                    </div>

                    {/* Titles run to wildly different lengths, so the caption
                        block is a fixed three-row rhythm — label, title, byline
                        — and the row of cards keeps its baseline. */}
                    <div className="mt-4 flex flex-1 flex-col border-t border-[#4a1728]/15 pt-3">
                      <p className="font-sans text-[8px] uppercase tracking-[0.18em] text-[#4a1728]/40">
                        {work.discipline || 'Work'}{work.year ? ` · ${work.year}` : ''}
                      </p>
                      <h2 className="mt-2 line-clamp-2 min-h-[2.6em] font-display text-[1.25rem] leading-[1.28] text-[#4a1728] decoration-[#4a1728]/30 underline-offset-4 group-hover:underline">
                        {work.title}
                      </h2>
                      <p className="mt-auto pt-2 text-[13px] leading-snug text-[#4a1728]/80">{work.author}</p>
                      <p className="mt-1 font-sans text-[8px] uppercase tracking-[0.14em] text-[#4a1728]/40">
                        {[work.city, work.country].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!loading && !error && filtered.length > PAGE_SIZE && (
              <nav className="mt-12 flex items-center justify-between border-t border-[#4a1728]/10 pt-6" aria-label="Work pages">
                <button type="button" onClick={() => { setPage((value) => Math.max(1, value - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={page === 1} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#4a1728]/15 px-4 font-sans text-[9px] uppercase tracking-[0.15em] disabled:opacity-30"><ArrowLeft size={14} /> Previous</button>
                <span className="font-sans text-[9px] uppercase tracking-[0.16em] text-[#4a1728]/55">{page} / {pages}</span>
                <button type="button" onClick={() => { setPage((value) => Math.min(pages, value + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={page === pages} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#4a1728]/15 px-4 font-sans text-[9px] uppercase tracking-[0.15em] disabled:opacity-30">Next <ArrowRight size={14} /></button>
              </nav>
            )}
          </div>
        </div>
      </section>

      <section className="border-t border-[#4a1728]/10 bg-[#4a1728] px-4 py-16 text-[#f5f0eb] sm:px-8 sm:py-24 lg:px-12">
        <div className="mx-auto grid max-w-[1600px] gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="font-sans text-[9px] uppercase tracking-[0.22em] text-[#c9b199]">Built something worth seeing?</p>
            <h2 className="mt-5 max-w-4xl font-display text-4xl leading-none sm:text-6xl lg:text-7xl">The vitrine is open to authors, not to CVs.</h2>
          </div>
          <button type="button" onClick={() => setSubmitting(true)} className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#f5f0eb] px-7 font-sans text-[10px] uppercase tracking-[0.18em] text-[#4a1728] hover:bg-[#fdfaf6]"><Plus size={17} /> Submit work</button>
        </div>
      </section>
    </main>

    <footer className="border-t border-white/10 bg-[#4a1728] px-4 py-7 text-[#f5f0eb] sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 font-sans text-[8px] uppercase tracking-[0.16em] text-white/45 sm:flex-row sm:items-center sm:justify-between">
        <span>© 2026 EPRIS Journal</span>
        <a href="/" className="inline-flex min-h-11 items-center gap-2 text-white/70 hover:text-white">Return to journal <ArrowUpRight size={13} /></a>
      </div>
    </footer>

    {selected && <WorkDetail work={selected} onClose={() => setSelected(null)} />}
    {submitting && <SubmitWork onClose={() => setSubmitting(false)} onAdded={(work) => setWorks((current) => [work, ...current])} />}
  </div>;
}
