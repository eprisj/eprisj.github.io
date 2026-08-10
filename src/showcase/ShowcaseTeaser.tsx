import { useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { fetchWorks, type Work } from './showcaseApi';
import { getHomepageSettings } from '../data';

/**
 * Витрина на главной журнала.
 *
 * До этого /showcase существовал как отдельный маршрут без единой ссылки с
 * основного сайта: попасть туда можно было, только зная адрес. Раздел с
 * тридцатью девятью работами был невидим для читателя, пришедшего на главную.
 *
 * Блок сознательно НЕ повторяет верстку витрины: это анонс на четыре кадра, а
 * не вторая сетка. Полоса берёт свои цвета из токенов журнала, а не из палитры
 * витрины, — на главной она гость и должна читаться как часть номера.
 */
export function ShowcaseTeaser() {
  const [works, setWorks] = useState<Work[]>([]);
  const showcaseSettings = getHomepageSettings().showcase || {};
  const mode = showcaseSettings.mode === 'manual' ? 'manual' : 'auto';
  const featuredWorkIds = Array.isArray(showcaseSettings.featuredWorkIds)
    ? showcaseSettings.featuredWorkIds.map((id) => String(id).trim()).filter(Boolean)
    : [];
  const featuredKey = featuredWorkIds.join('|');

  useEffect(() => {
    const controller = new AbortController();
    // fetchWorks сам отдаёт запасной набор, если API недоступен, и никогда не
    // отклоняется — кроме отмены. Поэтому главная не может сломаться из-за
    // витрины: в худшем случае блок покажет запасные работы.
    fetchWorks(controller.signal)
      .then((result) => {
        const available = result.filter((work) => work.images?.[0]?.url && (!work.status || work.status === 'Published'));
        if (mode !== 'manual' || featuredWorkIds.length === 0) {
          setWorks(available.slice(0, 4));
          return;
        }
        const byId = new Map(available.map((work) => [String(work.id), work]));
        const selected = featuredWorkIds.map((id) => byId.get(id)).filter(Boolean) as Work[];
        setWorks(selected.slice(0, 4));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [mode, featuredKey]);

  const eyebrow = showcaseSettings.eyebrow || 'Showcase';
  const title = showcaseSettings.title || 'A vitrine of set design and conceptual art';
  const description = showcaseSettings.description || 'Rooms, windows, stages and installations by authors worldwide — read from the source, credited, and open for submissions.';
  const ctaLabel = showcaseSettings.ctaLabel || 'Open the vitrine';
  const ctaUrl = showcaseSettings.ctaUrl || '/showcase';

  if (works.length < 4) return null;

  return (
    <section className="border-t border-[rgb(var(--c-accent-rgb)_/_0.25)] bg-[var(--c-bg)] px-4 py-16 sm:px-8 md:px-16 md:py-24">
      <div className="mx-auto max-w-[1600px]">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.55)]">
              {eyebrow}
            </p>
            <h2 className="mt-4 max-w-[16ch] font-serif text-3xl leading-tight text-[var(--c-accent)] sm:text-4xl md:text-5xl">
              {title}
            </h2>
            <p className="mt-5 max-w-[52ch] font-serif text-base leading-relaxed text-[rgb(var(--c-accent-rgb)_/_0.72)] sm:text-lg">
              {description}
            </p>
          </div>
          <a
            href={ctaUrl}
            className="inline-flex min-h-12 w-fit shrink-0 items-center gap-3 border border-[rgb(var(--c-accent-rgb)_/_0.35)] px-6 font-mono text-xs uppercase tracking-widest text-[var(--c-accent)] transition-colors hover:bg-[var(--c-accent)] hover:text-[var(--c-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-accent)]"
          >
            {ctaLabel} <ArrowUpRight size={15} />
          </a>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {works.map((work) => (
            <a
              key={work.id}
              href="/showcase"
              className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--c-accent)]"
            >
              <span className="block aspect-[4/5] overflow-hidden bg-[rgb(var(--c-accent-rgb)_/_0.08)]">
                <img
                  src={work.images[0].url}
                  alt={work.title}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                />
              </span>
              <span className="mt-3 block font-serif text-lg leading-tight text-[var(--c-accent)] underline-offset-4 group-hover:underline">
                {work.title}
              </span>
              <span className="mt-1 block font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.55)]">
                {[work.author, work.city || work.country].filter(Boolean).join(' · ')}
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
