import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Html, OrbitControls } from '@react-three/drei';
import { DoubleSide, ExtrudeGeometry, Shape, Spherical, Vector3 } from 'three';
import type { Group, PerspectiveCamera } from 'three';
import { HALLS, type HallId } from './halls';

/* ЗДАНИЕ МУЗЕЯ, СОБРАННОЕ КОДОМ, А НЕ ЗАГРУЖЕННОЕ ФАЙЛОМ.
 *
 * Это бетон, а не гипс: перевёрнутый зиккурат, где каждый следующий объём
 * вылетает за предыдущий, глухой ствол лестницы, ров вокруг цоколя и мост ко
 * входу. Брутализм держится на трёх вещах, и все три здесь заявлены:
 *
 *   1. масса, которая нависает — консоль читается только вместе с тенью,
 *      поэтому между ярусами оставлен зазор, а не стык;
 *   2. следы опалубки — горизонтальные борозды по телу и вертикальные рёбра
 *      по стволу: бетон показывает, как его лили, а не притворяется камнем;
 *   3. один большой проём вместо ленты окон — трапеция смотрит с верхнего
 *      яруса, остальное режут узкие щели.
 *
 * Геометрия параметрическая: ни одного .glb, ни одной текстуры, ни одного
 * внешнего запроса. Борозды и кессоны — инстансы, поэтому их сотни, а вызовов
 * отрисовки единицы. three и fiber уже стоят в проекте ради /stage, страница
 * грузится через lazy(), поэтому вес остаётся в чанке музея.
 *
 * Объёмы здесь не декорация: каждый из них — зал, у которого есть имя, адрес
 * и уровень доступа (см. HALLS). Клик по объёму выбирает зал, а не просто
 * подсвечивает грань.
 */

const CONCRETE = '#b9b4ac';        // тело: серый с тёплой ноткой, иначе уходит в синеву
const CONCRETE_DEEP = '#a49f97';   // нижние ярусы и цоколь
const CONCRETE_DARK = '#8d887f';   // подрезы и ров
const SHADOW_GAP = '#3d3a36';      // зазор между ярусами: там всегда тень
const GLASS = '#2b2a28';
const GOLD = '#c9a690';

export type MuseumLabels = Record<HallId, string>;

/* Ярусы перевёрнутого зиккурата: снизу самый узкий. Зазор между ними — не
   щель для красоты, а то, чем консоль доказывает, что она консоль. */
const LEVELS = [
  { id: 'collection' as HallId, w: 15.0, d: 11.6, h: 5.2, y: 1.2 },
  { id: 'practice' as HallId,   w: 18.6, d: 14.2, h: 5.0, y: 6.8 },
  { id: 'archive' as HallId,    w: 22.4, d: 17.0, h: 5.6, y: 12.2 },
];

const CORE = { w: 5.4, d: 5.4, h: 22.6, x: -12.6, z: -4.6 };
const PODIUM_TOP = 1.2;

/* ── СЛЕДЫ ОПАЛУБКИ ──────────────────────────────────────────────────
   Доска оставляет горизонтальный шов каждые тридцать сантиметров. Рисуем их
   инстансами: тысяча тонких коробок одним вызовом дешевле, чем текстура,
   которую пришлось бы грузить файлом. */
function BoardMarks({ w, d, h, y, step = 0.62 }: { w: number; d: number; h: number; y: number; step?: number }) {
  const rows = useMemo(() => {
    const out: number[] = [];
    for (let level = y + step; level < y + h - 0.1; level += step) out.push(level);
    return out;
  }, [w, d, h, y, step]);

  return (
    <group>
      {rows.map((level) => (
        <mesh key={level} position={[0, level, 0]}>
          <boxGeometry args={[w + 0.04, 0.045, d + 0.04]} />
          <meshStandardMaterial color={CONCRETE_DARK} roughness={0.97} />
        </mesh>
      ))}
    </group>
  );
}

/* Вертикальные рёбра ствола: та же опалубка, поставленная на попа. Ствол
   глухой, и без рёбер он читается как коробка от лифта, а не как бетон. */
