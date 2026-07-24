import type { CSSProperties } from 'react';
import type { PassportFields } from './passportRender';
import { generateSignatureString } from '../../lib/passportCode';
import { buildMRZ } from '../../lib/mrz';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <span style={{
        fontFamily: '"PT Sans", sans-serif',
        fontSize: 'clamp(7px, 1.3cqw, 10px)',
        color: '#4a1728',
        opacity: 0.65,
        fontStyle: 'italic',
        lineHeight: 1.25,
        letterSpacing: '0.02em',
      }}>
        {label}
        {label2 && <><br /><span style={{ opacity: 0.82 }}>{label2}</span></>}
      </span>
      <span style={{
        fontFamily: big
          ? '"Playfair Display", "PT Serif", serif'
          : mono
            ? '"Courier New", monospace'
            : '"Playfair Display", "PT Serif", serif',
        fontSize: big
          ? 'clamp(13px, 2.6cqw, 22px)'
          : 'clamp(9.5px, 1.9cqw, 15px)',
        fontWeight: big ? 700 : 600,
        color: '#1a0b10',
        lineHeight: 1.05,
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
      {/* Colored security tint — cool gold at top through to teal at the base,
          the same cross-sheet gradient wash real specimen pages use over their
          photo art, in EPRIS's own palette instead of a national flag's. */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'linear-gradient(180deg, rgba(120,140,160,0.16) 0%, rgba(184,149,110,0.14) 38%, rgba(184,149,110,0.08) 55%, rgba(74,120,120,0.16) 78%, rgba(74,120,120,0.22) 100%)',
        mixBlendMode: 'multiply',
      }} />

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
      <div className="absolute pointer-events-none" style={{ inset: '1.4%', border: '1px solid #4a1728', opacity: 0.7 }}/>

      {/* ══════════════════════════ TOP HALF — OBSERVATIONS ══════════════════════ */}
      <div style={{ position: 'absolute', top: '2%', left: '4.5%', right: '4.5%', height: '35%', overflow: 'hidden' }}>
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
            <div style={{ width: '100%', aspectRatio: '1/1', border: '1.5px solid #4a1728', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: 'inset 0 0 0 1px rgba(74,23,40,0.08)' }}>
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
      <div className="absolute pointer-events-none" style={{ top: '38%', left: '2%', right: '2%', height: '1px', backgroundImage: 'repeating-linear-gradient(to right, rgba(74,23,40,0.45) 0 1.5px, transparent 1.5px 6px)' }}/>
      <div className="absolute flex pointer-events-none" style={{ top: 'calc(38% - 3px)', left: '4.5%', right: '4.5%', justifyContent: 'space-between' }}>
        {Array.from({ length: 9 }, (_, i) => <div key={i} style={{ width: 5, height: 5, border: '0.6px solid rgba(74,23,40,0.35)' }} />)}
      </div>

      {/* ══════════════════════════ BOTTOM HALF — DATA PAGE ══════════════════════ */}
      <div style={{ position: 'absolute', top: '41%', left: '4.5%', right: '4.5%', bottom: '2%' }}>
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
            <div style={{ position: 'relative', width: '100%', aspectRatio: '35/45', flexShrink: 0, border: '1.5px solid #4a1728', background: '#f8f4ed', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible', boxShadow: 'inset 0 0 0 1px rgba(74,23,40,0.08)' }}>
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
                <div style={{ fontFamily: '"PT Sans",sans-serif', fontSize: 'clamp(6.5px, 1.25cqw, 10px)', color: '#4a1728', opacity: 0.65, fontStyle: 'italic', lineHeight: 1.3, marginBottom: 4 }}>
                  Holder's signature<br /><span style={{ opacity: 0.82 }}>Firma del titolare</span>
                </div>
                <div style={{ borderBottom: '0.8px solid #b8956e', width: '82%', height: 'clamp(7px, 1.6cqh, 15px)' }}/>
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
