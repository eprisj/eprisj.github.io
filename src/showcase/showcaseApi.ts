// Public API for the EPRIS Showcase — a vitrine of set design and conceptual
// art by emerging authors worldwide. Same host and moderation model as the
// collaboration registry: public submissions land as "Under review", the
// editorial team promotes them to "Published".

// Overridable so the page can be run against a local instance of the showcase
// service; production builds have no such variable and use the live API.
const API_BASE = import.meta.env.VITE_SHOWCASE_API || 'https://api.eprisjournal.com/showcase';

export type WorkStatus = 'Published' | 'Under review' | 'Archived';
export type WorkSource = 'editorial' | 'public' | 'discovered';

export interface WorkImage {
  url: string;
  credit?: string;
  caption?: string;
}

export interface Work {
  id: string;
  title: string;
  year?: number;
  discipline?: string;
  medium?: string;
  author: string;
  /** Хто ще стоїть за роботою: керівник команди, співавтори, установа-замовник.
   *  Заповнюється редакцією з джерела — у формі подачі цього поля немає. */
  credits?: string;
  authorInstagram?: string;
  portfolio?: string;
  country?: string;
  countryCode?: string;
  city?: string;
  venue?: string;
  statement?: string;
  images: WorkImage[];
  tags?: string[];
  status?: WorkStatus;
  source?: WorkSource;
  sourceUrl?: string;
  score?: number;
  addedAt?: string;
}

export interface WorkDraft {
  title: string;
  year: string;
  discipline: string;
  medium: string;
  author: string;
  authorInstagram: string;
  portfolio: string;
  country: string;
  countryCode: string;
  city: string;
  venue: string;
  statement: string;
  imageUrl: string;
  contact: string;
  website: string; // honeypot
}

export const EMPTY_WORK_DRAFT: WorkDraft = {
  title: '', year: '', discipline: 'Set design', medium: '', author: '',
  authorInstagram: '', portfolio: '', country: '', countryCode: '', city: '',
  venue: '', statement: '', imageUrl: '', contact: '', website: '',
};

export const DISCIPLINES = [
  'Set design',
  'Scenography',
  'Conceptual art',
  'Installation',
  'Performance',
  'Spatial design',
  'Prop styling',
  'Light art',
  'Moving image',
  'Multidisciplinary',
];

export async function fetchWorks(signal?: AbortSignal): Promise<Work[]> {
  const response = await fetch(`${API_BASE}/works`, { signal, cache: 'no-store' });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || 'Showcase unavailable');
  return (result.works || []) as Work[];
}

export async function submitWork(draft: WorkDraft): Promise<Work> {
  const response = await fetch(`${API_BASE}/works`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draft),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || 'Could not submit the work');
  return result.work as Work;
}

export function flag(code?: string) {
  const normalized = (code || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return '◌';
  return String.fromCodePoint(...[...normalized].map((letter) => 127397 + letter.charCodeAt(0)));
}

export function normalizeInstagram(value?: string) {
  return (value || '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/\/$/, '');
}

export function externalUrl(value?: string) {
  if (!value) return '';
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

/* Заявка бюро. До неё витрина умела принимать только чужие РАБОТЫ: все призывы
   на странице просили отдать нам труд, и человеку, который хочет НАНЯТЬ бюро,
   идти было некуда. Это вторая дверь.

   Ответ намеренно пустой: заявка не становится ничем публичным, её читает
   редакция. Показывать в ответе сохранённые контакты было бы приглашением
   выкачать чужие. */
export interface Enquiry {
  name: string;
  contact: string;
  organisation?: string;
  kind?: string;
  place?: string;
  when?: string;
  budget?: string;
  brief: string;
  /** Ловушка для ботов: живой человек это поле не видит и не заполняет. */
  website?: string;
}

export async function sendEnquiry(enquiry: Enquiry): Promise<void> {
  const response = await fetch(`${API_BASE}/enquiries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(enquiry),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `Could not send the enquiry (${response.status})`);
  }
}
