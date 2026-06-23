// frontend/src/lib/daily-words-api.ts

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001"

export interface DailyWord {
  id: string
  korean: string
  romanization: string
  english: string
  source: "typed" | "screenshot"
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30_000)
  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Request timed out. Please try again.")
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(
      (err as { error?: string }).error ?? `Request failed: ${res.status}`
    )
  }
  return res.json()
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(
      (err as { error?: string }).error ?? `Request failed: ${res.status}`
    )
  }
  return res.json()
}

async function putJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(
      (err as { error?: string }).error ?? `Request failed: ${res.status}`
    )
  }
  return res.json()
}

/** Extract words from a Korean word list (one word per entry). */
export function extractWords(
  deviceId: string,
  words: string[]
): Promise<DailyWord[]> {
  return postJson("/api/daily-words/extract", { deviceId, words })
}

/** Extract words from a base64-encoded screenshot image. */
export function extractFromImage(
  deviceId: string,
  image: string
): Promise<DailyWord[]> {
  return postJson("/api/daily-words/extract", { deviceId, image })
}

/** Fetch list of dates (YYYY-MM-DD) that have saved word sets, newest first. */
export function fetchDailyDates(deviceId: string): Promise<string[]> {
  return getJson(`/api/daily-words?deviceId=${encodeURIComponent(deviceId)}`)
}

/** Fetch the word set for a given date. Returns empty words array if none saved. */
export function fetchDailyWords(
  deviceId: string,
  date: string
): Promise<{ date: string; words: DailyWord[] }> {
  return getJson(
    `/api/daily-words/${date}?deviceId=${encodeURIComponent(deviceId)}`
  )
}

/** Save (or overwrite) the word set for a given date. */
export function saveDailyWords(
  deviceId: string,
  date: string,
  words: DailyWord[]
): Promise<{ date: string; words: DailyWord[] }> {
  return putJson(`/api/daily-words/${date}`, { deviceId, words })
}
