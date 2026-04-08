"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  IS_DURUM,
  IS_PARA_BIRIMI,
  IS_SIRKET,
  IS_TUR,
  WORK_SOZLESME_OPTIONS,
  type WorkSozlesmeTipiId,
} from "@/lib/constants";
import { TrDateInput } from "@/components/TrDateInput";
import { canonicalTrDate } from "@/lib/tr-date-input";
import { canonicalTrAmount } from "@/lib/tr-amount-input";
import { TrAmountInput } from "@/components/TrAmountInput";
import { TrPhoneInput } from "@/components/TrPhoneInput";
import { canonicalTrPhone } from "@/lib/tr-phone-input";
import {
  AYLIK_ODEME_HATIRLATMA_GUN,
  buildRecurringPlannedPaymentCell,
  collectWorkPaymentAlerts,
  effectivePaymentScheduleAylikTutar,
  effectivePaymentScheduleSureAy,
  inferSozlesmeTipi,
  mergeWorkFormWithAutoDuration,
  normalizeSureAyInput,
  parsePaymentCellFull,
  resolvePaymentScheduleBreakdown,
  resolveTekSeferlikPaymentBreakdown,
  resolveWorkContractBreakdown,
  sanitizePaidMonthsForSureAy,
  sanitizeTekSeferlikOdemeCell,
} from "@/lib/work-contract-helpers";
import { WorkAylikOdemeToggles } from "@/components/work/WorkAylikOdemeToggles";
import { WorkBoardTableRow } from "@/components/work/WorkBoardTableRow";
import {
  clampWorkRowHoverCardBox,
  WorkRowHoverCardContent,
} from "@/components/work/WorkRowHoverCard";
import type { WorkRowWithRow } from "@/lib/sheets/work-sheet";

type WorkForm = Omit<WorkRowWithRow, "row">;

function emptyForm(): WorkForm {
  return {
    tarih: "",
    sirket: "Evrentek",
    isTuru: "Yazılım",
    baslik: "",
    musteriIsmi: "",
    iletisim: "",
    durum: "Beklemede",
    tutar: "",
    paraBirimi: "TRY",
    bitisTarihi: "",
    link: "",
    notlar: "",
    sureAy: "",
    aylikTutar: "",
    aylikOdemeAylar: "",
    sozlesmeTipi: "tekSeferlik",
  };
}

function switchWorkSozlesmeTip(
  prev: WorkForm,
  tip: WorkSozlesmeTipiId
): WorkForm {
  if (tip === "tekSeferlik") {
    return {
      ...prev,
      sozlesmeTipi: tip,
      bitisTarihi: "",
      sureAy: "",
      aylikTutar: "",
      aylikOdemeAylar: "",
    };
  }
  return { ...prev, sozlesmeTipi: tip };
}

const th =
  "sticky top-0 z-10 border-b border-zinc-700 bg-zinc-900 px-1.5 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-400";

const td =
  "border-b border-zinc-800 px-1.5 py-1.5 align-top text-xs text-zinc-200";

/** Sheet'ten gelen eski / özel değer düzenlenirken seçicide kaybolmasın. */
function withOptionalValue<C extends string>(
  choices: readonly C[],
  current: string
): string[] {
  const set = new Set<string>(choices);
  if (current && !set.has(current)) return [...choices, current];
  return [...choices];
}

