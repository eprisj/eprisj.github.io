// ─────────────────────────────────────────────────────────────────────────────
// EPRIS · DESIGN
// Relational data model + seed for the Design section (Projects / Products /
// Brands / Studios). The CANONICAL links live on Project (brandIds, productIds,
// studioId). Every reverse relation — a brand's projects, a studio's portfolio,
// a product's appearances — is DERIVED at query time. That is what makes the
// "publish a project → studio/brand/product pages update automatically" behave
// like a relational DB without an actual DB: projects are the source of truth.
//
// This module is intentionally hosting-agnostic. The same shape maps 1:1 to a
// Prisma/Postgres schema later (each interface ≈ a table, the *Ids fields ≈
// relations / join tables), so the UI never has to change when the data moves to
// the VPS API. See designApi.ts for the single seam to swap.
// ─────────────────────────────────────────────────────────────────────────────

export type ProjectType =
  | 'Office'
  | 'Restaurant'
  | 'Hotel'
  | 'Residential'
  | 'Retail'
  | 'Cultural'
  | 'Public Space';

export const PROJECT_TYPES: ProjectType[] = [
  'Office',
  'Restaurant',
  'Hotel',
  'Residential',
  'Retail',
  'Cultural',
  'Public Space',
];

export type ProductCategory =
  | 'Furniture'
  | 'Lighting'
  | 'Finishes'
  | 'Decor'
  | 'Kitchen'
  | 'Bathroom';

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'Furniture',
  'Lighting',
  'Finishes',
  'Decor',
  'Kitchen',
  'Bathroom',
];

export type BudgetRange = '€' | '€€' | '€€€' | '€€€€';
export const BUDGET_RANGES: BudgetRange[] = ['€', '€€', '€€€', '€€€€'];

export interface Brand {
  id: number;
  slug: string;
  name: string;
  logoSeed: string;
  country: string;
  website: string;
  description: string;
  founded?: string;
}

export interface DesignStudio {
  id: number;
  slug: string;
  name: string;
  country: string;
  city: string;
  yearFounded: number;
  teamSize: string;
  description: string;
  website: string;
  awards: string[];
  imageSeed: string;
}

export interface Product {
  id: number;
  slug: string;
  name: string;
  category: ProductCategory;
  brandId: number;
  country: string;
  imageSeed: string;
  description: string;
  materials: string[];
  dimensions: string;
  year?: string;
}

export interface Project {
  id: number;
  slug: string;
  title: string;
  featuredSeed: string;
  gallerySeeds: string[];
  architect: string;
  studioId: number; // interior designer / studio of record
  location: string;
  country: string;
  year: number;
  areaM2: number;
  projectType: ProjectType;
  style: string;
  budgetRange: BudgetRange;
  description: string; // editorial body (supports \n\n paragraph breaks)
  excerpt: string;
  materials: string[];
  furniture: string[];
  lighting: string[];
  brandIds: number[];
  productIds: number[];
  tags: string[];
  articleId?: number; // optional link to a journal article
}

// ── SEED ─────────────────────────────────────────────────────────────────────

