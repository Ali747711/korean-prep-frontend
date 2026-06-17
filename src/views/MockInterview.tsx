import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Mic01Icon,
  Briefcase01Icon,
  Settings01Icon,
  SparklesIcon,
  ArrowRight01Icon,
  Loading03Icon,
  CheckmarkBadge01Icon,
  Idea01Icon,
  VolumeHighIcon,
  RefreshIcon,
} from "@hugeicons/core-free-icons"

import {
  fetchQuestion,
  evaluateAnswer,
  fetchTtsAudioUrl,
  type InterviewType,
  type InterviewQuestion,
  type Evaluation,
} from "@/lib/api"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"

interface MockInterviewProps {
  onSessionScore: (score: number) => void
}

const TYPES: {
  value: InterviewType
  label: string
  korean: string
  desc: string
  icon: typeof Briefcase01Icon
}[] = [
  {
    value: "hr",
    label: "HR Round",
    korean: "인사 면접",
    desc: "Motivation, teamwork, culture fit.",
    icon: Briefcase01Icon,
  },
  {
    value: "technical",
    label: "Technical Round",
    korean: "기술 면접",
    desc: "Engineering concepts & projects.",
    icon: Settings01Icon,
  },
  {
    value: "mixed",
    label: "Mixed Round",
    korean: "혼합 면접",
    desc: "A realistic blend of both.",
    icon: SparklesIcon,
  },
]

function ScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 4
      ? "bg-primary text-primary-foreground"
      : score >= 3
        ? "bg-yellow-400 text-yellow-950"
        : "bg-destructive text-white"
  return (
    <div
      className={cn(
        "flex size-14 shrink-0 flex-col items-center justify-center rounded-xl",
        tone
      )}
    >
      <span className="font-heading text-2xl leading-none font-bold tabular-nums">
        {score}
      </span>
      <span className="text-[0.6rem] font-medium opacity-80">/ 5</span>
    </div>
  )
}

function TogglePill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      variant={active ? "secondary" : "outline"}
      size="sm"
      onClick={onClick}
      aria-pressed={active}
      className={cn("rounded-full", active && "text-primary")}
    >
      {children}
    </Button>
  )
}

