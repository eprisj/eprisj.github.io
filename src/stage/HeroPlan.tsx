import type { Scene } from './sceneModel';

// Отдельный рисовальщик, а не PlanView с флагом «тихо»: у плана в редакторе
// есть перетаскивание, выделение и подписи, и всё это на заглавной лишнее.
// Здесь нужен только чертёж во всю раму — тонкий, ровный, без интерактива.
const PAPER = '#f5f0eb';

export function HeroPlan({ scene }: { scene: Scene }) {
  const { room } = scene;
  const pad = 0.4;
  const width = room.w + pad * 2;
  const height = room.d + pad * 2;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      /* Кадр держится за НИЗ плана: широкая рама обрезает чертёж по высоте, и
         при обрезке по центру за край уходит зритель — точка, с которой сцена
         вообще читается. Пусть лучше срежется дальняя стена. */
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      {/* Толщины — в МЕТРАХ, вместе с остальной системой координат, и потому
          масштабируются с чертежом. non-scaling-stroke здесь был бы ловушкой:
          он считает толщину в пикселях устройства, где 0.04 — доля пикселя,
          браузер зажимает её к минимуму, и вся иерархия линий пропадает. */}
      <g stroke={PAPER} fill="none">
        {Array.from({ length: room.w - 1 }, (_, i) => (
          <line key={`x${i}`} x1={pad + i + 1} y1={pad} x2={pad + i + 1} y2={pad + room.d} strokeWidth={0.015} opacity={0.18} />
        ))}
        {Array.from({ length: room.d - 1 }, (_, i) => (
          <line key={`z${i}`} x1={pad} y1={pad + i + 1} x2={pad + room.w} y2={pad + i + 1} strokeWidth={0.015} opacity={0.18} />
        ))}

        <rect x={pad} y={pad} width={room.w} height={room.d} strokeWidth={0.055} opacity={0.8} />

        {scene.objects.map((object) => (
          <rect
            key={object.id}
            x={pad + object.x}
            y={pad + object.z}
            width={object.w}
            height={object.d}
            strokeWidth={0.035}
            opacity={0.9}
            fill={PAPER}
            fillOpacity={0.1}
          />
        ))}
      </g>

      {/* Зритель — единственная точка, а не линия: с неё сцена и читается. */}
      <circle cx={pad + scene.viewer.x} cy={pad + scene.viewer.z} r={0.12} fill="#b8956e" />
    </svg>
  );
}
