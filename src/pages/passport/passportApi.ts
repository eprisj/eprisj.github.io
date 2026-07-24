import type { PassportFields } from './passportRender';

const API_BASE = 'https://api.eprisjournal.com';

// Same key/encoding as public/admin/app.js's AUTH_PW_STORAGE_KEY, so logging
// into either the admin panel or the passport creator unlocks both (shared
// single sign-on via localStorage, same origin).
const ADMIN_PW_STORAGE_KEY = 'epris_admin_pw_saved';

export function getSavedAdminPassword(): string {
  try {
    const b64 = localStorage.getItem(ADMIN_PW_STORAGE_KEY);
    return b64 ? atob(b64) : '';
  } catch {
    return '';
  }
}

export function saveAdminPassword(pw: string): void {
  try { localStorage.setItem(ADMIN_PW_STORAGE_KEY, btoa(pw)); } catch { /* localStorage unavailable */ }
}

/**
 * Verifies a password against the live API by calling an existing
 * read-only, already-password-protected endpoint (passport-list) — no
 * dedicated "check password" endpoint exists, and this one has no side
 * effects, so it's safe to use purely as a verification probe.
 */
export async function verifyAdminPassword(pw: string): Promise<boolean> {
  if (!pw) return false;
  try {
    const res = await fetch(`${API_BASE}/passport-list`, { headers: { 'X-Admin-Password': pw } });
    return res.ok;
  } catch {
    return false;
  }
}

export interface PublishedPassport {
  code: string;
  fields: PassportFields;
  photoUrl: string | null;
  createdAt: string;
}

export interface PublishOptions {
  /** Overwrite the record at `code` in place (edit) instead of minting a new code. */
  overwrite?: boolean;
  /** When editing without uploading a new photo, keep this existing photo URL. */
  existingPhotoUrl?: string | null;
  /** When editing, explicitly remove the photo. */
  clearPhoto?: boolean;
}

export async function publishPassport(
  code: string,
  fields: PassportFields,
  photoDataUrl: string | null,
  opts: PublishOptions = {},
): Promise<{ ok: boolean; code?: string; url?: string; error?: string }> {
  let photoContentType: string | undefined;
  let photoData: string | undefined;
  if (photoDataUrl) {
    const m = photoDataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (m) { photoContentType = m[1]; photoData = m[2]; }
  }
  const body: Record<string, unknown> = { code, fields, photoData, photoContentType };
  if (opts.overwrite) body.overwrite = true;
  // Only relevant when no new photo is uploaded: keep or clear the existing one.
  if (!photoData) {
    if (opts.clearPhoto) body.clearPhoto = true;
    else if (opts.existingPhotoUrl) body.existingPhotoUrl = opts.existingPhotoUrl;
  }
  // Sent for when the API adds the same server-side check /passport-annul and
  // /content already enforce — the UI-level gate (PassportAuthGate) is the
  // actual protection today, since this endpoint doesn't validate it yet.
  const pw = getSavedAdminPassword();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (pw) headers['X-Admin-Password'] = pw;
  const res = await fetch(`${API_BASE}/passport`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function fetchPassport(code: string): Promise<{ ok: boolean; record?: PublishedPassport; error?: string }> {
  const res = await fetch(`${API_BASE}/passport?code=${encodeURIComponent(code)}`);
  if (res.status === 404) return { ok: false, error: 'not found' };
  return res.json();
}
