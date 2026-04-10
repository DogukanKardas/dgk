"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CRM_ASAMALAR,
  CRM_SCORE_CRITERIA,
  computeLeadScore,
  parseCriteriaJson,
  stringifyCriteriaJson,
  type CriteriaState,
} from "@/lib/crm-scoring";

export type CrmLeadRowWithRow = {
  row: number;
  osmKey: string;
  ad: string;
  adres: string;
  telefon: string;
  webSitesi: string;
  webVarMi: string;
  kaynak: string;
  notlar: string;
  asama: string;
  skor: string;
  kriterJson: string;
  olusturma: string;
  guncelleme: string;
};

type LeadForm = Omit<CrmLeadRowWithRow, "row">;

const ASAMA_LABEL: Record<string, string> = {
  yeni: "Yeni",
  iletişim: "İletişim",
  teklif: "Teklif",
  kazanıldı: "Kazanıldı",
  kayip: "Kayıp",
};

function emptyForm(): LeadForm {
  const today = new Date().toISOString().slice(0, 10);
  return {
    osmKey: "",
    ad: "",
    adres: "",
    telefon: "",
    webSitesi: "",
    webVarMi: "hayır",
    kaynak: "manuel",
    notlar: "",
    asama: "yeni",
    skor: "0",
    kriterJson: "{}",
    olusturma: today,
    guncelleme: today,
  };
}

const th =
  "sticky top-0 z-10 border-b border-zinc-700 bg-zinc-900 px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400";

const td = "border-b border-zinc-800 px-2 py-2 align-top text-sm text-zinc-200";

