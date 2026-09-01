import { useEffect, useRef, useState } from 'react';
import { CHAPTERS, bySlug, type Bars, type Chapter, type Concept, type Diagram, type SourceRow } from './chapters';
import { PROMPTS, PROMPT_GROUPS, byGroup, type Prompt } from './prompts';
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

/* Карточки понятий. Термин и определение в одну фразу, не путать с примером
   запроса: здесь ничего не копируют, здесь сверяют, тем ли словом названа
   вещь, о которой глава. */
function ConceptCards({ items }: { items: Concept[] }) {
  return (
    <div className="codex-concepts">
      {items.map((c) => (
        <div key={c.term} className="codex-concept">
          <span className="term">{c.term}</span>
          <p className="def">{c.def}</p>
        </div>
      ))}
    </div>
  );
}

/* Схема алгоритма: одна точка входа, несколько путей из неё. Набрана
   HTML-боксами и стрелками текстом, а не SVG-координатами: тот же список
   шагов должен остаться читаемым и на телефоне без пересчёта геометрии, а
   плашки решётки уже показали в этом мануале, к чему приводит точный расчёт
   поверх текста, который сам решает, сколько ему занять строк. */
function AlgorithmDiagram({ d }: { d: Diagram }) {
  return (
    <figure className="codex-diagram">
      <div className="root">{d.root}</div>
      <div className="branches">
        {d.branches.map((b) => (
          <div key={b.label} className={`branch ${b.kind}`}>
            <span className="label codex-mono">{b.kind === 'bad' ? 'Тупик' : 'Работает'} · {b.label}</span>
            {b.steps.map((s, i) => (
              <div key={i}>
                {i > 0 ? <div className="arrow" aria-hidden="true">↓</div> : null}
                <div className="step">{s}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </figure>
  );
}

/* Столбики сравнения. Иллюстрация к СВЕРЕННЫМ числам, поэтому единица и дата
   свода стоят в подписи, а не в примечании: величины вроде цен и размеров
   окна стареют, и страница обязана показывать, когда на них смотрели.
   Ширина в процентах от максимума в наборе, без осей и сетки: это сравнение
   порядка величин, а не график, по которому снимают значения. */
function BarChart({ b }: { b: Bars }) {
  const max = Math.max(...b.items.map((i) => i.value));
  return (
    <figure className="codex-bars">
      <figcaption>
        <span className="cap">{b.caption}</span>
        <span className="unit codex-mono">{b.unit}</span>
      </figcaption>
      {b.items.map((i) => (
        <div key={i.label} className="row">
          <span className="lbl">{i.label}</span>
          <span className="track">
            <span className="fill" style={{ width: `${(i.value / max) * 100}%` }} />
          </span>
          {i.note ? <span className="note">{i.note}</span> : null}
        </div>
      ))}
    </figure>
  );
}

/* Таблица источников: где брать данные по теме главы.
   Адреса настоящие и кликабельные, потому что «поищите на сайте музея» это
   не источник. Внешние ссылки с rel="noreferrer": уводить реферер издания
   на чужие службы незачем. */
function SourceTable({ rows }: { rows: SourceRow[] }) {
  return (
    <div className="codex-sources">
      <span className="codex-mono head">Где брать</span>
      {rows.map((r) => (
        <div key={r.url} className="src">
          <a className="name" href={r.url} target="_blank" rel="noreferrer">{r.name}</a>
          <p className="gives">{r.gives}</p>
          <p className="access codex-mono">{r.access}</p>
        </div>
      ))}
    </div>
  );
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

      {/* Весь текст главы это ОДНА ячейка решётки, а не строка на абзац.
          Пока каждый абзац был отдельной строкой, высоту первой строки задавал
          боковой блок с заголовком: он выше первого абзаца, строка тянулась по
          нему, и между первым и вторым абзацем открывалась дыра. Одна ячейка
          снимает вопрос совсем, а колонок по-прежнему две. */}
      <div className="codex-main">
        {ch.body.map((p, i) => (
          <p key={i} className="body">{p}</p>
        ))}

        {ch.concepts?.length ? <ConceptCards items={ch.concepts} /> : null}
        {ch.diagram ? <AlgorithmDiagram d={ch.diagram} /> : null}
        {ch.bars ? <BarChart b={ch.bars} /> : null}
        {ch.sources?.length ? <SourceTable rows={ch.sources} /> : null}

        {ch.samples?.map((s, i) => <SampleBlock key={i} s={s} />)}

        {ch.checklist?.length ? (
          <div className="codex-check">
            <span className="codex-mono">Коротко</span>
            <ul>
              {ch.checklist.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </div>
        ) : null}
      </div>
    </article>
  );
}

/* Одна заготовка с кнопкой копирования.
   Кнопка тут не украшение: библиотеку открывают, чтобы взять текст в работу,
   и выделять мышью многострочный блок с отступами неудобно. Состояние
   «скопировано» держится две секунды и возвращается само: подтверждение
   нужно в момент нажатия, а не навсегда. */
function PromptCard({ p }: { p: Prompt }) {
  const [state, setState] = useState<'idle' | 'copied' | 'selected'>('idle');
  const pre = useRef<HTMLPreElement>(null);

  /* Запись в буфер отказывает чаще, чем кажется: старый браузер, отказ в
     правах, страница не в фокусе, открытие из другого приложения. Молчаливая
     неудача тут худший исход: человек нажал и не понял, сработало или нет.
     Поэтому у кнопки есть запасной путь: выделить текст заготовки целиком,
     чтобы осталось нажать Cmd+C. Действие всегда заканчивается чем-то
     видимым. */
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(p.text);
      setState('copied');
    } catch {
      const node = pre.current;
      if (node) {
        const range = document.createRange();
        range.selectNodeContents(node);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        setState('selected');
      }
    }
    setTimeout(() => setState('idle'), 2400);
  };

  const label = state === 'copied' ? 'Скопировано'
    : state === 'selected' ? 'Выделено, нажмите Cmd+C'
    : 'Копировать';

  return (
    <article className="codex-prompt">
      <header>
        <div>
          <h3>{p.title}</h3>
          <p className="when">{p.when}</p>
        </div>
        <button type="button" className="codex-btn" onClick={copy}>{label}</button>
      </header>
      <pre ref={pre}>{p.text}</pre>
    </article>
  );
}

function PromptLibrary() {
  return (
    <>
      <section className="codex-open">
        <span className="codex-mono">Приложение</span>
        <h1>Библиотека запросов</h1>
        <p className="lead">
          Готовые заготовки под повторяющиеся задачи. Копируйте, заполняйте
          квадратные скобки, отправляйте.
        </p>
      </section>

      <div className="codex-note">
        <p>
          Квадратные скобки это места, которые надо заполнить перед отправкой.
          Если заполнять нечего, это обычно значит, что не приложен материал,
          а без материала работать нельзя: см. главу 02.
        </p>
        <p>
          Заготовки повторяют примеры из глав, но без объяснений. Если непонятно,
          почему запрос написан именно так, глава с разбором рядом.
        </p>
      </div>

      {PROMPT_GROUPS.map((g) => (
        <section key={g} className="codex-group">
          <span className="codex-mono">{g}</span>
          {byGroup(g).map((p) => <PromptCard key={p.id} p={p} />)}
        </section>
      ))}
    </>
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

  const isLibrary = single === 'prompty';
  const ch = single && !isLibrary ? bySlug(single) : null;

  useEffect(() => {
    document.title = isLibrary
      ? 'Библиотека запросов · Как работать с машиной · EPRIS'
      : ch
      ? `${ch.title} · Как работать с машиной · EPRIS`
      : 'Как работать с машиной · Мануал редакции EPRIS';
  }, [ch, isLibrary]);

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

        {isLibrary ? (
          <>
            <button type="button" className="codex-btn" onClick={() => go(null)}>
              ← Все главы
            </button>
            <PromptLibrary />
          </>
        ) : ch ? (
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

            <div className="codex-lib-link">
              <a href="/codex/prompty" onClick={(e) => { e.preventDefault(); go('prompty'); }}>
                <span className="codex-mono">Приложение</span>
                <span className="t">Библиотека запросов</span>
                <span className="s">{PROMPTS.length} готовых заготовок под повторяющиеся задачи. Копировать и заполнить.</span>
              </a>
            </div>

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
