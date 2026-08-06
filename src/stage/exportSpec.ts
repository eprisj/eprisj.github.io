// Спека рисуется ВЕКТОРОМ прямо из модели, а не снимком экрана.
//
// Это не оптимизация, а обход целого класса поломок: html2canvas и подобные
// падают на любом современном цвете (`color-mix`, `oklab`) в снимаемом дереве и
// роняют весь экспорт разом. Геометрия у нас и так в метрах, поэтому рисовать с
// нуля и проще, и точнее — линия остаётся линией, а не пикселями, и на листе
// можно честно проставить масштаб.
//
// Лист печатный: тёмная краска по белому, а не тёмная тема интерфейса.
import { isCut } from './drafting';
import type { Reading } from './moves';
import type { Scene } from './sceneModel';

const MARGIN = 15;
const PAGE_W = 297;
const PAGE_H = 210;

type Doc = import('jspdf').jsPDF;
type Point = [number, number];

const INK: [number, number, number] = [26, 11, 16];
const HAIR: [number, number, number] = [170, 160, 165];
const FILL: [number, number, number] = [232, 228, 226];

/* Дата МЕСТНАЯ, а не UTC: `toISOString()` за Киев (+3) ночью отдаёт вчерашнее
   число, и лист выходит датированным задним числом. Локаль sv-SE выбрана
   потому, что она и есть ISO-вид «ГГГГ-ММ-ДД». */
function today(): string {
  return new Date().toLocaleDateString('sv-SE');
}

function polygon(doc: Doc, points: Point[], style: 'S' | 'FD') {
  const [first, ...rest] = points;
  const deltas: Point[] = [];
  let prev = first;
  for (const point of rest) {
    deltas.push([point[0] - prev[0], point[1] - prev[1]]);
    prev = point;
  }
  doc.lines(deltas, first[0], first[1], [1, 1], style, true);
}

