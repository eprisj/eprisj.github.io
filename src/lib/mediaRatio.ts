import ratios from '../content/media-ratios.json';

/* Ширина / высота картинки до того, как она загрузилась.
 *
 * <img> с height:auto и без размеров занимает 0px, пока файл не пришёл, а
 * потом раздвигает всё, что под ним, – посреди прокрутки текст прыгает вниз.
 * Резервируем коробку заранее: пропорции берутся из таблицы, которую при
 * сборке собирает scripts/media-ratios.mjs из заголовков файлов в
 * public/uploads. Что в таблицу не попало (внешние ссылки, загрузка после
 * сборки), запоминаем по факту загрузки в localStorage – со второго раза и
 * это место уже не прыгает. */
const table = ratios as Record<string, number>;
const STORE_KEY = 'epris:media-ratios:v1';
let learned: Record<string, number> | null = null;

function readLearned(): Record<string, number> {
  if (learned) return learned;
  try {
    learned = JSON.parse(localStorage.getItem(STORE_KEY) || '{}') as Record<string, number>;
  } catch {
    learned = {};
  }
  return learned;
}

/* Файл в таблице называется как оригинал; производные размеры
   (/uploads/sizes/<stem>-960w.webp) имеют те же пропорции. */
function keyOf(src: string): string {
  const path = src.split(/[?#]/)[0];
  const name = decodeURIComponent(path.slice(path.lastIndexOf('/') + 1));
  return name;
}

export function ratioOf(src: string | undefined): number | undefined {
  if (!src) return undefined;
  let name: string;
  try { name = keyOf(src); } catch { return undefined; }
  const known = table[name];
  if (known) return known;
  const derived = name.match(/^(.*)-\d+w\.webp$/);
  if (derived) {
    const stem = derived[1];
    const hit = Object.entries(table).find(([file]) => file.replace(/\.[^.]+$/, '') === stem);
    if (hit) return hit[1];
  }
  return readLearned()[src.split(/[?#]/)[0]];
}

export function rememberRatio(src: string | undefined, img: HTMLImageElement): void {
  if (!src || !img.naturalWidth || !img.naturalHeight) return;
  const key = src.split(/[?#]/)[0];
  const value = Math.round((img.naturalWidth / img.naturalHeight) * 1000) / 1000;
  const store = readLearned();
  if (store[key] === value) return;
  store[key] = value;
  try {
    const keys = Object.keys(store);
    if (keys.length > 400) delete store[keys[0]];
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch { /* приватный режим: просто не запоминаем */ }
}
