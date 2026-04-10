"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  bboxExceedsMaxSpan,
  clampBBoxCenterCrop,
  CRM_MAX_BBOX_SPAN_DEG,
} from "@/lib/crm-bbox-limits";
import { normalizeBBoxGeography } from "@/lib/crm-geo";
import type { BBox } from "@/lib/crm-osm-discover";
import {
  clearSearchHistory,
  loadSearchHistory,
  pushSearchHistory,
  type StoredSearchRegion,
} from "@/lib/crm-search-history";

const CrmMapLeaflet = dynamic(() => import("./CrmMapLeaflet"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[320px] items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-sm text-zinc-500">
      Harita yükleniyor…
    </div>
  ),
});

type Discovered = {
  osmKey: string;
  ad: string;
  adres: string;
  telefon: string;
  webSitesi: string;
  webVarMi: string;
  kaynak: string;
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function discoverToLeadPayload(d: Discovered) {
  const t = todayStr();
  return {
    osmKey: d.osmKey,
    ad: d.ad,
    adres: d.adres,
    telefon: d.telefon,
    webSitesi: d.webSitesi,
    webVarMi: d.webVarMi,
    kaynak: d.kaynak,
    notlar: "",
    asama: "yeni",
    skor: "0",
    kriterJson: "{}",
    olusturma: t,
    guncelleme: t,
  };
}

export function CrmResearchPanel({ onImported }: { onImported?: () => void }) {
  const [south, setSouth] = useState("40.98");
  const [west, setWest] = useState("28.95");
  const [north, setNorth] = useState("41.06");
  const [east, setEast] = useState("29.07");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("İstanbul");
  const [freeQuery, setFreeQuery] = useState("");
  const [leads, setLeads] = useState<Discovered[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [csvText, setCsvText] = useState("");
  const [searchMode, setSearchMode] = useState<"bbox" | "place">("bbox");
  const [searchHistory, setSearchHistory] = useState<StoredSearchRegion[]>([]);

  useEffect(() => {
    setSearchHistory(loadSearchHistory());
  }, []);

  const currentFormBBox: BBox | null = useMemo(() => {
    const s = parseFloat(south);
    const w = parseFloat(west);
    const n = parseFloat(north);
    const e = parseFloat(east);
    if (
      !Number.isFinite(s) ||
      !Number.isFinite(w) ||
      !Number.isFinite(n) ||
      !Number.isFinite(e) ||
      s >= n ||
      w >= e
    ) {
      return null;
    }
    return { south: s, west: w, north: n, east: e };
  }, [south, west, north, east]);

  /** Mavi dikdörtgen: keşif limitine göre her zaman en fazla CRM_MAX_BBOX_SPAN_DEG. */
  const bluePreviewBBox: BBox | null = useMemo(() => {
    if (!currentFormBBox) return null;
    try {
      return clampBBoxCenterCrop(normalizeBBoxGeography(currentFormBBox));
    } catch {
      return null;
    }
  }, [currentFormBBox]);

  const onBBoxPicked = useCallback((b: BBox) => {
    setSouth(b.south.toFixed(5));
    setWest(b.west.toFixed(5));
    setNorth(b.north.toFixed(5));
    setEast(b.east.toFixed(5));
  }, []);

  async function runDiscover() {
    setBusy(true);
    setError(null);
    setImportMsg(null);
    try {
      const body: Record<string, unknown> = {
        maxResults: 200,
      };
      if (searchMode === "bbox") {
        const s = parseFloat(south);
        const w = parseFloat(west);
        const n = parseFloat(north);
        const e = parseFloat(east);
        if (
          !Number.isFinite(s) ||
          !Number.isFinite(w) ||
          !Number.isFinite(n) ||
          !Number.isFinite(e)
        ) {
          throw new Error("Bbox sayıları geçersiz.");
        }
        const geo = normalizeBBoxGeography({
          south: s,
          west: w,
          north: n,
          east: e,
        });
        const cropped = clampBBoxCenterCrop(geo);
        body.south = cropped.south;
        body.west = cropped.west;
        body.north = cropped.north;
        body.east = cropped.east;
      } else {
        body.district = district.trim();
        body.city = city.trim();
        body.query = freeQuery.trim();
      }
      const res = await fetch("/api/crm/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        leads?: Discovered[];
        error?: string;
        count?: number;
        bbox?: BBox;
      };
      if (!res.ok) throw new Error(data.error ?? `Hata ${res.status}`);
      const list = data.leads ?? [];
      if (data.bbox) {
        setSouth(data.bbox.south.toFixed(5));
        setWest(data.bbox.west.toFixed(5));
        setNorth(data.bbox.north.toFixed(5));
        setEast(data.bbox.east.toFixed(5));
        const label =
          searchMode === "place"
            ? [district, city].filter(Boolean).join(", ") ||
              freeQuery.trim() ||
              "Nominatim"
            : "Manuel bbox";
        setSearchHistory(pushSearchHistory(data.bbox, label));
      }
      setLeads(list);
      const sel: Record<string, boolean> = {};
      for (const x of list) sel[x.osmKey] = true;
      setSelected(sel);
    } catch (err) {
      setLeads([]);
      setError(err instanceof Error ? err.message : "Keşif başarısız");
    } finally {
      setBusy(false);
    }
  }

  function toggleAll(on: boolean) {
    const sel: Record<string, boolean> = {};
    for (const x of leads) sel[x.osmKey] = on;
    setSelected(sel);
  }

  async function importSelected() {
    const chosen = leads.filter((x) => selected[x.osmKey]);
    if (chosen.length === 0) {
      setImportMsg("Seçili satır yok.");
      return;
    }
    setBusy(true);
    setError(null);
    setImportMsg(null);
    try {
      const rows = chosen.map(discoverToLeadPayload);
      const res = await fetch("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulk: true, rows, dedupeOsm: true }),
      });
      const data = (await res.json()) as {
        error?: string;
        added?: number;
        skipped?: number;
      };
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      setImportMsg(
        `Aktarıldı: ${data.added ?? 0}, atlandı (yinelenen OSM): ${data.skipped ?? 0}`
      );
      onImported?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aktarım hatası");
    } finally {
      setBusy(false);
    }
  }

  async function importCsv() {
    const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      setImportMsg("CSV metni boş.");
      return;
    }
    const rows = lines.map((line) => {
      const parts = line.includes("\t")
        ? line.split("\t")
        : line.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
      const ad = parts[0] ?? "";
      const adres = parts[1] ?? "";
      const telefon = parts[2] ?? "";
      const webSitesi = parts[3] ?? "";
      const notlar = parts[4] ?? "";
      const t = todayStr();
      const webVarMi =
        webSitesi.trim() && (webSitesi.includes(".") || webSitesi.startsWith("http"))
          ? "evet"
          : "hayır";
      return {
        osmKey: "",
        ad,
        adres,
        telefon,
        webSitesi,
        webVarMi,
        kaynak: "csv",
        notlar,
        asama: "yeni",
        skor: "0",
        kriterJson: "{}",
        olusturma: t,
        guncelleme: t,
      };
    });
    const valid = rows.filter((r) => r.ad.trim());
    if (valid.length === 0) {
      setImportMsg("En az bir satırda Ad sütunu dolu olmalı.");
      return;
    }
    setBusy(true);
    setError(null);
    setImportMsg(null);
    try {
      const res = await fetch("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulk: true, rows: valid, dedupeOsm: false }),
      });
      const data = (await res.json()) as { error?: string; added?: number };
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      setImportMsg(`CSV: ${data.added ?? valid.length} satır eklendi.`);
      setCsvText("");
      onImported?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "CSV aktarımı başarısız");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-400">
        Veri kaynağı{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-400 underline decoration-sky-400/30"
        >
          OpenStreetMap
        </a>{" "}
        katkıcılarıdır. Telefon ve web sık eksik olabilir. Alan çok genişse
        istek reddedilir; haritayı yakınlaştırıp bbox kullanın.
      </p>

      <div className="flex flex-wrap gap-3 text-sm">
        <label className="flex cursor-pointer items-center gap-2 text-zinc-300">
          <input
            type="radio"
            name="crm-search-mode"
            checked={searchMode === "bbox"}
            onChange={() => setSearchMode("bbox")}
          />
          Bölge kutusu (bbox)
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-zinc-300">
          <input
            type="radio"
            name="crm-search-mode"
            checked={searchMode === "place"}
            onChange={() => setSearchMode("place")}
          />
          İl / ilçe / serbest arama
        </label>
      </div>

      <section className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-200">Harita (bbox)</h3>
          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
            <span>
              <span className="inline-block h-2 w-2 rounded-sm bg-red-500/90 align-middle" />{" "}
              Önceki aramalar
            </span>
            <span>
              <span className="inline-block h-2 w-2 rounded-sm bg-blue-500/90 align-middle" />{" "}
              Keşif alanı (≤{String(CRM_MAX_BBOX_SPAN_DEG).replace(".", ",")}°)
            </span>
            {searchHistory.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  clearSearchHistory();
                  setSearchHistory([]);
                }}
                className="text-red-400 underline decoration-red-400/40 hover:text-red-300"
              >
                Geçmişi temizle
              </button>
            ) : null}
          </div>
        </div>
        <CrmMapLeaflet
          onBoundsPicked={onBBoxPicked}
          pastRegions={searchHistory}
          currentBBox={bluePreviewBBox}
        />
        {currentFormBBox && bboxExceedsMaxSpan(currentFormBBox) ? (
          <p className="text-xs text-amber-200/90">
            Girdiğiniz kutu {String(CRM_MAX_BBOX_SPAN_DEG).replace(".", ",")}°
            sınırını aşıyor. Mavi alan merkezden kırpılmış keşif bölgesini
            gösterir; &quot;Keşfet&quot; de aynı kırpılmış alanı kullanır.
          </p>
        ) : null}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <label className="text-xs text-zinc-500">
            Güney
            <input
              value={south}
              onChange={(e) => setSouth(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs text-zinc-500">
            Batı
            <input
              value={west}
              onChange={(e) => setWest(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs text-zinc-500">
            Kuzey
            <input
              value={north}
              onChange={(e) => setNorth(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs text-zinc-500">
            Doğu
            <input
              value={east}
              onChange={(e) => setEast(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
            />
          </label>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h3 className="text-sm font-semibold text-zinc-200">
          İlçe / il / serbest metin (Nominatim → bbox)
        </h3>
        <div className="flex flex-wrap gap-3">
          <label className="text-xs text-zinc-500">
            İlçe
            <input
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="Kadıköy"
              className="mt-1 block w-40 rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs text-zinc-500">
            İl
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 block w-40 rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs text-zinc-500 sm:flex-1">
            Serbest arama (bbox boşsa)
            <input
              value={freeQuery}
              onChange={(e) => setFreeQuery(e.target.value)}
              placeholder="Örn. Moda, Kadıköy"
              className="mt-1 block w-full min-w-[200px] rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void runDiscover()}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {busy ? "İstek…" : "Keşfet (Overpass)"}
        </button>
      </section>

      {error ? (
        <p className="rounded-lg border border-red-500/40 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      {importMsg ? (
        <p className="text-sm text-emerald-300/90">{importMsg}</p>
      ) : null}

      {leads.length > 0 ? (
        <section className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-zinc-400">
              {leads.length} sonuç
            </span>
            <button
              type="button"
              onClick={() => toggleAll(true)}
              className="text-xs text-sky-400 underline"
            >
              Tümünü seç
            </button>
            <button
              type="button"
              onClick={() => toggleAll(false)}
              className="text-xs text-zinc-500 underline"
            >
              Temizle
            </button>
            <button
              type="button"
              onClick={() => {
                const drop = new Set(
                  leads.filter((x) => selected[x.osmKey]).map((x) => x.osmKey)
                );
                if (drop.size === 0) return;
                setLeads((list) => list.filter((x) => !drop.has(x.osmKey)));
                setSelected((s) => {
                  const next = { ...s };
                  for (const k of drop) delete next[k];
                  return next;
                });
              }}
              className="text-xs text-amber-400 underline decoration-amber-400/40"
            >
              Seçilenleri listeden kaldır
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void importSelected()}
              className="ml-auto rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-500"
            >
              Seçilenleri Sheets’e aktar
            </button>
          </div>
          <div className="max-h-[360px] overflow-auto rounded-lg border border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-zinc-900 text-xs text-zinc-500">
                <tr>
                  <th className="px-2 py-2"> </th>
                  <th className="px-2 py-2">Ad</th>
                  <th className="px-2 py-2">Web</th>
                  <th className="px-2 py-2">Adres</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((x) => (
                  <tr key={x.osmKey} className="border-t border-zinc-800">
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={Boolean(selected[x.osmKey])}
                        onChange={(e) =>
                          setSelected((s) => ({
                            ...s,
                            [x.osmKey]: e.target.checked,
                          }))
                        }
                      />
                    </td>
                    <td className="px-2 py-2 text-zinc-200">{x.ad}</td>
                    <td className="px-2 py-2 text-xs text-zinc-500">
                      {x.webVarMi}
                    </td>
                    <td className="px-2 py-2 text-xs text-zinc-500">
                      {x.adres}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h3 className="text-sm font-semibold text-zinc-200">CSV içe aktar</h3>
        <p className="text-xs text-zinc-500">
          Her satır: Ad, Adres, Telefon, Web, Notlar — sekme veya virgül ile
          ayrılmış.
        </p>
        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          rows={5}
          placeholder={"Örnek (TAB)\nDükkan Adı\tMahalle...\t0555...\t\tyeni müşteri"}
          className="w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-200"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void importCsv()}
          className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
        >
          CSV’yi ekle
        </button>
      </section>
    </div>
  );
}
