/** Sheet ile UI sabitleri arasında `tip` eşlemesi (Türkçe büyük/küçük harf). */
export function finansTipLocaleKey(raw: string): string {
  return finansNormalizeCell(raw).toLocaleLowerCase("tr-TR");
}

/** Görünmez karakter / fazla boşluk temizliği (Sheets kopyala-yapıştır). */
export function finansNormalizeCell(raw: string): string {
  return raw
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** A sütunundaki ham metin → gelir | gider | fatura | bilinmeyen. */
export function finansSheetTipBucket(
  raw: string
): "gelir" | "gider" | "fatura" | null {
  const key = finansNormalizeCell(raw).toLocaleLowerCase("tr-TR");
  if (!key) return null;

  const aliases: Record<string, "gelir" | "gider" | "fatura"> = {
    gelir: "gelir",
    gider: "gider",
    fatura: "fatura",
    income: "gelir",
    revenue: "gelir",
    receipt: "gelir",
    expense: "gider",
    expenses: "gider",
    cost: "gider",
    invoice: "fatura",
    inv: "fatura",
    proforma: "fatura",
  };

  if (aliases[key]) return aliases[key];

  return null;
}

export function finansRowTipMatchesCanonical(
  rowTip: string,
  canonical: "Gelir" | "Gider" | "Fatura"
): boolean {
  const want = finansSheetTipBucket(canonical);
  if (want) {
    const b = finansSheetTipBucket(rowTip);
    if (b) return b === want;
  }
  return finansTipLocaleKey(rowTip) === finansTipLocaleKey(canonical);
}
