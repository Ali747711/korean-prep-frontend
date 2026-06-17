import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  BookOpen01Icon,
  Mic01Icon,
  BubbleChatIcon,
  Fire03Icon,
  Target01Icon,
  Idea01Icon,
  ArrowRight01Icon,
  Layers01Icon,
  TextIcon,
  CheckmarkCircle02Icon,
  Book02Icon,
  ChartBarIncreasingIcon,
  GoalIcon,
} from "@hugeicons/core-free-icons"

import { getTipOfTheDay } from "@/data/tips"
import type { View } from "@/components/Navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { fetchCurriculum, type CurriculumLesson } from "@/lib/curriculum-api"

interface DashboardProps {
  learnedIds: string[]
  mockCount: number
  confidence: number
  onNavigate: (view: View) => void
}

/** Category progress derived from curriculum + completed lessons */
interface CategoryProgress {
  category: string
  total: number
  done: number
}

// Quick action cards — updated to remove "library" which is no longer a view
const QUICK_ACTIONS: {
  view: View
  title: string
  korean: string
  desc: string
  icon: typeof BookOpen01Icon
}[] = [
  {
    view: "lessons",
    title: "Lessons",
    korean: "대화 학습",
    desc: "40 real-life conversations. Dialogues, vocab, grammar & pronunciation.",
    icon: Book02Icon,
  },
  {
    view: "flashcards",
    title: "Flashcards",
    korean: "플래시카드",
    desc: "Flip, listen, and self-grade. Drill until every word sticks.",
    icon: Layers01Icon,
  },
  {
    view: "grammar",
    title: "Grammar",
    korean: "문법 패턴",
    desc: "Every grammar point in order with AI-powered explanations.",
    icon: TextIcon,
  },
  {
    view: "interview",
    title: "Mock Interview",
    korean: "모의 면접",
    desc: "Face a Korean interviewer and get instant scored feedback.",
    icon: Mic01Icon,
  },
  {
    view: "tutor",
    title: "AI Tutor",
    korean: "AI 튜터",
    desc: "Ask anything — grammar, phrasing, last-minute nerves.",
    icon: BubbleChatIcon,
  },
]

/** Thin animated category bar */
function CategoryBar({ pct, delay = 0 }: { pct: number; delay?: number }) {
  const [width, setWidth] = React.useState(0)
  React.useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 80 + delay)
    return () => clearTimeout(t)
  }, [pct, delay])
  return (
    <div className="lp-progress-track flex-1">
      <div
        className="lp-progress-fill"
        style={{ width: `${width}%` }}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  )
}

/** Overall circular progress ring */
function ProgressRing({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? done / total : 0
  const radius = 44
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - pct)

  return (
    <div className="relative size-27 shrink-0">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth="7"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 1.1s cubic-bezier(0.22,1,0.36,1)",
            filter: "drop-shadow(0 0 4px var(--primary))",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-heading text-2xl leading-none font-bold tabular-nums">
          {done}
        </span>
        <span className="text-[0.6rem] font-medium tracking-wide text-muted-foreground uppercase">
          of {total}
        </span>
      </div>
    </div>
  )
}

/** The "continue learning" hero card — next incomplete lesson */
function ContinueHero({
  nextLesson,
  onNavigate,
}: {
  nextLesson: CurriculumLesson | null
  onNavigate: (v: View) => void
}) {
  return (
    <div
      className="lp-hero-banner animate-rise-1 mb-5 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
      style={{ borderRadius: "var(--radius-xl)" }}
    >
      <div className="min-w-0">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="lp-streak-badge">
            <HugeiconsIcon
              icon={Fire03Icon}
              size={12}
              color="currentColor"
              strokeWidth={2.4}
            />
            Keep it up
          </span>
        </div>
        {nextLesson ? (
          <>
            <p className="font-heading text-lg font-bold tracking-tight sm:text-xl">
              Continue where you left off
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                Lesson {nextLesson.chapter}
              </span>{" "}
              · {nextLesson.category}
            </p>
            <p className="ko mt-1 text-base font-bold text-primary">
              {nextLesson.title}
            </p>
          </>
        ) : (
          <>
            <p className="font-heading text-lg font-bold tracking-tight">
              Ready to start learning?
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Begin with Lesson 1 and work your way through 40 conversations.
            </p>
          </>
        )}
      </div>
      <button
        onClick={() => onNavigate("lessons")}
        className="group flex shrink-0 items-center gap-2 self-start rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:opacity-90 hover:shadow-md sm:self-auto"
      >
        {nextLesson ? "Continue" : "Start now"}
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          size={16}
          color="currentColor"
          strokeWidth={2.4}
          className="transition-transform group-hover:translate-x-0.5"
        />
      </button>
    </div>
  )
}

