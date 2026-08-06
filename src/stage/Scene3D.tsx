import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { BoxGeometry } from 'three';
import type { Scene } from './sceneModel';

// Собственный чанк — three и fiber тяжелее ~150 КБ gzip, и на главную журнала
// это грузить нельзя. StagePage подключает этот файл через lazy().

const PAPER = 0xf5f0eb;
const INK = 0x1a0b10;
const ACCENT = 0xb8956e;

function Room({ scene }: { scene: Scene }) {
  const { w, d, h } = scene.room;
  return (
    <group>
      {/* Пол — единственная плоскость, на которой всё стоит */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[w / 2, 0, d / 2]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={INK} />
      </mesh>
      {/* Контур коробки, а не сплошные стены — им ничто не должно заслонять сцену */}
      <lineSegments position={[w / 2, h / 2, d / 2]}>
        <edgesGeometry args={[useMemo(() => new BoxGeometry(w, h, d), [w, h, d])]} />
        <lineBasicMaterial color={PAPER} transparent opacity={0.25} />
      </lineSegments>
    </group>
  );
}

function Objects({ scene }: { scene: Scene }) {
  return (
    <>
      {scene.objects.map((object) => (
        <mesh
          key={object.id}
          position={[object.x + object.w / 2, object.y + object.h / 2, object.z + object.d / 2]}
          rotation={[0, (-object.rotation * Math.PI) / 180, 0]}
        >
          <boxGeometry args={[object.w, object.h, object.d]} />
          <meshStandardMaterial color={PAPER} opacity={0.85} transparent />
        </mesh>
      ))}
    </>
  );
}

function Lights({ scene }: { scene: Scene }) {
  return (
    <>
      <ambientLight intensity={0.15} />
      {scene.lights.map((light) => (
        <pointLight
          key={light.id}
          position={[light.x, light.y, light.z]}
          intensity={light.kind === 'key' ? 40 : light.kind === 'fill' ? 18 : 8}
          color={light.kind === 'practical' ? ACCENT : PAPER}
          distance={20}
          decay={2}
        />
      ))}
    </>
  );
}

function ViewerMarker({ scene }: { scene: Scene }) {
  return (
    <mesh position={[scene.viewer.x, scene.viewer.eyeHeight, scene.viewer.z]}>
      <sphereGeometry args={[0.12, 12, 12]} />
      <meshBasicMaterial color={ACCENT} />
    </mesh>
  );
}

interface Props {
  scene: Scene;
  fromViewerEye?: boolean;
}

// Камера либо на воображаемом орбитальном посте над сценой, либо ровно в
// глазах зрителя — второй режим показывает то самое, ради чего в модели
// вообще есть eyeHeight.
export function Scene3D({ scene, fromViewerEye = false }: Props) {
  const cameraPosition = useMemo<[number, number, number]>(() => {
    if (fromViewerEye) return [scene.viewer.x, scene.viewer.eyeHeight, scene.viewer.z];
    const { w, d, h } = scene.room;
    return [w * 1.3, h * 1.4, d * 1.6];
  }, [scene.room, scene.viewer, fromViewerEye]);

  const lookAt = useMemo<[number, number, number]>(() => {
    if (fromViewerEye) return [scene.room.w / 2, 1.2, scene.room.d / 2 - scene.viewer.z > 0 ? 0 : scene.room.d / 2];
    return [scene.room.w / 2, scene.room.h / 4, scene.room.d / 2];
  }, [scene.room, scene.viewer, fromViewerEye]);

  return (
    <div className="h-full w-full">
      <Suspense fallback={null}>
        <Canvas
          camera={{ position: cameraPosition, fov: fromViewerEye ? 70 : 45 }}
          onCreated={({ camera }) => camera.lookAt(...lookAt)}
        >
          <color attach="background" args={[INK]} />
          <Room scene={scene} />
          <Objects scene={scene} />
          <Lights scene={scene} />
          {!fromViewerEye && <ViewerMarker scene={scene} />}
        </Canvas>
      </Suspense>
    </div>
  );
}
