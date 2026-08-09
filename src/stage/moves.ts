// Приёмы Бюро, применённые к сцене.
//
// Каждый оператор выведен из текста своего разбора и ничего к нему не
// добавляет: параметр берётся из слоя «Mechanics», а предупреждения — дословно
// из «Where it breaks». Это НЕ реконструкция чужих работ, стоящих в разборе
// примерами: их размеров и конструкции мы не знаем, и придуманная
// спецификация была бы ложью, подписанной чужим именем. Приём применяется к
// ВАШЕЙ коробке — он показывает механику, а не копирует постановку.
//
// Оператор — чистая функция: сцена, которую вы собрали, остаётся базой, приём
// строится поверх неё. Поэтому ползунок можно возить туда-сюда без накопления
// сдвига, а «Bake» переносит результат в базу.
import { newId, type Scene, type SceneObject } from './sceneModel';

export interface MoveParam {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  initial: number;
}

export type ReadingTone = 'note' | 'breaks';

export interface Reading {
  tone: ReadingTone;
  text: string;
}

export type Params = Record<string, number>;

export interface Move {
  /** Совпадает со slug разбора в Бюро — оператор без разбора не показывается. */
  slug: string;
  params: MoveParam[];
  apply: (scene: Scene, params: Params, subjectId: string | null) => Scene;
  read: (scene: Scene, params: Params, subjectId: string | null) => Reading[];
}

function initialParams(move: Move): Params {
  return Object.fromEntries(move.params.map((p) => [p.key, p.initial]));
}

export function defaultParams(move: Move): Params {
  return initialParams(move);
}

/** Предмет приёма: выделенный объект, иначе самый крупный — приём всегда
 *  должен на чём-то стоять, даже если пользователь ничего не выбрал. */
function subjectOf(scene: Scene, subjectId: string | null): SceneObject | null {
  if (subjectId) {
    const found = scene.objects.find((o) => o.id === subjectId);
    if (found) return found;
  }
  return scene.objects.reduce<SceneObject | null>((biggest, o) => {
    if (!biggest) return o;
    return o.w * o.d * o.h > biggest.w * biggest.d * biggest.h ? o : biggest;
  }, null);
}

const centre = (o: SceneObject) => ({ x: o.x + o.w / 2, z: o.z + o.d / 2 });
const volume = (o: SceneObject) => o.w * o.d * o.h;
const round = (n: number, places = 1) => Number(n.toFixed(places));

/* ── object in emptiness ─────────────────────────────────────────────────────
   «An object cut out of its usual company forces the viewer to supply the
   context.» Параметр — радиус пустоты; всё прочее выталкивается за него.
   Разбор отдельно предупреждает: считать надо радиус, а не предмет в нём. */
