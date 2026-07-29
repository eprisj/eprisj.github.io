import { useMemo, useState } from 'react';
import { BadgeCheck, CalendarDays, MapPin, Plus, Trash2 } from 'lucide-react';
import {
  PASSPORT_STAMP_PAGES,
  type PassportStamp,
  type PassportStampInk,
  type PassportStampKind,
} from './passportPages';

const KIND_OPTIONS: Array<{ value: PassportStampKind; label: string }> = [
  { value: 'visit', label: 'Studio / venue visit' },
  { value: 'interview', label: 'Interview' },
  { value: 'collaboration', label: 'Editorial collaboration' },
  { value: 'event', label: 'Fair / exhibition / event' },
  { value: 'verified', label: 'Editorial verification' },
];

const INK_OPTIONS: Array<{ value: PassportStampInk; label: string; color: string }> = [
  { value: 'burgundy', label: 'EPRIS burgundy', color: '#6f243d' },
  { value: 'teal', label: 'Archive teal', color: '#24717b' },
  { value: 'gold', label: 'Edition ochre', color: '#8a642e' },
  { value: 'navy', label: 'Registry navy', color: '#284764' },
];

const inputClass = 'min-h-11 w-full rounded-lg border border-[var(--pp-burgundy)]/15 bg-white/70 px-3.5 py-2.5 font-serif text-[15px] text-[var(--pp-ink)] outline-none transition focus:border-[var(--pp-burgundy)]/55 focus:ring-4 focus:ring-[var(--pp-burgundy)]/5';

function emptyDraft(page: string): PassportStamp {
  return {
    id: `stamp-${page}-${Date.now().toString(36)}`,
    page,
    kind: 'visit',
    title: '',
    place: '',
    date: new Date().toISOString().slice(0, 10),
    note: '',
    ink: 'burgundy',
  };
}

