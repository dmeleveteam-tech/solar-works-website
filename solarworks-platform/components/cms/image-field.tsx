"use client"

import * as React from "react"
import { CldUploadWidget } from "next-cloudinary"
import { ImageIcon, Loader2, Upload, X } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { CLOUDINARY_SIGN_ENDPOINT, CLOUDINARY_UPLOAD_OPTIONS } from "@/lib/cloudinary-upload"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

/**
 * CMS image field. Uploads a single image to Cloudinary and stores the
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
  error,
}: {
  label: string
  name: string
  defaultValue?: string | null
  required?: boolean
  /** Inline server validation message shown under the field. */
  error?: string
}) {
  const [url, setUrl] = React.useState(defaultValue ?? "")
  const inputId = React.useId()

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={inputId}>{label}</Label>

      {/* Submitted value: the uploaded URL, validated server-side like before. */}
      <input type="hidden" name={name} value={url} />

      <CldUploadWidget
        signatureEndpoint={CLOUDINARY_SIGN_ENDPOINT}
        options={CLOUDINARY_UPLOAD_OPTIONS.contentImage}
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
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" className="size-full object-cover" />
              ) : (
                <ImageIcon className="size-5" />
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
                {url ? "Replace" : "Upload image"}
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

      {required && !url ? (
        <p className="text-xs text-muted-foreground">Required.</p>
      ) : null}
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  )
}
