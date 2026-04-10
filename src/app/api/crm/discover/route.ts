import { NextResponse } from "next/server";
import {
  CRM_BBOX_SPAN_TOLERANCE,
  CRM_MAX_BBOX_SPAN_DEG,
  clampBBoxCenterCrop,
} from "@/lib/crm-bbox-limits";
import { CrmGeoError, normalizeBBoxGeography } from "@/lib/crm-geo";
import {
  nominatimBoundingBox,
  overpassBusinessesInBBox,
  type BBox,
} from "@/lib/crm-osm-discover";

export const dynamic = "force-dynamic";
/** Overpass uzun sürebilir (Vercel Pro’da en fazla 60 sn; plandan düşük olmalı). */
export const maxDuration = 60;

function parseBBox(body: Record<string, unknown>): BBox | null {
  const south = Number(body.south);
  const west = Number(body.west);
  const north = Number(body.north);
  const east = Number(body.east);
  if (
    !Number.isFinite(south) ||
    !Number.isFinite(west) ||
    !Number.isFinite(north) ||
    !Number.isFinite(east)
  ) {
    return null;
  }
  return { south, west, north, east };
}

function validateBBoxSize(b: BBox): string | null {
  if (b.south >= b.north || b.west >= b.east) {
    return "Bbox geçersiz: güney < kuzey, batı < doğu olmalı.";
  }
  const max = CRM_MAX_BBOX_SPAN_DEG + CRM_BBOX_SPAN_TOLERANCE;
  if (b.north - b.south > max || b.east - b.west > max) {
    return `Alan çok geniş (>${CRM_MAX_BBOX_SPAN_DEG}°). Haritayı yakınlaştırın veya daha dar bir kutu seçin.`;
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    let bbox = parseBBox(body);
    if (bbox) {
      bbox = normalizeBBoxGeography(bbox);
      bbox = clampBBoxCenterCrop(bbox);
    }

    if (!bbox) {
      const district = String(body.district ?? "").trim();
      const city = String(body.city ?? "").trim();
      const q = String(body.query ?? "").trim();
      const locality = [district, city].filter(Boolean).join(", ");
      const search = q || (locality ? `${locality}, Turkey` : "");
      if (!search.replace(/,/g, "").trim()) {
        return NextResponse.json(
          {
            error:
              "bbox { south, west, north, east } veya district+city / query gerekli.",
          },
          { status: 400 }
        );
      }
      bbox = await nominatimBoundingBox(search);
      bbox = normalizeBBoxGeography(bbox);
      bbox = clampBBoxCenterCrop(bbox);
    }

    const sizeErr = validateBBoxSize(bbox);
    if (sizeErr) {
      return NextResponse.json({ error: sizeErr }, { status: 400 });
    }

    const maxResults = Math.min(
      250,
      Math.max(1, Number(body.maxResults) || 200)
    );
    const leads = await overpassBusinessesInBBox(bbox, maxResults);
    return NextResponse.json({
      bbox,
      count: leads.length,
      leads,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Keşif başarısız.";
    const status = e instanceof CrmGeoError ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
