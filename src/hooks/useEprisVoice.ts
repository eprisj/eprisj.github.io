import { useCallback, useEffect, useRef, useState } from 'react'

const API = 'https://live.eprisjournal.com'
const SIGNAL_POLL_MS = 1000
const MEMBERS_POLL_MS = 2500
const SPEAK_TICK_MS = 180
const SPEAK_THRESHOLD = 0.02
const AUDIO_MAX_BITRATE = 24000

// ── Storage helpers ──────────────────────────────────────────────────────────

function getToken(): string | null {
  return localStorage.getItem('epris_radio_token')
}

function setToken(t: string) {
  localStorage.setItem('epris_radio_token', t)
}

function getStoredUser(): { id: number; nickname: string; color: string } | null {
  try {
    const raw = localStorage.getItem('epris_radio_user')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
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
    try {
      const user = await apiFetch('/api/auth/me')
      setStoredUser(user)
      return user
    } catch { /* token invalid, re-auth */ }
  }
  const data = await apiFetch('/api/auth/guest', {
    method: 'POST',
    body: JSON.stringify({ nickname: nickname || '' }),
  })
  setToken(data.token)
  setStoredUser(data.user)
  return data.user
}

// ── Types ────────────────────────────────────────────────────────────────────

export type RadioMember = {
  user_id: number
  nickname: string
  color: string
  mic_on: boolean
  speaking?: boolean
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

// ── getMicStream ─────────────────────────────────────────────────────────────

async function getMicStream(): Promise<MediaStream> {
  const ideal: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: { ideal: 1 },
    sampleRate: { ideal: 48000 },
  }
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: ideal })
  } catch (e) {
    if (e instanceof DOMException && ['NotSupportedError', 'OverconstrainedError', 'ConstraintNotSatisfiedError'].includes(e.name)) {
      return await navigator.mediaDevices.getUserMedia({ audio: true })
    }
    throw e
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useEprisVoice(opts?: { nickname?: string }) {
  const [members, setMembers] = useState<RadioMember[]>([])
  const [joined, setJoined] = useState(false)
  const [micOn, setMicOn] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audioBlocked, setAudioBlocked] = useState(false)
  const [myUser, setMyUser] = useState<{ id: number; nickname: string; color: string } | null>(getStoredUser)

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
  const analysersRef = useRef<Map<number, AnalyserEntry>>(new Map())
  const speakingRef = useRef<Map<number, boolean>>(new Map())
  const blockedAudiosRef = useRef<Set<HTMLAudioElement>>(new Set())
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const reconnectViaRelayRef = useRef<(id: number) => void>(() => {})

  const applyMembers = useCallback(() => {
    setMembers(serverMembersRef.current.map(m => ({ ...m, speaking: !!speakingRef.current.get(m.user_id) })))
  }, [])

  const ensureAudioCtx = useCallback((): AudioContext | null => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (Ctx) audioCtxRef.current = new Ctx()
    }
    audioCtxRef.current?.resume?.().catch(() => {})
    return audioCtxRef.current
  }, [])

  const detachAnalyser = useCallback((key: number) => {
    const a = analysersRef.current.get(key)
    if (!a) return
    try { a.source.disconnect() } catch { /* ignore */ }
    try { a.analyser.disconnect() } catch { /* ignore */ }
    analysersRef.current.delete(key)
    speakingRef.current.delete(key)
  }, [])

  const attachAnalyser = useCallback((key: number, stream: MediaStream) => {
    const ctx = ensureAudioCtx()
    if (!ctx || !stream.getAudioTracks().length) return
    detachAnalyser(key)
    try {
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
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
    if (changed) { setSpeaking(micOnRef.current); applyMembers() }
  }, [applyMembers])

  const playAudioEl = useCallback((audio: HTMLAudioElement) => {
    const p = audio.play()
    if (p && typeof p.then === 'function') {
      p.then(() => { blockedAudiosRef.current.delete(audio); if (blockedAudiosRef.current.size === 0) setAudioBlocked(false) })
       .catch(() => { blockedAudiosRef.current.add(audio); setAudioBlocked(true) })
    }
  }, [])

  const unlockAudio = useCallback(() => {
    audioCtxRef.current?.resume?.().catch(() => {})
    for (const [, entry] of peersRef.current) { if (entry.audio.srcObject) playAudioEl(entry.audio) }
    for (const audio of [...blockedAudiosRef.current]) playAudioEl(audio)
  }, [playAudioEl])

  useEffect(() => {
    const onGesture = () => unlockAudio()
    const onVisible = () => { if (document.visibilityState === 'visible') unlockAudio() }
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
  }, [unlockAudio])

  const audioTransceiver = (pc: RTCPeerConnection) =>
    pc.getTransceivers().find(t => t.receiver.track?.kind === 'audio')

  const capBitrate = useCallback((sender: RTCRtpSender) => {
    const p = sender.getParameters()
    if (!p.encodings?.length) p.encodings = [{}]
    if (p.encodings[0].maxBitrate !== AUDIO_MAX_BITRATE) {
      p.encodings[0].maxBitrate = AUDIO_MAX_BITRATE
      sender.setParameters(p).catch(() => {})
    }
  }, [])

  const applyMicToTransceiver = useCallback((tr: RTCRtpTransceiver) => {
    const track = localStreamRef.current?.getAudioTracks()[0] ?? null
    tr.sender.replaceTrack(track).catch(() => {})
    if (tr.direction !== 'sendrecv' && tr.direction !== 'sendonly') tr.direction = 'sendrecv'
    capBitrate(tr.sender)
  }, [capBitrate])

  const cleanupPeer = useCallback((userId: number) => {
    const entry = peersRef.current.get(userId)
    if (!entry) return
    if (entry.restartTimer) { window.clearTimeout(entry.restartTimer); entry.restartTimer = null }
    try { entry.pc.close() } catch { /* ignore */ }
    entry.audio.srcObject = null
    entry.audio.remove()
    blockedAudiosRef.current.delete(entry.audio)
    peersRef.current.delete(userId)
    pendingIceRef.current.delete(userId)
    detachAnalyser(userId)
  }, [detachAnalyser])

  const cleanupAll = useCallback(() => {
    for (const [uid] of peersRef.current) cleanupPeer(uid)
    if (localStreamRef.current) {
      for (const t of localStreamRef.current.getTracks()) t.stop()
      localStreamRef.current = null
    }
  }, [cleanupPeer])

  const flushPendingIce = useCallback(async (userId: number, pc: RTCPeerConnection) => {
    const queued = pendingIceRef.current.get(userId)
    if (!queued?.length) return
    pendingIceRef.current.delete(userId)
    for (const cand of queued) { try { await pc.addIceCandidate(cand) } catch { /* ignore */ } }
  }, [])

  const createPeer = useCallback((peerId: number, peerOpts: { initiator: boolean; forceRelay?: boolean }): PeerEntry | undefined => {
    if (peersRef.current.has(peerId)) return peersRef.current.get(peerId)
    const myId = myUserIdRef.current
    if (!myId || !callIdRef.current) return undefined
    const polite = myId < peerId
    const pc = new RTCPeerConnection({
      iceServers: iceServersRef.current,
      iceTransportPolicy: peerOpts.forceRelay ? 'relay' : 'all',
      iceCandidatePoolSize: 4,
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
      if (pc.connectionState === 'connected' && entry.restartTimer) {
        window.clearTimeout(entry.restartTimer); entry.restartTimer = null
      }
      if (pc.connectionState === 'failed') {
        if (entry.restartTimer) window.clearTimeout(entry.restartTimer)
        if (peerOpts.forceRelay) { cleanupPeer(peerId); return }
        try { pc.restartIce() } catch { cleanupPeer(peerId); return }
        entry.restartTimer = window.setTimeout(() => {
          entry.restartTimer = null
          if (pc.connectionState === 'failed') reconnectViaRelayRef.current(peerId)
        }, 8000)
      } else if (pc.connectionState === 'closed') {
        cleanupPeer(peerId)
      }
    }
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' && !entry.restartTimer) {
        entry.restartTimer = window.setTimeout(() => {
          entry.restartTimer = null
          if (pc.iceConnectionState === 'disconnected') { try { pc.restartIce() } catch { cleanupPeer(peerId) } }
        }, 2500)
      }
    }
    pc.onnegotiationneeded = async () => {
      try {
        entry.makingOffer = true
        await pc.setLocalDescription()
        if (callIdRef.current && pc.localDescription) {
          await apiFetch(`/api/calls/${callIdRef.current}/signals`, {
            method: 'POST',
            body: JSON.stringify({
              signal_type: pc.localDescription.type,
              to_user_id: peerId,
              payload: pc.localDescription,
            }),
          })
        }
      } catch { /* ignore */ } finally { entry.makingOffer = false }
    }
    if (peerOpts.initiator) {
      const track = localStreamRef.current?.getAudioTracks()[0] ?? null
      if (track) pc.addTransceiver(track, { direction: 'sendrecv' })
      else pc.addTransceiver('audio', { direction: 'sendrecv' })
    }
    return entry
  }, [attachAnalyser, cleanupPeer, playAudioEl])

  const ensurePeer = useCallback((peerId: number) => {
    const myId = myUserIdRef.current
    if (!myId || peersRef.current.has(peerId)) return
    createPeer(peerId, { initiator: myId > peerId })
  }, [createPeer])

  const reconnectViaRelay = useCallback((peerId: number) => {
    const myId = myUserIdRef.current
    if (!myId) return
    cleanupPeer(peerId)
    createPeer(peerId, { initiator: myId > peerId, forceRelay: true })
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
      const q = pendingIceRef.current.get(fromId) ?? []
      q.push(cand)
      pendingIceRef.current.set(fromId, q)
      return
    }
    try { await entry.pc.addIceCandidate(cand) } catch { /* ignore */ }
  }, [])

  const pollSignals = useCallback(async () => {
    const cid = callIdRef.current
    if (!cid) return
    try {
      const signals = await apiFetch(`/api/calls/${cid}/signals?after_id=${afterIdRef.current}`)
      for (const sig of signals) {
        afterIdRef.current = sig.id
        let payload: unknown
        try { payload = JSON.parse(sig.payload) } catch { payload = sig.payload }
        try {
          if (sig.signal_type === 'offer' || sig.signal_type === 'answer') {
            await handleDescription(sig.from_user_id, payload as RTCSessionDescriptionInit)
          } else if (sig.signal_type === 'ice') {
            await handleIce(sig.from_user_id, payload as RTCIceCandidateInit)
          } else if (sig.signal_type === 'bye') {
            cleanupPeer(sig.from_user_id)
          }
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  }, [handleDescription, handleIce, cleanupPeer])

  const pollMembers = useCallback(async () => {
    const cid = callIdRef.current
    if (!cid || !joinedRef.current) return
    try {
      const list = await apiFetch(`/api/calls/${cid}/members`)
      serverMembersRef.current = list
      applyMembers()
      const ids = new Set(list.map((m: RadioMember) => m.user_id))
      for (const m of list) ensurePeer(m.user_id)
      for (const pid of [...peersRef.current.keys()]) { if (!ids.has(pid)) cleanupPeer(pid) }
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
      const data = await apiFetch('/api/calls/active')
      if (data) {
        callIdRef.current = data.call_id
        if (!joinedRef.current) { serverMembersRef.current = data.members; applyMembers() }
      } else if (!joinedRef.current) {
        callIdRef.current = null
        serverMembersRef.current = []
        applyMembers()
      }
    } catch { /* ignore */ }
  }, [applyMembers])

  useEffect(() => {
    refreshActive()
    const t = window.setInterval(() => { if (!joinedRef.current) refreshActive() }, MEMBERS_POLL_MS)
    return () => window.clearInterval(t)
  }, [refreshActive])

  const join = useCallback(async (nickname?: string) => {
    setError(null)
    setConnecting(true)
    try {
      ensureAudioCtx()
      const user = await ensureAuth(nickname || opts?.nickname)
      myUserIdRef.current = user.id
      setMyUser(user)

      const cfg = await apiFetch('/api/calls/config')
      if (cfg.ice_servers?.length) iceServersRef.current = cfg.ice_servers

      const res = await apiFetch('/api/calls/join', { method: 'POST', body: '{}' })
      callIdRef.current = res.call_id
      afterIdRef.current = 0
      joinedRef.current = true
      setJoined(true)
      serverMembersRef.current = res.members
      applyMembers()
      for (const m of res.members) ensurePeer(m.user_id)
      startTimers()
      pollMembers()
      pollSignals()
      try { wakeLockRef.current = await navigator.wakeLock?.request('screen') } catch { /* ignore */ }
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({ title: 'EPRIS Radio Live', artist: 'EPRIS Journal' })
          navigator.mediaSession.playbackState = 'playing'
        } catch { /* ignore */ }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося підключитись.')
    } finally {
      setConnecting(false)
    }
  }, [ensureAudioCtx, applyMembers, ensurePeer, startTimers, pollMembers, pollSignals, opts?.nickname])

  const leave = useCallback(async () => {
    const cid = callIdRef.current
    stopTimers()
    wakeLockRef.current?.release().catch(() => {})
    wakeLockRef.current = null
    if ('mediaSession' in navigator) { try { navigator.mediaSession.metadata = null; navigator.mediaSession.playbackState = 'none' } catch { /* ignore */ } }
    for (const [pid] of peersRef.current) {
      if (cid) apiFetch(`/api/calls/${cid}/signals`, { method: 'POST', body: JSON.stringify({ signal_type: 'bye', to_user_id: pid, payload: { bye: true } }) }).catch(() => {})
    }
    cleanupAll()
    joinedRef.current = false
    micOnRef.current = false
    setJoined(false)
    setMicOn(false)
    setSpeaking(false)
    setError(null)
    speakingRef.current.clear()
    serverMembersRef.current = []
    setMembers([])
    if (cid) { try { await apiFetch(`/api/calls/${cid}/leave`, { method: 'PUT', body: '{}' }) } catch { /* ignore */ } }
    await refreshActive()
  }, [stopTimers, cleanupAll, refreshActive])

  const toggleMic = useCallback(async () => {
    const cid = callIdRef.current
    if (!cid) return
    const next = !micOnRef.current
    if (next) {
      try {
        if (!navigator.mediaDevices?.getUserMedia) { setError('Браузер не підтримує мікрофон.'); return }
        const stream = await getMicStream()
        localStreamRef.current = stream
        micOnRef.current = true
        const track = stream.getAudioTracks()[0]
        if (track) {
          track.onended = () => {
            if (localStreamRef.current !== stream) return
            localStreamRef.current = null
            micOnRef.current = false
            setMicOn(false)
            setSpeaking(false)
            for (const [, entry] of peersRef.current) { const tr = audioTransceiver(entry.pc); if (tr) applyMicToTransceiver(tr) }
            apiFetch(`/api/calls/${cid}/mic`, { method: 'PUT', body: JSON.stringify({ on: false }) }).catch(() => {})
          }
        }
        setSpeaking(true)
        for (const [, entry] of peersRef.current) { const tr = audioTransceiver(entry.pc); if (tr) applyMicToTransceiver(tr) }
      } catch (err) {
        micOnRef.current = false
        if (err instanceof DOMException) {
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') setError('Доступ до мікрофона заблоковано. Дозвольте у налаштуваннях браузера.')
          else if (err.name === 'NotFoundError') setError('Мікрофон не знайдено.')
          else if (err.name === 'NotReadableError') setError('Мікрофон зайнятий іншою програмою.')
          else setError('Не вдалося увімкнути мікрофон.')
        } else { setError('Не вдалося увімкнути мікрофон.') }
        return
      }
    } else {
      micOnRef.current = false
      for (const [, entry] of peersRef.current) { const tr = audioTransceiver(entry.pc); if (tr) applyMicToTransceiver(tr) }
      if (localStreamRef.current) { for (const t of localStreamRef.current.getTracks()) t.stop(); localStreamRef.current = null }
      setSpeaking(false)
    }
    setMicOn(next)
    setError(null)
    apiFetch(`/api/calls/${cid}/mic`, { method: 'PUT', body: JSON.stringify({ on: next }) }).catch(() => {})
  }, [applyMicToTransceiver])

  useEffect(() => {
    const onHide = (e: PageTransitionEvent) => {
      if (e.persisted) return
      const cid = callIdRef.current
      if (!joinedRef.current || !cid) return
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
      startTimers(); pollMembers(); pollSignals()
    }
    document.addEventListener('visibilitychange', recover)
    window.addEventListener('online', recover)
    window.addEventListener('pageshow', recover)
    return () => {
      document.removeEventListener('visibilitychange', recover)
      window.removeEventListener('online', recover)
      window.removeEventListener('pageshow', recover)
    }
  }, [ensureAudioCtx, startTimers, pollMembers, pollSignals])

  useEffect(() => () => {
    stopTimers()
    cleanupAll()
    wakeLockRef.current?.release().catch(() => {})
    audioCtxRef.current?.close?.().catch(() => {})
    audioCtxRef.current = null
  }, [stopTimers, cleanupAll])

  return { members, joined, micOn, speaking, connecting, error, audioBlocked, myUser, join, leave, toggleMic, unlockAudio }
}