export function PassportStampEditor({
  stamps,
  onChange,
}: {
  stamps: PassportStamp[];
  onChange: (stamps: PassportStamp[]) => void;
}) {
  const [selectedPage, setSelectedPage] = useState(PASSPORT_STAMP_PAGES[0]);
  const selectedStamp = useMemo(() => stamps.find((stamp) => stamp.page === selectedPage) || null, [selectedPage, stamps]);
  const [drafts, setDrafts] = useState<Record<string, PassportStamp>>({});
  const draft = drafts[selectedPage] || selectedStamp || emptyDraft(selectedPage);

  const setDraft = <K extends keyof PassportStamp>(key: K, value: PassportStamp[K]) => {
    setDrafts((current) => ({ ...current, [selectedPage]: { ...draft, [key]: value, page: selectedPage } }));
  };

  const save = () => {
    const normalized = {
      ...draft,
      page: selectedPage,
      title: draft.title.trim(),
      place: draft.place.trim(),
      note: draft.note.trim(),
    };
    if (!normalized.title) return;
    onChange([...stamps.filter((stamp) => stamp.page !== selectedPage), normalized].sort((a, b) => a.page.localeCompare(b.page)));
    setDrafts((current) => {
      const next = { ...current };
      delete next[selectedPage];
      return next;
    });
  };

  const remove = () => {
    onChange(stamps.filter((stamp) => stamp.page !== selectedPage));
    setDrafts((current) => {
      const next = { ...current };
      delete next[selectedPage];
      return next;
    });
  };

  return (
    <section id="passport-stamp-editor" className="mt-6 overflow-hidden rounded-2xl border border-[var(--pp-burgundy)]/12 bg-white/50 shadow-[0_16px_50px_rgba(80,26,44,.055)] backdrop-blur-md">
      <div className="border-b border-[var(--pp-burgundy)]/10 bg-[linear-gradient(135deg,rgba(80,26,44,.07),rgba(70,158,167,.07))] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--pp-burgundy)]/55">Editorial stamp desk</p>
            <h2 className="mt-2 font-serif text-xl text-[var(--pp-burgundy)]">Штампы и отметки</h2>
            <p className="mt-2 max-w-md font-serif text-sm leading-relaxed text-[var(--pp-ink)]/65">Одна подтверждённая редакцией отметка на страницу. После сохранения она появится в веб-паспорте, PDF и печатной версии.</p>
          </div>
          <div className="grid h-11 min-w-11 place-items-center rounded-full border border-[var(--pp-burgundy)]/15 bg-white/60 text-[var(--pp-burgundy)]">
            <BadgeCheck size={20} strokeWidth={1.6} />
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="mb-5">
          <span className="mb-2 block font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--pp-burgundy)]/50">Страница для отметки</span>
          <div className="grid grid-cols-6 gap-2" role="list" aria-label="Passport stamp pages">
            {PASSPORT_STAMP_PAGES.map((page) => {
              const occupied = stamps.some((stamp) => stamp.page === page);
              const active = page === selectedPage;
              return (
                <button
                  key={page}
                  type="button"
                  onClick={() => setSelectedPage(page)}
                  aria-pressed={active}
                  aria-label={`Stamp page ${page}${occupied ? ', occupied' : ', empty'}`}
                  className={`relative min-h-11 rounded-lg border font-mono text-xs transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pp-burgundy)] ${active ? 'border-[var(--pp-burgundy)] bg-[var(--pp-burgundy)] text-white shadow-sm' : 'border-[var(--pp-burgundy)]/12 bg-white/65 text-[var(--pp-burgundy)] hover:border-[var(--pp-burgundy)]/35'}`}
                >
                  {page}
                  {occupied && <span className={`absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full ${active ? 'bg-[#9fd5d4]' : 'bg-[#28747d]'}`} />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--pp-burgundy)]/50">Тип отметки</span>
            <select className={inputClass} value={draft.kind} onChange={(event) => setDraft('kind', event.target.value as PassportStampKind)}>
              {KIND_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--pp-burgundy)]/50">Цвет печати</span>
            <select className={inputClass} value={draft.ink} onChange={(event) => setDraft('ink', event.target.value as PassportStampInk)}>
              {INK_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>

        <label className="mt-4 block">
          <span className="mb-2 block font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--pp-burgundy)]/50">Название / повод</span>
          <input className={inputClass} value={draft.title} onChange={(event) => setDraft('title', event.target.value)} maxLength={54} placeholder="Venice Architecture Biennale" />
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--pp-burgundy)]/50"><MapPin size={12} /> Место</span>
            <input className={inputClass} value={draft.place} onChange={(event) => setDraft('place', event.target.value)} maxLength={48} placeholder="Venice, Italy" />
          </label>
          <label className="block">
            <span className="mb-2 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--pp-burgundy)]/50"><CalendarDays size={12} /> Дата</span>
            <input type="date" className={inputClass} value={draft.date} onChange={(event) => setDraft('date', event.target.value)} />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="mb-2 block font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--pp-burgundy)]/50">Короткая редакционная заметка</span>
          <textarea className={`${inputClass} min-h-24 resize-y`} value={draft.note} onChange={(event) => setDraft('note', event.target.value)} maxLength={120} placeholder="Studio visit completed and verified by the editorial team." />
        </label>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={remove} disabled={!selectedStamp} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 font-mono text-[10px] uppercase tracking-[0.15em] text-red-800 transition hover:bg-red-50 disabled:pointer-events-none disabled:opacity-30">
            <Trash2 size={15} /> Удалить отметку
          </button>
          <button type="button" onClick={save} disabled={!draft.title.trim()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--pp-burgundy)] px-5 font-mono text-[10px] uppercase tracking-[0.16em] text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 disabled:pointer-events-none disabled:opacity-40">
            {selectedStamp ? <BadgeCheck size={15} /> : <Plus size={15} />} {selectedStamp ? 'Обновить штамп' : 'Поставить штамп'}
          </button>
        </div>
      </div>
    </section>
  );
}