export function CrmLeadsPanel() {
  const [rows, setRows] = useState<CrmLeadRowWithRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [filterAsama, setFilterAsama] = useState("");
  const [adding, setAdding] = useState(false);
  const [newRow, setNewRow] = useState<LeadForm>(emptyForm());
  const [newCriteria, setNewCriteria] = useState<CriteriaState>({});
  const [editRow, setEditRow] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<LeadForm>(emptyForm());
  const [editCriteria, setEditCriteria] = useState<CriteriaState>({});
  const [busy, setBusy] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/crm/leads", { cache: "no-store" });
      const data = (await res.json()) as
        | { rows: CrmLeadRowWithRow[] }
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

  const filtered = useMemo(() => {
    let list = rows;
    if (filterAsama) {
      list = list.filter((r) => r.asama === filterAsama);
    }
    const q = filter.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) =>
      [
        r.ad,
        r.adres,
        r.telefon,
        r.webSitesi,
        r.notlar,
        r.kaynak,
        r.asama,
        r.skor,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, filter, filterAsama]);

  const filteredRowNums = useMemo(
    () => filtered.map((r) => r.row),
    [filtered]
  );
  const allFilteredSelected =
    filteredRowNums.length > 0 &&
    filteredRowNums.every((n) => selectedRows.has(n));
  const someFilteredSelected = filteredRowNums.some((n) =>
    selectedRows.has(n)
  );

  function toggleSelectAllFiltered(checked: boolean) {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (checked) {
        for (const n of filteredRowNums) next.add(n);
      } else {
        for (const n of filteredRowNums) next.delete(n);
      }
      return next;
    });
  }

  function toggleSelectRow(row: number, checked: boolean) {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (checked) next.add(row);
      else next.delete(row);
      return next;
    });
  }

  function syncNewScore(c: CriteriaState) {
    setNewCriteria(c);
    setNewRow((prev) => ({
      ...prev,
      kriterJson: stringifyCriteriaJson(c),
      skor: String(computeLeadScore(c)),
    }));
  }

  function syncEditScore(c: CriteriaState) {
    setEditCriteria(c);
    setEditForm((prev) => ({
      ...prev,
      kriterJson: stringifyCriteriaJson(c),
      skor: String(computeLeadScore(c)),
    }));
  }

  async function onAdd() {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        ...newRow,
        kriterJson: stringifyCriteriaJson(newCriteria),
        skor: String(computeLeadScore(newCriteria)),
      };
      const res = await fetch("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      setNewRow(emptyForm());
      setNewCriteria({});
      setAdding(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt eklenemedi");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveEdit() {
    if (editRow == null) return;
    setBusy(true);
    setError(null);
    try {
      const payload = {
        row: editRow,
        ...editForm,
        kriterJson: stringifyCriteriaJson(editCriteria),
        skor: String(computeLeadScore(editCriteria)),
      };
      const res = await fetch("/api/crm/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  async function onDeleteMany(sheetRows: number[]) {
    if (sheetRows.length === 0) return;
    const msg =
      sheetRows.length === 1
        ? "Bu adayı silmek istiyor musunuz?"
        : `${sheetRows.length} adayı silmek istiyor musunuz?`;
    if (!confirm(msg)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/crm/leads", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: sheetRows }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      setSelectedRows((prev) => {
        const next = new Set(prev);
        for (const r of sheetRows) next.delete(r);
        return next;
      });
      if (editRow != null && sheetRows.includes(editRow)) setEditRow(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Silinemedi");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(row: number) {
    await onDeleteMany([row]);
  }

  const headerSelectRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const el = headerSelectRef.current;
    if (!el) return;
    el.indeterminate = someFilteredSelected && !allFilteredSelected;
  }, [someFilteredSelected, allFilteredSelected]);

  function startEdit(r: CrmLeadRowWithRow) {
    const { row, ...rest } = r;
    setEditRow(row);
    setEditForm(rest);
    setEditCriteria(parseCriteriaJson(r.kriterJson));
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <label className="block min-w-[200px] flex-1 text-xs text-zinc-400">
          Ara
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Ad, adres, not…"
            className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          />
        </label>
        <label className="block text-xs text-zinc-400">
          Aşama
          <select
            value={filterAsama}
            onChange={(e) => setFilterAsama(e.target.value)}
            className="mt-1 block rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm"
          >
            <option value="">Tümü</option>
            {CRM_ASAMALAR.map((a) => (
              <option key={a} value={a}>
                {ASAMA_LABEL[a] ?? a}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-zinc-600 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
        >
          Yenile
        </button>
        <button
          type="button"
          disabled={busy || selectedRows.size === 0}
          onClick={() =>
            void onDeleteMany([...selectedRows].sort((a, b) => a - b))
          }
          className="rounded-lg border border-red-500/50 px-3 py-2 text-sm text-red-200 hover:bg-red-950/50 disabled:opacity-40"
        >
          Seçilenleri sil ({selectedRows.size})
        </button>
        <button
          type="button"
          onClick={() => {
            setAdding(!adding);
            if (!adding) {
              setNewRow(emptyForm());
              setNewCriteria({});
            }
          }}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          {adding ? "İptal" : "Yeni aday"}
        </button>
      </div>

      {adding ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-200">Yeni aday</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs text-zinc-400 sm:col-span-2">
              Ad
              <input
                value={newRow.ad}
                onChange={(e) =>
                  setNewRow((p) => ({ ...p, ad: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-zinc-400">
              Aşama
              <select
                value={newRow.asama}
                onChange={(e) =>
                  setNewRow((p) => ({ ...p, asama: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm"
              >
                {CRM_ASAMALAR.map((a) => (
                  <option key={a} value={a}>
                    {ASAMA_LABEL[a] ?? a}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-zinc-400 sm:col-span-2">
              Adres
              <input
                value={newRow.adres}
                onChange={(e) =>
                  setNewRow((p) => ({ ...p, adres: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-zinc-400">
              Telefon
              <input
                value={newRow.telefon}
                onChange={(e) =>
                  setNewRow((p) => ({ ...p, telefon: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-zinc-400">
              Web
              <input
                value={newRow.webSitesi}
                onChange={(e) =>
                  setNewRow((p) => ({ ...p, webSitesi: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-zinc-400">
              Web var mı
              <select
                value={newRow.webVarMi}
                onChange={(e) =>
                  setNewRow((p) => ({ ...p, webVarMi: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm"
              >
                <option value="evet">Evet</option>
                <option value="hayır">Hayır</option>
              </select>
            </label>
            <label className="text-xs text-zinc-400 sm:col-span-3">
              Notlar
              <textarea
                value={newRow.notlar}
                onChange={(e) =>
                  setNewRow((p) => ({ ...p, notlar: e.target.value }))
                }
                rows={2}
                className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="rounded-lg border border-zinc-700 p-3">
            <p className="mb-2 text-xs font-medium text-zinc-400">
              Puan kriterleri (skor: {computeLeadScore(newCriteria)})
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {CRM_SCORE_CRITERIA.map((c) => (
                <label
                  key={c.id}
                  className="flex cursor-pointer items-start gap-2 text-sm text-zinc-300"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(newCriteria[c.id])}
                    onChange={(e) => {
                      const next = {
                        ...newCriteria,
                        [c.id]: e.target.checked,
                      };
                      syncNewScore(next);
                    }}
                    className="mt-1"
                  />
                  <span>
                    {c.label}{" "}
                    <span className="text-zinc-500">
                      ({c.points > 0 ? "+" : ""}
                      {c.points})
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <button
            type="button"
            disabled={busy || !newRow.ad.trim()}
            onClick={() => void onAdd()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            Kaydet
          </button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="min-w-[900px] w-full border-collapse text-left">
          <thead>
            <tr>
              <th className={`${th} w-10`}>
                <input
                  ref={headerSelectRef}
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={(e) => toggleSelectAllFiltered(e.target.checked)}
                  disabled={loading || filtered.length === 0}
                  aria-label="Görünen satırların tümünü seç"
                />
              </th>
              <th className={th}>Skor</th>
              <th className={th}>Ad</th>
              <th className={th}>Aşama</th>
              <th className={th}>Web</th>
              <th className={th}>Kaynak</th>
              <th className={th}>Adres</th>
              <th className={th}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className={`${td} text-zinc-500`}>
                  Yükleniyor…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className={`${td} text-zinc-500`}>
                  Kayıt yok veya filtreye uymuyor.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.row}>
                  <td className={`${td} w-10`}>
                    <input
                      type="checkbox"
                      checked={selectedRows.has(r.row)}
                      onChange={(e) =>
                        toggleSelectRow(r.row, e.target.checked)
                      }
                      aria-label={`Seç: ${r.ad}`}
                    />
                  </td>
                  <td className={td}>
                    <span className="font-mono text-amber-400">{r.skor}</span>
                  </td>
                  <td className={td}>
                    <div className="font-medium text-zinc-100">{r.ad}</div>
                    {r.telefon ? (
                      <div className="text-xs text-zinc-500">{r.telefon}</div>
                    ) : null}
                  </td>
                  <td className={td}>
                    {ASAMA_LABEL[r.asama] ?? r.asama}
                  </td>
                  <td className={td}>
                    <span className="text-xs">{r.webVarMi}</span>
                    {r.webSitesi ? (
                      <a
                        href={
                          r.webSitesi.startsWith("http")
                            ? r.webSitesi
                            : `https://${r.webSitesi}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 text-sky-400 underline decoration-sky-400/30"
                      >
                        link
                      </a>
                    ) : null}
                  </td>
                  <td className={`${td} text-xs text-zinc-500`}>{r.kaynak}</td>
                  <td className={`${td} max-w-[220px] text-xs`}>{r.adres}</td>
                  <td className={td}>
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(r)}
                        className="rounded border border-zinc-600 px-2 py-1 text-xs hover:bg-zinc-800"
                      >
                        Düzenle
                      </button>
                      <button
                        type="button"
                        onClick={() => void onDelete(r.row)}
                        className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-300 hover:bg-red-950/40"
                      >
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editRow != null ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-950 p-5 shadow-xl">
            <h3 className="mb-4 text-sm font-semibold text-zinc-100">
              Aday düzenle (satır {editRow})
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-zinc-400 sm:col-span-2">
                Ad
                <input
                  value={editForm.ad}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, ad: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-zinc-400">
                Aşama
                <select
                  value={editForm.asama}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, asama: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm"
                >
                  {CRM_ASAMALAR.map((a) => (
                    <option key={a} value={a}>
                      {ASAMA_LABEL[a] ?? a}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-zinc-400">
                Kaynak
                <input
                  value={editForm.kaynak}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, kaynak: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-zinc-400 sm:col-span-2">
                Adres
                <input
                  value={editForm.adres}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, adres: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-zinc-400">
                Telefon
                <input
                  value={editForm.telefon}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, telefon: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-zinc-400">
                Web
                <input
                  value={editForm.webSitesi}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, webSitesi: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-zinc-400">
                Web var mı
                <select
                  value={editForm.webVarMi}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, webVarMi: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm"
                >
                  <option value="evet">Evet</option>
                  <option value="hayır">Hayır</option>
                </select>
              </label>
              <label className="text-xs text-zinc-400 sm:col-span-2">
                Notlar
                <textarea
                  value={editForm.notlar}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, notlar: e.target.value }))
                  }
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="mt-4 rounded-lg border border-zinc-700 p-3">
              <p className="mb-2 text-xs font-medium text-zinc-400">
                Puan kriterleri (skor: {computeLeadScore(editCriteria)})
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {CRM_SCORE_CRITERIA.map((c) => (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-start gap-2 text-sm text-zinc-300"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(editCriteria[c.id])}
                      onChange={(e) => {
                        const next = {
                          ...editCriteria,
                          [c.id]: e.target.checked,
                        };
                        syncEditScore(next);
                      }}
                      className="mt-1"
                    />
                    <span>
                      {c.label}{" "}
                      <span className="text-zinc-500">
                        ({c.points > 0 ? "+" : ""}
                        {c.points})
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void onSaveEdit()}
                disabled={busy}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-500"
              >
                Kaydet
              </button>
              <button
                type="button"
                onClick={() => setEditRow(null)}
                className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-200"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
