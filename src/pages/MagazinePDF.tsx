import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import type { Article, ContentBlock } from '../data';

// ── Constants ──────────────────────────────────────────────
const COVER_BASE =
  'https://raw.githubusercontent.com/eprisj/eprisj.github.io/main/%D1%81over';

const MAIN_COVER = `${COVER_BASE}/main_cover.PNG`;

const ARTICLE_COVERS: Record<number, string> = {
  8: `${COVER_BASE}/cover_hover.jpg`,
  9: `${COVER_BASE}/cover_treshold.jpg`,
};

// A4 in points
const W = 595;
const H = 842;
const ML = 52;
const MR = 52;
const MT = 44;
const MB = 58;
const CW = W - ML - MR; // 491pt content width

const c = {
  burgundy: '#501a2c',
  cream:    '#F5F0EB',
  sand:     '#C9A690',
  dark:     '#140a0f',
  dim:      '#9a7080',
  lightSand:'#EDE4DA',
  white:    '#FFFFFF',
  black:    '#0d0608',
};

// ── Helpers ────────────────────────────────────────────────
function resolveUrl(path: string, baseUrl: string): string {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  if (path.startsWith('/')) return `${baseUrl}${path}`;
  return path;
}

function getArtCoverUrl(article: Article, baseUrl: string): string | null {
  if (ARTICLE_COVERS[article.id]) return ARTICLE_COVERS[article.id];
  if (article.imageUrl) return resolveUrl(article.imageUrl, baseUrl);
  return null;
}

