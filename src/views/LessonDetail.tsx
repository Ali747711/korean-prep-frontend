import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  VolumeHighIcon,
  CheckmarkCircle02Icon,
  Loading03Icon,
  Idea01Icon,
  BookOpen01Icon,
  TextIcon,
  VoiceIcon,
  ChartBarIncreasingIcon,
} from "@hugeicons/core-free-icons"

import {
  fetchLesson,
  checkExercise,
  type LessonDetail as LessonDetailData,
  type DialogueLine,
  type GrammarPoint,
  type PronunciationPoint,
  type VocabItem,
} from "@/lib/curriculum-api"
import { fetchTtsAudioUrl } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

interface LessonDetailProps {
  lessonId: string
  onBack: () => void
  isCompleted: boolean
  onToggleComplete: (lessonId: string) => void
}

/** Shared single-instance audio player for Korean lines. */
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

function SpeakButton({
  text,
  speak,
  size = 16,
}: {
  text: string
  speak: (t: string) => void
  size?: number
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="mt-0.5 shrink-0 rounded-lg opacity-50 transition-opacity hover:opacity-100"
      onClick={() => speak(text)}
      aria-label="Listen"
    >
      <HugeiconsIcon
        icon={VolumeHighIcon}
        size={size}
        color="currentColor"
        strokeWidth={2}
      />
    </Button>
  )
}

// ── Dialogue ────────────────────────────────────────────
function DialogueBlock({
  lines,
  speak,
  title,
}: {
  lines: DialogueLine[]
  speak: (t: string) => void
  title: string
}) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-bold tracking-widest text-muted-foreground uppercase">
        {title}
      </h3>
      <div className="space-y-2">
        {lines.map((line, i) => (
          <div
            key={i}
            className="flex items-start justify-between gap-2 rounded-xl border bg-muted/30 px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              {line.speaker && (
                <span className="ko mr-2 text-[0.68rem] font-bold text-primary">
                  {line.speaker}
                </span>
              )}
              <span className="ko text-base leading-snug">{line.korean}</span>
              {line.romanization && (
                <p className="mt-0.5 text-xs text-muted-foreground italic">
                  {line.romanization}
                </p>
              )}
              <p className="mt-0.5 text-sm text-foreground/70">
                {line.english}
              </p>
            </div>
            <SpeakButton text={line.korean} speak={speak} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Vocabulary ───────────────────────────────────────────
function VocabList({
  items,
  speak,
}: {
  items: VocabItem[]
  speak: (t: string) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {items.map((v) => (
        <div
          key={v.vocabId}
          className="flex items-start justify-between gap-2 rounded-xl border bg-muted/30 px-4 py-3"
        >
          <div className="min-w-0 flex-1">
            <p className="ko text-base leading-snug font-bold">{v.korean}</p>
            {v.romanization && (
              <p className="text-xs text-muted-foreground italic">
                {v.romanization}
              </p>
            )}
            <p className="text-sm text-foreground/70">{v.meaning}</p>
          </div>
          <SpeakButton text={v.korean} speak={speak} />
        </div>
      ))}
    </div>
  )
}

// ── Exercise row ─────────────────────────────────────────
interface ExerciseSource {
  grammarId?: string
  pronId?: string
}

function ExerciseRow({
  prompt,
  answer,
  index,
  source,
}: {
  prompt: string
  answer: string
  index: number
  source: ExerciseSource
}) {
  const [value, setValue] = React.useState("")
  const [result, setResult] = React.useState<"correct" | "incorrect" | null>(
    null
  )
  const [checking, setChecking] = React.useState(false)

  const check = async () => {
    if (!value.trim() || checking) return
    setChecking(true)
    try {
      const res = await checkExercise({
        ...source,
        exerciseIndex: index,
        userAnswer: value,
      })
      setResult(res.correct ? "correct" : "incorrect")
    } catch {
      setResult(null)
    } finally {
      setChecking(false)
    }
  }

  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition-colors",
        result === "correct" && "lp-answer-correct",
        result === "incorrect" && "lp-answer-wrong"
      )}
    >
      <div className="flex items-center gap-2">
        <p className="ko min-w-0 flex-1 text-sm">{prompt}</p>
        <Input
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setResult(null)
          }}
          onKeyDown={(e) => e.key === "Enter" && void check()}
          placeholder="Your answer"
          className="ko h-8 w-36 shrink-0 text-sm"
        />
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => void check()}
          disabled={checking}
        >
          Check
        </Button>
      </div>
      {result === "correct" && (
        <p className="ko mt-1.5 text-xs font-bold">Correct! {answer}</p>
      )}
      {result === "incorrect" && (
        <p className="mt-1.5 text-xs">
          Not quite — answer: <span className="ko font-bold">{answer}</span>
        </p>
      )}
    </div>
  )
}

