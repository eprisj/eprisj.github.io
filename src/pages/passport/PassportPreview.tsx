import { useState, type CSSProperties } from 'react';
import type { PassportFields } from './passportRender';
import { generateSignatureString } from '../../lib/passportCode';
import { buildMRZ } from '../../lib/mrz';

export { buildMRZ };

// ── Rich Guilloche ────────────────────────────────────────────────────────────
// Three wave families with visible warm amber+cool teal palette like in real passports
function Guilloche() {
  const pathsA: string[] = [];
  const pathsB: string[] = [];
  const pathsC: string[] = [];

  for (let i = 0; i <= 46; i++) {
    const y = (i / 46) * 100;
    const a = 2.0 + Math.sin(i * 0.44) * 1.4;
    const f = 0.06 + Math.sin(i * 0.25) * 0.02;
    let d = '';
    for (let x = 0; x <= 100; x += 0.45) {
      const yy = y + a * Math.sin(x * f * Math.PI * 2 + i * 0.68);
      d += x === 0 ? `M${x},${yy.toFixed(2)}` : `L${x},${yy.toFixed(2)}`;
    }
    pathsA.push(d);
  }
  for (let i = 0; i <= 32; i++) {
    const x = (i / 32) * 100;
    const a = 1.5 + Math.cos(i * 0.58) * 1.0;
    const f = 0.055 + Math.cos(i * 0.35) * 0.015;
    let d = '';
    for (let y = 0; y <= 100; y += 0.55) {
      const xx = x + a * Math.sin(y * f * Math.PI * 2 + i * 0.5);
      d += y === 0 ? `M${xx.toFixed(2)},${y}` : `L${xx.toFixed(2)},${y}`;
    }
    pathsB.push(d);
  }
  for (let i = 0; i <= 22; i++) {
    const x = (i / 22) * 100;
    const a = 0.9 + Math.sin(i * 0.8) * 0.5;
    const f = 0.1 + Math.sin(i * 0.45) * 0.025;
    let d = '';
    for (let y = 0; y <= 100; y += 0.65) {
      const xx = x + a * Math.cos(y * f * Math.PI * 2 + i * 0.35);
      d += y === 0 ? `M${xx.toFixed(2)},${y}` : `L${xx.toFixed(2)},${y}`;
    }
    pathsC.push(d);
  }

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
      <defs>
        <linearGradient id="gA" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8B5A2B"/>
          <stop offset="50%" stopColor="#3d5a8a"/>
          <stop offset="100%" stopColor="#5a3870"/>
        </linearGradient>
        <linearGradient id="gB" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2d6e5a"/>
          <stop offset="100%" stopColor="#6e3d2d"/>
        </linearGradient>
      </defs>
      <g stroke="url(#gA)" strokeWidth="0.22" fill="none" opacity="0.16" vectorEffect="non-scaling-stroke">
        {pathsA.map((d, i) => <path key={`a${i}`} d={d}/>)}
      </g>
      <g stroke="url(#gB)" strokeWidth="0.18" fill="none" opacity="0.1" vectorEffect="non-scaling-stroke">
        {pathsB.map((d, i) => <path key={`b${i}`} d={d}/>)}
      </g>
      <g stroke="#4a1728" strokeWidth="0.12" fill="none" opacity="0.08" vectorEffect="non-scaling-stroke">
        {pathsC.map((d, i) => <path key={`c${i}`} d={d}/>)}
      </g>
    </svg>
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

// ── Cultural Seal (lower ornament) ────────────────────────────────────────────
function CulturalSeal() {
  const spokes = Array.from({length: 24}, (_, i) => {
    const a = i * 15 * Math.PI / 180;
    return { x1: 150 + 18 * Math.cos(a), y1: 100 + 18 * Math.sin(a), x2: 150 + 80 * Math.cos(a), y2: 100 + 80 * Math.sin(a) };
  });
  const petals = Array.from({length: 8}, (_, i) => {
    const a = i * 45 * Math.PI / 180;
    return { cx: 150 + 52 * Math.cos(a), cy: 100 + 52 * Math.sin(a), rot: i * 45 };
  });
  const corners: [number, number][] = [[28, 24], [272, 24], [28, 176], [272, 176]];

  return (
    <svg viewBox="0 0 300 200" style={{ width: '100%', height: '100%' }} aria-hidden>
      {/* Outer frame */}
      <rect x="1" y="1" width="298" height="198" rx="3" fill="none" stroke="#4a1728" strokeWidth="1.8"/>
      <rect x="5" y="5" width="290" height="190" rx="2" fill="none" stroke="#b8956e" strokeWidth="0.9"/>
      {/* Center rosette rings */}
      <circle cx="150" cy="100" r="80" fill="none" stroke="#4a1728" strokeWidth="1"/>
      <circle cx="150" cy="100" r="66" fill="none" stroke="#b8956e" strokeWidth="0.7"/>
      <circle cx="150" cy="100" r="52" fill="none" stroke="#4a1728" strokeWidth="0.8"/>
      <circle cx="150" cy="100" r="36" fill="none" stroke="#4a1728" strokeWidth="0.6"/>
      <circle cx="150" cy="100" r="18" fill="none" stroke="#b8956e" strokeWidth="0.7"/>
      <circle cx="150" cy="100" r="7"  fill="none" stroke="#4a1728" strokeWidth="1.2"/>
      <circle cx="150" cy="100" r="3"  fill="#4a1728"/>
      {/* Spokes */}
      {spokes.map((s, i) => <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="#4a1728" strokeWidth="0.5"/>)}
      {/* Petals */}
      {petals.map((p, i) => (
        <ellipse key={i} cx={p.cx} cy={p.cy} rx="11" ry="6"
          transform={`rotate(${p.rot} ${p.cx} ${p.cy})`}
          fill="none" stroke="#4a1728" strokeWidth="0.7"/>
      ))}
      {/* Text on arc top */}
      <path id="arc1" d="M 78,100 A 72,72 0 0 1 222,100" fill="none"/>
      <text fontFamily="serif" fontWeight="700" fontSize="13" fill="#4a1728" letterSpacing="3.5">
        <textPath href="#arc1" startOffset="8%">EPRIS JOURNAL</textPath>
      </text>
      {/* Text on arc bottom */}
      <path id="arc2" d="M 82,102 A 68,68 0 0 0 218,102" fill="none"/>
      <text fontFamily="monospace" fontSize="7.5" fill="#4a1728" letterSpacing="2">
        <textPath href="#arc2" startOffset="10%">REVEAL THE INVISIBLE</textPath>
      </text>
      {/* Corner ornaments */}
      {corners.map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="14" fill="none" stroke="#4a1728" strokeWidth="0.9"/>
          <circle cx={cx} cy={cy} r="8"  fill="none" stroke="#b8956e" strokeWidth="0.6"/>
          <circle cx={cx} cy={cy} r="3"  fill="#4a1728"/>
          {[0,90,180,270].map(a => {
            const rad = a * Math.PI / 180;
            return <line key={a} x1={cx + 8 * Math.cos(rad)} y1={cy + 8 * Math.sin(rad)} x2={cx + 14 * Math.cos(rad)} y2={cy + 14 * Math.sin(rad)} stroke="#4a1728" strokeWidth="0.5"/>;
          })}
        </g>
      ))}
      {/* Side decorative lines */}
      <line x1="30" y1="100" x2="64" y2="100" stroke="#b8956e" strokeWidth="0.8"/>
      <line x1="236" y1="100" x2="270" y2="100" stroke="#b8956e" strokeWidth="0.8"/>
      <line x1="30" y1="96" x2="50" y2="96" stroke="#4a1728" strokeWidth="0.4"/>
      <line x1="250" y1="96" x2="270" y2="96" stroke="#4a1728" strokeWidth="0.4"/>
      <line x1="30" y1="104" x2="50" y2="104" stroke="#4a1728" strokeWidth="0.4"/>
      <line x1="250" y1="104" x2="270" y2="104" stroke="#4a1728" strokeWidth="0.4"/>
    </svg>
  );
}

