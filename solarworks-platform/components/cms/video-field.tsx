"use client"

import * as React from "react"
import { CldUploadWidget } from "next-cloudinary"
import { Film, Loader2, Upload, X } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { CLOUDINARY_SIGN_ENDPOINT, CLOUDINARY_UPLOAD_OPTIONS } from "@/lib/cloudinary-upload"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

/**
 * CMS video field. Uploads a single video file to Cloudinary and stores the
 * resulting URL in a hidden input named `name`, mirroring `ImageField`. Used
 * as an alternative to pasting a YouTube/Vimeo id — the uploaded file plays
 * directly on the marketing site.
 *
 * Also accepts a direct video URL typed/pasted in, for when the video is
 * already hosted somewhere (no file to upload yet) — same submitted field
 * either way.
 */
export function VideoField({
  label,
  name,
  defaultValue,
  error,
}: {
  label: string
  name: string
  defaultValue?: string | null
  /** Inline server validation message shown under the field. */
  error?: string
}) {
  const [url, setUrl] = React.useState(defaultValue ?? "")
  const inputId = React.useId()
  const urlInputId = React.useId()

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={inputId}>{label}</Label>

      {/* Submitted value: the uploaded (or pasted) URL, validated server-side. */}
      <input type="hidden" name={name} value={url} />

      <CldUploadWidget
        signatureEndpoint={CLOUDINARY_SIGN_ENDPOINT}
        options={CLOUDINARY_UPLOAD_OPTIONS.contentVideo}
        onSuccess={(result) => {
          const info = typeof result.info === "object" ? result.info : undefined
          if (info?.secure_url) setUrl(info.secure_url)
        }}
        onError={(err) => {
          const message = typeof err === "string" ? err : (err as { statusText?: string })?.statusText
          toast.error(message || "Upload failed.")
        }}
      >
        {({ open, isLoading }) => (
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-soft",
                "text-muted-foreground ring-1 ring-border",
              )}
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : url ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video src={url} className="size-full object-cover" muted />
              ) : (
                <Film className="size-5" />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                id={inputId}
                type="button"
                variant="outline"
                size="sm"
                disabled={isLoading}
                onClick={() => open()}
              >
                <Upload />
                {url ? "Replace" : "Upload video"}
              </Button>
              {url ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isLoading}
                  onClick={() => setUrl("")}
                  className="text-destructive hover:text-destructive"
                >
                  <X /> Remove
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </CldUploadWidget>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      <Label htmlFor={urlInputId} className="text-xs font-normal text-muted-foreground">
        Paste a direct video URL — no file to upload yet
      </Label>
      <input
        id={urlInputId}
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://…"
        className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />

      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  )
}
