import { normalizeBBoxGeography } from "@/lib/crm-geo";
import type { BBox } from "@/lib/crm-osm-discover";

/** Keşif API ile aynı: enlem ve boylam genişliği bu değeri aşamaz. */
export const CRM_MAX_BBOX_SPAN_DEG = 0.12;

/**
 * Kayan nokta için üst sınır karşılaştırması (≈1 m derece cinsinden).
 * Tam 0,12° kutuların yanlışlıkla “geniş” sayılmasını önler.
 */
export const CRM_BBOX_SPAN_TOLERANCE = 1e-5;

/**
 * Geniş bbox’ı merkez sabit kalarak her eksende en fazla CRM_MAX_BBOX_SPAN_DEG olacak şekilde kırpar.
 */
export function clampBBoxCenterCrop(b: BBox): BBox {
  let latSpan = b.north - b.south;
  let lngSpan = b.east - b.west;
  const latMid = (b.south + b.north) / 2;
  const lngMid = (b.west + b.east) / 2;
  if (latSpan > CRM_MAX_BBOX_SPAN_DEG + CRM_BBOX_SPAN_TOLERANCE) {
    latSpan = CRM_MAX_BBOX_SPAN_DEG;
  }
  if (lngSpan > CRM_MAX_BBOX_SPAN_DEG + CRM_BBOX_SPAN_TOLERANCE) {
    lngSpan = CRM_MAX_BBOX_SPAN_DEG;
  }
  return {
    south: latMid - latSpan / 2,
    north: latMid + latSpan / 2,
    west: lngMid - lngSpan / 2,
    east: lngMid + lngSpan / 2,
  };
}

/**
 * Harita görünümünün merkezinde, enlem ve boylam genişliği tam olarak
 * CRM_MAX_BBOX_SPAN_DEG olacak kutu (görünüm genişse daraltır, darsa genişletir).
 */
export function normalizeViewportToDiscoveryBBox(b: BBox): BBox {
  const latMid = (b.south + b.north) / 2;
  const lngMid = (b.west + b.east) / 2;
  const half = CRM_MAX_BBOX_SPAN_DEG / 2;
  const south = latMid - half;
  const west = lngMid - half;
  return normalizeBBoxGeography({
    south,
    north: south + CRM_MAX_BBOX_SPAN_DEG,
    west,
    east: west + CRM_MAX_BBOX_SPAN_DEG,
  }) as BBox;
}

export function bboxExceedsMaxSpan(b: BBox): boolean {
  const max = CRM_MAX_BBOX_SPAN_DEG + CRM_BBOX_SPAN_TOLERANCE;
  return b.north - b.south > max || b.east - b.west > max;
}
