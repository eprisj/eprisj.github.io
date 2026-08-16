import { Canvas } from '@react-three/fiber';
import { ContactShadows, OrbitControls, Environment, useGLTF, useTexture } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { ArrowLeft, ArrowUpRight, Box, Image as ImageIcon, Upload } from 'lucide-react';
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
   so this is no longer what the exhibition is made of — it stays for two jobs:
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
  { id: 'fs-opening-light', title: 'labelled bottle', author: 'Khronos glTF Sample Assets', year: '2017', format: '3d', medium: 'GLB / metallic-roughness', statement: 'A closed vessel with a printed label and a brushed cap. It holds the left side of the shelf and gives the eye a matte surface between two glass pieces.', modelUrl: '/models/futuroshock/water-bottle.glb', materials: ['coated plastic', 'brushed metal'], edition: 'shelf 04 / CC0', room: 'room-01', shelfSlot: 4, shelfScale: .8, textureNote: 'matte label, brushed cap' },
  { id: 'fs-opening-orbit', title: 'iridescence lamp', author: 'Wayfair, LLC', year: '2022', format: '3d', medium: 'GLB / iridescent film', statement: 'A lamp whose shade shifts colour with the angle of the light. It is the piece that most rewards walking around the shelf rather than looking at it head on.', modelUrl: '/models/futuroshock/iridescence-lamp.glb', materials: ['iridescent film', 'blackened steel'], edition: 'shelf 05 / CC BY 4.0', room: 'room-01', shelfSlot: 5, shelfScale: .84, textureNote: 'thin-film iridescence' },
  { id: 'fs-opening-detail', title: 'glass vase with flowers', author: 'Khronos glTF Sample Assets', year: '2023', format: '3d', medium: 'GLB / transmission + volume', statement: 'Water, glass and stems in one volume. Refraction here is real geometry rather than a painted texture, which is why the stems bend where they enter the water.', modelUrl: '/models/futuroshock/glass-vase.glb', materials: ['clear glass', 'water', 'cut stems'], edition: 'shelf 06 / CC0', room: 'room-01', shelfSlot: 6, shelfScale: .86, textureNote: 'refraction through water' },
  { id: 'fs-opening-signal', title: 'iron lantern', author: 'Microsoft', year: '2017', format: '3d', medium: 'GLB / metallic-roughness', statement: 'A tall iron lantern, the vertical counterweight to the low dishes and cups around it. Its worn metal is the darkest surface on the shelf and sets the scale for everything beside it.', modelUrl: '/models/futuroshock/lantern.glb', materials: ['cast iron', 'aged brass', 'glass'], edition: 'shelf 07 / CC0', room: 'room-01', shelfSlot: 7, shelfScale: .78, textureNote: 'worn metal, glazed panes' },
  { id: 'fs-opening-afterimage', title: 'barn lamp', author: 'Wayfair, LLC', year: '2023', format: '3d', medium: 'GLB / anisotropic metal', statement: 'A brushed metal shade whose highlight stretches into a line instead of a point. It is quiet head on and turns sharp the moment the viewer moves around its edge.', modelUrl: '/models/futuroshock/barn-lamp.glb', materials: ['brushed steel', 'enamel'], edition: 'shelf 09 / CC BY 4.0', room: 'room-01', shelfSlot: 9, shelfScale: .8, textureNote: 'anisotropic brushed highlight' },
  { id: 'fs-opening-archive-fold', title: 'silk pouf', author: 'Wayfair, LLC', year: '2023', format: '3d', medium: 'GLB / specular sheen', statement: 'Woven silk with a sheen that runs across the weave rather than with it. The one soft body in a room of hard glaze, and the only piece that changes colour as it turns.', modelUrl: '/models/futuroshock/silk-pouf.glb', materials: ['woven silk', 'sheen'], edition: 'shelf 08 / CC BY 4.0', room: 'room-01', shelfSlot: 8, shelfScale: .82, textureNote: 'specular sheen across the weave' },
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

