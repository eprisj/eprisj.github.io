import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { CuboidCollider, Physics, RigidBody } from '@react-three/rapier';
import { GizmoHelper, GizmoViewport, OrbitControls } from '@react-three/drei';
import { BoxGeometry, DoubleSide, FrontSide } from 'three';
import type { Scene } from './sceneModel';

// Собственный чанк — three и fiber тяжелее ~150 КБ gzip, и на главную журнала
// это грузить нельзя. StagePage подключает этот файл через lazy().

const PAPER = 0xf5f0eb;
const INK = 0x1a0b10;
const ACCENT = 0xb8956e;
const SEAT = 0x8aa6a9;
const BLOCK = 0xc7a47b;

function Room({ scene }: { scene: Scene }) {
  const { w, d, h } = scene.room;
  return (
    <group>
      {/* Пол — единственная плоскость, на которой всё стоит */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[w / 2, 0, d / 2]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={INK} roughness={0.9} metalness={0.04} />
      </mesh>
      {/* Контур коробки, а не сплошные стены — им ничто не должно заслонять сцену */}
      <lineSegments position={[w / 2, h / 2, d / 2]}>
        <edgesGeometry args={[useMemo(() => new BoxGeometry(w, h, d), [w, h, d])]} />
        <lineBasicMaterial color={PAPER} transparent opacity={0.25} />
      </lineSegments>
    </group>
  );
}

function ObjectVolume({ object, local = false }: { object: Scene['objects'][number]; local?: boolean }) {
  const color = object.kind === 'seating' ? SEAT : object.kind === 'platform' || object.kind === 'practical' ? ACCENT : object.kind === 'block' ? BLOCK : PAPER;
  const material = (
    <meshStandardMaterial
      color={color}
      opacity={object.opacity ?? 0.88}
      transparent
      roughness={object.soft ? 0.72 : 0.52}
      metalness={object.kind === 'practical' ? 0.2 : 0.04}
      emissive={object.soft || object.kind === 'practical' ? color : 0x000000}
      emissiveIntensity={object.soft ? 0.24 : object.kind === 'practical' ? 0.08 : 0}
      side={object.soft ? DoubleSide : FrontSide}
    />
  );

  return (
    <group
      position={local ? [0, 0, 0] : [object.x + object.w / 2, object.y + object.h / 2, object.z + object.d / 2]}
      rotation={local ? [0, 0, 0] : [0, (-object.rotation * Math.PI) / 180, 0]}
    >
      {object.kind === 'wall' && <mesh castShadow receiveShadow><boxGeometry args={[object.w, object.h, object.d]} />{material}</mesh>}
      {object.kind === 'platform' && (
        <>
          <mesh castShadow receiveShadow><boxGeometry args={[object.w, object.h, object.d]} />{material}</mesh>
          <mesh position={[0, object.h / 2 + 0.012, 0]} receiveShadow><boxGeometry args={[object.w * 0.86, 0.024, object.d * 0.86]} />{material}</mesh>
        </>
      )}
      {object.kind === 'block' && <mesh castShadow receiveShadow><coneGeometry args={[Math.max(object.w, object.d) * 0.34, Math.max(object.w, object.d) * 0.48, object.h, 4]} />{material}</mesh>}
      {object.kind === 'practical' && <mesh castShadow receiveShadow><cylinderGeometry args={[Math.max(object.w, object.d) * 0.5, Math.max(object.w, object.d) * 0.5, object.h, 20]} />{material}</mesh>}
      {object.kind === 'seating' && (
        <group>
          <mesh position={[0, -object.h * 0.22, -object.d * 0.05]} castShadow receiveShadow><boxGeometry args={[object.w, object.h * 0.46, object.d * 0.82]} />{material}</mesh>
          <mesh position={[0, object.h * 0.16, object.d * 0.34]} castShadow receiveShadow><boxGeometry args={[object.w, object.h * 0.58, object.d * 0.16]} />{material}</mesh>
        </group>
      )}
    </group>
  );
}

function StaticObjects({ scene }: { scene: Scene }) {
  return (
    <>
      {scene.objects.map((object) => <ObjectVolume key={object.id} object={object} />)}
    </>
  );
}

function PhysicsObjects({ scene }: { scene: Scene }) {
  const { w, d } = scene.room;
  return (
    <Physics gravity={[0, -9.81, 0]} numSolverIterations={8} numAdditionalFrictionIterations={4}>
      <RigidBody type="fixed" colliders={false} position={[w / 2, -0.16, d / 2]} friction={1.2} restitution={0}>
        <CuboidCollider args={[w / 2, 0.16, d / 2]} />
      </RigidBody>
      {scene.objects.map((object) => {
        const dynamic = object.kind === 'block' || object.kind === 'practical';
        return (
          <RigidBody
            key={object.id}
            type={dynamic ? 'dynamic' : 'fixed'}
            colliders={false}
            position={[object.x + object.w / 2, object.y + object.h / 2, object.z + object.d / 2]}
            rotation={[0, (-object.rotation * Math.PI) / 180, 0]}
            friction={dynamic ? 0.82 : 1.1}
            restitution={0.02}
            linearDamping={dynamic ? 0.65 : 0}
            angularDamping={dynamic ? 1.3 : 0}
            ccd={dynamic}
            canSleep
          >
            <CuboidCollider args={[object.w / 2, object.h / 2, object.d / 2]} />
            <ObjectVolume object={object} local />
          </RigidBody>
        );
      })}
    </Physics>
  );
}

function Lights({ scene }: { scene: Scene }) {
  return (
    <>
      <ambientLight intensity={0.18} />
      <directionalLight castShadow position={[scene.room.w * 0.35, scene.room.h + 4, scene.room.d * 0.15]} intensity={1.35} color={PAPER} shadow-mapSize={[1024, 1024]} />
      {scene.lights.map((light) => (
        <pointLight
          key={light.id}
          position={[light.x, light.y, light.z]}
          intensity={light.kind === 'key' ? 40 : light.kind === 'fill' ? 18 : 8}
          color={light.kind === 'practical' ? ACCENT : PAPER}
          distance={20}
          decay={2}
          castShadow={light.kind === 'key'}
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
  physicsEnabled?: boolean;
}

// Камера либо на воображаемом орбитальном посте над сценой, либо ровно в
// глазах зрителя — второй режим показывает то самое, ради чего в модели
// вообще есть eyeHeight.
export function Scene3D({ scene, fromViewerEye = false, physicsEnabled = false }: Props) {
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
          shadows
          dpr={[1, 1.5]}
          camera={{ position: cameraPosition, fov: fromViewerEye ? 70 : 45 }}
          onCreated={({ camera }) => camera.lookAt(...lookAt)}
        >
          <color attach="background" args={[INK]} />
          <Room scene={scene} />
          {physicsEnabled ? <PhysicsObjects scene={scene} /> : <StaticObjects scene={scene} />}
          <Lights scene={scene} />
          {!fromViewerEye && <ViewerMarker scene={scene} />}
          {!fromViewerEye && (
            <>
              <OrbitControls makeDefault enableDamping dampingFactor={0.08} target={lookAt} minDistance={3} maxDistance={Math.max(scene.room.w, scene.room.d) * 3} maxPolarAngle={Math.PI / 2.03} />
              <GizmoHelper alignment="bottom-right" margin={[72, 72]}>
                <GizmoViewport axisColors={['#d7b46a', '#f5f0eb', '#8aa6a9']} labelColor="#f5f0eb" />
              </GizmoHelper>
            </>
          )}
        </Canvas>
      </Suspense>
    </div>
  );
}
