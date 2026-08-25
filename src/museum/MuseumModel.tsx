import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import { BufferAttribute, BufferGeometry, CatmullRomCurve3, DoubleSide, ExtrudeGeometry, Shape, Vector2, Vector3 } from 'three';
import type { Group, PerspectiveCamera } from 'three';

/* ЗДАНИЕ МУЗЕЯ, СОБРАННОЕ КОДОМ, А НЕ ЗАГРУЖЕННОЕ ФАЙЛОМ.
 *
 * Коллекция пока пуста, и страница музея не должна быть пустым местом с
 * подписью «скоро». Здесь стоит сам музей — макет в духе органической
 * архитектуры, собранный из четырёх ходов:
 *
 *   1. низкое крыло со свободным планом — залы, лежащие по земле;
 *   2. второе крыло поменьше, повёрнутое относительно первого;
 *   3. ротонда с ленточным окном и окулюсом наверху;
 *   4. наружный пандус, который дважды обходит ротонду.
 *
 * Форма собрана из объёмов, а не из одного тела вращения: одиночный лате
 * читается как сосуд, а здание узнаётся по тому, что у него есть основание,
 * вертикаль и вход. Опоры под консолью крыла дают масштаб — без них макет
 * может быть чем угодно, от пепельницы до башни.
 *
 * Геометрия параметрическая: ни одного .glb, ни одной текстуры, ни одного
 * внешнего запроса. Несколько килобайт кода вместо мегабайтов модели, и форму
 * правят числами, а не пересобирают в редакторе. three и fiber уже стоят в
 * проекте ради /stage, а страница грузится через lazy(), поэтому вес остаётся
 * в чанке музея и на главную не попадает.
 */

const PLASTER = '#f4f1ec';        // гипс: теплее фона страницы, иначе объём пропадает
const PLASTER_DEEP = '#e8e3db';   // плиты и пандус — на полтона глубже тела
const PLASTER_SHADE = '#ddd7cd';
const GLASS = '#2b2a28';
const GOLD = '#c9a690';

const WING_TOP = 5.0;             // верх нижнего крыла — на нём стоит всё остальное
const UPPER_TOP = 8.6;            // верх второго крыла
const DRUM_TOP = 19.4;

/* Свободный план: радиусы по кругу, между ними — сглаживание. Именно неровный
   контур отличает органическую архитектуру от цилиндра: план ведёт рельеф и
   маршрут, а не циркуль. */
function organicShape(radii: number[], steps = 128) {
  const points: Vector2[] = [];
  const n = radii.length;
  for (let i = 0; i < steps; i += 1) {
    const t = i / steps;
    const position = t * n;
    const i0 = Math.floor(position) % n;
    const i1 = (i0 + 1) % n;
    const k = position - Math.floor(position);
    const smooth = (1 - Math.cos(k * Math.PI)) / 2;
    const radius = radii[i0] * (1 - smooth) + radii[i1] * smooth;
    const angle = t * Math.PI * 2;
    points.push(new Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius));
  }
  const shape = new Shape(points);
  shape.closePath();
  return shape;
}

function slabGeometry(radii: number[], height: number, bevel = 0.34) {
  const geometry = new ExtrudeGeometry(organicShape(radii), {
    depth: height - bevel * 2,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 4,
    curveSegments: 24,
  });
  // ExtrudeGeometry растёт по Z; кладём плиту на землю и поднимаем на толщину фаски
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, height - bevel, 0);
  return geometry;
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

/* Профиль ротонды: слегка утянут в поясе и раскрыт кверху. Радиус нужен и
   пандусу, поэтому считается функцией, а не рисуется на глаз. */
const DRUM_BASE = 3.55;
function drumRadius(y: number) {
  const t = Math.min(Math.max((y - WING_TOP) / (DRUM_TOP - WING_TOP), 0), 1);
  return DRUM_BASE - Math.sin(t * Math.PI) * 0.42 + t * 0.55;
}

function drumProfile() {
  const points: Vector2[] = [];
  const steps = 48;
  for (let i = 0; i <= steps; i += 1) {
    const y = WING_TOP + ((DRUM_TOP - WING_TOP) * i) / steps;
    points.push(new Vector2(drumRadius(y), y));
  }
  // мягкий завал кровли к окулюсу
  points.push(new Vector2(drumRadius(DRUM_TOP) - 0.5, DRUM_TOP + 0.5));
  points.push(new Vector2(drumRadius(DRUM_TOP) - 1.25, DRUM_TOP + 0.82));
  return points;
}

