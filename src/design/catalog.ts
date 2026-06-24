export type ShopCategory =
  | 'Sofas'
  | 'Armchairs'
  | 'Lighting'
  | 'Tables'
  | 'Storage'
  | 'Rugs'
  | 'Mirrors'
  | 'Art';

export const SHOP_CATEGORIES: ShopCategory[] = [
  'Art', 'Sofas', 'Armchairs', 'Lighting', 'Tables', 'Storage', 'Rugs', 'Mirrors',
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
  story: string;
  photo: string;
  style: string;
  room: string;
  catalogIds: number[];
}

export const CATALOG: CatalogItem[] = [
  // ── Sofas — IKEA ──
  { id: 1, url: 'https://www.ikea.com/us/en/p/kivik-sofa-tibbleby-beige-gray-s39440593/', name: 'KIVIK Sofa, beige/gray', category: 'Sofas', styles: ['warm', 'minimalist', 'scandinavian'], room: 'living', retailer: 'IKEA' },
  { id: 2, url: 'https://www.ikea.com/us/en/p/vimle-sofa-3-seat-lejde-light-gray-s29484837/', name: 'VIMLE Sofa, light gray', category: 'Sofas', styles: ['minimalist', 'modern', 'scandinavian'], room: 'living', retailer: 'IKEA' },
  { id: 3, url: 'https://www.ikea.com/us/en/p/stockholm-2025-sofa-sundhamn-beige-00586096/', name: 'STOCKHOLM 2025 Sofa, beige', category: 'Sofas', styles: ['warm', 'classic', 'elevated'], room: 'living', retailer: 'IKEA' },
  { id: 4, url: 'https://www.ikea.com/us/en/p/finnala-sofa-with-chaise-gunnared-medium-gray-s39319101/', name: 'FINNALA Sofa with chaise, gray', category: 'Sofas', styles: ['modern', 'minimalist'], room: 'living', retailer: 'IKEA' },
  { id: 5, url: 'https://www.ikea.com/us/en/p/stockholm-sofa-seglora-natural-20245049/', name: 'STOCKHOLM Sofa, natural leather', category: 'Sofas', styles: ['mid-century', 'classic', 'leather', 'elevated'], room: 'living', retailer: 'IKEA' },

  // ── Armchairs — IKEA ──
  { id: 6, url: 'https://www.ikea.com/us/en/p/ekenaset-armchair-kilanda-light-beige-30533493/', name: 'EKENÄSET Armchair, light beige', category: 'Armchairs', styles: ['mid-century', 'scandinavian', 'warm'], room: 'living', retailer: 'IKEA' },
  { id: 7, url: 'https://www.ikea.com/us/en/p/strandmon-armchair-and-ottoman-nordvalla-dark-gray-s19487874/', name: 'STRANDMON Wing chair & ottoman', category: 'Armchairs', styles: ['classic', 'cozy'], room: 'living', retailer: 'IKEA' },

  // ── Armchairs — HAY & Muuto ──
  { id: 22, url: 'https://www.hay.com/hay/furniture/seating/chair/about-a-chair/aac-22', name: 'About A Chair AAC 22', category: 'Armchairs', styles: ['scandinavian', 'design-classic', 'minimal'], room: 'living', retailer: 'HAY' },
  { id: 23, url: 'https://www.muuto.com/product/fiber-armchair-wood-base-p5063/p5063/', name: 'Fiber Armchair, wood base', category: 'Armchairs', styles: ['organic', 'scandinavian', 'modern'], room: 'living', retailer: 'Muuto' },

  // ── Lighting — IKEA ──
  { id: 8, url: 'https://www.ikea.com/us/en/p/ranarp-floor-reading-lamp-with-led-bulb-off-white-20419657/', name: 'RANARP Floor lamp, off-white', category: 'Lighting', styles: ['classic', 'industrial', 'warm'], room: 'living', retailer: 'IKEA' },
  { id: 9, url: 'https://www.ikea.com/us/en/p/hektar-floor-lamp-dark-gray-70216544/', name: 'HEKTAR Floor lamp, dark gray', category: 'Lighting', styles: ['industrial', 'modern'], room: 'living', retailer: 'IKEA' },
  { id: 10, url: 'https://www.ikea.com/us/en/p/oekensand-floor-lamp-beech-white-90541536/', name: 'ÖKENSAND Floor lamp, beech/white', category: 'Lighting', styles: ['scandinavian', 'minimalist', 'warm'], room: 'living', retailer: 'IKEA' },
  { id: 11, url: 'https://www.ikea.com/us/en/p/fado-table-lamp-with-led-bulb-white-60416280/', name: 'FADO Table lamp, white', category: 'Lighting', styles: ['minimalist', 'soft', 'scandinavian'], room: 'bedroom', retailer: 'IKEA' },

  // ── Lighting — Muuto & HAY ──
  { id: 24, url: 'https://www.muuto.com/product/under-the-bell-pendant-lamp--p2854/p2854/', name: 'Under the Bell Pendant Lamp', category: 'Lighting', styles: ['statement', 'modern', 'acoustic'], room: 'dining', retailer: 'Muuto' },
  { id: 25, url: 'https://www.hay.com/hay/lighting/pendant-lamp/nelson-pendant', name: 'Nelson Pendant Lamp', category: 'Lighting', styles: ['organic', 'mid-century', 'warm'], room: 'living', retailer: 'HAY' },
  { id: 26, url: 'https://www.hay.com/hay/lighting/pendant-lamp/ava-cone-pendant', name: 'Ava Cone Pendant', category: 'Lighting', styles: ['geometric', 'minimalist', 'modern'], room: 'dining', retailer: 'HAY' },

  // ── Tables — IKEA ──
  { id: 12, url: 'https://www.ikea.com/us/en/p/oestavall-adjustable-coffee-table-white-00530066/', name: 'ÖSTAVALL Coffee table, white', category: 'Tables', styles: ['modern', 'minimalist'], room: 'living', retailer: 'IKEA' },
  { id: 13, url: 'https://www.ikea.com/us/en/p/idanaes-coffee-table-white-20487873/', name: 'IDANÄS Coffee table, white', category: 'Tables', styles: ['classic', 'warm'], room: 'living', retailer: 'IKEA' },
  { id: 14, url: 'https://www.ikea.com/us/en/p/lack-coffee-table-white-stained-oak-effect-50319029/', name: 'LACK Coffee table, oak effect', category: 'Tables', styles: ['minimalist', 'scandinavian', 'budget'], room: 'living', retailer: 'IKEA' },

  // ── Tables — West Elm ──
  { id: 27, url: 'https://www.westelm.com/products/mid-century-round-coffee-table-h11978/', name: 'Mid-Century Round Coffee Table', category: 'Tables', styles: ['mid-century', 'warm', 'wood'], room: 'living', retailer: 'West Elm' },
  { id: 28, url: 'https://www.westelm.com/products/reeve-mid-century-rectangular-coffee-table-h1181/', name: 'Reeve Mid-Century Coffee Table', category: 'Tables', styles: ['mid-century', 'classic', 'elevated'], room: 'living', retailer: 'West Elm' },

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

  // ── Armchairs — CB2 ──
  { id: 29, url: 'https://www.cb2.com/club-lounge-chair/s341429', name: 'Club Lounge Chair', category: 'Armchairs', styles: ['modern', 'elevated', 'statement'], room: 'living', retailer: 'CB2' },
  { id: 30, url: 'https://www.cb2.com/club-chair/f13915', name: 'Club Chair', category: 'Armchairs', styles: ['modern', 'minimalist', 'design-classic'], room: 'living', retailer: 'CB2' },

  // ── Lighting — Ferm Living ──
  { id: 31, url: 'https://fermliving.com/products/arum-table-lamp-cashmere', name: 'Arum Table Lamp, cashmere', category: 'Lighting', styles: ['organic', 'warm', 'elevated'], room: 'living', retailer: 'Ferm Living' },
  { id: 32, url: 'https://fermliving.com/products/arum-table-lamp-black', name: 'Arum Table Lamp, black', category: 'Lighting', styles: ['graphic', 'modern', 'minimal'], room: 'bedroom', retailer: 'Ferm Living' },
  { id: 33, url: 'https://fermliving.com/products/gry-table-lamp-blacktranslucent', name: 'Gry Table Lamp, black', category: 'Lighting', styles: ['portable', 'modern', 'outdoor'], room: 'living', retailer: 'Ferm Living' },

  // ── Art — Amazon ──
  { id: 34, url: 'https://www.amazon.com/wall26-Large-Framed-Canvas-Print/dp/B0FXF59ZG3', name: 'Minimalist Neutral Abstract, 60″×20″', category: 'Art', styles: ['minimalist', 'neutral', 'large-format'], room: 'living', retailer: 'Amazon' },
  { id: 35, url: 'https://www.amazon.com/Beautiful-Abstract-Painting-Minimalist-Bathroom/dp/B0BCZRQZPJ', name: 'Abstract Canvas Set of 3, 16″×24″', category: 'Art', styles: ['abstract', 'neutral', 'set'], room: 'living', retailer: 'Amazon' },
  { id: 36, url: 'https://www.amazon.com/Abstract-Wall-Art-Living-Room/dp/B0C6TDTN8V', name: 'Abstract Navy & Grey Set of 3', category: 'Art', styles: ['abstract', 'dark', 'moody'], room: 'living', retailer: 'Amazon' },
  { id: 37, url: 'https://www.amazon.com/Abstract-Decorations-Bathroom-Paintings-Decoration/dp/B09GFFD94D', name: 'Boho Abstract Wall Art, 3 pieces', category: 'Art', styles: ['boho', 'warm', 'abstract'], room: 'living', retailer: 'Amazon' },
  { id: 38, url: 'https://www.amazon.com/Neutral-Abstract-Paintings-Minimalist-Pictures/dp/B0F8W5RKWX', name: 'Neutral Abstract Set of 2, 16″×24″', category: 'Art', styles: ['neutral', 'minimalist', 'paired'], room: 'bedroom', retailer: 'Amazon' },
  { id: 39, url: 'https://www.amazon.com/Abstract-Contemporary-Painting-Geometric-Midcentury/dp/B0DDC2MTNL', name: 'Geometric Mid-Century Set of 3', category: 'Art', styles: ['geometric', 'mid-century', 'graphic'], room: 'office', retailer: 'Amazon' },
  { id: 40, url: 'https://www.amazon.com/Neutral-Minimalist-Abstract-Geometric-Painting/dp/B0DMW6G71K', name: 'Boho Geometric Canvas Set of 3', category: 'Art', styles: ['boho', 'geometric', 'warm'], room: 'bedroom', retailer: 'Amazon' },
];

