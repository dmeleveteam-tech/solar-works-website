"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * Two-step destructive action. Replaces `window.confirm()`, which blocks the
 * whole renderer, can't be styled, reads as a browser malfunction, and — per
 * the browser-automation guidance in this repo — freezes any tooling driving
 * the page.
 *
 * The confirm step expands inline where the button already was, so the row
 * never jumps and the user keeps their place in the list.
 */
export function ConfirmButton({
  onConfirm,
  children,
  confirmLabel = "Confirm",
  question,
  disabled,
  size = "sm",
  variant = "ghost",
  className,
}: {
  onConfirm: () => void | Promise<void>
  children: React.ReactNode
  confirmLabel?: string
  question: string
  disabled?: boolean
  size?: React.ComponentProps<typeof Button>["size"]
  variant?: React.ComponentProps<typeof Button>["variant"]
  className?: string
}) {
  const [confirming, setConfirming] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const cancelRef = React.useRef<HTMLButtonElement>(null)

  // Arming the confirm moves focus to Cancel, so the safe choice is the one a
  // keyboard user lands on and Escape always backs out.
  React.useEffect(() => {
    if (confirming) cancelRef.current?.focus()
  }, [confirming])

  async function run() {
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
      setConfirming(false)
    }
  }

  if (!confirming) {
    return (
      <Button
        type="button"
        size={size}
        variant={variant}
        disabled={disabled}
        onClick={() => setConfirming(true)}
        className={cn("text-destructive hover:text-destructive", className)}
      >
        {children}
      </Button>
    )
  }

  return (
    <span
      role="group"
      aria-label={question}
      onKeyDown={(e) => {
        if (e.key === "Escape") setConfirming(false)
      }}
      className="inline-flex items-center gap-1.5 rounded-md bg-destructive/8 py-0.5 pr-0.5 pl-2.5 ring-1 ring-destructive/20"
    >
      <span className="text-xs text-destructive">{question}</span>
      <Button
        type="button"
        size="xs"
        variant="destructive"
        onClick={run}
        disabled={busy}
      >
        {busy ? <Loader2 className="animate-spin" /> : null}
        {confirmLabel}
      </Button>
      <Button
        ref={cancelRef}
        type="button"
        size="xs"
        variant="ghost"
        onClick={() => setConfirming(false)}
        disabled={busy}
      >
        Cancel
      </Button>
    </span>
  )
}
