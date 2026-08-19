import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"

import { solutionIcon, type Solution } from "@/lib/content/solutions"
import { siteConfig } from "@/lib/site-config"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function SolutionCard({ solution }: { solution: Solution }) {
  const Icon = solutionIcon(solution.slug)
  return (
    <Card className="group/card h-full">
      <CardContent className="flex h-full flex-col gap-4">
        <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <div>
          <h3 className="text-lg font-semibold">{solution.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{solution.forWho}</p>
        </div>
        <p className="text-sm text-pretty">{solution.summary}</p>
        <ul className="flex flex-col gap-2 text-sm">
          {solution.highlights.map((h) => (
            <li key={h} className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{h}</span>
            </li>
          ))}
        </ul>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="mt-auto -ml-2.5 self-start text-primary-strong hover:text-primary-strong"
        >
          <Link
            href={`${siteConfig.primaryCta.href}?solution=${solution.slug}`}
            aria-label={`Get an assessment for ${solution.name}`}
          >
            Get an assessment
            <ArrowRight className="transition-transform duration-200 ease-out group-hover/card:translate-x-0.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
