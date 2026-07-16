import { ImageResponse } from "next/og"

// Apple touch icon for iOS home-screen bookmarks. Apple ignores transparency
// and applies its own rounding, so we fill the full square with the brand
// yellow and center the "SW" mark.
export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f6c445",
          color: "#141210",
          fontSize: 104,
          fontWeight: 800,
          letterSpacing: -4,
          fontFamily: "sans-serif",
        }}
      >
        SW
      </div>
    ),
    { ...size },
  )
}
