"use client"

import * as React from "react"
import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion"

import { cn } from "@/lib/utils"

type RevealProps = Omit<HTMLMotionProps<"div">, "ref"> & {
  /** Stagger delay in ms. Keep small (30–80ms between siblings). */
  delay?: number
  as?: keyof typeof motion
}

// Emil-strong ease-out curve (matches --ease-out-strong in globals.css).
const EASE_OUT_STRONG = [0.23, 1, 0.32, 1] as const

/**
 * Reveals children on scroll with a gentle fade + rise, powered by Framer Motion.
 *
 * Keeps the original Reveal API (`delay`, `as`, `className`) so existing call
 * sites work unchanged. Fires once when ~10% enters the viewport. Honors
 * prefers-reduced-motion by dropping the movement (keeping a quick fade).
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as = "div",
  ...props
}: RevealProps) {
  const reduce = useReducedMotion()
  const Tag = motion[as] as typeof motion.div

  return (
    <Tag
      className={cn(className)}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -80px 0px" }}
      transition={{
        duration: reduce ? 0.3 : 0.6,
        ease: EASE_OUT_STRONG,
        delay: delay / 1000,
      }}
      {...props}
    >
      {children}
    </Tag>
  )
}
