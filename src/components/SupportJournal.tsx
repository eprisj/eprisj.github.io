import { useCallback, useState } from 'react';
import { Check, Copy, CreditCard, Landmark, QrCode, Wallet } from 'lucide-react';
import QRCode from 'qrcode';

/* БЛОК ПОДДЕРЖКИ ЖУРНАЛА, ОДИН НА ВЕСЬ САЙТ.
 *
 * Используется и в конце статей/обзоров, и в анкетах (src/pages/FormPage.tsx)
 * — один компонент вместо двух похожих, чтобы вид и правки жили в одном
 * месте.
 *
 * ВТОРОЙ ЗАХОД. Первая версия пряталась за кнопкой «Support the journal»:
 * гость должен был сам догадаться щёлкнуть неприметную строку, а раскрытый
 * вид оказывался тремя высокими карточками одна под другой — реквизиты,
 * которые нужны на десять секунд, занимали пол-экрана. И заметный вариант
 * для анкет (emphasized), который решал это золотой рамкой и заглавными
 * буквами, читался ещё хуже — отдельным, более громким языком поверх и так
 * тяжёлого списка.
 *
 * Развязка — не «спрятать» и не «раскрасить», а сделать блок настолько
 * компактным, что прятать не от чего: один баннер, всегда на виду, способы
 * оплаты — узкие плашки в ряд, а не карточки в столбик. Реквизит виден сразу
 * (это и есть «удобно» — скопировать одним касанием, не разворачивая ничего
 * заранее), но каждая плашка выше пальца едва на пару миллиметров.
 *
 * Текст короткий и без объяснений про деньги: «мы не берём плату» звучало как
 * оправдание перед вопросом, которого никто не задавал.
 *
 * Реквизиты встроены здесь же, а не запрашиваются с сервера: они меняются
 * реже раза в год, а страница статьи не должна ждать лишний round-trip ради
 * блока, который открывает не каждый читатель. Форма решает, показывать ли
 * блок вообще (см. FormPage — form.support), но не что в нём написано.       */
const SUPPORT_TEXT: Record<string, { lead: string; copy: string; copied: string; qr: string }> = {
  EN: { lead: "If our work here means something to you, we'd be grateful for your support.", copy: 'Copy', copied: 'Copied', qr: 'Scan with PayPal' },
  RU: { lead: 'Если наша работа что-то значит для вас, мы будем признательны за поддержку.', copy: 'Копировать', copied: 'Скопировано', qr: 'Сканируйте в PayPal' },
  UA: { lead: 'Якщо наша робота щось для вас важить, ми будемо вдячні за підтримку.', copy: 'Копіювати', copied: 'Скопійовано', qr: 'Скануйте у PayPal' },
  DE: { lead: 'Wenn Ihnen unsere Arbeit hier etwas bedeutet, wären wir für Ihre Unterstützung dankbar.', copy: 'Kopieren', copied: 'Kopiert', qr: 'Mit PayPal scannen' },
  IT: { lead: 'Se il nostro lavoro qui significa qualcosa per te, ti saremmo grati per il tuo sostegno.', copy: 'Copia', copied: 'Copiato', qr: 'Scansiona con PayPal' },
  ES: { lead: 'Si nuestro trabajo aquí significa algo para ti, te agradeceríamos tu apoyo.', copy: 'Copiar', copied: 'Copiado', qr: 'Escanea con PayPal' },
  TR: { lead: 'Buradaki çalışmamız sizin için bir anlam ifade ediyorsa, desteğiniz için minnettar oluruz.', copy: 'Kopyala', copied: 'Kopyalandı', qr: "PayPal ile tara" },
};

const SUPPORT_METHODS: { label: string; value: string; icon: typeof Wallet }[] = [
  { label: 'PayPal', value: 'munister@outlook.com', icon: Wallet },
  { label: 'Card', value: '4149 5100 2837 6350', icon: CreditCard },
  { label: 'IBAN', value: 'UA733003350000002620715221312', icon: Landmark },
];

/* Настоящая ссылка PayPal (не придуманная — подтверждена сканированием
   собственного QR-кода PayPal пользователем и проверкой ответа сервера).
   QR рисуется на лету тем же пакетом qrcode, что уже используется для
   паспортов (src/pages/passport/passportRender.ts), а не хранится готовой
   картинкой — так ссылку видно прямо в коде и легко сменить одной строкой. */
const PAYPAL_QR_TARGET = 'https://www.paypal.com/qrcodes/p2pqrc/UW4J64QUNFVUQ';

