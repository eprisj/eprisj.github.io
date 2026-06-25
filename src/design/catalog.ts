export type ShopCategory =
  | 'Sofas'
  | 'Armchairs'
  | 'Lighting'
  | 'Tables'
  | 'Storage'
  | 'Rugs'
  | 'Mirrors'
  | 'Art'
  | 'Beds'
  | 'Dining'
  | 'Textiles'
  | 'Outdoor';

export const SHOP_CATEGORIES: ShopCategory[] = [
  'Art', 'Sofas', 'Armchairs', 'Beds', 'Lighting', 'Tables', 'Dining', 'Storage', 'Rugs', 'Textiles', 'Mirrors', 'Outdoor',
];

export interface CatalogItem {
  id: number;
  url: string;
  name: string;
  category: ShopCategory;
  styles: string[];
  room: string;
  retailer: string;
  image?: string; // static fallback image when resolver can't scrape the retailer
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

  // ── Sofas — more options ──
  { id: 41, url: 'https://www.ikea.com/us/en/p/haerlanda-sofa-ljungen-medium-gray-s79319501/', name: 'HÄRLANDA Sofa, gray', category: 'Sofas', styles: ['modern', 'minimalist', 'scandinavian'], room: 'living', retailer: 'IKEA' },
  { id: 42, url: 'https://www.ikea.com/us/en/p/aepplaryd-sofa-with-chaise-lejde-light-gray-s59434349/', name: 'ÄPPLARYD Sofa with chaise, light gray', category: 'Sofas', styles: ['modern', 'minimalist', 'elevated'], room: 'living', retailer: 'IKEA' },
  { id: 43, url: 'https://www.westelm.com/products/harris-leather-sofa-h4351/', name: 'Harris Leather Sofa', category: 'Sofas', styles: ['classic', 'leather', 'elevated', 'warm'], room: 'living', retailer: 'West Elm' },
  { id: 44, url: 'https://www.westelm.com/products/eddy-sofa-h5088/', name: 'Eddy Sofa', category: 'Sofas', styles: ['modern', 'cozy', 'statement'], room: 'living', retailer: 'West Elm' },
  { id: 45, url: 'https://www.cb2.com/decker-sofa/s498527', name: 'Decker Sofa', category: 'Sofas', styles: ['modern', 'minimalist', 'design-classic'], room: 'living', retailer: 'CB2' },

  // ── Beds ──
  { id: 46, url: 'https://www.ikea.com/us/en/p/hemnes-bed-frame-with-2-storage-boxes-white-stain-luroy-s89941471/', name: 'HEMNES Bed, white stain', category: 'Beds', styles: ['classic', 'scandinavian', 'warm'], room: 'bedroom', retailer: 'IKEA' },
  { id: 47, url: 'https://www.ikea.com/us/en/p/malm-bed-frame-high-white-luroey-s19175174/', name: 'MALM Bed, high, white', category: 'Beds', styles: ['minimalist', 'modern', 'budget'], room: 'bedroom', retailer: 'IKEA' },
  { id: 48, url: 'https://www.ikea.com/us/en/p/idanaes-bed-frame-white-luroey-s79339060/', name: 'IDANÄS Bed, white', category: 'Beds', styles: ['classic', 'warm', 'elevated'], room: 'bedroom', retailer: 'IKEA' },
  { id: 49, url: 'https://www.westelm.com/products/mod-nightstand-h5070/', name: 'Mod Nightstand', category: 'Tables', styles: ['modern', 'minimalist', 'wood'], room: 'bedroom', retailer: 'West Elm' },
  { id: 50, url: 'https://www.ikea.com/us/en/p/hemnes-daybed-frame-with-3-drawers-white-luroy-s49941523/', name: 'HEMNES Daybed, white', category: 'Beds', styles: ['classic', 'versatile', 'scandinavian'], room: 'bedroom', retailer: 'IKEA' },
  { id: 51, url: 'https://www.cb2.com/ventana-bed/s628929', name: 'Ventana Bed', category: 'Beds', styles: ['modern', 'upholstered', 'elevated'], room: 'bedroom', retailer: 'CB2' },

