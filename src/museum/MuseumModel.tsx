import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Html, OrbitControls } from '@react-three/drei';
import { BufferAttribute, BufferGeometry, CatmullRomCurve3, DoubleSide, ExtrudeGeometry, Shape, Spherical, Vector2, Vector3 } from 'three';
import type { Group, MeshStandardMaterial, PerspectiveCamera } from 'three';

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

export type MuseumLabels = { atrium: string; ramp: string; oculus: string; galleries: string; entrance: string };

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

/* РАЗРЕЗ ПО НАЖАТИЮ.
 *
 * Снаружи здание закрыто, и это правильно: макет сначала должен читаться
 * объёмом. Но музей — это прежде всего внутреннее пространство, поэтому у
 * макета есть второе состояние: оболочка ротонды и верхнее крыло расступаются,
 * камера подходит ближе, и виден зал — пол, балконы, внутренняя сторона
 * пандуса и свет из окулюса.
 *
 * Управляет этим кнопка, а не угол камеры: подсказка «покрути и что-нибудь
 * произойдёт» не работает, а нажатие — договор, который видно. */
/* РАЗБОРКА, А НЕ ПРОСВЕЧИВАНИЕ.
 *
 * Первый заход делал оболочку прозрачной, и это была ошибка: белый гипс сквозь
 * белый гипс превращается в кашу, где не видно ни стен, ни того, что за ними.
 * В архитектуре разрез показывают, СНИМАЯ материал, а не делая его призрачным.
 *
 * Поэтому объёмы расходятся: покрытие крыла и оболочка ротонды поднимаются над
 * зданием, открывая планы под собой, и слегка притухают, чтобы не спорить с
 * тем, ради чего поднялись. Приём известен как разнесённая аксонометрия, и
 * читается он мгновенно, без всякой подписи. */
function useLift(target: React.MutableRefObject<Group | null>, open: boolean, height: number, speed = 3) {
  useFrame((_, delta) => {
    if (!target.current) return;
    const want = open ? height : 0;
    target.current.position.y += (want - target.current.position.y) * Math.min(delta * speed, 1);
  });
}

function useShellReveal(materials: React.MutableRefObject<(MeshStandardMaterial | null)[]>, open: boolean, depth = 0.9) {
  const value = useRef(0);
  useFrame((_, delta) => {
    const target = open ? 1 : 0;
    value.current += (target - value.current) * Math.min(delta * 3.4, 1);
    const opacity = 1 - value.current * depth;
    materials.current.forEach((material) => {
      if (!material) return;
      /* Только opacity. Переключать сам флаг transparent на лету нельзя:
         three пересобирает шейдер лишь по needsUpdate, и без него смена флага
         молча не применяется — стены оставались глухими. Поэтому материалы
         объявлены прозрачными сразу, а меняется прозрачность. */
      material.opacity = opacity;
      material.depthWrite = opacity > 0.6;
    });
  });
}

/* Внутреннее пространство ротонды: пол атриума, кольцевые балконы вдоль стены
   и световой колодец под окулюсом. Балконы посажены на тот же радиус, что и
   оболочка, поэтому пространство читается как одно, а не как набор дисков. */
