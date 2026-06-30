import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer';
import type { Article, ContentBlock, Issue } from '../data';

type T = (key: string) => string;

// ── Fonts ──────────────────────────────────────────────────
// The 14 built-in PDF fonts (Times/Helvetica) only cover Latin-1, so Cyrillic
// (RU/UA) and some Turkish glyphs render as garbage. We embed PT Serif/PT Sans
// (ParaType, OFL) which cover Latin + Latin-Ext + Cyrillic, fetched from the
// site's own /fonts/ directory at PDF-generation time.
let _fontsRegistered = false;
function registerFonts(baseUrl: string) {
  if (_fontsRegistered) return;
  _fontsRegistered = true;
  const f = (file: string) => `${baseUrl}/fonts/${file}`;
  Font.register({ family: 'PTSerif', src: f('PTSerif-Regular.ttf') });
  Font.register({ family: 'PTSerifItalic', src: f('PTSerif-Italic.ttf') });
  Font.register({ family: 'PTSerifBold', src: f('PTSerif-Bold.ttf') });
  Font.register({ family: 'PTSans', src: f('PTSans-Regular.ttf') });
  Font.register({ family: 'PTSansBold', src: f('PTSans-Bold.ttf') });
  // Avoid hyphenated word-breaks (cleaner justified columns).
  Font.registerHyphenationCallback((word) => [word]);
}

// ── Constants ──────────────────────────────────────────────
const COVER_BASE =
  'https://raw.githubusercontent.com/eprisj/eprisj.github.io/main/%D1%81over';

const ARTICLE_COVERS: Record<number, string> = {
  8: `${COVER_BASE}/cover_hover.jpg`,
  9: `${COVER_BASE}/cover_treshold.jpg`,
};

// A4 in points
const W = 595;
const H = 842;
const ML = 54;
const MR = 54;
const MT = 46;
const MB = 56;
const CW = W - ML - MR; // content width

const c = {
  burgundy: '#501a2c',
  cream:    '#F5F0EB',
  sand:     '#C9A690',
  dark:     '#160a10',
  dim:      '#9a7080',
  lightSand:'#ECE3D9',
};

// ── Helpers ────────────────────────────────────────────────
function resolveUrl(path: string, baseUrl: string): string {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  if (path.startsWith('/')) return `${baseUrl}${path}`;
  return path;
}

function articleCoverUrl(article: Article, baseUrl: string): string | null {
  if (ARTICLE_COVERS[article.id]) return ARTICLE_COVERS[article.id];
  if (article.imageUrl) return resolveUrl(article.imageUrl, baseUrl);
  return null;
}

