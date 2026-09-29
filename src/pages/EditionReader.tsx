import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, BookOpen, Download, Grid3x3, List, Maximize2, Minimize2, X, ZoomIn, ZoomOut } from 'lucide-react';

/* Онлайн-версия печатного выпуска. Сам выпуск собирается вне сайта
   (Desktop/…/EPRIS-Autumn-Issue-2026: build_complete_issue.py → render-pdf.mjs →
   make_web_edition.py) и кладётся статикой в public/editions/<id>/:
   pages/NNN.webp (1240 px), pages/t/NNN.webp (превью), manifest.json и лёгкий PDF.
   Страницы — картинки, а не PDF.js: читатель видит первую полосу через
   секунду, телефону не нужно разбирать 35 МБ PDF, а разворот выглядит как
   журнал, а не как окно просмотрщика. */

export interface EditionTocEntry {
  id: string;
  kind: 'front' | 'section' | 'story' | 'review';
  page: number;
  title: string;
  author?: string;
  kicker?: string;
  num?: string;
}

export interface EditionManifest {
  id: string;
  title: string;
  season: string;
  edition: string;
  pages: number;
  pageWidth: number;
  pageHeight: number;
  pdf: string;
  pdfBytes: number;
  stories: number;
  reviews: number;
  toc: EditionTocEntry[];
}

export const EDITIONS = [{ id: 'autumn-2026', base: '/editions/autumn-2026/' }];

const pad = (n: number) => String(n).padStart(3, '0');
export const pageSrc = (base: string, n: number) => `${base}pages/${pad(n)}.webp`;
export const thumbSrc = (base: string, n: number) => `${base}pages/t/${pad(n)}.webp`;
export const megabytes = (bytes: number) => `${Math.round(bytes / 1024 / 1024)} MB`;

/* Подписи интерфейса. Сам выпуск английский, а рамка вокруг него говорит на
   языке сайта. */
