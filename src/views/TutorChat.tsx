import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  BubbleChatIcon,
  SentIcon,
  SparklesIcon,
  Loading03Icon,
  Add01Icon,
  Delete02Icon,
  Clock01Icon,
  ArrowLeft01Icon,
} from "@hugeicons/core-free-icons"

import { streamChat, type ChatTurn } from "@/lib/api"
import {
  loadAllSessions,
  createSession,
  saveSession,
  deleteSession,
  getActiveSessionId,
  setActiveSessionId,
  deriveTitle,
  type ChatMessage,
} from "@/lib/chat-sessions"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"

const SUGGESTIONS = [
  "How do I introduce myself in a Korean interview?",
  "What's a polite way to ask about salary?",
  "Help me answer: 왜 우리 회사에 지원하셨나요?",
  "Give me 3 phrases to sound more confident.",
]

const GREETING_CONTENT =
  "안녕하세요! (An-nyeong-ha-se-yo) — Hi! I'm your Korean interview tutor. Ask me anything: grammar, phrasing, how to answer a tricky question, or how to calm last-minute nerves. 화이팅! 💪"

function makeGreeting(): ChatMessage {
  return { id: "greeting", role: "assistant", content: GREETING_CONTENT }
}

/** Lightly format the assistant text. */
function MessageBody({ content }: { content: string }) {
  const lines = content.split("\n")
  return (
    <>
      {lines.map((line, i) => {
        const trimmed = line.trim()
        const isExample = /[가-힣]/.test(trimmed) && /\(.+\)/.test(trimmed)
        if (trimmed === "") return <div key={i} className="h-2" />
        return (
          <p
            key={i}
            className={cn(
              "leading-relaxed",
              isExample && "ko my-1 rounded-md bg-muted px-2.5 py-1.5"
            )}
          >
            {trimmed}
          </p>
        )
      })}
    </>
  )
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - ts

  if (diff < 86_400_000) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }
  if (diff < 7 * 86_400_000) {
    return d.toLocaleDateString([], { weekday: "short" })
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" })
}

