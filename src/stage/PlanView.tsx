import type { Scene, SceneObject } from './sceneModel';
import { seatsOf, type Sightlines } from './sightlines';
import {
  type ElementStyle,
  GOLD,
  PAD_B,
  PAD_L,
  PAD_R,
  PAD_T,
  PAPER,
  PX_PER_M,
  WEIGHT,
  dimStep,
  styleFor,
  tagOf,
} from './drafting';

interface Props {
  scene: Scene;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** `free` — зажат Alt: тянуть мимо привязок. */
  onDrag: (id: string, x: number, z: number, free: boolean) => void;
  /** Начало и конец жеста: по ним пишется одна запись в историю на всё
   *  перетаскивание, а не на каждый его кадр. */
  onDragStart: () => void;
  onDragEnd: () => void;
  guideX: number | null;
  guideZ: number | null;
  /** Расчёт видимости; null — анализ выключен. */
  sightlines: Sightlines | null;
}

/** Подпись пролёта: целые метры без хвоста, дробные — с одним знаком. */
function fmtSpan(metres: number): string {
  return Number.isInteger(metres) ? String(metres) : metres.toFixed(1);
}

/** Размерная цепочка с засечками под 45°, как на чертеже, а не стрелками. */
function DimensionChain({
  from,
  to,
  offset,
  total,
  vertical,
}: {
  from: number;
  to: number;
  offset: number;
  total: number;
  vertical: boolean;
}) {
  const step = dimStep(total);
  const marks: number[] = [];
  for (let m = 0; m <= total + 0.001; m += step) marks.push(Math.min(m, total));
  if (marks[marks.length - 1] < total) marks.push(total);

  const at = (m: number) => from + m * PX_PER_M;
  const tick = 3.5;

  return (
    <g stroke={PAPER} strokeOpacity={0.45} strokeWidth={WEIGHT.hairline} fill="none">
      {vertical ? (
        <line x1={offset} y1={from} x2={offset} y2={to} />
      ) : (
        <line x1={from} y1={offset} x2={to} y2={offset} />
      )}
      {marks.map((m, index) => {
        const p = at(m);
        return vertical ? (
          <g key={index}>
            <line x1={offset - tick} y1={p + tick} x2={offset + tick} y2={p - tick} />
            {index > 0 && (
              <text
                x={offset - 6}
                y={(at(marks[index - 1]) + p) / 2}
                fill={PAPER}
                fillOpacity={0.5}
                stroke="none"
                fontSize={7}
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(-90 ${offset - 6} ${(at(marks[index - 1]) + p) / 2})`}
                className="select-none font-sans"
              >
                {fmtSpan(m - marks[index - 1])}
              </text>
            )}
          </g>
        ) : (
          <g key={index}>
            <line x1={p - tick} y1={offset + tick} x2={p + tick} y2={offset - tick} />
            {index > 0 && (
              <text
                x={(at(marks[index - 1]) + p) / 2}
                y={offset + 10}
                fill={PAPER}
                fillOpacity={0.5}
                stroke="none"
                fontSize={7}
                textAnchor="middle"
                className="select-none font-sans"
              >
                {fmtSpan(m - marks[index - 1])}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

function ObjectFootprint({
  object,
  x,
  y,
  width,
  height,
  style,
  onPointerDown,
}: {
  object: SceneObject;
  x: number;
  y: number;
  width: number;
  height: number;
  style: ElementStyle;
  onPointerDown: (event: React.PointerEvent<SVGGElement>) => void;
}) {
  const common = {
    fill: style.fill,
    fillOpacity: style.fillOpacity,
    stroke: style.stroke,
    strokeWidth: style.strokeWidth,
    strokeDasharray: object.generatedBy ? '5 3' : undefined,
  };
  const cx = x + width / 2;
  const cy = y + height / 2;
  const inner = Math.max(2, Math.min(width, height) * 0.22);

  return (
    <g
      onPointerDown={onPointerDown}
      style={{ cursor: object.generatedBy ? 'default' : 'grab' }}
      className="touch-manipulation"
    >
      {object.kind === 'wall' && <rect x={x} y={y} width={width} height={height} {...common} />}
      {object.kind === 'platform' && (
        <>
          <rect x={x} y={y} width={width} height={height} {...common} />
          <rect x={x + inner} y={y + inner} width={Math.max(0, width - inner * 2)} height={Math.max(0, height - inner * 2)} fill="none" stroke={style.stroke} strokeOpacity={0.55} strokeWidth={WEIGHT.hairline} />
          <line x1={x + inner} y1={y + inner} x2={x + width - inner} y2={y + height - inner} stroke={style.stroke} strokeOpacity={0.3} strokeWidth={WEIGHT.hairline} />
          <line x1={x + width - inner} y1={y + inner} x2={x + inner} y2={y + height - inner} stroke={style.stroke} strokeOpacity={0.3} strokeWidth={WEIGHT.hairline} />
        </>
      )}
      {object.kind === 'block' && (
        <>
          <rect x={x} y={y} width={width} height={height} {...common} />
          <path d={`M ${x + inner} ${y + height - inner} L ${cx} ${y + inner} L ${x + width - inner} ${y + height - inner} Z`} fill="none" stroke={style.stroke} strokeOpacity={0.65} strokeWidth={WEIGHT.hairline} />
        </>
      )}
      {object.kind === 'practical' && (
        <>
          <circle cx={cx} cy={cy} r={Math.max(2.5, Math.min(width, height) * 0.44)} {...common} />
          <circle cx={cx} cy={cy} r={Math.max(1.5, Math.min(width, height) * 0.16)} fill={style.stroke} fillOpacity={0.78} stroke="none" />
          <line x1={cx - width * 0.28} y1={cy} x2={cx + width * 0.28} y2={cy} stroke={style.stroke} strokeOpacity={0.55} strokeWidth={WEIGHT.hairline} />
          <line x1={cx} y1={cy - height * 0.28} x2={cx} y2={cy + height * 0.28} stroke={style.stroke} strokeOpacity={0.55} strokeWidth={WEIGHT.hairline} />
        </>
      )}
      {object.kind === 'seating' && (
        <>
          <rect x={x} y={y} width={width} height={height} {...common} />
          <rect x={x + inner * 0.7} y={y + inner * 0.7} width={Math.max(0, width - inner * 1.4)} height={Math.max(0, height * 0.45)} fill="none" stroke={style.stroke} strokeOpacity={0.72} strokeWidth={WEIGHT.hairline} />
          <line x1={x + inner * 0.6} y1={y + height - inner * 0.65} x2={x + width - inner * 0.6} y2={y + height - inner * 0.65} stroke={style.stroke} strokeOpacity={0.72} strokeWidth={WEIGHT.hairline} />
        </>
      )}
    </g>
  );
}

export function PlanView({ scene, selectedId, onSelect, onDrag, onDragStart, onDragEnd, guideX, guideZ, sightlines }: Props) {
  const width = scene.room.w * PX_PER_M + PAD_L + PAD_R;
  const height = scene.room.d * PX_PER_M + PAD_T + PAD_B;
  const px = (m: number) => PAD_L + m * PX_PER_M;
  const py = (m: number) => PAD_T + m * PX_PER_M;

  function startDrag(object: SceneObject, e: React.PointerEvent<SVGRectElement>) {
    e.stopPropagation();
    onSelect(object.id);
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    onDragStart();
    const point = svg.createSVGPoint();
    const move = (ev: PointerEvent) => {
      point.x = ev.clientX;
      point.y = ev.clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const local = point.matrixTransform(ctm.inverse());
      onDrag(
        object.id,
        (local.x - PAD_L) / PX_PER_M - object.w / 2,
        (local.y - PAD_T) / PX_PER_M - object.d / 2,
        ev.altKey,
      );
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      onDragEnd();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  const gridX = Array.from({ length: Math.floor(scene.room.w) + 1 }, (_, i) => i);
  const gridZ = Array.from({ length: Math.floor(scene.room.d) + 1 }, (_, i) => i);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full max-w-full" onPointerDown={() => onSelect(null)}>
      <rect x={0} y={0} width={width} height={height} fill="#1a0b10" />

      {/* Сетка: каждый метр волоском, каждый пятый заметнее — по ней считывают
          расстояние, не прикладывая линейку. */}
      {gridX.map((i) => (
        <line
          key={`gx${i}`}
          x1={px(i)}
          y1={py(0)}
          x2={px(i)}
          y2={py(scene.room.d)}
          stroke={PAPER}
          strokeOpacity={i % 5 === 0 ? 0.18 : 0.07}
          strokeWidth={i % 5 === 0 ? WEIGHT.gridMajor : WEIGHT.grid}
        />
      ))}
      {gridZ.map((i) => (
        <line
          key={`gz${i}`}
          x1={px(0)}
          y1={py(i)}
          x2={px(scene.room.w)}
          y2={py(i)}
          stroke={PAPER}
          strokeOpacity={i % 5 === 0 ? 0.18 : 0.07}
          strokeWidth={i % 5 === 0 ? WEIGHT.gridMajor : WEIGHT.grid}
        />
      ))}

      {/* Мёртвая зона: чем от большего числа кресел точка закрыта, тем плотнее
          заливка. Лежит ПОД элементами — это подложка к чертежу, а не поверх. */}
      {sightlines && (
        <g>
          {sightlines.cells.map((cell, index) => (
            <rect
              key={index}
              x={px(cell.x - sightlines.step / 2)}
              y={py(cell.z - sightlines.step / 2)}
              width={sightlines.step * PX_PER_M + 0.5}
              height={sightlines.step * PX_PER_M + 0.5}
              fill="#8c2f24"
              fillOpacity={cell.blocked === sightlines.seats ? 0.5 : 0.16}
            />
          ))}
        </g>
      )}

      {/* Оболочка зала — тоже разрез, поэтому самый жирный контур на листе. */}
      <rect
        x={px(0)}
        y={py(0)}
        width={scene.room.w * PX_PER_M}
        height={scene.room.d * PX_PER_M}
        fill="none"
        stroke={PAPER}
        strokeOpacity={0.9}
        strokeWidth={WEIGHT.cut}
      />

      {scene.objects.map((object, index) => {
        const isSelected = object.id === selectedId;
        const style = styleFor(object, isSelected);
        const cx = px(object.x + object.w / 2);
        const cy = py(object.z + object.d / 2);
        return (
          <g key={object.id} transform={`rotate(${object.rotation} ${cx} ${cy})`}>
            <ObjectFootprint
              object={object}
              x={px(object.x)}
              y={py(object.z)}
              width={object.w * PX_PER_M}
              height={object.d * PX_PER_M}
              style={style}
              onPointerDown={(e) => { if (!object.generatedBy) startDrag(object, e); }}
            />
            {/* Номер вместо названия: метка не наезжает на соседнюю и отсылает
                к строке ведомости, где стоят все размеры. */}
            <text
              x={px(object.x) - 4}
              y={py(object.z) - 4}
              fill={isSelected ? GOLD : PAPER}
              fillOpacity={isSelected ? 1 : 0.55}
              fontSize={8}
              textAnchor="end"
              className="pointer-events-none select-none font-sans tabular-nums"
            >
              {tagOf(index)}
            </text>
          </g>
        );
      })}

      {/* Зритель и направление взгляда — ось, вокруг которой строится сцена. */}
      <g>
        <line
          x1={px(scene.viewer.x)}
          y1={py(scene.viewer.z)}
          x2={px(scene.viewer.x)}
          y2={py(0)}
          stroke={GOLD}
          strokeOpacity={0.35}
          strokeWidth={WEIGHT.hairline}
          strokeDasharray="6 4"
        />
        <circle cx={px(scene.viewer.x)} cy={py(scene.viewer.z)} r={3.5} fill={GOLD} />
        <text
          x={px(scene.viewer.x) + 7}
          y={py(scene.viewer.z) + 3}
          fill={GOLD}
          fontSize={7}
          className="select-none font-sans uppercase tracking-[0.14em]"
        >
          Viewer
        </text>
      </g>

      <DimensionChain from={px(0)} to={px(scene.room.w)} offset={py(scene.room.d) + 22} total={scene.room.w} vertical={false} />
      <DimensionChain from={py(0)} to={py(scene.room.d)} offset={px(0) - 22} total={scene.room.d} vertical />

      {/* Кресла, по которым считалась видимость: без них цифры мёртвой зоны
          повисают в воздухе — непонятно, откуда смотрели. */}
      {sightlines &&
        seatsOf(scene).map((seat) => (
          <g key={seat.label}>
            <line
              x1={px(seat.x)}
              y1={py(seat.z)}
              x2={px(seat.x)}
              y2={py(0)}
              stroke={GOLD}
              strokeOpacity={0.14}
              strokeWidth={WEIGHT.hairline}
            />
            <circle cx={px(seat.x)} cy={py(seat.z)} r={2.5} fill={GOLD} fillOpacity={0.9} />
          </g>
        ))}

      {/* Линии привязки: показывают, с чем именно совпала кромка. Живут только
          во время жеста. */}
      {guideX !== null && (
        <line x1={px(guideX)} y1={py(0)} x2={px(guideX)} y2={py(scene.room.d)} stroke={GOLD} strokeOpacity={0.85} strokeWidth={WEIGHT.hairline} />
      )}
      {guideZ !== null && (
        <line x1={px(0)} y1={py(guideZ)} x2={px(scene.room.w)} y2={py(guideZ)} stroke={GOLD} strokeOpacity={0.85} strokeWidth={WEIGHT.hairline} />
      )}

      {/* Масштабная линейка: без неё чертёж не читается вне экрана. */}
      <g>
        <rect x={PAD_L} y={height - 18} width={PX_PER_M} height={3} fill={PAPER} fillOpacity={0.75} />
        <rect x={PAD_L + PX_PER_M} y={height - 18} width={PX_PER_M} height={3} fill={PAPER} fillOpacity={0.25} />
        <rect x={PAD_L + PX_PER_M * 2} y={height - 18} width={PX_PER_M * 3} height={3} fill={PAPER} fillOpacity={0.75} />
        <text x={PAD_L} y={height - 6} fill={PAPER} fillOpacity={0.5} fontSize={7} className="select-none font-sans">
          0
        </text>
        <text x={PAD_L + PX_PER_M * 5} y={height - 6} fill={PAPER} fillOpacity={0.5} fontSize={7} textAnchor="end" className="select-none font-sans">
          5 m
        </text>
      </g>
    </svg>
  );
}
