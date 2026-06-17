export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
}

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

const SESSIONS_KEY = "kp.chatSessions"
const ACTIVE_KEY = "kp.activeChatSession"

export function loadAllSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ChatSession[]
    return parsed.sort((a, b) => b.updatedAt - a.updatedAt)
  } catch {
    return []
  }
}

function persistSessions(sessions: ChatSession[]) {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
  } catch {
    /* quota exceeded — silent */
  }
}

export function createSession(): ChatSession {
  const session: ChatSession = {
    id: crypto.randomUUID(),
    title: "New Chat",
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  const all = loadAllSessions()
  persistSessions([session, ...all])
  setActiveSessionId(session.id)
  return session
}

export function saveSession(session: ChatSession) {
  const all = loadAllSessions()
  const idx = all.findIndex((s) => s.id === session.id)
  const updated = { ...session, updatedAt: Date.now() }
  if (idx >= 0) {
    all[idx] = updated
  } else {
    all.unshift(updated)
  }
  persistSessions(all)
}

export function deleteSession(id: string) {
  const all = loadAllSessions().filter((s) => s.id !== id)
  persistSessions(all)
  if (getActiveSessionId() === id) {
    setActiveSessionId(all[0]?.id ?? null)
  }
}

export function getActiveSessionId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY)
  } catch {
    return null
  }
}

export function setActiveSessionId(id: string | null) {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_KEY, id)
    } else {
      localStorage.removeItem(ACTIVE_KEY)
    }
  } catch {
    /* silent */
  }
}

/** Derive a title from the first user message. */
export function deriveTitle(content: string): string {
  const clean = content.replace(/\n/g, " ").trim()
  if (clean.length <= 40) return clean
  return clean.slice(0, 37) + "..."
}
