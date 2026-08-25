import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import { BufferAttribute, BufferGeometry, CatmullRomCurve3, DoubleSide, Vector2, Vector3 } from 'three';
import type { Group } from 'three';

/* ЗДАНИЕ МУЗЕЯ, СОБРАННОЕ КОДОМ, А НЕ ЗАГРУЖЕННОЕ ФАЙЛОМ.
 *
 * Коллекция пока пуста, и страница музея не должна быть пустым местом с
 * подписью «скоро». Здесь стоит сам музей: макет здания органической
 * архитектуры — форма, которая растёт снизу вверх одним объёмом, с талией,
 * наружным пандусом и окулюсом наверху, вместо коробки с фасадом.
 *
 * Геометрия параметрическая: ни одного .glb, ни одной текстуры, ни одного
 * внешнего запроса. Это несколько килобайт кода вместо мегабайтов модели, и
 * форму можно править числами, а не пересобирать в редакторе.
 *
 * three и fiber уже стоят в проекте ради /stage, а VitrinePage грузится через
 * lazy(), поэтому вес остаётся в чанке музея и на главную не попадает.
 */

const PLASTER = '#f1eee9';   // гипс: чуть теплее белого фона, иначе объём пропадает
const PLASTER_DEEP = '#e6e1da';
const INK = '#111111';
const GOLD = '#c9a690';

/* Силуэт башни: пары «радиус, высота». Между узлами идёт кривая, а не прямая,
   поэтому переходы получаются перетекающими — это и отличает органическую
   форму от конуса, набранного отрезками. */
const SILHOUETTE: [number, number][] = [
  [7.70, 0.00],
  [7.62, 0.55],
  [7.10, 2.20],
  [6.40, 4.10],
  [5.86, 6.30],
  [5.74, 7.60],
  [6.02, 9.40],
  [5.86, 11.00],
  [5.10, 12.90],
  [4.00, 14.60],
  [2.86, 15.80],
  [2.10, 16.40],
  [1.72, 16.66],
];

function useSilhouette() {
  return useMemo(() => {
    const curve = new CatmullRomCurve3(SILHOUETTE.map(([r, y]) => new Vector3(r, y, 0)), false, 'catmullrom', 0.4);
    const sampled = curve.getSpacedPoints(72);
    const points = sampled.map((p) => new Vector2(Math.max(p.x, 0.02), p.y));
    const radiusAt = (y: number) => {
      let closest = points[0];
      for (const p of points) if (Math.abs(p.y - y) < Math.abs(closest.y - y)) closest = p;
      return closest.x;
    };
    return { points, radiusAt, top: points[points.length - 1].y };
  }, []);
}

/* Лента постоянной ширины вдоль кривой: пандус, а не труба. TubeGeometry даёт
   круглое сечение и читается как провод, поэтому сечение прямоугольное и
   собирается вручную — четыре угла на каждом шаге, сшитые в замкнутый профиль. */
