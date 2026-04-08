import {
  civilUtcDayNumber,
  getTurkeyYmd,
} from "@/lib/turkey-time";

const MAX_DIGITS = 8;

function takeDigits(s: string): string {
  return s.replace(/\D/g, "").slice(0, MAX_DIGITS);
}

/** Sadece rakamlardan gg.aa.yyyy (yazarken kısmi) üretir. */
export function formatTrDateDigits(digits: string): string {
  const d = takeDigits(digits);
  if (d.length === 0) return "";
  const dd = d.slice(0, 2);
  if (d.length <= 2) return dd;
  const mm = d.slice(2, 4);
  if (d.length <= 4) return `${dd}.${mm}`;
  return `${dd}.${mm}.${d.slice(4, 8)}`;
}

/** input onChange: ham metni maskeleye çevirir (yapıştırma dahil). */
export function normalizeTrDateInput(raw: string): string {
  return formatTrDateDigits(raw);
}

const MAX_DIGITS_DM = 4;

function takeDigitsDm(s: string): string {
  return s.replace(/\D/g, "").slice(0, MAX_DIGITS_DM);
}

/** Sadece rakamlardan gg.aa (yazarken kısmi). */
export function formatTrDayMonthDigits(digits: string): string {
  const d = takeDigitsDm(digits);
  if (d.length === 0) return "";
  const dd = d.slice(0, 2);
  if (d.length <= 2) return dd;
  return `${dd}.${d.slice(2, 4)}`;
}

export function normalizeTrDayMonthInput(raw: string): string {
  return formatTrDayMonthDigits(raw);
}

/** Tam gg.aa.yyyy → gg.aa (gösterim / vade girişi). */
export function extractDayMonthFromTrDate(s: string): string {
  const c = canonicalTrDate(s);
  const p = parseCompleteTrDateParts(c);
  if (!p) return "";
  return `${String(p.d).padStart(2, "0")}.${String(p.m).padStart(2, "0")}`;
}

/**
 * Kullanıcıdan gg.aa + referans tam tarih (yıl kaynağı) → gg.aa.yyyy.
 * Ay sonu: gün taşarsa ayın son gününe indirgenir.
 */
export function trDayMonthToFullWithReferenceYear(
  dayMonth: string,
  referenceFullTr: string
): string {
  const refCanon = canonicalTrDate(referenceFullTr);
  const refParts = parseCompleteTrDateParts(refCanon);
  if (!refParts) return "";
  const t = dayMonth.trim();
  const m = t.match(/^(\d{1,2})\s*[./]\s*(\d{1,2})\s*$/);
  if (!m) return "";
  let d = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  if (
    !Number.isFinite(d) ||
    !Number.isFinite(mo) ||
    mo < 1 ||
    mo > 12 ||
    d < 1 ||
    d > 31
  ) {
    return "";
  }
  const y = refParts.y;
  const dim = daysInMonth(y, mo);
  if (d > dim) d = dim;
  return `${String(d).padStart(2, "0")}.${String(mo).padStart(2, "0")}.${y}`;
}

/**
 * Sheet veya eski kayıttan gelen serbest tarihi gg.aa.yyyy yapar.
 * Örn. 4.8.2026 → 04.08.2026
 */
export function canonicalTrDate(s: string): string {
  const t = s.trim();
  if (!t) return "";
  const m = t.match(/^(\d{1,2})\s*[./]\s*(\d{1,2})\s*[./]\s*(\d{2,4})\s*$/);
  if (m) {
    const dd = m[1].padStart(2, "0").slice(0, 2);
    const mm = m[2].padStart(2, "0").slice(0, 2);
    let y = m[3];
    if (y.length <= 2) y = `20${y.padStart(2, "0")}`;
    y = y.slice(0, 4);
    return `${dd}.${mm}.${y}`;
  }
  return formatTrDateDigits(t);
}

/**
 * Ödeme hücresi `n=...` sağ tarafı için: ISO, NBSP, en tire varyantları.
 */
export function canonicalTrDateLoose(s: string): string {
  const t = s
    .replace(/\u00A0/g, " ")
    .trim()
    .replace(/[\u2212\u2013\u2014]/g, "-");
  if (!t) return "";
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return `${iso[3]}.${iso[2]}.${iso[1]}`;
  }
  return canonicalTrDate(t);
}

/**
 * Tam gg.aa.yyyy (gün/ay 1–2 hane) tarihleri ayrıştırır.
 */
function parseCompleteTrDateParts(
  s: string
): { y: number; m: number; d: number } | null {
  const t = s.trim();
  const m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  const d = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const y = parseInt(m[3], 10);
  if (!Number.isFinite(y) || mo < 1 || mo > 12 || d < 1 || d > 31) {
    return null;
  }
  return { y, m: mo, d };
}

/**
 * Başlangıç ve bitiş arası dahil ay sayısı (takvim ayı).
 * Örn. 01.04.2026 – 30.06.2026 → 3. Bitiş &lt; başlangıç ise null.
 */
export function monthsInclusiveBetweenTrDates(
  baslangic: string,
  bitis: string
): number | null {
  const a = parseCompleteTrDateParts(baslangic);
  const b = parseCompleteTrDateParts(bitis);
  if (!a || !b) return null;
  const startKey = a.y * 12 + a.m;
  const endKey = b.y * 12 + b.m;
  if (endKey < startKey) return null;
  return endKey - startKey + 1;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Sözleşme başlangıcına göre taksit vadeleri: 1. ay = başlangıç günü,
 * sonraki her ay aynı takvim günü (ay sonu taşması varsa ayın son günü).
 */
export function addMonthsToTrDate(s: string, monthsToAdd: number): string | null {
  const canon = canonicalTrDate(s);
  const p = parseCompleteTrDateParts(canon);
  if (!p || !Number.isFinite(monthsToAdd)) return null;
  let d = p.d;
  let mo = p.m;
  let y = p.y;
  let total = mo - 1 + monthsToAdd;
  y += Math.floor(total / 12);
  total = ((total % 12) + 12) % 12;
  mo = total + 1;
  const dim = daysInMonth(y, mo);
  if (d > dim) d = dim;
  return `${String(d).padStart(2, "0")}.${String(mo).padStart(2, "0")}.${y}`;
}

/**
 * Türkiye takvimine göre “bugün” (gg.aa.yyyy).
 * İsteğe bağlı `reference` ile test / sabit an kullanılabilir.
 */
export function formatTodayTrDate(reference: Date = new Date()): string {
  const { y, m, d } = getTurkeyYmd(reference);
  return `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.${y}`;
}

/** Aynı gg.aa.yyyy sivil tarihleri sıralamak için (TZ’den bağımsız). */
export function trDateStartOfDayMs(s: string): number | null {
  const p = parseCompleteTrDateParts(canonicalTrDate(s));
  if (!p) return null;
  return Date.UTC(p.y, p.m - 1, p.d);
}

/**
 * Vade − Türkiye’deki bugün (tam gün). Negatif = gecikmiş.
 * `reference` o anın anlık zamanı; takvim günü TR’den türetilir.
 */
export function diffCalendarDaysFromToday(
  dueTr: string,
  reference: Date = new Date()
): number | null {
  const due = parseCompleteTrDateParts(canonicalTrDate(dueTr));
  if (!due) return null;
  const today = getTurkeyYmd(reference);
  return (
    civilUtcDayNumber(due.y, due.m, due.d) -
    civilUtcDayNumber(today.y, today.m, today.d)
  );
}
