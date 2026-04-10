/**
 * CRM keşif listesi: isimde anahtar kelime hariç tutma + aynı adres tekilleştirme.
 */

export function normalizeAddressKey(adres: string): string {
  return adres.trim().toLowerCase().replace(/\s+/g, " ");
}

export function parseExcludeKeywords(raw: string): string[] {
  return raw
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function nameMatchesExclude(ad: string, keywords: string[]): boolean {
  if (keywords.length === 0) return false;
  const n = ad.toLowerCase();
  return keywords.some((kw) => n.includes(kw.toLowerCase()));
}

export function filterExcludedByName<T extends { ad: string }>(
  items: T[],
  keywordsRaw: string
): T[] {
  const kw = parseExcludeKeywords(keywordsRaw);
  if (kw.length === 0) return items;
  return items.filter((x) => !nameMatchesExclude(x.ad, kw));
}

/** Boş adresler tekilleştirilmez (her biri kendi osmKey ile ayrı kalır). */
export function dedupeByNormalizedAddress<T extends { adres: string; osmKey: string }>(
  items: T[]
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const x of items) {
    const norm = normalizeAddressKey(x.adres);
    const key = norm.length > 0 ? `a:${norm}` : `o:${x.osmKey}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(x);
  }
  return out;
}

/** Önce hariç kelimeler, sonra aynı adres tekilleştirmesi. */
export function filterAndDedupeDiscoveries<
  T extends { ad: string; adres: string; osmKey: string },
>(items: T[], excludeKeywordsRaw: string): T[] {
  return dedupeByNormalizedAddress(filterExcludedByName(items, excludeKeywordsRaw));
}
