import { useEffect, useState } from 'react';
import { MODULES, AUTHOR, COURSE_TITLE, byModuleSlug, type Module, type Task } from './course';
import '../codex/codex.css';
import './expertise.css';

/**
 * КУРС про машину в искусствоведческой экспертизе.
 *
 * Оформление берётся из мануала целиком: обёртка та же .codex-root, стили
 * импортируются, а не копируются. Курс и мануал написаны одним человеком для
 * одного круга читателей, и разводить им типографику значило бы заводить
 * второй набор токенов, который разъедется при первой же правке. Свой файл
 * expertise.css добавляет только то, чего в мануале нет: шапку курса с
 * авторством, цели модуля, задание и красные флаги.
 *
 * Отличие от мануала по существу одно, и оно в жанре. Мануал листают, курс
 * проходят, поэтому здесь есть порядок модулей, цели в начале каждого и
 * задание в конце. Задание выполняется на своём материале: на учебном
 * примере эта работа не ставится.
 */

function slugFromPath(): string | null {
  const m = window.location.pathname.match(/^\/expertise\/([^/]+)\/?$/);
  return m ? decodeURIComponent(m[1]) : null;
}

/* Подсветка маркером и прописная врезка: те же приёмы, что в мануале.
   Дублируются здесь намеренно, а не выносятся в общий модуль: это десяток
   строк, а связывать две страницы общим кодом ради них значит связать их
   правками навсегда. Если приёмов станет больше, тогда и выносить. */
function Marked({ text }: { text: string }) {
  const parts = text.split(/==([^=]+)==/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <mark key={i}>{part}</mark> : <span key={i}>{part}</span>
      )}
    </>
  );
}

const LEAD_IN = /^([А-ЯЁ][А-ЯЁ\s]*(?:,\s[А-ЯЁ][А-ЯЁ\s]*)*)([.,:])(\s)/;

function Body({ text }: { text: string }) {
  const m = text.match(LEAD_IN);
  if (!m || m[1].trim().length < 4) return <Marked text={text} />;
  return (
    <>
      <span className="lead-in">{m[1]}{m[2]}</span>
      {m[3]}
      <Marked text={text.slice(m[0].length)} />
    </>
  );
}

