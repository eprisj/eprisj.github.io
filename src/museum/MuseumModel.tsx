import { Component, createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Html, Lightformer, MeshReflectorMaterial, OrbitControls, RoundedBox } from '@react-three/drei';
import {
  ACESFilmicToneMapping,
  Color,
  CubeCamera,
  DoubleSide,
  ExtrudeGeometry,
  LinearMipmapLinearFilter,
  CanvasTexture,
  RepeatWrapping,
  SRGBColorSpace,
  Shape,
  Spherical,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLCubeRenderTarget,
} from 'three';
import type { Group, PerspectiveCamera, Texture } from 'three';
import { HALLS, type HallId } from './halls';
import { Interior, interiorEye, interiorTarget } from './Interior';

/* Эффекты — свой чанк на 155 КБ, и телефон его не скачивает: см. Effects.tsx */
const Effects = lazy(() => import('./Effects'));
/* Интерьеры лежат в том же чанке, что и макет: точка глаза нужна модели
   сразу, а сами комнаты — это полторы сотни строк геометрии, ради которых
   отдельный запрос не окупается. */

export type MuseumLabels = Record<HallId, string>;

/* НАКЛАДКИ НАД ХОЛСТОМ.
 *
 * Кнопка, подписи залов и метка «вы внутри» жили каждая своим размером и
 * своим весом, и вместе выглядели наклеенными. Один класс на все: та же
 * микротипографика, что в служебных строках страницы, тонкая рамка вместо
 * жирной и лёгкая подложка вместо тени — читается и на светлом фасаде, и на
 * тёмной стене зала, но не спорит с макетом.
 */
const CHIP =
  'border border-[rgb(var(--c-accent-rgb)_/_0.45)] bg-[rgb(var(--c-bg-rgb)_/_0.92)] ' +
  'font-mono text-[8px] uppercase tracking-[0.16em] text-[var(--c-accent)] backdrop-blur-[2px]';

/* Куб-карта отражений раздаётся через контекст: стекло разбросано по всему
   зданию, и тянуть проп через шесть уровней ради него незачем. */
const ReflectionContext = createContext<Texture | null>(null);
const useReflection = () => useContext(ReflectionContext);

/* ЗДАНИЕ МУЗЕЯ, СОБРАННОЕ КОДОМ, А НЕ ЗАГРУЖЕННОЕ ФАЙЛОМ.
 *
 * Первая версия была стопкой коробок и читалась свадебным тортом: симметрия,
 * ровный серый и чёрная крыша. Брутализм держится не на количестве бетона, а
 * на нескольких ходах, и здесь их четыре:
 *
 *   1. ДВА ОБЪЁМА КРЕСТ-НАКРЕСТ. Длинная галерея лежит поперёк участка,
 *      верхняя нанизана на неё под прямым углом и вылетает консолью. Крест
 *      даёт силуэт с любой стороны, стопка — только с угла.
 *   2. ПРОВАЛ НАСКВОЗЬ. Нижняя галерея разорвана порталом: сквозь здание
 *      видно небо и двор. Пустота работает наравне с массой.
 *   3. РЁБРА. Вертикальные лопатки по фасаду ловят солнце и дают фактуру,
 *      которая читается и в силуэте, и вблизи. Без них бетон — картон.
 *   4. ВОДА. Опущенный двор залит водой: отражение удваивает массу и даёт
 *      единственную подвижную вещь в кадре.
 *
 * Ни одного .glb, ни одной текстуры, ни одного внешнего запроса. Рёбра,
 * кессоны и ступени — инстансы, поэтому их сотни, а вызовов отрисовки
 * единицы. Форма правится числами.
 *
 * Объёмы здесь не декорация: каждый из них — зал со своим адресом и уровнем
 * доступа (см. halls.ts).
 */

const CONCRETE = '#b6b0a7';
const CONCRETE_LIT = '#cdc8bf';    // верхняя консоль: светлее, чтобы читалась над тенью
const CONCRETE_DEEP = '#9a948b';
const CONCRETE_DARK = '#78736c';
/* Цоколь заметно темнее корпуса: одинаковый тон превращал макет в серое
   пятно, из которого не выделяется ни одна масса. */
const PLINTH_TONE = '#6f6a63';
const SHADOW = '#413d38';
const GLASS = '#26262a';
const WATER = '#8e9aa0';
const GOLD = '#c9a690';

/* Рельеф заметный, но не штукатурка: на большем значении бетон начинает
   выглядеть отлитым из творога. */
const NORMAL_SCALE = new Vector2(0.7, 0.7);

/* Сколько метров стены покрывает одна плитка текстуры. Плитка квадратная,
   значит и на длинной стене, и на парапете зерно одинаковое только если
   повтор считать от габарита. */
const TILE_METRES = 7;

/* КАРТЫ БЕТОНА ЛЕЖАТ ФАЙЛАМИ.
 *
 * Раньше они считались на canvas при первом показе: это ничего не весило, но
 * и уметь могло немного. Здесь щиты опалубки со смещением рисунка, отверстия
 * от стяжных болтов регулярной сеткой, потёки от швов, сколы кромок и
 * раковины — то, что офлайн считается за секунды, а в браузере за минуты.
 * Триста шестьдесят килобайт на три карты, и только в чанке музея. */
/* Карты грузятся императивно, а не через useLoader.
 *
 * useLoader подвешивает всё поддерево до готовности файла, и на треть
 * мегабайта это несколько секунд пустого холста: здание не появлялось,
 * пока не приедет его шкура. Теперь оно появляется сразу серым и
 * одевается, когда карты доедут. */
type Concrete = { normalMap: Texture; roughnessMap: Texture; map: Texture } | null;

function useConcrete(): Concrete {
  const [maps, setMaps] = useState<Concrete>(null);

  useEffect(() => {
    let alive = true;
    const loader = new TextureLoader();
    const load = (url: string) => new Promise<Texture>((resolve, reject) => loader.load(url, resolve, undefined, reject));

    Promise.all([
      load('/museum/concrete-normal.webp'),
      load('/museum/concrete-rough.webp'),
      load('/museum/concrete-albedo.webp'),
    ])
      .then(([normalMap, roughnessMap, map]) => {
        if (!alive) return;
        [normalMap, roughnessMap, map].forEach((texture) => {
          texture.wrapS = RepeatWrapping;
          texture.wrapT = RepeatWrapping;
          texture.anisotropy = 16;
        });
        /* Цвет — в sRGB, рельеф и шероховатость — числа, а не цвет. */
        map.colorSpace = SRGBColorSpace;
        setMaps({ normalMap, roughnessMap, map });
      })
      /* Без текстур здание просто остаётся гладким: это хуже, но это
         здание, а не пустой холст с ошибкой. */
      .catch(() => {});

    return () => { alive = false; };
  }, []);

  return maps;
}

function concreteRepeat(width: number, height: number) {
  return new Vector2(Math.max(1, width / TILE_METRES), Math.max(1, height / TILE_METRES));
}

/* ── ГАБАРИТЫ ─────────────────────────────────────────────────────────
   Здание собрано из четырёх масс. Числа держатся здесь, а не разбросаны по
   компонентам: пропорции правятся в одном месте. */
const PLINTH = { w: 33, d: 20, h: 1.5 };
/* Одна длинная горизонталь вместо двух блоков: разрыв посередине разрушал
   главную линию здания, а портал никто не читал как пустоту — только как щель
   между двумя коробками. Архив сидит в дальнем конце той же массы. */
const BAR = { w: 30.0, h: 7.4, d: 11.0, x: -1.0, y: 1.5 };
const BAR_LEFT = { x: -8.6, w: 14.4 };            // collection: ближняя треть
const BAR_RIGHT = { x: 9.4, w: 11.0 };            // archive: дальняя треть
/* Верхняя галерея нанизана на нижнюю под прямым углом и вылетает консолью
   вперёд, к воде: шесть метров над пустотой. Это и есть главный ход. */
const CROSS = { w: 11.0, h: 6.6, d: 24.0, x: -6.0, y: 9.5, z: 2.0 };  // practice
/* Верхняя галерея расщеплена на две плиты: западная во всю длину, восточная
   короче, между ними световая щель. Числа вынесены наружу, потому что по ним
   считаются и опалубка, и кессоны, и фонари. */
/* Середина застройки относительно начала координат. Слева край подиума
   лектория (-18.5), справа край мастерских (+23.4). */
const SITE_OFFSET_X = -2.45;
const CROSS_SLOT = 1.9;
const CROSS_W_SLAB = (11.0 - CROSS_SLOT) / 2;                          // 4.55
const CROSS_WEST_X = -6.0 - (CROSS_SLOT + CROSS_W_SLAB) / 2;
const CROSS_EAST_X = -6.0 + (CROSS_SLOT + CROSS_W_SLAB) / 2;
const CROSS_EAST_D = 19.0;
const TOWER = { w: 6.0, d: 6.0, h: 13.4, x: 11.6, z: -2.4 };          // study
const POOL = { w: 26, d: 11, z: 17.0, y: -1.2 };                       // court
/* Три объёма пристроены позже и намеренно другой природы: крест из двух
   коробок держит силуэт, но здание из одних коробок читается схемой. Барабан
   даёт кривую, пила — ритм, терраса — пустоту наверху. */
const DRUM = { r: 4.8, h: 8.2, x: -11.8, z: 12.2, base: 0.9 };         // auditorium: стоит в воде двора
const SHED = { w: 9.6, h: 4.4, d: 7.6, x: 18.6, z: 2.6 };              // workshop: низкое крыло справа
const TERRACE_Y = 1.5 + 1.1 + 7.4;                                      // terrace: кровля правой трети

/* Скруглённая коробка вместо box: идеальное ребро выдаёт компьютер, а фаска в
   пару сантиметров ловит свет и делает бетон бетоном. */
function Mass({
  size,
  position,
  color,
  radius = 0.1,
  onSelect,
  onHover,
  hallId,
}: {
  size: [number, number, number];
  position: [number, number, number];
  color: string;
  radius?: number;
  onSelect?: (id: HallId) => void;
  onHover?: (id: HallId | null) => void;
  hallId?: HallId;
}) {
  /* Картинка одна на всю сцену, повтор — свой у каждой массы: текстура
     клонируется, изображение остаётся общим. */
  const maps = useConcrete();
  const surface = useMemo(() => {
    if (!maps) return null;
    const normalMap = maps.normalMap.clone();
    const roughnessMap = maps.roughnessMap.clone();
    const map = maps.map.clone();
    const repeat = concreteRepeat(size[0], size[1]);
    [normalMap, roughnessMap, map].forEach((texture) => {
      texture.repeat.copy(repeat);
      texture.needsUpdate = true;
    });
    return { normalMap, roughnessMap, map };
  }, [maps, size[0], size[1]]);

  return (
    <RoundedBox
      args={size}
      radius={radius}
      smoothness={2}
      position={position}
      castShadow
      receiveShadow
      onPointerOver={hallId ? (event) => { event.stopPropagation(); onHover?.(hallId); } : undefined}
      onPointerOut={hallId ? () => onHover?.(null) : undefined}
      onClick={hallId ? (event) => { event.stopPropagation(); onSelect?.(hallId); } : undefined}
    >
      <meshStandardMaterial
        color={color}
        roughness={0.82}
        metalness={0.03}
        envMapIntensity={0.6}
        map={surface?.map ?? null}
        normalMap={surface?.normalMap ?? null}
        normalScale={NORMAL_SCALE}
        roughnessMap={surface?.roughnessMap ?? null}
      />
    </RoundedBox>
  );
}

