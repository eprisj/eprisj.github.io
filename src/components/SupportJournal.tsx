import { useCallback, useState } from 'react';
import { Check, Copy, CreditCard, Landmark, QrCode, Wallet } from 'lucide-react';
import QRCode from 'qrcode';

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
const SUPPORT_TEXT: Record<string, { lead: string; show: string; hide: string; invite: string; copy: string; copied: string; qr: string }> = {
  EN: { lead: "If our work here means something to you, we'd be grateful for your support.", show: 'Support the journal', hide: 'Hide', invite: 'A few ways to support us', copy: 'Copy', copied: 'Copied', qr: 'Scan with PayPal' },
  RU: { lead: 'Если наша работа что-то значит для вас, мы будем признательны за поддержку.', show: 'Поддержать журнал', hide: 'Свернуть', invite: 'Несколько способов поддержать нас', copy: 'Копировать', copied: 'Скопировано', qr: 'Сканируйте в PayPal' },
  UA: { lead: 'Якщо наша робота щось для вас важить, ми будемо вдячні за підтримку.', show: 'Підтримати журнал', hide: 'Згорнути', invite: 'Кілька способів підтримати нас', copy: 'Копіювати', copied: 'Скопійовано', qr: 'Скануйте у PayPal' },
  DE: { lead: 'Wenn Ihnen unsere Arbeit hier etwas bedeutet, wären wir für Ihre Unterstützung dankbar.', show: 'Journal unterstützen', hide: 'Ausblenden', invite: 'Ein paar Wege, uns zu unterstützen', copy: 'Kopieren', copied: 'Kopiert', qr: 'Mit PayPal scannen' },
  IT: { lead: 'Se il nostro lavoro qui significa qualcosa per te, ti saremmo grati per il tuo sostegno.', show: 'Sostieni la rivista', hide: 'Nascondi', invite: 'Alcuni modi per sostenerci', copy: 'Copia', copied: 'Copiato', qr: 'Scansiona con PayPal' },
  ES: { lead: 'Si nuestro trabajo aquí significa algo para ti, te agradeceríamos tu apoyo.', show: 'Apoyar la revista', hide: 'Ocultar', invite: 'Algunas formas de apoyarnos', copy: 'Copiar', copied: 'Copiado', qr: 'Escanea con PayPal' },
  TR: { lead: 'Buradaki çalışmamız sizin için bir anlam ifade ediyorsa, desteğiniz için minnettar oluruz.', show: 'Dergiyi destekle', hide: 'Gizle', invite: 'Bizi desteklemenin birkaç yolu', copy: 'Kopyala', copied: 'Kopyalandı', qr: "PayPal ile tara" },
};

const SUPPORT_METHODS: { label: string; value: string; note?: string; icon: typeof Wallet }[] = [
  { label: 'PayPal', value: 'munister@outlook.com', icon: Wallet },
  { label: 'Card', value: '4149 5100 2837 6350', note: 'MUNISTER VIACHESLAV', icon: CreditCard },
  { label: 'IBAN', value: 'UA733003350000002620715221312', icon: Landmark },
];

/* Настоящая ссылка PayPal (не придуманная — подтверждена сканированием
   собственного QR-кода PayPal пользователем и проверкой ответа сервера).
   QR рисуется на лету тем же пакетом qrcode, что уже используется для
   паспортов (src/pages/passport/passportRender.ts), а не хранится готовой
   картинкой — так ссылку видно прямо в коде и легко сменить одной строкой. */
const PAYPAL_QR_TARGET = 'https://www.paypal.com/qrcodes/p2pqrc/UW4J64QUNFVUQ';

