export type SupportedLang = 'EN' | 'UA' | 'RU' | 'DE' | 'IT' | 'ES' | 'TR';

export interface DesignUI {
  masthead: string;
  masthead2: string;
  intro1?: string;
  intro2?: string;
  looksBelow: string;
  shopThisLook: string;
  closeLook: string;
  viewing: string;
  catalogTitle: string;
  catalogKicker: string;
  featuredLabel: string;
  shopPieces: string;
  items: string;
  quickView: string;
  shopAt: string;
  allFilter: string;
  priceNote: string;
  stylistLabel: string;
  stylistTitle: string;
  stylistSub: string;
  stylistPlaceholder: string;
  stylistCta: string;
  stylistLoading: string;
  stylistBoardFor: string;
  stylistTryAgain: string;
  // ── Stylist v2 (structured brief + reasoning) — optional, EN-merged ──
  stylistRoom?: string;
  stylistStyle?: string;
  stylistBudget?: string;
  stylistAnyBudget?: string;
  stylistRefine?: string;
  stylistCompose?: string;
  stylistConcept?: string;
  stylistPalette?: string;
  stylistEstimate?: string;
  stylistTips?: string;
  stylistWhy?: string;
  roleAnchor?: string;
  roleSupport?: string;
  roleAccent?: string;
  // ── The Edit — search & sort (optional, EN-merged) ──
  searchPlaceholder?: string;
  sortRelevance?: string;
  sortPriceAsc?: string;
  sortPriceDesc?: string;
  sortName?: string;
  noResults?: string;
  noResultsHint?: string;
  resultsCount?: string;
  loadingCatalog?: string;
}

// New stylist UI strings, merged onto every language (EN fallback per-key).
const STYLIST_EXT: Record<SupportedLang, Partial<DesignUI>> = {
  EN: { stylistRoom: 'Room', stylistStyle: 'Style', stylistBudget: 'Budget', stylistAnyBudget: 'No limit', stylistRefine: 'Add detail — palette, mood, what it\'s for…', stylistCompose: 'Compose my room', stylistConcept: 'The concept', stylistPalette: 'Palette', stylistEstimate: 'Estimated total', stylistTips: 'Styling notes', stylistWhy: 'Why it works', roleAnchor: 'Anchor', roleSupport: 'Supporting', roleAccent: 'Accent' },
  UA: { stylistRoom: 'Кімната', stylistStyle: 'Стиль', stylistBudget: 'Бюджет', stylistAnyBudget: 'Без межі', stylistRefine: 'Додайте деталі — палітра, настрій, призначення…', stylistCompose: 'Скласти кімнату', stylistConcept: 'Концепція', stylistPalette: 'Палітра', stylistEstimate: 'Орієнтовна сума', stylistTips: 'Поради стиліста', stylistWhy: 'Чому це працює', roleAnchor: 'Основа', roleSupport: 'Підтримка', roleAccent: 'Акцент' },
  RU: { stylistRoom: 'Комната', stylistStyle: 'Стиль', stylistBudget: 'Бюджет', stylistAnyBudget: 'Без лимита', stylistRefine: 'Добавьте деталей — палитра, настроение, для чего…', stylistCompose: 'Собрать комнату', stylistConcept: 'Концепция', stylistPalette: 'Палитра', stylistEstimate: 'Примерная сумма', stylistTips: 'Заметки стилиста', stylistWhy: 'Почему это работает', roleAnchor: 'Основа', roleSupport: 'Поддержка', roleAccent: 'Акцент' },
  DE: { stylistRoom: 'Raum', stylistStyle: 'Stil', stylistBudget: 'Budget', stylistAnyBudget: 'Kein Limit', stylistRefine: 'Details ergänzen — Palette, Stimmung, Zweck…', stylistCompose: 'Raum gestalten', stylistConcept: 'Das Konzept', stylistPalette: 'Palette', stylistEstimate: 'Geschätzte Summe', stylistTips: 'Styling-Notizen', stylistWhy: 'Warum es funktioniert', roleAnchor: 'Anker', roleSupport: 'Ergänzend', roleAccent: 'Akzent' },
  IT: { stylistRoom: 'Stanza', stylistStyle: 'Stile', stylistBudget: 'Budget', stylistAnyBudget: 'Nessun limite', stylistRefine: 'Aggiungi dettagli — palette, atmosfera, uso…', stylistCompose: 'Componi la stanza', stylistConcept: 'Il concept', stylistPalette: 'Palette', stylistEstimate: 'Totale stimato', stylistTips: 'Note di stile', stylistWhy: 'Perché funziona', roleAnchor: 'Ancora', roleSupport: 'Di supporto', roleAccent: 'Accento' },
  ES: { stylistRoom: 'Estancia', stylistStyle: 'Estilo', stylistBudget: 'Presupuesto', stylistAnyBudget: 'Sin límite', stylistRefine: 'Añade detalles — paleta, ambiente, uso…', stylistCompose: 'Componer mi estancia', stylistConcept: 'El concepto', stylistPalette: 'Paleta', stylistEstimate: 'Total estimado', stylistTips: 'Notas de estilo', stylistWhy: 'Por qué funciona', roleAnchor: 'Ancla', roleSupport: 'De apoyo', roleAccent: 'Acento' },
  TR: { stylistRoom: 'Oda', stylistStyle: 'Stil', stylistBudget: 'Bütçe', stylistAnyBudget: 'Sınır yok', stylistRefine: 'Detay ekleyin — palet, hava, amaç…', stylistCompose: 'Odamı oluştur', stylistConcept: 'Konsept', stylistPalette: 'Palet', stylistEstimate: 'Tahmini toplam', stylistTips: 'Stil notları', stylistWhy: 'Neden işe yarıyor', roleAnchor: 'Çapa', roleSupport: 'Destekleyici', roleAccent: 'Aksan' },
};

