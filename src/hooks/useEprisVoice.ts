import { useCallback, useEffect, useRef, useState } from 'react'

const API = 'https://eprisradio.munister.com.ua'
const SIGNAL_POLL_MS = 800
const MEMBERS_POLL_MS = 2000
const SPEAK_TICK_MS = 150
const SPEAK_THRESHOLD = 0.018
const AUDIO_MAX_BITRATE = 128_000   // 128 kbps — high-quality voice

// ── Storage helpers ──────────────────────────────────────────────────────────

function getToken(): string | null { return localStorage.getItem('epris_radio_token') }
function setToken(t: string) { localStorage.setItem('epris_radio_token', t) }
function getStoredUser(): { id: number; nickname: string; color: string } | null {
  try { const r = localStorage.getItem('epris_radio_user'); return r ? JSON.parse(r) : null } catch { return null }
}
function setStoredUser(u: { id: number; nickname: string; color: string }) {
  localStorage.setItem('epris_radio_user', JSON.stringify(u))
}

// ── API client ───────────────────────────────────────────────────────────────

async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = getToken()
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers as Record<string, string> || {}),
    },
  })
  const json = await res.json()
  if (!json.ok) throw new Error(json.error || 'API error')
  return json.data
}

async function ensureAuth(nickname?: string): Promise<{ id: number; nickname: string; color: string }> {
  const token = getToken()
  if (token) {
    try { const user = await apiFetch('/api/auth/me'); setStoredUser(user); return user } catch { /* re-auth */ }
  }
  const data = await apiFetch('/api/auth/guest', { method: 'POST', body: JSON.stringify({ nickname: nickname || '' }) })
  setToken(data.token); setStoredUser(data.user); return data.user
}

// ── Types ────────────────────────────────────────────────────────────────────

export type RadioMember = {
  user_id: number
  nickname: string
  color: string
  mic_on: boolean
  speaking?: boolean
}

export type ActiveRoom = {
  slug: string
  title: string
  call_id: number
  member_count: number
}

type PeerEntry = {
  pc: RTCPeerConnection
  audio: HTMLAudioElement
  polite: boolean
  makingOffer: boolean
  ignoreOffer: boolean
  restartTimer: number | null
}

type AnalyserEntry = {
  analyser: AnalyserNode
  source: MediaStreamAudioSourceNode
  data: Uint8Array<ArrayBuffer>
}

// ── Mic stream — high quality Opus settings ──────────────────────────────────

async function getMicStream(): Promise<MediaStream> {
  const ideal: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: { ideal: 1 },
    sampleRate: { ideal: 48000 },
    // @ts-expect-error — non-standard but supported in Chrome/Firefox
    latency: { ideal: 0.01 },
  }
  try { return await navigator.mediaDevices.getUserMedia({ audio: ideal }) }
  catch (e) {
    if (e instanceof DOMException && ['NotSupportedError', 'OverconstrainedError', 'ConstraintNotSatisfiedError'].includes(e.name)) {
      return await navigator.mediaDevices.getUserMedia({ audio: true })
    }
    throw e
  }
}

// ── Prefer Opus fullband ─────────────────────────────────────────────────────

function preferOpus(pc: RTCPeerConnection) {
  try {
    const caps = RTCRtpReceiver.getCapabilities?.('audio')?.codecs
    if (!caps) return
    const opus = caps.filter(c => c.mimeType.toLowerCase() === 'audio/opus')
    const rest = caps.filter(c => c.mimeType.toLowerCase() !== 'audio/opus')
    for (const tr of pc.getTransceivers()) {
      if (tr.receiver.track?.kind === 'audio' || tr.direction !== 'inactive') {
        try { tr.setCodecPreferences?.([...opus, ...rest]) } catch { /* ignore */ }
      }
    }
  } catch { /* ignore */ }
}

// ── iOS keep-alive: silent looping buffer keeps AudioContext alive ────────────

