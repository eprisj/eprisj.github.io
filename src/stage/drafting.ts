// Правила чертежа, общие для плана и разреза.
//
// Главное, чем чертёж отличается от схемы: смысл несёт ВЕС ЛИНИИ, а не подпись.
// То, что плоскость сечения режет, идёт жирным и заливается (поше); то, что
// видно за срезом, — средним; сетка и размерные — волоском. Пока всё нарисовано
// одной толщиной, глаз читает каркасную схему, сколько подписей на неё ни вешай.
import type { ObjectKind, SceneObject } from './sceneModel';

export const PAPER = '#f5f0eb';
export const GOLD = '#b8956e';

export const PX_PER_M = 40;
export const PAD_L = 58;
export const PAD_T = 30;
export const PAD_R = 30;
export const PAD_B = 58;

export const WEIGHT = {
  hairline: 0.5,
  grid: 0.6,
  gridMajor: 0.9,
  seen: 1.3,
  cut: 2.2,
  selected: 2.4,
} as const;

/** Режется ли элемент плоскостью сечения. Стены — да, поэтому они заливаются;
 *  помосты, предметы и мебель стоят в поле зрения и остаются контуром. */
export function isCut(kind: ObjectKind): boolean {
  return kind === 'wall';
}

export interface ElementStyle {
  fill: string;
  fillOpacity: number;
  stroke: string;
  strokeWidth: number;
}

export function styleFor(object: SceneObject, selected: boolean): ElementStyle {
  if (selected) {
    return { fill: GOLD, fillOpacity: 0.22, stroke: GOLD, strokeWidth: WEIGHT.selected };
  }
  if (isCut(object.kind)) {
    // Поше: сплошная заливка вместо контура — так стена читается как масса.
    return { fill: PAPER, fillOpacity: 0.82, stroke: PAPER, strokeWidth: WEIGHT.cut };
  }
  if (object.kind === 'platform') {
    return { fill: PAPER, fillOpacity: 0.13, stroke: PAPER, strokeWidth: WEIGHT.seen };
  }
  return { fill: PAPER, fillOpacity: 0.06, stroke: PAPER, strokeWidth: WEIGHT.seen };
}

/** Номер элемента в ведомости. Двузначная метка не наезжает на соседнюю, в
 *  отличие от слова, и отсылает к строке со всеми размерами. */
export function tagOf(index: number): string {
  return String(index + 1).padStart(2, '0');
}

/** Шаг размерной цепочки, чтобы на длинной стороне не выросла каша из чисел. */
export function dimStep(metres: number): number {
  if (metres <= 6) return 1;
  if (metres <= 16) return 2;
  return 5;
}
