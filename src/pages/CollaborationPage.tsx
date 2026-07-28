import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, Filter,
  Instagram, Loader2, MapPin, Plus, Search, SlidersHorizontal, X,
} from 'lucide-react';

const API_URL = 'https://api.eprisjournal.com/collaboration/leads';
const PAGE_SIZE = 20;

type Lead = {
  id: string;
  name: string;
  instagram?: string;
  country?: string;
  countryCode?: string;
  city?: string;
  discipline?: string;
  status?: string;
  priority?: string;
  score?: number;
  portfolio?: string;
  sourceUrl?: string;
  why?: string;
  angles?: string[];
  addedAt?: string;
};

type Draft = {
  name: string;
  instagram: string;
  country: string;
  countryCode: string;
  city: string;
  discipline: string;
  portfolio: string;
  why: string;
  angle: string;
  contact: string;
  website: string;
};

const EMPTY_DRAFT: Draft = {
  name: '', instagram: '', country: '', countryCode: '', city: '',
  discipline: 'Architecture', portfolio: '', why: '', angle: '', contact: '', website: '',
};

const DISCIPLINES = [
  'Architecture', 'Interior design', 'Product design', 'Visual art',
  'Sculpture', 'Textile', 'Digital art', 'Multidisciplinary', 'Other',
];

