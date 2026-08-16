import Link from "next/link";
import { ReactNode } from "react";

export function AppHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-black/10 px-4 dark:border-white/10">
      <Link href="/" className="text-sm font-semibold tracking-tight">
        OmniDiagram
      </Link>
      <div className="flex items-center gap-2">{children}</div>
    </header>
  );
}
