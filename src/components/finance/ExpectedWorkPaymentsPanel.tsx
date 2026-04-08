"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  summarizeWorkPaidForSelectedPeriod,
  summarizeWorkUnpaidForSelectedPeriod,
  trDateYearMonth,
  type WorkMoneyByCurrency,
} from "@/lib/work-contract-helpers";
import { formatTodayTrDate } from "@/lib/tr-date-input";
import { formatTrAmountDisplay } from "@/lib/tr-amount-input";
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

function formatMinor(minor: number): string {
  if (minor <= 0) return "—";
  return formatTrAmountDisplay(String(minor));
}

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

function MoneyTable({ rows }: { rows: WorkMoneyByCurrency[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-zinc-500">
        Bu dönem için tutar yok.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[280px] border-collapse text-sm">
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

export function ExpectedWorkPaymentsPanel() {
  const [rows, setRows] = useState<WorkRowWithRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const anchor = useMemo(() => defaultTurkeyYearMonth(), []);
  const [granularity, setGranularity] = useState<"aylik" | "yillik">("aylik");
  const [filterYear, setFilterYear] = useState(anchor.year);
  const [filterMonth, setFilterMonth] = useState(anchor.month);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/is", { cache: "no-store" });
      const data = (await res.json()) as
        | { rows: WorkRowWithRow[] }
        | { error: string };
      if (!res.ok) {
        setError("error" in data ? data.error : `Hata ${res.status}`);
        setRows([]);
        return;
      }
      setRows("rows" in data ? data.rows : []);
    } catch {
      setError("Ağ hatası");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const calendarMonth = granularity === "yillik" ? null : filterMonth;

  const paidInPeriod = useMemo(
    () =>
      summarizeWorkPaidForSelectedPeriod(rows, filterYear, calendarMonth),
    [rows, filterYear, calendarMonth]
  );

  const unpaidInPeriod = useMemo(
    () =>
      summarizeWorkUnpaidForSelectedPeriod(rows, filterYear, calendarMonth),
    [rows, filterYear, calendarMonth]
  );

  const periodLabel =
    granularity === "yillik"
      ? `${filterYear} (tüm yıl)`
      : `${AY_ADLARI[filterMonth - 1] ?? ""} ${filterYear}`;

  if (loading && rows.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 text-sm text-zinc-500">
        İş kayıtları yükleniyor…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-amber-500/35 bg-amber-950/25 px-4 py-3 text-sm text-amber-100">
        Özet yüklenemedi: {error}
      </div>
    );
  }

  const filterSelect =
    "rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200";

  return (
    <div className="space-y-4 rounded-xl border border-zinc-700 bg-zinc-900/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">
            İş kaynaklı ödeme özeti
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-zinc-500">
            Ödenen ve bekleyen tutarlar (çok taksitli sözleşmeler ve{" "}
            <strong className="font-medium text-zinc-400">tek seferlik</strong>{" "}
            işler), seçtiğiniz aylık veya yıllık döneme göre filtrelenir.
            Güncellemek için{" "}
            <Link
              href="/is/finans"
              className="text-sky-400 underline decoration-sky-400/40 hover:decoration-sky-400"
            >
              İş → Ödemeler
            </Link>
            .
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          Yenile
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-zinc-600/50 bg-zinc-950/40 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Dönem
        </span>
        <div className="flex flex-wrap gap-2">
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
        </div>
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

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-950/15 px-3 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-200/95">
            Ödenenler
          </h3>
          <p className="mt-1 text-xs text-zinc-500">
            Ödeme tarihi bu döneme düşen kayıtlar (taksit veya tek seferlik;
            tamamlanan İş satırları dahil).
          </p>
          <MoneyTable rows={paidInPeriod} />
        </div>
        <div className="rounded-lg border border-amber-500/25 bg-amber-950/15 px-3 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-200/95">
            Bekleyenler
          </h3>
          <p className="mt-1 text-xs text-zinc-500">
            Vadesi bu döneme düşen, henüz ödenmemiş taksit veya tek seferlik
            ödemesi (açık İş satırları).
          </p>
          <MoneyTable rows={unpaidInPeriod} />
        </div>
      </div>
    </div>
  );
}
