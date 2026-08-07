import { ArrowRight, Box, Check, Copy, FileDown, Layers3, Loader2, Route, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { encodeScene } from '../stage/sceneUrl';
import { newId, type Scene } from '../stage/sceneModel';
import type { Work } from './showcaseApi';

type AtlasMode = {
  id: string;
  label: string;
  thesis: string;
  accent: string;
  soft: string;
  floor: string;
  criteria: string[];
};

const MODES: AtlasMode[] = [
  {
    id: 'black-box',
    label: 'Black box',
    thesis: 'Works become a theatre of distance, light and withheld detail.',
    accent: '#f0c36a',
    soft: '#4a1728',
    floor: '#13070b',
    criteria: ['scenography', 'set', 'installation', 'light'],
  },
  {
    id: 'domestic-ritual',
    label: 'Domestic ritual',
    thesis: 'Interior scale turns into ceremony: objects, props and rooms behave like actors.',
    accent: '#c58d7f',
    soft: '#7f4d3c',
    floor: '#2a1410',
    criteria: ['interior', 'prop', 'spatial', 'performance'],
  },
  {
    id: 'urban-myth',
    label: 'Urban myth',
    thesis: 'City, venue and temporary architecture are read as a single public fiction.',
    accent: '#89aeb3',
    soft: '#28454a',
    floor: '#0f1d21',
    criteria: ['architecture', 'city', 'public', 'conceptual'],
  },
];

const PROJECT_TYPES = [
  {
    id: 'museum',
    label: 'Museum room',
    promise: 'slow arrival, precise wall text, fewer works with more air',
    density: 0.72,
  },
  {
    id: 'fashion',
    label: 'Fashion set',
    promise: 'frontality, dramatic surfaces, immediate camera positions',
    density: 0.9,
  },
  {
    id: 'window',
    label: 'Window display',
    promise: 'one sharp image from the street, quick reading, high contrast',
    density: 1.15,
  },
  {
    id: 'city',
    label: 'City route',
    promise: 'public narrative, site logic, works connected as urban episodes',
    density: 0.82,
  },
];

const ATLAS_LABEL = 'font-sans text-[10px] uppercase tracking-normal text-[#f8f3ea]/52';
const ATLAS_BUTTON = 'inline-flex min-h-12 items-center justify-center gap-2 border border-[#f8f3ea]/22 px-4 font-sans text-[10px] uppercase tracking-normal text-[#f8f3ea]/82 transition-colors hover:border-[#d7b46a] hover:text-[#f8f3ea] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d7b46a]';

type AtlasNode = {
  work: Work;
  x: number;
  z: number;
  height: number;
  width: number;
  depth: number;
  color: string;
  rank: number;
};

type ProjectType = typeof PROJECT_TYPES[number];

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

function scoreWork(work: Work, mode: AtlasMode) {
  const haystack = [
    work.title,
    work.discipline,
    work.medium,
    work.statement,
    work.city,
    work.country,
    ...(work.tags || []),
  ].join(' ').toLocaleLowerCase();
  return mode.criteria.reduce((score, word) => score + (haystack.includes(word) ? 1 : 0), 0)
    + Math.min((work.images || []).length, 3) * 0.28
    + (work.year && work.year >= new Date().getFullYear() - 2 ? 0.35 : 0);
}

function atlasNodes(works: Work[], mode: AtlasMode): AtlasNode[] {
  const source = works.length ? works : [];
  return [...source]
    .sort((a, b) => scoreWork(b, mode) - scoreWork(a, mode))
    .slice(0, 18)
    .map((work, index) => {
      const lane = index % 6;
      const row = Math.floor(index / 6);
      const swing = row % 2 ? 0.45 : -0.25;
      const images = Math.min((work.images || []).length, 4);
      const statement = Math.min((work.statement || '').length / 260, 1);
      const color = [mode.accent, '#f5f0eb', '#b8956e', mode.soft, '#8aa6a9', '#d8b7a7'][index % 6];
      return {
        work,
        x: (lane - 2.5) * 1.85 + swing,
        z: row * -2.25,
        height: 0.9 + images * 0.28 + statement * 0.7,
        width: index % 5 === 0 ? 1.35 : 0.9,
        depth: index % 4 === 0 ? 0.45 : 0.72,
        color,
        rank: scoreWork(work, mode),
      };
    });
}

function curatedRoute(nodes: AtlasNode[], project: ProjectType): AtlasNode[] {
  const ordered = [...nodes].sort((a, b) => {
    if (project.id === 'window') return b.height - a.height || b.rank - a.rank;
    if (project.id === 'city') return String(a.work.country || '').localeCompare(String(b.work.country || '')) || b.rank - a.rank;
    if (project.id === 'fashion') return (b.work.images || []).length - (a.work.images || []).length || b.rank - a.rank;
    return b.rank - a.rank;
  });
  return ordered.slice(0, 5);
}

function buildStageScene(nodes: AtlasNode[], mode: AtlasMode, project: ProjectType): Scene {
  const density = project.density;
  return {
    room: { w: 16, d: 11, h: 6 },
    viewer: { x: 8, z: 10, eyeHeight: 1.6 },
    objects: [
      { id: newId('obj'), kind: 'wall', label: `${mode.label} back wall`, x: 1.2, z: 1.1, y: 0, w: 13.6, d: 0.18, h: 3.4, rotation: 0 },
      { id: newId('obj'), kind: 'platform', label: `${project.label} runway`, x: 2.2, z: 4.3, y: 0, w: 11.6, d: 1.1 * density, h: 0.18, rotation: 0 },
      ...nodes.slice(0, 10).map((node, index) => ({
        id: newId('obj'),
        kind: index % 3 === 0 ? 'platform' as const : 'block' as const,
        label: node.work.title.slice(0, 38) || `Work ${index + 1}`,
        x: 2 + (index % 5) * (2.55 / density),
        z: 2.2 + Math.floor(index / 5) * (2.4 / Math.min(density, 1)),
        y: index % 3 === 0 ? 0 : 0.18,
        w: node.width + 0.55,
        d: node.depth + 0.45,
        h: node.height,
        rotation: index % 2 ? 8 : -6,
      })),
    ],
    lights: [
      { id: newId('light'), kind: 'key', label: `${mode.label} key`, x: 4, z: 1.6, y: 5.2, angle: 210 },
      { id: newId('light'), kind: 'fill', label: 'Editorial fill', x: 12.5, z: 3.2, y: 4.4, angle: 145 },
    ],
  };
}

function dossierText(mode: AtlasMode, project: ProjectType, route: AtlasNode[]) {
  const works = route.map((node, index) => `${index + 1}. ${node.work.title} - ${node.work.author}`).join('\n');
  return [
    `EPRIS Showcase Dossier`,
    `${mode.label} / ${project.label}`,
    '',
    mode.thesis,
    `Spatial promise: ${project.promise}.`,
    '',
    'Route',
    works,
    '',
    'Commission note',
    `Build this as a ${project.label.toLowerCase()} with ${route.length} anchor works, one controlled light logic, and a visitor path that starts from ${route[0]?.work.title || 'the strongest work'}.`,
  ].join('\n');
}

async function exportDossier(mode: AtlasMode, project: ProjectType, route: AtlasNode[], stageHref: string) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const ink = '#1a0b10';
  const muted = '#7a5a62';
  doc.setFillColor(mode.floor);
  doc.rect(0, 0, 210, 297, 'F');
  doc.setTextColor('#f5f0eb');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(34);
  doc.text('epris', 18, 28);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(24);
  doc.text('showcase dossier', 18, 41);
  doc.setDrawColor(mode.accent);
  doc.line(18, 52, 192, 52);
  doc.setFontSize(10);
  doc.setTextColor('#d8c8b8');
  doc.text(`${mode.label.toUpperCase()} / ${project.label.toUpperCase()}`, 18, 62);
  doc.setFontSize(13);
  doc.setTextColor('#f5f0eb');
  doc.text(doc.splitTextToSize(`${mode.thesis} Spatial promise: ${project.promise}.`, 174), 18, 76);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Curatorial route', 18, 108);
  doc.setFont('helvetica', 'normal');
  let y = 120;
  route.forEach((node, index) => {
    doc.setTextColor(mode.accent);
    doc.setFontSize(9);
    doc.text(String(index + 1).padStart(2, '0'), 18, y);
    doc.setTextColor('#f5f0eb');
    doc.setFontSize(12);
    doc.text(doc.splitTextToSize(`${node.work.title} - ${node.work.author}`, 145), 30, y);
    doc.setTextColor('#bdaea4');
    doc.setFontSize(9);
    doc.text([node.work.discipline, node.work.city, node.work.country].filter(Boolean).join(' / '), 30, y + 6);
    y += 18;
  });
  doc.setFillColor('#f5f0eb');
  doc.rect(18, 228, 174, 38, 'F');
  doc.setTextColor(ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Editable stage link', 28, 242);
  doc.setTextColor(muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(doc.splitTextToSize(stageHref, 154), 28, 252);
  doc.setTextColor('#f5f0eb');
  doc.setFontSize(8);
  doc.text('Generated from the live EPRIS Showcase Atlas.', 18, 283);
  const filename = `epris-showcase-${mode.id}-${project.id}.pdf`;
  try {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    doc.save(filename);
  }
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', 'true');
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    area.style.top = '0';
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } finally {
      document.body.removeChild(area);
    }
    return ok;
  }
}

