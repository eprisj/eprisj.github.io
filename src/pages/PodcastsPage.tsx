import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { Play, Pause, X, ChevronRight, Mic2 } from 'lucide-react'

const API = 'https://eprisradio.munister.com.ua'

// ── Types ────────────────────────────────────────────────────────────────────

type Podcast = {
  id: number
  title: string
  description?: string
  cover_url?: string
  audio_url: string
  duration_label?: string
  episode_number?: number
  season?: string
  tags: string[]
  published_at: string
}

type Announcement = {
  id: number
  title: string
  body?: string
  cover_url?: string
  event_date?: string
  location?: string
  tags: string[]
  link_url?: string
  link_label?: string
}

// ── Audio player hook ────────────────────────────────────────────────────────

function useAudioPlayer(src: string | null) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    if (!src) return
    const audio = new Audio(src)
    audioRef.current = audio
    audio.addEventListener('timeupdate', () => setProgress(audio.currentTime / (audio.duration || 1)))
    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration))
    audio.addEventListener('ended', () => setPlaying(false))
    return () => { audio.pause(); audio.src = ''; audioRef.current = null; setPlaying(false); setProgress(0) }
  }, [src])

  const toggle = () => {
    const a = audioRef.current; if (!a) return
    if (playing) { a.pause(); setPlaying(false) } else { a.play().catch(() => {}); setPlaying(true) }
  }
  const seek = (r: number) => { const a = audioRef.current; if (a) a.currentTime = r * (a.duration || 0) }
  const fmtTime = (s: number) => {
    if (!s || !isFinite(s)) return '0:00'
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
  }
  return { playing, progress, duration, toggle, seek, fmtTime }
}

// ── Episode card ─────────────────────────────────────────────────────────────

function EpisodeCard({ ep, onClick, t }: { ep: Podcast; onClick: () => void; t: (k: string) => string }) {
  const cover = ep.cover_url ?? `https://picsum.photos/seed/epris-ep-${ep.id}/400/400?grayscale`
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.3 }}
      className="group cursor-pointer border border-[rgb(var(--c-accent-rgb)_/_0.2)] hover:border-[var(--c-accent)] transition-colors"
      onClick={onClick} role="button" tabIndex={0} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClick()}
    >
      <div className="aspect-square overflow-hidden bg-[#E8DED5] relative">
        <img src={cover} alt={ep.title} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-[rgb(var(--c-accent-rgb)_/_0.6)]">
          <Play size={32} className="text-[var(--c-bg)]" />
        </div>
        {ep.episode_number !== undefined && (
          <div className="absolute top-3 left-3 bg-[rgb(var(--c-bg-rgb)_/_0.9)] px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-[var(--c-accent)]">
            {ep.season ? `${ep.season} · ` : ''}{t('podcasts.episode_label')} {ep.episode_number}
          </div>
        )}
      </div>
      <div className="p-4 border-t border-[rgb(var(--c-accent-rgb)_/_0.2)]">
        <h3 className="font-serif text-lg text-[var(--c-accent)] mb-1 leading-tight">{ep.title}</h3>
        <div className="flex items-center justify-between mt-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.5)]">
            {new Date(ep.published_at).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          {ep.duration_label && <span className="font-mono text-[10px] text-[rgb(var(--c-accent-rgb)_/_0.4)]">{ep.duration_label}</span>}
        </div>
      </div>
    </motion.div>
  )
}

// ── Episode detail overlay ───────────────────────────────────────────────────

