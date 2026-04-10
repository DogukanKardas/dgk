import type { BBox } from "@/lib/crm-osm-discover";

export const CRM_SEARCH_HISTORY_KEY = "dgk_crm_search_bbox_v1";

export type StoredSearchRegion = {
  bbox: BBox;
  /** Kısa açıklama (ilçe adı, serbest arama vb.) */
  label: string;
  at: number;
};

const MAX_ITEMS = 40;

function bboxKey(b: BBox): string {
  return [b.south, b.west, b.north, b.east]
    .map((x) => Math.round(x * 10000) / 10000)
    .join(",");
}

export function loadSearchHistory(): StoredSearchRegion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CRM_SEARCH_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: StoredSearchRegion[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const bbox = o.bbox as Record<string, unknown> | undefined;
      if (!bbox) continue;
      const south = Number(bbox.south);
      const west = Number(bbox.west);
      const north = Number(bbox.north);
      const east = Number(bbox.east);
      if (
        !Number.isFinite(south) ||
        !Number.isFinite(west) ||
        !Number.isFinite(north) ||
        !Number.isFinite(east)
      ) {
        continue;
      }
      const at = Number(o.at);
      out.push({
        bbox: { south, west, north, east },
        label: typeof o.label === "string" ? o.label : "",
        at: Number.isFinite(at) ? at : Date.now(),
      });
    }
    return out;
  } catch {
    return [];
  }
}

export function saveSearchHistory(regions: StoredSearchRegion[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CRM_SEARCH_HISTORY_KEY, JSON.stringify(regions));
  } catch {
    /* quota / private mode */
  }
}

export function pushSearchHistory(bbox: BBox, label: string): StoredSearchRegion[] {
  const prev = loadSearchHistory();
  const key = bboxKey(bbox);
  const filtered = prev.filter((r) => bboxKey(r.bbox) !== key);
  const next: StoredSearchRegion[] = [
    { bbox, label: label.trim() || "Keşif", at: Date.now() },
    ...filtered,
  ].slice(0, MAX_ITEMS);
  saveSearchHistory(next);
  return next;
}

export function clearSearchHistory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CRM_SEARCH_HISTORY_KEY);
  } catch {
    /* ignore */
  }
}
