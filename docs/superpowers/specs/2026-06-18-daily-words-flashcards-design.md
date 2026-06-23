# Daily Words Flashcards — Design Spec

**Date:** 2026-06-18  
**Feature:** Add personal daily vocabulary to the Flashcards view with AI-powered extraction from typed words or screenshots.

---

## Problem

The existing Flashcard decks are curriculum-driven (Week 1–12 from the TTMIK books). The user learns 10–20 extra words daily from external sources (screenshots, dictionaries, chats). These have no home in the app today.

---

## Solution Overview

Add a **Daily Words** tab to the Flashcards view. The user can paste Korean words or upload a screenshot; Claude AI extracts the words and fills in romanization and English meanings. The user reviews and edits the list before saving. Words are stored in MongoDB per date and load instantly as flip cards using the existing deck UI.

---

## Entry Point

The Flashcards week selector (currently Week 1–12 tabs) gains one extra tab: **Daily Words**. Selecting it shows a date strip (today + past dates with saved words) and a **+ Add Words** button. The existing flip card, TTS, shuffle, and Known/Unknown grading UI work unchanged.

---

## Input Panel — AddWordsDialog

A modal/sheet with two tabs:

### Tab 1 — Type / Paste
- `<textarea>` where the user pastes Korean words, one per line (e.g. `사랑`, `행복`)
- Hitting **Extract** sends the word list to the backend
- Claude returns romanization + English for each word

### Tab 2 — Screenshot
- File input / drag-and-drop zone accepting images (PNG, JPG, WEBP)
- Image sent as base64 to the backend
- Claude Vision extracts Korean words from the image and returns romanization + English in one call

### Review Step (shared by both tabs)
After extraction, an editable list appears:
- Each row: Korean (read-only) | English (editable input) | delete button
- User can correct any AI-generated meaning or remove unwanted words
- **Save to Today** button persists the final list

---

## Data Model

### MongoDB — `DailyWordSet`
```
{
  deviceId:  string,        // matches existing progress tracking
  date:      string,        // "YYYY-MM-DD"
  words: [{
    id:            string,  // UUID, matches FlashcardItem.id shape
    korean:        string,
    romanization:  string,  // AI-generated
    english:       string,  // AI-generated, user-editable before save
    source:        "typed" | "screenshot"
  }],
  createdAt: Date
}
```

`words[]` items are structurally identical to `FlashcardItem` — no changes needed to the flip card renderer.

---

## Backend API

All routes live under `/api/daily-words`.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/daily-words/extract` | Accepts `{ words: string[] }` or `{ image: base64 }`. Calls Claude. Returns `FlashcardItem[]` with romanization + english filled. |
| `GET` | `/api/daily-words` | Returns array of date strings that have saved word sets for this `deviceId`. |
| `GET` | `/api/daily-words/:date` | Returns the `DailyWordSet` for a given date. |
| `PUT` | `/api/daily-words/:date` | Saves (or replaces) the word set for a given date. Body: `{ deviceId, words[] }`. |

Claude model to use for extraction: `claude-haiku-4-5-20251001` (fast, cheap, handles Korean well).

---

## Frontend Components

### Modified
- **`Flashcards.tsx`** — adds "Daily Words" tab to the week selector; when active, renders `<DailyWordsTab>` instead of the week deck

### New
- **`DailyWordsTab.tsx`** — date strip (Today + past dates), "+ Add Words" button, loads the selected date's words into the shared flip card deck
- **`AddWordsDialog.tsx`** — modal with Type/Paste and Screenshot tabs, extract button, review list, save button
- **`frontend/src/lib/daily-words-api.ts`** — API client: `extractWords(words)`, `extractFromImage(base64)`, `fetchDailyWords(date)`, `saveDailyWords(date, words)`, `fetchDailyDates()`

---

## User Flow

1. Tap **Daily Words** tab → date strip appears, today's words load as flip cards (empty if none yet)
2. Tap **+ Add Words** → `AddWordsDialog` opens
3. Choose tab: paste Korean words OR upload screenshot → tap **Extract**
4. Review list: edit English meanings, delete unwanted entries
5. Tap **Save to Today** → PUT to backend, deck reloads with new cards
6. Tap a past date in the strip → loads that day's word set for review/study

---

## Error Handling

- **Extraction fails** → show error message inside the dialog, allow retry
- **No words found in screenshot** → show "No Korean words detected" message
- **Save fails** → toast error, words remain in review state so nothing is lost
- **Date has no words** → show empty state with "+ Add Words" CTA

---

## Out of Scope

- Merging daily words into curriculum decks
- Spaced repetition scheduling
- Sharing word sets between devices (deviceId-scoped only)
- Editing or deleting individual saved words after the review step (post-MVP)
