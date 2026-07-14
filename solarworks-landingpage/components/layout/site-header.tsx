"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, Phone, ShieldCheck, ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { siteConfig, mainNav } from "@/lib/site-config"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet"

export function SiteHeader() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = React.useState(false)
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    // Fragment (not a wrapping div) so the announcement bar and header are
    // direct children of the layout's tall flex column. That makes the header's
    // sticky containing block the full page — it stays pinned while the bar
    // above it scrolls away. A short wrapper would un-stick the header.
    <>
      {/* Slim announcement bar — full-width, doubles as a CTA. Scrolls away;
          only the header below stays pinned. */}
      <Link
        href={siteConfig.primaryCta.href}
        className="group flex items-center justify-center gap-2 bg-primary px-4 py-2 text-center text-xs font-medium text-foreground transition-colors hover:bg-primary/90"
      >
        <ShieldCheck className="size-3.5 shrink-0 text-foreground" />
        <span>
          20-year panels, 10-year batteries, lifetime support
        </span>
        <span className="hidden items-center gap-1 font-semibold text-foreground sm:inline-flex">
          Book a free assessment
          <ArrowRight className="size-3.5 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
        </span>
      </Link>

      <header
        className={cn(
          "sticky top-0 z-50 w-full border-b transition-colors duration-200",
          scrolled
            ? "border-border bg-background/80 backdrop-blur-md"
            : "border-transparent bg-background/70 backdrop-blur-sm",
        )}
      >
        <div className="mx-auto grid h-20 max-w-[96rem] grid-cols-[auto_1fr_auto] items-center gap-4 px-4 sm:px-6 lg:px-10">
          <Logo />

          <nav
            className="hidden items-center justify-center gap-1 lg:flex"
            aria-label="Main"
          >
            {mainNav.map((item) => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-full px-4 py-2.5 text-base font-medium transition-colors",
                    active
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="hidden items-center justify-end gap-3 lg:flex">
            <Button asChild variant="ghost">
              <a href={siteConfig.contact.phone.href}>
                <Phone />
                {siteConfig.contact.phone.value}
              </a>
            </Button>
            <a
              href={siteConfig.social.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex size-11 items-center justify-center rounded-full hover:bg-muted text-[#1877F2] transition-colors"
              title="Visit our Facebook Page"
            >
              <svg
                viewBox="0 0 24 24"
                className="size-7 fill-current"
              >
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
            <Button asChild variant="dark" size="lg" className="gap-2 px-6 text-base font-semibold">
              <Link href={siteConfig.primaryCta.href}>
                Begin Solar Journey
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          {/* Mobile */}
          <div className="col-start-3 flex items-center justify-end gap-2 lg:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Open menu">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[88vw] max-w-sm">
                <SheetHeader>
                  <SheetTitle asChild>
                    <Logo />
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 px-4" aria-label="Mobile">
                  {mainNav.map((item) => (
                    <SheetClose asChild key={item.href}>
                      <Link
                        href={item.href}
                        className="rounded-lg px-3 py-3 text-base font-medium text-foreground hover:bg-muted"
                      >
                        {item.label}
                      </Link>
                    </SheetClose>
                  ))}
                </nav>
                <div className="mt-auto flex flex-col gap-2 p-4">
                  <SheetClose asChild>
                    <Button asChild size="lg" variant="dark">
                      <Link href={siteConfig.primaryCta.href}>
                        {siteConfig.primaryCta.label}
                      </Link>
                    </Button>
                  </SheetClose>
                  <Button asChild variant="outline" size="lg">
                    <a href={siteConfig.contact.phone.href}>
                      <Phone /> {siteConfig.contact.phone.value}
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <a href={siteConfig.social.facebook} target="_blank" rel="noopener noreferrer" className="gap-2.5 text-base">
                      <svg
                        viewBox="0 0 24 24"
                        className="size-5 fill-[#1877F2]"
                      >
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      Facebook Page
                    </a>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </>
  )
}