const objectInEmptiness: Move = {
  slug: 'object-in-emptiness',
  params: [{ key: 'clearance', label: 'Clearance', min: 0.5, max: 8, step: 0.1, unit: 'm', initial: 3 }],
  apply(scene, params, subjectId) {
    const subject = subjectOf(scene, subjectId);
    if (!subject) return scene;
    const c = centre(subject);
    const clearance = params.clearance;
    return {
      ...scene,
      objects: scene.objects.map((o, index) => {
        if (o.id === subject.id) return o;
        const oc = centre(o);
        let dx = oc.x - c.x;
        let dz = oc.z - c.z;
        let distance = Math.hypot(dx, dz);
        const needed = clearance + Math.max(o.w, o.d) / 2;
        if (distance >= needed) return o;
        /* Совпадающие центры — не редкость, а норма: новые объекты рождаются
           в середине коробки. Луча от предмета в этом случае нет, поэтому
           раскладываем такие объекты веером по стабильному углу от индекса —
           иначе умножение нулевого вектора оставляло бы их стоять в точке. */
        if (distance < 0.001) {
          const angle = (index * 2 * Math.PI) / Math.max(scene.objects.length - 1, 1);
          dx = Math.cos(angle);
          dz = Math.sin(angle);
          distance = 1;
        }
        // Толкаем по лучу от предмета — направление, в котором объект уже
        // стоял, сохраняется, меняется только дистанция.
        const scale = needed / distance;
        const nx = c.x + dx * scale - o.w / 2;
        const nz = c.z + dz * scale - o.d / 2;
        return {
          ...o,
          x: Math.min(Math.max(nx, 0), scene.room.w - o.w),
          z: Math.min(Math.max(nz, 0), scene.room.d - o.d),
        };
      }),
    };
  },
  read(scene, params, subjectId) {
    const subject = subjectOf(scene, subjectId);
    const out: Reading[] = [];
    if (!subject) return [{ tone: 'breaks', text: 'Nothing stands in the room yet — the move needs one object to isolate.' }];
    const clearance = params.clearance;
    const area = Math.PI * clearance * clearance;
    const floor = scene.room.w * scene.room.d;
    out.push({
      tone: 'note',
      text: `The emptiness takes ${round(area)} m² of floor — ${Math.round((Math.min(area, floor) / floor) * 100)}% of the room. Budget the radius, not the thing standing in it.`,
    });
    if (clearance * 2 > Math.min(scene.room.w, scene.room.d)) {
      out.push({ tone: 'breaks', text: 'The radius no longer fits the room: the objects are pinned to the walls, and the emptiness is a wall gap rather than a field.' });
    }
    /* «The move collapses the moment a second, similar object appears beside
       it.» Расстояние здесь не показатель: приём сам расставляет соседей по
       кольцу на РАВНОМ отдалении, а равенство и есть узор. Считать надо
       похожесть — близнец по размеру ломает приём, где бы он ни стоял. */
    const twins = scene.objects.filter((o) => {
      if (o.id === subject.id) return false;
      const ratio = volume(o) / (volume(subject) || 1);
      return ratio >= 0.6 && ratio <= 1.7;
    });
    if (twins.length) {
      out.push({
        tone: 'breaks',
        text: `${twins.length === 1 ? `“${twins[0].label}” is` : `${twins.length} more objects are`} close enough in size to read as a set with the subject. Two of anything is a pattern, and a pattern explains itself.`,
      });
    }
    return out;
  },
};

/* ── the borrowed object ─────────────────────────────────────────────────────
   Геометрия тут почти ни при чём: разбор говорит о количестве и о степени
   вмешательства. Обе границы взяты из «Where it breaks» и «What it costs». */
/* Раскладка копий живёт отдельно, потому что ею пользуются ОБА метода: apply
   строит по ней объекты, read по ней же отчитывается. Иначе панель говорила бы
   «восемь», пока в коробку помещается три — ровно то умолчание, которого
   витрина избегает в текстах о работах. */
function packCopies(scene: Scene, subject: SceneObject, count: number): { x: number; z: number }[] {
  if (count <= 1) return [];
  const gap = Math.max(subject.w, subject.d) * 0.6;
  const perRow = Math.max(1, Math.floor((scene.room.w - subject.x) / (subject.w + gap)));
  const spots: { x: number; z: number }[] = [];
  for (let i = 1; i < count; i += 1) {
    const x = subject.x + (i % perRow) * (subject.w + gap);
    const z = subject.z + Math.floor(i / perRow) * (subject.d + gap);
    if (x + subject.w > scene.room.w || z + subject.d > scene.room.d) continue;
    spots.push({ x, z });
  }
  return spots;
}

