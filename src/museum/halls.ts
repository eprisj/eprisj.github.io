/* ЗАЛЫ МУЗЕЯ — ОДИН СПИСОК НА ВСЕХ.
 *
 * Лежит отдельно от модели намеренно: страница показывает список залов и
 * читает адрес зала сразу, а three и fiber грузятся лениво. Если бы список
 * жил внутри MuseumModel, ссылка на зал тянула бы за собой весь трёхмерный
 * чанк ещё до того, как зритель решит смотреть здание.
 *
 * `focus` — центр объёма в координатах модели: к нему подходит камера и над
 * ним висит подпись. `access` пока только объявляет створ: паспортов ещё нет,
 * но структура доступа должна существовать раньше замка, иначе замок потом
 * прикручивают поверх готовой верстки.
 */
export type HallId = 'court' | 'collection' | 'practice' | 'archive' | 'study';

export type Hall = {
  id: HallId;
  focus: [number, number, number];
  access: 'open' | 'passport';
};

export const HALLS: Hall[] = [
  { id: 'court',      focus: [0, -0.6, 13.4],     access: 'open' },
  { id: 'collection', focus: [0, 4.0, 0],         access: 'open' },
  { id: 'practice',   focus: [0, 9.4, 0],         access: 'open' },
  { id: 'archive',    focus: [0, 15.0, 0],        access: 'passport' },
  { id: 'study',      focus: [-12.6, 11.0, -4.6], access: 'passport' },
];

export function findHall(id: string | null | undefined): Hall | null {
  return HALLS.find((hall) => hall.id === id) || null;
}