export const BRANDS: Brand[] = [
  { id: 1, slug: 'flos', name: 'Flos', country: 'Italy', website: 'flos.com', founded: '1962', logoSeed: 'epris-brand-flos', description: 'Milanese lighting house whose sculptural fixtures have defined architectural lighting since Achille Castiglioni. A reference point for editorial interiors worldwide.' },
  { id: 2, slug: 'cassina', name: 'Cassina', country: 'Italy', website: 'cassina.com', founded: '1927', logoSeed: 'epris-brand-cassina', description: 'Italian furniture manufacturer holding the rights to Le Corbusier and Charlotte Perriand reissues, alongside a contemporary collection by today\'s leading designers.' },
  { id: 3, slug: 'vitra', name: 'Vitra', country: 'Switzerland', website: 'vitra.com', founded: '1950', logoSeed: 'epris-brand-vitra', description: 'Swiss family company producing the work of Eames, Prouvé and Nelson, and a campus in Weil am Rhein that doubles as a museum of modern design.' },
  { id: 4, slug: 'kvadrat', name: 'Kvadrat', country: 'Denmark', website: 'kvadrat.dk', founded: '1968', logoSeed: 'epris-brand-kvadrat', description: 'Europe\'s leading manufacturer of design textiles, working with Raf Simons, Patricia Urquiola and the Bouroullec brothers on upholstery and acoustic surfaces.' },
  { id: 5, slug: 'gubi', name: 'Gubi', country: 'Denmark', website: 'gubi.com', founded: '1967', logoSeed: 'epris-brand-gubi', description: 'Copenhagen brand reviving forgotten mid-century icons from across the world alongside a confident contemporary catalogue.' },
  { id: 6, slug: 'dornbracht', name: 'Dornbracht', country: 'Germany', website: 'dornbracht.com', founded: '1950', logoSeed: 'epris-brand-dornbracht', description: 'German manufacturer of architectural taps and bathroom fittings, a fixture in high-spec hospitality and residential bathrooms.' },
  { id: 7, slug: 'mutina', name: 'Mutina', country: 'Italy', website: 'mutina.it', founded: '2006', logoSeed: 'epris-brand-mutina', description: 'Ceramic surface house collaborating with Patricia Urquiola, Konstantin Grcic and Ronan Bouroullec on tile as an architectural material.' },
  { id: 8, slug: 'bulthaup', name: 'Bulthaup', country: 'Germany', website: 'bulthaup.com', founded: '1949', logoSeed: 'epris-brand-bulthaup', description: 'Architectural kitchen systems reduced to essentials — the b1 and b3 programmes are a benchmark for the contemporary working kitchen.' },
];

export const STUDIOS: DesignStudio[] = [
  { id: 1, slug: 'studio-vincent-van-duysen', name: 'Vincent Van Duysen', country: 'Belgium', city: 'Antwerp', yearFounded: 1989, teamSize: '40–60', website: 'vincentvanduysen.com', imageSeed: 'epris-studio-vvd', awards: ['Belgian Building Award', 'Wallpaper* Design Award'], description: 'Antwerp practice known for a tactile, monastic minimalism — heavy materials, soft light, and a near-total absence of decoration. Works across residential, retail and hospitality.' },
  { id: 2, slug: 'studio-david-chipperfield', name: 'David Chipperfield Architects', country: 'United Kingdom', city: 'London', yearFounded: 1985, teamSize: '300+', website: 'davidchipperfield.com', imageSeed: 'epris-studio-dca', awards: ['Pritzker Prize 2023', 'RIBA Royal Gold Medal', 'Mies van der Rohe Award'], description: 'One of the defining architectural offices of the era, working at the scale of museums and cultural institutions with a restrained, durable civic language.' },
  { id: 3, slug: 'studio-faye-toogood', name: 'Faye Toogood', country: 'United Kingdom', city: 'London', yearFounded: 2008, teamSize: '10–20', website: 'fayetoogood.com', imageSeed: 'epris-studio-toogood', awards: ['London Design Medal'], description: 'British artist and designer working between furniture, fashion and interiors with a raw, sculptural and instinctive material sensibility.' },
  { id: 4, slug: 'studio-norm-architects', name: 'Norm Architects', country: 'Denmark', city: 'Copenhagen', yearFounded: 2008, teamSize: '20–30', website: 'normcph.com', imageSeed: 'epris-studio-norm', awards: ['German Design Award', 'EDIDA Nominee'], description: 'Copenhagen studio articulating a soft, warm minimalism they call "soft minimalism" — natural materials, restraint and a deep attention to human comfort.' },
  { id: 5, slug: 'studio-neri-and-hu', name: 'Neri&Hu', country: 'China', city: 'Shanghai', yearFounded: 2004, teamSize: '60–80', website: 'neriandhu.com', imageSeed: 'epris-studio-nerihu', awards: ['Wallpaper* Designer of the Year', 'EDIDA Designer of the Year'], description: 'Shanghai practice working across architecture, interiors and product, threading Chinese craft and memory through a rigorous contemporary frame.' },
  { id: 6, slug: 'studio-ilse-crawford', name: 'Studioilse', country: 'United Kingdom', city: 'London', yearFounded: 2003, teamSize: '15–25', website: 'studioilse.com', imageSeed: 'epris-studio-ilse', awards: ['Maison&Objet Designer of the Year'], description: 'Ilse Crawford\'s human-centred practice, designing hospitality and residential interiors that put comfort, the senses and well-being before image.' },
];

