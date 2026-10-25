import { ExternalLink } from 'lucide-react';

/* БЛОК ПОДДЕРЖКИ ЖУРНАЛА, ОДИН НА ВЕСЬ САЙТ.
 *
 * Используется и в конце статей/обзоров, и в анкетах (src/pages/FormPage.tsx),
 * и на странице выпуска – один компонент, чтобы вид и правки жили в одном месте.
 *
 * ТРЕТИЙ ЗАХОД. Раньше тут были два чёрных баннера со словами про суммы и
 * подписки и столбик реквизитов PayPal с копированием и QR – много текста ради
 * того, что читателю нужно одно: нажать на знакомый логотип. Теперь фраза-обращение
 * и три настоящих логотипа в ряд – Patreon, Ko-fi, PayPal. Логотипы
 * не нарисованные, а контуры из набора simple-icons (CC0), в фирменных цветах
 * сервисов: так их узнают с первого взгляда, как на любом нормальном баннере.
 *
 * Что убрано и почему: почта PayPal и QR-код (достаточно ссылки paypal.me,
 * она открывает тот же платёж), подписи «от $3» и «любая сумма» (всё это
 * читатель увидит на странице сервиса).                                    */
const SUPPORT_TITLE: Record<string, string> = {
  EN: "If our work here means something to you, we'd be grateful for your support.",
  RU: 'Если наша работа что-то значит для вас, мы будем признательны за поддержку.',
  UA: 'Якщо наша робота щось для вас важить, ми будемо вдячні за підтримку.',
  DE: 'Wenn Ihnen unsere Arbeit hier etwas bedeutet, wären wir für Ihre Unterstützung dankbar.',
  IT: 'Se il nostro lavoro qui significa qualcosa per te, ti saremmo grati per il tuo sostegno.',
  ES: 'Si nuestro trabajo aquí significa algo para ti, te agradeceríamos tu apoyo.',
  FR: 'Si notre travail compte pour vous, nous vous serions reconnaissants de votre soutien.',
  TR: 'Buradaki çalışmamız sizin için bir anlam ifade ediyorsa, desteğiniz için minnettar oluruz.',
};

const PATREON_URL = 'https://www.patreon.com/epris';
const KOFI_URL = 'https://ko-fi.com/epris';
const PAYPAL_URL = 'https://paypal.me/ViacheslavMunister';

const BRANDS: { name: string; url: string; color: string; path: string }[] = [
  {
    name: 'Patreon',
    url: PATREON_URL,
    color: '#FF424D',
    path: 'M22.957 7.21c-.004-3.064-2.391-5.576-5.191-6.482-3.478-1.125-8.064-.962-11.384.604C2.357 3.231 1.093 7.391 1.046 11.54c-.039 3.411.302 12.396 5.369 12.46 3.765.047 4.326-4.804 6.068-7.141 1.24-1.662 2.836-2.132 4.801-2.618 3.376-.836 5.678-3.501 5.673-7.031Z',
  },
  {
    name: 'Ko-fi',
    url: KOFI_URL,
    color: '#FF5E5B',
    path: 'M11.351 2.715c-2.7 0-4.986.025-6.83.26C2.078 3.285 0 5.154 0 8.61c0 3.506.182 6.13 1.585 8.493 1.584 2.701 4.233 4.182 7.662 4.182h.83c4.209 0 6.494-2.234 7.637-4a9.5 9.5 0 0 0 1.091-2.338C21.792 14.688 24 12.22 24 9.208v-.415c0-3.247-2.13-5.507-5.792-5.87-1.558-.156-2.65-.208-6.857-.208m0 1.947c4.208 0 5.09.052 6.571.182 2.624.311 4.13 1.584 4.13 4v.39c0 2.156-1.792 3.844-3.87 3.844h-.935l-.156.649c-.208 1.013-.597 1.818-1.039 2.546-.909 1.428-2.545 3.064-5.922 3.064h-.805c-2.571 0-4.831-.883-6.078-3.195-1.09-2-1.298-4.155-1.298-7.506 0-2.181.857-3.402 3.012-3.714 1.533-.233 3.559-.26 6.39-.26m6.547 2.287c-.416 0-.65.234-.65.546v2.935c0 .311.234.545.65.545 1.324 0 2.051-.754 2.051-2s-.727-2.026-2.052-2.026m-10.39.182c-1.818 0-3.013 1.48-3.013 3.142 0 1.533.858 2.857 1.949 3.897.727.701 1.87 1.429 2.649 1.896a1.47 1.47 0 0 0 1.507 0c.78-.467 1.922-1.195 2.623-1.896 1.117-1.039 1.974-2.364 1.974-3.897 0-1.662-1.247-3.142-3.039-3.142-1.065 0-1.792.545-2.338 1.298-.493-.753-1.246-1.298-2.312-1.298',
  },
  {
    name: 'PayPal',
    url: PAYPAL_URL,
    color: '#003087',
    path: 'M7.016 19.198h-4.2a.562.562 0 0 1-.555-.65L5.093.584A.692.692 0 0 1 5.776 0h7.222c3.417 0 5.904 2.488 5.846 5.5-.006.25-.027.5-.066.747A6.794 6.794 0 0 1 12.071 12H8.743a.69.69 0 0 0-.682.583l-.325 2.056-.013.083-.692 4.39-.015.087zM19.79 6.142c-.01.087-.01.175-.023.261a7.76 7.76 0 0 1-7.695 6.598H9.007l-.283 1.795-.013.083-.692 4.39-.134.843-.014.088H6.86l-.497 3.15a.562.562 0 0 0 .555.65h3.612c.34 0 .63-.249.683-.585l.952-6.031a.692.692 0 0 1 .683-.584h2.126a6.793 6.793 0 0 0 6.707-5.752c.306-1.95-.466-3.744-1.89-4.906z',
  },
];

export function SupportJournal({ lang = 'EN', className = '' }: { lang?: string; className?: string }) {
  const title = SUPPORT_TITLE[String(lang || 'EN').toUpperCase()] || SUPPORT_TITLE.EN;
  return (
    <aside
      className={`rounded-2xl border border-[rgb(var(--c-accent-rgb)_/_0.14)] bg-[rgb(var(--c-gold-rgb)_/_0.055)] px-5 py-5 sm:px-6 sm:py-6 ${className}`}
    >
      <p className="max-w-[44ch] font-serif text-[20px] font-bold leading-[1.22] tracking-[-0.01em] text-[var(--c-accent)] sm:text-[22px]">{title}</p>
      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {BRANDS.map((brand) => (
          <a
            key={brand.name}
            href={brand.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 rounded-xl border border-[rgb(var(--c-accent-rgb)_/_0.14)] bg-white px-4 py-3.5 transition-all hover:-translate-y-0.5 hover:border-[rgb(var(--c-accent-rgb)_/_0.35)] hover:shadow-[0_6px_18px_rgba(0,0,0,0.07)]"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill={brand.color} aria-hidden="true" focusable="false" className="shrink-0">
              <path d={brand.path} />
            </svg>
            <span className="min-w-0 flex-1 font-serif text-[18px] font-bold leading-none tracking-[-0.01em] text-[#111111]">{brand.name}</span>
            <ExternalLink size={15} strokeWidth={1.8} className="shrink-0 text-[rgb(var(--c-accent-rgb)_/_0.3)] transition-colors group-hover:text-[var(--c-accent)]" aria-hidden="true" />
          </a>
        ))}
      </div>
    </aside>
  );
}
