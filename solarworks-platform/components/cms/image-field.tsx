"use client"

import * as React from "react"
import { ImageIcon, Loader2, Upload, X } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { useUploadThing } from "@/lib/uploadthing"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

/**
 * CMS image field. Uploads a single image to UploadThing and stores the
 * resulting URL in a hidden input named `name`, so the surrounding form submits
 * it exactly like the old "paste a URL" input did — the server actions and Zod
 * schemas (which still expect a URL string) are unchanged.
 *
 * Shows a thumbnail of the current image with replace/remove controls. While an
 * upload is in flight the controls are disabled and a spinner is shown.
 */
export function ImageField({
  label,
  name,
  defaultValue,
  required,
}: {
  label: string
  name: string
  defaultValue?: string | null
  required?: boolean
}) {
  const [url, setUrl] = React.useState(defaultValue ?? "")
  const inputId = React.useId()

  const { startUpload, isUploading } = useUploadThing("contentImage", {
    onClientUploadComplete: (files) => {
      const next = files[0]?.ufsUrl
      if (next) setUrl(next)
    },
    onUploadError: (e) => {
      toast.error(e.message || "Upload failed.")
    },
  })

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Reset the input so picking the same file again still fires onChange.
    e.target.value = ""
    if (file) void startUpload([file])
  }

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={inputId}>{label}</Label>

      {/* Submitted value: the uploaded URL, validated server-side like before. */}
      <input type="hidden" name={name} value={url} />

      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted",
            "text-muted-foreground",
          )}
        >
          {isUploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="size-full object-cover" />
          ) : (
            <ImageIcon className="size-5" />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            id={inputId}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={onPick}
            disabled={isUploading}
            // Surface the browser's "required" hint only when nothing is set yet.
            required={required && !url}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={() => document.getElementById(inputId)?.click()}
          >
            <Upload />
            {url ? "Replace" : "Upload image"}
          </Button>
          {url ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isUploading}
              onClick={() => setUrl("")}
              className="text-destructive hover:text-destructive"
            >
              <X /> Remove
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
