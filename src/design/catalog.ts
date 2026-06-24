export type ShopCategory =
  | 'Sofas'
  | 'Armchairs'
  | 'Lighting'
  | 'Tables'
  | 'Storage'
  | 'Rugs'
  | 'Mirrors';

export const SHOP_CATEGORIES: ShopCategory[] = [
  'Sofas', 'Armchairs', 'Lighting', 'Tables', 'Storage', 'Rugs', 'Mirrors',
];

export interface CatalogItem {
  id: number;
  url: string;
  name: string;
  category: ShopCategory;
  styles: string[];
  room: string;
  retailer: string;
}

export interface SetDesign {
  id: number;
  title: string;
  subtitle: string;
  photo: string;
  style: string;
  room: string;
  catalogIds: number[];
}

export const CATALOG: CatalogItem[] = [
  // ── Sofas ──
  { id: 1, url: 'https://www.ikea.com/us/en/p/kivik-sofa-tibbleby-beige-gray-s39440593/', name: 'KIVIK Sofa, beige/gray', category: 'Sofas', styles: ['warm', 'minimalist', 'scandinavian'], room: 'living', retailer: 'IKEA' },
  { id: 2, url: 'https://www.ikea.com/us/en/p/vimle-sofa-3-seat-lejde-light-gray-s29484837/', name: 'VIMLE Sofa, Lejde light gray', category: 'Sofas', styles: ['minimalist', 'modern', 'scandinavian'], room: 'living', retailer: 'IKEA' },
  { id: 3, url: 'https://www.ikea.com/us/en/p/stockholm-2025-sofa-sundhamn-beige-00586096/', name: 'STOCKHOLM 2025 Sofa, beige', category: 'Sofas', styles: ['warm', 'classic', 'elevated'], room: 'living', retailer: 'IKEA' },
  { id: 4, url: 'https://www.ikea.com/us/en/p/finnala-sofa-with-chaise-gunnared-medium-gray-s39319101/', name: 'FINNALA Sofa with chaise, gray', category: 'Sofas', styles: ['modern', 'minimalist'], room: 'living', retailer: 'IKEA' },
  { id: 5, url: 'https://www.ikea.com/us/en/p/stockholm-sofa-seglora-natural-20245049/', name: 'STOCKHOLM Sofa, natural leather', category: 'Sofas', styles: ['mid-century', 'classic', 'leather', 'elevated'], room: 'living', retailer: 'IKEA' },

  // ── Armchairs ──
  { id: 6, url: 'https://www.ikea.com/us/en/p/ekenaset-armchair-kilanda-light-beige-30533493/', name: 'EKENÄSET Armchair, light beige', category: 'Armchairs', styles: ['mid-century', 'scandinavian', 'warm'], room: 'living', retailer: 'IKEA' },
  { id: 7, url: 'https://www.ikea.com/us/en/p/strandmon-armchair-and-ottoman-nordvalla-dark-gray-s19487874/', name: 'STRANDMON Wing chair & ottoman', category: 'Armchairs', styles: ['classic', 'cozy'], room: 'living', retailer: 'IKEA' },

  // ── Lighting ──
  { id: 8, url: 'https://www.ikea.com/us/en/p/ranarp-floor-reading-lamp-with-led-bulb-off-white-20419657/', name: 'RANARP Floor lamp, off-white', category: 'Lighting', styles: ['classic', 'industrial', 'warm'], room: 'living', retailer: 'IKEA' },
  { id: 9, url: 'https://www.ikea.com/us/en/p/hektar-floor-lamp-dark-gray-70216544/', name: 'HEKTAR Floor lamp, dark gray', category: 'Lighting', styles: ['industrial', 'modern'], room: 'living', retailer: 'IKEA' },
  { id: 10, url: 'https://www.ikea.com/us/en/p/oekensand-floor-lamp-beech-white-90541536/', name: 'ÖKENSAND Floor lamp, beech/white', category: 'Lighting', styles: ['scandinavian', 'minimalist', 'warm'], room: 'living', retailer: 'IKEA' },
  { id: 11, url: 'https://www.ikea.com/us/en/p/fado-table-lamp-with-led-bulb-white-60416280/', name: 'FADO Table lamp, white', category: 'Lighting', styles: ['minimalist', 'soft', 'scandinavian'], room: 'bedroom', retailer: 'IKEA' },

  // ── Tables ──
  { id: 12, url: 'https://www.ikea.com/us/en/p/oestavall-adjustable-coffee-table-white-00530066/', name: 'ÖSTAVALL Coffee table, white', category: 'Tables', styles: ['modern', 'minimalist'], room: 'living', retailer: 'IKEA' },
  { id: 13, url: 'https://www.ikea.com/us/en/p/idanaes-coffee-table-white-20487873/', name: 'IDANÄS Coffee table, white', category: 'Tables', styles: ['classic', 'warm'], room: 'living', retailer: 'IKEA' },
  { id: 14, url: 'https://www.ikea.com/us/en/p/lack-coffee-table-white-stained-oak-effect-50319029/', name: 'LACK Coffee table, oak effect', category: 'Tables', styles: ['minimalist', 'scandinavian', 'budget'], room: 'living', retailer: 'IKEA' },

  // ── Storage ──
  { id: 15, url: 'https://www.ikea.com/us/en/p/lommarp-bookcase-dark-blue-green-40415465/', name: 'LOMMARP Bookcase, dark blue-green', category: 'Storage', styles: ['classic', 'elevated', 'moody'], room: 'office', retailer: 'IKEA' },
  { id: 16, url: 'https://www.ikea.com/us/en/p/billy-bookcase-white-20522046/', name: 'BILLY Bookcase, white', category: 'Storage', styles: ['minimalist', 'budget', 'scandinavian'], room: 'office', retailer: 'IKEA' },
  { id: 17, url: 'https://www.ikea.com/us/en/p/idanaes-bookcase-white-80487827/', name: 'IDANÄS Bookcase, white', category: 'Storage', styles: ['classic', 'warm'], room: 'office', retailer: 'IKEA' },

  // ── Rugs ──
  { id: 18, url: 'https://www.ikea.com/us/en/p/stockholm-rug-flatwoven-handmade-stripe-black-off-white-80104862/', name: 'STOCKHOLM Rug, handmade stripe', category: 'Rugs', styles: ['mid-century', 'elevated', 'graphic'], room: 'living', retailer: 'IKEA' },

  // ── Mirrors ──
  { id: 19, url: 'https://www.ikea.com/us/en/p/lindbyn-mirror-gold-20597961/', name: 'LINDBYN Mirror, gold', category: 'Mirrors', styles: ['classic', 'elevated', 'warm'], room: 'entry', retailer: 'IKEA' },
  { id: 20, url: 'https://www.ikea.com/us/en/p/nissedal-mirror-black-50503777/', name: 'NISSEDAL Mirror, black', category: 'Mirrors', styles: ['minimalist', 'modern'], room: 'bedroom', retailer: 'IKEA' },
  { id: 21, url: 'https://www.ikea.com/us/en/p/ikornnes-floor-mirror-ash-90524042/', name: 'IKORNNES Floor mirror, ash', category: 'Mirrors', styles: ['scandinavian', 'warm', 'minimalist'], room: 'bedroom', retailer: 'IKEA' },
];