function CoreRibs() {
  const ribs = useMemo(() => {
    const out: [number, number, number][] = [];
    const count = 9;
    for (let i = 0; i < count; i += 1) {
      const t = (i + 0.5) / count - 0.5;
      out.push([t * CORE.w, 0, CORE.d / 2 + 0.06]);
      out.push([t * CORE.w, 0, -CORE.d / 2 - 0.06]);
    }
    for (let i = 0; i < count; i += 1) {
      const t = (i + 0.5) / count - 0.5;
      out.push([CORE.w / 2 + 0.06, 1, t * CORE.d]);
      out.push([-CORE.w / 2 - 0.06, 1, t * CORE.d]);
    }
    return out;
  }, []);

  return (
    <group position={[CORE.x, CORE.h / 2, CORE.z]}>
      {ribs.map(([x, rotated, z], index) => (
        <mesh key={index} position={[x, 0, z]} rotation={[0, rotated ? Math.PI / 2 : 0, 0]}>
          <boxGeometry args={[0.22, CORE.h - 0.6, 0.16]} />
          <meshStandardMaterial color={CONCRETE_DEEP} roughness={0.98} />
        </mesh>
      ))}
    </group>
  );
}

/* Кессоны на изнанке консоли. Нависающая плита без кессонов выглядит фанерой:
   в бетоне низ верхнего яруса всегда разбит на квадраты. */
function Coffers({ w, d, y }: { w: number; d: number; y: number }) {
  const cells = useMemo(() => {
    const out: [number, number][] = [];
    const cols = Math.floor(w / 2.1);
    const rows = Math.floor(d / 2.1);
    for (let i = 0; i < cols; i += 1) {
      for (let j = 0; j < rows; j += 1) {
        out.push([(i - (cols - 1) / 2) * 2.1, (j - (rows - 1) / 2) * 2.1]);
      }
    }
    return out;
  }, [w, d]);

  return (
    <group position={[0, y, 0]}>
      {cells.map(([x, z]) => (
        <mesh key={`${x}-${z}`} position={[x, 0.16, z]}>
          <boxGeometry args={[1.62, 0.3, 1.62]} />
          <meshStandardMaterial color={CONCRETE_DARK} roughness={0.98} />
        </mesh>
      ))}
    </group>
  );
}

/* Трапеция Бройера: единственный большой глаз на глухом фасаде. Выдвинута
   наружу, потому что в бетоне окно — это коробка, вставленная в массу. */
function TrapezoidEye({ y, z }: { y: number; z: number }) {
  const geometry = useMemo(() => {
    const shape = new Shape();
    shape.moveTo(-2.6, -1.5);
    shape.lineTo(2.6, -1.5);
    shape.lineTo(1.5, 1.5);
    shape.lineTo(-1.5, 1.5);
    shape.closePath();
    return new ExtrudeGeometry(shape, { depth: 1.1, bevelEnabled: false });
  }, []);

  return (
    <group position={[3.4, y, z]}>
      <mesh geometry={geometry} position={[0, 0, 0]}>
        <meshStandardMaterial color={CONCRETE_DEEP} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0, 1.14]}>
        <planeGeometry args={[4.4, 2.6]} />
        <meshStandardMaterial color={GLASS} roughness={0.22} metalness={0.2} />
      </mesh>
    </group>
  );
}

/* Щели вместо ленты: узкое высокое отверстие держит массу, широкое её съедает. */
function Slits({ y, z, count = 6 }: { y: number; z: number; count?: number }) {
  const positions = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < count; i += 1) out.push((i - (count - 1) / 2) * 1.5 - 4.2);
    return out;
  }, [count]);

  return (
    <group position={[0, y, z]}>
      {positions.map((x) => (
        <mesh key={x} position={[x, 0, 0]}>
          <boxGeometry args={[0.34, 3.1, 0.24]} />
          <meshStandardMaterial color={GLASS} roughness={0.3} metalness={0.16} />
        </mesh>
      ))}
    </group>
  );
}

/* Верхний свет: пилы фонарей над последним ярусом. В музее это не украшение,
   а способ впустить ровный свет, не открывая стен. */
