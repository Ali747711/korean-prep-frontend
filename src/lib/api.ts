/** Thin client for the KoreanPrep Pro backend. */

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export interface InterviewQuestion {
  korean: string;
  romanization: string;
  english: string;
}

export interface Evaluation {
  score: number;
  evaluation: string;
  correctedKorean: string;
  correctedRomanization: string;
  tip: string;
  encouragement: string;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export type InterviewType = "hr" | "technical" | "mixed";

export function fetchQuestion(
  interviewType: InterviewType,
  askedQuestions: string[]
): Promise<InterviewQuestion> {
  return postJson<InterviewQuestion>("/api/interview/question", {
    interviewType,
    askedQuestions,
  });
}

export function evaluateAnswer(
  question: string,
  answer: string
): Promise<Evaluation> {
  return postJson<Evaluation>("/api/interview/evaluate", { question, answer });
}

/**
 * Streams the tutor reply, invoking onDelta with each text chunk.
 * Resolves with the full text. Throws on stream-level errors.
 */
export async function streamChat(
  messages: ChatTurn[],
  onDelta: (text: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/chat/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
    signal,
  });

  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Chat failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const event of events) {
      const line = event.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;
      try {
        const parsed = JSON.parse(payload) as {
          type: "delta" | "done" | "error";
          text?: string;
          error?: string;
        };
        if (parsed.type === "delta" && parsed.text) {
          full += parsed.text;
          onDelta(parsed.text);
        } else if (parsed.type === "error") {
          throw new Error(parsed.error || "Tutor error");
        }
      } catch (err) {
        if (err instanceof Error && err.message !== "Tutor error") continue;
        throw err;
      }
    }
  }

  return full;
}

/** Fetches synthesized speech and returns an object URL for an <audio> element. */
export async function fetchTtsAudioUrl(text: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `TTS failed (${res.status})`);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
