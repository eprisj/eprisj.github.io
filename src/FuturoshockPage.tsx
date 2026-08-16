import { Canvas } from '@react-three/fiber';
import { ContactShadows, OrbitControls, Environment, useGLTF } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Box, Image as ImageIcon, Move3d, Upload } from 'lucide-react';
import { getFuturoshock, subscribeContent, type FuturoshockWork } from './data';

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} scale={1.35} />;
}

function OpeningObject({ scene = 'amber' }: { scene?: FuturoshockWork['openingScene'] }) {
  if (scene === 'fold') return <group rotation={[0.28, -0.55, 0]}><mesh castShadow><boxGeometry args={[1.15, 1.75, 0.2]} /><meshStandardMaterial color="#cab29b" metalness={0.28} roughness={0.32} /></mesh><mesh position={[0.28, 0.16, 0.18]} rotation={[0, 0.45, 0]}><boxGeometry args={[0.75, 1.25, 0.15]} /><meshStandardMaterial color="#422e27" metalness={0.46} roughness={0.24} /></mesh></group>;
  if (scene === 'orbit') return <group rotation={[0.2, 0.2, 0]}><mesh><torusGeometry args={[0.9, 0.14, 28, 120]} /><meshStandardMaterial color="#d7a36a" metalness={0.78} roughness={0.18} /></mesh><mesh rotation={[1.1, 0.45, 0]}><torusGeometry args={[0.58, 0.1, 28, 120]} /><meshStandardMaterial color="#d9e4d9" metalness={0.4} roughness={0.2} /></mesh><mesh><sphereGeometry args={[0.24, 48, 48]} /><meshStandardMaterial color="#351f21" roughness={0.18} metalness={0.38} /></mesh></group>;
  if (scene === 'totem') return <group rotation={[0.05, 0.46, 0]}><mesh position={[0, -0.62, 0]}><cylinderGeometry args={[.48, .6, .16, 48]} /><meshStandardMaterial color="#1a1b20" metalness={.7} roughness={.2} /></mesh><mesh position={[0, .12, 0]}><cylinderGeometry args={[.22, .28, 1.4, 48]} /><meshStandardMaterial color="#d6d3c6" metalness={.32} roughness={.2} /></mesh><mesh position={[0, .86, 0]}><sphereGeometry args={[.46, 48, 48]} /><meshStandardMaterial color="#c63458" emissive="#5d0b21" emissiveIntensity={.72} metalness={.45} roughness={.16} /></mesh><mesh position={[.2, 1.12, .31]}><sphereGeometry args={[.11, 32, 32]} /><meshStandardMaterial color="#f3c49b" emissive="#d26a3a" emissiveIntensity={1.4} /></mesh></group>;
  return <group rotation={[0.1, -0.32, 0]}><mesh position={[0, -0.55, 0]}><cylinderGeometry args={[0.52, 0.7, 0.18, 64]} /><meshStandardMaterial color="#2b211f" metalness={0.58} roughness={0.27} /></mesh><mesh position={[0, 0.16, 0]}><sphereGeometry args={[0.58, 64, 48, 0, Math.PI * 2, 0, Math.PI * .62]} /><meshStandardMaterial color="#bb6f2f" metalness={0.48} roughness={0.17} /></mesh><mesh position={[0.18, 0.35, .25]}><sphereGeometry args={[0.23, 48, 48]} /><meshStandardMaterial color="#f0c685" metalness={0.18} roughness={0.22} /></mesh></group>;
}

