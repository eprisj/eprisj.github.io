import { useEffect } from 'react';
import './sunset.css';

/**
 * «Sunset of the Midnight Sun», страница готовящейся книги.
 *
 * Чёрным по белому, как обложка книги (design/cover.typ в папке книги) и
 * как нынешние токены журнала. Тексты взяты из книги, а не придуманы:
 * аннотация с задней обложки, описание из epub-meta.yaml, имя автора в том
 * написании, что стоит на обложке.
 *
 * Форма подписки пока не создана: без неё кнопка не показывается.
 */

const BOOK = {
  title: 'Sunset of the Midnight Sun',
  kind: 'A Novel · Revised edition',
  author: 'Vyacheslav Munister',
  authorRole: 'Co-editor, EPRIS Journal',
  status: 'Coming soon',
  cover: '/uploads/sunset-of-the-midnight-sun-cover.jpg',
  hook: 'The last stronghold on the Pacific has fallen.',
  blurb: [
    'Autumn 1922. A steamer slips out of Vladivostok with hundreds of people who have lost a country and are not sure what they are carrying instead. A storm, a wreck on the coast of the Alaska Panhandle, a winter among strangers, and an old story about who gets to call a land theirs.',
    'Sunset of the Midnight Sun follows a crowd of ordinary and extraordinary people as their certainties come down, one after another, in a light that will not go out.',
  ],
  languages: 'English',
  expected: '2026',
  formats: 'Paperback · ebook',
  /* TBD: форма подписки создаётся в админке (Формы) с этим slug; ответы
     приходят редакции в почту и Telegram, как у остальных форм. Пока формы
     нет, кнопка не показывается. */
  notifyForm: '',
};

export function SunsetPage() {
  /* Гарнитуры книги (design/template.typ): EB Garamond для текста,
     Cormorant Garamond для заголовков. Журнал их не грузит, поэтому
     подключаются только здесь. */
  useEffect(() => {
    const id = 'sunset-fonts';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap';
      document.head.appendChild(link);
    }
    document.title = `${BOOK.title} · ${BOOK.author} | EPRIS Journal`;
  }, []);

  return (
    <div className="sunset-root">
      <header className="sunset-top">
        <a href="/" className="sunset-mark">EPRIS</a>
        <span>EPRIS / Fiction</span>
      </header>

      <main className="sunset-main">
        <div className="sunset-cover">
          <img src={BOOK.cover} alt={`Cover of ${BOOK.title} by ${BOOK.author}`} width={900} height={1350} />
        </div>

        <section className="sunset-text">
          <p className="sunset-status">{BOOK.status}</p>
          <h1>{BOOK.title}</h1>
          <p className="sunset-kind">{BOOK.kind}</p>
          <p className="sunset-by">
            {BOOK.author}
            <span>{BOOK.authorRole}</span>
          </p>

          <p className="sunset-hook">{BOOK.hook}</p>
          {BOOK.blurb.map((p, i) => <p key={i} className={i === 0 ? 'sunset-blurb sunset-lead' : 'sunset-blurb'}>{p}</p>)}
          <p className="sunset-ornament" aria-hidden>❦</p>

          <dl className="sunset-facts">
            <div><dt>Language</dt><dd>{BOOK.languages}</dd></div>
            <div><dt>Expected</dt><dd>{BOOK.expected}</dd></div>
            <div><dt>Formats</dt><dd>{BOOK.formats}</dd></div>
          </dl>

          {BOOK.notifyForm ? (
            <a className="sunset-notify" href={`/f/${BOOK.notifyForm}`}>Notify me when it’s out</a>
          ) : (
            <p className="sunset-follow">
              Follow <a href="/">EPRIS Journal</a> for news of the release.
            </p>
          )}
        </section>
      </main>

      <footer className="sunset-foot">© 2026 EPRIS Journal · Milano · Italia</footer>
    </div>
  );
}
