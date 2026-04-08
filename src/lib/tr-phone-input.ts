/** Türkiye: 0XXX XXX XX XX; 10 hane: XXX XXX XX XX; +90 … */

const MAX_LOCAL_0 = 11;
const MAX_LOCAL_10 = 10;
const MAX_INTL = 12;

function formatTenDigit(d: string): string {
  const x = d.slice(0, MAX_LOCAL_10);
  if (x.length <= 3) return x;
  const a = x.slice(0, 3);
  const b = x.slice(3, 6);
  const c = x.slice(6, 8);
  const e = x.slice(8, 10);
  let out = a;
  if (b) out += " " + b;
  if (c) out += " " + c;
  if (e) out += " " + e;
  return out;
}

function formatLeadingZero(d: string): string {
  const x = d.slice(0, MAX_LOCAL_0);
  if (x.length <= 4) return x;
  const a = x.slice(0, 4);
  const b = x.slice(4, 7);
  const c = x.slice(7, 9);
  const e = x.slice(9, 11);
  let out = a;
  if (b) out += " " + b;
  if (c) out += " " + c;
  if (e) out += " " + e;
  return out;
}

/** digits: 90XXXXXXXXXX (en fazla 12 rakam), çıktı: +90 XXX XXX XX XX */
function formatPlus90Digits(d: string): string {
  const x = d.slice(0, MAX_INTL);
  if (x.length <= 2) return x.length === 1 ? "+9" : "+90";
  if (!x.startsWith("90")) return "+" + x;
  const rest = x.slice(2);
  if (!rest) return "+90";
  return "+90 " + formatTenDigit(rest);
}

/**
 * Yazarken / yapıştırırken TR telefon maskesi.
 */
export function normalizeTrPhoneInput(raw: string): string {
  const t = raw.trimStart();
  const hasPlus = t.startsWith("+");
  const digits = raw.replace(/\D/g, "");

  if (hasPlus) {
    if (digits.length === 0) return "+";
    if (digits.startsWith("90")) return formatPlus90Digits(digits);
    return "+" + digits.slice(0, 15);
  }

  if (digits.startsWith("90") && digits.length >= 3) {
    return formatPlus90Digits(digits);
  }

  if (digits.startsWith("0")) {
    return formatLeadingZero(digits);
  }

  if (digits.length > 0) {
    return formatTenDigit(digits);
  }

  return "";
}

/** Sheet’ten veya eskisinden gelen metni biçimlendirir. */
export function canonicalTrPhone(s: string): string {
  const x = s.trim();
  if (!x) return "";
  return normalizeTrPhoneInput(x);
}

/** `tel:` bağlantısı (90… için E.164 +90…). */
export function telUriFromDisplay(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("90")) return `+${d}`;
  return d;
}