function DisplayShelf({ works, activeRoom, selectedId, onSelect }: { works: FuturoshockWork[]; activeRoom: RoomId; selectedId: string | null; onSelect: (id: string) => void }) {
  const accent = activeRoom === 'room-03' ? '#d2495f' : activeRoom === 'room-02' ? '#d4e3dd' : '#ffc273';
  const slots: [number, number, number][] = [[-4.65, 2.55, .55], [-2.33, 2.55, .55], [0, 2.55, .55], [2.33, 2.55, .55], [4.65, 2.55, .55], [-4.65, 0, .55], [-2.33, 0, .55], [0, 0, .55], [2.33, 0, .55], [4.65, 0, .55], [-4.65, -2.55, .55], [-2.33, -2.55, .55], [0, -2.55, .55], [2.33, -2.55, .55], [4.65, -2.55, .55]];
  const placed = new Map<number, FuturoshockWork>();
  works.filter((work) => (work.room || 'room-01') === activeRoom).forEach((work, index) => placed.set(work.shelfSlot || index + 1, work));
  return <div className="relative h-[calc(100svh-72px)] min-h-[620px] max-h-[920px] overflow-hidden bg-[#17100d]" aria-label="Interactive Futuroshock display shelf">
    <Canvas shadows camera={{ position: [0, .1, 18], fov: 28 }} dpr={[1, 1.5]}>
      <color attach="background" args={['#17100d']} />
      <fog attach="fog" args={['#17100d', 13, 25]} />
      <ambientLight intensity={.5} />
      <directionalLight position={[1, 7, 7]} intensity={2.4} color="#ffe0b3" />
      <spotLight castShadow position={[-5.4, 7.5, 6]} angle={.46} penumbra={.7} intensity={11} color="#ffd395" shadow-mapSize={[1024, 1024]} />
      <spotLight position={[5.2, 5.8, 5]} angle={.42} penumbra={.8} intensity={6} color={accent} />
      <mesh position={[0, 0, -.42]} receiveShadow><boxGeometry args={[12.2, 8.7, .28]} /><meshStandardMaterial color="#c7b9a5" roughness={.76} /></mesh>
      <mesh position={[0, 0, -.26]}><boxGeometry args={[12.42, 8.92, .16]} /><meshStandardMaterial color="#321c13" roughness={.31} /></mesh>
      <mesh position={[0, 0, -.12]}><boxGeometry args={[11.92, 8.42, .1]} /><meshStandardMaterial color="#d9cfbd" roughness={.82} /></mesh>
      {[-6.02, -3.5, -1.17, 1.17, 3.5, 6.02].map((x) => <mesh key={`upright-${x}`} position={[x, 0, .02]} castShadow><boxGeometry args={[.22, 8.58, .74]} /><meshStandardMaterial color="#3a1f15" roughness={.3} metalness={.05} /></mesh>)}
      {[-4.14, -1.36, 1.36, 4.14].map((y) => <group key={`shelf-${y}`}><mesh position={[0, y, .17]} castShadow receiveShadow><boxGeometry args={[12.1, .2, .84]} /><meshStandardMaterial color="#58321f" roughness={.28} metalness={.04} /></mesh><mesh position={[0, y + .13, .58]}><boxGeometry args={[11.65, .03, .05]} /><meshStandardMaterial color="#ffd695" emissive="#f0ad56" emissiveIntensity={1.75} /></mesh><pointLight position={[0, y + .1, 1.7]} intensity={5} distance={5.5} color="#ffc06d" /></group>)}
      {slots.map((position, index) => { const work = placed.get(index + 1); return <ShelfContent key={index} work={work} index={index} position={position} active={work?.id === selectedId} onSelect={work ? () => onSelect(work.id) : undefined} />; })}
      <mesh position={[0, -4.3, 1.3]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[26, 16]} /><meshStandardMaterial color="#100c0a" roughness={.9} /></mesh>
      <ContactShadows position={[0, -4.02, .6]} opacity={.5} scale={15} blur={2.7} far={8} />
      <Environment preset="warehouse" />
      <OrbitControls target={[0, 0, 0]} enablePan={false} minDistance={14} maxDistance={22} minPolarAngle={1.12} maxPolarAngle={1.55} />
    </Canvas>
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
      </div>
    );
  }
  return (
    <div className="relative h-full min-h-[360px] overflow-hidden bg-[#e6ded2]">
      {work.imageUrl ? <img src={work.imageUrl} alt={work.title} className={`h-full w-full object-cover transition duration-700 ${lightMode === 'contrejour' ? 'scale-[1.02] saturate-[.44] contrast-[1.34] brightness-[.56]' : ''}`} /> : <div className="grid h-full place-items-center text-[#282321]/40"><ImageIcon size={42} /></div>}
      {lightMode === 'contrejour' && <><div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(3,6,6,.82),transparent_56%,rgba(3,6,6,.48))]" /><div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-[43%] top-0 w-[18%] -skew-x-[7deg] bg-[linear-gradient(90deg,transparent,rgba(255,230,187,.34),transparent)] blur-xl" /></>}
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
  const [selectedId, setSelectedId] = useState<string | null>(() => { const exhibition = getFuturoshock().length ? getFuturoshock() : OPENING_WORKS; return exhibition.find((work) => work.format === '3d')?.id ?? exhibition[0]?.id ?? null; });
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [activeRoom, setActiveRoom] = useState<RoomId>('room-01');
  const visibleWorks = useMemo(() => works.filter((work) => (work.room || 'room-01') === activeRoom), [works, activeRoom]);
  const selected = useMemo(() => works.find((work) => work.id === selectedId) ?? works[0] ?? null, [works, selectedId]);
  const [lightMode, setLightMode] = useState<LightMode>('warm');
  const selectWork = (id: string) => {
    setSelectedId(id);
    setFocusedId(id);
    window.setTimeout(() => document.getElementById('object-dossier')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };

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

  return (
    <main className="min-h-screen bg-[#0b0e0f] text-[#f6efe5] selection:bg-[#ee5e42] selection:text-[#0b0e0f]">
      <header className="sticky top-0 z-30 border-b border-white/12 bg-[#0b0e0f]/92 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[72px] max-w-[1700px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
          <a href="/" className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/58 hover:text-white"><ArrowLeft size={14} /> EPRIS Journal</a>
          <a href="/futuroshock" className="font-display text-[21px] lowercase leading-none tracking-normal">futuroshock</a>
          <a href="/bureau" className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/58 hover:text-white">Bureau <ArrowUpRight size={13} /></a>
        </div>
      </header>

      <section className="border-b border-white/12"><DisplayShelf works={works} activeRoom={activeRoom} selectedId={focusedId} onSelect={selectWork} /></section>

      <section className="mx-auto max-w-[1700px] px-5 py-14 sm:px-8 sm:py-20 lg:px-12">
        <div className="flex items-end justify-between border-b border-white/15 pb-5"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-[#ee9f7d]">shelf inventory</p><h2 className="mt-3 font-display text-[clamp(2.8rem,5vw,5.2rem)] lowercase leading-[.86]">what is on view</h2></div><span className="hidden font-mono text-[10px] uppercase tracking-[.15em] text-white/40 sm:block">15 positions / live edit</span></div>
        <div className="grid border-l border-t border-white/15 sm:grid-cols-2 lg:grid-cols-3">{works.map((work, index) => { const slot = work.shelfSlot || index + 1; return <button key={work.id} type="button" onClick={() => selectWork(work.id)} className={`min-h-[300px] border-b border-r border-white/15 p-6 text-left transition hover:bg-white/[.045] sm:p-8 ${selected?.id === work.id ? 'bg-[#171514]' : ''}`}><div className="flex items-start justify-between gap-4"><span className="font-display text-4xl leading-none text-[#ee9f7d]">{String(slot).padStart(2, '0')}</span><span className="font-mono text-[9px] uppercase tracking-[.16em] text-white/42">{work.format === '3d' ? 'object / 3D' : 'image / 2D'}</span></div><h3 className="mt-12 font-display text-[clamp(2rem,3vw,3.25rem)] lowercase leading-[.86] text-[#f6efe5]">{work.title}</h3><p className="mt-5 max-w-[34rem] font-sans text-sm leading-[1.65] text-white/62">{work.statement}</p><div className="mt-7 border-t border-white/12 pt-4 font-mono text-[9px] uppercase leading-[1.65] tracking-[.13em] text-[#f0c28c]">{work.materials?.join(' / ') || work.medium}</div></button>; })}</div>
        {selected && <section id="object-dossier" className="mt-10 grid overflow-hidden border border-white/15 bg-[#151313] lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]"><div className="min-h-[440px] border-b border-white/12 lg:border-b-0 lg:border-r"><WorkPreview work={selected} lightMode={lightMode} /></div><div className="flex flex-col justify-between p-6 sm:p-9"><div><p className="font-mono text-[10px] uppercase tracking-[.17em] text-[#ee9f7d]">selected object / rotate freely</p><h3 className="mt-5 font-display text-[clamp(3rem,5vw,5.8rem)] lowercase leading-[.82]">{selected.title}</h3><p className="mt-7 max-w-[34rem] font-sans text-[16px] leading-[1.7] text-white/68">{selected.statement}</p><dl className="mt-9 grid grid-cols-2 gap-x-5 gap-y-6 border-t border-white/14 pt-5 font-mono text-[9px] uppercase tracking-[.13em]"><div><dt className="text-white/35">surface</dt><dd className="mt-2 leading-[1.55] text-[#f0c28c]">{selected.materials?.join(' / ') || selected.medium}</dd></div><div><dt className="text-white/35">medium</dt><dd className="mt-2 leading-[1.55] text-white/72">{selected.medium}</dd></div><div><dt className="text-white/35">author</dt><dd className="mt-2 leading-[1.55] text-white/72">{selected.author}</dd></div><div><dt className="text-white/35">position</dt><dd className="mt-2 leading-[1.55] text-white/72">shelf {String(selected.shelfSlot || works.indexOf(selected) + 1).padStart(2, '0')}</dd></div></dl></div><span className="mt-9 font-mono text-[9px] uppercase tracking-[.16em] text-white/42">drag to rotate / scroll to inspect</span></div></section>}
      </section>

      <section className="border-t border-white/12 bg-[#f1e9df] text-[#171313]"><div className="mx-auto grid max-w-[1700px] gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[.8fr_1.2fr] lg:px-12"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-[#a63d2c]">02 / submission logic</p><h2 className="mt-5 max-w-[8ch] font-display text-[clamp(3rem,6vw,6rem)] lowercase leading-[.82]">make it impossible to scroll past</h2></div><div className="grid gap-0 border-t border-[#171313]/18"><div className="grid gap-4 border-b border-[#171313]/18 py-6 sm:grid-cols-[5rem_1fr]"><span className="font-display text-3xl text-[#a63d2c]">01</span><p className="max-w-[38rem] font-sans text-base leading-relaxed">Send one strong cover image and, when available, a clean GLB or GLTF model. The work should survive both a quiet thumbnail and a full-screen view.</p></div><div className="grid gap-4 border-b border-[#171313]/18 py-6 sm:grid-cols-[5rem_1fr]"><span className="font-display text-3xl text-[#a63d2c]">02</span><p className="max-w-[38rem] font-sans text-base leading-relaxed">Add the actual material vocabulary: light, scale, surface, object, route. Futuroshock is not a portfolio dump; it is a room with editorial attention.</p></div><div className="grid gap-4 py-6 sm:grid-cols-[5rem_1fr]"><span className="font-display text-3xl text-[#a63d2c]">03</span><p className="max-w-[38rem] font-sans text-base leading-relaxed">The editorial team checks file quality, rights and context before publishing. Selected works can link back to an EPRIS article, review or Bureau case.</p></div></div></div></section>
    </main>
  );
}