// ── Grammar card ─────────────────────────────────────────
function GrammarCard({
  g,
  speak,
}: {
  g: GrammarPoint
  speak: (t: string) => void
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="bg-primary/10 text-[0.65rem] text-primary"
            >
              Grammar {g.slot}
            </Badge>
            {g.title && (
              <span className="text-xs font-semibold text-foreground/80">
                {g.title}
              </span>
            )}
          </div>
          <p className="ko mt-2 text-2xl leading-snug font-bold text-primary">
            {g.pattern}
          </p>
          {g.meaning && (
            <p className="mt-0.5 text-sm font-medium text-foreground/80">
              {g.meaning}
            </p>
          )}
        </div>
        {g.explanation && (
          <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
            {g.explanation}
          </p>
        )}
        {g.examples.length > 0 && (
          <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
            {g.examples.map((ex, i) => (
              <div key={i} className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="ko text-base leading-snug">{ex.korean}</p>
                  {ex.english && (
                    <p className="text-sm text-foreground/70">{ex.english}</p>
                  )}
                </div>
                <SpeakButton text={ex.korean} speak={speak} />
              </div>
            ))}
          </div>
        )}
        {g.exercises.length > 0 && (
          <div className="space-y-2">
            <p className="text-[0.65rem] font-bold tracking-widest text-muted-foreground uppercase">
              Practice
            </p>
            {g.exercises.map((ex, i) => (
              <ExerciseRow
                key={i}
                prompt={ex.prompt}
                answer={ex.answer}
                index={i}
                source={{ grammarId: g.grammarId }}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Pronunciation card ───────────────────────────────────
function PronunciationCard({
  p,
  speak,
}: {
  p: PronunciationPoint
  speak: (t: string) => void
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-4">
        <Badge
          variant="secondary"
          className="w-fit bg-amber-500/10 text-[0.65rem] text-amber-600 dark:text-amber-400"
        >
          Pronunciation {p.slot}
        </Badge>
        <p className="text-sm leading-relaxed text-foreground/85">{p.rule}</p>
        {p.examples.length > 0 && (
          <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
            {p.examples.map((ex, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <p className="ko text-base">
                  {ex.korean} <span className="text-muted-foreground">→</span>{" "}
                  <span className="font-bold text-primary">
                    [{ex.pronounced}]
                  </span>
                </p>
                <SpeakButton text={ex.korean} speak={speak} />
              </div>
            ))}
          </div>
        )}
        {p.exercises.length > 0 && (
          <div className="space-y-2">
            <p className="text-[0.65rem] font-bold tracking-widest text-muted-foreground uppercase">
              Practice
            </p>
            {p.exercises.map((ex, i) => (
              <ExerciseRow
                key={i}
                prompt={`${ex.prompt}${ex.gloss ? ` ${ex.gloss}` : ""}`}
                answer={ex.answer}
                index={i}
                source={{ pronId: p.pronId }}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Tab meta ─────────────────────────────────────────────
type Tab = "dialogue" | "vocab" | "grammar" | "pronunciation" | "review"

const TAB_META: {
  value: Tab
  label: string
  icon: typeof BookOpen01Icon
}[] = [
  { value: "dialogue", label: "Dialogue", icon: BookOpen01Icon },
  { value: "vocab", label: "Vocabulary", icon: TextIcon },
  { value: "grammar", label: "Grammar", icon: ChartBarIncreasingIcon },
  { value: "pronunciation", label: "Pronunciation", icon: VoiceIcon },
  { value: "review", label: "Review", icon: CheckmarkCircle02Icon },
]

// ── Main component ────────────────────────────────────────
export function LessonDetail({
  lessonId,
  onBack,
  isCompleted,
  onToggleComplete,
}: LessonDetailProps) {
  const [lesson, setLesson] = React.useState<LessonDetailData | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [tab, setTab] = React.useState<Tab>("dialogue")
  const speak = useSpeaker()

  React.useEffect(() => {
    let cancelled = false
    setLesson(null)
    setError(null)
    fetchLesson(lessonId)
      .then((data) => !cancelled && setLesson(data))
      .catch((e) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [lessonId])

  // ── Error ──
  if (error) {
    return (
      <div className="animate-rise mx-auto max-w-3xl">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
          <HugeiconsIcon
            icon={ArrowLeft01Icon}
            size={16}
            color="currentColor"
            strokeWidth={2}
            data-icon="inline-start"
          />
          Back
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Loading ──
  if (!lesson) {
    return (
      <div className="animate-rise mx-auto flex max-w-3xl items-center justify-center py-20">
        <HugeiconsIcon
          icon={Loading03Icon}
          size={28}
          color="currentColor"
          strokeWidth={2}
          className="animate-spin text-muted-foreground"
        />
      </div>
    )
  }

  return (
    <div className="animate-rise mx-auto max-w-3xl">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4 -ml-2">
        <HugeiconsIcon
          icon={ArrowLeft01Icon}
          size={16}
          color="currentColor"
          strokeWidth={2}
          data-icon="inline-start"
        />
        All lessons
      </Button>

      {/* Lesson header */}
      <header className="mb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1.5 flex items-center gap-2">
              <Badge
                variant="secondary"
                className="bg-primary/10 text-[0.65rem] font-bold text-primary"
              >
                Lesson {lesson.chapter}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {lesson.category}
              </span>
            </div>
            <h1 className="font-heading text-2xl leading-tight font-bold tracking-tight sm:text-3xl">
              {lesson.title}
            </h1>
            {lesson.titleKorean && (
              <p className="ko mt-1 text-base text-muted-foreground">
                {lesson.titleKorean}
              </p>
            )}
          </div>

          {/* Complete toggle */}
          <Button
            variant={isCompleted ? "secondary" : "outline"}
            size="sm"
            onClick={() => onToggleComplete(lesson.lessonId)}
            className={cn(
              "shrink-0 transition-all",
              isCompleted && "bg-primary/10 text-primary hover:bg-primary/20"
            )}
          >
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              size={15}
              color="currentColor"
              strokeWidth={2.2}
              data-icon="inline-start"
            />
            {isCompleted ? "Completed" : "Mark done"}
          </Button>
        </div>

        {/* Meta pills */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-[0.65rem] font-semibold text-muted-foreground">
            {lesson.vocab?.length ?? 0} words
          </span>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-[0.65rem] font-semibold text-muted-foreground">
            {lesson.grammar?.length ?? 0} grammar
          </span>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-[0.65rem] font-semibold text-muted-foreground">
            {lesson.pronunciation?.length ?? 0} pronunciation
          </span>
        </div>
      </header>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="flex h-auto w-full flex-wrap gap-1 bg-transparent p-0">
          {TAB_META.map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="flex-1 rounded-lg border bg-card text-xs data-active:border-primary data-active:bg-primary data-active:text-primary-foreground"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Dialogue ── */}
        <TabsContent value="dialogue" className="mt-5 space-y-6">
          {lesson?.shortDialogue?.length > 0 && (
            <DialogueBlock
              lines={lesson.shortDialogue}
              speak={speak}
              title="Short dialogue"
            />
          )}
          {lesson.longDialogue?.length > 0 && (
            <DialogueBlock
              lines={lesson.longDialogue}
              speak={speak}
              title="Long dialogue"
            />
          )}
          {lesson.culturalTip && (
            <Card>
              <CardContent className="flex gap-3 py-4">
                <HugeiconsIcon
                  icon={Idea01Icon}
                  size={18}
                  color="var(--color-primary)"
                  strokeWidth={2}
                  className="mt-0.5 shrink-0"
                />
                <div>
                  <p className="text-sm font-semibold">Cultural tip</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {lesson.culturalTip}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Vocabulary ── */}
        <TabsContent value="vocab" className="mt-5 space-y-5">
          {lesson.vocab?.length > 0 && (
            <div>
              <h3 className="mb-3 text-xs font-bold tracking-widest text-muted-foreground uppercase">
                Vocabulary
              </h3>
              <VocabList items={lesson.vocab} speak={speak} />
            </div>
          )}
          {lesson.extendedVocab?.length > 0 && (
            <div>
              <h3 className="mb-3 text-xs font-bold tracking-widest text-muted-foreground uppercase">
                Extended vocabulary
              </h3>
              <VocabList items={lesson.extendedVocab} speak={speak} />
            </div>
          )}
        </TabsContent>

        {/* ── Grammar ── */}
        <TabsContent value="grammar" className="mt-5 space-y-4">
          {lesson.grammar?.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No grammar points for this lesson.
            </p>
          ) : (
            lesson.grammar?.map((g) => (
              <GrammarCard key={g.grammarId} g={g} speak={speak} />
            ))
          )}
        </TabsContent>

        {/* ── Pronunciation ── */}
        <TabsContent value="pronunciation" className="mt-5 space-y-4">
          {lesson.pronunciation?.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No pronunciation notes for this lesson.
            </p>
          ) : (
            lesson.pronunciation?.map((p) => (
              <PronunciationCard key={p.pronId} p={p} speak={speak} />
            ))
          )}
        </TabsContent>

        {/* ── Review ── */}
        <TabsContent value="review" className="mt-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Read in Korean only — no translation.
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="ko text-base leading-loose whitespace-pre-line text-foreground/90">
                {lesson.koreanReview}
              </p>
            </CardContent>
          </Card>

          {/* Mark complete CTA at bottom of review */}
          {!isCompleted && (
            <div className="mt-6 flex justify-center">
              <Button
                size="lg"
                onClick={() => onToggleComplete(lesson.lessonId)}
                className="gap-2 px-8 shadow-md"
              >
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  size={18}
                  color="currentColor"
                  strokeWidth={2.2}
                />
                Mark lesson complete
              </Button>
            </div>
          )}
          {isCompleted && (
            <div className="mt-6 flex justify-center">
              <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-6 py-3 text-sm font-semibold text-primary">
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  size={18}
                  color="currentColor"
                  strokeWidth={2.2}
                />
                잘했어요! Lesson complete
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
