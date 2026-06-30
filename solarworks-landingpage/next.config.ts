import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    // Hosts next/image is allowed to optimize. Keep this in sync with the
    // platform CMS: it serves the same testimonial/project images the
    // marketing site renders.
    remotePatterns: [
      // YouTube thumbnails for real customer testimonial videos.
      { protocol: "https", hostname: "img.youtube.com" },
      // UploadThing — where real Solar Works photos uploaded in the CMS live
      // (current "*.ufs.sh" app subdomains and the legacy utfs.io host).
      { protocol: "https", hostname: "utfs.io" },
      { protocol: "https", hostname: "*.ufs.sh" },
      // Unsplash — placeholder imagery used by the seeded demo content until
      // real photos are supplied.
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
}

export default nextConfig
