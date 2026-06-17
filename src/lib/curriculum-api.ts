/** Client for the book-driven curriculum endpoints. */

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001"

export interface DialogueLine {
  speaker: string
  korean: string
  romanization: string
  english: string
}

export interface Example {
  korean: string
  romanization: string
  english: string
}

export interface Exercise {
  prompt: string
  answer: string
  english?: string
}

export interface VocabItem {
  vocabId: string
  korean: string
  romanization: string
  meaning: string
}

export interface GrammarPoint {
  grammarId: string
  lessonId: string
  chapter: number
  slot: "A" | "B"
  order: number
  title: string
  pattern: string
  meaning: string
  explanation: string
  examples: Example[]
  exercises: Exercise[]
}

export interface PronunciationPoint {
  pronId: string
  lessonId: string
  chapter: number
  slot: "A" | "B"
  order: number
  rule: string
  examples: { korean: string; pronounced: string; romanization: string }[]
  exercises: { prompt: string; answer: string; gloss?: string }[]
}

export interface CurriculumLesson {
  lessonId: string
  chapter: number
  order: number
  category: string
  title: string
  titleKorean: string
  counts: { vocab: number; grammar: number; pronunciation: number }
}

export interface LessonDetail {
  lessonId: string
  chapter: number
  order: number
  category: string
  title: string
  titleKorean: string
  shortDialogue: DialogueLine[]
  longDialogue: DialogueLine[]
  culturalTip: string
  koreanReview: string
  vocab: VocabItem[]
  extendedVocab: VocabItem[]
  grammar: GrammarPoint[]
  pronunciation: PronunciationPoint[]
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`)
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `Request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

export function fetchCurriculum(): Promise<CurriculumLesson[]> {
  return getJson<CurriculumLesson[]>("/api/curriculum")
}

export function fetchLesson(lessonId: string): Promise<LessonDetail> {
  return getJson<LessonDetail>(`/api/lessons/${lessonId}`)
}

export function fetchGrammar(chapter?: number): Promise<GrammarPoint[]> {
  const q = chapter ? `?chapter=${chapter}` : ""
  return getJson<GrammarPoint[]>(`/api/grammar${q}`)
}

export interface VocabExpression {
  expressionId: string
  order: number
  korean: string
  english: string
  notes: string
}

export interface WeeklyKeyword {
  keywordId: string
  week: number
  day: number
  order: number
  keyword: string
  romanization: string
  meaning: string
  expressions: VocabExpression[]
}

export interface WeekIndexEntry {
  week: number
  days: {
    keywordId: string
    day: number
    keyword: string
    romanization: string
    meaning: string
  }[]
}

export interface FlashcardItem {
  id: string
  korean: string
  romanization: string
  english: string
}

export function fetchVocabularyWeeks(): Promise<WeekIndexEntry[]> {
  return getJson<WeekIndexEntry[]>("/api/vocabulary/weeks")
}

export function fetchVocabulary(week: number): Promise<WeeklyKeyword[]> {
  return getJson<WeeklyKeyword[]>(`/api/vocabulary?week=${week}`)
}

export function fetchDeck(
  source: "week" | "lesson",
  arg: number | string
): Promise<FlashcardItem[]> {
  const q =
    source === "week"
      ? `source=week&week=${arg}`
      : `source=lesson&lessonId=${arg}`
  return getJson<FlashcardItem[]>(`/api/flashcards/deck?${q}`)
}

export interface ExerciseCheck {
  correct: boolean
  expected: string
}

export function checkExercise(args: {
  grammarId?: string
  pronId?: string
  exerciseIndex: number
  userAnswer: string
}): Promise<ExerciseCheck> {
  return fetch(`${BASE_URL}/api/exercises/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  }).then(async (res) => {
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || `Check failed (${res.status})`)
    }
    return res.json() as Promise<ExerciseCheck>
  })
}
