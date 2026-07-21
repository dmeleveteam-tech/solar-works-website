import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    // Hosts next/image is allowed to optimize. The CMS and customer portal
    // render testimonial/project images from these sources; keep in sync with
    // the marketing site's next.config.
    remotePatterns: [
      // YouTube thumbnails for testimonial video previews in the CMS.
      { protocol: "https", hostname: "img.youtube.com" },
      // Cloudinary — where real photos uploaded through the CMS are served.
      { protocol: "https", hostname: "res.cloudinary.com" },
      // Unsplash — placeholder imagery used by the seeded demo content.
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
}

export default nextConfig