/* ОТРАЖЕНИЕ СНИМАЕТСЯ С САМОЙ СЦЕНЫ.
 *
 * До этого в стекле отражались только светящиеся плоскости окружения, то
 * есть ровное пятно. Настоящее отражение требует куб-карты, снятой изнутри
 * сцены: тогда в окне видно дерево, соседний объём и небо, а не абстрактный
 * свет.
 *
 * Снимается она ОДИН раз: сцена почти неподвижна, а шесть проходов рендера
 * на каждый кадр — это ровно тот расход, ради которого отражения обычно и
 * выключают. На время съёмки сцене выдаётся фон: без него небо в отражении
 * было бы дырой, потому что холст прозрачный.
 */
function SceneReflection({ onReady }: { onReady: (texture: Texture) => void }) {
  const { gl, scene } = useThree();
  const frame = useRef(0);
  const done = useRef(false);

  const rig = useMemo(() => {
    const target = new WebGLCubeRenderTarget(128, {
      generateMipmaps: true,
      minFilter: LinearMipmapLinearFilter,
    });
    return { target, camera: new CubeCamera(0.5, 400, target) };
  }, []);

  useEffect(() => () => rig.target.dispose(), [rig]);

  useFrame(() => {
    if (done.current) return;
    /* Пара кадров форы: на первом сцена ещё собирается, и в куб попала бы
       половина здания. */
    frame.current += 1;
    if (frame.current < 3) return;

    const previousBackground = scene.background;
    scene.background = new Color('#dfe3e6');
    rig.camera.position.set(0, 4, 4);
    rig.camera.update(gl, scene);
    scene.background = previousBackground;

    done.current = true;
    onReady(rig.target.texture);
  });

  return null;
}

/* ЗЕМЛЯ, КОТОРАЯ РАСТВОРЯЕТСЯ.
 *
 * Здание висело на ровном белом поле: тень падала в пустоту, и объём читался
 * вырезанным из бумаги. Простой диск эту беду меняет на другую — у него
 * виден край, и кадр превращается в стол с макетом.
 *
 * Поэтому у земли есть прозрачность, спадающая к краю: под зданием она
 * плотная и принимает тень, а к границе кадра сходит на нет и переходит в
 * подложку страницы. Маска — радиальный градиент на canvas, сто двадцать
 * восемь пикселей, считается мгновенно.
 */