const WORDS: Record<string, Record<string, string>> = {
  EN: { read: 'Read online', download: 'Download PDF', contents: 'Contents', pages: 'pages', stories: 'stories', reviews: 'reviews', sections: 'sections', close: 'Close', prev: 'Previous page', next: 'Next page', all: 'All pages', zoom: 'Read closer', unzoom: 'Whole page', page: 'Page', onsite: 'On the site', inside: 'Inside the issue', archive: 'Issue archive', archiveNote: 'Earlier issues, as they appeared on the site', full: 'Full screen', lede: 'Everything EPRIS has published, from the doors of Tbilisi in spring to the museum we open this October: every story in full, laid out as a printed magazine. Read it here, page by page, or take the PDF with you.', section: 'Section', hideArchive: 'Hide' },
  RU: { read: 'Читать онлайн', download: 'Скачать PDF', contents: 'Содержание', pages: 'страниц', stories: 'материалов', reviews: 'рецензий', sections: 'разделов', close: 'Закрыть', prev: 'Предыдущая страница', next: 'Следующая страница', all: 'Все страницы', zoom: 'Крупнее', unzoom: 'Вся страница', page: 'Страница', onsite: 'На сайте', inside: 'Внутри выпуска', archive: 'Архив выпусков', archiveNote: 'Прежние выпуски в том виде, в каком они выходили на сайте', full: 'На весь экран', lede: 'Всё, что EPRIS опубликовал – от дверей Тбилиси весной до музея, который мы открываем в октябре: каждый материал целиком, свёрстанный как печатный журнал. Читайте здесь, страница за страницей, или возьмите PDF с собой.', section: 'Раздел', hideArchive: 'Свернуть' },
  UA: { read: 'Читати онлайн', download: 'Завантажити PDF', contents: 'Зміст', pages: 'сторінок', stories: 'матеріалів', reviews: 'рецензій', sections: 'розділів', close: 'Закрити', prev: 'Попередня сторінка', next: 'Наступна сторінка', all: 'Усі сторінки', zoom: 'Більше', unzoom: 'Уся сторінка', page: 'Сторінка', onsite: 'На сайті', inside: 'Усередині випуску', archive: 'Архів випусків', archiveNote: 'Попередні випуски такими, якими вони виходили на сайті', full: 'На весь екран', lede: 'Усе, що опублікував EPRIS, – від дверей Тбілісі навесні до музею, який ми відкриваємо в жовтні: кожен матеріал повністю, зверстаний як друкований журнал. Читайте тут, сторінка за сторінкою, або візьміть PDF із собою.', section: 'Розділ', hideArchive: 'Згорнути' },
  DE: { read: 'Online lesen', download: 'PDF herunterladen', contents: 'Inhalt', pages: 'Seiten', stories: 'Beiträge', reviews: 'Kritiken', sections: 'Rubriken', close: 'Schließen', prev: 'Vorherige Seite', next: 'Nächste Seite', all: 'Alle Seiten', zoom: 'Vergrößern', unzoom: 'Ganze Seite', page: 'Seite', onsite: 'Auf der Website', inside: 'In dieser Ausgabe', archive: 'Archiv', archiveNote: 'Frühere Ausgaben, wie sie auf der Website erschienen', full: 'Vollbild', lede: 'Alles, was EPRIS veröffentlicht hat – von den Türen von Tiflis im Frühling bis zum Museum, das wir im Oktober eröffnen: jeder Beitrag vollständig, gesetzt wie ein gedrucktes Magazin.', section: 'Rubrik', hideArchive: 'Einklappen' },
  IT: { read: 'Leggi online', download: 'Scarica il PDF', contents: 'Sommario', pages: 'pagine', stories: 'articoli', reviews: 'recensioni', sections: 'sezioni', close: 'Chiudi', prev: 'Pagina precedente', next: 'Pagina successiva', all: 'Tutte le pagine', zoom: 'Ingrandisci', unzoom: 'Pagina intera', page: 'Pagina', onsite: 'Sul sito', inside: 'In questo numero', archive: 'Archivio', archiveNote: 'I numeri precedenti, come sono usciti sul sito', full: 'Schermo intero', lede: 'Tutto ciò che EPRIS ha pubblicato, dalle porte di Tbilisi in primavera al museo che apriamo in ottobre: ogni articolo per intero, impaginato come una rivista stampata.', section: 'Sezione', hideArchive: 'Chiudi' },
  ES: { read: 'Leer en línea', download: 'Descargar PDF', contents: 'Índice', pages: 'páginas', stories: 'artículos', reviews: 'reseñas', sections: 'secciones', close: 'Cerrar', prev: 'Página anterior', next: 'Página siguiente', all: 'Todas las páginas', zoom: 'Ampliar', unzoom: 'Página completa', page: 'Página', onsite: 'En la web', inside: 'En este número', archive: 'Archivo', archiveNote: 'Números anteriores, tal como aparecieron en la web', full: 'Pantalla completa', lede: 'Todo lo que EPRIS ha publicado, de las puertas de Tiflis en primavera al museo que abrimos en octubre: cada artículo completo, maquetado como una revista impresa.', section: 'Sección', hideArchive: 'Ocultar' },
  FR: { read: 'Lire en ligne', download: 'Télécharger le PDF', contents: 'Sommaire', pages: 'pages', stories: 'articles', reviews: 'critiques', sections: 'rubriques', close: 'Fermer', prev: 'Page précédente', next: 'Page suivante', all: 'Toutes les pages', zoom: 'Agrandir', unzoom: 'Page entière', page: 'Page', onsite: 'Sur le site', inside: 'Dans ce numéro', archive: 'Archives', archiveNote: 'Les numéros précédents, tels qu’ils ont paru sur le site', full: 'Plein écran', lede: 'Tout ce qu’EPRIS a publié, des portes de Tbilissi au printemps au musée que nous ouvrons en octobre : chaque article en entier, mis en page comme un magazine imprimé.', section: 'Rubrique', hideArchive: 'Masquer' },
};
export const editionWords = (lang: string) => ({ ...WORDS.EN, ...(WORDS[lang] || {}) });

/* 'loading' отличаем от 'missing': пока манифест в пути, раздел ждёт, а не
   мелькает прежней страницей выпуска. */
