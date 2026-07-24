/** @type {import('tailwindcss').Config} */
export default {
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
        crimson: ['Crimson Text', 'serif'],
        display: ['Playfair Display', 'PT Serif', 'serif'],
        sans: ['PT Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}