function workImage(work?: Work) {
  return work?.images?.[0]?.url || '';
}

function workMeta(work?: Work) {
  if (!work) return '';
  return [work.author, work.city, work.country].filter(Boolean).join(' / ');
}

function RouteImageWall({ route, active, onPick }: { route: AtlasNode[]; active?: Work; onPick: (work: Work) => void }) {
  const hero = active || route[0]?.work;
  const heroImage = workImage(hero);
  const supporting = route.filter((node) => node.work.id !== hero?.id).slice(0, 4);

  return (
    <div className="relative min-h-[640px] overflow-hidden border-y border-[#f8f3ea]/14 lg:min-h-[calc(100dvh-7rem)] lg:border-y-0 lg:border-l lg:border-[#f8f3ea]/14">
      <div className="absolute inset-0 bg-[#12090b]" />
      {heroImage ? (
        <img
          src={heroImage}
          alt={hero?.title || 'Selected showcase work'}
          loading="lazy"
          className="absolute inset-y-0 right-0 h-full w-[78%] object-cover opacity-[.82] grayscale-[18%] contrast-[1.04] saturate-[.82] sm:w-[68%]"
        />
      ) : (
        <div className="absolute inset-y-0 right-0 grid h-full w-[68%] place-items-center bg-[#221015] text-[#f8f3ea]/28">
          <Box size={38} />
        </div>
      )}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,#12090b_0%,rgba(18,9,11,.9)_22%,rgba(18,9,11,.38)_56%,rgba(18,9,11,.12)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(0deg,#12090b_0%,rgba(18,9,11,.68)_38%,transparent_100%)]" />
      {/* Сетка с фиксированным шагом, а не flex-wrap со сдвигом через одну:
          при переносе строки сдвиг наезжал на следующий ряд, и номер плитки
          оказывался под соседней картинкой. */}
      <div className="absolute left-5 top-5 grid max-w-[calc(100%-2.5rem)] grid-cols-2 gap-2 sm:left-8 sm:top-8 sm:grid-cols-4">
        {supporting.map((node, index) => {
          const src = workImage(node.work);
          return (
            <button
              key={node.work.id}
              type="button"
              onClick={() => onPick(node.work)}
              className="group relative h-28 w-20 overflow-hidden border border-[#f8f3ea]/22 bg-[#261116] text-left transition-transform hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d7b46a] sm:h-36 sm:w-28"
            >
              {src ? <img src={src} alt="" loading="lazy" className="h-full w-full object-cover opacity-[.78] transition-opacity group-hover:opacity-100" /> : <Box size={20} className="m-4 text-[#f8f3ea]/35" />}
              <span className="absolute bottom-2 left-2 bg-[#12090b]/78 px-2 py-1 font-display text-lg leading-none text-[#d7b46a]">
                {String(index + 2).padStart(2, '0')}
              </span>
            </button>
          );
        })}
      </div>
      <div className="absolute bottom-6 left-5 right-5 sm:bottom-8 sm:left-8 sm:right-8">
        <p className={ATLAS_LABEL}>Selected reference anchor</p>
        <button
          type="button"
          onClick={() => hero && onPick(hero)}
          className="group mt-4 block max-w-[44rem] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d7b46a]"
        >
          <h3 className="font-display text-[clamp(3rem,7vw,7.8rem)] lowercase leading-[0.78] tracking-normal text-[#f8f3ea] decoration-[#d7b46a] underline-offset-[10px] group-hover:underline">
            {hero?.title || 'the vitrine is being assembled'}
          </h3>
          {hero && (
            <p className="mt-5 max-w-[34rem] font-sans text-[13px] uppercase tracking-normal text-[#d7b46a]">
              {workMeta(hero)}
            </p>
          )}
        </button>
      </div>
    </div>
  );
}

