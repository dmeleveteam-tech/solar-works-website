import Link from "next/link"

import { Brand } from "@/components/brand"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Link href="/">
            <Brand />
          </Link>
        </div>
        {children}
      </div>
    </div>
  )
}
