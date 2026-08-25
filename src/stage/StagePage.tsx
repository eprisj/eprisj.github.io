import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, BookmarkCheck, BookmarkPlus, ChevronRight, Copy, FileDown, ImageOff, Loader2, X } from 'lucide-react';
import { fetchCases, type BureauCase } from '../showcase/bureauApi';
import { fetchWorks, type Work } from '../showcase/showcaseApi';

type Lens = 'All' | 'Scenography' | 'Installation' | 'Spatial design';

const LENSES: Lens[] = ['All', 'Scenography', 'Installation', 'Spatial design'];
const DESK_KEY = 'epris-stage-reference-desk';

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#f5f0eb]/12 bg-[#1a0b10]/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-20 max-w-[1680px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
        <a href="/bureau" className="inline-flex min-h-11 items-center gap-2 font-sans text-[9px] uppercase tracking-[0.18em] text-[#f5f0eb]/60 transition-colors hover:text-[#f5f0eb]">
          <ArrowLeft size={14} /> Bureau
        </a>
        <a href="/stage" className="font-display text-[21px] lowercase leading-none text-[#f5f0eb] sm:text-[25px]">epris stage</a>
        <a href="/" className="inline-flex min-h-11 items-center gap-2 font-sans text-[9px] uppercase tracking-[0.18em] text-[#f5f0eb]/60 transition-colors hover:text-[#f5f0eb]">
          EPRIS Journal <ArrowUpRight size={13} />
        </a>
      </div>
    </header>
  );
}

function imageOf(work?: Work): string {
  return work?.images?.find((image) => image.url)?.url || '';
}

function workMeta(work: Work): string {
  return [work.author, work.year, work.city, work.country].filter(Boolean).join(' · ');
}

