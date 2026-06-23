// frontend/src/components/AddWordsDialog.tsx
import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Cancel01Icon,
  Loading03Icon,
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
                    <span className="text-3xl">📷</span>
                    <p className="text-xs text-muted-foreground">Tap to upload screenshot</p>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
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
