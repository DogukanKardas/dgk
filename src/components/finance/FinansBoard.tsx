"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  FINANS_FATURA_DURUM,
  FINANS_FATURA_KATEGORI,
  FINANS_GELIR_DURUM,
  FINANS_GELIR_KATEGORI,
  FINANS_GIDER_DURUM,
  FINANS_GIDER_KATEGORI,
  FINANS_TIP,
  IS_PARA_BIRIMI,
} from "@/lib/constants";
import { finansDurumClass } from "@/lib/badge-classes";
import { TagBadge } from "@/components/TagBadge";
import { TrDateInput } from "@/components/TrDateInput";
import { TrAmountInput } from "@/components/TrAmountInput";
import { canonicalTrDate, trDateStartOfDayMs } from "@/lib/tr-date-input";
import { formatTrAmountDisplay } from "@/lib/tr-amount-input";
import { finansRowTipMatchesCanonical } from "@/lib/finance-tip-match";
import { listFinansGelirRowsFromWorkPaidInstallments } from "@/lib/work-contract-helpers";
import type { FinansRowWithRow } from "@/lib/sheets/finance-sheet";
import type { WorkRowWithRow } from "@/lib/sheets/work-sheet";

export type FinansTip = (typeof FINANS_TIP)[number];

type FinansForm = Omit<FinansRowWithRow, "row">;

const th =
  "sticky top-0 z-10 border-b border-zinc-700 bg-zinc-900 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400";

const td = "border-b border-zinc-800 px-3 py-2 align-top text-sm text-zinc-200";

function kategoriList(tip: FinansTip): readonly string[] {
  if (tip === "Gelir") return FINANS_GELIR_KATEGORI;
  if (tip === "Gider") return FINANS_GIDER_KATEGORI;
  return FINANS_FATURA_KATEGORI;
}

function durumList(tip: FinansTip): readonly string[] {
  if (tip === "Gelir") return FINANS_GELIR_DURUM;
  if (tip === "Gider") return FINANS_GIDER_DURUM;
  return FINANS_FATURA_DURUM;
}

function emptyForm(tip: FinansTip): FinansForm {
  const k = kategoriList(tip);
  const d = durumList(tip);
  return {
    tip,
    tarih: "",
    tutar: "",
    paraBirimi: "TRY",
    baslik: "",
    kategori: k[0] ?? "",
    durum: d[0] ?? "",
    vadeTarihi: "",
    belgeNo: "",
    isSheetRow: "",
    link: "",
    notlar: "",
    ek: "",
  };
}

function mergeOptions(
  rows: FinansRowWithRow[],
  tip: FinansTip,
  field: "kategori" | "durum"
): string[] {
  const base = [...(field === "kategori" ? kategoriList(tip) : durumList(tip))];
  const seen = new Set(base);
  for (const r of rows) {
    if (!finansRowTipMatchesCanonical(r.tip, tip)) continue;
    const v = r[field].trim();
    if (v && !seen.has(v)) {
      base.push(v);
      seen.add(v);
    }
  }
  return base;
}

function addButtonLabel(tip: FinansTip): string {
  if (tip === "Gelir") return "Yeni gelir";
  if (tip === "Gider") return "Yeni gider";
  return "Yeni fatura";
}

function workRowPickerLabel(w: WorkRowWithRow): string {
  const t = w.baslik.trim() || "(başlıksız)";
  const short = t.length > 44 ? `${t.slice(0, 44)}…` : t;
  const d = w.durum?.trim();
  return d ? `${short} · ${d}` : short;
}

function isWorkPaidSyncRow(r: FinansRowWithRow): boolean {
  return finansRowTipMatchesCanonical(r.tip, "Gelir") && r.row < 0;
}