const borrowedObject: Move = {
  slug: 'borrowed-object',
  params: [
    { key: 'count', label: 'Copies', min: 1, max: 16, step: 1, unit: '', initial: 1 },
    { key: 'alteration', label: 'Alteration', min: 0, max: 100, step: 5, unit: '%', initial: 35 },
  ],
  apply(scene, params, subjectId) {
    const subject = subjectOf(scene, subjectId);
    if (!subject) return scene;
    const copies = packCopies(scene, subject, Math.round(params.count)).map((spot) => ({
      ...subject,
      id: newId('obj'),
      x: spot.x,
      z: spot.z,
      generatedBy: 'borrowed-object',
    }));
    return { ...scene, objects: [...scene.objects, ...copies] };
  },
  read(scene, params, subjectId) {
    const subject = subjectOf(scene, subjectId);
    if (!subject) return [{ tone: 'breaks', text: 'Nothing to borrow yet — add the object first.' }];
    const out: Reading[] = [];
    const count = Math.round(params.count);
    const alteration = params.alteration;
    const placed = packCopies(scene, subject, count).length + 1;
    if (count === 1) {
      out.push({ tone: 'note', text: 'One borrowed object is a gesture.' });
    } else {
      out.push({ tone: 'note', text: `${placed} of them. Each one still has an author: licensing an edition is a design job with a legal half.` });
    }
    if (placed < count) {
      out.push({ tone: 'breaks', text: `The room takes ${placed}: the other ${count - placed} have nowhere to stand. An edition needs floor before it needs a licence.` });
    }
    if (placed >= 6) {
      out.push({ tone: 'breaks', text: 'A room of them is a production line, not a borrowing.' });
    }
    if (alteration < 15) {
      out.push({ tone: 'breaks', text: 'Untouched, it reads as a prop someone had lying around — the borrowing has to show intent.' });
    } else if (alteration > 80) {
      out.push({ tone: 'breaks', text: 'Over-designed, the borrowing disappears and you are back to making furniture.' });
    }
    return out;
  },
};

/* ── cloth as wall ───────────────────────────────────────────────────────────
   Единственный приём, который меняет МАТЕРИАЛ, а не расстановку: стена
   становится тонкой, высокой и проницаемой. В объёме это видно буквально. */
const clothAsWall: Move = {
  slug: 'cloth-as-wall',
  params: [
    { key: 'translucency', label: 'Translucency', min: 0, max: 100, step: 5, unit: '%', initial: 55 },
    { key: 'drop', label: 'Drop', min: 20, max: 100, step: 5, unit: '%', initial: 85 },
  ],
  apply(scene, params) {
    const opacity = 1 - params.translucency / 100;
    return {
      ...scene,
      objects: scene.objects.map((o) => {
        if (o.kind !== 'wall') return o;
        return {
          ...o,
          d: 0.04,
          h: round(scene.room.h * (params.drop / 100), 2),
          soft: true,
          opacity: Math.max(0.08, opacity),
        };
      }),
    };
  },
  read(scene, params) {
    const walls = scene.objects.filter((o) => o.kind === 'wall');
    if (!walls.length) {
      return [{ tone: 'breaks', text: 'There is no wall here to soften. Add a wall, then hang it.' }];
    }
    const out: Reading[] = [
      { tone: 'note', text: `${walls.length} wall${walls.length > 1 ? 's' : ''} hung at 40 mm. What the room loses in solidity it gains in time.` },
    ];
    if (params.drop > 96) {
      out.push({ tone: 'breaks', text: 'Floor to ceiling, the cloth stops moving and reads as a painted wall again — leave it short of the slab.' });
    }
    if (params.translucency > 85) {
      out.push({ tone: 'breaks', text: 'At this transparency there is no wall left, only a haze: nothing is divided and nothing is revealed.' });
    }
    return out;
  },
};

/* ── material that returns ───────────────────────────────────────────────────
   «Build from what the last show left behind.» Мерило — попадание в складской
   модуль: то, что режется в размер, назад не вернётся. */
