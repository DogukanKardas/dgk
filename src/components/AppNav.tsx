import Link from "next/link";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { TurkeyClock } from "@/components/TurkeyClock";
import { isAppAuthEnabled } from "@/lib/auth-session";

const link =
  "rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white";

const active =
  "rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-white";

export function AppNav({
  current,
}: {
  current: "medya" | "gorevler" | "is" | "finans" | "crm" | "ayarlar";
}) {
  const authOn = isAppAuthEnabled();

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <span className="text-sm font-semibold tracking-tight text-zinc-100">
            DGK · Sheets
          </span>
          <TurkeyClock />
        </div>
        <nav className="flex flex-wrap gap-1">
          <Link
            href="/medya"
            className={current === "medya" ? active : link}
            prefetch
          >
            Medya
          </Link>
          <Link
            href="/gorevler"
            className={current === "gorevler" ? active : link}
            prefetch
          >
            Görevler
          </Link>
          <Link
            href="/is"
            className={current === "is" ? active : link}
            prefetch
          >
            İş
          </Link>
          <Link
            href="/finans/dashboard"
            className={current === "finans" ? active : link}
            prefetch
          >
            Finans
          </Link>
          <Link
            href="/crm"
            className={current === "crm" ? active : link}
            prefetch
          >
            CRM
          </Link>
          <Link
            href="/ayarlar"
            className={current === "ayarlar" ? active : link}
            prefetch
          >
            Ayarlar
          </Link>
          {authOn ? <LogoutButton /> : null}
        </nav>
      </div>
    </header>
  );
}
