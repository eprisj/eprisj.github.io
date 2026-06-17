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

type Announcement = {
  id: number
  title: string
  body?: string
  event_date?: string
  location?: string
  tags: string[]
  link_url?: string
  link_label?: string
}

// ── Icons ────────────────────────────────────────────────────────────────────

function MicIcon({ off }: { off?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" width={20} height={20} aria-hidden>
      <path d="M9 4.5a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0v-6Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      {off && <path d="M3.5 3.5l17 17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />}
    </svg>
  )
}

// ── Signal bars ───────────────────────────────────────────────────────────────

function SignalBars({ active }: { active: boolean }) {
  return (
    <div className="flex items-end gap-[3px] h-8" aria-hidden>
      {Array.from({ length: 24 }).map((_, i) => (
        <span
          key={i}
          className={`w-[3px] rounded-sm ${active ? 'bg-[#F5F0EB]' : 'bg-[#F5F0EB]/20'}`}
          style={{
            height: active ? `${20 + Math.sin(i * 0.7) * 12}px` : `${4 + (i % 4) * 3}px`,
            transition: active ? `height 0.${3 + (i % 4)}s ease-in-out ${i * 0.04}s, background-color 0.3s` : 'all 0.6s',
            animation: active ? `epris-bar ${0.6 + (i % 5) * 0.15}s ease-in-out infinite alternate` : 'none',
            animationDelay: `${i * 0.05}s`,
          }}
        />
      ))}
      <style>{`@keyframes epris-bar { from { height: 4px; } to { height: 28px; } }`}</style>
    </div>
  )
}

// ── Live badge ────────────────────────────────────────────────────────────────

function LiveBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 border border-[#C9A690] px-3 py-1">
      <span className="w-1.5 h-1.5 rounded-full bg-[#C9A690] animate-pulse" />
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#C9A690]">{label}</span>
    </span>
  )
}

// ── Schedule card (announcements used as broadcast schedule) ─────────────────

