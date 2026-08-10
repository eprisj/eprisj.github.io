import { Colors, DxfWriter, Units, point3d } from '@tarikjabiri/dxf';
import type { Scene, SceneObject } from './sceneModel';

function corners(object: SceneObject) {
  const cx = object.x + object.w / 2;
  const cz = object.z + object.d / 2;
  const angle = (object.rotation * Math.PI) / 180;
  const rotate = (x: number, z: number) => ({
    x: cx + x * Math.cos(angle) - z * Math.sin(angle),
    z: cz + x * Math.sin(angle) + z * Math.cos(angle),
  });
  return [
    rotate(-object.w / 2, -object.d / 2),
    rotate(object.w / 2, -object.d / 2),
    rotate(object.w / 2, object.d / 2),
    rotate(-object.w / 2, object.d / 2),
  ];
}

function download(text: string, filename: string) {
  const blob = new Blob([text], { type: 'application/dxf;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportDxf(scene: Scene) {
  const dxf = new DxfWriter();
  dxf.setUnits(Units.Meters);
  dxf.addLayer('ROOM', Colors.White, 'CONTINUOUS');
  dxf.addLayer('OBJECTS', Colors.Cyan, 'CONTINUOUS');
  dxf.addLayer('ANNOTATION', Colors.Yellow, 'CONTINUOUS');

  const room = [
    { x: 0, z: 0 },
    { x: scene.room.w, z: 0 },
    { x: scene.room.w, z: scene.room.d },
    { x: 0, z: scene.room.d },
  ];
  [...room, room[0]].reduce((previous, current) => {
    dxf.addLine(point3d(previous.x, previous.z), point3d(current.x, current.z), { layerName: 'ROOM' });
    return current;
  });

  scene.objects.forEach((object, index) => {
    const points = corners(object);
    [...points, points[0]].reduce((previous, current) => {
      dxf.addLine(point3d(previous.x, previous.z), point3d(current.x, current.z), { layerName: 'OBJECTS' });
      return current;
    });
    dxf.addText(point3d(object.x + object.w / 2, object.z + object.d / 2), 0.18, `${String(index + 1).padStart(2, '0')} ${object.label}`, { layerName: 'ANNOTATION' });
  });

  dxf.addText(point3d(0, scene.room.d + 0.5), 0.24, `EPRIS STAGE / ${scene.room.w.toFixed(2)} m x ${scene.room.d.toFixed(2)} m`, { layerName: 'ANNOTATION' });
  download(dxf.stringify(), 'epris-stage-plan.dxf');
}
