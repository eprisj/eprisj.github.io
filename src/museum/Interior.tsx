import { useMemo } from 'react';
import { BackSide, DoubleSide, Object3D } from 'three';
import type { HallId } from './halls';

/* ИНТЕРЬЕР ЗАЛА.
 *
 * Клик по объёму раньше открывал текст о зале, и это был честный вопрос:
 * «нажимаю — а где комната?». Комната должна быть комнатой: пол под ногами,
 * стены вокруг, свет оттуда, откуда он в этом объёме и приходит, и подиумы,
 * которые ждут первые объекты.
 *
 * Каждый зал отличается тем же, чем отличается снаружи:
 *   collection — длинная галерея, свет полосами между рёбрами фасада;
 *   practice   — верхний зал, свет сверху через пилы фонарей;
 *   archive    — глухая комната, одна щель и стеллажи вместо подиумов;
 *   study      — узкая шахта с фонарём на макушке, один стол;
 *   court      — не комната: двор с водой, небо вместо потолка.
 *
 * Всё той же параметрикой: ни моделей, ни текстур.
 */

const WALL = '#c6c0b6';
const FLOOR = '#a5a099';
const PLINTH = '#d6d1c8';
const DARK = '#57534c';
const LIGHT = '#fff6e8';

/* ЦВЕТ ЗАЛА.
 *
 * Все залы были одного и того же тёплого серого, и разница между ними жила
 * только в свете. Внутри это читалось одной комнатой, которую показывают с
 * разных сторон. Каждый зал получает свой сдвиг: коллекция теплее и светлее,
 * практика холоднее и жёстче, архив глуше и темнее, кабинет почти в цвете
 * бумаги. Сдвиг маленький: это оттенок бетона, а не покраска стен. */
const HALL_TONE: Partial<Record<HallId, { wall: string; floor: string }>> = {
  collection: { wall: '#cbc4b7', floor: '#a8a297' },
  practice:   { wall: '#bfc0bd', floor: '#9c9d9b' },
  archive:    { wall: '#b2ada4', floor: '#918d86' },
  study:      { wall: '#cdc7bb', floor: '#aaa49a' },
  workshop:   { wall: '#c4c3bd', floor: '#a3a29c' },
  auditorium: { wall: '#c8c1b6', floor: '#a6a096' },
};

/* МАТЕРИАЛЫ РАБОТ.
 *
 * Бетон в этой сцене один и тот же везде, и именно поэтому работы должны
 * быть сделаны из другого: бронза с настоящей металличностью, полированный
 * камень, стекло витрины и холст. Разница материалов — единственное, что
 * отличает вещь от архитектуры, когда и то и другое собрано коробками. */
const BRONZE = '#b78552';
const STEEL = '#a7adb4';
const STONE = '#6d6961';
const CANVAS_TONES = ['#b84b2e', '#2f3f57', '#d9cdb4', '#6d7a58'];

type Room = {
  w: number;
  h: number;
  d: number;
  /* откуда свет: полосами сбоку, сверху через фонари, щелью или небом */
  light: 'side' | 'top' | 'slit' | 'sky';
  furniture: 'plinths' | 'shelves' | 'desk' | 'benches';
};

const ROOMS: Record<HallId, Room> = {
  collection: { w: 14.5, h: 5.6, d: 10.4, light: 'side', furniture: 'plinths' },
  practice:   { w: 10.4, h: 5.2, d: 22.0, light: 'top', furniture: 'plinths' },
  archive:    { w: 10.4, h: 5.6, d: 10.4, light: 'slit', furniture: 'shelves' },
  study:      { w: 7.4, h: 8.4, d: 7.4, light: 'top', furniture: 'desk' },
  court:      { w: 26, h: 0, d: 12, light: 'sky', furniture: 'benches' },
  auditorium: { w: 15.0, h: 8.0, d: 15.0, light: 'top', furniture: 'benches' },
  workshop:   { w: 18.0, h: 4.6, d: 6.2, light: 'top', furniture: 'plinths' },
  terrace:    { w: 10.4, h: 0, d: 9.4, light: 'sky', furniture: 'benches' },
};

