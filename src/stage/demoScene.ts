// Сцена для заглавной. Не украшение: это рабочая модель, которую кнопка на
// первом экране кладёт прямо в редактор — человек попадает не в пустую
// коробку, а внутрь уже начатой мысли и правит её.
//
// Построена как «комната внутри комнаты»: шов между внешним залом и внутренним
// объёмом даёт плану фигуру и фон, поэтому чертёж читается издалека, с крупной
// подписи, а не только вблизи.
import { newId, type Scene } from './sceneModel';

export function demoScene(): Scene {
  const wall = (label: string, x: number, z: number, w: number, d: number) => ({
    id: newId('obj'),
    kind: 'wall' as const,
    label,
    x,
    z,
    y: 0,
    w,
    d,
    h: 3,
    rotation: 0,
  });

  return {
    room: { w: 14, d: 10, h: 6 },
    viewer: { x: 7, z: 9, eyeHeight: 1.6 },
    objects: [
      wall('Back', 3, 3, 8, 0.15),
      wall('Front', 3, 6.85, 8, 0.15),
      wall('Left', 3, 3, 0.15, 4),
      wall('Right', 10.85, 3, 0.15, 4),
      {
        id: newId('obj'),
        kind: 'platform',
        label: 'Platform',
        x: 5.5,
        z: 4.2,
        y: 0,
        w: 3,
        d: 1.8,
        h: 0.35,
        rotation: 0,
      },
      {
        id: newId('obj'),
        kind: 'block',
        label: 'Subject',
        x: 6.6,
        z: 4.7,
        y: 0.35,
        w: 0.9,
        d: 0.9,
        h: 1.9,
        rotation: 0,
      },
    ],
    lights: [{ id: newId('light'), kind: 'key', label: 'Key', x: 7, z: 1.5, y: 5, angle: 200 }],
  };
}
