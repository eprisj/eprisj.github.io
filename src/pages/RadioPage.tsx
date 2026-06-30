import { motion, AnimatePresence } from 'framer-motion'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useEprisVoice } from '../hooks/useEprisVoice'
import type { ActiveRoom } from '../hooks/useEprisVoice'
import { useChat, REACTIONS } from '../hooks/useChat'
import type { ChatMessage } from '../hooks/useChat'

const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
const API = 'https://eprisradio.munister.com.ua'
const CHANNEL = 'eprisj-'

function stripChannel(slug: string) { return slug.startsWith(CHANNEL) ? slug.slice(CHANNEL.length) : slug }

type MusicTrack = { id: number; title: string; artist: string; size_bytes: number; uploaded_at: string }

// ── Icons ─────────────────────────────────────────────────────────────────────

function MicIcon({ off }: { off?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" width={18} height={18} aria-hidden>
      <path d="M9 4.5a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0v-6Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      {off && <path d="M3.5 3.5l17 17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />}
    </svg>
  )
}

function MusicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width={16} height={16} aria-hidden>
      <path d="M9 18V5l12-2v13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width={16} height={16} aria-hidden>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width={16} height={16} aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.7" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

// ── Signal waveform ───────────────────────────────────────────────────────────

function SignalBars({ active }: { active: boolean }) {
  return (
    <div className="flex items-end gap-[3px] h-7" aria-hidden>
      {Array.from({ length: 20 }).map((_, i) => (
        <span key={i} className={`w-[3px] rounded-sm transition-all ${active ? 'bg-[var(--c-bg)]' : 'bg-[rgb(var(--c-bg-rgb)_/_0.15)]'}`}
          style={{
            height: active ? `${14 + Math.sin(i * 0.7) * 10}px` : `${3 + (i % 4) * 2}px`,
            animation: active ? `epris-bar ${0.5 + (i % 5) * 0.12}s ease-in-out infinite alternate` : 'none',
            animationDelay: `${i * 0.05}s`,
          }} />
      ))}
      <style>{`@keyframes epris-bar { from { height: 3px; } to { height: 24px; } }`}</style>
    </div>
  )
}

// ── Toast system ──────────────────────────────────────────────────────────────

type Toast = { id: string; text: string; color?: string }

function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            className="flex items-center gap-2 bg-[var(--c-accent)] text-[var(--c-bg)] px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest shadow-lg">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: t.color || '#C9A690' }} />
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = useCallback((text: string, color?: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev.slice(-3), { id, text, color }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])
  return { toasts, push }
}

// ── Connection dot ────────────────────────────────────────────────────────────

function ConnDot({ state }: { state?: RTCPeerConnectionState }) {
  const color = !state ? '#C9A690' :
    state === 'connected' ? '#4ade80' :
    state === 'connecting' || state === 'new' ? '#facc15' :
    state === 'failed' || state === 'closed' ? '#f87171' : '#C9A690'
  return <span className="w-1.5 h-1.5 rounded-full shrink-0 transition-colors" style={{ background: color }} title={state || 'loading'} />
}

// ── Volume toggle ─────────────────────────────────────────────────────────────

function VolumeToggle({ userId, volume, onSet }: { userId: number; volume: number; onSet: (id: number, v: number) => void }) {
  const icon = volume >= 0.75 ? '🔊' : volume >= 0.25 ? '🔉' : '🔇'
  const next = volume >= 0.75 ? 0.5 : volume >= 0.25 ? 0 : 1
  return (
    <button onClick={e => { e.stopPropagation(); onSet(userId, next) }}
      className="shrink-0 text-[12px] opacity-35 hover:opacity-80 active:scale-110 transition-all" title="Volume"
      style={{ touchAction: 'none' }}>{icon}</button>
  )
}

// ── Nick editor ───────────────────────────────────────────────────────────────

function NickEditor({ current, onSave, onCancel }: { current: string; onSave: (v: string) => void; onCancel: () => void }) {
  const [val, setVal] = useState(current)
  return (
    <form onSubmit={e => { e.preventDefault(); val.trim().length >= 2 && onSave(val.trim()) }} className="flex items-center gap-2">
      <input type="text" value={val} onChange={e => setVal(e.target.value)} maxLength={24} autoFocus
        className="bg-transparent border-b border-[var(--c-accent)] text-[var(--c-accent)] font-serif text-base w-28 focus:outline-none pb-0.5" />
      <button type="submit" className="font-mono text-[10px] text-[var(--c-accent)] uppercase tracking-widest hover:opacity-60">OK</button>
      <button type="button" onClick={onCancel} className="font-mono text-[10px] text-[rgb(var(--c-accent-rgb)_/_0.3)] uppercase">✕</button>
    </form>
  )
}

// ── Nickname prompt ───────────────────────────────────────────────────────────

function NicknamePrompt({ onJoin, loading, t }: { onJoin: (nick: string) => void; loading: boolean; t: (k: string) => string }) {
  const [nick, setNick] = useState('')
  return (
    <div className="border border-[var(--c-accent)] p-8 max-w-sm mx-auto">
      <p className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.6)] mb-6">{t('radio.nick_label')}</p>
      <input type="text" value={nick} onChange={e => setNick(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && nick.trim().length >= 2 && onJoin(nick.trim())}
        placeholder={t('radio.nick_placeholder')} maxLength={24}
        className="w-full bg-transparent border-b border-[var(--c-accent)] font-serif text-xl text-[var(--c-accent)] placeholder-[rgb(var(--c-accent-rgb)_/_0.3)] focus:outline-none pb-2 mb-8" autoFocus />
      <button onClick={() => onJoin(nick.trim() || '')} disabled={loading}
        className="w-full border border-[var(--c-accent)] bg-[var(--c-accent)] text-[var(--c-bg)] font-mono text-xs uppercase tracking-widest py-3 hover:bg-[#3d1220] transition-colors disabled:opacity-50">
        {loading ? t('radio.connecting') : t('radio.nick_enter')}
      </button>
      <p className="font-mono text-[10px] text-[rgb(var(--c-accent-rgb)_/_0.4)] mt-4 text-center">{t('radio.nick_anon')}</p>
    </div>
  )
}

