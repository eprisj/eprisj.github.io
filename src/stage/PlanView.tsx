import type { Scene, SceneObject } from './sceneModel';

const INK = '#1a0b10';
const PAPER = '#f5f0eb';

interface Props {
  scene: Scene;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onDrag: (id: string, x: number, z: number) => void;
}

// Метры → пиксели. Одна цена деления держит план и разрез в одном масштабе.
const PX_PER_M = 40;
const PAD = 32;

export function PlanView({ scene, selectedId, onSelect, onDrag }: Props) {
  const width = scene.room.w * PX_PER_M + PAD * 2;
  const height = scene.room.d * PX_PER_M + PAD * 2;

  const toPx = (m: number) => m * PX_PER_M;

  function startDrag(object: SceneObject, e: React.PointerEvent<SVGRectElement>) {
    e.stopPropagation();
    onSelect(object.id);
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    const startPointer = svg.createSVGPoint();
    const move = (ev: PointerEvent) => {
      startPointer.x = ev.clientX;
      startPointer.y = ev.clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const local = startPointer.matrixTransform(ctm.inverse());
      const x = (local.x - PAD) / PX_PER_M - object.w / 2;
      const z = (local.y - PAD) / PX_PER_M - object.d / 2;
      onDrag(object.id, x, z);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full max-w-full"
      onPointerDown={() => onSelect(null)}
    >
      <rect x={0} y={0} width={width} height={height} fill={INK} />
      {/* Коробка сцены */}
      <rect
        x={PAD}
        y={PAD}
        width={toPx(scene.room.w)}
        height={toPx(scene.room.d)}
        fill="none"
        stroke={`${PAPER}55`}
        strokeWidth={1}
      />
      {/* Сетка по метру */}
      {Array.from({ length: Math.floor(scene.room.w) + 1 }, (_, i) => (
        <line
          key={`gx-${i}`}
          x1={PAD + toPx(i)}
          y1={PAD}
          x2={PAD + toPx(i)}
          y2={PAD + toPx(scene.room.d)}
          stroke={`${PAPER}12`}
          strokeWidth={1}
        />
      ))}
      {Array.from({ length: Math.floor(scene.room.d) + 1 }, (_, i) => (
        <line
          key={`gy-${i}`}
          x1={PAD}
          y1={PAD + toPx(i)}
          x2={PAD + toPx(scene.room.w)}
          y2={PAD + toPx(i)}
          stroke={`${PAPER}12`}
          strokeWidth={1}
        />
      ))}

      {scene.objects.map((object) => {
        const isSelected = object.id === selectedId;
        return (
          <g key={object.id} transform={`rotate(${object.rotation} ${PAD + toPx(object.x + object.w / 2)} ${PAD + toPx(object.z + object.d / 2)})`}>
            <rect
              x={PAD + toPx(object.x)}
              y={PAD + toPx(object.z)}
              width={toPx(object.w)}
              height={toPx(object.d)}
              fill={isSelected ? `${PAPER}30` : `${PAPER}18`}
              stroke={isSelected ? PAPER : `${PAPER}70`}
              strokeWidth={isSelected ? 1.5 : 1}
              style={{ cursor: 'grab' }}
              onPointerDown={(e) => startDrag(object, e)}
            />
            <text
              x={PAD + toPx(object.x + object.w / 2)}
              y={PAD + toPx(object.z + object.d / 2)}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={9}
              fill={`${PAPER}90`}
              className="pointer-events-none select-none font-sans uppercase tracking-[0.1em]"
            >
              {object.label}
            </text>
          </g>
        );
      })}

      {/* Зритель — точка глаза, не абстрактная камера */}
      <circle cx={PAD + toPx(scene.viewer.x)} cy={PAD + toPx(scene.viewer.z)} r={4} fill="#b8956e" />
      <text
        x={PAD + toPx(scene.viewer.x) + 8}
        y={PAD + toPx(scene.viewer.z) + 3}
        fontSize={8}
        fill="#b8956e"
        className="select-none font-sans uppercase tracking-[0.1em]"
      >
        Viewer
      </text>
    </svg>
  );
}