// Search & sort strings for The Edit catalogue grid.
const CATALOG_EXT: Record<SupportedLang, Partial<DesignUI>> = {
  EN: { searchPlaceholder: 'Search by name or retailer…', sortRelevance: 'Featured', sortPriceAsc: 'Price: low to high', sortPriceDesc: 'Price: high to low', sortName: 'Name A–Z', noResults: 'No pieces match', noResultsHint: 'Try a different search or clear the category filter.', resultsCount: 'pieces', loadingCatalog: 'Loading the full catalogue —' },
  UA: { searchPlaceholder: 'Пошук за назвою чи магазином…', sortRelevance: 'Рекомендовані', sortPriceAsc: 'Ціна: спочатку дешевші', sortPriceDesc: 'Ціна: спочатку дорожчі', sortName: 'Назва А–Я', noResults: 'Нічого не знайдено', noResultsHint: 'Спробуйте інший запит або скиньте фільтр категорії.', resultsCount: 'позицій', loadingCatalog: 'Завантажуємо весь каталог —' },
  RU: { searchPlaceholder: 'Поиск по названию или магазину…', sortRelevance: 'Рекомендуемые', sortPriceAsc: 'Цена: сначала дешевле', sortPriceDesc: 'Цена: сначала дороже', sortName: 'Название А–Я', noResults: 'Ничего не найдено', noResultsHint: 'Попробуйте другой запрос или сбросьте фильтр категории.', resultsCount: 'позиций', loadingCatalog: 'Загружаем весь каталог —' },
  DE: { searchPlaceholder: 'Suche nach Name oder Händler…', sortRelevance: 'Empfohlen', sortPriceAsc: 'Preis: aufsteigend', sortPriceDesc: 'Preis: absteigend', sortName: 'Name A–Z', noResults: 'Keine Treffer', noResultsHint: 'Versuchen Sie eine andere Suche oder setzen Sie den Filter zurück.', resultsCount: 'Stücke', loadingCatalog: 'Lade den gesamten Katalog —' },
  IT: { searchPlaceholder: 'Cerca per nome o rivenditore…', sortRelevance: 'In evidenza', sortPriceAsc: 'Prezzo: dal più basso', sortPriceDesc: 'Prezzo: dal più alto', sortName: 'Nome A–Z', noResults: 'Nessun risultato', noResultsHint: 'Prova un’altra ricerca o rimuovi il filtro categoria.', resultsCount: 'pezzi', loadingCatalog: 'Caricamento del catalogo completo —' },
  ES: { searchPlaceholder: 'Buscar por nombre o tienda…', sortRelevance: 'Destacados', sortPriceAsc: 'Precio: menor a mayor', sortPriceDesc: 'Precio: mayor a menor', sortName: 'Nombre A–Z', noResults: 'Sin resultados', noResultsHint: 'Prueba otra búsqueda o quita el filtro de categoría.', resultsCount: 'piezas', loadingCatalog: 'Cargando el catálogo completo —' },
  TR: { searchPlaceholder: 'İsim veya mağazaya göre ara…', sortRelevance: 'Öne çıkanlar', sortPriceAsc: 'Fiyat: düşükten yükseğe', sortPriceDesc: 'Fiyat: yüksekten düşüğe', sortName: 'İsim A–Z', noResults: 'Sonuç yok', noResultsHint: 'Farklı bir arama deneyin ya da kategori filtresini temizleyin.', resultsCount: 'ürün', loadingCatalog: 'Tüm katalog yükleniyor —' },
};

