import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  PlayIcon,
  VolumeHighIcon,
  Loading03Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons"

import { PHRASES, CATEGORIES, type Phrase } from "@/data/phrases"
import { fetchTtsAudioUrl } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface PhraseLibraryProps {
  learnedIds: string[]
  onToggleLearned: (id: string) => void
}

type AudioState = "idle" | "loading" | "playing"

function PhraseCard({
  phrase,
  learned,
  onToggleLearned,
}: {
  phrase: Phrase
  learned: boolean
  onToggleLearned: (id: string) => void
}) {
  const [audioState, setAudioState] = React.useState<AudioState>("idle")
  const [error, setError] = React.useState(false)
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const urlRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      audioRef.current?.pause()
    }
  }, [])

  const handlePlay = async () => {
    if (audioState === "playing") {
      audioRef.current?.pause()
      setAudioState("idle")
      return
    }
    setError(false)
    setAudioState("loading")
    try {
      // Strip bracketed placeholders so TTS reads natural Korean.
      const speakText = phrase.korean.replace(/\[[^\]]*\]/g, "")
      const url = await fetchTtsAudioUrl(speakText || phrase.korean)
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      urlRef.current = url
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => setAudioState("idle")
      audio.onerror = () => {
        setError(true)
        setAudioState("idle")
      }
      await audio.play()
      setAudioState("playing")
    } catch {
      setError(true)
      setAudioState("idle")
    }
  }

  return (
    <Card
      className={cn(
        "transition-colors",
        learned && "bg-primary/[0.06] ring-primary/40"
      )}
    >
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <p className="ko text-2xl leading-snug">{phrase.korean}</p>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onToggleLearned(phrase.id)}
            aria-pressed={learned}
            aria-label={learned ? "Mark as not learned" : "Mark as learned"}
            className={cn(
              "shrink-0",
              learned
                ? "text-primary hover:text-primary"
                : "text-muted-foreground/40"
            )}
          >
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              size={24}
              color="currentColor"
              strokeWidth={learned ? 2.4 : 1.8}
            />
          </Button>
        </div>

        <p className="text-sm font-medium text-muted-foreground italic">
          {phrase.romanization}
        </p>
        <p className="text-sm leading-relaxed text-foreground/70">
          {phrase.english}
        </p>

        <div className="mt-2 flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePlay}
            disabled={audioState === "loading"}
          >
            <HugeiconsIcon
              icon={
                audioState === "loading"
                  ? Loading03Icon
                  : audioState === "playing"
                    ? VolumeHighIcon
                    : PlayIcon
              }
              size={14}
              color="currentColor"
              strokeWidth={2}
              data-icon="inline-start"
              className={audioState === "loading" ? "animate-spin" : undefined}
            />
            {audioState === "loading"
              ? "Loading"
              : audioState === "playing"
                ? "Playing"
                : "Play"}
          </Button>
          {error && (
            <span className="text-xs text-destructive">
              Audio failed — retry
            </span>
          )}
          {learned && !error && (
            <Badge className="bg-primary text-primary-foreground">
              Learned
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function PhraseLibrary({
  learnedIds,
  onToggleLearned,
}: PhraseLibraryProps) {
  const [active, setActive] = React.useState<
    "All" | (typeof CATEGORIES)[number]
  >("All")
  const learnedSet = React.useMemo(() => new Set(learnedIds), [learnedIds])

  const tabs = React.useMemo(() => ["All", ...CATEGORIES] as const, [])
  const visible = React.useMemo(
    () =>
      active === "All" ? PHRASES : PHRASES.filter((p) => p.category === active),
    [active]
  )

  const totalLearned = PHRASES.filter((p) => learnedSet.has(p.id)).length
  const learnedPct = Math.round((totalLearned / PHRASES.length) * 100)

  return (
    <div className="animate-rise mx-auto max-w-5xl">
      <header className="mb-5">
        <p className="ko text-sm font-bold text-primary">표현 라이브러리</p>
        <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight">
          Phrase Library
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Tap <span className="font-medium text-foreground">Play</span> to hear
          a native voice. Mark phrases as you master them.
        </p>
      </header>

      {/* Overall progress */}
      <Card className="mb-6">
        <CardContent>
          <Progress value={learnedPct} className="gap-2">
            <ProgressLabel className="text-sm font-semibold">
              Phrases mastered
            </ProgressLabel>
            <ProgressValue>
              {() => `${totalLearned}/${PHRASES.length}`}
            </ProgressValue>
          </Progress>
        </CardContent>
      </Card>

      {/* Category filter */}
      <Tabs
        value={active}
        onValueChange={(v) =>
          setActive(v as "All" | (typeof CATEGORIES)[number])
        }
        className="mb-6"
      >
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          {tabs.map((tab) => (
            <TabsTrigger key={tab} value={tab} className="flex-none">
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((phrase) => (
          <PhraseCard
            key={phrase.id}
            phrase={phrase}
            learned={learnedSet.has(phrase.id)}
            onToggleLearned={onToggleLearned}
          />
        ))}
      </div>
    </div>
  )
}
