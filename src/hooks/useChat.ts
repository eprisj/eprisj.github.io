import { useCallback, useEffect, useRef, useState } from 'react'

const API_BASE = 'https://eprisradio.munister.com.ua'
const TOKEN_KEY = 'epris_radio_token'

function getToken() { return localStorage.getItem(TOKEN_KEY) || '' }

async function apiFetch(path: string, opts?: RequestInit) {
  const r = await fetch(API_BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...(opts?.headers ?? {}),
    },
  })
  const json = await r.json()
  if (!json.ok) throw new Error(json.error || 'api error')
  return json.data
}

export type ChatMessage = {
  id: number
  type: 'text' | 'reaction'
  content: string
  created_at: string
  nickname: string
  color: string
}

export const REACTIONS = ['👏', '❤️', '🔥', '😂', '🎉', '💯', '👍', '🙌']

export function useChat(callId: number | null, joined: boolean) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const afterIdRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!joined || !callId) {
      setMessages([]); afterIdRef.current = 0
      if (timerRef.current) clearTimeout(timerRef.current)
      return
    }
    let alive = true
    const poll = async () => {
      try {
        const data: ChatMessage[] = await apiFetch(`/api/calls/${callId}/chat?after_id=${afterIdRef.current}`)
        if (alive && data?.length) {
          afterIdRef.current = data[data.length - 1].id
          setMessages(prev => [...prev.slice(-80), ...data])
        }
      } catch { /* ignore */ }
      if (alive) timerRef.current = setTimeout(poll, 2000)
    }
    poll()
    return () => { alive = false; if (timerRef.current) clearTimeout(timerRef.current) }
  }, [callId, joined])

  const sendText = useCallback(async (cid: number, content: string) => {
    const trimmed = content.trim().slice(0, 300)
    if (!trimmed) return
    try {
      const data: ChatMessage = await apiFetch(`/api/calls/${cid}/chat`, {
        method: 'POST',
        body: JSON.stringify({ type: 'text', content: trimmed }),
      })
      if (data?.id) {
        afterIdRef.current = Math.max(afterIdRef.current, data.id)
        setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev.slice(-80), data])
      }
    } catch { /* ignore */ }
  }, [])

  const sendReaction = useCallback(async (cid: number, emoji: string) => {
    try {
      const data: ChatMessage = await apiFetch(`/api/calls/${cid}/chat`, {
        method: 'POST',
        body: JSON.stringify({ type: 'reaction', content: emoji }),
      })
      if (data?.id) {
        afterIdRef.current = Math.max(afterIdRef.current, data.id)
        setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev.slice(-80), data])
      }
    } catch { /* ignore */ }
  }, [])

  const rename = useCallback(async (nickname: string) => {
    const trimmed = nickname.trim()
    if (trimmed.length < 2) return null
    return apiFetch('/api/auth/me', { method: 'PUT', body: JSON.stringify({ nickname: trimmed }) })
  }, [])

  return { messages, sendText, sendReaction, rename }
}