  // ── Dining ──
  { id: 52, url: 'https://www.ikea.com/us/en/p/ekedalen-extendable-table-white-00347409/', name: 'EKEDALEN Extendable table, white', category: 'Dining', styles: ['scandinavian', 'minimalist', 'budget'], room: 'dining', retailer: 'IKEA' },
  { id: 53, url: 'https://www.ikea.com/us/en/p/nordviken-extendable-table-white-30488202/', name: 'NORDVIKEN Table, white', category: 'Dining', styles: ['classic', 'warm', 'elevated'], room: 'dining', retailer: 'IKEA' },
  { id: 54, url: 'https://www.westelm.com/products/modern-expandable-dining-table-h4430/', name: 'Modern Expandable Dining Table', category: 'Dining', styles: ['modern', 'wood', 'elevated'], room: 'dining', retailer: 'West Elm' },
  { id: 55, url: 'https://www.ikea.com/us/en/p/ekedalen-chair-white-orrsta-light-gray-s39297553/', name: 'EKEDALEN Chair, white', category: 'Dining', styles: ['scandinavian', 'minimalist'], room: 'dining', retailer: 'IKEA' },
  { id: 56, url: 'https://www.ikea.com/us/en/p/nordviken-chair-white-50488213/', name: 'NORDVIKEN Chair, white', category: 'Dining', styles: ['classic', 'warm'], room: 'dining', retailer: 'IKEA' },
  { id: 57, url: 'https://www.hay.com/hay/furniture/tables/dining-table/copenhague-table', name: 'Copenhague Dining Table', category: 'Dining', styles: ['scandinavian', 'design-classic', 'elevated'], room: 'dining', retailer: 'HAY' },
  { id: 58, url: 'https://www.hay.com/hay/furniture/seating/chair/j104-chair', name: 'J104 Chair', category: 'Dining', styles: ['scandinavian', 'design-classic', 'warm'], room: 'dining', retailer: 'HAY' },
  { id: 59, url: 'https://www.muuto.com/product/linear-wood-chair/p3082/', name: 'Linear Wood Chair', category: 'Dining', styles: ['scandinavian', 'organic', 'modern'], room: 'dining', retailer: 'Muuto' },

  // ── More Armchairs ──
  { id: 60, url: 'https://www.ikea.com/us/en/p/poaeng-armchair-birch-veneer-ullevi-dark-blue-s89507424/', name: 'POÄNG Armchair, dark blue', category: 'Armchairs', styles: ['scandinavian', 'classic', 'budget'], room: 'living', retailer: 'IKEA' },
  { id: 61, url: 'https://www.westelm.com/products/haven-chair-h6183/', name: 'Haven Lounge Chair', category: 'Armchairs', styles: ['modern', 'cozy', 'organic'], room: 'living', retailer: 'West Elm' },
  { id: 62, url: 'https://www.muuto.com/product/rest-sofa-1-seater/p3118/', name: 'Rest Sofa 1-seater', category: 'Armchairs', styles: ['modern', 'elevated', 'organic'], room: 'living', retailer: 'Muuto' },

  // ── More Lighting ──
  { id: 63, url: 'https://www.ikea.com/us/en/p/nymoe-pendant-lamp-brass-60558913/', name: 'NYMÖE Pendant lamp, brass', category: 'Lighting', styles: ['warm', 'elevated', 'classic'], room: 'dining', retailer: 'IKEA' },
  { id: 64, url: 'https://www.ikea.com/us/en/p/tradfri-led-bulb-e26-1055-lumen-warm-dimming-globe-opal-white-30554912/', name: 'TRÅDFRI Smart bulb, warm white', category: 'Lighting', styles: ['smart', 'minimalist', 'warm'], room: 'living', retailer: 'IKEA' },
  { id: 65, url: 'https://www.ikea.com/us/en/p/skurup-work-wall-lamp-white-30435977/', name: 'SKURUP Wall lamp, white', category: 'Lighting', styles: ['industrial', 'modern', 'minimal'], room: 'office', retailer: 'IKEA' },
  { id: 66, url: 'https://www.westelm.com/products/overarching-floor-lamp-h4394/', name: 'Overarching Floor Lamp', category: 'Lighting', styles: ['modern', 'statement', 'elevated'], room: 'living', retailer: 'West Elm' },
  { id: 67, url: 'https://www.hay.com/hay/lighting/table-lamp/jwda-table-lamp', name: 'JWDA Table Lamp', category: 'Lighting', styles: ['design-classic', 'warm', 'elevated'], room: 'living', retailer: 'HAY' },
  { id: 68, url: 'https://www.muuto.com/product/unfold-pendant/p2870/', name: 'Unfold Pendant', category: 'Lighting', styles: ['minimalist', 'graphic', 'modern'], room: 'dining', retailer: 'Muuto' },
  { id: 69, url: 'https://fermliving.com/products/setup-pendant-grey', name: 'Setup Pendant, grey', category: 'Lighting', styles: ['scandinavian', 'minimal', 'warm'], room: 'dining', retailer: 'Ferm Living' },

