import { lazy, Suspense, useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { getFuturoshock, subscribeContent, type FuturoshockWork } from './data';

/* Собственный чанк: three и fiber весят больше самой страницы, а нужны только
   на пустой коллекции. Пока объектов нет, зал занимает само здание. */
const MuseumModel = lazy(() => import('./museum/MuseumModel').then((m) => ({ default: m.MuseumModel })));

const MUSEUM_COPY = {
  EN: {
    museumLabel: 'EPRIS MUSEUM / UKRAINIAN PRACTICE',
    firstSelection: 'Collection opening',
    intro: 'A living collection of works by Ukrainian artists, designers and architects, in Ukraine and across the diaspora.',
    emptyDescription: 'The collection is being prepared by the editorial team. Every object will enter with its author, place, material and the context that makes it matter.',
    emptyFoot: 'Collection records are published by the editorial team.',
    imagePending: 'Image archive in preparation',
    modelLabel: 'Three-dimensional model of the EPRIS Museum building',
    modelHint: 'Drag to turn the model',
    openLabel: 'Open the space',
    closeLabel: 'Close the space',
    insideLabel: 'Inside the EPRIS Museum building: atrium, balconies and the ramp',
    collectionIntro: 'An evolving museum of Ukrainian practice. Each object belongs to a broader story of making, place and cultural memory.',
    object: 'Object',
    objectDossier: 'Object dossier',
    creator: 'Creator',
    place: 'Place',
    date: 'Date',
    material: 'Material',
    dimensions: 'Dimensions',
    catalogueNumber: 'Catalogue no.',
    pending: 'Editorial note pending',
    readContext: 'Read EPRIS research',
    archive: 'Collection archive',
    objects: 'objects',
    objectCount: 'in collection',
    openObject: 'Open object',
  },
  RU: {
    museumLabel: 'EPRIS MUSEUM / УКРАИНСКАЯ ПРАКТИКА',
    firstSelection: 'Открытие коллекции',
    intro: 'Живая коллекция работ украинских художников, дизайнеров и архитекторов в Украине и в диаспоре.',
    emptyDescription: 'Коллекцию готовит редакция. Каждый объект войдёт в неё с автором, местом, материалом и контекстом, который делает его важным.',
    emptyFoot: 'Записи коллекции публикует редакция.',
    imagePending: 'Изображение готовится для архива',
    modelLabel: 'Трёхмерная модель здания EPRIS Museum',
    modelHint: 'Потяните, чтобы повернуть макет',
    openLabel: 'Открыть пространство',
    closeLabel: 'Закрыть пространство',
    insideLabel: 'Внутри здания EPRIS Museum: атриум, балконы и пандус',
    collectionIntro: 'Развивающийся музей украинской практики. Каждый объект связан с историей создания, местом и культурной памятью.',
    object: 'Объект',
    objectDossier: 'Паспорт объекта',
    creator: 'Автор',
    place: 'Место',
    date: 'Дата',
    material: 'Материал',
    dimensions: 'Габариты',
    catalogueNumber: 'Каталожный номер',
    pending: 'Редакционная заметка готовится',
    readContext: 'Открыть исследование EPRIS',
    archive: 'Архив коллекции',
    objects: 'объектов',
    objectCount: 'в коллекции',
    openObject: 'Открыть объект',
  },
  UA: {
    museumLabel: 'EPRIS MUSEUM / УКРАЇНСЬКА ПРАКТИКА',
    firstSelection: 'Відкриття колекції',
    intro: 'Жива колекція робіт українських митців, дизайнерів і архітекторів в Україні та діаспорі.',
    emptyDescription: 'Колекцію готує редакція. Кожен об’єкт увійде до неї з автором, місцем, матеріалом і контекстом, який робить його важливим.',
    emptyFoot: 'Записи колекції публікує редакція.',
    imagePending: 'Зображення готується для архіву',
    modelLabel: 'Тривимірна модель будівлі EPRIS Museum',
    modelHint: 'Потягніть, щоб обернути макет',
    openLabel: 'Відкрити простір',
    closeLabel: 'Закрити простір',
    insideLabel: 'Усередині будівлі EPRIS Museum: атріум, балкони та пандус',
    collectionIntro: 'Музей української практики, що розвивається. Кожен об’єкт пов’язаний з історією створення, місцем і культурною пам’яттю.',
    object: 'Об’єкт',
    objectDossier: 'Паспорт об’єкта',
    creator: 'Автор',
    place: 'Місце',
    date: 'Дата',
    material: 'Матеріал',
    dimensions: 'Габарити',
    catalogueNumber: 'Каталожний номер',
    pending: 'Редакційна нотатка готується',
    readContext: 'Відкрити дослідження EPRIS',
    archive: 'Архів колекції',
    objects: 'об’єктів',
    objectCount: 'у колекції',
    openObject: 'Відкрити об’єкт',
  },
  DE: {
    museumLabel: 'EPRIS MUSEUM / UKRAINISCHE PRAXIS',
    firstSelection: 'Eröffnung der Sammlung',
    intro: 'Eine lebendige Sammlung von Arbeiten ukrainischer Künstler, Designer und Architekten in der Ukraine und in der Diaspora.',
    emptyDescription: 'Die Sammlung wird von der Redaktion vorbereitet. Jedes Objekt erscheint mit Autor, Ort, Material und dem Kontext, der es bedeutsam macht.',
    emptyFoot: 'Sammlungseinträge werden von der Redaktion veröffentlicht.',
    imagePending: 'Bildarchiv wird vorbereitet',
    modelLabel: 'Dreidimensionales Modell des EPRIS-Museumsgebäudes',
    modelHint: 'Ziehen, um das Modell zu drehen',
    openLabel: 'Raum öffnen',
    closeLabel: 'Raum schließen',
    insideLabel: 'Im Inneren des EPRIS-Museums: Atrium, Galerien und Rampe',
    collectionIntro: 'Ein wachsendes Museum ukrainischer Praxis. Jedes Objekt gehört zu einer Geschichte von Herstellung, Ort und kulturellem Gedächtnis.',
    object: 'Objekt',
    objectDossier: 'Objektdossier',
    creator: 'Autor',
    place: 'Ort',
    date: 'Datum',
    material: 'Material',
    dimensions: 'Maße',
    catalogueNumber: 'Katalognummer',
    pending: 'Redaktionelle Notiz folgt',
    readContext: 'EPRIS-Recherche lesen',
    archive: 'Sammlungsarchiv',
    objects: 'Objekte',
    objectCount: 'in der Sammlung',
    openObject: 'Objekt öffnen',
  },
} as const;

type MuseumCopy = (typeof MUSEUM_COPY)[keyof typeof MUSEUM_COPY];

function getMuseumCopy(lang: string): MuseumCopy {
  return MUSEUM_COPY[lang as keyof typeof MUSEUM_COPY] || MUSEUM_COPY.EN;
}

function orderWorks(works: FuturoshockWork[]) {
  return [...works].sort((a, b) => {
    const aPosition = a.shelfSlot ?? Number.MAX_SAFE_INTEGER;
    const bPosition = b.shelfSlot ?? Number.MAX_SAFE_INTEGER;
    if (aPosition !== bPosition) return aPosition - bPosition;
    return String(b.updatedAt || b.publishAt || '').localeCompare(String(a.updatedAt || a.publishAt || ''));
  });
}

function WorkImage({ work, copy, priority = false }: { work: FuturoshockWork; copy: MuseumCopy; priority?: boolean }) {
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

function catalogueNumber(work: FuturoshockWork, index: number) {
  const year = String(work.year || '').match(/\d{4}/)?.[0] || '2026';
  const position = String(work.shelfSlot || index + 1).padStart(3, '0');
  return `EPRIS ${year}.${position}`;
}

function EmptyVitrine({ copy }: { copy: MuseumCopy }) {
  /* Пустая коллекция больше не объясняется абзацами о том, что её готовят.
     Вместо описания стоит здание: макет крутится сам и поворачивается мышью,
     а заголовок лежит поверх него, как подпись на архитектурном планшете. */
  return (
    <section aria-labelledby="vitrine-title" className="grid flex-1 lg:grid-cols-[minmax(0,1.18fr)_minmax(22rem,.82fr)]">
      <div className="relative min-h-[28rem] overflow-hidden border-b border-[rgb(var(--c-accent-rgb)_/_0.9)] sm:min-h-[34rem] lg:min-h-[42rem] lg:border-b-0 lg:border-r">
        <Suspense fallback={<div className="absolute inset-0 bg-[#f6f4f1]" />}>
          <MuseumModel label={copy.modelLabel} openLabel={copy.openLabel} closeLabel={copy.closeLabel} insideLabel={copy.insideLabel} />
        </Suspense>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5 sm:p-8 lg:p-12">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--c-accent-rgb)_/_0.56)]">{copy.firstSelection}</p>
          <h1 id="vitrine-title" className="mt-5 max-w-[7ch] font-display text-[clamp(4rem,9vw,8.5rem)] leading-[0.83] tracking-[-0.05em]">Museum</h1>
        </div>
      </div>
      <div className="flex flex-col justify-between">
        <div className="flex items-start justify-between gap-4 p-5 sm:p-8 lg:p-12">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--c-accent-rgb)_/_0.56)]">{copy.museumLabel}</p>
          <p className="shrink-0 font-mono text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--c-accent-rgb)_/_0.4)]">{copy.modelHint}</p>
        </div>
        <p className="border-t border-[rgb(var(--c-accent-rgb)_/_0.9)] px-5 py-5 font-mono text-[9px] uppercase tracking-[0.15em] text-[rgb(var(--c-accent-rgb)_/_0.56)] sm:px-8 lg:px-12">{copy.emptyFoot}</p>
      </div>
    </section>
  );
}

