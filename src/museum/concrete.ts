import { CanvasTexture, RepeatWrapping, Vector2 } from 'three';
import type { Texture } from 'three';

/* ФАКТУРА БЕТОНА, СОСЧИТАННАЯ В БРАУЗЕРЕ.
 *
 * Ровный `meshStandardMaterial` выдаёт компьютер сильнее любой геометрии:
 * настоящий бетон никогда не бывает одинаковым на всей грани. Нужна карта
 * нормалей и карта шероховатости, и обычно их кладут файлами.
 *
 * Здесь они считаются на canvas при первом показе: тайлящийся шум, редкие
 * раковины от воздуха и горизонтальные швы опалубки. Это несколько
 * миллисекунд один раз за сессию против сотен килобайт в бандле, и текстура
 * настраивается числами, а не пересобирается в редакторе.
 *
 * Тайлящийся шум получается из решётки с индексами по модулю: значение на
 * правом краю приходит из той же ячейки, что и на левом, поэтому швов между
 * копиями не возникает.
 */

const SIZE = 256;          // текселей на плитку
const TILE_METRES = 6;     // сколько метров стены покрывает одна плитка

function lattice(cells: number, seed: number) {
  const values = new Float32Array(cells * cells);
  let state = seed >>> 0;
  for (let i = 0; i < values.length; i += 1) {
    // xorshift: детерминированно и без зависимостей
    state ^= state << 13; state >>>= 0;
    state ^= state >> 17;
    state ^= state << 5; state >>>= 0;
    values[i] = (state % 1000) / 1000;
  }
  return values;
}

function smooth(t: number) {
  return t * t * (3 - 2 * t);
}

/* Значение шума в точке с тайлингом по решётке cells×cells. */
function noiseAt(values: Float32Array, cells: number, x: number, y: number) {
  const gx = Math.floor(x);
  const gy = Math.floor(y);
  const fx = smooth(x - gx);
  const fy = smooth(y - gy);
  const at = (ix: number, iy: number) =>
    values[((iy % cells) + cells) % cells * cells + (((ix % cells) + cells) % cells)];
  const a = at(gx, gy);
  const b = at(gx + 1, gy);
  const c = at(gx, gy + 1);
  const d = at(gx + 1, gy + 1);
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
}

function heightField() {
  const field = new Float32Array(SIZE * SIZE);
  /* Три октавы: пятна заливки, зерно заполнителя и мелкая рябь. */
  const octaves = [
    { cells: 3, amp: 0.62, seed: 0x2f6b1c },
    { cells: 11, amp: 0.34, seed: 0x51a7d3 },
    { cells: 64, amp: 0.17, seed: 0x9c3e88 },
  ];
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      let value = 0;
      for (const octave of octaves) {
        const values = octaveCache(octave.cells, octave.seed);
        value += noiseAt(values, octave.cells, (x / SIZE) * octave.cells, (y / SIZE) * octave.cells) * octave.amp;
      }
      /* Шов опалубки: доска шириной в четверть плитки оставляет тонкую
         впадину и лёгкий наплыв под ней. */
      const board = (y % (SIZE / 4)) / (SIZE / 4);
      if (board < 0.02) value -= 0.16;
      else if (board < 0.05) value += 0.05;
      field[y * SIZE + x] = value;
    }
  }
  /* Раковины: воздух, который не вышел при вибрации. Редкие и мелкие —
     частые превращают бетон в пемзу. */
  let state = 0x1234abcd;
  for (let i = 0; i < 42; i += 1) {
    state ^= state << 13; state >>>= 0;
    state ^= state >> 17;
    state ^= state << 5; state >>>= 0;
    const cx = state % SIZE;
    const cy = (state >> 8) % SIZE;
    const radius = 1 + (state % 2);
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (dx * dx + dy * dy > radius * radius) continue;
        const px = ((cx + dx) % SIZE + SIZE) % SIZE;
        const py = ((cy + dy) % SIZE + SIZE) % SIZE;
        field[py * SIZE + px] -= 0.17;
      }
    }
  }
  return field;
}

const cache = new Map<string, Float32Array>();
function octaveCache(cells: number, seed: number) {
  const key = `${cells}:${seed}`;
  let value = cache.get(key);
  if (!value) {
    value = lattice(cells, seed);
    cache.set(key, value);
  }
  return value;
}

function buildTextures() {
  const field = heightField();

  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = normalCanvas.height = SIZE;
  const normalCtx = normalCanvas.getContext('2d');

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = roughCanvas.height = SIZE;
  const roughCtx = roughCanvas.getContext('2d');

  if (!normalCtx || !roughCtx) return null;

  const normalData = normalCtx.createImageData(SIZE, SIZE);
  const roughData = roughCtx.createImageData(SIZE, SIZE);
  const at = (x: number, y: number) => field[(((y % SIZE) + SIZE) % SIZE) * SIZE + (((x % SIZE) + SIZE) % SIZE)];

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      /* Нормаль из наклона высоты: разница соседей по обеим осям. */
      const dx = at(x + 1, y) - at(x - 1, y);
      const dy = at(x, y + 1) - at(x, y - 1);
      const strength = 2.4;
      const nx = -dx * strength;
      const ny = -dy * strength;
      const nz = 1;
      const length = Math.hypot(nx, ny, nz);
      const index = (y * SIZE + x) * 4;
      normalData.data[index] = ((nx / length) * 0.5 + 0.5) * 255;
      normalData.data[index + 1] = ((ny / length) * 0.5 + 0.5) * 255;
      normalData.data[index + 2] = ((nz / length) * 0.5 + 0.5) * 255;
      normalData.data[index + 3] = 255;

      /* Впадины держат воду и матовее гребней: шероховатость идёт за высотой. */
      const rough = 210 - at(x, y) * 90;
      roughData.data[index] = rough;
      roughData.data[index + 1] = rough;
      roughData.data[index + 2] = rough;
      roughData.data[index + 3] = 255;
    }
  }

  normalCtx.putImageData(normalData, 0, 0);
  roughCtx.putImageData(roughData, 0, 0);

  const normalMap = new CanvasTexture(normalCanvas);
  const roughnessMap = new CanvasTexture(roughCanvas);
  [normalMap, roughnessMap].forEach((texture) => {
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.anisotropy = 4;
  });
  return { normalMap, roughnessMap };
}

let built: { normalMap: Texture; roughnessMap: Texture } | null | undefined;

export function concreteMaps() {
  if (built === undefined) built = typeof document === 'undefined' ? null : buildTextures();
  return built;
}

/* Плотность зерна должна быть одинаковой на маленьком парапете и на длинной
   стене, поэтому повтор считается от габарита массы, а не задаётся числом. */
export function concreteRepeat(width: number, height: number) {
  return new Vector2(Math.max(1, width / TILE_METRES), Math.max(1, height / TILE_METRES));
}
