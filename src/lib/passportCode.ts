// Codes and cosmetic "digital signature" string for the EPRIS Digital Member
// Passport. This is deliberately NOT an ICAO 9303 machine-readable zone: no
// check-digit algorithm, no fixed 44-char lines, no "<" filler characters,
// no passport-number encoding. It's a decorative authenticity flourish only.

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0, I/1 — avoids visual ambiguity

export function generatePassportCode(): string {
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `EPR-${out}`;
}

// Small non-cryptographic hash purely for a cosmetic "signature string" —
// not a security feature, not a real document checksum.
function hash32(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

interface SignatureBasisFields {
  surname?: string;
  givenNames?: string;
  dob?: string;
  issueDate?: string;
}

export function generateSignatureString(code: string, fields: SignatureBasisFields): string {
  const basis = [code, fields.surname, fields.givenNames, fields.dob, fields.issueDate].join('|');
  const h = hash32(basis);
  const a = h.slice(0, 4);
  const b = h.slice(4, 8);
  return `SIG · ${a}-${b} · EPRISJOURNAL`;
}
