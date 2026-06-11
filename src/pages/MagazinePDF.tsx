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
};

// ── Helpers ────────────────────────────────────────────────
function resolveUrl(path: string, baseUrl: string): string {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  if (path.startsWith('/')) return `${baseUrl}${path}`;
  return path;
}

function getArticleHeroUrl(article: Article, baseUrl: string): string {
  return resolveUrl(article.imageUrl || '', baseUrl);
}

function getContentImageUrl(block: ContentBlock, baseUrl: string): string | null {
  if (block.type !== 'image') return null;
  if (typeof block.content !== 'string' || !block.content) return null;
  return resolveUrl(block.content, baseUrl) || null;
}

// ── Styles ─────────────────────────────────────────────────
const s = StyleSheet.create({
  // ── Covers ──
  coverPage: { backgroundColor: c.dark },
  fullBleed: { position: 'absolute', top: 0, left: 0, width: W, height: H },

  // thin category bar at very bottom of article cover (no overlay on image)
  coverBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 32,
    backgroundColor: c.burgundy,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ML,
  },
  coverBarLabel: {
    fontFamily: 'Helvetica',
    fontSize: 7,
    color: c.sand,
    letterSpacing: 4,
  },

  // ── Title page ──
  titlePage: {
    backgroundColor: c.cream,
    paddingTop: MT + 60,
    paddingBottom: MB,
    paddingLeft: ML,
    paddingRight: MR,
  },
  titleCategory: {
    fontFamily: 'Helvetica',
    fontSize: 7.5,
    color: c.sand,
    letterSpacing: 4,
    marginBottom: 20,
  },
  titleHeading: {
    fontFamily: 'Times-Roman',
    fontSize: 40,
    color: c.burgundy,
    lineHeight: 1.18,
    marginBottom: 24,
  },
  titleRule: {
    borderBottomWidth: 0.5,
    borderBottomColor: c.sand,
    borderBottomStyle: 'solid',
    marginBottom: 20,
  },
  titleExcerpt: {
    fontFamily: 'Times-Italic',
    fontSize: 13,
    color: c.burgundy,
    lineHeight: 1.65,
    marginBottom: 28,
  },
  titleMeta: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: c.dim,
    letterSpacing: 1.8,
  },
  // decorative epris mark on title page
  titleMark: {
    position: 'absolute',
    bottom: MB,
    right: MR,
    fontFamily: 'Times-Italic',
    fontSize: 9,
    color: c.sand,
    letterSpacing: 3,
  },

  // ── Content pages ──
  contentPage: {
    backgroundColor: c.cream,
    paddingTop: MT,
    paddingBottom: MB,
    paddingLeft: ML,
    paddingRight: MR,
  },
  // Running header (fixed)
  runningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: 0.4,
    borderBottomColor: c.burgundy,
    borderBottomStyle: 'solid',
    marginBottom: 22,
    opacity: 0.55,
  },
  runningHeaderText: {
    fontFamily: 'Helvetica',
    fontSize: 6.5,
    color: c.burgundy,
    letterSpacing: 1.8,
  },
  // Page number (fixed)
  pageNumView: {
    position: 'absolute',
    bottom: 20,
    left: ML,
    right: MR,
    textAlign: 'center',
  },
  pageNum: {
    fontFamily: 'Helvetica',
    fontSize: 7,
    color: c.dim,
    letterSpacing: 2,
    textAlign: 'center',
  },
  // Hero image at top of first content page
  heroImageView: { marginBottom: 20 },
  heroImage: { width: CW, height: Math.round(CW * (9 / 16)) },
  // Body text
  para: {
    fontFamily: 'Times-Roman',
    fontSize: 11,
    color: c.burgundy,
    lineHeight: 1.8,
    marginBottom: 10,
    textAlign: 'justify',
  },
  paraFirst: {
    fontFamily: 'Times-Roman',
    fontSize: 11,
    color: c.burgundy,
    lineHeight: 1.8,
    marginBottom: 10,
    textAlign: 'justify',
  },
  // Pull quote
  quoteView: {
    marginTop: 20,
    marginBottom: 20,
    borderTopWidth: 0.5,
    borderTopColor: c.sand,
    borderTopStyle: 'solid',
    borderBottomWidth: 0.5,
    borderBottomColor: c.sand,
    borderBottomStyle: 'solid',
    paddingTop: 14,
    paddingBottom: 14,
  },
  quoteText: {
    fontFamily: 'Times-Italic',
    fontSize: 15,
    color: c.burgundy,
    lineHeight: 1.55,
    textAlign: 'center',
  },
  // Note / callout
  noteView: {
    marginTop: 14,
    marginBottom: 14,
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 14,
    paddingRight: 14,
    borderLeftWidth: 2,
    borderLeftColor: c.sand,
    borderLeftStyle: 'solid',
    backgroundColor: c.lightSand,
  },
  noteText: {
    fontFamily: 'Times-Italic',
    fontSize: 10,
    color: c.burgundy,
    lineHeight: 1.65,
  },
  // Heading within article
  subheading: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: c.burgundy,
    letterSpacing: 2.5,
    marginTop: 18,
    marginBottom: 8,
  },
  // Inline image
  inlineImageView: {
    marginTop: 16,
    marginBottom: 8,
  },
  inlineImage: { width: CW },
  caption: {
    fontFamily: 'Helvetica',
    fontSize: 7.5,
    color: c.dim,
    letterSpacing: 1.2,
    marginTop: 5,
    marginBottom: 10,
    textAlign: 'center',
  },

  // ── TOC (contents page) ──
  tocPage: {
    backgroundColor: c.cream,
    paddingTop: MT + 80,
    paddingBottom: MB,
    paddingLeft: ML,
    paddingRight: MR,
  },
  tocLabel: {
    fontFamily: 'Helvetica',
    fontSize: 7,
    color: c.sand,
    letterSpacing: 5,
    marginBottom: 28,
  },
  tocTitle: {
    fontFamily: 'Times-Roman',
    fontSize: 36,
    color: c.burgundy,
    marginBottom: 40,
  },
  tocDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: c.burgundy,
    borderBottomStyle: 'solid',
    opacity: 0.15,
    marginBottom: 32,
  },
  tocRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 28,
  },
  tocIndex: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: c.sand,
    letterSpacing: 2,
    width: 28,
  },
  tocEntryWrap: { flex: 1 },
  tocArticleCategory: {
    fontFamily: 'Helvetica',
    fontSize: 7,
    color: c.dim,
    letterSpacing: 2.5,
    marginBottom: 4,
  },
  tocArticleTitle: {
    fontFamily: 'Times-Roman',
    fontSize: 17,
    color: c.burgundy,
    lineHeight: 1.25,
  },
  tocArticleExcerpt: {
    fontFamily: 'Times-Italic',
    fontSize: 10,
    color: c.dim,
    lineHeight: 1.5,
    marginTop: 6,
  },
  tocEprisMark: {
    position: 'absolute',
    bottom: MB,
    left: ML,
    fontFamily: 'Times-Italic',
    fontSize: 9,
    color: c.sand,
    letterSpacing: 3,
  },
});

