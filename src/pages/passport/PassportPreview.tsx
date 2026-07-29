import { useId, type CSSProperties } from 'react';
import type { PassportFields } from './passportRender';
import { generateSignatureString } from '../../lib/passportCode';
import { buildMRZ } from '../../lib/mrz';
import { PASSPORT_STAMP_SHEETS, type PassportStamp, type PassportStampSheetDefinition } from './passportPages';

export { buildMRZ };

// ── EPRIS Identity Backdrop ───────────────────────────────────────────────────
// Real passport data pages are dominated by one continuous piece of national
// artwork (a mountain photo, a landscape) bleeding across both pages, with
// guilloche lines as a secondary security texture on top of it — not the other
// way around. This is EPRIS's own commissioned art (an engraved-mountain scene
// in the site's cream/burgundy/gold palette, with a tree emblem and a
// perforation motif standing in for a national one). It has a soft built-in
// alpha vignette (transparent top/bottom, opaque middle band), so it's laid
// over the shared warm base color rather than a hard-edged rectangle. Same
// image on both pages -> the open spread reads as one continuous scene, the
// way the real passport's mountain photo carries across its two pages.
const IDENTITY_ART_SRC = '/passport-assets/passport-page-bg.png';
function IdentityBackdrop() {
  return (
    <img
      src={IDENTITY_ART_SRC}
      alt=""
      aria-hidden
      draggable={false}
      className="absolute inset-0 w-full h-full pointer-events-none select-none"
      style={{ objectFit: 'cover', objectPosition: 'center 42%' }}
    />
  );
}

// Fine vector security texture inspired by specimen passport graphics, but
// built from EPRIS geometry and words so the object stays clearly editorial.
function SecurityMesh({ accent = '#2b7680', opacity = 0.2 }: { accent?: string; opacity?: number }) {
  const rawId = useId();
  const id = rawId.replace(/:/g, '');
  const gridId = `pp-grid-${id}`;
  const glowId = `pp-glow-${id}`;
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 600 800"
      preserveAspectRatio="none"
      aria-hidden
      style={{ opacity, mixBlendMode: 'multiply' }}
    >
      <defs>
        <pattern id={gridId} width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M 28 0 L 0 0 0 28" fill="none" stroke={accent} strokeWidth="0.55" opacity="0.46" />
          <circle cx="14" cy="14" r="1" fill="none" stroke={accent} strokeWidth="0.45" opacity="0.5" />
        </pattern>
        <radialGradient id={glowId} cx="50%" cy="48%" r="58%">
          <stop offset="0" stopColor={accent} stopOpacity="0.24" />
          <stop offset="1" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="600" height="800" fill={`url(#${gridId})`} />
      <ellipse cx="300" cy="400" rx="245" ry="190" fill={`url(#${glowId})`} />
      {Array.from({ length: 9 }, (_, i) => {
        const y = 178 + i * 38;
        const amp = 25 + i * 2;
        return <path key={i} d={`M-20 ${y} C115 ${y - amp}, 175 ${y + amp}, 300 ${y} S485 ${y - amp}, 620 ${y}`} fill="none" stroke={accent} strokeWidth="1" opacity={0.55 - i * 0.025} />;
      })}
      {Array.from({ length: 7 }, (_, i) => {
        const x = 90 + i * 70;
        return <ellipse key={i} cx={x} cy="408" rx={105 + i * 5} ry={250 - i * 8} fill="none" stroke={accent} strokeWidth="0.75" opacity="0.34" transform={`rotate(${i % 2 ? 18 : -18} ${x} 408)`} />;
      })}
      <path d="M36 92 H564 M36 708 H564" fill="none" stroke={accent} strokeWidth="1" strokeDasharray="2 8" opacity="0.7" />
      <text x="300" y="111" textAnchor="middle" fill={accent} fontFamily="monospace" fontSize="7" letterSpacing="4" opacity="0.8">EPRIS · DESIGN · ART · ARCHITECTURE · CULTURE</text>
      <text x="300" y="728" textAnchor="middle" fill={accent} fontFamily="monospace" fontSize="7" letterSpacing="3" opacity="0.8">EDITORIAL DOCUMENT · NOT VALID FOR TRAVEL</text>
    </svg>
  );
}

