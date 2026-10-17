/* PATRON PLAQUE – the donor label on the About page, right under the journal's
 * introduction and above the team.
 *
 * Designed as a museum wall label, not a banner: a warm paper panel, four gold
 * corner marks, a hairline rule with one diamond, a mono-caps kicker and the
 * name in the display serif. Upright type only – no italics – so it sits in the
 * same quiet register as the intro paragraph above it.
 *
 * The copy lives here, not in site-content.json: it is one short block that
 * does not change per edition (same call as SupportJournal). The name is not
 * translated; the kicker and the thank-you line are.                          */
const PATRON_NAME = 'Vlad Bondarenko';

const PATRON_TEXT: Record<string, { kicker: string; line: string }> = {
  EN: { kicker: 'Patron of the journal', line: 'Independent publishing exists because someone chooses to stand behind it. Thank you.' },
  RU: { kicker: 'Покровитель журнала', line: 'Независимое издание существует, потому что кто-то решает его поддержать. Спасибо.' },
  UA: { kicker: 'Покровитель журналу', line: 'Незалежне видання існує, бо хтось вирішує його підтримати. Дякуємо.' },
  DE: { kicker: 'Förderer des Journals', line: 'Unabhängiges Publizieren gibt es nur, weil sich jemand dafür einsetzt. Danke.' },
  IT: { kicker: 'Mecenate della rivista', line: "L'editoria indipendente esiste perché qualcuno sceglie di sostenerla. Grazie." },
  ES: { kicker: 'Mecenas de la revista', line: 'La edición independiente existe porque alguien decide respaldarla. Gracias.' },
  FR: { kicker: 'Mécène du journal', line: "L'édition indépendante existe parce que quelqu'un choisit de la soutenir. Merci." },
  TR: { kicker: 'Derginin hamisi', line: 'Bağımsız yayıncılık, birinin arkasında durmayı seçmesiyle var olur. Teşekkürler.' },
};

const CORNER = 'absolute w-[18px] h-[18px] border-[var(--c-gold)] pointer-events-none';

export function PatronPlaque({ lang = 'EN' }: { lang?: string }) {
  const t = PATRON_TEXT[String(lang || 'EN').toUpperCase()] || PATRON_TEXT.EN;
  return (
    <figure
      className="relative mx-auto max-w-[520px] px-8 sm:px-10 py-9 sm:py-10 text-center"
      style={{ background: 'color-mix(in srgb, var(--c-gold) 9%, var(--c-bg))' }}
    >
      <span aria-hidden="true" className={`${CORNER} top-2.5 left-2.5 border-t border-l`} />
      <span aria-hidden="true" className={`${CORNER} top-2.5 right-2.5 border-t border-r`} />
      <span aria-hidden="true" className={`${CORNER} bottom-2.5 left-2.5 border-b border-l`} />
      <span aria-hidden="true" className={`${CORNER} bottom-2.5 right-2.5 border-b border-r`} />

      <div aria-hidden="true" className="flex items-center justify-center gap-3.5 mb-4 text-[var(--c-gold)]">
        <i className="block h-px w-14 sm:w-16" style={{ background: 'linear-gradient(90deg, transparent, var(--c-gold))' }} />
        <b className="text-[9px] font-normal leading-none">◆</b>
        <i className="block h-px w-14 sm:w-16" style={{ background: 'linear-gradient(270deg, transparent, var(--c-gold))' }} />
      </div>
      <figcaption className="font-mono text-[11px] uppercase tracking-[0.22em] mb-3" style={{ color: 'color-mix(in srgb, var(--c-gold) 78%, var(--c-accent))' }}>
        {t.kicker}
      </figcaption>
      <p className="font-serif not-italic text-4xl sm:text-[42px] leading-[1.1] tracking-tight text-[var(--c-accent)] mb-3">{PATRON_NAME}</p>
      <p className="font-serif not-italic text-base sm:text-lg leading-relaxed mx-auto max-w-[22rem] text-[rgb(var(--c-accent-rgb)_/_0.7)]" style={{ textWrap: 'balance' }}>{t.line}</p>
    </figure>
  );
}
