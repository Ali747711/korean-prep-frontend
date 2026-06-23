# Daily Words Flashcards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Daily Words" tab to Flashcards where the user pastes Korean words or uploads a screenshot, Claude AI extracts meanings, the user reviews, and the words are saved to MongoDB as dated flip-card decks.

**Architecture:** Backend gains a `DailyWordSet` Mongoose model and `/api/daily-words` router (list dates, fetch by date, save, AI extract). Frontend gains `daily-words-api.ts`, `AddWordsDialog.tsx`, `DailyWordsTab.tsx`, and a modified `Flashcards.tsx` that adds "Daily Words" to the existing week `<select>`.

**Tech Stack:** Node.js/Express 5 (CommonJS), Mongoose, `@anthropic-ai/sdk` (claude-haiku-4-5-20251001), React 19, TypeScript, shadcn/ui (Button, tabs.tsx), Tailwind CSS.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `backend/src/models/DailyWordSet.js` | Mongoose schema for dated word sets |
| Create | `backend/src/routes/dailyWords.js` | All `/api/daily-words` endpoints incl. AI extract |
| Modify | `backend/src/index.js` | Register dailyWords router, raise body limit to 5 mb |
| Create | `frontend/src/lib/daily-words-api.ts` | Typed fetch wrappers for all daily-words endpoints |
| Create | `frontend/src/components/AddWordsDialog.tsx` | Modal: Type/Paste + Screenshot tabs → review list → save |
| Create | `frontend/src/components/DailyWordsTab.tsx` | Date strip + "+ Add Words" button rendered below controls |
| Modify | `frontend/src/views/Flashcards.tsx` | Add "Daily Words" option to week select, wire daily deck |

---

## Task 1: Backend — DailyWordSet model

**Files:**
- Create: `backend/src/models/DailyWordSet.js`

- [ ] **Step 1: Create the model file**

```js
// backend/src/models/DailyWordSet.js
"use strict";

const mongoose = require("mongoose");
const { Schema } = mongoose;

const wordSchema = new Schema(
  {
    id:           { type: String, required: true },
    korean:       { type: String, required: true },
    romanization: { type: String, default: "" },
    english:      { type: String, default: "" },
    source:       { type: String, enum: ["typed", "screenshot"], default: "typed" },
  },
  { _id: false }
);

const dailyWordSetSchema = new Schema(
  {
    deviceId: { type: String, required: true, index: true },
    date:     { type: String, required: true }, // "YYYY-MM-DD"
    words:    [wordSchema],
  },
  { timestamps: true }
);

dailyWordSetSchema.index({ deviceId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("DailyWordSet", dailyWordSetSchema);
```

- [ ] **Step 2: Commit**

```bash
cd backend
git add src/models/DailyWordSet.js
git commit -m "feat: add DailyWordSet mongoose model"
```

---

## Task 2: Backend — Daily Words router (data endpoints)

**Files:**
- Create: `backend/src/routes/dailyWords.js`

- [ ] **Step 1: Create the router with GET + PUT endpoints**

```js
// backend/src/routes/dailyWords.js
"use strict";

const express = require("express");
const { randomUUID } = require("crypto");
const Anthropic = require("@anthropic-ai/sdk");
const { connectDb } = require("../db");
const DailyWordSet = require("../models/DailyWordSet");

const router = express.Router();

const EXTRACT_MODEL = "claude-haiku-4-5-20251001";
const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

// ── helpers ────────────────────────────────────────────────────────────────

function isValidDate(str) {
  return typeof str === "string" && /^\d{4}-\d{2}-\d{2}$/.test(str);
}

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * POST /api/daily-words/extract
 * body: { words?: string[], image?: string (base64), deviceId: string }
 * -> FlashcardItem[]
 */
router.post("/extract", async (req, res) => {
  const { words, image, deviceId } = req.body ?? {};

  if (!isNonEmptyString(deviceId)) {
    return res.status(400).json({ error: "'deviceId' is required." });
  }

  const hasWords = Array.isArray(words) && words.length > 0;
  const hasImage = isNonEmptyString(image);

  if (!hasWords && !hasImage) {
    return res.status(400).json({ error: "Provide 'words' array or 'image' base64 string." });
  }

  try {
    let extracted;

    if (hasWords) {
      // Text extraction: send Korean words list
      const wordList = words.map((w) => String(w).trim()).filter(Boolean).join("\n");
      const msg = await anthropic.messages.create({
        model: EXTRACT_MODEL,
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: `You are a Korean language assistant. For each Korean word below, provide the romanization and an English meaning.