export function SupportJournal({ lang = 'EN', className = '' }: { lang?: string; className?: string }) {
  const [copied, setCopied] = useState('');
  const [qrOpen, setQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const t = SUPPORT_TEXT[String(lang || 'EN').toUpperCase()] || SUPPORT_TEXT.EN;

  const toggleQr = useCallback(async () => {
    setQrOpen((v) => !v);
    if (!qrDataUrl) {
      try {
        const dataUrl = await QRCode.toDataURL(PAYPAL_QR_TARGET, { margin: 1, width: 320 });
        setQrDataUrl(dataUrl);
      } catch {
        // QR не сгенерировался — ссылка всё равно доступна копированием ниже.
      }
    }
  }, [qrDataUrl]);

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
    <aside
      className={`rounded-2xl border border-[rgb(var(--c-accent-rgb)_/_0.14)] bg-[rgb(var(--c-gold-rgb)_/_0.055)] px-5 py-5 sm:px-6 sm:py-5 ${className}`}
    >
      <p className="max-w-[42ch] font-serif text-[19px] font-bold leading-[1.22] tracking-[-0.01em] text-[var(--c-accent)]">
        {t.lead}
      </p>
      {/* Реквизиты читаются прямо на странице, без наведения и без клика —
          скопировать по-прежнему можно одним касанием, но сперва человек
          должен УВИДЕТЬ значение, а не искать его в title-тултипе. Поэтому
          каждый способ — строка на всю ширину: подпись слева, само значение
          моноширинным шрифтом рядом, кнопка копирования справа. */}
      <div className="mt-4 flex flex-col gap-2">
        {SUPPORT_METHODS.map((method) => {
          const Icon = method.icon;
          const isCopied = copied === method.label;
          const isPaypal = method.label === 'PayPal';
          return (
            <div key={method.label} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => copyValue(method.label, method.value)}
                id={`support-journal-${method.label}`}
                title={isCopied ? t.copied : t.copy}
                className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border py-2.5 px-3.5 text-left transition-colors sm:gap-3 ${
                  isCopied
                    ? 'border-[var(--c-gold)] bg-[rgb(var(--c-gold-rgb)_/_0.16)]'
                    : 'border-[rgb(var(--c-accent-rgb)_/_0.14)] bg-[rgb(255_255_255_/_0.5)] hover:border-[var(--c-gold)]'
                }`}
              >
                <Icon size={14} strokeWidth={2} className="shrink-0 text-[var(--c-gold)]" aria-hidden="true" />
                <span className="w-[46px] shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-[rgb(var(--c-accent-rgb)_/_0.55)] sm:w-[52px]">
                  {method.label}
                </span>
                <span className="min-w-0 flex-1 break-all font-mono text-[12.5px] font-semibold leading-snug text-[var(--c-accent)] sm:text-[13.5px]">
                  {method.value}
                </span>
                {isCopied ? (
                  <span className="flex shrink-0 items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--c-gold)]">
                    <Check size={12} strokeWidth={2.5} aria-hidden="true" />
                    {t.copied}
                  </span>
                ) : (
                  <Copy size={13} strokeWidth={2} className="shrink-0 text-[rgb(var(--c-accent-rgb)_/_0.4)]" aria-hidden="true" />
                )}
              </button>
              {isPaypal && (
                <button
                  type="button"
                  onClick={toggleQr}
                  aria-label={t.qr}
                  title={t.qr}
                  aria-expanded={qrOpen}
                  className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl border transition-colors ${
                    qrOpen
                      ? 'border-[var(--c-gold)] bg-[var(--c-gold)] text-white'
                      : 'border-[rgb(var(--c-accent-rgb)_/_0.14)] bg-[rgb(255_255_255_/_0.5)] text-[rgb(var(--c-accent-rgb)_/_0.55)] hover:border-[var(--c-gold)] hover:text-[var(--c-gold)]'
                  }`}
                >
                  <QrCode size={15} strokeWidth={2.2} aria-hidden="true" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {qrOpen && (
        <div className="mt-4 flex flex-col items-start gap-2">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={t.qr}
              width={132}
              height={132}
              className="h-[132px] w-[132px] rounded-xl border border-[rgb(var(--c-accent-rgb)_/_0.24)] bg-white p-1.5"
            />
          ) : (
            <div className="flex h-[132px] w-[132px] items-center justify-center rounded-xl border border-[rgb(var(--c-accent-rgb)_/_0.24)] bg-white/40">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--c-gold)] border-t-transparent" aria-hidden="true" />
            </div>
          )}
          <p className="font-mono text-[9.5px] font-bold uppercase tracking-[0.1em] text-[rgb(var(--c-accent-rgb)_/_0.55)]">{t.qr}</p>
        </div>
      )}
    </aside>
  );
}
