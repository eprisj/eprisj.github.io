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
  issue,
  articles,
  t,
}: {
  issue: Issue;
  articles: Article[];
  t: (key: string) => string;
}) {
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
    <div className="pt-16 min-h-screen bg-[#F5F0EB]">
      {/* Issue header banner */}
      <div className="border-b border-[#501a2c]/20 px-6 sm:px-10 md:px-16 py-10 md:py-16">
        <div className="max-w-6xl mx-auto">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#501a2c]/40 mb-3">
            {t('issue.edition')}
          </p>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <h1 className="font-serif text-5xl md:text-7xl text-[#501a2c] leading-none mb-2">
                {issue.name}
              </h1>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#C9A690]">
                {issue.season}
              </p>
            </div>
            <DownloadButton status={status} onDownload={handleDownload} t={t} />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 sm:px-10 md:px-16 py-12 md:py-20">

        {/* Cover grid: issue cover + article cards (scales with article count) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mb-14 md:mb-20">

          {/* Issue cover */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative aspect-[3/4] bg-[#1a0812] overflow-hidden shadow-lg">
              <img
                src={issue.coverUrl}
                alt={`${issue.name} — ${issue.season}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 inset-x-0 bg-[#501a2c] px-4 py-3">
                <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#C9A690] mb-0.5">
                  EPRIS Journal
                </p>
                <p className="font-serif text-sm text-[#F5F0EB] leading-tight">
                  {issue.name} · {issue.season}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#501a2c]/30 mb-1">
                {t('issue.label')}
              </p>
              <p className="font-serif text-lg text-[#501a2c] leading-tight">
                {issue.season}
              </p>
            </div>
          </motion.div>

          {/* Article cards */}
          {articles.map((article, index) => {
            const cover = coverFor(article);
            return (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.12 + index * 0.1 }}
              >
                <div className="relative aspect-[3/4] bg-[#1a0812] overflow-hidden shadow-lg">
                  {cover ? (
                    <img
                      src={cover}
                      alt={article.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen size={24} className="text-[#C9A690]/30" />
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-[#501a2c] px-4 py-3">
                    <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#C9A690]">
                      {article.category}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="font-serif text-lg md:text-xl text-[#501a2c] leading-tight mb-2">
                    {article.title}
                  </h3>
                  <p className="font-serif text-sm text-[#501a2c]/55 leading-relaxed line-clamp-3 mb-3">
                    {article.excerpt}
                  </p>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-[#501a2c]/35">
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
          className="border-t border-[#501a2c]/20 pt-10 grid grid-cols-1 md:grid-cols-2 gap-10 items-end"
        >
          {/* PDF Contents */}
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#501a2c]/40 mb-4 flex items-center gap-2">
              <BookOpen size={11} />
              {t('issue.contents')}
            </p>
            <div className="space-y-2.5">
              {contentsRows.map(({ num, label }) => (
                <div key={num} className="flex items-baseline gap-3">
                  <span className="font-mono text-[9px] text-[#C9A690] w-6 shrink-0">{num}</span>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-[#501a2c]/45 truncate">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:items-end gap-3">
            <p className="font-serif text-2xl md:text-3xl text-[#501a2c]">
              {t('issue.cta.title')}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/35 sm:text-right">
              {t('issue.cta.spec')}
            </p>
            <div className="mt-1">
              <DownloadButton status={status} onDownload={handleDownload} t={t} large />
            </div>
          </div>
        </motion.div>
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
      <div className={`${base} border-[#501a2c]/30 text-[#501a2c]/40 cursor-not-allowed`}>
        <span className="inline-block w-3 h-3 border border-[#501a2c]/40 border-t-[#501a2c] rounded-full animate-spin" />
        {t('issue.generating')}
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div className={`${base} border-[#C9A690] text-[#C9A690]`}>
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
      className={`${base} border-[#501a2c] text-[#501a2c] hover:bg-[#501a2c] hover:text-[#F5F0EB]`}
    >
      <Download size={large ? 16 : 13} />
      {t('issue.download')}
    </button>
  );
}
