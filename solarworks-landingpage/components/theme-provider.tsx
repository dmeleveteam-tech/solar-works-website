"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

// Single light theme only (white + yellow). Dark mode is intentionally
// disabled: `forcedTheme` pins every visitor to light regardless of their
// OS preference, so the `.dark` styles never apply and the hidden "d"
// toggle has been removed.
function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      forcedTheme="light"
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}

export { ThemeProvider }
