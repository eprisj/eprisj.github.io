import { useMemo } from 'react';
import { BackSide, DoubleSide } from 'three';
import type { HallId } from './halls';

/* ИНТЕРЬЕР ЗАЛА.
 *
 * Клик по объёму раньше открывал текст о зале, и это был честный вопрос:
 * «нажимаю — а где комната?». Комната должна быть комнатой: пол под ногами,
 * стены вокруг, свет оттуда, откуда он в этом объёме и приходит, и подиумы,
 * которые ждут первые объекты.
 *
 * Каждый зал отличается тем же, чем отличается снаружи:
 *   collection — длинная галерея, свет полосами между рёбрами фасада;
 *   practice   — верхний зал, свет сверху через пилы фонарей;
 *   archive    — глухая комната, одна щель и стеллажи вместо подиумов;
 *   study      — узкая шахта с фонарём на макушке, один стол;
 *   court      — не комната: двор с водой, небо вместо потолка.
 *
 * Всё той же параметрикой: ни моделей, ни текстур.
 */

const WALL = '#c3beb5';
const FLOOR = '#a9a49b';
const PLINTH = '#d3cec5';
const DARK = '#57534c';
const LIGHT = '#fff6e8';

type Room = {
  w: number;
  h: number;
  d: number;
  /* откуда свет: полосами сбоку, сверху через фонари, щелью или небом */
  light: 'side' | 'top' | 'slit' | 'sky';
  furniture: 'plinths' | 'shelves' | 'desk' | 'benches';
};

const ROOMS: Record<HallId, Room> = {
  collection: { w: 14.5, h: 5.6, d: 10.4, light: 'side', furniture: 'plinths' },
  practice:   { w: 10.4, h: 5.2, d: 22.0, light: 'top', furniture: 'plinths' },
  archive:    { w: 10.4, h: 5.6, d: 10.4, light: 'slit', furniture: 'shelves' },
  study:      { w: 5.2, h: 9.0, d: 5.2, light: 'top', furniture: 'desk' },
  court:      { w: 26, h: 0, d: 12, light: 'sky', furniture: 'benches' },
};

export function interiorEye(hall: HallId): [number, number, number] {
  const room = ROOMS[hall];
  /* Глаз стоит внутри у дальней стены и смотрит вдоль зала: длинную галерею
     нужно видеть в длину, а не упираться в стену. */
  if (hall === 'court') return [0, 2.2, room.d * 0.62];
  /* В архиве стеллажи стоят посреди комнаты: глаз ставим в проход у стены,
     иначе первый кадр — торец полки в тридцати сантиметрах от лица. */
  if (hall === 'archive') return [room.w * 0.40, 1.65, room.d * 0.40];
  return [room.w * 0.24, 1.65, room.d * 0.42];
}