// ── Field ─────────────────────────────────────────────────────────────────────
function F({
  label, value, big, mono,
}: {
  label: string; value: string; big?: boolean; mono?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{
        fontFamily: '"PT Sans", sans-serif',
        fontSize: 'clamp(8px, 1.6cqw, 12px)',
        color: '#4a1728',
        opacity: 0.65,
        fontStyle: 'italic',
        lineHeight: 1,
        letterSpacing: '0.02em',
      }}>{label}</span>
      <span style={{
        fontFamily: big
          ? '"Playfair Display", "PT Serif", serif'
          : mono
            ? '"Courier New", monospace'
            : '"Playfair Display", "PT Serif", serif',
        fontSize: big
          ? 'clamp(14px, 2.8cqw, 24px)'
          : 'clamp(11px, 2.2cqw, 18px)',
        fontWeight: big ? 700 : 600,
        color: '#1a0b10',
        lineHeight: 1.1,
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
export function PassportPage({ fields, photoUrl, code, mrz, page2, qrDataUrl }: {
  fields: PassportFields; photoUrl: string | null; code: string;
  mrz: [string, string]; page2?: boolean; qrDataUrl?: string | null;
}) {
  return (
    <div
      className="relative w-full select-none overflow-hidden"
      style={{
        aspectRatio: '88 / 125',
        // Rich warm cream base
        background: 'linear-gradient(160deg, #f5eddc 0%, #ede1c6 40%, #e7d8b8 100%)',
        containerType: 'inline-size',
        // Layered shadow like a real document
        boxShadow: '0 2px 6px rgba(74,23,40,0.12), 0 8px 28px rgba(74,23,40,0.16), 0 20px 60px rgba(74,23,40,0.12)',
        borderRadius: '8px',
      } as CSSProperties}
    >
      {/* Guilloche — rich colored background */}
      <Guilloche />

      {/* EPRIS watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden" aria-hidden>
        <span style={{
          fontFamily: '"Playfair Display", serif',
          fontWeight: 900,
          fontSize: 'clamp(55px, 26cqw, 240px)',
          color: '#4a1728',
          opacity: 0.042,
          letterSpacing: '-0.03em',
          transform: 'rotate(-16deg)',
          userSelect: 'none',
          lineHeight: 1,
        }}>EPRIS</span>
      </div>

      {/* Outer heavy frame */}
      <div className="absolute pointer-events-none" style={{
        inset: '1.2%',
        border: '2px solid #4a1728',
        opacity: 0.82,
      }}/>
      {/* Inner thin frame */}
      <div className="absolute pointer-events-none" style={{
        inset: '2.2%',
        border: '0.7px solid #b8956e',
        opacity: 0.55,
      }}/>

      {/* Colored top accent band — like passport interior cover color */}
      <div style={{
        position: 'absolute',
        top: '1.2%', left: '1.2%', right: '1.2%',
        height: '6.5%',
        background: 'linear-gradient(90deg, rgba(74,23,40,0.92) 0%, rgba(90,28,48,0.88) 50%, rgba(74,23,40,0.92) 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 3.5%',
        pointerEvents: 'none',
      }}>
        <div style={{ color: '#f5eddc', opacity: 0.85 }}><Emblem px={22}/></div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{
            fontFamily: '"Playfair Display", "PT Serif", serif',
            fontWeight: 700,
            fontSize: 'clamp(10px, 2.5cqw, 20px)',
            color: '#f5eddc',
            letterSpacing: '0.1em',
            lineHeight: 1,
          }}>
            {page2 ? 'OBSERVATIONS' : 'EPRIS JOURNAL'}
          </div>
          <div style={{
            fontFamily: '"PT Sans", sans-serif',
            fontSize: 'clamp(5px, 1cqw, 8px)',
            color: '#f5eddc',
            opacity: 0.85,
            letterSpacing: '0.2em',
            lineHeight: 1.3,
            marginTop: 2,
          }}>
            {page2 ? 'OBSERVATIONS' : 'DIGITAL MEMBER PASSPORT'}
          </div>
        </div>
        <div style={{ color: '#f5eddc', opacity: 0.85 }}><Emblem px={22}/></div>
      </div>

      {/* Microtext strip under header band */}
      <div className="absolute overflow-hidden whitespace-nowrap pointer-events-none" style={{
        top: '7.8%', left: '3%', right: '3%',
        fontFamily: 'monospace', fontSize: 'clamp(3.5px, 0.72cqw, 5.5px)',
        letterSpacing: '0.22em', color: '#4a1728', opacity: 0.2, lineHeight: 1,
      }}>
        {'EPRIS JOURNAL · REVEAL THE INVISIBLE · '.repeat(24)}
      </div>

      {/* ── TYPE / CODE / NUMBER ROW ──────────────────────────────────────────── */}
      {!page2 && (
        <div style={{
          position: 'absolute',
          top: '9%', left: '4%', right: '4%',
          display: 'grid', gridTemplateColumns: '1fr 2fr 4fr',
          gap: '3%', alignItems: 'start',
        }}>
          <F label="Type" value="P" />
          <F label="Code" value="EPR" />
          <F label="Member No." value={code} mono />
        </div>
      )}

      {/* Thin divider under type row */}
      {!page2 && (
        <div style={{
          position: 'absolute', top: '15.5%', left: '3%', right: '3%',
          height: '0.5px', background: '#b8956e', opacity: 0.5,
        }}/>
      )}

      {/* Light overlay on content area for legibility */}
      <div style={{
        position: 'absolute',
        top: page2 ? '8.5%' : '16.5%',
        left: '3%', right: '3%',
        bottom: page2 ? '5%' : '26%',
        background: 'rgba(245,237,220,0.38)',
        pointerEvents: 'none',
      }}/>

      {/* ── MAIN CONTENT AREA ─────────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute',
        top: page2 ? '8.5%' : '16.5%',
        left: '3%', right: '3%',
        bottom: page2 ? '5%' : '26%',
        display: 'flex', gap: '3.5%',
      }}>
        {/* LEFT: Photo / QR */}
        <div style={{
          width: '32%', flexShrink: 0,
          display: 'flex', flexDirection: 'column', gap: '4%',
        }}>
          {/* Photo/QR box — ICAO 35×45mm */}
          <div style={{
            width: '100%', aspectRatio: '35/45', flexShrink: 0,
            border: '1.5px solid #4a1728',
            background: page2 ? '#fff' : '#f8f4ed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
            // Inner shadow for photo
            boxShadow: 'inset 0 0 0 1px rgba(74,23,40,0.08)',
          }}>
            {page2 ? (
              qrDataUrl
                ? <img src={qrDataUrl} alt="QR" style={{ width: '86%', height: '86%', objectFit: 'contain' }}/>
                : <span style={{ fontFamily: 'monospace', fontSize: 'clamp(5px, 1cqw, 8px)', color: '#4a1728', opacity: 0.3 }}>QR</span>
            ) : (
              photoUrl
                ? <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: 'multiply', filter: 'sepia(0.2) contrast(0.95)' }}/>
                : <span style={{ fontFamily: '"PT Sans",sans-serif', fontSize: 'clamp(5px, 1cqw, 8px)', color: '#4a1728', opacity: 0.3 }}>PHOTO</span>
            )}
          </div>

          {/* Membership badge */}
          {!page2 && (
            <div style={{
              padding: '5% 6%',
              background: 'rgba(74,23,40,0.06)',
              border: '0.8px solid rgba(74,23,40,0.18)',
            }}>
              <div style={{
                fontFamily: '"PT Sans",sans-serif',
                fontSize: 'clamp(6px, 1cqw, 9px)',
                color: '#4a1728', opacity: 0.6,
                letterSpacing: '0.12em', lineHeight: 1.3,
                textAlign: 'center', textTransform: 'uppercase',
              }}>Membership<br/>Type</div>
              <div style={{
                fontFamily: '"Playfair Display", serif', fontWeight: 700,
                fontSize: 'clamp(9px, 1.8cqw, 14px)',
                color: '#4a1728', textAlign: 'center',
                marginTop: 3, lineHeight: 1,
              }}>
                {fields.membershipType || 'Author'}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Fields */}
        <div style={{
          flex: 1, minWidth: 0,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          {!page2 ? (
            <>
              <F label="Surname" value={fields.surname.toUpperCase()} big />
              <F label="Given Names" value={fields.givenNames.toUpperCase()} big />
              <F label="Nationality" value={`EPRIS · ${fields.country || '—'}`.toUpperCase()} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8%' }}>
                <F label="Date of birth" value={fields.dob || '—'} />
                <F label="Record No." value={code} mono />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8%' }}>
                <F label="Sex" value={(fields.sex || 'X').toUpperCase()} />
                <F label="City" value={fields.city || '—'} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8%' }}>
                <F label="Date of issue" value={fields.issueDate || '—'} />
                <F label="Authority" value="EPRIS J." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8%' }}>
                <F label="Date of expiry" value={fields.expiryDate || '—'} />
                <div>
                  <div style={{
                    fontFamily: '"PT Sans",sans-serif',
                    fontSize: 'clamp(7px, 1.4cqw, 11px)', color: '#4a1728', opacity: 0.65,
                    fontStyle: 'italic', lineHeight: 1, marginBottom: 4,
                  }}>Holder's signature</div>
                  <div style={{ borderBottom: '0.8px solid #b8956e', width: '82%', height: 'clamp(8px, 1.8cqh, 18px)' }}/>
                </div>
              </div>
              <F label="Professional Field" value={(fields.field || '—').toUpperCase()} />
              <VerificationStamp />
            </>
          ) : (
            <>
              <F label="Personal Motto" value={fields.motto || '—'} big />
              <F label="Website · ORCID · Social" value={fields.link || '—'} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8%' }}>
                <F label="Membership Type" value={fields.membershipType || '—'} />
                <F label="Verification" value={code} mono />
              </div>
              <F label="Digital Signature" value={generateSignatureString(code, fields)} mono />
              <F label="Scan to Verify" value={`eprisjournal.com/passport/${code}`} />
              {/* Decorative seal on observations page */}
              <div style={{
                flex: 1, minHeight: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: 0.1,
              }}>
                <svg viewBox="0 0 120 80" style={{ width: '85%' }} aria-hidden>
                  <ellipse cx="60" cy="40" rx="58" ry="38" stroke="#4a1728" strokeWidth="2" fill="none"/>
                  <ellipse cx="60" cy="40" rx="50" ry="30" stroke="#4a1728" strokeWidth="1" fill="none"/>
                  <text x="60" y="36" textAnchor="middle" fontFamily="serif" fontWeight="bold" fontSize="11" fill="#4a1728">EPRIS JOURNAL</text>
                  <text x="60" y="48" textAnchor="middle" fontFamily="monospace" fontSize="6.5" fill="#4a1728">REVEAL THE INVISIBLE</text>
                  <line x1="16" y1="40" x2="36" y2="40" stroke="#4a1728" strokeWidth="0.8"/>
                  <line x1="84" y1="40" x2="104" y2="40" stroke="#4a1728" strokeWidth="0.8"/>
                </svg>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── CULTURAL SEAL ZONE (between content and MRZ) ─────────────────────── */}
      {!page2 && (
        <div style={{
          position: 'absolute',
          bottom: '11.5%', left: '3%', right: '3%',
          height: '14%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0.2,
          pointerEvents: 'none',
        }}>
          <CulturalSeal />
        </div>
      )}

      {/* ── HOLOGRAPHIC STRIP ─────────────────────────────────────────────────── */}
      {!page2 && (
        <>
          <style>{`
            @keyframes shimmerStrip {
              0% { background-position: 200% center; }
              100% { background-position: -200% center; }
            }
          `}</style>
          <div style={{
            position: 'absolute',
            bottom: '11%', left: '3%', right: '3%',
            height: '0.7%',
            background: 'linear-gradient(90deg, transparent 0%, rgba(180,80,80,0.4) 15%, rgba(80,160,240,0.45) 30%, rgba(60,220,120,0.4) 45%, rgba(240,200,40,0.4) 60%, rgba(220,60,180,0.4) 75%, rgba(60,140,240,0.45) 85%, transparent 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmerStrip 8s linear infinite',
            mixBlendMode: 'overlay',
          }}/>
        </>
      )}

      {/* ── MRZ ZONE ──────────────────────────────────────────────────────────── */}
      {!page2 && (
        <div style={{
          position: 'absolute',
          bottom: '1.5%', left: '3%', right: '3%',
        }}>
          {/* MRZ label */}
          <div style={{
            fontFamily: '"PT Sans", sans-serif',
            fontSize: 'clamp(5px, 1cqw, 8px)',
            color: '#4a1728', opacity: 0.5,
            letterSpacing: '0.15em',
            marginBottom: '0.8%',
            textTransform: 'uppercase',
          }}>Machine Readable Zone</div>
          {/* MRZ background */}
          <div style={{
            background: 'rgba(255,255,255,0.85)',
            border: '0.6px solid rgba(74,23,40,0.2)',
            padding: '2% 2%',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontFamily: '"OCR-B 10 BT", "OCR-B", "Courier New", monospace',
              fontSize: 'clamp(10px, 2cqw, 18px)',
              fontWeight: 'bold',
              color: '#1a0b10', opacity: 0.9,
              lineHeight: 1.2,
            }}>
              {mrz[0].split('').map((c, i) => <span key={i}>{c}</span>)}
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontFamily: '"OCR-B 10 BT", "OCR-B", "Courier New", monospace',
              fontSize: 'clamp(10px, 2cqw, 18px)',
              fontWeight: 'bold',
              color: '#1a0b10', opacity: 0.9,
              lineHeight: 1.2,
              marginTop: '1%',
            }}>
              {mrz[1].split('').map((c, i) => <span key={i}>{c}</span>)}
            </div>
          </div>
        </div>
      )}

      {/* Page number */}
      <div style={{
        position: 'absolute', bottom: '0.5%', right: '3.5%',
        fontFamily: 'monospace',
        fontSize: 'clamp(3.5px, 0.6cqw, 5px)',
        color: '#4a1728', opacity: 0.28,
        letterSpacing: '0.1em',
      }}>
        {page2 ? '3' : '2'} / 32
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
  const [rot, setRot] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const mrz = buildMRZ(fields, code);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isZoomed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rotateX = ((y - cy) / cy) * -4;
    const rotateY = ((x - cx) / cx) * 4;
    setRot({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    if (isZoomed) return;
    setRot({ x: 0, y: 0 });
    setIsHovering(false);
  };

  return (
    <>
      <div className={`w-full max-w-[560px] mx-auto ${isZoomed ? 'hidden' : 'block'}`} style={{ perspective: 1200 }}>
        <div
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={handleMouseLeave}
          onClick={() => setIsZoomed(true)}
          className="relative cursor-zoom-in"
          style={{
            transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,
            transition: isHovering ? 'transform 0.1s ease-out' : 'transform 0.5s ease-out',
            transformStyle: 'preserve-3d',
          }}
        >
          <div className="absolute inset-0 z-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-[#f7f2ea]/20 rounded-xl pointer-events-none">
            <div className="bg-[#501a2c] text-[#f7f2ea] font-mono tracking-widest text-[10px] uppercase px-5 py-2.5 rounded-sm flex items-center gap-2 shadow-lg">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path><path d="M11 8v6"></path><path d="M8 11h6"></path></svg>
              TAP TO ZOOM
            </div>
          </div>
          <PassportPage
            fields={fields}
            photoUrl={photoUrl}
            code={code}
            mrz={mrz}
            qrDataUrl={qrDataUrl}
          />
        </div>
      </div>

      {isZoomed && (
        <div className="fixed inset-0 z-[200] bg-[#f7f2ea]/95 backdrop-blur-sm flex flex-col items-center justify-start overflow-y-auto pt-8 pb-24 px-2 sm:px-8 cursor-zoom-out" onClick={() => setIsZoomed(false)}>
          <div className="w-full max-w-2xl mx-auto flex flex-col gap-8">
            <div className="self-end text-[var(--pp-burgundy)] text-[10px] font-mono tracking-widest uppercase mb-2 flex items-center gap-2 hover:opacity-70 transition-opacity">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
              CLOSE
            </div>
            <div className="shadow-[0_20px_50px_rgba(80,26,44,0.15)] rounded-2xl overflow-hidden ring-1 ring-[var(--pp-burgundy)]/10">
              <PassportPage
                fields={fields}
                photoUrl={photoUrl}
                code={code}
                mrz={mrz}
                page2={false}
                qrDataUrl={qrDataUrl}
              />
            </div>
            <div className="shadow-[0_20px_50px_rgba(80,26,44,0.15)] rounded-2xl overflow-hidden ring-1 ring-[var(--pp-burgundy)]/10">
              <PassportPage
                fields={fields}
                photoUrl={photoUrl}
                code={code}
                mrz={mrz}
                page2={true}
                qrDataUrl={qrDataUrl}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
