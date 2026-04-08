import type { FinansRowWithRow } from "@/lib/sheets/finance-sheet";
import { finansRowTipMatchesCanonical } from "@/lib/finance-tip-match";
import { canonicalTrDate, trDateStartOfDayMs } from "@/lib/tr-date-input";
import { trDateInSelectedTrPeriod } from "@/lib/work-contract-helpers";

export function finansTutarMinor(raw: string): number {
  const digits = String(raw ?? "").replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

export type FinansSheetPeriodTotals = {
  gelirByCurrency: Map<string, number>;
  giderByCurrency: Map<string, number>;
  /** Geçerli tarih olmayan satırlar (dönem dışı sayılmaz) */
  skippedNoDate: number;
};

/**
 * Finans sheet satırları: `tarih` seçilen TR dönemine düşen gelir/gider toplamları.
 * Fatura tipi burada dahil değildir.
 */
export function aggregateFinansSheetForPeriod(
  rows: FinansRowWithRow[],
  calendarYear: number,
  calendarMonth: number | null
): FinansSheetPeriodTotals {
  const gelirByCurrency = new Map<string, number>();
  const giderByCurrency = new Map<string, number>();
  let skippedNoDate = 0;

  for (const r of rows) {
    const tr = canonicalTrDate(r.tarih.trim());
    if (!tr || trDateStartOfDayMs(tr) === null) {
      skippedNoDate += 1;
      continue;
    }
    if (!trDateInSelectedTrPeriod(tr, calendarYear, calendarMonth)) continue;

    const minor = finansTutarMinor(r.tutar);
    if (minor <= 0) continue;

    const pb = (r.paraBirimi ?? "TRY").trim() || "TRY";

    if (finansRowTipMatchesCanonical(r.tip, "Gelir")) {
      gelirByCurrency.set(pb, (gelirByCurrency.get(pb) ?? 0) + minor);
    } else if (finansRowTipMatchesCanonical(r.tip, "Gider")) {
      giderByCurrency.set(pb, (giderByCurrency.get(pb) ?? 0) + minor);
    }
  }

  return { gelirByCurrency, giderByCurrency, skippedNoDate };
}

export type DashboardCurrencyRow = {
  paraBirimi: string;
  gelirMinor: number;
  giderMinor: number;
  bakiyeMinor: number;
};

export function mergeDashboardCurrencyRows(
  gelir: Map<string, number>,
  gider: Map<string, number>
): DashboardCurrencyRow[] {
  const keys = new Set<string>([...gelir.keys(), ...gider.keys()]);
  return [...keys]
    .sort((a, b) => a.localeCompare(b, "tr"))
    .map((paraBirimi) => {
      const g = gelir.get(paraBirimi) ?? 0;
      const d = gider.get(paraBirimi) ?? 0;
      return {
        paraBirimi,
        gelirMinor: g,
        giderMinor: d,
        bakiyeMinor: g - d,
      };
    });
}