Return ONLY a valid JSON array. No markdown, no explanation, no code fences.
Format: [{"korean":"사랑","romanization":"sarang","english":"love"}]

Korean words:
${wordList}`,
          },
        ],
      });
      extracted = JSON.parse(msg.content[0].text.trim());
    } else {
      // Vision extraction: read Korean from screenshot
      const mediaTypeMatch = image.match(/^data:(image\/[a-z]+);base64,/);
      const mediaType = mediaTypeMatch ? mediaTypeMatch[1] : "image/jpeg";
      const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, "");

      const msg = await anthropic.messages.create({
        model: EXTRACT_MODEL,
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: base64Data },
              },
              {
                type: "text",
                text: `Extract all Korean words or phrases visible in this image. Provide romanization and English meaning for each.

Return ONLY a valid JSON array. No markdown, no explanation, no code fences.
Format: [{"korean":"사랑","romanization":"sarang","english":"love"}]`,
              },
            ],
          },
        ],
      });
      extracted = JSON.parse(msg.content[0].text.trim());
    }

    if (!Array.isArray(extracted) || extracted.length === 0) {
      return res.status(422).json({ error: "No Korean words detected." });
    }

    const items = extracted.map((item) => ({
      id:           randomUUID(),
      korean:       String(item.korean ?? "").trim(),
      romanization: String(item.romanization ?? "").trim(),
      english:      String(item.english ?? "").trim(),
      source:       hasImage ? "screenshot" : "typed",
    }));

    res.json(items);
  } catch (err) {
    console.error("[POST /api/daily-words/extract]", err?.message || err);
    res.status(502).json({ error: "AI extraction failed. Please try again." });
  }
});

/**
 * GET /api/daily-words
 * query: { deviceId }
 * -> string[] of dates with saved words, newest first
 */
router.get("/", async (req, res) => {
  const { deviceId } = req.query;
  if (!isNonEmptyString(deviceId)) {
    return res.status(400).json({ error: "'deviceId' query param is required." });
  }
  try {
    await connectDb();
    const sets = await DailyWordSet.find({ deviceId })
      .select("date")
      .sort({ date: -1 })
      .lean();
    res.json(sets.map((s) => s.date));
  } catch (err) {
    console.error("[GET /api/daily-words]", err?.message || err);
    res.status(502).json({ error: "Failed to load daily word dates." });
  }
});

/**
 * GET /api/daily-words/:date
 * query: { deviceId }
 * -> { date, words: FlashcardItem[] }
 */
router.get("/:date", async (req, res) => {
  const { date } = req.params;
  const { deviceId } = req.query;

  if (!isValidDate(date)) {
    return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD." });
  }
  if (!isNonEmptyString(deviceId)) {
    return res.status(400).json({ error: "'deviceId' query param is required." });
  }

  try {
    await connectDb();
    const set = await DailyWordSet.findOne({ deviceId, date }).lean();
    if (!set) return res.json({ date, words: [] });
    res.json({ date: set.date, words: set.words });
  } catch (err) {
    console.error("[GET /api/daily-words/:date]", err?.message || err);
    res.status(502).json({ error: "Failed to load daily words." });
  }
});

/**
 * PUT /api/daily-words/:date
 * body: { deviceId, words: FlashcardItem[] }
 * -> { date, words }
 */
router.put("/:date", async (req, res) => {
  const { date } = req.params;
  const { deviceId, words } = req.body ?? {};

  if (!isValidDate(date)) {
    return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD." });
  }
  if (!isNonEmptyString(deviceId)) {
    return res.status(400).json({ error: "'deviceId' is required." });
  }
  if (!Array.isArray(words)) {
    return res.status(400).json({ error: "'words' must be an array." });
  }

  try {
    await connectDb();
    const set = await DailyWordSet.findOneAndUpdate(
      { deviceId, date },
      { $set: { words } },
      { upsert: true, new: true }
    ).lean();
    res.json({ date: set.date, words: set.words });
  } catch (err) {
    console.error("[PUT /api/daily-words/:date]", err?.message || err);
    res.status(502).json({ error: "Failed to save daily words." });
  }
});

module.exports = router;
```

