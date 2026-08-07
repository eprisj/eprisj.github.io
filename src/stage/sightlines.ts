// Видимость: то единственное, ради чего эта коробка вообще считается машиной.
//
// Расставить прямоугольники можно и на салфетке. Чего салфетка не делает —
// не отвечает, что с крайнего кресла закрыто декорацией. Это настоящая работа
// сценографа: мёртвые зоны ищут руками, ошибаются и переделывают построенное.
//
// Считаем не «видно ли пол», а видно ли ЛИЦО на отметке роста: помост высотой
// 40 см не мешает смотреть на стоящего человека, и модель обязана это знать.
import type { Scene, SceneObject } from './sceneModel';

/** Высота, на которой ищут актёра. Не пол: пол закрывает любая ступенька. */
export const TARGET_HEIGHT = 1.5;

export interface Seat {
  x: number;
  z: number;
  y: number;
  label: string;
}

/** Кресла ряда: середина и два края. Именно на краях сцена и разваливается —
 *  из центра почти всегда видно всё. */
export function seatsOf(scene: Scene, rowWidth = 6): Seat[] {
  const { viewer, room } = scene;
  const half = Math.min(rowWidth, room.w) / 2;
  const left = Math.max(0.2, viewer.x - half);
  const right = Math.min(room.w - 0.2, viewer.x + half);
  return [
    { x: left, z: viewer.z, y: viewer.eyeHeight, label: 'Left' },
    { x: viewer.x, z: viewer.z, y: viewer.eyeHeight, label: 'Centre' },
    { x: right, z: viewer.z, y: viewer.eyeHeight, label: 'Right' },
  ];
}

/* Пересечение отрезка с коробкой методом плит. Поворот объекта учитывается
   переводом отрезка в его собственные оси — так не нужно вращать саму коробку. */
function segmentHitsBox(
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  object: SceneObject,
): boolean {
  const cx = object.x + object.w / 2;
  const cz = object.z + object.d / 2;
  const angle = (-object.rotation * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const toLocal = (x: number, z: number) => {
    const dx = x - cx;
    const dz = z - cz;
    return { x: dx * cos - dz * sin + cx, z: dx * sin + dz * cos + cz };
  };

  const a = toLocal(ax, az);
  const b = toLocal(bx, bz);

  const min = [object.x, object.y, object.z];
  const max = [object.x + object.w, object.y + object.h, object.z + object.d];
  const origin = [a.x, ay, a.z];
  const delta = [b.x - a.x, by - ay, b.z - a.z];

  let tMin = 0;
  let tMax = 1;
  for (let axis = 0; axis < 3; axis += 1) {
    if (Math.abs(delta[axis]) < 1e-9) {
      // Отрезок параллелен плите: либо он внутри её полосы, либо промах.
      if (origin[axis] < min[axis] || origin[axis] > max[axis]) return false;
      continue;
    }
    let t1 = (min[axis] - origin[axis]) / delta[axis];
    let t2 = (max[axis] - origin[axis]) / delta[axis];
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  return true;
}

export interface Cell {
  x: number;
  z: number;
  /** Из скольких кресел точка закрыта. */
  blocked: number;
}

export interface Sightlines {
  cells: Cell[];
  step: number;
  seats: number;
  /** Площадь, невидимая ВСЕМ креслам: сюда ставить актёра нельзя. */
  deadArea: number;
  /** Площадь, закрытая хотя бы от одного кресла. */
  partialArea: number;
  stageArea: number;
}

/** `step` — шаг выборки в метрах. 0.25 даёт честную картину и считается мгновенно. */
export function computeSightlines(scene: Scene, step = 0.25): Sightlines {
  const seats = seatsOf(scene);
  // Заслоняют только те элементы, что реально стоят на пути: следы приёма
  // (пунктирные) — предположение, а не построенное, и в расчёт не идут.
  const blockers = scene.objects.filter((o) => !o.generatedBy && o.h > 0.05);
  const cells: Cell[] = [];
  let dead = 0;
  let partial = 0;
  let stage = 0;
  const cellArea = step * step;

  for (let z = step / 2; z < scene.room.d; z += step) {
    // Позади ряда сцены нет — там сидят, а не играют.
    if (z >= scene.viewer.z - step) continue;
    for (let x = step / 2; x < scene.room.w; x += step) {
      stage += cellArea;
      let blocked = 0;
      for (const seat of seats) {
        const hit = blockers.some((object) =>
          segmentHitsBox(seat.x, seat.y, seat.z, x, TARGET_HEIGHT, z, object),
        );
        if (hit) blocked += 1;
      }
      if (blocked > 0) {
        cells.push({ x, z, blocked });
        partial += cellArea;
        if (blocked === seats.length) dead += cellArea;
      }
    }
  }

  return { cells, step, seats: seats.length, deadArea: dead, partialArea: partial, stageArea: stage };
}