function spiralAroundDrum(fromY: number, toY: number, turns: number, offset: number, steps = 220) {
  const samples: Vector3[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const y = fromY + (toY - fromY) * t;
    const angle = -0.4 + t * turns * Math.PI * 2;
    const radius = drumRadius(y) + offset;
    samples.push(new Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius));
  }
  return new CatmullRomCurve3(samples);
}

function Building() {
  const lowerWing = useMemo(() => slabGeometry([13.8, 10.1, 12.7, 8.3, 11.5, 13.4, 9.4, 11.9], WING_TOP), []);
  const upperWing = useMemo(() => slabGeometry([8.6, 6.2, 7.9, 5.6, 7.4, 8.3, 6.0, 7.1], UPPER_TOP - WING_TOP + 0.6, 0.3), []);
  const drum = useMemo(() => drumProfile(), []);

  // Пандус: два обхода ротонды с парапетом, вынесенным за плоскость стены
  const ramp = useMemo(() => ribbonGeometry(spiralAroundDrum(UPPER_TOP - 1.4, DRUM_TOP - 1.6, 1.95, 0.95), 240, 2.0, 0.3), []);
  const rampRail = useMemo(() => ribbonGeometry(spiralAroundDrum(UPPER_TOP - 0.45, DRUM_TOP - 0.65, 1.95, 1.85), 240, 0.16, 0.72), []);

  // Ленточное окно ротонды идёт следом за пандусом, ниже его плиты
  const drumWindow = useMemo(() => ribbonGeometry(spiralAroundDrum(UPPER_TOP - 2.3, DRUM_TOP - 2.5, 1.95, 0.03), 240, 0.5, 0.62), []);

  /* Козырёк входа: плита, вынесенная от крыла и опирающаяся на две стойки.
     Он и опоры дают человеческий масштаб — без них макет читается предметом. */
  const canopy = useMemo(() => {
    const samples: Vector3[] = [];
    const steps = 36;
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const angle = 0.42 + t * 0.92;
      const radius = 10.4 + Math.sin(t * Math.PI) * 3.1;
      samples.push(new Vector3(Math.cos(angle) * radius, 3.6, Math.sin(angle) * radius));
    }
    return ribbonGeometry(new CatmullRomCurve3(samples), 60, 3.4, 0.2);
  }, []);

  const pilotis = useMemo(
    () => [0.55, 0.78, 1.0, 1.22].map((angle) => [Math.cos(angle) * 12.1, Math.sin(angle) * 12.1] as const),
    [],
  );

  return (
    <group position={[0, -9.2, 0]}>
      {/* Нижнее крыло: залы, лежащие по земле */}
      <mesh geometry={lowerWing} castShadow receiveShadow>
        <meshStandardMaterial color={PLASTER} roughness={0.92} metalness={0.02} />
      </mesh>

      {/* Ленточное остекление крыла — горизонталь, по которой читается этаж */}
      <mesh position={[0, 2.5, 0]}>
        <cylinderGeometry args={[11.35, 11.35, 0.62, 128, 1, true]} />
        <meshStandardMaterial color={GLASS} roughness={0.34} metalness={0.14} opacity={0.72} transparent side={DoubleSide} />
      </mesh>

      {/* Второе крыло, повёрнутое к первому: слоистость вместо одного объёма */}
      <group position={[2.6, WING_TOP - 0.6, -1.9]} rotation={[0, 0.62, 0]}>
        <mesh geometry={upperWing} castShadow receiveShadow>
          <meshStandardMaterial color={PLASTER_DEEP} roughness={0.9} metalness={0.02} />
        </mesh>
      </group>

      {/* Ротонда со всем, что к ней относится. Смещена с оси стилобата:
          вертикаль, поставленная ровно в центр, складывает композицию в торт. */}
      <group position={[-2.9, 0, 2.1]}>
        <mesh castShadow receiveShadow>
          <latheGeometry args={[drum, 128]} />
          <meshStandardMaterial color={PLASTER} roughness={0.9} metalness={0.02} side={DoubleSide} />
        </mesh>

        <mesh geometry={drumWindow}>
          <meshStandardMaterial color={GLASS} roughness={0.32} metalness={0.14} opacity={0.88} transparent />
        </mesh>

        <mesh geometry={ramp} castShadow receiveShadow>
          <meshStandardMaterial color={PLASTER_DEEP} roughness={0.88} metalness={0.02} side={DoubleSide} />
        </mesh>
        <mesh geometry={rampRail} castShadow>
          <meshStandardMaterial color={PLASTER_SHADE} roughness={0.86} />
        </mesh>

        {/* Окулюс: свет ротонда берёт сверху */}
        <mesh position={[0, DRUM_TOP + 0.78, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[drumRadius(DRUM_TOP) - 1.25, 48]} />
          <meshStandardMaterial color={GLASS} roughness={0.26} metalness={0.12} opacity={0.7} transparent />
        </mesh>
      </group>

      <mesh geometry={canopy} castShadow receiveShadow>
        <meshStandardMaterial color={PLASTER_DEEP} roughness={0.88} metalness={0.02} side={DoubleSide} />
      </mesh>

      {pilotis.map(([x, z]) => (
        <mesh key={`${x}-${z}`} position={[x, 1.8, z]} castShadow>
          <cylinderGeometry args={[0.17, 0.17, 3.6, 16]} />
          <meshStandardMaterial color={PLASTER_SHADE} roughness={0.85} />
        </mesh>
      ))}

      {/* Стилобат: здание стоит на своей площадке, а не висит над белым полем */}
      <mesh position={[0, -0.24, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[15.4, 15.8, 0.48, 96]} />
        <meshStandardMaterial color={PLASTER_DEEP} roughness={0.95} />
      </mesh>
    </group>
  );
}

/* Горизонтали участка — как на разрезе местности в проекте. Дают земле масштаб,
   не превращая её в текстуру. */
function SiteContours() {
  const rings = useMemo(() => [18.4, 22.6, 27.4, 33.0], []);
  return (
    <group position={[0, -9.46, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {rings.map((radius, index) => (
        <mesh key={radius} position={[0, 0, index * 0.002]}>
          <ringGeometry args={[radius, radius + 0.06, 128]} />
          <meshBasicMaterial color={GOLD} transparent opacity={0.4 - index * 0.075} side={DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/* ПОСАДКА КАМЕРЫ СЧИТАЕТСЯ, А НЕ ПРОПИСЫВАЕТСЯ ЧИСЛОМ.
 *
 * fov у перспективной камеры вертикальный, и на узкой колонке телефона он
 * покрывает высоту, но не ширину: макет шириной в тридцать метров вылезал за
 * оба края, оставляя в кадре кусок крыла. Расстояние берётся по худшей из двух
 * осей, поэтому здание целиком помещается и в широкой панели, и в телефонной. */
function FitCamera({ radius }: { radius: number }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const perspective = camera as PerspectiveCamera;
    const aspect = size.width / Math.max(size.height, 1);
    const verticalFov = (perspective.fov * Math.PI) / 180;
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
    const distance = Math.max(radius / Math.sin(verticalFov / 2), radius / Math.sin(horizontalFov / 2));
    const direction = new Vector3(1.15, 0.35, 1.02).normalize();
    perspective.position.copy(direction.multiplyScalar(distance));
    perspective.near = distance / 12;
    perspective.far = distance * 3.2;
    perspective.updateProjectionMatrix();
  }, [camera, size.width, size.height, radius]);
  return null;
}

function Turntable({ still, children }: { still: boolean; children: React.ReactNode }) {
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    if (still || !group.current) return;
    group.current.rotation.y += delta * 0.075;
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
      {/* flat — это NoToneMapping. По умолчанию fiber ставит ACES, и белый гипс
          уезжает в ровный серый: тонмаппинг для фотореализма, а здесь макет. */}
      <Canvas
        flat
        shadows
        camera={{ position: [42, 13, 37], fov: 30 }}
        dpr={[1, 1.6]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <FitCamera radius={15.8} />
        <hemisphereLight args={['#ffffff', '#d8d2c9', 0.95]} />
        <directionalLight
          position={[18, 26, 14]}
          intensity={1.25}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0006}
          shadow-normalBias={0.035}
          shadow-camera-left={-32}
          shadow-camera-right={32}
          shadow-camera-top={32}
          shadow-camera-bottom={-32}
        />
        <directionalLight position={[-20, 10, -16]} intensity={0.34} />

        <Suspense fallback={null}>
          <Turntable still={still}>
            <Building />
            <SiteContours />
            <ContactShadows position={[0, -9.48, 0]} opacity={0.32} scale={64} blur={2.8} far={20} resolution={512} color="#6f6a63" />
          </Turntable>
        </Suspense>

        {/* Колесо не перехватывается: страница должна прокручиваться под курсором,
            а не масштабировать макет. Крутить можно перетаскиванием. */}
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 5}
          maxPolarAngle={Math.PI / 2.15}
          rotateSpeed={0.55}
        />
      </Canvas>
    </div>
  );
}
