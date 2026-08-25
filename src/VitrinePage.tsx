import { useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { getFuturoshock, subscribeContent, type FuturoshockWork } from './data';

const VITRINE_COPY = {
  EN: {
    firstSelection: 'First selection',
    intro: 'A living selection of works by Ukrainian artists, designers and architects, at home and across the diaspora.',
    emptyDescription: 'The first works are being prepared by the editorial team. Each entry will appear with its author, place, material and the context that makes the work matter.',
    emptyFoot: 'No portfolio dump. No marketplace.',
    imagePending: 'Image archive in preparation',
    collectionIntro: 'Works by Ukrainian artists, designers and architects, in Ukraine and across the diaspora.',
    onView: 'On view',
    material: 'Material',
    scale: 'Scale',
    pending: 'Editorial note pending',
    readContext: 'Read EPRIS context',
    alsoOnView: 'Also on view',
    allWorks: 'All works',
    works: 'works',
    onViewCount: 'on view',
  },
  RU: {
    firstSelection: 'Первая подборка',
    intro: 'Живая подборка работ украинских художников, дизайнеров и архитекторов в Украине и в диаспоре.',
    emptyDescription: 'Первые работы готовит редакция. Каждая появится с именем автора, местом, материалом и контекстом, который делает её важной.',
    emptyFoot: 'Не портфолио. Не маркетплейс.',
    imagePending: 'Изображение готовится для архива',
    collectionIntro: 'Работы украинских художников, дизайнеров и архитекторов в Украине и в диаспоре.',
    onView: 'В экспозиции',
    material: 'Материал',
    scale: 'Размер',
    pending: 'Редакционная заметка готовится',
    readContext: 'Открыть материал EPRIS',
    alsoOnView: 'Также в подборке',
    allWorks: 'Все работы',
    works: 'работ',
    onViewCount: 'в экспозиции',
  },
  UA: {
    firstSelection: 'Перша добірка',
    intro: 'Жива добірка робіт українських митців, дизайнерів і архітекторів в Україні та діаспорі.',
    emptyDescription: 'Перші роботи готує редакція. Кожна з’явиться з ім’ям автора, місцем, матеріалом і контекстом, який робить її важливою.',
    emptyFoot: 'Не портфоліо. Не маркетплейс.',
    imagePending: 'Зображення готується для архіву',
    collectionIntro: 'Роботи українських митців, дизайнерів і архітекторів в Україні та діаспорі.',
    onView: 'В експозиції',
    material: 'Матеріал',
    scale: 'Розмір',
    pending: 'Редакційна нотатка готується',
    readContext: 'Відкрити матеріал EPRIS',
    alsoOnView: 'Також у добірці',
    allWorks: 'Усі роботи',
    works: 'робіт',
    onViewCount: 'в експозиції',
  },
  DE: {
    firstSelection: 'Erste Auswahl',
    intro: 'Eine lebendige Auswahl von Arbeiten ukrainischer Künstler, Designer und Architekten in der Ukraine und in der Diaspora.',
    emptyDescription: 'Die ersten Arbeiten werden von der Redaktion vorbereitet. Jeder Eintrag erscheint mit Autor, Ort, Material und dem Kontext, der die Arbeit bedeutsam macht.',
    emptyFoot: 'Kein Portfolio-Feed. Kein Marktplatz.',
    imagePending: 'Bildarchiv wird vorbereitet',
    collectionIntro: 'Arbeiten ukrainischer Künstler, Designer und Architekten in der Ukraine und in der Diaspora.',
    onView: 'Zu sehen',
    material: 'Material',
    scale: 'Maßstab',
    pending: 'Redaktionelle Notiz folgt',
    readContext: 'EPRIS-Kontext lesen',
    alsoOnView: 'Ebenfalls zu sehen',
    allWorks: 'Alle Arbeiten',
    works: 'Arbeiten',
    onViewCount: 'zu sehen',
  },
} as const;

type VitrineCopy = (typeof VITRINE_COPY)[keyof typeof VITRINE_COPY];

function getVitrineCopy(lang: string): VitrineCopy {
  return VITRINE_COPY[lang as keyof typeof VITRINE_COPY] || VITRINE_COPY.EN;
}

function orderWorks(works: FuturoshockWork[]) {
  return [...works].sort((a, b) => {
    const aPosition = a.shelfSlot ?? Number.MAX_SAFE_INTEGER;
    const bPosition = b.shelfSlot ?? Number.MAX_SAFE_INTEGER;
    if (aPosition !== bPosition) return aPosition - bPosition;
    return String(b.updatedAt || b.publishAt || '').localeCompare(String(a.updatedAt || a.publishAt || ''));
  });
}

function WorkImage({ work, copy, priority = false }: { work: FuturoshockWork; copy: VitrineCopy; priority?: boolean }) {
  if (!work.imageUrl) {
    return (
      <div className="flex h-full min-h-[20rem] items-end bg-[#efefeb] p-5 text-[var(--c-accent)] sm:p-8" role="img" aria-label={`Image for ${work.title} is being prepared`}>
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--c-accent-rgb)_/_0.55)]">{copy.imagePending}</span>
      </div>
    );
  }

  return <img src={work.imageUrl} alt={`${work.title} by ${work.author}`} loading={priority ? 'eager' : 'lazy'} className="h-full w-full object-cover" />;
}