function Atrium({ open }: { open: boolean }) {
  const balconies = useMemo(
    () => [10.6, 13.4, 16.2].map((y) => ({ y, radius: drumRadius(y) - 0.12 })),
    [],
  );

  return (
    <group>
      {/* Пол атриума */}
      <mesh position={[0, WING_TOP + 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[drumRadius(WING_TOP) - 0.15, 64]} />
        <meshStandardMaterial color={PLASTER_SHADE} roughness={0.94} />
      </mesh>

      {/* Круг света под окулюсом — то, ради чего в музее делают верхний свет */}
      <mesh position={[0, WING_TOP + 0.14, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.15, 48]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.55} />
      </mesh>

      {/* Подиумы с экспонатами: пустой атриум читается вестибюлем, а с ними —
          музеем. Ставим по дуге, а не по центру: центр держит свет из окулюса.
          У каждого свой источник — в зале экспонат виден потому, что на него
          направлен свет, а не потому, что вокруг светло. */}
      {[0.4, 1.5, 2.6, 4.1].map((angle, index) => {
        const distance = 2.9 + (index % 2) * 1.1;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        return (
          <group key={angle} position={[x, 0, z]}>
            <mesh position={[0, WING_TOP + 0.55, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.9, 0.86, 0.9]} />
              <meshStandardMaterial color={PLASTER_DEEP} roughness={0.9} />
            </mesh>
            <mesh position={[0, WING_TOP + 1.32, 0]} castShadow>
              {index % 3 === 0
                ? <torusKnotGeometry args={[0.24, 0.08, 64, 12]} />
                : index % 3 === 1
                  ? <icosahedronGeometry args={[0.34, 0]} />
                  : <coneGeometry args={[0.3, 0.66, 5]} />}
              <meshStandardMaterial color={PLASTER_SHADE} roughness={0.55} metalness={0.18} />
            </mesh>
            <spotLight
              position={[0, WING_TOP + 4.4, 0]}
              target-position={[0, WING_TOP + 1.2, 0]}
              angle={0.42}
              penumbra={0.75}
              intensity={open ? 26 : 0}
              distance={9}
              decay={2}
              color="#fff6ea"
            />
          </group>
        );
      })}

      {balconies.map(({ y, radius }) => (
        <group key={y}>
          <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
            <ringGeometry args={[radius - 1.5, radius, 64]} />
            <meshStandardMaterial color={PLASTER_DEEP} roughness={0.9} side={DoubleSide} />
          </mesh>
          <mesh position={[0, y + 0.42, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[radius - 1.5, 0.06, 6, 64]} />
            <meshStandardMaterial color={PLASTER_SHADE} roughness={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ЗАЛЫ НИЖНЕГО КРЫЛА.
 *
 * Ротонда — не всё здание: основная площадь музея лежит по земле. В раскрытом
 * состоянии крыло не растворяется полностью, как оболочка ротонды, а сохраняет
 * плотность: иначе от макета остаётся дым. Приглушается ровно настолько, чтобы
 * сквозь него читались перегородки, подиумы и антресоль. */
function WingHalls() {
  const partitions = useMemo(
    () => [
      { position: [-6.4, 0, 2.2] as const, rotation: 0.35, width: 6.2 },
      { position: [-2.1, 0, 6.6] as const, rotation: -0.85, width: 5.0 },
      { position: [4.8, 0, 5.4] as const, rotation: 0.62, width: 5.6 },
      { position: [7.4, 0, -2.6] as const, rotation: -0.3, width: 4.4 },
    ],
    [],
  );

  const cases = useMemo(
    () => [
      [-4.6, 4.4] as const,
      [-7.8, -1.2] as const,
      [1.6, 7.4] as const,
      [6.2, 2.2] as const,
      [8.6, -4.4] as const,
      [-1.4, -6.8] as const,
    ],
    [],
  );

  return (
    <group>
      {/* Пол зала */}
      <mesh position={[0, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[12.4, 96]} />
        <meshStandardMaterial color={PLASTER_SHADE} roughness={0.95} />
      </mesh>

      {partitions.map(({ position, rotation, width }) => (
        <mesh key={`${position[0]}-${position[2]}`} position={[position[0], 2.3, position[2]]} rotation={[0, rotation, 0]} castShadow receiveShadow>
          <boxGeometry args={[width, 3.4, 0.26]} />
          <meshStandardMaterial color={PLASTER} roughness={0.92} />
        </mesh>
      ))}

      {cases.map(([x, z]) => (
        <mesh key={`${x}-${z}`} position={[x, 1.05, z]} castShadow receiveShadow>
          <boxGeometry args={[1.5, 1.1, 0.8]} />
          <meshStandardMaterial color={PLASTER_DEEP} roughness={0.88} />
        </mesh>
      ))}

      {/* Антресоль: второй уровень, с которого зал виден сверху */}
      <mesh position={[0, 4.1, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <ringGeometry args={[8.2, 11.8, 96, 1, 0.6, 3.5]} />
        <meshStandardMaterial color={PLASTER_DEEP} roughness={0.9} side={DoubleSide} />
      </mesh>
    </group>
  );
}

function Building({ open, labels }: { open: boolean; labels: MuseumLabels }) {
  /* Материалы, которые расступаются при взгляде сверху: оболочка ротонды,
     её кровельное кольцо и верхнее крыло. Остальное здание остаётся плотным —
     разрез должен открывать зал, а не разбирать макет на части. */
  /* Поднимаются три части: покрытие нижнего крыла, верхнее крыло и оболочка
     ротонды. Высоты разные — иначе разлёт читается одним движением лифта, а
     не разбором здания по слоям. */
  const lowerShell = useRef<Group | null>(null);
  const upperShell = useRef<Group | null>(null);
  const drumShell = useRef<Group | null>(null);
  useLift(lowerShell, open, 4.2);
  useLift(upperShell, open, 6.2, 2.6);
  useLift(drumShell, open, 7.6, 2.2);

  /* Поднятые части ещё и притухают: они уже сказали, что здесь была стена,
     и дальше не должны спорить с планом, который открыли. */
  const shell = useRef<(MeshStandardMaterial | null)[]>([]);
  useShellReveal(shell, open, 0.42);

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
      {/* Залы лежат по земле и остаются на месте — поднимается оболочка над ними */}
      <WingHalls />
      <group ref={lowerShell}>
        <mesh geometry={lowerWing} castShadow receiveShadow>
          <meshStandardMaterial ref={(material) => { shell.current[3] = material; }} color={PLASTER} roughness={0.92} metalness={0.02} transparent />
        </mesh>

        {/* Ленточное остекление крыла — горизонталь, по которой читается этаж */}
        <mesh position={[0, 2.5, 0]}>
          <cylinderGeometry args={[11.35, 11.35, 0.62, 128, 1, true]} />
          <meshStandardMaterial color={GLASS} roughness={0.34} metalness={0.14} opacity={0.72} transparent side={DoubleSide} />
        </mesh>
      </group>

      {/* Второе крыло, повёрнутое к первому: слоистость вместо одного объёма */}
      <group ref={upperShell}>
      <group position={[2.6, WING_TOP - 0.6, -1.9]} rotation={[0, 0.62, 0]}>
        <mesh geometry={upperWing} castShadow receiveShadow>
          <meshStandardMaterial ref={(material) => { shell.current[2] = material; }} color={PLASTER_DEEP} roughness={0.9} metalness={0.02} transparent />
        </mesh>
      </group>
      </group>

      {/* Ротонда со всем, что к ней относится. Смещена с оси стилобата:
          вертикаль, поставленная ровно в центр, складывает композицию в торт. */}
      <group position={[-2.9, 0, 2.1]}>
        <Atrium open={open} />

        {/* Покрытие ротонды: сама оболочка и окулюс — одна деталь, поэтому
            поднимаются вместе, а атриум под ними остаётся на месте. */}
        <group ref={drumShell}>
          <mesh castShadow receiveShadow>
            <latheGeometry args={[drum, 128]} />
            <meshStandardMaterial ref={(material) => { shell.current[0] = material; }} color={PLASTER} roughness={0.9} metalness={0.02} side={DoubleSide} transparent />
          </mesh>
          <mesh position={[0, DRUM_TOP + 0.78, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <meshStandardMaterial ref={(material) => { shell.current[1] = material; }} color={GLASS} roughness={0.26} metalness={0.12} opacity={0.7} transparent />
            <circleGeometry args={[drumRadius(DRUM_TOP) - 1.25, 48]} />
          </mesh>
          {open && (
            <Html position={[0, DRUM_TOP + 1.6, 0]} center zIndexRange={[8, 0]} style={{ pointerEvents: 'none' }}>
              <span className="whitespace-nowrap border border-[rgb(var(--c-accent-rgb)_/_0.28)] bg-[var(--c-bg)]/88 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--c-accent)]">
                {labels.oculus}
              </span>
            </Html>
          )}
        </group>

        <mesh geometry={drumWindow}>
          <meshStandardMaterial color={GLASS} roughness={0.32} metalness={0.14} opacity={0.88} transparent />
        </mesh>

        <mesh geometry={ramp} castShadow receiveShadow>
          <meshStandardMaterial color={PLASTER_DEEP} roughness={0.88} metalness={0.02} side={DoubleSide} />
        </mesh>
        <mesh geometry={rampRail} castShadow>
          <meshStandardMaterial color={PLASTER_SHADE} roughness={0.86} />
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

/* ЭКСПЛИКАЦИЯ.
 *
 * Раскрытый макет показывает устройство, но не называет его. Подписи привязаны
 * к точкам самого здания и висят только в открытом состоянии — в закрытом они
 * бы спорили с силуэтом. Текст не перехватывает мышь, иначе он мешал бы
 * вращению ровно там, где интереснее всего крутить. */
function Legend({ open, labels }: { open: boolean; labels: MuseumLabels }) {
  if (!open) return null;
  /* Подпись стоит у того, что называет, и в РАСКРЫТОМ состоянии: атриум и залы
     видно только когда покрытие поднялось. Окулюса здесь нет — он часть кровли
     и уезжает вместе с ней, поэтому подписан внутри её группы. */
  const points: [string, [number, number, number]][] = [
    [labels.ramp, [1.2, 11.6, 6.4]],
    [labels.atrium, [-2.9, WING_TOP + 1.8, 2.1]],
    [labels.galleries, [7.6, 1.6, -4.2]],
    [labels.entrance, [12.6, 3.0, 6.8]],
  ];

  return (
    <>
      {points.map(([text, position]) => (
        <Html key={text} position={position} center zIndexRange={[8, 0]} style={{ pointerEvents: 'none' }}>
          <span className="whitespace-nowrap border border-[rgb(var(--c-accent-rgb)_/_0.28)] bg-[var(--c-bg)]/88 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--c-accent)]">
            {text}
          </span>
        </Html>
      ))}
    </>
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
 * осей, поэтому здание целиком помещается и в широкой панели, и в телефонной.
 *
 * Тот же расчёт обслуживает раскрытие: в открытом состоянии камера подходит
 * ближе, к масштабу зала. Меняется только длина вектора — направление остаётся
 * тем, которое зритель выбрал мышью, иначе нажатие сбрасывало бы его ракурс. */
function CameraRig({ open, radius }: { open: boolean; radius: number }) {
  const { camera, size } = useThree();
  const distance = useRef(0);

  const fitted = useMemo(() => {
    const perspective = camera as PerspectiveCamera;
    const aspect = size.width / Math.max(size.height, 1);
    const verticalFov = (perspective.fov * Math.PI) / 180;
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
    return Math.max(radius / Math.sin(verticalFov / 2), radius / Math.sin(horizontalFov / 2));
  }, [camera, size.width, size.height, radius]);

  useEffect(() => {
    const perspective = camera as PerspectiveCamera;
    if (!distance.current) distance.current = fitted;
    perspective.near = fitted / 40;
    perspective.far = fitted * 3.4;
    perspective.updateProjectionMatrix();
  }, [camera, fitted]);

  const spherical = useRef(new Spherical());
  useFrame((_, delta) => {
    const step = Math.min(delta * 2.6, 1);
    /* Приближения нет намеренно. Посадка кадра выверена по габариту здания, а
       здание стоит не по центру площадки: любой подлёт срезал крыло или пандус.
       Раскрытие держится на том, что расступается оболочка, а не на том, что
       камера лезет внутрь. */
    /* В раскрытом состоянии композиция становится выше — поднятые части стоят
       над зданием, — поэтому камера отходит. Приближения по-прежнему нет: оно
       срезало крыло, потому что здание стоит не по центру площадки. */
    const want = fitted * (open ? 1.34 : 1);
    distance.current += (want - distance.current) * step;

    /* Азимут остаётся тот, который выбрал зритель: нажатие не должно отбирать
       у него ракурс. Меняются только длина вектора и наклон — камера опускается
       почти на уровень зала. Сверху смотреть бесполезно: витки пандуса идут
       снаружи ротонды и закрывают собой атриум, ради которого всё и делалось,
       а сбоку сквозь растворённую стену читается разрез: пол, балконы, подиумы
       и лестничная спираль перед ними. */
    spherical.current.setFromVector3(camera.position);
    if (open) {
      spherical.current.phi += (1.16 - spherical.current.phi) * step * 0.6;
    }
    spherical.current.radius = distance.current;
    camera.position.setFromSpherical(spherical.current);
  });

  return null;
}

function Turntable({ still, slow, children }: { still: boolean; slow: boolean; children: React.ReactNode }) {
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    if (still || !group.current) return;
    // В раскрытом состоянии вращение останавливается совсем: подписи
    // экспликации должны стоять на месте, а не уезжать из-под курсора.
    if (slow) return;
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

export function MuseumModel({ label, openLabel, closeLabel, insideLabel, labels }: { label: string; openLabel: string; closeLabel: string; insideLabel: string; labels: MuseumLabels }) {
  /* Автоповорот — украшение, а не содержание: при системной просьбе убрать
     движение сцена замирает, но остаётся управляемой мышью. */
  const still = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const [open, setOpen] = useState(false);

  if (typeof window !== 'undefined' && !hasWebGL()) {
    return <div className="flex h-full w-full items-center justify-center bg-[#f6f4f1]" role="img" aria-label={label} />;
  }

  return (
    <div className="relative h-full w-full">
      <div className="h-full w-full cursor-grab active:cursor-grabbing" role="img" aria-label={open ? insideLabel : label}>
        {/* flat — это NoToneMapping. По умолчанию fiber ставит ACES, и белый гипс
            уезжает в ровный серый: тонмаппинг для фотореализма, а здесь макет. */}
        <Canvas
          flat
          shadows
          camera={{ position: [42, 13, 37], fov: 30 }}
          dpr={[1, 1.6]}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        >
          <CameraRig open={open} radius={15.8} />
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
          {/* Свет из окулюса: в раскрытом зале он и есть главный источник */}
          <pointLight position={[-2.9, 8.5, 2.1]} intensity={open ? 42 : 0} distance={26} decay={2} color="#fffaf2" />

          <Suspense fallback={null}>
            <Turntable still={still} slow={open}>
              <Building open={open} labels={labels} />
              <Legend open={open} labels={labels} />
              <SiteContours />
              <ContactShadows position={[0, -9.48, 0]} opacity={0.32} scale={64} blur={2.8} far={20} resolution={512} color="#6f6a63" />
            </Turntable>
          </Suspense>

          {/* Колесо не перехватывается: страница должна прокручиваться под курсором,
              а не масштабировать макет. Крутить можно перетаскиванием. */}
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            minPolarAngle={0.32}
            maxPolarAngle={Math.PI / 2.15}
            rotateSpeed={0.55}
          />
        </Canvas>
      </div>

      {/* Кнопка живёт над канвасом, а не в колонке рядом: действие относится к
          макету, и рука не должна уходить от него через всю страницу. */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-pressed={open}
        className="absolute right-4 top-4 z-10 min-h-11 border border-[rgb(var(--c-accent-rgb)_/_0.35)] bg-[var(--c-bg)]/85 px-4 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--c-accent)] backdrop-blur-sm transition hover:bg-[var(--c-accent)] hover:text-[var(--c-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-accent)] sm:right-6 sm:top-6"
      >
        {open ? closeLabel : openLabel}
      </button>
    </div>
  );
}