function startKeepAlive(ctx: AudioContext): AudioBufferSourceNode {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
  const src = ctx.createBufferSource()
  src.buffer = buf
  src.loop = true
  src.connect(ctx.destination)
  src.start(0)
  return src
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useEprisVoice(opts?: { nickname?: string; roomSlug?: string }) {
  const [members, setMembers] = useState<RadioMember[]>([])
  const [joined, setJoined] = useState(false)
  const [micOn, setMicOn] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audioBlocked, setAudioBlocked] = useState(false)
  const [myUser, setMyUser] = useState<{ id: number; nickname: string; color: string } | null>(getStoredUser)
  const [memberVolumes, setMemberVolumesState] = useState<Record<number, number>>({})
  const [isHost, setIsHost] = useState(false)
  const [broadcastEnded, setBroadcastEnded] = useState(false)
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([])

  const callIdRef = useRef<number | null>(null)
  const myUserIdRef = useRef<number | null>(myUser?.id ?? null)
  const joinedRef = useRef(false)
  const micOnRef = useRef(false)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peersRef = useRef<Map<number, PeerEntry>>(new Map())
  const pendingIceRef = useRef<Map<number, RTCIceCandidateInit[]>>(new Map())
  const iceServersRef = useRef<RTCIceServer[]>([{ urls: 'stun:stun.l.google.com:19302' }])
  const afterIdRef = useRef(0)
  const serverMembersRef = useRef<RadioMember[]>([])
  const signalTimerRef = useRef<number | null>(null)
  const membersTimerRef = useRef<number | null>(null)
  const speakTimerRef = useRef<number | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const keepAliveRef = useRef<AudioBufferSourceNode | null>(null)
  const analysersRef = useRef<Map<number, AnalyserEntry>>(new Map())
  const speakingRef = useRef<Map<number, boolean>>(new Map())
  const blockedAudiosRef = useRef<Set<HTMLAudioElement>>(new Set())
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const reconnectViaRelayRef = useRef<(id: number) => void>(() => {})
  const roomSlugRef = useRef(opts?.roomSlug || 'main')
  // Android background: near-silent audio element keeps audio session alive
  const androidCleanupRef = useRef<() => void>(() => {})
  // Tracks whether the user intentionally enabled the mic (vs OS killing it)
  const userWantsMicRef = useRef(false)
  // Stable refs to latest callbacks for MediaSession action handlers
  const toggleMicRef = useRef<() => Promise<void>>(() => Promise.resolve())
  const leaveFnRef = useRef<() => Promise<void>>(() => Promise.resolve())

  const applyMembers = useCallback(() => {
    setMembers(serverMembersRef.current.map(m => ({ ...m, speaking: !!speakingRef.current.get(m.user_id) })))
  }, [])

  const ensureAudioCtx = useCallback((): AudioContext | null => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (Ctx) {
        audioCtxRef.current = new Ctx({ latencyHint: 'interactive', sampleRate: 48000 })
        keepAliveRef.current = startKeepAlive(audioCtxRef.current)
      }
    }
    audioCtxRef.current?.resume?.().catch(() => {})
    return audioCtxRef.current
  }, [])

  const acquireWakeLock = useCallback(async () => {
    if (wakeLockRef.current) return
    try { wakeLockRef.current = await navigator.wakeLock?.request('screen') } catch { /* ignore */ }
  }, [])

  const detachAnalyser = useCallback((key: number) => {
    const a = analysersRef.current.get(key); if (!a) return
    try { a.source.disconnect() } catch { /* ignore */ }
    try { a.analyser.disconnect() } catch { /* ignore */ }
    analysersRef.current.delete(key); speakingRef.current.delete(key)
  }, [])

  const attachAnalyser = useCallback((key: number, stream: MediaStream) => {
    const ctx = ensureAudioCtx()
    if (!ctx || !stream.getAudioTracks().length) return
    detachAnalyser(key)
    try {
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser(); analyser.fftSize = 512
      source.connect(analyser)
      analysersRef.current.set(key, { analyser, source, data: new Uint8Array(new ArrayBuffer(analyser.fftSize)) })
    } catch { /* ignore */ }
  }, [ensureAudioCtx, detachAnalyser])

  const speakTick = useCallback(() => {
    let changed = false
    for (const [key, a] of analysersRef.current) {
      a.analyser.getByteTimeDomainData(a.data)
      let sum = 0
      for (let i = 0; i < a.data.length; i++) { const v = (a.data[i] - 128) / 128; sum += v * v }
      const isSpeaking = Math.sqrt(sum / a.data.length) > SPEAK_THRESHOLD
      if (speakingRef.current.get(key) !== isSpeaking) { speakingRef.current.set(key, isSpeaking); changed = true }
    }
    if (changed) { setSpeaking(!!micOnRef.current); applyMembers() }
  }, [applyMembers])

  const playAudioEl = useCallback((audio: HTMLAudioElement) => {
    const p = audio.play()
    if (p && typeof p.then === 'function') {
      p.then(() => { blockedAudiosRef.current.delete(audio); if (blockedAudiosRef.current.size === 0) setAudioBlocked(false) })
       .catch(() => { blockedAudiosRef.current.add(audio); setAudioBlocked(true) })
    }
  }, [])

  const unlockAudio = useCallback(() => {
    ensureAudioCtx()
    for (const [, entry] of peersRef.current) { if (entry.audio.srcObject) playAudioEl(entry.audio) }
    for (const audio of [...blockedAudiosRef.current]) playAudioEl(audio)
  }, [ensureAudioCtx, playAudioEl])

  const setMemberVolume = useCallback((userId: number, volume: number) => {
    const entry = peersRef.current.get(userId)
    if (entry) entry.audio.volume = Math.max(0, Math.min(1, volume))
    setMemberVolumesState(prev => ({ ...prev, [userId]: volume }))
  }, [])

  useEffect(() => {
    const onGesture = () => unlockAudio()
    const onVisible = () => { if (document.visibilityState === 'visible') { unlockAudio(); if (joinedRef.current) acquireWakeLock() } }
    window.addEventListener('pointerdown', onGesture)
    window.addEventListener('keydown', onGesture)
    window.addEventListener('touchend', onGesture)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('pointerdown', onGesture)
      window.removeEventListener('keydown', onGesture)
      window.removeEventListener('touchend', onGesture)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [unlockAudio, acquireWakeLock])

  const audioTransceiver = (pc: RTCPeerConnection) =>
    pc.getTransceivers().find(t => t.receiver.track?.kind === 'audio')

  const capBitrate = useCallback((sender: RTCRtpSender) => {
    const p = sender.getParameters()
    if (!p.encodings?.length) p.encodings = [{}]
    const enc = p.encodings[0]
    enc.maxBitrate = AUDIO_MAX_BITRATE
    enc.priority = 'high'
    enc.networkPriority = 'high'
    sender.setParameters(p).catch(() => {})
  }, [])

  const applyMicToTransceiver = useCallback((tr: RTCRtpTransceiver) => {
    const track = localStreamRef.current?.getAudioTracks()[0] ?? null
    tr.sender.replaceTrack(track).catch(() => {})
    if (tr.direction !== 'sendrecv' && tr.direction !== 'sendonly') tr.direction = 'sendrecv'
    capBitrate(tr.sender)
  }, [capBitrate])

  const cleanupPeer = useCallback((userId: number) => {
    const entry = peersRef.current.get(userId); if (!entry) return
    if (entry.restartTimer) { window.clearTimeout(entry.restartTimer); entry.restartTimer = null }
    try { entry.pc.close() } catch { /* ignore */ }
    entry.audio.srcObject = null; entry.audio.remove()
    blockedAudiosRef.current.delete(entry.audio)
    peersRef.current.delete(userId); pendingIceRef.current.delete(userId); detachAnalyser(userId)
  }, [detachAnalyser])

  const cleanupAll = useCallback(() => {
    for (const [uid] of peersRef.current) cleanupPeer(uid)
    if (localStreamRef.current) { for (const t of localStreamRef.current.getTracks()) t.stop(); localStreamRef.current = null }
  }, [cleanupPeer])

  const flushPendingIce = useCallback(async (userId: number, pc: RTCPeerConnection) => {
    const queued = pendingIceRef.current.get(userId); if (!queued?.length) return
    pendingIceRef.current.delete(userId)
    for (const cand of queued) { try { await pc.addIceCandidate(cand) } catch { /* ignore */ } }
  }, [])

  const createPeer = useCallback((peerId: number, peerOpts: { initiator: boolean; forceRelay?: boolean }): PeerEntry | undefined => {
    if (peersRef.current.has(peerId)) return peersRef.current.get(peerId)
    const myId = myUserIdRef.current; if (!myId || !callIdRef.current) return undefined
    const polite = myId < peerId
    const pc = new RTCPeerConnection({
      iceServers: iceServersRef.current,
      iceTransportPolicy: peerOpts.forceRelay ? 'relay' : 'all',
      iceCandidatePoolSize: 6,
      // @ts-expect-error — Chrome-specific for better audio
      sdpSemantics: 'unified-plan',
    })
    const audio = document.createElement('audio')
    audio.autoplay = true;
    (audio as HTMLAudioElement & { playsInline?: boolean }).playsInline = true
    audio.setAttribute('playsinline', '')
    audio.style.display = 'none'
    document.body.appendChild(audio)

    const entry: PeerEntry = { pc, audio, polite, makingOffer: false, ignoreOffer: false, restartTimer: null }
    peersRef.current.set(peerId, entry)

    pc.ontrack = e => {
      const stream = e.streams[0] ?? new MediaStream([e.track])
      audio.srcObject = stream
      audio.muted = false
      playAudioEl(audio)
      attachAnalyser(peerId, stream)
      preferOpus(pc)
    }
    pc.onicecandidate = e => {
      if (e.candidate && callIdRef.current) {
        apiFetch(`/api/calls/${callIdRef.current}/signals`, {
          method: 'POST',
          body: JSON.stringify({ signal_type: 'ice', to_user_id: peerId, payload: e.candidate.toJSON() }),
        }).catch(() => {})
      }
    }
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        if (entry.restartTimer) { window.clearTimeout(entry.restartTimer); entry.restartTimer = null }
        preferOpus(pc)
        capBitrate(pc.getSenders().find(s => s.track?.kind === 'audio')!)
      }
      if (pc.connectionState === 'failed') {
        if (entry.restartTimer) window.clearTimeout(entry.restartTimer)
        if (peerOpts.forceRelay) { cleanupPeer(peerId); return }
        try { pc.restartIce() } catch { cleanupPeer(peerId); return }
        entry.restartTimer = window.setTimeout(() => {
          entry.restartTimer = null
          if (pc.connectionState === 'failed') reconnectViaRelayRef.current(peerId)
        }, 6000)
      } else if (pc.connectionState === 'closed') { cleanupPeer(peerId) }
    }
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' && !entry.restartTimer) {
        entry.restartTimer = window.setTimeout(() => {
          entry.restartTimer = null
          if (pc.iceConnectionState === 'disconnected') { try { pc.restartIce() } catch { cleanupPeer(peerId) } }
        }, 2000)
      }
    }
    pc.onnegotiationneeded = async () => {
      try {
        entry.makingOffer = true
        await pc.setLocalDescription()
        if (callIdRef.current && pc.localDescription) {
          await apiFetch(`/api/calls/${callIdRef.current}/signals`, {
            method: 'POST',
            body: JSON.stringify({ signal_type: pc.localDescription.type, to_user_id: peerId, payload: pc.localDescription }),
          })
        }
      } catch { /* ignore */ } finally { entry.makingOffer = false }
    }
    if (peerOpts.initiator) {
      const track = localStreamRef.current?.getAudioTracks()[0] ?? null
      if (track) pc.addTransceiver(track, { direction: 'sendrecv' })
      else pc.addTransceiver('audio', { direction: 'sendrecv' })
      preferOpus(pc)
    }
    return entry
  }, [attachAnalyser, cleanupPeer, playAudioEl, capBitrate])

  const ensurePeer = useCallback((peerId: number) => {
    const myId = myUserIdRef.current
    if (!myId || peersRef.current.has(peerId)) return
    createPeer(peerId, { initiator: myId > peerId })
  }, [createPeer])

  const reconnectViaRelay = useCallback((peerId: number) => {
    const myId = myUserIdRef.current; if (!myId) return
    cleanupPeer(peerId); createPeer(peerId, { initiator: myId > peerId, forceRelay: true })
  }, [cleanupPeer, createPeer])
  reconnectViaRelayRef.current = reconnectViaRelay

  const handleDescription = useCallback(async (fromId: number, desc: RTCSessionDescriptionInit) => {
    let entry = peersRef.current.get(fromId)
    if (!entry) entry = createPeer(fromId, { initiator: false })
    if (!entry) return
    const { pc } = entry
    const isOffer = desc.type === 'offer'
    const collision = isOffer && (entry.makingOffer || pc.signalingState !== 'stable')
    entry.ignoreOffer = !entry.polite && collision
    if (entry.ignoreOffer) return
    try { await pc.setRemoteDescription(desc) } catch { return }
    await flushPendingIce(fromId, pc)
    if (isOffer) {
      const tr = audioTransceiver(pc)
      if (tr) applyMicToTransceiver(tr)
      await pc.setLocalDescription()
      if (callIdRef.current && pc.localDescription) {
        await apiFetch(`/api/calls/${callIdRef.current}/signals`, {
          method: 'POST',
          body: JSON.stringify({ signal_type: pc.localDescription.type, to_user_id: fromId, payload: pc.localDescription }),
        }).catch(() => {})
      }
    }
  }, [createPeer, flushPendingIce, applyMicToTransceiver])

  const handleIce = useCallback(async (fromId: number, cand: RTCIceCandidateInit) => {
    const entry = peersRef.current.get(fromId)
    if (!entry || !entry.pc.remoteDescription) {
      const q = pendingIceRef.current.get(fromId) ?? []; q.push(cand); pendingIceRef.current.set(fromId, q); return
    }
    try { await entry.pc.addIceCandidate(cand) } catch { /* ignore */ }
  }, [])

  const pollSignals = useCallback(async () => {
    const cid = callIdRef.current; if (!cid) return
    try {
      const signals = await apiFetch(`/api/calls/${cid}/signals?after_id=${afterIdRef.current}`)
      for (const sig of signals) {
        afterIdRef.current = sig.id
        let payload: unknown
        try { payload = JSON.parse(sig.payload) } catch { payload = sig.payload }
        try {
          if (sig.signal_type === 'offer' || sig.signal_type === 'answer') await handleDescription(sig.from_user_id, payload as RTCSessionDescriptionInit)
          else if (sig.signal_type === 'ice') await handleIce(sig.from_user_id, payload as RTCIceCandidateInit)
          else if (sig.signal_type === 'bye') cleanupPeer(sig.from_user_id)
          else if (sig.signal_type === 'ended') {
            // Host ended the broadcast — auto-leave and surface the reason
            setBroadcastEnded(true)
            leaveFnRef.current().catch(() => {})
            return  // discard any signals that came after 'ended'
          }
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  }, [handleDescription, handleIce, cleanupPeer])

  const pollMembers = useCallback(async () => {
    const cid = callIdRef.current; if (!cid || !joinedRef.current) return
    try {
      const list = await apiFetch(`/api/calls/${cid}/members`)
      serverMembersRef.current = list; applyMembers()
      const ids = new Set(list.map((m: RadioMember) => m.user_id))
      for (const m of list) ensurePeer(m.user_id)
      for (const pid of [...peersRef.current.keys()]) { if (!ids.has(pid)) cleanupPeer(pid) }
      // Keep Android lock screen info fresh
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: 'EPRIS Radio Live',
            artist: 'EPRIS Journal',
            album: `${list.length + 1} у ефірі`,
          })
          navigator.mediaSession.playbackState = 'playing'
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  }, [applyMembers, ensurePeer, cleanupPeer])

  const startTimers = useCallback(() => {
    for (const r of [signalTimerRef, membersTimerRef, speakTimerRef]) {
      if (r.current) { window.clearInterval(r.current); r.current = null }
    }
    signalTimerRef.current = window.setInterval(pollSignals, SIGNAL_POLL_MS)
    membersTimerRef.current = window.setInterval(pollMembers, MEMBERS_POLL_MS)
    speakTimerRef.current = window.setInterval(speakTick, SPEAK_TICK_MS)
  }, [pollSignals, pollMembers, speakTick])

  const stopTimers = useCallback(() => {
    for (const r of [signalTimerRef, membersTimerRef, speakTimerRef]) {
      if (r.current) { window.clearInterval(r.current); r.current = null }
    }
  }, [])

  const refreshActive = useCallback(async () => {
    try {
      const slug = encodeURIComponent(roomSlugRef.current)
      const data = await apiFetch(`/api/calls/active?room_slug=${slug}`)
      if (data) {
        callIdRef.current = data.call_id
        if (!joinedRef.current) { serverMembersRef.current = data.members; applyMembers() }
        if (data.is_host !== undefined) setIsHost(!!data.is_host)
      } else if (!joinedRef.current) { callIdRef.current = null; serverMembersRef.current = []; applyMembers() }
    } catch { /* ignore */ }
  }, [applyMembers])

  const refreshRooms = useCallback(async () => {
    try {
      const data = await apiFetch('/api/calls/rooms')
      setActiveRooms(data || [])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    refreshActive()
    refreshRooms()
    const t = window.setInterval(() => {
      if (!joinedRef.current) { refreshActive(); refreshRooms() }
    }, MEMBERS_POLL_MS)
    return () => window.clearInterval(t)
  }, [refreshActive, refreshRooms])

  // Sync roomSlug ref when opts change
  useEffect(() => {
    const newSlug = opts?.roomSlug || 'main'
    if (newSlug !== roomSlugRef.current) {
      roomSlugRef.current = newSlug
      if (!joinedRef.current) refreshActive()
    }
  }, [opts?.roomSlug, refreshActive])

  const join = useCallback(async (nickname?: string) => {
    setError(null); setConnecting(true)
    try {
      ensureAudioCtx()
      const user = await ensureAuth(nickname || opts?.nickname)
      myUserIdRef.current = user.id; setMyUser(user)
      const cfg = await apiFetch('/api/calls/config')
      if (cfg.ice_servers?.length) iceServersRef.current = cfg.ice_servers
      const res = await apiFetch('/api/calls/join', {
        method: 'POST',
        body: JSON.stringify({ room_slug: roomSlugRef.current }),
      })
      callIdRef.current = res.call_id; afterIdRef.current = 0
      joinedRef.current = true; setJoined(true)
      setIsHost(!!res.is_host); setBroadcastEnded(false)
      serverMembersRef.current = res.members; applyMembers()
      for (const m of res.members) ensurePeer(m.user_id)
      startTimers(); pollMembers(); pollSignals()
      await acquireWakeLock()

      // Android: a near-silent oscillator routed through an <audio> element registers
      // with the OS audio session manager, keeping background audio alive.
      const ctx = audioCtxRef.current
      if (ctx) {
        androidCleanupRef.current()
        const osc = ctx.createOscillator()
        const gainNode = ctx.createGain()
        gainNode.gain.value = 0.001  // 0.1% — essentially silent but non-zero
        osc.type = 'sine'; osc.frequency.value = 20  // 20 Hz, below hearing
        osc.connect(gainNode)
        const streamDest = ctx.createMediaStreamDestination()
        gainNode.connect(streamDest); osc.start()
        const androidEl = document.createElement('audio')
        androidEl.srcObject = streamDest.stream; androidEl.autoplay = true; androidEl.style.display = 'none'
        document.body.appendChild(androidEl); androidEl.play().catch(() => {})
        androidCleanupRef.current = () => {
          try { osc.stop() } catch {}
          androidEl.srcObject = null; androidEl.remove()
          androidCleanupRef.current = () => {}
        }
      }

      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: 'EPRIS Radio Live',
            artist: 'EPRIS Journal',
            album: `${res.members.length + 1} у ефірі`,
          })
          navigator.mediaSession.playbackState = 'playing'
          // pause → mute mic (don't disconnect)
          navigator.mediaSession.setActionHandler('pause', () => {
            if (micOnRef.current) toggleMicRef.current().catch(() => {})
          })
          // play → unmute mic / unlock audio
          navigator.mediaSession.setActionHandler('play', () => {
            unlockAudio()
            if (!micOnRef.current) toggleMicRef.current().catch(() => {})
            try { navigator.mediaSession.playbackState = 'playing' } catch {}
          })
          // next track → toggle mic (PTT from lock screen)
          navigator.mediaSession.setActionHandler('nexttrack', () => {
            toggleMicRef.current().catch(() => {})
          })
          // previous track → leave call
          navigator.mediaSession.setActionHandler('previoustrack', () => {
            leaveFnRef.current().catch(() => {})
          })
          navigator.mediaSession.setActionHandler('stop', () => {
            leaveFnRef.current().catch(() => {})
          })
        } catch { /* ignore */ }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося підключитись.')
    } finally { setConnecting(false) }
  }, [ensureAudioCtx, applyMembers, ensurePeer, startTimers, pollMembers, pollSignals, acquireWakeLock, unlockAudio, opts?.nickname])

  const endBroadcast = useCallback(async () => {
    const cid = callIdRef.current; if (!cid) return
    try { await apiFetch(`/api/calls/${cid}/end`, { method: 'POST', body: '{}' }) } catch { /* ignore */ }
    // After ending we also leave ourselves
    leaveFnRef.current().catch(() => {})
  }, [])

  const leave = useCallback(async () => {
    const cid = callIdRef.current
    stopTimers()
    wakeLockRef.current?.release().catch(() => {}); wakeLockRef.current = null
    androidCleanupRef.current()
    userWantsMicRef.current = false
    setIsHost(false)
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = null
        navigator.mediaSession.playbackState = 'none'
        for (const action of ['pause', 'play', 'stop', 'nexttrack', 'previoustrack'] as const) {
          navigator.mediaSession.setActionHandler(action, null)
        }
      } catch { /* ignore */ }
    }
    for (const [pid] of peersRef.current) {
      if (cid) apiFetch(`/api/calls/${cid}/signals`, { method: 'POST', body: JSON.stringify({ signal_type: 'bye', to_user_id: pid, payload: { bye: true } }) }).catch(() => {})
    }
    cleanupAll()
    joinedRef.current = false; micOnRef.current = false
    setJoined(false); setMicOn(false); setSpeaking(false); setError(null)
    speakingRef.current.clear(); serverMembersRef.current = []; setMembers([])
    if (cid) { try { await apiFetch(`/api/calls/${cid}/leave`, { method: 'PUT', body: '{}' }) } catch { /* ignore */ } }
    await refreshActive()
  }, [stopTimers, cleanupAll, refreshActive])

  const toggleMic = useCallback(async () => {
    const cid = callIdRef.current; if (!cid) return
    const next = !micOnRef.current
    if (next) {
      try {
        if (!navigator.mediaDevices?.getUserMedia) { setError('Браузер не підтримує мікрофон.'); return }
        const stream = await getMicStream()
        localStreamRef.current = stream; micOnRef.current = true; userWantsMicRef.current = true
        const track = stream.getAudioTracks()[0]
        if (track) {
          track.onended = () => {
            if (localStreamRef.current !== stream) return
            localStreamRef.current = null; micOnRef.current = false; setMicOn(false); setSpeaking(false)
            for (const [, entry] of peersRef.current) { const tr = audioTransceiver(entry.pc); if (tr) applyMicToTransceiver(tr) }
            apiFetch(`/api/calls/${cid}/mic`, { method: 'PUT', body: JSON.stringify({ on: false }) }).catch(() => {})
          }
        }
        setSpeaking(true)
        for (const [, entry] of peersRef.current) { const tr = audioTransceiver(entry.pc); if (tr) applyMicToTransceiver(tr) }
      } catch (err) {
        micOnRef.current = false
        if (err instanceof DOMException) {
          if (['NotAllowedError', 'PermissionDeniedError'].includes(err.name)) setError('Доступ до мікрофона заблоковано.')
          else if (err.name === 'NotFoundError') setError('Мікрофон не знайдено.')
          else if (err.name === 'NotReadableError') setError('Мікрофон зайнятий іншою програмою.')
          else setError('Не вдалося увімкнути мікрофон.')
        } else { setError('Не вдалося увімкнути мікрофон.') }
        return
      }
    } else {
      micOnRef.current = false; userWantsMicRef.current = false
      for (const [, entry] of peersRef.current) { const tr = audioTransceiver(entry.pc); if (tr) applyMicToTransceiver(tr) }
      if (localStreamRef.current) { for (const t of localStreamRef.current.getTracks()) t.stop(); localStreamRef.current = null }
      setSpeaking(false)
    }
    setMicOn(next); setError(null)
    apiFetch(`/api/calls/${cid}/mic`, { method: 'PUT', body: JSON.stringify({ on: next }) }).catch(() => {})
  }, [applyMicToTransceiver])

  // Pagehide — send leave beacon
  useEffect(() => {
    const onHide = (e: PageTransitionEvent) => {
      if (e.persisted) return
      const cid = callIdRef.current; if (!joinedRef.current || !cid) return
      const token = getToken()
      fetch(`${API}/api/calls/${cid}/leave`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        keepalive: true,
      }).catch(() => {})
    }
    window.addEventListener('pagehide', onHide)
    return () => window.removeEventListener('pagehide', onHide)
  }, [])

  // Recover on visibility / network restore
  useEffect(() => {
    const recover = () => {
      if (document.visibilityState === 'hidden' || !joinedRef.current) return
      ensureAudioCtx()
      for (const [, entry] of peersRef.current) {
        entry.audio.play().catch(() => {})
        if (entry.pc.connectionState === 'failed' || entry.pc.iceConnectionState === 'disconnected') {
          try { entry.pc.restartIce() } catch { /* ignore */ }
        }
      }
      acquireWakeLock()
      startTimers(); pollMembers(); pollSignals()
      // Android: if OS killed the mic track while screen was locked, re-enable it
      if (userWantsMicRef.current && !micOnRef.current) {
        toggleMicRef.current().catch(() => {})
      }
      // Refresh Android lock screen session state
      if ('mediaSession' in navigator) {
        try { navigator.mediaSession.playbackState = 'playing' } catch { /* ignore */ }
      }
    }
    document.addEventListener('visibilitychange', recover)
    window.addEventListener('online', recover)
    window.addEventListener('pageshow', recover)
    return () => {
      document.removeEventListener('visibilitychange', recover)
      window.removeEventListener('online', recover)
      window.removeEventListener('pageshow', recover)
    }
  }, [ensureAudioCtx, acquireWakeLock, startTimers, pollMembers, pollSignals])

  // Keep MediaSession action handler refs current
  useEffect(() => { toggleMicRef.current = toggleMic }, [toggleMic])
  useEffect(() => { leaveFnRef.current = leave }, [leave])

  // Cleanup on unmount
  useEffect(() => () => {
    stopTimers(); cleanupAll()
    keepAliveRef.current?.stop?.()
    androidCleanupRef.current()
    wakeLockRef.current?.release().catch(() => {})
    audioCtxRef.current?.close?.().catch(() => {})
    audioCtxRef.current = null
  }, [stopTimers, cleanupAll])

  return {
    members, memberVolumes, joined, micOn, speaking, connecting, error,
    audioBlocked, myUser, isHost, broadcastEnded, activeRooms,
    join, leave, endBroadcast, toggleMic, unlockAudio, setMemberVolume,
  }
}
