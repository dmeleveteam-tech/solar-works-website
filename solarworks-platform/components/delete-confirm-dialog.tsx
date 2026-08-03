"use client"

import { Loader2, Trash2 } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

/**
 * Shared "are you sure?" modal for every destructive delete across the
 * dashboard (leads, customer projects, CMS content, tariffs/plants, users).
 * Replaces the mix of a bare `window.confirm()` and an inline two-click
 * button toggle that used to do this job — same "type to confirm" is
 * overkill here, but a plain browser confirm() looks out of place next to
 * everything else and is easy to blow past without reading.
 */
export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  busy,
  onConfirm,
  confirmLabel = "Delete",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  busy: boolean
  onConfirm: () => void
  confirmLabel?: string
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={busy} onClick={onConfirm}>
            {busy ? <Loader2 className="animate-spin" /> : <Trash2 />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