export function Dashboard({
  learnedIds,
  mockCount,
  confidence,
  onNavigate,
}: DashboardProps) {
  const tip = React.useMemo(() => getTipOfTheDay(), [])

  // Curriculum state
  const [curriculum, setCurriculum] = React.useState<CurriculumLesson[] | null>(
    null
  )

  // We only have completedLessonIds from learnedIds in the old sense,
  // but for completion tracking we use completedLessonIds from App via learnedIds context.
  // Dashboard gets learnedIds (vocab phrases) and has no direct completedLessonIds.
  // We'll load the same from localStorage directly for display.
  const [completedLessonIds] = React.useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("kp.completedLessons")
      return stored ? (JSON.parse(stored) as string[]) : []
    } catch {
      return []
    }
  })
  const completedSet = React.useMemo(
    () => new Set(completedLessonIds),
    [completedLessonIds]
  )

  React.useEffect(() => {
    let cancelled = false
    fetchCurriculum()
      .then((data) => !cancelled && setCurriculum(data))
      .catch(() => !cancelled && setCurriculum([]))
    return () => {
      cancelled = true
    }
  }, [])

  // Derive the next incomplete lesson
  const nextLesson = React.useMemo(() => {
    if (!curriculum) return null
    return curriculum.find((l) => !completedSet.has(l.lessonId)) ?? null
  }, [curriculum, completedSet])

  // Derive category progress
  const categoryProgress = React.useMemo<CategoryProgress[]>(() => {
    if (!curriculum) return []
    const map = new Map<string, { total: number; done: number }>()
    for (const lesson of curriculum) {
      const entry = map.get(lesson.category) ?? { total: 0, done: 0 }
      entry.total++
      if (completedSet.has(lesson.lessonId)) entry.done++
      map.set(lesson.category, entry)
    }
    return Array.from(map.entries()).map(([category, v]) => ({
      category,
      ...v,
    }))
  }, [curriculum, completedSet])

  const totalLessons = curriculum?.length ?? 40
  const completedCount = completedLessonIds.length

  // Vocab progress: number of learned expressions (learnedIds tracks flashcard/phrase IDs)
  const learnedCount = learnedIds.length

  return (
    <div className="animate-rise mx-auto max-w-5xl space-y-5">
      {/* ── Continue learning hero ── */}
      <ContinueHero nextLesson={nextLesson} onNavigate={onNavigate} />

      {/* ── Stat row ── */}
      <div className="animate-rise-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Lessons completed */}
        <Card>
          <CardContent className="flex flex-col gap-1.5 py-4">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
              <HugeiconsIcon
                icon={Book02Icon}
                size={18}
                color="var(--color-primary)"
                strokeWidth={2}
              />
            </div>
            <p className="font-heading text-2xl font-bold tabular-nums">
              {completedCount}
              <span className="ml-1 text-xs font-medium text-muted-foreground">
                / {totalLessons}
              </span>
            </p>
            <p className="text-xs font-medium text-muted-foreground">
              Lessons done
            </p>
          </CardContent>
        </Card>

        {/* Vocab learned */}
        <Card>
          <CardContent className="flex flex-col gap-1.5 py-4">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
              <HugeiconsIcon
                icon={BookOpen01Icon}
                size={18}
                color="var(--color-primary)"
                strokeWidth={2}
              />
            </div>
            <p className="font-heading text-2xl font-bold tabular-nums">
              {learnedCount}
            </p>
            <p className="text-xs font-medium text-muted-foreground">
              Words learned
            </p>
          </CardContent>
        </Card>

        {/* Mock interviews */}
        <Card>
          <CardContent className="flex flex-col gap-1.5 py-4">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
              <HugeiconsIcon
                icon={Mic01Icon}
                size={18}
                color="var(--color-primary)"
                strokeWidth={2}
              />
            </div>
            <p className="font-heading text-2xl font-bold tabular-nums">
              {mockCount}
            </p>
            <p className="text-xs font-medium text-muted-foreground">
              Interviews
            </p>
          </CardContent>
        </Card>

        {/* Confidence score */}
        <Card>
          <CardContent className="flex flex-col gap-1.5 py-4">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
              <HugeiconsIcon
                icon={Target01Icon}
                size={18}
                color="var(--color-primary)"
                strokeWidth={2}
              />
            </div>
            <p className="font-heading text-2xl font-bold tabular-nums">
              {confidence > 0 ? confidence.toFixed(1) : "—"}
              {confidence > 0 && (
                <span className="ml-1 text-xs font-medium text-muted-foreground">
                  / 5
                </span>
              )}
            </p>
            <p className="text-xs font-medium text-muted-foreground">
              Confidence
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Curriculum progress ── */}
      <div className="animate-rise-3 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Overall progress ring + bar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <HugeiconsIcon
                icon={ChartBarIncreasingIcon}
                size={15}
                color="var(--color-primary)"
                strokeWidth={2}
              />
              Curriculum Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-5">
            <ProgressRing done={completedCount} total={totalLessons} />
            <div className="min-w-0 flex-1 space-y-2">
              <div>
                <p className="font-heading text-2xl font-bold">
                  {totalLessons > 0
                    ? `${Math.round((completedCount / totalLessons) * 100)}%`
                    : "0%"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {completedCount} of {totalLessons} lessons complete
                </p>
              </div>
              {/* Mini overall bar */}
              <CategoryBar
                pct={
                  totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0
                }
                delay={200}
              />
              {completedCount === 0 && (
                <p className="text-xs text-muted-foreground italic">
                  Complete your first lesson to start tracking progress.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Category breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <HugeiconsIcon
                icon={GoalIcon}
                size={15}
                color="var(--color-primary)"
                strokeWidth={2}
              />
              By Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryProgress.length === 0 ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-2.5 w-20 animate-pulse rounded-full bg-muted" />
                    <div className="h-2 flex-1 animate-pulse rounded-full bg-muted" />
                    <div className="h-2.5 w-8 animate-pulse rounded-full bg-muted" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2.5">
                {categoryProgress.slice(0, 7).map((cat, i) => (
                  <div key={cat.category} className="lp-cat-row">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-xs font-medium text-foreground/80">
                        {cat.category}
                      </span>
                    </div>
                    <div
                      className="col-span-1 flex w-full items-center gap-2"
                      style={{ gridColumn: "1 / -1" }}
                    >
                      <CategoryBar
                        pct={(cat.done / cat.total) * 100}
                        delay={i * 60}
                      />
                      <span className="w-9 shrink-0 text-right text-[0.68rem] text-muted-foreground tabular-nums">
                        {cat.done}/{cat.total}
                      </span>
                    </div>
                  </div>
                ))}
                {categoryProgress.length > 7 && (
                  <p className="text-xs text-muted-foreground">
                    +{categoryProgress.length - 7} more categories
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Quick actions ── */}
      <section className="animate-rise-4">
        <h2 className="lp-section-label mb-4">Jump back in</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_ACTIONS.map((action) => (
            <Card
              key={action.view}
              onClick={() => onNavigate(action.view)}
              className="group lp-card-lift cursor-pointer hover:ring-primary/30"
            >
              <CardContent className="flex flex-col items-start gap-1 py-4">
                <div className="mb-2.5 flex size-10 items-center justify-center rounded-xl bg-primary">
                  <HugeiconsIcon
                    icon={action.icon}
                    size={20}
                    color="var(--color-primary-foreground)"
                    strokeWidth={2}
                  />
                </div>
                <p className="ko text-[0.68rem] text-muted-foreground/70">
                  {action.korean}
                </p>
                <p className="font-heading text-sm font-bold tracking-tight">
                  {action.title}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {action.desc}
                </p>
                <span className="mt-2.5 flex items-center gap-1 text-xs font-semibold text-primary transition-transform group-hover:translate-x-0.5">
                  Open
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    size={14}
                    color="currentColor"
                    strokeWidth={2.4}
                  />
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Tip of the day ── */}
      <Card className="animate-rise-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            <HugeiconsIcon
              icon={Idea01Icon}
              size={14}
              color="var(--color-primary)"
              strokeWidth={2}
            />
            Tip of the day · 오늘의 팁
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5">
          <p className="ko text-xl leading-snug text-primary">{tip.korean}</p>
          <p className="text-sm text-muted-foreground italic">
            {tip.romanization}
          </p>
          <p className="text-sm leading-relaxed text-foreground/90">
            {tip.english}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
