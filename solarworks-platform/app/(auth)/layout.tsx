import Image from "next/image"

import { GeometricPanel } from "@/components/auth/geometric-panel"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh w-full min-w-0 grid-cols-1 bg-white lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <GeometricPanel />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-12 text-center">
          <Image
            src="/images/solar-works-logo.png"
            alt=""
            width={112}
            height={112}
            className="size-24 object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.15)]"
            priority
          />
          <div className="space-y-1.5">
            <p className="font-heading text-3xl font-bold tracking-tight text-neutral-900">
              Solar<span className="text-white">Works</span>
            </p>
            <p className="text-xs font-semibold tracking-[0.3em] text-neutral-800/70 uppercase">
              Platform
            </p>
          </div>
        </div>
      </div>
      <div className="flex min-w-0 flex-col justify-center px-6 py-10 sm:px-12 sm:py-14">
        {children}
      </div>
    </div>
  )
}