function MicroprintRails({ page }: { page: string }) {
  return (
    <>
      <div aria-hidden style={{ position: 'absolute', top: '5%', bottom: '5%', left: '1.65%', writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontFamily: 'monospace', fontSize: 'clamp(4px, .75cqw, 6px)', letterSpacing: '.2em', color: '#4a1728', opacity: 0.48, zIndex: 4 }}>
        EPRIS JOURNAL · CULTURAL MEMBERSHIP · DESIGN ART ARCHITECTURE · {page}
      </div>
      <div aria-hidden style={{ position: 'absolute', top: '7%', bottom: '7%', right: '1.7%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', color: '#4a1728', opacity: 0.56, zIndex: 4 }}>
        <span style={{ writingMode: 'vertical-rl', fontFamily: 'monospace', fontSize: 'clamp(4px, .75cqw, 6px)', letterSpacing: '.28em' }}>EPRIS · {page}</span>
        <span style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 2px)', gap: 2 }}>
          {Array.from({ length: 21 }, (_, i) => <i key={i} style={{ width: 2, height: 2, borderRadius: '50%', background: 'currentColor', opacity: i % 4 === 0 ? 0.25 : 1 }} />)}
        </span>
      </div>
    </>
  );
}

// ── Emblem ────────────────────────────────────────────────────────────────────
function Emblem({ px }: { px: number }) {
  const r = px / 2;
  const star = Array.from({length: 8}, (_, i) => {
    const a = (i * 45 - 90) * Math.PI / 180;
    const ro = i % 2 === 0 ? r * 0.88 : r * 0.54;
    return `${r + ro * Math.cos(a)},${r + ro * Math.sin(a)}`;
  }).join(' ');
  const ticks = Array.from({length: 24}, (_, i) => {
    const a = i * 15 * Math.PI / 180;
    const r1 = r * 0.88, r2 = r;
    return { x1: r + r1 * Math.cos(a), y1: r + r1 * Math.sin(a), x2: r + r2 * Math.cos(a), y2: r + r2 * Math.sin(a) };
  });
  return (
    <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} fill="none" aria-hidden>
      <circle cx={r} cy={r} r={r * 0.96} stroke="currentColor" strokeWidth="1" opacity="0.7"/>
      <circle cx={r} cy={r} r={r * 0.82} stroke="currentColor" strokeWidth="0.5" opacity="0.4"/>
      <polygon points={star} stroke="currentColor" strokeWidth="0.7" opacity="0.55"/>
      {ticks.map((t, i) => <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="currentColor" strokeWidth="0.4" opacity="0.35"/>)}
      <polygon
        points={`${r},${r * 0.28} ${r * 1.32},${r} ${r},${r * 1.72} ${r * 0.68},${r}`}
        stroke="currentColor" strokeWidth="1" fill="white" opacity="0.92"
      />
      <circle cx={r} cy={r} r={r * 0.12} fill="currentColor" opacity="0.8"/>
    </svg>
  );
}

// ── Field ─────────────────────────────────────────────────────────────────────
// Real passport data pages stack the field label in every one of the issuing
// country's official languages (Switzerland: DE/FR/IT/RM). EPRIS's equivalent
// is EN + Italian — `label2` renders as a second, slightly smaller line under
// the English label, matching that bilingual-caption convention.
function F({
  label, label2, value, big, mono,
}: {
  label: string; label2?: string; value: string; big?: boolean; mono?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <span style={{
        fontFamily: '"PT Sans", sans-serif',
        fontSize: 'clamp(6px, 1.3cqw, 10px)',
        color: '#4a1728',
        opacity: 0.65,
        fontStyle: 'italic',
        lineHeight: 1.15,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
      }}>
        {label}
        {label2 && <span style={{ opacity: 0.82 }}> &middot; {label2}</span>}
      </span>
      <span style={{
        fontFamily: big
          ? '"Playfair Display", "PT Serif", serif'
          : mono
            ? '"Courier New", monospace'
            : '"Playfair Display", "PT Serif", serif',
        fontSize: big
          ? 'clamp(11px, 2.6cqw, 22px)'
          : 'clamp(8px, 1.9cqw, 15px)',
        fontWeight: big ? 700 : 600,
        color: '#1a0b10',
        lineHeight: 1.02,
        letterSpacing: big ? '0.01em' : mono ? '0.04em' : '0.005em',
      }}>{value || '—'}</span>
    </div>
  );
}

