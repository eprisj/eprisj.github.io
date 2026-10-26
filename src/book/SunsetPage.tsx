import { useEffect } from 'react';
import './sunset.css';

/**
 * «Sunset of the Midnight Sun»: страница книги со свободным скачиванием.
 *
 * Розовое поле и чёрные буквы обложки, обложка, аннотация с задней стороны,
 * кнопки PDF и EPUB. Файлы лежат в public/book и обновляются из репозитория
 * книги (python3 build.py, затем копия build/*.pdf и build/*.epub сюда).
 */

const BOOK = {
  title: 'Sunset of the Midnight Sun',
  author: 'Vyacheslav Munister',
  cover: '/uploads/sunset-cover-pink.jpg',
  hook: 'The last stronghold on the Pacific has fallen.',
  blurb: [
    'Autumn 1922. A steamer slips out of Vladivostok with hundreds of people who have lost a country and are not sure what they are carrying instead. A storm, a wreck on the coast of the Alaska Panhandle, a winter among strangers, and an old story about who gets to call a land theirs.',
    'A crowd of ordinary and extraordinary people watch their certainties come down, one after another, in a light that will not go out.',
  ],
  downloads: [
    { label: 'Download PDF', note: 'Reading edition · 6 × 9 in · 267 pages', href: '/book/sunset-of-the-midnight-sun.pdf' },
    { label: 'Download EPUB', note: 'For e-readers and phones', href: '/book/sunset-of-the-midnight-sun.epub' },
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
              <a key={d.href} className="sunset-btn" href={d.href} download>
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
