"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MEDIA_DURUMLAR,
  MEDIA_KATEGORILER,
  MEDIA_TURLER,
} from "@/lib/constants";
import { MediaKategoriSelect } from "@/components/media/MediaKategoriSelect";
import { MediaTurSelect } from "@/components/media/MediaTurSelect";
import {
  mediaDurumClass,
  mediaKategoriClass,
  mediaTurClass,
} from "@/lib/badge-classes";
import { TagBadge } from "@/components/TagBadge";
import { TrDateInput } from "@/components/TrDateInput";
import { canonicalTrDate } from "@/lib/tr-date-input";

type MediaRowWithRow = {
  row: number;
  baslik: string;
  kategori: string;
  durum: string;
  tur: string;
  link: string;
  tarih: string;
  notlar: string;
  puan: string;
};

type MediaForm = Omit<MediaRowWithRow, "row">;

const emptyForm = (): MediaForm => ({
  baslik: "",
  kategori: "Film",
  durum: "İzlenmedi",
  tur: "Genel",
  link: "",
  tarih: "",
  notlar: "",
  puan: "0",
});

function Stars({ value }: { value: number }) {
  const n = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <span className="whitespace-nowrap text-amber-400" title={`${n}/5`}>
      {"★".repeat(n)}
      <span className="text-zinc-600">{"★".repeat(5 - n)}</span>
    </span>
  );
}