- [ ] **Step 2: Commit**

```bash
cd backend
git add src/routes/dailyWords.js
git commit -m "feat: add daily-words router with AI extraction and CRUD endpoints"
```

---

## Task 3: Backend — Register router + raise body limit

**Files:**
- Modify: `backend/src/index.js`

- [ ] **Step 1: Update the two lines in index.js**

Find this line (near top of file):
```js
app.use(express.json({ limit: "1mb" }));
```
Replace with:
```js
app.use(express.json({ limit: "5mb" }));
```

Find this block (near bottom of file):
```js
app.use("/api", curriculumRouter);
app.use("/api/progress", progressRouter);
```
Replace with:
```js
const dailyWordsRouter = require("./routes/dailyWords");

app.use("/api", curriculumRouter);
app.use("/api/progress", progressRouter);
app.use("/api/daily-words", dailyWordsRouter);
```

- [ ] **Step 2: Verify server starts**

```bash
cd backend
node src/index.js
```
Expected: `KoreanPrep Pro API listening on http://localhost:3001`  
Then Ctrl+C.

- [ ] **Step 3: Commit**

```bash
cd backend
git add src/index.js
git commit -m "feat: register daily-words router, raise JSON body limit to 5mb"
```

---

## Task 4: Frontend — daily-words-api.ts

**Files:**
- Create: `frontend/src/lib/daily-words-api.ts`

- [ ] **Step 1: Create the API client**

```ts
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
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `Request failed: ${res.status}`)
  }
  return res.json()
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `Request failed: ${res.status}`)
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
    throw new Error((err as { error?: string }).error ?? `Request failed: ${res.status}`)
  }
  return res.json()
}

/** Extract words from a Korean word list (one word per entry). */
export function extractWords(deviceId: string, words: string[]): Promise<DailyWord[]> {
  return postJson("/api/daily-words/extract", { deviceId, words })
}

/** Extract words from a base64-encoded screenshot image. */
export function extractFromImage(deviceId: string, image: string): Promise<DailyWord[]> {
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
```

- [ ] **Step 2: Commit**

```bash
cd frontend
git add src/lib/daily-words-api.ts
git commit -m "feat: add daily-words API client"
```

---

## Task 5: Frontend — AddWordsDialog

**Files:**
- Create: `frontend/src/components/AddWordsDialog.tsx`

- [ ] **Step 1: Create the dialog component**

