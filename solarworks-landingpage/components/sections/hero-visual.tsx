"use client"

import * as React from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Sun, TrendingDown, Leaf, Zap } from "lucide-react"

import { PathGraphic } from "@/components/path-graphic"

const BARS = [38, 52, 44, 70, 58, 86, 64]
const EASE = [0.23, 1, 0.32, 1] as const

/** A floating chip that gently bobs (disabled under reduced-motion). */
function FloatChip({
  className,
  delay = 0,
  children,
}: {
  className?: string
  delay?: number
  children: React.ReactNode
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { y: 0 }}
      animate={reduce ? undefined : { y: [0, -8, 0] }}
      transition={
        reduce
          ? undefined
          : { duration: 5, ease: "easeInOut", repeat: Infinity, delay }
      }
    >
      {children}
    </motion.div>
  )
}

export function HeroVisual() {
  const reduce = useReducedMotion()
  return (
    <div className="relative mx-auto w-full max-w-md lg:mr-0">
      <PathGraphic className="absolute -inset-6 -z-10 text-foreground/10" />

      {/* Monitoring panel — a nod to the Solar Works app */}
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
        className="rounded-3xl bg-card p-6 shadow-xl ring-1 ring-foreground/10"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="section-label">Today&apos;s energy</p>
            <p className="mt-1.5 font-heading text-3xl font-bold tracking-tight">
              5,032 <span className="text-lg font-medium text-muted-foreground">kWh</span>
            </p>
          </div>
          <span className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary">
            <Sun className="size-5" />
          </span>
        </div>

        {/* Mini bar chart */}
        <div className="mt-6 flex h-28 items-end gap-2">
          {BARS.map((h, i) => (
            <div key={i} className="flex flex-1 items-end self-stretch">
              <motion.div
                className="w-full rounded-t-md bg-gradient-to-t from-primary/40 to-primary"
                style={{ height: `${h}%`, originY: 1 }}
                initial={reduce ? { scaleY: 1 } : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={
                  reduce ? { duration: 0 } : { duration: 0.5, ease: EASE, delay: 0.3 + i * 0.06 }
                }
              />
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between text-[11px] text-muted-foreground">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
      </motion.div>

      {/* Floating chips */}
      <FloatChip
        delay={0.2}
        className="absolute -top-5 -right-3 rounded-2xl bg-card p-3 shadow-lg ring-1 ring-foreground/10 sm:-right-8"
      >
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <TrendingDown className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold leading-none">~70% lower</p>
            <p className="text-[11px] text-muted-foreground">monthly bill</p>
          </div>
        </div>
      </FloatChip>

      <FloatChip
        delay={1.1}
        className="absolute -bottom-6 -left-3 rounded-2xl bg-card p-3 shadow-lg ring-1 ring-foreground/10 sm:-left-8"
      >
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-primary/15 text-primary">
            <Leaf className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold leading-none">4.2 t</p>
            <p className="text-[11px] text-muted-foreground">CO₂ saved</p>
          </div>
        </div>
      </FloatChip>

      <FloatChip
        delay={2}
        className="absolute top-1/2 -right-4 hidden rounded-2xl bg-card p-3 shadow-lg ring-1 ring-foreground/10 sm:block lg:-right-10"
      >
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-primary/15 text-primary">
            <Zap className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold leading-none">₱232K</p>
            <p className="text-[11px] text-muted-foreground">saved / year</p>
          </div>
        </div>
      </FloatChip>
    </div>
  )
}