function parsePuan(s: string): number {
  const n = parseInt(String(s).replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

const th =
  "sticky top-0 z-10 border-b border-zinc-700 bg-zinc-900 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400";

const td = "border-b border-zinc-800 px-3 py-2 align-top text-sm text-zinc-200";

export function MediaBoard() {
  const [rows, setRows] = useState<MediaRowWithRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [filterKategori, setFilterKategori] = useState("");
  const [filterDurum, setFilterDurum] = useState("");
  const [filterTur, setFilterTur] = useState("");
  const [adding, setAdding] = useState(false);
  const [newRow, setNewRow] = useState<MediaForm>(emptyForm());
  const [editRow, setEditRow] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<MediaForm>(emptyForm());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/medya", { cache: "no-store" });
      const data = (await res.json()) as
        | { rows: MediaRowWithRow[] }
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
    if (filterKategori) {
      list = list.filter((r) => r.kategori === filterKategori);
    }
    if (filterDurum) {
      list = list.filter((r) => r.durum === filterDurum);
    }
    if (filterTur) {
      list = list.filter((r) => r.tur === filterTur);
    }
    const q = filter.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) =>
      [
        r.baslik,
        r.kategori,
        r.durum,
        r.tur,
        r.link,
        r.tarih,
        r.notlar,
        r.puan,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, filter, filterKategori, filterDurum, filterTur]);

  async function onAdd() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/medya", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRow),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      setNewRow(emptyForm());
      setAdding(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt eklenemedi");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveEdit(rowNum: number) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/medya", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ row: rowNum, ...editForm }),
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
    if (!confirm("Bu satırı silmek istediğinize emin misiniz?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/medya", {
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

  function startEdit(r: MediaRowWithRow) {
    setEditRow(r.row);
    setEditForm({
      baslik: r.baslik,
      kategori: r.kategori,
      durum: r.durum,
      tur: r.tur,
      link: r.link,
      tarih: canonicalTrDate(r.tarih),
      notlar: r.notlar,
      puan: r.puan,
    });
  }

  if (loading && rows.length === 0) {
    return (
      <p className="text-zinc-400">Yükleniyor…</p>
    );
  }

  const filterSelectClass =
    "rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          placeholder="Başlık, not, link… ara"
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
              setNewRow(emptyForm());
            }}
            disabled={busy}
            className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {adding ? "Formu kapat" : "Yeni medya"}
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
            {MEDIA_KATEGORILER.map((k) => (
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
            {MEDIA_DURUMLAR.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <select
            value={filterTur}
            onChange={(e) => setFilterTur(e.target.value)}
            className={filterSelectClass}
          >
            <option value="">Konu / tür (tümü)</option>
            {MEDIA_TURLER.map((k) => (
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
          <h2 className="mb-1 text-sm font-semibold text-zinc-200">
            Yeni kayıt
          </h2>
          <p className="mb-4 text-xs text-zinc-500">
            İçerik türünü (film, kitap, podcast…) kategoriden; konusunu tür
            alanından seçin.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-xs text-zinc-400">
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
              Kategori (içerik türü)
              <MediaKategoriSelect
                value={newRow.kategori}
                onChange={(kategori) =>
                  setNewRow((s) => ({ ...s, kategori }))
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
                {MEDIA_DURUMLAR.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-zinc-400">
              Konu / tür
              <MediaTurSelect
                value={newRow.tur}
                onChange={(tur) => setNewRow((s) => ({ ...s, tur }))}
                className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
              />
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
            <label className="block text-xs text-zinc-400">
              Tarih (gg.aa.yyyy)
              <TrDateInput
                value={newRow.tarih}
                onValueChange={(tarih) => setNewRow((s) => ({ ...s, tarih }))}
                className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="block text-xs text-zinc-400">
              Puan (0–5)
              <input
                type="number"
                min={0}
                max={5}
                value={newRow.puan}
                onChange={(e) =>
                  setNewRow((s) => ({ ...s, puan: e.target.value }))
                }
                className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="block text-xs text-zinc-400 sm:col-span-2 lg:col-span-4">
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
        <table className="w-full min-w-[960px] border-collapse">
          <thead>
            <tr>
              <th className={th}>Satır</th>
              <th className={th}>Başlık</th>
              <th className={th}>Kategori</th>
              <th className={th}>Durum</th>
              <th className={th}>Konu / tür</th>
              <th className={th}>Link</th>
              <th className={th}>Tarih</th>
              <th className={th}>Notlar</th>
              <th className={th}>Puan</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) =>
              editRow === r.row ? (
                <tr key={r.row} className="bg-zinc-900/80">
                  <td className={td}>{r.row}</td>
                  <td className={td} colSpan={8}>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      <input
                        value={editForm.baslik}
                        onChange={(e) =>
                          setEditForm((s) => ({ ...s, baslik: e.target.value }))
                        }
                        className="rounded border border-zinc-600 bg-zinc-950 px-2 py-1 text-sm"
                        placeholder="Başlık"
                      />
                      <MediaKategoriSelect
                        value={editForm.kategori}
                        onChange={(kategori) =>
                          setEditForm((s) => ({ ...s, kategori }))
                        }
                        className="rounded border border-zinc-600 bg-zinc-950 px-2 py-1 text-sm"
                      />
                      <select
                        value={editForm.durum}
                        onChange={(e) =>
                          setEditForm((s) => ({ ...s, durum: e.target.value }))
                        }
                        className="rounded border border-zinc-600 bg-zinc-950 px-2 py-1 text-sm"
                      >
                        {MEDIA_DURUMLAR.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                      <MediaTurSelect
                        value={editForm.tur}
                        onChange={(tur) => setEditForm((s) => ({ ...s, tur }))}
                        className="rounded border border-zinc-600 bg-zinc-950 px-2 py-1 text-sm"
                      />
                      <input
                        value={editForm.link}
                        onChange={(e) =>
                          setEditForm((s) => ({ ...s, link: e.target.value }))
                        }
                        className="rounded border border-zinc-600 bg-zinc-950 px-2 py-1 text-sm"
                        placeholder="Link"
                      />
                      <TrDateInput
                        value={editForm.tarih}
                        onValueChange={(tarih) =>
                          setEditForm((s) => ({ ...s, tarih }))
                        }
                        className="rounded border border-zinc-600 bg-zinc-950 px-2 py-1 text-sm"
                      />
                      <input
                        type="number"
                        min={0}
                        max={5}
                        value={editForm.puan}
                        onChange={(e) =>
                          setEditForm((s) => ({ ...s, puan: e.target.value }))
                        }
                        className="rounded border border-zinc-600 bg-zinc-950 px-2 py-1 text-sm"
                      />
                      <textarea
                        value={editForm.notlar}
                        onChange={(e) =>
                          setEditForm((s) => ({ ...s, notlar: e.target.value }))
                        }
                        className="sm:col-span-2 rounded border border-zinc-600 bg-zinc-950 px-2 py-1 text-sm lg:col-span-3"
                        rows={2}
                        placeholder="Notlar"
                      />
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
                <tr
                  key={r.row}
                  className="hover:bg-zinc-900/40"
                >
                  <td className={`${td} text-zinc-500`}>{r.row}</td>
                  <td className={`${td} font-medium`}>{r.baslik || "—"}</td>
                  <td className={td}>
                    <TagBadge
                      label={r.kategori}
                      className={mediaKategoriClass(r.kategori)}
                    />
                  </td>
                  <td className={td}>
                    <TagBadge
                      label={r.durum}
                      className={mediaDurumClass(r.durum)}
                    />
                  </td>
                  <td className={td}>
                    <TagBadge
                      label={r.tur}
                      className={mediaTurClass(r.tur)}
                    />
                  </td>
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
                  <td className={td}>{r.tarih || "—"}</td>
                  <td className={`${td} max-w-[200px] truncate`} title={r.notlar}>
                    {r.notlar || "—"}
                  </td>
                  <td className={td}>
                    <Stars value={parsePuan(r.puan)} />
                  </td>
                  <td className={td}>
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
                  </td>
                </tr>
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
    </div>
  );
}
