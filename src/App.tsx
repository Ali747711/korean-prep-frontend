import * as React from "react"

import { ThemeProvider } from "@/components/theme-provider"
import { Navigation, type View } from "@/components/Navigation"
import { Dashboard } from "@/views/Dashboard"
import { Vocabulary } from "@/views/Vocabulary"
import { Flashcards } from "@/views/Flashcards"
import { GrammarPatterns } from "@/views/GrammarPatterns"
import { Lessons } from "@/views/Lessons"
import { LessonDetail } from "@/views/LessonDetail"
import { MockInterview } from "@/views/MockInterview"
import { TutorChat } from "@/views/TutorChat"
import { useLocalStorage } from "@/lib/storage"
import { getDeviceId, loadProgress, saveProgress } from "@/lib/db-api"

export function App() {
  const [view, setView] = React.useState<View>("dashboard")
  const [openLessonId, setOpenLessonId] = React.useState<string | null>(null)

  // Persistent progress
  const [learnedIds, setLearnedIds] = useLocalStorage<string[]>(
    "kp.learnedPhrases",
    []
  )
  const [mockCount, setMockCount] = useLocalStorage<number>("kp.mockCount", 0)
  const [scoreSum, setScoreSum] = useLocalStorage<number>("kp.scoreSum", 0)
  const [scoreCount, setScoreCount] = useLocalStorage<number>(
    "kp.scoreCount",
    0
  )
  const [completedLessonIds, setCompletedLessonIds] = useLocalStorage<string[]>(
    "kp.completedLessons",
    []
  )

  const confidence = scoreCount > 0 ? scoreSum / scoreCount : 0

  // Stable device ID (created once, lives in localStorage)
  const deviceId = React.useRef(getDeviceId()).current

  // Hydrate from DB on first mount — merge remote into local
  React.useEffect(() => {
    loadProgress(deviceId).then((remote) => {
      if (!remote) return
      setLearnedIds((local) => {
        const merged = Array.from(new Set([...local, ...remote.learnedIds]))
        return merged.length > local.length ? merged : local
      })
      setMockCount((local) => Math.max(local, remote.mockCount))
      if (remote.scoreCount > 0) {
        setScoreSum((local) => Math.max(local, remote.scoreSum))
        setScoreCount((local) => Math.max(local, remote.scoreCount))
      }
      if (remote.completedLessonIds?.length) {
        setCompletedLessonIds((local) => {
          const merged = Array.from(
            new Set([...local, ...remote.completedLessonIds])
          )
          return merged.length > local.length ? merged : local
        })
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId])

  // Debounced DB sync whenever progress changes
  React.useEffect(() => {
    const t = setTimeout(() => {
      saveProgress(deviceId, {
        learnedIds,
        mockCount,
        scoreSum,
        scoreCount,
        completedLessonIds,
      })
    }, 1500)
    return () => clearTimeout(t)
  }, [
    deviceId,
    learnedIds,
    mockCount,
    scoreSum,
    scoreCount,
    completedLessonIds,
  ])

  const toggleLearned = React.useCallback(
    (id: string) => {
      setLearnedIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      )
    },
    [setLearnedIds]
  )

  const toggleLessonComplete = React.useCallback(
    (id: string) => {
      setCompletedLessonIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      )
    },
    [setCompletedLessonIds]
  )

  const openLesson = React.useCallback((lessonId: string) => {
    setOpenLessonId(lessonId)
    window.scrollTo({ top: 0 })
  }, [])

  const recordSessionScore = React.useCallback(
    (score: number) => {
      setMockCount((c) => c + 1)
      setScoreSum((s) => s + score)
      setScoreCount((c) => c + 1)
    },
    [setMockCount, setScoreSum, setScoreCount]
  )

  return (
    <ThemeProvider defaultTheme="system" storageKey="kp.theme">
      <div className="min-h-svh bg-background">
        <Navigation
          active={view}
          onNavigate={(v) => {
            setOpenLessonId(null)
            setView(v)
          }}
        />

        <main className="px-4 pt-6 pb-24 sm:px-6 md:py-8 md:pl-64">
          {view === "dashboard" && (
            <Dashboard
              learnedIds={learnedIds}
              mockCount={mockCount}
              confidence={confidence}
              onNavigate={setView}
            />
          )}
          {view === "lessons" &&
            (openLessonId ? (
              <LessonDetail
                key={openLessonId}
                lessonId={openLessonId}
                onBack={() => setOpenLessonId(null)}
                isCompleted={completedLessonIds.includes(openLessonId)}
                onToggleComplete={toggleLessonComplete}
              />
            ) : (
              <Lessons
                completedLessonIds={completedLessonIds}
                onOpenLesson={openLesson}
              />
            ))}
          {view === "vocabulary" && <Vocabulary />}
          {view === "flashcards" && (
            <Flashcards
              learnedIds={learnedIds}
              onToggleLearned={toggleLearned}
            />
          )}
          {view === "grammar" && <GrammarPatterns />}
          {view === "interview" && (
            <MockInterview onSessionScore={recordSessionScore} />
          )}
          {view === "tutor" && <TutorChat />}
        </main>
      </div>
    </ThemeProvider>
  )
}

export default App
