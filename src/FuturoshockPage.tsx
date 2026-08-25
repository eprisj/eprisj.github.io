import { Canvas } from '@react-three/fiber';
import { ContactShadows, OrbitControls, Environment, useGLTF, useTexture } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { getFuturoshock, subscribeContent, type FuturoshockWork } from './data';

function Model({ url, size = 2.25 }: { url: string; size?: number }) {
  const { scene } = useGLTF(url);
  const model = useMemo(() => scene.clone(true), [scene]);
  const placement = useMemo(() => {
    const bounds = new THREE.Box3().setFromObject(model);
    const dimensions = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = size / Math.max(dimensions.x, dimensions.y, dimensions.z, 0.01);
    return { scale, position: [-center.x * scale, -bounds.min.y * scale, -center.z * scale] as [number, number, number] };
  }, [model, size]);
  return <group scale={placement.scale} position={placement.position}><primitive object={model} /></group>;
}

/* Procedural stand-in. Every object on the opening shelf is a real model now,
   so this is no longer what the exhibition is made of. It stays for two jobs:
   the miniature objects in the room plan, where a 250KB GLB per room would be
   paid for a shape 40px across, and any work an editor adds later without a
   model yet, which should look like a placed object rather than a hole. */
function OpeningObject({ scene = 'amber' }: { scene?: FuturoshockWork['openingScene'] }) {
  if (scene === 'fold') return <group rotation={[0.06, -0.32, 0]}><mesh position={[0, -.5, 0]}><cylinderGeometry args={[.55, .68, .14, 64]} /><meshStandardMaterial color="#2f211b" roughness={.62} /></mesh><mesh position={[-.18, .08, 0]} scale={[.7, 1.15, .62]}><sphereGeometry args={[.5, 48, 38]} /><meshStandardMaterial color="#d1c0a3" roughness={.5} /></mesh><mesh position={[.28, .28, .03]} scale={[.38, .9, .42]}><sphereGeometry args={[.45, 48, 38]} /><meshStandardMaterial color="#693f31" roughness={.42} /></mesh></group>;
  if (scene === 'orbit') return <group rotation={[0.08, .25, 0]}><mesh position={[0, -.52, 0]}><cylinderGeometry args={[.7, .78, .16, 64]} /><meshStandardMaterial color="#4b3125" roughness={.54} /></mesh><mesh position={[0, -.16, 0]} scale={[1.05, .42, 1.05]}><sphereGeometry args={[.62, 64, 48]} /><meshStandardMaterial color="#a46f43" roughness={.32} /></mesh><mesh position={[0, .17, 0]} scale={[.7, .24, .7]}><sphereGeometry args={[.48, 64, 48]} /><meshStandardMaterial color="#d3c7b2" roughness={.28} /></mesh></group>;
  if (scene === 'totem') return <group rotation={[0.02, .35, 0]}><mesh position={[0, -.62, 0]}><cylinderGeometry args={[.56, .7, .16, 56]} /><meshStandardMaterial color="#35251e" roughness={.64} /></mesh><mesh position={[0, -.06, 0]} scale={[.72, 1.3, .72]}><sphereGeometry args={[.5, 64, 48]} /><meshStandardMaterial color="#c6b59c" roughness={.36} /></mesh><mesh position={[0, .7, 0]}><cylinderGeometry args={[.16, .24, .52, 48]} /><meshStandardMaterial color="#c6b59c" roughness={.36} /></mesh></group>;
  return <group rotation={[0.1, -0.32, 0]}><mesh position={[0, -0.55, 0]}><cylinderGeometry args={[0.52, 0.7, 0.18, 64]} /><meshStandardMaterial color="#2b211f" metalness={0.58} roughness={0.27} /></mesh><mesh position={[0, 0.16, 0]}><sphereGeometry args={[0.58, 64, 48, 0, Math.PI * 2, 0, Math.PI * .62]} /><meshStandardMaterial color="#bb6f2f" metalness={0.48} roughness={0.17} /></mesh><mesh position={[0.18, 0.35, .25]}><sphereGeometry args={[0.23, 48, 48]} /><meshStandardMaterial color="#f0c685" metalness={0.18} roughness={0.22} /></mesh></group>;
}