function RoofMonitors({ y, w, d }: { y: number; w: number; d: number }) {
  const bays = useMemo(() => {
    const out: number[] = [];
    // Три пилы с бетоном между ними: четыре сливались в одну тёмную ленту
    // и снова превращали кровлю в чёрное поле.
    const count = 3;
    for (let i = 0; i < count; i += 1) out.push((i - (count - 1) / 2) * (d / 3.6));
    return out;
  }, [d]);

  return (
    <group position={[0, y, 0]}>
      {/* Сначала кровля, потом фонари. Без плиты верх здания читался чёрным
          полем: стекло занимало всю крышу и масса теряла верх. */}
      <mesh position={[0, 0.22, 0]} receiveShadow castShadow>
        <boxGeometry args={[w, 0.44, d]} />
        <meshStandardMaterial color={CONCRETE_DEEP} roughness={0.97} />
      </mesh>
      {bays.map((z) => (
        <group key={z} position={[0, 0.44, z]}>
          {/* Наклонная плоскость света узкая: пила, а не витраж */}
          <mesh position={[0, 0.52, 0.16]} rotation={[-0.72, 0, 0]} castShadow>
            <boxGeometry args={[w - 6.2, 1.06, 0.16]} />
            <meshStandardMaterial color={GLASS} roughness={0.24} metalness={0.18} />
          </mesh>
          <mesh position={[0, 0.44, -0.42]} castShadow>
            <boxGeometry args={[w - 6.2, 0.88, 0.42]} />
            <meshStandardMaterial color={CONCRETE} roughness={0.96} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* Цоколь со рвом. Вырезать отверстие в плите нечем — CSG в проекте нет, — но
   ров это и не отверстие: это четыре берега вокруг опущенного двора. */
function PodiumAndCourt() {
  const bank = 5.6;
  const outer = { w: 40, d: 34 };
  const court = { w: 40 - bank * 2, d: 12.4 };

  return (
    <group>
      {/* берега */}
      <mesh position={[0, PODIUM_TOP / 2 - 0.6, -(court.d / 2 + (outer.d - court.d) / 4) + 0]} receiveShadow castShadow>
        <boxGeometry args={[outer.w, PODIUM_TOP + 1.2, outer.d - court.d]} />
        <meshStandardMaterial color={CONCRETE_DEEP} roughness={0.97} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (court.w / 2 + bank / 2), PODIUM_TOP / 2 - 0.6, court.d / 2]} receiveShadow castShadow>
          <boxGeometry args={[bank, PODIUM_TOP + 1.2, court.d]} />
          <meshStandardMaterial color={CONCRETE_DEEP} roughness={0.97} />
        </mesh>
      ))}
      {/* дно двора: ниже уровня земли, поэтому во рву всегда тень */}
      <mesh position={[0, -1.9, court.d / 2 + 1.0]} receiveShadow>
        <boxGeometry args={[court.w, 0.5, court.d]} />
        <meshStandardMaterial color={CONCRETE_DARK} roughness={0.98} />
      </mesh>
      {/* лестница со дна двора наверх: масштаб человека на бетонной массе */}
      {[0, 1, 2, 3, 4, 5].map((step) => (
        <mesh key={step} position={[-court.w / 2 + 3.4, -1.62 + step * 0.42, court.d + 0.4 - step * 0.5]} receiveShadow castShadow>
          <boxGeometry args={[5.2, 0.42, 0.5]} />
          <meshStandardMaterial color={CONCRETE_DEEP} roughness={0.97} />
        </mesh>
      ))}
    </group>
  );
}

/* Мост через ров. Вход в бруталистский музей — всегда переход: сначала
   спускаешься мимо массы, потом входишь под неё. */
function Bridge() {
  return (
    <group>
      <mesh position={[3.4, 0.9, 9.6]} receiveShadow castShadow>
        <boxGeometry args={[4.2, 0.5, 9.4]} />
        <meshStandardMaterial color={CONCRETE_DEEP} roughness={0.96} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[3.4 + side * 2.1, 1.5, 9.6]}>
          <boxGeometry args={[0.26, 0.9, 9.4]} />
          <meshStandardMaterial color={CONCRETE_DARK} roughness={0.96} />
        </mesh>
      ))}
      {/* портал входа: чёрный вырез в массе, единственная дверь на весь фасад */}
      <mesh position={[3.4, 3.0, 5.86]}>
        <boxGeometry args={[3.2, 3.4, 0.3]} />
        <meshStandardMaterial color={SHADOW_GAP} roughness={0.9} />
      </mesh>
    </group>
  );
}

/* ── ЯРУС КАК ЗАЛ ────────────────────────────────────────────────────
   Каждый объём кликабелен: это дверь в зал, а не грань модели. Наведение
   поднимает тон, выбор — обводит зазором света. */