function workLine(work: FuturoshockWork) {
  return [work.author, work.location, work.year].filter(Boolean).join(' · ');
}

function EmptyVitrine({ copy }: { copy: VitrineCopy }) {
  return (
    <section aria-labelledby="vitrine-title" className="grid lg:grid-cols-[minmax(0,1.18fr)_minmax(22rem,.82fr)]">
      <div className="flex min-h-[28rem] items-end border-b border-[rgb(var(--c-accent-rgb)_/_0.9)] p-5 sm:min-h-[34rem] sm:p-8 lg:min-h-[42rem] lg:border-b-0 lg:border-r lg:p-12">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--c-accent-rgb)_/_0.56)]">{copy.firstSelection}</p>
          <h1 id="vitrine-title" className="mt-5 max-w-[7ch] font-display text-[clamp(4rem,9vw,8.5rem)] leading-[0.83] tracking-[-0.05em]">Vitrine</h1>
        </div>
      </div>
      <div className="flex flex-col justify-between">
        <div className="p-5 sm:p-8 lg:p-12">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--c-accent-rgb)_/_0.56)]">EPRIS / Ukrainian practice</p>
          <p className="mt-7 max-w-[34rem] text-[16px] leading-relaxed text-[rgb(var(--c-accent-rgb)_/_0.8)]">{copy.intro}</p>
          <p className="mt-5 max-w-[34rem] text-[15px] leading-relaxed text-[rgb(var(--c-accent-rgb)_/_0.66)]">{copy.emptyDescription}</p>
        </div>
        <p className="border-t border-[rgb(var(--c-accent-rgb)_/_0.9)] px-5 py-5 font-mono text-[9px] uppercase tracking-[0.15em] text-[rgb(var(--c-accent-rgb)_/_0.56)] sm:px-8 lg:px-12">{copy.emptyFoot}</p>
      </div>
    </section>
  );
}