function ScheduleCard({ ann }: { ann: Announcement }) {
  return (
    <div className="border-b border-[#F5F0EB]/10 py-5 last:border-0">
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1 min-w-0">
          {ann.event_date && (
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#C9A690] mb-2">
              {new Date(ann.event_date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
              {ann.location && ` · ${ann.location}`}
            </p>
          )}
          <h3 className="font-serif text-lg text-[#F5F0EB] leading-snug">{ann.title}</h3>
          {ann.body && <p className="font-mono text-[11px] text-[#F5F0EB]/50 mt-2 leading-relaxed">{ann.body}</p>}
        </div>
        {ann.link_url && (
          <a href={ann.link_url} target="_blank" rel="noopener noreferrer"
            className="shrink-0 border border-[#F5F0EB]/20 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-[#F5F0EB]/60 hover:border-[#C9A690] hover:text-[#C9A690] transition-colors whitespace-nowrap">
            {ann.link_label || '→'}
          </a>
        )}
      </div>
    </div>
  )
}

// ── Volume toggle (3 levels) ──────────────────────────────────────────────────

function VolumeToggle({ userId, volume, onSet }: { userId: number; volume: number; onSet: (id: number, v: number) => void }) {
  const icon = volume >= 0.75 ? '🔊' : volume >= 0.25 ? '🔉' : '🔇'
  const next = volume >= 0.75 ? 0.5 : volume >= 0.25 ? 0 : 1
  return (
    <button
      onClick={e => { e.stopPropagation(); onSet(userId, next) }}
      className="shrink-0 text-[13px] opacity-40 hover:opacity-80 active:scale-110 transition-all select-none"
      title="Volume"
      style={{ touchAction: 'none' }}
    >
      {icon}
    </button>
  )
}

// ── Nickname prompt ───────────────────────────────────────────────────────────

function NicknamePrompt({ onJoin, loading, t }: { onJoin: (nick: string) => void; loading: boolean; t: (k: string) => string }) {
  const [nick, setNick] = useState('')
  return (
    <div className="border border-[#501a2c] p-8 max-w-sm mx-auto">
      <p className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/60 mb-6">{t('radio.nick_label')}</p>
      <input
        type="text"
        value={nick}
        onChange={e => setNick(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && nick.trim().length >= 2 && onJoin(nick.trim())}
        placeholder={t('radio.nick_placeholder')}
        maxLength={24}
        className="w-full bg-transparent border-b border-[#501a2c] font-serif text-xl text-[#501a2c] placeholder-[#501a2c]/30 focus:outline-none pb-2 mb-8"
        autoFocus
      />
      <button
        onClick={() => onJoin(nick.trim() || '')}
        disabled={loading}
        className="w-full border border-[#501a2c] bg-[#501a2c] text-[#F5F0EB] font-mono text-xs uppercase tracking-widest py-3 hover:bg-[#3d1220] transition-colors disabled:opacity-50"
      >
        {loading ? t('radio.connecting') : t('radio.nick_enter')}
      </button>
      <p className="font-mono text-[10px] text-[#501a2c]/40 mt-4 text-center">{t('radio.nick_anon')}</p>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

// ── Slug helper ───────────────────────────────────────────────────────────────

function toSlug(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z0-9а-яіїє]+/gi, '-').replace(/^-|-$/g, '').slice(0, 40) || 'main'
}

// ── Active rooms list ─────────────────────────────────────────────────────────

function RoomsList({ rooms, onJoin, t }: { rooms: ActiveRoom[]; onJoin: (slug: string, title: string) => void; t: (k: string) => string }) {
  const filtered = rooms.filter(r => r.slug.startsWith(CHANNEL))
  if (!filtered.length) return null
  return (
    <div className="mt-12 border-t border-[#501a2c]/10 pt-10">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#501a2c]/40 mb-5">{t('radio.active_rooms')}</p>
      <ul className="space-y-0">
        {filtered.map(r => {
          const rawSlug = stripChannel(r.slug)
          const displayTitle = r.title === r.slug ? rawSlug : r.title
          return (
            <li key={r.slug} className="border border-[#501a2c]/10 hover:border-[#501a2c]/30 transition-colors">
              <button
                onClick={() => onJoin(rawSlug, displayTitle)}
                className="w-full flex items-center justify-between px-5 py-4 text-left group"
              >
                <span className="flex items-center gap-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C9A690] animate-pulse" />
                  <span className="font-serif text-lg text-[#501a2c] group-hover:text-[#3d1220] transition-colors">
                    {displayTitle}
                  </span>
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/40">
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
    <div className="mt-8 border border-dashed border-[#501a2c]/20 p-6 max-w-sm">
      <p className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/40 mb-4">{t('radio.create_room')}</p>
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && slug && onStart(slug, name.trim())}
        placeholder={t('radio.room_name_placeholder')}
        maxLength={50}
        className="w-full bg-transparent border-b border-[#501a2c]/30 font-serif text-lg text-[#501a2c] placeholder-[#501a2c]/20 focus:outline-none pb-2 mb-4 focus:border-[#501a2c]"
        autoFocus
      />
      {slug && (
        <p className="font-mono text-[9px] text-[#501a2c]/30 mb-4 truncate">
          /radio?room={slug}
        </p>
      )}
      <button
        onClick={() => slug && onStart(slug, name.trim())}
        disabled={!slug}
        className="w-full border border-[#501a2c] bg-[#501a2c] text-[#F5F0EB] font-mono text-xs uppercase tracking-widest py-3 hover:bg-[#3d1220] transition-colors disabled:opacity-30"
      >
        {t('radio.create_and_join')}
      </button>
    </div>
  )
}

// ── Inline nick editor ────────────────────────────────────────────────────────

function NickEditor({ current, onSave, onCancel }: { current: string; onSave: (v: string) => void; onCancel: () => void }) {
  const [val, setVal] = useState(current)
  return (
    <form onSubmit={e => { e.preventDefault(); val.trim().length >= 2 && onSave(val.trim()) }}
      className="flex items-center gap-2">
      <input type="text" value={val} onChange={e => setVal(e.target.value)} maxLength={24} autoFocus
        className="bg-transparent border-b border-[#501a2c] text-[#501a2c] font-serif text-base w-32 focus:outline-none pb-0.5" />
      <button type="submit" className="font-mono text-[10px] text-[#501a2c] uppercase tracking-widest hover:opacity-60">OK</button>
      <button type="button" onClick={onCancel} className="font-mono text-[10px] text-[#501a2c]/30 uppercase tracking-widest">✕</button>
    </form>
  )
}

// ── Chat panel ────────────────────────────────────────────────────────────────

function ChatPanel({
  messages, callId, myNick, onSendText, onSendReaction, t,
}: {
  messages: ChatMessage[]; callId: number; myNick: string
  onSendText: (cid: number, text: string) => void
  onSendReaction: (cid: number, emoji: string) => void
  t: (k: string) => string
}) {
  const [text, setText] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])
  const textMessages = messages.filter(m => m.type === 'text')
  return (
    <div className="border border-[#501a2c]/20 mt-6">
      <div className="bg-[#501a2c]/5 px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/40 flex items-center justify-between border-b border-[#501a2c]/10">
        <span>{t('radio.chat') || 'Чат'}</span>
        <button onClick={() => setShowPicker(p => !p)} className="text-base opacity-50 hover:opacity-100 transition-opacity">🙂</button>
      </div>
      <AnimatePresence>
        {showPicker && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-b border-[#501a2c]/10 overflow-hidden">
            <div className="flex flex-wrap gap-3 px-4 py-3">
              {REACTIONS.map(e => (
                <button key={e} onClick={() => { onSendReaction(callId, e); setShowPicker(false) }}
                  className="text-xl hover:scale-125 active:scale-110 transition-all">{e}</button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="h-40 overflow-y-auto px-4 py-3 space-y-2 overscroll-contain">
        {textMessages.length === 0 && (
          <p className="font-mono text-[10px] text-[#501a2c]/20 text-center pt-4">…</p>
        )}
        {textMessages.map(m => (
          <div key={m.id} className={`flex gap-2 items-start ${m.nickname === myNick ? 'flex-row-reverse' : ''}`}>
            <div className="w-5 h-5 rounded-full flex items-center justify-center font-semibold text-[9px] text-[#F5F0EB] shrink-0"
              style={{ background: m.color }}>{m.nickname[0]?.toUpperCase()}</div>
            <div className={`flex flex-col gap-0.5 max-w-[72%] ${m.nickname === myNick ? 'items-end' : ''}`}>
              {m.nickname !== myNick && <span className="font-mono text-[9px] text-[#501a2c]/30">{m.nickname}</span>}
              <span className={`px-3 py-1.5 font-sans text-sm leading-snug break-words ${
                m.nickname === myNick ? 'bg-[#501a2c] text-[#F5F0EB]' : 'bg-[#501a2c]/8 text-[#501a2c]'
              }`}>{m.content}</span>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={e => { e.preventDefault(); if (text.trim()) { onSendText(callId, text); setText('') } }}
        className="border-t border-[#501a2c]/10 flex items-center gap-2 px-3 py-2">
        <input type="text" value={text} onChange={e => setText(e.target.value)} placeholder="Написать…" maxLength={300}
          className="flex-1 bg-transparent text-sm text-[#501a2c] placeholder-[#501a2c]/25 focus:outline-none" />
        <button type="submit" disabled={!text.trim()}
          className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c] disabled:opacity-20">→</button>
      </form>
    </div>
  )
}

// ── Share button ──────────────────────────────────────────────────────────────

function ShareButton({ roomSlug, t }: { roomSlug: string; t: (k: string) => string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    const raw = stripChannel(roomSlug)
    const url = raw === 'main'
      ? `${window.location.origin}/radio`
      : `${window.location.origin}/radio?room=${encodeURIComponent(raw)}`
    navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(() => {})
  }
  return (
    <button
      onClick={copy}
      className="border border-[#F5F0EB]/20 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-[#F5F0EB]/50 hover:border-[#C9A690] hover:text-[#C9A690] transition-colors whitespace-nowrap"
    >
      {copied ? '✓ copied' : t('radio.share_link')}
    </button>
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
    join, leave, endBroadcast, toggleMic, unlockAudio, setMemberVolume,
  } = useEprisVoice({ roomSlug, roomTitle })

  const { messages, sendText, sendReaction: sendReactionApi, rename } = useChat(callId, joined)

  const [showNickPrompt, setShowNickPrompt] = useState(false)
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [editingNick, setEditingNick] = useState(false)
  const [pttHeld, setPttHeld] = useState(false)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [floatReactions, setFloatReactions] = useState<{ id: string; emoji: string; x: number }[]>([])
  const pttBusyRef = useRef(false)
  const lastReactionIdRef = useRef(0)

  // broadcast shared reactions from chat poll
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

  const sendReaction = useCallback((emoji: string) => {
    if (callId) sendReactionApi(callId, emoji)
  }, [callId, sendReactionApi])

  const handleRename = async (nick: string) => {
    await rename(nick)
    setEditingNick(false)
  }

  const navigateToRoom = useCallback((rawSlug: string, title: string) => {
    const url = rawSlug === 'main' ? '/radio' : `/radio?room=${encodeURIComponent(rawSlug)}`
    window.history.pushState(null, '', url)
    setRoomSlug(CHANNEL + rawSlug)
    setRoomTitle(title)
    setShowNickPrompt(true)
    setShowCreateRoom(false)
  }, [])

  // Show ended notice when broadcast is terminated by host
  useEffect(() => { if (broadcastEnded) setShowEndedNotice(true) }, [broadcastEnded])

  const total = members.length + (joined ? 1 : 0)
  const anyoneSpeaking = members.some(m => m.speaking) || (micOn && speaking)
  const isActive = joined || members.length > 0

  useEffect(() => {
    fetch(`${API}/api/announcements`).then(r => r.json()).then(d => setAnnouncements(d.data || [])).catch(() => {})
  }, [])

  const handleJoin = async (nick: string) => {
    setShowNickPrompt(false)
    const rawSlug = stripChannel(roomSlug)
    const url = rawSlug === 'main' ? '/radio' : `/radio?room=${encodeURIComponent(rawSlug)}`
    window.history.replaceState(null, '', url)
    await join(nick)
  }

  // PTT Space key (desktop only)
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

  // Mobile PTT — touch hold
  const pttTouchStart = useCallback(() => {
    if (pttBusyRef.current || micOn) return
    pttBusyRef.current = true; setPttHeld(true)
    toggleMic().finally(() => { pttBusyRef.current = false })
  }, [micOn, toggleMic])
  const pttTouchEnd = useCallback(() => {
    if (pttHeld && micOn) { setPttHeld(false); toggleMic() }
  }, [pttHeld, micOn, toggleMic])

  return (
    <div className="min-h-screen bg-[#F5F0EB]">

      {/* ── Hero dark strip ────────────────────────────────────────────────── */}
      <div className="bg-[#501a2c] pt-16">
        <div className="max-w-5xl mx-auto px-8 md:px-16 pt-12 pb-10">

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#C9A690] mb-4">{t('radio.eyebrow')}</p>
              <h1 className="font-serif text-5xl md:text-7xl text-[#F5F0EB] leading-none mb-4">
                {joined ? t('radio.on_air') : members.length > 0 ? t('radio.broadcast_active') : 'EPRIS Live'}
              </h1>
              <p className="font-serif text-lg text-[#F5F0EB]/60 max-w-xl leading-relaxed">
                {t('radio.concept')}
              </p>
            </div>
            <div className="flex flex-col items-end gap-3 shrink-0">
              {isActive
                ? <LiveBadge label={t('radio.live_badge')} />
                : <span className="font-mono text-[10px] uppercase tracking-widest text-[#F5F0EB]/30">{t('radio.standby')}</span>
              }
              {isActive && (
                <span className="font-mono text-xs text-[#F5F0EB]/40 uppercase tracking-widest">
                  {total} {pluralEn(total, t)}
                </span>
              )}
              {roomSlug !== 'main' && (
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#C9A690]/60 max-w-[120px] truncate">
                  #{roomSlug}
                </span>
              )}
              {joined && <ShareButton roomSlug={roomSlug} t={t} />}
            </div>
          </div>

          {/* Signal meter */}
          <div className="border border-[#F5F0EB]/10 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#F5F0EB]/40">Signal · WebRTC</span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#C9A690]">
                {anyoneSpeaking ? '● LIVE' : '○ STANDBY'}
              </span>
            </div>
            <SignalBars active={anyoneSpeaking} />
          </div>
        </div>

        {/* Schedule strip (inside dark bg) */}
        {announcements.length > 0 && (
          <div className="border-t border-[#F5F0EB]/10">
            <div className="max-w-5xl mx-auto px-8 md:px-16 py-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#C9A690] mb-6">{t('radio.schedule_title')}</p>
              {announcements.slice(0, 3).map(ann => <ScheduleCard key={ann.id} ann={ann} />)}
            </div>
          </div>
        )}
      </div>

      {/* ── Light area ─────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-8 md:px-16 py-16">

        {/* Audio unlock */}
        <AnimatePresence>
          {audioBlocked && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="mb-8 border border-[#501a2c] bg-[#501a2c] text-[#F5F0EB] p-4 flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-widest">{t('radio.unlock_audio')}</span>
              <button onClick={unlockAudio} className="border border-[#F5F0EB]/30 px-4 py-2 font-mono text-xs uppercase tracking-widest hover:bg-[#F5F0EB]/10 transition-colors">
                {t('radio.unlock_btn')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">

          {/* Broadcast ended notice */}
          <AnimatePresence>
            {showEndedNotice && !joined && (
              <motion.div key="ended-notice" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-8 border border-[#501a2c]/20 bg-[#501a2c]/5 p-4 flex items-center justify-between">
                <span className="font-mono text-xs text-[#501a2c]/70 uppercase tracking-widest">{t('radio.broadcast_ended')}</span>
                <button onClick={() => setShowEndedNotice(false)} className="font-mono text-[10px] text-[#501a2c]/40 uppercase tracking-widest hover:text-[#501a2c]">✕</button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Idle — no one in ether */}
          {!joined && members.length === 0 && !showNickPrompt && !showCreateRoom && (
            <motion.div key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="grid md:grid-cols-2 gap-16 items-start">
                <div>
                  <h2 className="font-serif text-4xl md:text-5xl text-[#501a2c] mb-6 leading-tight">
                    {t('radio.idle_title')}
                  </h2>
                  <p className="font-serif text-lg text-[#501a2c]/70 leading-relaxed mb-10">
                    {t('radio.idle_desc')}
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <button
                      onClick={() => setShowNickPrompt(true)}
                      disabled={connecting}
                      className="border border-[#501a2c] bg-[#501a2c] text-[#F5F0EB] font-mono text-xs uppercase tracking-widest px-8 py-4 hover:bg-[#3d1220] transition-colors disabled:opacity-50"
                    >
                      {connecting ? t('radio.connecting') : t('radio.join_cta')}
                    </button>
                    <button
                      onClick={() => setShowCreateRoom(true)}
                      className="border border-[#501a2c]/30 text-[#501a2c]/60 font-mono text-xs uppercase tracking-widest px-6 py-4 hover:border-[#501a2c] hover:text-[#501a2c] transition-colors"
                    >
                      {t('radio.create_room')}
                    </button>
                  </div>
                </div>
                <div className="space-y-0">
                  {[t('radio.feat1'), t('radio.feat2'), t('radio.feat3'), t('radio.feat4')].map((item, i) => (
                    <div key={i} className="flex items-start gap-4 border-b border-[#501a2c]/10 py-5 first:pt-0">
                      <div className="w-8 h-8 border border-[#501a2c]/30 flex items-center justify-center text-[#501a2c]/40 font-mono text-[10px] shrink-0">
                        {String(i + 1).padStart(2, '0')}
                      </div>
                      <p className="font-serif text-[#501a2c]/70 mt-1 leading-snug">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <RoomsList rooms={activeRooms} onJoin={navigateToRoom} t={t} />

              {/* Empty schedule notice */}
              {announcements.length === 0 && activeRooms.length === 0 && (
                <div className="mt-16 border-t border-[#501a2c]/10 pt-10">
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#501a2c]/30 mb-2">{t('radio.schedule_title')}</p>
                  <p className="font-serif text-[#501a2c]/30">{t('radio.schedule_empty')}</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Create room panel */}
          {!joined && showCreateRoom && (
            <motion.div key="create" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="mb-8">
                <button onClick={() => setShowCreateRoom(false)} className="font-mono text-xs uppercase tracking-widest text-[#501a2c]/50 hover:text-[#501a2c] transition-colors">
                  {t('radio.back')}
                </button>
              </div>
              <CreateRoomPanel onStart={(slug, title) => navigateToRoom(slug, title)} t={t} />
            </motion.div>
          )}

          {/* Nickname prompt */}
          {!joined && showNickPrompt && (
            <motion.div key="nick" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="mb-8">
                <button onClick={() => setShowNickPrompt(false)} className="font-mono text-xs uppercase tracking-widest text-[#501a2c]/50 hover:text-[#501a2c] transition-colors">
                  {t('radio.back')}
                </button>
              </div>
              <NicknamePrompt onJoin={handleJoin} loading={connecting} t={t} />
            </motion.div>
          )}

          {/* Others in ether, not joined */}
          {!joined && members.length > 0 && !showNickPrompt && (
            <motion.div key="watching" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="grid md:grid-cols-2 gap-16 items-start">
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <LiveBadge label={t('radio.live_badge')} />
                  </div>
                  <h2 className="font-serif text-4xl text-[#501a2c] mb-4 leading-tight">{t('radio.broadcast_active')}</h2>
                  <p className="font-serif text-lg text-[#501a2c]/60 mb-10">
                    {members.map(m => m.nickname).join(', ')}
                  </p>
                  <button
                    onClick={() => setShowNickPrompt(true)}
                    disabled={connecting}
                    className="border border-[#501a2c] bg-[#501a2c] text-[#F5F0EB] font-mono text-xs uppercase tracking-widest px-8 py-4 hover:bg-[#3d1220] transition-colors disabled:opacity-50"
                  >
                    {connecting ? t('radio.connecting') : t('radio.join_active')}
                  </button>
                </div>
                <ul className="border border-[#501a2c]/20">
                  <li className="bg-[#501a2c]/5 px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/40">
                    {t('radio.participants')} · {members.length}
                  </li>
                  {members.map(m => (
                    <li key={m.user_id} className="border-t border-[#501a2c]/10 px-4 py-3 flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: m.color }} />
                      <span className="font-serif text-lg text-[#501a2c]">{m.nickname}</span>
                      <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/40">{m.mic_on ? 'MIC' : 'MUTE'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}

          {/* Joined — live */}
          {joined && (
            <motion.div key="live" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

              {/* Status line */}
              <p className="font-serif text-xl text-[#501a2c]/70 mb-8 leading-relaxed">
                {members.some(m => m.speaking)
                  ? `${members.filter(m => m.speaking).map(m => m.nickname).join(', ')}…`
                  : micOn && speaking ? t('radio.mic_on') : t('radio.mic_off')}
              </p>

              {/* Mobile layout: PTT big button centered + members below */}
              {isTouch ? (
                <div className="flex flex-col items-center gap-8">
                  {/* Big PTT button */}
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative flex items-center justify-center">
                      {speaking && micOn && (
                        <span className="absolute inset-0 rounded-full border-2 border-[#C9A690] animate-ping opacity-60 pointer-events-none" />
                      )}
                      <button
                        onTouchStart={e => { e.preventDefault(); pttTouchStart() }}
                        onTouchEnd={e => { e.preventDefault(); pttTouchEnd() }}
                        onClick={toggleMic}
                        className={`w-28 h-28 rounded-full border-2 flex flex-col items-center justify-center gap-2 select-none transition-all active:scale-95 ${
                          micOn
                            ? 'bg-[#501a2c] border-[#501a2c] text-[#F5F0EB] shadow-[0_0_0_8px_rgba(80,26,44,0.15)]'
                            : 'bg-transparent border-[#501a2c] text-[#501a2c]'
                        }`}
                        style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'none' }}
                      >
                        <MicIcon off={!micOn} />
                        <span className="font-mono text-[9px] uppercase tracking-widest">
                          {micOn ? 'TAP OFF' : 'TAP ON'}
                        </span>
                      </button>
                    </div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/30 text-center">
                      {micOn ? t('radio.mic_on') : t('radio.mic_off')}
                    </p>
                  </div>

                  {/* Emoji reactions */}
                  <div className="relative w-full flex flex-col items-center gap-3">
                    <div className="relative h-10 w-full overflow-visible pointer-events-none select-none">
                      {floatReactions.map(r => (
                        <span
                          key={r.id}
                          className="absolute text-2xl"
                          style={{
                            left: `${r.x}%`,
                            bottom: 0,
                            animation: 'epris-float-up 2.2s ease-out forwards',
                          }}
                        >{r.emoji}</span>
                      ))}
                      <style>{`@keyframes epris-float-up { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-80px) scale(0.5); opacity: 0; } }`}</style>
                    </div>
                    <div className="flex gap-5 justify-center">
                      {['👏', '❤️', '🎙'].map(e => (
                        <button
                          key={e}
                          onClick={() => sendReaction(e)}
                          className="text-2xl opacity-50 hover:opacity-100 active:scale-125 transition-all select-none"
                          style={{ touchAction: 'none', WebkitTapHighlightColor: 'transparent' }}
                        >{e}</button>
                      ))}
                    </div>
                  </div>

                  {/* Participants horizontal scroll */}
                  <div className="w-full border border-[#501a2c]">
                    <div className="bg-[#501a2c] text-[#F5F0EB] px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest">
                      {t('radio.participants')} · {total}
                    </div>
                    <ul className="divide-y divide-[#501a2c]/10 max-h-48 overflow-y-auto">
                      {myUser && (
                        <li className={`px-4 py-3 flex items-center gap-3 ${micOn ? '' : 'opacity-60'}`}>
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: myUser.color }} />
                          {editingNick
                            ? <NickEditor current={myUser.nickname} onSave={handleRename} onCancel={() => setEditingNick(false)} />
                            : <button onClick={() => setEditingNick(true)} className="font-serif text-[#501a2c] hover:underline text-left">{myUser.nickname} ✏️</button>}
                          <span className="ml-auto font-mono text-[9px] text-[#501a2c]/40 shrink-0">{micOn ? 'MIC' : 'MUTE'}</span>
                        </li>
                      )}
                      {members.map(m => (
                        <li key={m.user_id} className={`px-4 py-3 flex items-center gap-3 ${m.mic_on ? '' : 'opacity-60'}`}>
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: m.color }} />
                          <span className="font-serif text-[#501a2c] truncate">{m.nickname}</span>
                          {m.speaking && <span className="w-1.5 h-1.5 bg-[#C9A690] rounded-full animate-pulse shrink-0" />}
                          <span className="ml-auto font-mono text-[9px] text-[#501a2c]/40 shrink-0">{m.mic_on ? 'MIC' : 'MUTE'}</span>
                          <VolumeToggle userId={m.user_id} volume={memberVolumes[m.user_id] ?? 1} onSet={setMemberVolume} />
                        </li>
                      ))}
                    </ul>
                  </div>

                  {callId && (
                    <ChatPanel messages={messages} callId={callId} myNick={myUser?.nickname ?? ''}
                      onSendText={sendText} onSendReaction={sendReactionApi} t={t} />
                  )}

                  <div className="w-full flex gap-3">
                    <button
                      className="flex-1 border border-[#501a2c]/30 text-[#501a2c]/60 py-4 font-mono text-xs uppercase tracking-widest hover:border-[#501a2c] hover:text-[#501a2c] transition-colors"
                      onClick={leave}
                    >
                      {t('radio.leave')}
                    </button>
                    {isHost && (
                      <button
                        className="flex-1 border border-red-800/30 text-red-800/60 py-4 font-mono text-xs uppercase tracking-widest hover:border-red-800 hover:text-red-800 transition-colors"
                        onClick={() => window.confirm(t('radio.end_broadcast_confirm')) && endBroadcast()}
                      >
                        {t('radio.end_broadcast')}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Desktop layout */
                <div className="grid md:grid-cols-[1fr_280px] gap-12 items-start">
                  <div>
                    <div className="flex flex-wrap gap-4 mb-10">
                      <div className="relative">
                        {speaking && micOn && (
                          <span className="absolute inset-0 border border-[#C9A690] animate-ping opacity-50 pointer-events-none" />
                        )}
                        <button
                          className={`flex items-center gap-3 border px-6 py-4 font-mono text-xs uppercase tracking-widest transition-colors ${
                            micOn ? 'bg-[#501a2c] text-[#F5F0EB] border-[#501a2c]' : 'text-[#501a2c] border-[#501a2c] hover:bg-[#501a2c] hover:text-[#F5F0EB]'
                          }`}
                          onClick={toggleMic}
                        >
                          <MicIcon off={!micOn} />
                          {micOn ? t('radio.mic_on') : t('radio.mic_off')}
                        </button>
                      </div>
                      <button
                        className="border border-[#501a2c]/30 text-[#501a2c]/60 px-6 py-4 font-mono text-xs uppercase tracking-widest hover:border-[#501a2c] hover:text-[#501a2c] transition-colors"
                        onClick={leave}
                      >
                        {t('radio.leave')}
                      </button>
                      {isHost && (
                        <button
                          className="border border-red-800/20 text-red-800/50 px-6 py-4 font-mono text-xs uppercase tracking-widest hover:border-red-800/60 hover:text-red-800 transition-colors"
                          onClick={() => window.confirm(t('radio.end_broadcast_confirm')) && endBroadcast()}
                        >
                          {t('radio.end_broadcast')}
                        </button>
                      )}
                    </div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/30 mb-8">{t('radio.ptt_hint')}</p>

                    {/* Emoji reactions — desktop */}
                    <div className="relative">
                      <div className="absolute bottom-12 left-0 w-48 h-8 overflow-visible pointer-events-none select-none">
                        {floatReactions.map(r => (
                          <span key={r.id} className="absolute text-2xl"
                            style={{ left: `${r.x}%`, bottom: 0, animation: 'epris-float-up 2.2s ease-out forwards' }}>
                            {r.emoji}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-4">
                        {['👏', '❤️', '🎙'].map(e => (
                          <button key={e} onClick={() => sendReaction(e)}
                            className="text-xl opacity-40 hover:opacity-80 active:scale-125 transition-all select-none border border-[#501a2c]/10 w-10 h-10 flex items-center justify-center hover:border-[#501a2c]/30">
                            {e}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="border border-[#501a2c]">
                    <div className="bg-[#501a2c] text-[#F5F0EB] px-4 py-3 font-mono text-[10px] uppercase tracking-widest">
                      {t('radio.participants')} · {total}
                    </div>
                    <ul className="divide-y divide-[#501a2c]/10 max-h-72 overflow-y-auto">
                      {myUser && (
                        <li className={`px-4 py-3 flex items-center gap-3 ${micOn ? '' : 'opacity-60'}`}>
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: myUser.color }} />
                          {editingNick
                            ? <NickEditor current={myUser.nickname} onSave={handleRename} onCancel={() => setEditingNick(false)} />
                            : <button onClick={() => setEditingNick(true)} className="font-serif text-[#501a2c] hover:underline text-left">{myUser.nickname} ✏️</button>}
                          <span className="ml-auto font-mono text-[10px] text-[#501a2c]/40">{micOn ? 'MIC' : 'MUTE'}</span>
                        </li>
                      )}
                      {members.map(m => (
                        <li key={m.user_id} className={`px-4 py-3 flex items-center gap-3 ${m.mic_on ? '' : 'opacity-60'}`}>
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: m.color }} />
                          <span className="font-serif text-[#501a2c]">{m.nickname}</span>
                          {m.speaking && <span className="w-1.5 h-1.5 bg-[#C9A690] rounded-full animate-pulse" />}
                          <span className="ml-auto font-mono text-[10px] text-[#501a2c]/40">{m.mic_on ? 'MIC' : 'MUTE'}</span>
                          <VolumeToggle userId={m.user_id} volume={memberVolumes[m.user_id] ?? 1} onSet={setMemberVolume} />
                        </li>
                      ))}
                    </ul>
                    {callId && (
                      <ChatPanel messages={messages} callId={callId} myNick={myUser?.nickname ?? ''}
                        onSendText={sendText} onSendReaction={sendReactionApi} t={t} />
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="mt-8 border border-[#501a2c]/20 bg-[#E8DED5] p-4 font-mono text-xs text-[#501a2c]">{error}</div>
        )}
      </div>
    </div>
  )
}

function pluralEn(n: number, t: (k: string) => string) {
  // simple: just return "participants" label without count, count shown separately
  return t('radio.participants').toLowerCase()
}