export const CATALOG_BY_ID = new Map(CATALOG.map((c) => [c.id, c]));

// Photos: IKEA room staging shots via VPS image proxy.
export const SETS: SetDesign[] = [
  {
    id: 1,
    title: 'Living Room',
    subtitle: 'Soft seating, warm light, a rug that anchors it all',
    story: 'A sofa wide enough for Sunday mornings. Lamps that know when to dim themselves. The rug is the room — everything else just attends.',
    photo: 'https://api.eprisjournal.com/design/img?url=https%3A%2F%2Fwww.ikea.com%2Fext%2Fingkadam%2Fm%2F12dd4bb7b782761c%2Foriginal%2FPH205297.jpg%3Ff%3Dxl',
    style: 'Warm minimalism',
    room: 'Living room',
    catalogIds: [1, 6, 8, 18, 19],
  },
  {
    id: 2,
    title: 'Bedroom',
    subtitle: 'Calm palette, clean lines, restful light',
    story: 'White on white — but nothing is quite the same shade. Rest as a considered act. The mirror doubles the light; the lamp earns its place on the nightstand.',
    photo: 'https://api.eprisjournal.com/design/img?url=https%3A%2F%2Fwww.ikea.com%2Fext%2Fingkadam%2Fm%2F1e794903b557ade3%2Foriginal%2FPH206321.jpg%3Ff%3Dxl',
    style: 'Minimalist',
    room: 'Bedroom',
    catalogIds: [11, 20, 21, 10],
  },
  {
    id: 3,
    title: 'Home Office',
    subtitle: 'Dark shelves, a wing chair, focused light',
    story: 'A room that takes work seriously without taking itself too seriously. The bookcase is a statement; the wing chair, a retreat. Morning light does the rest.',
    photo: 'https://api.eprisjournal.com/design/img?url=https%3A%2F%2Fwww.ikea.com%2Fext%2Fingkadam%2Fm%2F3c265ccb875da578%2Foriginal%2FPH205398.jpg%3Ff%3Dxl',
    style: 'Classic & elevated',
    room: 'Home office',
    catalogIds: [15, 7, 9, 13],
  },
  {
    id: 4,
    title: 'Dining Room',
    subtitle: 'A table worth gathering around',
    story: 'The best dining rooms are the ones nobody wants to leave. The table is the argument — every other choice follows from it. Set it well and the room sets itself.',
    photo: 'https://api.eprisjournal.com/design/img?url=https%3A%2F%2Fwww.ikea.com%2Fext%2Fingkadam%2Fm%2F3ee2fff2f0669cd3%2Foriginal%2FPH176762.jpg%3Ff%3Dxl',
    style: 'Scandinavian',
    room: 'Dining room',
    catalogIds: [3, 26, 27, 18, 16],
  },
  {
    id: 5,
    title: 'Hallway',
    subtitle: 'First impression. Mirror, light, intention.',
    story: 'The hallway is a room people forget to design. That is the mistake. A good mirror, one considered lamp, and the floor you actually want to walk on. The rest of the apartment follows.',
    photo: 'https://api.eprisjournal.com/design/img?url=https%3A%2F%2Fwww.ikea.com%2Fext%2Fingkadam%2Fm%2F20d098f35acc5791%2Foriginal%2FPH206222.jpg%3Ff%3Dxl',
    style: 'Minimalist',
    room: 'Hallway',
    catalogIds: [19, 21, 20, 10],
  },
  {
    id: 6,
    title: 'Reading Corner',
    subtitle: 'One chair. One lamp. Everything you need.',
    story: 'Not a room — a decision. The chair that makes you stay longer than you planned. A lamp positioned exactly right. Books within reach. The rest of the apartment disappears.',
    photo: 'https://api.eprisjournal.com/design/img?url=https%3A%2F%2Fwww.ikea.com%2Fext%2Fingkadam%2Fm%2F3c265ccb875da578%2Foriginal%2FPH205398.jpg%3Ff%3Dxl',
    style: 'Cozy classic',
    room: 'Living room',
    catalogIds: [7, 22, 23, 8, 25, 15],
  },
  {
    id: 7,
    title: 'Designer Mix',
    subtitle: 'HAY, Muuto, CB2, West Elm — in one room',
    story: 'A living room that refuses one brand allegiance. The HAY chair, the Muuto pendant, the CB2 lounge — each chosen on its own merits. The brands compete; the room wins.',
    photo: 'https://api.eprisjournal.com/design/img?url=https%3A%2F%2Fwww.ikea.com%2Fext%2Fingkadam%2Fm%2F12dd4bb7b782761c%2Foriginal%2FPH205297.jpg%3Ff%3Dxl',
    style: 'Curated mix',
    room: 'Living room',
    catalogIds: [22, 29, 25, 27, 31, 34, 35],
  },
  {
    id: 8,
    title: 'Gallery Wall',
    subtitle: 'Art that changes how a room feels',
    story: 'The art arrives before the furniture. Once the wall speaks, the room follows. Neutral abstracts pull more light; dark moody pieces add weight. Choose by feeling, not by size chart.',
    photo: 'https://api.eprisjournal.com/design/img?url=https%3A%2F%2Fwww.ikea.com%2Fext%2Fingkadam%2Fm%2F3c265ccb875da578%2Foriginal%2FPH205398.jpg%3Ff%3Dxl',
    style: 'Editorial art',
    room: 'Living room',
    catalogIds: [34, 35, 36, 37, 38, 39, 40],
  },
];