```tsx
// frontend/src/components/AddWordsDialog.tsx
import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Cancel01Icon,
  Loading03Icon,
  ImageUploadIcon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  extractWords,
  extractFromImage,
  saveDailyWords,
  type DailyWord,
} from "@/lib/daily-words-api"

interface AddWordsDialogProps {
  deviceId: string
  date: string
  onSaved: (words: DailyWord[]) => void
  onClose: () => void
}

type InputTab = "paste" | "screenshot"

export function AddWordsDialog({ deviceId, date, onSaved, onClose }: AddWordsDialogProps) {
  const [tab, setTab] = React.useState<InputTab>("paste")
  const [pasteText, setPasteText] = React.useState("")
  const [imagePreview, setImagePreview] = React.useState<string | null>(null)
  const [extracted, setExtracted] = React.useState<DailyWord[] | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const fileRef = React.useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string)
      setError(null)
    }
    reader.readAsDataURL(file)
  }

  const handleExtract = async () => {
    setError(null)
    setLoading(true)
    try {
      let words: DailyWord[]
      if (tab === "paste") {
        const lines = pasteText
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
        if (lines.length === 0) throw new Error("Paste at least one Korean word.")
        words = await extractWords(deviceId, lines)
      } else {
        if (!imagePreview) throw new Error("Upload a screenshot first.")
        words = await extractFromImage(deviceId, imagePreview)
      }
      setExtracted(words)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed.")
    } finally {
      setLoading(false)
    }
  }

  const handleEnglishChange = (id: string, value: string) => {
    setExtracted((prev) =>
      prev ? prev.map((w) => (w.id === id ? { ...w, english: value } : w)) : prev
    )
  }

  const handleDelete = (id: string) => {
    setExtracted((prev) => (prev ? prev.filter((w) => w.id !== id) : prev))
  }

  const handleSave = async () => {
    if (!extracted || extracted.length === 0) return
    setSaving(true)
    setError(null)
    try {
      const result = await saveDailyWords(deviceId, date, extracted)
      onSaved(result.words)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* panel */}
      <div className="relative z-10 w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-card border border-border p-5 max-h-[90vh] overflow-y-auto mx-0 sm:mx-4">
        {/* header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="ko text-xs font-bold tracking-widest text-primary uppercase">
              단어 추가
            </p>
            <h2 className="font-heading text-lg font-bold">Add Words — {date}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground"
            aria-label="Close"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={18} color="currentColor" strokeWidth={2} />
          </button>
        </div>

        {/* tabs */}
        <div className="mb-4 flex gap-2">
          {(["paste", "screenshot"] as InputTab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setExtracted(null); setError(null) }}
              className={cn(
                "flex-1 rounded-xl py-2 text-xs font-semibold transition-colors",
                tab === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {t === "paste" ? "✏️ Type / Paste" : "📷 Screenshot"}
            </button>
          ))}
        </div>

        {/* input area */}
        {!extracted && (
          <>
            {tab === "paste" ? (
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={"사랑\n행복\n감사\n(one word per line)"}
                className="w-full h-36 resize-none rounded-xl border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
              />
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                className={cn(
                  "flex h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-colors hover:border-primary",
                  imagePreview ? "border-primary" : "border-border"
                )}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="preview"
                    className="h-full w-full rounded-xl object-contain p-1"
                  />
                ) : (
                  <>
                    <HugeiconsIcon icon={ImageUploadIcon} size={28} color="currentColor" strokeWidth={1.5} className="text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Tap to upload screenshot</p>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            )}

            {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

            <Button
              className="mt-3 w-full rounded-xl"
              onClick={handleExtract}
              disabled={loading}
            >
              {loading ? (
                <>
                  <HugeiconsIcon icon={Loading03Icon} size={14} color="currentColor" strokeWidth={2} className="animate-spin" data-icon="inline-start" />
                  Extracting…
                </>
              ) : (
                "Extract with AI"
              )}
            </Button>
          </>
        )}

        {/* review list */}
        {extracted && (
          <>
            <p className="mb-3 text-xs text-muted-foreground">
              Review and edit, then save. ({extracted.length} words)
            </p>
            <div className="flex flex-col gap-2 mb-4">
              {extracted.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2"
                >
                  <span className="ko text-sm font-semibold w-24 shrink-0">{w.korean}</span>
                  <input
                    value={w.english}
                    onChange={(e) => handleEnglishChange(w.id, e.target.value)}
                    className="flex-1 bg-transparent text-sm focus:outline-none border-b border-transparent focus:border-primary"
                    placeholder="English meaning"
                  />
                  <button
                    onClick={() => handleDelete(w.id)}
                    className="text-muted-foreground hover:text-destructive p-1"
                    aria-label="Remove word"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} size={14} color="currentColor" strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>

            {error && <p className="mb-2 text-xs text-destructive">{error}</p>}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl text-xs"
                onClick={() => { setExtracted(null); setError(null) }}
              >
                ← Re-extract
              </Button>
              <Button
                className="flex-1 rounded-xl"
                onClick={handleSave}
                disabled={saving || extracted.length === 0}
              >
                {saving ? (
                  <>
                    <HugeiconsIcon icon={Loading03Icon} size={14} color="currentColor" strokeWidth={2} className="animate-spin" data-icon="inline-start" />
                    Saving…
                  </>
                ) : (
                  <>
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} color="currentColor" strokeWidth={2} data-icon="inline-start" />
                    Save {extracted.length} Words
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd frontend
git add src/components/AddWordsDialog.tsx
git commit -m "feat: add AddWordsDialog component with type/paste and screenshot tabs"
```

---

