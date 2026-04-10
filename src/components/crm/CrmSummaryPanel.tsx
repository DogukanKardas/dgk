"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CRM_ASAMALAR, normalizeAsama } from "@/lib/crm-scoring";

type Lead = { asama: string };

const ASAMA_LABEL: Record<string, string> = {
  yeni: "Yeni",
  iletişim: "İletişim",
  teklif: "Teklif",
  kazanıldı: "Kazanıldı",
  kayip: "Kayıp",
};

export function CrmSummaryPanel() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/crm/leads", { cache: "no-store" });
      const data = (await res.json()) as
        | { rows: { asama: string }[] }
        | { error: string };
      if (!res.ok) {
        setError("error" in data ? data.error : `Hata ${res.status}`);
        setLeads([]);
        return;
      }
      const rows = "rows" in data ? data.rows : [];
      setLeads(rows.map((r) => ({ asama: normalizeAsama(r.asama) })));
    } catch {
      setError("Ağ hatası");
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const total = leads.length;
    const by: Record<string, number> = {};
    for (const a of CRM_ASAMALAR) by[a] = 0;
    for (const l of leads) {
      const k = CRM_ASAMALAR.includes(l.asama as (typeof CRM_ASAMALAR)[number])
        ? l.asama
        : "yeni";
      by[k] = (by[k] ?? 0) + 1;
    }
    const won = by["kazanıldı"] ?? 0;
    const lost = by["kayip"] ?? 0;
    const closed = won + lost;
    const winRate = closed > 0 ? Math.round((won / closed) * 1000) / 10 : null;
    const contacted =
      (by["iletişim"] ?? 0) + (by["teklif"] ?? 0) + won + lost;
    const contactRate =
      total > 0 ? Math.round((contacted / total) * 1000) / 10 : null;
    return { total, by, winRate, contactRate, contacted };
  }, [leads]);

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-lg border border-red-500/40 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-zinc-600 px-3 py-2 text-sm text-zinc-200"
        >
          Yenile
        </button>
        {loading ? (
          <span className="text-sm text-zinc-500">Yükleniyor…</span>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Toplam aday
          </p>
          <p className="mt-1 text-3xl font-semibold text-zinc-100">
            {stats.total}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Kazanma oranı (kapanan)
          </p>
          <p className="mt-1 text-3xl font-semibold text-emerald-400">
            {stats.winRate != null ? `${stats.winRate}%` : "—"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Kazanıldı / (Kazanıldı + Kayıp)
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Hunı hareketi
          </p>
          <p className="mt-1 text-3xl font-semibold text-sky-400">
            {stats.contactRate != null ? `${stats.contactRate}%` : "—"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            İletişim+ üzeri / toplam
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <h3 className="border-b border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-200">
          Aşama dağılımı
        </h3>
        <ul className="divide-y divide-zinc-800">
          {CRM_ASAMALAR.map((a) => (
            <li
              key={a}
              className="flex items-center justify-between px-4 py-2 text-sm"
            >
              <span className="text-zinc-400">
                {ASAMA_LABEL[a] ?? a}
              </span>
              <span className="font-mono text-zinc-100">
                {stats.by[a] ?? 0}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