function EpisodeDetail({ ep, onClose, t }: { ep: Podcast; onClose: () => void; t: (k: string) => string }) {
  const { playing, progress, duration, toggle, seek, fmtTime } = useAudioPlayer(ep.audio_url)
  const cover = ep.cover_url ?? `https://picsum.photos/seed/epris-ep-${ep.id}/800/800?grayscale`

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[60] bg-[var(--c-bg)] overflow-y-auto"
    >
      <div className="max-w-4xl mx-auto px-6 sm:px-8 md:px-16 py-8 md:py-16">
        <div className="flex items-center justify-between mb-12">
          <button onClick={onClose} className="font-mono text-xs uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.6)] hover:text-[var(--c-accent)] transition-colors">
            {t('podcasts.back')}
          </button>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center border border-[rgb(var(--c-accent-rgb)_/_0.2)] hover:border-[var(--c-accent)] transition-colors text-[var(--c-accent)]">
            <X size={14} />
          </button>
        </div>

        <div className="grid md:grid-cols-[280px_1fr] gap-12 items-start">
          <div>
            <div className="aspect-square bg-[#E8DED5] overflow-hidden mb-6">
              <img src={cover} alt={ep.title} className="w-full h-full object-cover grayscale" referrerPolicy="no-referrer" />
            </div>
            <div className="border border-[var(--c-accent)] p-4">
              <div className="flex items-center gap-4 mb-4">
                <button onClick={toggle} className="w-12 h-12 rounded-full bg-[var(--c-accent)] text-[var(--c-bg)] flex items-center justify-center hover:bg-[#3d1220] transition-colors shrink-0">
                  {playing ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <p className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.6)] truncate flex-1 min-w-0">{ep.title}</p>
              </div>
              <div className="h-1 bg-[rgb(var(--c-accent-rgb)_/_0.15)] rounded-full cursor-pointer" onClick={e => { const r = e.currentTarget.getBoundingClientRect(); seek((e.clientX - r.left) / r.width) }}>
                <div className="h-full bg-[var(--c-accent)] rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
              </div>
              <div className="flex justify-between font-mono text-[10px] text-[rgb(var(--c-accent-rgb)_/_0.4)] mt-1">
                <span>{fmtTime(progress * duration)}</span>
                <span>{ep.duration_label || fmtTime(duration)}</span>
              </div>
            </div>
          </div>

          <div>
            {ep.episode_number !== undefined && (
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[rgb(var(--c-accent-rgb)_/_0.5)] mb-4">
                {ep.season ? `${ep.season} · ` : ''}{t('podcasts.episode_label')} {ep.episode_number}
              </p>
            )}
            <h1 className="font-serif text-4xl md:text-5xl text-[var(--c-accent)] mb-6 leading-tight">{ep.title}</h1>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.4)] mb-8">
              {new Date(ep.published_at).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            {ep.description && <p className="font-serif text-xl text-[rgb(var(--c-accent-rgb)_/_0.7)] leading-relaxed mb-8">{ep.description}</p>}
            {ep.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {ep.tags.map(tag => (
                  <span key={tag} className="border border-[rgb(var(--c-accent-rgb)_/_0.2)] px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.6)]">{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ── Announcement card ─────────────────────────────────────────────────────────

function AnnouncementCard({ ann }: { ann: Announcement }) {
  const cover = ann.cover_url ?? `https://picsum.photos/seed/epris-ann-${ann.id}/600/400?grayscale`
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.3 }}
      className="border border-[rgb(var(--c-accent-rgb)_/_0.2)] bg-[#E8DED5] overflow-hidden hover:border-[var(--c-accent)] transition-colors"
    >
      <div className="aspect-[3/2] overflow-hidden">
        <img src={cover} alt={ann.title} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" referrerPolicy="no-referrer" />
      </div>
      <div className="p-6">
        {ann.event_date && (
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--c-gold)] mb-3">
            {new Date(ann.event_date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}
            {ann.location && ` · ${ann.location}`}
          </p>
        )}
        <h3 className="font-serif text-2xl text-[var(--c-accent)] mb-3">{ann.title}</h3>
        {ann.body && <p className="font-serif text-[rgb(var(--c-accent-rgb)_/_0.7)] leading-relaxed mb-4">{ann.body}</p>}
        {ann.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {ann.tags.map(tag => (
              <span key={tag} className="border border-[rgb(var(--c-accent-rgb)_/_0.2)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.5)]">{tag}</span>
            ))}
          </div>
        )}
        {ann.link_url && (
          <a href={ann.link_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[var(--c-accent)] border-b border-[rgb(var(--c-accent-rgb)_/_0.4)] hover:border-[var(--c-accent)] transition-colors">
            {ann.link_label || 'Детальніше'} <ChevronRight size={12} />
          </a>
        )}
      </div>
    </motion.div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function PodcastsPage({ t }: { t: (k: string) => string }) {
  const [podcasts, setPodcasts] = useState<Podcast[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEp, setSelectedEp] = useState<Podcast | null>(null)
  const [view, setView] = useState<'podcasts' | 'announcements'>('podcasts')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`${API}/api/podcasts`).then(r => r.json()).catch(() => ({ data: [] })),
      fetch(`${API}/api/announcements`).then(r => r.json()).catch(() => ({ data: [] })),
    ]).then(([pod, ann]) => {
      setPodcasts(pod.data || [])
      setAnnouncements(ann.data || [])
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div className="pt-16 min-h-screen bg-[var(--c-bg)]">

      {/* Header dark */}
      <div className="bg-[var(--c-accent)]">
        <div className="max-w-5xl mx-auto px-8 md:px-16 pt-12 pb-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-[var(--c-gold)] mb-4">{t('podcasts.eyebrow')}</p>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="font-serif text-5xl md:text-7xl text-[var(--c-bg)] leading-none mb-4">{t('podcasts.title')}</h1>
              <p className="font-serif text-lg text-[rgb(var(--c-bg-rgb)_/_0.6)] max-w-lg leading-relaxed">{t('podcasts.intro')}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Mic2 size={16} className="text-[var(--c-gold)]" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-bg-rgb)_/_0.4)]">
                {podcasts.length > 0 ? `${podcasts.length} ep.` : 'EPRIS Audio'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="border-t border-[rgb(var(--c-bg-rgb)_/_0.1)]">
          <div className="max-w-5xl mx-auto px-8 md:px-16 flex">
            {(['podcasts', 'announcements'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setView(tab)}
                className={`px-6 py-4 font-mono text-xs uppercase tracking-widest border-b-2 transition-colors ${
                  view === tab ? 'border-[var(--c-gold)] text-[var(--c-bg)]' : 'border-transparent text-[rgb(var(--c-bg-rgb)_/_0.3)] hover:text-[rgb(var(--c-bg-rgb)_/_0.6)]'
                }`}
              >
                {tab === 'podcasts' ? t('podcasts.tab_episodes') : t('podcasts.tab_announcements')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-8 md:px-16 py-16">
        {loading ? (
          <div className="text-center py-24">
            <p className="font-mono text-xs uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.3)]">…</p>
          </div>
        ) : view === 'podcasts' ? (
          podcasts.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-16 h-16 border border-[rgb(var(--c-accent-rgb)_/_0.2)] flex items-center justify-center mx-auto mb-6">
                <Play size={24} className="text-[rgb(var(--c-accent-rgb)_/_0.3)]" />
              </div>
              <p className="font-mono text-xs uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.3)]">{t('podcasts.empty_episodes')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {podcasts.map(ep => <EpisodeCard key={ep.id} ep={ep} onClick={() => setSelectedEp(ep)} t={t} />)}
            </div>
          )
        ) : (
          announcements.length === 0 ? (
            <div className="text-center py-24">
              <p className="font-mono text-xs uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.3)]">{t('podcasts.empty_announcements')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {announcements.map(ann => <AnnouncementCard key={ann.id} ann={ann} />)}
            </div>
          )
        )}
      </div>

      <AnimatePresence>
        {selectedEp && <EpisodeDetail ep={selectedEp} onClose={() => setSelectedEp(null)} t={t} />}
      </AnimatePresence>
    </div>
  )
}