export const PRODUCTS: Product[] = [
  { id: 1, slug: 'ic-lights-floor', name: 'IC Lights Floor', category: 'Lighting', brandId: 1, country: 'Italy', imageSeed: 'epris-prod-ic-lights', year: '2014', dimensions: 'H 185 cm · Ø 40 cm', materials: ['Hand-blown opal glass', 'Brushed brass'], description: 'Michael Anastassiades\' balancing-act floor lamp — a glass sphere resting on a slender brass stem. A quiet icon of the last decade.' },
  { id: 2, slug: 'arco-floor-lamp', name: 'Arco Floor Lamp', category: 'Lighting', brandId: 1, country: 'Italy', imageSeed: 'epris-prod-arco', year: '1962', dimensions: 'H 240 cm · Reach 220 cm', materials: ['Carrara marble', 'Stainless steel'], description: 'The Castiglioni brothers\' overhead arc lamp on a marble base — overhead light without a ceiling fixture. Still in production six decades on.' },
  { id: 3, slug: 'lc4-chaise-longue', name: 'LC4 Chaise Longue', category: 'Furniture', brandId: 2, country: 'Italy', imageSeed: 'epris-prod-lc4', year: '1928', dimensions: 'L 160 cm · H 70 cm', materials: ['Chromed steel', 'Pony hide', 'Leather'], description: 'Le Corbusier, Jeanneret and Perriand\'s "relaxing machine" — a continuous curve cradling the body, reissued by Cassina.' },
  { id: 4, slug: 'utrecht-armchair', name: 'Utrecht Armchair', category: 'Furniture', brandId: 2, country: 'Italy', imageSeed: 'epris-prod-utrecht', year: '1935', dimensions: 'W 79 cm · D 79 cm · H 79 cm', materials: ['Solid wood frame', 'Foam', 'Wool upholstery'], description: 'Gerrit Rietveld\'s upright, stitched-seam armchair — graphic, generous and unmistakably architectural.' },
  { id: 5, slug: 'eames-lounge-chair', name: 'Eames Lounge Chair', category: 'Furniture', brandId: 3, country: 'Switzerland', imageSeed: 'epris-prod-eames', year: '1956', dimensions: 'W 84 cm · D 84 cm · H 84 cm', materials: ['Moulded plywood', 'Aniline leather', 'Aluminium'], description: 'Charles and Ray Eames\' lounge chair and ottoman — the warmth of a well-used baseball mitt rendered in plywood and leather.' },
  { id: 6, slug: 'akari-light-sculpture', name: 'Akari 1A', category: 'Lighting', brandId: 3, country: 'Switzerland', imageSeed: 'epris-prod-akari', year: '1951', dimensions: 'H 49 cm · Ø 25 cm', materials: ['Washi paper', 'Bamboo ribbing'], description: 'Isamu Noguchi\'s paper light sculptures — weightless lanterns that turn electric light into something close to moonlight.' },
  { id: 7, slug: 'divina-melange-textile', name: 'Divina Mélange', category: 'Finishes', brandId: 4, country: 'Denmark', imageSeed: 'epris-prod-divina', dimensions: 'W 140 cm · 100% wool', materials: ['New wool', 'Mélange yarn'], description: 'A finely mottled wool upholstery textile in a deep, considered palette — Kvadrat\'s most specified contract fabric.' },
  { id: 8, slug: 'beetle-lounge-chair', name: 'Beetle Lounge Chair', category: 'Furniture', brandId: 5, country: 'Denmark', imageSeed: 'epris-prod-beetle', year: '2013', dimensions: 'W 64 cm · D 60 cm · H 75 cm', materials: ['Moulded shell', 'Brass base', 'Leather'], description: 'GamFratesi\'s shell chair for Gubi, drawn from the carapace of a beetle — soft, enveloping and endlessly upholsterable.' },
  { id: 9, slug: 'multiball-pendant', name: 'Multi-Lite Pendant', category: 'Lighting', brandId: 5, country: 'Denmark', imageSeed: 'epris-prod-multilite', year: '1972', dimensions: 'H 36 cm · Ø 22 cm', materials: ['Lacquered metal', 'Brass'], description: 'Louis Weisdorf\'s pendant with two rotating shades that recompose the light — a 1970s icon revived by Gubi.' },
  { id: 10, slug: 'tara-tap', name: 'Tara Mixer', category: 'Bathroom', brandId: 6, country: 'Germany', imageSeed: 'epris-prod-tara', year: '1992', dimensions: 'Projection 18 cm', materials: ['Solid brass', 'Platinum / matt black finish'], description: 'Sieger Design\'s cylinder-and-cross tap for Dornbracht — the default specification for the architectural bathroom.' },
  { id: 11, slug: 'tex-tile', name: 'Tex Tile', category: 'Finishes', brandId: 7, country: 'Italy', imageSeed: 'epris-prod-tex', year: '2017', dimensions: '60 × 120 cm porcelain', materials: ['Porcelain stoneware'], description: 'Raw-Edges\' textile-textured tile for Mutina — woven pattern pressed into porcelain, blurring fabric and surface.' },
  { id: 12, slug: 'b3-kitchen', name: 'b3 Kitchen System', category: 'Kitchen', brandId: 8, country: 'Germany', imageSeed: 'epris-prod-b3', year: '2004', dimensions: 'Modular · made to plan', materials: ['Aluminium', 'Solid oak', 'Stainless steel'], description: 'Bulthaup\'s wall-hung kitchen architecture — a structural rail from which everything else is suspended. The reference working kitchen.' },
  { id: 13, slug: 'pacha-lounge', name: 'Pacha Lounge Chair', category: 'Furniture', brandId: 5, country: 'Denmark', imageSeed: 'epris-prod-pacha', year: '1975', dimensions: 'W 78 cm · D 86 cm · H 67 cm', materials: ['Foam', 'Bouclé', 'Wood base'], description: 'Pierre Paulin\'s low, ground-hugging lounge chair — pure 1970s comfort, reissued by Gubi in rich bouclé.' },
  { id: 14, slug: 'rift-tile', name: 'Rift', category: 'Finishes', brandId: 7, country: 'Italy', imageSeed: 'epris-prod-rift', year: '2014', dimensions: '18 × 54 cm porcelain', materials: ['Porcelain stoneware'], description: 'Studioart / Mutina\'s linear ridged tile reading as fluted stone — a workhorse for feature walls.' },
];

