import type { PassportFields } from './passportRender';

const API_BASE = 'https://api.eprisjournal.com';

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
  const res = await fetch(`${API_BASE}/passport`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function fetchPassport(code: string): Promise<{ ok: boolean; record?: PublishedPassport; error?: string }> {
  const res = await fetch(`${API_BASE}/passport?code=${encodeURIComponent(code)}`);
  if (res.status === 404) return { ok: false, error: 'not found' };
  return res.json();
}
