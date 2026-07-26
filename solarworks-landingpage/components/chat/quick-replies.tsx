"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * Tappable answers for a fixed-choice chat question.
 *
 * Styling deliberately matches the goal chips in `components/lead-form.tsx` so
 * the chat feels like the rest of the site. (There are now several near-identical
 * chip implementations across the repo — lead-form, project-gallery and these;
 * worth extracting into one primitive when someone next touches all three.)
 *
 * Once answered the row stays visible but inert, so the transcript still reads
 * as a record of what was asked and chosen.
 */

type Props = {
  options: string[]
  multi?: boolean
  disabled?: boolean
  /** The chosen value(s), already joined for display, once resolved. */
  answer?: string
  onAnswer: (value: string) => void
}

export function QuickReplies({ options, multi = false, disabled = false, answer, onAnswer }: Props) {
  const [selected, setSelected] = React.useState<string[]>([])

  // The stored answer is label-prefixed ("Property type: Home") so the model can
  // read it unambiguously; strip that back off to highlight the chosen chips.
  const chosen = React.useMemo(() => {
    if (!answer) return []
    const separator = answer.indexOf(": ")
    const values = separator === -1 ? answer : answer.slice(separator + 2)
    return values.split(", ").map((s) => s.trim())
  }, [answer])

  function toggle(option: string) {
    if (disabled) return
    if (!multi) {
      onAnswer(option)
      return
    }
    setSelected((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option],
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2" role="group">
        {options.map((option) => {
          const isActive = disabled ? chosen.includes(option) : selected.includes(option)
          return (
            <button
              key={option}
              type="button"
              disabled={disabled}
              aria-pressed={multi ? isActive : undefined}
              onClick={() => toggle(option)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
                // Unselected chips stay full-contrast: these are the primary
                // call to action in the chat, so muted text read as disabled.
                isActive
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-input bg-background text-foreground hover:border-primary/50 hover:bg-muted",
                disabled &&
                  "pointer-events-none cursor-default border-transparent bg-transparent text-muted-foreground",
                disabled && isActive && "border-primary/40 bg-primary/10 text-foreground",
              )}
            >
              {option}
            </button>
          )
        })}
      </div>

      {multi && !disabled && (
        <Button
          size="sm"
          disabled={selected.length === 0}
          onClick={() => onAnswer(selected.join(", "))}
        >
          Continue
        </Button>
      )}
    </div>
  )
}
