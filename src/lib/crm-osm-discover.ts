import { isPointInGeoBBox, normalizeBBoxGeography } from "@/lib/crm-geo";
import { getNominatimApiUrl, getOverpassApiUrl } from "@/lib/env-sheets";

export type BBox = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type DiscoveredLead = {
  osmKey: string;
  ad: string;
  adres: string;
  telefon: string;
  webSitesi: string;
  webVarMi: string;
  kaynak: string;
};

const UA =
  "DGK-CRM/1.0 (internal; contact: https://github.com/DogukanKardas/dgk)";

let nominatimLastAt = 0;
const NOMINATIM_MIN_MS = 1100;

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

export async function nominatimBoundingBox(query: string): Promise<BBox> {
  const q = query.trim();
  if (!q) {
    throw new Error("Arama metni boş.");
  }
  const now = Date.now();
  const wait = nominatimLastAt + NOMINATIM_MIN_MS - now;
  if (wait > 0) await sleep(wait);
  nominatimLastAt = Date.now();

  const base = getNominatimApiUrl().replace(/\/$/, "");
  const url = new URL(`${base}/search`);
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": UA,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Nominatim yanıtı: ${res.status}`);
  }
  const data = (await res.json()) as Array<{
    boundingbox?: [string, string, string, string];
  }>;
  const first = data[0];
  const bb = first?.boundingbox;
  if (!bb || bb.length < 4) {
    throw new Error("Bölge kutusu alınamadı; daha spesifik ilçe + il deneyin.");
  }
  const south = parseFloat(bb[0]);
  const north = parseFloat(bb[1]);
  const west = parseFloat(bb[2]);
  const east = parseFloat(bb[3]);
  if (
    !Number.isFinite(south) ||
    !Number.isFinite(north) ||
    !Number.isFinite(west) ||
    !Number.isFinite(east)
  ) {
    throw new Error("Geçersiz boundingbox.");
  }
  return { south, west, north, east };
}

function buildAddress(tags: Record<string, string>): string {
  const parts: string[] = [];
  const street = tags["addr:street"] ?? tags["addr:place"] ?? "";
  const hn = tags["addr:housenumber"] ?? "";
  if (street) parts.push(hn ? `${street} ${hn}` : street);
  const district = tags["addr:district"] ?? tags["addr:suburb"] ?? "";
  const city = tags["addr:city"] ?? tags["addr:town"] ?? "";
  const state = tags["addr:state"] ?? "";
  if (district) parts.push(district);
  if (city) parts.push(city);
  if (state && !city) parts.push(state);
  return parts.join(", ") || tags["addr:full"] || "";
}

type OsmElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

function elementLatLon(el: OsmElement): { lat: number; lon: number } | null {
  if (el.lat != null && el.lon != null) {
    return { lat: el.lat, lon: el.lon };
  }
  if (el.center) {
    return { lat: el.center.lat, lon: el.center.lon };
  }
  return null;
}

export async function overpassBusinessesInBBox(
  bbox: BBox,
  maxResults = 200
): Promise<DiscoveredLead[]> {
  const g = normalizeBBoxGeography(bbox);
  const { south, west, north, east } = g;
  const q = `
[out:json][timeout:55];
(
  node["shop"](${south},${west},${north},${east});
  node["amenity"](${south},${west},${north},${east});
  node["office"](${south},${west},${north},${east});
  node["craft"](${south},${west},${north},${east});
  way["shop"](${south},${west},${north},${east});
  way["amenity"](${south},${west},${north},${east});
  way["office"](${south},${west},${north},${east});
  way["craft"](${south},${west},${north},${east});
);
out center tags;
`;
  const overpassUrl = getOverpassApiUrl();
  const body = `data=${encodeURIComponent(q)}`;

  const postOnce = () =>
    fetch(overpassUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "User-Agent": UA,
      },
      body,
      signal: AbortSignal.timeout(110_000),
    });

  let res = await postOnce();
  if (res.status === 504 || res.status === 502) {
    await sleep(3000);
    res = await postOnce();
  }

  if (!res.ok) {
    if (res.status === 504 || res.status === 502) {
      throw new Error(
        "Overpass zaman aşımı veya ağ geçidi hatası (sunucu yoğun). Birkaç dakika sonra tekrar deneyin; gerekirse OVERPASS_API_URL ile başka bir örnek deneyin."
      );
    }
    throw new Error(`Overpass yanıtı: ${res.status}`);
  }
  const json = (await res.json()) as { elements?: OsmElement[] };
  const elements = json.elements ?? [];
  const seen = new Set<string>();
  const out: DiscoveredLead[] = [];

  for (const el of elements) {
    if (out.length >= maxResults) break;
    if (el.type !== "node" && el.type !== "way") continue;
    const pos = elementLatLon(el);
    if (!pos) continue;
    // Way’ler bbox’a sadece kenardan değebilir; merkez nokta kutunun dışında kalabiliyor.
    if (!isPointInGeoBBox(pos.lat, pos.lon, g)) continue;
    const tags = el.tags ?? {};
    const name =
      tags.name ??
      tags.brand ??
      tags.operator ??
      tags["name:tr"] ??
      "";
    if (!name.trim()) continue;
    const osmKey = `${el.type}/${el.id}`;
    if (seen.has(osmKey)) continue;
    seen.add(osmKey);

    const website =
      tags.website ??
      tags["contact:website"] ??
      tags.url ??
      "";
    const phone = tags.phone ?? tags["contact:phone"] ?? "";

    out.push({
      osmKey,
      ad: name.trim(),
      adres: buildAddress(tags),
      telefon: phone,
      webSitesi: website,
      webVarMi: website.trim() ? "evet" : "hayır",
      kaynak: "osm_overpass",
    });
  }

  return out;
}
