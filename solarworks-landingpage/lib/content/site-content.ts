import type { LucideIcon } from "lucide-react"
import {
  ClipboardList,
  Home,
  PencilRuler,
  Wrench,
  ShieldCheck,
  BatteryFull,
  HeartHandshake,
  HardHat,
  Sparkles,
} from "lucide-react"

export type Step = {
  number: string
  title: string
  description: string
  icon: LucideIcon
}

export const howItWorks: Step[] = [
  {
    number: "01",
    title: "Share your bill",
    description: "Tell us your monthly consumption or electricity bill. That's all we need to start.",
    icon: ClipboardList,
  },
  {
    number: "02",
    title: "Site & roof assessment",
    description: "We assess your roof, space, and load profile to confirm what's actually right for you.",
    icon: Home,
  },
  {
    number: "03",
    title: "System design + proposal",
    description: "You get a personalized design and a clear proposal — no jargon, no surprise costs.",
    icon: PencilRuler,
  },
  {
    number: "04",
    title: "Installation + support",
    description: "Our team installs cleanly and stays with you for the life of the warranty.",
    icon: Wrench,
  },
]

export type TrustMarker = {
  title: string
  description: string
  icon: LucideIcon
}

export const trustMarkers: TrustMarker[] = [
  {
    title: "20-year panel warranty",
    description: "Tier-1 panels backed by a two-decade product and performance warranty.",
    icon: ShieldCheck,
  },
  {
    title: "10-year battery warranty",
    description: "Battery storage covered for a full decade of dependable backup.",
    icon: BatteryFull,
  },
  {
    title: "Lifetime after-sales support",
    description: "We stay reachable for the life of your system while products are under warranty.",
    icon: HeartHandshake,
  },
  {
    title: "Experienced engineering team",
    description: "Licensed engineers design every system around your real consumption.",
    icon: HardHat,
  },
  {
    title: "Clean, careful workmanship",
    description: "Tidy cable management and respect for your property, on every install.",
    icon: Sparkles,
  },
]

export type Stat = {
  value: string
  label: string
}

export const stats: Stat[] = [
  { value: "350+", label: "Systems installed" },
  { value: "2.4 MW", label: "Clean energy deployed" },
  { value: "20 yr", label: "Panel warranty" },
  { value: "4.9★", label: "Average client rating" },
]

export type Faq = {
  question: string
  answer: string
  category: "Cost & Savings" | "Warranties" | "Battery" | "Installation" | "General"
}

export const faqs: Faq[] = [
  {
    question: "How much does a solar system cost?",
    answer:
      "It depends on your consumption, roof, and whether you need battery backup. After a quick assessment we give you a clear, itemized proposal — no obligation and no surprise costs.",
    category: "Cost & Savings",
  },
  {
    question: "How much can I really save?",
    answer:
      "Savings depend on your usage pattern and system size. We model your actual bill rather than promise a fixed number, so the projection you see is grounded in your real consumption.",
    category: "Cost & Savings",
  },
  {
    question: "What warranties do you offer?",
    answer:
      "Panels carry a 20-year warranty and batteries a 10-year warranty, plus lifetime after-sales support while your products are under warranty.",
    category: "Warranties",
  },
  {
    question: "Do I need a battery?",
    answer:
      "Not always. If your goal is simply a lower bill and your grid is stable, grid-tied is the most cost-effective option. If you experience frequent brownouts, a hybrid system with battery keeps you powered.",
    category: "Battery",
  },
  {
    question: "How long does installation take?",
    answer:
      "Most residential installations are completed within a few days once the design is approved and materials are on site. We confirm the exact timeline in your proposal.",
    category: "Installation",
  },
  {
    question: "What is net metering?",
    answer:
      "Net metering lets a grid-tied system export surplus daytime energy back to the utility for credits. We handle the application and documentation as part of the project.",
    category: "General",
  },
]

export const homeFaqs = faqs.slice(0, 5)
