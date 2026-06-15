import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { Play, Pause, X, ChevronRight } from 'lucide-react'

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
    const audio = audioRef.current
    if (!audio) return
    if (playing) { audio.pause(); setPlaying(false) }
    else { audio.play().catch(() => {}); setPlaying(true) }
  }

  const seek = (ratio: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = ratio * (audio.duration || 0)
  }

  const fmtTime = (s: number) => {
    if (!s || !isFinite(s)) return '0:00'
    const m = Math.floor(s / 60), sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return { playing, progress, duration, toggle, seek, fmtTime }
}

// ── Episode card ─────────────────────────────────────────────────────────────

function EpisodeCard({ ep, onClick }: { ep: Podcast; onClick: () => void }) {
  const cover = ep.cover_url
    ? ep.cover_url
    : `https://picsum.photos/seed/epris-ep-${ep.id}/400/400?grayscale`

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3 }}
      className="group cursor-pointer border border-[#501a2c]/20 hover:border-[#501a2c] transition-colors"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClick()}
    >
      <div className="aspect-square overflow-hidden bg-[#E8DED5] relative">
        <img
          src={cover}
          alt={ep.title}
          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-[#501a2c]/60">
          <Play size={32} className="text-[#F5F0EB]" />
        </div>
        {ep.episode_number !== undefined && (
          <div className="absolute top-3 left-3 bg-[#F5F0EB]/90 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-[#501a2c]">
            {ep.season ? `${ep.season} · ` : ''}Ep. {ep.episode_number}
          </div>
        )}
      </div>
      <div className="p-4 border-t border-[#501a2c]/20">
        <h3 className="font-serif text-lg text-[#501a2c] mb-1 leading-tight">{ep.title}</h3>
        <div className="flex items-center justify-between mt-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/50">
            {new Date(ep.published_at).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          {ep.duration_label && (
            <span className="font-mono text-[10px] text-[#501a2c]/40">{ep.duration_label}</span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ── Episode detail overlay ───────────────────────────────────────────────────

function EpisodeDetail({ ep, onClose }: { ep: Podcast; onClose: () => void }) {
  const { playing, progress, duration, toggle, seek, fmtTime } = useAudioPlayer(ep.audio_url)
  const cover = ep.cover_url
    ? ep.cover_url
    : `https://picsum.photos/seed/epris-ep-${ep.id}/800/800?grayscale`

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[60] bg-[#F5F0EB] overflow-y-auto"
    >
      <div className="max-w-4xl mx-auto px-6 sm:px-8 md:px-16 py-8 md:py-16">
        <div className="flex items-center justify-between mb-12">
          <button onClick={onClose} className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#501a2c]/60 hover:text-[#501a2c] transition-colors">
            ← Подкасти
          </button>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center border border-[#501a2c]/20 hover:border-[#501a2c] transition-colors text-[#501a2c]">
            <X size={14} />
          </button>
        </div>

        <div className="grid md:grid-cols-[280px_1fr] gap-12 items-start">
          {/* Cover */}
          <div>
            <div className="aspect-square bg-[#E8DED5] overflow-hidden mb-6">
              <img src={cover} alt={ep.title} className="w-full h-full object-cover grayscale" referrerPolicy="no-referrer" />
            </div>

            {/* Player */}
            <div className="border border-[#501a2c] p-4">
              <div className="flex items-center gap-4 mb-4">
                <button
                  onClick={toggle}
                  className="w-12 h-12 rounded-full bg-[#501a2c] text-[#F5F0EB] flex items-center justify-center hover:bg-[#3d1220] transition-colors shrink-0"
                >
                  {playing ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/60 truncate">{ep.title}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div
                className="h-1 bg-[#501a2c]/15 rounded-full cursor-pointer relative overflow-hidden"
                onClick={e => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  seek((e.clientX - rect.left) / rect.width)
                }}
              >
                <div className="h-full bg-[#501a2c] transition-all" style={{ width: `${progress * 100}%` }} />
              </div>
              <div className="flex justify-between font-mono text-[10px] text-[#501a2c]/40 mt-1">
                <span>{fmtTime(progress * duration)}</span>
                <span>{ep.duration_label || fmtTime(duration)}</span>
              </div>
            </div>
          </div>

          {/* Meta */}
          <div>
            {ep.episode_number !== undefined && (
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#501a2c]/50 mb-4">
                {ep.season ? `${ep.season} · ` : ''}Епізод {ep.episode_number}
              </p>
            )}
            <h1 className="font-serif text-4xl md:text-5xl text-[#501a2c] mb-6 leading-tight">{ep.title}</h1>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/40 mb-8">
              {new Date(ep.published_at).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            {ep.description && (
              <p className="font-serif text-xl text-[#501a2c]/70 leading-relaxed mb-8">{ep.description}</p>
            )}
            {ep.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {ep.tags.map(tag => (
                  <span key={tag} className="border border-[#501a2c]/20 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/60">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ── Announcement card ────────────────────────────────────────────────────────

function AnnouncementCard({ ann }: { ann: Announcement }) {
  const cover = ann.cover_url
    ? ann.cover_url
    : `https://picsum.photos/seed/epris-ann-${ann.id}/600/400?grayscale`

  return (
    <div className="border border-[#501a2c]/20 bg-[#E8DED5] overflow-hidden">
      <div className="aspect-[3/2] overflow-hidden bg-[#E8DED5]">
        <img src={cover} alt={ann.title} className="w-full h-full object-cover grayscale" referrerPolicy="no-referrer" />
      </div>
      <div className="p-6">
        {ann.event_date && (
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#C9A690] mb-3">
            {new Date(ann.event_date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}
            {ann.location && ` · ${ann.location}`}
          </p>
        )}
        <h3 className="font-serif text-2xl text-[#501a2c] mb-3">{ann.title}</h3>
        {ann.body && <p className="font-serif text-[#501a2c]/70 leading-relaxed mb-4">{ann.body}</p>}
        {ann.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {ann.tags.map(tag => (
              <span key={tag} className="border border-[#501a2c]/20 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-[#501a2c]/50">{tag}</span>
            ))}
          </div>
        )}
        {ann.link_url && (
          <a
            href={ann.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#501a2c] border-b border-[#501a2c]/40 hover:border-[#501a2c] transition-colors"
          >
            {ann.link_label || 'Детальніше'} <ChevronRight size={12} />
          </a>
        )}
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

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
    <div className="pt-16 min-h-screen bg-[#F5F0EB]">
      {/* Header */}
      <div className="border-b border-[#501a2c] px-8 md:px-16 py-12">
        <div className="max-w-5xl mx-auto">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#501a2c]/50 mb-3">EPRIS · Audio</p>
          <h1 className="font-serif text-5xl md:text-7xl text-[#501a2c] leading-none">Подкасти</h1>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="border-b border-[#501a2c]/20">
        <div className="max-w-5xl mx-auto px-8 md:px-16">
          <div className="flex">
            {(['podcasts', 'announcements'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setView(tab)}
                className={`px-6 py-4 font-mono text-xs uppercase tracking-widest border-b-2 transition-colors ${
                  view === tab ? 'border-[#501a2c] text-[#501a2c]' : 'border-transparent text-[#501a2c]/40 hover:text-[#501a2c]'
                }`}
              >
                {tab === 'podcasts' ? 'Епізоди' : 'Анонси'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 md:px-16 py-16">
        {loading ? (
          <div className="text-center py-24">
            <p className="font-mono text-xs uppercase tracking-widest text-[#501a2c]/30">Завантаження…</p>
          </div>
        ) : view === 'podcasts' ? (
          podcasts.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-16 h-16 rounded-full border border-[#501a2c]/20 flex items-center justify-center mx-auto mb-6">
                <Play size={24} className="text-[#501a2c]/30" />
              </div>
              <p className="font-mono text-xs uppercase tracking-widest text-[#501a2c]/30">Епізоди з'являться незабаром</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {podcasts.map(ep => (
                <EpisodeCard key={ep.id} ep={ep} onClick={() => setSelectedEp(ep)} />
              ))}
            </div>
          )
        ) : (
          announcements.length === 0 ? (
            <div className="text-center py-24">
              <p className="font-mono text-xs uppercase tracking-widest text-[#501a2c]/30">Анонси з'являться незабаром</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {announcements.map(ann => (
                <AnnouncementCard key={ann.id} ann={ann} />
              ))}
            </div>
          )
        )}
      </div>

      <AnimatePresence>
        {selectedEp && <EpisodeDetail ep={selectedEp} onClose={() => setSelectedEp(null)} />}
      </AnimatePresence>
    </div>
  )
}
