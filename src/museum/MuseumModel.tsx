import { Component, createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Html, Lightformer, MeshReflectorMaterial, OrbitControls, RoundedBox } from '@react-three/drei';
import {
  ACESFilmicToneMapping,
  Color,
  CubeCamera,
  DoubleSide,
  ExtrudeGeometry,
  LinearMipmapLinearFilter,
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
import { Interior, interiorEye } from './Interior';

/* Эффекты — свой чанк на 155 КБ, и телефон его не скачивает: см. Effects.tsx */
const Effects = lazy(() => import('./Effects'));
/* Интерьеры лежат в том же чанке, что и макет: точка глаза нужна модели
   сразу, а сами комнаты — это полторы сотни строк геометрии, ради которых
   отдельный запрос не окупается. */

export type MuseumLabels = Record<HallId, string>;

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
function useConcrete() {
  const [normalMap, roughnessMap, map] = useLoader(TextureLoader, [
    '/museum/concrete-normal.webp',
    '/museum/concrete-rough.webp',
    '/museum/concrete-albedo.webp',
  ]);
  useMemo(() => {
    [normalMap, roughnessMap, map].forEach((texture) => {
      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
      texture.anisotropy = 8;
    });
    /* Цвет — в sRGB, рельеф и шероховатость — числа, а не цвет: перевод
       испортил бы и то и другое. */
    map.colorSpace = SRGBColorSpace;
  }, [map, normalMap, roughnessMap]);
  return { normalMap, roughnessMap, map };
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
const TOWER = { w: 6.0, d: 6.0, h: 13.4, x: 11.6, z: -2.4 };          // study
const POOL = { w: 26, d: 11, z: 17.0, y: -1.2 };                       // court

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
        map={surface.map}
        normalMap={surface.normalMap}
        normalScale={NORMAL_SCALE}
        roughnessMap={surface.roughnessMap}
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
    const target = new WebGLCubeRenderTarget(256, {
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
function Figures() {
  const people = useMemo<[number, number, number][]>(() => [
    [-6.2, 0, 14.6], [-4.4, 0, 15.4], [3.6, 0, 13.2],
    [8.4, 0, 12.4], [-12.0, 0, 12.8], [1.2, 0, 11.4],
  ], []);

  return (
    <group>
      {people.map(([x, , z], index) => (
        <group key={index} position={[x, PLINTH.h, z]} rotation={[0, index * 1.1, 0]}>
          <mesh position={[0, 0.78, 0]} castShadow>
            <capsuleGeometry args={[0.16, 0.92, 4, 8]} />
            <meshStandardMaterial color={index % 2 ? '#4a4640' : '#5e594f'} roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.5, 0]} castShadow>
            <sphereGeometry args={[0.13, 12, 10]} />
            <meshStandardMaterial color="#6b665c" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Trees() {
  const trees = useMemo<[number, number, number][]>(() => [
    [-17.5, 12.6, 1.0], [-17.0, 4.4, 0.9], [16.4, 11.4, 1.05], [17.2, 3.2, 0.95],
  ], []);

  return (
    <group>
      {trees.map(([x, z, scale], index) => (
        <group key={index} position={[x, PLINTH.h, z]} scale={scale}>
          <mesh position={[0, 1.6, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.18, 3.2, 7]} />
            <meshStandardMaterial color="#6a6055" roughness={0.95} />
          </mesh>
          {[0, 1, 2].map((level) => (
            <mesh key={level} position={[(level - 1) * 0.32, 3.4 + level * 0.62, (index % 2 ? 1 : -1) * level * 0.28]} castShadow>
              <icosahedronGeometry args={[1.25 - level * 0.22, 0]} />
              <meshStandardMaterial color={level % 2 ? '#7d8168' : '#888c72'} roughness={0.95} flatShading />
            </mesh>
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
    </group>
  );
}

/* Двор с водой. Отражение — единственное движение в кадре и главный повод
   смотреть на здание дольше двух секунд. */
function Court({ tone }: { tone: number }) {
  return (
    <group>
      <mesh position={[0, POOL.y, POOL.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[POOL.w, POOL.d]} />
        <MeshReflectorMaterial
          color={WATER}
          resolution={512}
          mixBlur={0.9}
          mixStrength={2.6}
          blur={[240, 60]}
          mirror={0.55}
          depthScale={0.6}
          minDepthThreshold={0.2}
          maxDepthThreshold={1.2}
          roughness={0.55}
          metalness={0.1}
        />
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
      <Court tone={selected === 'court' ? 0.34 : hovered === 'court' ? 0.2 : 0} />
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

      {/* ВЕРХНЯЯ ГАЛЕРЕЯ — поперёк нижней, с консолью на обе стороны */}
      <group ref={cross}>
        <Mass
          size={[CROSS.w, CROSS.h, CROSS.d]}
          position={[CROSS.x, CROSS.y + CROSS.h / 2, CROSS.z]}
          color={tone('practice', CONCRETE_LIT)}
          hallId="practice"
          onSelect={onSelect}
          onHover={onHover}
        />
        <BoardMarks w={CROSS.w} d={CROSS.d} h={CROSS.h} y={CROSS.y} x={CROSS.x} z={CROSS.z} step={1.1} />
        <Coffers w={CROSS.w} d={CROSS.d} x={CROSS.x} y={CROSS.y} z={CROSS.z} />
        <RoofMonitors x={CROSS.x} y={CROSS.y + CROSS.h} z={CROSS.z} w={CROSS.w} d={CROSS.d} />
        <TrapezoidEye position={[CROSS.x - CROSS.w / 2 - 0.5, CROSS.y + CROSS.h / 2, CROSS.z + 6.2]} />
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

      <Parapet x={BAR.x} z={0} w={BAR.w} d={BAR.d} y={BAR.y + 1.1 + BAR.h} />
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

  return (
    <>
      {HALLS.map((hall) => {
        const active = selected === hall.id || hovered === hall.id;
        return (
          <Html key={hall.id} position={[hall.focus[0], hall.focus[1] - 6.4, hall.focus[2]]} center zIndexRange={[8, 0]}>
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

function SiteContours() {
  const rings = useMemo(() => [27.0, 32.0, 38.0, 45.0], []);
  return (
    <group position={[0, -6.72, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {rings.map((radius, index) => (
        <mesh key={radius} position={[0, 0, index * 0.02]} renderOrder={1}>
          <ringGeometry args={[radius, radius + 0.05, 128]} />
          {/* Кольца лежали в двух миллиметрах друг от друга и от земли —
              буфер глубины такую разницу не различает. Разносим и снимаем
              их с записи глубины: это разметка, а не поверхность. */}
          <meshBasicMaterial color={GOLD} transparent opacity={0.3 - index * 0.06} side={DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

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
    orbit.target.set(0, 1.5, -2);
    orbit.update?.();
    settled.current = hall;
  });

  return null;
}

function CameraRig({ open, radius, focusY }: { open: boolean; radius: number; focusY: number }) {
  const { camera, size } = useThree();
  const distance = useRef(0);
  const target = useRef(0);

  const fitted = useMemo(() => {
    const perspective = camera as PerspectiveCamera;
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
    const want = fitted * (open ? 1.16 : 1);
    distance.current += (want - distance.current) * step;
    target.current += (focusY - target.current) * step * 0.8;

    spherical.current.setFromVector3(camera.position.clone().sub(new Vector3(0, target.current, 0)));
    if (open) spherical.current.phi += (1.24 - spherical.current.phi) * step * 0.6;
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

function EffectsGate() {
  const { size, gl } = useThree();
  const heavyEnough = size.width >= 640 && gl.capabilities.isWebGL2;
  if (!heavyEnough) return null;
  return <Effects />;
}

function Turntable({ still, slow, children }: { still: boolean; slow: boolean; children: React.ReactNode }) {
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    if (still || !group.current || slow) return;
    group.current.rotation.y += delta * 0.05;
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
  entered = false,
  onEnter,
  onLeave,
}: {
  label: string;
  openLabel: string;
  closeLabel: string;
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

  if (typeof window !== 'undefined' && !hasWebGL()) {
    return <div className="flex h-full w-full items-center justify-center bg-[#e9e6e1]" role="img" aria-label={label} />;
  }

  return (
    <div className="relative h-full w-full">
      <div className="h-full w-full cursor-grab active:cursor-grabbing" role="img" aria-label={open ? insideLabel : label}>
        <Canvas
          shadows
          camera={{ position: [46, 14, 34], fov: 26 }}
          dpr={[1, 1.8]}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
            /* Плоский тонмаппинг годился для гипса: белое здание на белом фоне.
               Бетон живёт полутенями, и ACES с лёгкой недодержкой держит их
               в диапазоне вместо того, чтобы выбивать бок под солнцем. */
            toneMapping: ACESFilmicToneMapping,
            toneMappingExposure: 1.08,
          }}
        >
          <ReflectionContext.Provider value={reflection}>
          {entered && selectedHall ? <InteriorRig hall={selectedHall} /> : <CameraRig open={open} radius={22.5} focusY={focusY} />}

          {/* Свет как в полдень над макетом: одно жёсткое солнце даёт тень,
              холодное небо сверху вынимает верхние грани, тёплый отражённый
              снизу не даёт теням стать чёрными дырами. */}
          {/* Окружение собрано из светящихся плоскостей и запечено в один кадр:
              никакой HDRI-файл не грузится, но у бетона появляется небо, от
              которого он берёт цвет, и земля, от которой берёт отсвет. Без
              этого теневые грани были одинаково мёртвыми. */}
          {!entered && <Environment frames={1} resolution={128} background={false}>
            <Lightformer form="rect" intensity={1.5} color="#eaf1f8" position={[0, 22, 6]} scale={[38, 16, 1]} rotation={[-Math.PI / 2, 0, 0]} />
            <Lightformer form="rect" intensity={0.7} color="#b79a78" position={[0, -14, 0]} scale={[40, 40, 1]} rotation={[Math.PI / 2, 0, 0]} />
            <Lightformer form="rect" intensity={0.9} color="#dfe6ef" position={[-24, 6, -12]} scale={[16, 14, 1]} rotation={[0, Math.PI / 2.4, 0]} />
            {/* Полоса горизонта: именно она отражается в стекле, без неё окно
                остаётся ровным тёмным пятном. */}
            <Lightformer form="rect" intensity={2.2} color="#ffffff" position={[16, 3.2, 22]} scale={[26, 2.2, 1]} />
            <Lightformer form="rect" intensity={1.1} color="#cddbe8" position={[-18, 9, 20]} scale={[14, 6, 1]} />
          </Environment>}
          {!entered && <hemisphereLight args={['#eef2f6', '#9c8f80', 0.44]} />}
          {!entered && <directionalLight
            position={[24, 21, 17]}
            intensity={2.35}
            color="#fff5e6"
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-bias={-0.0005}
            shadow-normalBias={0.03}
            shadow-camera-left={-44}
            shadow-camera-right={44}
            shadow-camera-top={44}
            shadow-camera-bottom={-44}
          />}
          {!entered && <directionalLight position={[-28, 14, -22]} intensity={0.4} color="#cfd8e6" />}
          {!entered && <pointLight position={[0, 4, 0]} intensity={open ? 40 : 0} distance={34} decay={2} color="#fff3e2" />}

          <Suspense fallback={null}>
            {!entered && <SceneReflection onReady={setReflection} />}
            {entered && selectedHall ? (
              <Interior hall={selectedHall} />
            ) : (
            <Turntable still={still} slow={open || selectedHall !== null}>
              <Building open={open} selected={selectedHall} hovered={hovered} onSelect={select} onHover={setHovered} />
              {(open || selectedHall) && (
                <HallPins labels={labels} selected={selectedHall} hovered={hovered} onSelect={select} onHover={setHovered} lockedHint={lockedHint} />
              )}
              <SiteContours />
              <ContactShadows position={[0, -6.74, 0]} opacity={0.45} scale={96} blur={2.4} far={26} resolution={512} color="#4f4a43" />
            </Turntable>
            )}
          </Suspense>

          <EffectsBoundary>
            <Suspense fallback={null}>
              <EffectsGate />
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
            <OrbitControls enableZoom={false} enablePan={false} minPolarAngle={0.55} maxPolarAngle={Math.PI / 2.12} rotateSpeed={0.55} />
          )}
        </Canvas>
      </div>

      <button
        type="button"
        onClick={() => (entered ? onLeave?.() : setOpen((value) => !value))}
        aria-pressed={entered ? true : open}
        className="absolute right-4 top-4 z-10 min-h-11 border border-[rgb(var(--c-accent-rgb)_/_0.35)] bg-[var(--c-bg)]/85 px-4 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--c-accent)] backdrop-blur-sm transition hover:bg-[var(--c-accent)] hover:text-[var(--c-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-accent)] sm:right-6 sm:top-6"
      >
        {entered || open ? closeLabel : openLabel}
      </button>
    </div>
  );
}