function Level({
  level,
  open,
  selected,
  hovered,
  onSelect,
  onHover,
}: {
  level: (typeof LEVELS)[number];
  open: boolean;
  selected: boolean;
  hovered: boolean;
  onSelect: (id: HallId) => void;
  onHover: (id: HallId | null) => void;
}) {
  const group = useRef<Group>(null);
  const lift = LEVELS.indexOf(level) * 1.9;

  useFrame((_, delta) => {
    if (!group.current) return;
    const want = open ? lift : 0;
    group.current.position.y += (want - group.current.position.y) * Math.min(delta * 3, 1);
  });

  const tone = selected ? '#cfc9bf' : hovered ? '#c5c0b7' : CONCRETE;

  return (
    <group ref={group}>
      <mesh
        position={[0, level.y + level.h / 2, 0]}
        castShadow
        receiveShadow
        onPointerOver={(event) => { event.stopPropagation(); onHover(level.id); }}
        onPointerOut={() => onHover(null)}
        onClick={(event) => { event.stopPropagation(); onSelect(level.id); }}
      >
        <boxGeometry args={[level.w, level.h, level.d]} />
        <meshStandardMaterial color={tone} roughness={0.96} metalness={0.02} />
      </mesh>
      <BoardMarks w={level.w} d={level.d} h={level.h} y={level.y} />
      <Coffers w={level.w} d={level.d} y={level.y} />
      {/* тёмная полка в зазоре: консоль видно по тени под ней, а не по краю */}
      <mesh position={[0, level.y - 0.16, 0]}>
        <boxGeometry args={[level.w - 4.2, 0.32, level.d - 4.2]} />
        <meshStandardMaterial color={SHADOW_GAP} roughness={0.9} />
      </mesh>
    </group>
  );
}

