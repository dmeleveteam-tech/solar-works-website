"use client"

import * as React from "react"
import { motion, useReducedMotion } from "framer-motion"

import { cn } from "@/lib/utils"

const EASE = [0.23, 1, 0.32, 1] as const

/** Junction dots that sit on the path. [x, y] in the 800×400 viewBox. */
const NODES: ReadonlyArray<readonly [number, number]> = [
  [120, 80],
  [360, 200],
  [560, 120],
  [700, 300],
  [220, 320],
]

/**
 * Decorative line-art "energy path" — subtle connected lines with small amber
 * node dots, evoking energy flowing through a system. Purely decorative
 * (aria-hidden, pointer-events: none). On scroll into view the lines draw
 * themselves and the nodes give a gentle, slow pulse.
 *
 * Honors prefers-reduced-motion: renders fully drawn and static.
 */
export function PathGraphic({ className }: { className?: string }) {
  const reduce = useReducedMotion()

  const lineProps = reduce
    ? { initial: { pathLength: 1, opacity: 0.5 } }
    : {
        initial: { pathLength: 0, opacity: 0 },
        whileInView: { pathLength: 1, opacity: 0.5 },
        viewport: { once: true },
        transition: { duration: 1.6, ease: EASE },
      }

  return (
    <svg
      aria-hidden
      viewBox="0 0 800 400"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
      className={cn("pointer-events-none select-none", className)}
    >
      <g stroke="currentColor" strokeWidth={1.25} strokeLinecap="round">
        <motion.path d="M120 80 L360 200 L560 120 L700 300" {...lineProps} />
        <motion.path
          d="M360 200 L220 320"
          {...lineProps}
          transition={reduce ? undefined : { duration: 1.2, ease: EASE, delay: 0.3 }}
        />
        <motion.path
          d="M560 120 C 620 60, 700 60, 760 110"
          {...lineProps}
          transition={reduce ? undefined : { duration: 1.2, ease: EASE, delay: 0.5 }}
        />
      </g>

      {NODES.map(([cx, cy], i) => (
        <React.Fragment key={`${cx}-${cy}`}>
          {!reduce ? (
            <circle cx={cx} cy={cy} r={5} fill="none" className="stroke-primary/40">
              <animate
                attributeName="r"
                values="5;11;5"
                dur="3s"
                begin={`${i * 0.5}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.5;0;0.5"
                dur="3s"
                begin={`${i * 0.5}s`}
                repeatCount="indefinite"
              />
            </circle>
          ) : null}
          <motion.circle
            cx={cx}
            cy={cy}
            r={5}
            className="fill-primary"
            initial={reduce ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
            whileInView={reduce ? undefined : { scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={
              reduce
                ? undefined
                : { duration: 0.4, ease: EASE, delay: 0.6 + i * 0.12 }
            }
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />
        </React.Fragment>
      ))}
    </svg>
  )
}