const materialThatReturns: Move = {
  slug: 'material-that-returns',
  params: [{ key: 'module', label: 'Stock module', min: 0.2, max: 1.2, step: 0.05, unit: 'm', initial: 0.6 }],
  apply(scene, params) {
    const m = params.module;
    const snap = (value: number) => Math.max(m, Math.round(value / m) * m);
    return {
      ...scene,
      objects: scene.objects.map((o) => ({
        ...o,
        w: round(snap(o.w), 2),
        d: round(snap(o.d), 2),
        h: round(snap(o.h), 2),
      })),
    };
  },
  read(scene, params) {
    if (!scene.objects.length) {
      return [{ tone: 'breaks', text: 'Nothing to account for yet.' }];
    }
    const m = params.module;
    const fits = (value: number) => Math.abs(value / m - Math.round(value / m)) < 0.02;
    const whole = scene.objects.filter((o) => fits(o.w) && fits(o.d) && fits(o.h)).length;
    // Отход считаем как объём, срезанный до модуля: именно он не вернётся.
    const offcut = scene.objects.reduce((sum, o) => {
      const cut = (v: number) => Math.abs(v - Math.round(v / m) * m);
      return sum + cut(o.w) * o.d * o.h + cut(o.d) * o.w * o.h + cut(o.h) * o.w * o.d;
    }, 0);
    const out: Reading[] = [
      { tone: 'note', text: `${whole} of ${scene.objects.length} elements come out of stock whole. Design the taking-apart as carefully as the putting-up.` },
    ];
    if (offcut > 0.05) {
      out.push({ tone: 'breaks', text: `${round(offcut, 2)} m³ has to be cut to size — that part does not go back on the rack.` });
    }
    return out;
  },
};

/* ── a room inside a room ────────────────────────────────────────────────────
   «Let the seam between the two do the talking» — поэтому параметр здесь шов,
   а не внутренняя коробка: коробка из него следует. */
const roomInsideARoom: Move = {
  slug: 'room-inside-a-room',
  params: [
    { key: 'seam', label: 'Seam', min: 0.1, max: 5, step: 0.1, unit: 'm', initial: 1.5 },
    { key: 'height', label: 'Inner height', min: 1.5, max: 8, step: 0.1, unit: 'm', initial: 2.6 },
  ],
  apply(scene, params) {
    const seam = params.seam;
    const h = params.height;
    const innerW = scene.room.w - seam * 2;
    const innerD = scene.room.d - seam * 2;
    if (innerW <= 0.4 || innerD <= 0.4) return scene;
    const t = 0.12;
    const wall = (label: string, x: number, z: number, w: number, d: number): SceneObject => ({
      id: newId('obj'),
      kind: 'wall',
      label,
      x,
      z,
      y: 0,
      w,
      d,
      h,
      rotation: 0,
      generatedBy: 'room-inside-a-room',
    });
    return {
      ...scene,
      objects: [
        ...scene.objects,
        wall('Inner back', seam, seam, innerW, t),
        wall('Inner front', seam, seam + innerD - t, innerW, t),
        wall('Inner left', seam, seam, t, innerD),
        wall('Inner right', seam + innerW - t, seam, t, innerD),
      ],
    };
  },
  read(scene, params) {
    const seam = params.seam;
    const innerW = round(scene.room.w - seam * 2);
    const innerD = round(scene.room.d - seam * 2);
    const out: Reading[] = [];
    if (innerW <= 0.4 || innerD <= 0.4) {
      return [{ tone: 'breaks', text: 'The seam has eaten the inner room: there is no inside left to build.' }];
    }
    out.push({ tone: 'note', text: `A ${innerW} × ${innerD} m room inside a ${scene.room.w} × ${scene.room.d} m hall, ${seam} m of seam all round.` });
    if (seam < 0.6) {
      out.push({ tone: 'breaks', text: 'Under 600 mm nobody walks the seam — the inner room stops being a building and becomes cladding.' });
    }
    if (params.height >= scene.room.h - 0.15) {
      out.push({ tone: 'breaks', text: 'It reaches the ceiling: this is a partition wall now, and the hall around it has disappeared.' });
    }
    return out;
  },
};

export const MOVES: Move[] = [objectInEmptiness, borrowedObject, clothAsWall, materialThatReturns, roomInsideARoom];

export function moveBySlug(slug: string): Move | undefined {
  return MOVES.find((m) => m.slug === slug);
}

/** Для Бюро: у каких разборов вообще есть чем покрутить. Список, а не сами
 *  операторы, чтобы страница разбора не тащила за собой геометрию. */
export const PLAYABLE_SLUGS: readonly string[] = MOVES.map((m) => m.slug);
