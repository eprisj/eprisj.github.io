import type { PassportFields } from './passportRender';

const API_BASE = 'https://api.eprisjournal.com';

export interface PublishedPassport {
  code: string;
  fields: PassportFields;
  photoUrl: string | null;
  createdAt: string;
}

export async function publishPassport(code: string, fields: PassportFields, photoDataUrl: string | null): Promise<{ ok: boolean; code?: string; error?: string }> {
  let photoContentType: string | undefined;
  let photoData: string | undefined;
  if (photoDataUrl) {
    const m = photoDataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (m) { photoContentType = m[1]; photoData = m[2]; }
  }
  const res = await fetch(`${API_BASE}/passport`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, fields, photoData, photoContentType }),
  });
  return res.json();
}

export async function fetchPassport(code: string): Promise<{ ok: boolean; record?: PublishedPassport; error?: string }> {
  const res = await fetch(`${API_BASE}/passport?code=${encodeURIComponent(code)}`);
  if (res.status === 404) return { ok: false, error: 'not found' };
  return res.json();
}
