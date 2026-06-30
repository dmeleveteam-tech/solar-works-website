"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

// Match the marketing site: a single light theme (white + yellow). `forcedTheme`
// pins every user to light regardless of OS preference.
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