// ── Styles ─────────────────────────────────────────────────
const s = StyleSheet.create({
  // ── Covers ──
  coverPage: { backgroundColor: c.dark },
  fullBleed: { position: 'absolute', top: 0, left: 0, width: W, height: H, objectFit: 'cover' },

  coverBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 40,
    backgroundColor: c.burgundy,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ML,
    justifyContent: 'space-between',
  },
  coverBarLabel: { fontFamily: 'Helvetica', fontSize: 7, color: c.sand, letterSpacing: 4 },
  coverBarIssue: { fontFamily: 'Times-Italic', fontSize: 8, color: c.cream, letterSpacing: 1 },

  // ── Letter page ──
  letterPage: {
    backgroundColor: c.cream,
    paddingTop: MT + 50,
    paddingBottom: MB + 20,
    paddingLeft: ML + 20,
    paddingRight: MR + 20,
  },
  letterKicker: {
    fontFamily: 'Helvetica',
    fontSize: 7,
    color: c.sand,
    letterSpacing: 5,
    marginBottom: 22,
  },
  letterHeading: {
    fontFamily: 'Times-Italic',
    fontSize: 28,
    color: c.burgundy,
    lineHeight: 1.3,
    marginBottom: 22,
  },
  letterRule: {
    borderBottomWidth: 0.5,
    borderBottomColor: c.sand,
    marginBottom: 22,
  },
  letterBody: {
    fontFamily: 'Times-Roman',
    fontSize: 10.5,
    color: c.burgundy,
    lineHeight: 1.85,
    marginBottom: 14,
    textAlign: 'justify',
  },
  letterSignature: {
    fontFamily: 'Times-Italic',
    fontSize: 12,
    color: c.burgundy,
    marginTop: 24,
    marginBottom: 4,
  },
  letterRole: {
    fontFamily: 'Helvetica',
    fontSize: 7.5,
    color: c.dim,
    letterSpacing: 2,
  },
  letterMark: {
    position: 'absolute',
    bottom: MB,
    right: MR,
    fontFamily: 'Times-Italic',
    fontSize: 9,
    color: c.sand,
    letterSpacing: 3,
  },

  // ── TOC ──
  tocPage: {
    backgroundColor: c.cream,
    paddingTop: MT + 60,
    paddingBottom: MB,
    paddingLeft: ML,
    paddingRight: MR,
  },
  tocLabel: { fontFamily: 'Helvetica', fontSize: 7, color: c.sand, letterSpacing: 5, marginBottom: 24 },
  tocTitle: { fontFamily: 'Times-Roman', fontSize: 40, color: c.burgundy, marginBottom: 36 },
  tocRule: {
    borderBottomWidth: 0.5,
    borderBottomColor: c.burgundy,
    opacity: 0.2,
    marginBottom: 28,
  },
  tocRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 26, gap: 16 },
  tocThumb: { width: 52, height: 68, backgroundColor: c.lightSand },
  tocIndex: { fontFamily: 'Helvetica', fontSize: 9, color: c.sand, letterSpacing: 2, marginBottom: 4 },
  tocCategory: { fontFamily: 'Helvetica', fontSize: 7, color: c.dim, letterSpacing: 2.5, marginBottom: 4 },
  tocArticleTitle: { fontFamily: 'Times-Roman', fontSize: 16, color: c.burgundy, lineHeight: 1.2, marginBottom: 5 },
  tocExcerpt: { fontFamily: 'Times-Italic', fontSize: 9.5, color: c.dim, lineHeight: 1.5 },
  tocEprisMark: {
    position: 'absolute', bottom: MB, left: ML,
    fontFamily: 'Times-Italic', fontSize: 9, color: c.sand, letterSpacing: 3,
  },

  // ── Title page ──
  titlePage: {
    backgroundColor: c.cream,
    paddingTop: MT + 70,
    paddingBottom: MB,
    paddingLeft: ML,
    paddingRight: MR,
  },
  titleCategory: { fontFamily: 'Helvetica', fontSize: 7.5, color: c.sand, letterSpacing: 4, marginBottom: 18 },
  titleHeading: {
    fontFamily: 'Times-Roman', fontSize: 42, color: c.burgundy,
    lineHeight: 1.15, marginBottom: 22,
  },
  titleRule: { borderBottomWidth: 0.5, borderBottomColor: c.sand, marginBottom: 20 },
  titleExcerpt: {
    fontFamily: 'Times-Italic', fontSize: 13.5, color: c.burgundy,
    lineHeight: 1.65, marginBottom: 26,
  },
  titleMeta: { fontFamily: 'Helvetica', fontSize: 7.5, color: c.dim, letterSpacing: 2 },
  titleMark: { position: 'absolute', bottom: MB, right: MR, fontFamily: 'Times-Italic', fontSize: 9, color: c.sand, letterSpacing: 3 },

  // ── Content pages ──
  contentPage: {
    backgroundColor: c.cream,
    paddingTop: MT, paddingBottom: MB, paddingLeft: ML, paddingRight: MR,
  },
  runningHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingBottom: 5,
    borderBottomWidth: 0.4, borderBottomColor: c.burgundy,
    marginBottom: 20, opacity: 0.5,
  },
  runningHeaderText: { fontFamily: 'Helvetica', fontSize: 6.5, color: c.burgundy, letterSpacing: 2 },
  pageNumView: { position: 'absolute', bottom: 20, left: ML, right: MR },
  pageNum: { fontFamily: 'Helvetica', fontSize: 7, color: c.dim, letterSpacing: 2, textAlign: 'center' },

  // Hero image
  heroImage: { width: CW, height: Math.round(CW * (9 / 16)), marginBottom: 22 },

  // Drop cap container
  dropCapRow: { flexDirection: 'row', marginBottom: 8 },
  dropCapLetter: {
    fontFamily: 'Times-Roman', fontSize: 46, color: c.burgundy,
    lineHeight: 1, marginRight: 4, marginTop: 2,
  },
  dropCapRest: {
    fontFamily: 'Times-Roman', fontSize: 11, color: c.burgundy,
    lineHeight: 1.8, flex: 1, textAlign: 'justify',
  },

  // Body text
  para: {
    fontFamily: 'Times-Roman', fontSize: 11, color: c.burgundy,
    lineHeight: 1.82, marginBottom: 9, textAlign: 'justify',
  },

  // Pull quote
  quoteView: {
    marginVertical: 22,
    paddingVertical: 16,
    borderTopWidth: 1.5, borderTopColor: c.sand,
    borderBottomWidth: 1.5, borderBottomColor: c.sand,
  },
  quoteMark: { fontFamily: 'Times-Roman', fontSize: 48, color: c.sand, lineHeight: 0.6, marginBottom: 6 },
  quoteText: { fontFamily: 'Times-Italic', fontSize: 16, color: c.burgundy, lineHeight: 1.55, textAlign: 'center' },
  quoteSource: { fontFamily: 'Helvetica', fontSize: 7.5, color: c.dim, letterSpacing: 2, textAlign: 'center', marginTop: 10 },

  // Note
  noteView: {
    marginVertical: 12,
    paddingVertical: 10, paddingLeft: 14, paddingRight: 10,
    borderLeftWidth: 2, borderLeftColor: c.sand, backgroundColor: c.lightSand,
  },
  noteLabel: { fontFamily: 'Helvetica', fontSize: 6.5, color: c.sand, letterSpacing: 3, marginBottom: 5 },
  noteText: { fontFamily: 'Times-Italic', fontSize: 10, color: c.burgundy, lineHeight: 1.65 },

  // Subheading
  subheading: {
    fontFamily: 'Helvetica-Bold', fontSize: 8.5, color: c.burgundy,
    letterSpacing: 3, marginTop: 22, marginBottom: 8,
  },

  // Inline image
  inlineImageView: { marginTop: 18, marginBottom: 10 },
  caption: {
    fontFamily: 'Helvetica', fontSize: 7.5, color: c.dim,
    letterSpacing: 1.2, marginTop: 5, marginBottom: 8, textAlign: 'center',
  },

  // Gallery grid
  galleryView: { marginVertical: 16 },
  galleryLabel: { fontFamily: 'Helvetica', fontSize: 6.5, color: c.sand, letterSpacing: 3, marginBottom: 10 },
  galleryRow: { flexDirection: 'row', marginBottom: 4 },

  // Checklist / protocol
  checklistView: {
    marginVertical: 14, borderWidth: 0.5, borderColor: c.sand,
    paddingVertical: 14, paddingHorizontal: 16,
  },
  checklistLabel: { fontFamily: 'Helvetica', fontSize: 6.5, color: c.sand, letterSpacing: 3, marginBottom: 12 },
  checklistItem: { flexDirection: 'row', marginBottom: 7 },
  checklistBullet: { fontFamily: 'Helvetica', fontSize: 9, color: c.sand, width: 18, marginTop: 1 },
  checklistText: { fontFamily: 'Times-Roman', fontSize: 10, color: c.burgundy, flex: 1, lineHeight: 1.55 },

  // Poll
  pollView: {
    marginVertical: 14, backgroundColor: c.lightSand,
    paddingVertical: 16, paddingHorizontal: 16,
  },
  pollLabel: { fontFamily: 'Helvetica', fontSize: 6.5, color: c.dim, letterSpacing: 3, marginBottom: 10 },
  pollQuestion: { fontFamily: 'Times-Italic', fontSize: 12, color: c.burgundy, lineHeight: 1.45, marginBottom: 16 },
  pollOptionRow: { marginBottom: 10 },
  pollOptionLabel: { fontFamily: 'Helvetica', fontSize: 8.5, color: c.burgundy, marginBottom: 4 },
  pollBarBg: { height: 3, backgroundColor: c.cream },
  pollBarFill: { height: 3, backgroundColor: c.burgundy },
  pollVotes: { fontFamily: 'Helvetica', fontSize: 7, color: c.dim, marginTop: 2 },

  // Link callout
  linkView: {
    marginVertical: 12, flexDirection: 'row', alignItems: 'center',
    borderTopWidth: 0.4, borderBottomWidth: 0.4, borderColor: c.sand,
    paddingVertical: 8,
  },
  linkArrow: { fontFamily: 'Times-Roman', fontSize: 10, color: c.sand, marginRight: 8 },
  linkText: { fontFamily: 'Helvetica', fontSize: 8.5, color: c.burgundy, flex: 1, lineHeight: 1.4 },

  // Map callout
  mapView: {
    marginVertical: 12, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8, backgroundColor: c.lightSand,
  },
  mapPin: { fontFamily: 'Times-Roman', fontSize: 10, color: c.sand, marginRight: 8 },
  mapText: { fontFamily: 'Helvetica', fontSize: 8.5, color: c.burgundy, flex: 1 },

  // ── Colophon ──
  colophonPage: {
    backgroundColor: c.dark, paddingTop: MT, paddingBottom: MB,
    paddingLeft: ML, paddingRight: MR,
    justifyContent: 'space-between',
  },
  colophonTop: {},
  colophonBottom: {},
  colophonLogo: {
    fontFamily: 'Times-Italic', fontSize: 58, color: c.cream,
    letterSpacing: 8, lineHeight: 1, marginBottom: 8,
  },
  colophonTagline: {
    fontFamily: 'Helvetica', fontSize: 8, color: c.sand,
    letterSpacing: 5, marginBottom: 40,
  },
  colophonRule: { borderBottomWidth: 0.5, borderBottomColor: c.sand, opacity: 0.4, marginBottom: 20 },
  colophonMeta: { fontFamily: 'Helvetica', fontSize: 7.5, color: c.cream, opacity: 0.5, letterSpacing: 1.5, marginBottom: 6 },
  colophonUrl: { fontFamily: 'Helvetica', fontSize: 8, color: c.sand, letterSpacing: 2 },
  colophonIssue: {
    fontFamily: 'Times-Roman', fontSize: 13, color: c.cream,
    opacity: 0.6, letterSpacing: 1, marginBottom: 6,
  },
});