const OPENING_WORKS: FuturoshockWork[] = [
  { id: 'fs-opening-shelf', title: 'shelf after dinner', author: 'EPRIS opening study', year: '2026', format: '2d', medium: 'digital photograph', statement: 'A working collection of ceramic forms, glass and warm light. The first wall is already occupied by a real image, rather than a mockup.', imageUrl: '/images/futuroshock-interior.png', materials: ['wood', 'ceramic', 'glass', 'warm light'], edition: 'room 01 / image 01', room: 'room-01' },
  { id: 'fs-opening-amber', title: 'amber vessel', author: 'EPRIS opening study', year: '2026', format: '3d', medium: 'procedural 3D object', statement: 'A small calibrated volume for the illuminated plinth. Rotate it to inspect the warm metal and opaque amber surface.', openingScene: 'amber', materials: ['amber resin', 'dark metal'], edition: 'room 01 / object 01', room: 'room-01' },
  { id: 'fs-opening-fold', title: 'folded witness', author: 'EPRIS opening study', year: '2026', format: '3d', medium: 'procedural 3D object', statement: 'Two offset planes turn a wall work into an object. This position is reserved for scans, reliefs and architectural fragments.', openingScene: 'fold', materials: ['brushed aluminium', 'smoked lacquer'], edition: 'room 01 / object 02', room: 'room-01' },
  { id: 'fs-opening-light', title: 'light index', author: 'EPRIS opening study', year: '2026', format: '2d', medium: 'digital photograph', statement: 'A photographic index of the room: reflection, shelf depth and the small shifts that make a display feel inhabited.', imageUrl: '/images/futuroshock-interior.png', materials: ['glass', 'walnut', 'fabric'], edition: 'room 02 / image 01', room: 'room-02' },
  { id: 'fs-opening-orbit', title: 'orbit for a hand', author: 'EPRIS opening study', year: '2026', format: '3d', medium: 'procedural 3D object', statement: 'A rotational study built for the final position near the window. It gives the opening room movement before the first model arrives.', openingScene: 'orbit', materials: ['bronze', 'milk glass', 'charcoal stone'], edition: 'room 02 / object 01', room: 'room-02' },
  { id: 'fs-opening-detail', title: 'inventory of touch', author: 'EPRIS opening study', year: '2026', format: '2d', medium: 'digital photograph', statement: 'The starting material palette: vessels, marks and domestic scale. The future exhibition grows from this level of attention.', imageUrl: '/images/futuroshock-interior.png', materials: ['ceramic', 'wood', 'linen'], edition: 'room 02 / image 02', room: 'room-02' },
  { id: 'fs-opening-signal', title: 'signal totem', author: 'EPRIS opening study', year: '2026', format: '3d', medium: 'procedural light object', statement: 'A vertical receiver for the final chamber. It turns a small point of red light into an address in the dark.', openingScene: 'totem', materials: ['anodised aluminium', 'resin', 'low voltage light'], edition: 'room 03 / object 01', room: 'room-03' },
  { id: 'fs-opening-afterimage', title: 'afterimage room', author: 'EPRIS opening study', year: '2026', format: '2d', medium: 'digital photograph', statement: 'An interior photographed after the visitor leaves: surface remains, objects become evidence and the room holds its own memory.', imageUrl: '/images/futuroshock-interior.png', materials: ['smoked glass', 'oak', 'night light'], edition: 'room 03 / image 01', room: 'room-03' },
  { id: 'fs-opening-archive-fold', title: 'red shift', author: 'EPRIS opening study', year: '2026', format: '3d', medium: 'procedural relief', statement: 'A relief that changes from an image into a sharp object when its edge catches the light.', openingScene: 'fold', materials: ['oxide red lacquer', 'aluminium'], edition: 'room 03 / object 02', room: 'room-03' },
];

type LightMode = 'warm' | 'contrejour';
type RoomId = 'room-01' | 'room-02' | 'room-03';

const ROOMS: Record<RoomId, { number: string; title: string; note: string; light: LightMode }> = {
  'room-01': { number: '01', title: 'objects after light', note: 'warm shelves, slow material reading', light: 'warm' },
  'room-02': { number: '02', title: 'counterlight archive', note: 'silhouettes, reflection, a harder edge', light: 'contrejour' },
  'room-03': { number: '03', title: 'afterimage chamber', note: 'a signal room for red light and relief', light: 'contrejour' },
};

