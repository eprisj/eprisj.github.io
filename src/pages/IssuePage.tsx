import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, BookOpen, ArrowRight } from 'lucide-react';
import type { Article, Issue } from '../data';

const COVER_BASE =
  'https://raw.githubusercontent.com/eprisj/eprisj.github.io/main/%D1%81over';

const ARTICLE_COVERS: Record<number, string> = {
  8: `${COVER_BASE}/cover_hover.jpg`,
  9: `${COVER_BASE}/cover_treshold.jpg`,
};

function coverFor(article: Article): string | null {
  if (ARTICLE_COVERS[article.id]) return ARTICLE_COVERS[article.id];
  if (article.imageUrl) return article.imageUrl;
  return null;
}

export function IssuePage({
  archive,
  t,
}: {
  archive: { issue: Issue; articles: Article[] }[];
  t: (key: string) => string;
}) {
  const [selectedId, setSelectedId] = useState<number>(archive[0]?.issue.id);
  const selected = archive.find((entry) => entry.issue.id === selectedId) || archive[0];
  const { issue, articles } = selected;
  const otherIssues = archive.filter((entry) => entry.issue.id !== issue.id);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const handleDownload = async () => {
    setStatus('loading');
    try {
      const [{ pdf }, { MagazinePDF }, { createElement }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./MagazinePDF'),
        import('react'),
      ]);

      const baseUrl = window.location.origin;
      const element = createElement(MagazinePDF, { issue, articles, baseUrl, t });
      const blob = await pdf(element as Parameters<typeof pdf>[0]).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (issue.name || 'EPRIS_Issue').replace(/\s+/g, '_');
      a.download = `EPRIS_${safeName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus('done');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      console.error('PDF generation failed:', err);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 4000);
    }
  };

  // Build the PDF contents list dynamically from the issue's articles.
  const contentsRows: { num: string; label: string }[] = [
    { num: '01', label: t('issue.coverLabel') },
    { num: '02', label: t('pdf.contents') },
  ];
  let n = 3;
  articles.forEach((article) => {
    contentsRows.push({ num: String(n++).padStart(2, '0'), label: `${t('issue.tocCover')} · ${article.title}` });
    contentsRows.push({ num: String(n++).padStart(2, '0'), label: `${t('issue.tocArticle')} · ${article.title}` });
  });

  return (
    <div className="pt-16 min-h-screen bg-[var(--c-bg)]">
      {/* Cinematic issue hero */}
      <div className="relative border-b border-[rgb(var(--c-accent-rgb)_/_0.2)] overflow-hidden">
        {/* Blurred cover wash backdrop */}
        <div className="absolute inset-0 pointer-events-none">
          <img
            src={issue.coverUrl}
            alt=""
            aria-hidden
            className="w-full h-full object-cover opacity-30 blur-2xl scale-125"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[rgb(var(--c-bg-rgb)_/_0.8)] via-[rgb(var(--c-bg-rgb)_/_0.85)] to-[var(--c-bg)]" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 sm:px-10 md:px-16 py-12 md:py-20 grid md:grid-cols-[1.5fr_1fr] gap-10 md:gap-16 items-center">
          {/* Title block */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[rgb(var(--c-accent-rgb)_/_0.45)] mb-5">
              {t('issue.edition')}{issue.number ? ` · ${issue.number}` : ''}
            </p>
            <h1
              style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
              className="text-[clamp(46px,8vw,92px)] leading-[0.96] text-[var(--c-accent)] mb-4"
            >
              {issue.name}
            </h1>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-[var(--c-gold)] mb-6">
              {issue.season}
            </p>
            {issue.tagline && (
              <p className="font-serif text-lg md:text-xl italic text-[rgb(var(--c-accent-rgb)_/_0.7)] max-w-md mb-8 leading-relaxed">
                {issue.tagline}
              </p>
            )}
            <DownloadButton status={status} onDownload={handleDownload} t={t} large />
          </motion.div>

          {/* Cover */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="hidden md:block"
          >
            <div className="aspect-[3/4] max-w-[280px] mx-auto overflow-hidden shadow-2xl ring-1 ring-[rgb(var(--c-accent-rgb)_/_0.1)]">
              <img
                src={issue.coverUrl}
                alt={`${issue.name} — ${issue.season}`}
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Editor's letter (per-issue, falls back to global translation) */}
      {(() => {
        const heading = (issue.letterHeading || '').trim() || t('issue.letter.heading');
        const body = (issue.letterBody || '').trim() || t('issue.letter.body');
        if (!heading && !body) return null;
        return (
          <div className="border-b border-[rgb(var(--c-accent-rgb)_/_0.15)] px-6 sm:px-10 md:px-16 py-12 md:py-20">
            <div className="max-w-2xl mx-auto">
              <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-[var(--c-gold)] mb-6">
                {t('pdf.letter.kicker')}
              </p>
              <h2 className="font-serif text-2xl md:text-4xl italic text-[var(--c-accent)] leading-snug mb-6">
                {heading}
              </h2>
              <div className="w-12 border-t border-[var(--c-gold)] mb-6" />
              {body.split('\n\n').map((p, i) => (
                <p key={i} className="font-serif text-base md:text-lg text-[rgb(var(--c-accent-rgb)_/_0.75)] leading-relaxed mb-4">
                  {p}
                </p>
              ))}
              <p className="font-serif text-lg italic text-[var(--c-accent)] mt-6">{(issue.letterSignature || '').trim() || 'Mariia Ivanova'}</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--c-accent-rgb)_/_0.4)] mt-1">
                {t('issue.letter.role')}
              </p>
            </div>
          </div>
        );
      })()}

      <div className="max-w-6xl mx-auto px-6 sm:px-10 md:px-16 py-12 md:py-20">

        {/* In this issue */}
        <div className="flex items-baseline justify-between gap-4 mb-8 md:mb-10">
          <h2 style={{ fontFamily: "var(--font-display)" }} className="text-2xl md:text-4xl text-[var(--c-accent)]">
            {t('issue.inThisIssue')}
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[rgb(var(--c-accent-rgb)_/_0.4)] whitespace-nowrap">
            {articles.length} {articles.length === 1 ? t('issue.story') : t('issue.stories')}
          </span>
        </div>

        {/* Article cards (scales with article count) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mb-14 md:mb-20">
          {articles.map((article, index) => {
            const cover = coverFor(article);
            return (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-8%' }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className="group cursor-pointer"
              >
                <div className="relative aspect-[3/4] bg-[#1a0812] overflow-hidden shadow-lg">
                  {cover ? (
                    <img
                      src={cover}
                      alt={article.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen size={24} className="text-[rgb(var(--c-gold-rgb)_/_0.3)]" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute top-3 left-3">
                    <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-[var(--c-bg)] bg-[rgb(var(--c-accent-rgb)_/_0.85)] backdrop-blur-sm px-2.5 py-1">
                      {article.category}
                    </span>
                  </div>
                  <span className="absolute bottom-3 right-3 font-mono text-[9px] text-[var(--c-bg)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-1">
                    {t('read.article')} <ArrowRight size={12} />
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="font-serif text-lg md:text-xl text-[var(--c-accent)] leading-tight mb-2 group-hover:text-[var(--c-gold)] transition-colors">
                    {article.title}
                  </h3>
                  <p className="font-serif text-sm text-[rgb(var(--c-accent-rgb)_/_0.55)] leading-relaxed line-clamp-3 mb-3">
                    {article.excerpt}
                  </p>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.35)]">
                    {article.author} · {article.date}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* PDF contents + bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="border-t border-[rgb(var(--c-accent-rgb)_/_0.2)] pt-10 grid grid-cols-1 md:grid-cols-2 gap-10 items-end"
        >
          {/* PDF Contents */}
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--c-accent-rgb)_/_0.4)] mb-4 flex items-center gap-2">
              <BookOpen size={11} />
              {t('issue.contents')}
            </p>
            <div className="space-y-2.5">
              {contentsRows.map(({ num, label }) => (
                <div key={num} className="flex items-baseline gap-3">
                  <span className="font-mono text-[9px] text-[var(--c-gold)] w-6 shrink-0">{num}</span>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-[rgb(var(--c-accent-rgb)_/_0.45)] truncate">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:items-end gap-3">
            <p className="font-serif text-2xl md:text-3xl text-[var(--c-accent)]">
              {t('issue.cta.title')}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.35)] sm:text-right">
              {t('issue.cta.spec')}
            </p>
            <div className="mt-1">
              <DownloadButton status={status} onDownload={handleDownload} t={t} large />
            </div>
          </div>
        </motion.div>

        {/* Archive of past issues */}
        {otherIssues.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="border-t border-[rgb(var(--c-accent-rgb)_/_0.2)] pt-10 mt-14 md:mt-20"
          >
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--c-accent-rgb)_/_0.4)] mb-6">
              {t('issue.archive')}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-6">
              {otherIssues.map(({ issue: pastIssue }) => (
                <button
                  key={pastIssue.id}
                  type="button"
                  onClick={() => setSelectedId(pastIssue.id)}
                  className="text-left group"
                >
                  <div className="relative aspect-[3/4] bg-[#1a0812] overflow-hidden shadow-md">
                    <img
                      src={pastIssue.coverUrl}
                      alt={`${pastIssue.name} — ${pastIssue.season}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <p className="mt-2 font-serif text-sm text-[var(--c-accent)] leading-tight truncate">
                    {pastIssue.name}
                  </p>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.35)]">
                    {pastIssue.season}
                  </p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function DownloadButton({
  status,
  onDownload,
  t,
  large = false,
}: {
  status: 'idle' | 'loading' | 'done' | 'error';
  onDownload: () => void;
  t: (key: string) => string;
  large?: boolean;
}) {
  const base = large
    ? 'flex items-center gap-3 px-8 py-4 font-mono text-xs uppercase tracking-widest border transition-all duration-300'
    : 'flex items-center gap-2 px-6 py-3 font-mono text-[10px] uppercase tracking-widest border transition-all duration-300 shrink-0';

  if (status === 'loading') {
    return (
      <div className={`${base} border-[rgb(var(--c-accent-rgb)_/_0.3)] text-[rgb(var(--c-accent-rgb)_/_0.4)] cursor-not-allowed`}>
        <span className="inline-block w-3 h-3 border border-[rgb(var(--c-accent-rgb)_/_0.4)] border-t-[var(--c-accent)] rounded-full animate-spin" />
        {t('issue.generating')}
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div className={`${base} border-[var(--c-gold)] text-[var(--c-gold)]`}>
        <ArrowRight size={large ? 16 : 13} />
        {t('issue.downloaded')}
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={`${base} border-red-400/50 text-red-600/70`}>
        {t('issue.tryagain')}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onDownload}
      className={`${base} border-[var(--c-accent)] text-[var(--c-accent)] hover:bg-[var(--c-accent)] hover:text-[var(--c-bg)]`}
    >
      <Download size={large ? 16 : 13} />
      {t('issue.download')}
    </button>
  );
}
