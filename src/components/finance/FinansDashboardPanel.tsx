"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  aggregateFinansSheetForPeriod,
  mergeDashboardCurrencyRows,
  type DashboardCurrencyRow,
} from "@/lib/finance-dashboard-aggregate";
import {
  summarizeWorkPaidForSelectedPeriod,
  trDateYearMonth,
  type WorkMoneyByCurrency,
} from "@/lib/work-contract-helpers";
import { formatTodayTrDate } from "@/lib/tr-date-input";
import { formatTrAmountDisplay } from "@/lib/tr-amount-input";
import type { FinansRowWithRow } from "@/lib/sheets/finance-sheet";
import type { WorkRowWithRow } from "@/lib/sheets/work-sheet";

const AY_ADLARI = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
] as const;

function defaultTurkeyYearMonth(): { year: number; month: number } {
  const tr = formatTodayTrDate(new Date());
  const ym = trDateYearMonth(tr);
  if (ym) return ym;
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function yearOptions(anchorYear: number): number[] {
  const lo = anchorYear - 6;
  const hi = anchorYear + 6;
  const out: number[] = [];
  for (let y = lo; y <= hi; y++) out.push(y);
  return out;
}

function formatMinor(minor: number): string {
  if (minor === 0) return "—";
  return formatTrAmountDisplay(String(minor));
}

function formatSignedMinor(minor: number): string {
  if (minor === 0) return "—";
  const abs = formatTrAmountDisplay(String(Math.abs(minor)));
  if (minor < 0) return `−${abs}`;
  return abs;
}

function MinorTable({
  rows,
  valueKey,
}: {
  rows: DashboardCurrencyRow[];
  valueKey: "gelirMinor" | "giderMinor" | "bakiyeMinor";
}) {
  const lines = rows.filter((r) => r[valueKey] !== 0);
  if (lines.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-zinc-500">
        Bu dönem için tutar yok.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[260px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-700 text-left text-xs text-zinc-400">
            <th className="py-2 pr-3 font-medium">Para birimi</th>
            <th className="py-2 font-medium tabular-nums">Tutar</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((row) => {
            const v = row[valueKey];
            return (
              <tr
                key={row.paraBirimi}
                className="border-b border-zinc-800/80 text-zinc-200"
              >
                <td className="py-2 pr-3 font-medium">{row.paraBirimi}</td>
                <td className="py-2 tabular-nums text-zinc-100">
                  {valueKey === "bakiyeMinor"
                    ? formatSignedMinor(v)
                    : formatMinor(v)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function WorkMoneyBlock({ rows }: { rows: WorkMoneyByCurrency[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-zinc-500">
        Bu dönem için tutar yok.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[260px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-700 text-left text-xs text-zinc-400">
            <th className="py-2 pr-3 font-medium">Para birimi</th>
            <th className="py-2 font-medium tabular-nums">Tutar</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.paraBirimi}
              className="border-b border-zinc-800/80 text-zinc-200"
            >
              <td className="py-2 pr-3 font-medium">{row.paraBirimi}</td>
              <td className="py-2 tabular-nums text-zinc-100">
                {formatMinor(row.tutarMinor)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FinansDashboardPanel() {
  const [finansRows, setFinansRows] = useState<FinansRowWithRow[]>([]);
  const [workRows, setWorkRows] = useState<WorkRowWithRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const anchor = useMemo(() => defaultTurkeyYearMonth(), []);
  const [granularity, setGranularity] = useState<"aylik" | "yillik">("yillik");
  const [filterYear, setFilterYear] = useState(anchor.year);
  const [filterMonth, setFilterMonth] = useState(anchor.month);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [finRes, isRes] = await Promise.all([
        fetch("/api/finans", { cache: "no-store" }),
        fetch("/api/is", { cache: "no-store" }),
      ]);
      const finData = (await finRes.json()) as
        | { rows: FinansRowWithRow[] }
        | { error: string };
      const isData = (await isRes.json()) as
        | { rows: WorkRowWithRow[] }
        | { error: string };

      if (!finRes.ok) {
        setFinansRows([]);
        setError("error" in finData ? finData.error : `Finans ${finRes.status}`);
      } else {
        setFinansRows("rows" in finData ? finData.rows : []);
      }

      if (isRes.ok && "rows" in isData && Array.isArray(isData.rows)) {
        setWorkRows(isData.rows);
      } else {
        setWorkRows([]);
      }
    } catch {
      setError("Ağ hatası");
      setFinansRows([]);
      setWorkRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const calendarMonth = granularity === "yillik" ? null : filterMonth;

  const sheetTotals = useMemo(
    () =>
      aggregateFinansSheetForPeriod(finansRows, filterYear, calendarMonth),
    [finansRows, filterYear, calendarMonth]
  );

  const workPaid = useMemo(
    () => summarizeWorkPaidForSelectedPeriod(workRows, filterYear, calendarMonth),
    [workRows, filterYear, calendarMonth]
  );

  /** Üst kartlar: gelir = Finans sheet (tip Gelir) + İş’te bu dönem ödenenler */
  const combinedGelirByCurrency = useMemo(() => {
    const m = new Map(sheetTotals.gelirByCurrency);
    for (const w of workPaid) {
      if (w.tutarMinor <= 0) continue;
      m.set(
        w.paraBirimi,
        (m.get(w.paraBirimi) ?? 0) + w.tutarMinor
      );
    }
    return m;
  }, [sheetTotals.gelirByCurrency, workPaid]);

  const mergedRows = useMemo(
    () =>
      mergeDashboardCurrencyRows(
        combinedGelirByCurrency,
        sheetTotals.giderByCurrency
      ),
    [combinedGelirByCurrency, sheetTotals.giderByCurrency]
  );

  const periodLabel =
    granularity === "yillik"
      ? `${filterYear} (tüm yıl)`
      : `${AY_ADLARI[filterMonth - 1] ?? ""} ${filterYear}`;

  const filterSelect =
    "rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200";

  const sheetRowCount = finansRows.length;

  if (loading && finansRows.length === 0 && !error) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-6 text-sm text-zinc-500">
        Özet yükleniyor…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
            Dashboard
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Üstteki <strong className="text-zinc-300">toplam gelir</strong> ve{" "}
            <strong className="text-zinc-300">bakiye</strong>, Finans sheet’teki
            gelir satırlarına (işlem{" "}
            <span className="font-mono text-zinc-400">tarih</span>i) ek olarak
            aynı dönemde İş sözleşmesinde ödenen tutarları da içerir. Gider
            yalnızca sheet’ten gelir. Para birimleri ayrı satırlarda; kur
            dönüşümü yoktur.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="shrink-0 rounded-lg border border-zinc-600 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
        >
          Yenile
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-amber-500/35 bg-amber-950/25 px-4 py-3 text-sm text-amber-100">
          Finans verisi alınamadı: {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 rounded-xl border border-zinc-700 bg-zinc-900/50 p-4">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Dönem
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setGranularity("aylik")}
            className={
              granularity === "aylik"
                ? "rounded-lg bg-zinc-700 px-3 py-1.5 text-xs font-medium text-white"
                : "rounded-lg border border-zinc-600 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
            }
          >
            Aylık
          </button>
          <button
            type="button"
            onClick={() => setGranularity("yillik")}
            className={
              granularity === "yillik"
                ? "rounded-lg bg-zinc-700 px-3 py-1.5 text-xs font-medium text-white"
                : "rounded-lg border border-zinc-600 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
            }
          >
            Yıllık
          </button>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(Number(e.target.value))}
            className={filterSelect}
          >
            {yearOptions(anchor.year).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          {granularity === "aylik" ? (
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(Number(e.target.value))}
              className={filterSelect}
            >
              {AY_ADLARI.map((ad, i) => (
                <option key={ad} value={i + 1}>
                  {ad}
                </option>
              ))}
            </select>
          ) : null}
          <span className="text-xs text-zinc-500">Seçim: {periodLabel}</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-950/15 px-3 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-emerald-200/95">
            Toplam gelir
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Finans sheet (
            <span className="font-mono text-zinc-400">tip</span> = Gelir,{" "}
            <span className="font-mono text-zinc-400">tarih</span>) + bu dönemde
            İş’te ödenenler (tek seferlik dahil).
          </p>
          <MinorTable rows={mergedRows} valueKey="gelirMinor" />
        </div>
        <div className="rounded-lg border border-rose-500/25 bg-rose-950/15 px-3 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-rose-200/95">
            Toplam gider (Finans sheet)
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            <span className="font-mono text-zinc-400">tip</span> = Gider, aynı
            dönem filtresi.
          </p>
          <MinorTable rows={mergedRows} valueKey="giderMinor" />
        </div>
        <div className="rounded-lg border border-sky-500/25 bg-sky-950/15 px-3 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-sky-200/95">
            Toplam bakiye
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            (Sheet gelir + İş ödemeleri) − sheet gider, para birimi bazında.
          </p>
          <MinorTable rows={mergedRows} valueKey="bakiyeMinor" />
        </div>
      </div>

      <div className="rounded-lg border border-violet-500/20 bg-violet-950/10 px-3 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-violet-200/95">
          İş kaynaklı ödenenler (aynı dönem)
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Bu tutarlar üstteki <strong className="text-zinc-400">toplam gelir</strong>{" "}
          kartına da eklenir (çift kayıt riski: aynı ödemeyi hem sheet’e hem İş’e
          yazdıysanız iki kez sayılır). Detay ve güncelleme:{" "}
          <Link
            href="/is/finans"
            className="text-sky-400 underline decoration-sky-400/40 hover:decoration-sky-400"
          >
            İş → Ödemeler
          </Link>
          .
        </p>
        <WorkMoneyBlock rows={workPaid} />
      </div>

      <p className="text-xs text-zinc-600">
        Finans sheet’te {sheetRowCount} satır okundu. Sheet gelir/gider
        özeti işlem <span className="font-mono text-zinc-500">tarih</span> alanına
        göre; tarihi boş veya geçersiz {sheetTotals.skippedNoDate} satır bu
        filtreye dahil edilmedi. İş ödemeleri ödeme tarihine (veya tek seferlik
        yedek kuralına) göre aynı dönemle eşleşir.{" "}
        <strong className="text-zinc-500">Fatura</strong> tipi özet kartlarına
        dahil değildir.
      </p>
    </div>
  );
}