export interface RoomChip { key: string; label: Record<SupportedLang, string>; }
export const STYLIST_ROOMS: RoomChip[] = [
  { key: 'living', label: { EN: 'Living room', UA: 'Вітальня', RU: 'Гостиная', DE: 'Wohnzimmer', IT: 'Soggiorno', ES: 'Salón', TR: 'Oturma odası' } },
  { key: 'bedroom', label: { EN: 'Bedroom', UA: 'Спальня', RU: 'Спальня', DE: 'Schlafzimmer', IT: 'Camera', ES: 'Dormitorio', TR: 'Yatak odası' } },
  { key: 'office', label: { EN: 'Home office', UA: 'Офіс', RU: 'Кабинет', DE: 'Büro', IT: 'Studio', ES: 'Despacho', TR: 'Ofis' } },
  { key: 'dining', label: { EN: 'Dining', UA: 'Їдальня', RU: 'Столовая', DE: 'Esszimmer', IT: 'Sala da pranzo', ES: 'Comedor', TR: 'Yemek' } },
  { key: 'entry', label: { EN: 'Hallway', UA: 'Передпокій', RU: 'Прихожая', DE: 'Flur', IT: 'Ingresso', ES: 'Entrada', TR: 'Hol' } },
];
export function getRoomLabel(key: string, lang: string): string {
  const r = STYLIST_ROOMS.find((x) => x.key === key);
  return r ? (r.label[lang as SupportedLang] ?? r.label.EN) : key;
}

// Design vocabulary — kept in English (universal, matches catalogue style tags).
export const STYLIST_STYLES = ['Scandinavian', 'Minimalist', 'Mid-century', 'Warm', 'Modern', 'Classic', 'Moody', 'Boho'];
export const STYLIST_BUDGETS = [800, 1500, 3000, 0];

export interface LookI18n {
  title: string;
  subtitle: string;
  story: string;
}