## Task 6: Frontend — DailyWordsTab

**Files:**
- Create: `frontend/src/components/DailyWordsTab.tsx`

- [ ] **Step 1: Create the component**

```tsx
// frontend/src/components/DailyWordsTab.tsx
import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AddWordsDialog } from "@/components/AddWordsDialog"
import { fetchDailyDates, type DailyWord } from "@/lib/daily-words-api"

interface DailyWordsTabProps {
  deviceId: string
  selectedDate: string
  onSelectDate: (date: string) => void
  onWordsAdded: (words: DailyWord[]) => void
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(dateStr: string) {
  const today = todayStr()
  if (dateStr === today) return "Today"
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function DailyWordsTab({
  deviceId,
  selectedDate,
  onSelectDate,
  onWordsAdded,
}: DailyWordsTabProps) {
  const [dates, setDates] = React.useState<string[]>([])
  const [dialogOpen, setDialogOpen] = React.useState(false)

  const today = todayStr()

  React.useEffect(() => {
    fetchDailyDates(deviceId)
      .then((d) => {
        // Always ensure today is present in the strip
        const withToday = d.includes(today) ? d : [today, ...d]
        setDates(withToday.slice(0, 7))
      })
      .catch(() => setDates([today]))
  }, [deviceId, today])

  const handleSaved = (words: DailyWord[]) => {
    setDialogOpen(false)
    // Refresh date list in case today wasn't there before
    if (!dates.includes(today)) {
      setDates((prev) => [today, ...prev].slice(0, 7))
    }
    onSelectDate(today)
    onWordsAdded(words)
  }

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        {/* Date strip */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 flex-1">
          {dates.map((d) => (
            <button
              key={d}
              onClick={() => onSelectDate(d)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap",
                selectedDate === d
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              )}
            >
              {formatDate(d)}
            </button>
          ))}
        </div>

        {/* Add button */}
        <Button
          size="sm"
          className="shrink-0 rounded-xl text-xs"
          onClick={() => setDialogOpen(true)}
        >
          <HugeiconsIcon
            icon={Add01Icon}
            size={13}
            color="currentColor"
            strokeWidth={2}
            data-icon="inline-start"
          />
          Add Words
        </Button>
      </div>

      {dialogOpen && (
        <AddWordsDialog
          deviceId={deviceId}
          date={today}
          onSaved={handleSaved}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd frontend
git add src/components/DailyWordsTab.tsx
git commit -m "feat: add DailyWordsTab with date strip and add-words dialog trigger"
```

---

## Task 7: Frontend — Update Flashcards.tsx

**Files:**
- Modify: `frontend/src/views/Flashcards.tsx`

- [ ] **Step 1: Add imports at the top of the file**

After the existing imports (after the `Badge` and before the interface), add:

```tsx
import { DailyWordsTab } from "@/components/DailyWordsTab"
import { fetchDailyWords, type DailyWord } from "@/lib/daily-words-api"
```

- [ ] **Step 2: Add state variables inside the Flashcards component**

After the existing state declarations (after `const audioRef = ...`), add:

```tsx
const today = new Date().toISOString().slice(0, 10)
const [deckSource, setDeckSource] = React.useState<"curriculum" | "daily">("curriculum")
const [dailyDate, setDailyDate] = React.useState(today)
const deviceId = React.useMemo(() => {
  const key = "kp.deviceId"
  const existing = localStorage.getItem(key)
  if (existing) return existing
  const id = crypto.randomUUID()
  localStorage.setItem(key, id)
  return id
}, [])
```

- [ ] **Step 3: Add daily deck fetch effect**

After the existing `useEffect` that fetches `fetchDeck("week", week)`, add a new effect:

```tsx
React.useEffect(() => {
  if (deckSource !== "daily") return
  let cancelled = false
  setLoading(true)
  setNoData(false)
  fetchDailyWords(deviceId, dailyDate)
    .then(({ words }) => {
      if (cancelled) return
      if (words.length === 0) {
        setNoData(true)
        setDeck([])
      } else {
        resetSession(words)
      }
    })
    .catch(() => {
      if (!cancelled) setNoData(true)
    })
    .finally(() => {
      if (!cancelled) setLoading(false)
    })
  return () => { cancelled = true }
}, [deckSource, dailyDate, deviceId, resetSession])
```