// ── Block renderers ────────────────────────────────────────

function GalleryBlock({ urls, baseUrl }: { urls: string[]; baseUrl: string }) {
  const imgs = urls.slice(0, 6);
  const cols = 3;
  const gap = 4;
  const imgW = (CW - gap * (cols - 1)) / cols;
  const imgH = imgW; // square

  const rows: string[][] = [];
  for (let i = 0; i < imgs.length; i += cols) rows.push(imgs.slice(i, i + cols));

  return (
    <View style={s.galleryView}>
      <Text style={s.galleryLabel}>GALLERY</Text>
      {rows.map((row, ri) => (
        <View key={ri} style={s.galleryRow}>
          {row.map((url, ci) => (
            <View key={ci} style={{ marginRight: ci < row.length - 1 ? gap : 0 }}>
              <Image src={resolveUrl(url, baseUrl)} style={{ width: imgW, height: imgH }} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function ChecklistBlock({ items }: { items: string[] }) {
  return (
    <View style={s.checklistView}>
      <Text style={s.checklistLabel}>CONSERVATION PROTOCOL</Text>
      {items.map((item, i) => (
        <View key={i} style={s.checklistItem}>
          <Text style={s.checklistBullet}>{String(i + 1).padStart(2, '0')}</Text>
          <Text style={s.checklistText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function PollBlock({ poll }: { poll: { question: string; options: { label: string; votes: number }[] } }) {
  const totalVotes = poll.options.reduce((s, o) => s + o.votes, 0) || 1;
  return (
    <View style={s.pollView}>
      <Text style={s.pollLabel}>READER VOTE</Text>
      <Text style={s.pollQuestion}>{poll.question}</Text>
      {poll.options.slice(0, 7).map((opt, i) => {
        const pct = Math.round((opt.votes / totalVotes) * 100);
        return (
          <View key={i} style={s.pollOptionRow}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
              <Text style={s.pollOptionLabel}>{opt.label}</Text>
              <Text style={{ fontFamily: 'Helvetica', fontSize: 7, color: c.dim }}>{pct}%</Text>
            </View>
            <View style={s.pollBarBg}>
              <View style={[s.pollBarFill, { width: `${pct}%` as unknown as number }]} />
            </View>
          </View>
        );
      })}
      <Text style={{ fontFamily: 'Helvetica', fontSize: 7, color: c.dim, marginTop: 8, letterSpacing: 1 }}>
        {totalVotes} votes total
      </Text>
    </View>
  );
}

// ── Page components ────────────────────────────────────────

function LetterPage() {
  return (
    <Page size="A4" style={s.letterPage}>
      <Text style={s.letterKicker}>LETTER FROM THE EDITOR</Text>
      <Text style={s.letterHeading}>On the Architecture{'\n'}of Feeling</Text>
      <View style={s.letterRule} />
      <Text style={s.letterBody}>
        Every issue of EPRIS begins with a question we cannot quite answer. This spring, we asked ourselves: what does a space remember?
      </Text>
      <Text style={s.letterBody}>
        In "Home Away From Home," we trace the intimate geography of temporary dwelling — those apartments that hold a traveller's solitude like a well-worn coat, their rooms arranged around someone else's idea of comfort. It is, in the end, a meditation on trust: the quiet act of inhabiting a life not your own.
      </Text>
      <Text style={s.letterBody}>
        "The Threshold of Time" takes us deeper still. Doors, it turns out, are not merely architecture — they are the first sentence a building speaks to the street. Our investigation into door conservation across six cities revealed something unexpected: the act of restoration is also an act of radical empathy, extended across centuries.
      </Text>
      <Text style={s.letterBody}>
        Both stories share an obsession with the visible made invisible — the patina of use, the memory of touch, the grammar of lived experience written into surfaces. We hope you find, in these pages, the particular silence that good design produces: a silence that makes room for thought.
      </Text>
      <Text style={s.letterSignature}>Mariia Ivanova</Text>
      <Text style={s.letterRole}>EDITOR-IN-CHIEF · EPRIS JOURNAL</Text>
      <Text style={s.letterMark}>EPRIS</Text>
    </Page>
  );
}

function ContentsPage({ articles, baseUrl }: { articles: Article[]; baseUrl: string }) {
  return (
    <Page size="A4" style={s.tocPage}>
      <Text style={s.tocLabel}>ISSUE 15  ·  SPRING 2026</Text>
      <Text style={s.tocTitle}>Contents</Text>
      <View style={s.tocRule} />

      {articles.map((article, i) => {
        const thumbUrl = ARTICLE_COVERS[article.id]
          ? ARTICLE_COVERS[article.id]
          : article.imageUrl ? resolveUrl(article.imageUrl, baseUrl) : null;

        return (
          <View key={article.id} style={s.tocRow}>
            {/* Thumbnail */}
            <View style={s.tocThumb}>
              {thumbUrl
                ? <Image src={thumbUrl} style={{ width: 52, height: 68 }} />
                : <View style={{ width: 52, height: 68, backgroundColor: c.lightSand }} />
              }
            </View>
            {/* Text */}
            <View style={{ flex: 1, paddingTop: 4 }}>
              <Text style={s.tocIndex}>0{i + 1}</Text>
              {article.category
                ? <Text style={s.tocCategory}>{article.category.toUpperCase()}</Text>
                : null}
              <Text style={s.tocArticleTitle}>{article.title}</Text>
              {article.excerpt
                ? <Text style={s.tocExcerpt}>{article.excerpt.slice(0, 120)}{article.excerpt.length > 120 ? '…' : ''}</Text>
                : null}
            </View>
          </View>
        );
      })}

      <Text style={s.tocEprisMark}>EPRIS JOURNAL</Text>
    </Page>
  );
}

function ArticleCoverPage({ article, baseUrl }: { article: Article; baseUrl: string }) {
  const coverUrl = getArtCoverUrl(article, baseUrl);
  return (
    <Page size="A4" style={s.coverPage}>
      {coverUrl ? <Image src={coverUrl} style={s.fullBleed} /> : null}
      <View style={s.coverBar}>
        {article.category
          ? <Text style={s.coverBarLabel}>{article.category.toUpperCase()}</Text>
          : <Text style={s.coverBarLabel}>EPRIS</Text>}
        <Text style={s.coverBarIssue}>Issue 15 · Spring 2026</Text>
      </View>
    </Page>
  );
}

function ArticleTitlePage({ article, index }: { article: Article; index: number }) {
  return (
    <Page size="A4" style={s.titlePage}>
      <Text style={s.titleCategory}>
        {article.category ? article.category.toUpperCase() : 'EPRIS'}
        {'   ·   '}
        {String(index + 1).padStart(2, '0')} of 02
      </Text>
      <Text style={s.titleHeading}>{article.title}</Text>
      <View style={s.titleRule} />
      {article.excerpt
        ? <Text style={s.titleExcerpt}>{article.excerpt}</Text>
        : null}
      <Text style={s.titleMeta}>
        {article.author.toUpperCase()}
        {'   ·   '}
        {article.date}
      </Text>
      <Text style={s.titleMark}>EPRIS</Text>
    </Page>
  );
}

function ArticleContentPage({
  article,
  baseUrl,
}: {
  article: Article;
  baseUrl: string;
}) {
  const heroUrl = article.imageUrl ? resolveUrl(article.imageUrl, baseUrl) : null;
  const blocks = article.content ?? [];
  let isFirst = true; // first text block gets drop cap

  const renderBlock = (block: ContentBlock & { _key: number }) => {
    const key = block._key;

    if (block.type === 'text' && typeof block.content === 'string') {
      if (isFirst) {
        isFirst = false;
        const text = block.content;
        const firstChar = text.charAt(0);
        const rest = text.slice(1);
        return (
          <View key={key} style={s.dropCapRow}>
            <Text style={s.dropCapLetter}>{firstChar}</Text>
            <Text style={s.dropCapRest}>{rest}</Text>
          </View>
        );
      }
      return <Text key={key} style={s.para}>{block.content}</Text>;
    }

    if (block.type === 'quote' && typeof block.content === 'string') {
      return (
        <View key={key} style={s.quoteView}>
          <Text style={s.quoteMark}>"</Text>
          <Text style={s.quoteText}>{block.content}</Text>
        </View>
      );
    }

    if (block.type === 'note' && typeof block.content === 'string') {
      return (
        <View key={key} style={s.noteView}>
          <Text style={s.noteLabel}>NOTE</Text>
          <Text style={s.noteText}>{block.content}</Text>
        </View>
      );
    }

    if (block.type === 'image' && typeof block.content === 'string') {
      const url = resolveUrl(block.content, baseUrl);
      if (!url) return null;
      const iH = Math.round(CW * (9 / 16));
      return (
        <View key={key} style={s.inlineImageView}>
          <Image src={url} style={{ width: CW, height: iH }} />
          {block.caption ? <Text style={s.caption}>{block.caption}</Text> : null}
        </View>
      );
    }

    if (block.type === 'gallery' && Array.isArray(block.content)) {
      return <GalleryBlock key={key} urls={block.content as string[]} baseUrl={baseUrl} />;
    }

    if (block.type === 'checklist') {
      const raw = block.content as { items?: string[] } | string;
      const items: string[] = typeof raw === 'object' && !Array.isArray(raw) && raw.items
        ? raw.items
        : [];
      if (!items.length) return null;
      return <ChecklistBlock key={key} items={items} />;
    }

    if (block.type === 'poll') {
      const raw = block.content as { question?: string; options?: { label: string; votes: number }[] } | string;
      if (typeof raw === 'object' && !Array.isArray(raw) && raw.question && raw.options) {
        return <PollBlock key={key} poll={raw as { question: string; options: { label: string; votes: number }[] }} />;
      }
      return null;
    }

    if (block.type === 'link' && typeof block.content === 'string') {
      return (
        <View key={key} style={s.linkView}>
          <Text style={s.linkArrow}>→</Text>
          <Text style={s.linkText}>{block.content}</Text>
        </View>
      );
    }

    if (block.type === 'map' && typeof block.content === 'string') {
      return (
        <View key={key} style={s.mapView}>
          <Text style={s.mapPin}>◉</Text>
          <Text style={s.mapText}>{block.content}</Text>
        </View>
      );
    }

    return null;
  };

  return (
    <Page size="A4" style={s.contentPage} wrap>
      {/* Running header — fixed */}
      <View style={s.runningHeader} fixed>
        <Text style={s.runningHeaderText}>EPRIS JOURNAL  ·  ISSUE 15</Text>
        <Text style={s.runningHeaderText}>{article.title.toUpperCase()}</Text>
      </View>

      {/* Hero image — first page only */}
      {heroUrl ? <Image src={heroUrl} style={s.heroImage} /> : null}

      {/* Content blocks */}
      {blocks.map((block, i) => renderBlock({ ...block, _key: i }))}

      {/* Page number — fixed */}
      <View style={s.pageNumView} fixed>
        <Text style={s.pageNum} render={({ pageNumber }: { pageNumber: number }) => String(pageNumber)} />
      </View>
    </Page>
  );
}

function ColophonPage() {
  return (
    <Page size="A4" style={s.colophonPage}>
      <View style={s.colophonTop}>
        <Text style={s.colophonLogo}>EPRIS</Text>
        <Text style={s.colophonTagline}>JOURNAL</Text>
      </View>

      <View style={s.colophonBottom}>
        <View style={s.colophonRule} />
        <Text style={s.colophonIssue}>Issue 15  ·  Spring 2026</Text>
        <Text style={s.colophonMeta}>Editor-in-Chief  ·  Mariia Ivanova</Text>
        <Text style={s.colophonMeta}>Design & Digital  ·  EPRIS Studio</Text>
        <Text style={s.colophonMeta}>Printed and distributed digitally</Text>
        <Text style={{ ...s.colophonMeta, marginTop: 16 }}>
          © 2026 EPRIS Journal. All rights reserved.
        </Text>
        <Text style={s.colophonUrl}>eprisjournal.com</Text>
      </View>
    </Page>
  );
}

// ── Main document ──────────────────────────────────────────

export function MagazinePDF({
  articles,
  baseUrl,
}: {
  articles: Article[];
  baseUrl: string;
}) {
  return (
    <Document
      title="EPRIS Journal — Issue 15"
      author="Mariia Ivanova"
      subject="Spring 2026"
      creator="EPRIS Journal"
      keywords="design, architecture, travel, interior, art"
    >
      {/* 1. Issue main cover */}
      <Page size="A4" style={s.coverPage}>
        <Image src={MAIN_COVER} style={s.fullBleed} />
        <View style={{ ...s.coverBar, height: 44 }}>
          <View>
            <Text style={{ fontFamily: 'Times-Italic', fontSize: 22, color: c.cream, letterSpacing: 3 }}>
              EPRIS
            </Text>
          </View>
          <Text style={s.coverBarIssue}>Issue 15 · Spring 2026</Text>
        </View>
      </Page>

      {/* 2. Letter from the editor */}
      <LetterPage />

      {/* 3. Table of contents */}
      <ContentsPage articles={articles} baseUrl={baseUrl} />

      {/* 4. One spread per article */}
      {articles.map((article, idx) => (
        <React.Fragment key={article.id}>
          <ArticleCoverPage article={article} baseUrl={baseUrl} />
          <ArticleTitlePage article={article} index={idx} />
          <ArticleContentPage article={article} baseUrl={baseUrl} />
        </React.Fragment>
      ))}

      {/* 5. Colophon / back cover */}
      <ColophonPage />
    </Document>
  );
}