const OPENING_WORKS: FuturoshockWork[] = [
  { id: 'fs-opening-shelf', title: 'diffuse teacup', author: 'Poly Haven / Eric Chadwick', year: '2023', format: '3d', medium: 'GLB / diffuse transmission', statement: 'A porcelain study with a soft subsurface edge. It is deliberately placed at eye level so the warm strip reveals the body rather than turning it into a flat render.', modelUrl: '/models/futuroshock/teacup.glb', materials: ['porcelain', 'translucent glaze'], edition: 'shelf 01 / CC0', room: 'room-01', shelfSlot: 1, shelfScale: .88, textureNote: 'soft transmission, warm white glaze' },
  { id: 'fs-opening-amber', title: 'glass hurricane', author: 'Wayfair / Eric Chadwick', year: '2021', format: '3d', medium: 'GLB / volume glass', statement: 'A real glass volume with its edge and thickness preserved. The rear shelf light is part of the work: it makes the object read as glass instead of a tinted silhouette.', modelUrl: '/models/futuroshock/candle-holder.glb', materials: ['clear glass', 'volume transmission'], edition: 'shelf 02 / CC BY 4.0', room: 'room-01', shelfSlot: 2, shelfScale: .82, textureNote: 'clear volume, caustic-like edge' },
  { id: 'fs-opening-fold', title: 'iridescent dish', author: 'Wayfair / Eric Chadwick', year: '2020', format: '3d', medium: 'GLB / ceramic dish', statement: 'A shallow ceramic dish whose glaze changes at the edge. It is the one reflective note in the room, held low enough to read as an object rather than a screen.', modelUrl: '/models/futuroshock/iridescent-dish.glb', materials: ['ceramic', 'iridescent glaze'], edition: 'shelf 03 / CC BY 4.0', room: 'room-01', shelfSlot: 3, shelfScale: .82, textureNote: 'translucent glaze, glazed edge' },
  { id: 'fs-opening-light', title: 'antique ceramic vase', author: 'James Ray Cock / Poly Haven', year: '2021', format: '3d', medium: 'photogrammetry / GLB', statement: 'A scanned vase, not a modelled one: the chips on its lip and the wear around the foot are a record of a real object rather than a decision someone made in software.', modelUrl: '/models/futuroshock/antique-vase.glb', materials: ['glazed earthenware', 'crazed surface'], edition: 'shelf 04 / CC0', room: 'room-01', shelfSlot: 4, shelfScale: .86, textureNote: 'crazed glaze, worn foot' },
  { id: 'fs-opening-gothic', title: 'gothic figure', author: 'Benny Weimer / Poly Haven', year: '2022', format: '3d', medium: 'photogrammetry / GLB', statement: 'A weathered stone figure, scanned with its damage intact. It is the only object in the room that was carved rather than thrown, cast or blown, and it anchors the far end of the shelf.', modelUrl: '/models/futuroshock/gothic-statue.glb', materials: ['limestone', 'weathering'], edition: 'shelf 10 / CC0', room: 'room-01', shelfSlot: 10, shelfScale: .74, textureNote: 'eroded stone, lichen staining' },
  { id: 'fs-opening-ray', title: 'bronze ray', author: 'Tina / Poly Haven', year: '2022', format: '3d', medium: 'cast bronze / GLB', statement: 'One continuous curve with a specular sheen that runs along it. Placed low so the shelf light travels the length of the body instead of stopping on a face.', modelUrl: '/models/futuroshock/bronze-ray.glb', materials: ['cast bronze', 'patina'], edition: 'shelf 11 / CC0', room: 'room-01', shelfSlot: 11, shelfScale: .82, textureNote: 'patinated bronze, specular sheen' },
  { id: 'fs-opening-clock', title: 'mantel clock', author: 'Yann Kervran, Rico Cilliers / Poly Haven', year: '2022', format: '3d', medium: 'photogrammetry / GLB', statement: 'The one object here with a mechanism inside it. Clearcoat on the case and a glass face: two different reflections in one piece, which is the whole argument of this room in miniature.', modelUrl: '/models/futuroshock/mantel-clock.glb', materials: ['lacquered wood', 'brass', 'glass'], edition: 'shelf 12 / CC0', room: 'room-01', shelfSlot: 12, shelfScale: .8, textureNote: 'clearcoat case, glazed dial' },
  { id: 'fs-opening-candleholders', title: 'marble bust', author: 'Rico Cilliers / Poly Haven', year: '2021', format: '3d', medium: 'photogrammetry / GLB', statement: 'A scanned marble head, kept at 2K so the tool marks under the jaw and the grain running through the brow survive the compression. The most worked surface in the room and the one that repays standing still.', modelUrl: '/models/futuroshock/marble-bust.glb', materials: ['carved marble', 'tool marks'], edition: 'shelf 13 / CC0', room: 'room-01', shelfSlot: 13, shelfScale: .8, textureNote: 'marble grain, chisel relief' },
  { id: 'fs-opening-ceramic-vase', title: 'lambis shell', author: 'Kuutti Siitonen / Poly Haven', year: '2022', format: '3d', medium: 'photogrammetry / GLB', statement: 'A spider conch, scanned. Nothing on this shelf was designed by anyone and this is the proof: ridges, spines and a polished inner lip, all of it grown rather than made.', modelUrl: '/models/futuroshock/lambis-shell.glb', materials: ['aragonite', 'polished aperture'], edition: 'shelf 14 / CC0', room: 'room-01', shelfSlot: 14, shelfScale: .84, textureNote: 'growth ridges, glossy inner lip' },
  { id: 'fs-opening-brass-vase', title: 'ornate mirror', author: 'James Ray Cock / Poly Haven', year: '2021', format: '3d', medium: 'photogrammetry / GLB', statement: 'A gilt frame around a working mirror: carved relief that catches the shelf strip along every edge, and a face that hands the rest of the room back to you. The only object here that shows what is standing opposite it.', modelUrl: '/models/futuroshock/ornate-mirror.glb', materials: ['gilt plaster', 'silvered glass'], edition: 'shelf 15 / CC0', room: 'room-01', shelfSlot: 15, shelfScale: .8, textureNote: 'gilt relief, mirrored face' },
  { id: 'fs-opening-orbit', title: 'iridescence lamp', author: 'Wayfair, LLC', year: '2022', format: '3d', medium: 'GLB / iridescent film', statement: 'A lamp whose shade shifts colour with the angle of the light. It is the piece that most rewards walking around the shelf rather than looking at it head on.', modelUrl: '/models/futuroshock/iridescence-lamp.glb', materials: ['iridescent film', 'blackened steel'], edition: 'shelf 05 / CC BY 4.0', room: 'room-01', shelfSlot: 5, shelfScale: .84, textureNote: 'thin-film iridescence' },
  { id: 'fs-opening-detail', title: 'glass vase with flowers', author: 'Khronos glTF Sample Assets', year: '2023', format: '3d', medium: 'GLB / transmission + volume', statement: 'Water, glass and stems in one volume. Refraction here is real geometry rather than a painted texture, which is why the stems bend where they enter the water.', modelUrl: '/models/futuroshock/glass-vase.glb', materials: ['clear glass', 'water', 'cut stems'], edition: 'shelf 06 / CC0', room: 'room-01', shelfSlot: 6, shelfScale: .86, textureNote: 'refraction through water' },
  { id: 'fs-opening-signal', title: 'iron lantern', author: 'Microsoft', year: '2017', format: '3d', medium: 'GLB / metallic-roughness', statement: 'A tall iron lantern, the vertical counterweight to the low dishes and cups around it. Its worn metal is the darkest surface on the shelf and sets the scale for everything beside it.', modelUrl: '/models/futuroshock/lantern.glb', materials: ['cast iron', 'aged brass', 'glass'], edition: 'shelf 07 / CC0', room: 'room-01', shelfSlot: 7, shelfScale: .78, textureNote: 'worn metal, glazed panes' },
  { id: 'fs-opening-afterimage', title: 'barn lamp', author: 'Wayfair, LLC', year: '2023', format: '3d', medium: 'GLB / anisotropic metal', statement: 'A brushed metal shade whose highlight stretches into a line instead of a point. It is quiet head on and turns sharp the moment the viewer moves around its edge.', modelUrl: '/models/futuroshock/barn-lamp.glb', materials: ['brushed steel', 'enamel'], edition: 'shelf 09 / CC BY 4.0', room: 'room-01', shelfSlot: 9, shelfScale: .8, textureNote: 'anisotropic brushed highlight' },
  { id: 'fs-opening-archive-fold', title: 'silk pouf', author: 'Wayfair, LLC', year: '2023', format: '3d', medium: 'GLB / specular sheen', statement: 'Woven silk with a sheen that runs across the weave rather than with it. The one soft body in a room of hard glaze, and the only piece that changes colour as it turns.', modelUrl: '/models/futuroshock/silk-pouf.glb', materials: ['woven silk', 'sheen'], edition: 'shelf 08 / CC BY 4.0', room: 'room-01', shelfSlot: 8, shelfScale: .82, textureNote: 'specular sheen across the weave' },
];

