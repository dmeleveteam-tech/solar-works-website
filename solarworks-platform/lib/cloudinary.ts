import "server-only"
import { v2 as cloudinary } from "cloudinary"

import { env } from "./env"

/**
 * Server-only Cloudinary SDK instance, used by the upload-signing route to
 * sign params before the client uploads directly to Cloudinary. Never import
 * this from a Client Component — it carries `CLOUDINARY_API_SECRET`.
 */
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
})

export { cloudinary }