  // ── More Tables ──
  { id: 70, url: 'https://www.ikea.com/us/en/p/trulstorp-coffee-table-black-brown-70521880/', name: 'TRULSTORP Coffee table, black-brown', category: 'Tables', styles: ['modern', 'dark', 'moody'], room: 'living', retailer: 'IKEA' },
  { id: 71, url: 'https://www.ikea.com/us/en/p/lisabo-coffee-table-ash-veneer-30461244/', name: 'LISABO Coffee table, ash veneer', category: 'Tables', styles: ['mid-century', 'scandinavian', 'warm'], room: 'living', retailer: 'IKEA' },
  { id: 72, url: 'https://www.westelm.com/products/terrace-coffee-table-h5059/', name: 'Terrace Coffee Table', category: 'Tables', styles: ['modern', 'elevated', 'wood'], room: 'living', retailer: 'West Elm' },
  { id: 73, url: 'https://www.cb2.com/slab-marble-coffee-table/s332571', name: 'Slab Marble Coffee Table', category: 'Tables', styles: ['modern', 'statement', 'elevated', 'marble'], room: 'living', retailer: 'CB2' },
  { id: 74, url: 'https://www.ikea.com/us/en/p/gladom-tray-table-black-20414908/', name: 'GLADOM Tray table, black', category: 'Tables', styles: ['minimalist', 'modern', 'budget'], room: 'living', retailer: 'IKEA' },

  // ── More Storage ──
  { id: 75, url: 'https://www.ikea.com/us/en/p/kallax-shelf-unit-white-00275848/', name: 'KALLAX Shelf unit, white', category: 'Storage', styles: ['minimalist', 'modern', 'budget'], room: 'office', retailer: 'IKEA' },
  { id: 76, url: 'https://www.ikea.com/us/en/p/besta-tv-unit-white-10387239/', name: 'BESTÅ TV unit, white', category: 'Storage', styles: ['minimalist', 'modern', 'scandinavian'], room: 'living', retailer: 'IKEA' },
  { id: 77, url: 'https://www.ikea.com/us/en/p/alex-drawer-unit-white-00473546/', name: 'ALEX Drawer unit, white', category: 'Storage', styles: ['minimalist', 'clean', 'budget'], room: 'office', retailer: 'IKEA' },
  { id: 78, url: 'https://www.westelm.com/products/parsons-tall-bookcase-h3889/', name: 'Parsons Tall Bookcase', category: 'Storage', styles: ['modern', 'elevated', 'classic'], room: 'office', retailer: 'West Elm' },
  { id: 79, url: 'https://www.cb2.com/latitude-tall-bookcase/s501049', name: 'Latitude Tall Bookcase', category: 'Storage', styles: ['modern', 'minimalist', 'elevated'], room: 'office', retailer: 'CB2' },