export function WorkBoard() {
  const [rows, setRows] = useState<WorkRowWithRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [adding, setAdding] = useState(false);
  const [newRow, setNewRow] = useState<WorkForm>(emptyForm());
  const [newIlkOdemeTarihi, setNewIlkOdemeTarihi] = useState("");
  const [editRow, setEditRow] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<WorkForm>(emptyForm());
  const [busy, setBusy] = useState(false);
  const [inspectCard, setInspectCard] = useState<{
    r: WorkRowWithRow;
    x: number;
    y: number;
  } | null>(null);
  const inspectPopoverRef = useRef<HTMLDivElement | null>(null);

  const openInspect = useCallback(
    (r: WorkRowWithRow, e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      setInspectCard((cur) => {
        if (cur?.r.row === r.row) return null;
        return { r, x: rect.left, y: rect.bottom + 8 };
      });
    },
    []
  );

  useEffect(() => {
    if (!inspectCard) return;
    const onDocMouseDown = (ev: globalThis.MouseEvent) => {
      const el = ev.target as HTMLElement | null;
      if (!el) return;
      if (inspectPopoverRef.current?.contains(el)) return;
      if (el.closest("[data-inspect-trigger]")) return;
      setInspectCard(null);
    };
    document.addEventListener("mousedown", onDocMouseDown, true);
    return () => document.removeEventListener("mousedown", onDocMouseDown, true);
  }, [inspectCard]);

  useEffect(() => {
    if (!inspectCard) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setInspectCard(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inspectCard]);

  const inspectBox = useMemo(() => {
    if (!inspectCard || typeof window === "undefined") return null;
    return clampWorkRowHoverCardBox(inspectCard.x, inspectCard.y);
  }, [inspectCard]);

  const load = useCallback(async (opts?: { quiet?: boolean }) => {
    const quiet = opts?.quiet === true;
    if (!quiet) setLoading(true);
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
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const [filterDeferred, setFilterDeferred] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => setFilterDeferred(filter), 160);
    return () => window.clearTimeout(t);
  }, [filter]);

  const filtered = useMemo(() => {
    const q = filterDeferred.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [
        r.tarih,
        r.sirket,
        r.isTuru,
        r.baslik,
        r.musteriIsmi,
        r.iletisim,
        r.iletisim.replace(/\D/g, ""),
        r.durum,
        r.tutar,
        r.tutar.replace(/\D/g, ""),
        r.paraBirimi,
        r.bitisTarihi,
        r.sureAy,
        r.aylikTutar,
        r.aylikTutar.replace(/\D/g, ""),
        r.aylikOdemeAylar,
        r.sozlesmeTipi,
        r.link,
        r.notlar,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, filterDeferred]);

  const paymentAlerts = useMemo(
    () => collectWorkPaymentAlerts(rows),
    [rows]
  );

  const onAdd = useCallback(async () => {
    const odeme = canonicalTrDate(newIlkOdemeTarihi);
    if (!odeme) {
      setError("Ödeme vadesi (gg.aa.yyyy) seçin veya girin.");
      return;
    }
    const payload: WorkForm = { ...newRow };
    if (newRow.sozlesmeTipi === "tekSeferlik") {
      if (!resolveTekSeferlikPaymentBreakdown(newRow.tutar)) {
        setError("Tek seferlik için geçerli tutar girin.");
        return;
      }
      payload.aylikOdemeAylar = buildRecurringPlannedPaymentCell(odeme, 1);
    } else {
      if (!newRow.tarih.trim()) {
        setError("Uzun süreli için başlangıç tarihi gerekli.");
        return;
      }
      const c = resolveWorkContractBreakdown({
        sozlesmeTipi: newRow.sozlesmeTipi,
        sureAy: newRow.sureAy,
        aylikTutar: newRow.aylikTutar,
        tarih: newRow.tarih,
        bitisTarihi: newRow.bitisTarihi,
      });
      if (!c) {
        setError(
          "Uzun süreli için aylık tutar ile birlikte süre (ay) veya bitiş tarihi girin; bitiş yoksa yalnızca ilk taksit açılır."
        );
        return;
      }
      payload.aylikOdemeAylar = buildRecurringPlannedPaymentCell(odeme, c.ay);
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/is", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      setNewRow(emptyForm());
      setNewIlkOdemeTarihi("");
      setAdding(false);
      await load({ quiet: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt eklenemedi");
    } finally {
      setBusy(false);
    }
  }, [newIlkOdemeTarihi, newRow, load]);

  const onSaveEdit = useCallback(
    async (rowNum: number) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/is", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ row: rowNum, ...editForm }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? res.statusText);
        setEditRow(null);
        await load({ quiet: true });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Güncellenemedi");
      } finally {
        setBusy(false);
      }
    },
    [editForm, load]
  );

  const onDelete = useCallback(
    async (rowNum: number) => {
      if (!confirm("Bu satırı silmek istediğinize emin misiniz?")) return;
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/is", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ row: rowNum }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? res.statusText);
        setEditRow((cur) => (cur === rowNum ? null : cur));
        await load({ quiet: true });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Silinemedi");
      } finally {
        setBusy(false);
      }
    },
    [load]
  );

  const startEdit = useCallback((r: WorkRowWithRow) => {
    setInspectCard(null);
    setEditRow(r.row);
    const sureAySeed = r.sureAy;
    const tip = inferSozlesmeTipi({
      sozlesmeTipi: r.sozlesmeTipi,
      sureAy: r.sureAy,
      aylikTutar: r.aylikTutar,
      tarih: r.tarih,
      bitisTarihi: r.bitisTarihi,
      tutar: r.tutar,
    });
    setEditForm(
      mergeWorkFormWithAutoDuration(
        {
          tarih: canonicalTrDate(r.tarih),
          sirket: r.sirket,
          isTuru: r.isTuru,
          baslik: r.baslik,
          musteriIsmi: r.musteriIsmi,
          iletisim: canonicalTrPhone(r.iletisim),
          durum: r.durum,
          tutar: canonicalTrAmount(r.tutar),
          paraBirimi: r.paraBirimi || "TRY",
          bitisTarihi: canonicalTrDate(r.bitisTarihi),
          link: r.link,
          notlar: r.notlar,
          sureAy: sureAySeed,
          aylikTutar: canonicalTrAmount(r.aylikTutar),
          aylikOdemeAylar:
            tip === "tekSeferlik"
              ? sanitizeTekSeferlikOdemeCell(r.aylikOdemeAylar)
              : sanitizePaidMonthsForSureAy(sureAySeed, r.aylikOdemeAylar, r),
          sozlesmeTipi: tip,
        },
        {}
      )
    );
  }, []);

  const newUzun = newRow.sozlesmeTipi === "uzunSureli";

  const editGrid = useMemo(() => {
    if (editRow == null) return null;
    const editUzun = editForm.sozlesmeTipi === "uzunSureli";
    const editTaksitBirOzeti = (() => {
      const { planned, paid } = parsePaymentCellFull(editForm.aylikOdemeAylar);
      return planned.get(1) ?? paid.get(1) ?? "—";
    })();
    return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="sm:col-span-2 lg:col-span-3 flex flex-col gap-2 rounded-xl border border-zinc-700 bg-zinc-900/40 p-3">
        <span className="text-xs font-medium text-zinc-400">
          Sözleşme türü
        </span>
        <div className="flex flex-wrap gap-2">
          {WORK_SOZLESME_OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              disabled={busy}
              onClick={() =>
                setEditForm((s) => switchWorkSozlesmeTip(s, id))
              }
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                editForm.sozlesmeTipi === id
                  ? "bg-sky-600 text-white"
                  : "border border-zinc-600 bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <label className="block text-xs text-zinc-400 sm:col-span-2 lg:col-span-3">
        {editUzun ? (
          <span className="text-zinc-300">
            İlk ödeme vadesi (taksit 1 — mevcut)
          </span>
        ) : (
          <span className="text-zinc-300">
            Ödeme vadesi (tek taksit — mevcut)
          </span>
        )}
        <span className="mt-1 block text-[11px] font-normal leading-snug text-zinc-500">
          Vadeleri değiştirmek için aşağıdaki taksit düğmelerini veya açılan
          pencereyi kullanın. Yeni kayıtta bu alan tarih seçerek doldurulur.
        </span>
        <div className="mt-1 w-full max-w-[11rem] rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm tabular-nums text-zinc-200">
          {editTaksitBirOzeti}
        </div>
      </label>

      {editUzun ? (
        <>
          <p className="sm:col-span-2 text-[11px] leading-snug text-zinc-500 lg:col-span-3">
            Taksit planı ve ödendi işaretleri bu bloktan yönetilir (oluşturma
            formundaki bilgi metniyle aynı mantık).
          </p>
          <label className="block text-xs text-zinc-400">
            Başlangıç
            <TrDateInput
              value={editForm.tarih}
              onValueChange={(tarih) =>
                setEditForm((s) =>
                  mergeWorkFormWithAutoDuration(s, { tarih })
                )
              }
              className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
              placeholder="gg.aa.yyyy"
            />
          </label>
          <label className="block text-xs text-zinc-400">
            Bitiş (aralık)
            <TrDateInput
              value={editForm.bitisTarihi}
              onValueChange={(bitisTarihi) =>
                setEditForm((s) =>
                  mergeWorkFormWithAutoDuration(s, { bitisTarihi })
                )
              }
              className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
              placeholder="gg.aa.yyyy"
            />
          </label>
          <label className="block text-xs text-zinc-400">
            Süre (ay){" "}
            <span className="font-normal text-zinc-500">
              (başlangıç + bitiş dolunca otomatik)
            </span>
            <input
              value={editForm.sureAy}
              onChange={(e) => {
                const sureAy = normalizeSureAyInput(e.target.value);
                setEditForm((s) => ({
                  ...s,
                  sureAy,
                  aylikOdemeAylar: sanitizePaidMonthsForSureAy(
                    sureAy,
                    s.aylikOdemeAylar,
                    s
                  ),
                }));
              }}
              className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
              placeholder="Örn. 3"
              inputMode="numeric"
            />
          </label>
          <label className="block text-xs text-zinc-400">
            Aylık tutar
            <TrAmountInput
              value={editForm.aylikTutar}
              onValueChange={(aylikTutar) =>
                setEditForm((s) => ({ ...s, aylikTutar }))
              }
              className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
              placeholder="1.000"
            />
          </label>
          <div className="sm:col-span-2 border-t border-zinc-700/80 pt-3 lg:col-span-3">
            <WorkAylikOdemeToggles
              baslangicTarihi={editForm.tarih}
              sureAy={effectivePaymentScheduleSureAy(editForm)}
              aylikTutar={effectivePaymentScheduleAylikTutar(editForm)}
              value={editForm.aylikOdemeAylar}
              bitisTarihi={editForm.bitisTarihi}
              sozlesmeTipi={editForm.sozlesmeTipi}
              tutar={editForm.tutar}
              disabled={busy}
              onChange={(aylikOdemeAylar) =>
                setEditForm((s) => ({ ...s, aylikOdemeAylar }))
              }
            />
          </div>
        </>
      ) : (
        <>
          <label className="block text-xs text-zinc-400">
            Tarih
            <TrDateInput
              value={editForm.tarih}
              onValueChange={(tarih) =>
                setEditForm((s) => ({ ...s, tarih }))
              }
              className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
              placeholder="gg.aa.yyyy"
            />
          </label>
          <label className="block text-xs text-zinc-400">
            Bitiş{" "}
            <span className="font-normal text-zinc-500">(isteğe bağlı)</span>
            <TrDateInput
              value={editForm.bitisTarihi}
              onValueChange={(bitisTarihi) =>
                setEditForm((s) => ({
                  ...s,
                  bitisTarihi: canonicalTrDate(bitisTarihi),
                }))
              }
              className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
              placeholder="gg.aa.yyyy"
            />
          </label>
        </>
      )}

      <label className="block text-xs text-zinc-400">
        Şirket
        <select
          value={editForm.sirket}
          onChange={(e) =>
            setEditForm((s) => ({ ...s, sirket: e.target.value }))
          }
          className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
        >
          {IS_SIRKET.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs text-zinc-400">
        İş türü
        <select
          value={editForm.isTuru}
          onChange={(e) =>
            setEditForm((s) => ({ ...s, isTuru: e.target.value }))
          }
          className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
        >
          {withOptionalValue(IS_TUR, editForm.isTuru).map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs text-zinc-400 sm:col-span-2 lg:col-span-3">
        Başlık
        <input
          value={editForm.baslik}
          onChange={(e) =>
            setEditForm((s) => ({ ...s, baslik: e.target.value }))
          }
          className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
        />
      </label>
      <label className="block text-xs text-zinc-400">
        Müşteri ismi
        <input
          value={editForm.musteriIsmi}
          onChange={(e) =>
            setEditForm((s) => ({ ...s, musteriIsmi: e.target.value }))
          }
          className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
        />
      </label>
      <label className="block text-xs text-zinc-400">
        İletişim numarası
        <TrPhoneInput
          value={editForm.iletisim}
          onValueChange={(iletisim) =>
            setEditForm((s) => ({ ...s, iletisim }))
          }
          className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
        />
      </label>
      <label className="block text-xs text-zinc-400">
        Durum
        <select
          value={editForm.durum}
          onChange={(e) =>
            setEditForm((s) => ({ ...s, durum: e.target.value }))
          }
          className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
        >
          {withOptionalValue(IS_DURUM, editForm.durum).map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs text-zinc-400">
        {editUzun ? "Tek seferlik ek tutar" : "Tek seferlik tutar"}
        <TrAmountInput
          value={editForm.tutar}
          onValueChange={(tutar) => setEditForm((s) => ({ ...s, tutar }))}
          className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
          placeholder={editUzun ? "İsteğe bağlı" : "Örn. 10.000"}
        />
      </label>
      {!editUzun && resolvePaymentScheduleBreakdown(editForm) ? (
        <div className="sm:col-span-2 border-t border-zinc-700/80 pt-3 lg:col-span-3">
          <WorkAylikOdemeToggles
            baslangicTarihi={editForm.tarih}
            sureAy={effectivePaymentScheduleSureAy(editForm)}
            aylikTutar={effectivePaymentScheduleAylikTutar(editForm)}
            value={editForm.aylikOdemeAylar}
            bitisTarihi={editForm.bitisTarihi}
            sozlesmeTipi={editForm.sozlesmeTipi}
            tutar={editForm.tutar}
            disabled={busy}
            onChange={(aylikOdemeAylar) =>
              setEditForm((s) => ({ ...s, aylikOdemeAylar }))
            }
          />
        </div>
      ) : null}
      <label className="block text-xs text-zinc-400">
        Para birimi
        <select
          value={editForm.paraBirimi}
          onChange={(e) =>
            setEditForm((s) => ({ ...s, paraBirimi: e.target.value }))
          }
          className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
        >
          {IS_PARA_BIRIMI.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs text-zinc-400 sm:col-span-2">
        Link
        <input
          value={editForm.link}
          onChange={(e) =>
            setEditForm((s) => ({ ...s, link: e.target.value }))
          }
          className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
        />
      </label>
      <label className="block text-xs text-zinc-400 sm:col-span-2 lg:col-span-3">
        Notlar
        <textarea
          value={editForm.notlar}
          onChange={(e) =>
            setEditForm((s) => ({ ...s, notlar: e.target.value }))
          }
          rows={2}
          className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
        />
      </label>
    </div>
    );
  }, [editRow, editForm, busy]);

  if (loading && rows.length === 0) {
    return <p className="text-zinc-400">Yükleniyor…</p>;
  }

  return (
    <div className="space-y-4">
      {paymentAlerts.overdue.length > 0 ||
      paymentAlerts.dueSoon.length > 0 ? (
        <div className="space-y-4 rounded-xl border border-zinc-700 bg-zinc-900/50 p-4">
          {paymentAlerts.overdue.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-red-300">
                Gecikmiş aylık ödemeler (vadeleri geçti, ödenmedi)
              </h3>
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
              <h3 className="text-sm font-semibold text-amber-200">
                Yaklaşan vadeler ({AYLIK_ODEME_HATIRLATMA_GUN} gün ve içinde)
              </h3>
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          placeholder="Filtrele…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load({ quiet: rows.length > 0 })}
            disabled={busy}
            className="rounded-lg border border-zinc-600 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
          >
            Yenile
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding((a) => !a);
              setNewRow(emptyForm());
              setNewIlkOdemeTarihi("");
            }}
            disabled={busy}
            className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {adding ? "Formu kapat" : "Yeni iş"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {adding ? (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-200">
            Yeni iş kaydı
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3 flex flex-col gap-2 rounded-xl border border-zinc-700 bg-zinc-900/40 p-3">
              <span className="text-xs font-medium text-zinc-400">
                Sözleşme türü
              </span>
              <div className="flex flex-wrap gap-2">
                {WORK_SOZLESME_OPTIONS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setNewIlkOdemeTarihi("");
                      setNewRow((s) => switchWorkSozlesmeTip(s, id));
                    }}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      newRow.sozlesmeTipi === id
                        ? "bg-sky-600 text-white"
                        : "border border-zinc-600 bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <label className="block text-xs text-zinc-400 sm:col-span-2 lg:col-span-3">
              {newUzun ? (
                <span className="text-zinc-300">İlk ödeme vadesi (aylık tekrarın başı)</span>
              ) : (
                <span className="text-zinc-300">Ödeme vadesi</span>
              )}
              {newUzun ? (
                <span className="mt-1 block text-[11px] font-normal leading-snug text-zinc-500">
                  Süre veya bitiş kadar her taksit bu tarihten +1 ay atlar. Bitiş
                  yoksa yalnızca 1. taksit açılır; durum «Tamamlandı» olunca
                  hatırlatmalar kesilir, sonra süre/bitiş eklerseniz taksitler
                  genişler.
                </span>
              ) : (
                <span className="mt-1 block text-[11px] font-normal text-zinc-500">
                  Tek ödeme planı (tek taksit).
                </span>
              )}
              <TrDateInput
                value={newIlkOdemeTarihi}
                onValueChange={setNewIlkOdemeTarihi}
                className="mt-1 w-full max-w-[11rem] rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
                placeholder="gg.aa.yyyy"
              />
            </label>
            {newUzun ? (
              <>
                <p className="sm:col-span-2 text-[11px] leading-snug text-zinc-500 lg:col-span-3">
                  Kayıt sırasında taksit vadeleri yukarıdaki ilk vadeye göre otomatik
                  yazılır; kayıttan sonra bu sütundan düzenleyebilirsiniz.
                </p>
                <label className="block text-xs text-zinc-400">
                  Başlangıç
                  <TrDateInput
                    value={newRow.tarih}
                    onValueChange={(tarih) =>
                      setNewRow((s) =>
                        mergeWorkFormWithAutoDuration(s, { tarih })
                      )
                    }
                    className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
                    placeholder="gg.aa.yyyy"
                  />
                </label>
                <label className="block text-xs text-zinc-400">
                  Bitiş (aralık)
                  <TrDateInput
                    value={newRow.bitisTarihi}
                    onValueChange={(bitisTarihi) =>
                      setNewRow((s) =>
                        mergeWorkFormWithAutoDuration(s, { bitisTarihi })
                      )
                    }
                    className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
                    placeholder="gg.aa.yyyy"
                  />
                </label>
                <label className="block text-xs text-zinc-400">
                  Süre (ay){" "}
                  <span className="font-normal text-zinc-500">
                    (başlangıç + bitiş dolunca otomatik)
                  </span>
                  <input
                    value={newRow.sureAy}
                    onChange={(e) => {
                      const sureAy = normalizeSureAyInput(e.target.value);
                      setNewRow((s) => ({
                        ...s,
                        sureAy,
                        aylikOdemeAylar: sanitizePaidMonthsForSureAy(
                          sureAy,
                          s.aylikOdemeAylar,
                          s
                        ),
                      }));
                    }}
                    className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
                    placeholder="Örn. 3"
                    inputMode="numeric"
                  />
                </label>
                <label className="block text-xs text-zinc-400">
                  Aylık tutar
                  <TrAmountInput
                    value={newRow.aylikTutar}
                    onValueChange={(aylikTutar) =>
                      setNewRow((s) => ({ ...s, aylikTutar }))
                    }
                    className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
                    placeholder="1.000"
                  />
                </label>
              </>
            ) : (
              <>
                <label className="block text-xs text-zinc-400">
                  Tarih
                  <TrDateInput
                    value={newRow.tarih}
                    onValueChange={(tarih) =>
                      setNewRow((s) => ({ ...s, tarih }))
                    }
                    className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
                    placeholder="gg.aa.yyyy"
                  />
                </label>
                <label className="block text-xs text-zinc-400">
                  Bitiş{" "}
                  <span className="font-normal text-zinc-500">
                    (isteğe bağlı)
                  </span>
                  <TrDateInput
                    value={newRow.bitisTarihi}
                    onValueChange={(bitisTarihi) =>
                      setNewRow((s) => ({
                        ...s,
                        bitisTarihi: canonicalTrDate(bitisTarihi),
                      }))
                    }
                    className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
                    placeholder="gg.aa.yyyy"
                  />
                </label>
              </>
            )}
            <label className="block text-xs text-zinc-400">
              Şirket
              <select
                value={newRow.sirket}
                onChange={(e) =>
                  setNewRow((s) => ({ ...s, sirket: e.target.value }))
                }
                className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
              >
                {IS_SIRKET.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-zinc-400">
              İş türü
              <select
                value={newRow.isTuru}
                onChange={(e) =>
                  setNewRow((s) => ({ ...s, isTuru: e.target.value }))
                }
                className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
              >
                {IS_TUR.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-zinc-400 sm:col-span-2 lg:col-span-3">
              Başlık
              <input
                value={newRow.baslik}
                onChange={(e) =>
                  setNewRow((s) => ({ ...s, baslik: e.target.value }))
                }
                className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="block text-xs text-zinc-400">
              Müşteri ismi
              <input
                value={newRow.musteriIsmi}
                onChange={(e) =>
                  setNewRow((s) => ({ ...s, musteriIsmi: e.target.value }))
                }
                className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="block text-xs text-zinc-400">
              İletişim numarası
              <TrPhoneInput
                value={newRow.iletisim}
                onValueChange={(iletisim) =>
                  setNewRow((s) => ({ ...s, iletisim }))
                }
                className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="block text-xs text-zinc-400">
              Durum
              <select
                value={newRow.durum}
                onChange={(e) =>
                  setNewRow((s) => ({ ...s, durum: e.target.value }))
                }
                className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
              >
                {IS_DURUM.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-zinc-400">
              {newUzun ? "Tek seferlik ek tutar" : "Tek seferlik tutar"}
              <TrAmountInput
                value={newRow.tutar}
                onValueChange={(tutar) => setNewRow((s) => ({ ...s, tutar }))}
                className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
                placeholder={
                  newUzun
                    ? "İsteğe bağlı"
                    : "Örn. 10.000"
                }
              />
            </label>
            <label className="block text-xs text-zinc-400">
              Para birimi
              <select
                value={newRow.paraBirimi}
                onChange={(e) =>
                  setNewRow((s) => ({ ...s, paraBirimi: e.target.value }))
                }
                className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
              >
                {IS_PARA_BIRIMI.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-zinc-400 sm:col-span-2">
              Link
              <input
                value={newRow.link}
                onChange={(e) =>
                  setNewRow((s) => ({ ...s, link: e.target.value }))
                }
                className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="block text-xs text-zinc-400 sm:col-span-2 lg:col-span-3">
              Notlar
              <textarea
                value={newRow.notlar}
                onChange={(e) =>
                  setNewRow((s) => ({ ...s, notlar: e.target.value }))
                }
                rows={2}
                className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
              />
            </label>
          </div>
          <div className="mt-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void onAdd()}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              Kaydet
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full min-w-[56rem] table-auto border-collapse">
          <thead>
            <tr>
              <th className={`${th} w-8 shrink-0 whitespace-nowrap`}>#</th>
              <th className={`${th} w-12 shrink-0`}>Tip</th>
              <th className={`${th} shrink-0 whitespace-nowrap`}>Başl.</th>
              <th className={`${th} min-w-[7.5rem] max-w-[11rem]`}>Şirket</th>
              <th className={`${th} w-[5rem] shrink-0`}>İş</th>
              <th className={`${th} min-w-[11rem]`}>Başlık</th>
              <th className={`${th} min-w-[9.5rem]`}>Müşteri</th>
              <th className={`${th} min-w-[9rem]`}>Durum</th>
              <th className={`${th} shrink-0 whitespace-nowrap`}>Bitiş</th>
              <th className={`${th} min-w-[7rem] whitespace-nowrap`}>Tutar</th>
              <th className={`${th} w-[4.75rem] shrink-0`} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) =>
              editRow === r.row ? (
                <tr key={r.row} className="bg-zinc-900/80">
                  <td className={td}>{r.row}</td>
                  <td className={td} colSpan={9}>
                    <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4">
                      <h2 className="mb-3 text-sm font-semibold text-zinc-200">
                        İş kaydını düzenle
                      </h2>
                      {editGrid}
                    </div>
                  </td>
                  <td className={td}>
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onSaveEdit(r.row)}
                        className="rounded bg-emerald-600 px-2 py-1 text-xs text-white"
                      >
                        Kaydet
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setEditRow(null)}
                        className="rounded border border-zinc-600 px-2 py-1 text-xs"
                      >
                        İptal
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <WorkBoardTableRow
                  key={r.row}
                  r={r}
                  busy={busy}
                  onEdit={startEdit}
                  onDelete={onDelete}
                  onInspect={openInspect}
                />
              )
            )}
          </tbody>
        </table>
        {filtered.length === 0 ? (
          <p className="p-6 text-center text-sm text-zinc-500">
            Kayıt yok veya filtreye uymuyor.
          </p>
        ) : null}
      </div>

      {typeof document !== "undefined" && inspectCard && inspectBox
        ? createPortal(
            <div
              ref={inspectPopoverRef}
              className="pointer-events-auto fixed z-[9999] overflow-y-auto overflow-x-hidden overscroll-contain rounded-xl border border-zinc-600 bg-zinc-900/98 shadow-2xl shadow-black/60 backdrop-blur-sm"
              style={{
                left: inspectBox.left,
                top: inspectBox.top,
                width: inspectBox.width,
                maxHeight: inspectBox.maxHeight,
              }}
            >
              <WorkRowHoverCardContent r={inspectCard.r} />
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
