import { useCallback, useState } from 'react';

/* БЛОК ПОДДЕРЖКИ ЖУРНАЛА, ОДИН НА ВЕСЬ САЙТ.
 *
 * Тот же блок уже жил в анкетах (src/pages/FormPage.tsx): свёрнут по
 * умолчанию, реквизиты появляются только если человек сам этого захотел,
 * у каждого способа своя кнопка копирования. Читатель статьи, дочитавший до
 * конца, — тот же адресат, что и автор, заполнивший анкету, поэтому это один
 * компонент, а не два похожих.
 *
 * Реквизиты встроены здесь же, а не запрашиваются с сервера: они меняются
 * реже, чем раз в год, а страница статьи не должна ждать лишний round-trip
 * ради строки, которую 9 читателей из 10 не развернут. Те же значения отданы
 * формам через server/forms.js — если реквизиты когда-нибудь поменяются,
 * поправить нужно в обоих местах, и это ровно то, чего исходный комментарий
 * в forms.js просил избежать «в одном месте, но не в файле, который отгружает
 * бэкенд, а не фронтенд».                                                    */
const SUPPORT_TEXT: Record<string, { free: string; invite: string; show: string; hide: string; copy: string; copied: string }> = {
  EN: { free: 'Publication in EPRIS Journal is free. We never charge authors or designers for being published.',
        invite: 'If you would like to support the journal, it helps us keep it independent:',
        show: 'Support the journal', hide: 'Hide details', copy: 'Copy', copied: 'Copied' },
  RU: { free: 'Публикация в EPRIS Journal бесплатна. Мы никогда не берём денег с авторов и дизайнеров за публикацию.',
        invite: 'Если захотите поддержать журнал, это помогает сохранять его независимым:',
        show: 'Поддержать журнал', hide: 'Свернуть', copy: 'Копировать', copied: 'Скопировано' },
  UA: { free: 'Публікація в EPRIS Journal безкоштовна. Ми ніколи не беремо грошей з авторів і дизайнерів за публікацію.',
        invite: 'Якщо захочете підтримати журнал, це допомагає зберігати його незалежним:',
        show: 'Підтримати журнал', hide: 'Згорнути', copy: 'Копіювати', copied: 'Скопійовано' },
  DE: { free: 'Die Veröffentlichung im EPRIS Journal ist kostenlos. Wir verlangen nie Geld von Autoren oder Designern für eine Veröffentlichung.',
        invite: 'Wenn Sie das Journal unterstützen möchten, hilft uns das, unabhängig zu bleiben:',
        show: 'Journal unterstützen', hide: 'Details ausblenden', copy: 'Kopieren', copied: 'Kopiert' },
  IT: { free: 'La pubblicazione su EPRIS Journal è gratuita. Non chiediamo mai denaro ad autori o designer per essere pubblicati.',
        invite: 'Se vuoi sostenere la rivista, ci aiuta a restare indipendenti:',
        show: 'Sostieni la rivista', hide: 'Nascondi dettagli', copy: 'Copia', copied: 'Copiato' },
  ES: { free: 'La publicación en EPRIS Journal es gratuita. Nunca cobramos a autores o diseñadores por ser publicados.',
        invite: 'Si deseas apoyar la revista, nos ayuda a mantenerla independiente:',
        show: 'Apoyar la revista', hide: 'Ocultar detalles', copy: 'Copiar', copied: 'Copiado' },
  TR: { free: 'EPRIS Journal\'da yayın ücretsizdir. Yazarlardan veya tasarımcılardan yayın için asla ücret almayız.',
        invite: 'Dergiyi desteklemek isterseniz, bağımsız kalmamıza yardımcı olur:',
        show: 'Dergiyi destekle', hide: 'Ayrıntıları gizle', copy: 'Kopyala', copied: 'Kopyalandı' },
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
      window.setTimeout(() => setCopied(''), 2000);
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
      <p className="font-serif text-[15px] font-medium leading-relaxed text-[rgb(var(--c-accent-rgb)_/_0.88)]">{t.free}</p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-3.5 inline-flex items-center gap-2 rounded-full border border-[rgb(var(--c-accent-rgb)_/_0.45)] px-5 py-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-[var(--c-accent)] transition-colors hover:bg-[var(--c-accent)] hover:text-[var(--c-bg)]"
      >
        {open ? t.hide : t.show}
      </button>
      {open && (
        <div className="mt-4">
          <p className="font-serif text-[14px] leading-relaxed text-[rgb(var(--c-accent-rgb)_/_0.55)]">{t.invite}</p>
          <dl className="mt-3 space-y-2">
            {SUPPORT_METHODS.map((method) => (
              <div key={method.label} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <dt className="min-w-[52px] font-mono text-[10px] uppercase tracking-[0.16em] text-[rgb(var(--c-accent-rgb)_/_0.45)]">{method.label}</dt>
                <dd id={`support-journal-${method.label}`} className="select-all font-mono text-[13px] text-[var(--c-accent)]">
                  {method.value}
                  {method.note && <span className="ml-2 text-[rgb(var(--c-accent-rgb)_/_0.45)]">{method.note}</span>}
                </dd>
                <button
                  type="button"
                  onClick={() => copyValue(method.label, method.value)}
                  className="rounded-full border border-[rgb(var(--c-accent-rgb)_/_0.22)] px-3 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--c-accent-rgb)_/_0.6)] transition-colors hover:border-[var(--c-accent)] hover:text-[var(--c-accent)]"
                >
                  {copied === method.label ? t.copied : t.copy}
                </button>
              </div>
            ))}
          </dl>
        </div>
      )}
    </aside>
  );
}
