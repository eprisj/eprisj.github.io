import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Layers3, Lightbulb, Ruler, Sparkles } from 'lucide-react';
import { fetchCase, fetchCases, type BureauCase } from './bureauApi';
import { fetchWorks, type Work } from './showcaseApi';
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
const BUREAU_SERVICES = [
  { icon: Layers3, title: 'Set direction', text: 'the room logic, object scale, backdrop, entrance image and final visual grammar' },
  { icon: Lightbulb, title: 'Light scenario', text: 'key light, shadow depth, reflection, night mode and the exact camera-facing moment' },
  { icon: Ruler, title: 'Production board', text: 'materials, measurements, route, vendor notes and a brief a build team can read' },
  { icon: Sparkles, title: 'Launch image', text: 'hero frame, social crop, invitation mood and editorial caption language' },
];

const OBJECT_LIBRARY = [
  ['01', 'low plinth', 'a quiet platform that gives the object gravity before any text explains it'],
  ['02', 'mirror edge', 'a controlled reflection that doubles a gesture without turning the room into noise'],
  ['03', 'translucent curtain', 'soft depth, partial reveal, shadow readable from both sides'],
  ['04', 'backlit volume', 'a box that behaves like a window after dark'],
  ['05', 'metal rail', 'thin industrial line for hanging, measuring and making the route legible'],
  ['06', 'paper wall', 'warm matte surface for photographs, captions and projection bleed'],
  ['07', 'glass shelf', 'a levitating plane for fragile objects, bottles, books, garments or maquettes'],
  ['08', 'floor mark', 'the visitor route made physical: tape, stone inset, carpet edge or brass line'],
  ['09', 'object shadow', 'the cheapest luxury: one hard shadow placed exactly where the camera wants it'],
  ['10', 'arrival frame', 'an entrance image that gives the project its first memory'],
  ['11', 'caption block', 'editorial language printed as part of the room, not pasted after it'],
  ['12', 'night state', 'the second life of the installation when the street becomes the audience'],
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

  return (
    <section className="relative overflow-hidden border-b border-[#f5f0eb]/12 bg-[#14090d]">
      <div className="absolute inset-0 opacity-[0.11]" style={{ backgroundImage: 'linear-gradient(90deg,#f5f0eb 1px,transparent 1px),linear-gradient(#f5f0eb 1px,transparent 1px)', backgroundSize: '8.333vw 88px' }} />
      <div className="absolute inset-0 bg-[linear-gradient(108deg,#14090d_0%,#14090d_49%,#2d1217_72%,#4a1728_100%)]" />
      <div className="absolute bottom-0 right-[6%] top-0 w-[24%] skew-x-[-13deg] border-x border-[#d7b46a]/18 bg-[#d7b46a]/10" />
      <div className="absolute bottom-[8%] right-[12%] h-px w-[42%] bg-[#d7b46a]/50" />
      <div className="mx-auto grid min-h-[86dvh] max-w-[1700px] lg:grid-cols-[minmax(0,0.78fr)_minmax(480px,0.62fr)]">
        <div className="relative z-10 flex flex-col justify-between px-5 py-12 sm:px-8 lg:px-12 xl:px-16">
          <div>
            <p className="font-sans text-[10px] uppercase tracking-normal text-[#d7b46a]">EPRIS Bureau / spatial image studio</p>
            <h1 className="mt-5 max-w-[9ch] font-display text-[clamp(4.4rem,12vw,11rem)] lowercase leading-[0.74] tracking-normal text-[#f5f0eb]">
              set design for things that need a scene
            </h1>
          </div>
          <div className="mt-10 max-w-[43rem]">
            <p className="border-l border-[#d7b46a] pl-5 font-sans text-[17px] leading-relaxed text-[#f5f0eb]/78 sm:text-[20px]">
              We design visual situations for culture and brands: vitrines, sets, exhibition rooms, launch scenes and editorial environments where object, light and visitor route work as one image.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#bureau-services" className="inline-flex min-h-12 items-center gap-3 bg-[#f5f0eb] px-5 font-sans text-[10px] uppercase tracking-normal text-[#1a0b10] hover:bg-[#d7b46a]">
                What we make <ArrowRight size={15} />
              </a>
              <a href="/showcase" className="inline-flex min-h-12 items-center gap-3 border border-[#f5f0eb]/22 px-5 font-sans text-[10px] uppercase tracking-normal text-[#f5f0eb]/82 hover:border-[#d7b46a] hover:text-[#f5f0eb]">
                Source vitrine <ArrowUpRight size={15} />
              </a>
            </div>
          </div>
        </div>

        <div className="relative min-h-[640px] px-5 py-10 sm:px-8 lg:min-h-[86dvh] lg:px-12">
          <div className="absolute left-[12%] right-[6%] top-[10%] h-[76%] border border-[#f5f0eb]/14 bg-[#f5f0eb]/[0.035] shadow-[0_42px_120px_rgba(0,0,0,.38)] backdrop-blur-[1px]" />
          <div className="absolute left-[8%] top-[8%] h-[76%] w-[19%] border-l border-[#d7b46a]/45" />
          <div className="absolute left-[18%] top-[18%] h-[56%] w-[28%] bg-[#f5f0eb] p-3 shadow-[26px_38px_90px_rgba(0,0,0,.44)] sm:p-4">
            {workImage(hero) ? (
              <img src={workImage(hero)} alt={hero?.title || ''} loading="lazy" className="h-full w-full object-cover saturate-[.82]" />
            ) : (
              <>
                <div className="absolute inset-4 bg-[#c7b498]" />
                <div className="absolute bottom-4 left-4 right-4 h-[36%] bg-[#1a0b10]" />
              </>
            )}
          </div>
          <div className="absolute left-[42%] top-[27%] h-[44%] w-[34%] bg-[#4a1728] p-3 shadow-[34px_46px_110px_rgba(0,0,0,.5)] sm:p-4">
            {workImage(second) ? <img src={workImage(second)} alt={second?.title || ''} loading="lazy" className="h-full w-full object-cover opacity-[.78] mix-blend-luminosity" /> : null}
            <div className="absolute inset-5 border border-[#f5f0eb]/18" />
            <div className="absolute bottom-5 left-5 h-[42%] w-[44%] bg-[#d7b46a]/82 mix-blend-multiply" />
          </div>
          <div className="absolute right-[15%] top-[18%] h-[28%] w-[18%] border border-[#f5f0eb]/24 bg-[#f5f0eb]/10 p-2 shadow-[18px_24px_70px_rgba(0,0,0,.34)]">
            {workImage(third) ? <img src={workImage(third)} alt={third?.title || ''} loading="lazy" className="h-full w-full object-cover opacity-[.86]" /> : null}
          </div>
          <div className="absolute right-[9%] top-[14%] h-[68%] w-px rotate-[18deg] bg-[#d7b46a]" />
          <div className="absolute left-[50%] top-[7%] h-[74%] w-[18%] rotate-[18deg] bg-[#d7b46a]/24 shadow-[22px_0_70px_rgba(215,180,106,.22)]" />
          <div className="absolute bottom-[12%] left-[14%] right-[10%] z-10 grid gap-5 border-t border-[#f5f0eb]/18 pt-5 text-[#f5f0eb] sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <p className="font-sans text-[10px] uppercase tracking-normal text-[#d7b46a]">production language</p>
              <p className="mt-2 max-w-[22rem] font-display text-[clamp(2.2rem,5vw,4.6rem)] lowercase leading-[0.82]">light, shadow, surface, route</p>
            </div>
            <div className="grid grid-cols-3 border border-[#f5f0eb]/16 bg-[#14090d]/68">
              {['glass', 'metal', 'fabric'].map((item) => (
                <span key={item} className="border-r border-[#f5f0eb]/12 px-3 py-3 text-center font-sans text-[10px] uppercase tracking-normal text-[#f5f0eb]/66 last:border-r-0">{item}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BureauReferenceRoom({ works }: { works: Work[] }) {
  const refs = works.filter((work) => workImage(work)).slice(0, 9);

  return (
    <section className="relative overflow-hidden border-b border-[#f5f0eb]/12 bg-[#0f0709] text-[#f5f0eb]">
      <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'linear-gradient(90deg,#f5f0eb 1px,transparent 1px),linear-gradient(#f5f0eb 1px,transparent 1px)', backgroundSize: '12.5vw 96px' }} />
      <div className="mx-auto grid max-w-[1700px] lg:grid-cols-[minmax(0,0.56fr)_minmax(0,1fr)]">
        <div className="relative z-10 border-b border-[#f5f0eb]/12 px-5 py-12 sm:px-8 lg:border-b-0 lg:border-r lg:px-12 xl:px-16">
          <p className="font-sans text-[10px] uppercase tracking-normal text-[#d7b46a]">real references / object thinking</p>
          <h2 className="mt-5 max-w-[8ch] font-display text-[clamp(3.8rem,8vw,8rem)] lowercase leading-[0.78] tracking-normal">
            not a moodboard, a room test
          </h2>
          <p className="mt-7 max-w-[35rem] border-l border-[#d7b46a] pl-5 font-sans text-[17px] leading-relaxed text-[#f5f0eb]/72">
            Bureau starts with actual works and visible things: surfaces, shadows, shelves, curtains, podiums, frames, routes. The references below become decisions a fabricator, photographer and curator can all understand.
          </p>
          <a href="/showcase" className="mt-8 inline-flex min-h-12 items-center gap-3 bg-[#f5f0eb] px-5 font-sans text-[10px] uppercase tracking-normal text-[#1a0b10] transition-colors hover:bg-[#d7b46a]">
            Browse the source vitrine <ArrowUpRight size={15} />
          </a>
        </div>

        <div className="relative z-10 min-h-[720px] px-5 py-10 sm:px-8 lg:px-12">
          <div className="absolute bottom-10 left-5 right-5 h-[42%] bg-[#211014] shadow-[0_42px_120px_rgba(0,0,0,.42)] sm:left-8 sm:right-8 lg:left-12 lg:right-12" />
          <div className="relative grid min-h-[640px] grid-cols-6 grid-rows-[repeat(6,minmax(74px,1fr))] gap-3">
            {refs.map((work, index) => {
              const placements = [
                'col-span-3 row-span-3',
                'col-span-2 row-span-2 col-start-4',
                'col-span-2 row-span-3 col-start-1 row-start-4',
                'col-span-2 row-span-2 col-start-3 row-start-4',
                'col-span-2 row-span-4 col-start-5 row-start-3',
                'col-span-1 row-span-2 col-start-6 row-start-1',
                'col-span-2 row-span-1 col-start-3 row-start-6',
                'col-span-1 row-span-1 col-start-5 row-start-1',
                'col-span-1 row-span-1 col-start-6 row-start-6',
              ];
              return (
                <a key={work.id} href="/showcase" className={`group relative overflow-hidden border border-[#f5f0eb]/14 bg-[#261116] shadow-[18px_24px_70px_rgba(0,0,0,.28)] ${placements[index] || 'col-span-2 row-span-2'}`}>
                  <img src={workImage(work)} alt={work.title} loading="lazy" className="h-full w-full object-cover opacity-[.84] transition duration-300 group-hover:scale-[1.035] group-hover:opacity-100" />
                  <span className="absolute inset-x-0 bottom-0 bg-[#0f0709]/78 px-3 py-2 font-sans text-[9px] uppercase tracking-normal text-[#f5f0eb]/72">
                    {work.discipline || 'reference'} / {work.city || work.country || 'site'}
                  </span>
                </a>
              );
            })}
            <div className="absolute bottom-[17%] left-[13%] h-[15%] w-[28%] bg-[#d7b46a] shadow-[22px_28px_80px_rgba(215,180,106,.26)]" />
            <div className="absolute bottom-[12%] right-[15%] h-[32%] w-px rotate-[18deg] bg-[#d7b46a]" />
            <div className="absolute bottom-[8%] left-[8%] right-[8%] flex flex-wrap gap-2 border-t border-[#f5f0eb]/18 pt-4">
              {MATERIALS.map((item) => (
                <span key={item} className="border border-[#f5f0eb]/18 bg-[#0f0709]/68 px-3 py-2 font-sans text-[10px] uppercase tracking-normal text-[#f5f0eb]/66">{item}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BureauObjectLibrary() {
  return (
    <section className="border-b border-[#1a0b10]/12 bg-[#f5f0eb] text-[#1a0b10]">
      <div className="mx-auto max-w-[1700px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12 xl:px-16">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.6fr)_minmax(0,1fr)]">
          <div>
            <p className="font-sans text-[10px] uppercase tracking-normal text-[#4a1728]/56">object library</p>
            <h2 className="mt-5 max-w-[7ch] font-display text-[clamp(3.6rem,8vw,7.6rem)] lowercase leading-[0.78] tracking-normal">
              the useful beautiful things
            </h2>
          </div>
          <p className="max-w-[42rem] self-end border-l border-[#4a1728] pl-5 font-sans text-[17px] leading-relaxed text-[#4a1728]/72">
            The page needed more real design matter, so the Bureau now names the objects it actually works with: plinths, rails, glass, captions, fabric, floor marks, night light and shadows.
          </p>
        </div>

        <div className="mt-12 grid border-l border-t border-[#1a0b10]/12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {OBJECT_LIBRARY.map(([num, title, text]) => (
            <article key={title} className="group min-h-[240px] border-b border-r border-[#1a0b10]/12 bg-[#f5f0eb] p-5 transition-colors hover:bg-[#eee6da] sm:p-6">
              <div className="flex items-start justify-between gap-5">
                <span className="font-display text-[2.6rem] leading-none text-[#b8956e]">{num}</span>
                <span className="h-14 w-14 border border-[#1a0b10]/14 bg-[#1a0b10]/5 shadow-[12px_16px_36px_rgba(26,11,16,.08)] transition-transform group-hover:-translate-y-1" />
              </div>
              <h3 className="mt-10 font-display text-[2.2rem] lowercase leading-[0.88] tracking-normal text-[#1a0b10]">{title}</h3>
              <p className="mt-4 max-w-[23rem] font-sans text-[14px] leading-relaxed text-[#4a1728]/70">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function BureauServices() {
  return (
    <section id="bureau-services" className="border-b border-[#f5f0eb]/12 bg-[#f0e7d9] text-[#1a0b10]">
      <div className="mx-auto grid max-w-[1700px] lg:grid-cols-[minmax(0,0.74fr)_minmax(0,1fr)]">
        <div className="px-5 py-12 sm:px-8 lg:px-12 xl:px-16">
          <p className="font-sans text-[10px] uppercase tracking-normal text-[#4a1728]/58">Bureau output</p>
          <h2 className="mt-5 max-w-[8ch] font-display text-[clamp(3.6rem,8vw,7.4rem)] lowercase leading-[0.78] tracking-normal">
            designed to be built
          </h2>
          <p className="mt-7 max-w-[34rem] text-[17px] leading-relaxed text-[#4a1728]/72">
            Not moodboards for decoration. A visual system that can become a window, room, route, launch set or exhibition script.
          </p>
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
  return (
    <>
      <BureauProductionIntro works={works} />
      <BureauReferenceRoom works={works} />
      <BureauServices />
      <BureauObjectLibrary />
      <div className="mx-auto max-w-[1600px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <p className="font-sans text-[10px] uppercase tracking-normal text-[#d7b46a]">case studies</p>
        <h2 className="mt-4 max-w-[9ch] font-display text-[clamp(3.4rem,8vw,7rem)] lowercase leading-[0.78] tracking-normal text-[#f5f0eb]">
          breakdowns
        </h2>
        <p className="mt-6 max-w-[54ch] font-sans text-[15px] leading-relaxed text-[#f5f0eb]/70 sm:text-[17px]">
          how the work in the vitrine is actually put together: the move, what holds it up, where it breaks
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
                    <span className="mt-2 block font-display text-[clamp(2.2rem,4.8vw,4.8rem)] lowercase leading-[0.84] tracking-normal text-[#f5f0eb] underline-offset-[6px] group-hover:underline">
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
    const load = slug
      ? Promise.all([fetchCase(slug, controller.signal).then(setItem), fetchWorks(controller.signal).then(setWorks)])
      : Promise.all([fetchCases(controller.signal).then(setItems), fetchWorks(controller.signal).then(setWorks)]);
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
