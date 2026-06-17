import { HugeiconsIcon } from "@hugeicons/react"
import {
  Home01Icon,
  BookOpen01Icon,
  Book02Icon,
  Mic01Icon,
  BubbleChatIcon,
  Sun01Icon,
  Moon01Icon,
  Layers01Icon,
  TextIcon,
} from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { useTheme } from "@/components/theme-provider"

export type View =
  | "dashboard"
  | "lessons"
  | "vocabulary"
  | "flashcards"
  | "grammar"
  | "interview"
  | "tutor"

interface NavItem {
  view: View
  label: string
  korean: string
  icon: typeof Home01Icon
}

const NAV_ITEMS: NavItem[] = [
  { view: "dashboard", label: "Home", korean: "홈", icon: Home01Icon },
  { view: "lessons", label: "Lessons", korean: "대화", icon: Book02Icon },
  { view: "vocabulary", label: "Vocabulary", korean: "단어", icon: BookOpen01Icon },
  { view: "flashcards", label: "Flashcards", korean: "카드", icon: Layers01Icon },
  { view: "grammar", label: "Grammar", korean: "문법", icon: TextIcon },
  { view: "interview", label: "Interview", korean: "면접", icon: Mic01Icon },
  { view: "tutor", label: "Tutor", korean: "튜터", icon: BubbleChatIcon },
]

interface NavigationProps {
  active: View
  onNavigate: (view: View) => void
}

function Logo() {
  return (
    <div className="flex items-center gap-3 px-1">
      {/* Mark */}
      <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary shadow-sm">
        <span className="ko text-lg font-bold text-primary-foreground leading-none select-none">한</span>
        {/* subtle glow */}
        <div className="absolute inset-0 rounded-xl bg-primary opacity-40 blur-md -z-10" />
      </div>
      <div className="min-w-0 leading-tight">
        <p className="font-heading text-base font-bold tracking-tight text-foreground">
          Korean<span className="text-primary">Prep</span>
        </p>
        <p className="text-[0.65rem] font-semibold text-muted-foreground tracking-widest uppercase">
          Interview Studio
        </p>
      </div>
    </div>
  )
}

export function Navigation({ active, onNavigate }: NavigationProps) {
  const { theme, setTheme } = useTheme()
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)

  const toggleTheme = () => setTheme(isDark ? "light" : "dark")

  return (
    <>
      {/* ── Desktop: left sidebar ──────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r bg-card p-4 md:flex">
        {/* Logo */}
        <div className="mt-2 mb-8">
          <Logo />
        </div>

        {/* Nav items */}
        <nav className="flex flex-col gap-0.5" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const isActive = active === item.view
            return (
              <button
                key={item.view}
                onClick={() => onNavigate(item.view)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl py-2.5 pr-3 pl-4 text-left text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                )}
              >
                {/* Active accent bar */}
                {isActive && (
                  <span className="absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                )}
                <HugeiconsIcon
                  icon={item.icon}
                  size={18}
                  color="currentColor"
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                <span className="flex-1 font-semibold tracking-[-0.01em]">
                  {item.label}
                </span>
                <span
                  className={cn(
                    "ko text-[0.65rem] tabular-nums transition-opacity",
                    isActive ? "text-primary/70 opacity-100" : "opacity-40"
                  )}
                >
                  {item.korean}
                </span>
              </button>
            )
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
        >
          <HugeiconsIcon
            icon={isDark ? Sun01Icon : Moon01Icon}
            size={18}
            color="currentColor"
            strokeWidth={1.8}
          />
          <span>{isDark ? "Light mode" : "Dark mode"}</span>
        </button>

        {/* Motivational chip */}
        <div className="mt-3 rounded-xl border bg-muted/40 px-4 py-3">
          <p className="ko text-sm font-bold text-primary">화이팅!</p>
          <p className="mt-0.5 text-[0.72rem] leading-relaxed text-muted-foreground">
            Every sentence brings Seoul closer.
          </p>
        </div>
      </aside>

      {/* ── Mobile: floating theme toggle top-right ─────── */}
      <button
        onClick={toggleTheme}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        className="fixed top-3 right-3 z-50 flex size-9 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground md:hidden"
      >
        <HugeiconsIcon
          icon={isDark ? Sun01Icon : Moon01Icon}
          size={18}
          color="currentColor"
          strokeWidth={1.8}
        />
      </button>

      {/* ── Mobile: bottom tab bar ───────────────────────── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t bg-card/95 backdrop-blur-sm px-1 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] md:hidden"
        aria-label="Mobile navigation"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.view
          return (
            <button
              key={item.view}
              onClick={() => onNavigate(item.view)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-1 rounded-xl py-2 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              {/* Active top pip */}
              {isActive && (
                <span className="absolute -top-1.5 h-[3px] w-7 rounded-full bg-primary" />
              )}
              <HugeiconsIcon
                icon={item.icon}
                size={20}
                color="currentColor"
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              <span className="text-[0.62rem] font-semibold tracking-tight">
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>
    </>
  )
}
