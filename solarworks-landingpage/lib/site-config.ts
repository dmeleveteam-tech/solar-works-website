/**
 * Single source of truth for brand, contact, and navigation.
 *
 * This file is intentionally the *only* place brand-specific values live, so the
 * site can be re-skinned for another installer by editing this file + theme
 * tokens + assets (see notes in the build guide). Pages and sections must read
 * from here rather than hardcoding company name, numbers, or links.
 */

export type NavLink = {
  label: string
  href: string
  description?: string
}

export type ContactChannel = {
  label: string
  value: string
  href: string
}

export const siteConfig = {
  name: "Solar Works",
  legalName: "Solar Works Energy Solutions",
  tagline: "Solar that works. Built around your life.",
  description:
    "From personalized system design to professional installation and lifetime support, Solar Works helps homes and businesses make the shift to clean energy with confidence.",
  url: "https://solarworks.ph",
  primaryCta: {
    label: "Get Your Free Solar Assessment",
    href: "/contact",
  },
  secondaryCta: {
    label: "Hear From Our Customers",
    href: "/#testimonials",
  },
  warranties: {
    panel: "20-Year Panel Warranty",
    battery: "10-Year Battery Warranty",
    support: "Lifetime After-Sales Support",
  },
  contact: {
    phone: { label: "Call", value: "+63 917 555 0142", href: "tel:+639175550142" },
    viber: { label: "Viber", value: "+63 917 555 0142", href: "viber://chat?number=%2B639175550142" },
    whatsapp: { label: "WhatsApp", value: "+63 917 555 0142", href: "https://wa.me/639175550142" },
    email: { label: "Email", value: "hello@solarworks.ph", href: "mailto:hello@solarworks.ph" },
  } satisfies Record<string, ContactChannel>,
  social: {
    facebook: "https://facebook.com/solarworks",
    instagram: "https://instagram.com/solarworks",
  },
  serviceAreas: ["Batangas", "Laguna", "Cavite", "Metro Manila", "Quezon"],
} as const

export const mainNav: NavLink[] = [
  { label: "Why Solar Works", href: "/why-solar-works", description: "What makes our work different" },
  { label: "Solar Solutions", href: "/solar-solutions", description: "Grid-tied, hybrid, and commercial" },
  { label: "Our Work", href: "/our-work", description: "Real installations and case studies" },
  { label: "Learning Center", href: "/learning-center", description: "Guides, FAQs, and solar basics" },
  { label: "About", href: "/about", description: "The team behind the work" },
]

export const footerNav: { title: string; links: NavLink[] }[] = [
  {
    title: "Explore",
    links: [
      { label: "Why Solar Works", href: "/why-solar-works" },
      { label: "Solar Solutions", href: "/solar-solutions" },
      { label: "Our Work", href: "/our-work" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Learning Center & FAQs", href: "/learning-center" },
      { label: "About Us", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Privacy & Terms", href: "/privacy" },
    ],
  },
]