function Plinths({ room }: { room: Room }) {
  const items = useMemo(() => {
    const out: [number, number, number][] = [];
    const along = Math.max(2, Math.floor(room.d / 4.4));
    for (let i = 0; i < along; i += 1) {
      const z = (i - (along - 1) / 2) * (room.d / (along + 0.4));
      out.push([-room.w * 0.18, 0.45, z]);
      out.push([room.w * 0.2, 0.32, z + 1.4]);
    }
    return out;
  }, [room]);

  return (
    <group>
      {items.map(([x, h, z], index) => (
        <mesh key={index} position={[x, h / 2, z]} castShadow receiveShadow>
          <boxGeometry args={[index % 2 ? 0.9 : 1.4, h, index % 2 ? 0.9 : 1.4]} />
          <meshStandardMaterial color={PLINTH} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Shelves({ room }: { room: Room }) {
  const racks = useMemo(() => {
    const out: number[] = [];
    const count = 4;
    for (let i = 0; i < count; i += 1) out.push((i - (count - 1) / 2) * (room.d / (count + 0.6)));
    return out;
  }, [room]);

  return (
    <group>
      {racks.map((z) => (
        <group key={z} position={[0, 0, z]}>
          {[0, 1, 2, 3].map((level) => (
            <mesh key={level} position={[0, 0.6 + level * 0.78, 0]} castShadow receiveShadow>
              <boxGeometry args={[room.w * 0.62, 0.08, 0.8]} />
              <meshStandardMaterial color={DARK} roughness={0.85} metalness={0.2} />
            </mesh>
          ))}
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * room.w * 0.3, 1.7, 0]} castShadow>
              <boxGeometry args={[0.1, 3.4, 0.8]} />
              <meshStandardMaterial color={DARK} roughness={0.8} metalness={0.25} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Desk() {
  return (
    <group position={[0, 0, -0.6]}>
      <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 0.08, 1.1]} />
        <meshStandardMaterial color={PLINTH} roughness={0.75} />
      </mesh>
      {[[-1, -0.45], [1, -0.45], [-1, 0.45], [1, 0.45]].map(([sx, sz], index) => (
        <mesh key={index} position={[sx * 1.0, 0.37, sz]} castShadow>
          <boxGeometry args={[0.08, 0.74, 0.08]} />
          <meshStandardMaterial color={DARK} roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 0.42, 0.85]} castShadow>
        <boxGeometry args={[0.5, 0.84, 0.5]} />
        <meshStandardMaterial color={DARK} roughness={0.9} />
      </mesh>
    </group>
  );
}

function Benches({ room }: { room: Room }) {
  const seats = useMemo(() => [-room.w * 0.22, 0, room.w * 0.22], [room]);
  return (
    <group>
      {seats.map((x) => (
        <mesh key={x} position={[x, 0.22, -room.d * 0.3]} castShadow receiveShadow>
          <boxGeometry args={[3.4, 0.44, 0.7]} />
          <meshStandardMaterial color={PLINTH} roughness={0.92} />
        </mesh>
      ))}
      {/* вода: во дворе она и есть пол */}
      <mesh position={[0, 0.01, room.d * 0.16]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[room.w * 0.8, room.d * 0.5]} />
        <meshStandardMaterial color="#8e9aa0" roughness={0.35} metalness={0.35} />
      </mesh>
    </group>
  );
}

export function Interior({ hall }: { hall: HallId }) {
  const room = ROOMS[hall];

  /* Свет входит там же, где в наружном объёме есть проём: иначе интерьер
     перестаёт быть интерьером этого здания и становится просто коробкой. */
  const openings = useMemo(() => {
    if (room.light === 'side') {
      const count = Math.max(3, Math.floor(room.d / 1.8));
      return Array.from({ length: count }, (_, i) => (i - (count - 1) / 2) * (room.d / count));
    }
    if (room.light === 'top') {
      const count = hall === 'study' ? 1 : 5;
      return Array.from({ length: count }, (_, i) => (i - (count - 1) / 2) * (room.d / (count + 0.8)));
    }
    return [0];
  }, [room, hall]);

  return (
    <group>
      {/* Пол общий для всех залов, включая двор */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[room.w, room.d]} />
        <meshStandardMaterial color={FLOOR} roughness={0.95} />
      </mesh>

      {room.h > 0 && (
        <>
          {/* Оболочка комнаты: одна коробка, вывернутая внутрь. Отдельные стены
              дают щели по углам ровно там, куда смотрит глаз. */}
          <mesh position={[0, room.h / 2, 0]} receiveShadow>
            <boxGeometry args={[room.w, room.h, room.d]} />
            <meshStandardMaterial color={WALL} roughness={0.94} side={BackSide} />
          </mesh>

          {room.light === 'side' && openings.map((z) => (
            <mesh key={z} position={[-room.w / 2 + 0.06, room.h * 0.55, z]} rotation={[0, Math.PI / 2, 0]}>
              <planeGeometry args={[0.62, room.h * 0.62]} />
              <meshBasicMaterial color={LIGHT} side={DoubleSide} />
            </mesh>
          ))}

          {room.light === 'top' && openings.map((z) => (
            <mesh key={z} position={[0, room.h - 0.06, z]} rotation={[Math.PI / 2, 0, 0]}>
              <planeGeometry args={[room.w * 0.62, 0.8]} />
              <meshBasicMaterial color={LIGHT} side={DoubleSide} />
            </mesh>
          ))}

          {room.light === 'slit' && (
            <mesh position={[0, room.h * 0.5, room.d / 2 - 0.06]}>
              <planeGeometry args={[0.5, room.h * 0.55]} />
              <meshBasicMaterial color={LIGHT} side={DoubleSide} />
            </mesh>
          )}
        </>
      )}

      {/* Свет от проёмов, а не от абстрактной лампы над сценой */}
      {room.light === 'top' && openings.map((z) => (
        <pointLight key={`l-${z}`} position={[0, room.h - 0.6, z]} intensity={16} distance={room.h * 2.6} decay={2} color={LIGHT} />
      ))}
      {/* Свет идёт от каждого проёма, а не от одной лампы у стены: иначе
          дальний конец галереи тонет, хотя в фасаде там такие же щели. */}
      {room.light === 'side' && openings.map((z) => (
        <pointLight key={`s-${z}`} position={[-room.w / 2 + 1.4, room.h * 0.58, z]} intensity={9} distance={room.w * 2.2} decay={2} color={LIGHT} />
      ))}
      {room.light === 'slit' && (
        <pointLight position={[0, room.h * 0.5, room.d / 2 - 1]} intensity={30} distance={room.d * 2.2} decay={2} color={LIGHT} />
      )}
      {/* В архиве света и должно быть мало, но не настолько, чтобы не видеть,
          где стоишь. */}
      <hemisphereLight args={['#f6f2ec', '#6f6a62', room.light === 'sky' ? 1.15 : room.light === 'slit' ? 0.5 : 0.66]} />

      {room.furniture === 'plinths' && <Plinths room={room} />}
      {room.furniture === 'shelves' && <Shelves room={room} />}
      {room.furniture === 'desk' && <Desk />}
      {room.furniture === 'benches' && <Benches room={room} />}
    </group>
  );
}

export default Interior;