function ShelfPiece({ index, position }: { index: number; position: [number, number, number] }) {
  const pale = '#e4d7c1';
  const clay = '#b67445';
  const glass = '#9ebcad';
  if (index === 0) return <group position={position}><mesh position={[0, -.08, 0]} scale={[.72, 1.05, .72]}><sphereGeometry args={[.48, 40, 32]} /><meshPhysicalMaterial color={clay} roughness={.2} metalness={.15} /></mesh><mesh position={[0, .45, 0]}><cylinderGeometry args={[.16, .23, .56, 40]} /><meshStandardMaterial color="#58352b" roughness={.3} /></mesh></group>;
  if (index === 1) return <group position={position}><mesh position={[0, -.08, 0]}><cylinderGeometry args={[.38, .46, .16, 48]} /><meshStandardMaterial color="#251f1e" metalness={.72} roughness={.18} /></mesh><mesh position={[0, .15, 0]}><cylinderGeometry args={[.05, .05, .46, 24]} /><meshStandardMaterial color="#b08a55" metalness={.8} roughness={.2} /></mesh><mesh position={[0, .55, 0]}><sphereGeometry args={[.27, 36, 32]} /><meshPhysicalMaterial color="#ffe1a1" emissive="#f0a944" emissiveIntensity={1.4} roughness={.16} /></mesh><pointLight position={[0, .55, .2]} intensity={2.2} distance={2.8} color="#ffc56a" /></group>;
  if (index === 2) return <group position={position}><mesh rotation={[0, .22, 0]}><torusKnotGeometry args={[.32, .095, 130, 18]} /><meshStandardMaterial color="#b8b9b0" metalness={.84} roughness={.17} /></mesh><mesh position={[0, -.48, 0]}><cylinderGeometry args={[.34, .4, .12, 40]} /><meshStandardMaterial color="#1d2120" roughness={.36} /></mesh></group>;
  if (index === 3) return <group position={position}><mesh position={[-.22, 0, 0]} rotation={[0, -.12, .04]}><boxGeometry args={[.34, .82, .54]} /><meshStandardMaterial color="#9b4737" roughness={.5} /></mesh><mesh position={[.1, .03, .03]} rotation={[0, .08, -.03]}><boxGeometry args={[.28, .95, .56]} /><meshStandardMaterial color="#d0bc93" roughness={.48} /></mesh><mesh position={[.36, -.05, 0]} rotation={[0, .16, .02]}><boxGeometry args={[.2, .72, .5]} /><meshStandardMaterial color="#3e5754" roughness={.45} /></mesh></group>;
  if (index === 4) return <group position={position}><mesh scale={[.66, 1.16, .66]}><sphereGeometry args={[.42, 40, 32]} /><meshPhysicalMaterial color={glass} roughness={.08} transmission={.28} thickness={.35} /></mesh><mesh position={[0, .48, 0]}><cylinderGeometry args={[.12, .17, .5, 36]} /><meshPhysicalMaterial color={glass} roughness={.08} transmission={.28} thickness={.35} /></mesh></group>;
  if (index === 5) return <group position={position}><mesh position={[-.26, 0, 0]} rotation={[0, 0, -.25]}><coneGeometry args={[.28, 1.05, 5]} /><meshStandardMaterial color="#e3d7c1" roughness={.38} /></mesh><mesh position={[.24, -.08, 0]} rotation={[0, 0, .29]}><coneGeometry args={[.23, .86, 5]} /><meshStandardMaterial color="#b86c4a" roughness={.35} /></mesh></group>;
  if (index === 6) return <group position={position}><mesh><torusGeometry args={[.42, .12, 28, 80]} /><meshStandardMaterial color="#c9944f" metalness={.76} roughness={.18} /></mesh><mesh position={[0, 0, -.06]}><sphereGeometry args={[.18, 32, 32]} /><meshStandardMaterial color="#3f5350" roughness={.23} metalness={.46} /></mesh></group>;
  if (index === 7) return <group position={position}><mesh position={[0, -.12, 0]}><cylinderGeometry args={[.44, .5, .14, 48]} /><meshStandardMaterial color="#282724" metalness={.72} roughness={.18} /></mesh><mesh position={[0, .36, 0]} scale={[.74, 1.1, .74]}><sphereGeometry args={[.38, 40, 32]} /><meshStandardMaterial color="#d9d1c2" roughness={.2} metalness={.28} /></mesh></group>;
  return <group position={position}><mesh rotation={[.2, -.35, 0]}><torusKnotGeometry args={[.27, .08, 90, 16]} /><meshStandardMaterial color="#a53848" metalness={.56} roughness={.18} /></mesh><mesh position={[0, -.46, 0]}><cylinderGeometry args={[.3, .35, .12, 36]} /><meshStandardMaterial color="#25191b" roughness={.4} /></mesh></group>;
}

