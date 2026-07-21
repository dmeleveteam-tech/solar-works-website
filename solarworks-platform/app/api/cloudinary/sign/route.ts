import { NextResponse } from "next/server"

import { cloudinary } from "@/lib/cloudinary"
import { env } from "@/lib/env"
import { getSession } from "@/lib/session"
import { isRole, type Role } from "@/lib/permissions"

/**
 * Signs Cloudinary upload requests for `CldUploadWidget` (see
 * `lib/cloudinary-upload.ts`). Authorization mirrors the CMS/dashboard's role
 * model: the destination folder (part of the signed params) tells us which
 * roles may upload there, so unauthorized callers never get a valid
 * signature — deny by default.
 */
const CONTENT_ROLES: readonly Role[] = ["content_editor", "superadmin"]
const STAFF_ROLES: readonly Role[] = ["staff", "superadmin"]

function allowedRolesForFolder(folder: unknown): readonly Role[] | null {
  if (typeof folder !== "string") return null
  if (folder.startsWith("solarworks/documents")) return STAFF_ROLES
  if (folder.startsWith("solarworks/content-")) return CONTENT_ROLES
  return null
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const paramsToSign = body?.paramsToSign
  if (!paramsToSign || typeof paramsToSign !== "object") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const allowed = allowedRolesForFolder((paramsToSign as Record<string, unknown>).folder)
  if (!allowed) {
    return NextResponse.json({ error: "Invalid upload destination" }, { status: 400 })
  }

  const session = await getSession()
  const role = session?.user?.role
  if (!session || !isRole(role) || !allowed.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign as Record<string, unknown>,
    env.CLOUDINARY_API_SECRET!,
  )

  return NextResponse.json({ signature })
}