function PlanRoom({ room, position, active, onSelect }: { room: RoomId; position: [number, number, number]; active: boolean; onSelect: (room: RoomId) => void }) {
  const color = room === 'room-01' ? '#d8a66d' : room === 'room-02' ? '#d7d9d4' : '#d4445a';
  const scene = room === 'room-01' ? 'amber' : room === 'room-02' ? 'orbit' : 'totem';
  return <group position={position} onClick={() => onSelect(room)}>
    <mesh position={[0, -.1, 0]}><boxGeometry args={[2.1, .18, 1.75]} /><meshStandardMaterial color={active ? '#2d2724' : '#15191b'} metalness={.3} roughness={.48} /></mesh>
    <mesh position={[0, .72, -.82]}><boxGeometry args={[2.1, 1.62, .12]} /><meshStandardMaterial color={active ? '#2b2320' : '#15191b'} metalness={.12} roughness={.78} /></mesh>
    <mesh position={[-.76, .58, -.73]}><boxGeometry args={[.55, .86, .06]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={active ? 1.45 : .32} roughness={.42} /></mesh>
    <mesh position={[.62, .18, .28]}><cylinderGeometry args={[.32, .42, .45, 36]} /><meshStandardMaterial color="#221e1d" metalness={.55} roughness={.26} /></mesh>
    <group position={[.62, .72, .28]} scale={.42}><OpeningObject scene={scene} /></group>
    <mesh position={[0, .03, .06]} onClick={() => onSelect(room)}><boxGeometry args={[2.45, .06, 2.05]} /><meshBasicMaterial transparent opacity={0} /></mesh>
  </group>;
}

function SpatialPlan({ activeRoom, onSelect }: { activeRoom: RoomId; onSelect: (room: RoomId) => void }) {
  return <div className="relative min-h-[390px] overflow-hidden bg-[#0c1011] sm:min-h-[480px]" aria-label="Interactive three-room exhibition map">
    <Canvas camera={{ position: [5.8, 4.5, 7.7], fov: 36 }} dpr={[1, 1.5]}>
      <color attach="background" args={['#0c1011']} />
      <ambientLight intensity={.55} />
      <directionalLight position={[3, 6, 5]} intensity={2.8} color="#ffdeb0" />
      <pointLight position={[-2.6, 2.8, 1.5]} intensity={activeRoom === 'room-01' ? 9 : 2} color="#e8a158" distance={6} />
      <pointLight position={[0, 2.4, 1]} intensity={activeRoom === 'room-02' ? 9 : 2} color="#d9e2f0" distance={6} />
      <pointLight position={[2.6, 2.6, 1]} intensity={activeRoom === 'room-03' ? 11 : 2} color="#de3d62" distance={6} />
      <mesh position={[0, -.28, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[12, 8]} /><meshStandardMaterial color="#111718" metalness={.45} roughness={.66} /></mesh>
      <mesh position={[-1.3, -.12, 0]}><boxGeometry args={[.7, .08, .5]} /><meshStandardMaterial color="#3b342e" roughness={.5} /></mesh>
      <mesh position={[1.3, -.12, 0]}><boxGeometry args={[.7, .08, .5]} /><meshStandardMaterial color="#3b342e" roughness={.5} /></mesh>
      <PlanRoom room="room-01" position={[-2.6, 0, 0]} active={activeRoom === 'room-01'} onSelect={onSelect} />
      <PlanRoom room="room-02" position={[0, 0, 0]} active={activeRoom === 'room-02'} onSelect={onSelect} />
      <PlanRoom room="room-03" position={[2.6, 0, 0]} active={activeRoom === 'room-03'} onSelect={onSelect} />
      <ContactShadows position={[0, -.24, 0]} opacity={.7} scale={12} blur={2.8} far={5} />
      <OrbitControls enablePan={false} minDistance={6} maxDistance={11} minPolarAngle={.65} maxPolarAngle={1.25} />
    </Canvas>
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 border-t border-white/10 bg-[#0c1011]/76 px-5 py-4 backdrop-blur sm:px-8"><span className="font-mono text-[9px] uppercase tracking-[.18em] text-[#f0c28c]">spatial index / 03 rooms</span><span className="font-mono text-[9px] uppercase tracking-[.14em] text-white/45">drag to orbit · tap a room to enter</span></div>
  </div>;
}

function WorkPreview({ work, lightMode }: { work: FuturoshockWork; lightMode: LightMode }) {
  if (work.format === '3d') {
    return (
      <div className={`relative h-full min-h-[360px] overflow-hidden ${lightMode === 'contrejour' ? 'bg-[#070b0c]' : 'bg-[#15191a]'}`}>
        <Canvas camera={{ position: [2.8, 1.8, 3.2], fov: 34 }} dpr={[1, 1.6]}>
          <color attach="background" args={[lightMode === 'contrejour' ? '#070b0c' : '#15191a']} />
          <ambientLight intensity={lightMode === 'contrejour' ? 0.24 : 1.15} />
          <directionalLight position={[3, 5, 4]} intensity={lightMode === 'contrejour' ? 0.55 : 3.5} color="#ffe2b0" />
          <directionalLight position={[-3, 1, -2]} intensity={lightMode === 'contrejour' ? 0.7 : 1.8} color="#9cc8ff" />
          <pointLight position={[0, 1.8, -2.8]} intensity={lightMode === 'contrejour' ? 16 : 3.4} distance={8} color={lightMode === 'contrejour' ? '#fff0cf' : '#e8a35c'} />
          <Suspense fallback={null}>
            {work.modelUrl ? <Model url={work.modelUrl} /> : <OpeningObject scene={work.openingScene} />}
            <Environment preset="studio" />
            <ContactShadows position={[0, -1.08, 0]} opacity={lightMode === 'contrejour' ? 0.84 : 0.42} scale={6} blur={2.4} far={3.2} color="#000000" />
          </Suspense>
          <OrbitControls enablePan={false} minDistance={2} maxDistance={7} />
        </Canvas>
        {lightMode === 'contrejour' && <div aria-hidden="true" className="pointer-events-none absolute inset-x-[24%] top-0 h-full bg-[linear-gradient(90deg,transparent,rgba(255,228,180,.34),transparent)] blur-2xl" />}
        <span className="absolute left-4 top-4 inline-flex items-center gap-2 border border-white/20 bg-black/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/80 backdrop-blur">
          <Move3d size={13} /> interactive object
        </span>
      </div>
    );
  }
  return (
    <div className="relative h-full min-h-[360px] overflow-hidden bg-[#e6ded2]">
      {work.imageUrl ? <img src={work.imageUrl} alt={work.title} className={`h-full w-full object-cover transition duration-700 ${lightMode === 'contrejour' ? 'scale-[1.02] saturate-[.44] contrast-[1.34] brightness-[.56]' : ''}`} /> : <div className="grid h-full place-items-center text-[#282321]/40"><ImageIcon size={42} /></div>}
      {lightMode === 'contrejour' && <><div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(3,6,6,.82),transparent_56%,rgba(3,6,6,.48))]" /><div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-[43%] top-0 w-[18%] -skew-x-[7deg] bg-[linear-gradient(90deg,transparent,rgba(255,230,187,.34),transparent)] blur-xl" /></>}
      <span className={`absolute left-4 top-4 inline-flex items-center gap-2 border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] backdrop-blur ${lightMode === 'contrejour' ? 'border-white/25 bg-black/30 text-white/80' : 'border-black/15 bg-[#f6efe5]/85 text-[#282321]/70'}`}><ImageIcon size={13} /> image study</span>
    </div>
  );
}

function WorkCard({ work, active, onSelect }: { work: FuturoshockWork; active: boolean; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} className={`group text-left ${active ? 'text-[#f6efe5]' : 'text-[#f6efe5]/58'}`}>
      <div className={`aspect-[4/3] overflow-hidden border transition ${active ? 'border-[#ee5e42]' : 'border-white/15 group-hover:border-white/45'}`}>
        {work.imageUrl ? <img src={work.imageUrl} alt="" className="h-full w-full object-cover grayscale-[.2] transition duration-500 group-hover:scale-105 group-hover:grayscale-0" /> : <div className="grid h-full place-items-center bg-[#171c1d]"><span className="font-mono text-[10px] uppercase tracking-[.16em] text-[#ee9f7d]">3D / {work.openingScene || 'model'}</span></div>}
      </div>
      <span className="mt-3 block font-display text-[1.45rem] lowercase leading-none">{work.title}</span>
      <span className="mt-2 block font-mono text-[9px] uppercase tracking-[0.14em] text-[#ee9f7d]/75">{work.author} / {work.year}</span>
    </button>
  );
}

