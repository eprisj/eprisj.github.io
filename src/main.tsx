import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { startImageReveal } from './lib/imageReveal';

// Last-resort safety net: App.tsx has its own boundary around each lazy tab
// for the specific "stale JS chunk after a redeploy" case, but ANY other
// uncaught render error anywhere in the tree (a malformed content entry, a
// bad prop, etc.) would still unmount the whole app to a blank white page
// with zero explanation – there was no boundary at all before this. This one
// wraps everything, so no single crash can ever produce a totally blank
// screen again. Deliberately styled with inline hardcoded colors (not the
// app's CSS custom properties, which are set by JS that may not have run if
// something broke early) so the fallback itself can't also fail to render.
const ROOT_RELOAD_GUARD_KEY = 'epris_root_reload_once';
const CHUNK_ERROR_PATTERN = /fetch dynamically imported module|Importing a module script failed|Loading chunk/i;

class RootErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.error('App crashed:', error);
    const message = error instanceof Error ? error.message : String(error);
    if (CHUNK_ERROR_PATTERN.test(message) && !sessionStorage.getItem(ROOT_RELOAD_GUARD_KEY)) {
      sessionStorage.setItem(ROOT_RELOAD_GUARD_KEY, '1');
      window.location.reload();
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            fontFamily: 'monospace',
            textAlign: 'center',
            padding: 24,
            background: '#F5F0EA',
            color: '#2b1c14',
          }}
        >
          <p style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, opacity: 0.7, maxWidth: 360 }}>
            Something went wrong loading this page.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              border: '1px solid #2b1c14',
              borderRadius: 999,
              padding: '8px 24px',
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: 2,
              background: 'none',
              color: 'inherit',
              cursor: 'pointer',
            }}
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* Uploads are served at several widths (/uploads/sizes/<stem>-<w>w.webp), made
   by the server after an upload. A browser that picks a width from srcset does
   not fall back to src when that file is missing: it shows a broken image - on
   iPhone the blue "?" on a beige square (2026-10-10, "What a Room Remembers":
   the original was there, its 480w/960w copies were not, and two of the three
   <img> with srcset had no onError).
   Whatever renders the picture, an image whose srcset points at /uploads/sizes/
   and fails is switched to its plain src here, once. Capture phase, because
   image errors do not bubble. Its own flag, so App.tsx's recoverOriginalImage
   (which hides the image on a second failure) still works after it. */
document.addEventListener('error', (event) => {
  const img = event.target;
  if (!(img instanceof HTMLImageElement) || img.dataset.srcsetFallback) return;
  const set = img.getAttribute('srcset') || '';
  if (!/\/uploads\/sizes\//.test(set)) return;
  img.dataset.srcsetFallback = '1';
  const original = img.dataset.originalSrc || img.getAttribute('src');
  img.removeAttribute('srcset');
  img.removeAttribute('sizes');
  if (original) img.src = original;
}, true);

startImageReveal();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);
