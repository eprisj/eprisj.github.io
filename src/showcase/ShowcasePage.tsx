import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, ImageOff,
  Instagram, Loader2, Plus, Search, SlidersHorizontal, X,
} from 'lucide-react';
import {
  DISCIPLINES, EMPTY_WORK_DRAFT, Work, WorkDraft,
  DailyShowcase, externalUrl, fetchDailyArchive, fetchDailyShowcase, fetchWorks, flag, normalizeInstagram, submitWork,
} from './showcaseApi';
import { Commission } from './Commission';
import { btnGhost, btnSolid } from './ui';
import { ShowcaseAtlas } from './ShowcaseAtlas';

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
      <div className={`max-h-[94dvh] w-full overflow-y-auto rounded-t-[20px] bg-[#f5f0eb] shadow-xl sm:rounded-none sm:border sm:border-[#4a1728]/15 ${wide ? 'sm:max-w-4xl' : 'sm:max-w-xl'}`}>
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
/* `single` отключает подмену кадра на ховере. В первом экране она не просто
   лишняя: второй кадр там лежал поверх первого с непрозрачностью 1 — класс
   opacity-0 в разметке есть, а вычисленное значение 1, — и полотно во всю
   ширину показывало ту же фотографию, что и врезка рядом с ним. Одна работа,
   две одинаковые картинки в одном экране. Герою подмена и не нужна: «внутри
   есть ещё» там говорит сама врезка. */