  // ── More Rugs ──
  { id: 80, url: 'https://www.ikea.com/us/en/p/vindum-rug-high-pile-off-white-90337626/', name: 'VINDUM Rug, high-pile, off-white', category: 'Rugs', styles: ['cozy', 'soft', 'minimalist'], room: 'living', retailer: 'IKEA' },
  { id: 81, url: 'https://www.ikea.com/us/en/p/stoense-rug-low-pile-off-white-30399024/', name: 'STOENSE Rug, low-pile, off-white', category: 'Rugs', styles: ['minimalist', 'scandinavian', 'budget'], room: 'living', retailer: 'IKEA' },
  { id: 82, url: 'https://www.ikea.com/us/en/p/knardrup-rug-low-pile-light-gray-00494623/', name: 'KNARDRUP Rug, light gray', category: 'Rugs', styles: ['minimalist', 'modern', 'budget'], room: 'living', retailer: 'IKEA' },
  { id: 83, url: 'https://www.westelm.com/products/jute-boucle-rug-h8386/', name: 'Jute Boucle Rug', category: 'Rugs', styles: ['boho', 'natural', 'warm'], room: 'living', retailer: 'West Elm' },
  { id: 84, url: 'https://www.westelm.com/products/kilim-printed-rug-h4342/', name: 'Kilim Printed Rug', category: 'Rugs', styles: ['boho', 'graphic', 'warm', 'mid-century'], room: 'living', retailer: 'West Elm' },
  { id: 85, url: 'https://www.cb2.com/fringe-natural-jute-rug/s654301', name: 'Fringe Natural Jute Rug', category: 'Rugs', styles: ['natural', 'boho', 'warm'], room: 'living', retailer: 'CB2' },

  // ── Textiles ──
  { id: 86, url: 'https://www.ikea.com/us/en/p/gurli-throw-white-40322290/', name: 'GURLI Throw, white', category: 'Textiles', styles: ['minimalist', 'soft', 'scandinavian'], room: 'living', retailer: 'IKEA' },
  { id: 87, url: 'https://www.ikea.com/us/en/p/vonge-throw-beige-10430126/', name: 'VONGE Throw, beige', category: 'Textiles', styles: ['cozy', 'warm', 'organic'], room: 'bedroom', retailer: 'IKEA' },
  { id: 88, url: 'https://www.ikea.com/us/en/p/alvine-kvist-duvet-cover-pillow-cases-white-gray-20338879/', name: 'ALVINE KVIST Duvet set, white/gray', category: 'Textiles', styles: ['classic', 'scandinavian', 'budget'], room: 'bedroom', retailer: 'IKEA' },
  { id: 89, url: 'https://www.westelm.com/products/organic-washed-cotton-percale-duvet-cover-h5062/', name: 'Organic Washed Percale Duvet Cover', category: 'Textiles', styles: ['organic', 'soft', 'elevated'], room: 'bedroom', retailer: 'West Elm' },
  { id: 90, url: 'https://fermliving.com/products/dawn-cushion-offwhite', name: 'Dawn Cushion, off-white', category: 'Textiles', styles: ['scandinavian', 'organic', 'warm'], room: 'living', retailer: 'Ferm Living' },
  { id: 91, url: 'https://www.hay.com/hay/textiles/cushion/outline-cushion', name: 'Outline Cushion', category: 'Textiles', styles: ['graphic', 'scandinavian', 'design-classic'], room: 'living', retailer: 'HAY' },

  // ── More Mirrors ──
  { id: 92, url: 'https://www.ikea.com/us/en/p/stockholm-mirror-walnut-veneer-40305767/', name: 'STOCKHOLM Mirror, walnut', category: 'Mirrors', styles: ['mid-century', 'warm', 'elevated'], room: 'entry', retailer: 'IKEA' },
  { id: 93, url: 'https://www.westelm.com/products/floating-glass-mirror-h2095/', name: 'Floating Glass Mirror', category: 'Mirrors', styles: ['modern', 'minimalist', 'elevated'], room: 'entry', retailer: 'West Elm' },
  { id: 94, url: 'https://www.cb2.com/arched-mirror/s671244', name: 'Arched Mirror', category: 'Mirrors', styles: ['modern', 'statement', 'elevated'], room: 'entry', retailer: 'CB2' },
  { id: 95, url: 'https://www.hay.com/hay/accessories/mirror/sillon-mirror', name: 'Sillon Mirror', category: 'Mirrors', styles: ['design-classic', 'graphic', 'elevated'], room: 'living', retailer: 'HAY' },

