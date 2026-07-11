import { createUploadthing, type FileRouter } from "uploadthing/next"
import { UploadThingError } from "uploadthing/server"

import { getSession } from "@/lib/session"
import { isRole, type Role } from "@/lib/permissions"

/**
 * UploadThing file router for CMS imagery (project photos, testimonial
 * thumbnails/portraits). Authorization is enforced in the `middleware` — the
 * same `content_editor` / `superadmin` gate the CMS server actions use — so the
 * upload endpoint denies by default and only authenticated content managers can
 * push files. The resolved file URL is returned to the client and stored on the
 * content document as a plain URL string, leaving the existing Zod schemas and
 * server actions unchanged.
 */
const f = createUploadthing()

const CONTENT_ROLES: readonly Role[] = ["content_editor", "superadmin"]
const STAFF_ROLES: readonly Role[] = ["staff", "superadmin"]

/** Reject anyone whose signed-in role isn't in `allowed`. */
async function requireRoleUpload(allowed: readonly Role[]) {
  const session = await getSession()
  const role = session?.user?.role
  if (!session || !isRole(role) || !allowed.includes(role)) {
    throw new UploadThingError("Unauthorized")
  }
  return { userId: session.user.id }
}

export const ourFileRouter = {
  // Single image, capped at 4MB. Used for every CMS image field.
  contentImage: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(() => requireRoleUpload(CONTENT_ROLES))
    .onUploadComplete(({ metadata, file }) => {
      // Whatever is returned here is sent to the client `onClientUploadComplete`.
      return { url: file.ufsUrl, uploadedBy: metadata.userId }
    }),

  // Customer-portal documents (proposal PDF, contract, warranty…). Staff/admin
  // only; the resolved URL is stored on the customer's project document.
  customerDocument: f({
    pdf: { maxFileSize: "16MB", maxFileCount: 1 },
    image: { maxFileSize: "8MB", maxFileCount: 1 },
  })
    .middleware(() => requireRoleUpload(STAFF_ROLES))
    .onUploadComplete(({ metadata, file }) => {
      return { url: file.ufsUrl, uploadedBy: metadata.userId }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
