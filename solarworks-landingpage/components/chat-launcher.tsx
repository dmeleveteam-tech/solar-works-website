"use client"

import * as React from "react"
import Link from "next/link"
import { MessageSquareText, X, Bot, ArrowRight, Phone, Send, ExternalLink } from "lucide-react"

import { siteConfig } from "@/lib/site-config"
import { cn } from "@/lib/utils"
import { track, ANALYTICS_EVENTS } from "@/lib/analytics"
import { getAttribution } from "@/lib/attribution"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/**
 * Floating Solar Assistant — a real AI chat backed by `/api/chat`. It runs the
 * qualification flow, asks for consent, and saves a lead to the staff inbox
 * (build guide: "AI Lead Chatbot"). The visitor can always fall back to the
 * assessment form or a human on Viber. Motion is gentle and respects
 * `prefers-reduced-motion`; focus moves to the input on open.
 */

type Message = { role: "user" | "assistant"; content: string }

// Public Facebook Page ID — safe to expose, used only to build an m.me deep
// link. Leave unset to hide the "Continue on Messenger" shortcut.
const FB_PAGE_ID = process.env.NEXT_PUBLIC_FB_PAGE_ID
const MESSENGER_HREF = FB_PAGE_ID ? `https://m.me/${FB_PAGE_ID}?ref=web_lead` : null

const GREETING: Message = {
  role: "assistant",
  content: `Hi! I'm the ${siteConfig.name} Solar Assistant. I can help you figure out which setup fits your home or business, then connect you with our team for a proper assessment. Want to get an assessment, or ask a question first?`,
}

// Quick-start prompts shown before the visitor types anything, so the chat
// doesn't sit on a blank input waiting for them to think of a question.
const SUGGESTED_QUESTIONS = [
  "How much does a solar system cost?",
  "What warranties do you offer?",
  "Do I need a battery?",
  "How long does installation take?",
]

export function ChatLauncher() {
  const [open, setOpen] = React.useState(false)
  const [messages, setMessages] = React.useState<Message[]>([GREETING])
  const [input, setInput] = React.useState("")
  const [pending, setPending] = React.useState(false)

  const inputRef = React.useRef<HTMLInputElement>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const leadCelebrated = React.useRef(false)

  function toggle() {
    setOpen((v) => {
      if (!v) track(ANALYTICS_EVENTS.chatbotOpen)
      return !v
    })
  }

  // Move focus to the input when the panel opens.
  React.useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Keep the latest message in view as the conversation grows.
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, pending])

  async function send(text: string) {
    const content = text.trim()
    if (!content || pending) return

    const next = [...messages, { role: "user" as const, content }]
    setMessages(next)
    setInput("")
    setPending(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next, attribution: getAttribution() }),
      })
      const data = (await res.json()) as { message?: string; leadSaved?: boolean }
      const reply =
        data.message?.trim() ||
        "Sorry, something went wrong on my end. Please try again, or reach us on Viber."
      setMessages((m) => [...m, { role: "assistant", content: reply }])

      if (data.leadSaved && !leadCelebrated.current) {
        leadCelebrated.current = true
        track(ANALYTICS_EVENTS.chatbotQualifiedLead)
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

  return (
    <>
      {/* Panel */}
      <div
        role="dialog"
        aria-label="Solar Assistant"
        aria-hidden={!open}
        className={cn(
          "fixed right-4 bottom-44 z-50 flex h-[min(32rem,calc(100vh-9rem))] w-[min(23rem,calc(100vw-2rem))] origin-bottom-right flex-col overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-2xl transition duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none lg:bottom-24",
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
            <div
              key={i}
              className={cn(
                "max-w-[85%] rounded-2xl p-3 text-sm text-pretty",
                m.role === "assistant"
                  ? "rounded-tl-sm bg-muted"
                  : "ml-auto rounded-tr-sm bg-primary text-primary-foreground",
              )}
            >
              {m.content}
            </div>
          ))}

          {pending && (
            <div className="flex max-w-[85%] gap-1 rounded-2xl rounded-tl-sm bg-muted p-3" aria-label="Assistant is typing">
              <Dot /> <Dot className="[animation-delay:150ms]" /> <Dot className="[animation-delay:300ms]" />
            </div>
          )}

          {/* Quick-start questions — only before the visitor sends their first message. */}
          {messages.length === 1 && !pending && (
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => void send(q)}
                  className="rounded-full border bg-background px-3 py-1.5 text-xs text-foreground transition hover:bg-muted"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Persistent shortcuts to the form and a human. */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild size="sm" variant="outline">
              <Link href={`${siteConfig.primaryCta.href}?via=chat`}>
                Assessment form <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={siteConfig.contact.viber.href}>
                <Phone /> Talk to a human
              </a>
            </Button>
            {MESSENGER_HREF && (
              <Button asChild size="sm" variant="outline">
                <a href={MESSENGER_HREF} target="_blank" rel="noopener noreferrer">
                  <ExternalLink /> Message on Messenger
                </a>
              </Button>
            )}
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
