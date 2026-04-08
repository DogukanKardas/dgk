"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TagBadge } from "@/components/TagBadge";
import { isDurumClass, isSirketClass } from "@/lib/badge-classes";
import type { WorkRowWithRow } from "@/lib/sheets/work-sheet";
import { workRowToApiBody } from "@/lib/work-row-api";
import { formatTrAmountDisplay } from "@/lib/tr-amount-input";
import {
  AYLIK_ODEME_HATIRLATMA_GUN,
  collectWorkPaymentAlerts,
  effectivePaymentScheduleAylikTutar,
  effectivePaymentScheduleSureAy,
  effectiveSureAyString,
  formatWorkTutarCell,
  inferSozlesmeTipi,
  nextUnpaidInstallmentSummary,
  formatPaidInstallmentRatio,
  paidMonthCountsForRow,
  paymentInstallmentCap,
  resolvePaymentScheduleBreakdown,
  resolveWorkContractBreakdown,
  setInstallmentPaid,
  withPersistedSureAyIfDerived,
} from "@/lib/work-contract-helpers";
import { formatTodayTrDate } from "@/lib/tr-date-input";
import { IS_DURUM } from "@/lib/constants";
import { WorkAylikOdemeToggles } from "@/components/work/WorkAylikOdemeToggles";

const th =
  "sticky top-0 z-10 border-b border-zinc-700 bg-zinc-900 px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400";

const td = "border-b border-zinc-800 px-2 py-2 align-top text-sm text-zinc-200";

function rowMatchesFilter(r: WorkRowWithRow, q: string): boolean {
  if (!q) return true;
  return [
    r.tarih,
    r.bitisTarihi,
    r.sirket,
    r.baslik,
    r.musteriIsmi,
    r.durum,
    r.tutar,
    r.paraBirimi,
    r.sureAy,
    r.aylikTutar,
    r.aylikOdemeAylar,
    String(r.row),
  ]
    .join(" ")
    .toLowerCase()
    .includes(q);
}

