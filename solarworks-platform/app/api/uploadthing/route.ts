import { createRouteHandler } from "uploadthing/next"

import { ourFileRouter } from "./core"

/** UploadThing GET/POST handler. Reads UPLOADTHING_TOKEN from the environment. */
export const { GET, POST } = createRouteHandler({ router: ourFileRouter })