export const PROJECTS: Project[] = [
  {
    id: 1, slug: 'august-hotel-antwerp', title: 'August Hotel', featuredSeed: 'epris-proj-august-1',
    gallerySeeds: ['epris-proj-august-1', 'epris-proj-august-2', 'epris-proj-august-3', 'epris-proj-august-4'],
    architect: 'Vincent Van Duysen', studioId: 1, location: 'Antwerp', country: 'Belgium', year: 2019,
    areaM2: 4400, projectType: 'Hotel', style: 'Monastic Minimalism', budgetRange: '€€€€',
    excerpt: 'A former military hospital and chapel reworked into a 44-room hotel where silence, stone and filtered light do the work of decoration.',
    description: 'August occupies a quadrangle of four nineteenth-century buildings — a former military hospital, a college and a chapel — set behind a garden wall in Antwerp\'s Green Quarter. Vincent Van Duysen left the bones intact and worked instead on atmosphere: lime-plastered walls, dark timber, and rooms that borrow their proportions from the cells of the convent that once stood here.\n\nThe chapel is now the bar, its altar replaced by a monolithic island under the original vaulting. Everywhere the palette is reduced almost to monochrome, so that the few gestures — a single Flos pendant, a slab of marble, the grain of oak — register with unusual force. It is a building that asks the guest to slow down.',
    materials: ['Lime plaster', 'Smoked oak', 'Belgian bluestone', 'Patinated brass'],
    furniture: ['Custom oak beds', 'LC4 Chaise Longue', 'Utrecht Armchair'],
    lighting: ['IC Lights Floor', 'Arco Floor Lamp'],
    brandIds: [1, 2], productIds: [1, 2, 3, 4], tags: ['hospitality', 'adaptive reuse', 'minimalism', 'heritage'],
  },
  {
    id: 2, slug: 'james-simon-galerie', title: 'James-Simon-Galerie', featuredSeed: 'epris-proj-jsg-1',
    gallerySeeds: ['epris-proj-jsg-1', 'epris-proj-jsg-2', 'epris-proj-jsg-3'],
    architect: 'David Chipperfield', studioId: 2, location: 'Berlin', country: 'Germany', year: 2019,
    areaM2: 10900, projectType: 'Cultural', style: 'Civic Modernism', budgetRange: '€€€€',
    excerpt: 'The new entrance building to Berlin\'s Museum Island — a colonnade of slender concrete columns mediating between river, city and antiquity.',
    description: 'The James-Simon-Galerie is the central entrance to Museum Island, a project two decades in the making. Chipperfield\'s answer to a near-impossible brief — a contemporary building among five historic museums — is a long, raised colonnade of fine cast-stone columns that quote Schinkel without copying him.\n\nInside, the material discipline is absolute: cast stone, exposed concrete, and a single grand stair that choreographs the visitor\'s ascent. It is architecture as infrastructure, content to be the quiet connective tissue of a UNESCO ensemble.',
    materials: ['Cast stone', 'Exposed concrete', 'Reconstructed marble aggregate'],
    furniture: ['Custom cast-stone benches', 'Eames Lounge Chair'],
    lighting: ['Akari 1A', 'Custom linear coffers'],
    brandIds: [3], productIds: [5, 6], tags: ['cultural', 'museum', 'concrete', 'public'],
  },
  {
    id: 3, slug: 'the-audo-copenhagen', title: 'The Audo', featuredSeed: 'epris-proj-audo-1',
    gallerySeeds: ['epris-proj-audo-1', 'epris-proj-audo-2', 'epris-proj-audo-3', 'epris-proj-audo-4'],
    architect: 'Norm Architects', studioId: 4, location: 'Copenhagen', country: 'Denmark', year: 2019,
    areaM2: 1700, projectType: 'Hotel', style: 'Soft Minimalism', budgetRange: '€€€',
    excerpt: 'Part hotel, part showroom, part café — a 1918 harbour-side building reimagined as a single, coherent essay in soft Scandinavian minimalism.',
    description: 'The Audo — short for "au domus", a house for all — folds a hotel, a material library, a café, a restaurant and a Menu showroom into one red-brick building in Copenhagen\'s Nordhavn. Norm Architects treat the whole as a continuous interior, so that a guest room shares its language with the café downstairs.\n\nThe palette is warm and tactile: travertine, oak, wool and lime render, lit low and even. Furniture is largely from Menu and Carl Hansen, with the rooms doubling as a place to actually live with the pieces before buying them.',
    materials: ['Travertine', 'Oiled oak', 'Lime render', 'Wool bouclé'],
    furniture: ['Beetle Lounge Chair', 'Pacha Lounge Chair', 'Eames Lounge Chair'],
    lighting: ['Multi-Lite Pendant', 'IC Lights Floor'],
    brandIds: [5, 3, 4], productIds: [8, 13, 9, 1, 7], tags: ['hospitality', 'showroom', 'scandinavian', 'soft minimalism'],
  },
  {
    id: 4, slug: 'rooms-hotel-tbilisi', title: 'Rooms Hotel', featuredSeed: 'epris-proj-rooms-1',
    gallerySeeds: ['epris-proj-rooms-1', 'epris-proj-rooms-2', 'epris-proj-rooms-3'],
    architect: 'Nata Janberidze & Keti Toloraia', studioId: 6, location: 'Tbilisi', country: 'Georgia', year: 2018,
    areaM2: 6000, projectType: 'Hotel', style: 'Eclectic Industrial', budgetRange: '€€€',
    excerpt: 'A former Soviet publishing house turned layered, lived-in hotel — leather, brass and worn parquet assembled like a private collector\'s apartment.',
    description: 'Rooms Hotel inhabits a hulking former publishing house in Tbilisi\'s Vera district. Rather than erase the Soviet structure, the design leans into it — raw concrete and steel columns are left exposed and then dressed with deep leather sofas, vintage rugs, brass and an almost domestic clutter of books and lamps.\n\nThe effect is of a building that has been continuously inhabited for a century rather than recently renovated. Studioilse\'s influence on this generation of hospitality — comfort over image — is everywhere in its DNA.',
    materials: ['Reclaimed parquet', 'Patinated brass', 'Cognac leather', 'Exposed concrete'],
    furniture: ['Utrecht Armchair', 'Eames Lounge Chair', 'Custom leather sofas'],
    lighting: ['Arco Floor Lamp', 'Akari 1A'],
    brandIds: [2, 3], productIds: [4, 5, 2, 6], tags: ['hospitality', 'adaptive reuse', 'eclectic', 'industrial'],
  },
  {
    id: 5, slug: 'aesop-marais-paris', title: 'Aesop Marais', featuredSeed: 'epris-proj-aesop-1',
    gallerySeeds: ['epris-proj-aesop-1', 'epris-proj-aesop-2'],
    architect: 'Faye Toogood', studioId: 3, location: 'Paris', country: 'France', year: 2021,
    areaM2: 70, projectType: 'Retail', style: 'Sculptural Raw', budgetRange: '€€',
    excerpt: 'A jewel-box Aesop store rendered almost entirely in a single textured material — retail reduced to surface, light and a basin.',
    description: 'For Aesop\'s Marais store, Faye Toogood worked the entire shell — walls, shelving, central basin — in a single hand-troweled, sand-coloured render, so that the space reads as one continuous sculptural object. Product sits in shallow recesses like artefacts in a museum vitrine.\n\nIt is a study in restraint: no joinery showing off, no decorative lighting, just a warm monolithic room and the ritual of washing one\'s hands at the central trough. Toogood\'s instinct for raw material and primitive form turns a 70 m² shop into something closer to a chapel.',
    materials: ['Hand-troweled render', 'Travertine', 'Aged brass'],
    furniture: ['Custom plinths', 'Toogood Roly-Poly stool'],
    lighting: ['Akari 1A'],
    brandIds: [1], productIds: [6], tags: ['retail', 'monomaterial', 'sculptural', 'small space'],
  },
  {
    id: 6, slug: 'design-republic-shanghai', title: 'Design Republic Commune', featuredSeed: 'epris-proj-dr-1',
    gallerySeeds: ['epris-proj-dr-1', 'epris-proj-dr-2', 'epris-proj-dr-3'],
    architect: 'Neri&Hu', studioId: 5, location: 'Shanghai', country: 'China', year: 2014,
    areaM2: 2300, projectType: 'Retail', style: 'Adaptive Heritage', budgetRange: '€€€',
    excerpt: 'A red-brick former police headquarters turned design-retail "commune" — a building within a building, threading new steel through colonial bones.',
    description: 'Neri&Hu transformed a 1910 former police headquarters — a protected red-brick landmark — into a design retail destination. Their signature move is a "building within a building": a new black-steel structure inserted into the historic shell, carrying galleries, a restaurant and showrooms while leaving the original masonry to breathe.\n\nThe project is a thesis on how a city like Shanghai can hold onto memory while moving fast — old and new kept legibly distinct, never blended into pastiche.',
    materials: ['Reclaimed grey brick', 'Blackened steel', 'Smoked glass', 'Oak'],
    furniture: ['LC4 Chaise Longue', 'Beetle Lounge Chair'],
    lighting: ['IC Lights Floor', 'Multi-Lite Pendant'],
    brandIds: [2, 5, 1], productIds: [3, 8, 1, 9], tags: ['retail', 'adaptive reuse', 'heritage', 'steel'],
  },
  {
    id: 7, slug: 'molteni-flagship-london', title: 'Molteni&C Flagship', featuredSeed: 'epris-proj-molteni-1',
    gallerySeeds: ['epris-proj-molteni-1', 'epris-proj-molteni-2'],
    architect: 'Vincent Van Duysen', studioId: 1, location: 'London', country: 'United Kingdom', year: 2018,
    areaM2: 900, projectType: 'Retail', style: 'Warm Minimalism', budgetRange: '€€€',
    excerpt: 'A Shoreditch flagship staged like a series of domestic rooms — furniture shown the way it should be lived with, not merchandised.',
    description: 'As creative director of Molteni&C, Vincent Van Duysen designed the brand\'s London flagship as a sequence of fully resolved domestic interiors rather than a showroom floor. Each room is a complete proposition — a real kitchen, a real living room — so the visitor reads atmosphere before product.\n\nWarm oak, plaster and stone carry the now-familiar Van Duysen register: quiet, expensive, and entirely without noise.',
    materials: ['Smoked oak', 'Lime plaster', 'Travertine'],
    furniture: ['LC4 Chaise Longue', 'Utrecht Armchair', 'Custom Molteni sofas'],
    lighting: ['IC Lights Floor', 'Arco Floor Lamp'],
    brandIds: [2, 1], productIds: [3, 4, 1, 2], tags: ['retail', 'showroom', 'warm minimalism'],
  },
  {
    id: 8, slug: 'noma-2-copenhagen', title: 'Noma 2.0', featuredSeed: 'epris-proj-noma-1',
    gallerySeeds: ['epris-proj-noma-1', 'epris-proj-noma-2', 'epris-proj-noma-3'],
    architect: 'BIG / Studio David Thulstrup', studioId: 4, location: 'Copenhagen', country: 'Denmark', year: 2018,
    areaM2: 1300, projectType: 'Restaurant', style: 'Nordic Pavilion', budgetRange: '€€€€',
    excerpt: 'A restaurant rebuilt as a village of eleven pavilions around a glass-walled kitchen — raw oak, brick and a near-religious focus on craft.',
    description: 'Noma\'s second home is conceived as a small village: eleven interconnected buildings clustered around the kitchen at its heart, each with its own function — fermentation lab, bakery, dining barn. The interiors lean almost entirely on Danish craft: hand-laid brick, raw oak, custom ceramics and textiles commissioned from local makers.\n\nThe dining room\'s great oak roof and full-height glazing collapse the boundary between guests, kitchen and the surrounding lake landscape — eating positioned as something close to a ritual of place.',
    materials: ['Hand-laid brick', 'Raw oak', 'Smoked glass', 'Custom ceramics'],
    furniture: ['Custom oak dining chairs', 'Beetle Lounge Chair'],
    lighting: ['Akari 1A', 'Custom paper pendants'],
    brandIds: [5, 4], productIds: [8, 7, 6], tags: ['restaurant', 'craft', 'nordic', 'timber'],
  },
  {
    id: 9, slug: 'fosbury-and-sons-antwerp', title: 'Fosbury & Sons', featuredSeed: 'epris-proj-fosbury-1',
    gallerySeeds: ['epris-proj-fosbury-1', 'epris-proj-fosbury-2', 'epris-proj-fosbury-3'],
    architect: 'Going East', studioId: 6, location: 'Antwerp', country: 'Belgium', year: 2017,
    areaM2: 7000, projectType: 'Office', style: 'Domestic Workplace', budgetRange: '€€€',
    excerpt: 'A 1958 brutalist tower turned co-working club that looks nothing like an office — green marble, deep sofas and a members\'-club calm.',
    description: 'Fosbury & Sons reinvented co-working by refusing to design an office at all. Inside a listed 1958 brutalist tower, the studio created something closer to a private members\' club: lounges, a library, a café and meeting rooms dressed in green marble, oak, leather and abundant planting.\n\nThe wager — that people work better in a space that feels domestic and considered than in an open-plan grid — has since shaped a whole generation of flexible workplaces.',
    materials: ['Green marble', 'Oak parquet', 'Leather', 'Brass'],
    furniture: ['Eames Lounge Chair', 'Pacha Lounge Chair', 'Utrecht Armchair'],
    lighting: ['Arco Floor Lamp', 'Multi-Lite Pendant'],
    brandIds: [3, 5, 2], productIds: [5, 13, 4, 2, 9], tags: ['office', 'co-working', 'adaptive reuse', 'domestic'],
  },
  {
    id: 10, slug: 'casa-mp-residence', title: 'Casa MP', featuredSeed: 'epris-proj-casamp-1',
    gallerySeeds: ['epris-proj-casamp-1', 'epris-proj-casamp-2', 'epris-proj-casamp-3', 'epris-proj-casamp-4'],
    architect: 'Vincent Van Duysen', studioId: 1, location: 'Melbourne', country: 'Australia', year: 2022,
    areaM2: 520, projectType: 'Residential', style: 'Monastic Minimalism', budgetRange: '€€€€',
    excerpt: 'A single-family house organised around a central courtyard — load-bearing travertine, deep eaves and rooms calibrated to the path of the sun.',
    description: 'Casa MP is a private residence arranged around a planted courtyard, its rooms wrapping the open centre so that every space borrows light and view from the garden. The structure is expressed honestly — travertine walls carry the load and become the finish, eaves are deep enough to read as rooms in themselves.\n\nThe interior continues the exterior\'s material logic without interruption: the same stone underfoot inside and out, oak joinery, and a furniture plan kept deliberately sparse so the architecture is never crowded.',
    materials: ['Travertine', 'Smoked oak', 'Lime plaster', 'Bronze'],
    furniture: ['LC4 Chaise Longue', 'Eames Lounge Chair', 'Custom oak dining table'],
    lighting: ['IC Lights Floor', 'Akari 1A'],
    brandIds: [2, 3, 1], productIds: [3, 5, 1, 6], tags: ['residential', 'courtyard house', 'minimalism', 'stone'],
  },
  {
    id: 11, slug: 'le-meridien-spa', title: 'Thermal Bathhouse', featuredSeed: 'epris-proj-bath-1',
    gallerySeeds: ['epris-proj-bath-1', 'epris-proj-bath-2', 'epris-proj-bath-3'],
    architect: 'Neri&Hu', studioId: 5, location: 'Lisbon', country: 'Portugal', year: 2023,
    areaM2: 1800, projectType: 'Public Space', style: 'Material Sensory', budgetRange: '€€€€',
    excerpt: 'A public thermal bath where stone, water and dimmed light are the entire programme — circulation choreographed like a slow descent underground.',
    description: 'This public bathhouse is organised as a descent: visitors move from a bright stone-clad entry hall down through progressively darker, more humid chambers to the thermal pools at the lowest level. Neri&Hu use a single family of materials — rough and honed stone, water, bronze — to mark the journey by texture and temperature rather than signage.\n\nLighting is kept low and indirect throughout, so the eye adjusts and the body slows. It is infrastructure designed as an emotional sequence.',
    materials: ['Honed limestone', 'Rough travertine', 'Bronze', 'Porcelain tile'],
    furniture: ['Custom stone benches', 'Pacha Lounge Chair'],
    lighting: ['Custom recessed lighting', 'IC Lights Floor'],
    brandIds: [6, 7, 1], productIds: [10, 11, 14, 1, 13], tags: ['public space', 'wellness', 'stone', 'sensory'],
  },
  {
    id: 12, slug: 'noma-test-kitchen', title: 'Inua Restaurant', featuredSeed: 'epris-proj-inua-1',
    gallerySeeds: ['epris-proj-inua-1', 'epris-proj-inua-2'],
    architect: 'Norm Architects', studioId: 4, location: 'Tokyo', country: 'Japan', year: 2018,
    areaM2: 600, projectType: 'Restaurant', style: 'Nordic-Japanese', budgetRange: '€€€',
    excerpt: 'A Nordic restaurant in Tokyo where Scandinavian restraint and Japanese craft meet over a long oak counter and washi-filtered light.',
    description: 'Inua set out to find the common ground between Nordic and Japanese sensibilities, and Norm Architects answered with an interior that could belong to both. A long oak counter anchors the room; washi screens diffuse the light; the palette is reduced to wood, paper, stone and a few notes of blackened steel.\n\nThe restraint is the point — two craft cultures that prize natural material, emptiness and precision, allowed to speak in a single quiet voice.',
    materials: ['Oak', 'Washi paper', 'Blackened steel', 'Volcanic stone'],
    furniture: ['Beetle Lounge Chair', 'Custom oak stools'],
    lighting: ['Akari 1A', 'Multi-Lite Pendant'],
    brandIds: [3, 5, 4], productIds: [6, 8, 9, 7], tags: ['restaurant', 'nordic', 'japanese', 'craft'],
  },
];
