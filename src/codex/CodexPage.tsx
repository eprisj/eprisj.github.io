import { useEffect, useState } from 'react';
import { CHAPTERS, bySlug, type Chapter } from './chapters';
import './codex.css';

/**
 * МАНУАЛ по работе с машиной для редакции.
 *
 * Адресат не программист, а архитектор и исследователь искусства, который
 * ведёт издание. Отсюда всё устройство страницы: главы вместо словарных
 * статей, примеры запросов вместо кода, список для самопроверки в конце
 * каждой главы.
 *
 * Главное на странице это примеры. Абзацы объясняют, а работать читатель
 * будет по образцу, поэтому образец набран так, чтобы его было видно с
 * прокрутки, и так, чтобы его удобно было скопировать.
 *
 * Оформление намеренно не журнальное: см. codex.css, там объяснено почему.
 */

function slugFromPath(): string | null {
  const m = window.location.pathname.match(/^\/codex\/([^/]+)\/?$/);
  return m ? decodeURIComponent(m[1]) : null;
}

/* Пример запроса. Пара «так не работает / так работает» там, где неудачный
   вариант поучителен, и один хороший там, где показывать нечего. */
function SampleBlock({ s }: { s: Chapter['samples'] extends (infer U)[] | undefined ? U : never }) {
  return (
    <figure className="codex-sample">
      <figcaption className="codex-mono">{s.task}</figcaption>
      {s.bad ? (
        <div className="row bad">
          <span className="codex-mono lbl">Так не работает</span>
          <p>{s.bad}</p>
        </div>
      ) : null}
      <div className="row good">
        <span className="codex-mono lbl">Так работает</span>
        <p>{s.good}</p>
      </div>
      <p className="why">{s.why}</p>
    </figure>
  );
}

/* Глава целиком. Один компонент и для сплошного чтения, и для отдельного
   адреса: расходиться этим двум видам незачем, а два набора вёрстки для
   одного текста разъедутся при первой же правке. */
function ChapterView({ ch }: { ch: Chapter }) {
  return (
    <article id={ch.slug} className="codex-entry">
      <div className="codex-side">
        <span className="codex-mono num">Глава {ch.num}</span>
        <h2>{ch.title}</h2>
        <p className="sense">{ch.sense}</p>
      </div>

      {ch.body.map((p, i) => (
        <p key={i} className="body">{p}</p>
      ))}

      {ch.samples?.map((s, i) => <SampleBlock key={i} s={s} />)}

      {ch.checklist?.length ? (
        <div className="codex-check">
          <span className="codex-mono">Коротко</span>
          <ul>
            {ch.checklist.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

export function CodexPage() {
  const [single, setSingle] = useState<string | null>(slugFromPath());

  /* Кнопка «назад» обязана работать: по мануалу ходят ссылками, а не только
     сверху вниз. */
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

  const ch = single ? bySlug(single) : null;

  useEffect(() => {
    document.title = ch
      ? `${ch.title} · Как работать с машиной · EPRIS`
      : 'Как работать с машиной · Мануал редакции EPRIS';
  }, [ch]);

  return (
    <div className="codex-root">
      <div className="codex-shell">
        <header className="codex-head">
          <a className="wm" href="/">EPRIS</a>
          <a className="back codex-mono" href="/codex" onClick={(e) => { e.preventDefault(); go(null); }}>
            Мануал
          </a>
          <span className="right codex-mono">{CHAPTERS.length} глав</span>
        </header>

        {ch ? (
          <>
            <button type="button" className="codex-btn" onClick={() => go(null)}>
              ← Все главы
            </button>
            <ChapterView ch={ch} />
            <nav className="codex-see">
              <span className="codex-mono">Дальше</span>
              {CHAPTERS.filter((c) => c.slug !== ch.slug).slice(0, 3).map((c) => (
                <a key={c.slug} href={`/codex/${c.slug}`} onClick={(e) => { e.preventDefault(); go(c.slug); }}>
                  {c.title}
                </a>
              ))}
            </nav>
          </>
        ) : (
          <>
            <section className="codex-open">
              <span className="codex-mono">Мануал редакции</span>
              <h1>Как работать с машиной</h1>
              <p className="lead">
                Практическое руководство для тех, кто пишет, исследует и ведёт издание.
                Что ей поручать, как формулировать просьбу, как проверять результат и
                чего от неё не бывает никогда.
              </p>
            </section>

            <div className="codex-note">
              <p>
                Здесь нет ни слова про устройство машины и ничего для программистов. Всё
                написано под работу редакции: экспликация к выставке, каталожная запись,
                подготовка к интервью, проверка цитаты, перевод на язык, которого вы не
                знаете, сборка номера.
              </p>
              <p>
                Главное в мануале это примеры запросов. Абзацы объясняют, но работать вы
                будете по образцу, поэтому в каждой главе стоят настоящие формулировки:
                как обычно пишут, почему так не выходит, и как написать, чтобы вышло.
              </p>
            </div>

            <nav className="codex-toc">
              <span className="codex-mono">Содержание</span>
              <ol>
                {CHAPTERS.map((c) => (
                  <li key={c.slug}>
                    <a href={`/codex/${c.slug}`} onClick={(ev) => { ev.preventDefault(); go(c.slug); }}>
                      <span className="n">{c.num}</span>
                      <span className="t">{c.title}</span>
                      <span className="s">{c.sense}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            {CHAPTERS.map((c) => <ChapterView key={c.slug} ch={c} />)}
          </>
        )}

        <footer className="codex-foot">
          <span className="codex-mono">EPRIS · Мануал редакции</span>
          <a className="codex-btn" href="/">В журнал</a>
        </footer>
      </div>
    </div>
  );
}
