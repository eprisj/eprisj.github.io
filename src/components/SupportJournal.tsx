import { useCallback, useState } from 'react';

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
 * строки, которую 9 читателей из 10 не развернут. Форма решает, показывать ли
 * блок вообще (см. FormPage — form.support), но не что в нём написано.       */
const SUPPORT_TEXT: Record<string, { show: string; hide: string; invite: string; copy: string; copied: string }> = {
  EN: { show: 'Support the journal', hide: 'Hide', invite: 'A few ways to support us:', copy: 'Copy', copied: 'Copied' },
  RU: { show: 'Поддержать журнал', hide: 'Свернуть', invite: 'Несколько способов поддержать нас:', copy: 'Копировать', copied: 'Скопировано' },
  UA: { show: 'Підтримати журнал', hide: 'Згорнути', invite: 'Кілька способів підтримати нас:', copy: 'Копіювати', copied: 'Скопійовано' },
  DE: { show: 'Journal unterstützen', hide: 'Ausblenden', invite: 'Ein paar Wege, uns zu unterstützen:', copy: 'Kopieren', copied: 'Kopiert' },
  IT: { show: 'Sostieni la rivista', hide: 'Nascondi', invite: 'Alcuni modi per sostenerci:', copy: 'Copia', copied: 'Copiato' },
  ES: { show: 'Apoyar la revista', hide: 'Ocultar', invite: 'Algunas formas de apoyarnos:', copy: 'Copiar', copied: 'Copiado' },
  TR: { show: 'Dergiyi destekle', hide: 'Gizle', invite: 'Bizi desteklemenin birkaç yolu:', copy: 'Kopyala', copied: 'Kopyalandı' },
};

const SUPPORT_METHODS: { label: string; value: string; note?: string }[] = [
  { label: 'PayPal', value: 'munister@outlook.com' },
  { label: 'Card', value: '4149 5100 2837 6350', note: 'MUNISTER VIACHESLAV' },
  { label: 'IBAN', value: 'UA733003350000002620715221312' },
];

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
    <aside className={`border-t border-[rgb(var(--c-accent-rgb)_/_0.18)] pt-6 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--c-accent-rgb)_/_0.45)] px-5 py-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-[var(--c-accent)] transition-colors hover:bg-[var(--c-accent)] hover:text-[var(--c-bg)]"
      >
        {open ? t.hide : t.show}
      </button>
      {open && (
        <div className="mt-5">
          <p className="font-serif text-[14px] leading-relaxed text-[rgb(var(--c-accent-rgb)_/_0.55)]">{t.invite}</p>
          {/* Каждый способ — своя карточка с фиксированной структурой: лейбл и
              кнопка копирования всегда на одной строке сверху, значение —
              отдельной строкой во всю ширину под ней. Раньше всё стояло в один
              резиновый ряд (flex-wrap), и на узком экране «Copy» у карты
              падал под подпись держателя, а у IBAN улетал на отдельную строку
              без выравнивания. Здесь переносится только значение — то, что и
              должно переноситься, — а не расположение кнопки. */}
          <div className="mt-3 divide-y divide-[rgb(var(--c-accent-rgb)_/_0.1)]">
            {SUPPORT_METHODS.map((method) => (
              <div key={method.label} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[rgb(var(--c-accent-rgb)_/_0.45)]">{method.label}</p>
                  <p id={`support-journal-${method.label}`} className="mt-1 select-all break-all font-mono text-[13px] text-[var(--c-accent)]">
                    {method.value}
                  </p>
                  {method.note && (
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[rgb(var(--c-accent-rgb)_/_0.4)]">{method.note}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => copyValue(method.label, method.value)}
                  className="shrink-0 rounded-full border border-[rgb(var(--c-accent-rgb)_/_0.22)] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--c-accent-rgb)_/_0.6)] transition-colors hover:border-[var(--c-accent)] hover:text-[var(--c-accent)]"
                >
                  {copied === method.label ? t.copied : t.copy}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
