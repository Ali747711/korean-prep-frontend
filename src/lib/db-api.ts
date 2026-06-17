/** Thin client for syncing user progress with the MongoDB-backed API. */

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001"

export interface ProgressData {
  learnedIds: string[]
  mockCount: number
  scoreSum: number
  scoreCount: number
  completedLessonIds: string[]
  completedGrammarIds: string[]
  learnedVocabIds: string[]
}

/** Returns the stable device ID stored in localStorage, creating it on first run. */
export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem("kp.deviceId")
    if (existing) return existing
    const id = crypto.randomUUID()
    localStorage.setItem("kp.deviceId", id)
    return id
  } catch {
    return "anonymous"
  }
}

/** Load progress from the server. Returns null on any failure (localStorage stays primary). */
export async function loadProgress(
  deviceId: string
): Promise<ProgressData | null> {
  try {
    const res = await fetch(
      `${BASE_URL}/api/progress/${encodeURIComponent(deviceId)}`
    )
    if (!res.ok) return null
    return res.json() as Promise<ProgressData>
  } catch {
    return null
  }
}

/** Persist progress to the server. Fire-and-forget — failures are silent. */
export async function saveProgress(
  deviceId: string,
  data: Partial<ProgressData>
): Promise<void> {
  try {
    await fetch(`${BASE_URL}/api/progress/${encodeURIComponent(deviceId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
  } catch {
    // localStorage is still the source of truth; DB sync is best-effort
  }
}
