# EPRIS Journal

Static React + Vite site with a static admin panel that can edit content directly in GitHub.

## Content model

All site content is stored in:

- `src/content/site-content.json`

The app reads this file through `src/data.ts`.

## Local run

1. Install dependencies:
   - `npm install`
2. Start dev server:
   - `npm run dev`

## Build

- `npm run build`
- `npm run preview`

## Static admin (GitHub Pages compatible)

Admin URL:

- `/admin/index.html`

What it does:

- Loads `src/content/site-content.json` from your GitHub repo
- Lets you edit content in a visual form and in raw JSON
- Validates and formats JSON
- Commits changes back to the repo through GitHub API
- Supports image URLs in visual editor (`imageUrl` / article cover URL)
- Supports drag-and-drop image upload to `public/uploads` via GitHub API

Image behavior:

- If `imageUrl` is filled, the site uses it directly
- If `imageUrl` is empty, the site falls back to `imageSeed` (picsum seed mode)

Required auth:

- Fine-grained GitHub Personal Access Token with `Contents: Read and write` for your repository

## GitHub Pages setup

Recommended flow:

1. Use GitHub Actions to build/deploy Vite (`npm ci && npm run build`).
2. Serve the generated `dist` on Pages.
3. Open `/admin/index.html` on your Pages domain to manage content.

When you commit content through admin, GitHub Actions rebuilds and republishes the site.