function ShelfArtwork({ url }: { url: string }) {
  const texture = useTexture(url);
  return <group><mesh position={[0, 0, -.04]}><boxGeometry args={[1.16, 1.08, .1]} /><meshStandardMaterial color="#1c1512" roughness={.35} /></mesh><mesh position={[0, 0, .03]}><planeGeometry args={[.98, .9]} /><meshBasicMaterial map={texture} toneMapped={false} /></mesh></group>;
}

function ShelfContent({ work, index, position, active, onSelect }: { work?: FuturoshockWork; index: number; position: [number, number, number]; active?: boolean; onSelect?: () => void }) {
  if (!work) return null;
  const canShowImage = Boolean(work.imageUrl && !work.id.startsWith('fs-opening'));
  return <group position={position} scale={(work.format === '3d' && work.modelUrl ? .5 : 1) * (work.shelfScale || 1)} onClick={(event) => { event.stopPropagation(); onSelect?.(); }}>
    {active && <mesh position={[0, 0, -.18]}><boxGeometry args={[1.9, 2.15, .02]} /><meshBasicMaterial color="#f0b16a" transparent opacity={.18} /></mesh>}
    {work.format === '3d' && work.modelUrl ? <Suspense fallback={<OpeningObject scene={work.openingScene} />}><Model url={work.modelUrl} /></Suspense> : canShowImage && work.imageUrl ? <ShelfArtwork url={work.imageUrl} /> : work.id.startsWith('fs-opening') ? <OpeningObject scene={work.openingScene} /> : <ShelfPiece index={index % 9} position={[0, 0, 0]} />}
  </group>;
}