// ── Styles ─────────────────────────────────────────────────
const s = StyleSheet.create({
  // Covers (image pages) — explicit image height leaves room for the band so
  // the whole cover stays on exactly one page (no spill onto a 2nd page).
  coverPage: { backgroundColor: c.burgundy },
  coverImage: { width: W, height: 790, objectFit: 'cover' },
  coverBand: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ML,
    backgroundColor: c.burgundy,
  },
  coverBandLabel: { fontFamily: 'PTSans', fontSize: 7, color: c.sand, letterSpacing: 4, maxWidth: 300 },
  coverBandIssue: { fontFamily: 'PTSerifItalic', fontSize: 9, color: c.cream, letterSpacing: 1 },

  // Typographic cover fallback (no image → never dark-empty)
  typoCoverPage: {
    backgroundColor: c.cream,
    paddingTop: MT + 120,
    paddingBottom: MB,
    paddingLeft: ML, paddingRight: MR,
  },
  typoCoverCategory: { fontFamily: 'PTSans', fontSize: 8, color: c.sand, letterSpacing: 5, marginBottom: 24 },
  typoCoverTitle: { fontFamily: 'PTSerif', fontSize: 46, color: c.burgundy, lineHeight: 1.1 },

  // Letter page
  letterPage: {
    backgroundColor: c.cream,
    paddingTop: MT + 44,
    paddingBottom: MB + 14,
    paddingLeft: ML + 22,
    paddingRight: MR + 22,
  },
  letterKicker: { fontFamily: 'PTSans', fontSize: 7, color: c.sand, letterSpacing: 5, marginBottom: 22 },
  letterHeading: { fontFamily: 'PTSerifItalic', fontSize: 27, color: c.burgundy, lineHeight: 1.3, marginBottom: 22 },
  letterRule: { borderBottomWidth: 0.5, borderBottomColor: c.sand, marginBottom: 22, width: 60 },
  letterBody: { fontFamily: 'PTSerif', fontSize: 11, color: c.burgundy, lineHeight: 1.85, marginBottom: 14, textAlign: 'justify' },
  letterSignature: { fontFamily: 'PTSerifItalic', fontSize: 13, color: c.burgundy, marginTop: 26, marginBottom: 4 },
  letterRole: { fontFamily: 'PTSans', fontSize: 7, color: c.dim, letterSpacing: 2 },
  letterMark: { position: 'absolute', bottom: MB, right: MR, fontFamily: 'PTSerifItalic', fontSize: 9, color: c.sand, letterSpacing: 3 },

  // Contents
  tocPage: { backgroundColor: c.cream, paddingTop: MT + 50, paddingBottom: MB, paddingLeft: ML, paddingRight: MR },
  tocLabel: { fontFamily: 'PTSans', fontSize: 7, color: c.sand, letterSpacing: 5, marginBottom: 22 },
  tocTitle: { fontFamily: 'PTSerif', fontSize: 40, color: c.burgundy, marginBottom: 32 },
  tocRule: { borderBottomWidth: 0.5, borderBottomColor: c.burgundy, opacity: 0.2, marginBottom: 26 },
  tocRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24 },
  tocThumb: { width: 54, height: 72, marginRight: 18, objectFit: 'cover', backgroundColor: c.lightSand },
  tocThumbEmpty: { width: 54, height: 72, marginRight: 18, backgroundColor: c.lightSand },
  tocIndex: { fontFamily: 'PTSans', fontSize: 9, color: c.sand, letterSpacing: 2, marginBottom: 4 },
  tocCategory: { fontFamily: 'PTSans', fontSize: 7, color: c.dim, letterSpacing: 2.5, marginBottom: 4 },
  tocArticleTitle: { fontFamily: 'PTSerif', fontSize: 16, color: c.burgundy, lineHeight: 1.2, marginBottom: 5 },
  tocExcerpt: { fontFamily: 'PTSerifItalic', fontSize: 9.5, color: c.dim, lineHeight: 1.5 },
  tocMark: { position: 'absolute', bottom: MB, left: ML, fontFamily: 'PTSerifItalic', fontSize: 9, color: c.sand, letterSpacing: 3 },

  // Content page
  contentPage: { backgroundColor: c.cream, paddingTop: MT, paddingBottom: MB, paddingLeft: ML, paddingRight: MR },
  runningHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingBottom: 5, borderBottomWidth: 0.4, borderBottomColor: c.burgundy, marginBottom: 18, opacity: 0.5,
  },
  runningHeaderText: { fontFamily: 'PTSans', fontSize: 6.5, color: c.burgundy, letterSpacing: 2 },
  pageNumView: { position: 'absolute', bottom: 22, left: ML, right: MR },
  pageNum: { fontFamily: 'PTSans', fontSize: 7, color: c.dim, letterSpacing: 2, textAlign: 'center' },

  // Article masthead (on first content page)
  masthead: { marginBottom: 18 },
  mastheadCategory: { fontFamily: 'PTSans', fontSize: 7.5, color: c.sand, letterSpacing: 4, marginBottom: 12 },
  mastheadTitle: { fontFamily: 'PTSerif', fontSize: 34, color: c.burgundy, lineHeight: 1.12, marginBottom: 14 },
  mastheadRule: { borderBottomWidth: 0.5, borderBottomColor: c.sand, marginBottom: 14, width: 70 },
  mastheadExcerpt: { fontFamily: 'PTSerifItalic', fontSize: 12, color: c.burgundy, lineHeight: 1.6, marginBottom: 14 },
  mastheadMeta: { fontFamily: 'PTSans', fontSize: 7, color: c.dim, letterSpacing: 2 },

  // Drop cap
  dropCapRow: { flexDirection: 'row', marginBottom: 9 },
  dropCapLetter: { fontFamily: 'PTSerif', fontSize: 44, color: c.burgundy, lineHeight: 1, marginRight: 5, marginTop: 1 },
  dropCapRest: { fontFamily: 'PTSerif', fontSize: 11, color: c.burgundy, lineHeight: 1.8, flex: 1, textAlign: 'justify' },

  para: { fontFamily: 'PTSerif', fontSize: 11, color: c.burgundy, lineHeight: 1.82, marginBottom: 9, textAlign: 'justify' },

  quoteView: { marginVertical: 22, paddingVertical: 16, borderTopWidth: 1.5, borderTopColor: c.sand, borderBottomWidth: 1.5, borderBottomColor: c.sand },
  quoteMark: { fontFamily: 'PTSerif', fontSize: 44, color: c.sand, lineHeight: 0.7, marginBottom: 4 },
  quoteText: { fontFamily: 'PTSerifItalic', fontSize: 16, color: c.burgundy, lineHeight: 1.55, textAlign: 'center' },
  quoteSource: { fontFamily: 'PTSans', fontSize: 7.5, color: c.dim, letterSpacing: 2, textAlign: 'center', marginTop: 10 },

  noteView: { marginVertical: 12, paddingVertical: 10, paddingLeft: 14, paddingRight: 10, borderLeftWidth: 2, borderLeftColor: c.sand, backgroundColor: c.lightSand },
  noteLabel: { fontFamily: 'PTSans', fontSize: 6.5, color: c.sand, letterSpacing: 3, marginBottom: 5 },
  noteText: { fontFamily: 'PTSerifItalic', fontSize: 10, color: c.burgundy, lineHeight: 1.65 },

  subheading: { fontFamily: 'PTSansBold', fontSize: 8.5, color: c.burgundy, letterSpacing: 3, marginTop: 22, marginBottom: 8 },

  inlineImageView: { marginTop: 18, marginBottom: 10 },
  inlineImage: { width: CW, objectFit: 'cover' },
  caption: { fontFamily: 'PTSans', fontSize: 7.5, color: c.dim, letterSpacing: 1.2, marginTop: 5, marginBottom: 8, textAlign: 'center' },

  galleryView: { marginVertical: 16 },
  galleryLabel: { fontFamily: 'PTSans', fontSize: 6.5, color: c.sand, letterSpacing: 3, marginBottom: 10 },
  galleryRow: { flexDirection: 'row', marginBottom: 4 },

  checklistView: { marginVertical: 14, borderWidth: 0.5, borderColor: c.sand, paddingVertical: 14, paddingHorizontal: 16 },
  checklistLabel: { fontFamily: 'PTSans', fontSize: 6.5, color: c.sand, letterSpacing: 3, marginBottom: 12 },
  checklistItem: { flexDirection: 'row', marginBottom: 7 },
  checklistBullet: { fontFamily: 'PTSans', fontSize: 9, color: c.sand, width: 18, marginTop: 1 },
  checklistText: { fontFamily: 'PTSerif', fontSize: 10, color: c.burgundy, flex: 1, lineHeight: 1.55 },

  pollView: { marginVertical: 14, backgroundColor: c.lightSand, paddingVertical: 16, paddingHorizontal: 16 },
  pollLabel: { fontFamily: 'PTSans', fontSize: 6.5, color: c.dim, letterSpacing: 3, marginBottom: 10 },
  pollQuestion: { fontFamily: 'PTSerifItalic', fontSize: 12, color: c.burgundy, lineHeight: 1.45, marginBottom: 16 },
  pollOptionRow: { marginBottom: 10 },
  pollBarBg: { height: 3, backgroundColor: c.cream },
  pollBarFill: { height: 3, backgroundColor: c.burgundy },

  linkView: { marginVertical: 12, flexDirection: 'row', alignItems: 'center', borderTopWidth: 0.4, borderBottomWidth: 0.4, borderColor: c.sand, paddingVertical: 8 },
  linkArrow: { fontFamily: 'PTSerif', fontSize: 10, color: c.sand, marginRight: 8 },
  linkText: { fontFamily: 'PTSans', fontSize: 8.5, color: c.burgundy, flex: 1, lineHeight: 1.4 },

  mapView: { marginVertical: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: c.lightSand },
  mapPin: { fontFamily: 'PTSerif', fontSize: 10, color: c.sand, marginRight: 8 },
  mapText: { fontFamily: 'PTSans', fontSize: 8.5, color: c.burgundy, flex: 1 },

  // Colophon
  colophonPage: { backgroundColor: c.dark, paddingTop: MT, paddingBottom: MB, paddingLeft: ML, paddingRight: MR, justifyContent: 'space-between' },
  colophonLogo: { fontFamily: 'PTSerifItalic', fontSize: 56, color: c.cream, letterSpacing: 8, lineHeight: 1, marginBottom: 8 },
  colophonTagline: { fontFamily: 'PTSans', fontSize: 8, color: c.sand, letterSpacing: 5 },
  colophonRule: { borderBottomWidth: 0.5, borderBottomColor: c.sand, opacity: 0.4, marginBottom: 20 },
  colophonIssue: { fontFamily: 'PTSerif', fontSize: 13, color: c.cream, opacity: 0.7, letterSpacing: 1, marginBottom: 10 },
  colophonMeta: { fontFamily: 'PTSans', fontSize: 7.5, color: c.cream, opacity: 0.5, letterSpacing: 1.5, marginBottom: 6 },
  colophonUrl: { fontFamily: 'PTSans', fontSize: 8, color: c.sand, letterSpacing: 2, marginTop: 14 },
});

