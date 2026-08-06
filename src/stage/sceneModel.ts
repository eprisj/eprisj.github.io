// Одна модель сцены на все проекции. План, разрез и (позже) объём читают
// одни и те же метры — расходиться им негде, потому что расходиться нечему.

export type ObjectKind = 'block' | 'wall' | 'platform' | 'practical' | 'seating';
export type LightKind = 'key' | 'fill' | 'practical';

export interface SceneObject {
  id: string;
  kind: ObjectKind;
  label: string;
  x: number; // метры от левого края коробки
  z: number; // метры от переднего края (глубина)
  y: number; // высота нижней грани над полом
  w: number;
  d: number;
  h: number;
  rotation: number; // градусы вокруг вертикали
}

export interface SceneLight {
  id: string;
  kind: LightKind;
  label: string;
  x: number;
  z: number;
  y: number;
  angle: number; // направление луча в плане, градусы
}

export interface Room {
  w: number;
  d: number;
  h: number;
}

export interface Viewer {
  x: number;
  z: number;
  eyeHeight: number;
}

export interface Scene {
  room: Room;
  viewer: Viewer;
  objects: SceneObject[];
  lights: SceneLight[];
}

let counter = 0;
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export function emptyScene(): Scene {
  return {
    room: { w: 12, d: 9, h: 6 },
    viewer: { x: 6, z: 8, eyeHeight: 1.6 },
    objects: [],
    lights: [
      { id: newId('light'), kind: 'key', label: 'Key', x: 3, z: 2, y: 4.5, angle: 200 },
    ],
  };
}

export function addObject(scene: Scene, kind: ObjectKind): Scene {
  const defaults: Record<ObjectKind, Pick<SceneObject, 'w' | 'd' | 'h' | 'label'>> = {
    block: { w: 1.5, d: 1.5, h: 1.5, label: 'Object' },
    wall: { w: 3, d: 0.2, h: 3, label: 'Wall' },
    platform: { w: 2.5, d: 2.5, h: 0.4, label: 'Platform' },
    practical: { w: 0.4, d: 0.4, h: 1.8, label: 'Practical' },
    seating: { w: 0.6, d: 0.6, h: 0.45, label: 'Seat' },
  };
  const base = defaults[kind];
  const object: SceneObject = {
    id: newId('obj'),
    kind,
    x: scene.room.w / 2 - base.w / 2,
    z: scene.room.d / 2 - base.d / 2,
    y: 0,
    rotation: 0,
    ...base,
  };
  return { ...scene, objects: [...scene.objects, object] };
}

export function updateObject(scene: Scene, id: string, patch: Partial<SceneObject>): Scene {
  return {
    ...scene,
    objects: scene.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)),
  };
}

export function removeObject(scene: Scene, id: string): Scene {
  return { ...scene, objects: scene.objects.filter((o) => o.id !== id) };
}

export function clampToRoom(scene: Scene, object: SceneObject): SceneObject {
  const x = Math.min(Math.max(object.x, 0), scene.room.w - object.w);
  const z = Math.min(Math.max(object.z, 0), scene.room.d - object.d);
  return { ...object, x, z };
}