function flag(code?: string) {
  const normalized = (code || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return '◌';
  return String.fromCodePoint(...[...normalized].map((letter) => 127397 + letter.charCodeAt(0)));
}

function normalizeInstagram(value?: string) {
  return (value || '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/\/$/, '');
}

function externalUrl(value?: string) {
  if (!value) return '';
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function statusClass(status?: string) {
  if ((status || '').toLowerCase().includes('рассмотр')) return 'bg-amber-100 text-amber-900 border-amber-200';
  return 'bg-emerald-50 text-emerald-900 border-emerald-200';
}

function ModalShell({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', onKey); };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-[#160d10]/55 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className={`max-h-[94dvh] w-full overflow-y-auto rounded-t-[28px] bg-[#f5f0ea] shadow-2xl sm:rounded-[28px] ${wide ? 'sm:max-w-3xl' : 'sm:max-w-xl'}`}>
        <div className="sticky top-0 z-10 flex min-h-16 items-center justify-between border-b border-[#2d1820]/10 bg-[#f5f0ea]/95 px-5 backdrop-blur-md sm:px-7">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#6d4b57]">{title}</p>
          <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full border border-[#2d1820]/15 transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9f4f42]" aria-label="Close">
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function LeadDetail({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const handle = normalizeInstagram(lead.instagram);
  return (
    <ModalShell title="Candidate profile" onClose={onClose} wide>
      <div className="p-5 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white text-3xl shadow-sm" aria-hidden="true">{flag(lead.countryCode)}</span>
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap gap-2">
              <span className={`rounded-full border px-3 py-1 font-mono text-[9px] uppercase tracking-[0.15em] ${statusClass(lead.status)}`}>{lead.status || 'New'}</span>
              {lead.priority && <span className="rounded-full border border-[#a65346]/20 bg-[#a65346]/10 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.15em] text-[#7a3027]">{lead.priority}</span>}
            </div>
            <h2 className="font-serif text-3xl leading-[1.05] text-[#28151b] sm:text-5xl">{lead.name}</h2>
            <p className="mt-3 flex items-center gap-2 text-sm text-[#735f66]"><MapPin size={15} /> {[lead.city, lead.country].filter(Boolean).join(', ') || 'Location not specified'}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-[#2d1820]/10 bg-[#2d1820]/10 sm:grid-cols-3">
          <div className="bg-[#fbf8f4] p-4"><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#8a747b]">Discipline</p><p className="mt-2 font-serif text-lg">{lead.discipline || '—'}</p></div>
          <div className="bg-[#fbf8f4] p-4"><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#8a747b]">EPRIS score</p><p className="mt-2 font-serif text-lg">{lead.score ?? '—'}{typeof lead.score === 'number' ? '/100' : ''}</p></div>
          <div className="bg-[#fbf8f4] p-4"><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#8a747b]">Added</p><p className="mt-2 font-serif text-lg">{lead.addedAt ? new Date(lead.addedAt).toLocaleDateString('en-GB') : '—'}</p></div>
        </div>

        <section className="mt-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#9f4f42]">Why this voice matters</p>
          <p className="mt-3 font-serif text-xl leading-relaxed text-[#3b272d] sm:text-2xl">{lead.why || 'Editorial description is being prepared.'}</p>
        </section>

        {!!lead.angles?.length && <section className="mt-8 border-t border-[#2d1820]/10 pt-7">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#9f4f42]">Possible interview angles</p>
          <ol className="mt-4 space-y-3">{lead.angles.map((angle, index) => <li key={`${angle}-${index}`} className="flex gap-4 font-serif text-lg leading-snug"><span className="font-mono text-[10px] text-[#a65346]">0{index + 1}</span><span>{angle}</span></li>)}</ol>
        </section>}

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          {handle && <a href={`https://www.instagram.com/${encodeURIComponent(handle)}/`} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#28151b] px-6 font-mono text-[10px] uppercase tracking-[0.18em] text-white transition-transform hover:-translate-y-0.5"><Instagram size={16} /> @{handle}</a>}
          {lead.portfolio && <a href={externalUrl(lead.portfolio)} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#28151b]/20 px-6 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors hover:bg-white">Portfolio <ArrowUpRight size={15} /></a>}
          {lead.sourceUrl && lead.sourceUrl !== lead.portfolio && <a href={externalUrl(lead.sourceUrl)} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#28151b]/20 px-6 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors hover:bg-white">Source <ArrowUpRight size={15} /></a>}
        </div>
      </div>
    </ModalShell>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-[#69525a]">{label}{required && <span className="text-[#a4493d]"> *</span>}</span>{children}</label>;
}

const inputClass = 'min-h-12 w-full rounded-xl border border-[#2d1820]/15 bg-white px-4 text-[15px] text-[#28151b] outline-none transition-shadow placeholder:text-[#8d7d82] focus:border-[#9f4f42] focus:ring-2 focus:ring-[#9f4f42]/20';

function AddCandidate({ onClose, onAdded }: { onClose: () => void; onAdded: (lead: Lead) => void }) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [state, setState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const set = (key: keyof Draft, value: string) => setDraft((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setState('sending'); setMessage('');
    try {
      const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Could not submit candidate');
      setState('success');
      setMessage('Candidate added to the registry and marked for editorial review.');
      onAdded(result.lead);
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Could not submit candidate');
    }
  }

  return <ModalShell title="Suggest a candidate" onClose={onClose} wide>
    <form onSubmit={submit} className="p-5 sm:p-8">
      <div className="mb-7 max-w-xl"><h2 className="font-serif text-3xl text-[#28151b] sm:text-4xl">Add a new creative voice</h2><p className="mt-3 text-sm leading-relaxed text-[#715f65]">Public suggestions appear with “Under review” status. The EPRIS editorial team verifies every profile before outreach.</p></div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name / studio" required><input className={inputClass} value={draft.name} onChange={(e) => set('name', e.target.value)} maxLength={120} required autoFocus /></Field>
        <Field label="Instagram" required><input className={inputClass} value={draft.instagram} onChange={(e) => set('instagram', e.target.value)} maxLength={80} required placeholder="@handle" autoCapitalize="none" /></Field>
        <Field label="Country" required><input className={inputClass} value={draft.country} onChange={(e) => set('country', e.target.value)} maxLength={80} required /></Field>
        <Field label="Country code"><input className={inputClass} value={draft.countryCode} onChange={(e) => set('countryCode', e.target.value.toUpperCase().slice(0, 2))} maxLength={2} placeholder="GB" /></Field>
        <Field label="City"><input className={inputClass} value={draft.city} onChange={(e) => set('city', e.target.value)} maxLength={80} /></Field>
        <Field label="Discipline"><select className={inputClass} value={draft.discipline} onChange={(e) => set('discipline', e.target.value)}>{DISCIPLINES.map((item) => <option key={item}>{item}</option>)}</select></Field>
        <div className="sm:col-span-2"><Field label="Portfolio link"><input className={inputClass} value={draft.portfolio} onChange={(e) => set('portfolio', e.target.value)} type="url" maxLength={300} placeholder="https://" /></Field></div>
        <div className="sm:col-span-2"><Field label="Why should EPRIS interview them?" required><textarea className={`${inputClass} min-h-28 resize-y py-3`} value={draft.why} onChange={(e) => set('why', e.target.value)} maxLength={800} required /></Field></div>
        <div className="sm:col-span-2"><Field label="Suggested interview angle"><textarea className={`${inputClass} min-h-24 resize-y py-3`} value={draft.angle} onChange={(e) => set('angle', e.target.value)} maxLength={300} /></Field></div>
        <div className="sm:col-span-2"><Field label="Your contact (kept private)"><input className={inputClass} value={draft.contact} onChange={(e) => set('contact', e.target.value)} maxLength={160} placeholder="Email or Instagram" /></Field></div>
        <input tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" value={draft.website} onChange={(e) => set('website', e.target.value)} />
      </div>
      {message && <div role="status" className={`mt-6 rounded-xl border p-4 text-sm ${state === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-900'}`}>{state === 'success' && <Check size={16} className="mr-2 inline" />}{message}</div>}
      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className="min-h-12 rounded-full border border-[#28151b]/20 px-6 font-mono text-[10px] uppercase tracking-[0.18em] hover:bg-white">{state === 'success' ? 'Close' : 'Cancel'}</button>
        {state !== 'success' && <button type="submit" disabled={state === 'sending'} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#a34f42] px-7 font-mono text-[10px] uppercase tracking-[0.18em] text-white disabled:opacity-60">{state === 'sending' ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Add candidate</button>}
      </div>
    </form>
  </ModalShell>;
}

export function CollaborationPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('All countries');
  const [discipline, setDiscipline] = useState('All disciplines');
  const [sort, setSort] = useState('score');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [adding, setAdding] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    document.title = 'Collaboration Registry — EPRIS Journal';
    document.documentElement.lang = 'en';
    const description = 'Discover and suggest emerging architects, designers and artists for EPRIS Journal interviews and editorial collaborations.';
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
    meta.content = description;
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = 'https://eprisjournal.com/collaboation';
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(API_URL, { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => { const result = await response.json(); if (!response.ok || !result.ok) throw new Error(result.error || 'Registry unavailable'); return result; })
      .then((result) => setLeads(result.leads || []))
      .catch((reason) => { if (reason.name !== 'AbortError') setError('The registry could not be loaded. Please try again.'); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const countries = useMemo(() => [...new Set(leads.map((lead) => lead.country).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b)), [leads]);
  const disciplines = useMemo(() => [...new Set(leads.map((lead) => lead.discipline).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b)), [leads]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const result = leads.filter((lead) => {
      const haystack = [lead.name, lead.instagram, lead.country, lead.city, lead.discipline, lead.why, ...(lead.angles || [])].join(' ').toLocaleLowerCase();
      return (!needle || haystack.includes(needle)) && (country === 'All countries' || lead.country === country) && (discipline === 'All disciplines' || lead.discipline === discipline);
    });
    return [...result].sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'newest' ? String(b.addedAt || '').localeCompare(String(a.addedAt || '')) : (b.score || 0) - (a.score || 0));
  }, [leads, query, country, discipline, sort]);

  useEffect(() => setPage(1), [query, country, discipline, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeFilterCount = Number(country !== 'All countries') + Number(discipline !== 'All disciplines');

  return <div className="min-h-screen bg-[#f5f0ea] text-[#28151b] selection:bg-[#a34f42] selection:text-white">
    <header className="sticky top-0 z-40 border-b border-[#28151b]/10 bg-[#f5f0ea]/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-[1600px] items-center justify-between px-4 sm:px-8 lg:px-12">
        <a href="/" className="inline-flex min-h-11 items-center gap-3 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#9f4f42]" aria-label="EPRIS Journal home">
          <span className="font-serif text-2xl tracking-[-0.04em]">EPRIS</span><span className="h-5 w-px bg-[#28151b]/20" /><span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#725b63]">Collaboration</span>
        </a>
        <button type="button" onClick={() => setAdding(true)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#28151b] px-4 font-mono text-[9px] uppercase tracking-[0.16em] text-white transition-transform hover:-translate-y-0.5 sm:px-5"><Plus size={15} /><span className="hidden sm:inline">Suggest candidate</span><span className="sm:hidden">Add</span></button>
      </div>
    </header>

    <main>
      <section className="border-b border-[#28151b]/10 px-4 pb-10 pt-12 sm:px-8 sm:pb-14 sm:pt-16 lg:px-12 lg:pb-20 lg:pt-24">
        <div className="mx-auto max-w-[1600px]">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#9f4f42]">EPRIS / Open editorial registry</p>
          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
            <h1 className="max-w-5xl font-serif text-[clamp(3.2rem,8vw,8.8rem)] leading-[0.82] tracking-[-0.055em]">People worth<br /><em className="font-normal text-[#a34f42]">a conversation.</em></h1>
            <div className="max-w-md lg:pb-2"><p className="font-serif text-lg leading-relaxed text-[#5f4a51] sm:text-xl">A living shortlist of emerging architects, designers and artists for interviews, studio visits and editorial collaborations.</p><p className="mt-5 font-mono text-[9px] uppercase leading-relaxed tracking-[0.14em] text-[#826d74]">Browse without an account · Suggest a name · Every public submission is reviewed</p></div>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-[#28151b]/10 bg-[#28151b]/10 sm:mt-14 sm:max-w-2xl">
            <div className="bg-[#fbf8f4] p-4 sm:p-5"><strong className="block font-serif text-2xl sm:text-4xl">{leads.length}</strong><span className="font-mono text-[8px] uppercase tracking-[0.15em] text-[#826d74] sm:text-[9px]">Voices</span></div>
            <div className="bg-[#fbf8f4] p-4 sm:p-5"><strong className="block font-serif text-2xl sm:text-4xl">{countries.length}</strong><span className="font-mono text-[8px] uppercase tracking-[0.15em] text-[#826d74] sm:text-[9px]">Countries</span></div>
            <div className="bg-[#fbf8f4] p-4 sm:p-5"><strong className="block font-serif text-2xl sm:text-4xl">{disciplines.length}</strong><span className="font-mono text-[8px] uppercase tracking-[0.15em] text-[#826d74] sm:text-[9px]">Disciplines</span></div>
          </div>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-[1600px]">
          <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_220px_170px]">
            <label className="relative block"><span className="sr-only">Search candidates</span><Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#806b72]" size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} className={`${inputClass} pl-11`} placeholder="Search name, place, discipline…" /></label>
            <button type="button" onClick={() => setFiltersOpen((value) => !value)} className="flex min-h-12 items-center justify-between rounded-xl border border-[#28151b]/15 bg-white px-4 text-left text-sm lg:hidden"><span className="flex items-center gap-2"><Filter size={16} /> Filters {activeFilterCount ? `(${activeFilterCount})` : ''}</span><ChevronDown size={16} className={filtersOpen ? 'rotate-180' : ''} /></button>
            <div className={`${filtersOpen ? 'grid' : 'hidden'} gap-3 lg:contents`}>
              <label className="relative"><span className="sr-only">Country</span><select className={`${inputClass} appearance-none pr-10`} value={country} onChange={(e) => setCountry(e.target.value)}><option>All countries</option>{countries.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={15} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" /></label>
              <label className="relative"><span className="sr-only">Discipline</span><select className={`${inputClass} appearance-none pr-10`} value={discipline} onChange={(e) => setDiscipline(e.target.value)}><option>All disciplines</option>{disciplines.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={15} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" /></label>
              <label className="relative"><span className="sr-only">Sort candidates</span><SlidersHorizontal size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" /><select className={`${inputClass} appearance-none pl-10 pr-9`} value={sort} onChange={(e) => setSort(e.target.value)}><option value="score">Top score</option><option value="newest">Newest</option><option value="name">A–Z</option></select><ChevronDown size={15} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" /></label>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between border-b border-[#28151b]/10 pb-4"><p className="font-mono text-[9px] uppercase tracking-[0.17em] text-[#826d74]">{loading ? 'Loading registry…' : `${filtered.length} candidates`}</p>{activeFilterCount > 0 && <button type="button" onClick={() => { setCountry('All countries'); setDiscipline('All disciplines'); }} className="min-h-11 px-2 font-mono text-[9px] uppercase tracking-[0.15em] text-[#9f4f42]">Clear filters</button>}</div>

          {loading ? <div className="grid min-h-80 place-items-center"><div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#826d74]"><Loader2 className="animate-spin" size={19} /> Loading voices</div></div> : error ? <div className="my-12 rounded-2xl border border-red-200 bg-red-50 p-7 text-red-900"><p>{error}</p><button type="button" onClick={() => window.location.reload()} className="mt-4 min-h-11 rounded-full border border-red-300 px-5 font-mono text-[9px] uppercase tracking-[0.15em]">Try again</button></div> : visible.length === 0 ? <div className="grid min-h-80 place-items-center text-center"><div><Search size={26} className="mx-auto text-[#9b858c]" /><p className="mt-4 font-serif text-2xl">No candidates match these filters.</p></div></div> : <>
            <div className="hidden overflow-hidden rounded-b-2xl border-x border-b border-[#28151b]/10 bg-[#fbf8f4] lg:block">
              <table className="w-full table-fixed border-collapse text-left">
                <caption className="sr-only">EPRIS collaboration candidates</caption>
                <thead><tr className="border-b border-[#28151b]/10 bg-[#eee7df]"><th className="w-[25%] px-5 py-4 font-mono text-[9px] font-normal uppercase tracking-[0.17em] text-[#755e66]">Candidate</th><th className="w-[15%] px-4 py-4 font-mono text-[9px] font-normal uppercase tracking-[0.17em] text-[#755e66]">Location</th><th className="w-[15%] px-4 py-4 font-mono text-[9px] font-normal uppercase tracking-[0.17em] text-[#755e66]">Discipline</th><th className="w-[31%] px-4 py-4 font-mono text-[9px] font-normal uppercase tracking-[0.17em] text-[#755e66]">Editorial note</th><th className="w-[8%] px-4 py-4 text-center font-mono text-[9px] font-normal uppercase tracking-[0.17em] text-[#755e66]">Score</th><th className="w-[6%] px-4 py-4"><span className="sr-only">Open</span></th></tr></thead>
                <tbody>{visible.map((lead) => <tr key={lead.id} className="group cursor-pointer border-b border-[#28151b]/[0.07] transition-colors last:border-0 hover:bg-white" onClick={() => setSelected(lead)}>
                  <td className="px-5 py-5 align-top"><div className="flex gap-3"><span className="text-2xl" aria-hidden="true">{flag(lead.countryCode)}</span><div className="min-w-0"><button type="button" className="text-left font-serif text-lg leading-tight group-hover:text-[#a34f42]">{lead.name}</button>{lead.instagram && <p className="mt-1 truncate font-mono text-[9px] text-[#8b757d]">@{normalizeInstagram(lead.instagram)}</p>}</div></div></td>
                  <td className="px-4 py-5 align-top text-sm leading-snug text-[#67545a]">{[lead.city, lead.country].filter(Boolean).join(', ') || '—'}</td>
                  <td className="px-4 py-5 align-top text-sm leading-snug">{lead.discipline || '—'}</td>
                  <td className="px-4 py-5 align-top"><p className="line-clamp-2 text-sm leading-relaxed text-[#67545a]">{lead.why || 'Description in review.'}</p></td>
                  <td className="px-4 py-5 text-center align-top font-serif text-xl">{lead.score ?? '—'}</td>
                  <td className="px-4 py-5 align-top"><span className="grid h-10 w-10 place-items-center rounded-full border border-[#28151b]/10 transition-colors group-hover:bg-[#28151b] group-hover:text-white"><ArrowUpRight size={16} /></span></td>
                </tr>)}</tbody>
              </table>
            </div>

            <div className="grid gap-3 pt-4 lg:hidden">{visible.map((lead) => <button key={lead.id} type="button" onClick={() => setSelected(lead)} className="rounded-2xl border border-[#28151b]/10 bg-[#fbf8f4] p-5 text-left shadow-[0_10px_35px_rgba(40,21,27,0.04)] transition-transform active:scale-[0.99]">
              <div className="flex items-start justify-between gap-4"><div className="flex min-w-0 gap-3"><span className="text-2xl" aria-hidden="true">{flag(lead.countryCode)}</span><div className="min-w-0"><h2 className="font-serif text-xl leading-tight">{lead.name}</h2><p className="mt-1 text-xs text-[#745f66]">{[lead.city, lead.country].filter(Boolean).join(', ') || 'Location not specified'}</p></div></div><ArrowUpRight size={17} className="shrink-0 text-[#9f4f42]" /></div>
              <div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full bg-[#eee6de] px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.12em]">{lead.discipline || 'Creative'}</span><span className={`rounded-full border px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.12em] ${statusClass(lead.status)}`}>{lead.status || 'New'}</span>{typeof lead.score === 'number' && <span className="ml-auto font-serif text-lg">{lead.score}<small className="text-xs text-[#8b757d]">/100</small></span>}</div>
              <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-[#67545a]">{lead.why || 'Editorial description is being prepared.'}</p>
            </button>)}</div>
          </>}

          {!loading && !error && filtered.length > PAGE_SIZE && <nav className="mt-8 flex items-center justify-between border-t border-[#28151b]/10 pt-6" aria-label="Candidate pages"><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#28151b]/15 px-4 font-mono text-[9px] uppercase tracking-[0.15em] disabled:opacity-30"><ArrowLeft size={14} /> Previous</button><span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#826d74]">{page} / {pages}</span><button type="button" onClick={() => setPage((value) => Math.min(pages, value + 1))} disabled={page === pages} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#28151b]/15 px-4 font-mono text-[9px] uppercase tracking-[0.15em] disabled:opacity-30">Next <ArrowRight size={14} /></button></nav>}
        </div>
      </section>

      <section className="border-t border-[#28151b]/10 bg-[#28151b] px-4 py-16 text-[#f5f0ea] sm:px-8 sm:py-24 lg:px-12"><div className="mx-auto grid max-w-[1600px] gap-8 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#d39a88]">Know someone exceptional?</p><h2 className="mt-5 max-w-4xl font-serif text-4xl leading-none sm:text-6xl lg:text-7xl">Help us find the next essential voice.</h2></div><button type="button" onClick={() => setAdding(true)} className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#f5f0ea] px-7 font-mono text-[10px] uppercase tracking-[0.18em] text-[#28151b] hover:bg-white"><Plus size={17} /> Suggest candidate</button></div></section>
    </main>

    <footer className="border-t border-white/10 bg-[#28151b] px-4 py-7 text-[#f5f0ea] sm:px-8 lg:px-12"><div className="mx-auto flex max-w-[1600px] flex-col gap-3 font-mono text-[8px] uppercase tracking-[0.16em] text-white/45 sm:flex-row sm:items-center sm:justify-between"><span>© 2026 EPRIS Journal</span><a href="/" className="inline-flex min-h-11 items-center gap-2 text-white/70 hover:text-white">Return to journal <ArrowUpRight size={13} /></a></div></footer>

    {selected && <LeadDetail lead={selected} onClose={() => setSelected(null)} />}
    {adding && <AddCandidate onClose={() => setAdding(false)} onAdded={(lead) => setLeads((current) => [lead, ...current])} />}
  </div>;
}