function ribbonGeometry(curve: CatmullRomCurve3, samples: number, width: number, thickness: number) {
  const points = curve.getSpacedPoints(samples);
  const positions: number[] = [];
  const indices: number[] = [];
  const up = new Vector3(0, 1, 0);
  const tangent = new Vector3();
  const side = new Vector3();

  points.forEach((point, index) => {
    const next = points[Math.min(index + 1, points.length - 1)];
    const prev = points[Math.max(index - 1, 0)];
    tangent.subVectors(next, prev).normalize();
    side.crossVectors(tangent, up).normalize().multiplyScalar(width / 2);
    const half = thickness / 2;
    positions.push(
      point.x + side.x, point.y + half, point.z + side.z,
      point.x - side.x, point.y + half, point.z - side.z,
      point.x - side.x, point.y - half, point.z - side.z,
      point.x + side.x, point.y - half, point.z + side.z,
    );
  });

  for (let i = 0; i < points.length - 1; i += 1) {
    const a = i * 4;
    const b = (i + 1) * 4;
    for (let corner = 0; corner < 4; corner += 1) {
      const nextCorner = (corner + 1) % 4;
      indices.push(a + corner, b + corner, b + nextCorner, a + corner, b + nextCorner, a + nextCorner);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function Building() {
  const { points, radiusAt, top } = useSilhouette();

  /* Наружный пандус: поднимается на два с четвертью оборота и по дороге
     подбирается ближе к телу здания — так он выглядит выросшим из объёма,
     а не надетым на него кольцом. */
  const ramp = useMemo(() => {
    const samples: Vector3[] = [];
    const steps = 180;
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const angle = t * 2.25 * Math.PI * 2;
      const radius = 8.55 - t * 2.35;
      const y = 0.55 + t * 12.4;
      samples.push(new Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius));
    }
    return ribbonGeometry(new CatmullRomCurve3(samples), 190, 1.45, 0.2);
  }, []);

  /* Козырёк входа: короткая дуга у земли, вынесенная от стены. */
  const canopy = useMemo(() => {
    const samples: Vector3[] = [];
    const steps = 48;
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const angle = -0.62 + t * 1.24;
      const radius = 8.9 + Math.sin(t * Math.PI) * 1.5;
      samples.push(new Vector3(Math.cos(angle) * radius, 3.35 + Math.sin(t * Math.PI) * 0.28, Math.sin(angle) * radius));
    }
    return ribbonGeometry(new CatmullRomCurve3(samples), 60, 2.6, 0.16);
  }, []);

  /* Ленты остекления идут по самому силуэту: радиус каждой берётся из профиля
     на её высоте, поэтому щели лежат на поверхности, а не висят рядом. */
  const glazing = useMemo(() => [3.1, 5.4, 7.8, 10.2, 12.4].map((y) => ({ y, radius: radiusAt(y) + 0.03 })), [radiusAt]);

  return (
    <group position={[0, -7.5, 0]}>
      <mesh castShadow receiveShadow>
        <latheGeometry args={[points, 128]} />
        <meshStandardMaterial color={PLASTER} roughness={0.86} metalness={0.02} side={DoubleSide} />
      </mesh>

      {/* Окулюс: тёмный диск в устье башни — свет, который здание берёт сверху */}
      <mesh position={[0, top - 0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.72, 64]} />
        <meshStandardMaterial color={INK} roughness={0.35} metalness={0.1} opacity={0.82} transparent />
      </mesh>
      <mesh position={[0, top, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.7, 2.06, 64]} />
        <meshStandardMaterial color={PLASTER_DEEP} roughness={0.8} side={DoubleSide} />
      </mesh>

      <mesh geometry={ramp} castShadow receiveShadow>
        <meshStandardMaterial color={PLASTER_DEEP} roughness={0.8} metalness={0.02} />
      </mesh>

      <mesh geometry={canopy} castShadow>
        <meshStandardMaterial color={PLASTER_DEEP} roughness={0.8} metalness={0.02} />
      </mesh>

      {glazing.map(({ y, radius }) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius, 0.085, 8, 96]} />
          <meshStandardMaterial color={INK} roughness={0.4} metalness={0.08} opacity={0.5} transparent />
        </mesh>
      ))}

      {/* Стилобат: здание стоит не на пустоте, а на своей площадке */}
      <mesh position={[0, -0.22, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[10.4, 10.8, 0.44, 96]} />
        <meshStandardMaterial color={PLASTER_DEEP} roughness={0.9} />
      </mesh>
    </group>
  );
}

/* Горизонтали участка — как на разрезе местности в проекте. Дают земле масштаб,
   не превращая её в текстуру. */
function SiteContours() {
  const rings = useMemo(() => [13.4, 16.2, 19.4, 23.2], []);
  return (
    <group position={[0, -7.72, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {rings.map((radius, index) => (
        <mesh key={radius} position={[0, 0, 0.001 * index]}>
          <ringGeometry args={[radius, radius + 0.045, 128]} />
          <meshBasicMaterial color={GOLD} transparent opacity={0.42 - index * 0.08} side={DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function Turntable({ still, children }: { still: boolean; children: React.ReactNode }) {
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    if (still || !group.current) return;
    group.current.rotation.y += delta * 0.085;
  });
  return <group ref={group}>{children}</group>;
}

function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch {
    return false;
  }
}

export function MuseumModel({ label }: { label: string }) {
  /* Автоповорот — украшение, а не содержание: при системной просьбе убрать
     движение сцена замирает, но остаётся управляемой мышью. */
  const still = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);

  if (typeof window !== 'undefined' && !hasWebGL()) {
    return <div className="flex h-full w-full items-center justify-center bg-[#f6f4f1]" role="img" aria-label={label} />;
  }

  return (
    <div className="h-full w-full cursor-grab active:cursor-grabbing" role="img" aria-label={label}>
      <Canvas
        shadows
        camera={{ position: [17, 9.5, 20], fov: 34 }}
        dpr={[1, 1.6]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <hemisphereLight args={['#ffffff', '#dcd6ce', 0.72]} />
        <directionalLight
          position={[12, 18, 9]}
          intensity={1.55}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-22}
          shadow-camera-right={22}
          shadow-camera-top={22}
          shadow-camera-bottom={-22}
        />
        <directionalLight position={[-14, 7, -10]} intensity={0.42} />

        <Suspense fallback={null}>
          <Turntable still={still}>
            <Building />
            <SiteContours />
            <ContactShadows position={[0, -7.74, 0]} opacity={0.36} scale={44} blur={2.6} far={16} resolution={512} color="#6f6a63" />
          </Turntable>
        </Suspense>

        {/* Колесо не перехватывается: страница должна прокручиваться под курсором,
            а не масштабировать макет. Крутить можно перетаскиванием. */}
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 5}
          maxPolarAngle={Math.PI / 2.12}
          rotateSpeed={0.55}
        />
      </Canvas>
    </div>
  );
}
