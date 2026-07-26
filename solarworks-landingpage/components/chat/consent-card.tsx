"use client"

import * as React from "react"

import { CONSENT_ACCEPT_TEXT, CONSENT_DECLINE_TEXT } from "@/lib/chat-ui"
import { siteConfig } from "@/lib/site-config"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

/**
 * The consent gate.
 *
 * This is the ONLY route to a saved lead: `save_lead` is rejected server-side
 * unless the visitor has ticked this box, because the model's own `consent`
 * argument proved unreliable — it once recorded consent from nothing more than
 * "Yes, I'd like an assessment." Confirm stays disabled until the box is ticked.
 */

type Props = {
  summary: string
  /** Inert while a newer block is awaiting an answer, or a turn is in flight. */
  disabled?: boolean
  onDecision: (accepted: boolean, text: string) => void
}

/**
 * Like `DetailForm`, there is no answered state: the caller drops the card once
 * decided, because the visitor's own message bubble already says what they chose.
 */
export function ConsentCard({ summary, disabled = false, onDecision }: Props) {
  const [checked, setChecked] = React.useState(false)

  return (
    <div className="space-y-3 rounded-xl border bg-background p-3">
      <div className="flex items-start gap-2">
        <Checkbox
          id="chat-consent"
          checked={checked}
          disabled={disabled}
          onCheckedChange={(v) => setChecked(v === true)}
          className="mt-0.5"
        />
        <Label htmlFor="chat-consent" className="text-xs leading-relaxed font-normal">
          I agree to be contacted by {siteConfig.name} about a solar assessment, and to have
          {summary ? ` ${summary}` : " my details"} stored for that purpose.
        </Label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={disabled || !checked}
          onClick={() => onDecision(true, CONSENT_ACCEPT_TEXT)}
        >
          Confirm
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => onDecision(false, CONSENT_DECLINE_TEXT)}
        >
          Not now
        </Button>
      </div>
    </div>
  )
}
