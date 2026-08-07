import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Layers3, Lightbulb, Ruler, Sparkles } from 'lucide-react';
import { FALLBACK_CASES, fetchCase, fetchCases, type BureauCase } from './bureauApi';
import { FALLBACK_WORKS, fetchWorks, type Work } from './showcaseApi';
import { PLAYABLE_SLUGS } from '../stage/moves';
import { btnGhost, btnSolid } from './ui';

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
const BUREAU_SERVICES = [
  { icon: Layers3, title: 'Set direction', text: 'the room logic, object scale, backdrop, entrance image and final visual grammar' },
  { icon: Lightbulb, title: 'Light scenario', text: 'key light, shadow depth, reflection, night mode and the exact camera-facing moment' },
  { icon: Ruler, title: 'Production board', text: 'materials, measurements, route, vendor notes and a brief a build team can read' },
  { icon: Sparkles, title: 'Launch image', text: 'hero frame, social crop, invitation mood and editorial caption language' },
];

/* Было двенадцать пунктов — целый экран текстового списка, где каждый пункт
   набран антиквой в 2rem. Шесть держат ту же мысль и не превращают раздел в
   оглавление: остальные шесть были вариациями этих же (полка/подиум/рейка —
   одно и то же решение с разной фурнитурой). */
const OBJECT_LIBRARY = [
  ['01', 'low plinth', 'a quiet platform that gives the object gravity before any text explains it'],
  ['02', 'mirror edge', 'a controlled reflection that doubles a gesture without turning the room into noise'],
  ['03', 'translucent curtain', 'soft depth, partial reveal, shadow readable from both sides'],
  ['04', 'backlit volume', 'a box that behaves like a window after dark'],
  ['05', 'floor mark', 'the visitor route made physical: tape, stone inset, carpet edge or brass line'],
  ['06', 'night state', 'the second life of the installation when the street becomes the audience'],
];

const MATERIALS = ['brushed steel', 'smoked glass', 'cream paper', 'wine lacquer', 'raw linen', 'warm LED', 'stone grey', 'black mirror'];

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
        <a href="/bureau" className="inline-flex min-h-11 items-center font-display text-[18px] lowercase leading-none tracking-normal text-[#f5f0eb] sm:text-[22px]">
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

function workImage(work?: Work): string {
  return work?.images?.find((image) => image?.url)?.url || '';
}

