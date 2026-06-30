"use client"

import * as React from "react"
import Link from "next/link"
import { MessageSquareText, X, Bot, ArrowRight, Phone } from "lucide-react"

import { siteConfig } from "@/lib/site-config"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * Mock floating launcher for the AI Solar Assistant (a third-party platform in
 * production). It demonstrates the persistent entry point required across all
 * pages; the real widget replaces this panel.
 */
export function ChatLauncher() {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      {/* Panel */}
      <div
        role="dialog"
        aria-label="Solar Assistant"
        aria-hidden={!open}
        className={cn(
          "fixed right-4 bottom-44 z-50 w-[min(22rem,calc(100vw-2rem))] origin-bottom-right rounded-2xl border bg-popover text-popover-foreground shadow-2xl transition duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] lg:bottom-24",
          open
            ? "scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0",
        )}
      >
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
        <div className="space-y-3 p-4">
          <p className="rounded-2xl rounded-tl-sm bg-muted p-3 text-sm text-pretty">
            Hi! I&apos;m the {siteConfig.name} Solar Assistant. I can help you figure out which
            setup fits your home or business, then connect you with our team. Want to get an
            assessment, or ask a question first?
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild size="sm">
              <Link href={`${siteConfig.primaryCta.href}?via=chat`}>
                Get a solar assessment
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={siteConfig.contact.viber.href}>
                <Phone /> Talk to a human
              </a>
            </Button>
          </div>
          <p className="text-center text-[11px] text-muted-foreground">
            Mock preview — the live AI assistant connects here in production.
          </p>
        </div>
      </div>

      {/* Launcher button */}
      <Button
        size="icon-lg"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close Solar Assistant" : "Open Solar Assistant"}
        className="fixed right-4 bottom-24 z-50 size-14 rounded-full shadow-lg lg:bottom-6"
      >
        {open ? <X className="size-5" /> : <MessageSquareText className="size-5" />}
      </Button>
    </>
  )
}