export const CATALOG_BY_ID = new Map(CATALOG.map((c) => [c.id, c]));

// ── Curated set-designs — real room compositions ──────────────────────────────
// Photos: Unsplash (free for embedding). catalogIds = items visible/matching in
// that room; used for "Shop This Look" product strip.
// Photos are IKEA's own room staging shots, fetched via VPS image proxy.
// Source pages: ikea.com/us/en/rooms/* — og:image resolved at build time.
export const SETS: SetDesign[] = [
  {
    id: 1,
    title: 'Living Room',
    subtitle: 'Soft seating, warm light, a rug that anchors it all',
    photo: 'https://api.eprisjournal.com/design/img?url=https%3A%2F%2Fwww.ikea.com%2Fext%2Fingkadam%2Fm%2F12dd4bb7b782761c%2Foriginal%2FPH205297.jpg%3Ff%3Dxl',
    style: 'Warm minimalism',
    room: 'Living room',
    catalogIds: [1, 6, 8, 18, 19],
  },
  {
    id: 2,
    title: 'Bedroom',
    subtitle: 'Calm palette, clean lines, restful light',
    photo: 'https://api.eprisjournal.com/design/img?url=https%3A%2F%2Fwww.ikea.com%2Fext%2Fingkadam%2Fm%2F1e794903b557ade3%2Foriginal%2FPH206321.jpg%3Ff%3Dxl',
    style: 'Minimalist',
    room: 'Bedroom',
    catalogIds: [11, 20, 21, 10],
  },
  {
    id: 3,
    title: 'Home Office',
    subtitle: 'Dark shelves, a wing chair, focused light',
    photo: 'https://api.eprisjournal.com/design/img?url=https%3A%2F%2Fwww.ikea.com%2Fext%2Fingkadam%2Fm%2F3c265ccb875da578%2Foriginal%2FPH205398.jpg%3Ff%3Dxl',
    style: 'Classic & elevated',
    room: 'Home office',
    catalogIds: [15, 7, 9, 13],
  },
  {
    id: 4,
    title: 'Dining Room',
    subtitle: 'A table worth gathering around',
    photo: 'https://api.eprisjournal.com/design/img?url=https%3A%2F%2Fwww.ikea.com%2Fext%2Fingkadam%2Fm%2F3ee2fff2f0669cd3%2Foriginal%2FPH176762.jpg%3Ff%3Dxl',
    style: 'Scandinavian',
    room: 'Dining room',
    catalogIds: [3, 12, 14, 18, 16],
  },
  {
    id: 5,
    title: 'Hallway',
    subtitle: 'First impression. Mirror, light, intention.',
    photo: 'https://api.eprisjournal.com/design/img?url=https%3A%2F%2Fwww.ikea.com%2Fext%2Fingkadam%2Fm%2F20d098f35acc5791%2Foriginal%2FPH206222.jpg%3Ff%3Dxl',
    style: 'Minimalist',
    room: 'Hallway',
    catalogIds: [19, 21, 20, 10],
  },
];