export function SupportJournal({
  lang = 'EN',
  className = '',
  /* Формы анкет — единственное место, где читатель уже что-то отдал (полчаса
     на ответы) и стоит на пороге ухода со страницы: тут уместно не тихое
     подножие статьи, а заметный блок, раскрытый сразу, без клика «Support
     the journal» вслепую. Остальные места (статьи, обзоры) вызывают
     компонент без этого свойства и остаются как были. */
  emphasized = false,
}: { lang?: string; className?: string; emphasized?: boolean }) {
  const [open, setOpen] = useState(emphasized);
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
      className={
        emphasized
          ? `rounded-3xl border-2 border-[rgb(var(--c-gold-rgb)_/_0.35)] bg-[rgb(var(--c-gold-rgb)_/_0.07)] px-6 py-8 sm:px-9 sm:py-9 ${className}`
          : `border-t-2 border-[rgb(var(--c-accent-rgb)_/_0.18)] pt-7 ${className}`
      }
    >
      {/* Раньше кнопка была единственным сигналом - гость мог её не заметить,
          прочитав только заголовок иконки. Строка приглашения теперь видна
          всегда, не только при разворачивании, и говорит не «мы бесплатны»
          (оправдание перед незаданным вопросом), а прямое, тёплое приглашение. */}
      <p
        className={
          emphasized
            ? 'max-w-md font-serif text-[19px] font-medium leading-snug text-[var(--c-accent)]'
            : 'max-w-md font-serif text-[15px] italic leading-relaxed text-[rgb(var(--c-accent-rgb)_/_0.68)]'
        }
      >
        {t.lead}
      </p>
      {!emphasized && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="group mt-4 inline-flex items-center gap-3 rounded-full border border-[rgb(var(--c-gold-rgb)_/_0.4)] bg-[rgb(var(--c-gold-rgb)_/_0.12)] py-3 pl-[18px] pr-6 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--c-accent)] shadow-[0_1px_2px_rgb(var(--c-gold-rgb)_/_0.15)] transition-all hover:-translate-y-px hover:border-[var(--c-gold)] hover:bg-[rgb(var(--c-gold-rgb)_/_0.22)] hover:shadow-[0_4px_14px_rgb(var(--c-gold-rgb)_/_0.3)]"
        >
          <span aria-hidden="true" className="animate-[pulse_2.4s_ease-in-out_infinite] text-[16px] leading-none text-[var(--c-gold)]">♥</span>
          {open ? t.hide : t.show}
        </button>
      )}
      {open && (
        <div className="mt-5 max-w-md">
          {emphasized ? (
            <span className="inline-flex items-center gap-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--c-gold-rgb))]">
              <span aria-hidden="true" className="animate-[pulse_2.4s_ease-in-out_infinite] text-[18px] leading-none">♥</span>
              {t.invite}
            </span>
          ) : (
            <p className="font-serif text-[15px] font-medium leading-relaxed text-[rgb(var(--c-accent-rgb)_/_0.75)]">{t.invite}</p>
          )}
          {/* grid без явных колонок берёт auto-track, который сайзится по
              max-content детей - длинный IBAN внутри карточки растягивал
              трек шире родителя (max-w-md), и панель на телефоне вылезала
              вправо за пределы страничного паддинга до самого края экрана,
              хотя truncate на тексте должен был её обрезать - но обрезать
              нечему без ограниченной ширины трека. grid-cols-1 даёт треку
              minmax(0,1fr) вместо auto - теперь панель не шире родителя
              ни при каком тексте внутри. */}
          <div className="mt-4 grid grid-cols-1 gap-3">
            {SUPPORT_METHODS.map((method) => {
              const Icon = method.icon;
              const isCopied = copied === method.label;
              const isPaypal = method.label === 'PayPal';
              return (
                <div key={method.label}>
                  <div className="flex items-center gap-3.5 rounded-2xl border-[1.5px] border-[rgb(var(--c-accent-rgb)_/_0.2)] bg-[rgb(var(--c-gold-rgb)_/_0.08)] p-4 transition-colors hover:border-[var(--c-gold)]">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--c-gold-rgb)_/_0.2)] text-[var(--c-gold)]">
                      <Icon size={19} strokeWidth={2} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[rgb(var(--c-accent-rgb)_/_0.62)]">{method.label}</p>
                      <p id={`support-journal-${method.label}`} className="mt-0.5 select-all truncate font-mono text-[14px] font-bold text-[var(--c-accent)]">
                        {method.value}
                      </p>
                      {method.note && (
                        <p className="mt-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[rgb(var(--c-accent-rgb)_/_0.5)]">{method.note}</p>
                      )}
                    </div>
                    {isPaypal && (
                      <button
                        type="button"
                        onClick={toggleQr}
                        aria-label={t.qr}
                        title={t.qr}
                        aria-expanded={qrOpen}
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors ${
                          qrOpen
                            ? 'border-[var(--c-gold)] bg-[var(--c-gold)] text-[var(--c-bg)]'
                            : 'border-[rgb(var(--c-accent-rgb)_/_0.28)] text-[rgb(var(--c-accent-rgb)_/_0.65)] hover:border-[var(--c-gold)] hover:text-[var(--c-gold)]'
                        }`}
                      >
                        <QrCode size={15} strokeWidth={2} aria-hidden="true" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => copyValue(method.label, method.value)}
                      aria-label={isCopied ? t.copied : t.copy}
                      title={isCopied ? t.copied : t.copy}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors ${
                        isCopied
                          ? 'border-[var(--c-gold)] bg-[var(--c-gold)] text-[var(--c-bg)]'
                          : 'border-[rgb(var(--c-accent-rgb)_/_0.28)] text-[rgb(var(--c-accent-rgb)_/_0.65)] hover:border-[var(--c-gold)] hover:text-[var(--c-gold)]'
                      }`}
                    >
                      {isCopied ? <Check size={15} strokeWidth={2.5} aria-hidden="true" /> : <Copy size={14} strokeWidth={2} aria-hidden="true" />}
                    </button>
                  </div>
                  {isPaypal && qrOpen && (
                    <div className="mt-2.5 flex flex-col items-center gap-2 rounded-2xl border-[1.5px] border-[rgb(var(--c-accent-rgb)_/_0.2)] bg-[rgb(var(--c-gold-rgb)_/_0.08)] p-4">
                      {qrDataUrl ? (
                        <img
                          src={qrDataUrl}
                          alt={t.qr}
                          width={176}
                          height={176}
                          className="h-44 w-44 rounded-xl border-[1.5px] border-[rgb(var(--c-accent-rgb)_/_0.2)] bg-white p-2"
                        />
                      ) : (
                        <div className="flex h-44 w-44 items-center justify-center rounded-xl border-[1.5px] border-[rgb(var(--c-accent-rgb)_/_0.2)] bg-white/40">
                          <span className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--c-gold)] border-t-transparent" aria-hidden="true" />
                        </div>
                      )}
                      <p className="font-mono text-[9.5px] font-bold uppercase tracking-[0.1em] text-[rgb(var(--c-accent-rgb)_/_0.6)]">{t.qr}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
