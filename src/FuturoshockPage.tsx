import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Box, Image as ImageIcon, Move3d, Upload } from 'lucide-react';
import { getFuturoshock, subscribeContent, type FuturoshockWork } from './data';

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} scale={1.35} />;
}

function WorkPreview({ work }: { work: FuturoshockWork }) {
  const [failed, setFailed] = useState(false);
  if (work.format === '3d' && work.modelUrl && !failed) {
    return (
      <div className="relative h-full min-h-[360px] overflow-hidden bg-[#15191a]">
        <Canvas camera={{ position: [2.8, 1.8, 3.2], fov: 34 }} dpr={[1, 1.6]}>
          <color attach="background" args={['#15191a']} />
          <ambientLight intensity={1.2} />
          <directionalLight position={[3, 5, 4]} intensity={3.5} color="#ffe2b0" />
          <directionalLight position={[-3, 1, -2]} intensity={1.8} color="#9cc8ff" />
          <Suspense fallback={null}>
            <Model url={work.modelUrl} />
            <Environment preset="studio" />
          </Suspense>
          <OrbitControls enablePan={false} minDistance={2} maxDistance={7} />
        </Canvas>
        <span className="absolute left-4 top-4 inline-flex items-center gap-2 border border-white/20 bg-black/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/80 backdrop-blur">
          <Move3d size={13} /> interactive object
        </span>
      </div>
    );
  }
  return (
    <div className="relative h-full min-h-[360px] overflow-hidden bg-[#e6ded2]">
      {work.imageUrl ? <img src={work.imageUrl} alt={work.title} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-[#282321]/40"><ImageIcon size={42} /></div>}
      <span className="absolute left-4 top-4 inline-flex items-center gap-2 border border-black/15 bg-[#f6efe5]/85 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#282321]/70 backdrop-blur"><ImageIcon size={13} /> image study</span>
    </div>
  );
}

function WorkCard({ work, active, onSelect }: { work: FuturoshockWork; active: boolean; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} className={`group text-left ${active ? 'text-[#f6efe5]' : 'text-[#f6efe5]/58'}`}>
      <div className={`aspect-[4/3] overflow-hidden border transition ${active ? 'border-[#ee5e42]' : 'border-white/15 group-hover:border-white/45'}`}>
        {work.imageUrl ? <img src={work.imageUrl} alt="" className="h-full w-full object-cover grayscale-[.2] transition duration-500 group-hover:scale-105 group-hover:grayscale-0" /> : <div className="grid h-full place-items-center bg-[#171c1d]"><Box size={26} /></div>}
      </div>
      <span className="mt-3 block font-display text-[1.45rem] lowercase leading-none">{work.title}</span>
      <span className="mt-2 block font-mono text-[9px] uppercase tracking-[0.14em] text-[#ee9f7d]/75">{work.author} / {work.year}</span>
    </button>
  );
}

export function FuturoshockPage() {
  const [works, setWorks] = useState<FuturoshockWork[]>(() => getFuturoshock());
  const [selectedId, setSelectedId] = useState<string | null>(() => getFuturoshock()[0]?.id ?? null);
  const selected = useMemo(() => works.find((work) => work.id === selectedId) ?? works[0] ?? null, [works, selectedId]);

  useEffect(() => {
    const unsubscribe = subscribeContent(() => {
      const next = getFuturoshock();
      setWorks(next);
      setSelectedId((current) => next.some((work) => work.id === current) ? current : next[0]?.id ?? null);
    });
    return unsubscribe;
  }, []);

  return (
    <main className="min-h-screen bg-[#0b0e0f] text-[#f6efe5] selection:bg-[#ee5e42] selection:text-[#0b0e0f]">
      <header className="sticky top-0 z-30 border-b border-white/12 bg-[#0b0e0f]/92 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[72px] max-w-[1700px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
          <a href="/" className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/58 hover:text-white"><ArrowLeft size={14} /> EPRIS Journal</a>
          <a href="/futuroshock" className="font-display text-[21px] lowercase leading-none tracking-normal">futuroshock</a>
          <a href="/bureau" className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/58 hover:text-white">Bureau <ArrowUpRight size={13} /></a>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-white/12">
        <div className="pointer-events-none absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'linear-gradient(90deg,#f6efe5 1px,transparent 1px),linear-gradient(#f6efe5 1px,transparent 1px)', backgroundSize: '120px 120px' }} />
        <div className="mx-auto grid max-w-[1700px] gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[.84fr_1.16fr] lg:items-end lg:px-12 lg:py-28">
          <div className="relative">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#ee9f7d]">EPRIS / author works / digital exhibition</p>
            <h1 className="mt-7 max-w-[8ch] font-display text-[clamp(4rem,10vw,10rem)] lowercase leading-[.78]">futuroshock</h1>
            <p className="mt-10 max-w-[34rem] border-l border-[#ee5e42] pl-5 font-sans text-[17px] leading-[1.6] text-white/68 sm:text-[20px]">A living room for the works our authors make, collect and send into the future: images, objects, models, prototypes and scenes with enough presence to stand alone.</p>
            <a href="mailto:editor@eprisjournal.com?subject=Futuroshock%20submission" className="mt-9 inline-flex min-h-12 items-center gap-3 border border-white/22 px-5 font-mono text-[10px] uppercase tracking-[0.16em] text-white hover:border-[#ee5e42] hover:text-[#ee9f7d]"><Upload size={15} /> submit a work</a>
          </div>
          <div className="relative border border-white/15 bg-[#15191a] p-2 shadow-[0_30px_100px_rgba(0,0,0,.35)] sm:p-3">
            <div className="grid min-h-[390px] place-items-center border border-white/10 px-8 text-center sm:min-h-[470px]">
              <div><Box size={36} strokeWidth={1} className="mx-auto mb-6 text-[#ee9f7d]" /><p className="font-display text-[2.3rem] lowercase leading-[.9] sm:text-[3.6rem]">objects with<br />a second life</p><p className="mx-auto mt-5 max-w-[26rem] font-mono text-[10px] uppercase tracking-[.14em] text-white/42">2D image / 3D model / material note / author voice</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1700px] px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-5 border-b border-white/15 pb-5"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-[#ee9f7d]">01 / exhibition floor</p><h2 className="mt-3 font-display text-[clamp(2.7rem,5vw,5rem)] lowercase leading-[.86]">the current room</h2></div><p className="max-w-[27rem] font-sans text-sm leading-relaxed text-white/48">Selected works stay legible as objects. Open a card to inspect its image, rotate its model and read the material logic behind it.</p></div>
        {selected ? <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)]"><div className="border border-white/15 bg-[#111516] p-2 sm:p-3"><WorkPreview work={selected} /></div><aside className="flex flex-col justify-between border-l border-white/15 pl-6 sm:pl-8"><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-[#ee9f7d]">{selected.format === '3d' ? '3D / interactive' : '2D / image'} / {selected.year}</p><h3 className="mt-5 font-display text-[clamp(2.8rem,5vw,5.8rem)] lowercase leading-[.82]">{selected.title}</h3><p className="mt-7 font-sans text-base leading-[1.65] text-white/62">{selected.statement}</p><dl className="mt-10 grid grid-cols-2 gap-x-4 gap-y-5 border-t border-white/15 pt-5 font-mono text-[10px] uppercase tracking-[.12em]"><div><dt className="text-white/35">author</dt><dd className="mt-2 text-white/78">{selected.author}</dd></div><div><dt className="text-white/35">medium</dt><dd className="mt-2 text-white/78">{selected.medium}</dd></div><div><dt className="text-white/35">materials</dt><dd className="mt-2 text-white/78">{selected.materials?.join(', ') || '—'}</dd></div><div><dt className="text-white/35">edition</dt><dd className="mt-2 text-white/78">{selected.edition || 'author submission'}</dd></div></dl></div>{selected.relatedArticleUrl && <a href={selected.relatedArticleUrl} className="mt-10 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.16em] text-[#ee9f7d] hover:text-white">read the related text <ArrowUpRight size={14} /></a>}</aside></div> : <div className="grid min-h-[300px] place-items-center border border-dashed border-white/20 text-center"><div><Box size={32} className="mx-auto mb-5 text-[#ee9f7d]" /><p className="font-display text-3xl lowercase">the room is ready</p><p className="mt-3 max-w-md font-sans text-sm text-white/48">We are accepting authored 2D images and optimized GLB/GLTF objects for the first exhibition cycle.</p></div></div>}
        {works.length > 0 && <div className="mt-10 grid gap-6 border-t border-white/15 pt-8 sm:grid-cols-2 lg:grid-cols-4">{works.map((work) => <WorkCard key={work.id} work={work} active={work.id === selected?.id} onSelect={() => setSelectedId(work.id)} />)}</div>}
      </section>

      <section className="border-t border-white/12 bg-[#f1e9df] text-[#171313]"><div className="mx-auto grid max-w-[1700px] gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[.8fr_1.2fr] lg:px-12"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-[#a63d2c]">02 / submission logic</p><h2 className="mt-5 max-w-[8ch] font-display text-[clamp(3rem,6vw,6rem)] lowercase leading-[.82]">make it impossible to scroll past</h2></div><div className="grid gap-0 border-t border-[#171313]/18"><div className="grid gap-4 border-b border-[#171313]/18 py-6 sm:grid-cols-[5rem_1fr]"><span className="font-display text-3xl text-[#a63d2c]">01</span><p className="max-w-[38rem] font-sans text-base leading-relaxed">Send one strong cover image and, when available, a clean GLB or GLTF model. The work should survive both a quiet thumbnail and a full-screen view.</p></div><div className="grid gap-4 border-b border-[#171313]/18 py-6 sm:grid-cols-[5rem_1fr]"><span className="font-display text-3xl text-[#a63d2c]">02</span><p className="max-w-[38rem] font-sans text-base leading-relaxed">Add the actual material vocabulary: light, scale, surface, object, route. Futuroshock is not a portfolio dump; it is a room with editorial attention.</p></div><div className="grid gap-4 py-6 sm:grid-cols-[5rem_1fr]"><span className="font-display text-3xl text-[#a63d2c]">03</span><p className="max-w-[38rem] font-sans text-base leading-relaxed">The editorial team checks file quality, rights and context before publishing. Selected works can link back to an EPRIS article, review or Bureau case.</p></div></div></div></section>
    </main>
  );
}
