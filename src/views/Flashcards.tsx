import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  RefreshIcon,
  ArrowRight01Icon,
  ArrowLeft01Icon,
  VolumeHighIcon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  ShuffleIcon,
  Loading03Icon,
} from "@hugeicons/core-free-icons"

import { fetchDeck, type FlashcardItem } from "@/lib/curriculum-api"
import { fetchTtsAudioUrl } from "@/lib/api"
import { DailyWordsTab } from "@/components/DailyWordsTab"
import { fetchDailyWords } from "@/lib/daily-words-api"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface FlashcardsProps {
  learnedIds: string[]
  onToggleLearned: (id: string) => void
}

type CardMode = "korean-first" | "english-first"

const WEEKS = Array.from({ length: 12 }, (_, i) => i + 1)

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = shuffled[i]
    shuffled[i] = shuffled[j]
    shuffled[j] = tmp
  }
  return shuffled
}

export function Flashcards({ learnedIds, onToggleLearned }: FlashcardsProps) {
  const [week, setWeek] = React.useState(1)
  const [mode, setMode] = React.useState<CardMode>("korean-first")
  const [deck, setDeck] = React.useState<FlashcardItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [noData, setNoData] = React.useState(false)
  const [index, setIndex] = React.useState(0)
  const [flipped, setFlipped] = React.useState(false)
  const [sessionKnown, setSessionKnown] = React.useState(0)
  const [sessionTotal, setSessionTotal] = React.useState(0)
  const audioRef = React.useRef<HTMLAudioElement | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const [deckSource, setDeckSource] = React.useState<"curriculum" | "daily">(
    "curriculum"
  )
  const [dailyDate, setDailyDate] = React.useState(today)
  const deviceId = React.useMemo(() => {
    const key = "kp.deviceId"
    const existing = localStorage.getItem(key)
    if (existing) return existing
    const id = crypto.randomUUID()
    localStorage.setItem(key, id)
    return id
  }, [])

  const learnedSet = React.useMemo(() => new Set(learnedIds), [learnedIds])

  const resetSession = React.useCallback((items: FlashcardItem[]) => {
    setDeck(shuffleArray(items))
    setIndex(0)
    setFlipped(false)
    setSessionKnown(0)
    setSessionTotal(0)
  }, [])

  React.useEffect(() => {
    if (deckSource !== "curriculum") return
    let cancelled = false
    setLoading(true)
    setNoData(false)
    fetchDeck("week", week)
      .then((items) => {
        if (cancelled) return
        if (items.length === 0) setNoData(true)
        else resetSession(items)
      })
      .catch(() => {
        if (!cancelled) setNoData(true)
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [week, resetSession, deckSource])

  React.useEffect(() => {
    if (deckSource !== "daily") return
    let cancelled = false
    setLoading(true)
    setNoData(false)
    fetchDailyWords(deviceId, dailyDate)
      .then(({ words }) => {
        if (cancelled) return
        if (words.length === 0) {
          setNoData(true)
          setDeck([])
        } else {
          resetSession(words)
        }
      })
      .catch(() => {
        if (!cancelled) setNoData(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [deckSource, dailyDate, deviceId, resetSession])

  const card = deck[index]
  const isFinished = !loading && !noData && deck.length > 0 && !card

  const handleFlip = () => setFlipped((v) => !v)

  const handleSpeak = async () => {
    if (!card) return
    try {
      const url = await fetchTtsAudioUrl(card.korean)
      audioRef.current?.pause()
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => URL.revokeObjectURL(url)
      await audio.play()
    } catch {
      /* non-critical */
    }
  }

  const advance = (knew: boolean) => {
    setSessionTotal((t) => t + 1)
    if (knew) setSessionKnown((k) => k + 1)
    if (knew && card && !learnedSet.has(card.id)) {
      onToggleLearned(card.id)
    }
    setFlipped(false)
    setIndex((i) => i + 1)
  }

  const progressPct =
    deck.length > 0 ? Math.round((index / deck.length) * 100) : 0

  const front = card
    ? mode === "korean-first"
      ? card.korean
      : card.english
    : ""
  const frontSub =
    card && mode === "korean-first" ? card.romanization : undefined
  const back = card
    ? mode === "korean-first"
      ? card.english
      : card.korean
    : ""
  const backSub =
    card && mode === "english-first" ? card.romanization : undefined

  return (
    <div className="animate-rise mx-auto max-w-2xl">
      {/* Header */}
      <header className="mb-6">
        <p className="ko text-xs font-bold tracking-widest text-primary uppercase">
          플래시카드
        </p>
        <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight">
          Flashcards
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Flip, listen, and self-grade through the weekly vocabulary.
        </p>
      </header>

      {/* Controls */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {/* Daily Words toggle */}
        <Button
          variant={deckSource === "daily" ? "default" : "outline"}
          size="sm"
          onClick={() =>
            setDeckSource((s) => (s === "daily" ? "curriculum" : "daily"))
          }
          className="rounded-xl text-xs font-semibold"
        >
          ✦ Daily Words
        </Button>

        {/* Week selector — only visible in curriculum mode */}
        {deckSource === "curriculum" && (
          <div className="relative">
            <select
              value={week}
              onChange={(e) => setWeek(Number(e.target.value))}
              className="h-9 appearance-none rounded-xl border bg-card pr-8 pl-3 text-sm font-semibold focus:ring-2 focus:ring-ring focus:outline-none"
              aria-label="Week filter"
            >
              {WEEKS.map((w) => (
                <option key={w} value={w}>
                  Week {w}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-muted-foreground">
              ▾
            </span>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setMode((m) =>
              m === "korean-first" ? "english-first" : "korean-first"
            )
          }
          className="rounded-xl text-xs"
        >
          <HugeiconsIcon
            icon={RefreshIcon}
            size={13}
            color="currentColor"
            strokeWidth={2}
            data-icon="inline-start"
          />
          {mode === "korean-first" ? "한→EN" : "EN→한"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => resetSession(deck)}
          disabled={deck.length === 0}
          className="rounded-xl text-xs"
        >
          <HugeiconsIcon
            icon={ShuffleIcon}
            size={13}
            color="currentColor"
            strokeWidth={2}
            data-icon="inline-start"
          />
          Shuffle
        </Button>
      </div>

      {deckSource === "daily" && (
        <DailyWordsTab
          deviceId={deviceId}
          selectedDate={dailyDate}
          onSelectDate={(d) => setDailyDate(d)}
          onWordsAdded={(words) => {
            setNoData(false)
            setLoading(false)
            resetSession(words)
          }}
        />
      )}

      {/* Progress */}
      {deck.length > 0 && (
        <div className="mb-5">
          <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold">Progress</span>
            <span className="tabular-nums">
              {index} / {deck.length}
            </span>
          </div>
          <div className="lp-progress-track">
            <div
              className="lp-progress-fill"
              style={{ width: `${progressPct}%` }}
              role="progressbar"
              aria-valuenow={index}
              aria-valuemin={0}
              aria-valuemax={deck.length}
            />
          </div>
          {sessionTotal > 0 && (
            <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
              <span>
                Known:{" "}
                <span className="font-semibold text-primary">
                  {sessionKnown}
                </span>
              </span>
              <span>
                Reviewing:{" "}
                <span className="font-semibold text-foreground">
                  {sessionTotal - sessionKnown}
                </span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* States */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <HugeiconsIcon
            icon={Loading03Icon}
            size={28}
            color="currentColor"
            strokeWidth={2}
            className="animate-spin text-muted-foreground"
          />
        </div>
      ) : isFinished ? (
        /* ── Finished ── */
        <Card>
          <CardContent className="flex flex-col items-center gap-5 py-12 text-center">
            <div className="flex size-20 items-center justify-center rounded-full bg-primary/10">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                size={40}
                color="var(--color-primary)"
                strokeWidth={2}
              />
            </div>
            <div>
              <p className="ko text-2xl font-bold text-primary">잘했어요!</p>
              <h2 className="mt-1 font-heading text-xl font-bold">
                Deck Complete
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                You got{" "}
                <span className="font-semibold text-foreground">
                  {sessionKnown}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-foreground">
                  {sessionTotal}
                </span>{" "}
                correct
                {sessionTotal > 0 && (
                  <>
                    {" "}
                    ·{" "}
                    <span className="font-semibold text-primary">
                      {Math.round((sessionKnown / sessionTotal) * 100)}%
                    </span>
                  </>
                )}
              </p>
            </div>
            <Button
              onClick={() => resetSession(deck)}
              className="rounded-xl px-6"
            >
              <HugeiconsIcon
                icon={RefreshIcon}
                size={16}
                color="currentColor"
                strokeWidth={2}
                data-icon="inline-start"
              />
              Study Again
            </Button>
          </CardContent>
        </Card>
      ) : noData || deck.length === 0 ? (
        /* ── Empty state ── */
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              {deckSource === "daily"
                ? `No words added yet for ${dailyDate}.`
                : `No cards for Week ${week} yet.`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {deckSource === "daily"
                ? `Tap "Add Words" above to get started.`
                : `Vocabulary is seeded for Week 1. Try another week or come back soon.`}
            </p>
            {week !== 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWeek(1)}
                className="mt-4 rounded-xl"
              >
                Go to Week 1
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        /* ── Active card ── */
        <>
          <Card
            onClick={handleFlip}
            className="lp-flip-card group transition-all hover:ring-primary/25"
          >
            <CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 py-10 text-center">
              <Badge variant="secondary" className="text-xs">
                Week {week}
              </Badge>

              {!flipped ? (
                <>
                  <p
                    className={cn(
                      "text-4xl leading-snug font-bold sm:text-5xl",
                      mode === "korean-first" && "ko"
                    )}
                  >
                    {front}
                  </p>
                  {frontSub && (
                    <p className="text-sm text-muted-foreground italic">
                      {frontSub}
                    </p>
                  )}
                  <p className="mt-3 text-xs font-medium tracking-widest text-muted-foreground/50 uppercase">
                    Tap to reveal
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground line-through">
                    {front}
                  </p>
                  <p
                    className={cn(
                      "text-4xl leading-snug font-bold text-primary sm:text-5xl",
                      mode === "english-first" && "ko"
                    )}
                  >
                    {back}
                  </p>
                  {backSub && (
                    <p className="text-sm text-muted-foreground italic">
                      {backSub}
                    </p>
                  )}
                  {card && learnedSet.has(card.id) && (
                    <Badge className="mt-1 bg-primary text-primary-foreground">
                      Already learned
                    </Badge>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className="rounded-xl"
              aria-label="Previous card"
            >
              <HugeiconsIcon
                icon={ArrowLeft01Icon}
                size={15}
                color="currentColor"
                strokeWidth={2}
              />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleSpeak()}
              className="rounded-xl"
            >
              <HugeiconsIcon
                icon={VolumeHighIcon}
                size={15}
                color="currentColor"
                strokeWidth={2}
                data-icon="inline-start"
              />
              Listen
            </Button>

            {!flipped && (
              <Button
                size="sm"
                onClick={handleFlip}
                className="rounded-xl px-5"
              >
                Flip
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={15}
                  color="currentColor"
                  strokeWidth={2}
                  data-icon="inline-end"
                />
              </Button>
            )}

            {flipped && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => advance(false)}
                  className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  <HugeiconsIcon
                    icon={Cancel01Icon}
                    size={15}
                    color="currentColor"
                    strokeWidth={2}
                    data-icon="inline-start"
                  />
                  Learning
                </Button>
                <Button
                  size="sm"
                  onClick={() => advance(true)}
                  className="rounded-xl px-5"
                >
                  <HugeiconsIcon
                    icon={CheckmarkCircle02Icon}
                    size={15}
                    color="currentColor"
                    strokeWidth={2}
                    data-icon="inline-start"
                  />
                  Know it
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
