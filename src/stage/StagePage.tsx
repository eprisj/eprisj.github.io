import { lazy, Suspense, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Plus, Trash2 } from 'lucide-react';
import { PlanView } from './PlanView';
import { SectionView } from './SectionView';
import {
  addObject,
  clampToRoom,
  emptyScene,
  removeObject,
  updateObject,
  type ObjectKind,
  type Scene,
} from './sceneModel';

// three/fiber — отдельный чанк, грузится только когда открыли вкладку «Volume».
const Scene3D = lazy(() => import('./Scene3D').then((m) => ({ default: m.Scene3D })));

const INK = '#1a0b10';

const KINDS: { kind: ObjectKind; label: string }[] = [
  { kind: 'block', label: 'Object' },
  { kind: 'wall', label: 'Wall' },
  { kind: 'platform', label: 'Platform' },
  { kind: 'practical', label: 'Practical' },
  { kind: 'seating', label: 'Seat' },
];

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#f5f0eb]/12 bg-[#1a0b10]/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-8 lg:px-12">
        <a href="/bureau" className="inline-flex min-h-11 items-center gap-2 font-sans text-[9px] uppercase tracking-[0.2em] text-[#f5f0eb]/60 hover:text-[#f5f0eb]">
          <ArrowLeft size={14} /> Bureau
        </a>
        <span className="inline-flex min-h-11 items-center font-sans text-[13px] font-bold lowercase tracking-[-0.02em] text-[#f5f0eb] sm:text-[15px]">
          epris stage
        </span>
        <a href="/" className="inline-flex min-h-11 items-center gap-2 font-sans text-[9px] uppercase tracking-[0.2em] text-[#f5f0eb]/60 hover:text-[#f5f0eb]">
          Journal <ArrowUpRight size={13} />
        </a>
      </div>
    </header>
  );
}

