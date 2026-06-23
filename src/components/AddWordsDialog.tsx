import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Cancel01Icon,
  Loading03Icon,
  CheckmarkCircle02Icon,
  PencilEdit01Icon,
  Camera01Icon,
  Image01Icon,
  ArrowLeft01Icon,
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

  const handleTabChange = (t: InputTab) => {
    setTab(t)
    setExtracted(null)
    setError(null)
  }

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
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="ko text-xs font-bold tracking-widest text-primary uppercase mb-0.5">
              단어 추가
            </p>
            <h2 className="font-heading text-xl font-bold leading-tight">Add Words</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{date}</p>
          </div>
          <button
            onClick={onClose}
            className="mt-0.5 shrink-0 rounded-lg p-1.5 hover:bg-muted text-muted-foreground transition-colors"
            aria-label="Close"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={18} color="currentColor" strokeWidth={2} />
          </button>
        </div>

        {/* tab switcher — same segmented pill style as Flashcards */}
        <div className="mb-4 flex w-full rounded-xl border bg-muted p-1 gap-1">
          <button
            onClick={() => handleTabChange("paste")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-colors",
              tab === "paste"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <HugeiconsIcon icon={PencilEdit01Icon} size={14} color="currentColor" strokeWidth={2} />
            Type / Paste
          </button>
          <button
            onClick={() => handleTabChange("screenshot")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-colors",
              tab === "screenshot"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <HugeiconsIcon icon={Camera01Icon} size={14} color="currentColor" strokeWidth={2} />
            Screenshot
          </button>
        </div>

        {/* input area */}
        {!extracted && (
          <>
            {tab === "paste" ? (
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={"사랑\n행복\n감사\n(one word per line)"}
                className="w-full h-40 resize-none rounded-xl border bg-background px-3 py-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none placeholder:text-muted-foreground/50"
              />
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                className={cn(
                  "flex h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition-colors hover:border-primary/70",
                  imagePreview ? "border-primary" : "border-border"
                )}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="preview"
                    className="h-full w-full rounded-xl object-contain p-2"
                  />
                ) : (
                  <>
                    <div className="rounded-xl bg-muted p-3">
                      <HugeiconsIcon icon={Image01Icon} size={24} color="currentColor" strokeWidth={1.5} className="text-muted-foreground" />
                    </div>
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

            {error && (
              <p className="mt-2 text-xs text-destructive">{error}</p>
            )}

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
              Review and edit before saving — {extracted.length} word{extracted.length !== 1 ? "s" : ""} found
            </p>

            <div className="flex flex-col gap-2 mb-4">
              {extracted.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center gap-3 rounded-xl border bg-background px-3 py-2.5"
                >
                  <div className="shrink-0 w-28">
                    <p className="ko text-sm font-bold leading-tight">{w.korean}</p>
                    {w.romanization && (
                      <p className="text-xs text-muted-foreground leading-tight mt-0.5">{w.romanization}</p>
                    )}
                  </div>
                  <input
                    value={w.english}
                    onChange={(e) => handleEnglishChange(w.id, e.target.value)}
                    className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none text-muted-foreground focus:text-foreground border-b border-transparent focus:border-border transition-colors"
                    placeholder="English meaning…"
                  />
                  <button
                    onClick={() => handleDelete(w.id)}
                    className="shrink-0 rounded-lg p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    aria-label="Remove word"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} size={14} color="currentColor" strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>

            {error && <p className="mb-3 text-xs text-destructive">{error}</p>}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => { setExtracted(null); setError(null) }}
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={13} color="currentColor" strokeWidth={2} data-icon="inline-start" />
                Re-extract
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
                    Save {extracted.length} Word{extracted.length !== 1 ? "s" : ""}
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
