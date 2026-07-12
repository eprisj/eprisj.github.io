import type { CSSProperties } from 'react';
import type { PassportFields } from './passportRender';

function FieldRow({ en, fr, value, big }: { en: string; fr: string; value: string; big?: boolean }) {
  return (
    <div>
      <div className="font-mono text-[8px] sm:text-[9px] tracking-[0.15em] text-[var(--pp-burgundy)]/60 uppercase">
        {en} / {fr}
      </div>
      <div className={`font-crimson font-semibold text-[var(--pp-ink)] ${big ? 'text-lg sm:text-xl' : 'text-sm sm:text-base'}`}>
        {value || '—'}
      </div>
    </div>
  );
}

const WAVE_BG =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cpath d='M0 20 Q 30 0 60 20 T 120 20' stroke='%235a78a5' stroke-opacity='0.18' fill='none'/%3E%3Cpath d='M0 60 Q 30 40 60 60 T 120 60' stroke='%235a78a5' stroke-opacity='0.18' fill='none'/%3E%3Cpath d='M0 100 Q 30 80 60 100 T 120 100' stroke='%235a78a5' stroke-opacity='0.18' fill='none'/%3E%3C/svg%3E";

export function PassportPreview({
  fields,
  photoUrl,
  code,
  qrDataUrl,
}: {
  fields: PassportFields;
  photoUrl: string | null;
  code: string;
  qrDataUrl: string | null;
}) {
  return (
    <div
      className="relative w-full aspect-[3/2] sm:aspect-[16/10] overflow-hidden select-none"
      style={{
        '--pp-cream': '#f7f2ea',
        '--pp-burgundy': '#501a2c',
        '--pp-sand': '#c9a690',
        '--pp-ink': '#241016',
        backgroundImage: `linear-gradient(135deg, #f7f2ea, #efe6d8), url("${WAVE_BG}")`,
      } as CSSProperties}
    >
      <div className="absolute inset-[6px] sm:inset-2 border-2 border-[var(--pp-burgundy)]" />
      <div className="absolute inset-[10px] sm:inset-3.5 border border-[var(--pp-sand)]" />

      {/* microtext strips */}
      <div className="absolute top-2 sm:top-3 left-4 right-4 overflow-hidden whitespace-nowrap font-mono text-[6px] sm:text-[7px] tracking-[0.3em] text-[var(--pp-burgundy)]/30 pointer-events-none">
        {Array(6).fill('EPRIS JOURNAL • REVEAL THE INVISIBLE • DIGITAL MEMBER   ').join('')}
      </div>
      <div className="absolute bottom-2 sm:bottom-3 left-4 right-4 overflow-hidden whitespace-nowrap font-mono text-[6px] sm:text-[7px] tracking-[0.3em] text-[var(--pp-burgundy)]/30 pointer-events-none">
        {Array(6).fill('EPRIS JOURNAL • REVEAL THE INVISIBLE • DIGITAL MEMBER   ').join('')}
      </div>

      {/* diagonal watermark — always on, not a user toggle */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ transform: 'rotate(-12deg)' }}
      >
        <div className="text-center opacity-[0.1] text-[var(--pp-burgundy)] font-mono font-bold leading-tight text-2xl sm:text-4xl">
          FICTIONAL MEMBER ID
          <div className="text-lg sm:text-2xl mt-1">EPRIS JOURNAL SPECIMEN</div>
        </div>
      </div>

      <div className="relative h-full flex flex-col px-5 sm:px-9 pt-6 sm:pt-8 pb-4 sm:pb-6">
        <div>
          <div className="font-serif font-bold text-xl sm:text-3xl text-[var(--pp-burgundy)] tracking-tight">EPRIS JOURNAL</div>
          <div className="font-mono text-[8px] sm:text-[10px] tracking-[0.15em] text-[var(--pp-burgundy)]/75 mt-0.5">
            DIGITAL MEMBER PASSPORT · PASSEPORT NUMÉRIQUE DE MEMBRE
          </div>
          <div className="mt-2 sm:mt-3 bg-[var(--pp-burgundy)] text-[var(--pp-cream)] font-mono font-bold text-[7px] sm:text-[10px] tracking-[0.1em] text-center py-1.5 sm:py-2">
            NOT A GOVERNMENT DOCUMENT · FICTIONAL MEMBER ID · EPRIS JOURNAL ONLY
          </div>
        </div>

        <div className="flex-1 flex gap-4 sm:gap-8 mt-4 sm:mt-6 min-h-0">
          <div className="w-[26%] sm:w-[22%] flex-shrink-0">
            <div className="w-full aspect-[3/4] bg-white border-2 border-[var(--pp-burgundy)] flex items-center justify-center overflow-hidden">
              {photoUrl ? (
                <img src={photoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="font-crimson text-[10px] sm:text-xs text-[var(--pp-burgundy)]/40">PHOTO</span>
              )}
            </div>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-2 sm:gap-x-6 sm:gap-y-3 content-start overflow-hidden">
            <div className="col-span-2"><FieldRow en="Surname" fr="Nom" value={fields.surname.toUpperCase()} big /></div>
            <div className="col-span-2"><FieldRow en="Given Names" fr="Prénoms" value={fields.givenNames.toUpperCase()} big /></div>
            <FieldRow en="Member No." fr="N° d'adhérent" value={code} />
            <FieldRow en="Membership Type" fr="Type d'adhésion" value={fields.membershipType} />
            <FieldRow en="Country" fr="Pays" value={fields.country} />
            <FieldRow en="City" fr="Ville" value={fields.city} />
            <FieldRow en="Date of Birth" fr="Date de naissance" value={fields.dob} />
            <FieldRow en="Field" fr="Domaine" value={fields.field} />
            <FieldRow en="Issue Date" fr="Date d'émission" value={fields.issueDate} />
            <FieldRow en="Expiry Date" fr="Date d'expiration" value={fields.expiryDate} />
            <div className="col-span-2"><FieldRow en="Issuing Authority" fr="Autorité de délivrance" value="EPRIS JOURNAL" /></div>
          </div>

          <div className="hidden sm:flex flex-col items-center justify-start flex-shrink-0">
            {qrDataUrl && <img src={qrDataUrl} alt="verification QR" className="w-20 h-20 sm:w-24 sm:h-24 bg-white p-1" />}
            <div className="font-mono text-[6px] sm:text-[7px] tracking-widest text-[var(--pp-burgundy)]/70 mt-1 text-center">SCAN TO VERIFY</div>
          </div>
        </div>

        {fields.motto && (
          <div className="font-crimson italic text-[var(--pp-burgundy)] text-xs sm:text-base mt-2">“{fields.motto}”</div>
        )}
      </div>
    </div>
  );
}
