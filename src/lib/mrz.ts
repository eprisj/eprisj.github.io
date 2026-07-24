// ── ICAO 9303 TD3 Machine Readable Zone ──────────────────────────────────────
// Single source of truth for the passport MRZ, shared by PassportPreview
// (on-screen), PassportCardPDF (react-pdf export) and passportRender (canvas
// PNG export) — previously each of those triplicated the same buggy generator.
//
// TD3 (passport booklet) is two 44-character lines:
//   Line 1: P< + issuing-state code (3) + name field (39) = 44
//   Line 2: doc no.(9) + check + nationality(3) + DOB(6) + check + sex(1)
//           + expiry(6) + check + personal no.(14) + check + composite check = 44
// Reference: ICAO Doc 9303 Part 4.

export interface MRZSourceFields {
  surname: string;
  givenNames: string;
  dob: string;         // 'YYYY-MM-DD'
  expiryDate: string;  // 'YYYY-MM-DD'
  sex?: string;        // 'M' | 'F' | 'X' | '' (unspecified)
}

const ISSUING_CODE = 'EPR'; // 3-letter pseudo issuing-authority code — used consistently in both lines

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// A name field, ICAO-normalized: letters only, internal whitespace/punctuation
// collapsed to a single '<' word separator (never dropped — dropping a space
// silently glues two words together, e.g. "VAN DER BERG" -> "VANDERBERG").
function mrzToken(s: string): string {
  return stripDiacritics(String(s || ''))
    .toUpperCase()
    .replace(/[^A-Z ]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join('<');
}

// Alphanumeric-only field (document number): strips separators like the "-" in
// "EPR-MPCQSE", keeps letters/digits, pads with '<' filler.
function padFill(s: string, n: number): string {
  return String(s || '').replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, n).padEnd(n, '<');
}

// ICAO 9303 check-digit algorithm: weights 7/3/1 cycling, '<' = 0,
// digits = their value, letters = charCode - 55 (A=10 … Z=35).
function checkDigit(s: string): string {
  const W = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const v = c === '<' ? 0 : /\d/.test(c) ? +c : c.charCodeAt(0) - 55;
    sum += v * W[i % 3];
  }
  return String(sum % 10);
}

function yymmdd(iso: string): string {
  const digits = String(iso || '').replace(/-/g, '').slice(2, 8);
  return /^\d{6}$/.test(digits) ? digits : '<<<<<<';
}

/**
 * Builds the two 44-character TD3 MRZ lines for a passport-style document.
 * `code` is the document/member number (e.g. "EPR-MPCQSE" — separators are
 * stripped automatically). Every check digit is computed correctly and the
 * issuing-state code is identical on both lines (previously line 1 used a
 * 6-letter "EPRISJ" while line 2 used the real 3-letter "EPR" — a mismatch
 * that made the MRZ internally inconsistent and unparseable).
 */
export function buildMRZ(f: MRZSourceFields, code: string): [string, string] {
  // ── Line 1: document type + issuing code + name ──
  const nameField = `${mrzToken(f.surname)}<<${mrzToken(f.givenNames)}`;
  const line1 = `P<${ISSUING_CODE}${nameField}`.slice(0, 44).padEnd(44, '<');

  // ── Line 2 ──
  const num = padFill(code, 9);
  const numChk = checkDigit(num);
  const dob = yymmdd(f.dob);
  const dobChk = checkDigit(dob);
  const sexRaw = (f.sex || '').toUpperCase();
  const sex = sexRaw === 'M' || sexRaw === 'F' || sexRaw === 'X' ? sexRaw : '<';
  const exp = yymmdd(f.expiryDate);
  const expChk = checkDigit(exp);
  const personalNo = '<'.repeat(14); // optional field, unused here
  const personalChk = checkDigit(personalNo); // naturally '0' — an all-filler field

  // Composite check digit covers exactly: doc-no+check, DOB+check, expiry+check,
  // personal-no+check (39 chars) — sex and nationality are NOT part of it.
  const composite = `${num}${numChk}${dob}${dobChk}${exp}${expChk}${personalNo}${personalChk}`;
  const compositeChk = checkDigit(composite);

  const line2 = `${num}${numChk}${ISSUING_CODE}${dob}${dobChk}${sex}${exp}${expChk}${personalNo}${personalChk}${compositeChk}`
    .slice(0, 44).padEnd(44, '<');

  return [line1, line2];
}
