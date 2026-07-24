import { useCallback, useEffect, useRef, useState } from 'react';
import { Link2, Check, X } from 'lucide-react';
import { PassportPreview } from './PassportPreview';
import type { PassportFields } from './passportRender';

const COVER_SRC = '/passport-assets/passport-cover.jpg';
const ENDPAPER_SRC = '/passport-assets/passport-endpaper.jpg';
const COVER_RATIO = 776 / 1100; // 0.705 — cropped cover art (closed booklet stays its own portrait shape)

// Slim share row shown under the book once it's open. Sharing only — no Edit on
// the public verification page.
function ShareRow({ shareText, url }: { shareText: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [url]);
  const btn = 'flex items-center justify-center w-9 h-9 rounded-full border border-[var(--pp-burgundy)]/15 text-[var(--pp-burgundy)]/70 hover:text-[var(--pp-burgundy)] hover:border-[var(--pp-burgundy)]/40 transition-colors duration-300';
  return (
    <div className="flex items-center gap-2.5">
      <button onClick={copy} title="Copy link" className={btn}>
        {copied ? <Check size={13} /> : <Link2 size={13} />}
      </button>
      <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer" title="Share on X" className={btn}>
        <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
      </a>
      <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer" title="Share on LinkedIn" className={btn}>
        <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
      </a>
      <a href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer" title="Share on Telegram" className={btn}>
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.42.91-4 2.64-.38.26-.71.39-1.01.38-.32-.01-.93-.18-1.38-.33-.56-.18-1-.28-.96-.6.02-.16.27-.32.74-.5 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .24z"/></svg>
      </a>
    </div>
  );
}

export function PassportBook({
  fields, photoUrl, code, qrDataUrl,
}: {
  fields: PassportFields;
  photoUrl: string | null;
  code: string;
  qrDataUrl: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [vw, setVw] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [bookH, setBookH] = useState(560);
  const rightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isMobile = vw < 768;
  // Width of the interactive passport card (drives the whole reveal size).
  // The card is now one combined sheet (observations on top, data page below,
  // matching the reference specimen layout) rather than a two-page spread, so
  // both breakpoints use the same "cover flips away in place" mechanic.
  const cardW = isMobile ? Math.min(vw - 56, 330) : Math.min(620, Math.max(420, Math.round(vw * 0.4)));

  // Measure the passport card's natural height so the cover art can match it.
  useEffect(() => {
    const el = rightRef.current;
    if (!el) return;
    const measure = () => setBookH(el.offsetHeight);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [cardW]);

  const shareText = `Check out my official EPRIS Digital Member Passport! (${fields.givenNames} ${fields.surname})`;
  const url = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div className="w-full flex flex-col items-center" style={{ overflowX: 'clip' }}>
      {/* Cover fades away in place to reveal the combined card underneath — a
          plain crossfade, no floating/bobbing loop and no 3D flip (both read
          as jittery rather than premium at this size). */}
      <div style={{ position: 'relative', width: cardW, minHeight: bookH, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Endpaper texture behind the revealed card */}
        <img
          src={ENDPAPER_SRC} alt="" aria-hidden
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: open ? 0.16 : 0, filter: 'blur(2px)', transition: 'opacity 0.5s ease 0.15s', borderRadius: 16, pointerEvents: 'none' }}
        />
        {/* The passport card (observations + data, one combined sheet) */}
        <div ref={rightRef} style={{ width: cardW, opacity: open ? 1 : 0, transform: open ? 'scale(1)' : 'scale(0.98)', transition: 'opacity 0.45s ease 0.15s, transform 0.45s ease 0.15s', pointerEvents: open ? 'auto' : 'none' }}>
          <PassportPreview fields={fields} photoUrl={photoUrl} code={code} qrDataUrl={qrDataUrl} />
        </div>
        {/* Cover fades out in place to reveal the card */}
        <div
          onClick={() => !open && setOpen(true)}
          role="button"
          tabIndex={open ? -1 : 0}
          aria-label="Open passport"
          onKeyDown={(e) => { if (!open && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setOpen(true); } }}
          style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            width: cardW, height: Math.round(cardW / COVER_RATIO), zIndex: 10,
            opacity: open ? 0 : 1,
            transition: 'opacity 0.4s ease',
            cursor: open ? 'default' : 'pointer',
            pointerEvents: open ? 'none' : 'auto',
            outline: 'none', // it stays in the DOM (just faded) after opening, so a lingering
                              // browser focus ring would render right on top of the revealed card
          }}
        >
          <div style={{ position: 'absolute', inset: 0, borderRadius: 8, overflow: 'hidden', boxShadow: '0 26px 50px rgba(80,26,44,0.28)' }}>
            <img src={COVER_SRC} alt="EPRIS passport cover" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            {!open && (
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 18, display: 'flex', justifyContent: 'center' }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(247,242,234,0.85)', background: 'rgba(36,16,22,0.35)', backdropFilter: 'blur(2px)', padding: '6px 14px', borderRadius: 999, border: '1px solid rgba(247,242,234,0.2)' }}>
                  Tap to open
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions — appear once the passport is open */}
      <div
        className="mt-8 flex items-center gap-4"
        style={{ opacity: open ? 1 : 0, transform: open ? 'translateY(0)' : 'translateY(8px)', transition: 'opacity 0.6s ease 0.5s, transform 0.6s ease 0.5s', pointerEvents: open ? 'auto' : 'none' }}
      >
        <ShareRow shareText={shareText} url={url} />
        <span className="w-px h-5 bg-[var(--pp-burgundy)]/10" />
        <button
          onClick={() => setOpen(false)}
          className="flex items-center gap-1.5 px-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--pp-burgundy)]/60 hover:text-[var(--pp-burgundy)] transition-colors duration-300"
        >
          <X size={12} /> Close
        </button>
      </div>
    </div>
  );
}