export function FinansBoard({
  fixedTip,
  syncWorkPaidGelir = false,
}: {
  fixedTip: FinansTip;
  /** Gelir: İş’te ödenmiş taksitleri tabloya salt okunur satır olarak ekler. */
  syncWorkPaidGelir?: boolean;
}) {
  const [rows, setRows] = useState<FinansRowWithRow[]>([]);
  const [workSheetRows, setWorkSheetRows] = useState<WorkRowWithRow[]>([]);
  const [workSyncRows, setWorkSyncRows] = useState<FinansRowWithRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [filterKategori, setFilterKategori] = useState("");
  const [filterDurum, setFilterDurum] = useState("");
  const [adding, setAdding] = useState(false);
  const [newRow, setNewRow] = useState<FinansForm>(() => emptyForm(fixedTip));
  const [editRow, setEditRow] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<FinansForm>(() => emptyForm(fixedTip));
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const finRes = await fetch("/api/finans", { cache: "no-store" });
      const data = (await finRes.json()) as
        | { rows: FinansRowWithRow[] }
        | { error: string };
      if (!finRes.ok) {
        setError("error" in data ? data.error : `Hata ${finRes.status}`);
        setRows([]);
        setWorkSheetRows([]);
        setWorkSyncRows([]);
        return;
      }
      setRows("rows" in data ? data.rows : []);

      if (fixedTip === "Gelir") {
        try {
          const isRes = await fetch("/api/is", { cache: "no-store" });
          const isData = (await isRes.json()) as
            | { rows: WorkRowWithRow[] }
            | { error: string };
          if (isRes.ok && "rows" in isData && Array.isArray(isData.rows)) {
            const wr = isData.rows;
            setWorkSheetRows(wr);
            if (syncWorkPaidGelir) {
              setWorkSyncRows(
                listFinansGelirRowsFromWorkPaidInstallments(wr)
              );
            } else {
              setWorkSyncRows([]);
            }
          } else {
            setWorkSheetRows([]);
            setWorkSyncRows([]);
          }
        } catch {
          setWorkSheetRows([]);
          setWorkSyncRows([]);
        }
      } else {
        setWorkSheetRows([]);
        setWorkSyncRows([]);
      }
    } catch {
      setError("Ağ hatası");
      setRows([]);
      setWorkSheetRows([]);
      setWorkSyncRows([]);
    } finally {
      setLoading(false);
    }
  }, [syncWorkPaidGelir, fixedTip]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setNewRow(emptyForm(fixedTip));
    setEditRow(null);
    setEditForm(emptyForm(fixedTip));
  }, [fixedTip]);

  const sheetTypedRows = useMemo(
    () => rows.filter((r) => finansRowTipMatchesCanonical(r.tip, fixedTip)),
    [rows, fixedTip]
  );

  const typedRows = useMemo(() => {
    if (!syncWorkPaidGelir || fixedTip !== "Gelir") return sheetTypedRows;
    return [...workSyncRows, ...sheetTypedRows].sort((a, b) => {
      const tb = trDateStartOfDayMs(b.tarih) ?? 0;
      const ta = trDateStartOfDayMs(a.tarih) ?? 0;
      return tb - ta;
    });
  }, [syncWorkPaidGelir, fixedTip, workSyncRows, sheetTypedRows]);

  const optionSourceRows = useMemo(() => {
    if (!syncWorkPaidGelir || fixedTip !== "Gelir") return rows;
    return [...workSyncRows, ...rows];
  }, [syncWorkPaidGelir, fixedTip, workSyncRows, rows]);

  const kategoriOptions = useMemo(
    () => mergeOptions(optionSourceRows, fixedTip, "kategori"),
    [optionSourceRows, fixedTip]
  );

  const durumOptions = useMemo(
    () => mergeOptions(optionSourceRows, fixedTip, "durum"),
    [optionSourceRows, fixedTip]
  );

  const tipSamples = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const raw = r.tip.trim();
      const label = raw.length ? raw : "(boş)";
      m.set(label, (m.get(label) ?? 0) + 1);
    }
    return [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [rows]);

  const filtered = useMemo(() => {
    let list = typedRows;
    if (filterKategori) {
      list = list.filter((r) => r.kategori === filterKategori);
    }
    if (filterDurum) {
      list = list.filter((r) => r.durum === filterDurum);
    }
    const q = filter.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) =>
      [
        r.baslik,
        r.tarih,
        r.tutar,
        r.paraBirimi,
        r.kategori,
        r.durum,
        r.vadeTarihi,
        r.belgeNo,
        r.isSheetRow,
        r.link,
        r.notlar,
        r.ek,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [typedRows, filter, filterKategori, filterDurum]);

  async function onAdd() {
    setBusy(true);
    setError(null);
    try {
      const payload = { ...newRow, tip: fixedTip };
      const res = await fetch("/api/finans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      setNewRow(emptyForm(fixedTip));
      setAdding(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt eklenemedi");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveEdit(rowNum: number) {
    if (rowNum < 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/finans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ row: rowNum, ...editForm, tip: fixedTip }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      setEditRow(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Güncellenemedi");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(rowNum: number) {
    if (rowNum < 0) return;
    if (!confirm("Bu satırı silmek istediğinize emin misiniz?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/finans", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ row: rowNum }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      if (editRow === rowNum) setEditRow(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Silinemedi");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(r: FinansRowWithRow) {
    if (isWorkPaidSyncRow(r)) return;
    setEditRow(r.row);
    setEditForm({
      tip: fixedTip,
      tarih: canonicalTrDate(r.tarih),
      tutar: r.tutar,
      paraBirimi: r.paraBirimi || "TRY",
      baslik: r.baslik,
      kategori: r.kategori,
      durum: r.durum,
      vadeTarihi: canonicalTrDate(r.vadeTarihi),
      belgeNo: r.belgeNo,
      isSheetRow: r.isSheetRow,
      link: r.link,
      notlar: r.notlar,
      ek: r.ek,
    });
  }

  if (
    loading &&
    rows.length === 0 &&
    (!syncWorkPaidGelir || workSyncRows.length === 0)
  ) {
    return <p className="text-zinc-400">Yükleniyor…</p>;
  }

  const filterSelectClass =
    "rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200";

  const fieldClass =
    "rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100";

  function formFields(
    form: FinansForm,
    setForm: Dispatch<SetStateAction<FinansForm>>
  ) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-xs text-zinc-400">
          Tarih (gg.aa.yyyy)
          <TrDateInput
            value={form.tarih}
            onValueChange={(tarih) => setForm((s) => ({ ...s, tarih }))}
            className={`mt-1 ${fieldClass}`}
          />
        </label>
        <label className="block text-xs text-zinc-400">
          Tutar
          <TrAmountInput
            value={form.tutar}
            onValueChange={(tutar) => setForm((s) => ({ ...s, tutar }))}
            className={`mt-1 ${fieldClass}`}
          />
        </label>
        <label className="block text-xs text-zinc-400">
          Para birimi
          <select
            value={form.paraBirimi}
            onChange={(e) =>
              setForm((s) => ({ ...s, paraBirimi: e.target.value }))
            }
            className={`mt-1 w-full ${fieldClass}`}
          >
            {IS_PARA_BIRIMI.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-zinc-400">
          Başlık
          <input
            value={form.baslik}
            onChange={(e) => setForm((s) => ({ ...s, baslik: e.target.value }))}
            className={`mt-1 w-full ${fieldClass}`}
          />
        </label>
        <label className="block text-xs text-zinc-400">
          Kategori
          <select
            value={form.kategori}
            onChange={(e) =>
              setForm((s) => ({ ...s, kategori: e.target.value }))
            }
            className={`mt-1 w-full ${fieldClass}`}
          >
            {kategoriOptions.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-zinc-400">
          Durum
          <select
            value={form.durum}
            onChange={(e) => setForm((s) => ({ ...s, durum: e.target.value }))}
            className={`mt-1 w-full ${fieldClass}`}
          >
            {durumOptions.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-zinc-400">
          Vade (gg.aa.yyyy)
          <TrDateInput
            value={form.vadeTarihi}
            onValueChange={(vadeTarihi) =>
              setForm((s) => ({ ...s, vadeTarihi }))
            }
            className={`mt-1 ${fieldClass}`}
          />
        </label>
        <label className="block text-xs text-zinc-400">
          Belge no
          <input
            value={form.belgeNo}
            onChange={(e) =>
              setForm((s) => ({ ...s, belgeNo: e.target.value }))
            }
            className={`mt-1 w-full ${fieldClass}`}
          />
        </label>
        {fixedTip === "Gelir" ? (
          <div className="sm:col-span-2 lg:col-span-2">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
              <span className="font-medium text-zinc-300">İş #</span>
              <span className="text-zinc-500">(İş sekmesi ile eşleştir)</span>
              <Link
                href="/is"
                className="text-sky-400 underline decoration-sky-400/40 hover:decoration-sky-400"
              >
                İş listesi
              </Link>
            </span>
            <select
              className={`mt-1 w-full ${fieldClass}`}
              value={
                workSheetRows.some(
                  (w) => String(w.row) === form.isSheetRow.trim()
                )
                  ? form.isSheetRow.trim()
                  : ""
              }
              onChange={(e) => {
                const v = e.target.value;
                if (!v) {
                  setForm((s) => ({ ...s, isSheetRow: "" }));
                  return;
                }
                const w = workSheetRows.find((x) => String(x.row) === v);
                if (!w) return;
                const pb = (w.paraBirimi ?? "").trim();
                setForm((s) => ({
                  ...s,
                  isSheetRow: v,
                  baslik: s.baslik.trim() ? s.baslik : w.baslik,
                  link: s.link.trim() ? s.link : w.link,
                  paraBirimi: pb || s.paraBirimi,
                  kategori: s.kategori.trim() ? s.kategori : "İş / müşteri",
                }));
              }}
            >
              <option value="">— İş kaydı seçin</option>
              {workSheetRows.map((w) => (
                <option key={w.row} value={String(w.row)}>
                  #{w.row} · {workRowPickerLabel(w)}
                </option>
              ))}
            </select>
            <label className="mt-2 block text-xs text-zinc-500">
              Veya İş sayfasındaki satır numarası
              <input
                value={
                  workSheetRows.some(
                    (w) => String(w.row) === form.isSheetRow.trim()
                  )
                    ? ""
                    : form.isSheetRow
                }
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  setForm((s) => ({ ...s, isSheetRow: raw }));
                }}
                placeholder="Örn. 12"
                className={`mt-1 w-full ${fieldClass}`}
                inputMode="numeric"
              />
            </label>
          </div>
        ) : (
          <label className="block text-xs text-zinc-400">
            İş sheet satırı (isteğe bağlı)
            <input
              value={form.isSheetRow}
              onChange={(e) =>
                setForm((s) => ({ ...s, isSheetRow: e.target.value }))
              }
              className={`mt-1 w-full ${fieldClass}`}
              inputMode="numeric"
            />
          </label>
        )}
        <label className="block text-xs text-zinc-400 sm:col-span-2">
          Link
          <input
            value={form.link}
            onChange={(e) => setForm((s) => ({ ...s, link: e.target.value }))}
            className={`mt-1 w-full ${fieldClass}`}
          />
        </label>
        <label className="block text-xs text-zinc-400 sm:col-span-2 lg:col-span-4">
          Notlar
          <textarea
            value={form.notlar}
            onChange={(e) =>
              setForm((s) => ({ ...s, notlar: e.target.value }))
            }
            rows={2}
            className={`mt-1 w-full ${fieldClass}`}
          />
        </label>
        <label className="block text-xs text-zinc-400 sm:col-span-2 lg:col-span-4">
          Ek
          <input
            value={form.ek}
            onChange={(e) => setForm((s) => ({ ...s, ek: e.target.value }))}
            className={`mt-1 w-full ${fieldClass}`}
            placeholder="Dosya yolu veya kısa not"
          />
        </label>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          placeholder="Başlık, tutar, not, belge… ara"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={busy}
            className="rounded-lg border border-zinc-600 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
          >
            Yenile
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding((a) => !a);
              setNewRow(emptyForm(fixedTip));
            }}
            disabled={busy}
            className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {adding ? "Formu kapat" : addButtonLabel(fixedTip)}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Hızlı filtreler
        </p>
        <div className="flex flex-wrap gap-2">
          <select
            value={filterKategori}
            onChange={(e) => setFilterKategori(e.target.value)}
            className={filterSelectClass}
          >
            <option value="">Kategori (tümü)</option>
            {kategoriOptions.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <select
            value={filterDurum}
            onChange={(e) => setFilterDurum(e.target.value)}
            className={filterSelectClass}
          >
            <option value="">Durum (tümü)</option>
            {durumOptions.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
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
            Yeni kayıt · {fixedTip}
          </h2>
          {formFields(newRow, setNewRow)}
          <div className="mt-3 flex gap-2">
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
        <table className="w-full min-w-[1200px] border-collapse">
          <thead>
            <tr>
              <th className={th}>Satır</th>
              <th className={th}>Tarih</th>
              <th className={th}>Tutar</th>
              <th className={th}>Pb</th>
              <th className={th}>Başlık</th>
              <th className={th}>Kategori</th>
              <th className={th}>Durum</th>
              <th className={th}>Vade</th>
              <th className={th}>Belge</th>
              <th className={th}>İş #</th>
              <th className={th}>Link</th>
              <th className={th}>Notlar</th>
              <th className={th}>Ek</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) =>
              editRow === r.row ? (
                <tr key={r.row} className="bg-zinc-900/80">
                  <td className={td}>{r.row}</td>
                  <td className={td} colSpan={12}>
                    {formFields(editForm, setEditForm)}
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
                <tr
                  key={r.row}
                  className={`hover:bg-zinc-900/40 ${
                    isWorkPaidSyncRow(r) ? "border-l-2 border-sky-500/40" : ""
                  }`}
                >
                  <td className={`${td} text-zinc-500`}>
                    {isWorkPaidSyncRow(r) ? (
                      <span
                        className="inline-flex items-center gap-1.5"
                        title="İş ödemesinden; Finans sekmesine yazılmaz"
                      >
                        <span className="font-medium text-sky-400/90">İş</span>
                        <TagBadge
                          label="Senkron"
                          className="border-sky-500/35 bg-sky-950/40 text-sky-200/90"
                        />
                      </span>
                    ) : (
                      r.row
                    )}
                  </td>
                  <td className={td}>{r.tarih || "—"}</td>
                  <td className={`${td} tabular-nums`}>
                    {formatTrAmountDisplay(r.tutar) || "—"}
                  </td>
                  <td className={td}>{r.paraBirimi || "—"}</td>
                  <td className={`${td} font-medium`}>{r.baslik || "—"}</td>
                  <td className={td}>{r.kategori || "—"}</td>
                  <td className={td}>
                    <TagBadge
                      label={r.durum || "—"}
                      className={finansDurumClass(r.durum)}
                    />
                  </td>
                  <td className={td}>{r.vadeTarihi || "—"}</td>
                  <td className={td}>{r.belgeNo || "—"}</td>
                  <td className={td}>{r.isSheetRow || "—"}</td>
                  <td className={td}>
                    {r.link ? (
                      <a
                        href={r.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-400 underline decoration-sky-400/40 hover:decoration-sky-400"
                      >
                        Aç
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={`${td} max-w-[180px] truncate`} title={r.notlar}>
                    {r.notlar || "—"}
                  </td>
                  <td className={`${td} max-w-[120px] truncate`} title={r.ek}>
                    {r.ek || "—"}
                  </td>
                  <td className={td}>
                    {isWorkPaidSyncRow(r) ? (
                      <Link
                        href="/is/finans"
                        className="text-xs text-sky-400 underline decoration-sky-400/40 hover:decoration-sky-400"
                      >
                        İş → Ödemeler
                      </Link>
                    ) : (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => startEdit(r)}
                          className="rounded border border-zinc-600 px-2 py-1 text-xs hover:bg-zinc-800"
                        >
                          Düzenle
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void onDelete(r.row)}
                          className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-300 hover:bg-red-950/50"
                        >
                          Sil
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
        {filtered.length === 0 ? (
          <div className="space-y-3 p-6 text-center text-sm">
            <p className="text-zinc-500">
              Kayıt yok veya filtreye uymuyor.
            </p>
            {!loading && rows.length === 0 && workSyncRows.length === 0 ? (
              <p className="mx-auto max-w-xl text-xs leading-relaxed text-zinc-500">
                {syncWorkPaidGelir && fixedTip === "Gelir" ? (
                  <>
                    Henüz{" "}
                    <strong className="text-zinc-400">Finans</strong> sekmesinde
                    eşleşen satır yok ve İş’te ödenmiş taksit de yok. Ödemeleri
                    işaretledikten sonra burada{" "}
                    <strong className="text-zinc-400">Gelir</strong> listesinde
                    senkron satırlar olarak görünürler; sheet’e otomatik yazılmaz.
                    Manuel kayıtlar için aşağıdan ekleyin veya{" "}
                    <Link
                      href="/is/finans"
                      className="text-sky-400 underline decoration-sky-400/40 hover:decoration-sky-400"
                    >
                      İş → Ödemeler
                    </Link>{" "}
                    sayfasını kullanın. Sheet’te veri için{" "}
                    <strong className="text-zinc-400">A</strong> sütununda{" "}
                    <strong className="text-zinc-400">{fixedTip}</strong> (veya
                    eş anlamlısı), ilk satır{" "}
                    <span className="font-mono text-zinc-400">tip</span> başlığı ve{" "}
                    <code className="text-zinc-400">SHEET_FINANS_NAME</code> ile
                    uyumlu sekme gerekir.
                  </>
                ) : (
                  <>
                    Bu liste yalnızca e-tablonuzdaki{" "}
                    <strong className="text-zinc-400">Finans</strong> sekmesindeki
                    satırları gösterir. Finans sayfasında veri görmek için sheet’te{" "}
                    <strong className="text-zinc-400">A</strong> sütununda{" "}
                    <strong className="text-zinc-400">{fixedTip}</strong> (veya eş
                    anlamlısı) olan satırlar olmalı; ilk satır başlık (
                    <span className="font-mono text-zinc-400">tip</span>) ve{" "}
                    <code className="text-zinc-400">SHEET_FINANS_NAME</code>{" "}
                    sekme adıyla uyumlu olmalıdır.
                  </>
                )}
              </p>
            ) : null}
            {!loading &&
            rows.length > 0 &&
            sheetTypedRows.length === 0 &&
            !filter.trim() &&
            !filterKategori &&
            !filterDurum ? (
              <p className="mx-auto max-w-xl rounded-lg border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-xs leading-relaxed text-amber-100/90">
                Sheet’te <strong>{rows.length}</strong> satır okundu; hiçbirinin
                tipi <strong>{fixedTip}</strong> olarak tanınmadı. A
                sütunundaki örnek değerler:{" "}
                {tipSamples.length > 0
                  ? tipSamples.map(([t, n], i) => (
                      <span key={`${t}-${i}`} className="whitespace-nowrap">
                        <span className="font-mono text-amber-50/95">“{t}”</span>
                        <span className="text-amber-200/70">×{n}</span>
                        {i < tipSamples.length - 1 ? ", " : ""}
                      </span>
                    ))
                  : "yalnızca boş / eksik hücre"}
                .
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
