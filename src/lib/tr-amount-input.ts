const MAX_DIGITS = 15;

function withTurkishThousands(digits: string): string {
  if (!digits) return "";
  const normalized = digits.replace(/^0+/, "") || "0";
  return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Yazarken / yapıştırırken: sadece rakamlar, en fazla 15 basamak, noktalı gruplama. */
export function normalizeTrAmountInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, MAX_DIGITS);
  if (!digits) return "";
  return withTurkishThousands(digits);
}

/** Sheet veya düzenleme için mevcut metni tutarlı biçime çevirir. */
export function canonicalTrAmount(s: string): string {
  return normalizeTrAmountInput(s);
}

/** Tabloda gösterim (rakamsız metin varsa olduğu gibi). */
export function formatTrAmountDisplay(raw: string): string {
  const t = raw?.trim() ?? "";
  if (!t) return "";
  const digits = t.replace(/\D/g, "");
  if (!digits) return t;
  return withTurkishThousands(digits);
}
