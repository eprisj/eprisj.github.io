import { useEffect } from 'react';
import { Burst } from './Burst';
import './sunset.css';

/**
 * «Sunset of the Midnight Sun», страница готовящейся книги.
 *
 * Ультрамарин и песок, свет из-за горизонта (Burst), подвал с колонками и
 * полосой пейзажа под ним. Тексты взяты из книги, а не придуманы:
 * аннотация с задней обложки, описание из epub-meta.yaml.
 *
 * Обложка – отдельный файл: когда будет финальная, меняется только путь.
 * Форма подписки пока не создана: без неё кнопка ведёт к описанию.
 */

const BOOK = {
  title: 'Sunset of the Midnight Sun',
  kind: 'A novel',
  author: 'Vyacheslav Munister',
  authorRole: 'Co-editor, EPRIS Journal',
  status: 'Coming 2026',
  cover: '/uploads/sunset-cover-riders.jpg',
  hook: 'The last stronghold on the Pacific has fallen.',
  blurb: [
    'Autumn 1922. A steamer slips out of Vladivostok with hundreds of people who have lost a country and are not sure what they are carrying instead. A storm, a wreck on the coast of the Alaska Panhandle, a winter among strangers, and an old story about who gets to call a land theirs.',
    'Sunset of the Midnight Sun follows a crowd of ordinary and extraordinary people as their certainties come down, one after another, in a light that will not go out.',
  ],
  facts: [
    ['Language', 'English'],
    ['Expected', '2026'],
    ['Formats', 'Paperback · ebook'],
    ['Publisher', 'EPRIS Fiction'],
  ],
  notifyForm: '',
};

const FOOTER = [
  { head: 'The book', links: [['About the novel', '#about'], ['Details', '#details']] },
  { head: 'EPRIS', links: [['Journal', '/'], ['Articles', '/articles'], ['Reviews', '/reviews']] },
  { head: 'More', links: [['About EPRIS', '/about'], ['Manifesto', '/manifest']] },
];

export function SunsetPage() {
  useEffect(() => {
    const id = 'sunset-fonts';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter+Tight:wght@400;500;600&display=swap';
      document.head.appendChild(link);
    }
    document.title = `${BOOK.title} · ${BOOK.author} | EPRIS Journal`;
  }, []);

  return (
    <div className="sunset-root">
      <section className="sunset-hero">
        <Burst className="sunset-burst" horizon={0.74} focus={0.5} />
        <header className="sunset-nav">
          <a href="/" className="sunset-logo">EPRIS</a>
          <span className="sunset-pill">{BOOK.status}</span>
        </header>
        <div className="sunset-hero-inner">
          <div className="sunset-hero-text">
            <p className="sunset-eyebrow">{BOOK.kind} by {BOOK.author}</p>
            <h1>Sunset of the <em>Midnight Sun</em></h1>
            <p className="sunset-hook">{BOOK.hook}</p>
            {BOOK.notifyForm ? (
              <a className="sunset-cta" href={`/f/${BOOK.notifyForm}`}>Notify me when it’s out</a>
            ) : (
              <a className="sunset-cta" href="#about">Read about the book</a>
            )}
          </div>
          <div className="sunset-book">
            <img src={BOOK.cover} alt={`Cover of ${BOOK.title} by ${BOOK.author}`} />
          </div>
        </div>
      </section>

      <section className="sunset-about" id="about">
        <div className="sunset-about-inner">
          <p className="sunset-label">Autumn 1922</p>
          <div className="sunset-blurb">
            {BOOK.blurb.map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </div>
        <dl className="sunset-facts" id="details">
          {BOOK.facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
        </dl>
      </section>

      <footer className="sunset-footer">
        <div className="sunset-footer-top">
          <div className="sunset-footer-brand">
            <a href="/" className="sunset-logo">EPRIS</a>
            <p>
              <em>{BOOK.title}</em> is a novel by {BOOK.author}, co-editor of EPRIS Journal, published by EPRIS Fiction.
            </p>
          </div>
          {FOOTER.map((col) => (
            <nav key={col.head} className="sunset-footer-col">
              <p>{col.head}</p>
              {col.links.map(([label, href]) => <a key={label} href={href}>{label}</a>)}
            </nav>
          ))}
        </div>
        <div className="sunset-footer-bottom">
          <span>EPRIS Journal · Milano · Italia</span>
          <span>© 2026 {BOOK.author}. All rights reserved</span>
        </div>
        <Burst className="sunset-footer-art" horizon={0.4} focus={0.62} seed={57} />
      </footer>
    </div>
  );
}
