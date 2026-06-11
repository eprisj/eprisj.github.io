import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import type { Article } from '../data';

const COVER_BASE =
  'https://raw.githubusercontent.com/eprisj/eprisj.github.io/main/%D1%81over';

const MAIN_COVER = `${COVER_BASE}/main_cover.PNG`;

const ARTICLE_COVERS: Record<number, string> = {
  8: `${COVER_BASE}/cover_hover.jpg`,
  9: `${COVER_BASE}/cover_treshold.jpg`,
};

// A4 = 595 × 842 pt
const W = 595;
const H = 842;
const ML = 56;
const MT = 48;
const MB = 60;

const c = {
  burgundy: '#501a2c',
  cream: '#F5F0EB',
  sand: '#C9A690',
  dark: '#1a0812',
  dimBurgundy: '#9a7080',
  lightSand: '#EDE4DA',
};

const s = StyleSheet.create({
  // ── Cover pages ──────────────────────────────────────
  coverPage: {
    backgroundColor: c.dark,
    width: W,
    height: H,
  },
  fullBleed: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: W,
    height: H,
  },
  articleCoverOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: c.burgundy,
    paddingTop: 28,
    paddingBottom: 44,
    paddingLeft: ML,
    paddingRight: ML,
  },
  coverLabel: {
    fontFamily: 'Helvetica',
    fontSize: 7.5,
    color: c.sand,
    letterSpacing: 3.5,
    marginBottom: 10,
  },
  coverTitle: {
    fontFamily: 'Times-Roman',
    fontSize: 34,
    color: c.cream,
    lineHeight: 1.22,
    marginBottom: 14,
  },
  coverMeta: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: c.cream,
    letterSpacing: 1.8,
    opacity: 0.65,
  },

  // ── Content pages ─────────────────────────────────────
  page: {
    backgroundColor: c.cream,
    paddingTop: MT,
    paddingBottom: MB,
    paddingLeft: ML,
    paddingRight: ML,
  },

  // Running header (fixed — repeats every page)
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: c.burgundy,
    borderBottomStyle: 'solid',
    marginBottom: 28,
  },
  headerText: {
    fontFamily: 'Helvetica',
    fontSize: 6.5,
    color: c.dimBurgundy,
    letterSpacing: 2,
  },

  // Article headline (first page only)
  articleLabel: {
    fontFamily: 'Helvetica',
    fontSize: 7.5,
    color: c.sand,
    letterSpacing: 3.5,
    marginBottom: 8,
  },
  articleTitle: {
    fontFamily: 'Times-Roman',
    fontSize: 24,
    color: c.burgundy,
    lineHeight: 1.28,
    marginBottom: 8,
  },
  articleMeta: {
    fontFamily: 'Helvetica',
    fontSize: 7.5,
    color: c.dimBurgundy,
    letterSpacing: 1.5,
    marginBottom: 20,
  },
  divider: {
    borderBottomWidth: 0.5,
    borderBottomColor: c.burgundy,
    borderBottomStyle: 'solid',
    opacity: 0.2,
    marginBottom: 18,
  },

  // Body
  para: {
    fontFamily: 'Times-Roman',
    fontSize: 11,
    color: c.burgundy,
    lineHeight: 1.78,
    marginBottom: 11,
    textAlign: 'justify',
  },
  quoteView: {
    marginTop: 18,
    marginBottom: 18,
    marginLeft: 20,
    paddingLeft: 14,
    borderLeftWidth: 2,
    borderLeftColor: c.sand,
    borderLeftStyle: 'solid',
  },
  quoteText: {
    fontFamily: 'Times-Italic',
    fontSize: 14,
    color: c.burgundy,
    lineHeight: 1.55,
  },
  noteView: {
    marginTop: 14,
    marginBottom: 14,
    paddingTop: 11,
    paddingBottom: 11,
    paddingLeft: 14,
    paddingRight: 14,
    borderLeftWidth: 2.5,
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

  // Footer page number (fixed)
  pageFooter: {
    position: 'absolute',
    bottom: 22,
    left: ML,
    right: ML,
    textAlign: 'center',
  },
  pageNum: {
    fontFamily: 'Helvetica',
    fontSize: 7,
    color: c.dimBurgundy,
    letterSpacing: 2,
    textAlign: 'center',
    opacity: 0.5,
  },
});

function ArticleCoverPage({ article }: { article: Article }) {
  const coverUrl = ARTICLE_COVERS[article.id];
  return (
    <Page size="A4" style={s.coverPage}>
      {coverUrl && <Image src={coverUrl} style={s.fullBleed} />}
      <View style={s.articleCoverOverlay}>
        {article.category ? (
          <Text style={s.coverLabel}>{article.category.toUpperCase()}</Text>
        ) : null}
        <Text style={s.coverTitle}>{article.title}</Text>
        <Text style={s.coverMeta}>
          {article.author.toUpperCase()}
          {'   ·   '}
          {article.date}
        </Text>
      </View>
    </Page>
  );
}

function ArticleContentPage({ article }: { article: Article }) {
  const blocks = (article.content ?? []).filter(
    (b) =>
      ['text', 'quote', 'heading', 'note'].includes(b.type) &&
      typeof b.content === 'string'
  );

  return (
    <Page size="A4" style={s.page} wrap>
      {/* Running header — repeats on every continuation page */}
      <View style={s.pageHeader} fixed>
        <Text style={s.headerText}>EPRIS JOURNAL</Text>
        <Text style={s.headerText}>ISSUE 15  ·  SPRING 2026</Text>
      </View>

      {/* Article headline — first page only */}
      <View>
        {article.category ? (
          <Text style={s.articleLabel}>{article.category.toUpperCase()}</Text>
        ) : null}
        <Text style={s.articleTitle}>{article.title}</Text>
        <Text style={s.articleMeta}>
          {article.author.toUpperCase()}
          {'   ·   '}
          {article.date}
        </Text>
        <View style={s.divider} />
      </View>

      {/* Content blocks */}
      {blocks.map((block, i) => {
        if (block.type === 'text' && typeof block.content === 'string') {
          return (
            <Text key={i} style={s.para}>
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
        if (block.type === 'heading' && typeof block.content === 'string') {
          return (
            <Text
              key={i}
              style={{
                fontFamily: 'Helvetica-Bold',
                fontSize: 9,
                color: c.burgundy,
                letterSpacing: 2.5,
                marginTop: 16,
                marginBottom: 8,
              }}
            >
              {block.content.toUpperCase()}
            </Text>
          );
        }
        if (block.type === 'note' && typeof block.content === 'string') {
          return (
            <View key={i} style={s.noteView}>
              <Text style={s.noteText}>{block.content}</Text>
            </View>
          );
        }
        return null;
      })}

      {/* Page number — repeats on every continuation page */}
      <View style={s.pageFooter} fixed>
        <Text
          style={s.pageNum}
          render={({ pageNumber }: { pageNumber: number }) =>
            `— ${pageNumber} —`
          }
        />
      </View>
    </Page>
  );
}

export function MagazinePDF({ articles }: { articles: Article[] }) {
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

      {/* One spread per article */}
      {articles.map((article) => (
        <React.Fragment key={article.id}>
          <ArticleCoverPage article={article} />
          <ArticleContentPage article={article} />
        </React.Fragment>
      ))}
    </Document>
  );
}

