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

/**
 * Editorially authored starter cases. The API can replace these as soon as
 * the bureau team publishes its own breakdowns, but the public page should
 * never look empty while that editorial queue is being assembled.
 */
export const FALLBACK_CASES: BureauCase[] = [
  {
    id: 'case-arrival-image',
    slug: 'arrival-image',
    kind: 'SCENOGRAPHY / ARRIVAL',
    title: 'Make the entrance the first image',
    summary: 'A strong project does not begin in the room. It begins with the moment the visitor understands what kind of room this is.',
    layers: [
      { label: 'The move', text: 'Hold one unmistakable object or frame at the threshold, then let the rest of the scene arrive slowly behind it.' },
      { label: 'What carries it', text: 'A compressed sightline, one material change underfoot, and a caption that behaves like part of the architecture.' },
      { label: 'Where it breaks', text: 'Too many competing signs at the door turn the first impression into a trade-fair corridor.' },
    ],
    examples: [
      { workId: 'fallback-prada-marfa', title: 'Prada Marfa', author: 'Elmgreen & Dragset', note: 'A sealed storefront turns a roadside approach into the work itself.' },
      { workId: 'fallback-dior-tokyo', title: 'Christian Dior: Designer of Dreams', author: 'OMA', note: 'A monumental threshold gives the exhibition its first change of scale.' },
    ],
    editorial: 'EPRIS Bureau / field note 01',
  },
  {
    id: 'case-tuned-light',
    slug: 'tuned-light',
    kind: 'LIGHT / ATMOSPHERE',
    title: 'Tune the light until it becomes a surface',
    summary: 'Light works hardest when it changes the status of a material: wall into horizon, glass into depth, darkness into a room.',
    layers: [
      { label: 'The move', text: 'Set a calm base exposure, then introduce one controlled shift that the eye reads before it can name it.' },
      { label: 'What carries it', text: 'A precise aperture, a protected shadow line and enough empty wall for the light to have a measurable edge.' },
      { label: 'Where it breaks', text: 'Decorative gradients flatten the scene. The source must be legible in the shadow, not only in the highlight.' },
    ],
    examples: [
      { workId: 'fallback-skyspace-piz-uter', title: 'Skyspace, Piz Uter', author: 'James Turrell', note: 'The aperture is simple; the changing relationship between inside and sky does the work.' },
      { workId: 'fallback-spiral-jetty', title: 'Spiral Jetty', author: 'Robert Smithson', note: 'Salt, water and weather keep rewriting the same dark line.' },
    ],
    editorial: 'EPRIS Bureau / field note 02',
  },
  {
    id: 'case-collected-city',
    slug: 'collected-city',
    kind: 'SPATIAL DESIGN / ROUTE',
    title: 'Build a route from real objects',
    summary: 'A space becomes memorable when its objects are not decoration but evidence of the people, habits and places it is made for.',
    layers: [
      { label: 'The move', text: 'Collect a family of objects, give each one a clear address, and let the visitor discover the route by moving between them.' },
      { label: 'What carries it', text: 'A strict colour field, repeated dimensions and one generous pause where the collection can be read as a whole.' },
      { label: 'Where it breaks', text: 'A prop list without a route is storage. The visitor needs sequence, contrast and a reason to turn the corner.' },
    ],
    examples: [
      { workId: 'fallback-superkilen', title: 'Superkilen', author: 'Superflex with BIG and Topotek 1', note: 'A public park becomes a legible portrait through objects brought from 62 countries.' },
      { workId: 'fallback-search-history', title: 'Search History', author: 'Space Popular', note: 'Layered curtains turn a collection of images into a walkable sequence.' },
    ],
    editorial: 'EPRIS Bureau / field note 03',
  },
  {
    id: 'case-one-material',
    slug: 'one-material-many-scales',
    kind: 'SET DESIGN / MATERIAL',
    title: 'Let one material do several jobs',
    summary: 'The most convincing sets repeat a material at different scales until the whole scene starts speaking one language.',
    layers: [
      { label: 'The move', text: 'Choose one tactile anchor, then repeat it as architecture, furniture, detail and image background.' },
      { label: 'What carries it', text: 'Changes in grain, seam, thickness and light keep the repetition alive without introducing visual noise.' },
      { label: 'Where it breaks', text: 'A palette is not a material system. If every surface has the same finish, there is no depth to photograph.' },
    ],
    examples: [
      { workId: 'fallback-dior-tokyo', title: 'Dior: Designer of Dreams', author: 'OMA', note: 'Washi paper shifts from wall finish to a full-scale narrative device.' },
      { workId: 'fallback-prada-marfa', title: 'Prada Marfa', author: 'Elmgreen & Dragset', note: 'The storefront repeats the language of retail while refusing its usual function.' },
    ],
    editorial: 'EPRIS Bureau / field note 04',
  },
];

export async function fetchCases(signal?: AbortSignal): Promise<BureauCase[]> {
  try {
    const response = await fetch(`${API_BASE}/cases`, { signal, cache: 'no-store' });
    if (!response.ok) throw new Error(`Bureau is unavailable (${response.status})`);
    const payload = await response.json();
    const cases = Array.isArray(payload.cases) ? payload.cases : [];
    return cases.length ? cases : FALLBACK_CASES;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    return FALLBACK_CASES;
  }
}

export async function fetchCase(slug: string, signal?: AbortSignal): Promise<BureauCase | null> {
  try {
    const response = await fetch(`${API_BASE}/cases/${encodeURIComponent(slug)}`, { signal, cache: 'no-store' });
    // A missing server record can still resolve to an editorial starter case.
    if (response.status === 404) return FALLBACK_CASES.find((item) => item.slug === slug) ?? null;
    if (!response.ok) throw new Error(`Bureau is unavailable (${response.status})`);
    const payload = await response.json();
    return payload.case ?? FALLBACK_CASES.find((item) => item.slug === slug) ?? null;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    return FALLBACK_CASES.find((item) => item.slug === slug) ?? null;
  }
}