function InteriorRoom({ compact = false, lightMode = 'warm', room = 'room-01' }: { compact?: boolean; lightMode?: LightMode; room?: RoomId }) {
  const isArchive = room === 'room-02';
  const isSignal = room === 'room-03';
  return (
    <div className={`relative isolate overflow-hidden bg-[#201a17] ${compact ? 'min-h-[360px]' : 'min-h-[560px]'}`}>
      <img src="/images/futuroshock-interior.png" alt="The Futuroshock interior, prepared for its first works" className={`absolute inset-0 h-full w-full object-cover transition duration-700 ${isArchive ? 'object-[78%_center]' : isSignal ? 'object-[28%_center]' : 'object-center'} ${lightMode === 'contrejour' ? 'scale-[1.02] saturate-[.42] contrast-[1.28] brightness-[.56]' : 'saturate-[.72] contrast-[1.04]'}`} />
      <div className={`absolute inset-0 transition duration-700 ${isSignal ? 'bg-[linear-gradient(90deg,rgba(7,4,8,.92),rgba(47,8,23,.32)_56%,rgba(4,6,7,.82)),linear-gradient(0deg,rgba(2,4,4,.75),transparent_68%)]' : lightMode === 'contrejour' ? 'bg-[linear-gradient(90deg,rgba(4,7,7,.89),rgba(10,12,12,.18)_56%,rgba(4,7,7,.76)),linear-gradient(0deg,rgba(2,4,4,.72),transparent_68%)]' : 'bg-[linear-gradient(90deg,rgba(10,12,12,.76),rgba(10,12,12,.14)_53%,rgba(10,12,12,.54)),linear-gradient(0deg,rgba(10,12,12,.7),transparent_55%)]'}`} />
      {lightMode === 'contrejour' && <><div aria-hidden="true" className="absolute -top-[10%] left-[47%] h-[128%] w-[15%] -skew-x-[8deg] bg-[linear-gradient(90deg,transparent,rgba(255,230,180,.38),transparent)] blur-xl" /><div aria-hidden="true" className="absolute left-0 right-0 top-[21%] h-px bg-[#ffe3ba]/80 shadow-[0_0_36px_11px_rgba(255,180,93,.48)]" /></>}
      {isSignal && <div aria-hidden="true" className="absolute bottom-[-20%] left-[48%] h-[120%] w-[10%] bg-[linear-gradient(90deg,transparent,rgba(221,49,91,.64),transparent)] blur-2xl" />}
      <div className={`absolute inset-x-[6%] top-[18%] h-px transition duration-500 ${lightMode === 'contrejour' ? 'bg-[#fff0cc]/90 shadow-[0_0_32px_8px_rgba(250,186,98,.58)]' : 'bg-[#f8e0af]/65 shadow-[0_0_22px_5px_rgba(248,190,94,.33)]'}`} />
      <div className={`absolute ${isArchive ? 'left-[53%] top-[24%] h-[49%] w-[32%]' : isSignal ? 'left-[23%] top-[19%] h-[58%] w-[42%]' : 'left-[8%] top-[27%] h-[44%] w-[38%]'} border transition duration-700 ${isSignal ? 'border-[#ec7a8f]/70 bg-[#130910]/42 shadow-[inset_0_0_90px_rgba(0,0,0,.88),0_0_58px_rgba(207,43,79,.28)' : lightMode === 'contrejour' ? 'border-[#ffe6bd]/70 bg-[#060908]/48 shadow-[inset_0_0_80px_rgba(0,0,0,.86),14px_20px_70px_rgba(0,0,0,.64)' : 'border-[#f9e7ca]/36 bg-[#291e18]/22 shadow-[inset_0_0_50px_rgba(0,0,0,.4),0_12px_50px_rgba(0,0,0,.28)'}`}>
        <span className="absolute -left-px -top-6 font-mono text-[9px] uppercase tracking-[.17em] text-[#f8d7a0]">{isSignal ? 'signal plane / 03' : isArchive ? 'archive frame / 02' : 'vacant frame / 01'}</span>
        <span className="absolute bottom-3 left-3 font-mono text-[9px] uppercase tracking-[.14em] text-white/52">2D work</span>
      </div>
      <div className={`absolute ${isArchive ? 'left-[12%] top-[40%] h-[28%] w-[20%]' : isSignal ? 'left-[72%] top-[40%] h-[24%] w-[15%]' : 'right-[8%] top-[33%] h-[32%] w-[23%]'} border transition duration-700 ${isSignal ? 'border-[#f2a1ad]/80 bg-[#1a0912]/44 shadow-[inset_0_0_62px_rgba(0,0,0,.82),-10px_10px_48px_rgba(222,46,91,.3)' : lightMode === 'contrejour' ? 'border-[#fff0d2]/70 bg-[#060807]/42 shadow-[inset_0_0_62px_rgba(0,0,0,.82),-15px_10px_55px_rgba(255,194,115,.22)' : 'border-[#f9e7ca]/42 bg-[#36241b]/24 shadow-[inset_0_0_45px_rgba(0,0,0,.45),0_12px_50px_rgba(0,0,0,.28)'}`}>
        <span className="absolute bottom-3 left-3 font-mono text-[9px] uppercase tracking-[.14em] text-white/52">3D object</span>
        <span aria-hidden="true" className={`absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rotate-45 border transition duration-700 ${lightMode === 'contrejour' ? 'border-[#fff2d7]/85 bg-[#2e241d]/15 shadow-[0_0_55px_12px_rgba(255,204,132,.34)]' : 'border-[#f5d5a6]/60 bg-[#754d32]/20 shadow-[0_0_35px_rgba(255,173,88,.18)]'}`} />
      </div>
      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-4 border-t border-white/18 bg-[#0a0c0c]/70 px-4 py-4 backdrop-blur-sm sm:px-6">
        <span className="font-mono text-[9px] uppercase tracking-[.18em] text-[#f8d7a0]">room {ROOMS[room].number} / opening state</span>
        <span className="font-mono text-[9px] uppercase tracking-[.14em] text-white/56">light: {lightMode === 'contrejour' ? 'contre-jour / night' : 'warm / night'}</span>
      </div>
    </div>
  );
}

export function FuturoshockPage() {
  const [works, setWorks] = useState<FuturoshockWork[]>(() => getFuturoshock().length ? getFuturoshock() : OPENING_WORKS);
  const [selectedId, setSelectedId] = useState<string | null>(() => (getFuturoshock().length ? getFuturoshock() : OPENING_WORKS)[0]?.id ?? null);
  const [activeRoom, setActiveRoom] = useState<RoomId>('room-01');
  const visibleWorks = useMemo(() => works.filter((work) => (work.room || 'room-01') === activeRoom), [works, activeRoom]);
  const selected = useMemo(() => visibleWorks.find((work) => work.id === selectedId) ?? visibleWorks[0] ?? null, [visibleWorks, selectedId]);
  const [lightMode, setLightMode] = useState<LightMode>('warm');

  useEffect(() => {
    const unsubscribe = subscribeContent(() => {
      const next = getFuturoshock();
      const exhibition = next.length ? next : OPENING_WORKS;
      setWorks(exhibition);
      setSelectedId((current) => exhibition.some((work) => work.id === current) ? current : exhibition[0]?.id ?? null);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!visibleWorks.some((work) => work.id === selectedId)) setSelectedId(visibleWorks[0]?.id ?? null);
  }, [activeRoom, selectedId, visibleWorks]);

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
          <div className="relative border border-white/15 bg-[#15191a] p-2 shadow-[0_30px_100px_rgba(0,0,0,.35)] sm:p-3"><InteriorRoom compact lightMode={lightMode} room={activeRoom} /></div>
        </div>
      </section>

      <section className="border-b border-white/12 bg-[#0c1011]"><div className="mx-auto grid max-w-[1700px] gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[.72fr_1.28fr] lg:px-12 lg:py-16"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-[#ee9f7d]">floor map / live positions</p><h2 className="mt-5 max-w-[8ch] font-display text-[clamp(3rem,5.2vw,5.5rem)] lowercase leading-[.82]">the building is the interface</h2><p className="mt-6 max-w-[31rem] font-sans text-base leading-[1.65] text-white/58">Move through three rooms as a spatial sequence. The map keeps the architecture legible while each room remains its own light condition.</p></div><div className="border border-white/15 p-2 sm:p-3"><SpatialPlan activeRoom={activeRoom} onSelect={(room) => { setActiveRoom(room); setLightMode(ROOMS[room].light); }} /></div></div></section>

      <nav aria-label="Exhibition rooms" className="border-b border-white/12 bg-[#0b0e0f]"><div className="mx-auto grid max-w-[1700px] md:grid-cols-3 lg:px-12">{(Object.keys(ROOMS) as RoomId[]).map((room) => { const item = ROOMS[room]; const active = room === activeRoom; return <button key={room} type="button" onClick={() => { setActiveRoom(room); setLightMode(item.light); }} aria-pressed={active} className={`group grid min-h-[178px] grid-cols-[4.5rem_1fr_auto] items-end gap-5 border-b border-white/12 px-5 py-7 text-left transition sm:px-8 md:border-b-0 ${room !== 'room-03' ? 'md:border-r' : ''} ${active ? 'bg-[#181514]' : 'hover:bg-white/[.045]'}`}><span className="font-display text-4xl leading-none text-[#ee9f7d]">{item.number}</span><span><span className="block font-display text-[clamp(1.8rem,3vw,3rem)] lowercase leading-[.86] text-[#f6efe5]">{item.title}</span><span className="mt-3 block font-mono text-[9px] uppercase tracking-[.16em] text-white/48">{item.note}</span></span><ArrowUpRight size={17} className={`mb-1 transition-transform duration-300 ${active ? 'translate-x-0 translate-y-0 text-[#ee9f7d]' : 'group-hover:translate-x-1 group-hover:-translate-y-1 text-white/45'}`} /></button>; })}</div></nav>

      <section className="mx-auto max-w-[1700px] px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-5 border-b border-white/15 pb-5"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-[#ee9f7d]">01 / exhibition floor</p><h2 className="mt-3 font-display text-[clamp(2.7rem,5vw,5rem)] lowercase leading-[.86]">the current room</h2></div><div className="flex flex-wrap items-center gap-3"><p className="max-w-[25rem] font-sans text-sm leading-relaxed text-white/48">Change the light to see how every object survives as surface or silhouette.</p><div className="flex border border-white/18 p-1" role="group" aria-label="Room lighting"><button type="button" onClick={() => setLightMode('warm')} aria-pressed={lightMode === 'warm'} className={`min-h-11 px-3 font-mono text-[9px] uppercase tracking-[.14em] ${lightMode === 'warm' ? 'bg-[#f5e8d5] text-[#181617]' : 'text-white/58 hover:text-white'}`}>warm room</button><button type="button" onClick={() => setLightMode('contrejour')} aria-pressed={lightMode === 'contrejour'} className={`min-h-11 px-3 font-mono text-[9px] uppercase tracking-[.14em] ${lightMode === 'contrejour' ? 'bg-[#ee9f7d] text-[#181617]' : 'text-white/58 hover:text-white'}`}>contre-jour</button></div></div></div>
        {selected ? <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)]"><div className="border border-white/15 bg-[#111516] p-2 sm:p-3"><WorkPreview work={selected} lightMode={lightMode} /></div><aside className="flex flex-col justify-between border-l border-white/15 pl-6 sm:pl-8"><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-[#ee9f7d]">{selected.format === '3d' ? '3D / interactive' : '2D / image'} / {selected.year}</p><h3 className="mt-5 font-display text-[clamp(2.8rem,5vw,5.8rem)] lowercase leading-[.82]">{selected.title}</h3><p className="mt-7 font-sans text-base leading-[1.65] text-white/62">{selected.statement}</p><dl className="mt-10 grid grid-cols-2 gap-x-4 gap-y-5 border-t border-white/15 pt-5 font-mono text-[10px] uppercase tracking-[.12em]"><div><dt className="text-white/35">author</dt><dd className="mt-2 text-white/78">{selected.author}</dd></div><div><dt className="text-white/35">medium</dt><dd className="mt-2 text-white/78">{selected.medium}</dd></div><div><dt className="text-white/35">materials</dt><dd className="mt-2 text-white/78">{selected.materials?.join(', ') || '—'}</dd></div><div><dt className="text-white/35">edition</dt><dd className="mt-2 text-white/78">{selected.edition || 'author submission'}</dd></div></dl></div>{selected.relatedArticleUrl && <a href={selected.relatedArticleUrl} className="mt-10 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.16em] text-[#ee9f7d] hover:text-white">read the related text <ArrowUpRight size={14} /></a>}</aside></div> : <div className="grid gap-8 border border-white/15 bg-[#111516] p-2 sm:p-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)]"><InteriorRoom lightMode={lightMode} /><aside className="flex min-h-full flex-col justify-between p-5 sm:p-8"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-[#ee9f7d]">opening programme / room 01</p><h3 className="mt-5 max-w-[8ch] font-display text-[clamp(3rem,5vw,5.5rem)] lowercase leading-[.82]">the interior holds the place</h3><p className="mt-8 max-w-[34rem] font-sans text-[16px] leading-[1.7] text-white/62">Before the first author enters, the room is already composed: warm shelves, empty frames, one illuminated plinth and enough silence around each future work.</p><div className="mt-10 grid grid-cols-2 gap-4 border-t border-white/15 pt-5 font-mono text-[9px] uppercase tracking-[.14em] text-white/56"><span>frame 01 / 2D</span><span>plinth 02 / 3D</span><span>light / dimmable</span><span>display / adaptive</span></div></div><a href="mailto:editor@eprisjournal.com?subject=Futuroshock%20submission" className="mt-10 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.16em] text-[#ee9f7d] hover:text-white">take the first place <ArrowUpRight size={14} /></a></aside></div>}
        {visibleWorks.length > 0 && <div className="mt-10 grid gap-6 border-t border-white/15 pt-8 sm:grid-cols-2 lg:grid-cols-3">{visibleWorks.map((work) => <WorkCard key={work.id} work={work} active={work.id === selected?.id} onSelect={() => setSelectedId(work.id)} />)}</div>}
      </section>

      <section className="border-t border-white/12 bg-[#f1e9df] text-[#171313]"><div className="mx-auto grid max-w-[1700px] gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[.8fr_1.2fr] lg:px-12"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-[#a63d2c]">02 / submission logic</p><h2 className="mt-5 max-w-[8ch] font-display text-[clamp(3rem,6vw,6rem)] lowercase leading-[.82]">make it impossible to scroll past</h2></div><div className="grid gap-0 border-t border-[#171313]/18"><div className="grid gap-4 border-b border-[#171313]/18 py-6 sm:grid-cols-[5rem_1fr]"><span className="font-display text-3xl text-[#a63d2c]">01</span><p className="max-w-[38rem] font-sans text-base leading-relaxed">Send one strong cover image and, when available, a clean GLB or GLTF model. The work should survive both a quiet thumbnail and a full-screen view.</p></div><div className="grid gap-4 border-b border-[#171313]/18 py-6 sm:grid-cols-[5rem_1fr]"><span className="font-display text-3xl text-[#a63d2c]">02</span><p className="max-w-[38rem] font-sans text-base leading-relaxed">Add the actual material vocabulary: light, scale, surface, object, route. Futuroshock is not a portfolio dump; it is a room with editorial attention.</p></div><div className="grid gap-4 py-6 sm:grid-cols-[5rem_1fr]"><span className="font-display text-3xl text-[#a63d2c]">03</span><p className="max-w-[38rem] font-sans text-base leading-relaxed">The editorial team checks file quality, rights and context before publishing. Selected works can link back to an EPRIS article, review or Bureau case.</p></div></div></div></section>
    </main>
  );
}
