"use client";

import { useEffect, useState } from "react";
import {
  formatTurkeyDateTimeMedium,
  TURKEY_TIMEZONE,
} from "@/lib/turkey-time";

export function TurkeyClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <time
      dateTime={now.toISOString()}
      suppressHydrationWarning
      className="whitespace-nowrap text-[11px] tabular-nums text-zinc-500 sm:text-xs"
      title={`Türkiye saati (${TURKEY_TIMEZONE}) — ödeme vadeleri bu takvim gününe göre hesaplanır`}
    >
      TRT {formatTurkeyDateTimeMedium(now)}
    </time>
  );
}
