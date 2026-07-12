import { useCallback, useEffect, useRef, useState } from 'react';

// Portrait crop box — same aspect used everywhere the photo renders (preview,
// PNG export, PDF export) so what you crop is exactly what you get.
export const CROP_W = 240;
export const CROP_H = 320;
export const CROP_EXPORT_W = 720;
export const CROP_EXPORT_H = 960;

export function PhotoCropper({
  file,
  onCancel,
  onConfirm,
}: {
  file: File;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
}) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef<{ x: number; y: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleLoad = useCallback(() => {
    const el = imgRef.current;
    if (!el) return;
    const w = el.naturalWidth;
    const h = el.naturalHeight;
    setNatural({ w, h });
    // Cover the crop box entirely — never show letterboxing.
    const s = Math.max(CROP_W / w, CROP_H / h);
    setMinScale(s);
    setScale(s);
    setOffset({ x: (CROP_W - w * s) / 2, y: (CROP_H - h * s) / 2 });
  }, []);

  const clampOffset = useCallback((x: number, y: number, s: number) => {
    const w = natural.w * s;
    const h = natural.h * s;
    const minX = Math.min(0, CROP_W - w);
    const minY = Math.min(0, CROP_H - h);
    return { x: Math.max(minX, Math.min(0, x)), y: Math.max(minY, Math.min(0, y)) };
  }, [natural]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }, [offset]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const next = clampOffset(e.clientX - dragging.current.x, e.clientY - dragging.current.y, scale);
    setOffset(next);
  }, [clampOffset, scale]);

  const onPointerUp = useCallback(() => { dragging.current = null; }, []);

  const onZoomChange = useCallback((val: number) => {
    const s = minScale * val;
    setScale(s);
    setOffset((prev) => clampOffset(prev.x, prev.y, s));
  }, [minScale, clampOffset]);

  const confirm = useCallback(() => {
    const el = imgRef.current;
    if (!el || !natural.w) return;
    const canvas = document.createElement('canvas');
    canvas.width = CROP_EXPORT_W;
    canvas.height = CROP_EXPORT_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const exportScale = CROP_EXPORT_W / CROP_W;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      el,
      offset.x * exportScale,
      offset.y * exportScale,
      natural.w * scale * exportScale,
      natural.h * scale * exportScale,
    );
    onConfirm(canvas.toDataURL('image/jpeg', 0.92));
  }, [natural, offset, scale, onConfirm]);

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[var(--pp-cream)] max-w-sm w-full p-6 shadow-2xl">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--pp-burgundy)] mb-4">
          Position & zoom your photo
        </h3>
        <div
          className="relative mx-auto overflow-hidden select-none touch-none border border-[var(--pp-burgundy)]/30 cursor-grab active:cursor-grabbing"
          style={{ width: CROP_W, height: CROP_H }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {imgUrl && (
            <img
              ref={imgRef}
              src={imgUrl}
              onLoad={handleLoad}
              alt=""
              draggable={false}
              className="absolute top-0 left-0 pointer-events-none max-w-none"
              style={{
                width: natural.w * scale,
                height: natural.h * scale,
                transform: `translate(${offset.x}px, ${offset.y}px)`,
              }}
            />
          )}
        </div>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          defaultValue={1}
          onChange={(e) => onZoomChange(Number(e.target.value))}
          className="w-full mt-4 accent-[var(--pp-burgundy)]"
        />
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 border border-[var(--pp-burgundy)] text-[var(--pp-burgundy)] font-mono text-[10px] uppercase tracking-widest py-2.5 hover:bg-[var(--pp-burgundy)]/5"
          >
            {'Cancel'}
          </button>
          <button
            type="button"
            onClick={confirm}
            className="flex-1 bg-[var(--pp-burgundy)] text-[var(--pp-cream)] font-mono text-[10px] uppercase tracking-widest py-2.5 hover:opacity-90"
          >
            {'Use this photo'}
          </button>
        </div>
      </div>
    </div>
  );
}
