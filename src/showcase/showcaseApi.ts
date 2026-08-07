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

const FALLBACK_WORKS: Work[] = [
  {
    id: 'fallback-prada-marfa',
    title: 'Prada Marfa',
    author: 'Elmgreen & Dragset',
    year: 2005,
    discipline: 'Installation',
    medium: 'Adobe, plaster, glass, and stock from the autumn 2005 collection',
    city: 'Valentine',
    country: 'United States',
    countryCode: 'US',
    venue: 'U.S. Highway 90, Texas',
    statement: 'A sealed replica of a Prada boutique standing alone on a desert highway, stocked with shoes and bags from the autumn 2005 collection. The door is locked permanently: the shop was built never to open.',
    tags: ['site specific', 'commerce', 'desert'],
    sourceUrl: 'https://ballroommarfa.org/prada-marfa/',
    images: [
      { url: 'https://api.eprisjournal.com/showcase/img/e484153566a6f52b.jpg', credit: 'Photo: rob zand (CC BY-SA 2.0)', caption: 'The building on Highway 90' },
      { url: 'https://api.eprisjournal.com/showcase/img/9468c11a04ab8992.jpg', credit: 'Photo: rob zand (CC BY-SA 2.0)', caption: 'The locked front' },
    ],
    status: 'Published',
    source: 'curated',
    addedAt: '2026-08-06T16:43:18.281Z',
  },
  {
    id: 'fallback-spiral-jetty',
    title: 'Spiral Jetty',
    author: 'Robert Smithson',
    year: 1970,
    discipline: 'Installation',
    medium: 'Basalt, earth and salt crystals built into the lakebed',
    city: 'Rozel Point',
    country: 'United States',
    countryCode: 'US',
    venue: 'Great Salt Lake, Utah',
    statement: 'A coil of black basalt run out from the shore into the Great Salt Lake, made to be left alone. When the lake drops it comes back encrusted in salt, so the work is never twice the same object.',
    tags: ['land art', 'entropy', 'site'],
    sourceUrl: 'https://www.diaart.org/visit/visit-our-locations-sites/robert-smithson-spiral-jetty',
    images: [
      { url: 'https://api.eprisjournal.com/showcase/img/ec9bb0c14b97c9db.jpg', credit: 'Photo: Jill Meyer (CC BY-SA 4.0)', caption: 'The jetty with the water receded' },
      { url: 'https://api.eprisjournal.com/showcase/img/75f129d02cfbd004.jpg', credit: 'Photo: redlegsfan21 (CC BY-SA 2.0)', caption: 'The coil from the shore' },
    ],
    status: 'Published',
    source: 'curated',
    addedAt: '2026-08-06T16:43:18.281Z',
  },
  {
    id: 'fallback-skyspace-piz-uter',
    title: 'Skyspace, Piz Uter',
    author: 'James Turrell',
    year: 2005,
    discipline: 'Installation',
    medium: 'Chamber with an aperture open to the sky',
    city: 'Zuoz',
    country: 'Switzerland',
    countryCode: 'CH',
    venue: 'Hotel Castell, Engadin',
    statement: 'A chamber set into the mountainside above Zuoz, built as a dry-stone cylinder with an oculus open to the sky. At dusk the light inside is tuned against the light above until the opening becomes a surface.',
    tags: ['light', 'sky', 'chamber'],
    sourceUrl: 'https://haeusler-contemporary.com/james-turrell-skyspace-zuoz-en',
    images: [
      { url: 'https://api.eprisjournal.com/showcase/img/fd770586508a52fe.jpg', credit: 'Photo: Kamahele (CC BY-SA 3.0)', caption: 'Inside the skyspace' },
      { url: 'https://api.eprisjournal.com/showcase/img/6ac7efc1e38e7f83.jpg', credit: 'Photo: Rolf Maria Rexhausen (CC BY-SA 4.0)', caption: 'The oculus' },
    ],
    status: 'Published',
    source: 'curated',
    addedAt: '2026-08-06T15:30:38.888Z',
  },
  {
    id: 'fallback-superkilen',
    title: 'Superkilen',
    author: 'Superflex with BIG and Topotek 1',
    year: 2012,
    discipline: 'Spatial design',
    medium: 'Public park, collected objects from 62 countries',
    city: 'Copenhagen',
    country: 'Denmark',
    countryCode: 'DK',
    venue: 'Norrebro',
    statement: 'A kilometre of public space assembled from 108 objects brought from the countries the surrounding neighbourhood came from. The park exhibits what that district already is.',
    tags: ['public space', 'collection', 'urban'],
    sourceUrl: 'https://superflex.net/works/superkilen',
    images: [
      { url: 'https://api.eprisjournal.com/showcase/img/4e9f39e98f1520ad.jpg', credit: 'Photo: Maria Eklind (CC BY-SA 2.0)', caption: 'The red square' },
      { url: 'https://api.eprisjournal.com/showcase/img/6cda7cc5b1176541.jpg', credit: 'Photo: Fred Romero (CC BY 2.0)', caption: 'The green section' },
    ],
    status: 'Published',
    source: 'curated',
    addedAt: '2026-08-06T15:30:38.888Z',
  },
  {
    id: 'fallback-dior-tokyo',
    title: 'Christian Dior: Designer of Dreams — Tokyo scenography',
    author: 'OMA',
    year: 2023,
    discipline: 'Scenography',
    medium: 'Pyramidal staircase, wood clad in Awagami washi paper',
    city: 'Tokyo',
    country: 'Japan',
    countryCode: 'JP',
    venue: 'Museum of Contemporary Art Tokyo',
    statement: 'Fifteen rooms across two floors. In the Dior and Japan room, a floor-to-ceiling pathway clad in Awagami washi from Tokushima carries the mannequins.',
    tags: ['scenography', 'fashion', 'washi', 'retrospective'],
    sourceUrl: 'https://www.dezeen.com/2023/02/10/oma-scenography-dior-exhibition-japan-storytelling/',
    images: [
      { url: 'https://api.eprisjournal.com/showcase/img/3fcf761df4a6132f.jpg', credit: 'OMA', caption: 'OMA creates a stage for storytelling' },
      { url: 'https://api.eprisjournal.com/showcase/img/d3b77095f3d723c5.jpg', credit: 'OMA', caption: 'Exhibition scenography in Tokyo' },
    ],
    status: 'Published',
    source: 'editorial',
    addedAt: '2023-02-10T06:00:28.000Z',
  },
  {
    id: 'fallback-search-history',
    title: 'Search History',
    author: 'Space Popular',
    year: 2023,
    discipline: 'Installation',
    medium: 'Printed overlapping curtains, projected imagery',
    city: 'Rome',
    country: 'Italy',
    countryCode: 'IT',
    venue: 'MAXXI',
    statement: "Aldo Rossi's theories of the city applied to virtual worlds: multilayered images of metaverse environments printed on overlapping curtains, with doorways reading as gateways between virtual spaces.",
    tags: ['installation', 'metaverse', 'aldo rossi', 'exhibition'],
    sourceUrl: 'https://www.dezeen.com/2023/01/06/search-history-space-popular-exhibition-maxxi/',
    images: [
      { url: 'https://api.eprisjournal.com/showcase/img/62ca3ca0902eb3a3.jpg', credit: 'Space Popular', caption: "Space Popular reinterprets Aldo Rossi's theories" },
      { url: 'https://api.eprisjournal.com/showcase/img/f347c1d124f4503a.jpg', credit: 'Space Popular', caption: 'Layered virtual city curtains' },
    ],
    status: 'Published',
    source: 'editorial',
    addedAt: '2023-01-06T10:00:44.000Z',
  },
];

export async function fetchWorks(signal?: AbortSignal): Promise<Work[]> {
  try {
    const response = await fetch(`${API_BASE}/works`, { signal, cache: 'no-store' });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || 'Showcase unavailable');
    const works = (result.works || []) as Work[];
    return works.length ? works : FALLBACK_WORKS;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    return FALLBACK_WORKS;
  }
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
