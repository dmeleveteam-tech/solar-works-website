import { generateReactHelpers } from "@uploadthing/react"

import type { OurFileRouter } from "@/app/api/uploadthing/core"

/**
 * Typed client helpers for UploadThing. We use the `useUploadThing` hook rather
 * than the prebuilt UploadButton so the CMS image field can match the rest of
 * the editor's styling instead of pulling in UploadThing's default component CSS.
 */
export const { useUploadThing, uploadFiles } = generateReactHelpers<OurFileRouter>()
