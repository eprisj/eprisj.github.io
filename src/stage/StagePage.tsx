import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Copy, FileDown, Link2, Plus, Redo2, Trash2, Undo2 } from 'lucide-react';
import { decodeScene, encodeScene, sceneFromLocation, sceneShareUrl } from './sceneUrl';
import { useSceneHistory } from './useSceneHistory';
import { snapObject, toStep } from './snapping';
import { exportSpec } from './exportSpec';
import { HeroPlan } from './HeroPlan';
import { demoScene } from './demoScene';
import { fetchCases, type BureauCase } from '../showcase/bureauApi';
import { PlanView } from './PlanView';
import { SectionView } from './SectionView';
import { MovesPanel } from './MovesPanel';
import { MOVES, defaultParams, moveBySlug, type Params } from './moves';
import {
  clampToRoom,
  createObject,
  emptyScene,
  newId,
  removeObject,
  updateObject,
  type ObjectKind,
  type Scene,
} from './sceneModel';

/* Работа переживает перезагрузку. Хранится тем же компактным видом, что и в
   ссылке, поэтому формат один и чинить его надо в одном месте. */
const SAVE_KEY = 'epris-stage-scene';

function loadSaved(): Scene | null {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? decodeScene(raw) : null;
  } catch {
    // Приватный режим запрещает хранилище — это не повод не открыть редактор.
    return null;
  }
}

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
  /* Порядок источников: адрес важнее сохранённого, сохранённое важнее пустого.
     По ссылке пришли смотреть КОНКРЕТНУЮ сцену, и подсовывать вместо неё вчерашнюю
     работу нельзя; но вернувшись на голый /stage, работу терять тоже нельзя. */
  const restored = useMemo(() => sceneFromLocation() || loadSaved(), []);
  const history = useSceneHistory(restored || emptyScene());
  const { scene } = history;
  const setScene = history.commit;
  const [entered, setEntered] = useState(() => !!restored);
  const [guide, setGuide] = useState<{ x: number | null; z: number | null }>({ x: null, z: null });
  const [heroScene] = useState(demoScene);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [eyeView, setEyeView] = useState(false);
  const [cases, setCases] = useState<BureauCase[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [moveParams, setMoveParams] = useState<Params>({});
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'in-address-bar'>('idle');
  const [exporting, setExporting] = useState(false);
  const selected = scene.objects.find((o) => o.id === selectedId) || null;
  const activeCaseTitle = cases.find((item) => item.slug === activeSlug)?.title ?? null;

  useEffect(() => {
    const controller = new AbortController();
    // Разборы приходят из живого Бюро: панель приёмов — то же содержимое, что
    // и статьи, а не вторая его копия в коде инструмента.
    fetchCases(controller.signal)
      .then(setCases)
      .catch(() => setCases([]));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!entered) return;
    try {
      window.localStorage.setItem(SAVE_KEY, encodeScene(scene));
    } catch {
      /* переполнено или запрещено — молча, терять редактор из-за этого нельзя */
    }
  }, [scene, entered]);

  const activeMove = activeSlug ? moveBySlug(activeSlug) : undefined;

  /* Приём — линза над базовой сценой, а не правка её. Поэтому ползунок можно
     возить туда-обратно: каждый кадр приём применяется к исходной сцене
     заново, и сдвиг не накапливается. */
  const displayed = useMemo(
    () => (activeMove ? activeMove.apply(scene, moveParams, selectedId) : scene),
    [activeMove, scene, moveParams, selectedId],
  );

  const readings = useMemo(
    () => (activeMove ? activeMove.read(scene, moveParams, selectedId) : []),
    [activeMove, scene, moveParams, selectedId],
  );

  function handlePickMove(slug: string | null) {
    setActiveSlug(slug);
    const move = slug ? moveBySlug(slug) : undefined;
    setMoveParams(move ? defaultParams(move) : {});
  }

  function handleBake() {
    // Запекание переносит результат в базу и снимает линзу: следы приёма
    // становятся вашими объектами, и пунктир с них уходит.
    setScene({ ...displayed, objects: displayed.objects.map(({ generatedBy: _drop, ...rest }) => rest) });
    setActiveSlug(null);
    setMoveParams({});
  }

  async function handleShare() {
    // Делимся тем, что человек ВИДИТ: если приём включён, ссылка должна
    // открыться той же сценой, а не исходной коробкой под ней.
    const url = sceneShareUrl(displayed);
    window.history.replaceState(null, '', url);
    try {
      await navigator.clipboard.writeText(url);
      setShareState('copied');
    } catch {
      // Буфер может быть закрыт политикой — адрес уже в строке, его видно.
      setShareState('in-address-bar');
    }
    window.setTimeout(() => setShareState('idle'), 2500);
  }

  async function handleExport() {
    setExporting(true);
    try {
      await exportSpec({ scene: displayed, moveTitle: activeCaseTitle, readings });
    } finally {
      setExporting(false);
    }
  }

  function handleAdd(kind: ObjectKind) {
    // Объект делается заранее, а кладётся функциональным обновлением: иначе
    // два клика в одном тике читают одну и ту же сцену, и второй объект
    // пропадает.
    const object = createObject(scene.room, kind);
    setScene((prev) => ({ ...prev, objects: [...prev.objects, object] }));
    setSelectedId(object.id);
  }

  function handleDrag(id: string, x: number, z: number, free: boolean) {
    // `set`, а не `commit`: запись в историю уже сделана на pointerdown, иначе
    // одно перетаскивание оставило бы десятки шагов отмены.
    history.set((prev) => {
      const object = prev.objects.find((o) => o.id === id);
      if (!object) return prev;
      const snapped = snapObject(prev, object, x, z, free);
      const moved = clampToRoom(prev, { ...object, x: snapped.x, z: snapped.z });
      setGuide({ x: snapped.guideX, z: snapped.guideZ });
      return updateObject(prev, id, { x: moved.x, z: moved.z });
    });
  }

  function handleDuplicate(id: string) {
    const object = scene.objects.find((o) => o.id === id);
    if (!object) return;
    // Копия смещается на полшага, иначе она ложится точно под оригинал и
    // выглядит как «ничего не произошло».
    const copy = { ...object, id: newId('obj'), x: toStep(object.x + 0.5), z: toStep(object.z + 0.5) };
    setScene((prev) => ({ ...prev, objects: [...prev.objects, clampToRoom(prev, copy)] }));
    setSelectedId(copy.id);
  }

  function nudge(dx: number, dz: number) {
    if (!selectedId) return;
    setScene((prev) => {
      const object = prev.objects.find((o) => o.id === selectedId);
      if (!object) return prev;
      const moved = clampToRoom(prev, { ...object, x: toStep(object.x + dx), z: toStep(object.z + dz) });
      return updateObject(prev, selectedId, { x: moved.x, z: moved.z });
    });
  }

  /* Клавиатура — то, чем практик пользуется не глядя. Поля ввода исключены:
     Delete внутри числа должен стирать цифру, а не элемент сцены. */
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) history.redo();
        else history.undo();
        return;
      }
      if (mod && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        if (selectedId) handleDuplicate(selectedId);
        return;
      }
      if ((event.key === 'Backspace' || event.key === 'Delete') && selectedId) {
        event.preventDefault();
        handleRemove(selectedId);
        return;
      }
      const step = event.shiftKey ? 0.5 : 0.05;
      if (event.key === 'ArrowLeft') { event.preventDefault(); nudge(-step, 0); }
      else if (event.key === 'ArrowRight') { event.preventDefault(); nudge(step, 0); }
      else if (event.key === 'ArrowUp') { event.preventDefault(); nudge(0, -step); }
      else if (event.key === 'ArrowDown') { event.preventDefault(); nudge(0, step); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function handleRemove(id: string) {
    setScene((prev) => removeObject(prev, id));
    setSelectedId(null);
  }


  return (
    <div className="min-h-screen bg-[#1a0b10] pb-24">
      <Header />

      {!entered && (
        <section className="relative isolate flex min-h-[88vh] flex-col justify-between overflow-hidden bg-[#1a0b10]">
          <HeroPlan scene={heroScene} />
          {/* Скрим легче, чем на витрине: там он гасит фотографию, а здесь под
              ним чертёж, который сам по себе тихий. */}
          <div className="absolute inset-0 bg-[#0d0508]/25" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0508]/80 via-transparent to-[#0d0508]/35" />

          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-[8%] hidden w-px bg-[#f5f0eb]/12 lg:block" />
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-[8%] hidden w-px bg-[#f5f0eb]/12 lg:block" />

          <div className="relative z-10 px-6 pt-10 sm:px-10 lg:px-14 lg:pt-14">
            <h1 className="font-sans font-bold lowercase leading-[0.82] tracking-[-0.04em] text-[#f5f0eb]">
              <span className="block text-[15vw] sm:text-[11vw] lg:text-[8.5vw]">epris</span>
              <span className="block pl-[0.06em] text-[10vw] font-normal sm:text-[7vw] lg:text-[5.4vw]">stage</span>
            </h1>
          </div>

          <div className="relative z-10 flex flex-wrap items-end justify-between gap-6 px-6 pb-10 sm:px-10 lg:px-14 lg:pb-14">
            <div>
              <span aria-hidden="true" className="mb-4 grid h-12 w-12 border-b border-l border-[#f5f0eb]/60 text-[#f5f0eb]">
                <ArrowUpRight size={26} className="justify-self-end" />
              </span>
              <p className="max-w-md font-sans text-[13px] lowercase leading-relaxed text-[#f5f0eb]/85 sm:text-[15px]">
                a box in metres, read in plan, section and volume at once — and the
                moves from the bureau tried on it
              </p>
            </div>

            {/* Заглавная не декорация: та самая сцена, что нарисована фоном,
                кладётся в редактор — начинают не с пустого пола. */}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => { setScene(demoScene()); setEntered(true); }}
                className="group inline-flex min-h-11 items-center gap-2 border border-[#f5f0eb]/30 px-4 font-sans text-[10px] uppercase tracking-[0.16em] text-[#f5f0eb] hover:border-[#f5f0eb]"
              >
                Open this scene
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </button>
              <button
                type="button"
                onClick={() => setEntered(true)}
                className="inline-flex min-h-11 items-center border border-[#f5f0eb]/15 px-4 font-sans text-[10px] uppercase tracking-[0.16em] text-[#f5f0eb]/60 hover:border-[#f5f0eb]/50 hover:text-[#f5f0eb]"
              >
                Start empty
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-8 lg:px-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-sans text-[9px] uppercase tracking-[0.2em] text-[#f5f0eb]/40">
              Drawing set · metres · {scene.room.w} × {scene.room.d} × {scene.room.h}
            </p>
            <p className="mt-2 max-w-[52ch] font-sans text-[13px] leading-relaxed text-[#f5f0eb]/60">
              One model, read three ways. Move an element in the plan and the section
              follows it — they cannot disagree.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={history.undo}
              disabled={!history.canUndo}
              title="Undo (⌘Z)"
              className="inline-flex min-h-9 items-center gap-1.5 border border-[#f5f0eb]/20 px-3 font-sans text-[10px] uppercase tracking-[0.12em] text-[#f5f0eb]/75 hover:border-[#f5f0eb]/60 hover:text-[#f5f0eb] disabled:opacity-25 disabled:hover:border-[#f5f0eb]/20"
            >
              <Undo2 size={12} /> Undo
            </button>
            <button
              type="button"
              onClick={history.redo}
              disabled={!history.canRedo}
              title="Redo (⇧⌘Z)"
              className="inline-flex min-h-9 items-center gap-1.5 border border-[#f5f0eb]/20 px-3 font-sans text-[10px] uppercase tracking-[0.12em] text-[#f5f0eb]/75 hover:border-[#f5f0eb]/60 hover:text-[#f5f0eb] disabled:opacity-25 disabled:hover:border-[#f5f0eb]/20"
            >
              <Redo2 size={12} /> Redo
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex min-h-9 items-center gap-1.5 border border-[#f5f0eb]/20 px-3 font-sans text-[10px] uppercase tracking-[0.12em] text-[#f5f0eb]/75 hover:border-[#f5f0eb]/60 hover:text-[#f5f0eb]"
            >
              {shareState === 'idle' ? <Link2 size={12} /> : <Check size={12} />}
              {shareState === 'idle' && 'Copy link'}
              {shareState === 'copied' && 'Link copied'}
              {shareState === 'in-address-bar' && 'In address bar'}
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex min-h-9 items-center gap-1.5 border border-[#f5f0eb]/20 px-3 font-sans text-[10px] uppercase tracking-[0.12em] text-[#f5f0eb]/75 hover:border-[#f5f0eb]/60 hover:text-[#f5f0eb] disabled:opacity-40"
            >
              <FileDown size={12} /> {exporting ? 'Drawing…' : 'Spec PDF'}
            </button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px]">
          <div className="min-w-0 space-y-8">
            <div>
              <p className="mb-2 font-sans text-[9px] uppercase tracking-[0.2em] text-[#f5f0eb]/45">Plan</p>
              <div className="border border-[#f5f0eb]/12">
                <PlanView
                  scene={displayed}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onDrag={handleDrag}
                  onDragStart={history.snapshot}
                  onDragEnd={() => setGuide({ x: null, z: null })}
                  guideX={guide.x}
                  guideZ={guide.z}
                />
              </div>
            </div>
            <div>
              <p className="mb-2 font-sans text-[9px] uppercase tracking-[0.2em] text-[#f5f0eb]/45">Section</p>
              <div className="border border-[#f5f0eb]/12">
                <SectionView scene={displayed} selectedId={selectedId} />
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
                    <Scene3D scene={displayed} fromViewerEye={eyeView} />
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

            <MovesPanel
              cases={cases}
              moves={MOVES}
              activeSlug={activeSlug}
              params={moveParams}
              readings={readings}
              onPick={handlePickMove}
              onParam={(key, value) => setMoveParams((prev) => ({ ...prev, [key]: value }))}
              onBake={handleBake}
            />

            {selected ? (
              <div className="space-y-3 border-t border-[#f5f0eb]/12 pt-6">
                <div className="flex items-center justify-between">
                  <p className="font-sans text-[9px] uppercase tracking-[0.2em] text-[#f5f0eb]/45">{selected.label}</p>
                  <span className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => handleDuplicate(selected.id)}
                      title="Duplicate (⌘D)"
                      className="inline-flex min-h-8 items-center gap-1.5 font-sans text-[9px] uppercase tracking-[0.12em] text-[#f5f0eb]/45 hover:text-[#f5f0eb]"
                    >
                      <Copy size={12} /> Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(selected.id)}
                      title="Delete (⌫)"
                      className="inline-flex min-h-8 items-center gap-1.5 font-sans text-[9px] uppercase tracking-[0.12em] text-[#f5f0eb]/45 hover:text-[#f5f0eb]"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </span>
                </div>
                <NumberField label="X" value={selected.x} onChange={(v) => setScene((p) => updateObject(p, selected.id, { x: v }))} />
                <NumberField label="Z" value={selected.z} onChange={(v) => setScene((p) => updateObject(p, selected.id, { z: v }))} />
                <NumberField label="Y (lift)" value={selected.y} onChange={(v) => setScene((p) => updateObject(p, selected.id, { y: v }))} />
                <NumberField label="Width" value={selected.w} onChange={(v) => setScene((p) => updateObject(p, selected.id, { w: v }))} />
                <NumberField label="Depth" value={selected.d} onChange={(v) => setScene((p) => updateObject(p, selected.id, { d: v }))} />
                <NumberField label="Height" value={selected.h} onChange={(v) => setScene((p) => updateObject(p, selected.id, { h: v }))} />
                <NumberField label="Rotation" step={5} value={selected.rotation} onChange={(v) => setScene((p) => updateObject(p, selected.id, { rotation: v }))} />
              </div>
            ) : null}

            {/* Ведомость: то, к чему отсылают номера на чертеже. Без неё метка
                «03» ничего не значит, а с ней рисунок и список — один документ. */}
            <div className="border-t border-[#f5f0eb]/12 pt-6">
              <p className="mb-3 font-sans text-[9px] uppercase tracking-[0.2em] text-[#f5f0eb]/45">
                Schedule
              </p>
              {scene.objects.length ? (
                <ul className="divide-y divide-[#f5f0eb]/8 border-y border-[#f5f0eb]/8">
                  {displayed.objects.map((object, index) => (
                    <li key={object.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(object.generatedBy ? null : object.id)}
                        className={`flex w-full items-baseline gap-2.5 py-2 text-left font-sans transition-colors ${
                          object.id === selectedId ? 'text-[#b8956e]' : 'text-[#f5f0eb]/70 hover:text-[#f5f0eb]'
                        }`}
                      >
                        <span className="w-5 shrink-0 text-[10px] tabular-nums opacity-60">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[12px]">{object.label}</span>
                        <span className="shrink-0 text-[10px] tabular-nums opacity-55">
                          {object.w.toFixed(2)}×{object.d.toFixed(2)}×{object.h.toFixed(2)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="font-sans text-[11px] text-[#f5f0eb]/40">The box is empty.</p>
              )}
            </div>

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