export function useEditionManifest(base: string) {
  const [state, setState] = useState<{ manifest: EditionManifest | null; status: 'loading' | 'ready' | 'missing' }>({ manifest: null, status: 'loading' });
  useEffect(() => {
    let alive = true;
    fetch(`${base}manifest.json`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => { if (alive) setState(m && m.pages ? { manifest: m as EditionManifest, status: 'ready' } : { manifest: null, status: 'missing' }); })
      .catch(() => { if (alive) setState({ manifest: null, status: 'missing' }); });
    return () => { alive = false; };
  }, [base]);
  return state;
}

/* Номер страницы из адреса: /issue#page=42 открывает читалку на 42-й. */
export function pageFromHash(): number | null {
  const m = window.location.hash.match(/page=(\d+)/);
  return m ? Number(m[1]) : null;
}

function useWide() {
  const query = '(min-width: 1000px) and (min-aspect-ratio: 5/4)';
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return wide;
}

export function EditionReader({
  manifest,
  base,
  startPage,
  lang,
  onClose,
}: {
  manifest: EditionManifest;
  base: string;
  startPage: number;
  lang: string;
  onClose: () => void;
}) {
  const w = editionWords(lang);
  const total = manifest.pages;
  const wide = useWide();
  const [page, setPage] = useState(() => Math.min(Math.max(1, startPage), total));
  const [zoom, setZoom] = useState(false);
  const [panel, setPanel] = useState<'none' | 'toc' | 'grid'>('none');
  const rootRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<HTMLDivElement>(null);
  const spread = wide && !zoom;

  // Разворот как в журнале: обложка одна справа, дальше чётная слева и нечётная справа.
  const shown = useMemo(() => {
    if (!spread) return [page];
    if (page === 1) return [1];
    const left = page % 2 === 0 ? page : page - 1;
    return left + 1 <= total ? [left, left + 1] : [left];
  }, [page, spread, total]);

  const go = useCallback((n: number) => setPage(Math.min(Math.max(1, n), total)), [total]);
  const next = useCallback(() => go(shown[shown.length - 1] + 1), [go, shown]);
  const prev = useCallback(() => go(spread && shown[0] > 1 ? shown[0] - (shown[0] === 2 ? 1 : 2) : shown[0] - 1), [go, shown, spread]);

  // адрес следует за страницей, чтобы ссылкой можно было поделиться
  useEffect(() => {
    history.replaceState(history.state, '', `${window.location.pathname}${window.location.search}#page=${shown[0]}`);
  }, [shown]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    rootRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      history.replaceState(history.state, '', `${window.location.pathname}${window.location.search}`);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (panel !== 'none') setPanel('none'); else onClose(); }
      else if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
      else if (e.key === 'Home') go(1);
      else if (e.key === 'End') go(total);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, go, total, onClose, panel]);

  // соседние полосы грузятся заранее, чтобы перелистывание было мгновенным
  useEffect(() => {
    const around = [shown[0] - 2, shown[0] - 1, shown[shown.length - 1] + 1, shown[shown.length - 1] + 2, shown[shown.length - 1] + 3];
    for (const n of around) if (n >= 1 && n <= total) { const img = new Image(); img.src = pageSrc(base, n); }
  }, [shown, base, total]);

  useEffect(() => { zoomRef.current?.scrollTo({ top: 0, left: 0 }); }, [page, zoom]);

  // свайп на телефоне
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => { touch.current = { x: e.clientX, y: e.clientY }; };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = touch.current; touch.current = null;
    if (!s || zoom) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { if (dx < 0) next(); else prev(); }
  };

  const fullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void rootRef.current?.requestFullscreen?.();
  };

  const current = useMemo(() => {
    let sec: EditionTocEntry | undefined, story: EditionTocEntry | undefined;
    for (const e of manifest.toc) {
      if (e.page > shown[shown.length - 1]) break;
      if (e.kind === 'section') { sec = e; story = undefined; }
      else if (e.kind === 'story' || e.kind === 'review') story = e;
    }
    return { sec, story };
  }, [manifest.toc, shown]);

  const btn = 'inline-flex items-center justify-center gap-2 h-9 px-3 text-[#F7F2EC]/80 hover:text-[#F7F2EC] hover:bg-white/10 transition-colors font-mono text-[10px] uppercase tracking-widest';
  const pageBox = spread
    ? { height: 'min(calc(100dvh - 132px), calc((100vw - 160px) / 2 * 300 / 230))' }
    : { height: 'min(calc(100dvh - 132px), calc((100vw - 24px) * 300 / 230))' };

  /* Портал в body: страница раздела живёт внутри анимированной обёртки с
     transform, а у такого предка position: fixed считается от него, не от окна. */
  return createPortal(
    <div
      ref={rootRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={`${manifest.title} – ${manifest.edition}`}
      className="fixed inset-0 z-[1000] bg-[#12090e] text-[#F7F2EC] flex flex-col outline-none select-none"
    >
      {/* верхняя строка */}
      <div className="h-12 shrink-0 flex items-center gap-1 px-2 sm:px-4 border-b border-white/10">
        <button type="button" className={btn} onClick={onClose} aria-label={w.close}><X size={16} /></button>
        <div className="min-w-0 flex-1 px-2 truncate">
          <span className="font-serif italic text-sm sm:text-base">{manifest.title}</span>
          {current.story && <span className="hidden md:inline font-mono text-[10px] uppercase tracking-widest text-[#F7F2EC]/45 ml-3">{current.story.title}</span>}
        </div>
        <button type="button" className={`${btn} ${panel === 'toc' ? 'bg-white/10' : ''}`} onClick={() => setPanel(panel === 'toc' ? 'none' : 'toc')}><List size={15} /><span className="hidden sm:inline">{w.contents}</span></button>
        <button type="button" className={`${btn} ${panel === 'grid' ? 'bg-white/10' : ''}`} onClick={() => setPanel(panel === 'grid' ? 'none' : 'grid')} aria-label={w.all}><Grid3x3 size={15} /></button>
        <button type="button" className={btn} onClick={() => setZoom(!zoom)} aria-label={zoom ? w.unzoom : w.zoom} title={zoom ? w.unzoom : w.zoom}>{zoom ? <ZoomOut size={15} /> : <ZoomIn size={15} />}</button>
        <button type="button" className={`${btn} hidden sm:inline-flex`} onClick={fullscreen} aria-label={w.full}>{document.fullscreenElement ? <Minimize2 size={15} /> : <Maximize2 size={15} />}</button>
        <a className={btn} href={`${base}${manifest.pdf}`} download aria-label={w.download}><Download size={15} /><span className="hidden lg:inline">PDF · {megabytes(manifest.pdfBytes)}</span></a>
      </div>

      {/* полосы */}
      <div className="relative flex-1 min-h-0" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
        {zoom ? (
          <div ref={zoomRef} className="absolute inset-0 overflow-auto overscroll-contain" onDoubleClick={() => setZoom(false)}>
            {/* на телефоне «крупнее» – это полоса шире экрана: текст журнала
                набран 10 pt, в ширину телефона он не читается */}
            <img src={pageSrc(base, page)} alt={`${w.page} ${page}`} style={{ width: 'min(1240px, max(100%, 820px))' }} className="block mx-auto max-w-none h-auto" draggable={false} />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center gap-0 px-3 sm:px-16" onDoubleClick={() => setZoom(true)}>
            {spread && shown.length === 1 && shown[0] === 1 && <div style={pageBox} className="aspect-[230/300] invisible" />}
            {shown.map((n, i) => (
              <div key={n} style={pageBox} className={`aspect-[230/300] relative bg-[#1d1117] ${spread ? (i === 0 && shown.length === 2 ? 'shadow-[inset_-18px_0_24px_-18px_rgba(0,0,0,.45)]' : '') : ''}`}>
                <img
                  src={pageSrc(base, n)}
                  alt={`${w.page} ${n}`}
                  className="absolute inset-0 w-full h-full object-contain"
                  draggable={false}
                />
                {spread && shown.length === 2 && (
                  <div className={`pointer-events-none absolute inset-y-0 w-8 ${i === 0 ? 'right-0 bg-gradient-to-l' : 'left-0 bg-gradient-to-r'} from-black/25 to-transparent`} />
                )}
              </div>
            ))}
            {spread && shown.length === 1 && shown[0] === total && total > 1 && <div style={pageBox} className="aspect-[230/300] invisible" />}
          </div>
        )}
        {!zoom && (
          <>
            <button type="button" onClick={prev} disabled={shown[0] <= 1} aria-label={w.prev}
              className="absolute left-0 top-0 bottom-0 w-[18%] sm:w-14 flex items-center justify-start sm:justify-center pl-1 sm:pl-0 text-[#F7F2EC]/40 hover:text-[#F7F2EC] disabled:opacity-0 transition-colors">
              <ArrowLeft size={22} className="hidden sm:block" />
            </button>
            <button type="button" onClick={next} disabled={shown[shown.length - 1] >= total} aria-label={w.next}
              className="absolute right-0 top-0 bottom-0 w-[18%] sm:w-14 flex items-center justify-end sm:justify-center pr-1 sm:pr-0 text-[#F7F2EC]/40 hover:text-[#F7F2EC] disabled:opacity-0 transition-colors">
              <ArrowRight size={22} className="hidden sm:block" />
            </button>
          </>
        )}
        {zoom && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
            <button type="button" onClick={() => go(page - 1)} disabled={page <= 1} className="h-10 w-10 flex items-center justify-center bg-black/70 disabled:opacity-30" aria-label={w.prev}><ArrowLeft size={16} /></button>
            <button type="button" onClick={() => go(page + 1)} disabled={page >= total} className="h-10 w-10 flex items-center justify-center bg-black/70 disabled:opacity-30" aria-label={w.next}><ArrowRight size={16} /></button>
          </div>
        )}

        {/* оглавление */}
        {panel === 'toc' && (
          <div className="absolute inset-y-0 right-0 w-full sm:w-[420px] bg-[#180D13] border-l border-white/10 overflow-y-auto overscroll-contain p-5 sm:p-7" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
            <TocList manifest={manifest} w={w} active={current.story?.id} onGo={(p) => { go(p); setPanel('none'); }} dark />
          </div>
        )}

        {/* все страницы */}
        {panel === 'grid' && (
          <div className="absolute inset-0 bg-[#180D13] overflow-y-auto overscroll-contain p-4 sm:p-8" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
            <div className="grid gap-3 sm:gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}>
              {Array.from({ length: total }, (_, k) => k + 1).map((n) => (
                <button key={n} type="button" onClick={() => { go(n); setPanel('none'); }} className="text-left group">
                  <img src={thumbSrc(base, n)} alt="" loading="lazy" className={`w-full aspect-[230/300] object-cover bg-white/5 border ${shown.includes(n) ? 'border-[#D9B56F]' : 'border-transparent group-hover:border-white/40'}`} />
                  <span className="block mt-1 font-mono text-[9px] tracking-widest text-[#F7F2EC]/50">{n}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* нижняя строка */}
      <div className="h-[60px] shrink-0 flex items-center gap-3 sm:gap-5 px-4 sm:px-6 border-t border-white/10">
        <span className="font-mono text-[10px] tracking-widest text-[#F7F2EC]/70 whitespace-nowrap w-[88px]">
          {shown.length === 2 ? `${shown[0]}–${shown[1]}` : shown[0]} / {total}
        </span>
        <input
          type="range"
          min={1}
          max={total}
          value={shown[0]}
          onChange={(e) => go(Number(e.target.value))}
          aria-label={w.page}
          className="flex-1 accent-[#D9B56F] h-1"
        />
        <span className="hidden md:block font-mono text-[10px] uppercase tracking-widest text-[#F7F2EC]/45 truncate max-w-[34%]">
          {current.sec ? `${current.sec.num} · ${current.sec.title}` : manifest.season}
        </span>
      </div>
    </div>,
    document.body,
  );
}

export function TocList({
  manifest,
  w,
  onGo,
  onSite,
  active,
  dark = false,
}: {
  manifest: EditionManifest;
  w: Record<string, string>;
  onGo: (page: number) => void;
  onSite?: (articleId: number) => void;
  active?: string;
  dark?: boolean;
}) {
  const groups: { sec?: EditionTocEntry; items: EditionTocEntry[] }[] = [];
  for (const e of manifest.toc) {
    if (e.kind === 'section') groups.push({ sec: e, items: [] });
    else if (e.kind === 'front') { if (!groups.length) groups.push({ items: [] }); groups[0].items.push(e); }
    else (groups[groups.length - 1] || (groups[0] = { items: [] })).items.push(e);
  }
  const ink = dark ? 'text-[#F7F2EC]' : 'text-[var(--c-accent)]';
  const soft = dark ? 'text-[#F7F2EC]/50' : 'text-[rgb(var(--c-accent-rgb)_/_0.5)]';
  const rule = dark ? 'border-white/10' : 'border-[rgb(var(--c-accent-rgb)_/_0.12)]';
  return (
    <div className="space-y-8">
      {groups.map((g, gi) => (
        <div key={g.sec?.id || `front-${gi}`}>
          {g.sec && (
            <button type="button" onClick={() => onGo(g.sec!.page)} className={`w-full flex items-baseline gap-3 border-b ${dark ? 'border-white/25' : 'border-[var(--c-accent)]'} pb-2 mb-1 text-left`}>
              <span className={`font-mono text-[10px] tracking-[0.25em] ${soft} w-8 shrink-0`}>{g.sec.num}</span>
              <span style={{ fontFamily: 'var(--font-display)' }} className={`text-xl sm:text-2xl leading-tight ${ink} flex-1`}>{g.sec.title}</span>
              <span className={`font-mono text-[10px] ${soft}`}>{g.sec.page}</span>
            </button>
          )}
          <ol>
            {g.items.map((e) => {
              const articleId = e.kind === 'story' ? Number(e.id.replace('art-', '')) : null;
              return (
                <li key={e.id} className={`flex items-baseline gap-3 border-b ${rule} ${active === e.id ? (dark ? 'bg-white/5' : 'bg-[rgb(var(--c-accent-rgb)_/_0.04)]') : ''}`}>
                  <span className="w-8 shrink-0" />
                  <button type="button" onClick={() => onGo(e.page)} className="flex-1 min-w-0 py-2.5 text-left group">
                    <span className={`block font-serif text-[15px] sm:text-base leading-snug ${ink} group-hover:underline underline-offset-4 decoration-1`}>{e.title}</span>
                    {e.author && <span className={`block font-mono text-[9px] sm:text-[10px] uppercase tracking-widest mt-0.5 ${soft}`}>{e.kind === 'review' ? `${e.kicker || 'Review'} · ` : ''}{e.author}</span>}
                  </button>
                  {onSite && articleId && (
                    <button type="button" onClick={() => onSite(articleId)} className={`hidden sm:inline font-mono text-[9px] uppercase tracking-widest ${soft} ${dark ? 'hover:text-[#F7F2EC]' : 'hover:text-[var(--c-accent)]'} whitespace-nowrap`}>
                      {w.onsite}
                    </button>
                  )}
                  <button type="button" onClick={() => onGo(e.page)} className={`font-mono text-[11px] ${ink} w-9 text-right shrink-0`} aria-label={`${w.page} ${e.page}`}>{e.page}</button>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </div>
  );
}

/* Первый экран раздела «Выпуск»: обложка, цифры, две кнопки, полосы-разделы. */
export function EditionShowcase({
  manifest,
  base,
  lang,
  onRead,
  onSite,
}: {
  manifest: EditionManifest;
  base: string;
  lang: string;
  onRead: (page: number) => void;
  onSite?: (articleId: number) => void;
}) {
  const w = editionWords(lang);
  const sections = manifest.toc.filter((e) => e.kind === 'section');
  return (
    <>
      <section className="bg-[#180D13] text-[#F7F2EC]">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-24 pb-14 sm:pt-28 sm:pb-20 grid gap-10 md:gap-16 md:grid-cols-[1fr_minmax(260px,380px)] md:items-center">
          <div>
            <p className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.28em] text-[#F7F2EC]/55 mb-7">
              <span className="w-8 border-t border-[#F7F2EC]/30" aria-hidden="true" />
              {manifest.season} · {manifest.edition}
            </p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400 }} className="text-[clamp(44px,7.4vw,96px)] leading-[0.92] tracking-[-0.02em] text-balance">
              {manifest.title}
            </h1>
            <p className="font-serif text-lg md:text-xl leading-relaxed text-[#F7F2EC]/75 mt-7 max-w-xl">{w.lede}</p>
            <dl className="grid grid-cols-4 max-w-lg mt-9 border-t border-[#F7F2EC]/20">
              {[[manifest.pages, w.pages], [manifest.stories, w.stories], [manifest.reviews, w.reviews], [sections.length, w.sections]].map(([n, label]) => (
                <div key={String(label)} className="pt-3 pr-2">
                  <dt style={{ fontFamily: 'var(--font-display)' }} className="text-3xl md:text-4xl leading-none">{n}</dt>
                  <dd className="font-mono text-[9px] uppercase tracking-widest text-[#F7F2EC]/50 mt-1.5">{label}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap gap-3 mt-9">
              <button type="button" onClick={() => onRead(1)} className="inline-flex items-center gap-2 bg-[#F7F2EC] text-[#180D13] px-7 py-3.5 font-mono text-[10px] uppercase tracking-widest hover:bg-[#D9B56F] transition-colors">
                <BookOpen size={14} aria-hidden="true" /> {w.read}
              </button>
              <a href={`${base}${manifest.pdf}`} download className="inline-flex items-center gap-2 border border-[#F7F2EC]/60 px-7 py-3.5 font-mono text-[10px] uppercase tracking-widest hover:bg-[#F7F2EC] hover:text-[#180D13] transition-colors">
                <Download size={14} aria-hidden="true" /> {w.download} · {megabytes(manifest.pdfBytes)}
              </a>
              <a href="#edition-contents" className="inline-flex items-center gap-2 px-4 py-3.5 font-mono text-[10px] uppercase tracking-widest text-[#F7F2EC]/70 hover:text-[#F7F2EC]">
                {w.contents} <ArrowRight size={13} aria-hidden="true" />
              </a>
            </div>
          </div>
          <button type="button" onClick={() => onRead(1)} className="order-first md:order-none w-52 sm:w-64 md:w-full mx-auto group" aria-label={w.read}>
            <div className="relative aspect-[230/300] shadow-[0_30px_60px_-20px_rgba(0,0,0,.8)] transition-transform duration-500 group-hover:-translate-y-1 group-hover:rotate-[-0.6deg]">
              <img src={pageSrc(base, 1)} alt={`${manifest.title} – ${manifest.season}`} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/40 to-transparent" aria-hidden="true" />
            </div>
          </button>
        </div>
      </section>

      {sections.length > 0 && (
        <section className="border-b border-[rgb(var(--c-accent-rgb)_/_0.14)]">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.55)] mb-6">{w.inside}</p>
            <div className="flex gap-4 sm:gap-5 overflow-x-auto pb-3 -mx-5 px-5 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 lg:grid-cols-6 sm:overflow-visible">
              {sections.map((s) => (
                <button key={s.id} type="button" onClick={() => onRead(s.page)} className="shrink-0 w-36 sm:w-auto self-start text-left group">
                  <div className="aspect-[230/300] overflow-hidden border border-[rgb(var(--c-accent-rgb)_/_0.16)]">
                    <img src={thumbSrc(base, s.page)} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                  </div>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.45)] mt-2">{w.section} {s.num} · p. {s.page}</p>
                  <p style={{ fontFamily: 'var(--font-display)' }} className="text-lg leading-tight text-[var(--c-accent)]">{s.title}</p>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="edition-contents" className="scroll-mt-20">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
          <div className="flex items-baseline justify-between border-b border-[rgb(var(--c-accent-rgb)_/_0.14)] pb-4 mb-8">
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 430 }} className="text-3xl md:text-5xl tracking-[-0.03em] text-[var(--c-accent)]">{w.contents}</h2>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.45)]">{manifest.pages} {w.pages}</span>
          </div>
          <TocList manifest={manifest} w={w} onGo={onRead} onSite={onSite} />
        </div>
      </section>
    </>
  );
}
