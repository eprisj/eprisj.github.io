import type { Scene } from './sceneModel';

const INK = '#1a0b10';
const PAPER = '#f5f0eb';
const PX_PER_M = 40;
const PAD = 32;

interface Props {
  scene: Scene;
  selectedId: string | null;
}

// Разрез вдоль оси зритель→сцена: X — глубина (z), Y — высота, всегда вниз к
// полу. Читает ту же модель, что план, поэтому расхождений не бывает.
export function SectionView({ scene, selectedId }: Props) {
  const width = scene.room.d * PX_PER_M + PAD * 2;
  const height = scene.room.h * PX_PER_M + PAD * 2;
  const toPx = (m: number) => m * PX_PER_M;
  const floorY = PAD + toPx(scene.room.h);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full max-w-full">
      <rect x={0} y={0} width={width} height={height} fill={INK} />
      <rect x={PAD} y={PAD} width={toPx(scene.room.d)} height={toPx(scene.room.h)} fill="none" stroke={`${PAPER}55`} strokeWidth={1} />
      {/* Линия пола жирнее прочих — единственная плоскость, на которой всё стоит */}
      <line x1={PAD} y1={floorY} x2={PAD + toPx(scene.room.d)} y2={floorY} stroke={PAPER} strokeWidth={1.5} />

      {scene.objects.map((object) => {
        const isSelected = object.id === selectedId;
        const x = PAD + toPx(object.z);
        const objH = toPx(object.h);
        const y = floorY - toPx(object.y) - objH;
        return (
          <rect
            key={object.id}
            x={x}
            y={y}
            width={toPx(object.d)}
            height={objH}
            fill={isSelected ? `${PAPER}30` : `${PAPER}18`}
            stroke={isSelected ? PAPER : `${PAPER}70`}
            strokeWidth={isSelected ? 1.5 : 1}
            strokeDasharray={object.generatedBy ? '4 3' : undefined}
          />
        );
      })}

      {/* Глаз зрителя на его реальной высоте — разрез это единственная проекция, где она видна */}
      <circle cx={PAD + toPx(scene.viewer.z)} cy={floorY - toPx(scene.viewer.eyeHeight)} r={4} fill="#b8956e" />
      <line
        x1={PAD + toPx(scene.viewer.z)}
        y1={floorY - toPx(scene.viewer.eyeHeight)}
        x2={PAD}
        y2={floorY - toPx(scene.viewer.eyeHeight)}
        stroke="#b8956e"
        strokeWidth={0.5}
        strokeDasharray="2 3"
      />
    </svg>
  );
}
