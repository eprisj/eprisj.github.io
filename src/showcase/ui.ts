/* Один набор кнопок на витрину и бюро.
 *
 * Раньше каждая кнопка описывалась инлайном на месте, и их набралось около
 * тридцати в трёх несовместимых стилях: пилюли в модалках, прямоугольники в
 * атласе, заливки в шапке. Отличались не только формы — у части не было
 * focus-visible, у части высота падала ниже 44px.
 *
 * Отсюда два измерения: роль (solid / ghost / quiet) и фон, на котором кнопка
 * стоит (ink — тёмный, bone — светлый). Фон приходится задавать явно: одни и
 * те же секции переворачиваются с тёмного на светлое, и вывести его из
 * контекста нельзя.
 */

type Tone = 'ink' | 'bone';

const BASE = 'inline-flex min-h-12 items-center justify-center gap-2.5 px-5 font-sans text-[10px] uppercase tracking-[0.16em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';

/** Основное действие секции. На секцию — одно. */
export function btnSolid(tone: Tone = 'bone') {
  return tone === 'bone'
    ? `${BASE} bg-[#1a0b10] text-[#f5f0eb] hover:bg-[#4a1728] focus-visible:outline-[#4a1728]`
    : `${BASE} bg-[#f5f0eb] text-[#1a0b10] hover:bg-[#d7b46a] focus-visible:outline-[#d7b46a]`;
}

/** Равноправная альтернатива рядом с основным действием. */
export function btnGhost(tone: Tone = 'bone') {
  return tone === 'bone'
    ? `${BASE} border border-[#1a0b10]/20 text-[#1a0b10] hover:border-[#1a0b10]/50 focus-visible:outline-[#4a1728]`
    : `${BASE} border border-[#f5f0eb]/24 text-[#f5f0eb]/85 hover:border-[#d7b46a] hover:text-[#f5f0eb] focus-visible:outline-[#d7b46a]`;
}

/** Второстепенный ход: назад, «ещё», ссылка в сторону. Без рамки. */
export function btnQuiet(tone: Tone = 'bone') {
  return tone === 'bone'
    ? `${BASE} px-0 text-[#4a1728]/65 hover:text-[#4a1728] focus-visible:outline-[#4a1728]`
    : `${BASE} px-0 text-[#f5f0eb]/60 hover:text-[#f5f0eb] focus-visible:outline-[#d7b46a]`;
}
