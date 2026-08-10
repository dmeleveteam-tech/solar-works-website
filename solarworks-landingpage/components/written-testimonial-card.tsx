import { Quote } from "lucide-react"

import type { WrittenTestimonial } from "@/lib/content/testimonials"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function WrittenTestimonialCard({ item }: { item: WrittenTestimonial }) {
  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-5">
        <Quote className="size-7 text-primary/40" aria-hidden />
        <p className="flex-1 text-pretty leading-relaxed">{item.quote}</p>
        <div className="flex items-center gap-3 border-t pt-4">
          <Avatar>
            {item.photo ? <AvatarImage src={item.photo} alt="" /> : null}
            <AvatarFallback>{initials(item.name)}</AvatarFallback>
          </Avatar>
          <div className="text-sm">
            <p className="font-medium">{item.name}</p>
            <p className="text-muted-foreground">
              {[item.location, `${item.systemType}`].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        {item.sourceUrl ? (
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-primary hover:underline"
          >
            View original review ↗
          </a>
        ) : null}
      </CardContent>
    </Card>
  )
}
