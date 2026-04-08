"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tab =
  "rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100";

const tabActive =
  "rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-white";

export function FinansSubNav() {
  const pathname = usePathname();

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-zinc-800 pb-4">
      <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Finans
      </span>
      <Link
        href="/finans/dashboard"
        className={
          pathname.startsWith("/finans/dashboard") ? tabActive : tab
        }
        prefetch
      >
        Dashboard
      </Link>
      <Link
        href="/finans/gelir"
        className={pathname.startsWith("/finans/gelir") ? tabActive : tab}
        prefetch
      >
        Gelir
      </Link>
      <Link
        href="/finans/gider"
        className={pathname.startsWith("/finans/gider") ? tabActive : tab}
        prefetch
      >
        Gider
      </Link>
      <Link
        href="/finans/fatura"
        className={pathname.startsWith("/finans/fatura") ? tabActive : tab}
        prefetch
      >
        Fatura
      </Link>
    </div>
  );
}
