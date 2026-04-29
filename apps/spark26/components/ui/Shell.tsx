import Image from "next/image";
import type { ReactNode } from "react";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen flex items-start justify-center px-6 pt-16 pb-24 sm:pt-24">
      <div className="w-full max-w-[520px] flex flex-col gap-5 fade-in">
        <header className="flex items-center">
          <Image
            src="/spark-26-white.svg"
            alt="SPARK26"
            width={479}
            height={85}
            priority
            className="h-9 w-auto"
          />
        </header>
        {children}
        <footer className="flex items-center justify-between text-[11px] text-[color-mix(in_srgb,var(--color-blue-100)_40%,transparent)]">
          <span>Fireblocks · SPARK26</span>
          <a
            className="underline-offset-4 hover:text-[var(--color-blue-100)] hover:underline"
            href="mailto:spark26@fireblocks.com"
          >
            spark26@fireblocks.com
          </a>
        </footer>
      </div>
    </main>
  );
}
