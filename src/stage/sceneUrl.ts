// Сцена целиком живёт в адресе — ссылкой, а не записью на сервере.
//
// Почему так: сцена здесь черновик, а не публикация. Отправлять её в общее
// хранилище значило бы завести публичную запись без редактора — ровно то, от
// чего вітрина отгораживается своим «ничего не публикуется автоматически».
// Ссылка же не требует ни модерации, ни чистки мусора: сцену держит тот, кто
// ею поделился.
import { emptyScene, newId, type Scene, type SceneObject, type ObjectKind, type LightKind } from './sceneModel';

const VERSION = 1;

// Порядок полей — часть формата: объекты пишутся кортежем, а не словарём,
// иначе имена ключей занимают в адресе больше места, чем сами числа.
type PackedObject = [string, string, number, number, number, number, number, number, number];
type PackedLight = [string, string, number, number, number, number];

interface Packed {
  v: number;
  r: [number, number, number];
  p: [number, number, number];
  o: PackedObject[];
  l: PackedLight[];
}

/** Сантиметровой точности хватает для сцены и вдвое укорачивает адрес. */
const trim = (n: number) => Math.round(n * 100) / 100;

function pack(scene: Scene): Packed {
  return {
    v: VERSION,
    r: [trim(scene.room.w), trim(scene.room.d), trim(scene.room.h)],
    p: [trim(scene.viewer.x), trim(scene.viewer.z), trim(scene.viewer.eyeHeight)],
    o: scene.objects.map((o) => [
      o.kind,
      o.label,
      trim(o.x),
      trim(o.z),
      trim(o.y),
      trim(o.w),
      trim(o.d),
      trim(o.h),
      trim(o.rotation),
    ]),
    l: scene.lights.map((l) => [l.kind, l.label, trim(l.x), trim(l.z), trim(l.y), trim(l.angle)]),
  };
}

function unpack(packed: Packed): Scene {
  const base = emptyScene();
  return {
    room: { w: packed.r[0], d: packed.r[1], h: packed.r[2] },
    viewer: { x: packed.p[0], z: packed.p[1], eyeHeight: packed.p[2] },
    objects: (packed.o || []).map((o) => ({
      id: newId('obj'),
      kind: o[0] as ObjectKind,
      label: o[1],
      x: o[2],
      z: o[3],
      y: o[4],
      w: o[5],
      d: o[6],
      h: o[7],
      rotation: o[8],
    })),
    // Свет необязателен: сцена, собранная до появления источников в формате,
    // всё равно должна открыться — лучше дефолтный ключ, чем чёрный объём.
    lights: (packed.l || []).length
      ? packed.l.map((l) => ({
          id: newId('light'),
          kind: l[0] as LightKind,
          label: l[1],
          x: l[2],
          z: l[3],
          y: l[4],
          angle: l[5],
        }))
      : base.lights,
  };
}

// base64url: обычный base64 таскает «+/=», которые в адресе приходится
// экранировать, и ссылка распухает вдвое на ровном месте.
function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeScene(scene: Scene): string {
  return toBase64Url(JSON.stringify(pack(scene)));
}

/** Возвращает null на любой негодный адрес: чужая ссылка не должна ронять
 *  страницу, она должна просто открыть пустую коробку. */
export function decodeScene(encoded: string): Scene | null {
  try {
    const parsed = JSON.parse(fromBase64Url(encoded)) as Packed;
    if (!parsed || parsed.v !== VERSION || !Array.isArray(parsed.r) || parsed.r.length !== 3) return null;
    return unpack(parsed);
  } catch {
    return null;
  }
}

export function sceneShareUrl(scene: Scene): string {
  return `${window.location.origin}/stage#s=${encodeScene(scene)}`;
}

export function sceneFromLocation(): Scene | null {
  const match = window.location.hash.match(/[#&]s=([^&]+)/);
  return match ? decodeScene(match[1]) : null;
}

export type { SceneObject };
