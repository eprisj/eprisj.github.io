export interface PassportStampSheetDefinition {
  key: string;
  title: string;
  subtitle: string;
  pageNumbers: [string, string];
  editionMark: string;
  accent: 'teal' | 'gold' | 'rose';
}

export type PassportStampKind = 'visit' | 'interview' | 'collaboration' | 'event' | 'verified';
export type PassportStampInk = 'burgundy' | 'teal' | 'gold' | 'navy';

/** One editorial mark occupies one numbered page in the member booklet. */
export interface PassportStamp {
  id: string;
  page: string;
  kind: PassportStampKind;
  title: string;
  place: string;
  date: string;
  note: string;
  ink: PassportStampInk;
}

/**
 * Blank editorial spreads reserved for future EPRIS stamps. Each sheet holds
 * two numbered booklet pages and is deliberately content-free at launch.
 */
export const PASSPORT_STAMP_SHEETS: PassportStampSheetDefinition[] = [
  {
    key: 'voyages',
    title: 'Editorial Voyages',
    subtitle: 'Visits · Fairs · Residencies',
    pageNumbers: ['02', '03'],
    editionMark: 'A',
    accent: 'teal',
  },
  {
    key: 'studios',
    title: 'Studio Encounters',
    subtitle: 'Architecture · Design · Art',
    pageNumbers: ['04', '05'],
    editionMark: 'B',
    accent: 'gold',
  },
  {
    key: 'conversations',
    title: 'Conversations',
    subtitle: 'Interviews · Notes · Collaborations',
    pageNumbers: ['06', '07'],
    editionMark: 'C',
    accent: 'rose',
  },
];

export const PASSPORT_STAMP_PAGES = PASSPORT_STAMP_SHEETS.flatMap((sheet) => sheet.pageNumbers);