function loadDesk(): string[] {
  try {
    const stored = window.localStorage.getItem(DESK_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function briefFor(works: Work[]): string {
  return [
    'EPRIS STAGE / REFERENCE DESK',
    '',
    ...works.map((work, index) => [
      `${String(index + 1).padStart(2, '0')}  ${work.title}`,
      workMeta(work),
      work.medium ? `Material: ${work.medium}` : '',
      work.sourceUrl ? `Source: ${work.sourceUrl}` : '',
    ].filter(Boolean).join('\n')),
  ].join('\n\n');
}

function WorkImage({ work, className = '' }: { work: Work; className?: string }) {
  const image = imageOf(work);
  if (!image) {
    return <div className={`grid place-items-center bg-[#2b1319] text-[#f5f0eb]/35 ${className}`}><ImageOff size={24} /></div>;
  }
  return <img src={image} alt={work.images[0]?.caption || `${work.title} by ${work.author}`} className={`h-full w-full object-cover ${className}`} loading="lazy" decoding="async" />;
}

function CaseReading({ item }: { item: BureauCase }) {
  return (
    <section className="border-t border-[#f5f0eb]/16 pt-7 sm:pt-9">
      <div className="grid gap-7 lg:grid-cols-[minmax(0,0.78fr)_minmax(20rem,0.52fr)] lg:gap-12">
        <div>
          <p className="font-sans text-[9px] uppercase tracking-[0.2em] text-[#d7b46a]">{item.kind || 'Editorial note'}</p>
          <h2 className="mt-4 max-w-[13ch] font-display text-[clamp(2.5rem,5.5vw,5.8rem)] lowercase leading-[0.84] text-[#f5f0eb]">{item.title}</h2>
        </div>
        <div className="lg:pt-1">
          {item.summary && <p className="font-sans text-[16px] leading-[1.65] text-[#f5f0eb]/76 sm:text-[18px]">{item.summary}</p>}
          <a href={`/bureau/${item.slug}`} className="mt-7 inline-flex min-h-11 items-center gap-2 border-b border-[#d7b46a] pb-1 font-sans text-[10px] uppercase tracking-[0.16em] text-[#f5f0eb] transition-colors hover:border-[#f5f0eb]">
            Read in Bureau <ArrowUpRight size={14} />
          </a>
        </div>
      </div>
      <dl className="mt-10 divide-y divide-[#f5f0eb]/12 border-y border-[#f5f0eb]/12">
        {item.layers.slice(0, 3).map((layer, index) => (
          <div key={layer.label} className="grid grid-cols-[2rem_1fr] gap-x-4 py-5 sm:grid-cols-[3rem_10rem_minmax(0,1fr)] sm:gap-x-6">
            <span className="font-sans text-[9px] tabular-nums tracking-[0.16em] text-[#f5f0eb]/35">{String(index + 1).padStart(2, '0')}</span>
            <dt className="font-sans text-[9px] uppercase tracking-[0.18em] text-[#f5f0eb]/45 max-sm:col-start-2">{layer.label}</dt>
            <dd className="max-sm:col-start-2 max-sm:mt-2 font-sans text-[14px] leading-[1.65] text-[#f5f0eb]/78 sm:text-[15px]">{layer.text}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function StagePage() {
  const [works, setWorks] = useState<Work[]>([]);
  const [cases, setCases] = useState<BureauCase[]>([]);
  const [lens, setLens] = useState<Lens>('All');
  const [activeWorkId, setActiveWorkId] = useState<string | null>(null);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deskIds, setDeskIds] = useState<string[]>(loadDesk);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    document.title = 'Stage — Spatial References — EPRIS Journal';
    const controller = new AbortController();
    Promise.all([fetchWorks(controller.signal), fetchCases(controller.signal)])
      .then(([nextWorks, nextCases]) => {
        setWorks(nextWorks.filter((work) => imageOf(work)));
        setCases(nextCases);
        setActiveWorkId(nextWorks.find((work) => imageOf(work))?.id || null);
        setActiveCaseId(nextCases[0]?.id || null);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(DESK_KEY, JSON.stringify(deskIds));
    } catch {
      // A private browser session can still use the desk for the current visit.
    }
  }, [deskIds]);

  const filteredWorks = useMemo(() => {
    const filtered = lens === 'All' ? works : works.filter((work) => work.discipline === lens);
    return filtered.length ? filtered : works;
  }, [lens, works]);
  const activeWork = filteredWorks.find((work) => work.id === activeWorkId) || works.find((work) => work.id === activeWorkId) || filteredWorks[0];
  const activeCase = cases.find((item) => item.id === activeCaseId) || cases[0];
  const heroImage = imageOf(activeWork);
  const deskWorks = works.filter((work) => deskIds.includes(work.id));
  const activeIsSaved = activeWork ? deskIds.includes(activeWork.id) : false;

  function selectWork(work: Work) {
    setActiveWorkId(work.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function toggleDesk(work: Work) {
    setDeskIds((current) => current.includes(work.id) ? current.filter((id) => id !== work.id) : [...current, work.id]);
  }

  async function copyBrief() {
    if (!deskWorks.length) return;
    try {
      await navigator.clipboard.writeText(briefFor(deskWorks));
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyState('idle');
    }
  }

  async function exportDeskPdf() {
    if (!deskWorks.length) return;
    setExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageWidth = 210;
      const margin = 18;
      let y = 22;
      doc.setFillColor('#1a0b10');
      doc.rect(0, 0, pageWidth, 297, 'F');
      doc.setTextColor('#f5f0eb');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(28);
      doc.text('EPRIS STAGE', margin, y);
      y += 9;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor('#d7b46a');
      doc.text('REFERENCE DESK', margin, y);
      y += 12;
      doc.setDrawColor('#d7b46a');
      doc.line(margin, y, pageWidth - margin, y);
      y += 12;

      for (const [index, work] of deskWorks.entries()) {
        const detail = [
          workMeta(work),
          work.medium ? `Material: ${work.medium}` : '',
          work.statement || '',
          work.sourceUrl ? `Source: ${work.sourceUrl}` : '',
        ].filter(Boolean).join('\n');
        const body = doc.splitTextToSize(detail, pageWidth - margin * 2 - 13);
        const blockHeight = 15 + body.length * 4.4;
        if (y + blockHeight > 278) {
          doc.addPage();
          doc.setFillColor('#1a0b10');
          doc.rect(0, 0, pageWidth, 297, 'F');
          y = 22;
        }
        doc.setTextColor('#d7b46a');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(String(index + 1).padStart(2, '0'), margin, y);
        doc.setTextColor('#f5f0eb');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        const title = doc.splitTextToSize(work.title, pageWidth - margin * 2 - 13);
        doc.text(title, margin + 13, y);
        y += title.length * 6.2 + 3;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor('#d9d0cb');
        doc.text(body, margin + 13, y, { lineHeightFactor: 1.45 });
        y += body.length * 4.4 + 10;
        doc.setDrawColor('#f5f0eb');
        doc.setLineWidth(0.12);
        doc.line(margin, y - 5, pageWidth - margin, y - 5);
      }
      doc.save('epris-stage-reference-desk.pdf');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#1a0b10] text-[#f5f0eb]">
      <Header />
      <main>
        <section className="relative isolate min-h-[calc(100dvh-5rem)] overflow-hidden border-b border-[#f5f0eb]/12 bg-[#12090b]">
          {heroImage ? <img src={heroImage} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-center opacity-60" /> : null}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(18,9,11,.96)_0%,rgba(18,9,11,.76)_40%,rgba(18,9,11,.25)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(18,9,11,.94)_0%,transparent_46%)]" />
          <div className="relative mx-auto grid min-h-[calc(100dvh-5rem)] max-w-[1680px] gap-10 px-5 py-9 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.37fr)] lg:px-12 lg:py-12">
            <div className="flex min-h-[36rem] flex-col justify-between">
              <div>
                <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-[#d7b46a]">Stage / spatial reference desk</p>
                <h1 className="mt-5 max-w-[9ch] font-display text-[clamp(4.4rem,10vw,10rem)] lowercase leading-[0.75] text-[#f5f0eb]">look at how a room works</h1>
              </div>
              {activeWork ? (
                <div className="max-w-[48rem] border-l border-[#d7b46a] pl-5 sm:pl-6">
                  <p className="font-sans text-[9px] uppercase tracking-[0.18em] text-[#d7b46a]">Selected reference</p>
                  <h2 className="mt-3 font-display text-[clamp(2.4rem,5vw,5.2rem)] lowercase leading-[0.84] text-[#f5f0eb]">{activeWork.title}</h2>
                  <p className="mt-4 font-sans text-[12px] uppercase tracking-[0.13em] text-[#f5f0eb]/68">{workMeta(activeWork)}</p>
                  <button type="button" onClick={() => toggleDesk(activeWork)} aria-pressed={activeIsSaved} className={`mt-6 inline-flex min-h-11 items-center gap-2 border px-4 font-sans text-[10px] uppercase tracking-[0.15em] transition-colors ${activeIsSaved ? 'border-[#d7b46a] bg-[#d7b46a] text-[#1a0b10]' : 'border-[#f5f0eb]/35 text-[#f5f0eb] hover:border-[#f5f0eb] hover:bg-[#f5f0eb]/10'}`}>
                    {activeIsSaved ? <BookmarkCheck size={14} /> : <BookmarkPlus size={14} />}
                    {activeIsSaved ? 'On reference desk' : 'Add to reference desk'}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 font-sans text-[11px] uppercase tracking-[0.16em] text-[#f5f0eb]/45"><Loader2 size={16} className="animate-spin" /> Loading references</div>
              )}
            </div>

            <aside className="self-end border-t border-[#f5f0eb]/20 pt-5 lg:self-auto lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              <p className="font-sans text-[9px] uppercase tracking-[0.18em] text-[#f5f0eb]/45">Reference index</p>
              <div className="mt-4 border-y border-[#f5f0eb]/14">
                {filteredWorks.slice(0, 6).map((work, index) => (
                  <button key={work.id} type="button" onClick={() => setActiveWorkId(work.id)} className={`group flex min-h-14 w-full items-center gap-4 border-b border-[#f5f0eb]/12 text-left last:border-0 ${activeWork?.id === work.id ? 'text-[#f5f0eb]' : 'text-[#f5f0eb]/55 hover:text-[#f5f0eb]'}`}>
                    <span className="w-6 shrink-0 font-sans text-[9px] tabular-nums text-[#d7b46a]">{String(index + 1).padStart(2, '0')}</span>
                    <span className="min-w-0 flex-1 font-sans text-[13px] leading-snug">{work.title}</span>
                    <ChevronRight size={15} className={`shrink-0 transition-transform duration-200 ${activeWork?.id === work.id ? 'translate-x-0 text-[#d7b46a]' : '-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'}`} />
                  </button>
                ))}
              </div>
            </aside>
          </div>
        </section>

        {activeWork && (
          <section className="border-b border-[#f5f0eb]/12 bg-[#f5f0eb] text-[#1a0b10]">
            <div className="mx-auto grid max-w-[1680px] lg:grid-cols-[minmax(0,1fr)_minmax(24rem,0.48fr)]">
              <div className="px-5 py-10 sm:px-8 sm:py-14 lg:px-12 lg:py-16">
                <p className="font-sans text-[9px] uppercase tracking-[0.18em] text-[#8c2f24]">What to look at</p>
                <p className="mt-5 max-w-[52rem] font-display text-[clamp(2rem,4vw,4.3rem)] lowercase leading-[0.92]">{activeWork.statement || activeWork.medium || 'The project is held here as a visual reference.'}</p>
              </div>
              <dl className="divide-y divide-[#1a0b10]/12 border-t border-[#1a0b10]/12 px-5 sm:px-8 lg:border-l lg:border-t-0 lg:px-10">
                {[
                  ['Author', activeWork.author],
                  ['Place', [activeWork.venue, activeWork.city, activeWork.country].filter(Boolean).join(' · ') || 'Not stated'],
                  ['Material', activeWork.medium || 'Not stated'],
                ].map(([label, value]) => (
                  <div key={label} className="py-5">
                    <dt className="font-sans text-[9px] uppercase tracking-[0.18em] text-[#1a0b10]/45">{label}</dt>
                    <dd className="mt-2 font-sans text-[14px] leading-relaxed text-[#1a0b10]/82">{value}</dd>
                  </div>
                ))}
                {activeWork.sourceUrl && (
                  <div className="py-5">
                    <a href={activeWork.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 border-b border-[#8c2f24] pb-1 font-sans text-[10px] uppercase tracking-[0.15em] text-[#1a0b10] transition-colors hover:border-[#1a0b10]">View source <ArrowUpRight size={14} /></a>
                  </div>
                )}
              </dl>
            </div>
          </section>
        )}

        <section className="mx-auto max-w-[1680px] px-5 py-14 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <div className="flex flex-col gap-8 border-b border-[#f5f0eb]/16 pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-[#d7b46a]">Editorial lenses</p>
              <h2 className="mt-3 max-w-[11ch] font-display text-[clamp(2.8rem,5vw,5.8rem)] lowercase leading-[0.82]">a reference is only useful when it says why</h2>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-3 border-t border-[#f5f0eb]/12 pt-4 sm:max-w-[25rem]">
              {LENSES.map((item) => (
                <button key={item} type="button" onClick={() => setLens(item)} className={`min-h-11 border-b font-sans text-[10px] uppercase tracking-[0.14em] transition-colors ${lens === item ? 'border-[#d7b46a] text-[#f5f0eb]' : 'border-transparent text-[#f5f0eb]/48 hover:text-[#f5f0eb]'}`}>{item}</button>
              ))}
            </div>
          </div>

          <div className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {filteredWorks.slice(0, 6).map((work, index) => (
              <button key={work.id} type="button" onClick={() => selectWork(work)} className="group text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d7b46a]">
                <figure className={`overflow-hidden bg-[#2b1319] ${index % 3 === 1 ? 'aspect-[4/5]' : 'aspect-[5/4]'}`}>
                  <WorkImage work={work} className="transition-transform duration-700 ease-out group-hover:scale-[1.025]" />
                </figure>
                <div className="mt-4 flex items-start justify-between gap-4 border-t border-[#f5f0eb]/18 pt-3">
                  <div>
                    <h3 className="font-display text-[24px] lowercase leading-[0.9] text-[#f5f0eb]">{work.title}</h3>
                    <p className="mt-2 font-sans text-[10px] uppercase tracking-[0.13em] text-[#f5f0eb]/48">{workMeta(work)}</p>
                  </div>
                  <ArrowRight size={16} className="mt-1 shrink-0 text-[#d7b46a] transition-transform duration-200 group-hover:translate-x-1" />
                </div>
              </button>
            ))}
          </div>
          {!loading && !filteredWorks.length && <p className="mt-10 font-sans text-[13px] text-[#f5f0eb]/50">No published references in this lens yet.</p>}
        </section>

        <section id="reference-desk" className="border-y border-[#1a0b10]/12 bg-[#f5f0eb] text-[#1a0b10]">
          <div className="mx-auto max-w-[1680px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-20">
            <div className="flex flex-col gap-5 border-b border-[#1a0b10]/14 pb-7 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-sans text-[9px] uppercase tracking-[0.18em] text-[#8c2f24]">Reference desk</p>
                <h2 className="mt-3 font-display text-[clamp(2.4rem,5vw,5.4rem)] lowercase leading-[0.82]">your working set</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={copyBrief} disabled={!deskWorks.length} className="inline-flex min-h-11 items-center justify-center gap-2 border border-[#1a0b10] px-4 font-sans text-[10px] uppercase tracking-[0.14em] transition-colors hover:bg-[#1a0b10] hover:text-[#f5f0eb] disabled:cursor-not-allowed disabled:border-[#1a0b10]/20 disabled:text-[#1a0b10]/35 disabled:hover:bg-transparent disabled:hover:text-[#1a0b10]/35">
                  <Copy size={14} /> {copyState === 'copied' ? 'Brief copied' : 'Copy brief'}
                </button>
                <button type="button" onClick={exportDeskPdf} disabled={!deskWorks.length || exporting} className="inline-flex min-h-11 items-center justify-center gap-2 border border-[#8c2f24] bg-[#8c2f24] px-4 font-sans text-[10px] uppercase tracking-[0.14em] text-[#f5f0eb] transition-colors hover:bg-[#1a0b10] disabled:cursor-not-allowed disabled:opacity-35">
                  {exporting ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />} {exporting ? 'Building PDF' : 'Desk PDF'}
                </button>
              </div>
            </div>
            {deskWorks.length ? (
              <ol className="divide-y divide-[#1a0b10]/14 border-b border-[#1a0b10]/14">
                {deskWorks.map((work, index) => (
                  <li key={work.id} className="grid grid-cols-[2.5rem_4.5rem_1fr_auto] items-center gap-4 py-4 sm:grid-cols-[3.5rem_6.5rem_1fr_auto] sm:gap-6">
                    <span className="font-sans text-[10px] tabular-nums text-[#8c2f24]">{String(index + 1).padStart(2, '0')}</span>
                    <div className="aspect-square overflow-hidden bg-[#e4d9cf]"><WorkImage work={work} /></div>
                    <div className="min-w-0">
                      <p className="font-display text-[22px] lowercase leading-none sm:text-[28px]">{work.title}</p>
                      <p className="mt-2 font-sans text-[10px] uppercase tracking-[0.12em] text-[#1a0b10]/55">{workMeta(work)}</p>
                    </div>
                    <button type="button" onClick={() => toggleDesk(work)} className="grid h-11 w-11 place-items-center border border-[#1a0b10]/15 text-[#1a0b10]/60 transition-colors hover:border-[#8c2f24] hover:text-[#8c2f24]" aria-label={`Remove ${work.title} from reference desk`} title="Remove from reference desk"><X size={16} /></button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="max-w-[36rem] py-10 font-sans text-[16px] leading-relaxed text-[#1a0b10]/62">Save the projects that keep returning to your mind. The desk is stored in this browser and can be copied as a clean reference brief.</p>
            )}
          </div>
        </section>

        {activeCase && (
          <section className="bg-[#12090b] px-5 py-14 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
            <div className="mx-auto max-w-[1680px]">
              <div className="flex flex-col gap-5 border-b border-[#f5f0eb]/16 pb-7 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-[#d7b46a]">Bureau notes</p>
                  <p className="mt-2 max-w-[40rem] font-sans text-[15px] leading-relaxed text-[#f5f0eb]/60">Short, reusable ways of reading a spatial image without mistaking a moodboard for a method.</p>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {cases.slice(0, 4).map((item, index) => (
                    <button key={item.id} type="button" onClick={() => setActiveCaseId(item.id)} className={`min-h-11 border-b font-sans text-[10px] uppercase tracking-[0.14em] transition-colors ${activeCase.id === item.id ? 'border-[#d7b46a] text-[#f5f0eb]' : 'border-transparent text-[#f5f0eb]/45 hover:text-[#f5f0eb]'}`}>{String(index + 1).padStart(2, '0')}</button>
                  ))}
                </div>
              </div>
              <div className="mt-10"><CaseReading item={activeCase} /></div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