const ui: Record<SupportedLang, DesignUI> = {
  EN: {
    masthead: 'Real rooms.',
    masthead2: 'Real things.',
    intro1: 'Every piece here is a real product — priced, linked, and shoppable the moment you see it. No mood-board fantasy, no items you can\'t actually buy. Images and prices are fetched live from IKEA, HAY, Muuto, West Elm, and other makers we trust.',
    intro2: 'Use the AI Stylist to describe your space — room, style, budget — and it will compose a considered board from the catalogue, with an explanation of why each piece earns its place. Or browse the curated looks below and shop any piece directly.',
    looksBelow: 'looks below',
    shopThisLook: 'Shop this look',
    closeLook: 'Close look',
    viewing: 'viewing',
    catalogTitle: 'The Edit',
    catalogKicker: 'Full catalogue',
    featuredLabel: 'Featured',
    shopPieces: 'Shop the pieces',
    items: 'items',
    quickView: 'Quick view',
    shopAt: 'Shop at',
    allFilter: 'All',
    priceNote: 'Images and prices fetched live from retailer pages. Links open the maker\'s site.',
    stylistLabel: 'AI Stylist',
    stylistTitle: 'Ask the Stylist',
    stylistSub: 'Describe your space, style, and budget. The AI picks a curated board from our real catalogue.',
    stylistPlaceholder: 'e.g. cozy Scandinavian bedroom, warm tones, budget $800',
    stylistCta: 'Curate for me',
    stylistLoading: 'Curating…',
    stylistBoardFor: 'Board for',
    stylistTryAgain: 'Try another brief',
  },
  UA: {
    masthead: 'Справжні кімнати.',
    masthead2: 'Справжні речі.',
    intro1: 'Кожен предмет тут — реальний товар із ціною та посиланням. Ніякого «мудборду для натхнення» — лише речі, які можна купити прямо зараз. Зображення й ціни завантажуються наживо з IKEA, HAY, Muuto, West Elm та інших брендів.',
    intro2: 'Скористайтесь AI-стилістом: опишіть кімнату, стиль і бюджет — він підбере добірку з каталогу й поясить, чому кожна річ тут доречна. Або переглядайте готові образи нижче та купуйте окремі предмети.',
    looksBelow: 'образів нижче',
    shopThisLook: 'Купити цей образ',
    closeLook: 'Закрити',
    viewing: 'переглядаємо',
    catalogTitle: 'Добірка',
    catalogKicker: 'Весь каталог',
    featuredLabel: 'Рекомендуємо',
    shopPieces: 'Речі образу',
    items: 'позицій',
    quickView: 'Швидкий перегляд',
    shopAt: 'Купити у',
    allFilter: 'Всі',
    priceNote: 'Зображення та ціни завантажуються наживо зі сторінок ритейлерів. Посилання відкривають сайт виробника.',
    stylistLabel: 'AI-стиліст',
    stylistTitle: 'Запитай стиліста',
    stylistSub: 'Опишіть ваш простір, стиль і бюджет. AI підбере добірку з реального каталогу.',
    stylistPlaceholder: 'напр. скандинавська спальня, теплі відтінки, бюджет $800',
    stylistCta: 'Підібрати',
    stylistLoading: 'Підбираємо…',
    stylistBoardFor: 'Добірка для',
    stylistTryAgain: 'Спробувати інший запит',
  },
  RU: {
    masthead: 'Настоящие комнаты.',
    masthead2: 'Настоящие вещи.',
    intro1: 'Каждый предмет здесь — реальный товар с ценой и ссылкой. Никаких «inspirational moodboard» — только то, что можно купить прямо сейчас. Изображения и цены подгружаются вживую с IKEA, HAY, Muuto, West Elm и других марок.',
    intro2: 'Используйте AI-стилиста: опишите комнату, стиль и бюджет — он подберёт подборку из каталога и объяснит, почему каждый предмет здесь уместен. Или листайте готовые образы ниже и покупайте отдельные вещи.',
    looksBelow: 'образов ниже',
    shopThisLook: 'Купить этот образ',
    closeLook: 'Закрыть',
    viewing: 'просматриваем',
    catalogTitle: 'Подборка',
    catalogKicker: 'Весь каталог',
    featuredLabel: 'Рекомендуем',
    shopPieces: 'Вещи образа',
    items: 'позиций',
    quickView: 'Быстрый просмотр',
    shopAt: 'Купить у',
    allFilter: 'Все',
    priceNote: 'Изображения и цены загружаются в реальном времени со страниц ритейлеров.',
    stylistLabel: 'AI-стилист',
    stylistTitle: 'Спроси стилиста',
    stylistSub: 'Опишите ваше пространство, стиль и бюджет. AI составит подборку из реального каталога.',
    stylistPlaceholder: 'напр. скандинавская спальня, тёплые тона, бюджет $800',
    stylistCta: 'Подобрать',
    stylistLoading: 'Подбираем…',
    stylistBoardFor: 'Подборка для',
    stylistTryAgain: 'Попробовать другой запрос',
  },
  DE: {
    masthead: 'Echte Räume.',
    masthead2: 'Echte Dinge.',
    looksBelow: 'Looks unten',
    shopThisLook: 'Diesen Look kaufen',
    closeLook: 'Schließen',
    viewing: 'angesehen',
    catalogTitle: 'Die Auswahl',
    catalogKicker: 'Gesamtkatalog',
    featuredLabel: 'Empfohlen',
    shopPieces: 'Artikel kaufen',
    items: 'Artikel',
    quickView: 'Schnellansicht',
    shopAt: 'Kaufen bei',
    allFilter: 'Alle',
    priceNote: 'Bilder und Preise werden live von den Händlerseiten abgerufen.',
    stylistLabel: 'KI-Stylistin',
    stylistTitle: 'Die Stylistin fragen',
    stylistSub: 'Beschreiben Sie Ihren Raum, Stil und Budget. Die KI wählt eine kuratierte Auswahl aus unserem Katalog.',
    stylistPlaceholder: 'z.B. gemütliches Schlafzimmer, Scandi-Stil, Budget 800 €',
    stylistCta: 'Kuratieren',
    stylistLoading: 'Wird zusammengestellt…',
    stylistBoardFor: 'Board für',
    stylistTryAgain: 'Neue Anfrage versuchen',
  },
  IT: {
    masthead: 'Stanze vere.',
    masthead2: 'Cose vere.',
    looksBelow: 'look in basso',
    shopThisLook: 'Acquista questo look',
    closeLook: 'Chiudi',
    viewing: 'in visione',
    catalogTitle: 'La Selezione',
    catalogKicker: 'Catalogo completo',
    featuredLabel: 'In evidenza',
    shopPieces: 'Acquista i pezzi',
    items: 'articoli',
    quickView: 'Anteprima rapida',
    shopAt: 'Acquista da',
    allFilter: 'Tutti',
    priceNote: 'Immagini e prezzi caricati in tempo reale dalle pagine dei rivenditori.',
    stylistLabel: 'Stilista AI',
    stylistTitle: 'Chiedi allo Stilista',
    stylistSub: "Descrivi il tuo spazio, stile e budget. L'AI selezionerà una board dal nostro catalogo reale.",
    stylistPlaceholder: 'es. camera da letto scandinava accogliente, toni caldi, budget $800',
    stylistCta: 'Crea la mia board',
    stylistLoading: 'Selezione in corso…',
    stylistBoardFor: 'Board per',
    stylistTryAgain: "Prova un'altra descrizione",
  },
  ES: {
    masthead: 'Habitaciones reales.',
    masthead2: 'Cosas reales.',
    looksBelow: 'looks a continuación',
    shopThisLook: 'Comprar este look',
    closeLook: 'Cerrar',
    viewing: 'viendo',
    catalogTitle: 'La Selección',
    catalogKicker: 'Catálogo completo',
    featuredLabel: 'Destacado',
    shopPieces: 'Comprar piezas',
    items: 'artículos',
    quickView: 'Vista rápida',
    shopAt: 'Comprar en',
    allFilter: 'Todo',
    priceNote: 'Imágenes y precios cargados en tiempo real desde las páginas de los minoristas.',
    stylistLabel: 'Estilista AI',
    stylistTitle: 'Pregunta al Estilista',
    stylistSub: 'Describe tu espacio, estilo y presupuesto. La IA seleccionará una colección de nuestro catálogo real.',
    stylistPlaceholder: 'p.ej. dormitorio escandinavo acogedor, tonos cálidos, presupuesto $800',
    stylistCta: 'Seleccionar para mí',
    stylistLoading: 'Seleccionando…',
    stylistBoardFor: 'Selección para',
    stylistTryAgain: 'Intentar otra descripción',
  },
  TR: {
    masthead: 'Gerçek odalar.',
    masthead2: 'Gerçek şeyler.',
    looksBelow: 'look aşağıda',
    shopThisLook: 'Bu looku satın al',
    closeLook: 'Kapat',
    viewing: 'görüntüleniyor',
    catalogTitle: 'Seçki',
    catalogKicker: 'Tam katalog',
    featuredLabel: 'Öne çıkan',
    shopPieces: 'Parçaları satın al',
    items: 'ürün',
    quickView: 'Hızlı görünüm',
    shopAt: 'Satın al:',
    allFilter: 'Tümü',
    priceNote: 'Görseller ve fiyatlar perakendeci sayfalarından canlı olarak yüklenir.',
    stylistLabel: 'AI Stilist',
    stylistTitle: 'Stiliste Sor',
    stylistSub: 'Alanınızı, stilinizi ve bütçenizi açıklayın. AI, gerçek kataloğumuzdan seçkiler yapacak.',
    stylistPlaceholder: 'örn. sıcak tonlarda İskandinav yatak odası, bütçe $800',
    stylistCta: 'Benim için seç',
    stylistLoading: 'Seçiliyor…',
    stylistBoardFor: 'Seçki için',
    stylistTryAgain: 'Başka bir açıklama deneyin',
  },
};

