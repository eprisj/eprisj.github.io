import type { CSSProperties, ReactNode } from 'react';
import type { PassportFields } from './passportRender';
import { generateSignatureString } from '../../lib/passportCode';

function FieldRow({ en, fr, value, big }: { en: string; fr: string; value: string; big?: boolean }) {
  return (
    <div>
      <div className="font-mono text-[7.5px] sm:text-[9px] tracking-[0.15em] text-[var(--pp-burgundy)]/60 uppercase">
        {en} / {fr}
      </div>
      <div className={`font-crimson font-semibold text-[var(--pp-ink)] ${big ? 'text-base sm:text-xl' : 'text-xs sm:text-base'}`}>
        {value || '—'}
      </div>
    </div>
  );
}

const WAVE_BG =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cpath d='M0 20 Q 30 0 60 20 T 120 20' stroke='%235a78a5' stroke-opacity='0.18' fill='none'/%3E%3Cpath d='M0 60 Q 30 40 60 60 T 120 60' stroke='%235a78a5' stroke-opacity='0.18' fill='none'/%3E%3Cpath d='M0 100 Q 30 80 60 100 T 120 100' stroke='%235a78a5' stroke-opacity='0.18' fill='none'/%3E%3C/svg%3E";

function PageShell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative flex-1 min-w-0 overflow-hidden select-none ${className}`}
      style={{
        '--pp-cream': '#f7f2ea',
        '--pp-burgundy': '#501a2c',
        '--pp-sand': '#c9a690',
        '--pp-ink': '#241016',
        backgroundImage: `linear-gradient(135deg, #f7f2ea, #efe6d8), url("${WAVE_BG}")`,
      } as CSSProperties}
    >
      <div className="absolute inset-[6px] sm:inset-2 border-2 border-[var(--pp-burgundy)] pointer-events-none" />
      <div className="absolute inset-[10px] sm:inset-3.5 border border-[var(--pp-sand)] pointer-events-none" />

      <div className="absolute top-2 sm:top-3 left-4 right-4 overflow-hidden whitespace-nowrap font-mono text-[6px] sm:text-[7px] tracking-[0.3em] text-[var(--pp-burgundy)]/30 pointer-events-none">
        {Array(8).fill('EPRIS JOURNAL • REVEAL THE INVISIBLE • DIGITAL MEMBER   ').join('')}
      </div>
      <div className="absolute bottom-2 sm:bottom-3 left-4 right-4 overflow-hidden whitespace-nowrap font-mono text-[6px] sm:text-[7px] tracking-[0.3em] text-[var(--pp-burgundy)]/30 pointer-events-none">
        {Array(8).fill('EPRIS JOURNAL • REVEAL THE INVISIBLE • DIGITAL MEMBER   ').join('')}
      </div>

      {/* diagonal watermark — always on, not a user toggle */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ transform: 'rotate(-12deg)' }}>
        <div className="text-center opacity-[0.09] text-[var(--pp-burgundy)] font-mono font-bold leading-tight text-xl sm:text-3xl">
          FICTIONAL MEMBER ID
          <div className="text-base sm:text-xl mt-1">EPRIS JOURNAL SPECIMEN</div>
        </div>
      </div>

      <div className="relative flex flex-col px-5 sm:px-8 pt-6 sm:pt-8 pb-5 sm:pb-7 h-full">
        {children}
      </div>
    </div>
  );
}


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
    <div className="flex flex-col sm:flex-row w-full shadow-xl">
      {/* ── Page 1 — bio data page ───────────────────────────────────────── */}
      <PageShell>
        <div>
          <div className="font-serif font-bold text-lg sm:text-2xl text-[var(--pp-burgundy)] tracking-tight">EPRIS JOURNAL</div>
          <div className="font-mono text-[7px] sm:text-[9px] tracking-[0.15em] text-[var(--pp-burgundy)]/75 mt-0.5">
            DIGITAL MEMBER PASSPORT · PASSEPORT NUMÉRIQUE DE MEMBRE
          </div>
          <div className="mt-2 sm:mt-3 bg-[var(--pp-burgundy)] text-[var(--pp-cream)] font-mono font-bold text-[6.5px] sm:text-[9px] tracking-[0.08em] text-center py-1.5 sm:py-2 px-1">
            NOT A GOVERNMENT DOCUMENT · FICTIONAL MEMBER ID · EPRIS JOURNAL ONLY
          </div>
        </div>

        <div className="flex gap-4 sm:gap-6 mt-4 sm:mt-6">
          <div className="w-[30%] sm:w-[26%] flex-shrink-0">
            <div className="w-full aspect-[3/4] bg-white border-2 border-[var(--pp-burgundy)] flex items-center justify-center overflow-hidden">
              {photoUrl ? (
                <img src={photoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="font-crimson text-[10px] sm:text-xs text-[var(--pp-burgundy)]/40">PHOTO</span>
              )}
            </div>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-x-3 gap-y-2.5 sm:gap-x-5 sm:gap-y-3.5 content-start min-w-0">
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
          </div>
        </div>

        <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-[var(--pp-sand)]">
          <FieldRow en="Issuing Authority" fr="Autorité de délivrance" value="EPRIS JOURNAL" />
        </div>
      </PageShell>

      {/* ── Spine ─────────────────────────────────────────────────────────── */}
      <div className="hidden sm:block w-3 flex-shrink-0 bg-gradient-to-r from-black/15 via-black/25 to-black/15" />
      <div className="sm:hidden h-2 bg-gradient-to-b from-black/10 to-black/20" />

      {/* ── Page 2 — observations page, mirrors page 1's layout ─────────────── */}
      <PageShell>
        <div>
          <div className="font-serif font-bold text-lg sm:text-2xl text-[var(--pp-burgundy)] tracking-tight">EPRIS JOURNAL</div>
          <div className="font-mono text-[7px] sm:text-[9px] tracking-[0.15em] text-[var(--pp-burgundy)]/75 mt-0.5">
            OBSERVATIONS · MENTIONS SPÉCIALES
          </div>
          <div className="mt-2 sm:mt-3 bg-[var(--pp-burgundy)] text-[var(--pp-cream)] font-mono font-bold text-[6.5px] sm:text-[9px] tracking-[0.08em] text-center py-1.5 sm:py-2 px-1">
            NOT A GOVERNMENT DOCUMENT · FICTIONAL MEMBER ID · EPRIS JOURNAL ONLY
          </div>
        </div>

        <div className="flex gap-4 sm:gap-6 mt-4 sm:mt-6">
          <div className="w-[30%] sm:w-[26%] flex-shrink-0">
            <div className="w-full aspect-[3/4] bg-white border-2 border-[var(--pp-burgundy)] flex items-center justify-center overflow-hidden p-2">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="verification QR" className="w-full h-full object-contain" />
              ) : (
                <span className="font-crimson text-[10px] sm:text-xs text-[var(--pp-burgundy)]/40">QR</span>
              )}
            </div>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-x-3 gap-y-2.5 sm:gap-x-5 sm:gap-y-3.5 content-start min-w-0">
            <div className="col-span-2"><FieldRow en="Personal Motto" fr="Devise personnelle" value={fields.motto} /></div>
            <div className="col-span-2"><FieldRow en="Website / ORCID / Social" fr="Site web / ORCID / Réseau" value={fields.link} /></div>
            <FieldRow en="Membership Type" fr="Type d'adhésion" value={fields.membershipType} />
            <FieldRow en="Verification Code" fr="Code de vérification" value={code} />
            <div className="col-span-2"><FieldRow en="Digital Signature" fr="Signature numérique" value={generateSignatureString(code, fields)} /></div>
          </div>
        </div>

        <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-[var(--pp-sand)] flex items-center justify-between gap-3">
          <FieldRow en="Scan to Verify" fr="Scanner pour vérifier" value={`eprisjournal.com/passport/${code}`} />
        </div>
      </PageShell>
    </div>
  );
}
