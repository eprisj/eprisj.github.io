import type { Scene } from './sceneModel';
import { GOLD, PAD_B, PAD_L, PAD_R, PAD_T, PAPER, PX_PER_M, WEIGHT, styleFor, tagOf } from './drafting';

interface Props {
  scene: Scene;
  selectedId: string | null;
}

/* Разрез вдоль оси зритель→сцена: по горизонтали глубина, по вертикали высота.
   Читает ту же модель, что план, поэтому разойтись им негде. Веса линий те же:
   пол и оболочка — разрез, стоящее в поле зрения — контур. */
export function SectionView({ scene, selectedId }: Props) {
  const width = scene.room.d * PX_PER_M + PAD_L + PAD_R;
  const height = scene.room.h * PX_PER_M + PAD_T + PAD_B;
  const px = (m: number) => PAD_L + m * PX_PER_M;
  const floorY = PAD_T + scene.room.h * PX_PER_M;
  const py = (m: number) => floorY - m * PX_PER_M;

  const levels = Array.from({ length: Math.floor(scene.room.h) + 1 }, (_, i) => i);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full max-w-full">
      <rect x={0} y={0} width={width} height={height} fill="#1a0b10" />

      {levels.map((i) => (
        <line
          key={`l${i}`}
          x1={px(0)}
          y1={py(i)}
          x2={px(scene.room.d)}
          y2={py(i)}
          stroke={PAPER}
          strokeOpacity={i % 5 === 0 ? 0.18 : 0.07}
          strokeWidth={i % 5 === 0 ? WEIGHT.gridMajor : WEIGHT.grid}
        />
      ))}

      <rect
        x={px(0)}
        y={PAD_T}
        width={scene.room.d * PX_PER_M}
        height={scene.room.h * PX_PER_M}
        fill="none"
        stroke={PAPER}
        strokeOpacity={0.9}
        strokeWidth={WEIGHT.cut}
      />

      {/* Земля под полом залита: на разрезе она рассечена, и именно эта масса
          говорит, где низ, без единой подписи. */}
      <rect x={px(0)} y={floorY} width={scene.room.d * PX_PER_M} height={10} fill={PAPER} fillOpacity={0.8} />

      {scene.objects.map((object, index) => {
        const isSelected = object.id === selectedId;
        const style = styleFor(object, isSelected);
        const top = py(object.y + object.h);
        return (
          <g key={object.id}>
            <rect
              x={px(object.z)}
              y={top}
              width={object.d * PX_PER_M}
              height={object.h * PX_PER_M}
              fill={style.fill}
              fillOpacity={style.fillOpacity}
              stroke={style.stroke}
              strokeWidth={style.strokeWidth}
              strokeDasharray={object.generatedBy ? '5 3' : undefined}
            />
            <text
              x={px(object.z) - 4}
              y={top - 4}
              fill={isSelected ? GOLD : PAPER}
              fillOpacity={isSelected ? 1 : 0.55}
              fontSize={8}
              textAnchor="end"
              className="select-none font-sans tabular-nums"
            >
              {tagOf(index)}
            </text>
          </g>
        );
      })}

      {/* Линия глаза — отметка уровня, как на разрезе здания. */}
      <g>
        <line
          x1={px(0) - 14}
          y1={py(scene.viewer.eyeHeight)}
          x2={px(scene.room.d)}
          y2={py(scene.viewer.eyeHeight)}
          stroke={GOLD}
          strokeOpacity={0.5}
          strokeWidth={WEIGHT.hairline}
          strokeDasharray="6 4"
        />
        <circle cx={px(scene.viewer.z)} cy={py(scene.viewer.eyeHeight)} r={3.5} fill={GOLD} />
        <text
          x={px(0) - 16}
          y={py(scene.viewer.eyeHeight) - 3}
          fill={GOLD}
          fillOpacity={0.8}
          fontSize={7}
          textAnchor="end"
          className="select-none font-sans tabular-nums"
        >
          +{scene.viewer.eyeHeight.toFixed(2)}
        </text>
      </g>

      {/* Отметки уровней по левому краю — ими на разрезе меряют высоту. */}
      {levels
        .filter((i) => i % 2 === 0)
        .map((i) => (
          <text
            key={`lv${i}`}
            x={px(0) - 8}
            y={py(i) + 2.5}
            fill={PAPER}
            fillOpacity={0.4}
            fontSize={7}
            textAnchor="end"
            className="select-none font-sans tabular-nums"
          >
            {i.toFixed(2)}
          </text>
        ))}
    </svg>
  );
}