export function MockInterview({ onSessionScore }: MockInterviewProps) {
  const [type, setType] = React.useState<InterviewType | null>(null)
  const [question, setQuestion] = React.useState<InterviewQuestion | null>(null)
  const [asked, setAsked] = React.useState<string[]>([])
  const [answer, setAnswer] = React.useState("")
  const [evaluation, setEvaluation] = React.useState<Evaluation | null>(null)

  const [loadingQ, setLoadingQ] = React.useState(false)
  const [loadingE, setLoadingE] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [sessionScores, setSessionScores] = React.useState<number[]>([])
  const audioRef = React.useRef<HTMLAudioElement | null>(null)

  const [showRoman, setShowRoman] = React.useState(true)
  const [showEnglish, setShowEnglish] = React.useState(false)

  const loadQuestion = React.useCallback(
    async (t: InterviewType, history: string[]) => {
      setLoadingQ(true)
      setError(null)
      setEvaluation(null)
      setAnswer("")
      try {
        const q = await fetchQuestion(t, history)
        setQuestion(q)
        setAsked((prev) => [...prev, q.korean])
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load question.")
      } finally {
        setLoadingQ(false)
      }
    },
    []
  )

  const handleStart = (t: InterviewType) => {
    setType(t)
    setAsked([])
    setSessionScores([])
    void loadQuestion(t, [])
  }

  const handleSubmit = async () => {
    if (!question || !answer.trim()) return
    setLoadingE(true)
    setError(null)
    try {
      const result = await evaluateAnswer(question.korean, answer.trim())
      setEvaluation(result)
      setSessionScores((prev) => [...prev, result.score])
      onSessionScore(result.score)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to evaluate answer.")
    } finally {
      setLoadingE(false)
    }
  }

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

  const avgScore =
    sessionScores.length > 0
      ? sessionScores.reduce((a, b) => a + b, 0) / sessionScores.length
      : 0

  // ---- Type selection screen ----
  if (!type) {
    return (
      <div className="animate-rise mx-auto max-w-3xl">
        <header className="mb-7 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary">
            <HugeiconsIcon
              icon={Mic01Icon}
              size={28}
              color="var(--color-primary-foreground)"
              strokeWidth={2}
            />
          </div>
          <p className="ko text-sm font-bold text-primary">모의 면접</p>
          <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight">
            Mock Interview Room
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Pick a round. A Korean interviewer will ask real questions — you
            answer, and get scored, corrected feedback instantly.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {TYPES.map((t) => (
            <Card
              key={t.value}
              onClick={() => handleStart(t.value)}
              className="group cursor-pointer transition-colors hover:bg-muted/40 hover:ring-primary/40"
            >
              <CardContent className="flex flex-col items-start gap-1">
                <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-primary/10">
                  <HugeiconsIcon
                    icon={t.icon}
                    size={22}
                    color="var(--color-primary)"
                    strokeWidth={2}
                  />
                </div>
                <p className="ko text-xs text-muted-foreground/70">
                  {t.korean}
                </p>
                <p className="font-heading text-base font-bold">{t.label}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {t.desc}
                </p>
                <span className="mt-3 flex items-center gap-1 text-sm font-semibold text-primary transition-transform group-hover:translate-x-1">
                  Begin
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    size={16}
                    color="currentColor"
                    strokeWidth={2.4}
                  />
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // ---- Interview room ----
  const activeType = TYPES.find((t) => t.value === type)!

  return (
    <div className="animate-rise mx-auto max-w-3xl">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary">
            <HugeiconsIcon
              icon={activeType.icon}
              size={22}
              color="var(--color-primary-foreground)"
              strokeWidth={2}
            />
          </div>
          <div>
            <p className="ko text-xs text-muted-foreground/70">
              {activeType.korean}
            </p>
            <h1 className="font-heading text-lg font-bold tracking-tight">
              {activeType.label}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {sessionScores.length > 0 && (
            <div className="rounded-lg border bg-card px-3.5 py-1.5 text-center">
              <p className="font-heading text-base font-bold tabular-nums">
                {avgScore.toFixed(1)}
              </p>
              <p className="text-[0.65rem] text-muted-foreground">
                avg · {sessionScores.length}Q
              </p>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setType(null)
              setQuestion(null)
            }}
          >
            Change round
          </Button>
        </div>
      </header>

      {/* Question card */}
      <Card>
        <CardContent>
          <span className="text-xs font-bold tracking-wide text-primary uppercase">
            Interviewer · 면접관
          </span>

          {loadingQ ? (
            <div className="mt-4 flex flex-col gap-3">
              <Skeleton className="h-7 w-3/4 rounded-lg" />
              <Skeleton className="h-7 w-1/2 rounded-lg" />
            </div>
          ) : question ? (
            <>
              <p className="ko mt-3 text-2xl leading-relaxed">
                {question.korean}
              </p>
              {showRoman && (
                <p className="mt-2 text-sm text-muted-foreground italic">
                  {question.romanization}
                </p>
              )}
              {showEnglish && (
                <p className="mt-2 text-sm leading-relaxed text-foreground/80">
                  {question.english}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <TogglePill
                  active={showRoman}
                  onClick={() => setShowRoman((v) => !v)}
                >
                  Romanization
                </TogglePill>
                <TogglePill
                  active={showEnglish}
                  onClick={() => setShowEnglish((v) => !v)}
                >
                  English
                </TogglePill>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => handleSpeak(question.korean)}
                >
                  <HugeiconsIcon
                    icon={VolumeHighIcon}
                    size={14}
                    color="currentColor"
                    strokeWidth={2}
                    data-icon="inline-start"
                  />
                  Listen
                </Button>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      {/* Answer area */}
      {question && !loadingQ && (
        <div className="mt-5">
          <label
            htmlFor="answer"
            className="mb-2 block text-sm font-semibold text-muted-foreground"
          >
            Your answer · 답변 <span className="ko">(한국어로 답해보세요)</span>
          </label>
          <Textarea
            id="answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="저는 풀스택 개발자입니다..."
            rows={4}
            className="ko resize-y text-base leading-relaxed"
          />
          <div className="mt-3 flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={!answer.trim() || loadingE}
            >
              {loadingE ? (
                <>
                  <HugeiconsIcon
                    icon={Loading03Icon}
                    size={16}
                    color="currentColor"
                    strokeWidth={2}
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                  Evaluating
                </>
              ) : (
                <>
                  Submit answer
                  <HugeiconsIcon
                    icon={CheckmarkBadge01Icon}
                    size={16}
                    color="currentColor"
                    strokeWidth={2}
                    data-icon="inline-end"
                  />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Feedback card */}
      {evaluation && (
        <Card className="mt-5">
          <CardContent className="flex flex-col gap-5">
            <div className="flex items-start gap-4">
              <ScoreBadge score={evaluation.score} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold tracking-wide text-primary uppercase">
                  Coach feedback · 피드백
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">
                  {evaluation.evaluation}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary/[0.06] p-4">
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Natural version · 자연스러운 표현
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full"
                  onClick={() => handleSpeak(evaluation.correctedKorean)}
                >
                  <HugeiconsIcon
                    icon={VolumeHighIcon}
                    size={13}
                    color="currentColor"
                    strokeWidth={2}
                    data-icon="inline-start"
                  />
                  Listen
                </Button>
              </div>
              <p className="ko text-lg leading-relaxed text-primary">
                {evaluation.correctedKorean}
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground italic">
                {evaluation.correctedRomanization}
              </p>
            </div>

            <Separator />

            <div className="flex items-start gap-3">
              <HugeiconsIcon
                icon={Idea01Icon}
                size={18}
                color="var(--color-primary)"
                strokeWidth={2}
                className="mt-0.5 shrink-0"
              />
              <div>
                <p className="text-sm leading-relaxed text-foreground/90">
                  {evaluation.tip}
                </p>
                <p className="mt-1.5 text-sm font-medium text-primary">
                  {evaluation.encouragement}
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => loadQuestion(type, asked)}
                disabled={loadingQ}
              >
                <HugeiconsIcon
                  icon={RefreshIcon}
                  size={16}
                  color="currentColor"
                  strokeWidth={2}
                  data-icon="inline-start"
                />
                Next question
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