function BureauProductionIntro({ works }: { works: Work[] }) {
  const hero = works[0];
  const second = works[2] || works[1] || hero;
  const third = works[4] || works[3] || second;
  const heroRefs = [hero, second, third].filter(Boolean);

  return (
    <section className="relative overflow-hidden border-b border-[#f5f0eb]/12 bg-[#14090d]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_18%,rgba(215,180,106,.18),transparent_28%),linear-gradient(118deg,#14090d_0%,#14090d_54%,#281116_100%)]" />
      <div className="absolute inset-0 opacity-[0.055]" style={{ backgroundImage: 'linear-gradient(90deg,#f5f0eb 1px,transparent 1px),linear-gradient(#f5f0eb 1px,transparent 1px)', backgroundSize: '120px 120px' }} />
      <div className="mx-auto grid max-w-[1700px] gap-8 px-5 py-12 sm:px-8 sm:py-16 lg:min-h-[86dvh] lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,0.7fr)] lg:items-center lg:px-12 xl:px-16">
        <div className="relative z-10">
          <div>
            <p className="font-sans text-[10px] uppercase tracking-normal text-[#d7b46a]">EPRIS Bureau / spatial image studio</p>
            <h1 className="mt-5 max-w-[10ch] font-display text-[clamp(3.5rem,8.6vw,8.6rem)] lowercase leading-[0.82] tracking-normal text-[#f5f0eb]">
              set design for things that need a scene
            </h1>
          </div>
          <div className="mt-10 max-w-[46rem]">
            <p className="border-l border-[#d7b46a] pl-5 font-sans text-[17px] leading-relaxed text-[#f5f0eb]/78 sm:text-[20px]">
              We design visual situations for culture and brands: vitrines, sets, exhibition rooms, launch scenes and editorial environments where object, light and visitor route work as one image.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#bureau-services" className={btnSolid('ink')}>
                What we make <ArrowRight size={15} />
              </a>
              <a href="/showcase" className={btnGhost('ink')}>
                Source vitrine <ArrowUpRight size={15} />
              </a>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <div className="border border-[#f5f0eb]/18 bg-[#f4eadc] p-3 text-[#1a0b10] shadow-[0_34px_120px_rgba(0,0,0,.42)] sm:p-4">
            <figure className="relative aspect-[4/5] overflow-hidden bg-[#d5cabd] sm:aspect-[5/4] lg:aspect-[4/5]">
              {workImage(hero) ? (
                <img src={workImage(hero)} alt={hero.title} loading="eager" className="h-full w-full object-cover saturate-[.86]" />
              ) : (
                <div className="h-full w-full bg-[#c7b498]" />
              )}
              <figcaption className="absolute bottom-0 left-0 right-0 grid gap-3 bg-[#f4eadc]/92 p-4 backdrop-blur-sm sm:grid-cols-[1fr_auto] sm:items-end">
                <span>
                  <span className="block font-sans text-[9px] uppercase tracking-normal text-[#7b613a]">reference surface</span>
                  <span className="mt-1 block font-display text-[2.1rem] lowercase leading-[0.88] text-[#1a0b10] sm:text-[2.7rem]">
                    {hero?.title || 'room prototype'}
                  </span>
                </span>
                <span className="font-sans text-[10px] uppercase tracking-normal text-[#1a0b10]/52">{hero?.discipline || 'set'} / {hero?.city || hero?.country || 'site'}</span>
              </figcaption>
            </figure>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {heroRefs.map((work, index) => (
                <div key={work.id} className="border border-[#1a0b10]/12 bg-[#fffaf2] p-3">
                  <p className="font-sans text-[9px] uppercase tracking-normal text-[#7b613a]">0{index + 1}</p>
                  <p className="mt-8 font-display text-[1.9rem] lowercase leading-[0.9] text-[#1a0b10]">
                    {index === 0 ? 'arrival image' : index === 1 ? 'object scale' : 'material light'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BureauReferenceRoom({ works }: { works: Work[] }) {
  const refs = works.filter((work) => workImage(work)).slice(0, 6);

  return (
    <section className="relative overflow-hidden border-b border-[#f5f0eb]/12 bg-[#0f0709] text-[#f5f0eb]">
      <div className="absolute inset-0 opacity-[0.045]" style={{ backgroundImage: 'linear-gradient(90deg,#f5f0eb 1px,transparent 1px),linear-gradient(#f5f0eb 1px,transparent 1px)', backgroundSize: '128px 128px' }} />
      <div className="mx-auto max-w-[1700px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12 xl:px-16">
        <div className="relative z-10 grid gap-8 border-b border-[#f5f0eb]/12 pb-10 lg:grid-cols-[minmax(0,0.62fr)_minmax(0,0.9fr)] lg:items-end">
          <div>
          <p className="font-sans text-[10px] uppercase tracking-normal text-[#d7b46a]">real references / object thinking</p>
          <h2 className="mt-5 max-w-[11ch] font-display text-[clamp(2.6rem,5.2vw,4.4rem)] lowercase leading-[0.84] tracking-normal">
            reference room
          </h2>
          </div>
          <div>
          <p className="max-w-[43rem] border-l border-[#d7b46a] pl-5 font-sans text-[17px] leading-relaxed text-[#f5f0eb]/72">
            Bureau starts with actual works and visible things: surfaces, shadows, shelves, curtains, podiums, frames, routes. The references below become decisions a fabricator, photographer and curator can all understand.
          </p>
          <a href="/showcase" className={`${btnSolid('ink')} mt-8`}>
            Browse the source vitrine <ArrowUpRight size={15} />
          </a>
          </div>
        </div>

        <div className="relative z-10 pt-8">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {refs.map((work, index) => {
              return (
                <a key={work.id} href="/showcase" className="group block border border-[#f5f0eb]/14 bg-[#1d0d12] p-3 shadow-[0_22px_70px_rgba(0,0,0,.24)] transition-colors hover:border-[#d7b46a]/60">
                  <span className="block aspect-[4/3] overflow-hidden bg-[#261116]">
                    <img src={workImage(work)} alt={work.title} loading="lazy" className="h-full w-full object-cover opacity-[.9] transition duration-300 group-hover:scale-[1.035] group-hover:opacity-100" />
                  </span>
                  <span className="grid min-h-[118px] grid-cols-[2.5rem_1fr] gap-4 border-t border-[#f5f0eb]/12 pt-4">
                    <span className="font-display text-[2rem] leading-none text-[#d7b46a]/70">{String(index + 1).padStart(2, '0')}</span>
                    <span>
                      <span className="block font-display text-[1.8rem] lowercase leading-[0.92] text-[#f5f0eb]">{work.title}</span>
                      <span className="mt-2 block font-sans text-[9px] uppercase tracking-normal text-[#d7b46a]">{work.discipline || 'reference'} / {work.city || work.country || 'site'}</span>
                    </span>
                  </span>
                </a>
              );
            })}
          </div>
          <div className="mt-7 flex flex-wrap gap-2 border-t border-[#f5f0eb]/18 pt-5">
            {MATERIALS.map((item) => (
              <span key={item} className="border border-[#f5f0eb]/18 bg-[#0f0709]/68 px-3 py-2 font-sans text-[10px] uppercase tracking-normal text-[#f5f0eb]/66">{item}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* Раньше это были две светлые секции подряд: «designed to be built» и
   «the useful beautiful things». Обе — список названных существительных под
   собственным заголовком в 4.4rem, разделённые только тем, что одна про
   услуги, а другая про предметы. Читались как один длинный перечень, дважды
   объявленный. Теперь один экран: что бюро отдаёт — крупно, чем оно при этом
   работает — строкой снизу, потому что второе есть подробность первого. */
function BureauServices() {
  return (
    <section id="bureau-services" className="border-b border-[#f5f0eb]/12 bg-[#f0e7d9] text-[#1a0b10]">
      <div className="mx-auto grid max-w-[1700px] lg:grid-cols-[minmax(0,0.74fr)_minmax(0,1fr)]">
        <div className="px-5 py-12 sm:px-8 lg:px-12 xl:px-16">
          <p className="font-sans text-[10px] uppercase tracking-normal text-[#4a1728]/58">Bureau output</p>
          <h2 className="mt-5 max-w-[8ch] font-display text-[clamp(2.6rem,5.2vw,4.4rem)] lowercase leading-[0.78] tracking-normal">
            designed to be built
          </h2>
          <p className="mt-7 max-w-[34rem] text-[17px] leading-relaxed text-[#4a1728]/72">
            Not moodboards for decoration. A visual system that can become a window, room, route, launch set or exhibition script.
          </p>

          <div className="mt-10 border-t border-[#1a0b10]/12 pt-6">
            <p className="font-sans text-[10px] uppercase tracking-normal text-[#4a1728]/56">the objects we work with</p>
            <dl className="mt-5 divide-y divide-[#1a0b10]/10">
              {OBJECT_LIBRARY.map(([num, title, text]) => (
                <div key={title} className="grid grid-cols-[2rem_1fr] gap-x-4 py-3 sm:grid-cols-[2rem_9rem_1fr] sm:gap-x-5">
                  <span className="font-sans text-[10px] tabular-nums text-[#b8956e]">{num}</span>
                  <dt className="font-sans text-[13px] lowercase text-[#1a0b10] max-sm:col-start-2">{title}</dt>
                  <dd className="font-sans text-[13px] leading-relaxed text-[#4a1728]/62 max-sm:col-start-2 max-sm:mt-1">{text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        <div className="grid border-t border-[#1a0b10]/12 sm:grid-cols-2 lg:border-l lg:border-t-0">
          {BUREAU_SERVICES.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="min-h-[260px] border-b border-[#1a0b10]/12 p-5 sm:border-r sm:p-7 lg:p-8">
                <Icon size={20} className="text-[#4a1728]" />
                <h3 className="mt-10 font-display text-[2.4rem] lowercase leading-[0.86] text-[#1a0b10]">{item.title}</h3>
                <p className="mt-4 max-w-[25rem] text-[15px] leading-relaxed text-[#4a1728]/70">{item.text}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CaseDetail({ item }: { item: BureauCase }) {
  return (
    <article className="mx-auto max-w-[1100px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
      {item.kind && (
        <p className="font-sans text-[9px] uppercase tracking-[0.22em] text-[#f5f0eb]/45">{item.kind}</p>
      )}
      <h1 className="mt-5 font-display text-[clamp(4rem,11vw,8rem)] lowercase leading-[0.82] tracking-normal text-[#f5f0eb]">
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

function CaseList({ items, works }: { items: BureauCase[]; works: Work[] }) {
  const cases = items.length ? items : FALLBACK_CASES;
  const workById = new Map(works.map((work) => [work.id, work]));

  return (
    <>
      <BureauProductionIntro works={works} />
      <BureauReferenceRoom works={works} />
      <BureauServices />
      <div className="mx-auto max-w-[1600px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <p className="font-sans text-[10px] uppercase tracking-normal text-[#d7b46a]">case studies</p>
        <h2 className="mt-4 max-w-[9ch] font-display text-[clamp(2.6rem,5.2vw,4.4rem)] lowercase leading-[0.78] tracking-normal text-[#f5f0eb]">
          breakdowns
        </h2>
        <p className="mt-6 max-w-[54ch] font-sans text-[15px] leading-relaxed text-[#f5f0eb]/70 sm:text-[17px]">
          how the work in the vitrine is actually put together: the move, what holds it up, where it breaks
        </p>

        <div className="mt-14 grid gap-px border border-[#f5f0eb]/14 bg-[#f5f0eb]/14 sm:grid-cols-2 xl:grid-cols-4">
          {cases.map((item, index) => {
            const leadWork = item.examples?.map((example) => workById.get(example.workId)).find(Boolean);
            const image = leadWork ? workImage(leadWork) : '';
            return (
              <a key={item.id} href={`/bureau/${item.slug}`} className="group flex min-h-[460px] flex-col bg-[#160a0e] p-4 transition-colors hover:bg-[#241118] sm:p-5">
                <div className="relative aspect-[4/3] overflow-hidden bg-[#2b171c]">
                  {image ? <img src={image} alt={leadWork?.title || item.title} loading="lazy" className="h-full w-full object-cover opacity-75 transition duration-500 group-hover:scale-[1.04] group-hover:opacity-100" /> : <div className="h-full w-full bg-[#2b171c]" />}
                  <span className="absolute left-3 top-3 border border-[#f5f0eb]/30 bg-[#160a0e]/70 px-2 py-1 font-sans text-[9px] uppercase tracking-[0.16em] text-[#f5f0eb]/75">{String(index + 1).padStart(2, '0')}</span>
                  <ArrowUpRight size={18} className="absolute bottom-3 right-3 text-[#f5f0eb]/75 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                </div>
                <span className="mt-5 flex flex-1 flex-col">
                  <span className="font-sans text-[9px] uppercase tracking-[0.16em] text-[#d7b46a]">{item.kind || 'Editorial breakdown'}</span>
                  <span className="mt-3 font-display text-[clamp(2rem,3vw,3rem)] lowercase leading-[0.86] text-[#f5f0eb]">{item.title}</span>
                  <span className="mt-4 line-clamp-3 font-sans text-[14px] leading-relaxed text-[#f5f0eb]/62">{item.summary}</span>
                  <span className="mt-auto border-t border-[#f5f0eb]/14 pt-4 font-sans text-[9px] uppercase tracking-[0.16em] text-[#f5f0eb]/46">Read the breakdown</span>
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </>
  );
}

export function BureauPage() {
  const [slug] = useState<string | null>(() => slugFromPath());
  const [items, setItems] = useState<BureauCase[]>([]);
  const [works, setWorks] = useState<Work[]>([]);
  const [item, setItem] = useState<BureauCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      if (slug) {
        await Promise.all([fetchCase(slug, controller.signal).then(setItem), fetchWorks(controller.signal).then(setWorks)]);
        return;
      }

      const [caseResult, workResult] = await Promise.allSettled([
        fetchCases(controller.signal),
        fetchWorks(controller.signal),
      ]);
      if (caseResult.status === 'fulfilled') setItems(caseResult.value);
      if (workResult.status === 'fulfilled') setWorks(workResult.value);
      if (workResult.status === 'rejected') setWorks(FALLBACK_WORKS);
    };

    load()
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
            <p className="font-display text-[clamp(2.8rem,7vw,5rem)] lowercase leading-[0.84] tracking-normal">no such breakdown</p>
            <a href="/bureau" className="mt-6 inline-flex min-h-11 items-center gap-2 font-sans text-[9px] uppercase tracking-[0.18em] text-[#f5f0eb]/60 hover:text-[#f5f0eb]">
              <ArrowLeft size={14} /> All breakdowns
            </a>
          </div>
        )}
        {!loading && !error && slug && item && <CaseDetail item={item} />}
        {!loading && !error && !slug && <CaseList items={items} works={works} />}
      </main>
    </div>
  );
}