function VitrineCollection({ works, selectedId, onSelect, copy }: { works: FuturoshockWork[]; selectedId: string | null; onSelect: (id: string) => void; copy: VitrineCopy }) {
  const selected = works.find((work) => work.id === selectedId) || works[0];
  if (!selected) return null;
  const otherWorks = works.filter((work) => work.id !== selected.id);

  return (
    <>
      <section aria-labelledby="vitrine-title" className="grid lg:grid-cols-[minmax(0,1.18fr)_minmax(22rem,.82fr)]">
        <figure className="border-b border-[rgb(var(--c-accent-rgb)_/_0.9)] lg:border-b-0 lg:border-r">
          <div className="aspect-[4/3] overflow-hidden bg-[#efefeb] sm:aspect-[16/10] lg:aspect-auto lg:min-h-[42rem]"><WorkImage work={selected} copy={copy} priority /></div>
          <figcaption className="grid gap-3 border-t border-[rgb(var(--c-accent-rgb)_/_0.9)] px-5 py-4 sm:grid-cols-[auto_1fr] sm:items-baseline sm:px-8 lg:px-12">
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--c-accent-rgb)_/_0.56)]">{selected.medium || selected.format}</span>
            <p className="text-sm leading-relaxed sm:text-right">{workLine(selected)}</p>
          </figcaption>
        </figure>

        <div className="flex min-h-full flex-col">
          <div className="px-5 pb-8 pt-9 sm:px-8 lg:px-12 lg:pb-10 lg:pt-12">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--c-accent-rgb)_/_0.56)]">EPRIS VITRINE / UKRAINIAN PRACTICE</p>
            <h1 id="vitrine-title" className="mt-5 font-display text-[clamp(3.4rem,7vw,6.75rem)] leading-[0.86] tracking-[-0.04em]">Vitrine</h1>
            <p className="mt-7 max-w-[36rem] text-[15px] leading-relaxed text-[rgb(var(--c-accent-rgb)_/_0.76)]">{copy.collectionIntro}</p>
          </div>

          <article className="border-y border-[rgb(var(--c-accent-rgb)_/_0.9)] px-5 py-5 sm:px-8 lg:px-12">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--c-accent-rgb)_/_0.56)]">01 / {copy.onView}</p>
            <h2 className="mt-3 font-display text-[clamp(2rem,3.8vw,3.7rem)] leading-[0.92]">{selected.title}</h2>
            <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--c-accent-rgb)_/_0.62)]">{workLine(selected)}</p>
            {selected.statement && <p className="mt-5 max-w-[37rem] text-[15px] leading-relaxed text-[rgb(var(--c-accent-rgb)_/_0.78)]">{selected.statement}</p>}
            <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-[rgb(var(--c-accent-rgb)_/_0.2)] pt-5 font-mono text-[9px] uppercase tracking-[0.13em]">
              <div><dt className="text-[rgb(var(--c-accent-rgb)_/_0.5)]">{copy.material}</dt><dd className="mt-2 leading-relaxed">{selected.materials?.join(', ') || selected.medium || copy.pending}</dd></div>
              <div><dt className="text-[rgb(var(--c-accent-rgb)_/_0.5)]">{copy.scale}</dt><dd className="mt-2 leading-relaxed">{selected.dimensions || selected.edition || copy.pending}</dd></div>
            </dl>
            {selected.relatedArticleUrl && <a href={selected.relatedArticleUrl} className="mt-7 inline-flex min-h-11 items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] underline decoration-1 underline-offset-4 transition hover:opacity-55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--c-accent)]">{copy.readContext} <ArrowUpRight size={13} aria-hidden="true" /></a>}
          </article>

          {otherWorks.length > 0 && <div className="mt-auto"><p className="px-5 pb-3 pt-5 font-mono text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--c-accent-rgb)_/_0.56)] sm:px-8 lg:px-12">{copy.alsoOnView}</p><ol className="border-t border-[rgb(var(--c-accent-rgb)_/_0.9)]">{otherWorks.map((work, index) => <li key={work.id} className="border-b border-[rgb(var(--c-accent-rgb)_/_0.9)] last:border-b-0"><button type="button" onClick={() => onSelect(work.id)} aria-pressed={selected.id === work.id} className="group grid min-h-16 w-full grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 text-left transition hover:bg-[rgb(var(--c-accent-rgb)_/_0.06)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--c-accent)] sm:px-8 lg:px-12"><span className="font-mono text-[10px] text-[rgb(var(--c-accent-rgb)_/_0.52)]">{String(index + 2).padStart(2, '0')}</span><span className="min-w-0"><span className="block truncate font-display text-lg leading-tight">{work.title}</span><span className="mt-1 block font-mono text-[8px] uppercase tracking-[0.13em] text-[rgb(var(--c-accent-rgb)_/_0.56)]">{workLine(work)}</span></span><ArrowUpRight size={14} aria-hidden="true" className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" /></button></li>)}</ol></div>}
        </div>
      </section>

      {otherWorks.length > 0 && <section aria-labelledby="vitrine-index-title" className="border-t border-[rgb(var(--c-accent-rgb)_/_0.9)]"><div className="px-5 py-8 sm:px-8 lg:px-12"><div className="flex items-baseline justify-between gap-4"><h2 id="vitrine-index-title" className="font-display text-3xl sm:text-4xl">{copy.allWorks}</h2><span className="font-mono text-[9px] uppercase tracking-[0.15em] text-[rgb(var(--c-accent-rgb)_/_0.56)]">{works.length} {copy.onViewCount}</span></div><div className="mt-6 grid border-l border-t border-[rgb(var(--c-accent-rgb)_/_0.9)] sm:grid-cols-2 lg:grid-cols-3">{works.map((work, index) => <button key={work.id} type="button" onClick={() => onSelect(work.id)} aria-pressed={selected.id === work.id} className={`group text-left transition hover:bg-[rgb(var(--c-accent-rgb)_/_0.06)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--c-accent)] ${selected.id === work.id ? 'bg-[rgb(var(--c-accent-rgb)_/_0.06)]' : ''}`}><div className="aspect-[4/3] overflow-hidden border-b border-r border-[rgb(var(--c-accent-rgb)_/_0.9)] bg-[#efefeb]"><WorkImage work={work} copy={copy} /></div><span className="block border-b border-r border-[rgb(var(--c-accent-rgb)_/_0.9)] p-4"><span className="font-mono text-[9px] text-[rgb(var(--c-accent-rgb)_/_0.52)]">{String(index + 1).padStart(2, '0')}</span><span className="mt-3 block font-display text-xl leading-tight">{work.title}</span><span className="mt-2 block font-mono text-[8px] uppercase tracking-[0.13em] text-[rgb(var(--c-accent-rgb)_/_0.56)]">{workLine(work)}</span></span></button>)}</div></div></section>}
    </>
  );
}

export function VitrinePage({ lang = 'EN' }: { lang?: string }) {
  const [works, setWorks] = useState<FuturoshockWork[]>(() => orderWorks(getFuturoshock()));
  const [selectedId, setSelectedId] = useState<string | null>(() => works[0]?.id || null);
  const copy = getVitrineCopy(lang);

  useEffect(() => subscribeContent(() => setWorks(orderWorks(getFuturoshock()))), []);
  useEffect(() => {
    if (!works.some((work) => work.id === selectedId)) setSelectedId(works[0]?.id || null);
  }, [selectedId, works]);
  useEffect(() => {
    document.title = 'Vitrine | EPRIS Journal';
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) canonical.href = 'https://eprisjournal.com/vitrine';
  }, []);

  return <main className="min-h-screen bg-[var(--c-bg)] pt-16 text-[var(--c-accent)]"><div className="mx-auto max-w-[1600px] border-x border-[rgb(var(--c-accent-rgb)_/_0.9)]"><header className="flex items-center justify-between gap-4 border-b border-[rgb(var(--c-accent-rgb)_/_0.9)] px-5 py-3 sm:px-8 lg:px-12"><p className="font-mono text-[9px] uppercase tracking-[0.18em] sm:text-[10px]">EPRIS VITRINE / UKRAINIAN PRACTICE</p><span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--c-accent-rgb)_/_0.55)]">{String(works.length).padStart(2, '0')} {copy.works}</span></header>{works.length === 0 ? <EmptyVitrine copy={copy} /> : <VitrineCollection works={works} selectedId={selectedId} onSelect={setSelectedId} copy={copy} />}</div></main>;
}
