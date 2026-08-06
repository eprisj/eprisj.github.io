import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { fetchCase, fetchCases, type BureauCase } from './bureauApi';
import { PLAYABLE_SLUGS } from '../stage/moves';

/**
 * Бюро — мастерская журнала: не «что показали», а «как это устроено».
 *
 * Разбирается ПРИЁМ, а не чужая работа. Работы из витрины стоят здесь как
 * примеры со ссылкой на них — но инструкции «как повторить вот это» тут нет и
 * быть не может: технических подробностей чужих постановок мы не знаем, а
 * придуманная спецификация была бы ложью, подписанной чужим именем.
 *
 * Язык страницы — тот же, что у первого экрана витрины: почти чёрный кадр,
 * крупный строчный шрифт, волосяные линии.
 */

const INK = '#1a0b10';

function slugFromPath(): string | null {
  const match = window.location.pathname.match(/^\/bureau\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function Rules() {
  return (
    <>
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-[8%] hidden w-px bg-[#f5f0eb]/12 lg:block" />
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-[8%] hidden w-px bg-[#f5f0eb]/12 lg:block" />
    </>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#f5f0eb]/12 bg-[#1a0b10]/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-8 lg:px-12">
        <a href="/showcase" className="inline-flex min-h-11 items-center gap-2 font-sans text-[9px] uppercase tracking-[0.2em] text-[#f5f0eb]/60 hover:text-[#f5f0eb]">
          <ArrowLeft size={14} /> Showcase
        </a>
        <a href="/bureau" className="inline-flex min-h-11 items-center font-sans text-[13px] font-bold lowercase tracking-[-0.02em] text-[#f5f0eb] sm:text-[15px]">
          epris bureau
        </a>
        <span className="inline-flex items-center gap-5">
          <a href="/stage" className="inline-flex min-h-11 items-center font-sans text-[9px] uppercase tracking-[0.2em] text-[#f5f0eb]/60 hover:text-[#f5f0eb]">
            Stage
          </a>
          <a href="/" className="inline-flex min-h-11 items-center gap-2 font-sans text-[9px] uppercase tracking-[0.2em] text-[#f5f0eb]/60 hover:text-[#f5f0eb]">
            Journal <ArrowUpRight size={13} />
          </a>
        </span>
      </div>
    </header>
  );
}

function CaseDetail({ item }: { item: BureauCase }) {
  return (
    <article className="mx-auto max-w-[1100px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
      {item.kind && (
        <p className="font-sans text-[9px] uppercase tracking-[0.22em] text-[#f5f0eb]/45">{item.kind}</p>
      )}
      <h1 className="mt-5 font-sans text-[12vw] font-bold lowercase leading-[0.85] tracking-[-0.04em] text-[#f5f0eb] sm:text-[7vw] lg:text-[5rem]">
        {item.title}
      </h1>
      {item.summary && (
        <p className="mt-7 max-w-[62ch] font-sans text-[16px] leading-relaxed text-[#f5f0eb]/80 sm:text-[18px]">
          {item.summary}
        </p>
      )}

      <dl className="mt-12 divide-y divide-[#f5f0eb]/12 border-t border-[#f5f0eb]/12">
        {item.layers.map((layer, index) => (
          <div key={layer.label} className="grid grid-cols-[2.4rem_1fr] gap-x-4 py-6 sm:grid-cols-[3.5rem_10rem_1fr] sm:gap-x-8">
            <span className="font-sans text-[9px] tabular-nums tracking-[0.16em] text-[#f5f0eb]/35">
              {String(index + 1).padStart(2, '0')}
            </span>
            <dt className="font-sans text-[9px] uppercase tracking-[0.2em] text-[#f5f0eb]/45 max-sm:col-start-2">
              {layer.label}
            </dt>
            <dd className="max-sm:col-start-2 max-sm:mt-2 max-w-[60ch] font-sans text-[15px] leading-relaxed text-[#f5f0eb] sm:text-[16px]">
              {layer.text}
            </dd>
          </div>
        ))}
      </dl>

      {/* Разбор объясняет приём, Stage даёт его покрутить. Ход предлагается
          только там, где оператор действительно есть: обещать «попробовать»
          и открыть пустую коробку хуже, чем не звать вовсе. */}
      {PLAYABLE_SLUGS.includes(item.slug) && (
        <a
          href="/stage"
          className="group mt-12 flex items-center justify-between gap-6 border-t border-[#f5f0eb]/12 pt-6 hover:border-[#f5f0eb]/40"
        >
          <span>
            <span className="block font-sans text-[9px] uppercase tracking-[0.22em] text-[#f5f0eb]/45">Try it</span>
            <span className="mt-1.5 block font-sans text-[17px] lowercase text-[#f5f0eb]">
              turn this move on a box of your own
            </span>
          </span>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#f5f0eb]/30 text-[#f5f0eb] transition-transform group-hover:translate-x-1">
            <ArrowUpRight size={18} />
          </span>
        </a>
      )}

      {!!item.examples?.length && (
        <section className="mt-14 border-t border-[#f5f0eb]/12 pt-8">
          <h2 className="font-sans text-[9px] uppercase tracking-[0.22em] text-[#f5f0eb]/45">Where it shows</h2>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {item.examples.map((example) => (
              <li key={example.workId} className="border-t border-[#f5f0eb]/15 pt-4">
                <p className="font-sans text-[15px] leading-snug text-[#f5f0eb]">{example.title}</p>
                <p className="mt-1 font-sans text-[9px] uppercase tracking-[0.16em] text-[#f5f0eb]/45">{example.author}</p>
                {example.note && (
                  <p className="mt-3 font-sans text-[13px] leading-relaxed text-[#f5f0eb]/70">{example.note}</p>
                )}
                {/* Витрина — источник примеров, поэтому отсюда всегда есть ход обратно. */}
                <a href="/showcase" className="mt-3 inline-flex min-h-10 items-center gap-2 font-sans text-[9px] uppercase tracking-[0.16em] text-[#f5f0eb]/60 hover:text-[#f5f0eb]">
                  In the vitrine <ArrowUpRight size={12} />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {item.editorial && (
        <p className="mt-14 border-t border-[#f5f0eb]/12 pt-6 font-sans text-[9px] uppercase tracking-[0.2em] text-[#f5f0eb]/40">
          {item.editorial}
        </p>
      )}
    </article>
  );
}

function CaseList({ items }: { items: BureauCase[] }) {
  return (
    <div className="mx-auto max-w-[1600px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
      <h1 className="font-sans text-[15vw] font-bold lowercase leading-[0.82] tracking-[-0.04em] text-[#f5f0eb] sm:text-[9vw] lg:text-[6.5rem]">
        bureau
      </h1>
      <p className="mt-6 max-w-[54ch] font-sans text-[15px] leading-relaxed text-[#f5f0eb]/70 sm:text-[17px]">
        how the work in the vitrine is actually put together — the move, what holds it up, where it breaks
      </p>

      {items.length === 0 ? (
        <p className="mt-16 border-t border-[#f5f0eb]/12 pt-8 font-sans text-[14px] leading-relaxed text-[#f5f0eb]/45">
          The first breakdowns are being written. Nothing is published here yet.
        </p>
      ) : (
        <ul className="mt-14 divide-y divide-[#f5f0eb]/12 border-t border-[#f5f0eb]/12">
          {items.map((item, index) => (
            <li key={item.id}>
              <a href={`/bureau/${item.slug}`} className="group grid grid-cols-[2.4rem_1fr] gap-x-4 py-8 sm:grid-cols-[4rem_1fr_auto] sm:gap-x-8">
                <span className="font-sans text-[9px] tabular-nums tracking-[0.16em] text-[#f5f0eb]/35">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="max-sm:col-start-2">
                  {item.kind && (
                    <span className="block font-sans text-[9px] uppercase tracking-[0.2em] text-[#f5f0eb]/45">{item.kind}</span>
                  )}
                  <span className="mt-2 block font-sans text-[1.7rem] font-bold lowercase leading-[0.95] tracking-[-0.03em] text-[#f5f0eb] underline-offset-[6px] group-hover:underline sm:text-[2.4rem]">
                    {item.title}
                  </span>
                  {item.summary && (
                    <span className="mt-3 block max-w-[58ch] font-sans text-[14px] leading-relaxed text-[#f5f0eb]/65">
                      {item.summary}
                    </span>
                  )}
                </span>
                <ArrowUpRight size={20} className="mt-2 hidden self-start text-[#f5f0eb]/40 transition-transform group-hover:translate-x-1 sm:block" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function BureauPage() {
  const [slug] = useState<string | null>(() => slugFromPath());
  const [items, setItems] = useState<BureauCase[]>([]);
  const [item, setItem] = useState<BureauCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const load = slug
      ? fetchCase(slug, controller.signal).then(setItem)
      : fetchCases(controller.signal).then(setItems);
    load
      .catch((cause) => { if (cause.name !== 'AbortError') setError(String(cause.message || cause)); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [slug]);

  return (
    <div className="relative isolate min-h-screen bg-[#1a0b10] text-[#f5f0eb]" style={{ backgroundColor: INK }}>
      <Rules />
      <Header />
      <main className="relative">
        {loading && (
          <p className="mx-auto max-w-[1600px] px-5 py-20 font-sans text-[10px] uppercase tracking-[0.2em] text-[#f5f0eb]/45 sm:px-8 lg:px-12">
            Loading
          </p>
        )}
        {!loading && error && (
          <p className="mx-auto max-w-[1600px] px-5 py-20 font-sans text-[14px] text-[#f5f0eb]/70 sm:px-8 lg:px-12">{error}</p>
        )}
        {!loading && !error && slug && !item && (
          <div className="mx-auto max-w-[1600px] px-5 py-20 sm:px-8 lg:px-12">
            <p className="font-sans text-[2rem] font-bold lowercase leading-[0.95] tracking-[-0.03em]">no such breakdown</p>
            <a href="/bureau" className="mt-6 inline-flex min-h-11 items-center gap-2 font-sans text-[9px] uppercase tracking-[0.18em] text-[#f5f0eb]/60 hover:text-[#f5f0eb]">
              <ArrowLeft size={14} /> All breakdowns
            </a>
          </div>
        )}
        {!loading && !error && slug && item && <CaseDetail item={item} />}
        {!loading && !error && !slug && <CaseList items={items} />}
      </main>
    </div>
  );
}
