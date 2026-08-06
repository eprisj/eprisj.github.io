import { ArrowUpRight } from 'lucide-react';
import type { BureauCase } from '../showcase/bureauApi';
import type { Move, Params, Reading } from './moves';

interface Props {
  cases: BureauCase[];
  moves: Move[];
  activeSlug: string | null;
  params: Params;
  readings: Reading[];
  onPick: (slug: string | null) => void;
  onParam: (key: string, value: number) => void;
  onBake: () => void;
}

export function MovesPanel({ cases, moves, activeSlug, params, readings, onPick, onParam, onBake }: Props) {
  // Показываем только те разборы, у которых есть оператор: приём без механики
  // — это статья, ей место в Бюро, а не в панели инструмента.
  const playable = cases.filter((item) => moves.some((m) => m.slug === item.slug));
  const activeCase = playable.find((item) => item.slug === activeSlug) || null;
  const activeMove = moves.find((m) => m.slug === activeSlug) || null;

  return (
    <div className="space-y-4 border-t border-[#f5f0eb]/12 pt-6">
      <p className="font-sans text-[9px] uppercase tracking-[0.2em] text-[#f5f0eb]/45">Move</p>

      {!playable.length && (
        <p className="font-sans text-[11px] text-[#f5f0eb]/40">Bureau is unavailable, so the moves are not loaded.</p>
      )}

      <div className="flex flex-col gap-1.5">
        {playable.map((item) => {
          const isActive = item.slug === activeSlug;
          return (
            <button
              key={item.slug}
              type="button"
              onClick={() => onPick(isActive ? null : item.slug)}
              className={`border px-3 py-2 text-left font-sans text-[11px] lowercase transition-colors ${
                isActive
                  ? 'border-[#f5f0eb]/70 text-[#f5f0eb]'
                  : 'border-[#f5f0eb]/15 text-[#f5f0eb]/60 hover:border-[#f5f0eb]/40 hover:text-[#f5f0eb]/90'
              }`}
            >
              {item.title}
            </button>
          );
        })}
      </div>

      {activeCase && activeMove && (
        <div className="space-y-4 border-t border-[#f5f0eb]/12 pt-4">
          {activeCase.summary && (
            <p className="font-sans text-[11px] leading-relaxed text-[#f5f0eb]/55">{activeCase.summary}</p>
          )}

          {activeMove.params.map((param) => (
            <label key={param.key} className="block space-y-1.5">
              <span className="flex items-center justify-between font-sans text-[9px] uppercase tracking-[0.14em] text-[#f5f0eb]/50">
                {param.label}
                <span className="text-[#f5f0eb]/80">
                  {params[param.key]}
                  {param.unit}
                </span>
              </span>
              <input
                type="range"
                min={param.min}
                max={param.max}
                step={param.step}
                value={params[param.key]}
                onChange={(e) => onParam(param.key, Number(e.target.value))}
                className="w-full accent-[#b8956e]"
              />
            </label>
          ))}

          {!!readings.length && (
            <ul className="space-y-2 border-t border-[#f5f0eb]/12 pt-4">
              {readings.map((reading, index) => (
                <li
                  key={index}
                  className={`font-sans text-[11px] leading-relaxed ${
                    reading.tone === 'breaks' ? 'text-[#b8956e]' : 'text-[#f5f0eb]/55'
                  }`}
                >
                  {/* Золотом — ровно те условия, которые разбор назвал местом
                      поломки. Это не ошибка ввода: сцена честно в них попала. */}
                  {reading.tone === 'breaks' && <span className="mr-1.5 uppercase tracking-[0.14em] text-[9px]">Breaks</span>}
                  {reading.text}
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-[#f5f0eb]/12 pt-4">
            <a
              href={`/bureau/${activeCase.slug}`}
              className="inline-flex items-center gap-1.5 font-sans text-[9px] uppercase tracking-[0.14em] text-[#f5f0eb]/50 hover:text-[#f5f0eb]"
            >
              Read the case <ArrowUpRight size={12} />
            </a>
            <button
              type="button"
              onClick={onBake}
              className="border border-[#f5f0eb]/20 px-3 py-1.5 font-sans text-[9px] uppercase tracking-[0.14em] text-[#f5f0eb]/70 hover:border-[#f5f0eb]/60 hover:text-[#f5f0eb]"
            >
              Bake into scene
            </button>
          </div>

          <p className="font-sans text-[10px] leading-relaxed text-[#f5f0eb]/30">
            The move is applied to your box, not reconstructed from the works in the case —
            their dimensions are not ours to state.
          </p>
        </div>
      )}
    </div>
  );
}
