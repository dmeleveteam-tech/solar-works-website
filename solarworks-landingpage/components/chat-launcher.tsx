"use client"

import * as React from "react"
import Link from "next/link"
import {
  MessageSquareText,
  X,
  Bot,
  ArrowRight,
  Phone,
  Send,
  ExternalLink,
  ChevronDown,
  Maximize2,
  Minimize2,
} from "lucide-react"

import { siteConfig } from "@/lib/site-config"
import { cn } from "@/lib/utils"
import { track, ANALYTICS_EVENTS } from "@/lib/analytics"
import { getAttribution } from "@/lib/attribution"
import { MESSENGER_HREF } from "@/lib/messenger"
import {
  formatChoiceAnswer,
  START_ASSESSMENT_CHIP,
  SUGGESTED_QUESTIONS,
  type ChatUi,
} from "@/lib/chat-ui"
import { QuickReplies } from "@/components/chat/quick-replies"
import { DetailForm } from "@/components/chat/detail-form"
import { ConsentCard } from "@/components/chat/consent-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/**
 * Floating Solar Assistant — a real AI chat backed by `/api/chat`. It runs the
 * qualification flow, asks for consent, and saves a lead to the staff inbox
 * (build guide: "AI Lead Chatbot"). The visitor can always fall back to the
 * assessment form or a human on Viber. Motion is gentle and respects
 * `prefers-reduced-motion`; focus moves to the input on open.
 */

/**
 * A structured block (chips / details form / consent) may ride along with an
 * assistant message. `resolved` holds the visitor's answer once given, which
 * both renders the block inert and preserves it in the transcript.
 *
 * `suggestions` are the server's tappable follow-ups for a plain prose reply —
 * shown only under the newest message, so the visitor always has something to
 * tap without the transcript filling up with stale chip rows.
 */
type Message = {
  role: "user" | "assistant"
  content: string
  ui?: ChatUi
  resolved?: string
  suggestions?: string[]
}

const GREETING: Message = {
  role: "assistant",
  content: `Hi! I'm the ${siteConfig.name} Solar Assistant. I can help you figure out which setup fits your home or business, then connect you with our team for a proper assessment. Want to get an assessment, or ask a question first?`,
  suggestions: [START_ASSESSMENT_CHIP, ...SUGGESTED_QUESTIONS.slice(0, 3)],
}