function NumberField({ label, value, step = 0.1, onChange }: { label: string; value: number; step?: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 font-sans text-[10px] uppercase tracking-[0.14em] text-[#f5f0eb]/55">
      {label}
      <input
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-20 border border-[#f5f0eb]/20 bg-transparent px-2 py-1 text-right font-sans text-[12px] text-[#f5f0eb] focus:border-[#f5f0eb]/60 focus:outline-none"
      />
    </label>
  );
}

export function StagePage() {
  const [scene, setScene] = useState<Scene>(() => emptyScene());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [eyeView, setEyeView] = useState(false);
  const selected = scene.objects.find((o) => o.id === selectedId) || null;

  function handleAdd(kind: ObjectKind) {
    const next = addObject(scene, kind);
    setScene(next);
    setSelectedId(next.objects[next.objects.length - 1].id);
  }

  function handleDrag(id: string, x: number, z: number) {
    setScene((prev) => {
      const object = prev.objects.find((o) => o.id === id);
      if (!object) return prev;
      const moved = clampToRoom(prev, { ...object, x, z });
      return updateObject(prev, id, { x: moved.x, z: moved.z });
    });
  }

  function handleRemove(id: string) {
    setScene((prev) => removeObject(prev, id));
    setSelectedId(null);
  }

  return (
    <div className="min-h-screen bg-[#1a0b10] pb-24">
      <Header />
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-8 lg:px-12">
        <p className="max-w-[52ch] font-sans text-[13px] leading-relaxed text-[#f5f0eb]/60">
          Коробка сцены в метрах. План и разрез читают одну модель — подвинь объект
          в плане, он подвинется и в разрезе.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px]">
          <div className="min-w-0 space-y-8">
            <div>
              <p className="mb-2 font-sans text-[9px] uppercase tracking-[0.2em] text-[#f5f0eb]/45">Plan</p>
              <div className="border border-[#f5f0eb]/12">
                <PlanView scene={scene} selectedId={selectedId} onSelect={setSelectedId} onDrag={handleDrag} />
              </div>
            </div>
            <div>
              <p className="mb-2 font-sans text-[9px] uppercase tracking-[0.2em] text-[#f5f0eb]/45">Section</p>
              <div className="border border-[#f5f0eb]/12">
                <SectionView scene={scene} selectedId={selectedId} />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="font-sans text-[9px] uppercase tracking-[0.2em] text-[#f5f0eb]/45">Volume</p>
                <div className="flex gap-2">
                  {volumeOpen && (
                    <button
                      type="button"
                      onClick={() => setEyeView((v) => !v)}
                      className="font-sans text-[9px] uppercase tracking-[0.14em] text-[#f5f0eb]/50 hover:text-[#f5f0eb]"
                    >
                      {eyeView ? 'Orbit view' : "Viewer's eye"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setVolumeOpen((v) => !v)}
                    className="font-sans text-[9px] uppercase tracking-[0.14em] text-[#f5f0eb]/50 hover:text-[#f5f0eb]"
                  >
                    {volumeOpen ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              {volumeOpen && (
                <div className="h-[420px] border border-[#f5f0eb]/12">
                  <Suspense
                    fallback={
                      <div className="flex h-full items-center justify-center font-sans text-[10px] uppercase tracking-[0.14em] text-[#f5f0eb]/30">
                        Loading volume…
                      </div>
                    }
                  >
                    <Scene3D scene={scene} fromViewerEye={eyeView} />
                  </Suspense>
                </div>
              )}
            </div>
          </div>

          <aside className="min-w-0 space-y-8">
            <div>
              <p className="mb-3 font-sans text-[9px] uppercase tracking-[0.2em] text-[#f5f0eb]/45">Add</p>
              <div className="flex flex-wrap gap-2">
                {KINDS.map(({ kind, label }) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => handleAdd(kind)}
                    className="inline-flex min-h-9 items-center gap-1.5 border border-[#f5f0eb]/20 px-3 font-sans text-[10px] uppercase tracking-[0.12em] text-[#f5f0eb]/75 hover:border-[#f5f0eb]/60 hover:text-[#f5f0eb]"
                  >
                    <Plus size={12} /> {label}
                  </button>
                ))}
              </div>
            </div>

            {selected ? (
              <div className="space-y-3 border-t border-[#f5f0eb]/12 pt-6">
                <div className="flex items-center justify-between">
                  <p className="font-sans text-[9px] uppercase tracking-[0.2em] text-[#f5f0eb]/45">{selected.label}</p>
                  <button
                    type="button"
                    onClick={() => handleRemove(selected.id)}
                    className="inline-flex min-h-8 items-center gap-1.5 font-sans text-[9px] uppercase tracking-[0.12em] text-[#f5f0eb]/45 hover:text-[#f5f0eb]"
                  >
                    <Trash2 size={12} /> Remove
                  </button>
                </div>
                <NumberField label="X" value={selected.x} onChange={(v) => setScene((p) => updateObject(p, selected.id, { x: v }))} />
                <NumberField label="Z" value={selected.z} onChange={(v) => setScene((p) => updateObject(p, selected.id, { z: v }))} />
                <NumberField label="Y (lift)" value={selected.y} onChange={(v) => setScene((p) => updateObject(p, selected.id, { y: v }))} />
                <NumberField label="Width" value={selected.w} onChange={(v) => setScene((p) => updateObject(p, selected.id, { w: v }))} />
                <NumberField label="Depth" value={selected.d} onChange={(v) => setScene((p) => updateObject(p, selected.id, { d: v }))} />
                <NumberField label="Height" value={selected.h} onChange={(v) => setScene((p) => updateObject(p, selected.id, { h: v }))} />
                <NumberField label="Rotation" step={5} value={selected.rotation} onChange={(v) => setScene((p) => updateObject(p, selected.id, { rotation: v }))} />
              </div>
            ) : (
              <div className="border-t border-[#f5f0eb]/12 pt-6">
                <p className="font-sans text-[11px] text-[#f5f0eb]/40">Select an object to edit it.</p>
              </div>
            )}

            <div className="space-y-3 border-t border-[#f5f0eb]/12 pt-6">
              <p className="font-sans text-[9px] uppercase tracking-[0.2em] text-[#f5f0eb]/45">Room</p>
              <NumberField label="Width" step={0.5} value={scene.room.w} onChange={(v) => setScene((p) => ({ ...p, room: { ...p.room, w: v } }))} />
              <NumberField label="Depth" step={0.5} value={scene.room.d} onChange={(v) => setScene((p) => ({ ...p, room: { ...p.room, d: v } }))} />
              <NumberField label="Height" step={0.5} value={scene.room.h} onChange={(v) => setScene((p) => ({ ...p, room: { ...p.room, h: v } }))} />
            </div>

            <div className="space-y-3 border-t border-[#f5f0eb]/12 pt-6">
              <p className="font-sans text-[9px] uppercase tracking-[0.2em] text-[#f5f0eb]/45">Viewer</p>
              <NumberField label="X" value={scene.viewer.x} onChange={(v) => setScene((p) => ({ ...p, viewer: { ...p.viewer, x: v } }))} />
              <NumberField label="Z" value={scene.viewer.z} onChange={(v) => setScene((p) => ({ ...p, viewer: { ...p.viewer, z: v } }))} />
              <NumberField label="Eye height" value={scene.viewer.eyeHeight} onChange={(v) => setScene((p) => ({ ...p, viewer: { ...p.viewer, eyeHeight: v } }))} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
