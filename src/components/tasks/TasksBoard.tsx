"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GOREV_KATEGORILER,
  GOREV_ONCELIK,
  GOREV_SON_DURUM,
  IS_DURUM,
  IS_SIRKET,
} from "@/lib/constants";
import {
  gorevKategoriClass,
  gorevOncelikClass,
  gorevSonDurumClass,
  isDurumClass,
  isSirketClass,
  progressBarColor,
} from "@/lib/badge-classes";
import { GorevKategoriSelect } from "@/components/tasks/GorevKategoriSelect";
import { TaskCreatePanel } from "@/components/tasks/TaskCreatePanel";
import { TagBadge } from "@/components/TagBadge";
import { TrDateInput } from "@/components/TrDateInput";
import {
  composeTaskNotlar,
  parseTaskNotlar,
  type TaskNotlarMeta,
} from "@/lib/task-notlar-meta";
import { canonicalTrDate, canonicalTrDateLoose } from "@/lib/tr-date-input";
import type { WorkRowWithRow } from "@/lib/sheets/work-sheet";

type TaskRowWithRow = {
  row: number;
  tarih: string;
  gorevler: string;
  kategori: string;
  oncelik: string;
  sonDurum: string;
  bitisTarihi: string;
  ilerleme: string;
  dosya: string;
  notlar: string;
};

type TaskForm = Omit<TaskRowWithRow, "row">;

type UnifiedRow =
  | { kind: "task"; task: TaskRowWithRow }
  | { kind: "work"; work: WorkRowWithRow };

const TASK_TERMINAL = new Set(["Tamamlandı", "İptal"]);
const WORK_CLOSED = new Set(["Tamamlandı", "Ödendi"]);

function emptyForm(): TaskForm {
  return {
    tarih: "",
    gorevler: "",
    kategori: "Plan & hedef",
    oncelik: "P2",
    sonDurum: "Başlanmadı",
    bitisTarihi: "",
    ilerleme: "0",
    dosya: "",
    notlar: "",
  };
}

function trDateToSortKey(s: string): number {
  const t = s.trim();
  if (!t) return 0;
  const m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return 0;
  const d = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const y = parseInt(m[3], 10);
  if (!Number.isFinite(y) || mo < 1 || mo > 12 || d < 1 || d > 31) {
    return 0;
  }
  return y * 10000 + mo * 100 + d;
}

function taskSortKey(r: TaskRowWithRow): number {
  const b = r.bitisTarihi.trim() ? canonicalTrDate(r.bitisTarihi) : "";
  const t = r.tarih.trim() ? canonicalTrDate(r.tarih) : "";
  return trDateToSortKey(b || t);
}

function workSortKey(r: WorkRowWithRow): number {
  const b = r.bitisTarihi.trim() ? canonicalTrDateLoose(r.bitisTarihi) : "";
  const t = r.tarih.trim() ? canonicalTrDateLoose(r.tarih) : "";
  return trDateToSortKey(b || t);
}