/** Углы объекта в плане с учётом поворота вокруг собственного центра. */
function planCorners(o: Scene['objects'][number]): Point[] {
  const cx = o.x + o.w / 2;
  const cz = o.z + o.d / 2;
  const angle = (o.rotation * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return ([
    [-o.w / 2, -o.d / 2],
    [o.w / 2, -o.d / 2],
    [o.w / 2, o.d / 2],
    [-o.w / 2, o.d / 2],
  ] as Point[]).map(([dx, dz]) => [cx + dx * cos - dz * sin, cz + dx * sin + dz * cos]);
}

interface SpecInput {
  scene: Scene;
  moveTitle?: string | null;
  readings?: Reading[];
}

export async function exportSpec({ scene, moveTitle, readings = [] }: SpecInput): Promise<void> {
  // jsPDF подтягивается по требованию: лист печатают редко, а весит она заметно.
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const { room } = scene;
  const planBox = { x: MARGIN, y: 46, w: 152, h: 140 };
  const sectBox = { x: MARGIN + 162, y: 46, w: PAGE_W - MARGIN * 2 - 162, h: 140 };

  /* План и разрез идут В ОДНОМ масштабе — иначе это два рисунка, а не комплект,
     и сравнивать высоту с глубиной по листу становится нельзя. */
  const scale = Math.min(
    planBox.w / room.w,
    planBox.h / room.d,
    sectBox.w / room.d,
    sectBox.h / room.h,
  );
  const ratio = Math.round(1000 / scale);

  doc.setTextColor(...INK);
  doc.setFontSize(16);
  doc.text('EPRIS STAGE', MARGIN, 20);
  doc.setFontSize(8);
  doc.text('SCENE SPECIFICATION', MARGIN, 26);
  doc.text(
    `${room.w} × ${room.d} × ${room.h} m    ·    SCALE 1:${ratio}    ·    ${today()}`,
    MARGIN,
    31,
  );
  if (moveTitle) doc.text(`MOVE APPLIED: ${moveTitle.toUpperCase()}`, MARGIN, 36);

  doc.setDrawColor(...INK);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, 39, PAGE_W - MARGIN, 39);

  // ── План ───────────────────────────────────────────────────────────────────
  const planX = (m: number) => planBox.x + m * scale;
  const planY = (m: number) => planBox.y + m * scale;

  doc.setFontSize(7);
  doc.text('PLAN', planBox.x, planBox.y - 3);

  doc.setDrawColor(...HAIR);
  doc.setLineWidth(0.1);
  for (let i = 1; i < room.w; i += 1) doc.line(planX(i), planY(0), planX(i), planY(room.d));
  for (let i = 1; i < room.d; i += 1) doc.line(planX(0), planY(i), planX(room.w), planY(i));

  doc.setDrawColor(...INK);
  doc.setLineWidth(0.4);
  doc.rect(planX(0), planY(0), room.w * scale, room.d * scale, 'S');

  /* Поше и веса — те же, что на экране: рассечённое заливается и обводится
     жирным, стоящее в поле зрения остаётся тонким контуром. */
  scene.objects.forEach((object) => {
    const cut = isCut(object.kind);
    doc.setLineWidth(cut ? 0.5 : 0.25);
    if (cut) doc.setFillColor(...INK);
    else doc.setFillColor(...FILL);
    polygon(doc, planCorners(object).map(([x, z]) => [planX(x), planY(z)] as Point), 'FD');
  });
  // Номер, а не название: подписи наезжали друг на друга, а номер отсылает
  // к строке ведомости, где стоят все размеры.
  doc.setFontSize(5);
  scene.objects.forEach((object, index) => {
    doc.text(String(index + 1).padStart(2, '0'), planX(object.x) - 1, planY(object.z) - 1, { align: 'right' });
  });

  // Глаз зрителя — на плане это точка, ради которой сцена и строится.
  doc.setFillColor(...INK);
  doc.circle(planX(scene.viewer.x), planY(scene.viewer.z), 1, 'F');
  doc.setFontSize(5);
  doc.text('VIEWER', planX(scene.viewer.x) + 2, planY(scene.viewer.z) + 1);

  doc.setFontSize(6);
  doc.text(`${room.w} m`, planX(room.w / 2), planY(room.d) + 5, { align: 'center' });
  doc.text(`${room.d} m`, planX(0) - 3, planY(room.d / 2), { align: 'center', angle: 90 });

  // ── Разрез ─────────────────────────────────────────────────────────────────
  const sectX = (m: number) => sectBox.x + m * scale;
  const floorY = sectBox.y + room.h * scale;
  const sectY = (m: number) => floorY - m * scale;

  doc.setFontSize(7);
  doc.text('SECTION', sectBox.x, sectBox.y - 3);

  doc.setDrawColor(...INK);
  doc.setLineWidth(0.4);
  doc.rect(sectX(0), sectBox.y, room.d * scale, room.h * scale, 'S');
  doc.setLineWidth(0.6);
  doc.line(sectX(0), floorY, sectX(room.d), floorY);

  scene.objects.forEach((object, index) => {
    const cut = isCut(object.kind);
    doc.setLineWidth(cut ? 0.5 : 0.25);
    doc.setFillColor(...(cut ? INK : FILL));
    doc.rect(sectX(object.z), sectY(object.y + object.h), object.d * scale, object.h * scale, 'FD');
    doc.setFontSize(5);
    doc.text(String(index + 1).padStart(2, '0'), sectX(object.z) - 1, sectY(object.y + object.h) - 1, { align: 'right' });
  });

  doc.setFillColor(...INK);
  doc.circle(sectX(scene.viewer.z), sectY(scene.viewer.eyeHeight), 1, 'F');
  doc.setLineWidth(0.1);
  doc.setDrawColor(...HAIR);
  doc.line(sectX(0), sectY(scene.viewer.eyeHeight), sectX(room.d), sectY(scene.viewer.eyeHeight));
  doc.setFontSize(5);
  doc.setTextColor(...INK);
  doc.text(`EYE ${scene.viewer.eyeHeight} m`, sectX(0) + 1, sectY(scene.viewer.eyeHeight) - 1.5);

  doc.setFontSize(6);
  doc.text(`${room.h} m`, sectX(0) - 3, sectY(room.h / 2), { align: 'center', angle: 90 });

  // ── Ведомость ──────────────────────────────────────────────────────────────
  doc.addPage();
  doc.setTextColor(...INK);
  doc.setFontSize(10);
  doc.text('SCHEDULE', MARGIN, 20);
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, 23, PAGE_W - MARGIN, 23);

  const columns: { label: string; x: number; align?: 'right' }[] = [
    { label: '#', x: MARGIN },
    { label: 'ELEMENT', x: MARGIN + 10 },
    { label: 'TYPE', x: MARGIN + 55 },
    { label: 'X', x: MARGIN + 95, align: 'right' },
    { label: 'Z', x: MARGIN + 115, align: 'right' },
    { label: 'LIFT', x: MARGIN + 135, align: 'right' },
    { label: 'W', x: MARGIN + 158, align: 'right' },
    { label: 'D', x: MARGIN + 178, align: 'right' },
    { label: 'H', x: MARGIN + 198, align: 'right' },
    { label: 'ROT', x: MARGIN + 220, align: 'right' },
    { label: 'VOLUME', x: MARGIN + 250, align: 'right' },
  ];

  doc.setFontSize(6);
  for (const column of columns) {
    doc.text(column.label, column.x, 29, column.align ? { align: column.align } : undefined);
  }

  let y = 34;
  doc.setFontSize(7);
  let totalVolume = 0;
  scene.objects.forEach((object, index) => {
    if (y > PAGE_H - MARGIN - 30) {
      doc.addPage();
      y = 20;
    }
    const volume = object.w * object.d * object.h;
    totalVolume += volume;
    const cells = [
      String(index + 1).padStart(2, '0'),
      object.label,
      object.kind,
      object.x.toFixed(2),
      object.z.toFixed(2),
      object.y.toFixed(2),
      object.w.toFixed(2),
      object.d.toFixed(2),
      object.h.toFixed(2),
      `${object.rotation}°`,
      `${volume.toFixed(2)} m³`,
    ];
    cells.forEach((cell, column) => {
      const spec = columns[column];
      doc.text(cell, spec.x, y, spec.align ? { align: spec.align } : undefined);
    });
    y += 5;
  });

  if (!scene.objects.length) {
    doc.setFontSize(7);
    doc.text('The box is empty.', MARGIN, y);
    y += 5;
  }

  doc.setDrawColor(...HAIR);
  doc.setLineWidth(0.1);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 5;
  doc.setFontSize(7);
  doc.text(
    `${scene.objects.length} element${scene.objects.length === 1 ? '' : 's'}   ·   ${totalVolume.toFixed(2)} m³ total   ·   floor ${(room.w * room.d).toFixed(1)} m²`,
    MARGIN,
    y,
  );

  /* Наблюдения приёма попадают в спеку дословно — в том числе те, что говорят,
     где приём ломается. Лист, умалчивающий о поломке, был бы рекламой. */
  if (readings.length) {
    y += 10;
    doc.setFontSize(8);
    doc.text(moveTitle ? `NOTES ON “${moveTitle.toUpperCase()}”` : 'NOTES', MARGIN, y);
    y += 5;
    doc.setFontSize(7);
    for (const reading of readings) {
      const prefix = reading.tone === 'breaks' ? 'BREAKS — ' : '';
      const lines = doc.splitTextToSize(prefix + reading.text, PAGE_W - MARGIN * 2) as string[];
      for (const line of lines) {
        if (y > PAGE_H - MARGIN) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, MARGIN, y);
        y += 4;
      }
      y += 1;
    }
  }

  doc.setFontSize(6);
  doc.text('Drawn from the model, not traced from a screen — eprisjournal.com/stage', MARGIN, PAGE_H - 8);

  doc.save(`epris-stage-${today()}.pdf`);
}
