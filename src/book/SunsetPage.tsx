import { useEffect } from 'react';
import './sunset.css';

/**
 * «Sunset of the Midnight Sun»: страница книги со свободным скачиванием.
 *
 * Белая страница, обложка, аннотация с задней стороны,
 * кнопки PDF и EPUB. Файлы лежат в public/book и обновляются из репозитория
 * книги (python3 build.py, затем копия build/*.pdf и build/*.epub сюда).
 */

const BOOK = {
  title: 'Sunset of the Midnight Sun',
  author: 'Vyacheslav Munister',
  cover: '/uploads/sunset-cover-pink.jpg',
  hook: 'The last stronghold on the Pacific has fallen.',
  blurb: [
    'An empire has ended, and the people who believed in it are fleeing by sea. Officers and thieves, believers and sceptics, old men and children, each carrying the story they tell about themselves. Then the ship breaks on a coast that was never empty, and every certainty has to be argued all over again.',
    'A novel about how a country is lost, who pays for the land it was built on, and what is left of a person when everything they were sure of has gone down with the ship.',
  ],
  downloads: [
    { label: 'PDF', note: '267 pages', primary: true, href: '/book/sunset-of-the-midnight-sun.pdf' },
    { label: 'EPUB', note: 'e-readers and phones', primary: false, href: '/book/sunset-of-the-midnight-sun.epub' },
  ],
};

export function SunsetPage() {
  useEffect(() => {
    const id = 'sunset-fonts';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Jost:wght@400;500&display=swap';
      document.head.appendChild(link);
    }
    document.title = `${BOOK.title} · ${BOOK.author}`;
  }, []);

  return (
    <main className="sunset-root">
      <div className="sunset-wrap">
        <img className="sunset-cover" src={BOOK.cover} alt={`Cover of ${BOOK.title} by ${BOOK.author}`} />
        <div className="sunset-text">
          <p className="sunset-label">A novel</p>
          <h1>{BOOK.title}</h1>
          <p className="sunset-author">{BOOK.author}</p>
          <p className="sunset-hook">{BOOK.hook}</p>
          <div className="sunset-blurb">
            {BOOK.blurb.map((p, i) => <p key={i}>{p}</p>)}
          </div>
          <div className="sunset-downloads">
            {BOOK.downloads.map((d) => (
              <a key={d.href} className={`sunset-btn${d.primary ? ' is-primary' : ''}`} href={d.href} download>
                <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M10 3v9m0 0l-4-4m4 4l4-4M4 16h12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span>{d.label}</span>
                <small>{d.note}</small>
              </a>
            ))}
          </div>
          <p className="sunset-free">Free to download and to share.</p>
        </div>
      </div>
      <footer className="sunset-footer">
        <span>© 2026 {BOOK.author}. All rights reserved</span>
      </footer>
    </main>
  );
}
