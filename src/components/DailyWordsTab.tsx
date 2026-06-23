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
        const withToday = d.includes(today) ? d : [today, ...d]
        setDates(withToday.slice(0, 7))
      })
      .catch(() => setDates([today]))
  }, [deviceId, today])

  const handleSaved = (words: DailyWord[]) => {
    setDialogOpen(false)
    if (!dates.includes(today)) {
      setDates((prev) => [today, ...prev].slice(0, 7))
    }
    onSelectDate(today)
    onWordsAdded(words)
  }

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
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
