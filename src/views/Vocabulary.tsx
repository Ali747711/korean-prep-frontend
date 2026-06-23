import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Loading03Icon,
  VolumeHighIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
} from "@hugeicons/core-free-icons"

import {
  fetchVocabularyWeeks,
  fetchVocabulary,
  type WeekIndexEntry,
  type WeeklyKeyword,
} from "@/lib/curriculum-api"
import { fetchTtsAudioUrl } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

function useSpeaker() {
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  return React.useCallback(async (text: string) => {
    const clean = text.replace(/\[[^\]]*\]/g, "").trim()
    if (!clean) return
    try {
      const url = await fetchTtsAudioUrl(clean)
      audioRef.current?.pause()
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => URL.revokeObjectURL(url)
      await audio.play()
    } catch {
      /* non-critical */
    }
  }, [])
}

function KeywordCard({
  kw,
  speak,
}: {
  kw: WeeklyKeyword
  speak: (t: string) => void
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <Card
      className={cn(
        "transition-all duration-150",
        open && "ring-1 ring-primary/30"
      )}
    >
      <CardContent className="py-4">
        {/* Header row — always visible */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-start gap-3 text-left"
          aria-expanded={open}
        >
          {/* Day badge */}
          <div className="lp-day-badge mt-0.5 shrink-0">{kw.day}</div>

          {/* Keyword + meaning */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="ko text-xl leading-snug font-bold text-primary">
                {kw.keyword}
              </span>
              {kw.romanization && (
                <span className="text-xs text-muted-foreground italic">
                  {kw.romanization}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-foreground/80">{kw.meaning}</p>
          </div>

          {/* Toggle affordance */}
          <div className="mt-0.5 flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <span className="hidden sm:inline">
              {open ? "Hide" : `${kw.expressions.length} examples`}
            </span>
            <HugeiconsIcon
              icon={open ? ArrowUp01Icon : ArrowDown01Icon}
              size={14}
              color="currentColor"
              strokeWidth={2}
            />
          </div>
        </button>

        {/* Expanded expressions */}
        {open && (
          <div className="mt-4 space-y-2 border-t pt-4">
            {kw.expressions.map((e) => (
              <div
                key={e.expressionId}
                className="rounded-xl border bg-muted/30 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="ko text-base leading-snug">{e.korean}</p>
                    <p className="text-sm text-foreground/70">{e.english}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mt-0.5 shrink-0 rounded-lg opacity-50 hover:opacity-100"
                    onClick={() => speak(e.korean)}
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
                {e.notes && (
                  <p className="mt-2 border-t pt-2 text-xs leading-relaxed whitespace-pre-line text-muted-foreground">
                    {e.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function Vocabulary() {
  const [weeks, setWeeks] = React.useState<WeekIndexEntry[] | null>(null)
  const [activeWeek, setActiveWeek] = React.useState(1)
  const [keywords, setKeywords] = React.useState<WeeklyKeyword[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const speak = useSpeaker()

  React.useEffect(() => {
    fetchVocabularyWeeks()
      .then((w) => {
        setWeeks(w)
        if (w.length > 0) setActiveWeek(w[0].week)
      })
      .catch((e) => setError(e.message))
  }, [])

  React.useEffect(() => {
    let cancelled = false
    setKeywords(null)
    fetchVocabulary(activeWeek)
      .then((k) => !cancelled && setKeywords(k))
      .catch((e) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [activeWeek])

  // Determine which weeks have data vs. coming soon
  const availableWeeks = React.useMemo(
    () => new Set(weeks?.map((w) => w.week) ?? []),
    [weeks]
  )

  return (
    <div className="animate-rise mx-auto max-w-3xl">
      {/* Header */}
      <header className="mb-6">
        <p className="ko text-xs font-bold tracking-widest text-primary uppercase">
          단어 공부
        </p>
        <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight">
          Vocabulary
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          A keyword a day with real sample expressions. 12 weeks, 84 words.
        </p>
      </header>

      {error && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      {/* Week selector */}
      {weeks !== null && (
        <div className="mb-6">
          <p className="lp-section-label mb-3">Select week</p>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => {
              const hasData = availableWeeks.has(w)
              const isActive = activeWeek === w
              return (
                <button
                  key={w}
                  onClick={() => hasData && setActiveWeek(w)}
                  disabled={!hasData}
                  className={cn(
                    "relative flex h-10 w-14 flex-col items-center justify-center rounded-xl border text-xs font-bold transition-all",
                    isActive && hasData
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : hasData
                        ? "border-border bg-card text-foreground hover:border-primary/50 hover:bg-primary/5"
                        : "cursor-not-allowed border-border bg-muted/30 text-muted-foreground/40"
                  )}
                  aria-label={`Week ${w}${!hasData ? " (coming soon)" : ""}`}
                >
                  <span className="text-[0.6rem] font-medium opacity-70">
                    Wk
                  </span>
                  <span>{w}</span>
                  {!hasData && (
                    <span className="absolute -top-1 -right-1 size-2 rounded-full border border-background bg-muted" />
                  )}
                </button>
              )
            })}
          </div>
          {!availableWeeks.has(activeWeek) && (
            <p className="mt-3 text-xs text-muted-foreground">
              Week {activeWeek} content is coming soon. Try Week 1 to get
              started.
            </p>
          )}
        </div>
      )}

      {/* Loading */}
      {!keywords && !error && (
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

      {/* Keywords */}
      {keywords && keywords.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              No vocabulary data for Week {activeWeek} yet.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Content is being added week by week.
            </p>
          </CardContent>
        </Card>
      )}

      {keywords && keywords.length > 0 && (
        <div className="space-y-3">
          <p className="lp-section-label mb-2">
            Week {activeWeek} · {keywords.length} keywords
          </p>
          {keywords.map((kw) => (
            <KeywordCard key={kw.keywordId} kw={kw} speak={speak} />
          ))}
        </div>
      )}
    </div>
  )
}