export function TutorChat() {
  const [sessions, setSessions] = React.useState(() => loadAllSessions())
  const [activeId, setActiveId] = React.useState<string | null>(() => {
    const stored = getActiveSessionId()
    const all = loadAllSessions()
    if (stored && all.some((s) => s.id === stored)) return stored
    if (all.length > 0) return all[0].id
    return null
  })
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  const activeSession = React.useMemo(
    () => sessions.find((s) => s.id === activeId) ?? null,
    [sessions, activeId]
  )

  const messages: ChatMessage[] = React.useMemo(() => {
    if (!activeSession) return [makeGreeting()]
    if (activeSession.messages.length === 0) return [makeGreeting()]
    return [makeGreeting(), ...activeSession.messages]
  }, [activeSession])

  const [input, setInput] = React.useState("")
  const [streaming, setStreaming] = React.useState(false)
  const [streamingMsgId, setStreamingMsgId] = React.useState<string | null>(
    null
  )
  const [streamingContent, setStreamingContent] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const bottomRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingContent])

  const refreshSessions = () => setSessions(loadAllSessions())

  const handleNewChat = () => {
    const session = createSession()
    setActiveId(session.id)
    refreshSessions()
    setSidebarOpen(false)
  }

  const handleSelectSession = (id: string) => {
    setActiveId(id)
    setActiveSessionId(id)
    setSidebarOpen(false)
  }

  const handleDeleteSession = (id: string) => {
    deleteSession(id)
    const remaining = loadAllSessions()
    setSessions(remaining)
    if (activeId === id) {
      setActiveId(remaining[0]?.id ?? null)
      setActiveSessionId(remaining[0]?.id ?? null)
    }
  }

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || streaming) return

    setError(null)

    // Ensure we have a session
    let session = activeSession
    if (!session) {
      session = createSession()
      setActiveId(session.id)
    }

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
    }
    const assistantId = `a-${Date.now()}`

    // Auto-title from first user message
    if (session.messages.length === 0) {
      session = { ...session, title: deriveTitle(trimmed) }
    }

    const updatedMessages = [...session.messages, userMsg]
    const updatedSession = {
      ...session,
      messages: updatedMessages,
      updatedAt: Date.now(),
    }
    saveSession(updatedSession)
    refreshSessions()

    const history: ChatTurn[] = updatedMessages.map(({ role, content }) => ({
      role,
      content,
    }))

    setInput("")
    setStreaming(true)
    setStreamingMsgId(assistantId)
    setStreamingContent("")

    try {
      let full = ""
      await streamChat(history, (delta) => {
        full += delta
        setStreamingContent(full)
      })

      // Save completed assistant message
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: full,
      }
      const finalSession = {
        ...updatedSession,
        messages: [...updatedMessages, assistantMsg],
        updatedAt: Date.now(),
      }
      saveSession(finalSession)
      refreshSessions()
    } catch (e) {
      setError(e instanceof Error ? e.message : "The tutor is unavailable.")
    } finally {
      setStreaming(false)
      setStreamingMsgId(null)
      setStreamingContent("")
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void send(input)
  }

  const displayMessages = React.useMemo(() => {
    if (!streaming || !streamingMsgId) return messages
    return [
      ...messages,
      {
        id: streamingMsgId,
        role: "assistant" as const,
        content: streamingContent,
      },
    ]
  }, [messages, streaming, streamingMsgId, streamingContent])

  const showSuggestions =
    (!activeSession || activeSession.messages.length === 0) && !streaming

  return (
    <div className="mx-auto flex h-[calc(100svh-7rem)] max-w-4xl flex-col md:h-[calc(100svh-4rem)]">
      <header className="mb-4 flex items-center gap-3">
        {/* Mobile sidebar toggle */}
        <Button
          variant="outline"
          size="icon"
          className="shrink-0 md:hidden"
          onClick={() => setSidebarOpen(true)}
          aria-label="Show chat history"
        >
          <HugeiconsIcon
            icon={Clock01Icon}
            size={18}
            color="currentColor"
            strokeWidth={2}
          />
        </Button>

        <div className="flex size-11 items-center justify-center rounded-xl bg-primary">
          <HugeiconsIcon
            icon={BubbleChatIcon}
            size={22}
            color="var(--color-primary-foreground)"
            strokeWidth={2}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="ko text-xs text-muted-foreground/70">AI 튜터</p>
          <h1 className="font-heading text-lg font-bold tracking-tight">
            Tutor Chat
          </h1>
        </div>
        <Button variant="outline" size="sm" onClick={handleNewChat}>
          <HugeiconsIcon
            icon={Add01Icon}
            size={16}
            color="currentColor"
            strokeWidth={2}
            data-icon="inline-start"
          />
          New Chat
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 gap-4">
        {/* ── Desktop session sidebar ─────────────────── */}
        <aside className="hidden w-56 shrink-0 flex-col md:flex">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              History
            </p>
            <span className="text-xs text-muted-foreground">
              {sessions.length}
            </span>
          </div>
          <ScrollArea className="min-h-0 flex-1 rounded-xl border bg-card">
            <div className="flex flex-col gap-0.5 p-1.5">
              {sessions.length === 0 && (
                <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                  No chats yet
                </p>
              )}
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSelectSession(s.id)}
                  className={cn(
                    "group flex items-start gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                    s.id === activeId
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate leading-snug font-medium">
                      {s.title}
                    </p>
                    <p className="mt-0.5 text-[0.65rem] text-muted-foreground/70">
                      {formatTime(s.updatedAt)} ·{" "}
                      {s.messages.filter((m) => m.role === "user").length} msgs
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteSession(s.id)
                    }}
                    className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                    aria-label={`Delete "${s.title}"`}
                  >
                    <HugeiconsIcon
                      icon={Delete02Icon}
                      size={14}
                      color="currentColor"
                      strokeWidth={2}
                    />
                  </button>
                </button>
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* ── Mobile session drawer ───────────────────── */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="relative z-10 flex w-72 flex-col bg-card shadow-xl">
              <div className="flex items-center gap-2 border-b p-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(false)}
                >
                  <HugeiconsIcon
                    icon={ArrowLeft01Icon}
                    size={18}
                    color="currentColor"
                    strokeWidth={2}
                  />
                </Button>
                <p className="font-heading text-sm font-bold">Chat History</p>
                <span className="ml-auto text-xs text-muted-foreground">
                  {sessions.length}
                </span>
              </div>
              <ScrollArea className="min-h-0 flex-1">
                <div className="flex flex-col gap-0.5 p-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNewChat}
                    className="mb-2 w-full justify-start"
                  >
                    <HugeiconsIcon
                      icon={Add01Icon}
                      size={16}
                      color="currentColor"
                      strokeWidth={2}
                      data-icon="inline-start"
                    />
                    New Chat
                  </Button>
                  {sessions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleSelectSession(s.id)}
                      className={cn(
                        "group flex items-start gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                        s.id === activeId
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate leading-snug font-medium">
                          {s.title}
                        </p>
                        <p className="mt-0.5 text-[0.65rem] text-muted-foreground/70">
                          {formatTime(s.updatedAt)} ·{" "}
                          {s.messages.filter((m) => m.role === "user").length}{" "}
                          msgs
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteSession(s.id)
                        }}
                        className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground/40 hover:text-destructive"
                        aria-label={`Delete "${s.title}"`}
                      >
                        <HugeiconsIcon
                          icon={Delete02Icon}
                          size={14}
                          color="currentColor"
                          strokeWidth={2}
                        />
                      </button>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </aside>
          </div>
        )}

        {/* ── Chat area ───────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col">
          <ScrollArea className="min-h-0 flex-1 rounded-xl border bg-card">
            <div className="flex flex-col gap-4 p-4 sm:p-5">
              {displayMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-3",
                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  {msg.role === "assistant" && (
                    <div className="flex size-8 shrink-0 items-center justify-center self-end rounded-full bg-primary">
                      <HugeiconsIcon
                        icon={SparklesIcon}
                        size={15}
                        color="var(--color-primary-foreground)"
                        strokeWidth={2}
                      />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[82%] rounded-2xl px-4 py-3 text-sm",
                      msg.role === "user"
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md border bg-muted/40 text-foreground/90"
                    )}
                  >
                    {msg.role === "assistant" && msg.content === "" ? (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <HugeiconsIcon
                          icon={Loading03Icon}
                          size={15}
                          color="currentColor"
                          strokeWidth={2}
                          className="animate-spin"
                        />
                        Thinking…
                      </span>
                    ) : (
                      <MessageBody content={msg.content} />
                    )}
                  </div>
                </div>
              ))}

              {showSuggestions && (
                <div className="mt-1 flex flex-col gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => void send(s)}
                      className="rounded-lg border bg-card px-4 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          {error && (
            <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
              {error}
            </p>
          )}

          {/* Composer */}
          <form onSubmit={handleSubmit} className="mt-3 flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  void send(input)
                }
              }}
              placeholder="Ask your tutor anything…"
              rows={1}
              className="max-h-32 min-h-[3rem] flex-1 resize-none leading-relaxed"
            />
            <Button
              type="submit"
              size="icon-lg"
              disabled={!input.trim() || streaming}
              aria-label="Send message"
              className="size-12 shrink-0 rounded-xl"
            >
              <HugeiconsIcon
                icon={streaming ? Loading03Icon : SentIcon}
                size={20}
                color="currentColor"
                strokeWidth={2}
                className={streaming ? "animate-spin" : undefined}
              />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