// Look translations keyed by set ID
const looks: Record<number, Partial<Record<SupportedLang, LookI18n>>> = {
  1: {
    EN: { title: 'Living Room', subtitle: 'Soft seating, warm light, a rug that anchors it all', story: 'A sofa wide enough for Sunday mornings. Lamps that know when to dim themselves. The rug is the room — everything else just attends.' },
    UA: { title: 'Вітальня', subtitle: "М'яке сидіння, тепле світло, килим що тримає простір", story: 'Диван широкий для недільного ранку. Лампи, що знають, коли приглушитись. Килим — це і є кімната, решта лише відвідувачі.' },
    RU: { title: 'Гостиная', subtitle: 'Мягкие сиденья, тёплый свет, ковёр, который держит пространство', story: 'Диван широкий для воскресного утра. Лампы, знающие, когда стать мягче. Ковёр — это и есть комната, остальное лишь гости.' },
    DE: { title: 'Wohnzimmer', subtitle: 'Weiche Sitzgelegenheiten, warmes Licht, ein Teppich der alles hält', story: 'Ein Sofa breit genug für Sonntagmorgen. Lampen, die wissen, wann sie sich dimmen sollen. Der Teppich ist der Raum — alles andere ist nur Gast.' },
    IT: { title: 'Soggiorno', subtitle: 'Sedute morbide, luce calda, un tappeto che ancora tutto', story: 'Un divano abbastanza largo per le mattine di domenica. Lampade che sanno quando attenuarsi. Il tappeto è la stanza — tutto il resto è solo ospite.' },
    ES: { title: 'Sala de estar', subtitle: 'Asientos suaves, luz cálida, una alfombra que ancla todo', story: 'Un sofá lo suficientemente ancho para las mañanas de domingo. Lámparas que saben cuándo atenuarse. La alfombra es la habitación — todo lo demás es solo invitado.' },
    TR: { title: 'Oturma Odası', subtitle: 'Yumuşak koltuklar, sıcak ışık, her şeyi tutan bir halı', story: 'Pazar sabahları için yeterince geniş bir kanepe. Ne zaman kısılacaklarını bilen lambalar. Halı odanın kendisidir — geri kalan sadece misafir.' },
  },
  2: {
    EN: { title: 'Bedroom', subtitle: 'Calm palette, clean lines, restful light', story: 'White on white — but nothing is quite the same shade. Rest as a considered act. The mirror doubles the light; the lamp earns its place on the nightstand.' },
    UA: { title: 'Спальня', subtitle: 'Спокійна палітра, чисті лінії, м\'яке світло', story: 'Білий на білому — але жоден відтінок не однаковий. Відпочинок як свідомий акт. Дзеркало множить світло; лампа заслуговує своє місце на тумбочці.' },
    RU: { title: 'Спальня', subtitle: 'Спокойная палитра, чистые линии, мягкий свет', story: 'Белый на белом — но ни один оттенок не одинаков. Отдых как осознанный акт. Зеркало удваивает свет; лампа заслуживает своё место на тумбочке.' },
    DE: { title: 'Schlafzimmer', subtitle: 'Ruhige Palette, saubere Linien, erholsames Licht', story: 'Weiß auf Weiß — aber kein Ton ist ganz gleich. Ruhe als bewusster Akt. Der Spiegel verdoppelt das Licht; die Lampe verdient ihren Platz auf dem Nachttisch.' },
    IT: { title: 'Camera da letto', subtitle: 'Palette calma, linee pulite, luce riposante', story: 'Bianco su bianco — ma nessuna tonalità è uguale. Il riposo come atto consapevole. Lo specchio raddoppia la luce; la lampada guadagna il suo posto sul comodino.' },
    ES: { title: 'Dormitorio', subtitle: 'Paleta tranquila, líneas limpias, luz reparadora', story: 'Blanco sobre blanco — pero ningún tono es igual. El descanso como acto consciente. El espejo duplica la luz; la lámpara se gana su lugar en la mesita.' },
    TR: { title: 'Yatak Odası', subtitle: 'Sakin palet, temiz çizgiler, dinlendirici ışık', story: 'Beyaz üstüne beyaz — ama hiçbir ton aynı değil. Bilinçli bir eylem olarak dinlenme. Ayna ışığı iki katına çıkarır; lamba komodin üzerindeki yerini hak eder.' },
  },
  3: {
    EN: { title: 'Home Office', subtitle: 'Dark shelves, a wing chair, focused light', story: 'A room that takes work seriously without taking itself too seriously. The bookcase is a statement; the wing chair, a retreat. Morning light does the rest.' },
    UA: { title: 'Домашній офіс', subtitle: 'Темні полиці, крісло, зосереджене світло', story: 'Кімната, що сприймає роботу серйозно, але не себе. Книжкова шафа — це висловлювання; крісло — притулок. Ранкове світло зробить решту.' },
    RU: { title: 'Домашний офис', subtitle: 'Тёмные полки, кресло, сосредоточенный свет', story: 'Комната, которая относится к работе серьёзно, но не к себе. Книжный шкаф — высказывание; кресло — убежище. Утренний свет сделает остальное.' },
    DE: { title: 'Homeoffice', subtitle: 'Dunkle Regale, ein Ohrensessel, fokussiertes Licht', story: 'Ein Raum, der die Arbeit ernst nimmt, ohne sich selbst zu ernst zu nehmen. Das Bücherregal ist ein Statement; der Ohrensessel, ein Rückzugsort. Das Morgenlicht erledigt den Rest.' },
    IT: { title: 'Studio', subtitle: 'Scaffali scuri, una poltrona, luce focalizzata', story: 'Una stanza che prende sul serio il lavoro senza prendersi sul serio. La libreria è una dichiarazione; la poltrona, un rifugio. La luce mattutina fa il resto.' },
    ES: { title: 'Despacho', subtitle: 'Estanterías oscuras, una butaca, luz focalizada', story: 'Una habitación que se toma el trabajo en serio sin tomarse demasiado en serio. La librería es una declaración; la butaca, un refugio. La luz matutina hace el resto.' },
    TR: { title: 'Ev Ofisi', subtitle: 'Koyu raflar, bir koltuk, odaklanmış ışık', story: 'İşi ciddiye alan ama kendini fazla ciddiye almayan bir oda. Kitaplık bir ifade; kanat koltuk, bir sığınak. Sabah ışığı gerisini halleder.' },
  },
  4: {
    EN: { title: 'Dining Room', subtitle: 'A table worth gathering around', story: 'The best dining rooms are the ones nobody wants to leave. The table is the argument — every other choice follows from it. Set it well and the room sets itself.' },
    UA: { title: 'Їдальня', subtitle: 'Стіл, навколо якого хочеться зібратись', story: 'Найкращі їдальні — ті, звідки ніхто не хоче йти. Стіл — це аргумент, кожен інший вибір слідує за ним. Накрийте добре — і кімната накриється сама.' },
    RU: { title: 'Столовая', subtitle: 'Стол, вокруг которого хочется собраться', story: 'Лучшие столовые — те, из которых никто не хочет уходить. Стол — это аргумент, все остальные выборы следуют из него. Накройте хорошо — и комната накроется сама.' },
    DE: { title: 'Esszimmer', subtitle: 'Ein Tisch, um den es sich lohnt, sich zu versammeln', story: 'Die besten Esszimmer sind die, die niemand verlassen möchte. Der Tisch ist das Argument — jede andere Entscheidung folgt daraus. Richten Sie ihn gut ein und der Raum richtet sich selbst ein.' },
    IT: { title: 'Sala da pranzo', subtitle: 'Un tavolo intorno a cui vale la pena riunirsi', story: 'Le migliori sale da pranzo sono quelle da cui nessuno vuole andarsene. Il tavolo è l\'argomento — ogni altra scelta ne deriva. Apparecchiatelo bene e la stanza si apparecchierà da sola.' },
    ES: { title: 'Comedor', subtitle: 'Una mesa alrededor de la que vale la pena reunirse', story: 'Los mejores comedores son aquellos de los que nadie quiere irse. La mesa es el argumento — cada otra elección se deriva de ella. Ponla bien y la habitación se pondrá sola.' },
    TR: { title: 'Yemek Odası', subtitle: 'Etrafında toplanmaya değer bir masa', story: 'En iyi yemek odaları, kimsenin ayrılmak istemediği odalardır. Masa tartışmadır — diğer tüm seçimler ondan gelir. İyi kurun, oda kendini kurar.' },
  },
  5: {
    EN: { title: 'Hallway', subtitle: 'First impression. Mirror, light, intention.', story: 'The hallway is a room people forget to design. That is the mistake. A good mirror, one considered lamp, and the floor you actually want to walk on. The rest of the apartment follows.' },
    UA: { title: 'Передпокій', subtitle: 'Перше враження. Дзеркало, світло, намір.', story: 'Передпокій — кімната, яку люди забувають спроектувати. Це помилка. Гарне дзеркало, одна продумана лампа, і підлога, по якій справді хочеться йти. Решта квартири слідує.' },
    RU: { title: 'Прихожая', subtitle: 'Первое впечатление. Зеркало, свет, намерение.', story: 'Прихожая — комната, которую люди забывают проектировать. Это ошибка. Хорошее зеркало, одна продуманная лампа и пол, по которому действительно хочется идти. Остальная квартира следует.' },
    DE: { title: 'Flur', subtitle: 'Erster Eindruck. Spiegel, Licht, Absicht.', story: 'Der Flur ist ein Raum, den die Menschen vergessen zu gestalten. Das ist der Fehler. Ein guter Spiegel, eine durchdachte Lampe und der Boden, auf dem man wirklich gehen möchte. Der Rest der Wohnung folgt.' },
    IT: { title: 'Ingresso', subtitle: 'Prima impressione. Specchio, luce, intenzione.', story: "L'ingresso è una stanza che le persone dimenticano di progettare. Questo è l'errore. Un buon specchio, una lampada considerata e il pavimento su cui vuoi davvero camminare. Il resto dell'appartamento segue." },
    ES: { title: 'Recibidor', subtitle: 'Primera impresión. Espejo, luz, intención.', story: 'El recibidor es una habitación que la gente olvida diseñar. Ese es el error. Un buen espejo, una lámpara considerada y el suelo por el que realmente quieres caminar. El resto del apartamento sigue.' },
    TR: { title: 'Hol', subtitle: 'İlk izlenim. Ayna, ışık, niyet.', story: 'Hol, insanların tasarlamayı unuttuğu bir odadır. Bu hatadır. İyi bir ayna, düşünülmüş bir lamba ve gerçekten üzerinde yürümek istediğin zemin. Dairenin geri kalanı takip eder.' },
  },
  6: {
    EN: { title: 'Reading Corner', subtitle: 'One chair. One lamp. Everything you need.', story: 'Not a room — a decision. The chair that makes you stay longer than you planned. A lamp positioned exactly right. Books within reach. The rest of the apartment disappears.' },
    UA: { title: 'Куточок для читання', subtitle: 'Одне крісло. Одна лампа. Все необхідне.', story: 'Не кімната — рішення. Крісло, що змушує залишатись довше, ніж планував. Лампа розташована ідеально. Книги під рукою. Решта квартири зникає.' },
    RU: { title: 'Читальный уголок', subtitle: 'Одно кресло. Одна лампа. Всё необходимое.', story: 'Не комната — решение. Кресло, которое заставляет оставаться дольше, чем планировал. Лампа расположена идеально. Книги под рукой. Остальная квартира исчезает.' },
    DE: { title: 'Leseecke', subtitle: 'Ein Stuhl. Eine Lampe. Alles, was Sie brauchen.', story: 'Kein Raum — eine Entscheidung. Der Stuhl, der Sie länger bleiben lässt, als Sie geplant haben. Eine Lampe genau richtig positioniert. Bücher in Reichweite. Der Rest der Wohnung verschwindet.' },
    IT: { title: 'Angolo lettura', subtitle: 'Una sedia. Una lampada. Tutto ciò di cui hai bisogno.', story: 'Non una stanza — una decisione. La sedia che ti fa restare più a lungo di quanto pianificato. Una lampada posizionata esattamente nel modo giusto. Libri a portata di mano. Il resto dell\'appartamento scompare.' },
    ES: { title: 'Rincón de lectura', subtitle: 'Una silla. Una lámpara. Todo lo que necesitas.', story: 'No una habitación — una decisión. La silla que te hace quedarte más tiempo del planeado. Una lámpara colocada exactamente bien. Libros al alcance. El resto del apartamento desaparece.' },
    TR: { title: 'Okuma Köşesi', subtitle: 'Bir sandalye. Bir lamba. İhtiyacın olan her şey.', story: 'Bir oda değil — bir karar. Planladığından daha uzun kalmanı sağlayan sandalye. Tam doğru konumlandırılmış bir lamba. Kitaplar el altında. Dairenin geri kalanı kaybolur.' },
  },
  7: {
    EN: { title: 'Designer Mix', subtitle: 'HAY, Muuto, CB2, West Elm — in one room', story: 'A living room that refuses one brand allegiance. The HAY chair, the Muuto pendant, the CB2 lounge — each chosen on its own merits. The brands compete; the room wins.' },
    UA: { title: 'Дизайнерський мікс', subtitle: 'HAY, Muuto, CB2, West Elm — в одній кімнаті', story: 'Вітальня, що відмовляється від вірності одному бренду. Крісло HAY, підвіс Muuto, лаунж CB2 — кожен обраний за власними заслугами. Бренди змагаються; кімната перемагає.' },
    RU: { title: 'Дизайнерский микс', subtitle: 'HAY, Muuto, CB2, West Elm — в одной комнате', story: 'Гостиная, отказывающаяся от верности одному бренду. Кресло HAY, подвес Muuto, лаунж CB2 — каждый выбран по собственным заслугам. Бренды конкурируют; комната побеждает.' },
    DE: { title: 'Designer-Mix', subtitle: 'HAY, Muuto, CB2, West Elm — in einem Raum', story: 'Ein Wohnzimmer, das sich keiner Markentreue verpflichtet. Der HAY-Stuhl, der Muuto-Pendelleuchte, der CB2-Lounge — jedes nach eigenem Verdienst gewählt. Die Marken konkurrieren; der Raum gewinnt.' },
    IT: { title: 'Mix design', subtitle: 'HAY, Muuto, CB2, West Elm — in una stanza', story: 'Un soggiorno che rifiuta la fedeltà a un solo marchio. La sedia HAY, il pendente Muuto, il lounge CB2 — ognuno scelto per i propri meriti. I marchi competono; la stanza vince.' },
    ES: { title: 'Mix de diseño', subtitle: 'HAY, Muuto, CB2, West Elm — en una habitación', story: 'Una sala de estar que se niega a la lealtad de una marca. La silla HAY, el colgante Muuto, el lounge CB2 — cada uno elegido por sus propios méritos. Las marcas compiten; la habitación gana.' },
    TR: { title: 'Tasarım Karışımı', subtitle: 'HAY, Muuto, CB2, West Elm — tek odada', story: 'Tek bir markaya bağlılığı reddeden bir oturma odası. HAY sandalyesi, Muuto sarkıt, CB2 dinlenme alanı — her biri kendi değerine göre seçilmiş. Markalar rekabet eder; oda kazanır.' },
  },
  8: {
    EN: { title: 'Gallery Wall', subtitle: 'Art that changes how a room feels', story: 'The art arrives before the furniture. Once the wall speaks, the room follows. Neutral abstracts pull more light; dark moody pieces add weight. Choose by feeling, not by size chart.' },
    UA: { title: 'Галерейна стіна', subtitle: 'Мистецтво, що змінює відчуття кімнати', story: 'Мистецтво приходить до кімнати першим. Коли стіна говорить — кімната слухає. Нейтральні абстракції додають світла; темні монументальні роботи — ваги. Вибирайте серцем, а не таблицею розмірів.' },
    RU: { title: 'Галерейная стена', subtitle: 'Искусство, меняющее ощущение комнаты', story: 'Искусство приходит раньше мебели. Когда стена говорит — комната слушает. Нейтральные абстракции добавляют света; тёмные монументальные работы — веса. Выбирайте сердцем, а не таблицей размеров.' },
    DE: { title: 'Bilderwand', subtitle: 'Kunst, die das Gefühl eines Raumes verändert', story: 'Die Kunst kommt vor den Möbeln. Wenn die Wand spricht, folgt der Raum. Neutrale Abstraktionen ziehen mehr Licht; dunkle, stimmungsvolle Stücke fügen Gewicht hinzu. Wählen Sie nach Gefühl, nicht nach Größentabelle.' },
    IT: { title: 'Parete galleria', subtitle: 'Arte che cambia come si sente una stanza', story: "L'arte arriva prima dei mobili. Una volta che il muro parla, la stanza segue. Le astrazioni neutre attirano più luce; i pezzi cupi e malinconici aggiungono peso. Scegli per sensazione, non per tabella delle taglie." },
    ES: { title: 'Pared galería', subtitle: 'Arte que cambia cómo se siente una habitación', story: 'El arte llega antes que los muebles. Una vez que la pared habla, la habitación sigue. Las abstracciones neutras atraen más luz; las piezas oscuras y melancólicas añaden peso. Elige por sentimiento, no por tabla de tamaños.' },
    TR: { title: 'Galeri Duvarı', subtitle: 'Bir odanın hissini değiştiren sanat', story: 'Sanat mobilyadan önce gelir. Duvar konuşunca, oda takip eder. Nötr soyutlamalar daha fazla ışık çeker; karanlık ve kasvetli parçalar ağırlık katar. Boyut tablosuna değil, hisse göre seç.' },
  },
};

const FALLBACK: SupportedLang = 'EN';

export function getUI(lang: string): DesignUI {
  const L = (lang as SupportedLang) in ui ? (lang as SupportedLang) : FALLBACK;
  // Merge stylist v2 + catalogue search/sort strings (EN as per-key fallback).
  return { ...ui[L], ...STYLIST_EXT.EN, ...STYLIST_EXT[L], ...CATALOG_EXT.EN, ...CATALOG_EXT[L] };
}

export function getLook(id: number, lang: string): LookI18n {
  const map = looks[id];
  if (!map) return { title: '', subtitle: '', story: '' };
  return map[lang as SupportedLang] ?? map[FALLBACK] ?? { title: '', subtitle: '', story: '' };
}
