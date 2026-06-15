import { motion, AnimatePresence } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'
import { useEprisVoice } from '../hooks/useEprisVoice'

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

// ── Signal bars animation ────────────────────────────────────────────────────

function SignalBars({ active }: { active: boolean }) {
  return (
    <div className="flex items-end gap-[3px] h-8" aria-hidden>
      {Array.from({ length: 18 }).map((_, i) => (
        <span
          key={i}
          className={`w-[3px] rounded-sm transition-colors duration-300 ${active ? 'bg-[#501a2c]' : 'bg-[#501a2c]/20'}`}
          style={{
            height: active
              ? `${20 + Math.sin(i * 0.7) * 12}px`
              : `${6 + (i % 3) * 3}px`,
            transition: active ? `height 0.${3 + (i % 4)}s ease-in-out ${i * 0.04}s, background-color 0.3s` : 'all 0.5s',
            animation: active ? `epris-bar ${0.6 + (i % 5) * 0.15}s ease-in-out infinite alternate` : 'none',
            animationDelay: `${i * 0.06}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes epris-bar {
          from { height: 4px; }
          to { height: 28px; }
        }
      `}</style>
    </div>
  )
}

// ── Nickname prompt ──────────────────────────────────────────────────────────

function NicknamePrompt({ onJoin, loading }: { onJoin: (nick: string) => void; loading: boolean }) {
  const [nick, setNick] = useState('')
  return (
    <div className="border border-[#501a2c] p-8 max-w-sm mx-auto">
      <p className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/60 mb-6">Ваш псевдонім в ефірі</p>
      <input
        type="text"
        value={nick}
        onChange={e => setNick(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && nick.trim().length >= 2 && onJoin(nick.trim())}
        placeholder="Введіть ім'я…"
        maxLength={24}
        className="w-full bg-transparent border-b border-[#501a2c] font-serif text-xl text-[#501a2c] placeholder-[#501a2c]/30 focus:outline-none pb-2 mb-8"
        autoFocus
      />
      <button
        onClick={() => onJoin(nick.trim() || '')}
        disabled={loading}
        className="w-full border border-[#501a2c] bg-[#501a2c] text-[#F5F0EB] font-mono text-xs uppercase tracking-widest py-3 hover:bg-[#3d1220] transition-colors disabled:opacity-50"
      >
        {loading ? 'Підключення…' : 'Увійти в ефір'}
      </button>
      <p className="font-mono text-[10px] text-[#501a2c]/40 mt-4 text-center">
        Можна залишити порожнім — отримаєте випадкове ім'я
      </p>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function RadioPage({ t }: { t: (k: string) => string }) {
  const { members, joined, micOn, speaking, connecting, error, audioBlocked, myUser, join, leave, toggleMic, unlockAudio } = useEprisVoice()
  const [showNickPrompt, setShowNickPrompt] = useState(false)
  const [pttHeld, setPttHeld] = useState(false)
  const pttBusyRef = useRef(false)

  const total = members.length + (joined ? 1 : 0)
  const anyoneSpeaking = members.some(m => m.speaking) || (micOn && speaking)

  const handleJoin = async (nick: string) => {
    setShowNickPrompt(false)
    await join(nick)
  }

  // PTT: Space key
  useEffect(() => {
    if (!joined) return
    const onDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      e.preventDefault()
      if (!pttBusyRef.current && !micOn) {
        pttBusyRef.current = true
        setPttHeld(true)
        toggleMic().finally(() => { pttBusyRef.current = false })
      }
    }
    const onUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      if (pttHeld && micOn) { setPttHeld(false); toggleMic() }
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp) }
  }, [joined, micOn, pttHeld, toggleMic])

  return (
    <div className="pt-16 min-h-screen bg-[#F5F0EB]">
      {/* Header strip */}
      <div className="border-b border-[#501a2c] px-8 md:px-16 py-12">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#501a2c]/50 mb-3">EPRIS · Live Radio</p>
            <h1 className="font-serif text-5xl md:text-7xl text-[#501a2c] leading-none">
              {joined ? 'На зв\'язку' : members.length > 0 ? 'Ефір йде' : 'Ефір'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className={`w-2 h-2 rounded-full ${joined || members.length > 0 ? 'bg-[#501a2c] animate-pulse' : 'bg-[#501a2c]/20'}`} />
            <span className="font-mono text-xs uppercase tracking-widest text-[#501a2c]/60">
              {joined ? `В ефірі · ${total} ${plural(total)}` : members.length > 0 ? `Йде · ${members.length} ${plural(members.length)}` : 'Очікування'}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 md:px-16 py-16">

        {/* Audio unlock banner */}
        <AnimatePresence>
          {audioBlocked && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="mb-8 border border-[#501a2c] bg-[#501a2c] text-[#F5F0EB] p-4 flex items-center justify-between"
            >
              <span className="font-mono text-xs uppercase tracking-widest">Натисніть, щоб увімкнути звук</span>
              <button onClick={unlockAudio} className="border border-[#F5F0EB]/30 px-4 py-2 font-mono text-xs uppercase tracking-widest hover:bg-[#F5F0EB]/10 transition-colors">
                Увімкнути
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Signal deck */}
        <div className="border border-[#501a2c] p-6 mb-12">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#501a2c]/50">Signal / WebRTC</p>
              <p className="font-mono text-xs font-bold text-[#501a2c] mt-1">{anyoneSpeaking ? 'LIVE' : 'STANDBY'}</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-widest text-[#501a2c]/40">
              <span>−40</span><span>−20</span><span>−10</span><span>0 dB</span>
            </div>
          </div>
          <SignalBars active={anyoneSpeaking} />
        </div>

        <AnimatePresence mode="wait">
          {/* Not joined, idle */}
          {!joined && members.length === 0 && !showNickPrompt && (
            <motion.div key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="grid md:grid-cols-2 gap-16 items-start">
                <div>
                  <h2 className="font-serif text-4xl md:text-5xl text-[#501a2c] mb-6 leading-tight">
                    Живий голосовий ефір для читачів EPRIS
                  </h2>
                  <p className="font-serif text-lg text-[#501a2c]/70 leading-relaxed mb-8">
                    Відкритий простір для розмови. Слухайте без мікрофона — або беріть слово, коли захочете.
                  </p>
                  <button
                    onClick={() => setShowNickPrompt(true)}
                    disabled={connecting}
                    className="border border-[#501a2c] bg-[#501a2c] text-[#F5F0EB] font-mono text-xs uppercase tracking-widest px-8 py-4 hover:bg-[#3d1220] transition-colors disabled:opacity-50"
                  >
                    {connecting ? 'Підключення…' : 'Розпочати ефір'}
                  </button>
                </div>
                <div className="space-y-6">
                  {['Голосовий зв\'язок через WebRTC — без затримок', 'Push-to-Talk або вільний мікрофон', 'До 10 учасників одночасно в ефірі', 'Працює в браузері — без встановлення'].map((item, i) => (
                    <div key={i} className="flex items-start gap-4 border-b border-[#501a2c]/10 pb-4 last:border-0">
                      <div className="w-8 h-8 rounded-full border border-[#501a2c] flex items-center justify-center text-[#501a2c] font-mono text-[10px] shrink-0">{String(i + 1).padStart(2, '0')}</div>
                      <p className="font-serif text-[#501a2c]/70 mt-1">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Nickname prompt */}
          {!joined && showNickPrompt && (
            <motion.div key="nick" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="mb-8">
                <button onClick={() => setShowNickPrompt(false)} className="font-mono text-xs uppercase tracking-widest text-[#501a2c]/50 hover:text-[#501a2c] transition-colors flex items-center gap-2">
                  ← Назад
                </button>
              </div>
              <NicknamePrompt onJoin={handleJoin} loading={connecting} />
            </motion.div>
          )}

          {/* Others in ether, not joined */}
          {!joined && members.length > 0 && !showNickPrompt && (
            <motion.div key="watching" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="grid md:grid-cols-2 gap-16">
                <div>
                  <h2 className="font-serif text-4xl text-[#501a2c] mb-4 leading-tight">Ефір іде</h2>
                  <p className="font-serif text-lg text-[#501a2c]/70 mb-8">
                    {members.map(m => m.nickname).join(', ')} {members.length === 1 ? 'в ефірі' : 'в ефірі'}
                  </p>
                  <button
                    onClick={() => setShowNickPrompt(true)}
                    disabled={connecting}
                    className="border border-[#501a2c] bg-[#501a2c] text-[#F5F0EB] font-mono text-xs uppercase tracking-widest px-8 py-4 hover:bg-[#3d1220] transition-colors disabled:opacity-50"
                  >
                    Приєднатись
                  </button>
                </div>
                <ul className="space-y-3">
                  {members.map(m => (
                    <li key={m.user_id} className="flex items-center gap-3 border-b border-[#501a2c]/10 pb-3">
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
              <div className="grid md:grid-cols-[1fr_320px] gap-12">
                <div>
                  {/* Status */}
                  <p className="font-serif text-lg text-[#501a2c]/70 mb-10">
                    {members.some(m => m.speaking)
                      ? `Говорить: ${members.filter(m => m.speaking).map(m => m.nickname).join(', ')}`
                      : micOn && speaking
                        ? 'Ваш мікрофон увімкнено — вас чують'
                        : 'Слухаєте. Натисніть мікрофон, щоб говорити'}
                  </p>

                  {/* Mic control */}
                  <div className="flex flex-wrap gap-4 mb-10">
                    <button
                      className={`flex items-center gap-3 border px-6 py-4 font-mono text-xs uppercase tracking-widest transition-colors ${
                        micOn
                          ? 'bg-[#501a2c] text-[#F5F0EB] border-[#501a2c]'
                          : 'text-[#501a2c] border-[#501a2c] hover:bg-[#501a2c] hover:text-[#F5F0EB]'
                      }`}
                      onClick={toggleMic}
                    >
                      <MicIcon off={!micOn} />
                      {micOn ? 'Вимкнути мікрофон' : 'Увімкнути мікрофон'}
                    </button>

                    <button
                      className="border border-[#501a2c]/30 text-[#501a2c]/60 px-6 py-4 font-mono text-xs uppercase tracking-widest hover:border-[#501a2c] hover:text-[#501a2c] transition-colors"
                      onClick={leave}
                    >
                      Вийти
                    </button>
                  </div>

                  {/* PTT hint */}
                  <p className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/30">
                    Або утримуйте Space для Push-to-Talk
                  </p>
                </div>

                {/* Members list */}
                <div className="border border-[#501a2c]">
                  <div className="bg-[#501a2c] text-[#F5F0EB] px-4 py-3 font-mono text-[10px] uppercase tracking-widest">
                    Учасники · {total}
                  </div>
                  <ul className="divide-y divide-[#501a2c]/10">
                    {myUser && (
                      <li className={`px-4 py-3 flex items-center gap-3 ${micOn ? '' : 'opacity-60'}`}>
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: myUser.color }} />
                        <span className="font-serif text-[#501a2c]">{myUser.nickname}</span>
                        {speaking && <span className="ml-auto w-1.5 h-1.5 bg-[#501a2c] rounded-full animate-pulse" />}
                        <span className="ml-auto font-mono text-[10px] text-[#501a2c]/40">{micOn ? 'MIC' : 'MUTE'}</span>
                      </li>
                    )}
                    {members.map(m => (
                      <li key={m.user_id} className={`px-4 py-3 flex items-center gap-3 ${m.mic_on ? '' : 'opacity-60'}`}>
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: m.color }} />
                        <span className="font-serif text-[#501a2c]">{m.nickname}</span>
                        {m.speaking && <span className="ml-auto w-1.5 h-1.5 bg-[#501a2c] rounded-full animate-pulse" />}
                        <span className="ml-auto font-mono text-[10px] text-[#501a2c]/40">{m.mic_on ? 'MIC' : 'MUTE'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="mt-8 border border-[#501a2c]/30 bg-[#E8DED5] p-4 font-mono text-xs text-[#501a2c]">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

function plural(n: number) {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return 'людина'
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'людини'
  return 'людей'
}
