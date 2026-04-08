/** İş ve ödeme vadeleri için referans zaman dilimi (Türkiye). */
export const TURKEY_TIMEZONE = "Europe/Istanbul";

/**
 * Verilen anın Türkiye takvimindeki günü (yıl, ay, gün).
 * DST ve sunucu TZ’sinden bağımsız.
 */
export function getTurkeyYmd(instant: Date = new Date()): {
  y: number;
  m: number;
  d: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TURKEY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const num = (t: Intl.DateTimeFormatPartTypes) =>
    parseInt(parts.find((p) => p.type === t)?.value ?? "NaN", 10);
  return { y: num("year"), m: num("month"), d: num("day") };
}

/** Sivil tarih → UTC gün numarası (gün farkı için). */
export function civilUtcDayNumber(y: number, m: number, d: number): number {
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

export function formatTurkeyDateTimeMedium(instant: Date = new Date()): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: TURKEY_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(instant);
}