function Building({
  open,
  selected,
  hovered,
  onSelect,
  onHover,
}: {
  open: boolean;
  selected: HallId | null;
  hovered: HallId | null;
  onSelect: (id: HallId) => void;
  onHover: (id: HallId | null) => void;
}) {
  const coreGroup = useRef<Group>(null);
  useFrame((_, delta) => {
    if (!coreGroup.current) return;
    const want = open ? 1.1 : 0;
    coreGroup.current.position.y += (want - coreGroup.current.position.y) * Math.min(delta * 3, 1);
  });

  const coreTone = selected === 'study' ? '#c6c1b8' : hovered === 'study' ? '#bdb8b0' : CONCRETE_DEEP;
  const courtTone = selected === 'court' ? 0.5 : hovered === 'court' ? 0.34 : 0.0;

  return (
    <group position={[0, -7.4, 0]}>
      <PodiumAndCourt />
      <Bridge />

      {LEVELS.map((level) => (
        <Level
          key={level.id}
          level={level}
          open={open}
          selected={selected === level.id}
          hovered={hovered === level.id}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}

      {/* Двор кликается по своему дну, а не по берегам: берега — это земля */}
      <mesh
        position={[0, -1.6, 13.4]}
        onPointerOver={(event) => { event.stopPropagation(); onHover('court'); }}
        onPointerOut={() => onHover(null)}
        onClick={(event) => { event.stopPropagation(); onSelect('court'); }}
      >
        <boxGeometry args={[28.4, 0.12, 12.0]} />
        <meshStandardMaterial color={GOLD} transparent opacity={courtTone} roughness={0.9} />
      </mesh>

      <group ref={coreGroup}>
        <mesh
          position={[CORE.x, CORE.h / 2, CORE.z]}
          castShadow
          receiveShadow
          onPointerOver={(event) => { event.stopPropagation(); onHover('study'); }}
          onPointerOut={() => onHover(null)}
          onClick={(event) => { event.stopPropagation(); onSelect('study'); }}
        >
          <boxGeometry args={[CORE.w, CORE.h, CORE.d]} />
          <meshStandardMaterial color={coreTone} roughness={0.97} metalness={0.02} />
        </mesh>
        <CoreRibs />
        {/* Фонарь на макушке ствола — щель между бетоном и парапетом:
            сплошная стеклянная шапка превращала ствол в фонарный столб. */}
        <mesh position={[CORE.x, CORE.h + 0.26, CORE.z]}>
          <boxGeometry args={[CORE.w - 1.6, 0.5, CORE.d - 1.6]} />
          <meshStandardMaterial color={GLASS} roughness={0.24} metalness={0.2} />
        </mesh>
        <mesh position={[CORE.x, CORE.h + 0.72, CORE.z]} castShadow>
          <boxGeometry args={[CORE.w + 0.3, 0.42, CORE.d + 0.3]} />
          <meshStandardMaterial color={CONCRETE_DEEP} roughness={0.97} />
        </mesh>
      </group>

      <TrapezoidEye y={15.2} z={8.6} />
      <Slits y={9.3} z={7.2} />
      <RoofMonitors y={LEVELS[2].y + LEVELS[2].h} w={LEVELS[2].w} d={LEVELS[2].d} />

      {/* Перекрытия видно только в раскрытом состоянии: иначе это тёмные щели */}
      {open && LEVELS.map((level) => (
        <mesh key={`plate-${level.id}`} position={[0, level.y + LEVELS.indexOf(level) * 1.9 + 0.3, 0]} receiveShadow>
          <boxGeometry args={[level.w - 1.2, 0.24, level.d - 1.2]} />
          <meshStandardMaterial color="#d8d3ca" roughness={0.94} />
        </mesh>
      ))}
    </group>
  );
}

/* Подписи залов стоят у своих объёмов и работают как двери: их можно нажать,
   и это единственные подписи, которые перехватывают мышь. */
function HallPins({
  labels,
  selected,
  hovered,
  onSelect,
  onHover,
  lockedHint,
}: {
  labels: MuseumLabels;
  selected: HallId | null;
  hovered: HallId | null;
  onSelect: (id: HallId) => void;
  onHover: (id: HallId | null) => void;
  lockedHint: string;
}) {
  /* На узком холсте пять подписей сходятся в пятно: пины пропадают, а вход в
     зал остаётся списком в колонке рядом — он и так дублирует клик по зданию.
     Решает ширина холста, а не окна: панель бывает узкой и на десктопе. */
  const { size } = useThree();
  if (size.width < 520) return null;

  return (
    <>
      {HALLS.map((hall) => {
        const active = selected === hall.id || hovered === hall.id;
        return (
          <Html
            key={hall.id}
            position={[hall.focus[0], hall.focus[1] - 7.4 + 1.6, hall.focus[2]]}
            center
            zIndexRange={[8, 0]}
          >
            <button
              type="button"
              onClick={() => onSelect(hall.id)}
              onPointerOver={() => onHover(hall.id)}
              onPointerOut={() => onHover(null)}
              title={hall.access === 'passport' ? lockedHint : undefined}
              className={`whitespace-nowrap border px-2 py-1 font-mono text-[8px] uppercase tracking-[0.14em] transition ${
                active
                  ? 'border-[var(--c-accent)] bg-[var(--c-accent)] text-[var(--c-bg)]'
                  : 'border-[rgb(var(--c-accent-rgb)_/_0.28)] bg-[var(--c-bg)]/88 text-[var(--c-accent)]'
              }`}
            >
              {labels[hall.id]}
              {hall.access === 'passport' ? ' ·' : ''}
            </button>
          </Html>
        );
      })}
    </>
  );
}

/* Горизонтали участка — как на разрезе местности в проекте. */
function SiteContours() {
  const rings = useMemo(() => [26.0, 31.0, 37.0, 44.0], []);
  return (
    <group position={[0, -7.66, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {rings.map((radius, index) => (
        <mesh key={radius} position={[0, 0, index * 0.002]}>
          <ringGeometry args={[radius, radius + 0.06, 128]} />
          <meshBasicMaterial color={GOLD} transparent opacity={0.36 - index * 0.07} side={DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/* ПОСАДКА КАМЕРЫ СЧИТАЕТСЯ, А НЕ ПРОПИСЫВАЕТСЯ ЧИСЛОМ.
 *
 * fov у перспективной камеры вертикальный, и на узкой колонке телефона он
 * покрывает высоту, но не ширину: макет шириной в сорок метров вылезал за оба
 * края. Расстояние берётся по худшей из двух осей.
 *
 * Выбранный зал добавляет к этому наклон и высоту точки взгляда: камера
 * поднимается к ярусу, но не влетает внутрь — азимут остаётся тот, который
 * зритель выбрал мышью. */
function CameraRig({ open, radius, focusY }: { open: boolean; radius: number; focusY: number }) {
  const { camera, size } = useThree();
  const distance = useRef(0);
  const target = useRef(0);

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
    const want = fitted * (open ? 1.22 : 1);
    distance.current += (want - distance.current) * step;
    target.current += (focusY - target.current) * step * 0.8;

    spherical.current.setFromVector3(camera.position.clone().sub(new Vector3(0, target.current, 0)));
    if (open) spherical.current.phi += (1.2 - spherical.current.phi) * step * 0.6;
    spherical.current.radius = distance.current;
    camera.position.setFromSpherical(spherical.current).add(new Vector3(0, target.current, 0));
    camera.lookAt(0, target.current, 0);
  });

  return null;
}

function Turntable({ still, slow, children }: { still: boolean; slow: boolean; children: React.ReactNode }) {
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    if (still || !group.current || slow) return;
    group.current.rotation.y += delta * 0.06;
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

export function MuseumModel({
  label,
  openLabel,
  closeLabel,
  insideLabel,
  labels,
  lockedHint,
  selectedHall,
  onSelectHall,
}: {
  label: string;
  openLabel: string;
  closeLabel: string;
  insideLabel: string;
  labels: MuseumLabels;
  lockedHint: string;
  selectedHall: HallId | null;
  onSelectHall: (id: HallId | null) => void;
}) {
  const still = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<HallId | null>(null);

  /* Выбор зала раскрывает здание сам: смотреть на зал сквозь глухой бетон
     бессмысленно, а требовать двух нажатий подряд — недружелюбно. */
  const select = useCallback((id: HallId) => {
    onSelectHall(id === selectedHall ? null : id);
    if (id !== selectedHall) setOpen(true);
  }, [onSelectHall, selectedHall]);

  const focusY = useMemo(() => {
    const hall = HALLS.find((item) => item.id === selectedHall);
    return hall ? hall.focus[1] - 7.4 : 0;
  }, [selectedHall]);

  if (typeof window !== 'undefined' && !hasWebGL()) {
    return <div className="flex h-full w-full items-center justify-center bg-[#e9e6e1]" role="img" aria-label={label} />;
  }

  return (
    <div className="relative h-full w-full">
      <div className="h-full w-full cursor-grab active:cursor-grabbing" role="img" aria-label={open ? insideLabel : label}>
        <Canvas
          flat
          shadows
          camera={{ position: [46, 16, 40], fov: 30 }}
          dpr={[1, 1.6]}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          onPointerMissed={() => onSelectHall(null)}
        >
          <CameraRig open={open} radius={21.5} focusY={focusY} />
          <hemisphereLight args={['#ffffff', '#c9c4bb', 0.8]} />
          {/* Одно жёсткое солнце: брутализм живёт тенью, рассеянный свет
              съедает и консоль, и борозды опалубки. */}
          <directionalLight
            position={[22, 30, 16]}
            intensity={1.5}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-bias={-0.0006}
            shadow-normalBias={0.035}
            shadow-camera-left={-40}
            shadow-camera-right={40}
            shadow-camera-top={40}
            shadow-camera-bottom={-40}
          />
          <directionalLight position={[-24, 12, -18]} intensity={0.26} />
          <pointLight position={[0, 6, 0]} intensity={open ? 46 : 0} distance={30} decay={2} color="#fff6ea" />

          <Suspense fallback={null}>
            <Turntable still={still} slow={open || selectedHall !== null}>
              <Building
                open={open}
                selected={selectedHall}
                hovered={hovered}
                onSelect={select}
                onHover={setHovered}
              />
              {(open || selectedHall) && (
                <HallPins
                  labels={labels}
                  selected={selectedHall}
                  hovered={hovered}
                  onSelect={select}
                  onHover={setHovered}
                  lockedHint={lockedHint}
                />
              )}
              <SiteContours />
              <ContactShadows position={[0, -7.68, 0]} opacity={0.4} scale={90} blur={2.6} far={24} resolution={512} color="#5d5850" />
            </Turntable>
          </Suspense>

          <OrbitControls
            enableZoom={false}
            enablePan={false}
            minPolarAngle={0.3}
            maxPolarAngle={Math.PI / 2.15}
            rotateSpeed={0.55}
          />
        </Canvas>
      </div>

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
