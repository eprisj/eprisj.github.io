import { useEffect, useState } from 'react';
import { ENTRIES, bySlug, type Entry } from './entries';
import './codex.css';

/**
 * КОДЕКС: энциклопедия того, как эти системы сделаны.
 *
 * Набран как книга, а не как лента. В справочник приходят за одной статьёй и
 * уходят, поэтому у каждой свой адрес (/codex/<slug>), оглавление стоит до
 * текста, а перекрёстные ссылки внизу статьи ведут дальше по книге, а не
 * «назад к списку».
 *
 * Оформление намеренно не журнальное: см. codex.css, там объяснено почему.
 */

function slugFromPath(): string | null {
  const m = window.location.pathname.match(/^\/codex\/([^/]+)\/?$/);
  return m ? decodeURIComponent(m[1]) : null;
}

/* Статья целиком. Один компонент и для сплошного чтения, и для отдельного
   адреса: расходиться этим двум видам незачем, а два набора вёрстки для
   одного текста разъедутся при первой же правке. */
function Article({ entry, onGo }: { entry: Entry; onGo: (slug: string) => void }) {
  return (
    <article id={entry.slug} className="codex-entry">
      <div className="codex-side">
        <h2>{entry.term}</h2>
        <p className="sense">{entry.sense}</p>
      </div>

      {entry.body.map((p, i) => (
        <p key={i} className="body">{p}</p>
      ))}

      <div className="codex-evidence">
        <span className="codex-mono">{entry.evidence.system}</span>
        <p>{entry.evidence.text}</p>
      </div>

      {entry.see?.length ? (
        <p className="codex-see">
          <span className="codex-mono">Смотри также</span>
          {entry.see.map((s) => {
            const target = bySlug(s);
            if (!target) return null;
            return (
              <a
                key={s}
                href={`/codex/${s}`}
                onClick={(e) => { e.preventDefault(); onGo(s); }}
              >
                {target.term}
              </a>
            );
          })}
        </p>
      ) : null}
    </article>
  );
}

export function CodexPage() {
  const [single, setSingle] = useState<string | null>(slugFromPath());

  /* Кнопка «назад» обязана работать в справочнике: по нему ходят ссылками,
     а не только сверху вниз. */
  useEffect(() => {
    const onPop = () => setSingle(slugFromPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const go = (slug: string | null) => {
    const path = slug ? `/codex/${slug}` : '/codex';
    if (window.location.pathname !== path) window.history.pushState(null, '', path);
    setSingle(slug);
    window.scrollTo(0, 0);
  };

  const entry = single ? bySlug(single) : null;

  useEffect(() => {
    document.title = entry
      ? `${entry.term} · Искусство создавать искусство · EPRIS`
      : 'Искусство создавать искусство · EPRIS';
  }, [entry]);

  return (
    <div className="codex-root">
      <div className="codex-shell">
        <header className="codex-head">
          <a className="wm" href="/">EPRIS</a>
          <a className="back codex-mono" href="/codex" onClick={(e) => { e.preventDefault(); go(null); }}>
            Кодекс
          </a>
          <span className="right codex-mono">{ENTRIES.length} статей</span>
        </header>

        {entry ? (
          <>
            <button type="button" className="codex-btn" onClick={() => go(null)}>
              ← Все статьи
            </button>
            <Article entry={entry} onGo={go} />
          </>
        ) : (
          <>
            <section className="codex-open">
              <span className="codex-mono">Кодекс практики</span>
              <h1>Искусство создавать искусство</h1>
              <p className="lead">
                Рабочая энциклопедия того, как на самом деле собраны полтора десятка живых
                систем: в разговоре с машиной, за пару лет, по большей части через ошибки.
              </p>
            </section>

            <div className="codex-note">
              <p>
                Каждая статья это термин, который работа заставила появиться, и у каждой указана
                система, откуда он взялся, и что там случилось. Ни одной выдуманной иллюстрации:
                музеи, магазин, архив, радиостанция и учительская мастерская работают, а описанные
                провалы стоили настоящего времени.
              </p>
              <p>
                Это не руководство по запросам к модели и не доказательство, что машина умна.
                Большинство статей о том, как устроить работу, чтобы беглость не сходила за знание.
                В том числе беглость машины, и в том числе те разы, когда она объявляла победу,
                померив по закэшированному файлу. Ради этой части книгу и стоит читать.
              </p>
            </div>

            <nav className="codex-toc">
              <span className="codex-mono">Содержание</span>
              <ol>
                {ENTRIES.map((e, i) => (
                  <li key={e.slug}>
                    <a
                      href={`/codex/${e.slug}`}
                      onClick={(ev) => { ev.preventDefault(); go(e.slug); }}
                    >
                      <span className="n">{String(i + 1).padStart(2, '0')}</span>
                      <span className="t">{e.term}</span>
                      <span className="s">{e.sense}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            {ENTRIES.map((e) => (
              <Article key={e.slug} entry={e} onGo={go} />
            ))}
          </>
        )}

        <footer className="codex-foot">
          <span className="codex-mono">EPRIS · Кодекс практики</span>
          <a className="codex-btn" href="/">В журнал</a>
        </footer>
      </div>
    </div>
  );
}