function VitrineCollection({ works, selectedId, onSelect, copy }: { works: FuturoshockWork[]; selectedId: string | null; onSelect: (id: string) => void; copy: MuseumCopy }) {
  const selected = works.find((work) => work.id === selectedId) || works[0];
  if (!selected) return null;
  const selectedIndex = works.findIndex((work) => work.id === selected.id);

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
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--c-accent-rgb)_/_0.56)]">{copy.museumLabel}</p>
            <h1 id="vitrine-title" className="mt-5 font-display text-[clamp(3.4rem,7vw,6.75rem)] leading-[0.86] tracking-[-0.04em]">Museum</h1>
            <p className="mt-7 max-w-[36rem] text-[15px] leading-relaxed text-[rgb(var(--c-accent-rgb)_/_0.76)]">{copy.collectionIntro}</p>
          </div>

          <article id="object-dossier" className="border-y border-[rgb(var(--c-accent-rgb)_/_0.9)] px-5 py-5 sm:px-8 lg:px-12">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--c-accent-rgb)_/_0.56)]">{copy.object} {String(selectedIndex + 1).padStart(2, '0')} / {copy.objectDossier}</p>
            <h2 className="mt-3 font-display text-[clamp(2rem,3.8vw,3.7rem)] leading-[0.92]">{selected.title}</h2>
            <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--c-accent-rgb)_/_0.62)]">{catalogueNumber(selected, selectedIndex)}</p>
            {selected.statement && <p className="mt-5 max-w-[37rem] text-[15px] leading-relaxed text-[rgb(var(--c-accent-rgb)_/_0.78)]">{selected.statement}</p>}
            <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-[rgb(var(--c-accent-rgb)_/_0.2)] pt-5 font-mono text-[9px] uppercase tracking-[0.13em] sm:grid-cols-3">
              <div><dt className="text-[rgb(var(--c-accent-rgb)_/_0.5)]">{copy.creator}</dt><dd className="mt-2 leading-relaxed">{selected.author || copy.pending}</dd></div>
              <div><dt className="text-[rgb(var(--c-accent-rgb)_/_0.5)]">{copy.place}</dt><dd className="mt-2 leading-relaxed">{selected.location || copy.pending}</dd></div>
              <div><dt className="text-[rgb(var(--c-accent-rgb)_/_0.5)]">{copy.date}</dt><dd className="mt-2 leading-relaxed">{selected.year || copy.pending}</dd></div>
              <div><dt className="text-[rgb(var(--c-accent-rgb)_/_0.5)]">{copy.material}</dt><dd className="mt-2 leading-relaxed">{selected.materials?.join(', ') || selected.medium || copy.pending}</dd></div>
              <div><dt className="text-[rgb(var(--c-accent-rgb)_/_0.5)]">{copy.dimensions}</dt><dd className="mt-2 leading-relaxed">{selected.dimensions || selected.edition || copy.pending}</dd></div>
              <div><dt className="text-[rgb(var(--c-accent-rgb)_/_0.5)]">{copy.catalogueNumber}</dt><dd className="mt-2 leading-relaxed">{catalogueNumber(selected, selectedIndex)}</dd></div>
            </dl>
            {selected.relatedArticleUrl && <a href={selected.relatedArticleUrl} className="mt-7 inline-flex min-h-11 items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] underline decoration-1 underline-offset-4 transition hover:opacity-55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--c-accent)]">{copy.readContext} <ArrowUpRight size={13} aria-hidden="true" /></a>}
          </article>

        </div>
      </section>

      <section aria-labelledby="collection-archive-title" className="border-t border-[rgb(var(--c-accent-rgb)_/_0.9)]">
        <div className="px-5 py-8 sm:px-8 lg:px-12">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="collection-archive-title" className="font-display text-3xl sm:text-4xl">{copy.archive}</h2>
            <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-[rgb(var(--c-accent-rgb)_/_0.56)]">{works.length} {copy.objectCount}</span>
          </div>
          <ol className="mt-6 border-t border-[rgb(var(--c-accent-rgb)_/_0.9)]">
            {works.map((work, index) => <li key={work.id} className="border-b border-[rgb(var(--c-accent-rgb)_/_0.9)]"><button type="button" onClick={() => { onSelect(work.id); document.getElementById('object-dossier')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} aria-pressed={selected.id === work.id} className={`group grid min-h-24 w-full grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 py-3 text-left transition hover:bg-[rgb(var(--c-accent-rgb)_/_0.06)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--c-accent)] sm:grid-cols-[5rem_minmax(0,1.3fr)_minmax(9rem,.7fr)_auto] sm:gap-5 ${selected.id === work.id ? 'bg-[rgb(var(--c-accent-rgb)_/_0.06)]' : ''}`}><span className="font-mono text-[10px] text-[rgb(var(--c-accent-rgb)_/_0.52)]">{String(index + 1).padStart(2, '0')}</span><span className="min-w-0"><span className="block font-display text-xl leading-tight sm:text-2xl">{work.title}</span><span className="mt-1 block font-mono text-[8px] uppercase tracking-[0.13em] text-[rgb(var(--c-accent-rgb)_/_0.56)]">{catalogueNumber(work, index)}</span></span><span className="hidden font-mono text-[9px] uppercase tracking-[0.13em] text-[rgb(var(--c-accent-rgb)_/_0.62)] sm:block">{workLine(work)}</span><span className="inline-flex min-h-11 items-center gap-2 pr-1 font-mono text-[8px] uppercase tracking-[0.13em] underline decoration-1 underline-offset-4 transition group-hover:opacity-55">{copy.openObject}<ArrowUpRight size={13} aria-hidden="true" /></span></button></li>)}
          </ol>
        </div>
      </section>
    </>
  );
}