// ── Block sub-renderers ────────────────────────────────────
function GalleryBlock({ urls, baseUrl, label }: { urls: string[]; baseUrl: string; label: string }) {
  const imgs = urls.slice(0, 6);
  const cols = 3;
  const gap = 4;
  const imgW = (CW - gap * (cols - 1)) / cols;
  const rows: string[][] = [];
  for (let i = 0; i < imgs.length; i += cols) rows.push(imgs.slice(i, i + cols));
  return (
    <View style={s.galleryView} wrap={false}>
      <Text style={s.galleryLabel}>{label.toUpperCase()}</Text>
      {rows.map((row, ri) => (
        <View key={ri} style={s.galleryRow}>
          {row.map((url, ci) => (
            <Image
              key={ci}
              src={resolveUrl(url, baseUrl)}
              style={{ width: imgW, height: imgW, objectFit: 'cover', marginRight: ci < row.length - 1 ? gap : 0 }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function ChecklistBlock({ items, label }: { items: string[]; label: string }) {
  return (
    <View style={s.checklistView} wrap={false}>
      <Text style={s.checklistLabel}>{label.toUpperCase()}</Text>
      {items.map((item, i) => (
        <View key={i} style={s.checklistItem}>
          <Text style={s.checklistBullet}>{String(i + 1).padStart(2, '0')}</Text>
          <Text style={s.checklistText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function PollBlock({
  poll, label, totalLabel,
}: {
  poll: { question: string; options: { label: string; votes: number }[] };
  label: string;
  totalLabel: string;
}) {
  const innerW = CW - 32;
  const total = poll.options.reduce((sum, o) => sum + (o.votes || 0), 0) || 1;
  return (
    <View style={s.pollView} wrap={false}>
      <Text style={s.pollLabel}>{label.toUpperCase()}</Text>
      <Text style={s.pollQuestion}>{poll.question}</Text>
      {poll.options.slice(0, 7).map((opt, i) => {
        const pct = Math.round((opt.votes / total) * 100);
        return (
          <View key={i} style={s.pollOptionRow}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
              <Text style={{ fontFamily: 'PTSans', fontSize: 8.5, color: c.burgundy }}>{opt.label}</Text>
              <Text style={{ fontFamily: 'PTSans', fontSize: 7, color: c.dim }}>{pct}%</Text>
            </View>
            <View style={s.pollBarBg}>
              <View style={{ ...s.pollBarFill, width: Math.max(2, Math.round((innerW * pct) / 100)) }} />
            </View>
          </View>
        );
      })}
      <Text style={{ fontFamily: 'PTSans', fontSize: 7, color: c.dim, marginTop: 8, letterSpacing: 1 }}>
        {total} {totalLabel}
      </Text>
    </View>
  );
}

// ── Pages ──────────────────────────────────────────────────
function CoverPage({ issue }: { issue: Issue }) {
  return (
    <Page size="A4" style={s.coverPage}>
      <Image src={issue.coverUrl} style={s.coverImage} />
      <View style={s.coverBand}>
        <Text style={{ fontFamily: 'PTSerifItalic', fontSize: 22, color: c.cream, letterSpacing: 3 }}>EPRIS</Text>
        <Text style={s.coverBandIssue}>{issue.name} · {issue.season}</Text>
      </View>
    </Page>
  );
}

function LetterPage({ issue, t }: { issue: Issue; t: T }) {
  const heading = (issue.letterHeading || '').trim() || t('issue.letter.heading');
  const body = (issue.letterBody || '').trim() || t('issue.letter.body');
  const paragraphs = body.split('\n\n');
  return (
    <Page size="A4" style={s.letterPage}>
      <Text style={s.letterKicker}>{t('pdf.letter.kicker').toUpperCase()}</Text>
      <Text style={s.letterHeading}>{heading}</Text>
      <View style={s.letterRule} />
      {paragraphs.map((p, i) => (
        <Text key={i} style={s.letterBody}>{p}</Text>
      ))}
      <Text style={s.letterSignature}>Mariia Ivanova</Text>
      <Text style={s.letterRole}>{t('issue.letter.role').toUpperCase()}</Text>
      <Text style={s.letterMark}>EPRIS</Text>
    </Page>
  );
}

function ContentsPage({ issue, articles, baseUrl, t }: { issue: Issue; articles: Article[]; baseUrl: string; t: T }) {
  return (
    <Page size="A4" style={s.tocPage}>
      <Text style={s.tocLabel}>{issue.name.toUpperCase()}  ·  {issue.season.toUpperCase()}</Text>
      <Text style={s.tocTitle}>{t('pdf.contents')}</Text>
      <View style={s.tocRule} />
      {articles.map((article, i) => {
        const thumb = articleCoverUrl(article, baseUrl);
        return (
          <View key={article.id} style={s.tocRow} wrap={false}>
            {thumb ? <Image src={thumb} style={s.tocThumb} /> : <View style={s.tocThumbEmpty} />}
            <View style={{ flex: 1, paddingTop: 4 }}>
              <Text style={s.tocIndex}>{String(i + 1).padStart(2, '0')}</Text>
              {article.category ? <Text style={s.tocCategory}>{article.category.toUpperCase()}</Text> : null}
              <Text style={s.tocArticleTitle}>{article.title}</Text>
              {article.excerpt ? (
                <Text style={s.tocExcerpt}>
                  {article.excerpt.length > 120 ? `${article.excerpt.slice(0, 120)}…` : article.excerpt}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
      <Text style={s.tocMark}>EPRIS JOURNAL</Text>
    </Page>
  );
}

function ArticleCoverPage({ issue, article, baseUrl }: { issue: Issue; article: Article; baseUrl: string }) {
  const cover = articleCoverUrl(article, baseUrl);
  // No image → typographic cover (never a dark-empty page)
  if (!cover) {
    return (
      <Page size="A4" style={s.typoCoverPage}>
        {article.category ? <Text style={s.typoCoverCategory}>{article.category.toUpperCase()}</Text> : null}
        <Text style={s.typoCoverTitle}>{article.title}</Text>
      </Page>
    );
  }
  // Band carries category + title so even a failed image degrades to a clear
  // branded divider, never a mystery page.
  return (
    <Page size="A4" style={s.coverPage}>
      <Image src={cover} style={s.coverImage} />
      <View style={s.coverBand}>
        <Text style={s.coverBandLabel}>
          {(article.category ? `${article.category.toUpperCase()}  ·  ` : '') + article.title}
        </Text>
        <Text style={s.coverBandIssue}>{issue.name}</Text>
      </View>
    </Page>
  );
}

function ArticleContentPage({
  issue, article, baseUrl, t,
}: {
  issue: Issue; article: Article; baseUrl: string; t: T;
}) {
  const blocks = article.content ?? [];

  // The article's dramatic cover page already provides the opening image, so the
  // content page opens straight into the masthead + body — no repeated hero.
  let firstText = true;

    // react-pdf can't render HTML — flatten any inline markup to plain text.
    const plain = (html: string) => String(html || '').replace(/<br\s*\/?>(?=)/gi, ' ').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');

  const renderBlock = (block: ContentBlock, key: number) => {
    if (block.type === 'text' && typeof block.content === 'string') {
      if (firstText) {
        firstText = false;
        const text = plain(block.content);
        return (
          <View key={key} style={s.dropCapRow}>
            <Text style={s.dropCapLetter}>{text.charAt(0)}</Text>
            <Text style={s.dropCapRest}>{text.slice(1)}</Text>
          </View>
        );
      }
      return <Text key={key} style={s.para}>{plain(block.content)}</Text>;
    }

    if (block.type === 'header' && typeof block.content === 'string') {
      return <Text key={key} style={s.subheading}>{plain(block.content)}</Text>;
    }

    if (block.type === 'quote' && typeof block.content === 'string') {
      return (
        <View key={key} style={s.quoteView} wrap={false}>
          <Text style={s.quoteMark}>“</Text>
          <Text style={s.quoteText}>{plain(block.content)}</Text>
          {block.caption ? <Text style={s.quoteSource}>{block.caption.toUpperCase()}</Text> : null}
        </View>
      );
    }

    if (block.type === 'note' && typeof block.content === 'string') {
      return (
        <View key={key} style={s.noteView} wrap={false}>
          <Text style={s.noteLabel}>{t('pdf.note').toUpperCase()}</Text>
          <Text style={s.noteText}>{block.content}</Text>
        </View>
      );
    }

    if (block.type === 'image' && typeof block.content === 'string') {
      const url = resolveUrl(block.content, baseUrl);
      if (!url) return null;
      return (
        <View key={key} style={s.inlineImageView} wrap={false}>
          <Image src={url} style={{ width: CW, height: Math.round(CW * (2 / 3)), objectFit: 'cover' }} />
          {block.caption ? <Text style={s.caption}>{block.caption}</Text> : null}
        </View>
      );
    }

    if (block.type === 'gallery' && Array.isArray(block.content)) {
      return <GalleryBlock key={key} urls={block.content as string[]} baseUrl={baseUrl} label={t('pdf.gallery')} />;
    }

    if (block.type === 'checklist') {
      const raw = block.content as { items?: string[] } | string;
      const items = typeof raw === 'object' && !Array.isArray(raw) && Array.isArray(raw.items) ? raw.items : [];
      if (!items.length) return null;
      return <ChecklistBlock key={key} items={items} label={t('pdf.protocol')} />;
    }

    if (block.type === 'poll') {
      const raw = block.content as { question?: string; options?: { label: string; votes: number }[] } | string;
      if (typeof raw === 'object' && !Array.isArray(raw) && raw.question && Array.isArray(raw.options)) {
        return (
          <PollBlock
            key={key}
            poll={raw as { question: string; options: { label: string; votes: number }[] }}
            label={t('pdf.vote')}
            totalLabel={t('pdf.votesTotal')}
          />
        );
      }
      return null;
    }

    if (block.type === 'link' && typeof block.content === 'string') {
      return (
        <View key={key} style={s.linkView} wrap={false}>
          <Text style={s.linkArrow}>→</Text>
          <Text style={s.linkText}>{block.content}</Text>
        </View>
      );
    }

    if (block.type === 'map' && typeof block.content === 'string') {
      return (
        <View key={key} style={s.mapView} wrap={false}>
          <Text style={s.mapPin}>◉</Text>
          <Text style={s.mapText}>{block.content}</Text>
        </View>
      );
    }

    return null;
  };

  return (
    <Page size="A4" style={s.contentPage} wrap>
      {/* Running header — repeats on every wrapped page */}
      <View style={s.runningHeader} fixed>
        <Text style={s.runningHeaderText}>EPRIS JOURNAL  ·  {issue.name.toUpperCase()}</Text>
        <Text style={s.runningHeaderText}>{article.title.toUpperCase()}</Text>
      </View>

      {/* Masthead — appears once at the start of the article */}
      <View style={s.masthead}>
        {article.category ? <Text style={s.mastheadCategory}>{article.category.toUpperCase()}</Text> : null}
        <Text style={s.mastheadTitle}>{article.title}</Text>
        <View style={s.mastheadRule} />
        {article.excerpt ? <Text style={s.mastheadExcerpt}>{article.excerpt}</Text> : null}
        <Text style={s.mastheadMeta}>{article.author.toUpperCase()}   ·   {article.date}</Text>
      </View>

      {/* Content blocks */}
      {blocks.map((block, i) => renderBlock(block, i))}

      {/* Page number */}
      <View style={s.pageNumView} fixed>
        <Text style={s.pageNum} render={({ pageNumber }: { pageNumber: number }) => String(pageNumber)} />
      </View>
    </Page>
  );
}

function ColophonPage({ issue, t }: { issue: Issue; t: T }) {
  return (
    <Page size="A4" style={s.colophonPage}>
      <View>
        <Text style={s.colophonLogo}>EPRIS</Text>
        <Text style={s.colophonTagline}>JOURNAL</Text>
      </View>
      <View>
        <View style={s.colophonRule} />
        <Text style={s.colophonIssue}>{issue.name}{issue.number ? `  ·  ${issue.number}` : ''}  ·  {issue.season}</Text>
        <Text style={s.colophonMeta}>{t('pdf.credits.editor')}  ·  Mariia Ivanova</Text>
        <Text style={s.colophonMeta}>{t('pdf.credits.design')}  ·  EPRIS Studio</Text>
        <Text style={s.colophonMeta}>{t('pdf.credits.printed')}</Text>
        <Text style={{ ...s.colophonMeta, marginTop: 14 }}>© 2026 EPRIS Journal. {t('pdf.rights')}</Text>
        <Text style={s.colophonUrl}>eprisjournal.com</Text>
      </View>
    </Page>
  );
}

// ── Document ───────────────────────────────────────────────
export function MagazinePDF({
  issue,
  articles,
  baseUrl,
  t,
}: {
  issue: Issue;
  articles: Article[];
  baseUrl: string;
  t: T;
}) {
  registerFonts(baseUrl);
  return (
    <Document
      title={`EPRIS Journal — ${issue.name}`}
      author="Mariia Ivanova"
      subject={issue.season}
      creator="EPRIS Journal"
      keywords="design, architecture, travel, interior, art"
    >
      <CoverPage issue={issue} />
      <LetterPage issue={issue} t={t} />
      <ContentsPage issue={issue} articles={articles} baseUrl={baseUrl} t={t} />
      {articles.map((article) => (
        <React.Fragment key={article.id}>
          <ArticleCoverPage issue={issue} article={article} baseUrl={baseUrl} />
          <ArticleContentPage issue={issue} article={article} baseUrl={baseUrl} t={t} />
        </React.Fragment>
      ))}
      <ColophonPage issue={issue} t={t} />
    </Document>
  );
}