function BureauSetDesignSection({ route, stageHref, onCommission, onPick }: { route: AtlasNode[]; stageHref: string; onCommission: () => void; onPick: (work: Work) => void }) {
  const hero = route[1]?.work || route[0]?.work;
  const second = route[2]?.work || route[0]?.work;
  const third = route[3]?.work || route[1]?.work || route[0]?.work;
  const services = [
    ['01', 'set design', 'temporary rooms, stages, backdrops and product scenes'],
    ['02', 'window vitrine', 'one exact street-facing image with light, depth and threshold'],
    ['03', 'exhibition script', 'route, wall rhythm, object hierarchy and visitor pace'],
    ['04', 'visual system', 'materials, palette, signage, photo angles and launch assets'],
  ];

  return (
    <section className="relative overflow-hidden bg-[#eee6da] text-[#1a0b10]">
      <div className="mx-auto grid max-w-[1900px] border-t border-[#1a0b10]/12 lg:grid-cols-[minmax(0,0.96fr)_minmax(420px,0.54fr)]">
        <div className="relative min-h-[760px] px-5 py-10 sm:px-8 lg:min-h-[860px] lg:px-12 xl:px-16">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(26,11,16,.08)_1px,transparent_1px),linear-gradient(rgba(26,11,16,.06)_1px,transparent_1px)] bg-[size:8.333%_88px]" />
          <div className="absolute left-[8%] top-24 h-[560px] w-[58%] bg-[#d7b46a]/20 blur-3xl" aria-hidden="true" />
          <div className="relative z-10">
            <p className="font-sans text-[10px] uppercase tracking-normal text-[#4a1728]/56">EPRIS Bureau / production design</p>
            <h2 className="mt-5 max-w-[8ch] font-display text-[clamp(4rem,10vw,9.5rem)] lowercase leading-[0.78] tracking-normal text-[#1a0b10]">
              we build the set
            </h2>
            <p className="mt-7 max-w-[39rem] border-l border-[#4a1728] pl-5 font-sans text-[17px] leading-relaxed text-[#4a1728]/72 sm:text-[19px]">
              Bureau turns a cultural idea into a physical-looking scene: vitrines, pop-up rooms, editorial sets, launch displays and exhibition routes with light, shadow, material and camera logic.
            </p>
          </div>

          <div className="relative z-10 mt-12 h-[520px] sm:h-[620px]">
            <div className="absolute bottom-0 left-[2%] h-[52%] w-[84%] origin-bottom -skew-x-6 bg-[#211014] shadow-[42px_54px_90px_rgba(26,11,16,.32)]" />
            <div className="absolute bottom-[13%] left-[10%] h-[62%] w-[29%] bg-[#f8f3ea] p-3 shadow-[18px_30px_70px_rgba(26,11,16,.32)] sm:p-4">
              {workImage(hero) ? (
                <button type="button" onClick={() => hero && onPick(hero)} className="group h-full w-full overflow-hidden bg-[#241016] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4a1728]">
                  <img src={workImage(hero)} alt={hero?.title || ''} loading="lazy" className="h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-[1.035]" />
                </button>
              ) : <div className="grid h-full place-items-center bg-[#241016] text-[#f8f3ea]/35"><Box size={28} /></div>}
            </div>
            <div className="absolute bottom-[24%] left-[39%] h-[49%] w-[36%] bg-[#4a1728] p-3 shadow-[26px_36px_80px_rgba(26,11,16,.35)] sm:p-4">
              {workImage(second) ? <img src={workImage(second)} alt={second?.title || ''} loading="lazy" className="h-full w-full object-cover mix-blend-luminosity opacity-[.86]" /> : null}
              <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(248,243,234,.34)_42%,transparent_58%)]" />
            </div>
            <div className="absolute bottom-[7%] right-[4%] h-[38%] w-[24%] bg-[#c8cfd0] p-2 shadow-[16px_24px_62px_rgba(26,11,16,.25)] sm:p-3">
              {workImage(third) ? <img src={workImage(third)} alt={third?.title || ''} loading="lazy" className="h-full w-full object-cover opacity-[.88] saturate-[.75]" /> : null}
            </div>
            <div className="absolute left-[6%] top-[6%] h-px w-[82%] bg-[#1a0b10]/20" />
            <div className="absolute left-[6%] top-[6%] h-[72%] w-px bg-[#1a0b10]/20" />
            <div className="absolute right-[18%] top-[2%] h-[44%] w-px rotate-[24deg] bg-[#d7b46a]" />
            <div className="absolute left-[46%] top-[14%] h-[70%] w-[18%] rotate-[19deg] bg-[#d7b46a]/28 shadow-[0_0_60px_rgba(215,180,106,.42)]" />
            <div className="absolute bottom-[4%] left-[10%] right-[7%] flex items-end justify-between gap-6 text-[#f8f3ea]">
              <div>
                <p className="font-sans text-[10px] uppercase tracking-normal text-[#f8f3ea]/58">light study</p>
                <p className="mt-2 max-w-[18rem] font-display text-[2.5rem] lowercase leading-[0.85]">shadow, threshold, object, route</p>
              </div>
              <a href="/bureau" className="hidden min-h-12 items-center gap-2 border border-[#f8f3ea]/30 px-4 font-sans text-[10px] uppercase tracking-normal hover:bg-[#f8f3ea] hover:text-[#1a0b10] sm:inline-flex">
                Bureau <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </div>

        <aside className="border-t border-[#1a0b10]/12 px-5 py-9 sm:px-8 lg:border-l lg:border-t-0 lg:px-10 xl:px-12">
          <p className="font-sans text-[10px] uppercase tracking-normal text-[#4a1728]/56">what we design</p>
          <div className="mt-7 divide-y divide-[#1a0b10]/12 border-y border-[#1a0b10]/12">
            {services.map(([num, title, text]) => (
              <div key={title} className="group grid grid-cols-[3.2rem_1fr] gap-5 py-5 transition-colors hover:bg-[#1a0b10]/[0.025]">
                <span className="font-display text-[2.15rem] leading-none text-[#b8956e]">{num}</span>
                <span>
                  <span className="block font-display text-[2rem] lowercase leading-[0.9] text-[#1a0b10] decoration-[#b8956e] underline-offset-4 group-hover:underline">{title}</span>
                  <span className="mt-2 block font-sans text-[15px] leading-relaxed text-[#4a1728]/68">{text}</span>
                </span>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-[#1a0b10] p-5 text-[#f8f3ea] shadow-[0_28px_80px_rgba(26,11,16,.28)] sm:p-6">
            <p className="font-sans text-[10px] uppercase tracking-normal text-[#d7b46a]">from vitrine to buildable scene</p>
            <p className="mt-4 font-sans text-[15px] leading-relaxed text-[#f8f3ea]/72">
              We take references from the showcase, define the visual grammar, then deliver a set direction: plan, material mood, lighting logic, photo positions and a clear production brief.
            </p>
            <div className="mt-6 grid gap-3">
              <button type="button" onClick={onCommission} className="inline-flex min-h-12 items-center justify-center gap-3 bg-[#f8f3ea] px-5 font-sans text-[10px] uppercase tracking-normal text-[#1a0b10] transition-colors hover:bg-[#d7b46a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d7b46a]">
                Start a Bureau brief
                <ArrowRight size={15} />
              </button>
              <a href={stageHref} className="inline-flex min-h-12 items-center justify-center gap-2 border border-[#f8f3ea]/20 px-4 font-sans text-[10px] uppercase tracking-normal text-[#f8f3ea]/82 hover:border-[#d7b46a] hover:text-[#f8f3ea]">
                Open as production board
              </a>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

export function ShowcaseAtlas({ works, loading, onOpenWork, onCommission }: { works: Work[]; loading: boolean; onOpenWork: (work: Work) => void; onCommission: () => void }) {
  const [modeId, setModeId] = useState(MODES[0].id);
  const [projectId, setProjectId] = useState(PROJECT_TYPES[0].id);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [exporting, setExporting] = useState(false);
  const reduceMotion = usePrefersReducedMotion();
  const mode = MODES.find((item) => item.id === modeId) || MODES[0];
  const project = PROJECT_TYPES.find((item) => item.id === projectId) || PROJECT_TYPES[0];
  const nodes = useMemo(() => atlasNodes(works, mode), [works, mode]);
  const [activeId, setActiveId] = useState<string | undefined>();
  const active = nodes.find((node) => node.work.id === activeId)?.work || nodes[0]?.work;
  const route = useMemo(() => curatedRoute(nodes, project), [nodes, project]);
  const stageHref = useMemo(() => {
    if (!nodes.length) return '/stage';
    return `/stage#s=${encodeScene(buildStageScene(nodes, mode, project))}`;
  }, [nodes, mode, project]);
  const absoluteStageHref = typeof window === 'undefined' ? stageHref : `${window.location.origin}${stageHref}`;
  // Считаем только то, что действительно знаем о работах. Прежний "production
  // score" складывался из высоты узла в раскладке и положения ползунка density,
  // упирался в потолок min(99, ...) и потому во всех режимах показывал 99 —
  // выдуманная величина с видом измерения. Витрина не реконструирует того,
  // чего не знает: бюджетов и сроков этих постановок у нас нет.
  const disciplines = useMemo(
    () => new Set(route.map((node) => node.work.discipline).filter(Boolean)).size,
    [route],
  );

  async function handleCopyDossier() {
    await copyText(dossierText(mode, project, route));
    setCopyState('copied');
    window.setTimeout(() => setCopyState('idle'), 1800);
  }

  async function handleExportDossier() {
    setExporting(true);
    try {
      await exportDossier(mode, project, route, absoluteStageHref);
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="relative isolate overflow-hidden bg-[#12090b] text-[#f8f3ea]">
      <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(90deg, #f8f3ea 1px, transparent 1px)', backgroundSize: '9.2vw 100%' }} />
      <div className="relative mx-auto max-w-[1900px]">
        <div className="grid lg:grid-cols-[minmax(340px,0.78fr)_minmax(0,1.22fr)]">
          <div className="relative z-10 flex min-h-[540px] flex-col justify-between px-5 py-6 sm:px-8 sm:py-8 lg:min-h-[calc(100dvh-5rem)] lg:px-10 xl:px-14">
            <div>
              <div className="flex items-center justify-between gap-4">
                <p className={ATLAS_LABEL}>{loading ? 'Reading API' : `${nodes.length} staged works`}</p>
                <span className="inline-flex min-h-11 items-center gap-2 border border-[#f8f3ea]/16 px-3 font-sans text-[10px] uppercase tracking-normal text-[#d7b46a]">
                  <Sparkles size={15} /> reference studio
                </span>
              </div>

              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.42, ease: 'easeOut' }}
                className="mt-14"
              >
                <p className="font-sans text-[11px] uppercase tracking-normal text-[#d7b46a]">{mode.label} / {project.label}</p>
                <h2 className="mt-5 max-w-[8.8ch] font-display text-[clamp(4.2rem,11.2vw,10rem)] lowercase leading-[0.76] tracking-normal text-[#f8f3ea]">
                  references become rooms
                </h2>
                <p className="mt-8 max-w-[31rem] border-l border-[#d7b46a] pl-5 font-sans text-[17px] leading-relaxed text-[#f8f3ea]/76">
                  {mode.thesis} Use the vitrine as a source library, then move the strongest visual logic into a Bureau brief.
                </p>
                <a href="/bureau" className="mt-7 inline-flex min-h-12 items-center gap-3 border border-[#f8f3ea]/24 px-5 font-sans text-[10px] uppercase tracking-normal text-[#f8f3ea]/86 transition-colors hover:border-[#d7b46a] hover:bg-[#f8f3ea] hover:text-[#12090b]">
                  Take references to Bureau <ArrowRight size={15} />
                </a>
              </motion.div>
            </div>

            <div className="mt-12">
              <div className="grid grid-cols-3 border-y border-[#f8f3ea]/14">
                {[
                  [nodes.length === 1 ? 'work' : 'works', nodes.length],
                  ['in route', route.length],
                  [disciplines === 1 ? 'discipline' : 'disciplines', disciplines],
                ].map(([label, value]) => (
                  <div key={label} className="border-r border-[#f8f3ea]/12 py-4 pr-4 last:border-r-0">
                    <p className="font-display text-[2.5rem] leading-none text-[#d7b46a]">{value}</p>
                    <p className="mt-1 font-sans text-[10px] uppercase tracking-normal text-[#f8f3ea]/48">{label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {MODES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setModeId(item.id)}
                    className={`min-h-11 border px-4 font-sans text-[10px] uppercase tracking-normal transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d7b46a] ${item.id === mode.id ? 'border-[#f8f3ea] bg-[#f8f3ea] text-[#12090b]' : 'border-[#f8f3ea]/18 text-[#f8f3ea]/68 hover:border-[#d7b46a] hover:text-[#f8f3ea]'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <RouteImageWall route={route} active={active} onPick={(work) => { setActiveId(work.id); onOpenWork(work); }} />
        </div>

        <div className="grid border-t border-[#f8f3ea]/14 lg:grid-cols-[minmax(0,1fr)_minmax(400px,0.42fr)]">
          <div className="px-5 py-7 sm:px-8 lg:px-10">
            <div className="flex items-center gap-2">
              <Layers3 size={16} className="text-[#d7b46a]" />
              <p className={ATLAS_LABEL}>Reference lens</p>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {PROJECT_TYPES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setProjectId(item.id)}
                  className={`flex min-h-14 items-center border px-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d7b46a] ${item.id === project.id ? 'border-[#f8f3ea] bg-[#f8f3ea] text-[#12090b]' : 'border-[#f8f3ea]/14 text-[#f8f3ea]/72 hover:border-[#d7b46a]'}`}
                >
                  {/* Раньше здесь стояло Math.round(density*100) — 72, 90, 115, 82.
                      density задаёт шаг расстановки объектов в собираемой сцене;
                      крупной антиквой рядом с названием он читался как оценка. */}
                  <span className="font-sans text-[12px] uppercase tracking-normal">{item.label}</span>
                </button>
              ))}
            </div>
            <p className="mt-5 max-w-[42rem] text-[15px] leading-relaxed text-[#f8f3ea]/62">{project.promise}. The point is not imitation: it is extracting scale, light, rhythm and material logic for a new brief.</p>
          </div>

          <aside className="border-t border-[#f8f3ea]/14 px-5 py-7 sm:px-8 lg:border-l lg:border-t-0 lg:px-10">
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2">
                <Route size={16} className="text-[#d7b46a]" />
                <p className={ATLAS_LABEL}>Curatorial route</p>
              </span>
              <p className="font-sans text-[10px] uppercase tracking-normal text-[#d7b46a]">{route.length} anchors</p>
            </div>

            <ol className="mt-5 divide-y divide-[#f8f3ea]/12 border-y border-[#f8f3ea]/12">
              {route.map((node, index) => (
                <li key={node.work.id}>
                  <button type="button" onClick={() => { setActiveId(node.work.id); onOpenWork(node.work); }} className="group grid min-h-16 w-full grid-cols-[3rem_1fr] gap-4 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d7b46a]">
                    <span className="font-display text-[2rem] leading-none tabular-nums text-[#d7b46a]">{String(index + 1).padStart(2, '0')}</span>
                    <span>
                      <span className="block font-sans text-[15px] leading-tight text-[#f8f3ea] underline-offset-4 group-hover:underline">{node.work.title}</span>
                      <span className="mt-1.5 block font-sans text-[10px] uppercase tracking-normal text-[#f8f3ea]/44">{[node.work.author, node.work.discipline].filter(Boolean).join(' / ')}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button type="button" onClick={handleCopyDossier} className={ATLAS_BUTTON}>
                {copyState === 'copied' ? <Check size={14} /> : <Copy size={14} />}
                {copyState === 'copied' ? 'Copied' : 'Copy brief'}
              </button>
              <button type="button" onClick={handleExportDossier} disabled={exporting || !route.length} className={`${ATLAS_BUTTON} disabled:opacity-40`}>
                {exporting ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                Dossier PDF
              </button>
            </div>
          </aside>
        </div>
      </div>
      <BureauSetDesignSection route={route} stageHref={stageHref} onCommission={onCommission} onPick={(work) => { setActiveId(work.id); onOpenWork(work); }} />
    </section>
  );
}
