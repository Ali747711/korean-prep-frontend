import * as React from "react";

/** A small, typed localStorage hook with cross-tab sync. */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [stored, setStored] = React.useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = React.useCallback(
    (value: T | ((prev: T) => T)) => {
      setStored((prev) => {
        const next =
          typeof value === "function" ? (value as (p: T) => T)(prev) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          /* ignore quota / serialization errors */
        }
        return next;
      });
    },
    [key]
  );

  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key || e.newValue === null) return;
      try {
        setStored(JSON.parse(e.newValue) as T);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key]);

  return [stored, setValue];
}

// ---- Interview countdown ----------------------------------------------------

const INTERVIEW_START_KEY = "kp.interviewStart";
const DEFAULT_DAYS_UNTIL = 3;

/**
 * Returns days remaining until the interview. On first run it persists a start
 * date 3 days out, then counts down naturally each day.
 */
export function getDaysUntilInterview(): number {
  let targetMs: number;
  try {
    const raw = window.localStorage.getItem(INTERVIEW_START_KEY);
    if (raw) {
      targetMs = Number(raw);
    } else {
      targetMs = Date.now() + DEFAULT_DAYS_UNTIL * 86_400_000;
      window.localStorage.setItem(INTERVIEW_START_KEY, String(targetMs));
    }
  } catch {
    targetMs = Date.now() + DEFAULT_DAYS_UNTIL * 86_400_000;
  }
  const diff = targetMs - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}
