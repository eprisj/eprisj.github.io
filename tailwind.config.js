/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['Orbit', 'ui-monospace', 'monospace'],
        crimson: ['Crimson Text', 'serif'],
      },
    },
  },
  plugins: [],
}