/* Пример запроса. Тот же блок, что в мануале: слушатель узнаёт его в лицо. */
function SampleBlock({ s }: { s: NonNullable<Module['samples']>[number] }) {
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

/* Красные флаги. Единственное место в курсе, где список набран запретами.
   Стоят они ПЕРЕД заданием, а не в конце модуля: слушатель идёт делать
   работу, и запреты должны быть последним, что он прочёл до этого. */
function NeverList({ items }: { items: string[] }) {
  return (
    <div className="course-never">
      <span className="codex-mono">Не делайте этого никогда</span>
      <ul>
        {items.map((t, i) => <li key={i}>{t}</li>)}
      </ul>
    </div>
  );
}

/* Задание. Материал свой: курс его не поставляет и не может поставлять,
   потому что экспертиза ставится только на настоящем деле. Строка «сделано»
   формулируется через проверяемый результат, а не через «понять» и
   «ознакомиться»: иначе задание можно имитировать, не выполнив. */
function TaskBlock({ t }: { t: Task }) {
  return (
    <section className="course-task">
      <span className="codex-mono">Задание</span>
      <h3>{t.title}</h3>
      <p className="mat"><strong>Материал:</strong> {t.material}</p>
      <ol>
        {t.steps.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
      <p className="done"><strong>Сделано, если:</strong> {t.done}</p>
    </section>
  );
}

function ModuleView({ m }: { m: Module }) {
  return (
    <article id={m.slug} className="codex-entry">
      <div className="codex-side">
        <span className="codex-mono num">Модуль {m.num}</span>
        <h2>{m.title}</h2>
        <p className="sense">{m.sense}</p>
      </div>

      <div className="codex-main">
        <div className="course-goals">
          <span className="codex-mono">Чему учит модуль</span>
          <ul>
            {m.goals.map((g, i) => <li key={i}>{g}</li>)}
          </ul>
        </div>

        {m.body.map((p, i) => (
          <p key={i} className="body"><Body text={p} /></p>
        ))}

        {m.samples?.map((s, i) => <SampleBlock key={i} s={s} />)}
        {m.never?.length ? <NeverList items={m.never} /> : null}
        {m.task ? <TaskBlock t={m.task} /> : null}
      </div>
    </article>
  );
}

export function ExpertisePage() {
  const [single, setSingle] = useState<string | null>(slugFromPath());

  useEffect(() => {
    const onPop = () => setSingle(slugFromPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const go = (slug: string | null) => {
    const path = slug ? `/expertise/${slug}` : '/expertise';
    if (window.location.pathname !== path) window.history.pushState(null, '', path);
    setSingle(slug);
    window.scrollTo(0, 0);
  };

  const mod = single ? byModuleSlug(single) : null;
  const idx = mod ? MODULES.findIndex((m) => m.slug === mod.slug) : -1;
  const next = idx >= 0 && idx < MODULES.length - 1 ? MODULES[idx + 1] : null;
  const prev = idx > 0 ? MODULES[idx - 1] : null;

  useEffect(() => {
    document.title = mod
      ? `${mod.title} · ${COURSE_TITLE} · EPRIS`
      : `${COURSE_TITLE} · Курс · EPRIS`;
  }, [mod]);

  return (
    <div className="codex-root course-root" lang="ru">
      <div className="codex-shell">
        <header className="codex-head">
          <a className="wm" href="/">EPRIS</a>
          <a className="back codex-mono" href="/expertise" onClick={(e) => { e.preventDefault(); go(null); }}>
            Курс
          </a>
          <span className="right codex-mono">{MODULES.length} модулей</span>
        </header>

        {mod ? (
          <>
            <button type="button" className="codex-btn" onClick={() => go(null)}>
              ← Все модули
            </button>
            <ModuleView m={mod} />
            {/* Курс проходят по порядку, поэтому внизу модуля стоит именно
                следующий, а не список похожего, как в мануале. */}
            <nav className="course-nav">
              {prev ? (
                <a href={`/expertise/${prev.slug}`} onClick={(e) => { e.preventDefault(); go(prev.slug); }}>
                  <span className="codex-mono">Назад, модуль {prev.num}</span>
                  <span className="t">{prev.title}</span>
                </a>
              ) : <span />}
              {next ? (
                <a className="fwd" href={`/expertise/${next.slug}`} onClick={(e) => { e.preventDefault(); go(next.slug); }}>
                  <span className="codex-mono">Дальше, модуль {next.num}</span>
                  <span className="t">{next.title}</span>
                </a>
              ) : (
                <span className="course-end codex-mono">Это последний модуль курса</span>
              )}
            </nav>
          </>
        ) : (
          <>
            <section className="codex-open">
              <span className="codex-mono">Курс</span>
              <h1>{COURSE_TITLE}</h1>
              <p className="byline codex-mono">{AUTHOR}</p>
              <p className="lead">
                Восемь модулей о том, что машина в экспертизе делает надёжно, чего
                не делает никогда и почему граница между этим проходит там, где
                проходит. Провенанс, атрибуция, датировка, лабораторные данные,
                подделки, заключение, ответственность.
              </p>
            </section>

            <div className="codex-note">
              <p>
                Курс написан для тех, кто подписывает заключения. Отсюда его тон:
                это единственная область, где выдуманная ссылка перестаёт быть
                конфузом и становится концом практики, и весь материал построен
                вокруг одной границы. Машина работает с тем, что принесли вы, и
                ничего не поставляет в текст сама.
              </p>
              <p>
                Модули идут в жёстком порядке и опираются друг на друга. В каждом
                есть задание, и выполняется оно на вашем собственном материале:
                на учебном примере эта работа не ставится. Если своего дела под
                рукой нет, возьмите любую вещь, прошедшую через ваши руки.
              </p>
            </div>

            <nav className="codex-toc course-toc">
              <span className="codex-mono">Программа</span>
              <ol>
                {MODULES.map((m) => (
                  <li key={m.slug}>
                    <a href={`/expertise/${m.slug}`} onClick={(ev) => { ev.preventDefault(); go(m.slug); }}>
                      <span className="n">{m.num}</span>
                      <span className="t">{m.title}</span>
                      <span className="s">{m.sense}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            <div className="course-related">
              <a href="/codex">
                <span className="codex-mono">Рядом</span>
                <span className="t">Как работать с машиной</span>
                <span className="s">
                  Мануал редакции о том же инструменте, но для работы над текстом
                  и исследованием. Курс опирается на него и местами прямо
                  ссылается.
                </span>
              </a>
            </div>

            {MODULES.map((m) => <ModuleView key={m.slug} m={m} />)}
          </>
        )}

        <footer className="codex-foot">
          <span className="codex-mono">EPRIS · {AUTHOR}</span>
          <a className="codex-btn" href="/">В журнал</a>
        </footer>
      </div>
    </div>
  );
}