- [ ] **Step 4: Update the week selector `<select>` to include Daily Words option**

Find this block:
```tsx
<select
  value={week}
  onChange={(e) => setWeek(Number(e.target.value))}
  className="h-9 appearance-none rounded-xl border bg-card pr-8 pl-3 text-sm font-semibold focus:ring-2 focus:ring-ring focus:outline-none"
  aria-label="Week filter"
>
  {WEEKS.map((w) => (
    <option key={w} value={w}>
      Week {w}
    </option>
  ))}
</select>
```

Replace with:
```tsx
<select
  value={deckSource === "daily" ? "daily" : week}
  onChange={(e) => {
    if (e.target.value === "daily") {
      setDeckSource("daily")
    } else {
      setDeckSource("curriculum")
      setWeek(Number(e.target.value))
    }
  }}
  className="h-9 appearance-none rounded-xl border bg-card pr-8 pl-3 text-sm font-semibold focus:ring-2 focus:ring-ring focus:outline-none"
  aria-label="Deck selector"
>
  {WEEKS.map((w) => (
    <option key={w} value={w}>
      Week {w}
    </option>
  ))}
  <option value="daily">✦ Daily Words</option>
</select>
```

- [ ] **Step 5: Add DailyWordsTab below the controls bar**

Find the closing `</div>` of the controls section (the `{/* Controls */}` div that ends after the Shuffle button). After that closing `</div>`, add:

```tsx
{/* Daily words date strip */}
{deckSource === "daily" && (
  <DailyWordsTab
    deviceId={deviceId}
    selectedDate={dailyDate}
    onSelectDate={(d) => setDailyDate(d)}
    onWordsAdded={(words) => resetSession(words)}
  />
)}
```

- [ ] **Step 6: Update the "no data" empty state message**

Find:
```tsx
No cards for Week {week} yet.
```
Replace with:
```tsx
{deckSource === "daily"
  ? "No words added yet. Tap "Add Words" to get started."
  : `No cards for Week ${week} yet.`}
```

- [ ] **Step 7: Also guard the existing curriculum useEffect to only run in curriculum mode**

Find the existing `useEffect` that calls `fetchDeck("week", week)`. Add a guard at the top:

```tsx
React.useEffect(() => {
  if (deckSource !== "curriculum") return   // ← add this line
  let cancelled = false
  // ... rest of existing effect unchanged
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
cd frontend
npx tsc -b
```
Expected: exit 0, no errors.

- [ ] **Step 9: Commit**

```bash
cd frontend
git add src/views/Flashcards.tsx
git commit -m "feat: integrate Daily Words tab into Flashcards with date-based deck loading"
```

---

## Task 8: Backend — Push to GitHub

- [ ] **Step 1: Push backend changes**

```bash
cd backend
TOKEN=$(gh auth token) && git push "https://${TOKEN}@github.com/Ali747711/Tutor-Ai.git" master:master master:main
```
Expected: Both branches updated on remote.

- [ ] **Step 2: Push frontend changes**

```bash
cd frontend
TOKEN=$(gh auth token) && git push "https://${TOKEN}@github.com/Ali747711/korean-prep-frontend.git" main
```

- [ ] **Step 3: Deploy frontend to Vercel**

```bash
cd frontend
vercel --prod
```
Expected: Deployment completes, production URL printed.

---

## Manual Smoke Test Checklist

After deployment, verify these flows work end-to-end:

- [ ] Open Flashcards → week selector shows "✦ Daily Words" option
- [ ] Select "Daily Words" → DailyWordsTab renders with date strip and "Add Words" button
- [ ] Tap "Add Words" → dialog opens with two tabs
- [ ] Type/Paste tab: paste `사랑\n행복\n감사` → Extract → review list shows 3 rows with English filled
- [ ] Edit one English meaning → Save → cards load in the flip deck
- [ ] Flip a card → works normally (TTS, Known/Unknown grading all work)
- [ ] Reload page → Today's words still appear (persisted in DB)
- [ ] Screenshot tab: upload a photo of Korean text → Extract → Korean words appear in review list