/* Куда смотрит глаз. Для прямоугольных залов это точка чуть впереди на
   высоте роста, но в круглом зале главное лежит НИЖЕ линии взгляда: если
   смотреть горизонтально, кадр занимает пустая стена, а амфитеатр остаётся
   под ним. */
export function interiorTarget(hall: HallId): [number, number, number] {
  if (hall === 'auditorium') return [0, 0.5, -1.4];
  return [0, 1.5, -2];
}

export function interiorEye(hall: HallId): [number, number, number] {
  const room = ROOMS[hall];
  /* Глаз стоит внутри у дальней стены и смотрит вдоль зала: длинную галерею
     нужно видеть в длину, а не упираться в стену. */
  /* Во дворе глаз стоит у воды и смотрит на фасад: спиной к зданию двор
     выглядит пустой площадкой. */
  if (hall === 'court') return [room.w * 0.12, 1.7, room.d * 0.42];
  /* На террасе и во дворе одинаково нет потолка, но смотрят с них в разные
     стороны: во дворе на фасад, с террасы вдоль перголы. */
  if (hall === 'terrace') return [room.w * 0.3, 1.66, room.d * 0.4];
  /* В лектории стоят на верхней ступени у стены: оттуда видно, как места
     сходятся к кафедре. С пола круглого зала виден только подступенок. */
  if (hall === 'auditorium') return [0.6, 4.25, room.w / 2 - 1.4];
  /* Цех длинный и низкий: глаз ставим у торца, чтобы читалась длина, а не
     ближайший верстак. */
  if (hall === 'workshop') return [-room.w * 0.34, 1.62, room.d * 0.3];
  /* В архиве стеллажи стоят посреди комнаты: глаз ставим в проход у стены,
     иначе первый кадр — торец полки в тридцати сантиметрах от лица. */
  if (hall === 'archive') return [room.w * 0.40, 1.65, room.d * 0.40];
  /* В кабинете стол стоит под фонарём, а глаз — в углу: так видно и стол,
     и высоту шахты, ради которой этот зал вертикальный. */
  if (hall === 'study') return [room.w * 0.34, 1.62, room.d * 0.36];
  return [room.w * 0.24, 1.65, room.d * 0.42];
}

/* Точка, где стоит зритель, — не место для экспозиции. Подиум, оказавшийся
   в полутора метрах от глаза, занимает пол-кадра тёмной стеной, и первое
   впечатление от зала — что во что-то упёрся. */
function clearOfViewer(hall: HallId, x: number, z: number) {
  const [ex, , ez] = interiorEye(hall);
  return Math.hypot(x - ex, z - ez) > 2.8;
}