// ── Page components ────────────────────────────────────────

function ContentsPage({ articles }: { articles: Article[] }) {
  return (
    <Page size="A4" style={s.tocPage}>
      <Text style={s.tocLabel}>ISSUE 15  ·  SPRING 2026</Text>
      <Text style={s.tocTitle}>Contents</Text>
      <View style={s.tocDivider} />

      {articles.map((article, i) => (
        <View key={article.id} style={s.tocRow}>
          <Text style={s.tocIndex}>0{i + 1}</Text>
          <View style={s.tocEntryWrap}>
            {article.category ? (
              <Text style={s.tocArticleCategory}>{article.category.toUpperCase()}</Text>
            ) : null}
            <Text style={s.tocArticleTitle}>{article.title}</Text>
            {article.excerpt ? (
              <Text style={s.tocArticleExcerpt} numberOfLines={2}>
                {article.excerpt}
              </Text>
            ) : null}
          </View>
        </View>
      ))}

      <Text style={s.tocEprisMark}>EPRIS JOURNAL</Text>
    </Page>
  );
}

function ArticleCoverPage({ article }: { article: Article }) {
  const coverUrl = ARTICLE_COVERS[article.id];
  return (
    <Page size="A4" style={s.coverPage}>
      {coverUrl ? <Image src={coverUrl} style={s.fullBleed} /> : null}
      {/* Thin category strip — doesn't obscure the image */}
      <View style={s.coverBar}>
        {article.category ? (
          <Text style={s.coverBarLabel}>{article.category.toUpperCase()}</Text>
        ) : null}
      </View>
    </Page>
  );
}

