"use client"

import * as React from "react"

import {
  DETAIL_FIELDS,
  formatDetailAnswer,
  normalizePhMobile,
  type DetailFieldKey,
} from "@/lib/chat-ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * The in-chat details card — several qualification fields in one go, instead of
 * the assistant asking for them one message at a time.
 *
 * Uncontrolled inputs with hand-rolled validation, matching how the other forms
 * in this app work (`components/lead-form.tsx`, `components/native-inquiry-form.tsx`).
 * This app has no react-hook-form or zod and doesn't need them here.
 */

type Props = {
  fields: DetailFieldKey[]
  /** Inert while a newer block is awaiting an answer, or a turn is in flight. */
  disabled?: boolean
  onSubmit: (text: string) => void
}

/**
 * Note there is no read-only "submitted" state: once answered, the caller drops
 * the form, because the visitor's own message bubble already carries the same
 * labelled values.
 */
export function DetailForm({ fields, disabled = false, onSubmit }: Props) {
  const [errors, setErrors] = React.useState<Partial<Record<DetailFieldKey, string>>>({})

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const values: Partial<Record<DetailFieldKey, string>> = {}
    const nextErrors: Partial<Record<DetailFieldKey, string>> = {}

    for (const key of fields) {
      const value = String(data.get(key) ?? "").trim()
      const spec = DETAIL_FIELDS[key]

      if (spec.required && !value) {
        nextErrors[key] = `${spec.label} is required.`
        continue
      }
      if (key === "mobile" && value && !normalizePhMobile(value)) {
        nextErrors[key] = "Enter a Philippine mobile number, e.g. 0917 555 0142."
        continue
      }
      if (value) values[key] = value
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    onSubmit(formatDetailAnswer(values))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border bg-background p-3">
      {fields.map((key) => {
        const spec = DETAIL_FIELDS[key]
        const errorId = `chat-${key}-error`
        return (
          <div key={key} className="space-y-1">
            <Label htmlFor={`chat-${key}`} className="text-xs">
              {spec.label}
              {spec.required ? <span className="ml-0.5 text-primary">*</span> : null}
            </Label>
            <Input
              id={`chat-${key}`}
              name={key}
              type={spec.type}
              autoComplete={spec.autoComplete}
              placeholder={spec.placeholder}
              maxLength={200}
              disabled={disabled}
              aria-invalid={Boolean(errors[key])}
              aria-describedby={errors[key] ? errorId : undefined}
            />
            {errors[key] && (
              <p id={errorId} className="text-xs text-destructive">
                {errors[key]}
              </p>
            )}
          </div>
        )
      })}

      <Button type="submit" size="sm" disabled={disabled} className="w-full">
        Continue
      </Button>
    </form>
  )
}