function Plinths({ room, hall }: { room: Room; hall: HallId }) {
  const items = useMemo(() => {
    const out: [number, number, number][] = [];
    const along = Math.max(2, Math.floor(room.d / 4.4));
    for (let i = 0; i < along; i += 1) {
      const z = (i - (along - 1) / 2) * (room.d / (along + 0.4));
      if (clearOfViewer(hall, -room.w * 0.18, z)) out.push([-room.w * 0.18, 0.45, z]);
      if (clearOfViewer(hall, room.w * 0.2, z + 1.4)) out.push([room.w * 0.2, 0.32, z + 1.4]);
    }
    return out;
  }, [room, hall]);

  return (
    <group>
      {items.map(([x, h, z], index) => (
        <mesh key={index} position={[x, h / 2, z]} castShadow receiveShadow>
          <boxGeometry args={[index % 2 ? 0.9 : 1.4, h, index % 2 ? 0.9 : 1.4]} />
          <meshStandardMaterial color={PLINTH} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/* РАБОТЫ В ЗАЛАХ.
 *
 * Пустой зал честен ровно один раз: на второй он читается недоделанным. Пока
 * каталог собирается, в двух открытых залах стоят вещи, сделанные тем же
 * способом, что и здание, — числами. Их пять типов, и каждый отличается от
 * соседа не формой, а материалом: бронза, камень, сталь, стекло и холст.
 *
 * Ни одна из них не подписана: подпись появится вместе с настоящим объектом
 * и его паспортом, а придумывать авторов и даты в макете нельзя.
 */
function BronzeSheet({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} rotation={[0, 0.6, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.62, 0.62, 1.7, 28, 1, true, 0.4, 3.6]} />
      <meshStandardMaterial color={BRONZE} roughness={0.4} metalness={0.45} envMapIntensity={2.4} side={DoubleSide} />
    </mesh>
  );
}

function StoneBlock({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} rotation={[0, 0.28, 0.05]} castShadow receiveShadow>
      <boxGeometry args={[0.52, 1.25, 0.44]} />
      <meshStandardMaterial color={STONE} roughness={0.5} metalness={0.04} envMapIntensity={1.4} />
    </mesh>
  );
}

/* Кольцо стояло почти плашмя и висело над подиумом непонятно на чём. Оно
   СТОИТ: наклон в несколько градусов, низ на крышке подиума. */
function SteelRing({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} rotation={[0.12, 0.5, 0.06]} castShadow>
      <torusGeometry args={[0.6, 0.075, 16, 42]} />
      <meshStandardMaterial color={STEEL} roughness={0.3} metalness={0.5} envMapIntensity={2.4} />
    </mesh>
  );
}

function Vitrine({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Стекло витрины: тонкая оболочка, а не сплошной куб. Прозрачность
          дешёвая (без transmission), но с низкой шероховатостью и бликом. */}
      <mesh castShadow>
        <boxGeometry args={[0.78, 0.95, 0.78]} />
        <meshPhysicalMaterial
          color="#dfe6e8"
          transparent
          opacity={0.22}
          roughness={0.04}
          metalness={0.02}
          clearcoat={1}
          clearcoatRoughness={0.04}
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[0, -0.24, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.3, 0.34, 0.3]} />
        <meshStandardMaterial color="#e7e1d5" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.06, 0]} castShadow>
        <sphereGeometry args={[0.19, 20, 16]} />
        <meshStandardMaterial color="#efe9dd" roughness={0.78} />
      </mesh>
    </group>
  );
}

/* Холсты на стене. Цвет здесь единственный во всём музее: бетон, стекло и
   бронза дают только тон, и без этих четырёх пятен зал остаётся чертежом. */