function WorkPlate({ work, index, className = '', single = false }: { work: Work; index: number; className?: string; single?: boolean }) {
  const [failed, setFailed] = useState(false);
  const image = work.images?.[0];
  const second = single ? undefined : work.images?.[1];
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
    <>
      <img
        src={image.url}
        alt={image.caption || `${work.title} — ${work.author}`}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover transition-[transform,opacity] duration-700 group-hover:scale-[1.04] ${second ? 'group-hover:opacity-0' : ''} ${className}`}
        style={{ backgroundColor: tint }}
      />
      {/* The second frame is the only honest way to say "there is more inside"
          without hanging a badge on the picture. */}
      {second && (
        <img
          src={second.url}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className={`pointer-events-none absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-700 group-hover:opacity-100 ${className}`}
        />
      )}
    </>
  );
}

/* The breakdown a set designer actually wants: what the thing is made of,
   where it stood, when, whose it is, and what it does — one line each, in the
   opening spread's register.

   Every row is a field a human filled in from the source article. A row with
   nothing behind it says so rather than guessing: an empty "material" is
   information too, and inventing one would put words in the author's mouth. */
function Decomposition({ work }: { work: Work }) {
  const rows = [
    { key: 'material', value: work.medium },
    { key: 'place', value: [work.venue, work.city, work.country].filter(Boolean).join(' · ') },
    { key: 'moment', value: [work.year, work.discipline].filter(Boolean).join(' · ') },
    { key: 'authorship', value: [work.author, work.credits].filter(Boolean).join(' — ') },
    { key: 'reading', value: work.statement },
  ];

  return (
    <section className="relative isolate mt-9 bg-[#1a0b10] px-5 py-8 text-[#f5f0eb] sm:px-8 sm:py-10">
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-[6%] hidden w-px bg-[#f5f0eb]/12 sm:block" />
      <h3 className="font-display text-[clamp(3rem,9vw,5.6rem)] lowercase leading-[0.82] tracking-normal">decomposition</h3>

      <dl className="mt-7 divide-y divide-[#f5f0eb]/12 border-t border-[#f5f0eb]/12">
        {rows.map((row, index) => (
          <div key={row.key} className="grid grid-cols-[2.2rem_1fr] gap-x-4 py-4 sm:grid-cols-[3rem_7rem_1fr] sm:gap-x-6">
            <span className="font-sans text-[9px] tabular-nums tracking-[0.16em] text-[#f5f0eb]/35">
              {String(index + 1).padStart(2, '0')}
            </span>
            <dt className="font-sans text-[9px] uppercase tracking-[0.2em] text-[#f5f0eb]/45 max-sm:col-start-2">
              {row.key}
            </dt>
            <dd className={`max-sm:col-start-2 max-sm:mt-1.5 font-sans leading-snug ${row.value ? 'text-[#f5f0eb]' : 'text-[#f5f0eb]/30'} ${row.key === 'reading' ? 'text-[15px] leading-relaxed sm:text-[17px]' : 'text-[15px] sm:text-[16px]'}`}>
              {row.value || 'not stated in the source'}
            </dd>
          </div>
        ))}
      </dl>

      {!!work.tags?.length && (
        <div className="mt-7 flex flex-wrap gap-2 border-t border-[#f5f0eb]/12 pt-6">
          {work.tags.map((tag) => (
            <span key={tag} className="border border-[#f5f0eb]/20 px-3 py-1.5 font-sans text-[8px] uppercase tracking-[0.12em] text-[#f5f0eb]/70">{tag}</span>
          ))}
        </div>
      )}
    </section>
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
        {/* Works come in every proportion; a dark ground turns the leftover
            space into a mount instead of an accidental margin. */}
        <div className="overflow-hidden bg-[#2b0d18]">
          {current ? (
            <img src={current.url} alt={current.caption || work.title} className="mx-auto max-h-[68dvh] w-auto max-w-full object-contain" />
          ) : (
            <div className="grid aspect-[4/3] place-items-center text-[#f5f0eb]/30"><ImageOff size={28} /></div>
          )}
        </div>
        {images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {images.map((image, index) => (
              <button key={`${image.url}-${index}`} type="button" onClick={() => setActive(index)} className={`h-16 w-16 shrink-0 overflow-hidden border transition-opacity ${index === active ? 'border-[#4a1728]' : 'border-[#4a1728]/15 opacity-60 hover:opacity-100'}`} aria-label={`Image ${index + 1}`}>
                <img src={image.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
        {current?.credit && <p className="mt-3 font-sans text-[9px] uppercase tracking-[0.16em] text-[#4a1728]/55">Photo — {current.credit}</p>}

        <div className="mt-7 flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <h2 className="font-display text-[clamp(2.2rem,5vw,4rem)] leading-[0.86] tracking-normal text-[#1a0b10]">{work.title}</h2>
            <p className="mt-3 font-display text-xl italic text-[#b8956e]">{work.author}{work.year ? `, ${work.year}` : ''}</p>
            <p className="mt-4 border-t border-[#4a1728]/15 pt-3 font-sans text-[10px] uppercase tracking-[0.18em] text-[#4a1728]/60">{[work.venue, work.city, work.country].filter(Boolean).join(' · ') || 'Location not stated'}</p>
          </div>
          {work.country && (
            <p className="shrink-0 font-sans text-[9px] uppercase tracking-[0.2em] text-[#4a1728]/45">{work.country}</p>
          )}
        </div>

        <Decomposition work={work} />

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          {handle && <a href={`https://www.instagram.com/${encodeURIComponent(handle)}/`} target="_blank" rel="noreferrer" className={btnSolid('bone')}><Instagram size={16} /> @{handle}</a>}
          {work.portfolio && <a href={externalUrl(work.portfolio)} target="_blank" rel="noreferrer" className={btnGhost('bone')}>Portfolio <ArrowUpRight size={15} /></a>}
          {work.sourceUrl && work.sourceUrl !== work.portfolio && <a href={externalUrl(work.sourceUrl)} target="_blank" rel="noreferrer" className={btnGhost('bone')}>Source <ArrowUpRight size={15} /></a>}
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
        <button type="button" onClick={onClose} className={btnGhost('bone')}>{state === 'success' ? 'Close' : 'Cancel'}</button>
        {state !== 'success' && <button type="submit" disabled={state === 'sending'} className={`${btnSolid('bone')} disabled:opacity-60`}>{state === 'sending' ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Submit work</button>}
      </div>
    </form>
  </ModalShell>;
}

function DailyShowcaseSection({ daily, archive, onOpenWork }: { daily: DailyShowcase | null; archive: DailyShowcase[]; onOpenWork: (work: Work) => void }) {
  if (!daily?.works?.length) return null;
  const formatDate = (value: string | null) => {
    if (!value) return '';
    const parsed = new Date(`${value}T12:00:00Z`);
    return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'Europe/Kyiv' }).format(parsed);
  };
  const archived = archive.filter((entry) => entry.date && entry.date !== daily.date).slice(0, 12);

  return (
    <section id="daily" className="border-y border-[#4a1728]/12 bg-[#e9dece]/45 px-4 py-14 sm:px-8 sm:py-20 lg:px-12">
      <div className="mx-auto max-w-[1600px]">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.72fr)] lg:items-end">
          <div>
            <p className="font-sans text-[9px] uppercase tracking-[0.22em] text-[#4a1728]/55">Daily showcase · {formatDate(daily.date)}</p>
            <h2 className="mt-5 max-w-[12ch] font-display text-[clamp(3rem,7vw,6rem)] lowercase leading-[0.82] tracking-normal text-[#1a0b10]">{daily.title}</h2>
          </div>
          <p className="max-w-[46ch] justify-self-end font-sans text-[15px] leading-relaxed text-[#4a1728]/70">{daily.description}</p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
          {daily.works.slice(0, 4).map((work, index) => (
            <button key={work.id} type="button" onClick={() => onOpenWork(work)} className="group text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4a1728]">
              <span className="relative block aspect-[4/5] overflow-hidden border border-[#4a1728]/10 bg-[#e5d8c6]">
                <WorkPlate work={work} index={index} className="absolute inset-0 h-full w-full" />
              </span>
              <span className="mt-3 block font-display text-[1.2rem] leading-tight text-[#1a0b10] underline-offset-4 group-hover:underline sm:text-[1.45rem]">{work.title}</span>
              <span className="mt-1 block font-sans text-[9px] uppercase tracking-[0.15em] text-[#4a1728]/50">{work.author}</span>
            </button>
          ))}
        </div>

        {archived.length > 0 && (
          <div className="mt-16 border-t border-[#4a1728]/15 pt-7">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <h3 className="font-sans text-[10px] uppercase tracking-[0.22em] text-[#4a1728]">Daily archive</h3>
              <p className="font-sans text-[10px] uppercase tracking-[0.16em] text-[#4a1728]/45">Every selection stays credited</p>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {archived.map((entry) => (
                <div key={entry.date} className="border border-[#4a1728]/12 bg-[#f5f0eb] p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-display text-xl text-[#1a0b10]">{formatDate(entry.date)}</p>
                    <span className="font-sans text-[8px] uppercase tracking-[0.16em] text-[#4a1728]/45">{entry.mode === 'manual' ? 'Editorial' : 'Automatic'}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 font-sans text-[12px] leading-relaxed text-[#4a1728]/60">{entry.description}</p>
                  <div className="mt-4 flex gap-2 overflow-hidden">
                    {entry.works.slice(0, 4).map((work, index) => (
                      <button key={work.id} type="button" onClick={() => onOpenWork(work)} className="group relative h-16 w-14 shrink-0 overflow-hidden bg-[#e5d8c6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4a1728]" aria-label={`Open ${work.title}`}>
                        <WorkPlate work={work} index={index} className="absolute inset-0 h-full w-full" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function ShowcasePage() {
  const [works, setWorks] = useState<Work[]>([]);
  const [daily, setDaily] = useState<DailyShowcase | null>(null);
  const [dailyArchive, setDailyArchive] = useState<DailyShowcase[]>([]);
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
  const [commissioning, setCommissioning] = useState(false);
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

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([fetchDailyShowcase(controller.signal), fetchDailyArchive(controller.signal)])
      .then(([today, archive]) => {
        setDaily(today);
        setDailyArchive(archive);
      })
      .catch((reason) => { if (reason.name !== 'AbortError') setDailyArchive([]); });
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

  const selectedSegment = discipline === ALL_DISCIPLINES ? 'sources of inspiration' : discipline;
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
  // One work opens the page at full width — but only on the plain, unfiltered
  // view, where there is no question the reader is already trying to answer.
  //
  // Which work that is, is an editorial decision and cannot be inferred here.
  // The rule used to be "newest work that has a gallery", so the opening frame
  // was simply whatever was added last: a photograph chosen for the grid, where
  // it is cropped to 4:5 and read at 400px, got stretched across the whole
  // window. A picture in which the work sits small behind a tree survives that
  // crop and dies full-bleed. So the server marks the works whose first frame
  // can carry a screen, and only those are eligible.
  const leadWork = page === 1 && activeFilterCount === 0 && sort === 'newest' && visible.length > 3
    ? (visible.find((w) => w.featured && (w.images || []).length > 1)
      || visible.find((w) => w.featured)
      || null)
    : null;
  const gridWorks = leadWork ? visible.filter((w) => w !== leadWork) : visible;
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
          <button type="button" onClick={() => setSubmitting(true)} aria-label="Submit work" className={btnSolid('bone')}>
            <Plus size={15} /><span className="hidden sm:inline">Submit work</span><span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

    </header>

    <main>
      {/* The opening spread: one work at the width of the window, the section
          named over it. Only on the plain view — under a filter the reader is
          already looking for something and a full screen of picture is in the
          way. */}
      {leadWork && (
        <section className="relative isolate flex min-h-[92vh] flex-col justify-between overflow-hidden bg-[#1a0b10]">
          <WorkPlate work={leadWork} index={0} single className="absolute inset-0 h-full w-full object-cover" />
          {/* Their scrim is near-black and even; the photograph carries the
              whole frame rather than sitting behind a burgundy wash. */}
          <div className="absolute inset-0 bg-[#0d0508]/45" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0508]/80 via-transparent to-[#0d0508]/35" />

          {/* Hairline rules down the frame, as on their page. */}
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-[8%] hidden w-px bg-[#f5f0eb]/12 lg:block" />
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-[8%] hidden w-px bg-[#f5f0eb]/12 lg:block" />

          {/* The wordmark: two lines, lowercase, set as large as the frame
              allows — the one element their page is built around. */}
          <div className="relative z-10 px-6 pt-10 sm:px-10 lg:px-14 lg:pt-14">
            <h1 className="font-display lowercase leading-[0.82] tracking-normal text-[#f5f0eb]">
              <span className="block text-[15vw] sm:text-[11vw] lg:text-[8.5vw]">epris</span>
              <span className="block pl-[0.06em] text-[10vw] font-normal sm:text-[7vw] lg:text-[5.4vw]">showcase</span>
            </h1>
          </div>

          {/* The inset card, floated right and overlapping the frame, opening
              the featured work. */}
          {leadWork.images?.[1] && (
            <button
              type="button"
              onClick={() => setSelected(leadWork)}
              aria-label={`Open ${leadWork.title}`}
              className="group absolute right-0 top-1/2 z-10 hidden w-[38vw] max-w-[520px] -translate-y-1/3 overflow-hidden rounded-l-[18px] shadow-2xl md:block"
            >
              <img src={leadWork.images[1].url} alt="" className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
              <span className="absolute bottom-4 left-4 grid h-11 w-11 place-items-center rounded-full bg-[#f5f0eb] text-[#1a0b10] transition-transform group-hover:translate-x-1">
                <ArrowRight size={18} />
              </span>
            </button>
          )}

          <div className="relative z-10 flex flex-wrap items-end justify-between gap-6 px-6 pb-10 sm:px-10 lg:px-14 lg:pb-14">
            <div>
              {/* Their corner glyph: a bare diagonal arrow over two rules. */}
              <span aria-hidden="true" className="mb-4 grid h-12 w-12 border-b border-l border-[#f5f0eb]/60 text-[#f5f0eb]">
                <ArrowUpRight size={26} className="justify-self-end" />
              </span>
              <p className="max-w-md font-sans text-[13px] lowercase leading-relaxed text-[#f5f0eb]/85 sm:text-[15px]">
                set design and conceptual art, reviewed by the epris editorial
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSelected(leadWork)}
              className="group max-w-sm border-t border-[#f5f0eb]/30 pt-3 text-left"
            >
              <p className="font-sans text-[9px] uppercase tracking-[0.2em] text-[#f5f0eb]/60">
                {leadWork.discipline || 'Work'}{leadWork.year ? ` · ${leadWork.year}` : ''}
              </p>
              <p className="mt-1.5 font-sans text-lg leading-tight text-[#f5f0eb] underline-offset-4 group-hover:underline">
                {leadWork.title}
              </p>
              <p className="mt-1 font-sans text-[9px] uppercase tracking-[0.16em] text-[#f5f0eb]/60">
                {[leadWork.author, leadWork.city].filter(Boolean).join(' · ')}
              </p>
            </button>
          </div>
        </section>
      )}

      <DailyShowcaseSection daily={daily} archive={dailyArchive} onOpenWork={setSelected} />

      <ShowcaseAtlas
        works={filtered.length ? filtered : works}
        loading={loading}
        onOpenWork={setSelected}
      />

      {/* Catalogue head: crumb, name of the current cut, count. Дисциплины
          отсюда убраны — тот же список стоит в сайдбаре в трёх сантиметрах
          ниже, и две копии одного фильтра расходились по состоянию на глазах
          у читателя. Заголовок здесь h2: h1 на странице один, в первом кадре. */}
      <section className="px-4 pt-10 sm:px-8 lg:px-12 lg:pt-14">
        <div className="mx-auto max-w-[1600px]">
          <nav aria-label="Breadcrumb" className="font-sans text-[9px] uppercase tracking-[0.2em] text-[#4a1728]/55">
            <a href="/" className="hover:text-[#4a1728]">Journal</a> / <span className="text-[#4a1728]">Showcase</span>
          </nav>

          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="min-w-0">
              <h2 className="font-display text-[clamp(2.6rem,6vw,4.6rem)] lowercase leading-[0.86] tracking-normal">{selectedSegment}</h2>
              <p className="mt-4 max-w-[48rem] font-sans text-[15px] leading-relaxed text-[#4a1728]/64 sm:text-[17px]">
                A curated reference shelf for rooms, windows, sets and exhibition moves. Save the visual language here, then take it into Bureau when the idea needs a built scene.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              <p className="border border-[#4a1728]/12 px-4 py-3 font-sans text-[9px] uppercase tracking-[0.16em] text-[#4a1728]/55">
                {loading ? 'Loading…' : `${filtered.length} ${filtered.length === 1 ? 'reference' : 'references'}`}
              </p>
              <a href="/bureau" className={btnSolid('bone')}>
                Open Bureau <ArrowUpRight size={15} />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
        <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-8 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-10">
          <aside className="min-w-0 lg:sticky lg:top-32 lg:self-start">
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
                  <li><button type="button" onClick={() => setDiscipline(ALL_DISCIPLINES)} className={`min-h-8 text-left text-sm transition-colors ${discipline === ALL_DISCIPLINES ? 'text-[#4a1728]' : 'text-[#4a1728]/65 hover:text-[#4a1728]'}`}>All inspiration sources</button></li>
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

          <div className="min-w-0">
            {/* Ряд чипсов авторов стоял здесь вторым способом выбрать автора —
                при том, что первый (список в сайдбаре) виден в том же экране.
                Осталось активное состояние: что фильтр включён, видно по
                строке ниже и по кнопке сброса. */}
            {author && (
              <button type="button" onClick={() => setAuthor('')} className="mb-5 inline-flex min-h-11 items-center gap-2 border border-[#4a1728] bg-[#4a1728] px-4 font-sans text-[9px] uppercase tracking-[0.14em] text-white">
                {author} <X size={13} />
              </button>
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
                <button type="button" onClick={() => window.location.reload()} className={`${btnGhost('bone')} mt-4 border-red-300 text-red-900`}>Try again</button>
              </div>
            ) : visible.length === 0 ? (
              <div className="grid min-h-[26rem] place-items-center px-6 text-center">
                <div className="max-w-md">
                  <Search size={26} className="mx-auto text-[#4a1728]/40" />
                  <p className="mt-5 font-display text-[clamp(2.6rem,7vw,5rem)] lowercase leading-[0.84] tracking-normal">{works.length === 0 ? 'The vitrine is being assembled.' : 'No works match these filters.'}</p>
                  <p className="mt-4 text-sm leading-relaxed text-[#4a1728]/65">{works.length === 0 ? 'Submissions are open — the first works are under editorial review. Send yours and it goes into the queue.' : 'Try clearing a filter or widening the search.'}</p>
                  <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                    {works.length > 0 && activeFilterCount > 0 && <button type="button" onClick={resetFilters} className={btnGhost('bone')}>Clear filters</button>}
                    <button type="button" onClick={() => setSubmitting(true)} className={btnSolid('bone')}><Plus size={16} /> Submit work</button>
                  </div>
                </div>
              </div>
            ) : (
              <>
              <div className="mt-10 grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                {gridWorks.map((work, index) => {
                  /* Один кадр із п'яти йде на дві колонки — щоб ряд не читався
                     як таблиця. Період саме 5, а не 4: у трьох колонках це
                     3 + (широка + вузька) = два повні ряди. При періоді 4
                     широкій не вистачало місця в ряду, вона переносилась і
                     лишала дірку в третій колонці.

                     Пропорція широкої теж інша. З вертикальними 4:5 вона при
                     859px ставала 1208px заввишки, сусідня лишалась 651 — і під
                     нею зяяло пів екрана порожнечі. 5:3 дає ту саму висоту, що
                     й у вузьких сусідів. */
                  const wide = index % 5 === 3;
                  return (
                  /* Карточка кликабельна целиком, но настоящая кнопка на ней
                     одна — «read». Обёртка поэтому div, а не button: кнопка в
                     кнопке — невалидная разметка, и клавиатура в ней теряется. */
                  <div key={work.id} onClick={() => setSelected(work)} className={`group flex cursor-pointer flex-col text-left ${wide ? "sm:col-span-2" : ""}`}>
                    <div className={`relative overflow-hidden border border-[#4a1728]/10 bg-[#e9dece] shadow-[0_18px_42px_rgba(74,23,40,.08)] transition-[box-shadow,transform,border-color] duration-300 group-hover:-translate-y-1 group-hover:border-[#4a1728]/24 group-hover:shadow-[0_34px_82px_rgba(74,23,40,.16)] ${wide ? "aspect-[4/5] sm:aspect-[5/3]" : "aspect-[4/5]"}`}>
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
                    <div className="mt-4 flex flex-1 flex-col border-t border-[#4a1728]/15 pt-4">
                      <p className="font-sans text-[8px] uppercase tracking-[0.18em] text-[#4a1728]/40">
                        {work.discipline || 'Work'}{work.year ? ` · ${work.year}` : ''}
                      </p>
                      <h2 className="mt-2 line-clamp-2 min-h-[2.45em] font-display text-[1.35rem] leading-[1.05] tracking-normal text-[#1a0b10] decoration-[#1a0b10]/30 underline-offset-4 group-hover:underline sm:text-[1.55rem]">
                        {work.title}
                      </h2>
                      <p className="mt-auto pt-2 text-[13px] leading-snug text-[#4a1728]/80">{work.author}</p>
                      <p className="mt-1 font-sans text-[8px] uppercase tracking-[0.14em] text-[#4a1728]/40">
                        {[
                          [work.city, work.country].filter(Boolean).join(', '),
                          (work.images || []).length > 1 ? `${(work.images || []).length} frames` : '',
                        ].filter(Boolean).join(' · ')}
                      </p>
                      {/* Ход в работу нужен и с клавиатуры, но обведённая
                          коробка под каждой плиткой превращала сетку в панель
                          управления: тридцать семь рамок на экран. Тихая
                          строка делает ту же работу и не спорит с картинкой. */}
                      <button
                        type="button"
                        onClick={(event) => { event.stopPropagation(); setSelected(work); }}
                        aria-label={`Read ${work.title} — ${work.author}`}
                        className="mt-3 inline-flex min-h-9 w-fit items-center gap-1.5 font-sans text-[9px] uppercase tracking-[0.16em] text-[#4a1728]/55 underline-offset-4 transition-colors group-hover:text-[#1a0b10] group-hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4a1728]"
                      >
                        Read <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
              </>
            )}

            {!loading && !error && filtered.length > PAGE_SIZE && (
              <nav className="mt-12 flex items-center justify-between border-t border-[#4a1728]/10 pt-6" aria-label="Work pages">
                <button type="button" onClick={() => { setPage((value) => Math.max(1, value - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={page === 1} className={`${btnGhost('bone')} disabled:opacity-30`}><ArrowLeft size={14} /> Previous</button>
                <span className="font-sans text-[9px] uppercase tracking-[0.16em] text-[#4a1728]/55">{page} / {pages}</span>
                <button type="button" onClick={() => { setPage((value) => Math.min(pages, value + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={page === pages} className={`${btnGhost('bone')} disabled:opacity-30`}>Next <ArrowRight size={14} /></button>
              </nav>
            )}
          </div>
        </div>
      </section>

      {/* ДВЕ двери, а не одна. Раньше все призывы на странице просили отдать
          нам работу — то есть страница умела только брать. Человеку, который
          хочет нанять бюро, идти было решительно некуда, и это была не
          недоделка оформления, а отсутствие коммерческого хода как такового. */}
      <section className="relative isolate border-t border-[#4a1728]/10 bg-[#1a0b10] text-[#f5f0eb]">
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-[8%] hidden w-px bg-[#f5f0eb]/12 lg:block" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-[8%] hidden w-px bg-[#f5f0eb]/12 lg:block" />
        <div className="mx-auto grid max-w-[1600px] divide-y divide-[#f5f0eb]/12 lg:grid-cols-2 lg:divide-x lg:divide-y-0">

          {/* Заказчик идёт первым: он и есть тот, ради кого витрина показывает
              работы. Автор — второй дверью, но не тише. */}
          <button
            type="button"
            onClick={() => setCommissioning(true)}
            className="group flex flex-col justify-between gap-8 px-4 py-12 text-left transition-colors hover:bg-[#f5f0eb]/[0.04] sm:px-8 sm:py-14 lg:px-12"
          >
            <div>
              <p className="font-sans text-[9px] uppercase tracking-[0.22em] text-[#c9b199]">Have a space that has to do something?</p>
              <h2 className="mt-5 max-w-[16ch] font-display text-[clamp(2.4rem,4.6vw,3.6rem)] lowercase leading-[0.86] tracking-normal">
                commission the bureau
              </h2>
              <p className="mt-5 max-w-[42ch] font-sans text-[14px] leading-relaxed text-[#f5f0eb]/60">
                Scenography, exhibitions, installations and windows. Send the room, the date
                and a sentence — a person reads it.
              </p>
            </div>
            <span className="inline-flex items-center gap-3 font-sans text-[10px] uppercase tracking-[0.18em] text-[#f5f0eb]">
              Send a brief
              <span className="grid h-11 w-11 place-items-center rounded-full border border-[#f5f0eb]/40 transition-transform group-hover:translate-x-1">
                <ArrowRight size={17} />
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubmitting(true)}
            className="group flex flex-col justify-between gap-8 px-4 py-12 text-left transition-colors hover:bg-[#f5f0eb]/[0.04] sm:px-8 sm:py-14 lg:px-12"
          >
            <div>
              <p className="font-sans text-[9px] uppercase tracking-[0.22em] text-[#c9b199]">Built something worth seeing?</p>
              <h2 className="mt-5 max-w-[16ch] font-display text-[clamp(2.4rem,4.6vw,3.6rem)] lowercase leading-[0.86] tracking-normal">
                the vitrine is open to authors, not to CVs
              </h2>
              <p className="mt-5 max-w-[42ch] font-sans text-[14px] leading-relaxed text-[#f5f0eb]/60">
                One work, one photograph you have the right to show. The editorial reads every
                submission before anything appears.
              </p>
            </div>
            <span className="inline-flex items-center gap-3 font-sans text-[10px] uppercase tracking-[0.18em] text-[#f5f0eb]">
              Submit work
              <span className="grid h-11 w-11 place-items-center rounded-full border border-[#f5f0eb]/40 transition-transform group-hover:translate-x-1">
                <Plus size={17} />
              </span>
            </span>
          </button>
        </div>
      </section>
    </main>

    <footer className="border-t border-white/10 bg-[#1a0b10] px-4 py-7 text-[#f5f0eb] sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 font-sans text-[8px] uppercase tracking-[0.16em] text-white/45 sm:flex-row sm:items-center sm:justify-between">
        <span>© 2026 EPRIS Journal</span>
        <a href="/" className="inline-flex min-h-11 items-center gap-2 text-white/70 hover:text-white">Return to journal <ArrowUpRight size={13} /></a>
      </div>
    </footer>

    {selected && <WorkDetail work={selected} onClose={() => setSelected(null)} />}
    {submitting && <SubmitWork onClose={() => setSubmitting(false)} onAdded={(work) => setWorks((current) => [work, ...current])} />}
    {commissioning && <Commission onClose={() => setCommissioning(false)} />}
  </div>;
}
