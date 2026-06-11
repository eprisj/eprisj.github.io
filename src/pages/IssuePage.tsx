import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, BookOpen, ArrowRight } from 'lucide-react';
import type { Article } from '../data';

const COVER_BASE =
  'https://raw.githubusercontent.com/eprisj/eprisj.github.io/main/%D1%81over';

const MAIN_COVER = `${COVER_BASE}/main_cover.PNG`;
const ARTICLE_COVERS: Record<number, string> = {
  8: `${COVER_BASE}/cover_hover.jpg`,
  9: `${COVER_BASE}/cover_treshold.jpg`,
};

export function IssuePage({ articles }: { articles: Article[] }) {
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
      const blob = await pdf(
        createElement(MagazinePDF, { articles, baseUrl })
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'EPRIS_Issue_15_Spring_2026.pdf';
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

  return (
    <div className="pt-16 min-h-screen bg-[#F5F0EB]">
      {/* Issue header banner */}
      <div className="border-b border-[#501a2c]/20 px-6 sm:px-10 md:px-16 py-10 md:py-16">
        <div className="max-w-6xl mx-auto">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#501a2c]/40 mb-3">
            Electronic Edition
          </p>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <h1 className="font-serif text-5xl md:text-7xl text-[#501a2c] leading-none mb-2">
                Issue 15
              </h1>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#C9A690]">
                Spring 2026
              </p>
            </div>
            <DownloadButton status={status} onDownload={handleDownload} />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 sm:px-10 md:px-16 py-12 md:py-20">
        {/* Main cover + article grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10 mb-16 md:mb-24">
          {/* Main cover — big */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="md:col-span-5 lg:col-span-4"
          >
            <div className="relative aspect-[3/4] bg-[#1a0812] overflow-hidden border border-[#501a2c]/20 shadow-xl">
              <img
                src={MAIN_COVER}
                alt="EPRIS Issue 15 — Spring 2026"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 inset-x-0 bg-[#501a2c]/80 backdrop-blur-sm px-5 py-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#C9A690] mb-1">
                  EPRIS Journal
                </p>
                <p className="font-serif text-base text-[#F5F0EB] leading-tight">
                  Issue 15 · Spring 2026
                </p>
              </div>
            </div>
          </motion.div>

          {/* Articles in this issue */}
          <div className="md:col-span-7 lg:col-span-8 flex flex-col gap-6 justify-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#501a2c]/40 mb-2">
              In This Issue
            </p>

            {articles.map((article, index) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + index * 0.1 }}
                className="group"
              >
                <div className="flex gap-5 items-start border-b border-[#501a2c]/10 pb-6">
                  {/* Article cover thumbnail */}
                  <div className="w-20 sm:w-28 shrink-0 aspect-[2/3] bg-[#1a0812] overflow-hidden">
                    {ARTICLE_COVERS[article.id] ? (
                      <img
                        src={ARTICLE_COVERS[article.id]}
                        alt={article.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen size={16} className="text-[#C9A690]/40" />
                      </div>
                    )}
                  </div>

                  {/* Article info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#C9A690] mb-2">
                      {article.category}
                    </p>
                    <h3 className="font-serif text-xl sm:text-2xl md:text-3xl text-[#501a2c] leading-tight mb-3">
                      {article.title}
                    </h3>
                    <p className="font-serif text-sm text-[#501a2c]/60 leading-relaxed line-clamp-3 mb-3">
                      {article.excerpt}
                    </p>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-[#501a2c]/40">
                      {article.author} · {article.date}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* PDF structure info */}
            <div className="mt-4 p-5 border border-[#501a2c]/10 bg-[#E8DED5]/40">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#501a2c]/40 mb-3 flex items-center gap-2">
                <BookOpen size={11} />
                PDF Contents
              </p>
              <div className="space-y-2">
                {[
                  { num: '01', label: 'Issue Cover' },
                  { num: '02', label: 'Contents' },
                  { num: '03', label: `Cover · ${articles[0]?.title ?? ''}` },
                  { num: '04', label: `Article · ${articles[0]?.title ?? ''}` },
                  { num: '05', label: `Cover · ${articles[1]?.title ?? ''}` },
                  { num: '06', label: `Article · ${articles[1]?.title ?? ''}` },
                ].map(({ num, label }) => (
                  <div key={num} className="flex items-center gap-3">
                    <span className="font-mono text-[9px] text-[#C9A690] w-6 shrink-0">{num}</span>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-[#501a2c]/50 truncate">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="border-t border-[#501a2c]/20 pt-12 flex flex-col sm:flex-row items-center gap-6 justify-between"
        >
          <div>
            <p className="font-serif text-xl sm:text-2xl text-[#501a2c] mb-1">
              Download the full magazine
            </p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/40">
              A4 · PDF · Print-ready
            </p>
          </div>
          <DownloadButton status={status} onDownload={handleDownload} large />
        </motion.div>
      </div>
    </div>
  );
}

function DownloadButton({
  status,
  onDownload,
  large = false,
}: {
  status: 'idle' | 'loading' | 'done' | 'error';
  onDownload: () => void;
  large?: boolean;
}) {
  const base = large
    ? 'flex items-center gap-3 px-8 py-4 font-mono text-xs uppercase tracking-widest border transition-all duration-300'
    : 'flex items-center gap-2 px-6 py-3 font-mono text-[10px] uppercase tracking-widest border transition-all duration-300 shrink-0';

  if (status === 'loading') {
    return (
      <div className={`${base} border-[#501a2c]/30 text-[#501a2c]/40 cursor-not-allowed`}>
        <span className="inline-block w-3 h-3 border border-[#501a2c]/40 border-t-[#501a2c] rounded-full animate-spin" />
        Generating…
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div className={`${base} border-[#C9A690] text-[#C9A690]`}>
        <ArrowRight size={large ? 16 : 13} />
        Downloaded
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={`${base} border-red-400/50 text-red-600/70`}>
        Error — try again
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
      Download PDF
    </button>
  );
}