  // ── More Art ──
  { id: 96, url: 'https://www.amazon.com/Abstract-Wall-Art-Bedroom-Canvas/dp/B0BWMG7FVW', name: 'Black & White Abstract Set of 3', category: 'Art', styles: ['minimalist', 'graphic', 'modern'], room: 'bedroom', retailer: 'Amazon' },
  { id: 97, url: 'https://www.amazon.com/Landscape-Canvas-Prints-Mountain-Painting/dp/B08HMQFKPT', name: 'Mountain Landscape Canvas', category: 'Art', styles: ['organic', 'natural', 'moody'], room: 'living', retailer: 'Amazon' },
  { id: 98, url: 'https://www.amazon.com/Framed-Canvas-Wall-Art-Bathroom/dp/B0CRTMQ2QN', name: 'Framed Botanical Set of 3', category: 'Art', styles: ['botanical', 'organic', 'warm'], room: 'bedroom', retailer: 'Amazon' },
  { id: 99, url: 'https://www.amazon.com/Abstract-Gold-Leaf-Painting-Canvas/dp/B09Q2TZTWB', name: 'Gold Leaf Abstract Canvas', category: 'Art', styles: ['elevated', 'warm', 'abstract', 'gold'], room: 'living', retailer: 'Amazon' },
  { id: 100, url: 'https://www.amazon.com/Japanese-Wall-Art-Print-Minimalist/dp/B09NXPFMVL', name: 'Japanese Minimalist Print Set', category: 'Art', styles: ['minimalist', 'graphic', 'calm'], room: 'office', retailer: 'Amazon' },

  // ── Outdoor / Balcony ──
  { id: 101, url: 'https://www.ikea.com/us/en/p/tarno-armchair-outdoor-foldable-black-80536181/', name: 'TARNÖ Armchair, black, outdoor', category: 'Outdoor', styles: ['minimalist', 'budget', 'outdoor'], room: 'living', retailer: 'IKEA' },
  { id: 102, url: 'https://www.ikea.com/us/en/p/kungsholmen-armchair-outdoor-gray-foldable-20514162/', name: 'KUNGSHOLMEN Chair, gray, outdoor', category: 'Outdoor', styles: ['scandinavian', 'modern', 'outdoor'], room: 'living', retailer: 'IKEA' },
  { id: 103, url: 'https://www.ikea.com/us/en/p/askholmen-table-outdoor-gray-brown-60603699/', name: 'ASKHOLMEN Table, outdoor', category: 'Outdoor', styles: ['natural', 'wood', 'outdoor'], room: 'living', retailer: 'IKEA' },
  { id: 104, url: 'https://www.westelm.com/products/portside-outdoor-sofa-h5122/', name: 'Portside Outdoor Sofa', category: 'Outdoor', styles: ['modern', 'elevated', 'outdoor'], room: 'living', retailer: 'West Elm' },
  { id: 105, url: 'https://www.cb2.com/spark-outdoor-dining-table/s648402', name: 'Spark Outdoor Dining Table', category: 'Outdoor', styles: ['modern', 'elevated', 'outdoor'], room: 'dining', retailer: 'CB2' },

  // ── Office / Desk ──
  { id: 106, url: 'https://www.ikea.com/us/en/p/lagkapten-alex-desk-anthracite-s79417485/', name: 'LAGKAPTEN/ALEX Desk, anthracite', category: 'Tables', styles: ['modern', 'dark', 'office'], room: 'office', retailer: 'IKEA' },
  { id: 107, url: 'https://www.ikea.com/us/en/p/lagkapten-alex-desk-white-s99417459/', name: 'LAGKAPTEN/ALEX Desk, white', category: 'Tables', styles: ['minimalist', 'clean', 'office'], room: 'office', retailer: 'IKEA' },
  { id: 108, url: 'https://www.westelm.com/products/mid-century-mini-desk-h3907/', name: 'Mid-Century Mini Desk', category: 'Tables', styles: ['mid-century', 'wood', 'elevated'], room: 'office', retailer: 'West Elm' },
  { id: 109, url: 'https://www.ikea.com/us/en/p/markus-office-chair-vissle-dark-gray-70261150/', name: 'MARKUS Office chair, dark gray', category: 'Armchairs', styles: ['modern', 'ergonomic', 'office'], room: 'office', retailer: 'IKEA' },
  { id: 110, url: 'https://www.ikea.com/us/en/p/flintan-office-chair-vissle-beige-20447971/', name: 'FLINTAN Office chair, beige', category: 'Armchairs', styles: ['scandinavian', 'warm', 'office'], room: 'office', retailer: 'IKEA' },
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