export function ChatLauncher() {
  const [open, setOpen] = React.useState(false)
  const [expanded, setExpanded] = React.useState(false)
  const [messages, setMessages] = React.useState<Message[]>([GREETING])
  const [input, setInput] = React.useState("")
  const [pending, setPending] = React.useState(false)
  // Set only when the visitor ticks the consent checkbox; sent on every
  // subsequent turn so the server can refuse a lead the model merely assumed.
  const [consentConfirmed, setConsentConfirmed] = React.useState(false)
  const [leadSaved, setLeadSaved] = React.useState(false)

  const inputRef = React.useRef<HTMLInputElement>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const leadCelebrated = React.useRef(false)

  function toggle() {
    setOpen((v) => {
      if (!v) track(ANALYTICS_EVENTS.chatbotOpen)
      return !v
    })
  }

  /** Index of the newest block still awaiting an answer; only it is interactive. */
  const activeUiIndex = React.useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].ui && messages[i].resolved === undefined) return i
    }
    return -1
  }, [messages])

  // Move focus to the input when the panel opens.
  React.useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Keep the latest message in view as the conversation grows.
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, pending])

  /**
   * Send a turn. `resolveIndex` marks a structured block as answered, and
   * `consentOverride` carries a just-granted consent that state hasn't flushed
   * yet (setState is async, and this same turn is the one that saves the lead).
   */
  async function send(text: string, resolveIndex?: number, consentOverride?: boolean) {
    const content = text.trim()
    if (!content || pending) return

    const base =
      resolveIndex === undefined
        ? messages
        : messages.map((m, i) => (i === resolveIndex ? { ...m, resolved: content } : m))

    const next = [...base, { role: "user" as const, content }]
    setMessages(next)
    setInput("")
    setPending(true)

    const consentFlag = consentOverride ?? consentConfirmed

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          // Strip client-only fields — the server wants plain {role, content}.
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          attribution: getAttribution(),
          consentConfirmed: consentFlag,
          leadAlreadySaved: leadSaved,
        }),
      })
      if (!res.ok) throw new Error(`chat ${res.status}`)

      const data = (await res.json()) as {
        message?: string
        leadSaved?: boolean
        ui?: ChatUi
        suggestions?: string[]
      }
      const reply =
        data.message?.trim() ||
        "Sorry, something went wrong on my end. Please try again, or reach us on Viber."
      setMessages((m) => [
        ...m,
        { role: "assistant", content: reply, ui: data.ui, suggestions: data.suggestions },
      ])

      if (data.leadSaved) {
        setLeadSaved(true)
        if (!leadCelebrated.current) {
          leadCelebrated.current = true
          track(ANALYTICS_EVENTS.chatbotQualifiedLead)
        }
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "I couldn't reach our servers just now. Please try again, or message us on Viber and a real person will help you.",
        },
      ])
    } finally {
      setPending(false)
      // Return focus to the input for the next turn.
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    void send(input)
  }

  /**
   * The visitor's decision on the consent block. On accept we pass the flag
   * straight through to `send`, because the very next turn is the one where the
   * model calls save_lead and React state wouldn't have settled in time.
   */
  function handleConsent(index: number, accepted: boolean, text: string) {
    if (accepted) setConsentConfirmed(true)
    void send(text, index, accepted || undefined)
  }

  /** Render the structured block attached to an assistant message, if any. */
  function renderUi(message: Message, index: number) {
    const ui = message.ui
    if (!ui) return null
    const isResolved = message.resolved !== undefined
    const isActive = index === activeUiIndex && !pending

    if (ui.kind === "consent") {
      // Decided: the visitor's own bubble already states what they chose, so a
      // recap card here repeated the same sentence twice in a row.
      if (isResolved) return null
      return (
        <ConsentCard
          summary={ui.summary}
          disabled={!isActive}
          onDecision={(accepted, text) => handleConsent(index, accepted, text)}
        />
      )
    }

    if (ui.kind === "details") {
      // Once submitted, the visitor's own message bubble already shows the same
      // labelled lines, so a read-only recap card printed every value twice.
      if (isResolved) return null
      return (
        <DetailForm
          fields={ui.fields}
          disabled={!isActive}
          onSubmit={(text) => void send(text, index)}
        />
      )
    }

    return (
      <QuickReplies
        options={ui.options}
        multi={ui.multi}
        disabled={isResolved || !isActive}
        answer={message.resolved}
        onAnswer={(value) => void send(formatChoiceAnswer(ui.field, value), index)}
      />
    )
  }

  /**
   * Tappable follow-ups under the newest assistant message. Only the newest one
   * gets them — older rows would be stale — and never alongside a structured
   * block, which is already the thing to tap.
   */
  function renderSuggestions(message: Message, index: number) {
    const isNewest = index === messages.length - 1
    if (message.ui || !isNewest || pending) return null
    if (!message.suggestions?.length) return null
    return <QuickReplies options={message.suggestions} onAnswer={(value) => void send(value)} />
  }

  return (
    <>
      {/* Panel */}
      <div
        role="dialog"
        aria-label="Solar Assistant"
        aria-hidden={!open}
        className={cn(
          // Mobile: a genuine full-screen sheet — the old 328px box was far too
          // cramped for the details form. From `sm` up it returns to a panel
          // anchored above the launcher button.
          "fixed inset-2 z-50 flex origin-bottom flex-col overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-2xl transition duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
          "sm:inset-auto sm:right-4 sm:bottom-44 sm:origin-bottom-right lg:bottom-24",
          expanded
            ? "sm:h-[min(46rem,calc(100vh-7rem))] sm:w-[min(42rem,calc(100vw-2rem))]"
            : "sm:h-[min(38rem,calc(100vh-9rem))] sm:w-[min(26rem,calc(100vw-2rem))]",
          open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0",
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b p-4">
          <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground">
            <Bot className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Solar Assistant</p>
            <p className="text-xs text-muted-foreground">AI assistant · replies instantly</p>
          </div>
          {/* Sizing is fixed on mobile (already full-screen), so hide the toggle there. */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Shrink chat" : "Expand chat"}
            aria-pressed={expanded}
            className="hidden sm:inline-flex"
          >
            {expanded ? <Minimize2 /> : <Maximize2 />}
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)} aria-label="Close chat">
            <X />
          </Button>
        </div>

        {/* Transcript */}
        <div
          ref={scrollRef}
          data-lenis-prevent
          className="flex-1 space-y-3 overflow-y-auto p-4"
          aria-live="polite"
        >
          {messages.map((m, i) => (
            <div key={i} className="space-y-2">
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl p-3 text-sm whitespace-pre-wrap text-pretty",
                  m.role === "assistant"
                    ? "rounded-tl-sm bg-muted"
                    : "ml-auto rounded-tr-sm bg-primary text-primary-foreground",
                )}
              >
                {m.content}
              </div>
              {renderUi(m, i)}
              {renderSuggestions(m, i)}
            </div>
          ))}

          {pending && (
            <div className="flex max-w-[85%] gap-1 rounded-2xl rounded-tl-sm bg-muted p-3" aria-label="Assistant is typing">
              <Dot /> <Dot className="[animation-delay:150ms]" /> <Dot className="[animation-delay:300ms]" />
            </div>
          )}

          {/* Persistent shortcuts to the form and a human. */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild size="sm" variant="outline">
              <Link href={`${siteConfig.primaryCta.href}?via=chat`}>
                Assessment form <ArrowRight />
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <Phone /> Talk to a human <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {MESSENGER_HREF && (
                  <DropdownMenuItem asChild>
                    <a href={MESSENGER_HREF} target="_blank" rel="noopener noreferrer">
                      <ExternalLink /> Messenger
                    </a>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <a href={siteConfig.contact.viber.href}>
                    <Phone /> Viber
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={siteConfig.contact.phone.href}>
                    <Phone /> Call {siteConfig.contact.phone.value}
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Composer */}
        <form onSubmit={onSubmit} className="flex items-center gap-2 border-t p-3">
          <label htmlFor="chat-input" className="sr-only">
            Type your message
          </label>
          <Input
            id="chat-input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message…"
            autoComplete="off"
            disabled={pending}
            maxLength={2000}
          />
          <Button type="submit" size="icon" disabled={pending || !input.trim()} aria-label="Send message">
            <Send className="size-4" />
          </Button>
        </form>
      </div>

      {/* Launcher button */}
      <Button
        size="icon-lg"
        onClick={toggle}
        aria-expanded={open}
        aria-label={open ? "Close Solar Assistant" : "Open Solar Assistant"}
        className="fixed right-4 bottom-24 z-50 size-14 rounded-full shadow-lg lg:bottom-6"
      >
        {open ? <X className="size-5" /> : <MessageSquareText className="size-5" />}
      </Button>
    </>
  )
}

/** A single bouncing dot for the typing indicator. */
function Dot({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "size-1.5 animate-bounce rounded-full bg-muted-foreground/60 motion-reduce:animate-none",
        className,
      )}
    />
  )
}