// ── Slug helper ───────────────────────────────────────────────────────────────

function toSlug(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z0-9а-яіїє]+/gi, '-').replace(/^-|-$/g, '').slice(0, 40) || 'main'
}

// ── Rooms list ────────────────────────────────────────────────────────────────

function RoomsList({ rooms, onJoin, t }: { rooms: ActiveRoom[]; onJoin: (slug: string, title: string) => void; t: (k: string) => string }) {
  const filtered = rooms.filter(r => r.slug.startsWith(CHANNEL))
  if (!filtered.length) return null
  return (
    <div className="mt-10 border-t border-[rgb(var(--c-accent-rgb)_/_0.1)] pt-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[rgb(var(--c-accent-rgb)_/_0.4)] mb-4">{t('radio.active_rooms')}</p>
      <ul className="space-y-0">
        {filtered.map(r => {
          const raw = stripChannel(r.slug)
          const display = r.title === r.slug ? raw : r.title
          return (
            <li key={r.slug} className="border border-[rgb(var(--c-accent-rgb)_/_0.1)] hover:border-[rgb(var(--c-accent-rgb)_/_0.3)] transition-colors">
              <button onClick={() => onJoin(raw, display)}
                className="w-full flex items-center justify-between px-5 py-4 text-left group">
                <span className="flex items-center gap-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--c-gold)] animate-pulse" />
                  <span className="font-serif text-lg text-[var(--c-accent)] group-hover:text-[#3d1220] transition-colors">{display}</span>
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.4)]">
                  {r.member_count} {t('radio.participants').toLowerCase()}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ── Create room panel ─────────────────────────────────────────────────────────

function CreateRoomPanel({ onStart, t }: { onStart: (slug: string, title: string) => void; t: (k: string) => string }) {
  const [name, setName] = useState('')
  const slug = name.trim() ? toSlug(name) : ''
  return (
    <div className="mt-6 border border-dashed border-[rgb(var(--c-accent-rgb)_/_0.2)] p-6 max-w-sm">
      <p className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.4)] mb-4">{t('radio.create_room')}</p>
      <input type="text" value={name} onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && slug && onStart(slug, name.trim())}
        placeholder={t('radio.room_name_placeholder')} maxLength={50}
        className="w-full bg-transparent border-b border-[rgb(var(--c-accent-rgb)_/_0.3)] font-serif text-lg text-[var(--c-accent)] placeholder-[rgb(var(--c-accent-rgb)_/_0.2)] focus:outline-none pb-2 mb-4 focus:border-[var(--c-accent)]" autoFocus />
      {slug && <p className="font-mono text-[9px] text-[rgb(var(--c-accent-rgb)_/_0.3)] mb-4 truncate">/radio?room={slug}</p>}
      <button onClick={() => slug && onStart(slug, name.trim())} disabled={!slug}
        className="w-full border border-[var(--c-accent)] bg-[var(--c-accent)] text-[var(--c-bg)] font-mono text-xs uppercase tracking-widest py-3 hover:bg-[#3d1220] transition-colors disabled:opacity-30">
        {t('radio.create_and_join')}
      </button>
    </div>
  )
}

// ── Share button ──────────────────────────────────────────────────────────────

function ShareButton({ roomSlug, t }: { roomSlug: string; t: (k: string) => string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    const raw = stripChannel(roomSlug)
    const url = raw === 'main' ? `${window.location.origin}/radio` : `${window.location.origin}/radio?room=${encodeURIComponent(raw)}`
    navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(() => {})
  }
  return (
    <button onClick={copy}
      className="border border-[rgb(var(--c-bg-rgb)_/_0.2)] px-3 py-1.5 font-mono text-[9px] uppercase tracking-widest text-[rgb(var(--c-bg-rgb)_/_0.5)] hover:border-[var(--c-gold)] hover:text-[var(--c-gold)] transition-colors whitespace-nowrap">
      {copied ? '✓ copied' : t('radio.share_link')}
    </button>
  )
}

// ── Chat panel ────────────────────────────────────────────────────────────────

function ChatPanel({ messages, callId, myNick, onSendText, onSendReaction, compact = false, t }:
  { messages: ChatMessage[]; callId: number; myNick: string; onSendText: (cid: number, text: string) => void; onSendReaction: (cid: number, emoji: string) => void; compact?: boolean; t: (k: string) => string }) {
  const [text, setText] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const textMsgs = messages.filter(m => m.type === 'text')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    onSendText(callId, trimmed)
    setText('')
    inputRef.current?.focus()
  }

  return (
    <div className={`flex flex-col bg-[#FDFAF7] ${compact ? 'h-full' : 'border border-[rgb(var(--c-accent-rgb)_/_0.15)] rounded-lg overflow-hidden'}`}>
      {/* Emoji picker */}
      <AnimatePresence>
        {showPicker && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-b border-[rgb(var(--c-accent-rgb)_/_0.1)] overflow-hidden bg-[var(--c-bg)]">
            <div className="flex flex-wrap gap-1.5 px-4 py-3">
              {REACTIONS.map(e => (
                <button key={e} onClick={() => { onSendReaction(callId, e); setShowPicker(false) }}
                  className="text-xl hover:scale-125 active:scale-110 transition-transform w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[rgb(var(--c-accent-rgb)_/_0.08)]">{e}</button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message list */}
      <div className={`overflow-y-auto px-3 py-3 flex flex-col gap-2 overscroll-contain flex-1 ${compact ? 'min-h-0' : 'h-52'}`}>
        {textMsgs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-8">
            <span className="text-2xl opacity-20">💬</span>
            <p className="font-mono text-[9px] text-[rgb(var(--c-accent-rgb)_/_0.25)] text-center uppercase tracking-widest">
              Чат порожній
            </p>
          </div>
        )}
        {textMsgs.map(m => {
          const isMe = m.nickname === myNick || (m.id < 0)
          const isPending = m.id < 0
          return (
            <div key={m.id} className={`flex gap-2 items-end ${isMe ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              {!isMe && (
                <div className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[9px] text-[var(--c-bg)] shrink-0 mb-0.5 shadow-sm"
                  style={{ background: m.color || '#501a2c' }}>{(m.nickname || '?')[0]?.toUpperCase()}</div>
              )}
              <div className={`flex flex-col gap-0.5 max-w-[78%] ${isMe ? 'items-end' : 'items-start'}`}>
                {!isMe && m.nickname && (
                  <span className="font-mono text-[9px] text-[rgb(var(--c-accent-rgb)_/_0.4)] px-1 leading-none">{m.nickname}</span>
                )}
                <span className={`px-3 py-2 text-[13px] leading-snug break-words rounded-2xl ${
                  isMe
                    ? `bg-[var(--c-accent)] text-[var(--c-bg)] rounded-br-sm ${isPending ? 'opacity-60' : ''}`
                    : 'bg-white text-[#2A1A22] border border-[#E2D8CF] rounded-bl-sm shadow-sm'
                }`}>
                  {m.content}
                  {isPending && <span className="ml-1.5 text-[10px] opacity-50">…</span>}
                </span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-[rgb(var(--c-accent-rgb)_/_0.1)] bg-white/60 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-2.5">
          <button type="button" onClick={() => setShowPicker(p => !p)}
            className={`text-base shrink-0 transition-all w-7 h-7 flex items-center justify-center rounded-lg ${showPicker ? 'bg-[rgb(var(--c-accent-rgb)_/_0.1)]' : 'opacity-40 hover:opacity-80'}`}>
            🙂
          </button>
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={t('radio.chat_placeholder')}
            maxLength={300}
            className="flex-1 bg-transparent text-[13px] text-[#2A1A22] placeholder-[rgb(var(--c-accent-rgb)_/_0.3)] focus:outline-none min-w-0"
          />
          <button type="submit" disabled={!text.trim()}
            className="shrink-0 w-8 h-8 rounded-full bg-[var(--c-accent)] text-[var(--c-bg)] flex items-center justify-center disabled:opacity-25 transition-opacity hover:bg-[#6b2438]">
            <svg viewBox="0 0 24 24" fill="none" width={14} height={14}>
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Now Playing bar ───────────────────────────────────────────────────────────

function NowPlayingBar({ title, artist, isHost, musicGain, onStop, onGain }:
  { title: string; artist: string; isHost: boolean; musicGain: number; onStop: () => void; onGain: (v: number) => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      className="bg-[var(--c-accent)] text-[var(--c-bg)] px-6 py-3 flex items-center gap-4 border-b border-[rgb(var(--c-bg-rgb)_/_0.1)]">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--c-gold)] animate-pulse shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--c-gold)]">Now Playing</span>
        <p className="font-serif text-sm text-[var(--c-bg)] leading-tight truncate">{title}{artist ? ` — ${artist}` : ''}</p>
      </div>
      {isHost && (
        <>
          <input type="range" min={0} max={1} step={0.05} value={musicGain}
            onChange={e => onGain(parseFloat(e.target.value))}
            className="w-20 accent-[var(--c-gold)] shrink-0" title="Гучність музики" />
          <button onClick={onStop} className="font-mono text-[9px] uppercase tracking-widest text-[rgb(var(--c-bg-rgb)_/_0.5)] hover:text-[var(--c-bg)] border border-[rgb(var(--c-bg-rgb)_/_0.2)] px-3 py-1.5 transition-colors whitespace-nowrap">
            ■ Стоп
          </button>
        </>
      )}
    </motion.div>
  )
}

// ── Music panel (host) ────────────────────────────────────────────────────────

function MusicPanel({ onPlay, isPlaying }: { onPlay: (id: number, title: string, artist: string) => void; isPlaying: boolean }) {
  const [tracks, setTracks] = useState<MusicTrack[]>([])
  const [loading, setLoading] = useState(true)

  const loadTracks = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/music/tracks`, { headers: { 'X-Admin-Token': '' } })
      const j = await r.json()
      if (j.ok) setTracks(j.data || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadTracks() }, [loadTracks])

  if (loading) return <p className="font-mono text-[10px] text-[rgb(var(--c-accent-rgb)_/_0.3)] text-center py-4">…</p>
  if (!tracks.length) return (
    <p className="font-mono text-[10px] text-[rgb(var(--c-accent-rgb)_/_0.3)] text-center py-6">
      Треків немає. Завантажте в адмінці.
    </p>
  )
  return (
    <div className="divide-y divide-[rgb(var(--c-accent-rgb)_/_0.08)] max-h-72 overflow-y-auto">
      {tracks.map(tr => (
        <div key={tr.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[rgb(var(--c-accent-rgb)_/_0.04)] transition-colors group">
          <div className="flex-1 min-w-0">
            <p className="font-serif text-[var(--c-accent)] text-sm truncate">{tr.title}</p>
            {tr.artist && <p className="font-mono text-[10px] text-[rgb(var(--c-accent-rgb)_/_0.4)] truncate">{tr.artist}</p>}
          </div>
          <button onClick={() => onPlay(tr.id, tr.title, tr.artist)}
            disabled={isPlaying}
            className="shrink-0 border border-[rgb(var(--c-accent-rgb)_/_0.3)] px-3 py-1 font-mono text-[9px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.6)] hover:border-[var(--c-accent)] hover:text-[var(--c-accent)] transition-colors disabled:opacity-30 group-hover:border-[rgb(var(--c-accent-rgb)_/_0.6)]">
            ▶ Запустити
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Members panel ─────────────────────────────────────────────────────────────

function MembersPanel({ members, myUser, memberVolumes, peerStates, micOn, speaking, editingNick, onEditNick, onSaveNick, onCancelNick, onSetVolume, total, t }:
  { members: ReturnType<typeof useEprisVoice>['members']; myUser: ReturnType<typeof useEprisVoice>['myUser']; memberVolumes: Record<number, number>; peerStates: Record<number, RTCPeerConnectionState>; micOn: boolean; speaking: boolean; editingNick: boolean; onEditNick: () => void; onSaveNick: (v: string) => void; onCancelNick: () => void; onSetVolume: (id: number, v: number) => void; total: number; t: (k: string) => string }) {
  return (
    <div className="divide-y divide-[rgb(var(--c-accent-rgb)_/_0.08)] overflow-y-auto">
      {myUser && (
        <div className={`px-4 py-3 flex items-center gap-3 ${micOn ? '' : 'opacity-60'}`}>
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: myUser.color }} />
          {editingNick
            ? <NickEditor current={myUser.nickname} onSave={onSaveNick} onCancel={onCancelNick} />
            : <button onClick={onEditNick} className="font-serif text-[var(--c-accent)] text-left hover:underline flex items-center gap-1.5">
                {myUser.nickname} <span className="text-[10px] opacity-30">✏</span>
              </button>}
          {(micOn && speaking) && <span className="ml-auto w-1.5 h-1.5 bg-[var(--c-gold)] rounded-full animate-pulse" />}
          <span className={`ml-auto font-mono text-[9px] text-[rgb(var(--c-accent-rgb)_/_0.4)] ${(micOn && speaking) ? 'ml-1' : ''}`}>{micOn ? 'MIC' : 'MUTE'}</span>
        </div>
      )}
      {members.map(m => (
        <div key={m.user_id} className={`px-4 py-3 flex items-center gap-3 ${m.mic_on ? '' : 'opacity-60'}`}>
          <ConnDot state={peerStates[m.user_id]} />
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: m.color }} />
          <span className="font-serif text-[var(--c-accent)] truncate flex-1">{m.nickname}</span>
          {m.speaking && <span className="w-1.5 h-1.5 bg-[var(--c-gold)] rounded-full animate-pulse shrink-0" />}
          <span className="font-mono text-[9px] text-[rgb(var(--c-accent-rgb)_/_0.4)] shrink-0">{m.mic_on ? 'MIC' : 'MUTE'}</span>
          <VolumeToggle userId={m.user_id} volume={memberVolumes[m.user_id] ?? 1} onSet={onSetVolume} />
        </div>
      ))}
      {total === 0 && <p className="px-4 py-6 font-mono text-[10px] text-[rgb(var(--c-accent-rgb)_/_0.2)] text-center">Тільки ви в ефірі</p>}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function RadioPage({ t }: { t: (k: string) => string }) {
  const [roomSlug, setRoomSlug] = useState(() => {
    const p = new URLSearchParams(window.location.search)
    return CHANNEL + (p.get('room') || 'main')
  })
  const [roomTitle, setRoomTitle] = useState('')
  const [showEndedNotice, setShowEndedNotice] = useState(false)

  const {
    members, memberVolumes, joined, micOn, speaking, connecting, error,
    audioBlocked, myUser, isHost, broadcastEnded, activeRooms, callId,
    peerStates, isMusicOn, musicGain, nowPlaying,
    join, leave, endBroadcast, toggleMic, unlockAudio, setMemberVolume,
    startMusicBroadcast, stopMusicBroadcast, setMusicGain,
  } = useEprisVoice({ roomSlug, roomTitle })

  const { messages, sendText, sendReaction, rename } = useChat(callId, joined)

  const { toasts, push: pushToast } = useToasts()

  const [showNickPrompt, setShowNickPrompt] = useState(false)
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [editingNick, setEditingNick] = useState(false)
  const [pttHeld, setPttHeld] = useState(false)
  const [floatReactions, setFloatReactions] = useState<{ id: string; emoji: string; x: number }[]>([])
  const [mobileTab, setMobileTab] = useState<'members' | 'chat' | 'music'>('members')
  const [desktopTab, setDesktopTab] = useState<'members' | 'chat' | 'music'>('members')
  const [unreadChat, setUnreadChat] = useState(0)
  const lastSeenMsgId = useRef(0)
  const pttBusyRef = useRef(false)
  const prevMembersRef = useRef<typeof members>([])
  const lastReactionIdRef = useRef(0)

  // Join/leave toasts
  useEffect(() => {
    const prev = prevMembersRef.current
    if (!joined) { prevMembersRef.current = members; return }
    const prevIds = new Set(prev.map(m => m.user_id))
    const currIds = new Set(members.map(m => m.user_id))
    for (const m of members) if (!prevIds.has(m.user_id)) pushToast(`${m.nickname} приєднався`, m.color)
    for (const m of prev) if (!currIds.has(m.user_id)) pushToast(`${m.nickname} вийшов`, '#501a2c')
    prevMembersRef.current = members
  }, [members, joined, pushToast])

  // Unread chat badge
  useEffect(() => {
    const newMsgs = messages.filter(m => m.type === 'text' && m.id > lastSeenMsgId.current)
    if (!newMsgs.length) return
    const activeTab = isTouch ? mobileTab : desktopTab
    if (activeTab !== 'chat') setUnreadChat(n => n + newMsgs.length)
  }, [messages, mobileTab, desktopTab])

  const switchToChat = (which: 'mobile' | 'desktop') => {
    if (which === 'mobile') setMobileTab('chat')
    else setDesktopTab('chat')
    setUnreadChat(0)
    lastSeenMsgId.current = messages.filter(m => m.type === 'text').reduce((mx, m) => Math.max(mx, m.id), lastSeenMsgId.current)
  }

  // Floating reactions
  useEffect(() => {
    const newR = messages.filter(m => m.type === 'reaction' && m.id > lastReactionIdRef.current)
    if (!newR.length) return
    lastReactionIdRef.current = messages.filter(m => m.type === 'reaction').reduce((mx, m) => Math.max(mx, m.id), lastReactionIdRef.current)
    newR.forEach((r, i) => {
      const fid = `${r.id}-${i}`
      setFloatReactions(prev => [...prev, { id: fid, emoji: r.content, x: 10 + Math.random() * 80 }])
      setTimeout(() => setFloatReactions(prev => prev.filter(f => f.id !== fid)), 2400)
    })
  }, [messages])

  useEffect(() => { if (broadcastEnded) setShowEndedNotice(true) }, [broadcastEnded])

  const navigateToRoom = useCallback((raw: string, title: string) => {
    const url = raw === 'main' ? '/radio' : `/radio?room=${encodeURIComponent(raw)}`
    window.history.pushState(null, '', url)
    setRoomSlug(CHANNEL + raw)
    setRoomTitle(title)
    setShowNickPrompt(true)
    setShowCreateRoom(false)
  }, [])

  const handleJoin = async (nick: string) => {
    setShowNickPrompt(false)
    const raw = stripChannel(roomSlug)
    const url = raw === 'main' ? '/radio' : `/radio?room=${encodeURIComponent(raw)}`
    window.history.replaceState(null, '', url)
    await join(nick)
  }

  const handleRename = async (nick: string) => {
    await rename(nick)
    setEditingNick(false)
  }

  // PTT — spacebar desktop
  useEffect(() => {
    if (!joined || isTouch) return
    const onDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      e.preventDefault()
      if (!pttBusyRef.current && !micOn) { pttBusyRef.current = true; setPttHeld(true); toggleMic().finally(() => { pttBusyRef.current = false }) }
    }
    const onUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      if (pttHeld && micOn) { setPttHeld(false); toggleMic() }
    }
    window.addEventListener('keydown', onDown); window.addEventListener('keyup', onUp)
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp) }
  }, [joined, micOn, pttHeld, toggleMic])

  const pttTouchStart = useCallback(() => {
    if (pttBusyRef.current || micOn) return
    pttBusyRef.current = true; setPttHeld(true)
    toggleMic().finally(() => { pttBusyRef.current = false })
  }, [micOn, toggleMic])
  const pttTouchEnd = useCallback(() => {
    if (pttHeld && micOn) { setPttHeld(false); toggleMic() }
  }, [pttHeld, micOn, toggleMic])

  const total = members.length
  const anyoneSpeaking = members.some(m => m.speaking) || (micOn && speaking)
  const isActive = joined || members.length > 0
  const roomDisplayName = (() => { const r = stripChannel(roomSlug); return r === 'main' ? 'Main' : r })()

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">

      {/* ── Hero dark ──────────────────────────────────────────────────────── */}
      <div className="bg-[var(--c-accent)]">
        <div className="max-w-5xl mx-auto px-6 md:px-14 pt-14 pb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-[var(--c-gold)] mb-3">{t('radio.eyebrow')}</p>
              <h1 className="font-serif text-4xl md:text-6xl text-[var(--c-bg)] leading-none mb-3">
                {joined ? t('radio.on_air') : members.length > 0 ? t('radio.broadcast_active') : 'EPRIS Live'}
              </h1>
              <p className="font-serif text-base text-[rgb(var(--c-bg-rgb)_/_0.5)] max-w-lg leading-relaxed">{t('radio.concept')}</p>
            </div>
            <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
              {isActive
                ? <span className="inline-flex items-center gap-2 border border-[var(--c-gold)] px-3 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--c-gold)] animate-pulse" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--c-gold)]">{t('radio.live_badge')}</span>
                  </span>
                : <span className="font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-bg-rgb)_/_0.3)]">{t('radio.standby')}</span>}
              {isActive && <span className="font-mono text-[10px] text-[rgb(var(--c-bg-rgb)_/_0.4)] uppercase tracking-widest">{total + (joined ? 1 : 0)} {t('radio.participants').toLowerCase()}</span>}
              {roomSlug !== CHANNEL + 'main' && (
                <span className="font-mono text-[9px] uppercase tracking-widest text-[rgb(var(--c-gold-rgb)_/_0.5)]">#{roomDisplayName}</span>
              )}
              {joined && <ShareButton roomSlug={roomSlug} t={t} />}
            </div>
          </div>

          {/* Signal meter */}
          <div className="border border-[rgb(var(--c-bg-rgb)_/_0.1)] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-[rgb(var(--c-bg-rgb)_/_0.3)]">Signal · WebRTC</span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--c-gold)]">
                {anyoneSpeaking ? '● LIVE' : '○ STANDBY'}
              </span>
            </div>
            <SignalBars active={anyoneSpeaking} />
          </div>
        </div>

        {/* Now Playing strip */}
        <AnimatePresence>
          {nowPlaying && (
            <NowPlayingBar title={nowPlaying.title} artist={nowPlaying.artist}
              isHost={isHost} musicGain={musicGain}
              onStop={stopMusicBroadcast} onGain={setMusicGain} />
          )}
        </AnimatePresence>
      </div>

      {/* ── Light area ─────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 md:px-14 py-12">

        {/* Audio unlock */}
        <AnimatePresence>
          {audioBlocked && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-6 border border-[var(--c-accent)] bg-[var(--c-accent)] text-[var(--c-bg)] p-4 flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-widest">{t('radio.unlock_audio')}</span>
              <button onClick={unlockAudio} className="border border-[rgb(var(--c-bg-rgb)_/_0.3)] px-4 py-2 font-mono text-xs uppercase tracking-widest hover:bg-[rgb(var(--c-bg-rgb)_/_0.1)]">
                {t('radio.unlock_btn')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Broadcast ended notice */}
        <AnimatePresence>
          {showEndedNotice && !joined && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-6 border border-[rgb(var(--c-accent-rgb)_/_0.2)] bg-[rgb(var(--c-accent-rgb)_/_0.05)] p-4 flex items-center justify-between">
              <span className="font-mono text-xs text-[rgb(var(--c-accent-rgb)_/_0.7)] uppercase tracking-widest">{t('radio.broadcast_ended')}</span>
              <button onClick={() => setShowEndedNotice(false)} className="font-mono text-[10px] text-[rgb(var(--c-accent-rgb)_/_0.4)] uppercase hover:text-[var(--c-accent)]">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">

          {/* Idle */}
          {!joined && members.length === 0 && !showNickPrompt && !showCreateRoom && (
            <motion.div key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="grid md:grid-cols-2 gap-14 items-start">
                <div>
                  <h2 className="font-serif text-4xl md:text-5xl text-[var(--c-accent)] mb-5 leading-tight">{t('radio.idle_title')}</h2>
                  <p className="font-serif text-lg text-[rgb(var(--c-accent-rgb)_/_0.6)] leading-relaxed mb-8">{t('radio.idle_desc')}</p>
                  <div className="flex flex-wrap gap-3">
                    <button onClick={() => setShowNickPrompt(true)} disabled={connecting}
                      className="border border-[var(--c-accent)] bg-[var(--c-accent)] text-[var(--c-bg)] font-mono text-xs uppercase tracking-widest px-8 py-4 hover:bg-[#3d1220] transition-colors disabled:opacity-50">
                      {connecting ? t('radio.connecting') : t('radio.join_cta')}
                    </button>
                    <button onClick={() => setShowCreateRoom(true)}
                      className="border border-[rgb(var(--c-accent-rgb)_/_0.3)] text-[rgb(var(--c-accent-rgb)_/_0.6)] font-mono text-xs uppercase tracking-widest px-6 py-4 hover:border-[var(--c-accent)] hover:text-[var(--c-accent)] transition-colors">
                      {t('radio.create_room')}
                    </button>
                  </div>
                </div>
                <div className="space-y-0">
                  {[t('radio.feat1'), t('radio.feat2'), t('radio.feat3'), t('radio.feat4')].map((item, i) => (
                    <div key={i} className="flex items-start gap-4 border-b border-[rgb(var(--c-accent-rgb)_/_0.1)] py-4 first:pt-0">
                      <div className="w-7 h-7 border border-[rgb(var(--c-accent-rgb)_/_0.2)] flex items-center justify-center text-[rgb(var(--c-accent-rgb)_/_0.3)] font-mono text-[10px] shrink-0">
                        {String(i + 1).padStart(2, '0')}
                      </div>
                      <p className="font-serif text-[rgb(var(--c-accent-rgb)_/_0.6)] mt-0.5 leading-snug">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
              <RoomsList rooms={activeRooms} onJoin={navigateToRoom} t={t} />
            </motion.div>
          )}

          {/* Create room */}
          {!joined && showCreateRoom && (
            <motion.div key="create" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <button onClick={() => setShowCreateRoom(false)} className="font-mono text-xs uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.5)] hover:text-[var(--c-accent)] mb-6 block">{t('radio.back')}</button>
              <CreateRoomPanel onStart={(slug, title) => navigateToRoom(slug, title)} t={t} />
            </motion.div>
          )}

          {/* Nick prompt */}
          {!joined && showNickPrompt && (
            <motion.div key="nick" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <button onClick={() => setShowNickPrompt(false)} className="font-mono text-xs uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.5)] hover:text-[var(--c-accent)] mb-6 block">{t('radio.back')}</button>
              <NicknamePrompt onJoin={handleJoin} loading={connecting} t={t} />
            </motion.div>
          )}

          {/* Others live, not joined */}
          {!joined && members.length > 0 && !showNickPrompt && (
            <motion.div key="watching" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="grid md:grid-cols-2 gap-14 items-start">
                <div>
                  <h2 className="font-serif text-4xl text-[var(--c-accent)] mb-4">{t('radio.broadcast_active')}</h2>
                  <p className="font-serif text-lg text-[rgb(var(--c-accent-rgb)_/_0.6)] mb-8">{members.map(m => m.nickname).join(', ')}</p>
                  <button onClick={() => setShowNickPrompt(true)} disabled={connecting}
                    className="border border-[var(--c-accent)] bg-[var(--c-accent)] text-[var(--c-bg)] font-mono text-xs uppercase tracking-widest px-8 py-4 hover:bg-[#3d1220] transition-colors disabled:opacity-50">
                    {connecting ? t('radio.connecting') : t('radio.join_active')}
                  </button>
                </div>
                <div className="border border-[rgb(var(--c-accent-rgb)_/_0.2)]">
                  <div className="bg-[rgb(var(--c-accent-rgb)_/_0.05)] px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.4)]">
                    {t('radio.participants')} · {members.length}
                  </div>
                  {members.map(m => (
                    <div key={m.user_id} className="border-t border-[rgb(var(--c-accent-rgb)_/_0.1)] px-4 py-3 flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                      <span className="font-serif text-[var(--c-accent)]">{m.nickname}</span>
                      <span className="ml-auto font-mono text-[9px] text-[rgb(var(--c-accent-rgb)_/_0.4)]">{m.mic_on ? 'MIC' : 'MUTE'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── JOINED — live ─────────────────────────────────────────────── */}
          {joined && (
            <motion.div key="live" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

              {isTouch ? (
                /* ── MOBILE ─────────────────────────────────────────────── */
                <div className="flex flex-col gap-0">
                  {/* Big PTT */}
                  <div className="flex flex-col items-center pt-2 pb-6 gap-5">
                    <div className="relative flex items-center justify-center">
                      {speaking && micOn && <span className="absolute inset-0 rounded-full border-2 border-[var(--c-gold)] animate-ping opacity-60 pointer-events-none" />}
                      <button
                        onTouchStart={e => { e.preventDefault(); pttTouchStart() }}
                        onTouchEnd={e => { e.preventDefault(); pttTouchEnd() }}
                        onClick={toggleMic}
                        className={`w-24 h-24 rounded-full border-2 flex flex-col items-center justify-center gap-2 select-none transition-all active:scale-95 ${
                          micOn ? 'bg-[var(--c-accent)] border-[var(--c-accent)] text-[var(--c-bg)] shadow-[0_0_0_8px_rgba(80,26,44,0.12)]' : 'bg-transparent border-[var(--c-accent)] text-[var(--c-accent)]'
                        }`}
                        style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'none' }}>
                        <MicIcon off={!micOn} />
                        <span className="font-mono text-[9px] uppercase tracking-widest">{micOn ? 'TAP OFF' : 'TAP ON'}</span>
                      </button>
                    </div>
                    {/* Floating reactions */}
                    <div className="relative h-8 w-full overflow-visible pointer-events-none select-none">
                      {floatReactions.map(r => (
                        <span key={r.id} className="absolute text-xl"
                          style={{ left: `${r.x}%`, bottom: 0, animation: 'epris-float-up 2.2s ease-out forwards' }}>{r.emoji}</span>
                      ))}
                      <style>{`@keyframes epris-float-up { 0%{transform:translateY(0) scale(1);opacity:1}100%{transform:translateY(-70px) scale(.5);opacity:0} }`}</style>
                    </div>
                    {/* Quick reactions */}
                    <div className="flex gap-5">
                      {['👏', '❤️', '🔥', '🎙'].map(e => (
                        <button key={e} onClick={() => sendReaction(callId!, e)}
                          className="text-2xl opacity-50 hover:opacity-100 active:scale-125 transition-all select-none"
                          style={{ touchAction: 'none', WebkitTapHighlightColor: 'transparent' }}>{e}</button>
                      ))}
                    </div>
                  </div>

                  {/* Mobile tab bar */}
                  <div className="border-t border-[rgb(var(--c-accent-rgb)_/_0.1)]">
                    <div className="grid grid-cols-3 border-b border-[rgb(var(--c-accent-rgb)_/_0.1)]">
                      {([
                        { id: 'members' as const, label: t('radio.participants'), Icon: UsersIcon },
                        { id: 'chat' as const, label: 'Чат', Icon: ChatIcon, badge: unreadChat },
                        { id: 'music' as const, label: 'Музика', Icon: MusicIcon, dot: isMusicOn },
                      ]).map(tab => (
                        <button key={tab.id} onClick={() => { setMobileTab(tab.id); if (tab.id === 'chat') switchToChat('mobile') }}
                          className={`relative py-3 flex flex-col items-center gap-1 font-mono text-[9px] uppercase tracking-widest transition-colors ${
                            mobileTab === tab.id ? 'bg-[var(--c-accent)] text-[var(--c-bg)]' : 'text-[rgb(var(--c-accent-rgb)_/_0.5)] hover:text-[var(--c-accent)]'
                          }`}>
                          <tab.Icon />
                          {tab.label}
                          {'badge' in tab && (tab.badge ?? 0) > 0 && (
                            <span className="absolute top-1.5 right-1/4 w-4 h-4 bg-[var(--c-gold)] rounded-full font-mono text-[8px] flex items-center justify-center text-[var(--c-accent)]">{tab.badge}</span>
                          )}
                          {'dot' in tab && tab.dot && <span className="absolute top-2 right-1/4 w-1.5 h-1.5 bg-[var(--c-gold)] rounded-full animate-pulse" />}
                        </button>
                      ))}
                    </div>

                    <div className="min-h-[200px]">
                      {mobileTab === 'members' && (
                        <div className="border-b border-[rgb(var(--c-accent-rgb)_/_0.1)]">
                          <div className="bg-[var(--c-accent)] text-[var(--c-bg)] px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest">
                            {t('radio.participants')} · {total + 1}
                          </div>
                          <MembersPanel members={members} myUser={myUser} memberVolumes={memberVolumes} peerStates={peerStates}
                            micOn={micOn} speaking={speaking} editingNick={editingNick} onEditNick={() => setEditingNick(true)}
                            onSaveNick={handleRename} onCancelNick={() => setEditingNick(false)}
                            onSetVolume={setMemberVolume} total={total} t={t} />
                        </div>
                      )}
                      {mobileTab === 'chat' && callId && (
                        <div className="h-[300px] flex flex-col">
                          <ChatPanel messages={messages} callId={callId} myNick={myUser?.nickname ?? ''}
                            onSendText={sendText} onSendReaction={sendReaction} compact t={t} />
                        </div>
                      )}
                      {mobileTab === 'music' && (
                        <div className="border-b border-[rgb(var(--c-accent-rgb)_/_0.1)]">
                          {isHost ? (
                            <>
                              <div className="bg-[rgb(var(--c-accent-rgb)_/_0.05)] px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.4)] flex items-center gap-2">
                                <MusicIcon /> Бібліотека треків
                              </div>
                              <MusicPanel onPlay={startMusicBroadcast} isPlaying={isMusicOn} />
                            </>
                          ) : (
                            <div className="px-4 py-8 text-center">
                              <p className="font-mono text-[10px] text-[rgb(var(--c-accent-rgb)_/_0.4)] uppercase tracking-widest">
                                {nowPlaying ? `♫ ${nowPlaying.title}` : 'Музика не грає'}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex gap-2 pt-4">
                    <button onClick={leave} className="flex-1 border border-[rgb(var(--c-accent-rgb)_/_0.3)] text-[rgb(var(--c-accent-rgb)_/_0.6)] py-3.5 font-mono text-[10px] uppercase tracking-widest hover:border-[var(--c-accent)] hover:text-[var(--c-accent)] transition-colors">
                      {t('radio.leave')}
                    </button>
                    {isHost && (
                      <button onClick={() => window.confirm(t('radio.end_broadcast_confirm')) && endBroadcast()}
                        className="flex-1 border border-red-800/30 text-red-800/60 py-3.5 font-mono text-[10px] uppercase tracking-widest hover:border-red-800 hover:text-red-800 transition-colors">
                        {t('radio.end_broadcast')}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* ── DESKTOP ────────────────────────────────────────────── */
                <div className="grid grid-cols-[1fr_300px] gap-10 items-start">
                  {/* Left: controls + reactions */}
                  <div>
                    {/* Status */}
                    <p className="font-serif text-lg text-[rgb(var(--c-accent-rgb)_/_0.7)] mb-6 leading-relaxed">
                      {members.some(m => m.speaking)
                        ? `${members.filter(m => m.speaking).map(m => m.nickname).join(', ')} говорить…`
                        : micOn && speaking ? t('radio.mic_on') : t('radio.mic_off')}
                    </p>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-3 mb-8">
                      <div className="relative">
                        {speaking && micOn && <span className="absolute inset-0 border border-[var(--c-gold)] animate-ping opacity-40 pointer-events-none" />}
                        <button onClick={toggleMic}
                          className={`flex items-center gap-3 border px-6 py-3.5 font-mono text-xs uppercase tracking-widest transition-colors ${
                            micOn ? 'bg-[var(--c-accent)] text-[var(--c-bg)] border-[var(--c-accent)]' : 'text-[var(--c-accent)] border-[var(--c-accent)] hover:bg-[var(--c-accent)] hover:text-[var(--c-bg)]'
                          }`}>
                          <MicIcon off={!micOn} />
                          {micOn ? t('radio.mic_on') : t('radio.mic_off')}
                        </button>
                      </div>
                      <button onClick={leave}
                        className="border border-[rgb(var(--c-accent-rgb)_/_0.3)] text-[rgb(var(--c-accent-rgb)_/_0.6)] px-6 py-3.5 font-mono text-xs uppercase tracking-widest hover:border-[var(--c-accent)] hover:text-[var(--c-accent)] transition-colors">
                        {t('radio.leave')}
                      </button>
                      {isHost && (
                        <button onClick={() => window.confirm(t('radio.end_broadcast_confirm')) && endBroadcast()}
                          className="border border-red-800/20 text-red-800/50 px-6 py-3.5 font-mono text-xs uppercase tracking-widest hover:border-red-800/60 hover:text-red-800 transition-colors">
                          {t('radio.end_broadcast')}
                        </button>
                      )}
                    </div>

                    <p className="font-mono text-[9px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.3)] mb-8">{t('radio.ptt_hint')}</p>

                    {/* Reactions */}
                    <div className="relative">
                      <div className="absolute bottom-10 left-0 w-48 h-6 overflow-visible pointer-events-none select-none">
                        {floatReactions.map(r => (
                          <span key={r.id} className="absolute text-xl"
                            style={{ left: `${r.x}%`, bottom: 0, animation: 'epris-float-up 2.2s ease-out forwards' }}>{r.emoji}</span>
                        ))}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {REACTIONS.map(e => (
                          <button key={e} onClick={() => sendReaction(callId!, e)}
                            className="text-lg w-9 h-9 flex items-center justify-center border border-[rgb(var(--c-accent-rgb)_/_0.1)] hover:border-[rgb(var(--c-accent-rgb)_/_0.4)] hover:scale-110 active:scale-95 transition-all">
                            {e}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: tabbed sidebar */}
                  <div className="border border-[rgb(var(--c-accent-rgb)_/_0.2)] flex flex-col" style={{ minHeight: 420 }}>
                    {/* Tab bar */}
                    <div className="grid grid-cols-3 border-b border-[rgb(var(--c-accent-rgb)_/_0.1)]">
                      {([
                        { id: 'members' as const, label: t('radio.participants').slice(0, 8), Icon: UsersIcon },
                        { id: 'chat' as const, label: 'Чат', Icon: ChatIcon, badge: unreadChat },
                        { id: 'music' as const, label: 'Музика', Icon: MusicIcon, dot: isMusicOn },
                      ]).map(tab => (
                        <button key={tab.id} onClick={() => { setDesktopTab(tab.id); if (tab.id === 'chat') switchToChat('desktop') }}
                          className={`relative py-2.5 flex flex-col items-center gap-1 font-mono text-[8px] uppercase tracking-widest border-r border-[rgb(var(--c-accent-rgb)_/_0.1)] last:border-r-0 transition-colors ${
                            desktopTab === tab.id ? 'bg-[var(--c-accent)] text-[var(--c-bg)]' : 'text-[rgb(var(--c-accent-rgb)_/_0.4)] hover:text-[var(--c-accent)] hover:bg-[rgb(var(--c-accent-rgb)_/_0.05)]'
                          }`}>
                          <tab.Icon />
                          {tab.label}
                          {'badge' in tab && (tab.badge ?? 0) > 0 && (
                            <span className="absolute top-1 right-2 w-3.5 h-3.5 bg-[var(--c-gold)] rounded-full font-mono text-[7px] flex items-center justify-center text-[var(--c-accent)]">{tab.badge}</span>
                          )}
                          {'dot' in tab && tab.dot && <span className="absolute top-1.5 right-2 w-1.5 h-1.5 bg-[var(--c-gold)] rounded-full animate-pulse" />}
                        </button>
                      ))}
                    </div>

                    {/* Tab content */}
                    {desktopTab === 'members' && (
                      <>
                        <div className="bg-[var(--c-accent)] text-[var(--c-bg)] px-4 py-2.5 font-mono text-[9px] uppercase tracking-widest">
                          {t('radio.participants')} · {total + 1}
                        </div>
                        <div className="flex-1 overflow-y-auto">
                          <MembersPanel members={members} myUser={myUser} memberVolumes={memberVolumes} peerStates={peerStates}
                            micOn={micOn} speaking={speaking} editingNick={editingNick} onEditNick={() => setEditingNick(true)}
                            onSaveNick={handleRename} onCancelNick={() => setEditingNick(false)}
                            onSetVolume={setMemberVolume} total={total} t={t} />
                        </div>
                      </>
                    )}

                    {desktopTab === 'chat' && callId && (
                      <div className="flex-1 flex flex-col min-h-0">
                        <ChatPanel messages={messages} callId={callId} myNick={myUser?.nickname ?? ''}
                          onSendText={sendText} onSendReaction={sendReaction} compact t={t} />
                      </div>
                    )}

                    {desktopTab === 'music' && (
                      <div className="flex-1 overflow-y-auto">
                        {isHost ? (
                          <>
                            <div className="bg-[rgb(var(--c-accent-rgb)_/_0.05)] px-4 py-2.5 font-mono text-[9px] uppercase tracking-widest text-[rgb(var(--c-accent-rgb)_/_0.4)] flex items-center gap-2 border-b border-[rgb(var(--c-accent-rgb)_/_0.1)]">
                              <MusicIcon /> Треки для трансляції
                            </div>
                            <MusicPanel onPlay={startMusicBroadcast} isPlaying={isMusicOn} />
                          </>
                        ) : (
                          <div className="px-4 py-10 text-center">
                            <MusicIcon />
                            <p className="font-mono text-[10px] text-[rgb(var(--c-accent-rgb)_/_0.4)] uppercase tracking-widest mt-3">
                              {nowPlaying ? `♫ ${nowPlaying.title}` : 'Музика не транслюється'}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {error && <div className="mt-6 border border-[rgb(var(--c-accent-rgb)_/_0.2)] bg-[#E8DED5] p-4 font-mono text-xs text-[var(--c-accent)]">{error}</div>}
      </div>

      <ToastStack toasts={toasts} />
    </div>
  )
}
