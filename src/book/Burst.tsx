import { useEffect, useRef } from 'react';

/**
 * Свет из-за горизонта: небо ультрамарином, земля песком, от точки на
 * горизонте расходятся штрихи, в небе песочные, на земле синие, как
 * трафаретная печать с непрокрасом. Рисуется на холсте, а не картинкой:
 * своя графика, без чужих прав, и чёткая на любом экране.
 *
 * Случайность с затравкой: при перерисовке (смена размера) узор тот же.
 */

export const BLUE = '#1f35d8';
export const SAND = '#e6d3b3';

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Штрих из рваных отрезков вдоль луча: непрокрас трафарета. */
function streak(ctx: CanvasRenderingContext2D, r: () => number, x0: number, y0: number, ang: number, from: number, to: number, w: number) {
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  let d = from;
  while (d < to) {
    const len = 2 + r() * 14 * (0.4 + d / to);
    const gap = r() * 10;
    ctx.lineWidth = w * (0.5 + r());
    ctx.beginPath();
    ctx.moveTo(x0 + dx * d, y0 + dy * d);
    ctx.lineTo(x0 + dx * (d + len), y0 + dy * (d + len));
    ctx.stroke();
    d += len + gap;
  }
}

function paint(canvas: HTMLCanvasElement, horizon: number, seed: number, focus: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineCap = 'round';
  const r = rng(seed);
  const hy = h * horizon;
  const cx = w * focus;
  const reach = Math.hypot(w, h);
  const scale = Math.max(0.6, Math.min(1.4, w / 1200));

  ctx.fillStyle = BLUE;
  ctx.fillRect(0, 0, w, hy);
  ctx.fillStyle = SAND;
  ctx.fillRect(0, hy, w, h - hy);

  // Небо: песочные лучи, гуще к середине веера и у горизонта.
  ctx.strokeStyle = SAND;
  const skyRays = Math.round(900 * scale);
  for (let i = 0; i < skyRays; i++) {
    const spread = (r() - 0.5) * Math.PI * (r() < 0.55 ? 0.55 : 1.0);
    const ang = -Math.PI / 2 + spread;
    if (Math.sin(ang) > -0.02) continue;
    const centre = 1 - Math.abs(spread) / (Math.PI / 2);
    ctx.globalAlpha = 0.25 + 0.6 * centre * r();
    streak(ctx, r, cx, hy, ang, 4 + r() * 30, reach * (0.15 + 0.75 * centre * r()), 0.9 * scale);
  }
  // Зарево у самой точки схода.
  ctx.globalAlpha = 1;
  const glow = ctx.createRadialGradient(cx, hy, 0, cx, hy, 90 * scale);
  glow.addColorStop(0, 'rgba(246,236,214,0.95)');
  glow.addColorStop(1, 'rgba(246,236,214,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - 120 * scale, hy - 120 * scale, 240 * scale, 120 * scale);

  // Россыпь звёзд в верхнем небе.
  ctx.fillStyle = SAND;
  for (let i = 0; i < 260 * scale; i++) {
    ctx.globalAlpha = 0.3 + r() * 0.6;
    ctx.fillRect(r() * w, r() * hy * 0.8, 1.2, 1.2);
  }

  // Земля: синие штрихи от точки схода к краям, у горизонта редкие.
  ctx.strokeStyle = BLUE;
  const groundRays = Math.round(300 * scale);
  for (let i = 0; i < groundRays; i++) {
    const ang = Math.PI / 2 + (r() - 0.5) * Math.PI * 0.9;
    const far = reach * (0.4 + r() * 0.6);
    ctx.globalAlpha = 0.3 + r() * 0.6;
    streak(ctx, r, cx, hy, ang, far * (0.3 + r() * 0.45), far, 1.5 * scale);
  }
  // Кромка горизонта: синие брызги на песке.
  ctx.fillStyle = BLUE;
  for (let i = 0; i < 380 * scale; i++) {
    ctx.globalAlpha = 0.5 + r() * 0.5;
    const x = r() * w;
    const y = hy + Math.pow(r(), 4) * (h - hy) * 0.18;
    ctx.fillRect(x, y, 1 + r() * 6 * scale, 1 + r() * 1.5);
  }
  ctx.globalAlpha = 1;
}

export function Burst({ horizon = 0.62, focus = 0.5, seed = 1922, className }: { horizon?: number; focus?: number; seed?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let frame = 0;
    const draw = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => paint(canvas, horizon, seed, focus)); };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => { ro.disconnect(); cancelAnimationFrame(frame); };
  }, [horizon, focus, seed]);
  return <canvas ref={ref} className={className} aria-hidden />;
}