function parseProgress(s: string): number {
  const t = String(s).replace("%", "").trim();
  const n = parseInt(t, 10);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function ProgressCell({ raw }: { raw: string }) {
  const pct = parseProgress(raw);
  return (
    <div className="min-w-[100px] space-y-1">
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all ${progressBarColor(pct)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-zinc-400">{pct}%</span>
    </div>
  );
}

const th =
  "sticky top-0 z-10 border-b border-zinc-700 bg-zinc-900 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400";

const td = "border-b border-zinc-800 px-3 py-2 align-top text-sm text-zinc-200";

function isProbablyUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

function TaskNotlarPreview({ raw }: { raw: string }) {
  const { body, meta } = parseTaskNotlar(raw);
  const hasMeta =
    Boolean(meta.hatirlatma) ||
    (meta.altGorevler && meta.altGorevler.length > 0) ||
    (meta.etiketler && meta.etiketler.length > 0);
  const full =
    body +
    (hasMeta
      ? ` ${meta.hatirlatma ?? ""} ${(meta.altGorevler ?? []).join(" ")} ${(meta.etiketler ?? []).join(" ")}`
      : "");
  return (
    <div className="max-w-[240px]">
      <p className="truncate text-zinc-200" title={full.trim() || undefined}>
        {body.trim() ? body : !hasMeta ? "—" : ""}
      </p>
      {hasMeta ? (
        <div className="mt-1 flex flex-wrap gap-1">
          {meta.hatirlatma ? (
            <span
              className="rounded border border-amber-500/35 bg-amber-500/15 px-1 py-0.5 text-[10px] text-amber-100"
              title="Hatırlatma"
            >
              {meta.hatirlatma}
            </span>
          ) : null}
          {meta.altGorevler && meta.altGorevler.length > 0 ? (
            <span className="rounded border border-zinc-600 bg-zinc-800/80 px-1 py-0.5 text-[10px] text-zinc-300">
              {meta.altGorevler.length} alt madde
            </span>
          ) : null}
          {(meta.etiketler ?? []).map((t) => (
            <span
              key={t}
              className="rounded border border-sky-500/30 bg-sky-500/10 px-1 py-0.5 text-[10px] text-sky-200"
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function TasksBoard() {
  const [taskRows, setTaskRows] = useState<TaskRowWithRow[]>([]);
  const [workRows, setWorkRows] = useState<WorkRowWithRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [workError, setWorkError] = useState<string | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);

  const [filter, setFilter] = useState("");
  const [includeCompletedTasks, setIncludeCompletedTasks] = useState(false);
  const [includeCompletedWork, setIncludeCompletedWork] = useState(false);
  const [filterKategori, setFilterKategori] = useState("");
  const [filterOncelik, setFilterOncelik] = useState("");
  const [filterSonDurum, setFilterSonDurum] = useState("");
  const [filterSirket, setFilterSirket] = useState("");
  const [filterIsDurum, setFilterIsDurum] = useState("");

  const [adding, setAdding] = useState(false);
  const [createKey, setCreateKey] = useState(0);
  const [editRow, setEditRow] = useState<number | null>(null);
  const [editMeta, setEditMeta] = useState<TaskNotlarMeta>({});
  const [editForm, setEditForm] = useState<TaskForm>(emptyForm());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setTaskError(null);
    setWorkError(null);
    setFatalError(null);
    try {
      const [gRes, wRes] = await Promise.all([
        fetch("/api/gorevler", { cache: "no-store" }),
        fetch("/api/is", { cache: "no-store" }),
      ]);

      const gData = (await gRes.json()) as
        | { rows: TaskRowWithRow[] }
        | { error: string };
      if (gRes.ok && "rows" in gData) {
        setTaskRows(gData.rows);
      } else {
        setTaskRows([]);
        setTaskError("error" in gData ? gData.error : `Görevler: Hata ${gRes.status}`);
      }

      const wData = (await wRes.json()) as
        | { rows: WorkRowWithRow[] }
        | { error: string };
      if (wRes.ok && "rows" in wData) {
        setWorkRows(wData.rows);
      } else {
        setWorkRows([]);
        setWorkError("error" in wData ? wData.error : `İş: Hata ${wRes.status}`);
      }
    } catch {
      setFatalError("Ağ hatası");
      setTaskRows([]);
      setWorkRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const displayRows = useMemo(() => {
    let tasks = taskRows;
    let works = workRows;

    if (!includeCompletedTasks) {
      tasks = tasks.filter((t) => !TASK_TERMINAL.has(t.sonDurum));
    }
    if (!includeCompletedWork) {
      works = works.filter((w) => !WORK_CLOSED.has(w.durum));
    }

    if (filterKategori) {
      tasks = tasks.filter((t) => t.kategori === filterKategori);
    }
    if (filterOncelik) {
      tasks = tasks.filter((t) => t.oncelik === filterOncelik);
    }
    if (filterSonDurum) {
      tasks = tasks.filter((t) => t.sonDurum === filterSonDurum);
    }
    if (filterSirket) {
      works = works.filter((w) => w.sirket === filterSirket);
    }
    if (filterIsDurum) {
      works = works.filter((w) => w.durum === filterIsDurum);
    }

    const unified: UnifiedRow[] = [
      ...tasks.map((task) => ({ kind: "task" as const, task })),
      ...works.map((work) => ({ kind: "work" as const, work })),
    ];

    const q = filter.trim().toLowerCase();
    let list = unified;
    if (q) {
      list = unified.filter((u) => {
        if (u.kind === "task") {
          const r = u.task;
          const { body, meta } = parseTaskNotlar(r.notlar);
          return [
            r.tarih,
            r.gorevler,
            r.kategori,
            r.oncelik,
            r.sonDurum,
            r.bitisTarihi,
            r.ilerleme,
            r.dosya,
            body,
            r.notlar,
            meta.hatirlatma ?? "",
            ...(meta.altGorevler ?? []),
            ...(meta.etiketler ?? []),
          ]
            .join(" ")
            .toLowerCase()
            .includes(q);
        }
        const r = u.work;
        return [
          r.tarih,
          r.baslik,
          r.sirket,
          r.isTuru,
          r.durum,
          r.tutar,
          r.paraBirimi,
          r.bitisTarihi,
          r.link,
          r.notlar,
          r.musteriIsmi,
          r.iletisim,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);
      });
    }

    list = [...list].sort((a, b) => {
      const ka =
        a.kind === "task" ? taskSortKey(a.task) : workSortKey(a.work);
      const kb =
        b.kind === "task" ? taskSortKey(b.task) : workSortKey(b.work);
      return kb - ka;
    });

    return list;
  }, [
    taskRows,
    workRows,
    filter,
    includeCompletedTasks,
    includeCompletedWork,
    filterKategori,
    filterOncelik,
    filterSonDurum,
    filterSirket,
    filterIsDurum,
  ]);

  async function onAdd(row: TaskForm) {
    setBusy(true);
    setFatalError(null);
    try {
      const res = await fetch("/api/gorevler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      setAdding(false);
      await load();
    } catch (e) {
      setFatalError(e instanceof Error ? e.message : "Kayıt eklenemedi");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveEdit(rowNum: number) {
    setBusy(true);
    setFatalError(null);
    try {
      const notlar = composeTaskNotlar(editForm.notlar, editMeta);
      const res = await fetch("/api/gorevler", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ row: rowNum, ...editForm, notlar }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      setEditRow(null);
      setEditMeta({});
      await load();
    } catch (e) {
      setFatalError(e instanceof Error ? e.message : "Güncellenemedi");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(rowNum: number) {
    if (!confirm("Bu satırı silmek istediğinize emin misiniz?")) return;
    setBusy(true);
    setFatalError(null);
    try {
      const res = await fetch("/api/gorevler", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ row: rowNum }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      if (editRow === rowNum) {
        setEditRow(null);
        setEditMeta({});
      }
      await load();
    } catch (e) {
      setFatalError(e instanceof Error ? e.message : "Silinemedi");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(r: TaskRowWithRow) {
    const { body, meta } = parseTaskNotlar(r.notlar);
    setEditRow(r.row);
    setEditMeta(meta);
    setEditForm({
      tarih: canonicalTrDate(r.tarih),
      gorevler: r.gorevler,
      kategori: r.kategori,
      oncelik: r.oncelik,
      sonDurum: r.sonDurum,
      bitisTarihi: canonicalTrDate(r.bitisTarihi),
      ilerleme: r.ilerleme,
      dosya: r.dosya,
      notlar: body,
    });
  }

  const filterSelectClass =
    "rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200";

  const editGrid = (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      <TrDateInput
        value={editForm.tarih}
        onValueChange={(tarih) => setEditForm((s) => ({ ...s, tarih }))}
        className="rounded border border-zinc-600 bg-zinc-950 px-2 py-1 text-sm"
      />
      <input
        value={editForm.gorevler}
        onChange={(e) =>
          setEditForm((s) => ({ ...s, gorevler: e.target.value }))
        }
        className="sm:col-span-2 rounded border border-zinc-600 bg-zinc-950 px-2 py-1 text-sm"
        placeholder="Görevler"
      />
      <GorevKategoriSelect
        value={editForm.kategori}
        onChange={(kategori) => setEditForm((s) => ({ ...s, kategori }))}
        className="rounded border border-zinc-600 bg-zinc-950 px-2 py-1 text-sm"
      />
      <select
        value={editForm.oncelik}
        onChange={(e) =>
          setEditForm((s) => ({ ...s, oncelik: e.target.value }))
        }
        className="rounded border border-zinc-600 bg-zinc-950 px-2 py-1 text-sm"
      >
        {GOREV_ONCELIK.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </select>
      <select
        value={editForm.sonDurum}
        onChange={(e) =>
          setEditForm((s) => ({ ...s, sonDurum: e.target.value }))
        }
        className="rounded border border-zinc-600 bg-zinc-950 px-2 py-1 text-sm"
      >
        {GOREV_SON_DURUM.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </select>
      <TrDateInput
        value={editForm.bitisTarihi}
        onValueChange={(bitisTarihi) =>
          setEditForm((s) => ({ ...s, bitisTarihi }))
        }
        className="rounded border border-zinc-600 bg-zinc-950 px-2 py-1 text-sm"
        placeholder="gg.aa.yyyy"
      />
      <input
        type="number"
        min={0}
        max={100}
        value={editForm.ilerleme}
        onChange={(e) =>
          setEditForm((s) => ({ ...s, ilerleme: e.target.value }))
        }
        className="rounded border border-zinc-600 bg-zinc-950 px-2 py-1 text-sm"
        placeholder="İlerleme %"
      />
      <input
        value={editForm.dosya}
        onChange={(e) =>
          setEditForm((s) => ({ ...s, dosya: e.target.value }))
        }
        className="sm:col-span-2 rounded border border-zinc-600 bg-zinc-950 px-2 py-1 text-sm"
        placeholder="Dosya / link"
      />
      <textarea
        value={editForm.notlar}
        onChange={(e) =>
          setEditForm((s) => ({ ...s, notlar: e.target.value }))
        }
        className="sm:col-span-2 rounded border border-zinc-600 bg-zinc-950 px-2 py-1 text-sm lg:col-span-3"
        rows={2}
        placeholder="Açıklama / notlar (üst kısım)"
      />
      <div className="sm:col-span-2 lg:col-span-3 rounded border border-zinc-700/80 bg-zinc-950/50 p-3">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          Ek bilgiler (hatırlatma, alt maddeler, etiketler)
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block text-xs text-zinc-400">
            Hatırlatma
            <TrDateInput
              value={editMeta.hatirlatma ?? ""}
              onValueChange={(hatirlatma) =>
                setEditMeta((m) => ({ ...m, hatirlatma }))
              }
              className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1 text-sm"
            />
          </label>
          <label className="block text-xs text-zinc-400 sm:col-span-2">
            Alt maddeler (satır başına bir)
            <textarea
              value={(editMeta.altGorevler ?? []).join("\n")}
              onChange={(e) =>
                setEditMeta((m) => ({
                  ...m,
                  altGorevler: e.target.value
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean),
                }))
              }
              rows={3}
              className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1 text-sm"
            />
          </label>
          <label className="block text-xs text-zinc-400 sm:col-span-2">
            Etiketler (virgülle)
            <input
              value={(editMeta.etiketler ?? []).join(", ")}
              onChange={(e) =>
                setEditMeta((m) => ({
                  ...m,
                  etiketler: e.target.value
                    .split(/[,;]/)
                    .map((s) => s.trim())
                    .filter(Boolean),
                }))
              }
              className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1 text-sm"
            />
          </label>
        </div>
      </div>
    </div>
  );

  if (loading && taskRows.length === 0 && workRows.length === 0) {
    return <p className="text-zinc-400">Yükleniyor…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <input
          type="search"
          placeholder="Tüm görev ve iş kayıtlarında ara…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
        <div className="flex flex-wrap gap-2">
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
              if (adding) {
                setAdding(false);
              } else {
                setCreateKey((k) => k + 1);
                setAdding(true);
              }
            }}
            disabled={busy}
            className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {adding ? "Formu kapat" : "Yeni görev"}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Hızlı filtreler
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-300">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={includeCompletedTasks}
              onChange={(e) => setIncludeCompletedTasks(e.target.checked)}
              className="rounded border-zinc-600 bg-zinc-900"
            />
            Tamamlanan / iptal görevler
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={includeCompletedWork}
              onChange={(e) => setIncludeCompletedWork(e.target.checked)}
              className="rounded border-zinc-600 bg-zinc-900"
            />
            Tamamlanan / ödenen işler
          </label>
        </div>
        <div className="flex flex-wrap gap-2 gap-y-2">
          <select
            value={filterKategori}
            onChange={(e) => setFilterKategori(e.target.value)}
            className={filterSelectClass}
          >
            <option value="">Görev kategorisi (tümü)</option>
            {GOREV_KATEGORILER.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <select
            value={filterOncelik}
            onChange={(e) => setFilterOncelik(e.target.value)}
            className={filterSelectClass}
          >
            <option value="">Öncelik (tümü)</option>
            {GOREV_ONCELIK.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <select
            value={filterSonDurum}
            onChange={(e) => setFilterSonDurum(e.target.value)}
            className={filterSelectClass}
          >
            <option value="">Görev son durumu (tümü)</option>
            {GOREV_SON_DURUM.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <select
            value={filterSirket}
            onChange={(e) => setFilterSirket(e.target.value)}
            className={filterSelectClass}
          >
            <option value="">İş şirketi (tümü)</option>
            {IS_SIRKET.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <select
            value={filterIsDurum}
            onChange={(e) => setFilterIsDurum(e.target.value)}
            className={filterSelectClass}
          >
            <option value="">İş durumu (tümü)</option>
            {IS_DURUM.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
      </div>

      {fatalError ? (
        <div className="rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {fatalError}
        </div>
      ) : null}

      {taskError || workError ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
          {taskError ? <p>Görevler yüklenemedi: {taskError}</p> : null}
          {workError ? <p>İş kayıtları yüklenemedi: {workError}</p> : null}
          <p className="mt-1 text-xs text-amber-200/80">
            Diğer kaynak yine aşağıda listelenir.
          </p>
        </div>
      ) : null}

      {adding ? (
        <TaskCreatePanel
          key={createKey}
          busy={busy}
          onCancel={() => setAdding(false)}
          onSave={async (row) => {
            await onAdd(row);
          }}
        />
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full min-w-[1200px] border-collapse">
          <thead>
            <tr>
              <th className={th}>Kaynak</th>
              <th className={th}>Satır</th>
              <th className={th}>Tarih</th>
              <th className={th}>Başlık</th>
              <th className={th}>Kategori / şirket</th>
              <th className={th}>Öncelik</th>
              <th className={th}>Durum</th>
              <th className={th}>Bitiş</th>
              <th className={th}>İlerleme</th>
              <th className={th}>Dosya</th>
              <th className={th}>Notlar</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody>
            {displayRows.map((u) => {
              if (u.kind === "task") {
                const r = u.task;
                const isEditing = editRow === r.row;
                if (isEditing) {
                  return (
                    <tr key={`task-${r.row}`} className="bg-zinc-900/80">
                      <td className={td}>
                        <TagBadge
                          label="Görev"
                          className="bg-sky-500/20 text-sky-200 border-sky-500/35"
                        />
                      </td>
                      <td className={`${td} text-zinc-500`}>{r.row}</td>
                      <td className={td} colSpan={9}>
                        {editGrid}
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
                            onClick={() => {
                              setEditRow(null);
                              setEditMeta({});
                            }}
                            className="rounded border border-zinc-600 px-2 py-1 text-xs"
                          >
                            İptal
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={`task-${r.row}`} className="hover:bg-zinc-900/40">
                    <td className={td}>
                      <TagBadge
                        label="Görev"
                        className="bg-sky-500/20 text-sky-200 border-sky-500/35"
                      />
                    </td>
                    <td className={`${td} text-zinc-500`}>{r.row}</td>
                    <td className={td}>{r.tarih || "—"}</td>
                    <td className={`${td} font-medium`}>{r.gorevler || "—"}</td>
                    <td className={td}>
                      <TagBadge
                        label={r.kategori}
                        className={gorevKategoriClass(r.kategori)}
                      />
                    </td>
                    <td className={td}>
                      <TagBadge
                        label={r.oncelik}
                        className={gorevOncelikClass(r.oncelik)}
                      />
                    </td>
                    <td className={td}>
                      <TagBadge
                        label={r.sonDurum}
                        className={gorevSonDurumClass(r.sonDurum)}
                      />
                    </td>
                    <td className={td}>{r.bitisTarihi || "—"}</td>
                    <td className={td}>
                      <ProgressCell raw={r.ilerleme} />
                    </td>
                    <td className={td}>
                      {r.dosya && isProbablyUrl(r.dosya) ? (
                        <a
                          href={r.dosya}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-400 underline decoration-sky-400/40"
                        >
                          Aç
                        </a>
                      ) : (
                        <span className="text-zinc-400">{r.dosya || "—"}</span>
                      )}
                    </td>
                    <td className={td}>
                      <TaskNotlarPreview raw={r.notlar} />
                    </td>
                    <td className={td}>
                      <div className="flex flex-col gap-1">
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
                );
              }

              const r = u.work;
              return (
                <tr
                  key={`work-${r.row}`}
                  className="hover:bg-zinc-900/40"
                >
                  <td className={td}>
                    <TagBadge
                      label="İş"
                      className="bg-violet-500/20 text-violet-200 border-violet-500/35"
                    />
                  </td>
                  <td className={`${td} text-zinc-500`}>{r.row}</td>
                  <td className={td}>{r.tarih || "—"}</td>
                  <td className={`${td} font-medium`}>{r.baslik || "—"}</td>
                  <td className={td}>
                    <TagBadge
                      label={r.sirket}
                      className={isSirketClass(r.sirket)}
                    />
                  </td>
                  <td className={`${td} text-zinc-500`}>—</td>
                  <td className={td}>
                    <TagBadge
                      label={r.durum}
                      className={isDurumClass(r.durum)}
                    />
                  </td>
                  <td className={td}>{r.bitisTarihi || "—"}</td>
                  <td className={`${td} text-zinc-500`}>—</td>
                  <td className={td}>
                    {r.link && isProbablyUrl(r.link) ? (
                      <a
                        href={r.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-400 underline decoration-sky-400/40"
                      >
                        Aç
                      </a>
                    ) : (
                      <span className="text-zinc-400">{r.link || "—"}</span>
                    )}
                  </td>
                  <td
                    className={`${td} max-w-[220px] truncate`}
                    title={r.notlar}
                  >
                    {r.notlar || "—"}
                  </td>
                  <td className={td}>
                    <Link
                      href="/is"
                      className="inline-block rounded border border-zinc-600 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
                    >
                      İş sayfası
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {displayRows.length === 0 ? (
          <p className="p-6 text-center text-sm text-zinc-500">
            Kayıt yok veya filtreye uymuyor.
          </p>
        ) : null}
      </div>
    </div>
  );
}