function DisplayShelf({ works, selectedId, onSelect }: { works: FuturoshockWork[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const slots: [number, number, number][] = [[-4.65, 2.55, .55], [-2.33, 2.55, .55], [0, 2.55, .55], [2.33, 2.55, .55], [4.65, 2.55, .55], [-4.65, 0, .55], [-2.33, 0, .55], [0, 0, .55], [2.33, 0, .55], [4.65, 0, .55], [-4.65, -2.55, .55], [-2.33, -2.55, .55], [0, -2.55, .55], [2.33, -2.55, .55], [4.65, -2.55, .55]];
  const placed = new Map<number, FuturoshockWork>();
  works.slice(0, slots.length).forEach((work, index) => placed.set(work.shelfSlot || index + 1, work));
  return <div className="relative h-[72vw] min-h-[17rem] max-h-[22rem] overflow-hidden bg-[#17100d] sm:h-[clamp(25rem,62svh,42rem)] sm:min-h-[400px] sm:max-h-[42rem]" aria-label="Interactive Vitrine display shelf">
    <Canvas shadows camera={{ position: [0, .1, 18], fov: 28 }} dpr={[1, 1.35]} gl={{ antialias: false, powerPreference: 'high-performance' }}>
      <color attach="background" args={['#17100d']} />
      <fog attach="fog" args={['#17100d', 13, 25]} />
      <ambientLight intensity={.5} />
      <directionalLight position={[1, 7, 7]} intensity={2.4} color="#ffe0b3" />
      <spotLight castShadow position={[-5.4, 7.5, 6]} angle={.46} penumbra={.7} intensity={11} color="#ffd395" shadow-mapSize={[1024, 1024]} />
      <spotLight position={[5.2, 5.8, 5]} angle={.42} penumbra={.8} intensity={6} color="#ffc273" />
      <mesh position={[0, 0, -.42]} receiveShadow><boxGeometry args={[12.2, 8.7, .28]} /><meshStandardMaterial color="#c7b9a5" roughness={.76} /></mesh>
      <mesh position={[0, 0, -.26]}><boxGeometry args={[12.42, 8.92, .16]} /><meshStandardMaterial color="#321c13" roughness={.31} /></mesh>
      <mesh position={[0, 0, -.12]}><boxGeometry args={[11.92, 8.42, .1]} /><meshStandardMaterial color="#d9cfbd" roughness={.82} /></mesh>
      {[-6.02, -3.5, -1.17, 1.17, 3.5, 6.02].map((x) => <mesh key={`upright-${x}`} position={[x, 0, .02]} castShadow><boxGeometry args={[.22, 8.58, .74]} /><meshStandardMaterial color="#3a1f15" roughness={.3} metalness={.05} /></mesh>)}
      {[-4.14, -1.36, 1.36, 4.14].map((y) => <group key={`shelf-${y}`}><mesh position={[0, y, .17]} castShadow receiveShadow><boxGeometry args={[12.1, .2, .84]} /><meshStandardMaterial color="#58321f" roughness={.28} metalness={.04} /></mesh><mesh position={[0, y + .13, .58]}><boxGeometry args={[11.65, .03, .05]} /><meshStandardMaterial color="#ffd695" emissive="#f0ad56" emissiveIntensity={1.75} /></mesh><pointLight position={[0, y + .1, 1.7]} intensity={5} distance={5.5} color="#ffc06d" /></group>)}
      {slots.map((position, index) => { const work = placed.get(index + 1); return <ShelfContent key={index} work={work} index={index} position={position} active={work?.id === selectedId} onSelect={work ? () => onSelect(work.id) : undefined} />; })}
      <mesh position={[0, -4.3, 1.3]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[26, 16]} /><meshStandardMaterial color="#100c0a" roughness={.9} /></mesh>
      <ContactShadows position={[0, -4.02, .6]} opacity={.5} scale={15} blur={2.7} far={8} />
      <Environment preset="warehouse" />
      <OrbitControls target={[0, 0, 0]} enableZoom={false} enablePan={false} minDistance={14} maxDistance={22} minPolarAngle={1.12} maxPolarAngle={1.55} />
    </Canvas>
  </div>;
}

export function FuturoshockPage() {
  const [works, setWorks] = useState<FuturoshockWork[]>(() => getFuturoshock().length ? getFuturoshock() : OPENING_WORKS);
  const [selectedId, setSelectedId] = useState<string | null>(() => { const exhibition = getFuturoshock().length ? getFuturoshock() : OPENING_WORKS; return exhibition.find((work) => work.format === '3d')?.id ?? exhibition[0]?.id ?? null; });
  const selected = useMemo(() => works.find((work) => work.id === selectedId) ?? works[0] ?? null, [works, selectedId]);
  const selectWork = (id: string) => setSelectedId(id);

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
    if (!works.some((work) => work.id === selectedId)) setSelectedId(works[0]?.id ?? null);
  }, [selectedId, works]);

  useEffect(() => {
    document.title = 'Vitrine | EPRIS Journal';
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!description) { description = document.createElement('meta'); description.name = 'description'; document.head.appendChild(description); }
    description.content = 'A changing EPRIS vitrine of digital objects, viewed in context.';
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = 'https://eprisjournal.com/vitrine';
  }, []);

  return (
    <main className="min-h-screen bg-[var(--c-bg)] pt-16 text-[var(--c-accent)] selection:bg-[var(--c-gold)] selection:text-[var(--c-bg)]">
      <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-[var(--c-accent)] bg-[rgb(var(--c-bg-rgb)_/_0.94)] backdrop-blur-xl">
        <div className="mx-auto grid h-full max-w-[1700px] grid-cols-[1fr_auto_1fr] items-center px-3 sm:px-6 lg:px-12">
          <a href="/" className="inline-flex min-h-11 items-center justify-self-start gap-2 font-mono text-[10px] uppercase tracking-[0.16em] transition hover:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--c-accent)]"><ArrowLeft size={14} aria-hidden="true" /> <span className="hidden sm:inline">EPRIS Journal</span><span className="sm:hidden">EPRIS</span></a>
          <a href="/vitrine" aria-current="page" className="font-mono text-[11px] uppercase tracking-[0.22em]">Vitrine</a>
          <a href="/bureau" className="inline-flex min-h-11 items-center justify-self-end gap-2 font-mono text-[10px] uppercase tracking-[0.16em] transition hover:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--c-accent)]"><span className="hidden sm:inline">Bureau</span><ArrowUpRight size={14} aria-hidden="true" /></a>
        </div>
      </header>

      <section aria-labelledby="vitrine-title" className="border-b border-[rgb(var(--c-accent-rgb)_/_0.18)]">
        <div className="mx-auto max-w-[1700px] px-5 pb-8 pt-10 sm:px-8 sm:pb-10 lg:px-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--c-gold)]">EPRIS Vitrine</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h1 id="vitrine-title" className="font-display text-[clamp(2.75rem,7vw,6rem)] leading-[0.88]">Vitrine</h1>
            <p className="max-w-[34rem] text-sm leading-relaxed text-[rgb(var(--c-accent-rgb)_/_0.72)] sm:text-base">A changing selection of digital objects, viewed in context.</p>
          </div>
        </div>
        <div className="mx-auto max-w-[1700px] px-5 pb-5 sm:px-8 lg:px-12"><DisplayShelf works={works} selectedId={selected?.id ?? null} onSelect={selectWork} /></div>
      </section>

      <section id="shelf-inventory" aria-labelledby="on-view-title" className="mx-auto max-w-[1700px] px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(19rem,.65fr)] lg:items-start lg:gap-12">
          <div>
            <div className="flex items-baseline justify-between gap-4 border-b border-[rgb(var(--c-accent-rgb)_/_0.22)] pb-4">
              <h2 id="on-view-title" className="font-display text-3xl sm:text-4xl">On view</h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[rgb(var(--c-accent-rgb)_/_0.62)]">{works.length} works</span>
            </div>
            <div className="mt-4 grid border-l border-t border-[rgb(var(--c-accent-rgb)_/_0.16)] sm:grid-cols-2">
              {works.map((work, index) => {
                const slot = work.shelfSlot || index + 1;
                const active = selected?.id === work.id;
                return <button key={work.id} type="button" onClick={() => selectWork(work.id)} aria-pressed={active} aria-controls="object-details" className={`group flex min-h-24 items-center gap-4 border-b border-r border-[rgb(var(--c-accent-rgb)_/_0.16)] p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--c-gold)] sm:p-5 ${active ? 'bg-[rgb(var(--c-gold-rgb)_/_0.14)]' : 'hover:bg-[rgb(var(--c-accent-rgb)_/_0.05)]'}`}>
                  <span className="font-mono text-[10px] tracking-[0.12em] text-[var(--c-gold)]">{String(slot).padStart(2, '0')}</span>
                  <span className="min-w-0"><span className="block font-display text-xl leading-tight">{work.title}</span><span className="mt-1 block truncate font-mono text-[9px] uppercase tracking-[0.12em] text-[rgb(var(--c-accent-rgb)_/_0.62)]">{work.materials?.join(' / ') || work.medium}</span></span>
                </button>;
              })}
            </div>
          </div>

          {selected && <aside id="object-details" aria-live="polite" className="border-t-2 border-[var(--c-gold)] bg-[rgb(var(--c-accent-rgb)_/_0.045)] p-5 sm:p-7 lg:sticky lg:top-24">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--c-gold)]">Selected work</p>
            <h2 className="mt-4 font-display text-[clamp(2.25rem,4vw,4rem)] leading-[0.92]">{selected.title}</h2>
            <p className="mt-4 text-sm leading-relaxed text-[rgb(var(--c-accent-rgb)_/_0.74)]">{selected.author} · {selected.year}</p>
            <p className="mt-5 border-t border-[rgb(var(--c-accent-rgb)_/_0.18)] pt-5 text-sm leading-relaxed">{selected.materials?.join(', ') || selected.medium}</p>
            {selected.statement && <details className="group mt-6 border-t border-[rgb(var(--c-accent-rgb)_/_0.18)] pt-4"><summary className="cursor-pointer list-none font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--c-accent)] transition hover:text-[var(--c-gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--c-gold)]"><span className="group-open:hidden">Read curatorial note</span><span className="hidden group-open:inline">Close curatorial note</span></summary><p className="mt-4 text-sm leading-relaxed text-[rgb(var(--c-accent-rgb)_/_0.74)]">{selected.statement}</p></details>}
          </aside>}
        </div>
      </section>
    </main>
  );
}
