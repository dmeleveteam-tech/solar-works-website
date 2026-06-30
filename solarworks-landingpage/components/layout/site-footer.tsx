import Link from "next/link"
import { Mail, Phone, MessageCircle } from "lucide-react"

import { siteConfig, footerNav } from "@/lib/site-config"
import { Logo } from "@/components/logo"
import { FacebookIcon, InstagramIcon } from "@/components/brand-icons"
import { NewsletterSignup } from "@/components/newsletter-signup"

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t bg-muted/30">
      <div className="mx-auto max-w-[96rem] px-4 py-16 sm:px-6 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-sm text-muted-foreground">
              {siteConfig.description}
            </p>
            <div className="mt-5 flex gap-2">
              <SocialLink href={siteConfig.social.facebook} label="Facebook">
                <FacebookIcon className="size-4" />
              </SocialLink>
              <SocialLink href={siteConfig.social.instagram} label="Instagram">
                <InstagramIcon className="size-4" />
              </SocialLink>
            </div>
          </div>

          {footerNav.map((group) => (
            <div key={group.title}>
              <h3 className="section-label">{group.title}</h3>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <NewsletterSignup />
        </div>

        <div className="mt-12 grid gap-3 border-t pt-8 sm:grid-cols-2 lg:grid-cols-4">
          <ContactRow icon={<Phone className="size-4" />} {...siteConfig.contact.phone} />
          <ContactRow icon={<MessageCircle className="size-4" />} {...siteConfig.contact.viber} />
          <ContactRow icon={<MessageCircle className="size-4" />} {...siteConfig.contact.whatsapp} />
          <ContactRow icon={<Mail className="size-4" />} {...siteConfig.contact.email} />
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} {siteConfig.legalName}. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy Notice
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Terms of Use
            </Link>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Serving {siteConfig.serviceAreas.join(", ")}.
        </p>
      </div>

      {/* Large faded wordmark */}
      <div
        aria-hidden
        className="pointer-events-none -mt-4 select-none overflow-hidden px-4 sm:px-6 lg:px-10"
      >
        <p className="font-heading text-[18vw] leading-[0.8] font-extrabold tracking-tighter text-foreground/[0.04]">
          {siteConfig.name}
        </p>
      </div>
    </footer>
  )
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string
  label: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      aria-label={label}
      target="_blank"
      rel="noreferrer"
      className="grid size-9 place-items-center rounded-full border bg-background text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
    </a>
  )
}

function ContactRow({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode
  label: string
  value: string
  href: string
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-lg p-2 text-sm transition-colors hover:bg-background"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-xs text-muted-foreground">{label}</span>
        <span className="block truncate font-medium">{value}</span>
      </span>
    </a>
  )
}
