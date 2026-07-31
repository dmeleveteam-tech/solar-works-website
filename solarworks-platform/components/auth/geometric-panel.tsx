/** Decorative left panel: overlapping diagonal triangles in a pale-to-golden
 *  yellow gradient. Pure CSS (clip-path), desktop only — the auth layout
 *  hides it below `lg`. */
export function GeometricPanel() {
  return (
    <div
      aria-hidden
      className="relative hidden h-full overflow-hidden bg-gradient-to-br from-[#FFF9C4] via-[#FBC02D] to-[#F9A825] lg:block"
    >
      <div
        className="absolute inset-0"
        style={{
          clipPath: "polygon(0 0, 58% 0, 22% 100%, 0% 100%)",
          background: "linear-gradient(135deg, #FFFDE7, #FFF3B0)",
          opacity: 0.9,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          clipPath: "polygon(38% 0, 78% 0, 100% 45%, 100% 100%, 58% 100%)",
          background: "linear-gradient(150deg, #FFE58A, #F9A825)",
          opacity: 0.85,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          clipPath: "polygon(18% 0, 42% 0, 68% 100%, 44% 100%)",
          background: "linear-gradient(160deg, #FFF59D, #FBC02D)",
          opacity: 0.9,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          clipPath: "polygon(70% 100%, 100% 100%, 100% 62%)",
          background: "linear-gradient(20deg, #F57F17, #F9A825)",
          opacity: 0.6,
        }}
      />
    </div>
  )
}
