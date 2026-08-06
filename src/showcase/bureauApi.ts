// Бюро — разборы приёмов, которые редакция пишет сама. В отличие от витрины,
// где карточка ссылается на чужой источник, здесь автор текста — журнал, и
// отвечает за него он же. Поэтому и хранилище на сервере отдельное.
const API_BASE = import.meta.env.VITE_SHOWCASE_API || 'https://api.eprisjournal.com/showcase';

export interface CaseLayer {
  label: string;
  text: string;
}

export interface CaseExample {
  workId: string;
  title: string;
  author: string;
  note?: string;
}

export interface BureauCase {
  id: string;
  slug: string;
  kind?: string;
  title: string;
  summary?: string;
  layers: CaseLayer[];
  examples?: CaseExample[];
  editorial?: string;
  publishedAt?: string | null;
}

export async function fetchCases(signal?: AbortSignal): Promise<BureauCase[]> {
  const response = await fetch(`${API_BASE}/cases`, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error(`Bureau is unavailable (${response.status})`);
  const payload = await response.json();
  return Array.isArray(payload.cases) ? payload.cases : [];
}

export async function fetchCase(slug: string, signal?: AbortSignal): Promise<BureauCase | null> {
  const response = await fetch(`${API_BASE}/cases/${encodeURIComponent(slug)}`, { signal, cache: 'no-store' });
  // 404 — это «такого разбора нет», а не поломка: страница показывает пустое
  // состояние, а не ошибку сети.
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Bureau is unavailable (${response.status})`);
  const payload = await response.json();
  return payload.case ?? null;
}