function Ground() {
  const alpha = useMemo(() => {
    if (typeof document === 'undefined') return null;
    /* Край земли попадает в кадр, как только выбран зал: камера подходит к
       зданию и опускается к горизонту. Гасить его надо не резче, а раньше:
       на 128 пикселях градиент шёл полосами, а круг из 64 сегментов давал
       гранёный силуэт — вместе это читалось рваной кромкой поперёк неба. */
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const gradient = ctx.createRadialGradient(256, 256, 24, 256, 256, 256);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.32, 'rgba(255,255,255,0.9)');
    gradient.addColorStop(0.56, 'rgba(255,255,255,0.42)');
    gradient.addColorStop(0.74, 'rgba(255,255,255,0.12)');
    gradient.addColorStop(0.86, 'rgba(255,255,255,0.02)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    return new CanvasTexture(canvas);
  }, []);

  return (
    <mesh position={[0, -6.76, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      {/* Диск был 96 метров в радиусе при карте теней на 34: за её краем
          three растягивает крайние тексели на всю оставшуюся землю, и по
          горизонту шли концентрические дуги. Земля теперь целиком помещается
          в карту, а дальше её и так нет — она гаснет прозрачностью. */}
      <circleGeometry args={[40, 128]} />
      <meshStandardMaterial
        color="#d8d1c7"
        roughness={1}
        transparent
        alphaMap={alpha ?? undefined}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ПРОЁМ С ОТКОСОМ.
 *
 * Плоское стекло, приклеенное к стене, выдаёт макет: в бетоне окно — это
 * дыра в тридцать сантиметров толщиной, и первое, что видно, не стекло, а
 * тень откоса. Вырезать отверстие нечем — CSG в проекте нет, — но проём это
 * и не отверстие: это ниша, у которой есть щёки, дно и стекло в глубине.
 */
function Opening({
  w,
  h,
  depth = 0.34,
  position,
  rotation = [0, 0, 0],
}: {
  w: number;
  h: number;
  depth?: number;
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  const reflection = useReflection();

  /* Шаг переплёта постоянный в метрах, а не в долях проёма: иначе широкое
     окно и узкое получают одинаковое число членений и перестают отличаться
     размером. */
  const mullions = useMemo(() => {
    if (w < 1.6) return [] as number[];
    const bays = Math.max(2, Math.round(w / 1.15));
    return Array.from({ length: bays - 1 }, (_, i) => (i + 1) * (w / bays) - w / 2);
  }, [w]);

  const transoms = useMemo(() => {
    if (h < 2.2 || w < 1.6) return [] as number[];
    const rows = Math.max(1, Math.round(h / 1.7));
    return Array.from({ length: rows - 1 }, (_, i) => (i + 1) * (h / rows) - h / 2);
  }, [h, w]);

  return (
    <group position={position} rotation={rotation}>
      {/* Щёки и дно ниши: светлый бетон, чтобы тень на них читалась */}
      <mesh position={[0, 0, -depth / 2 + 0.03]} castShadow receiveShadow>
        <boxGeometry args={[w, h, depth]} />
        <meshStandardMaterial color={CONCRETE_DEEP} roughness={0.92} side={DoubleSide} />
      </mesh>
      {/* Стекло на дне ниши: тёмное, гладкое, с отражением окружения */}
      <mesh position={[0, 0, -depth + 0.08]}>
        <planeGeometry args={[Math.max(0.1, w - 0.14), Math.max(0.1, h - 0.14)]} />
        <meshPhysicalMaterial
          color={GLASS}
          roughness={0.06}
          metalness={0.1}
          reflectivity={0.9}
          clearcoat={1}
          clearcoatRoughness={0.08}
          envMap={reflection}
          envMapIntensity={reflection ? 1.35 : 2.6}
        />
      </mesh>
      {/* Переплёт. Широкий проём с одним сплошным стеклом не имеет масштаба:
          по нему нельзя понять, два метра он или пять, и торец консоли
          читался тёмной заплатой. Узкие щели переплёта не получают: там
          членить нечего. */}
      {mullions.map((offset) => (
        <mesh key={`v${offset}`} position={[offset, 0, -depth + 0.14]} castShadow>
          <boxGeometry args={[0.07, h - 0.16, 0.07]} />
          <meshStandardMaterial color={CONCRETE_DARK} roughness={0.8} metalness={0.35} />
        </mesh>
      ))}
      {transoms.map((offset) => (
        <mesh key={`h${offset}`} position={[0, offset, -depth + 0.14]} castShadow>
          <boxGeometry args={[w - 0.16, 0.07, 0.07]} />
          <meshStandardMaterial color={CONCRETE_DARK} roughness={0.8} metalness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

/* Вертикальные лопатки: главный источник фактуры. Шаг крупный — это бетон,
   а не жалюзи, и каждая лопатка отбрасывает собственную тень. */
function Fins({ w, h, y, z, x = 0, step = 1.75, depth = 0.62 }: { w: number; h: number; y: number; z: number; x?: number; step?: number; depth?: number }) {
  const columns = useMemo(() => {
    const out: number[] = [];
    const count = Math.max(2, Math.floor(w / step));
    for (let i = 0; i < count; i += 1) out.push((i - (count - 1) / 2) * (w / count));
    return out;
  }, [w, step]);

  return (
    <group position={[x, y + h / 2, z]}>
      {columns.map((offset) => (
        <mesh key={offset} position={[offset, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.34, h - 0.5, depth]} />
          <meshStandardMaterial color={CONCRETE_LIT} roughness={0.9} />
        </mesh>
      ))}
      {/* За лопатками остеклённая стена с откосом, а не тёмная плита: рёбра
          должны что-то затенять, иначе они узор на глухом фасаде. */}
      <Opening w={w - 0.6} h={h - 1.0} depth={0.44} position={[0, 0, -depth / 2 - 0.06]} />
    </group>
  );
}

/* Кессоны на изнанке консоли. Нависающая плита без кессонов — фанера. */
function Coffers({ w, d, x, y, z }: { w: number; d: number; x: number; y: number; z: number }) {
  const cells = useMemo(() => {
    const out: [number, number][] = [];
    const cols = Math.max(1, Math.floor(w / 2.4));
    const rows = Math.max(1, Math.floor(d / 2.4));
    for (let i = 0; i < cols; i += 1) {
      for (let j = 0; j < rows; j += 1) {
        out.push([(i - (cols - 1) / 2) * (w / cols), (j - (rows - 1) / 2) * (d / rows)]);
      }
    }
    return out;
  }, [w, d]);

  return (
    <group position={[x, y, z]}>
      {cells.map(([cx, cz]) => (
        <mesh key={`${cx}-${cz}`} position={[cx, 0.14, cz]}>
          <boxGeometry args={[w / Math.max(1, Math.floor(w / 2.4)) - 0.5, 0.28, d / Math.max(1, Math.floor(d / 2.4)) - 0.5]} />
          <meshStandardMaterial color={CONCRETE_DARK} roughness={0.96} />
        </mesh>
      ))}
    </group>
  );
}

/* Горизонтальные следы опалубки: тонкие борозды, а не пояса. */
function BoardMarks({ w, d, h, y, x = 0, z = 0, step = 0.9 }: { w: number; d: number; h: number; y: number; x?: number; z?: number; step?: number }) {
  const rows = useMemo(() => {
    const out: number[] = [];
    for (let level = y + step; level < y + h - 0.2; level += step) out.push(level);
    return out;
  }, [h, y, step]);

  return (
    <group position={[x, 0, z]}>
      {rows.map((level) => (
        <mesh key={level} position={[0, level, 0]}>
          {/* Выступ в полтора сантиметра давал мерцание: грани борозды и
              стены оказывались на неразличимой для буфера глубине. Восемь
              сантиметров читаются тем же швом и уже не спорят. */}
          <boxGeometry args={[w + 0.16, 0.05, d + 0.16]} />
          <meshStandardMaterial color={CONCRETE_DEEP} roughness={0.98} />
        </mesh>
      ))}
    </group>
  );
}

/* Трапеция: единственный большой глаз на глухой торцевой стене. */
function TrapezoidEye({ position }: { position: [number, number, number] }) {
  const reflection = useReflection();
  const geometry = useMemo(() => {
    const shape = new Shape();
    shape.moveTo(-2.4, -1.4);
    shape.lineTo(2.4, -1.4);
    shape.lineTo(1.4, 1.4);
    shape.lineTo(-1.4, 1.4);
    shape.closePath();
    return new ExtrudeGeometry(shape, { depth: 0.9, bevelEnabled: false });
  }, []);

  return (
    <group position={position} rotation={[0, Math.PI / 2, 0]}>
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial color={CONCRETE_DEEP} roughness={0.92} />
      </mesh>
      {/* Стекло уходит вглубь коробки, а не лежит на её лице */}
      <mesh position={[0, 0, 0.42]}>
        <planeGeometry args={[4.0, 2.3]} />
        <meshPhysicalMaterial
          color={GLASS}
          roughness={0.05}
          metalness={0.1}
          reflectivity={0.95}
          clearcoat={1}
          clearcoatRoughness={0.06}
          envMap={reflection}
          envMapIntensity={reflection ? 1.45 : 2.8}
        />
      </mesh>
    </group>
  );
}

/* Пилы верхнего света вдоль консоли: ровный свет в зал, ритм на кровле. */
function RoofMonitors({ x, y, z, w, d }: { x: number; y: number; z: number; w: number; d: number }) {
  const bays = useMemo(() => {
    const out: number[] = [];
    const count = 5;
    for (let i = 0; i < count; i += 1) out.push((i - (count - 1) / 2) * (d / (count + 1.1)));
    return out;
  }, [d]);

  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.2, 0]} receiveShadow castShadow>
        <boxGeometry args={[w, 0.4, d]} />
        <meshStandardMaterial color={CONCRETE_DEEP} roughness={0.95} />
      </mesh>
      {bays.map((offset) => (
        <group key={offset} position={[0, 0.4, offset]}>
          {/* Стекло — узкая полоса, всё остальное бетон: чёрные брусья снова
              съедали верх здания и превращали кровлю в решётку. */}
          <mesh position={[0, 0.34, 0.2]} rotation={[-0.9, 0, 0]}>
            <boxGeometry args={[w - 3.2, 0.44, 0.1]} />
            <meshStandardMaterial color={GLASS} roughness={0.18} metalness={0.32} />
          </mesh>
          <mesh position={[0, 0.34, -0.26]} castShadow receiveShadow>
            <boxGeometry args={[w - 2.4, 0.66, 0.46]} />
            <meshStandardMaterial color={CONCRETE_LIT} roughness={0.92} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ОСТЕКЛЁННЫЙ НИЗ.
 *
 * Коробка перестаёт быть коробкой, когда встаёт не на землю, а на стекло:
 * низ уходит в тень, масса повисает, и появляется то, чего не было совсем —
 * глубина за плоскостью фасада. Витраж отодвинут вглубь, перед ним остаются
 * колонны, и между ними видно, что внутри есть пространство.
 */
function GlazedBase({ x, w, d, y, h }: { x: number; w: number; d: number; y: number; h: number }) {
  const reflection = useReflection();
  const columns = useMemo(() => {
    const out: number[] = [];
    const count = Math.max(3, Math.round(w / 4.6));
    for (let i = 0; i < count; i += 1) out.push((i - (count - 1) / 2) * (w / count));
    return out;
  }, [w]);

  return (
    <group position={[x, y, 0]}>
      {/* Витраж по периметру, отодвинутый вглубь на полметра */}
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w - 1.0, h, d - 1.0]} />
        <meshPhysicalMaterial
          color={GLASS}
          roughness={0.05}
          metalness={0.12}
          reflectivity={0.95}
          clearcoat={1}
          clearcoatRoughness={0.06}
          envMap={reflection}
          envMapIntensity={reflection ? 1.5 : 3.0}
        />
      </mesh>
      {/* Импосты: сплошного стекла на пятнадцать метров не бывает, а членение
          заодно даёт масштаб низу. */}
      {columns.map((offset) => (
        <mesh key={`m-${offset}`} position={[offset + w / (columns.length * 2), h / 2, (d - 1.0) / 2 + 0.03]}>
          <boxGeometry args={[0.09, h - 0.08, 0.09]} />
          <meshStandardMaterial color={CONCRETE_DARK} roughness={0.85} metalness={0.3} />
        </mesh>
      ))}
      {/* Тёплый свет изнутри: вечером именно он делает низ живым */}
      <mesh position={[0, h * 0.42, (d - 1.0) / 2 - 0.12]}>
        <planeGeometry args={[w - 3.0, h * 0.34]} />
        <meshBasicMaterial color="#f6e6cc" transparent opacity={0.5} />
      </mesh>
      {columns.map((offset) => (
        <mesh key={offset} position={[offset, h / 2, d / 2 - 0.45]} castShadow receiveShadow>
          <boxGeometry args={[0.62, h, 0.62]} />
          <meshStandardMaterial color={CONCRETE_DEEP} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/* Парапет: у кровли должен быть край. Без него плита обрывается ножом и
   читается срезом в редакторе, а не зданием. */
function Parapet({ x, z, w, d, y }: { x: number; z: number; w: number; d: number; y: number }) {
  return (
    <group position={[x, y, z]}>
      {[[0, d / 2], [0, -d / 2]].map(([ox, oz], index) => (
        <mesh key={`h${index}`} position={[ox, 0.32, oz]} castShadow>
          <boxGeometry args={[w + 0.3, 0.64, 0.3]} />
          <meshStandardMaterial color={CONCRETE_DEEP} roughness={0.94} />
        </mesh>
      ))}
      {[[w / 2, 0], [-w / 2, 0]].map(([ox, oz], index) => (
        <mesh key={`v${index}`} position={[ox, 0.32, oz]} castShadow>
          <boxGeometry args={[0.3, 0.64, d + 0.3]} />
          <meshStandardMaterial color={CONCRETE_DEEP} roughness={0.94} />
        </mesh>
      ))}
    </group>
  );
}

/* ЛЮДИ И ДЕРЕВЬЯ.
 *
 * Ничто не превращает объём в здание так, как человек рядом с ним: без
 * фигуры макет остаётся предметом без размера, и три метра от тридцати
 * отличить нечем. Фигуры условные — вертикаль и голова, — потому что
 * подробная модель человека в этой сцене будет спорить с бетоном.
 */
/* ЛЮДИ.
 *
 * Капсула с шаром на макушке — это не человек, а снеговик, и рядом с ним
 * здание теряет масштаб: глаз не верит фигуре и перестаёт верить размеру.
 * Силуэт собирается из четырёх масс: ноги, корпус с плечами, голова. Позы
 * заданы числами, а не случайностью: кто-то идёт, кто-то стоит, и шаг у
 * идущих разный. Полигонов по-прежнему считанные десятки.
 */
function Figure({ walk, tint }: { walk: number; tint: string }) {
  const stride = walk * 0.26;

  return (
    <group>
      {/* ноги: у идущего разведены, у стоящего почти вместе */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * 0.075, 0.4, side * stride]}
          rotation={[side * walk * 0.32, 0, 0]}
          castShadow
        >
          <boxGeometry args={[0.135, 0.82, 0.16]} />
          <meshStandardMaterial color={tint} roughness={0.92} />
        </mesh>
      ))}
      {/* корпус сужается к поясу, плечи шире бёдер */}
      <mesh position={[0, 1.09, 0]} castShadow>
        <cylinderGeometry args={[0.19, 0.145, 0.62, 10]} />
        <meshStandardMaterial color={tint} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.36, 0]} castShadow>
        <boxGeometry args={[0.42, 0.1, 0.19]} />
        <meshStandardMaterial color={tint} roughness={0.9} />
      </mesh>
      {/* руки вдоль корпуса: без них плечи заканчиваются обрывом */}
      {[-1, 1].map((side) => (
        <mesh
          key={`a${side}`}
          position={[side * 0.235, 1.06, -side * stride * 0.5]}
          rotation={[-side * walk * 0.3, 0, side * 0.06]}
          castShadow
        >
          <boxGeometry args={[0.095, 0.6, 0.115]} />
          <meshStandardMaterial color={tint} roughness={0.92} />
        </mesh>
      ))}
      <mesh position={[0, 1.52, 0]} castShadow>
        <capsuleGeometry args={[0.098, 0.1, 3, 8]} />
        <meshStandardMaterial color="#6b665c" roughness={0.9} />
      </mesh>
    </group>
  );
}

function Figures() {
  const people = useMemo(
    () => [
      { x: -6.2, z: 14.6, turn: 0.4, walk: 1, scale: 1.0 },
      { x: -4.4, z: 15.4, turn: 2.3, walk: 0, scale: 0.94 },
      { x: 3.6, z: 13.2, turn: 4.1, walk: 1, scale: 1.04 },
      { x: 8.4, z: 12.4, turn: 1.1, walk: 0, scale: 0.98 },
      { x: -12.0, z: 12.8, turn: 5.2, walk: 1, scale: 1.02 },
      { x: 1.2, z: 11.4, turn: 3.0, walk: 0, scale: 0.9 },
      /* Двое у входа и один на ступенях: люди собираются там, где вход, а не
         стоят ровным полем по двору. */
      { x: -4.6, z: 10.4, turn: 2.0, walk: 0, scale: 1.0 },
      { x: -3.4, z: 10.9, turn: 3.6, walk: 0, scale: 0.96 },
      { x: -5.8, z: 9.2, turn: 0.8, walk: 1, scale: 1.01 },
    ],
    [],
  );

  return (
    <group>
      {people.map((person, index) => (
        <group
          key={index}
          position={[person.x, PLINTH.h, person.z]}
          rotation={[0, person.turn, 0]}
          scale={person.scale}
        >
          <Figure walk={person.walk} tint={index % 3 === 0 ? '#4a4640' : index % 3 === 1 ? '#5e594f' : '#565248'} />
        </group>
      ))}
    </group>
  );
}

/* Крона одной массой: три икосаэдра со смещением. Используется и деревом, и
   кадками на террасе — кустик из одной сферы читался мячом. */
function Canopy({ size, tint = 0 }: { size: number; tint?: number }) {
  const lobes = useMemo(
    () =>
      [
        [0, 0, 0, 1],
        [0.52, -0.28, 0.2, 0.72],
        [-0.44, -0.22, -0.3, 0.66],
      ] as [number, number, number, number][],
    [],
  );
  const tones = ['#7f8a6a', '#8c9576', '#74805f'];

  return (
    <group>
      {lobes.map(([lx, ly, lz, factor], index) => (
        <mesh
          key={index}
          position={[lx * size, ly * size, lz * size]}
          scale={[1, 0.82, 1]}
          castShadow
          receiveShadow
        >
          <icosahedronGeometry args={[size * factor, 1]} />
          <meshStandardMaterial color={tones[(index + tint) % 3]} roughness={0.95} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* СКАМЬЯ ВО ДВОРЕ. Двор был площадкой с водой, на которой негде сесть, а
   значит и незачем стоять. */
function Bench({ position, turn = 0 }: { position: [number, number, number]; turn?: number }) {
  return (
    <group position={position} rotation={[0, turn, 0]}>
      <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.6, 0.14, 0.62]} />
        <meshStandardMaterial color={GOLD} roughness={0.86} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 1.05, 0.2, 0]} castShadow>
          <boxGeometry args={[0.22, 0.4, 0.52]} />
          <meshStandardMaterial color={CONCRETE_DEEP} roughness={0.94} />
        </mesh>
      ))}
    </group>
  );
}

function Trees() {
  /* Три икосаэдра в ряд читались гусеницей. Дерево — это ствол, который
     делится, и крона из нескольких масс, собранных вокруг одной точки, с
     разной высотой и разным зелёным. Случайности нет: смещения заданы
     числами, иначе при каждом рендере дерево было бы другим. */
  const trees = useMemo(
    () => [
      { x: -17.6, z: 12.4, scale: 1.05, turn: 0.4 },
      { x: -17.0, z: 4.2, scale: 0.88, turn: 1.9 },
      { x: 16.6, z: 11.2, scale: 1.0, turn: 2.7 },
      { x: 17.4, z: 3.0, scale: 0.92, turn: 0.9 },
      { x: 22.4, z: 9.6, scale: 0.84, turn: 2.2 },
      { x: -15.2, z: 17.6, scale: 0.9, turn: 1.2 },
      { x: 9.8, z: 17.2, scale: 0.8, turn: 3.4 },
    ],
    [],
  );

  /* Крона: восемь масс по сфере, приплюснутой сверху, с уменьшением к краю */
  const canopy = useMemo(
    () =>
      [
        [0, 4.9, 0, 1.5],
        [0.85, 4.45, 0.5, 1.15],
        [-0.9, 4.5, -0.35, 1.1],
        [0.35, 4.3, -0.95, 1.05],
        [-0.45, 4.25, 0.95, 1.0],
        [0.15, 5.5, 0.15, 1.05],
        [1.15, 5.05, -0.5, 0.8],
        [-1.1, 5.0, 0.45, 0.78],
      ] as [number, number, number, number][],
    [],
  );

  return (
    <group>
      {trees.map((tree, index) => (
        <group key={index} position={[tree.x, PLINTH.h, tree.z]} scale={tree.scale} rotation={[0, tree.turn, 0]}>
          {/* Ствол сужается кверху и стоит в приствольной лунке */}
          <mesh position={[0, 1.9, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.14, 0.26, 3.8, 8]} />
            <meshStandardMaterial color="#6d6357" roughness={0.96} />
          </mesh>
          <mesh position={[0, 0.05, 0]} receiveShadow>
            <cylinderGeometry args={[0.95, 0.95, 0.1, 16]} />
            <meshStandardMaterial color="#7c7568" roughness={0.98} />
          </mesh>
          {/* Две ветви: без них ствол упирается в крону палкой */}
          {[0.6, -0.7].map((lean, branch) => (
            <mesh
              key={branch}
              position={[lean * 0.5, 3.5, branch ? -0.3 : 0.3]}
              rotation={[branch ? 0.4 : -0.35, 0, lean * 0.5]}
              castShadow
            >
              <cylinderGeometry args={[0.07, 0.12, 1.5, 6]} />
              <meshStandardMaterial color="#6d6357" roughness={0.96} />
            </mesh>
          ))}
          {canopy.map(([cx, cy, cz, size], leaf) => (
            <group key={leaf} position={[cx, cy, cz]}>
              <Canopy size={size} tint={leaf} />
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

/* Наружная лестница с настоящими ступенями: единственная вещь в макете,
   у которой есть человеческий размер. */
function Steps({ x, z, width = 9, count = 7 }: { x: number; z: number; width?: number; count?: number }) {
  const steps = useMemo(() => Array.from({ length: count }, (_, index) => index), [count]);
  return (
    <group position={[x, 0, z]}>
      {steps.map((index) => (
        <mesh key={index} position={[0, PLINTH.h - 0.24 - index * 0.32, index * 0.62]} receiveShadow castShadow>
          <boxGeometry args={[width, 0.32, 0.62]} />
          <meshStandardMaterial color={CONCRETE_DEEP} roughness={0.94} />
        </mesh>
      ))}
      {/* Щёки лестницы: марш без них висит стопкой плит в воздухе, и с любой
          точки видно, что это не лестница, а гребёнка. */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * (width / 2 + 0.16), PLINTH.h - 0.24 - ((count - 1) * 0.32) / 2, ((count - 1) * 0.62) / 2]}
          rotation={[Math.atan2(count * 0.32, count * 0.62), 0, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.3, 0.52, Math.hypot(count * 0.62, count * 0.32)]} />
          <meshStandardMaterial color={CONCRETE_DARK} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

/* Двор с водой. Отражение — единственное движение в кадре и главный повод
   смотреть на здание дольше двух секунд. */
function Court({ tone, mirror }: { tone: number; mirror: boolean }) {
  return (
    <group>
      <mesh position={[0, POOL.y, POOL.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[POOL.w, POOL.d]} />
        {mirror ? (
        /* Отражение снималось в 256 пикселей и размывалось на 160: в воде
           стояло серое пятно вместо здания. Вдвое больше разрешения и вдвое
           меньше размытия — в воде читается силуэт, ради которого воду сюда
           и положили. Зеркальность поднята, шероховатость опущена: стоячая
           вода отражает сильнее, чем мокрый бетон. */
        <MeshReflectorMaterial
          color={WATER}
          resolution={512}
          mixBlur={0.55}
          mixStrength={3.2}
          blur={[80, 24]}
          mirror={0.75}
          depthScale={0.7}
          minDepthThreshold={0.2}
          maxDepthThreshold={1.4}
          roughness={0.38}
          metalness={0.18}
        />
        ) : (
          /* Отражение — целый проход рендера. На узком холсте вода занимает
             сантиметр экрана, и платить за неё нечем: там она просто
             тёмное стекло. */
          <meshStandardMaterial color={WATER} roughness={0.28} metalness={0.5} />
        )}
      </mesh>
      {/* борт чаши */}
      <mesh position={[0, POOL.y - 0.55, POOL.z]}>
        <boxGeometry args={[POOL.w + 0.8, 0.9, POOL.d + 0.8]} />
        <meshStandardMaterial color={CONCRETE_DARK} roughness={0.96} />
      </mesh>
      {/* подсветка выбранного зала: двор нельзя подсветить материалом воды */}
      <mesh position={[0, POOL.y + 0.12, POOL.z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <planeGeometry args={[POOL.w - 0.4, POOL.d - 0.4]} />
        {/* Подсветка выбранного зала лежит над водой и не участвует в споре
            за глубину: depthWrite выключен, порядок задан явно. */}
        <meshBasicMaterial color={GOLD} transparent opacity={tone} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Plinth() {
  return (
    <group>
      {/* Подрез: масса не лежит на земле, а висит над тенью в двадцать сантиметров */}
      <mesh position={[0, PLINTH.h / 2 - 0.3, 0]} receiveShadow castShadow>
        <boxGeometry args={[PLINTH.w - 1.2, PLINTH.h, PLINTH.d - 1.2]} />
        <meshStandardMaterial color={SHADOW} roughness={0.97} />
      </mesh>
      <mesh position={[0, PLINTH.h - 0.12, 0]} receiveShadow castShadow>
        <boxGeometry args={[PLINTH.w, 0.34, PLINTH.d]} />
        <meshStandardMaterial color={PLINTH_TONE} roughness={0.95} />
      </mesh>
    </group>
  );
}

/* БАРАБАН ЛЕКТОРИЯ.
 *
 * Единственная кривая во всём здании и потому главный контрапункт: рядом с
 * ней прямые углы галерей читаются выбором, а не единственным умением
 * автора. Стоит отдельно, на своём подиуме, и держится за корпус мостом на
 * уровне второго этажа: зал, в который входят по воздуху.
 */
function Drum({ tone, onSelect, onHover }: { tone: string; onSelect: (id: HallId) => void; onHover: (id: HallId | null) => void }) {
  const ribs = useMemo(() => Array.from({ length: 34 }, (_, i) => (i / 34) * Math.PI * 2), []);

  return (
    <group position={[DRUM.x, 0, DRUM.z]}>
      {/* Подиум шире барабана: цилиндр, поставленный прямо на землю, выглядит
          трубой, воткнутой в газон. */}
      <mesh position={[0, DRUM.base / 2, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[DRUM.r + 1.7, DRUM.r + 1.9, DRUM.base, 56]} />
        <meshStandardMaterial color={PLINTH_TONE} roughness={0.95} />
      </mesh>

      <mesh
        position={[0, DRUM.base + DRUM.h / 2, 0]}
        castShadow
        receiveShadow
        onPointerOver={(event) => { event.stopPropagation(); onHover('auditorium'); }}
        onPointerOut={() => onHover(null)}
        onClick={(event) => { event.stopPropagation(); onSelect('auditorium'); }}
      >
        <cylinderGeometry args={[DRUM.r, DRUM.r, DRUM.h, 56]} />
        <meshStandardMaterial color={tone} roughness={0.86} metalness={0.03} envMapIntensity={0.6} />
      </mesh>

      {/* Лопатки по кругу: на цилиндре они дают не узор, а светотень, которая
          ходит по обходу и объясняет кривизну. */}
      {ribs.map((angle) => (
        <mesh
          key={angle}
          position={[Math.sin(angle) * (DRUM.r + 0.16), DRUM.base + DRUM.h / 2, Math.cos(angle) * (DRUM.r + 0.16)]}
          rotation={[0, angle, 0]}
          castShadow
        >
          <boxGeometry args={[0.3, DRUM.h - 1.2, 0.44]} />
          <meshStandardMaterial color={CONCRETE_LIT} roughness={0.9} />
        </mesh>
      ))}

      {/* Разрез на всю высоту: барабан не глухой, у него есть вход и свет. */}
      <mesh position={[0, DRUM.base + DRUM.h / 2 - 0.4, DRUM.r - 0.08]}>
        <boxGeometry args={[2.3, DRUM.h - 2.6, 0.5]} />
        <meshStandardMaterial color={GLASS} roughness={0.18} metalness={0.4} />
      </mesh>

      {/* Венец: у объёма должен быть верх, а не срез трубы. Тёмное стекло во
          всю крышку делало из барабана урну с крышкой, поэтому свет приходит
          кольцевой щелью по краю, а середина остаётся бетонной. */}
      <mesh position={[0, DRUM.base + DRUM.h + 0.28, 0]} castShadow>
        <cylinderGeometry args={[DRUM.r + 0.55, DRUM.r + 0.55, 0.56, 56]} />
        <meshStandardMaterial color={CONCRETE_DEEP} roughness={0.92} />
      </mesh>
      {/* Кольцо фонаря светилось само по себе и с дальнего ракурса читалось
          белым бубликом на крышке. Теперь это стекло, а не лампа: оно берёт
          свет со сцены и остаётся кольцом, а не пятном. */}
      <mesh position={[0, DRUM.base + DRUM.h + 0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[DRUM.r - 1.35, DRUM.r - 0.62, 48]} />
        <meshStandardMaterial color="#5c5f63" roughness={0.15} metalness={0.45} side={DoubleSide} />
      </mesh>
      <mesh position={[0, DRUM.base + DRUM.h + 0.66, 0]} castShadow>
        <cylinderGeometry args={[DRUM.r - 1.7, DRUM.r - 1.7, 0.34, 40]} />
        <meshStandardMaterial color={CONCRETE_LIT} roughness={0.9} />
      </mesh>
    </group>
  );
}

/* МОСТ. Барабан не приставлен к корпусу, а связан с ним: под мостом остаётся
   проход, и между двумя массами появляется просвет, который их и разделяет. */
function Bridge() {
  /* Мостки от цоколя к барабану: короткая горизонталь над водой. Барабан,
     приставленный к берегу, читался бы вторым зданием; связанный мостом, он
     часть одного дома. */
  const from = 10.0;                       // край цоколя
  const to = DRUM.z + DRUM.r * 0.2;
  const length = to - from;

  return (
    <group position={[DRUM.x, 0.55, from + length / 2]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[3.4, 0.34, length]} />
        <meshStandardMaterial color={CONCRETE_DEEP} roughness={0.9} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 1.62, 0.42, 0]} castShadow>
          <boxGeometry args={[0.12, 0.5, length]} />
          <meshStandardMaterial color={CONCRETE_DARK} roughness={0.94} />
        </mesh>
      ))}
      <mesh position={[0, -0.75, 0]}>
        <boxGeometry args={[0.7, 1.5, 0.7]} />
        <meshStandardMaterial color={CONCRETE_DARK} roughness={0.94} />
      </mesh>
    </group>
  );
}

/* МАСТЕРСКИЕ ПОД ПИЛОЙ.
 *
 * Низкий корпус позади галереи: сюда уходит всё, что в музее делают руками.
 * Пила — не украшение, а причина: наклонные фонари смотрят на север, и в
 * мастерской весь день ровный свет без солнца в глазах. */
function Sawtooth({ count = 6 }: { count?: number }) {
  const teeth = useMemo(() => Array.from({ length: count }, (_, i) => (i - (count - 1) / 2) * (SHED.w / count)), [count]);
  const width = SHED.w / count;

  return (
    <group>
      {teeth.map((x) => (
        <group key={x} position={[x, SHED.h, 0]}>
          {/* глухой скат */}
          <mesh position={[0, 0.72, -SHED.d / 4]} rotation={[-0.62, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[width - 0.12, 0.26, SHED.d / 1.7]} />
            <meshStandardMaterial color={CONCRETE_DEEP} roughness={0.93} />
          </mesh>
          {/* фонарь: почти вертикальное стекло на север */}
          <mesh position={[0, 0.86, SHED.d / 4.6]} rotation={[0.24, 0, 0]}>
            <boxGeometry args={[width - 0.5, 1.5, 0.12]} />
            <meshStandardMaterial color={GLASS} roughness={0.16} metalness={0.42} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Workshop({ tone, onSelect, onHover }: { tone: string; onSelect: (id: HallId) => void; onHover: (id: HallId | null) => void }) {
  return (
    <group position={[SHED.x, 0, SHED.z]}>
      <mesh position={[0, 0.3, 0]} receiveShadow>
        <boxGeometry args={[SHED.w + 2.2, 0.6, SHED.d + 2.0]} />
        <meshStandardMaterial color={PLINTH_TONE} roughness={0.95} />
      </mesh>
      <Mass
        size={[SHED.w, SHED.h, SHED.d]}
        position={[0, 0.6 + SHED.h / 2, 0]}
        color={tone}
        hallId="workshop"
        onSelect={onSelect}
        onHover={onHover}
      />
      <group position={[0, 0.6, 0]}>
        <Sawtooth />
      </group>
      {/* Ворота цеха: одна большая створка вместо ряда окон. */}
      <mesh position={[SHED.w * 0.22, 0.6 + 1.7, SHED.d / 2 + 0.06]}>
        <boxGeometry args={[4.6, 3.0, 0.16]} />
        <meshStandardMaterial color={CONCRETE_DARK} roughness={0.7} metalness={0.15} />
      </mesh>
    </group>
  );
}

/* ТЕРРАСА НА КРОВЛЕ.
 *
 * Единственный зал без потолка и стен: пергола, кадки и парапет. Нужна не
 * ради вида сверху, а ради паузы в маршруте — между двумя закрытыми залами
 * должно быть место, где выходят на воздух. */
function Terrace({ x, w, d, active, onSelect, onHover }: { x: number; w: number; d: number; active: boolean; onSelect: (id: HallId) => void; onHover: (id: HallId | null) => void }) {
  const beams = useMemo(() => Array.from({ length: 9 }, (_, i) => (i - 4) * (d * 0.72 / 9)), [d]);
  const planters = useMemo(() => [-w * 0.3, 0, w * 0.3], [w]);

  return (
    <group position={[x, TERRACE_Y, 0]}>
      {/* Настил: тёплая плитка вместо серой кровли, чтобы сверху читалось
          «сюда выходят», а не «здесь оборудование». */}
      <mesh position={[0, 0.09, 0]} receiveShadow>
        <boxGeometry args={[w - 1.2, 0.18, d - 1.2]} />
        <meshStandardMaterial color={active ? '#ded5c6' : '#cfc6b7'} roughness={0.94} />
      </mesh>

      {/* Пергола: стойки по краю и балки поперёк. Тень от неё и есть весь
          интерьер этого зала. */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (w * 0.3), 1.6, 0]} castShadow>
          <boxGeometry args={[0.3, 3.0, d - 2.4]} />
          <meshStandardMaterial color={CONCRETE_LIT} roughness={0.9} />
        </mesh>
      ))}
      {beams.map((z) => (
        <mesh key={z} position={[0, 3.14, z]} castShadow>
          <boxGeometry args={[w * 0.66, 0.22, 0.26]} />
          <meshStandardMaterial color={CONCRETE_LIT} roughness={0.9} />
        </mesh>
      ))}

      {planters.map((z) => (
        <group key={z} position={[-w * 0.14, 0.5, z]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.5, 0.8, 1.5]} />
            <meshStandardMaterial color={CONCRETE_DEEP} roughness={0.94} />
          </mesh>
          <group position={[0, 1.05, 0]}>
            <Canopy size={0.62} />
          </group>
        </group>
      ))}

      {/* Скамья вдоль парапета */}
      <mesh position={[w * 0.2, 0.44, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.36, d * 0.5]} />
        <meshStandardMaterial color={GOLD} roughness={0.85} />
      </mesh>

      {/* Кликается сама плоскость: у террасы нет массы, по которой попасть. */}
      <mesh
        position={[0, 0.3, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerOver={(event) => { event.stopPropagation(); onHover('terrace'); }}
        onPointerOut={() => onHover(null)}
        onClick={(event) => { event.stopPropagation(); onSelect('terrace'); }}
      >
        <planeGeometry args={[w - 1.2, d - 1.2]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
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
  mirror,
}: {
  open: boolean;
  selected: HallId | null;
  hovered: HallId | null;
  onSelect: (id: HallId) => void;
  onHover: (id: HallId | null) => void;
  mirror: boolean;
}) {
  const cross = useRef<Group>(null);
  const barLeftRoof = useRef<Group>(null);

  useFrame((_, delta) => {
    const step = Math.min(delta * 3, 1);
    if (cross.current) {
      const want = open ? 3.4 : 0;
      cross.current.position.y += (want - cross.current.position.y) * step;
    }
    if (barLeftRoof.current) {
      const want = open ? 2.2 : 0;
      barLeftRoof.current.position.y += (want - barLeftRoof.current.position.y) * step;
    }
  });

  const tone = (id: HallId, base: string) =>
    selected === id ? '#d2ccc2' : hovered === id ? '#c6c1b8' : base;

  return (
    <group position={[0, -6.4, 0]}>
      <Plinth />
      <Court tone={selected === 'court' ? 0.34 : hovered === 'court' ? 0.2 : 0} mirror={mirror} />
      {/* Двор кликается по своей плоскости: вода материалом не реагирует */}
      <mesh
        position={[0, POOL.y + 0.04, POOL.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerOver={(event) => { event.stopPropagation(); onHover('court'); }}
        onPointerOut={() => onHover(null)}
        onClick={(event) => { event.stopPropagation(); onSelect('court'); }}
      >
        <planeGeometry args={[POOL.w, POOL.d]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <Steps x={CROSS.x + 1.6} z={PLINTH.d / 2 - 0.6} width={10} count={6} />

      {/* НИЖНЯЯ ГАЛЕРЕЯ — одна масса, парящая над тенью подреза */}
      <group>
        {/* подрез: масса не стоит на цоколе, а висит над полосой тени */}
        <mesh position={[BAR.x, BAR.y + 0.55, 0]} receiveShadow>
          <boxGeometry args={[BAR.w - 2.6, 1.1, BAR.d - 2.6]} />
          <meshStandardMaterial color={SHADOW} roughness={0.96} />
        </mesh>

        {/* Залы — две половины одной массы: разные тона, общая линия */}
        <Mass
          size={[BAR_LEFT.w, BAR.h, BAR.d]}
          position={[BAR_LEFT.x, BAR.y + 1.1 + BAR.h / 2, 0]}
          color={tone('collection', CONCRETE)}
          hallId="collection"
          onSelect={onSelect}
          onHover={onHover}
        />
        <Mass
          size={[BAR_RIGHT.w, BAR.h, BAR.d]}
          position={[BAR_RIGHT.x, BAR.y + 1.1 + BAR.h / 2, 0]}
          color={tone('archive', CONCRETE_DEEP)}
          hallId="archive"
          onSelect={onSelect}
          onHover={onHover}
        />
        <BoardMarks w={BAR.w} d={BAR.d} h={BAR.h} y={BAR.y + 1.1} x={BAR.x} step={1.05} />
        {/* Рёбра только на ближнем фасаде и только светлые: тёмные лопатки
            превращали объём в решётку и спорили с окнами. */}
        <Fins w={BAR_LEFT.w - 1.8} h={BAR.h - 1.6} y={BAR.y + 1.9} z={BAR.d / 2 + 0.18} x={BAR_LEFT.x} />
        {/* Низ ближней трети остеклён: масса встаёт на стекло, а не на землю */}
        <GlazedBase x={BAR_LEFT.x} w={BAR_LEFT.w} d={BAR.d} y={BAR.y + 0.1} h={1.0} />

        {/* Архив глухой: одна щель на всю высоту вместо рёбер */}
        <Opening w={0.66} h={BAR.h - 2.8} depth={0.55} position={[BAR_RIGHT.x + 2.4, BAR.y + 1.1 + BAR.h / 2, BAR.d / 2 + 0.02]} />

        {/* ВХОД: вырез в массе прямо под консолью. Единственная дверь музея
            стоит в тени того, что над ней нависает. */}
        <mesh position={[CROSS.x + 1.6, BAR.y + 1.1 + 2.2, BAR.d / 2 - 0.9]}>
          <boxGeometry args={[6.2, 4.4, 2.4]} />
          <meshStandardMaterial color={SHADOW} roughness={0.95} />
        </mesh>
        <Opening w={4.6} h={3.4} depth={0.5} position={[CROSS.x + 1.6, BAR.y + 1.1 + 1.7, BAR.d / 2 - 1.6]} />
      </group>

      {/* ВЕРХНЯЯ ГАЛЕРЕЯ.
          Была одной длинной коробкой поперёк нижней, и с любой точки читалась
          ровно этим: брусок, положенный на брусок. Теперь она РАСЩЕПЛЕНА на
          две плиты со световой щелью между ними, а плиты разной длины:
          восточная короче на пять метров, и план перестал быть прямоугольником.
          Консоль на юге застеклена во всю высоту в глубоком откосе, чтобы у
          вылета была причина, а не только вынос. */}
      <group ref={cross}>
        <Mass
          size={[CROSS_W_SLAB, CROSS.h, CROSS.d]}
          position={[CROSS_WEST_X, CROSS.y + CROSS.h / 2, CROSS.z]}
          color={tone('practice', CONCRETE_LIT)}
          hallId="practice"
          onSelect={onSelect}
          onHover={onHover}
        />
        <Mass
          size={[CROSS_W_SLAB, CROSS.h, CROSS_EAST_D]}
          position={[CROSS_EAST_X, CROSS.y + CROSS.h / 2, CROSS.z + (CROSS.d - CROSS_EAST_D) / 2]}
          color={tone('practice', CONCRETE)}
          hallId="practice"
          onSelect={onSelect}
          onHover={onHover}
        />

        {/* Щель между плитами: тёмное дно и стеклянный мостик поверху. Без
            дна щель светилась насквозь и плиты повисали порознь. */}
        <mesh position={[CROSS.x, CROSS.y + CROSS.h / 2, CROSS.z]}>
          <boxGeometry args={[CROSS_SLOT, CROSS.h - 0.6, CROSS.d - 0.8]} />
          <meshStandardMaterial color={SHADOW} roughness={0.96} />
        </mesh>
        <mesh position={[CROSS.x, CROSS.y + CROSS.h - 0.12, CROSS.z + 1.4]}>
          <boxGeometry args={[CROSS_SLOT + 0.5, 0.16, CROSS.d * 0.42]} />
          <meshStandardMaterial color={GLASS} roughness={0.16} metalness={0.4} />
        </mesh>
        {/* Балки по краям щели: плита такой длины без подпорок читается доской */}
        {[-1, 1].map((side) => (
          <mesh key={side} position={[CROSS.x + side * (CROSS_SLOT / 2 + 0.2), CROSS.y + 0.05, CROSS.z]} castShadow>
            <boxGeometry args={[0.44, 0.9, CROSS.d - 1.2]} />
            <meshStandardMaterial color={CONCRETE_DEEP} roughness={0.94} />
          </mesh>
        ))}

        <BoardMarks w={CROSS_W_SLAB} d={CROSS.d} h={CROSS.h} y={CROSS.y} x={CROSS_WEST_X} z={CROSS.z} step={1.1} />
        <BoardMarks w={CROSS_W_SLAB} d={CROSS_EAST_D} h={CROSS.h} y={CROSS.y} x={CROSS_EAST_X} z={CROSS.z + (CROSS.d - CROSS_EAST_D) / 2} step={1.1} />
        <Coffers w={CROSS_W_SLAB} d={CROSS.d} x={CROSS_WEST_X} y={CROSS.y} z={CROSS.z} />
        <Coffers w={CROSS_W_SLAB} d={CROSS_EAST_D} x={CROSS_EAST_X} y={CROSS.y} z={CROSS.z + (CROSS.d - CROSS_EAST_D) / 2} />
        <RoofMonitors x={CROSS_EAST_X} y={CROSS.y + CROSS.h} z={CROSS.z + (CROSS.d - CROSS_EAST_D) / 2} w={CROSS_W_SLAB} d={CROSS_EAST_D} />

        {/* Торец консоли: стекло сидит в откосе глубиной в полметра, поэтому
            первое, что видно с земли, — тень откоса, а не блик. */}
        <Opening
          w={CROSS_W_SLAB - 0.9}
          h={CROSS.h - 1.5}
          depth={0.62}
          position={[CROSS_WEST_X, CROSS.y + CROSS.h / 2, CROSS.z + CROSS.d / 2 + 0.02]}
        />
        {/* У короткой плиты на том же торце только щель: два одинаковых окна
            уравняли бы плиты, которые нарочно неравны. */}
        <Opening
          w={0.7}
          h={CROSS.h - 2.6}
          depth={0.5}
          position={[CROSS_EAST_X + 1.2, CROSS.y + CROSS.h / 2, CROSS.z + CROSS.d / 2 + 0.02]}
        />
        {/* Северный торец короткой плиты закрыт глухо, а под уступом ложится
            тень: именно она и показывает, что плиты разной длины. */}
        <mesh position={[CROSS_EAST_X, CROSS.y - 0.16, CROSS.z - CROSS.d / 2 + 2.2]}>
          <boxGeometry args={[CROSS_W_SLAB - 0.6, 0.32, 3.6]} />
          <meshStandardMaterial color={SHADOW} roughness={0.96} />
        </mesh>

        {/* Северный торец длинной плиты смотрел в поле голой стеной: с задних
            ракурсов вся верхняя галерея читалась бруском. Узкая щель на всю
            высоту и козырёк над ней дают торцу лицо. */}
        <Opening
          w={0.8}
          h={CROSS.h - 2.2}
          depth={0.55}
          position={[CROSS_WEST_X, CROSS.y + CROSS.h / 2, CROSS.z - CROSS.d / 2 - 0.02]}
          rotation={[0, Math.PI, 0]}
        />
        <mesh position={[CROSS_WEST_X, CROSS.y + CROSS.h - 0.9, CROSS.z - CROSS.d / 2 - 0.45]} castShadow>
          <boxGeometry args={[CROSS_W_SLAB - 1.0, 0.28, 1.0]} />
          <meshStandardMaterial color={CONCRETE_DEEP} roughness={0.93} />
        </mesh>
        {/* Парапет по длинной плите: у кровли появляется край, и сверху она
            перестаёт быть пустой плоскостью. */}
        <Parapet x={CROSS_WEST_X} z={CROSS.z} w={CROSS_W_SLAB} d={CROSS.d} y={CROSS.y + CROSS.h} />

        <TrapezoidEye position={[CROSS_WEST_X - CROSS_W_SLAB / 2 - 0.5, CROSS.y + CROSS.h / 2, CROSS.z + 6.2]} />
        {/* Тень под консолью: тонкая тёмная полка вместо стыка */}
        <mesh position={[CROSS.x, CROSS.y - 0.18, CROSS.z]}>
          <boxGeometry args={[CROSS.w - 2.2, 0.36, CROSS.d - 2.2]} />
          <meshStandardMaterial color={SHADOW} roughness={0.95} />
        </mesh>
      </group>

      {/* СТВОЛ ЛЕСТНИЦЫ — вертикаль, которая держит всю композицию */}
      <group>
        <Mass
          size={[TOWER.w, TOWER.h, TOWER.d]}
          position={[TOWER.x, TOWER.h / 2 + PLINTH.h, TOWER.z]}
          color={tone('study', CONCRETE)}
          hallId="study"
          onSelect={onSelect}
          onHover={onHover}
        />
        <BoardMarks w={TOWER.w} d={TOWER.d} h={TOWER.h} y={PLINTH.h} x={TOWER.x} z={TOWER.z} step={1.05} />
        {/* Парапет с щелью фонаря: у ствола есть верх, а не срез */}
        <mesh position={[TOWER.x, PLINTH.h + TOWER.h + 0.3, TOWER.z]}>
          <boxGeometry args={[TOWER.w - 1.5, 0.6, TOWER.d - 1.5]} />
          <meshStandardMaterial color={GLASS} roughness={0.2} metalness={0.3} />
        </mesh>
        <Mass size={[TOWER.w + 0.5, 0.5, TOWER.d + 0.5]} position={[TOWER.x, PLINTH.h + TOWER.h + 0.72, TOWER.z]} color={CONCRETE_DEEP} radius={0.06} />
      </group>

      {/* ЛЕКТОРИЙ, МАСТЕРСКИЕ И ТЕРРАСА. Крест из двух галерей остаётся
          главным, но композиция перестала быть симметричной: слева круглый
          объём на отлёте, сзади низкая пила, сверху пустая площадка. */}
      <Drum tone={tone('auditorium', CONCRETE)} onSelect={onSelect} onHover={onHover} />
      <Bridge />
      <Workshop tone={tone('workshop', CONCRETE_DEEP)} onSelect={onSelect} onHover={onHover} />
      <Terrace
        x={BAR_RIGHT.x}
        w={BAR_RIGHT.w}
        d={BAR.d}
        active={selected === 'terrace' || hovered === 'terrace'}
        onSelect={onSelect}
        onHover={onHover}
      />

      <Parapet x={BAR.x} z={0} w={BAR.w} d={BAR.d} y={BAR.y + 1.1 + BAR.h} />
      {/* Скамьи по кромке двора: площадка, на которой негде сесть, — площадка,
          на которой незачем стоять. */}
      {/* Столбики по кромке цоколя и блоки вентиляции на кровле архива. На
          дальнем плане именно такая мелочь отличает здание от макета: у
          здания есть край площадки и есть техника наверху. */}
      {Array.from({ length: 9 }, (_, i) => -14 + i * 3.6).map((bx) => (
        <mesh key={bx} position={[bx, PLINTH.h + 0.34, PLINTH.d / 2 - 0.5]} castShadow>
          <cylinderGeometry args={[0.11, 0.13, 0.68, 8]} />
          <meshStandardMaterial color={CONCRETE_DARK} roughness={0.9} metalness={0.12} />
        </mesh>
      ))}
      {[[13.4, -3.4, 2.2, 1.5], [15.8, -1.0, 1.3, 1.1], [12.2, -6.2, 1.6, 0.9]].map(([bx, bz, bw, bd]) => (
        <mesh key={`${bx}-${bz}`} position={[bx, 1.5 + 1.1 + 7.4 + 0.55, bz]} castShadow receiveShadow>
          <boxGeometry args={[bw, 1.1, bd]} />
          <meshStandardMaterial color={CONCRETE_DEEP} roughness={0.93} />
        </mesh>
      ))}

      <Bench position={[-9.4, PLINTH.h - 1.5, 13.6]} turn={0.18} />
      <Bench position={[4.8, PLINTH.h - 1.5, 14.4]} turn={-0.32} />
      <Figures />
      <Trees />

      {/* Перекрытия видно только в раскрытом состоянии */}
      {open && (
        <group>
          <mesh position={[BAR_LEFT.x, BAR.y + BAR.h - 0.6, 0]} receiveShadow>
            <boxGeometry args={[BAR_LEFT.w - 1.4, 0.22, BAR.d - 1.4]} />
            <meshStandardMaterial color="#d9d4cb" roughness={0.92} />
          </mesh>
          <mesh position={[CROSS.x, CROSS.y + 0.4, CROSS.z]} receiveShadow>
            <boxGeometry args={[CROSS.w - 1.2, 0.22, CROSS.d - 1.2]} />
            <meshStandardMaterial color="#d9d4cb" roughness={0.92} />
          </mesh>
        </group>
      )}
    </group>
  );
}

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
     зал остаётся списком в колонке рядом. Решает ширина холста, а не окна. */
  const { size } = useThree();
  if (size.width < 520) return null;

  /* Залов стало восемь, и в выбранном состоянии камера подходит вплотную:
     подписи наезжали друг на друга и на само здание. Пока зал не выбран,
     подписи работают картой; как только зал выбран, его имя уже стоит
     заголовком в колонке, и на макете остаётся один пин. */
  const shown = selected ? HALLS.filter((hall) => hall.id === selected) : HALLS;

  return (
    <>
      {shown.map((hall) => {
        const active = selected === hall.id || hovered === hall.id;
        return (
          <Html key={hall.id} position={[hall.focus[0], hall.focus[1] - 6.4, hall.focus[2]]} center zIndexRange={[8, 0]}>
            <button
              type="button"
              onClick={() => onSelect(hall.id)}
              onPointerOver={() => onHover(hall.id)}
              onPointerOut={() => onHover(null)}
              title={hall.access === 'passport' ? lockedHint : undefined}
              className={`whitespace-nowrap px-[7px] py-[3px] transition ${
                active
                  ? 'border border-[var(--c-accent)] bg-[var(--c-accent)] font-mono text-[8px] uppercase tracking-[0.16em] text-[var(--c-bg)]'
                  : CHIP
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

/* Горизонталей участка здесь больше нет. Они достались этой сцене от
   прежнего вида «макет на планшете», где вокруг белого объёма нужна была
   хоть какая-то земля. У здания появились цоколь, вода, деревья и люди —
   и тонкие кольца перестали читаться разметкой: на пологом ракурсе они
   ложатся поперёк кадра светлым овалом и спорят с композицией. */

/* Внутри камера не облетает макет, а стоит в зале: точка глаза на высоте
   человека, разворот мышью вокруг себя. Тот же OrbitControls, но цель — не
   центр модели, а точка перед зрителем. */
function InteriorRig({ hall }: { hall: HallId }) {
  const { camera, controls } = useThree();
  const settled = useRef<HallId | null>(null);

  useFrame(() => {
    if (settled.current === hall) return;
    /* Ставить камеру мимо OrbitControls нельзя: контролы держат собственную
       цель и на следующем кадре возвращают камеру туда, где она была, — то
       есть наружу. Снаружи стены комнаты вывернуты внутрь и не рисуются
       вовсе, поэтому экран оставался пустым. Двигаем камеру и цель вместе. */
    const orbit = controls as unknown as { target?: { set: (x: number, y: number, z: number) => void }; update?: () => void } | null;
    if (!orbit || !orbit.target) return;    // ждём, пока контролы объявятся

    const perspective = camera as PerspectiveCamera;
    const [x, y, z] = interiorEye(hall);
    camera.position.set(x, y, z);
    perspective.fov = 62;          // в комнате нужен широкий угол, иначе упираешься в стену
    perspective.near = 0.1;
    perspective.far = 120;
    perspective.updateProjectionMatrix();
    const [tx, ty, tz] = interiorTarget(hall);
    orbit.target.set(tx, ty, tz);
    orbit.update?.();
    settled.current = hall;
  });

  return null;
}

const EXTERIOR_FOV = 26;

/* Куда смотрит камера снаружи. Прежде она целилась в начало координат —
   точку у земли под зданием, — поэтому объём сидел в нижней трети кадра, а
   над ним оставалось пустое поле. Цель поднята к середине массы. */
const EXTERIOR_AIM = 2.8;

function CameraRig({ open, radius, focusY }: { open: boolean; radius: number; focusY: number }) {
  const { camera, size } = useThree();
  const distance = useRef(0);
  const target = useRef(0);

  /* Выход из зала — это новая посадка: прежняя дистанция считалась под
     объектив комнаты и снаружи ставит камеру вплотную. */
  useEffect(() => {
    distance.current = 0;
    target.current = 0;
  }, [camera]);

  const fitted = useMemo(() => {
    const perspective = camera as PerspectiveCamera;
    /* Объектив возвращается ЗДЕСЬ, а не в эффекте: посадка кадра считается
       в этом же расчёте, и если сначала посчитать по широкому углу зала, а
       поменять его после, камера встанет по чужому числу — вплотную. */
    perspective.fov = EXTERIOR_FOV;
    const aspect = size.width / Math.max(size.height, 1);
    const verticalFov = (perspective.fov * Math.PI) / 180;
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
    const fit = Math.max(radius / Math.sin(verticalFov / 2), radius / Math.sin(horizontalFov / 2));
    perspective.near = fit / 40;
    perspective.far = fit * 3.4;
    perspective.updateProjectionMatrix();
    return fit;
  }, [camera, size.width, size.height, radius]);

  const spherical = useRef(new Spherical());
  useFrame((_, delta) => {
    const step = Math.min(delta * 2.6, 1);
    if (!distance.current) distance.current = fitted;
    /* Раскрытый макет выше закрытого: поднятые объёмы уходят за кадр, если
       не отойти. */
    const want = fitted * (open ? 1.3 : 0.98);
    distance.current += (want - distance.current) * step;

    /* Прицел ходит в узких пределах вокруг середины массы. Раньше он
       уезжал на высоту выбранного зала, а посадка кадра считалась вокруг
       начала координат — камера оказывалась вплотную к верхнему объёму и
       заваливалась к горизонту. */
    const aim = Math.max(EXTERIOR_AIM - 1.5, Math.min(EXTERIOR_AIM + 2.5, focusY || EXTERIOR_AIM));
    target.current += (aim - target.current) * step * 0.8;

    spherical.current.setFromVector3(camera.position.clone().sub(new Vector3(0, target.current, 0)));
    if (open) spherical.current.phi += (1.05 - spherical.current.phi) * step * 0.6;
    spherical.current.radius = distance.current;
    camera.position.setFromSpherical(spherical.current).add(new Vector3(0, target.current, 0));
    camera.lookAt(0, target.current, 0);
  });

  return null;
}

/* Ворота для постобработки: на узком холсте макет размером с ладонь, разница
   почти не видна, а чанк тянуть пришлось бы целиком. Ширину холста берём у
   рендерера, а не у окна: колонка бывает узкой и на десктопе. */
/* Постобработка — единственная часть сцены с внешней зависимостью и отдельным
   чанком, то есть единственная, которая может не доехать: 404 после деплоя,
   старый драйвер, отключённый WebGL2. Здание из-за этого падать не должно,
   поэтому эффекты живут за собственной границей ошибок: не вышло — сцена
   рисуется без них, а не заменяется экраном «раздел не загрузился». */
class EffectsBoundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/* Умерший контекст роняет не только картинку: r3f продолжает рендерить холст
   поверх мёртвого рендерера и бросает исключение, а его ловит уже страничная
   граница — и вместо здания пропадает весь музей. Своя граница удерживает
   падение внутри холста и переводит его в ту же честную заглушку. */
class CanvasBoundary extends Component<{ onError: () => void; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/* Одно правило на все тяжёлые проходы: широкий холст и WebGL2. Раньше
   каждое решение принималось само по себе, и на среднем экране совпадали
   отражение воды, куб-карта, AO и тени — а это уже тот набор, на котором
   браузер отбирает контекст. */
function useHeavyScene() {
  const { size, gl } = useThree();
  return size.width >= 640 && gl.capabilities.isWebGL2;
}

function HeavyProbe({ onChange }: { onChange: (heavy: boolean) => void }) {
  const heavy = useHeavyScene();
  useEffect(() => onChange(heavy), [heavy, onChange]);
  return null;
}

function EffectsGate({ ready, entered }: { ready: boolean; entered: boolean }) {
  const heavy = useHeavyScene();
  /* Эффекты включаются ПОСЛЕ съёмки куб-карты: композитор перехватывает
     рендер, и делать шесть проходов куба одновременно с ним незачем.
     Внутри зала куб-карта не снимается вовсе, и раньше это значило, что зал
     оставался БЕЗ затенения: углы комнаты, стыки подиумов и низ стен были
     нарисованы одним тоном. Ждать нечего — включаем сразу. */
  if (!heavy || (!entered && !ready)) return null;
  return <Effects />;
}

function Turntable({ still, slow, children }: { still: boolean; slow: boolean; children: React.ReactNode }) {
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    if (still || !group.current || slow) return;
    group.current.rotation.y += delta * 0.028;
  });
  return <group ref={group}>{children}</group>;
}

/* ПОТЕРЯ КОНТЕКСТА.
 *
 * У сцены несколько проходов рендера: тени, отражение в воде, куб-карта,
 * ambient occlusion. На слабой видеокарте или при переключении GPU браузер
 * может отобрать контекст — и тогда холст гаснет целиком, а HTML-подписи над
 * ним остаются висеть в пустоте. Выглядит это как исчезнувшее здание.
 *
 * Отменяем событие по умолчанию (иначе контекст не восстановят) и сообщаем
 * наружу, чтобы страница показала честную заглушку вместо пустоты. */
function ContextGuard({ onLost, onRestored }: { onLost: () => void; onRestored: () => void }) {
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      onLost();
    };
    /* Контекст отменённого события браузер обычно возвращает сам. Раньше это
       событие никто не слушал, и после разового провала здание не появлялось
       уже никогда. */
    const restored = () => onRestored();
    canvas.addEventListener('webglcontextlost', lost);
    canvas.addEventListener('webglcontextrestored', restored);
    return () => {
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', restored);
    };
  }, [gl, onLost, onRestored]);

  return null;
}

function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch {
    return false;
  }
}

const DEGRADE_KEY = 'epris-museum-degrade';

/* Телефон начинает не с полной сцены, а со второй ступени. Не из
   осторожности: полная сцена собирается на нём заметно дольше, тратит
   вдвое больше пикселей на тот же кадр, и первое, что видит зритель, —
   пустая плашка. Отражения и постобработка на узком холсте и так
   выключены, а разрешение выше единицы на макете размером с ладонь не
   даёт ничего. */
function isHandheld() {
  try {
    return window.matchMedia('(max-width: 767px), (pointer: coarse)').matches;
  } catch {
    return false;
  }
}

function readDegrade() {
  const floor = typeof window !== 'undefined' && isHandheld() ? 1 : 0;
  try {
    const raw = Number(sessionStorage.getItem(DEGRADE_KEY));
    const stored = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), 2) : 0;
    return Math.max(stored, floor);
  } catch {
    return floor;
  }
}

function writeDegrade(level: number) {
  try { sessionStorage.setItem(DEGRADE_KEY, String(level)); } catch { /* приватный режим */ }
}

export function MuseumModel({
  label,
  fallbackLabel,
  retryLabel,
  openLabel,
  closeLabel,
  leaveLabel,
  insideLabel,
  labels,
  lockedHint,
  selectedHall,
  onSelectHall,
  entered = false,
  onEnter,
  onLeave,
}: {
  label: string;
  fallbackLabel: string;
  retryLabel: string;
  openLabel: string;
  closeLabel: string;
  /* Внутри зала «закрыть пространство» звучит про другое действие: выход из
     комнаты — это выход, и подпись должна совпадать с кнопкой в колонке. */
  leaveLabel: string;
  insideLabel: string;
  labels: MuseumLabels;
  lockedHint: string;
  selectedHall: HallId | null;
  onSelectHall: (id: HallId | null) => void;
  /* Внутри зала макет уступает место самому залу: снаружи и внутри — две
     разные сцены в одном холсте, а не два состояния одной. */
  entered?: boolean;
  onEnter?: () => void;
  onLeave?: () => void;
}) {
  const still = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  /* Пришли по ссылке на зал — здание уже раскрыто: смотреть на выбранный зал
     сквозь глухой бетон и жать вторую кнопку никто не должен. */
  const [open, setOpen] = useState(() => selectedHall !== null);
  const [hovered, setHovered] = useState<HallId | null>(null);
  const [reflection, setReflection] = useState<Texture | null>(null);
  const [contextLost, setContextLost] = useState(false);
  /* Смена ключа пересобирает холст с нуля: после потери контекста старый
     рендерер уже мёртв, и оживить его нечем. */
  const [canvasKey, setCanvasKey] = useState(0);
  /* Заглушка появлялась слишком часто: на этой машине браузер отбирает
     контекст регулярно, а показывать вместо здания извинение — не решение.
     Сцена сама спускается на ступень: сначала уходят отражение, куб-карта и
     пост-обработка, потом тени и антиалиасинг. Ступень держится на вкладке,
     иначе каждый переход в музей снова начинал с самой тяжёлой сцены и
     снова ронял контекст. */
  const [degrade, setDegrade] = useState(readDegrade);
  const lostAt = useRef(0);

  const handleLost = useCallback(() => {
    const now = Date.now();
    const since = now - lostAt.current;
    /* Об одной и той же смерти контекста сообщают двое: слушатель холста и
       граница, поймавшая бросок r3f. Это одно событие, а не два падения. */
    if (since < 800) return;
    /* Контекст падает снова сразу после пересборки — дальше спускаться
       некуда, и цикл пересборок хуже честной заглушки. */
    const looping = since < 6000;
    lostAt.current = now;
    setDegrade((level) => {
      if (level >= 2 || looping) {
        setContextLost(true);
        return level;
      }
      const next = level + 1;
      writeDegrade(next);
      setCanvasKey((n) => n + 1);
      return next;
    });
  }, []);
  const noWebGL = useMemo(() => typeof window !== 'undefined' && !hasWebGL(), []);
  /* Ширина холста известна только внутри Canvas, поэтому решение приходит
     оттуда через состояние: снаружи оно нужно и воде, и эффектам. */
  const [probeHeavy, setHeavy] = useState(false);
  const heavy = probeHeavy && degrade === 0;

  const select = useCallback((id: HallId) => {
    /* Повторное нажатие по уже выбранному объёму — это вход, а не отмена:
       раз объём назван дверью, второй клик должен вести внутрь, а не
       снимать выбор. Отменяет выбор клик по пустому месту. */
    if (id === selectedHall) {
      onEnter?.();
      return;
    }
    onSelectHall(id);
    setOpen(true);
  }, [onEnter, onSelectHall, selectedHall]);

  const focusY = useMemo(() => {
    const hall = HALLS.find((item) => item.id === selectedHall);
    return hall ? hall.focus[1] - 6.4 : 0;
  }, [selectedHall]);

  /* Одна строчка мелким шрифтом посреди пустой плашки читалась как сломанная
     страница: понять, что макет не нарисовался и что с этим делать, было
     неоткуда. Заглушка называет причину и даёт вернуть здание. */
  if (noWebGL || contextLost) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-6 text-center" role="img" aria-label={label}>
        <p className="max-w-[26rem] font-mono text-[10px] uppercase leading-relaxed tracking-[0.16em] text-[rgb(var(--c-accent-rgb)_/_0.6)]">
          {noWebGL ? label : fallbackLabel}
        </p>
        {contextLost && (
          <button
            type="button"
            onClick={() => { setContextLost(false); lostAt.current = 0; setCanvasKey((n) => n + 1); }}
            className="inline-flex min-h-11 items-center justify-center border border-[rgb(var(--c-accent-rgb)_/_0.5)] px-5 font-mono text-[9px] uppercase tracking-[0.16em] transition hover:bg-[var(--c-accent)] hover:text-[var(--c-bg)]"
          >
            {retryLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div className="h-full w-full cursor-grab active:cursor-grabbing" role="img" aria-label={open ? insideLabel : label}>
        <CanvasBoundary key={canvasKey} onError={handleLost}>
        <Canvas
          shadows={degrade < 2}
          camera={{ position: [38, 16, 30], fov: 26 }}
          dpr={degrade > 0 ? 1 : [1, 2]}
          gl={{
            antialias: degrade < 2,
            alpha: true,
            powerPreference: 'high-performance',
            /* Плоский тонмаппинг годился для гипса: белое здание на белом фоне.
               Бетон живёт полутенями, и ACES с лёгкой недодержкой держит их
               в диапазоне вместо того, чтобы выбивать бок под солнцем. */
            toneMapping: ACESFilmicToneMapping,
            toneMappingExposure: 1.02,
          }}
        >
          <ContextGuard onLost={handleLost} onRestored={() => { setContextLost(false); setCanvasKey((n) => n + 1); }} />
          <HeavyProbe onChange={setHeavy} />
          <ReflectionContext.Provider value={reflection}>
          {entered && selectedHall ? <InteriorRig hall={selectedHall} /> : <CameraRig open={open} radius={25.5} focusY={focusY} />}

          {/* Свет как в полдень над макетом: одно жёсткое солнце даёт тень,
              холодное небо сверху вынимает верхние грани, тёплый отражённый
              снизу не даёт теням стать чёрными дырами. */}
          {/* Окружение собрано из светящихся плоскостей и запечено в один кадр:
              никакой HDRI-файл не грузится, но у бетона появляется небо, от
              которого он берёт цвет, и земля, от которой берёт отсвет. Без
              этого теневые грани были одинаково мёртвыми. */}
          {/* ОКРУЖЕНИЕ ОДНО НА ОБА СОСТОЯНИЯ.
           *
           * Внутри зала оно было своим, объявленным в Interior, и не работало:
           * при входе наружное окружение размонтировалось ПОСЛЕ того, как
           * внутреннее встало, и своей уборкой стирало сцене environment. У
           * металла не оставалось ничего для отражения, и бронза с кольцом
           * выходили чёрными. Теперь окружение одно, а состав светящихся
           * плоскостей меняется по ключу: снятие карты происходит один раз на
           * каждое состояние. */}
          <Environment key={entered ? 'inside' : 'outside'} frames={1} resolution={entered ? 64 : 128} background={false}>
          {entered ? (
            <>
              {/* В зале отражать нечему, кроме самого зала: потолок со светом,
                  светлая стена сбоку и тёмный пол под ногами. */}
              <Lightformer form="rect" intensity={3.4} color="#fff4e6" position={[0, 6, 0]} scale={[16, 16, 1]} rotation={[Math.PI / 2, 0, 0]} />
              <Lightformer form="rect" intensity={1.3} color="#d8dde4" position={[-9, 2.6, 0]} scale={[16, 6, 1]} rotation={[0, Math.PI / 2, 0]} />
              <Lightformer form="rect" intensity={0.3} color="#8d857a" position={[0, -2, 0]} scale={[16, 16, 1]} rotation={[-Math.PI / 2, 0, 0]} />
            </>
          ) : (
          <>
            <Lightformer form="rect" intensity={1.5} color="#eaf1f8" position={[0, 22, 6]} scale={[38, 16, 1]} rotation={[-Math.PI / 2, 0, 0]} />
            <Lightformer form="rect" intensity={0.7} color="#b79a78" position={[0, -14, 0]} scale={[40, 40, 1]} rotation={[Math.PI / 2, 0, 0]} />
            <Lightformer form="rect" intensity={0.9} color="#dfe6ef" position={[-24, 6, -12]} scale={[16, 14, 1]} rotation={[0, Math.PI / 2.4, 0]} />
            {/* Полоса горизонта: именно она отражается в стекле, без неё окно
                остаётся ровным тёмным пятном. */}
            <Lightformer form="rect" intensity={2.2} color="#ffffff" position={[16, 3.2, 22]} scale={[26, 2.2, 1]} />
            <Lightformer form="rect" intensity={1.1} color="#cddbe8" position={[-18, 9, 20]} scale={[14, 6, 1]} />
            {/* Диск солнца там же, где ключевой свет: в стекле и в воде должно
                быть видно, ОТКУДА светит, иначе блики берутся ниоткуда. */}
            <Lightformer form="circle" intensity={5} color="#fff0d8" position={[26, 12, 15]} scale={[7, 7, 1]} />
          </>
          )}
          </Environment>
          {/* СВЕТ.
           *
           * Солнце стояло почти за камерой: свет падал в лоб, все грани
           * получали поровну, и бетон читался серым картоном. Здание из
           * плоскостей держится не количеством света, а разницей между
           * освещённой и теневой гранью, поэтому солнце ОПУЩЕНО: с двадцати
           * пяти градусов свет идёт вскользь, фасады делятся на светлые и
           * тёмные, а тени ложатся длинными поперёк цоколя и объясняют, что
           * над чем нависает. Уводить ключ за здание нельзя: тогда камере
           * достаётся одна теневая сторона.
           *
           * Заливка при этом СЛАБЕЕ, а не сильнее: чем ровнее рассеянный
           * свет, тем быстрее он съедает разницу, ради которой ключ и
           * ставили. */}
          {!entered && <hemisphereLight args={['#e9eef5', '#a2917d', 0.34]} />}
          {!entered && <directionalLight
            position={[26, 12, 15]}
            intensity={2.9}
            color="#fff2df"
            castShadow
            /* Карта теней раньше растягивалась на 88 единиц ради поля, которого
               в сцене нет: тень от лопатки размазывалась в полосу. Рамка
               сжата до реального пятна застройки, и на той же карте у тени
               появился край. */
            shadow-mapSize={degrade > 0 ? [1024, 1024] : [3072, 3072]}
            /* Солнце опустилось, и на большой плоскости земли тень начала
               ложиться на саму землю рябью: при скользящем свете глубина в
               карте теней и глубина сцены расходятся почти на всей площади.
               Нормальный сдвиг больше обычного именно поэтому. */
            shadow-bias={-0.0012}
            shadow-normalBias={0.045}
            shadow-camera-left={-42}
            shadow-camera-right={42}
            shadow-camera-top={42}
            shadow-camera-bottom={-42}
            /* Ближняя и дальняя плоскости карты теней стояли по умолчанию:
               полметра и пятьсот. Вся глубина сцены умещается в тридцати
               метрах, и на такой растяжке точности не хватало ровно там, где
               свет идёт вскользь, — землю затягивало рябью. Границы сжаты по
               реальной сцене, и рябь уходит без грубых сдвигов. */
            shadow-camera-near={6}
            shadow-camera-far={78}
          />}
          {/* Контровой сзади-справа: холодная кромка отделяет массу от фона,
              иначе на светлом фоне здание сливается с ним верхним углом. */}
          {!entered && <directionalLight position={[17, 11, -25]} intensity={0.85} color="#cfe0f2" />}
          {/* Отражённый от земли тёплый: тени не должны быть дырами. */}
          {!entered && <directionalLight position={[6, -8, 14]} intensity={0.3} color="#c8a98c" />}
          {!entered && <pointLight position={[0, 4, 0]} intensity={open ? 40 : 0} distance={34} decay={2} color="#fff3e2" />}

          <Suspense fallback={null}>
            {!entered && heavy && <SceneReflection onReady={setReflection} />}
            {entered && selectedHall ? (
              <Interior hall={selectedHall} />
            ) : (
            <Turntable still={still} slow={open || selectedHall !== null}>
              {/* Застройка выросла вправо (мастерские) сильнее, чем влево
                  (лекторий), и её середина уехала от начала координат, вокруг
                  которого ходит камера. На широком экране это незаметно, на
                  телефоне правое крыло уходило за край. Сдвиг ставит середину
                  застройки на ось вращения; подписи едут вместе со зданием,
                  иначе они повиснут рядом со своими объёмами. */}
              <group position={[SITE_OFFSET_X, 0, 0]}>
                <Building open={open} selected={selectedHall} hovered={hovered} onSelect={select} onHover={setHovered} mirror={heavy} />
                {(open || selectedHall) && (
                  <HallPins labels={labels} selected={selectedHall} hovered={hovered} onSelect={select} onHover={setHovered} lockedHint={lockedHint} />
                )}
              </group>
              <Ground />
              <ContactShadows position={[0, -6.72, 0]} opacity={0.42} scale={110} blur={1.9} far={28} resolution={degrade > 0 ? 256 : 512} color="#4a453e" />
            </Turntable>
            )}
          </Suspense>

          <EffectsBoundary>
            <Suspense fallback={null}>
              <EffectsGate ready={reflection !== null} entered={entered} />
            </Suspense>
          </EffectsBoundary>

          </ReflectionContext.Provider>

          {entered ? (
            /* Внутри цель стоит перед зрителем: так разворот читается как
               поворот головы, а не как облёт комнаты снаружи. */
            <OrbitControls
              makeDefault
              enableZoom={false}
              enablePan={false}
              minPolarAngle={0.7}
              maxPolarAngle={Math.PI / 1.9}
              rotateSpeed={-0.35}
            />
          ) : (
            /* Нижний предел поднят: у горизонта в кадр попадали край земли и
               белая пустота над ним — сцена не имеет неба, она стоит на
               странице. Смотреть на макет полагается сверху вниз. */
            <OrbitControls enableZoom={false} enablePan={false} minPolarAngle={0.5} maxPolarAngle={1.16} rotateSpeed={0.55} />
          )}
        </Canvas>
        </CanvasBoundary>
      </div>

      <button
        type="button"
        onClick={() => (entered ? onLeave?.() : setOpen((value) => !value))}
        aria-pressed={entered ? true : open}
        className={`absolute right-4 top-4 z-10 flex min-h-9 items-center px-3 transition hover:bg-[var(--c-accent)] hover:text-[var(--c-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-accent)] sm:right-6 sm:top-6 ${CHIP}`}
      >
        {entered ? leaveLabel : open ? closeLabel : openLabel}
      </button>
    </div>
  );
}
