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
  onArticleClick,
}: {
  archive: { issue: Issue; articles: Article[] }[];
  t: (key: string) => string;
  /* Материал выпуска открывается по клику. Раньше карточка носила
     cursor-pointer и подсвечивалась при наведении, но не делала ничего:
     обещание без действия. */
  onArticleClick?: (article: Article) => void;
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

  /* Страница выпуска говорит тем же языком, что и «Статьи» с «Обзорами»:
     колонка max-w-4xl, сплошные рамки вместо теней и градиентов, один вид
     служебной подписи. До этого здесь жил отдельный диалект — скруглённые
     пилюли рядом с прямоугольными кнопками, размытая обложка-подложка с
     золотым радиальным градиентом, декоративные рамки вокруг обложки и
     коробка с тенью под оглавлением, — и на фоне остальных страниц он
     читался как чужая вёрстка. Вертикальные отступы срезаны примерно
     вдвое: воздух был рассчитан на десяток материалов, а выпуск обычно
     состоит из двух-трёх. */
  return (
    <div className="pt-16 min-h-screen bg-[var(--c-bg)]">

      {/* Шапка выпуска */}
      <div className="border-b border-[rgb(var(--c-accent-rgb)_/_0.18)]">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-10 sm:py-14 grid gap-8 sm:gap-12 sm:grid-cols-[1fr_minmax(200px,260px)] sm:items-end">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.55)] mb-5">
              {t('issue.edition')}{issue.number ? ` · ${issue.number}` : ''}{issue.season ? ` · ${issue.season}` : ''}
            </p>
            <h1
              style={{ fontFamily: 'var(--font-display)', fontWeight: 430 }}
              className="text-[clamp(40px,7vw,84px)] leading-[0.9] tracking-[-0.045em] text-[var(--c-accent)] text-balance"
            >
              {issue.name}
            </h1>
            {issue.tagline && (
              <p className="font-serif text-lg md:text-xl italic text-[rgb(var(--c-accent-rgb)_/_0.7)] mt-4 leading-relaxed">
                {issue.tagline}
              </p>
            )}
            <div className="flex flex-wrap items-stretch gap-3 mt-8">
              <DownloadButton status={status} onDownload={handleDownload} t={t} />
              <a
                href="#issue-contents"
                className="inline-flex items-center gap-2 border border-[rgb(var(--c-accent-rgb)_/_0.4)] px-6 py-3 font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.65)] transition-colors hover:border-[var(--c-accent)] hover:text-[var(--c-accent)]"
              >
                {t('issue.contents')}
                <ArrowRight size={13} aria-hidden="true" />
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            /* Обложку показываем и на телефоне: это главный образ выпуска, а
               прятать его на самом ходовом экране странно. Ширину ограничиваем,
               чтобы она не оттесняла заголовок ниже сгиба. */
            className="order-first sm:order-none w-40 sm:w-auto"
          >
            <div className="aspect-[3/4] overflow-hidden border border-[var(--c-accent)]">
              <img
                src={issue.coverUrl}
                alt={`${issue.name} — ${issue.season}`}
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Письмо редактора */}
      {(() => {
        const heading = (issue.letterHeading || '').trim() || t('issue.letter.heading');
        const body = (issue.letterBody || '').trim() || t('issue.letter.body');
        if (!heading && !body) return null;
        return (
          <div className="border-b border-[rgb(var(--c-accent-rgb)_/_0.14)]">
            <div className="max-w-4xl mx-auto px-5 sm:px-8 py-9 md:py-12">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.55)] mb-4">
                {t('pdf.letter.kicker')}
              </p>
              <h2 className="font-serif text-2xl md:text-3xl italic text-[var(--c-accent)] leading-snug mb-5">
                {heading}
              </h2>
              {body.split('\n\n').map((paragraph, i) => (
                <p key={i} className="font-serif text-base md:text-lg text-[rgb(var(--c-accent-rgb)_/_0.75)] leading-relaxed mb-4 max-w-2xl">
                  {paragraph}
                </p>
              ))}
              <p className="font-serif text-lg italic text-[var(--c-accent)] mt-6">
                {(issue.letterSignature || '').trim() || 'Mariia Ivanova'}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.4)] mt-1">
                {t('issue.letter.role')}
              </p>
            </div>
          </div>
        );
      })()}

      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-9 md:py-12">

        {/* Материалы выпуска */}
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[rgb(var(--c-accent-rgb)_/_0.18)] pb-4 mb-8">
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 430 }} className="text-2xl md:text-4xl tracking-[-0.03em] text-[var(--c-accent)]">
            {t('issue.inThisIssue')}
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.45)]">
            {articles.length} {articles.length === 1 ? t('issue.story') : t('issue.stories')}
          </span>
        </div>

        {/* Карточка материала повторяет карточку в «Статьях»: рамка, квадрат
            изображения слева, текст справа. */}
        <div className="space-y-5 mb-10">
          {articles.map((article, index) => {
            const cover = coverFor(article);
            return (
              <motion.article
                key={article.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-6%' }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                onClick={onArticleClick ? () => onArticleClick(article) : undefined}
                onKeyDown={onArticleClick ? (event) => {
                  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onArticleClick(article); }
                } : undefined}
                role={onArticleClick ? 'button' : undefined}
                tabIndex={onArticleClick ? 0 : undefined}
                aria-label={onArticleClick ? `${t('read.article')}: ${article.title}` : undefined}
                className={`group border border-[var(--c-accent)] grid grid-cols-1 sm:grid-cols-[minmax(0,190px)_1fr] items-stretch overflow-hidden ${onArticleClick ? 'cursor-pointer transition-colors hover:bg-[rgb(var(--c-accent-rgb)_/_0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-gold)]' : ''}`}
              >
                {/* Раньше картинка занимала 42% ширины квадратом и задавала высоту
                    всей карточке: под коротким анонсом оставалось полполосы пустоты,
                    а «Read article» уезжал далеко вниз от текста. Теперь колонка
                    обложки узкая и тянется по высоте текста, а не наоборот. */}
                <div className="h-56 sm:h-auto overflow-hidden bg-[#E8DED5]">
                  {cover ? (
                    <img
                      src={cover}
                      alt={article.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen size={22} className="text-[rgb(var(--c-accent-rgb)_/_0.3)]" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col p-4 sm:p-5">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.55)] mb-2">
                    {article.category}
                  </span>
                  <h3 className="font-serif text-xl md:text-2xl text-[var(--c-accent)] leading-tight mb-3">
                    {article.title}
                  </h3>
                  <p className="font-serif text-sm md:text-base text-[rgb(var(--c-accent-rgb)_/_0.62)] leading-relaxed">
                    {article.excerpt}
                  </p>
                  <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.4)]">
                      {article.author} · {article.date}
                    </p>
                    {onArticleClick && (
                      <span className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.55)] inline-flex items-center gap-1 transition-colors group-hover:text-[var(--c-accent)]">
                        {t('read.article')}
                        <ArrowRight size={12} aria-hidden="true" />
                      </span>
                    )}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>

        {/* Оглавление PDF и загрузка */}
        <div id="issue-contents" className="border-t border-[rgb(var(--c-accent-rgb)_/_0.18)] pt-8">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.55)] mb-5 flex items-center gap-2">
            <BookOpen size={12} aria-hidden="true" />
            {t('issue.contents')}
          </p>
          <ol className="mb-8">
            {contentsRows.map(({ num, label }) => (
              <li key={num} className="flex items-baseline gap-4 border-b border-[rgb(var(--c-accent-rgb)_/_0.12)] py-2.5">
                <span className="font-mono text-[10px] text-[rgb(var(--c-accent-rgb)_/_0.45)] w-6 shrink-0">{num}</span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.6)] truncate">{label}</span>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-serif text-xl md:text-2xl leading-tight text-[var(--c-accent)]">
                {t('issue.cta.title')}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.42)] mt-1">
                {t('issue.cta.spec')}
              </p>
            </div>
            <DownloadButton status={status} onDownload={handleDownload} t={t} />
          </div>
        </div>

        {/* Прошлые выпуски */}
        {otherIssues.length > 0 && (
          <div className="border-t border-[rgb(var(--c-accent-rgb)_/_0.18)] pt-8 mt-12">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.55)] mb-5">
              {t('issue.archive')}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
              {otherIssues.map(({ issue: pastIssue }) => (
                <button
                  key={pastIssue.id}
                  type="button"
                  onClick={() => setSelectedId(pastIssue.id)}
                  className="text-left group"
                >
                  <div className="aspect-[3/4] overflow-hidden border border-[rgb(var(--c-accent-rgb)_/_0.35)] transition-colors group-hover:border-[var(--c-accent)]">
                    <img
                      src={pastIssue.coverUrl}
                      alt={`${pastIssue.name} — ${pastIssue.season}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </div>
                  <p className="mt-2 font-serif text-sm text-[var(--c-accent)] leading-tight truncate">
                    {pastIssue.name}
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.4)]">
                    {pastIssue.season}
                  </p>
                </button>
              ))}
            </div>
          </div>
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