export function WorkFinanceBoard() {
  const [rows, setRows] = useState<WorkRowWithRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);

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

  const q = filter.trim().toLowerCase();

  const uzunRows = useMemo(
    () => rows.filter((r) => inferSozlesmeTipi(r) === "uzunSureli"),
    [rows]
  );
  const tekRows = useMemo(
    () => rows.filter((r) => inferSozlesmeTipi(r) === "tekSeferlik"),
    [rows]
  );

  const filteredUzun = useMemo(
    () => uzunRows.filter((r) => rowMatchesFilter(r, q)),
    [uzunRows, q]
  );
  const filteredTek = useMemo(
    () => tekRows.filter((r) => rowMatchesFilter(r, q)),
    [tekRows, q]
  );

  const paymentAlerts = useMemo(
    () => collectWorkPaymentAlerts(rows),
    [rows]
  );

  async function onSaveMonthlyPayment(
    r: WorkRowWithRow,
    aylikOdemeAylar: string
  ) {
    const tip = inferSozlesmeTipi(r);
    if (tip !== "uzunSureli" && tip !== "tekSeferlik") return;
    setBusy(true);
    setError(null);
    try {
      const rSend = tip === "uzunSureli" ? withPersistedSureAyIfDerived(r) : r;
      const res = await fetch("/api/is", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          row: r.row,
          ...workRowToApiBody(rSend),
          aylikOdemeAylar,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Güncellenemedi");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveTekDurum(r: WorkRowWithRow, durum: string) {
    if (inferSozlesmeTipi(r) !== "tekSeferlik") return;
    if (durum === r.durum) return;
    setBusy(true);
    setError(null);
    try {
      let aylikOdemeAylar = r.aylikOdemeAylar;
      if (durum === "Ödendi" && r.tutar.trim()) {
        const sched = resolvePaymentScheduleBreakdown(r);
        const cap = sched
          ? paymentInstallmentCap(r, sched.ay, r.aylikOdemeAylar)
          : 1;
        aylikOdemeAylar = setInstallmentPaid(
          r.aylikOdemeAylar,
          1,
          Math.max(1, cap),
          formatTodayTrDate()
        );
      }
      const res = await fetch("/api/is", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          row: r.row,
          ...workRowToApiBody(r),
          durum,
          aylikOdemeAylar,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Durum güncellenemedi");
    } finally {
      setBusy(false);
    }
  }

  if (loading && rows.length === 0) {
    return <p className="text-zinc-400">Yükleniyor…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          placeholder="Filtrele (satır, başlık, müşteri, tutar…)…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
        <button
          type="button"
          onClick={() => void load()}
          disabled={busy}
          className="rounded-lg border border-zinc-600 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
        >
          Yenile
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
          <p className="text-xs font-medium text-zinc-500">Uzun süreli iş</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-100">
            {uzunRows.length}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
          <p className="text-xs font-medium text-zinc-500">Tek seferlik</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-100">
            {tekRows.length}
          </p>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-950/20 px-4 py-3">
          <p className="text-xs font-medium text-red-300/90">Gecikmiş taksit</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-red-200">
            {paymentAlerts.overdue.length}
          </p>
        </div>
        <div className="rounded-xl border border-amber-500/25 bg-amber-950/20 px-4 py-3">
          <p className="text-xs font-medium text-amber-200/90">
            Yaklaşan vade ({AYLIK_ODEME_HATIRLATMA_GUN} gün)
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-100">
            {paymentAlerts.dueSoon.length}
          </p>
        </div>
      </div>

      {paymentAlerts.overdue.length > 0 || paymentAlerts.dueSoon.length > 0 ? (
        <div className="space-y-4 rounded-xl border border-zinc-700 bg-zinc-900/50 p-4">
          {paymentAlerts.overdue.length > 0 ? (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-red-300">
                Gecikmiş ödemeler
              </h2>
              <ul className="space-y-1.5 text-sm text-red-100/95">
                {paymentAlerts.overdue.map((a) => (
                  <li
                    key={`o-${a.row}-${a.installment}`}
                    className="rounded-lg border border-red-500/25 bg-red-950/30 px-3 py-2"
                  >
                    <span className="font-medium">
                      {a.baslik?.trim()
                        ? `${a.baslik} geciken ödeme`
                        : "Geciken ödeme"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {paymentAlerts.dueSoon.length > 0 ? (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-amber-200">
                Yaklaşan vadeler
              </h2>
              <ul className="space-y-1.5 text-sm text-amber-50/95">
                {paymentAlerts.dueSoon.map((a) => (
                  <li
                    key={`s-${a.row}-${a.installment}`}
                    className="rounded-lg border border-amber-500/30 bg-amber-950/25 px-3 py-2"
                  >
                    <span className="font-medium">
                      {a.baslik?.trim()
                        ? `${a.baslik} yaklaşan ödeme`
                        : "Yaklaşan ödeme"}
                      {a.daysLeft != null ? (
                        <>
                          {" "}
                          <span className="tabular-nums font-normal text-amber-100/90">
                            (
                            {a.daysLeft === 0
                              ? "vade bugün"
                              : `${a.daysLeft} gün kaldı`}
                            )
                          </span>
                        </>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-100">
          Aylık sözleşmeler — ödemeler
        </h2>
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full min-w-[1180px] border-collapse">
            <thead>
              <tr>
                <th className={th}>#</th>
                <th className={th}>Başlık</th>
                <th className={th}>Şirket</th>
                <th className={th}>Müşteri</th>
                <th className={th}>Başlangıç</th>
                <th className={th}>Bitiş</th>
                <th className={th}>Süre</th>
                <th className={th}>Aylık</th>
                <th className={th}>PB</th>
                <th className={th}>Ödenen</th>
                <th className={th}>Sıradaki açık</th>
                <th className={th}>Taksitler (takvim)</th>
              </tr>
            </thead>
            <tbody>
              {filteredUzun.length === 0 ? (
                <tr>
                  <td className={td} colSpan={12}>
                    <p className="py-6 text-center text-sm text-zinc-500">
                      {uzunRows.length === 0
                        ? "Uzun süreli kayıt yok."
                        : "Filtreye uyan kayıt yok."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUzun.map((r) => {
                  const c = resolveWorkContractBreakdown(r);
                  const pm = paidMonthCountsForRow(r, r.aylikOdemeAylar);
                  const effAy = effectiveSureAyString(r);
                  const süreHücresi =
                    c != null
                      ? `${effAy} ay${
                          !r.sureAy.trim() && r.bitisTarihi.trim()
                            ? " · tarihlerden"
                            : ""
                        }`
                      : "—";
                  return (
                    <tr key={r.row} className="hover:bg-zinc-900/40">
                      <td className={`${td} text-zinc-500`}>{r.row}</td>
                      <td className={`${td} max-w-[200px] font-medium`}>
                        <span className="line-clamp-2" title={r.baslik}>
                          {r.baslik || "—"}
                        </span>
                      </td>
                      <td className={td}>
                        <TagBadge
                          label={r.sirket}
                          className={isSirketClass(r.sirket)}
                        />
                      </td>
                      <td className={`${td} max-w-[120px]`} title={r.musteriIsmi}>
                        {r.musteriIsmi || "—"}
                      </td>
                      <td className={`${td} text-zinc-300 tabular-nums`}>
                        {r.tarih || "—"}
                      </td>
                      <td className={`${td} text-zinc-300 tabular-nums`}>
                        {r.bitisTarihi.trim() ? r.bitisTarihi : "—"}
                      </td>
                      <td className={`${td} tabular-nums text-zinc-300`}>
                        {süreHücresi}
                      </td>
                      <td className={`${td} tabular-nums`}>
                        {r.aylikTutar.trim()
                          ? formatTrAmountDisplay(r.aylikTutar)
                          : "—"}
                      </td>
                      <td className={`${td} text-zinc-400`}>{r.paraBirimi}</td>
                      <td className={`${td} tabular-nums`}>
                        {pm ? formatPaidInstallmentRatio(pm) : "—"}
                      </td>
                      <td className={`${td} max-w-[220px] text-xs text-zinc-400`}>
                        {c
                          ? nextUnpaidInstallmentSummary(
                              r,
                              r.aylikOdemeAylar
                            )
                          : "—"}
                      </td>
                      <td className={`${td} max-w-[280px]`}>
                        {c ? (
                          <WorkAylikOdemeToggles
                            baslangicTarihi={r.tarih}
                            sureAy={effectivePaymentScheduleSureAy(r)}
                            aylikTutar={effectivePaymentScheduleAylikTutar(r)}
                            value={r.aylikOdemeAylar}
                            bitisTarihi={r.bitisTarihi}
                            sozlesmeTipi={r.sozlesmeTipi}
                            tutar={r.tutar}
                            compact
                            disabled={busy}
                            onChange={(next) =>
                              void onSaveMonthlyPayment(r, next)
                            }
                          />
                        ) : (
                          <span className="text-xs text-zinc-500">
                            Aylık tutar ve başlangıç gerekli. Uzun süreli sözleşme
                            sütunu doluysa geçici olarak tek ay takibi açılır; tüm
                            ayları görmek için İşler’de bitiş veya süre (ay) girin.
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-100">
          Tek seferlik — tutar özeti
        </h2>
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full min-w-[1080px] border-collapse">
            <thead>
              <tr>
                <th className={th}>#</th>
                <th className={th}>Tarih</th>
                <th className={th}>Başlık</th>
                <th className={th}>Şirket</th>
                <th className={th}>Durum</th>
                <th className={th}>Tutar</th>
                <th className={th}>PB</th>
                <th className={th}>Ödenen</th>
                <th className={th}>Sıradaki</th>
                <th className={th}>Ödeme</th>
              </tr>
            </thead>
            <tbody>
              {filteredTek.length === 0 ? (
                <tr>
                  <td className={td} colSpan={10}>
                    <p className="py-6 text-center text-sm text-zinc-500">
                      {tekRows.length === 0
                        ? "Tek seferlik kayıt yok."
                        : "Filtreye uyan kayıt yok."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTek.map((r) => {
                  const sched = resolvePaymentScheduleBreakdown(r);
                  const pm = paidMonthCountsForRow(r, r.aylikOdemeAylar);
                  return (
                    <tr key={r.row} className="hover:bg-zinc-900/40">
                      <td className={`${td} text-zinc-500`}>{r.row}</td>
                      <td className={`${td} tabular-nums text-zinc-300`}>
                        {r.tarih || "—"}
                      </td>
                      <td className={`${td} max-w-[220px] font-medium`}>
                        <span className="line-clamp-2" title={r.baslik}>
                          {r.baslik || "—"}
                        </span>
                      </td>
                      <td className={td}>
                        <TagBadge
                          label={r.sirket}
                          className={isSirketClass(r.sirket)}
                        />
                      </td>
                      <td className={td}>
                        <select
                          value={r.durum}
                          disabled={busy}
                          title="Durumu güncelle; Ödendi → bugünün tarihi ödeme hücresine yazılır (TRT)."
                          onChange={(e) =>
                            void onSaveTekDurum(r, e.target.value)
                          }
                          className={`w-full max-w-[13rem] rounded-md border px-2 py-1 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:opacity-50 ${isDurumClass(r.durum)}`}
                        >
                          {[...new Set([...IS_DURUM, r.durum].filter(Boolean))].map(
                            (d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            )
                          )}
                        </select>
                      </td>
                      <td className={`${td} tabular-nums`}>
                        {formatWorkTutarCell(r.tutar, r.sureAy, r.aylikTutar)}
                      </td>
                      <td className={`${td} text-zinc-400`}>{r.paraBirimi}</td>
                      <td className={`${td} tabular-nums`}>
                        {sched && pm ? formatPaidInstallmentRatio(pm) : "—"}
                      </td>
                      <td className={`${td} max-w-[200px] text-xs text-zinc-400`}>
                        {sched
                          ? nextUnpaidInstallmentSummary(
                              r,
                              r.aylikOdemeAylar
                            )
                          : "—"}
                      </td>
                      <td className={`${td} max-w-[260px]`}>
                        {sched && pm && r.tutar.trim() ? (
                          <WorkAylikOdemeToggles
                            baslangicTarihi={r.tarih}
                            sureAy={effectivePaymentScheduleSureAy(r)}
                            aylikTutar={effectivePaymentScheduleAylikTutar(r)}
                            value={r.aylikOdemeAylar}
                            bitisTarihi={r.bitisTarihi}
                            sozlesmeTipi={r.sozlesmeTipi}
                            tutar={r.tutar}
                            compact
                            disabled={busy}
                            onChange={(next) =>
                              void onSaveMonthlyPayment(r, next)
                            }
                          />
                        ) : (
                          <span className="text-xs text-zinc-500">
                            Tutar ve ödeme planı yok.
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