export function VitrinePage({ lang = 'EN' }: { lang?: string }) {
  const [works, setWorks] = useState<FuturoshockWork[]>(() => orderWorks(getFuturoshock()));
  const [selectedId, setSelectedId] = useState<string | null>(() => works[0]?.id || null);
  const copy = getMuseumCopy(lang);

  useEffect(() => subscribeContent(() => setWorks(orderWorks(getFuturoshock()))), []);
  useEffect(() => {
    if (!works.some((work) => work.id === selectedId)) setSelectedId(works[0]?.id || null);
  }, [selectedId, works]);
  useEffect(() => {
    document.title = 'EPRIS Museum | EPRIS Journal';
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) canonical.href = 'https://eprisjournal.com/museum';
  }, []);

  /* Контейнер тянется на всю высоту экрана: иначе на большом мониторе разворот
     обрывается посреди страницы, боковые линейки заканчиваются в никуда, и под
     ними остаётся белое поле, которое читается как недогруженная страница. */
  return <main className="flex min-h-screen flex-col bg-[var(--c-bg)] pt-16 text-[var(--c-accent)]"><div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col border-x border-[rgb(var(--c-accent-rgb)_/_0.9)]"><header className="flex items-center justify-between gap-4 border-b border-[rgb(var(--c-accent-rgb)_/_0.9)] px-5 py-3 sm:px-8 lg:px-12"><p className="font-mono text-[9px] uppercase tracking-[0.18em] sm:text-[10px]">{copy.museumLabel}</p><span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--c-accent-rgb)_/_0.55)]">{String(works.length).padStart(2, '0')} {copy.objects}</span></header>{works.length === 0 ? <EmptyVitrine copy={copy} /> : <VitrineCollection works={works} selectedId={selectedId} onSelect={setSelectedId} copy={copy} />}</div></main>;
}