function Canvases({ room, wallX }: { room: Room; wallX: number }) {
  const items = useMemo(() => {
    const count = Math.min(4, Math.max(2, Math.floor(room.d / 3.2)));
    return Array.from({ length: count }, (_, i) => ({
      z: (i - (count - 1) / 2) * (room.d / (count + 0.5)),
      tone: CANVAS_TONES[i % CANVAS_TONES.length],
      h: i % 2 ? 1.5 : 1.05,
      w: i % 3 ? 1.15 : 1.7,
    }));
  }, [room]);

  const facing = wallX < 0 ? 1 : -1;

  return (
    <group>
      {items.map((item) => (
        <group key={item.z} position={[wallX + facing * 0.1, room.h * 0.52, item.z]} rotation={[0, facing * Math.PI / 2, 0]}>
          {/* Подрамник глубже холста: картина висит НА стене, а не наклеена */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[item.w, item.h, 0.09]} />
            <meshStandardMaterial color="#e6e0d4" roughness={0.92} />
          </mesh>
          <mesh position={[0, 0, 0.05]}>
            <planeGeometry args={[item.w - 0.14, item.h - 0.14]} />
            <meshStandardMaterial color={item.tone} roughness={0.86} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* СВЕТ НА ВЕЩЬ.
 *
 * Лампочка над подиумом светит во все стороны и заодно засвечивает потолок,
 * поэтому зал получался равномерно-светлым, а работа в нём — просто предметом.
 * Прожектор с мягким краем даёт пятно на полу и вокруг него полутьму: ровно
 * то, чем экспозиция отличается от освещённой комнаты. Цель прожектора —
 * отдельный объект под самой работой, иначе луч смотрит в начало координат. */
function WorkLight({ x, z, height, sharp }: { x: number; z: number; height: number; sharp: boolean }) {
  const target = useMemo(() => new Object3D(), []);

  return (
    <group>
      <primitive object={target} position={[x, 0.4, z]} />
      <spotLight
        position={[x, height - 0.35, z]}
        target={target}
        angle={sharp ? 0.42 : 0.6}
        penumbra={0.85}
        intensity={sharp ? 42 : 26}
        distance={height * 2.4}
        decay={2}
        color={LIGHT}
      />
    </group>
  );
}

function Works({ room, hall }: { room: Room; hall: HallId }) {
  /* Работы стоят на тех же подиумах, что уже расставлены по залу: сначала
     подиум, потом вещь на нём, а не вещь, парящая рядом.
     Порядок типов раньше был просто остатком от деления, и вещи шли по кругу
     одна за другой: бронза, камень, кольцо, витрина, бронза... Зал читался
     каталогом образцов. Теперь ряд задан руками, часть подиумов ОСТАЁТСЯ
     ПУСТОЙ, и в проходе появляется пауза. */
  const spots = useMemo(() => {
    const order = [0, 2, -1, 1, 3, 0, -1, 2];
    const out: { x: number; y: number; z: number; kind: number; turn: number }[] = [];
    const along = Math.max(2, Math.floor(room.d / 4.4));
    for (let i = 0; i < along; i += 1) {
      const z = (i - (along - 1) / 2) * (room.d / (along + 0.4));
      if (clearOfViewer(hall, -room.w * 0.18, z)) {
        out.push({ x: -room.w * 0.18, y: 0.45, z, kind: order[(i * 2) % order.length], turn: (i % 3) * 0.4 });
      }
      if (clearOfViewer(hall, room.w * 0.2, z + 1.4)) {
        out.push({ x: room.w * 0.2, y: 0.32, z: z + 1.4, kind: order[(i * 2 + 1) % order.length], turn: (i % 2) * 0.7 - 0.3 });
      }
    }
    return out;
  }, [room, hall]);

  return (
    <group>
      {spots.map((spot, index) => {
        const base: [number, number, number] = [spot.x, spot.y, spot.z];
        if (spot.kind < 0) return null;
        return (
          <group key={index} position={[base[0], 0, base[2]]} rotation={[0, spot.turn, 0]}>
            {spot.kind === 0 && <BronzeSheet position={[0, base[1] + 0.85, 0]} />}
            {spot.kind === 1 && <StoneBlock position={[0, base[1] + 0.63, 0]} />}
            {spot.kind === 2 && <SteelRing position={[0, base[1] + 0.67, 0]} />}
            {spot.kind === 3 && <Vitrine position={[0, base[1] + 0.5, 0]} />}
          </group>
        );
      })}
      {spots.map((spot, index) => (
        spot.kind < 0 ? null : (
          <WorkLight key={`l-${index}`} x={spot.x} z={spot.z} height={room.h} sharp={index % 2 === 0} />
        )
      ))}
      {/* Скамья посреди зала: масштаб человека и место, откуда смотрят. Без
          неё зал — коридор с вещами по краям. */}
      <group position={[room.w * 0.04, 0, -room.d * 0.16]}>
        <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.7, 0.12, 2.4]} />
          <meshStandardMaterial color={PLINTH} roughness={0.72} />
        </mesh>
        {[-0.9, 0.9].map((oz) => (
          <mesh key={oz} position={[0, 0.19, oz]} castShadow>
            <boxGeometry args={[0.56, 0.36, 0.12]} />
            <meshStandardMaterial color={DARK} roughness={0.8} metalness={0.2} />
          </mesh>
        ))}
      </group>
      <Canvases room={room} wallX={hall === 'practice' ? room.w / 2 - 0.06 : -room.w / 2 + 0.06} />
    </group>
  );
}

function Shelves({ room }: { room: Room }) {
  const racks = useMemo(() => {
    const out: number[] = [];
    const count = 4;
    for (let i = 0; i < count; i += 1) out.push((i - (count - 1) / 2) * (room.d / (count + 0.6)));
    return out;
  }, [room]);

  return (
    <group>
      {racks.map((z) => (
        <group key={z} position={[0, 0, z]}>
          {[0, 1, 2, 3].map((level) => (
            <mesh key={level} position={[0, 0.6 + level * 0.78, 0]} castShadow receiveShadow>
              <boxGeometry args={[room.w * 0.62, 0.08, 0.8]} />
              <meshStandardMaterial color={DARK} roughness={0.85} metalness={0.2} />
            </mesh>
          ))}
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * room.w * 0.3, 1.7, 0]} castShadow>
              <boxGeometry args={[0.1, 3.4, 0.8]} />
              <meshStandardMaterial color={DARK} roughness={0.8} metalness={0.25} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Desk() {
  return (
    <group position={[0, 0, -0.2]}>
      <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 0.08, 1.1]} />
        <meshStandardMaterial color={PLINTH} roughness={0.75} />
      </mesh>
      {[[-1, -0.45], [1, -0.45], [-1, 0.45], [1, 0.45]].map(([sx, sz], index) => (
        <mesh key={index} position={[sx * 1.0, 0.37, sz]} castShadow>
          <boxGeometry args={[0.08, 0.74, 0.08]} />
          <meshStandardMaterial color={DARK} roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 0.42, 0.85]} castShadow>
        <boxGeometry args={[0.5, 0.84, 0.5]} />
        <meshStandardMaterial color={DARK} roughness={0.9} />
      </mesh>
    </group>
  );
}

function Benches({ room }: { room: Room }) {
  const seats = useMemo(() => [-room.w * 0.22, 0, room.w * 0.22], [room]);
  return (
    <group>
      {seats.map((x) => (
        <mesh key={x} position={[x, 0.22, -room.d * 0.3]} castShadow receiveShadow>
          <boxGeometry args={[3.4, 0.44, 0.7]} />
          <meshStandardMaterial color={PLINTH} roughness={0.92} />
        </mesh>
      ))}
      {/* вода: во дворе она и есть пол */}
      <mesh position={[0, 0.06, room.d * 0.16]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[room.w * 0.8, room.d * 0.5]} />
        <meshStandardMaterial color="#8e9aa0" roughness={0.35} metalness={0.35} />
      </mesh>
    </group>
  );
}

export function Interior({ hall }: { hall: HallId }) {
  const room = ROOMS[hall];
  const tone = HALL_TONE[hall] ?? { wall: WALL, floor: FLOOR };

  /* Свет входит там же, где в наружном объёме есть проём: иначе интерьер
     перестаёт быть интерьером этого здания и становится просто коробкой. */
  const openings = useMemo(() => {
    if (room.light === 'side') {
      const count = Math.max(3, Math.floor(room.d / 1.8));
      return Array.from({ length: count }, (_, i) => (i - (count - 1) / 2) * (room.d / count));
    }
    if (room.light === 'top') {
      const count = hall === 'study' ? 1 : 5;
      return Array.from({ length: count }, (_, i) => (i - (count - 1) / 2) * (room.d / (count + 0.8)));
    }
    return [0];
  }, [room, hall]);

  return (
    <group>
      {/* Пол общий для всех залов, включая двор */}
      {/* Пол был абсолютно матовым, и свет на нём не оставлял ничего: ни
          пятна под фонарём, ни отблеска от работы. Шлифованный бетон
          отражает слабо, но отражает, и именно этим пол отличается от
          картонки. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[room.w, room.d]} />
        <meshStandardMaterial
          color={tone.floor}
          roughness={0.58}
          metalness={0.05}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>

      {/* Лекторий круглый и снаружи, и внутри: коробка с рядами скамей внутри
          барабана — это разные здания. Оболочка цилиндрическая, места идут
          ступенями к центру, свет падает кольцом по краю потолка. */}
      {hall === 'auditorium' && (
        <group>
          <mesh position={[0, room.h / 2 - 0.2, 0]} receiveShadow>
            <cylinderGeometry args={[room.w / 2, room.w / 2, room.h + 0.4, 48, 1, true]} />
            <meshStandardMaterial color={tone.wall} roughness={0.9} side={BackSide} />
          </mesh>
          <mesh position={[0, room.h - 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[room.w / 2, 48]} />
            <meshStandardMaterial color={WALL} roughness={0.95} side={BackSide} />
          </mesh>
          {/* Кольцевой фонарь по краю потолка */}
          <mesh position={[0, room.h - 0.26, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[room.w / 2 - 1.5, room.w / 2 - 0.45, 48]} />
            <meshBasicMaterial color={LIGHT} side={DoubleSide} />
          </mesh>
          {/* Ступени мест — КОЛЬЦА, а не диски. Сплошные диски, вложенные
             друг в друга, прячут внутренние ярусы внутри наружного, и зал
             читался одной гладкой чашей без единой ступени. */}
          {[0, 1, 2, 3].map((tier) => {
            const outer = room.w / 2 - 0.8 - tier * 1.35;
            const inner = outer - 1.35;
            const top = 2.6 - tier * 0.7;
            return (
              <group key={tier}>
                {/* проступь */}
                <mesh position={[0, top, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                  <ringGeometry args={[inner, outer, 48]} />
                  <meshStandardMaterial color={PLINTH} roughness={0.9} side={DoubleSide} />
                </mesh>
                {/* подступенок темнее проступи, иначе ступень не видно */}
                <mesh position={[0, top - 0.35, 0]} receiveShadow castShadow>
                  <cylinderGeometry args={[outer, outer, 0.7, 48, 1, true]} />
                  <meshStandardMaterial color={FLOOR} roughness={0.95} side={DoubleSide} />
                </mesh>
              </group>
            );
          })}

          {/* Кафедра в центре: без неё круг не читается залом */}
          <mesh position={[0, 0.52, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.8, 1.04, 0.55]} />
            <meshStandardMaterial color="#6f6a62" roughness={0.9} />
          </mesh>
          {Array.from({ length: 6 }, (_, i) => (i / 6) * Math.PI * 2).map((angle) => (
            <pointLight
              key={angle}
              position={[Math.sin(angle) * (room.w / 2 - 1.1), room.h - 0.8, Math.cos(angle) * (room.w / 2 - 1.1)]}
              intensity={7}
              distance={room.w * 1.6}
              decay={2}
              color={LIGHT}
            />
          ))}
        </group>
      )}

      {room.h > 0 && hall !== 'auditorium' && (
        <>
          {/* Оболочка комнаты: одна коробка, вывернутая внутрь. Отдельные стены
              дают щели по углам ровно там, куда смотрит глаз. */}
          {/* Оболочка опущена ниже пола на сорок сантиметров. Раньше её нижняя
              грань лежала ровно на полу, и две поверхности в одной плоскости
              спорили за глубину: пол мерцал при каждом повороте камеры.
              Оболочка удлинена ВНИЗ: потолок остаётся на своей высоте, а
              лишние сорок сантиметров прячутся под полом. */}
          <mesh position={[0, room.h / 2 - 0.2, 0]} receiveShadow>
            <boxGeometry args={[room.w, room.h + 0.4, room.d]} />
            <meshStandardMaterial color={tone.wall} roughness={0.9} side={BackSide} />
          </mesh>

          {room.light === 'side' && openings.map((z) => (
            <mesh key={z} position={[-room.w / 2 + 0.06, room.h * 0.55, z]} rotation={[0, Math.PI / 2, 0]}>
              <planeGeometry args={[0.62, room.h * 0.62]} />
              <meshBasicMaterial color={LIGHT} side={DoubleSide} />
            </mesh>
          ))}

          {room.light === 'top' && openings.map((z) => (
            <mesh key={z} position={[0, room.h - 0.06, z]} rotation={[Math.PI / 2, 0, 0]}>
              <planeGeometry args={[room.w * 0.62, 0.8]} />
              <meshBasicMaterial color={LIGHT} side={DoubleSide} />
            </mesh>
          ))}

          {room.light === 'slit' && (
            <mesh position={[0, room.h * 0.5, room.d / 2 - 0.06]}>
              <planeGeometry args={[0.5, room.h * 0.55]} />
              <meshBasicMaterial color={LIGHT} side={DoubleSide} />
            </mesh>
          )}
        </>
      )}

      {/* Свет от проёмов, а не от абстрактной лампы над сценой */}
      {room.light === 'top' && hall !== 'auditorium' && openings.map((z) => (
        <pointLight
          key={`l-${z}`}
          position={[0, room.h - 0.6, z]}
          /* В шахте фонарь один и высоко: та же сила, что в низком зале,
             до пола просто не доходит. */
          intensity={hall === 'study' ? 46 : 16}
          distance={room.h * 2.6}
          decay={2}
          color={LIGHT}
        />
      ))}
      {/* Свет идёт от каждого проёма, а не от одной лампы у стены: иначе
          дальний конец галереи тонет, хотя в фасаде там такие же щели. */}
      {room.light === 'side' && openings.map((z) => (
        <pointLight key={`s-${z}`} position={[-room.w / 2 + 1.4, room.h * 0.58, z]} intensity={9} distance={room.w * 2.2} decay={2} color={LIGHT} />
      ))}
      {room.light === 'slit' && (
        <pointLight position={[0, room.h * 0.5, room.d / 2 - 1]} intensity={30} distance={room.d * 2.2} decay={2} color={LIGHT} />
      )}
      {/* В архиве света и должно быть мало, но не настолько, чтобы не видеть,
          где стоишь. */}
      {/* В мастерской свет рабочий, а не музейный: под пилой фонарей весь день
          ровно светло, и полумрак читался бы не цехом, а подвалом. */}
      <hemisphereLight args={['#f6f2ec', '#6f6a62', room.light === 'sky' ? 1.15 : hall === 'workshop' ? 1.0 : room.light === 'slit' ? 0.5 : 0.66]} />

      {/* Терраса — тоже под небом, но вокруг неё не двор, а пергола: тени от
          балок и есть всё, что делает эту площадку залом. */}
      {hall === 'terrace' && (
        <group>
          {Array.from({ length: 10 }, (_, i) => (i - 4.5) * (room.d / 11)).map((z) => (
            <mesh key={z} position={[0, 3.05, z]} castShadow>
              <boxGeometry args={[room.w * 0.72, 0.2, 0.24]} />
              <meshStandardMaterial color="#cdc8bf" roughness={0.9} />
            </mesh>
          ))}
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * room.w * 0.34, 1.5, 0]} castShadow>
              <boxGeometry args={[0.28, 3.0, room.d * 0.8]} />
              <meshStandardMaterial color="#cdc8bf" roughness={0.9} />
            </mesh>
          ))}
          {/* Парапет по краю: без него площадка висит в воздухе без границы. */}
          <mesh position={[0, 0.55, -room.d / 2 + 0.3]} castShadow receiveShadow>
            <boxGeometry args={[room.w, 1.1, 0.6]} />
            <meshStandardMaterial color={WALL} roughness={0.94} />
          </mesh>
          <directionalLight position={[10, 16, 10]} intensity={1.5} color="#fff4e4" castShadow shadow-mapSize={[1024, 1024]} />
        </group>
      )}

      {room.furniture === 'plinths' && <Plinths room={room} hall={hall} />}
      {/* Коллекция и практика — единственные залы, где уже что-то стоит:
          архив и кабинет по смыслу пустые, мастерская пока рабочая. */}
      {(hall === 'collection' || hall === 'practice') && <Works room={room} hall={hall} />}
      {room.furniture === 'shelves' && <Shelves room={room} />}
      {room.furniture === 'desk' && <Desk />}
      {room.furniture === 'benches' && hall !== 'auditorium' && <Benches room={room} />}

      {/* Двор — не комната: у него нет потолка, но есть то, ради чего в нём
          стоят. Без массы над головой это была пустая плоскость с водой,
          то есть ничего. Здесь фасад напротив и консоль, нависающая слева. */}
      {hall === 'court' && (
        <group>
          <mesh position={[0, 4.2, -room.d * 0.52]} receiveShadow castShadow>
            <boxGeometry args={[room.w, 8.4, 1.2]} />
            <meshStandardMaterial color={WALL} roughness={0.94} />
          </mesh>
          {/* рёбра фасада: тот же ритм, что снаружи */}
          {Array.from({ length: 9 }, (_, i) => (i - 4) * (room.w / 10)).map((x) => (
            <mesh key={x} position={[x, 4.6, -room.d * 0.52 + 0.8]} castShadow>
              <boxGeometry args={[0.36, 6.2, 0.5]} />
              <meshStandardMaterial color={PLINTH} roughness={0.92} />
            </mesh>
          ))}
          {/* консоль над головой: во дворе она главное впечатление */}
          <mesh position={[-room.w * 0.22, 8.6, -room.d * 0.1]} castShadow receiveShadow>
            <boxGeometry args={[10.5, 6.4, room.d * 1.1]} />
            <meshStandardMaterial color="#c8c3ba" roughness={0.9} />
          </mesh>
          <directionalLight position={[14, 18, 12]} intensity={1.6} color="#fff4e4" castShadow shadow-mapSize={[1024, 1024]} />
        </group>
      )}
    </group>
  );
}

export default Interior;
