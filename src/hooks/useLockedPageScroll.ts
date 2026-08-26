import { useEffect } from 'react';

/**
 * Full-screen overlays (article, review, episode) are `position: fixed` layers
 * with their own `overflow-y: auto`. The page underneath keeps its own
 * scrollbar, so the reader sees two scrollbars side by side and the wheel
 * sometimes drives the wrong one. Freezing the page while an overlay is open
 * leaves exactly one scroller — the overlay.
 *
 * The scrollbar it removes is compensated with padding so the page behind does
 * not jump by its width when the overlay opens and fades out on close.
 */
export function useLockedPageScroll(active: boolean = true) {
  useEffect(() => {
    if (!active) return;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const gutter = window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = 'hidden';
    if (gutter > 0) body.style.paddingRight = `${gutter}px`;

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, [active]);
}
