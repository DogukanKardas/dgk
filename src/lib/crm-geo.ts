export class CrmGeoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CrmGeoError";
  }
}

/** Leaflet / yanlış yapıştırma sonucu ±180° dışına çıkan boylamları düzeltir. */
export function normalizeLng180(lng: number): number {
  if (!Number.isFinite(lng)) return lng;
  const x = ((((lng + 180) % 360) + 360) % 360) - 180;
  return x === -180 ? 180 : x;
}

export type GeoBBox = {
  south: number;
  west: number;
  north: number;
  east: number;
};

/**
 * Enlem/boylam sınırları ve batı < doğu (basit kutular; tarih çizgisi atlama yok).
 */
export function normalizeBBoxGeography(b: GeoBBox): GeoBBox {
  let south = b.south;
  let north = b.north;
  let west = normalizeLng180(b.west);
  let east = normalizeLng180(b.east);

  south = Math.max(-85, Math.min(85, south));
  north = Math.max(-85, Math.min(85, north));

  if (!Number.isFinite(south) || !Number.isFinite(north)) {
    throw new CrmGeoError("Enlem değerleri sayısal olmalı.");
  }
  if (south >= north) {
    throw new CrmGeoError("Enlem geçersiz: güney, kuzeyden küçük olmalı.");
  }

  if (west === east) {
    throw new CrmGeoError(
      "Boylam kutusu geçersiz: batı ve doğu aynı olamaz (ör. -122,xx Kanada/ABD)."
    );
  }

  if (west > east) {
    const tmp = west;
    west = east;
    east = tmp;
  }

  if (west >= east) {
    throw new CrmGeoError(
      "Boylam geçersiz: batı, doğudan küçük olmalı (ör. batı -122,84, doğu -122,72). Çok büyük veya hatalı sayılar yapıştırılmış olabilir."
    );
  }

  return { south, west, north, east };
}
