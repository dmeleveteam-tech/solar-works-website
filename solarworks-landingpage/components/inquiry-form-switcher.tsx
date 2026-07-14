"use client"

import * as React from "react"
import { FileText, ClipboardList } from "lucide-react"
import { cn } from "@/lib/utils"
import { GoogleFormEmbed } from "@/components/google-form-embed"
import { NativeInquiryForm } from "@/components/native-inquiry-form"

type Tab = "google" | "system"

const tabs: { id: Tab; label: string; sublabel: string; icon: React.ElementType }[] = [
  {
    id: "google",
    icon: FileText,
    label: "Google Form",
    sublabel: "Responses go to Google Sheets",
  },
  {
    id: "system",
    icon: ClipboardList,
    label: "Quick Inquiry",
    sublabel: "Responses go to our system",
  },
]

export function InquiryFormSwitcher({ defaultSolution }: { defaultSolution?: string }) {
  const [active, setActive] = React.useState<Tab>("google")

  return (
    <div className="flex flex-col gap-5">
      {/* Tab switcher */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl border bg-muted/40 p-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = active === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              className={cn(
                "relative flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-200",
                isActive
                  ? "bg-card shadow-sm ring-1 ring-foreground/[0.07]"
                  : "hover:bg-muted/60 text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-lg transition-colors",
                  isActive ? "bg-primary/15 text-primary" : "bg-foreground/[0.06] text-muted-foreground",
                )}
              >
                <Icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-sm font-semibold leading-tight",
                    isActive ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {tab.label}
                </span>
                <span className="block truncate text-xs text-muted-foreground">{tab.sublabel}</span>
              </span>

              {/* Active dot */}
              {isActive && (
                <span className="absolute right-3 top-3 size-2 rounded-full bg-primary" />
              )}
            </button>
          )
        })}
      </div>

      {/* Form panels */}
      <div className="relative">
        <div
          className={cn(
            "transition-all duration-300",
            active === "google" ? "opacity-100" : "pointer-events-none absolute inset-0 opacity-0",
          )}
        >
          <GoogleFormEmbed />
        </div>
        <div
          className={cn(
            "transition-all duration-300",
            active === "system" ? "opacity-100" : "pointer-events-none absolute inset-0 opacity-0",
          )}
        >
          <NativeInquiryForm defaultSolution={defaultSolution} />
        </div>
      </div>
    </div>
  )
}
