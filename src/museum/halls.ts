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
export type HallId = 'court' | 'collection' | 'practice' | 'archive' | 'study' | 'auditorium' | 'workshop' | 'terrace';

export type Hall = {
  id: HallId;
  focus: [number, number, number];
  access: 'open' | 'passport';
};

/* Порядок списка — это маршрут, а не алфавит: двор снаружи, потом нижний
   ярус, потом всё, что стоит на нём и вокруг него, и в конце то, что
   открывается по паспорту. */
export const HALLS: Hall[] = [
  { id: 'court',      focus: [0, 0.8, 18.0],      access: 'open' },
  { id: 'auditorium', focus: [-11.8, 6.0, 12.2],  access: 'open' },
  { id: 'collection', focus: [-8.6, 6.2, 6.0],    access: 'open' },
  { id: 'practice',   focus: [-6.0, 13.6, 2.0],   access: 'open' },
  { id: 'terrace',    focus: [9.4, 13.0, 0.5],    access: 'open' },
  { id: 'archive',    focus: [9.4, 6.2, 6.0],     access: 'passport' },
  { id: 'workshop',   focus: [18.6, 4.4, 2.6],    access: 'passport' },
  { id: 'study',      focus: [11.6, 15.4, -2.4],  access: 'passport' },
];

export function findHall(id: string | null | undefined): Hall | null {
  return HALLS.find((hall) => hall.id === id) || null;
}
