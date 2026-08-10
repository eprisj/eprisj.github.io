// Привязки. Без них перетаскивание выдаёт 5.2837 м, и ведомость сразу перестаёт
// выглядеть документом — в цеху не пилят по четвёртому знаку.
//
// Порядок важен: сначала пробуем притянуться к ЧУЖОЙ грани или к стене зала
// (совпадение кромок — то, ради чего вообще двигают), и лишь если рядом ничего
// нет, округляем до шага раскладки.
import type { Scene, SceneObject } from './sceneModel';

/** Шаг раскладки: 5 см — мельче в набросочном чертеже не имеет смысла. */
export const SNAP_STEP = 0.05;

/** Порог притяжения в метрах. Крупнее — и объект «липнет» через полкомнаты. */
const PULL = 0.18;

/* Умножение на 0.05 оставляет двоичный мусор: 4.800000000000001. В поле ввода
   это выглядит поломкой и сводит на нет всю заявленную метричность, поэтому
   каждое возвращаемое значение приводится к миллиметру. */
function clean(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export interface SnapResult {
  value: number;
  /** Координата линии, к которой притянулись, — её показывают на плане. */
  guide: number | null;
}

function snapAxis(lead: number, size: number, targets: number[], step: number): SnapResult {
  let best: { value: number; guide: number; distance: number } | null = null;

  for (const target of targets) {
    // Притягиваются ОБЕ кромки: и та, что впереди, и дальняя. Иначе объект
    // можно поставить впритык только одной стороной.
    for (const edge of [0, size]) {
      const candidate = target - edge;
      const distance = Math.abs(lead - candidate);
      if (distance < PULL && (!best || distance < best.distance)) {
        best = { value: clean(candidate), guide: target, distance };
      }
    }
  }

  if (best) return { value: best.value, guide: best.guide };
  return { value: clean(Math.round(lead / step) * step), guide: null };
}

function targetsAlong(scene: Scene, moving: SceneObject, axis: 'x' | 'z'): number[] {
  const span = axis === 'x' ? scene.room.w : scene.room.d;
  const size = axis === 'x' ? 'w' : 'd';
  const targets = [0, span, span / 2];
  for (let m = 1; m < span; m += 1) targets.push(m);
  for (const object of scene.objects) {
    if (object.id === moving.id || object.generatedBy) continue;
    targets.push(object[axis], object[axis] + object[size]);
  }
  return targets;
}

export interface Snapped {
  x: number;
  z: number;
  guideX: number | null;
  guideZ: number | null;
}

/** `free` — перетаскивание с зажатым Alt: привязки временно отключены, потому
 *  что иногда нужно именно «не по сетке». */
export function snapObject(scene: Scene, moving: SceneObject, x: number, z: number, free = false, step = SNAP_STEP): Snapped {
  if (free) return { x, z, guideX: null, guideZ: null };
  const sx = snapAxis(x, moving.w, targetsAlong(scene, moving, 'x'), step);
  const sz = snapAxis(z, moving.d, targetsAlong(scene, moving, 'z'), step);
  return { x: sx.value, z: sz.value, guideX: sx.guide, guideZ: sz.guide };
}

/** Округление для полей ввода и клавиатурного сдвига — тот же шаг, что у мыши. */
export function toStep(value: number, step = SNAP_STEP): number {
  return clean(Math.round(value / step) * step);
}
