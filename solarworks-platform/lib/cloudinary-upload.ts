import type { CloudinaryUploadWidgetOptions } from "next-cloudinary"

/**
 * Per-field Cloudinary upload widget options, shared by every CMS upload
 * field (`components/cms/image-field.tsx`, `video-field.tsx`,
 * `components/projects/projects-manager.tsx`). The `folder` also doubles as
 * the role-scope key the signing route (`app/api/cloudinary/sign/route.ts`)
 * uses to decide who may upload there — keep them in sync.
 */
export const CLOUDINARY_SIGN_ENDPOINT = "/api/cloudinary/sign"

export const CLOUDINARY_UPLOAD_OPTIONS: Record<
  "contentImage" | "contentVideo" | "customerDocument",
  CloudinaryUploadWidgetOptions
> = {
  contentImage: {
    folder: "solarworks/content-images",
    maxFileSize: 4 * 1024 * 1024,
    maxFiles: 1,
    multiple: false,
    sources: ["local"],
    clientAllowedFormats: ["image"],
  },
  contentVideo: {
    folder: "solarworks/content-videos",
    maxFileSize: 64 * 1024 * 1024,
    maxFiles: 1,
    multiple: false,
    sources: ["local"],
    clientAllowedFormats: ["video"],
  },
  customerDocument: {
    folder: "solarworks/documents",
    maxFileSize: 16 * 1024 * 1024,
    maxFiles: 1,
    multiple: false,
    sources: ["local"],
    clientAllowedFormats: ["pdf", "png", "jpg", "jpeg"],
  },
}
