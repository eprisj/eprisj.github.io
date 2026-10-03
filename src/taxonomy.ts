/*
 * РУБРИКИ ПЕРЕВОДЯТСЯ СЛОВАРЁМ, А НЕ ОЧЕРЕДЬЮ (28.09.2026).
 *
 * Рубрика и подрубрика – это не текст статьи, а редакционная сетка: их
 * два десятка на весь журнал, и в каждом языке у каждой должно быть одно
 * имя. Очередь переводила их заново в каждой статье, и сетка разъехалась:
 * "Feature" стало «Особенность» / «Özellik» / «Caratteristica» (то есть
 * «характеристика»), "Travel" – «Путешествовать», в украинском нашлась
 * рубрика «ст», а у трети статей рубрика так и осталась английской.
 *
 * Поэтому рубрика берётся по АНГЛИЙСКОМУ оригиналу записи: если он есть в
 * словаре, читатель видит словарное имя, что бы ни лежало в переводе.
 * Незнакомая рубрика показывается как раньше – из перевода.
 */
type Lang = 'RU' | 'UA' | 'DE' | 'ES' | 'TR' | 'IT' | 'FR';
type Labels = Record<Lang, string>;

const L = (RU: string, UA: string, DE: string, ES: string, TR: string, IT: string, FR: string): Labels =>
  ({ RU, UA, DE, ES, TR, IT, FR });

const TAXONOMY: Record<string, Labels> = {
  'architecture': L('Архитектура', 'Архітектура', 'Architektur', 'Arquitectura', 'Mimarlık', 'Architettura', 'Architecture'),
  'architecture & dining': L('Архитектура и рестораны', 'Архітектура й ресторани', 'Architektur & Gastronomie', 'Arquitectura y gastronomía', 'Mimarlık ve gastronomi', 'Architettura e gastronomia', 'Architecture & gastronomie'),
  'art': L('Искусство', 'Мистецтво', 'Kunst', 'Arte', 'Sanat', 'Arte', 'Art'),
  'article': L('Статья', 'Стаття', 'Artikel', 'Artículo', 'Makale', 'Articolo', 'Article'),
  'announcement': L('Анонс', 'Анонс', 'Ankündigung', 'Anuncio', 'Duyuru', 'Annuncio', 'Annonce'),
  'contemporary art': L('Современное искусство', 'Сучасне мистецтво', 'Zeitgenössische Kunst', 'Arte contemporáneo', 'Çağdaş sanat', 'Arte contemporanea', 'Art contemporain'),
  'critical essay': L('Критическое эссе', 'Критичне есе', 'Kritischer Essay', 'Ensayo crítico', 'Eleştirel deneme', 'Saggio critico', 'Essai critique'),
  'culture': L('Культура', 'Культура', 'Kultur', 'Cultura', 'Kültür', 'Cultura', 'Culture'),
  'culture notes': L('Заметки о культуре', 'Нотатки про культуру', 'Kulturnotizen', 'Notas culturales', 'Kültür notları', 'Note di cultura', 'Notes culturelles'),
  'design': L('Дизайн', 'Дизайн', 'Design', 'Diseño', 'Tasarım', 'Design', 'Design'),
  'design study': L('Исследование дизайна', 'Дослідження дизайну', 'Designstudie', 'Estudio de diseño', 'Tasarım incelemesi', 'Studio di design', 'Étude de design'),
  'essay': L('Эссе', 'Есе', 'Essay', 'Ensayo', 'Deneme', 'Saggio', 'Essai'),
  'exhibition': L('Выставка', 'Виставка', 'Ausstellung', 'Exposición', 'Sergi', 'Mostra', 'Exposition'),
  'feature': L('Материал', 'Матеріал', 'Beitrag', 'Reportaje', 'Makale', 'Servizio', 'Article'),
  'food': L('Еда', 'Їжа', 'Essen', 'Gastronomía', 'Yemek', 'Cucina', 'Cuisine'),
  'from the editors': L('От редакции', 'Від редакції', 'Von der Redaktion', 'De la redacción', 'Editörden', 'Dalla redazione', 'De la rédaction'),
  'interview': L('Интервью', 'Інтерв’ю', 'Interview', 'Entrevista', 'Söyleşi', 'Intervista', 'Entretien'),
  'photography': L('Фотография', 'Фотографія', 'Fotografie', 'Fotografía', 'Fotoğraf', 'Fotografia', 'Photographie'),
  'reportage': L('Репортаж', 'Репортаж', 'Reportage', 'Reportaje', 'Röportaj', 'Reportage', 'Reportage'),
  'sculpture & landscape': L('Скульптура и ландшафт', 'Скульптура й ландшафт', 'Skulptur & Landschaft', 'Escultura y paisaje', 'Heykel ve peyzaj', 'Scultura e paesaggio', 'Sculpture & paysage'),
  'special feature': L('Спецпроект', 'Спецпроєкт', 'Sonderbeitrag', 'Especial', 'Özel dosya', 'Speciale', 'Dossier spécial'),
  'studio profile': L('Портрет студии', 'Портрет студії', 'Studioporträt', 'Perfil de estudio', 'Stüdyo portresi', 'Profilo di studio', 'Portrait d’agence'),
  'the long read': L('Лонгрид', 'Лонгрід', 'Longread', 'Lectura larga', 'Uzun okuma', 'Lettura lunga', 'Grand format'),
  'travel': L('Путешествия', 'Подорожі', 'Reisen', 'Viajes', 'Seyahat', 'Viaggi', 'Voyage'),
  'visual story': L('Визуальная история', 'Візуальна історія', 'Bildstrecke', 'Historia visual', 'Görsel hikâye', 'Racconto visivo', 'Récit visuel'),
};

/** Editorial name of a rubric in `lang`, looked up by the entry's English rubric; null when unknown. */
export function taxonomyLabel(english: string | undefined, lang: string): string | null {
  if (!english) return null;
  const labels = TAXONOMY[english.trim().toLowerCase()];
  return (labels && labels[lang as Lang]) || null;
}

/**
 * Overlay the dictionary rubric on localized entries. `base` is the English
 * collection the entries were merged from; entries whose English rubric is not
 * in the dictionary keep what the translation says.
 */
export function withLocalizedTaxonomy<T extends { id: number; category?: string; subcategory?: string }>(
  entries: T[], base: T[], lang: string,
): T[] {
  const byId = new Map(base.map((e) => [Number(e.id), e]));
  return entries.map((entry) => {
    const src = byId.get(Number(entry.id));
    if (!src) return entry;
    const category = taxonomyLabel(src.category, lang);
    const subcategory = taxonomyLabel(src.subcategory, lang);
    if (!category && !subcategory) return entry;
    return {
      ...entry,
      ...(category ? { category } : {}),
      ...(subcategory ? { subcategory } : {}),
    };
  });
}
