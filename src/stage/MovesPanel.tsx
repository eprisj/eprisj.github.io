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
    <details className="border-t border-[#f5f0eb]/12 pt-6">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-sans text-[9px] uppercase tracking-[0.16em] text-[#f5f0eb]/55 marker:hidden hover:text-[#f5f0eb]">
        Приёмы Бюро
        <span className="text-[#d7b46a]">Дополнительно</span>
      </summary>
      <div className="space-y-4 pt-4">
      <div>
        <p className="font-sans text-[10px] uppercase tracking-[0.16em] text-[#d7b46a]">Композиционные приёмы</p>
        <p className="mt-2 font-sans text-[13px] leading-relaxed text-[#f5f0eb]/55">Примените готовый принцип к своей сцене и сохраните его только после проверки.</p>
      </div>

      {/* Различаем два разных состояния. Раньше оба показывали «Bureau is
          unavailable», и при отданных запасных разборах страница одновременно
          показывала их и утверждала, что Бюро недоступно. */}
      {!cases.length && (
        <p className="font-sans text-[11px] text-[#f5f0eb]/40">Приёмы Бюро сейчас недоступны.</p>
      )}

      {cases.length > 0 && !playable.length && (
        <p className="font-sans text-[11px] text-[#f5f0eb]/40">
          Эти разборы пока можно только читать в Бюро: для них ещё нет готового сценария применения к вашему плану.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {playable.map((item) => {
          const isActive = item.slug === activeSlug;
          return (
            <button
              key={item.slug}
              type="button"
              onClick={() => onPick(isActive ? null : item.slug)}
              className={`min-h-11 border px-3 text-left font-sans text-[12px] lowercase transition-[border-color,background-color,color,transform] duration-200 active:scale-[0.99] ${
                isActive
                  ? 'border-[#d7b46a] bg-[#f5f0eb]/[0.08] text-[#f5f0eb]'
                  : 'border-[#f5f0eb]/15 bg-[#12090b]/40 text-[#f5f0eb]/60 hover:border-[#f5f0eb]/40 hover:bg-[#f5f0eb]/[0.04] hover:text-[#f5f0eb]/90'
              }`}
            >
              {item.title}
            </button>
          );
        })}
      </div>

      {activeCase && activeMove && (
          <div className="space-y-5 border-t border-[#f5f0eb]/12 pt-5">
          {activeCase.summary && (
            <p className="font-sans text-[13px] leading-[1.6] text-[#f5f0eb]/62">{activeCase.summary}</p>
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
                className="h-8 w-full accent-[#d7b46a]"
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

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f5f0eb]/12 pt-5">
            <a
              href={`/bureau/${activeCase.slug}`}
              className="inline-flex min-h-11 items-center gap-1.5 font-sans text-[9px] uppercase tracking-[0.14em] text-[#f5f0eb]/60 transition-colors hover:text-[#f5f0eb]"
            >
              Открыть разбор <ArrowUpRight size={12} />
            </a>
            <button
              type="button"
              onClick={onBake}
              className="min-h-11 border border-[#d7b46a]/50 bg-[#d7b46a] px-4 font-sans text-[9px] uppercase tracking-[0.14em] text-[#1a0b10] shadow-[0_10px_24px_rgba(0,0,0,.18)] transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:bg-[#f5f0eb] hover:shadow-[0_16px_30px_rgba(0,0,0,.25)] active:translate-y-0"
            >
              Сохранить в плане
            </button>
          </div>

          <p className="font-sans text-[10px] leading-relaxed text-[#f5f0eb]/30">
            Приём применяется к вашему плану; размеры чужих работ не копируются.
          </p>
        </div>
      )}
      </div>
    </details>
  );
}