// ── Verification Stamp ────────────────────────────────────────────────────────
function VerificationStamp() {
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase();
  return (
    <div style={{
      position: 'absolute',
      right: '6%',
      bottom: '18%',
      width: 'clamp(30px, 9cqw, 60px)',
      height: 'clamp(30px, 9cqw, 60px)',
      transform: 'rotate(-15deg)',
      mixBlendMode: 'multiply',
      opacity: 0.65,
      pointerEvents: 'none',
      zIndex: 10,
    }}>
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
        <circle cx="50" cy="50" r="45" fill="none" stroke="#b33939" strokeWidth="2.5" strokeDasharray="4 2" />
        <circle cx="50" cy="50" r="41" fill="none" stroke="#b33939" strokeWidth="1" />
        <path id="stamp-arc" d="M 20,50 A 30,30 0 0 1 80,50" fill="none" />
        <text fontFamily="monospace" fontSize="10" fontWeight="bold" fill="#b33939" letterSpacing="1">
          <textPath href="#stamp-arc" startOffset="50%" textAnchor="middle">VERIFIED</textPath>
        </text>
        <text x="50" y="60" fontFamily="monospace" fontSize="6.5" fontWeight="bold" fill="#b33939" textAnchor="middle">EPRIS J.</text>
        <text x="50" y="70" fontFamily="monospace" fontSize="5" fill="#b33939" textAnchor="middle">{dateStr}</text>
      </svg>
    </div>
  );
}

