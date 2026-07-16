import { ImageResponse } from "next/og"

// Branded "SW" tile used as the app icon in browser tabs, bookmarks, and rich
// link unfurls — a step up from the flat favicon.ico. Matches the brand yellow.
export const size = { width: 32, height: 32 }
export const contentType = "image/png"

export default function Icon() {
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
          fontSize: 20,
          fontWeight: 800,
          letterSpacing: -1,
          borderRadius: 7,
          fontFamily: "sans-serif",
        }}
      >
        SW
      </div>
    ),
    { ...size },
  )
}
