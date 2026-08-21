import { useCallback, useState } from 'react';
import { Check, Copy, CreditCard, Landmark, Wallet } from 'lucide-react';

/* БЛОК ПОДДЕРЖКИ ЖУРНАЛА, ОДИН НА ВЕСЬ САЙТ.
 *
 * Используется и в конце статей/обзоров, и в анкетах (src/pages/FormPage.tsx)
 * — один компонент вместо двух похожих, чтобы вид и правки жили в одном
 * месте.
 *
 * Текст короткий и без объяснений про деньги: «мы не берём плату» звучало как
 * оправдание перед вопросом, которого никто не задавал. Читателю, дошедшему
 * до этого места, интересно одно — как поддержать, а не отчёт о том, что с
 * него не возьмут денег.
 *
 * Реквизиты встроены здесь же, а не запрашиваются с сервера: они меняются
 * реже раза в год, а страница статьи не должна ждать лишний round-trip ради
 * блока, который 9 читателей из 10 не развернут. Форма решает, показывать ли
 * блок вообще (см. FormPage — form.support), но не что в нём написано.
 *
 * Оформление — язык самого сайта (скруглённые карточки, мягкая тень, золотой
 * акцент на интерактиве), не брутalist-моно панели: это два разных места с
 * разным голосом, они и не должны выглядеть одинаково.                      */
const SUPPORT_TEXT: Record<string, { show: string; hide: string; invite: string; copy: string; copied: string; qr: string }> = {
  EN: { show: 'Support the journal', hide: 'Hide', invite: 'A few ways to support us', copy: 'Copy', copied: 'Copied', qr: 'Scan with PayPal' },
  RU: { show: 'Поддержать журнал', hide: 'Свернуть', invite: 'Несколько способов поддержать нас', copy: 'Копировать', copied: 'Скопировано', qr: 'Сканируйте в PayPal' },
  UA: { show: 'Підтримати журнал', hide: 'Згорнути', invite: 'Кілька способів підтримати нас', copy: 'Копіювати', copied: 'Скопійовано', qr: 'Скануйте у PayPal' },
  DE: { show: 'Journal unterstützen', hide: 'Ausblenden', invite: 'Ein paar Wege, uns zu unterstützen', copy: 'Kopieren', copied: 'Kopiert', qr: 'Mit PayPal scannen' },
  IT: { show: 'Sostieni la rivista', hide: 'Nascondi', invite: 'Alcuni modi per sostenerci', copy: 'Copia', copied: 'Copiato', qr: 'Scansiona con PayPal' },
  ES: { show: 'Apoyar la revista', hide: 'Ocultar', invite: 'Algunas formas de apoyarnos', copy: 'Copiar', copied: 'Copiado', qr: 'Escanea con PayPal' },
  TR: { show: 'Dergiyi destekle', hide: 'Gizle', invite: 'Bizi desteklemenin birkaç yolu', copy: 'Kopyala', copied: 'Kopyalandı', qr: "PayPal ile tara" },
};

const SUPPORT_METHODS: { label: string; value: string; note?: string; icon: typeof Wallet }[] = [
  { label: 'PayPal', value: 'munister@outlook.com', icon: Wallet },
  { label: 'Card', value: '4149 5100 2837 6350', note: 'MUNISTER VIACHESLAV', icon: CreditCard },
  { label: 'IBAN', value: 'UA733003350000002620715221312', icon: Landmark },
];

/* QR-код PayPal — сознательно пусто. Ссылка paypal.me/<логин> выбирается
   человеком в самом PayPal и не выводится из email никакой формулой;
   нарисовать QR наугад значит рискнуть чужими деньгами, если строка
   окажется чужим настоящим логином. Как только появится точный URL —
   он подставляется сюда, и карточка PayPal сама отрисует код рядом с
   реквизитом, ничего больше менять не придётся. */
const PAYPAL_QR_URL: string | null = null;

export function SupportJournal({ lang = 'EN', className = '' }: { lang?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState('');
  const t = SUPPORT_TEXT[String(lang || 'EN').toUpperCase()] || SUPPORT_TEXT.EN;

  const copyValue = useCallback(async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(''), 1800);
    } catch {
      // Буфер недоступен — выделяем текст, чтобы человек скопировал вручную.
      const node = document.getElementById(`support-journal-${label}`);
      if (node) {
        const range = document.createRange();
        range.selectNodeContents(node);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  }, []);

  return (
    <aside className={`border-t border-[rgb(var(--c-accent-rgb)_/_0.14)] pt-7 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group inline-flex items-center gap-2.5 rounded-full border border-[rgb(var(--c-accent-rgb)_/_0.2)] bg-[rgb(var(--c-gold-rgb)_/_0.07)] py-2.5 pl-4 pr-5 font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-[var(--c-accent)] transition-colors hover:border-[var(--c-gold)] hover:bg-[rgb(var(--c-gold-rgb)_/_0.14)]"
      >
        <span aria-hidden="true" className="text-[13px] leading-none text-[var(--c-gold)]">♥</span>
        {open ? t.hide : t.show}
      </button>
      {open && (
        <div className="mt-5 max-w-md">
          <p className="font-serif text-[15px] leading-relaxed text-[rgb(var(--c-accent-rgb)_/_0.62)]">{t.invite}</p>
          <div className="mt-4 grid gap-2.5">
            {SUPPORT_METHODS.map((method) => {
              const Icon = method.icon;
              const isCopied = copied === method.label;
              const showQr = method.label === 'PayPal' && PAYPAL_QR_URL;
              return (
                <div
                  key={method.label}
                  className="flex items-center gap-3.5 rounded-2xl border border-[rgb(var(--c-accent-rgb)_/_0.12)] bg-[rgb(var(--c-gold-rgb)_/_0.045)] p-3.5 transition-colors hover:border-[rgb(var(--c-gold-rgb)_/_0.4)]"
                >
                  {showQr ? (
                    <img src={PAYPAL_QR_URL} alt={t.qr} width={44} height={44} className="h-11 w-11 shrink-0 rounded-lg border border-[rgb(var(--c-accent-rgb)_/_0.14)] bg-white object-contain p-1" />
                  ) : (
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--c-gold-rgb)_/_0.14)] text-[var(--c-gold)]">
                      <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[rgb(var(--c-accent-rgb)_/_0.48)]">{method.label}</p>
                    <p id={`support-journal-${method.label}`} className="mt-0.5 select-all truncate font-mono text-[13px] text-[var(--c-accent)]">
                      {method.value}
                    </p>
                    {method.note && (
                      <p className="mt-0.5 font-mono text-[9.5px] uppercase tracking-[0.08em] text-[rgb(var(--c-accent-rgb)_/_0.4)]">{method.note}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => copyValue(method.label, method.value)}
                    aria-label={isCopied ? t.copied : t.copy}
                    title={isCopied ? t.copied : t.copy}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      isCopied
                        ? 'border-[var(--c-gold)] bg-[var(--c-gold)] text-[var(--c-bg)]'
                        : 'border-[rgb(var(--c-accent-rgb)_/_0.18)] text-[rgb(var(--c-accent-rgb)_/_0.55)] hover:border-[var(--c-gold)] hover:text-[var(--c-gold)]'
                    }`}
                  >
                    {isCopied ? <Check size={15} strokeWidth={2} aria-hidden="true" /> : <Copy size={14} strokeWidth={1.75} aria-hidden="true" />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