// ── Main passport page ────────────────────────────────────────────────────────
// Reoriented to a single combined sheet — observations on top, data page below,
// split by a dotted perforation line — matching the reference specimen layout
// exactly (that reference always shows both halves stacked in one portrait
// sheet, not two separate side-by-side book pages). One shared frame,
// background, watermark and side text run the full height behind both halves.
export function PassportPage({ fields, photoUrl, code, mrz, qrDataUrl }: {
  fields: PassportFields; photoUrl: string | null; code: string;
  mrz: [string, string]; qrDataUrl?: string | null;
}) {
  return (
    <div
      className="relative w-full select-none overflow-hidden"
      style={{
        aspectRatio: '3 / 4',
        // Base color sampled from the identity art's own opaque band — the art
        // has a soft built-in alpha vignette (transparent top/bottom), so this
        // is what shows through there.
        background: '#e1dbd7',
        containerType: 'inline-size',
        // Layered shadow like a real document
        boxShadow: '0 2px 6px rgba(74,23,40,0.12), 0 8px 28px rgba(74,23,40,0.16), 0 20px 60px rgba(74,23,40,0.12)',
        borderRadius: '8px',
      } as CSSProperties}
    >
      {/* EPRIS identity artwork — the passport's "world" */}
      <IdentityBackdrop />
      {/* Soft cyan / ochre / rose interference wash: recognisably passport-like
          print depth, without borrowing any national colour system. */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'linear-gradient(155deg, rgba(105,196,205,0.22) 0%, rgba(225,207,105,0.18) 34%, rgba(245,238,218,0.08) 51%, rgba(223,151,171,0.19) 76%, rgba(67,156,167,0.24) 100%)',
        mixBlendMode: 'multiply',
      }} />
      <SecurityMesh accent="#287983" opacity={0.23} />
      <MicroprintRails page="01" />

      <div aria-hidden className="absolute pointer-events-none" style={{ top: '1.25%', left: '5%', right: '5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#4a1728', opacity: 0.52, fontFamily: 'monospace', fontSize: 'clamp(4px, .78cqw, 6.5px)', letterSpacing: '.18em', zIndex: 4 }}>
        <span>SPECIMEN · EPRIS CULTURAL SYSTEM</span>
        <span>ISSUE 01 / VERIFIED EDITION</span>
      </div>

      {/* EPRIS watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden" aria-hidden>
        <span style={{
          fontFamily: '"Playfair Display", serif',
          fontWeight: 700,
          fontSize: 'clamp(55px, 20cqw, 240px)',
          color: '#4a1728',
          opacity: 0.042,
          letterSpacing: '-0.03em',
          transform: 'rotate(-16deg)',
          userSelect: 'none',
          lineHeight: 1,
        }}>EPRIS</span>
      </div>

      {/* Single frame — a doubled outer+inner border read as visual noise at
          this size, one clean line is enough to read as a document edge. */}
      <div className="absolute pointer-events-none" style={{ inset: '1.4%', border: '1px solid #4a1728', opacity: 0.7, zIndex: 3 }}/>
      <div className="absolute pointer-events-none" aria-hidden style={{ top: '37.4%', left: '2.7%', right: '2.7%', height: '0.55%', background: 'linear-gradient(90deg, rgba(45,151,162,.75), rgba(226,191,79,.6) 35%, rgba(219,121,150,.64) 68%, rgba(45,151,162,.75))', mixBlendMode: 'multiply', opacity: 0.55, zIndex: 4 }} />

      {/* ══════════════════════════ TOP HALF — OBSERVATIONS ══════════════════════ */}
      <div style={{ position: 'absolute', top: '2%', left: '4.5%', right: '4.5%', height: '32%', overflow: 'hidden' }}>
        {/* Big page number + small colored security glyph, top-right — a real
            specimen page's most immediately recognizable feature. */}
        <div style={{ position: 'absolute', top: 0, right: 0, display: 'flex', alignItems: 'center', gap: '3%' }}>
          <span style={{ fontFamily: '"PT Sans", sans-serif', fontWeight: 400, fontSize: 'clamp(18px, 4.4cqw, 34px)', color: '#1a0b10', opacity: 0.75, lineHeight: 1 }}>01</span>
          <div style={{
            width: 'clamp(14px, 3.2cqw, 26px)', height: 'clamp(14px, 3.2cqw, 26px)', background: '#4a1728', opacity: 0.85,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            clipPath: 'polygon(20% 0,80% 0,100% 20%,100% 80%,80% 100%,20% 100%,0 80%,0 20%)',
          }}>
            <span style={{ color: '#f5eddc', fontFamily: 'serif', fontWeight: 700, fontSize: 'clamp(6px, 1.5cqw, 11px)' }}>EJ</span>
          </div>
        </div>

        {/* Dotted perforation line with small square ticks under the page number */}
        <div className="absolute pointer-events-none" style={{ top: '18%', left: 0, right: 0, height: '1px', backgroundImage: 'repeating-linear-gradient(to right, rgba(74,23,40,0.4) 0 1.5px, transparent 1.5px 7px)' }}/>
        <div className="absolute flex pointer-events-none" style={{ top: 'calc(18% - 3px)', left: 0, right: 0, justifyContent: 'space-between' }}>
          {Array.from({ length: 7 }, (_, i) => <div key={i} style={{ width: 5, height: 5, border: '0.6px solid rgba(74,23,40,0.35)' }} />)}
        </div>

        {/* Content */}
        <div style={{ position: 'absolute', top: '22%', left: 0, right: 0, bottom: 0, display: 'flex', gap: '4%' }}>
          {/* QR box — mirrors the data page's photo box */}
          <div style={{ width: '26%', flexShrink: 0 }}>
            <div style={{ width: '100%', aspectRatio: '1/1', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {qrDataUrl
                ? <img src={qrDataUrl} alt="QR" style={{ width: '86%', height: '86%', objectFit: 'contain' }}/>
                : <span style={{ fontFamily: 'monospace', fontSize: 'clamp(5px, 1cqw, 8px)', color: '#4a1728', opacity: 0.3 }}>QR</span>}
            </div>
          </div>
          {/* Fields + disclaimer */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3%' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6%' }}>
              <F label="Membership Type" label2="Tipo di appartenenza" value={fields.membershipType || '—'} />
              <F label="Verification" label2="Verifica" value={code} mono />
            </div>
            <F label="Digital Signature" label2="Firma digitale" value={generateSignatureString(code, fields)} mono />
            <F label="Scan to Verify" label2="Scansiona per verificare" value={`eprisjournal.com/passport/${code}`} />
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontFamily: '"PT Sans", sans-serif', fontSize: 'clamp(6px, 1.05cqw, 8.5px)', color: '#4a1728', opacity: 0.55, letterSpacing: '0.13em', textTransform: 'uppercase', marginBottom: '2%' }}>
                Official Observations · Osservazioni ufficiali
              </div>
              <div style={{ borderTop: '0.6px solid rgba(74,23,40,0.25)', paddingTop: '3%', display: 'flex', flexDirection: 'column', gap: '3%' }}>
                <p style={{ fontFamily: '"Playfair Display", "PT Serif", serif', fontStyle: 'italic', fontWeight: 600, fontSize: 'clamp(6.5px, 1.35cqw, 11px)', lineHeight: 1.22, color: '#3a1520', opacity: 0.85, margin: 0 }}>
                  This is not a travel document or a state-issued identification. It certifies membership in the EPRIS Journal cultural system only.
                </p>
                <p style={{ fontFamily: '"Playfair Display", "PT Serif", serif', fontStyle: 'italic', fontWeight: 600, fontSize: 'clamp(6.5px, 1.35cqw, 11px)', lineHeight: 1.22, color: '#3a1520', opacity: 0.85, margin: 0 }}>
                  Questo non è un documento di viaggio né un documento d'identità statale. Certifica esclusivamente l'appartenenza al sistema culturale EPRIS Journal.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════ DIVIDER (the fold) ═══════════════════════════ */}
      <div className="absolute pointer-events-none" style={{ top: '36%', left: '2%', right: '2%', height: '1px', backgroundImage: 'repeating-linear-gradient(to right, rgba(74,23,40,0.45) 0 1.5px, transparent 1.5px 6px)' }}/>
      <div className="absolute flex pointer-events-none" style={{ top: 'calc(36% - 3px)', left: '4.5%', right: '4.5%', justifyContent: 'space-between' }}>
        {Array.from({ length: 9 }, (_, i) => <div key={i} style={{ width: 5, height: 5, border: '0.6px solid rgba(74,23,40,0.35)' }} />)}
      </div>

      {/* ══════════════════════════ BOTTOM HALF — DATA PAGE ══════════════════════ */}
      <div style={{ position: 'absolute', top: '39%', left: '4.5%', right: '4.5%', bottom: '2%' }}>
        {/* Header band */}
        <div style={{
          position: 'absolute', top: 0, left: '-1%', right: '-1%', height: '13%',
          background: 'linear-gradient(90deg, rgba(74,23,40,0.92) 0%, rgba(90,28,48,0.88) 50%, rgba(74,23,40,0.92) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 3.5%', borderRadius: 3,
        }}>
          <div style={{ color: '#f5eddc', opacity: 0.85 }}><Emblem px={20}/></div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontFamily: '"Playfair Display", "PT Serif", serif', fontWeight: 700, fontSize: 'clamp(9px, 2.1cqw, 17px)', color: '#f5eddc', letterSpacing: '0.1em', lineHeight: 1 }}>EPRIS JOURNAL</div>
            <div style={{ fontFamily: '"PT Sans", sans-serif', fontSize: 'clamp(4.5px, 0.85cqw, 7px)', color: '#f5eddc', opacity: 0.85, letterSpacing: '0.18em', lineHeight: 1.3, marginTop: 2 }}>DIGITAL MEMBER PASSPORT</div>
          </div>
          <div style={{ color: '#f5eddc', opacity: 0.85 }}><Emblem px={20}/></div>
        </div>

        {/* Type / Code / Number row */}
        <div style={{ position: 'absolute', top: '16%', left: 0, right: 0, display: 'grid', gridTemplateColumns: '1fr 2fr 4fr', gap: '3%', alignItems: 'start' }}>
          <F label="Type" label2="Tipo" value="P" />
          <F label="Code" label2="Codice" value="EPR" />
          <F label="Member No." label2="Numero" value={code} mono />
        </div>
        <div className="absolute" style={{ top: '22%', left: 0, right: 0, height: '0.5px', background: '#b8956e', opacity: 0.5 }}/>

        {/* Content */}
        <div style={{ position: 'absolute', top: '25%', left: 0, right: 0, bottom: '15%', display: 'flex', gap: '3.5%' }}>
          {/* Photo */}
          <div style={{ width: '30%', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '4%' }}>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '35/45', flexShrink: 0, background: '#f8f4ed', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
              <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
                {photoUrl
                  ? <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: 'multiply', filter: 'sepia(0.2) contrast(0.95)' }}/>
                  : <span style={{ display: 'block', textAlign: 'center', marginTop: '45%', fontFamily: '"PT Sans",sans-serif', fontSize: 'clamp(5px, 1cqw, 8px)', color: '#4a1728', opacity: 0.3 }}>PHOTO</span>}
              </div>
              {/* Ghost/security duplicate photo */}
              {photoUrl && (
                <div style={{
                  position: 'absolute', right: '-14%', bottom: '-8%', width: '46%', aspectRatio: '1 / 1.15',
                  clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
                  opacity: 0.5, mixBlendMode: 'multiply', filter: 'grayscale(1) contrast(1.05)',
                  boxShadow: '0 0 0 0.5px rgba(74,23,40,0.35)', zIndex: 1,
                }}>
                  <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                </div>
              )}
            </div>
            <div style={{ padding: '5% 6%', background: 'rgba(74,23,40,0.06)' }}>
              <div style={{ fontFamily: '"PT Sans",sans-serif', fontSize: 'clamp(5.5px, 0.9cqw, 8px)', color: '#4a1728', opacity: 0.6, letterSpacing: '0.1em', lineHeight: 1.3, textAlign: 'center', textTransform: 'uppercase' }}>Membership<br/>Type</div>
              <div style={{ fontFamily: '"Playfair Display", serif', fontWeight: 700, fontSize: 'clamp(8px, 1.6cqw, 13px)', color: '#4a1728', textAlign: 'center', marginTop: 3, lineHeight: 1 }}>{fields.membershipType || 'Author'}</div>
            </div>
          </div>

          {/* Fields */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <F label="Surname" label2="Cognome" value={fields.surname.toUpperCase()} big />
            <F label="Given Names" label2="Nome" value={fields.givenNames.toUpperCase()} big />
            <F label="Nationality" label2="Cittadinanza" value={`EPRIS · ${fields.country || '—'}`.toUpperCase()} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8%' }}>
              <F label="Date of birth" label2="Data di nascita" value={fields.dob || '—'} />
              <F label="Record No." label2="Numero di registro" value={code} mono />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8%' }}>
              <F label="Sex" label2="Sesso" value={(fields.sex || 'X').toUpperCase()} />
              <F label="City" label2="Città" value={fields.city || '—'} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8%' }}>
              <F label="Date of issue" label2="Data di rilascio" value={fields.issueDate || '—'} />
              <F label="Authority" label2="Autorità" value="EPRIS J." />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8%' }}>
              <F label="Date of expiry" label2="Data di scadenza" value={fields.expiryDate || '—'} />
              <div>
                <div style={{ fontFamily: '"PT Sans",sans-serif', fontSize: 'clamp(5.5px, 1.25cqw, 10px)', color: '#4a1728', opacity: 0.65, fontStyle: 'italic', lineHeight: 1.1, marginBottom: 2, whiteSpace: 'nowrap' }}>
                  Holder's signature <span style={{ opacity: 0.82 }}>&middot; Firma del titolare</span>
                </div>
                <div style={{ borderBottom: '0.8px solid #b8956e', width: '82%', height: 'clamp(4px, 1.6cqh, 15px)' }}/>
              </div>
            </div>
            <F label="Professional Field" label2="Campo professionale" value={(fields.field || '—').toUpperCase()} />
            <VerificationStamp />
          </div>
        </div>

        {/* MRZ — printed directly on the page art, no boxed background */}
        <div style={{ position: 'absolute', bottom: '2%', left: 0, right: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: '"OCR-B 10 BT", "OCR-B", "Courier New", monospace', fontSize: 'clamp(9px, 1.9cqw, 17px)', fontWeight: 'bold', color: '#1a0b10', lineHeight: 1.25 }}>
            {mrz[0].split('').map((c, i) => <span key={i}>{c}</span>)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: '"OCR-B 10 BT", "OCR-B", "Courier New", monospace', fontSize: 'clamp(9px, 1.9cqw, 17px)', fontWeight: 'bold', color: '#1a0b10', lineHeight: 1.25, marginTop: '1.5%' }}>
            {mrz[1].split('').map((c, i) => <span key={i}>{c}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}

const STAMP_ACCENTS = {
  teal: { line: '#267681', wash: 'rgba(70,167,176,.22)', second: 'rgba(218,188,82,.14)' },
  gold: { line: '#96713d', wash: 'rgba(213,178,90,.2)', second: 'rgba(76,151,157,.15)' },
  rose: { line: '#9a4f68', wash: 'rgba(207,123,151,.2)', second: 'rgba(75,158,167,.15)' },
} as const;

const STAMP_INK_COLORS = {
  burgundy: '#74213e',
  teal: '#1f727a',
  gold: '#896329',
  navy: '#294968',
} as const;

const STAMP_KIND_LABELS = {
  visit: 'Studio Visit',
  interview: 'Interview',
  collaboration: 'Collaboration',
  event: 'Cultural Event',
  verified: 'Editorial Verified',
} as const;

function EditorialStampMark({ stamp }: { stamp: PassportStamp }) {
  const ink = STAMP_INK_COLORS[stamp.ink] || STAMP_INK_COLORS.burgundy;
  const rotation = ((Number(stamp.page) % 5) - 2) * 2.2;
  return (
    <div
      aria-label={`${STAMP_KIND_LABELS[stamp.kind]}: ${stamp.title}`}
      style={{
        position: 'absolute', left: '50%', top: '50%', width: '70%', aspectRatio: '1',
        transform: `translate(-50%,-50%) rotate(${rotation}deg)`, border: `clamp(1.4px,.3cqw,2.8px) solid ${ink}`,
        borderRadius: '50%', color: ink, opacity: 0.87, display: 'grid', placeItems: 'center',
        filter: 'contrast(1.08)', mixBlendMode: 'multiply',
      }}
    >
      <div aria-hidden style={{ position: 'absolute', inset: '5%', border: `clamp(.8px,.18cqw,1.6px) solid ${ink}`, borderRadius: '50%' }} />
      <div style={{ width: '78%', textAlign: 'center', fontFamily: 'monospace', textTransform: 'uppercase' }}>
        <span style={{ display: 'block', fontSize: 'clamp(4px,.72cqw,6.4px)', letterSpacing: '.18em', lineHeight: 1.15 }}>{STAMP_KIND_LABELS[stamp.kind]}</span>
        <span aria-hidden style={{ display: 'block', height: 1, margin: '6% 0', background: ink, opacity: 0.8 }} />
        <strong style={{ display: 'block', fontFamily: '"PT Sans", sans-serif', fontSize: 'clamp(6px,1.35cqw,11px)', lineHeight: 1.05, letterSpacing: '.04em' }}>{stamp.title}</strong>
        <span style={{ display: 'block', marginTop: '6%', fontSize: 'clamp(4px,.68cqw,6px)', letterSpacing: '.08em', lineHeight: 1.1 }}>{stamp.place || 'EPRIS JOURNAL'}</span>
        <span style={{ display: 'block', marginTop: '4%', fontSize: 'clamp(4px,.72cqw,6.5px)', fontWeight: 700, letterSpacing: '.12em' }}>{stamp.date || 'EDITORIAL RECORD'}</span>
      </div>
      <span aria-hidden style={{ position: 'absolute', left: '9%', right: '9%', top: '48%', borderTop: `1px solid ${ink}`, transform: 'rotate(-14deg)', opacity: 0.2 }} />
    </div>
  );
}

function StampField({ label, align = 'left', stamp }: { label: string; align?: 'left' | 'right'; stamp?: PassportStamp | null }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 0, border: '0.7px solid rgba(74,23,40,.25)', background: 'rgba(255,255,255,.12)', overflow: 'hidden' }}>
      <div aria-hidden style={{ position: 'absolute', inset: '8%', border: '0.6px solid rgba(74,23,40,.12)', borderRadius: '50%' }} />
      <div aria-hidden style={{ position: 'absolute', inset: '18% 10%', borderTop: '0.6px solid rgba(74,23,40,.13)', borderBottom: '0.6px solid rgba(74,23,40,.13)', transform: align === 'left' ? 'rotate(-7deg)' : 'rotate(7deg)' }} />
      <span style={{ position: 'absolute', left: '8%', right: '8%', bottom: '8%', fontFamily: 'monospace', fontSize: 'clamp(4.5px, .85cqw, 7px)', letterSpacing: '.16em', textTransform: 'uppercase', color: '#4a1728', opacity: 0.38, textAlign: align }}>
        {label}
      </span>
      {stamp && <EditorialStampMark stamp={stamp} />}
    </div>
  );
}

