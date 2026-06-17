import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  SparklesIcon,
  Loading03Icon,
  VolumeHighIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
} from "@hugeicons/core-free-icons"

import { fetchGrammar, type GrammarPoint } from "@/lib/curriculum-api"
import { fetchTtsAudioUrl, streamChat, type ChatTurn } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

function PatternCard({ pattern }: { pattern: GrammarPoint }) {
  const [expanded, setExpanded] = React.useState(false)
  const [explaining, setExplaining] = React.useState(false)
  const [explanation, setExplanation] = React.useState<string | null>(null)
  const audioRef = React.useRef<HTMLAudioElement | null>(null)

  const handleSpeak = async (text: string) => {
    try {
      const url = await fetchTtsAudioUrl(text)
      audioRef.current?.pause()
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => URL.revokeObjectURL(url)
      await audio.play()
    } catch {
      /* non-critical */
    }
  }

  const handleExplain = async () => {
    if (explanation) {
      setExpanded((v) => !v)
      return
    }
    setExplaining(true)
    setExpanded(true)

    const exampleLines = pattern.examples
      .map((e) => `  ${e.korean} — ${e.english}`)
      .join("\n")

    const messages: ChatTurn[] = [
      {
        role: "user",
        content: `Explain this Korean grammar pattern in simple terms for a beginner. Keep it short (3-5 sentences max). Give one extra example sentence.\n\nPattern: ${pattern.pattern}\nMeaning: ${pattern.meaning}\nExamples:\n${exampleLines}`,
      },
    ]

    let full = ""
    try {
      await streamChat(messages, (delta) => {
        full += delta
        setExplanation(full)
      })
    } catch {
      setExplanation("Could not load explanation — try again later.")
    } finally {
      setExplaining(false)
    }
  }

  return (
    <Card className="transition-all duration-150 hover:ring-primary/20">
      <CardContent className="flex flex-col gap-3 py-4">
        {/* Pattern header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {pattern.title && (
              <p className="text-xs font-semibold text-foreground/70 mb-1">
                {pattern.title}
              </p>
            )}
            <p className="ko text-2xl leading-snug font-bold text-primary">
              {pattern.pattern}
            </p>
            <p className="mt-1 text-sm font-medium text-foreground/80">
              {pattern.meaning}
            </p>
          </div>
          <Badge
            variant="secondary"
            className="shrink-0 bg-primary/10 text-primary text-[0.65rem] font-bold"
          >
            #{pattern.order}
          </Badge>
        </div>

        {/* Examples */}
        {pattern.examples.length > 0 && (
          <div className="space-y-2.5 rounded-xl border bg-muted/30 p-3">
            {pattern.examples.map((ex, i) => (
              <div key={i} className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="ko text-base leading-snug">{ex.korean}</p>
                  {ex.romanization && (
                    <p className="text-xs text-muted-foreground italic">
                      {ex.romanization}
                    </p>
                  )}
                  {ex.english && (
                    <p className="text-sm text-foreground/70">{ex.english}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="mt-0.5 shrink-0 rounded-lg opacity-50 hover:opacity-100 transition-opacity"
                  onClick={() => void handleSpeak(ex.korean)}
                  aria-label="Listen"
                >
                  <HugeiconsIcon
                    icon={VolumeHighIcon}
                    size={15}
                    color="currentColor"
                    strokeWidth={2}
                  />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* AI Explain */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => void handleExplain()}
          disabled={explaining}
          className="self-start rounded-xl text-xs"
        >
          <HugeiconsIcon
            icon={explaining ? Loading03Icon : SparklesIcon}
            size={13}
            color="currentColor"
            strokeWidth={2}
            data-icon="inline-start"
            className={explaining ? "animate-spin" : undefined}
          />
          {explaining
            ? "Explaining…"
            : explanation
              ? expanded
                ? "Hide explanation"
                : "Show explanation"
              : "AI Explain"}
          {explanation && !explaining && (
            <HugeiconsIcon
              icon={expanded ? ArrowUp01Icon : ArrowDown01Icon}
              size={13}
              color="currentColor"
              strokeWidth={2}
              data-icon="inline-end"
            />
          )}
        </Button>

        {/* AI explanation panel */}
        {expanded && explanation && (
          <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
            <p className="text-[0.65rem] font-bold tracking-widest text-primary uppercase mb-2">
              AI Explanation
            </p>
            <div className="text-sm leading-relaxed text-foreground/85 whitespace-pre-line">
              {explanation}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function GrammarPatterns() {
  const [grammar, setGrammar] = React.useState<GrammarPoint[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    fetchGrammar()
      .then((data) => !cancelled && setGrammar(data))
      .catch((e) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="animate-rise mx-auto max-w-5xl">
      {/* Header */}
      <header className="mb-6">
        <p className="ko text-xs font-bold text-primary tracking-widest uppercase">문법 패턴</p>
        <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight">
          Grammar Patterns
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Every grammar point from the book, in order. Tap{" "}
          <span className="font-semibold text-foreground">AI Explain</span> for a
          deeper breakdown.
        </p>

        {grammar && (
          <p className="mt-2 text-xs text-muted-foreground">
            <span className="font-semibold text-primary">{grammar.length}</span> patterns loaded
          </p>
        )}
      </header>

      {error && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      {!grammar && !error && (
        <div className="flex items-center justify-center py-20">
          <HugeiconsIcon
            icon={Loading03Icon}
            size={28}
            color="currentColor"
            strokeWidth={2}
            className="animate-spin text-muted-foreground"
          />
        </div>
      )}

      {grammar && grammar.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No grammar patterns yet. Complete some lessons to unlock patterns.
          </CardContent>
        </Card>
      )}

      {grammar && grammar.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {grammar.map((pattern) => (
            <PatternCard key={pattern.grammarId} pattern={pattern} />
          ))}
        </div>
      )}
    </div>
  )
}