function ArticleTitlePage({ article }: { article: Article }) {
  return (
    <Page size="A4" style={s.titlePage}>
      {article.category ? (
        <Text style={s.titleCategory}>{article.category.toUpperCase()}</Text>
      ) : null}
      <Text style={s.titleHeading}>{article.title}</Text>
      <View style={s.titleRule} />
      {article.excerpt ? (
        <Text style={s.titleExcerpt}>{article.excerpt}</Text>
      ) : null}
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
  const heroUrl = getArticleHeroUrl(article, baseUrl);
  const heroAspect = 9 / 16;
  const heroH = Math.round(CW * heroAspect);

  // Build enriched block list: text/quote/note/heading + first 2 inline images
  const blocks = article.content ?? [];
  let imageCount = 0;
  const enriched: (ContentBlock & { _imgUrl?: string })[] = [];

  for (const block of blocks) {
    if (['text', 'quote', 'heading', 'note'].includes(block.type) && typeof block.content === 'string') {
      enriched.push(block);
    } else if (block.type === 'image' && imageCount < 2) {
      const url = getContentImageUrl(block, baseUrl);
      if (url) {
        enriched.push({ ...block, _imgUrl: url });
        imageCount++;
      }
    }
  }

  return (
    <Page size="A4" style={s.contentPage} wrap>
      {/* Running header */}
      <View style={s.runningHeader} fixed>
        <Text style={s.runningHeaderText}>EPRIS JOURNAL  ·  ISSUE 15</Text>
        <Text style={s.runningHeaderText}>{article.title.toUpperCase()}</Text>
      </View>

      {/* Hero image — first page only */}
      {heroUrl ? (
        <View style={s.heroImageView}>
          <Image
            src={heroUrl}
            style={{ width: CW, height: heroH }}
          />
        </View>
      ) : null}

      {/* Content blocks */}
      {enriched.map((block, i) => {
        if (block._imgUrl) {
          const imageAspect = 3 / 2;
          const imageH = Math.round(CW * (1 / imageAspect));
          return (
            <View key={i} style={s.inlineImageView}>
              <Image
                src={block._imgUrl}
                style={{ width: CW, height: imageH }}
              />
              {block.caption ? (
                <Text style={s.caption}>{block.caption}</Text>
              ) : null}
            </View>
          );
        }
        if (block.type === 'text' && typeof block.content === 'string') {
          return (
            <Text key={i} style={i === 0 ? s.paraFirst : s.para}>
              {block.content}
            </Text>
          );
        }
        if (block.type === 'quote' && typeof block.content === 'string') {
          return (
            <View key={i} style={s.quoteView}>
              <Text style={s.quoteText}>{block.content}</Text>
            </View>
          );
        }
        if (block.type === 'note' && typeof block.content === 'string') {
          return (
            <View key={i} style={s.noteView}>
              <Text style={s.noteText}>{block.content}</Text>
            </View>
          );
        }
        if (block.type === 'heading' && typeof block.content === 'string') {
          return (
            <Text key={i} style={s.subheading}>
              {block.content.toUpperCase()}
            </Text>
          );
        }
        return null;
      })}

      {/* Page number */}
      <View style={s.pageNumView} fixed>
        <Text
          style={s.pageNum}
          render={({ pageNumber }: { pageNumber: number }) => String(pageNumber)}
        />
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
    >
      {/* Issue main cover */}
      <Page size="A4" style={s.coverPage}>
        <Image src={MAIN_COVER} style={s.fullBleed} />
      </Page>

      {/* Table of contents */}
      <ContentsPage articles={articles} />

      {/* One spread per article */}
      {articles.map((article) => (
        <React.Fragment key={article.id}>
          <ArticleCoverPage article={article} />
          <ArticleTitlePage article={article} />
          <ArticleContentPage article={article} baseUrl={baseUrl} />
        </React.Fragment>
      ))}
    </Document>
  );
}