/** Two booklet pages reserved for editorial stamps and visit marks. */
export function PassportStampPage({ sheet, stamps = [] }: { sheet: PassportStampSheetDefinition; stamps?: PassportStamp[] }) {
  const colors = STAMP_ACCENTS[sheet.accent];
  return (
    <div
      className="relative w-full select-none overflow-hidden"
      style={{
        aspectRatio: '3 / 4',
        containerType: 'inline-size',
        background: '#eee8df',
        borderRadius: 8,
        boxShadow: '0 2px 6px rgba(74,23,40,.1), 0 12px 38px rgba(74,23,40,.13)',
      } as CSSProperties}
      aria-label={`${sheet.title}, stamp pages ${sheet.pageNumbers[0]} and ${sheet.pageNumbers[1]}${stamps.length ? `, ${stamps.length} recorded` : ''}`}
    >
      <img src={IDENTITY_ART_SRC} alt="" aria-hidden draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" style={{ objectFit: 'cover', objectPosition: 'center 48%', opacity: 0.3, mixBlendMode: 'multiply' }} />
      <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(145deg, ${colors.wash}, rgba(249,244,231,.34) 48%, ${colors.second})`, mixBlendMode: 'multiply' }} />
      <SecurityMesh accent={colors.line} opacity={0.25} />
      <MicroprintRails page={`${sheet.pageNumbers[0]}–${sheet.pageNumbers[1]}`} />

      <div aria-hidden className="absolute pointer-events-none" style={{ inset: '1.4%', border: '1px solid rgba(74,23,40,.62)', zIndex: 3 }} />
      <div aria-hidden className="absolute pointer-events-none" style={{ top: '49.8%', left: '2%', right: '2%', height: 1, backgroundImage: 'repeating-linear-gradient(to right, rgba(74,23,40,.48) 0 1.5px, transparent 1.5px 7px)', zIndex: 4 }} />
      <div aria-hidden className="absolute pointer-events-none" style={{ top: '49.35%', left: '4.5%', right: '4.5%', height: '1%', background: `linear-gradient(90deg, transparent, ${colors.line}, transparent)`, opacity: 0.35, zIndex: 4 }} />

      {[0, 1].map((side) => {
        const top = side === 0 ? '3.4%' : '52.2%';
        const page = sheet.pageNumbers[side];
        const stamp = stamps.find((item) => item.page === page);
        return (
          <section key={page} style={{ position: 'absolute', top, left: '4.8%', right: '4.8%', height: '44%', zIndex: 5 }}>
            <header style={{ height: '17%', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '0.6px solid rgba(74,23,40,.3)', paddingBottom: '2%' }}>
              <div>
                <p style={{ margin: 0, fontFamily: 'monospace', fontSize: 'clamp(4.5px, .8cqw, 6.5px)', letterSpacing: '.22em', color: '#4a1728', opacity: 0.55, textTransform: 'uppercase' }}>EPRIS Journal · Stamp Register {sheet.editionMark}</p>
                <h2 style={{ margin: '1.8% 0 0', fontFamily: '"Playfair Display", serif', fontSize: 'clamp(10px, 2.5cqw, 20px)', color: '#3a1520', fontWeight: 600, lineHeight: 1 }}>{sheet.title}</h2>
                <p style={{ margin: '1.8% 0 0', fontFamily: 'monospace', fontSize: 'clamp(4px, .72cqw, 6px)', letterSpacing: '.15em', color: '#4a1728', opacity: 0.48, textTransform: 'uppercase' }}>{sheet.subtitle}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8%' }}>
                <span style={{ fontFamily: '"PT Sans", sans-serif', fontSize: 'clamp(17px, 4cqw, 32px)', lineHeight: 1, color: '#1a0b10', opacity: 0.66 }}>{page}</span>
                <span style={{ width: 'clamp(13px, 3cqw, 24px)', aspectRatio: '1', display: 'grid', placeItems: 'center', background: colors.line, color: '#f8f2e7', fontFamily: 'monospace', fontSize: 'clamp(5px, 1.1cqw, 8px)', clipPath: 'polygon(20% 0,80% 0,100% 20%,100% 80%,80% 100%,20% 100%,0 80%,0 20%)' }}>{sheet.editionMark}</span>
              </div>
            </header>
            <div style={{ height: '76%', paddingTop: '3.5%', display: 'grid', gridTemplateColumns: '1.1fr .9fr', gridTemplateRows: '1fr 1fr', gap: '3%' }}>
              <div style={{ gridRow: '1 / 3' }}><StampField label={stamp ? 'Authenticated editorial mark' : 'Reserved for editorial mark'} align={side ? 'right' : 'left'} stamp={stamp} /></div>
              <StampField label={stamp ? [stamp.date, stamp.place].filter(Boolean).join(' · ') : 'Date · Place'} align="right" />
              <StampField label={stamp?.note || 'Signature · Note'} align="right" />
            </div>
            <footer style={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'monospace', fontSize: 'clamp(4px, .68cqw, 5.5px)', letterSpacing: '.15em', textTransform: 'uppercase', color: '#4a1728', opacity: 0.46 }}>
              <span>{stamp ? 'Recorded by EPRIS editorial desk' : 'Blank by design · Future stamp field'}</span>
              <span>{sheet.key.toUpperCase()} / {page}</span>
            </footer>
          </section>
        );
      })}
    </div>
  );
}

export function PassportStampContactSheet({ stamps = [] }: { stamps?: PassportStamp[] }) {
  return (
    <div className="mt-5 rounded-xl border border-[var(--pp-burgundy)]/10 bg-white/35 p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--pp-burgundy)]/55">Blank stamp archive</p>
          <p className="mt-1 font-serif text-sm text-[var(--pp-ink)]/70">{stamps.length ? `${stamps.length} editorial ${stamps.length === 1 ? 'mark' : 'marks'} · ${6 - stamps.length} pages available` : '6 reserved pages · ready for future marks'}</p>
        </div>
        <span className="font-mono text-[9px] tabular-nums text-[var(--pp-burgundy)]/45">02—07</span>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {PASSPORT_STAMP_SHEETS.map((sheet) => (
          <div key={sheet.key} className="overflow-hidden rounded-[4px] border border-[var(--pp-burgundy)]/10 bg-white shadow-sm">
            <PassportStampPage sheet={sheet} stamps={stamps} />
          </div>
        ))}
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
  const mrz = buildMRZ(fields, code);

  return (
    <div className="w-full max-w-[560px] mx-auto">
      <div className="relative">
        <PassportPage
          fields={fields}
          photoUrl={photoUrl}
          code={code}
          mrz={mrz}
          qrDataUrl={qrDataUrl}
        />
      </div>
    </div>
  );
}
