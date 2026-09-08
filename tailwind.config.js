/** @type {import('tailwindcss').Config} */
export default {
  // На тачі :hover спрацьовує від тапу й лишається аж до тапу деінде: кнопка
  // виглядає натиснутою, картка підсвіченою. Прапорець переводить усі
  // hover:-утиліти під @media (hover: hover), тобто на телефоні їх просто
  // немає. У проєкті близько 300 таких утиліт, руками це не обійти.
  future: { hoverOnlyWhenSupported: true },
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'pp-burgundy': '#4a1728',
        'pp-gold': '#b8956e',
        'pp-cream-light': '#f5eddc',
        'pp-cream-base': '#ede1c6',
        'pp-cream-dark': '#e7d8b8',
        'pp-ink': '#1a0b10',
      },
      fontFamily: {
        mono: ['OCR-B 10 BT', 'OCR-B', 'Courier New', 'monospace'],
        // Crimson Text ships zero Cyrillic glyphs (same check as Playfair
        // Display below: no unicode-range:cyrillic block in its css2
        // response), so every UK/RU heading fell through past it to the
        // browser's bare generic serif - Georgia or Times, depending on the
        // OS - while any Latin word in the same headline stayed in Crimson
        // Text. A title like "Neobarocco: Пять зданий..." rendered in two
        // visibly different serifs side by side. PT Serif is already loaded
        // (see index.html's font link) and is the site's designated
        // Cyrillic-serif partner - `display` below uses it for exactly the
        // same reason.
        crimson: ['Crimson Text', 'PT Serif', 'serif'],
        display: ['Playfair Display', 'PT Serif', 'serif'],
        sans: ['PT Sans', 'sans-serif'],
        /* `font-serif` was left at Tailwind's default stack, which resolves to
           whatever serif the OS keeps in ui-serif: Iowan Old Style on a Mac,
           Georgia elsewhere. It is also the most used type class on the site
           (64 places in App.tsx against 7 for font-crimson), so most of the
           journal was being set in a system face while the brand serif showed
           up in a handful of spots and Playfair in the headings. Three serifs
           on one page, none of them chosen. Pointing `serif` at the same stack
           as `crimson` harmonises all of it without touching the markup. */
        serif: ['Crimson Text', 'PT Serif', 'serif'],
      },
    },
  },
  plugins: [],
}