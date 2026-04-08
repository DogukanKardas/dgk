"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tab =
  "rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100";

const tabActive =
  "rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-white";

export function IsSubNav() {
  const pathname = usePathname();
  const isFinans = pathname.startsWith("/is/finans");

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-zinc-800 pb-4">
      <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        İş menüsü
      </span>
      <Link href="/is" className={!isFinans ? tabActive : tab} prefetch>
        İşler
      </Link>
      <Link
        href="/is/finans"
        className={isFinans ? tabActive : tab}
        prefetch
      >
        Ödemeler
      </Link>
    </div>
  );
}
