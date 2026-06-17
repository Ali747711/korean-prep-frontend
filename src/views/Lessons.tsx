import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Loading03Icon,
  CheckmarkCircle02Icon,
  ArrowRight01Icon,
  BookOpen01Icon,
  LockIcon,
} from "@hugeicons/core-free-icons"

import { fetchCurriculum, type CurriculumLesson } from "@/lib/curriculum-api"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface LessonsProps {
  completedLessonIds: string[]
  onOpenLesson: (lessonId: string) => void
}

type LessonState = "done" | "next" | "available" | "locked"

function getLessonState(
  lesson: CurriculumLesson,
  completedSet: Set<string>,
  nextLessonId: string | null
): LessonState {
  if (completedSet.has(lesson.lessonId)) return "done"
  if (lesson.lessonId === nextLessonId) return "next"
  return "available"
}

interface LessonCardProps {
  lesson: CurriculumLesson
  state: LessonState
  onOpen: () => void
  animDelay?: number
}

function LessonCard({ lesson, state, onOpen, animDelay = 0 }: LessonCardProps) {
  const isDone = state === "done"
  const isNext = state === "next"

  return (
    <button
      onClick={onOpen}
      className="group w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-xl"
      style={{ animationDelay: `${animDelay}ms` }}
    >
      <Card
        className={cn(
          "h-full transition-all duration-150",
          "lp-card-lift",
          isDone && "lp-lesson-done-card",
          isNext && "ring-2 ring-primary/50",
          !isDone && !isNext && "hover:ring-primary/25"
        )}
      >
        <CardContent className="flex h-full flex-col gap-2 py-4">
          {/* Top row */}
          <div className="flex items-start justify-between gap-2">
            <Badge
              variant="secondary"
              className={cn(
                "text-[0.65rem] font-bold",
                isDone && "bg-primary/10 text-primary",
                isNext && "bg-primary text-primary-foreground"
              )}
            >
              {isNext ? "Next up" : `Lesson ${lesson.chapter}`}
            </Badge>

            {isDone ? (
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                size={17}
                color="var(--color-primary)"
                strokeWidth={2.2}
              />
            ) : isNext ? (
              <div className="flex size-5 items-center justify-center rounded-full bg-primary/15">
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={11}
                  color="var(--color-primary)"
                  strokeWidth={2.4}
                />
              </div>
            ) : null}
          </div>

          {/* Title */}
          <div className="min-w-0">
            <p
              className={cn(
                "font-heading text-sm font-bold leading-snug tracking-tight",
                isDone && "text-foreground/80"
              )}
            >
              {lesson.title}
            </p>
            {lesson.titleKorean && (
              <p className="ko mt-0.5 text-xs text-muted-foreground">
                {lesson.titleKorean}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="mt-auto flex items-center justify-between pt-1">
            <span className="text-[0.65rem] text-muted-foreground tabular-nums">
              {lesson.counts.grammar}G · {lesson.counts.vocab}V · {lesson.counts.pronunciation}P
            </span>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={14}
              color="currentColor"
              strokeWidth={2}
              className={cn(
                "transition-transform group-hover:translate-x-0.5",
                isDone ? "text-primary/50" : "text-muted-foreground"
              )}
            />
          </div>
        </CardContent>
      </Card>
    </button>
  )
}

export function Lessons({ completedLessonIds, onOpenLesson }: LessonsProps) {
  const [lessons, setLessons] = React.useState<CurriculumLesson[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const completedSet = React.useMemo(
    () => new Set(completedLessonIds),
    [completedLessonIds]
  )

  React.useEffect(() => {
    let cancelled = false
    fetchCurriculum()
      .then((data) => !cancelled && setLessons(data))
      .catch((e) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [])

  // Determine next incomplete lesson
  const nextLessonId = React.useMemo(() => {
    if (!lessons) return null
    return lessons.find((l) => !completedSet.has(l.lessonId))?.lessonId ?? null
  }, [lessons, completedSet])

  // Group by category, preserving book order
  const groups = React.useMemo(() => {
    if (!lessons) return []
    const out: { category: string; lessons: CurriculumLesson[] }[] = []
    for (const lesson of lessons) {
      const last = out[out.length - 1]
      if (last && last.category === lesson.category) last.lessons.push(lesson)
      else out.push({ category: lesson.category, lessons: [lesson] })
    }
    return out
  }, [lessons])

  // Category completion summary
  const categorySummary = React.useMemo(() => {
    const map = new Map<string, { done: number; total: number }>()
    for (const group of groups) {
      const done = group.lessons.filter((l) => completedSet.has(l.lessonId)).length
      map.set(group.category, { done, total: group.lessons.length })
    }
    return map
  }, [groups, completedSet])

  return (
    <div className="animate-rise mx-auto max-w-5xl">
      {/* Header */}
      <header className="mb-7">
        <p className="ko text-xs font-bold text-primary tracking-widest uppercase">대화</p>
        <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight">
          Lessons
        </h1>
        <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
          40 real-life conversations, in order. Each lesson has dialogues,
          vocabulary, grammar, and pronunciation.
        </p>

        {/* Overall progress bar */}
        {lessons && (
          <div className="mt-4 flex items-center gap-3">
            <div className="lp-progress-track flex-1">
              <div
                className="lp-progress-fill animate-progress"
                style={{
                  width: `${lessons.length > 0 ? (completedSet.size / lessons.length) * 100 : 0}%`,
                }}
                role="progressbar"
                aria-valuenow={completedSet.size}
                aria-valuemin={0}
                aria-valuemax={lessons.length}
              />
            </div>
            <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
              <span className="text-primary">{completedSet.size}</span> / {lessons.length}
            </span>
          </div>
        )}
      </header>

      {/* Error */}
      {error && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      {/* Skeleton */}
      {!lessons && !error && (
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

      {/* Category groups */}
      <div className="space-y-10">
        {groups.map((group) => {
          const summary = categorySummary.get(group.category)
          const catPct =
            summary && summary.total > 0
              ? (summary.done / summary.total) * 100
              : 0

          return (
            <section key={group.category}>
              {/* Category header */}
              <div className="mb-4 flex items-center gap-3">
                <div className="min-w-0">
                  <h2 className="lp-section-label">
                    {group.category}
                  </h2>
                </div>
                {summary && (
                  <span className="shrink-0 text-[0.65rem] font-semibold tabular-nums text-muted-foreground">
                    {summary.done}/{summary.total}
                  </span>
                )}
              </div>

              {/* Thin category progress bar */}
              {summary && summary.total > 0 && (
                <div className="mb-4 lp-progress-track">
                  <div
                    className="lp-progress-fill"
                    style={{ width: `${catPct}%` }}
                    role="progressbar"
                    aria-valuenow={summary.done}
                    aria-valuemin={0}
                    aria-valuemax={summary.total}
                  />
                </div>
              )}

              {/* Lesson grid */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.lessons.map((lesson, idx) => {
                  const state = getLessonState(lesson, completedSet, nextLessonId)
                  return (
                    <LessonCard
                      key={lesson.lessonId}
                      lesson={lesson}
                      state={state}
                      onOpen={() => onOpenLesson(lesson.lessonId)}
                      animDelay={idx * 30}
                    />
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
