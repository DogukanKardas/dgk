import { formatTrAmountDisplay } from "@/lib/tr-amount-input";
import {
  addMonthsToTrDate,
  canonicalTrDate,
  canonicalTrDateLoose,
  diffCalendarDaysFromToday,
  formatTodayTrDate,
  monthsInclusiveBetweenTrDates,
  trDateStartOfDayMs,
} from "@/lib/tr-date-input";
import type { WorkSozlesmeTipiId } from "@/lib/constants";
import type { FinansRowWithRow } from "@/lib/sheets/finance-sheet";

/** Vadeye kalan gün ≤ bu sayı iken üstte hatırlatma gösterilir (dahil). */
export const AYLIK_ODEME_HATIRLATMA_GUN = 5;

/** Ay sayısı: yalnız rakam, en fazla 3 basamak (örn. 12) */
export function normalizeSureAyInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 3);
}

/** İki tam tarih varsa süreyi (ay) ve ödeme indekslerini günceller (yalnız uzun süreli). */
export function mergeWorkFormWithAutoDuration<
  T extends {
    sozlesmeTipi: string;
    tarih: string;
    bitisTarihi: string;
    sureAy: string;
    aylikOdemeAylar: string;
  },
>(prev: T, patch: Partial<T>): T {
  const next = { ...prev, ...patch };
  if (next.sozlesmeTipi !== "uzunSureli") return next;
  const months = monthsInclusiveBetweenTrDates(next.tarih, next.bitisTarihi);
  if (months != null && months >= 1) {
    const sureAy = String(months);
    return {
      ...next,
      sureAy,
      aylikOdemeAylar: sanitizePaidMonthsForSureAy(sureAy, next.aylikOdemeAylar, {
        tarih: next.tarih,
        sureAy: next.sureAy,
        aylikTutar:
          "aylikTutar" in next && typeof (next as { aylikTutar?: string }).aylikTutar === "string"
            ? (next as { aylikTutar: string }).aylikTutar
            : "",
        bitisTarihi: next.bitisTarihi,
        sozlesmeTipi: next.sozlesmeTipi,
      }),
    };
  }
  return next;
}

export type WorkContractBreakdown = {
  ay: number;
  aylikNumeric: number;
  totalNumeric: number;
};

export function parseWorkContract(
  sureAy: string,
  aylikTutar: string
): WorkContractBreakdown | null {
  const ay = parseInt(sureAy.replace(/\D/g, ""), 10);
  const aylikDigits = aylikTutar.replace(/\D/g, "");
  const aylikNumeric = aylikDigits ? parseInt(aylikDigits, 10) : NaN;
  if (
    !Number.isFinite(ay) ||
    ay < 1 ||
    !Number.isFinite(aylikNumeric) ||
    aylikNumeric < 1
  ) {
    return null;
  }
  return {
    ay,
    aylikNumeric,
    totalNumeric: ay * aylikNumeric,
  };
}

/** Sözleşme süresi / ödeme takibi için sheet satırından gelen alanlar. */
export type WorkContractRowInput = {
  sozlesmeTipi?: string;
  sureAy: string;
  aylikTutar: string;
  tarih: string;
  bitisTarihi: string;
  /** Tek seferlik satırlarda `resolvePaymentScheduleBreakdown` için */
  tutar?: string;
  durum?: string;
};

/** İş kapanmış veya ödeme tamam sayıldıysa taksit uyarıları / sıradaki özet gösterilmez. */
export function workRowSkipsPaymentAlerts(durum: string | undefined): boolean {
  const d = durum?.trim();
  return d === "Tamamlandı" || d === "Ödendi";
}

/**
 * Önce Süre (ay) sütunu; boşsa başlangıç–bitiş arası dahil ay sayısı ile taksit adedi.
 * Sheet’te «uzun süreli» yazıp bitiş/süre boşsa tek taksit (mevcut ay dilimi) gösterilir —
 * tam liste yine bitiş veya süre ile genişler.
 */
export function resolveWorkContractBreakdown(
  r: WorkContractRowInput
): WorkContractBreakdown | null {
  const direct = parseWorkContract(r.sureAy, r.aylikTutar);
  if (direct) return direct;
  if (inferSozlesmeTipi(r) !== "uzunSureli") return null;
  const aylikDigits = r.aylikTutar.replace(/\D/g, "");
  const aylikNumeric = aylikDigits ? parseInt(aylikDigits, 10) : NaN;
  if (!Number.isFinite(aylikNumeric) || aylikNumeric < 1) return null;

  const months = monthsInclusiveBetweenTrDates(r.tarih, r.bitisTarihi);
  if (months != null && months >= 1) {
    return {
      ay: months,
      aylikNumeric,
      totalNumeric: months * aylikNumeric,
    };
  }

  const tip = (r.sozlesmeTipi ?? "").trim().toLowerCase();
  const sheetUzun =
    tip === "uzunsureli" ||
    tip === "uzun süreli" ||
    tip === "uzunsüreli";
  if (sheetUzun && r.tarih.trim()) {
    return {
      ay: 1,
      aylikNumeric,
      totalNumeric: aylikNumeric,
    };
  }

  return null;
}

/**
 * Uzun süreli + toplam taksit sayısı kesin değil (bitiş yok, süre sütunu da net çok ay değil).
 * Ödenen sütununda n/+ gösterimi için.
 */
export function isUzunSureliOpenEndedSchedule(r: WorkContractRowInput): boolean {
  if (inferSozlesmeTipi(r) !== "uzunSureli") return false;
  const sureDigits = r.sureAy.replace(/\D/g, "");
  const sureN = sureDigits ? parseInt(sureDigits, 10) : NaN;
  if (Number.isFinite(sureN) && sureN >= 2) return false;
  if (r.tarih.trim() && r.bitisTarihi.trim()) {
    const span = monthsInclusiveBetweenTrDates(r.tarih, r.bitisTarihi);
    if (span != null && span >= 1) return false;
  }
  return true;
}

/** Tek seferlik ödeme takvimi: tek taksit, tutar sütunundan. */
export function resolveTekSeferlikPaymentBreakdown(
  tutar: string
): WorkContractBreakdown | null {
  const aylikDigits = tutar.replace(/\D/g, "");
  const aylikNumeric = aylikDigits ? parseInt(aylikDigits, 10) : NaN;
  if (!Number.isFinite(aylikNumeric) || aylikNumeric < 1) return null;
  return { ay: 1, aylikNumeric, totalNumeric: aylikNumeric };
}

/** Uzun süreli + aylık veya tek seferlik + tutar için taksit sayısı. */
export function resolvePaymentScheduleBreakdown(
  r: WorkContractRowInput
): WorkContractBreakdown | null {
  const u = resolveWorkContractBreakdown(r);
  if (u) return u;
  if (inferSozlesmeTipi(r) === "tekSeferlik") {
    if (r.tutar?.trim()) {
      const one = resolveTekSeferlikPaymentBreakdown(r.tutar);
      if (one) return one;
    }
    if (r.aylikTutar?.trim()) {
      return resolveTekSeferlikPaymentBreakdown(r.aylikTutar);
    }
  }
  return null;
}

/** İlk vadeden itibaren her taksit için `^` plan (ödenmemiş). */
export function buildRecurringPlannedPaymentCell(
  firstDueTr: string,
  installmentCount: number
): string {
  const first = canonicalTrDate(firstDueTr);
  if (!first || trDateStartOfDayMs(first) === null) return "";
  if (!Number.isFinite(installmentCount) || installmentCount < 1) return "";
  const planned = new Map<number, string>();
  for (let i = 1; i <= installmentCount; i++) {
    const d = addMonthsToTrDate(first, i - 1);
    if (d) planned.set(i, d);
  }
  return serializePaymentCellFull(new Map(), planned);
}

/** Tek seferlik: yalnız taksit 1 (rakam / tarih / plan). */
export function sanitizeTekSeferlikOdemeCell(serialized: string): string {
  const { paid, planned } = parsePaymentCellFull(serialized);
  const nextPaid = new Map<number, string | null>();
  const nextPlanned = new Map<number, string>();
  if (paid.has(1)) nextPaid.set(1, paid.get(1) ?? null);
  else if (planned.has(1)) {
    const p = planned.get(1);
    if (p) nextPlanned.set(1, p);
  }
  return serializePaymentCellFull(nextPaid, nextPlanned);
}

export function effectivePaymentScheduleSureAy(r: WorkContractRowInput): string {
  if (inferSozlesmeTipi(r) === "tekSeferlik") return "1";
  return effectiveSureAyString(r);
}

export function effectivePaymentScheduleAylikTutar(
  r: WorkContractRowInput & { tutar?: string }
): string {
  if (inferSozlesmeTipi(r) === "tekSeferlik") return r.tutar?.trim() ? (r.tutar ?? "") : "";
  return r.aylikTutar;
}

/** Taksit butonları / API için: çözümlü ay sayısı veya ham süre alanı. */
export function effectiveSureAyString(r: WorkContractRowInput): string {
  const b = resolveWorkContractBreakdown(r);
  if (b) return String(b.ay);
  return r.sureAy.trim();
}

/** Sheet'te süre boş ama tarihlerden türetildiyse kayıtta süreyi doldurmak için. */
export function withPersistedSureAyIfDerived<T extends WorkContractRowInput>(
  r: T
): T {
  const b = resolveWorkContractBreakdown(r);
  if (b && !r.sureAy.trim()) {
    return { ...r, sureAy: String(b.ay) };
  }
  return r;
}

const TR_AY_KISA = [
  "Oca",
  "Şub",
  "Mar",
  "Nis",
  "May",
  "Haz",
  "Tem",
  "Ağu",
  "Eyl",
  "Eki",
  "Kas",
  "Ara",
] as const;

/**
 * Aylık ödeme takvimi: çapa Türkiye sistem tarihi (bugün), sözleşme başlangıcı değil.
 * Taksit 1 = bugünün ayı, taksit 2 = +1 ay …
 */
export function installmentScheduleAnchorTrDate(now = new Date()): string {
  return formatTodayTrDate(now);
}

export function installmentDueDateFromSchedule(
  installmentIndex: number,
  now = new Date()
): string | null {
  return addMonthsToTrDate(
    installmentScheduleAnchorTrDate(now),
    installmentIndex - 1
  );
}

/** Taksit vad esinin takvim ayı (örn. Ağu '25) — sistem tarihine göre. */
export function installmentDueCalendarShortLabel(
  installmentIndex: number,
  now = new Date()
): string | null {
  const due = installmentDueDateFromSchedule(installmentIndex, now);
  if (!due) return null;
  const m = due.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  const mo = parseInt(m[2], 10);
  const y = parseInt(m[3], 10);
  if (!Number.isFinite(mo) || mo < 1 || mo > 12) return null;
  return `${TR_AY_KISA[mo - 1]} '${String(y).slice(-2)}`;
}

const TR_AY_UZUN = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
] as const;

/** Takvim seçimi için: «Nisan 2026» — sistem (TR bugün) + taksit sırası. */
export function installmentTurkishMonthYearLabel(
  installmentIndex: number,
  now = new Date()
): string | null {
  const due = installmentDueDateFromSchedule(installmentIndex, now);
  if (!due) return null;
  const m = due.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  const mo = parseInt(m[2], 10);
  const y = parseInt(m[3], 10);
  if (!Number.isFinite(mo) || mo < 1 || mo > 12) return null;
  return `${TR_AY_UZUN[mo - 1]} ${y}`;
}

export function inferSozlesmeTipi(r: {
  sozlesmeTipi?: string;
  sureAy: string;
  aylikTutar: string;
  tarih?: string;
  bitisTarihi?: string;
  tutar?: string;
}): WorkSozlesmeTipiId {
  const t = (r.sozlesmeTipi ?? "")
    .trim()
    .toLowerCase()
    .replace(/\u0131/g, "i")
    .replace(/\u0130/g, "i")
    .replace(/\s+/g, " ");
  if (t === "uzunsureli" || t === "uzun süreli") return "uzunSureli";
  if (
    t === "tekseferlik" ||
    t === "tek seferlik" ||
    /^tek[\s_-]*sefer/.test(t)
  ) {
    return "tekSeferlik";
  }
  if (parseWorkContract(r.sureAy, r.aylikTutar)) return "uzunSureli";

  /**
   * Toplam tutar «Tutar» sütununda, «Aylık tutar» boş/geçersizse tek seferlik say.
   * Aksi halde tarih aralığı + aylık tutar yanlışlıkla çok taksitli sözleşmeye çevirirdi.
   */
  const aylikDigitsEarly = r.aylikTutar.replace(/\D/g, "");
  const aylikNEarly = aylikDigitsEarly ? parseInt(aylikDigitsEarly, 10) : NaN;
  const aylikOkForUzunSpan =
    Number.isFinite(aylikNEarly) && aylikNEarly >= 1;
  if (r.tutar?.trim()) {
    const tutarTek = resolveTekSeferlikPaymentBreakdown(r.tutar);
    if (tutarTek && !aylikOkForUzunSpan) return "tekSeferlik";
  }

  const fromSpan =
    r.tarih?.trim() && r.bitisTarihi?.trim()
      ? monthsInclusiveBetweenTrDates(r.tarih, r.bitisTarihi)
      : null;
  if (fromSpan != null && fromSpan >= 1) {
    const aylikDigits = r.aylikTutar.replace(/\D/g, "");
    const aylikN = aylikDigits ? parseInt(aylikDigits, 10) : NaN;
    if (Number.isFinite(aylikN) && aylikN >= 1) return "uzunSureli";
  }
  return "tekSeferlik";
}

/**
 * Hücre: `1,2,3` | `1=ödemeTarihi` | `1^planlananTarih` (ödeme yapılacak / hatırlatma).
 * Aynı indekste `=` ödendiyi belirler; `^` yalnız ödenmemiş taksitlerde saklanır.
 */
export function parsePaymentCellFull(raw: string): {
  paid: Map<number, string | null>;
  planned: Map<number, string>;
} {
  const paid = new Map<number, string | null>();
  const planned = new Map<number, string>();
  for (const part of raw.split(",")) {
    const t = part.trim();
    if (!t) continue;
    const eq = t.indexOf("=");
    const hat = t.indexOf("^");
    if (hat !== -1 && (eq === -1 || hat < eq)) {
      const n = parseInt(t.slice(0, hat).trim(), 10);
      const d = canonicalTrDate(t.slice(hat + 1).trim());
      if (Number.isFinite(n) && n >= 1 && d && trDateStartOfDayMs(d) !== null) {
        if (!paid.has(n)) planned.set(n, d);
      }
      continue;
    }
    if (eq !== -1) {
      const n = parseInt(t.slice(0, eq).trim(), 10);
      const d = canonicalTrDate(t.slice(eq + 1).trim());
      if (Number.isFinite(n) && n >= 1) {
        paid.set(n, d || null);
        planned.delete(n);
      }
      continue;
    }
    const n = parseInt(t, 10);
    if (Number.isFinite(n) && n >= 1) {
      paid.set(n, null);
      planned.delete(n);
    }
  }
  return { paid, planned };
}

/**
 * İncele kartı: öncelikle `n=gg.aa.yyyy`; yoksa (yalnız ödendi işareti ise)
 * sözleşme başlangıcına ve hücre planına göre hesaplanan vade tarihi — UI'da "(vade)" ile.
 */
export function paidInstallmentStoredDatesSummary(
  paymentCellRaw: string,
  contract?: WorkContractRowInput,
  installmentCounts?: PaidInstallmentCounts | null,
  now = new Date()
): string {
  const { paid } = parsePaymentCellFull(paymentCellRaw);
  const countsSayFullyPaid =
    installmentCounts != null &&
    installmentCounts.total != null &&
    installmentCounts.paid >= installmentCounts.total &&
    installmentCounts.total >= 1;
  const canInferDateWhenCellEmpty =
    contract &&
    (workRowSkipsPaymentAlerts(contract.durum) ||
      paymentScheduleVadeTamamEksik(contract, paymentCellRaw, now) === "Tamam" ||
      countsSayFullyPaid);
  if (paid.size === 0 && canInferDateWhenCellEmpty) {
    const cRow = contract;
    const sched = resolvePaymentScheduleBreakdown(cRow);
    if (sched != null && sched.ay >= 1 && cRow.tarih?.trim()) {
      const due = resolveInstallmentDueTrForGrid(
        sched.ay,
        paymentCellRaw,
        cRow.tarih,
        now
      );
      if (due != null && trDateStartOfDayMs(due) !== null) return due;
    }
    if (
      inferSozlesmeTipi(cRow) === "tekSeferlik" &&
      cRow.bitisTarihi?.trim()
    ) {
      const b = canonicalTrDate(cRow.bitisTarihi.trim());
      if (b != null && trDateStartOfDayMs(b) !== null) return b;
    }
    if (cRow.bitisTarihi?.trim()) {
      const b2 = canonicalTrDate(cRow.bitisTarihi.trim());
      if (b2 != null && trDateStartOfDayMs(b2) !== null) return b2;
    }
    if (cRow.tarih?.trim()) {
      const t = canonicalTrDate(cRow.tarih.trim());
      if (t != null && trDateStartOfDayMs(t) !== null) return t;
    }
  }
  if (paid.size === 0) return "-";
  const entries = [...paid.entries()]
    .filter(([n]) => n >= 1)
    .sort((a, b) => a[0] - b[0]);
  type Part = { n: number; d: string; explicit: boolean };
  const parts: Part[] = [];
  for (const [n, raw] of entries) {
    let d: string | null = null;
    let explicit = false;
    if (raw != null && String(raw).trim() !== "") {
      const c = canonicalTrDateLoose(String(raw).trim());
      if (c && trDateStartOfDayMs(c) !== null) {
        d = c;
        explicit = true;
      }
    }
    if (!d && contract?.tarih?.trim()) {
      const due = resolveInstallmentDueTrForGrid(
        n,
        paymentCellRaw,
        contract.tarih,
        now
      );
      if (due && trDateStartOfDayMs(due) !== null) {
        d = due;
        explicit = false;
      }
    }
    if (
      !d &&
      contract &&
      n === 1 &&
      inferSozlesmeTipi(contract) === "tekSeferlik" &&
      contract.bitisTarihi?.trim()
    ) {
      const b = canonicalTrDate(contract.bitisTarihi.trim());
      if (b && trDateStartOfDayMs(b) !== null) {
        d = b;
        explicit = false;
      }
    }
    if (d) parts.push({ n, d, explicit });
  }
  if (parts.length === 0) return "Ödendi; tarih net değil";
  if (parts.length === 1) {
    const p = parts[0];
    return p.explicit ? p.d : `${p.d} (vade)`;
  }
  return parts
    .map((x) =>
      x.explicit
        ? `${x.n}. taksit: ${x.d}`
        : `${x.n}. taksit: ${x.d} (vade)`
    )
    .join(" · ");
}

export function serializePaymentCellFull(
  paid: Map<number, string | null>,
  planned: Map<number, string>
): string {
  const parts: string[] = [];
  for (const [k, d] of [...paid.entries()].sort((a, b) => a[0] - b[0])) {
    if (k < 1) continue;
    parts.push(d && d.trim() ? `${k}=${d}` : String(k));
  }
  for (const [k, d] of [...planned.entries()].sort((a, b) => a[0] - b[0])) {
    if (k < 1 || paid.has(k)) continue;
    if (d && d.trim()) parts.push(`${k}^${d}`);
  }
  return parts.join(",");
}

export function parsePaymentCell(raw: string): Map<number, string | null> {
  return parsePaymentCellFull(raw).paid;
}

export function serializePaymentCell(map: Map<number, string | null>): string {
  return serializePaymentCellFull(map, new Map());
}

/** Ödenen ay indeksleri (geriye dönük `1,2,3` ile uyumlu). */
export function parsePaidMonths(raw: string): Set<number> {
  return new Set(parsePaymentCell(raw).keys());
}

export function serializePaidMonths(indices: Iterable<number>): ReadonlyArray<number> {
  return [...new Set(indices)].filter((n) => n >= 1).sort((a, b) => a - b);
}

export function paidMonthsToCellValue(indices: Iterable<number>): string {
  const map = new Map<number, string | null>();
  for (const i of indices) map.set(i, null);
  return serializePaymentCell(map);
}

export function setInstallmentPaid(
  serialized: string,
  installment: number,
  maxAy: number,
  paymentDateTr: string
): string {
  const d = canonicalTrDate(paymentDateTr);
  if (!d || trDateStartOfDayMs(d) === null) return serialized;
  if (installment < 1 || installment > maxAy) return serialized;
  const { paid, planned } = parsePaymentCellFull(serialized);
  paid.set(installment, d);
  planned.delete(installment);
  return serializePaymentCellFull(paid, planned);
}

/**
 * Ödeme hücresi güncellemelerinde kullanılacak üst taksit sınırı (açık uçlu sözleşmede yüksek indeks).
 */
export function paymentInstallmentCap(
  r: WorkContractRowInput,
  scheduleAy: number,
  serialized: string
): number {
  const { paid, planned } = parsePaymentCellFull(serialized);
  let maxFromCell = scheduleAy;
  for (const k of paid.keys()) if (k > maxFromCell) maxFromCell = k;
  for (const k of planned.keys()) if (k > maxFromCell) maxFromCell = k;
  if (isUzunSureliOpenEndedSchedule(r)) {
    return Math.max(maxFromCell, 120);
  }
  return Math.max(scheduleAy, maxFromCell);
}

/** Özet / senkron: tek seferlikte yalnızca 1. taksit; hücredeki 2+ indeksler yok sayılır. */
function paymentInstallmentCapForContractRow(
  r: WorkContractRowInput,
  scheduleAy: number,
  serialized: string
): number {
  const cap = paymentInstallmentCap(r, scheduleAy, serialized);
  return inferSozlesmeTipi(r) === "tekSeferlik" ? Math.min(cap, 1) : cap;
}

/** TR takvim yılı + ay (1–12) → o aya denk gelen sistem vadesi taksit sırası. */
export function installmentIndexForTurkeyCalendarMonth(
  year: number,
  month: number,
  now = new Date()
): number | null {
  if (month < 1 || month > 12) return null;
  for (let m = 1; m <= 240; m++) {
    const due = installmentDueDateFromSchedule(m, now);
    if (!due) continue;
    const parts = due.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!parts) continue;
    const mo = parseInt(parts[2], 10);
    const y = parseInt(parts[3], 10);
    if (y === year && mo === month) return m;
  }
  return null;
}

/**
 * Başlangıç tarihinden (aylık) m. taksitin vadesi.
 * addMonthsToTrDate ile ay sonu taşması aynı kuralda.
 */
export function installmentDueDateFromContractStart(
  installmentIndex: number,
  baslangicTr: string
): string | null {
  const b = canonicalTrDate(baslangicTr.trim());
  if (!b || trDateStartOfDayMs(b) === null) return null;
  if (installmentIndex < 1) return null;
  return addMonthsToTrDate(b, installmentIndex - 1);
}

/** Başlangıç ayından itibaren: takvim yılı + ay → taksit sırası (geçmiş aylar dahil). */
export function installmentIndexForCalendarMonthFromStart(
  baslangicTr: string,
  year: number,
  month: number
): number | null {
  const b = canonicalTrDate(baslangicTr.trim());
  if (!b || trDateStartOfDayMs(b) === null) return null;
  if (month < 1 || month > 12) return null;
  for (let m = 1; m <= 240; m++) {
    const due = addMonthsToTrDate(b, m - 1);
    if (!due) continue;
    const parts = due.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!parts) continue;
    const mo = parseInt(parts[2], 10);
    const y = parseInt(parts[3], 10);
    if (y === year && mo === month) return m;
  }
  return null;
}

/** Takvim (yıl+ay), sözleşme başlangıç ayından önce mi? (yalnızca ay karşılaştırması.) */
export function calendarMonthBeforeContractStart(
  year: number,
  month: number,
  baslangicTr: string
): boolean {
  const b = canonicalTrDate(baslangicTr.trim());
  if (!b) return false;
  const parts = b.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!parts) return false;
  const mo = parseInt(parts[2], 10);
  const y = parseInt(parts[3], 10);
  return year * 12 + month < y * 12 + mo;
}

/** Başlangıç tarihi dolu ve geçerliyse taksit vadeleri kayıt başlangıcına göre hesaplanır. */
export function usesContractStartPaymentGrid(r: { tarih: string }): boolean {
  const canon = canonicalTrDate(r.tarih.trim());
  return canon !== "" && trDateStartOfDayMs(canon) !== null;
}

/** Plan varsa plan vadesi, yoksa sistem vadesi. */
export function resolveInstallmentDueTrForUi(
  installmentIndex: number,
  paymentCellRaw: string,
  now = new Date()
): string | null {
  const { planned } = parsePaymentCellFull(paymentCellRaw);
  const p = planned.get(installmentIndex)?.trim();
  if (p) {
    const c = canonicalTrDate(p);
    if (c && trDateStartOfDayMs(c) !== null) return c;
  }
  return installmentDueDateFromSchedule(installmentIndex, now);
}

/**
 * Takvim ızgarası: plan; yoksa başlangıç+taksit; yoksa sistem vadesi.
 */
export function resolveInstallmentDueTrForGrid(
  installmentIndex: number,
  paymentCellRaw: string,
  baslangicTr: string,
  now = new Date()
): string | null {
  const { planned } = parsePaymentCellFull(paymentCellRaw);
  const p = planned.get(installmentIndex)?.trim();
  if (p) {
    const c = canonicalTrDate(p);
    if (c && trDateStartOfDayMs(c) !== null) return c;
  }
  const fromStart = installmentDueDateFromContractStart(
    installmentIndex,
    baslangicTr
  );
  if (fromStart) return fromStart;
  return installmentDueDateFromSchedule(installmentIndex, now);
}

/** gg.aa.yyyy → «Oca '26» (kısa ay + yıl). */
export function installmentDueTrToCalendarShortLabel(dueTr: string): string | null {
  const c = canonicalTrDate(dueTr.trim());
  if (!c || trDateStartOfDayMs(c) === null) return null;
  const m = c.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  const mo = parseInt(m[2], 10);
  const y = parseInt(m[3], 10);
  if (!Number.isFinite(mo) || mo < 1 || mo > 12) return null;
  return `${TR_AY_KISA[mo - 1]} '${String(y).slice(-2)}`;
}

/** gg.aa.yyyy → «Ocak 2026». */
export function installmentDueTrToTurkishMonthYearLabel(
  dueTr: string
): string | null {
  const c = canonicalTrDate(dueTr.trim());
  if (!c || trDateStartOfDayMs(c) === null) return null;
  const m = c.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  const mo = parseInt(m[2], 10);
  const y = parseInt(m[3], 10);
  if (!Number.isFinite(mo) || mo < 1 || mo > 12) return null;
  return `${TR_AY_UZUN[mo - 1]} ${y}`;
}

/** Takvim ızgarası ile aynı vade (plan / başlangıç / sistem) — kısa etiket. */
export function installmentDueCalendarShortLabelForGrid(
  installmentIndex: number,
  paymentCellRaw: string,
  baslangicTr: string,
  now = new Date()
): string | null {
  const due = resolveInstallmentDueTrForGrid(
    installmentIndex,
    paymentCellRaw,
    baslangicTr,
    now
  );
  if (!due) return null;
  return installmentDueTrToCalendarShortLabel(due);
}

/** Takvim ızgarası ile aynı vade — uzun ay adı + yıl. */
export function installmentTurkishMonthYearLabelForGrid(
  installmentIndex: number,
  paymentCellRaw: string,
  baslangicTr: string,
  now = new Date()
): string | null {
  const due = resolveInstallmentDueTrForGrid(
    installmentIndex,
    paymentCellRaw,
    baslangicTr,
    now
  );
  if (!due) return null;
  return installmentDueTrToTurkishMonthYearLabel(due);
}

/**
 * installmentDueUi ile aynı; ödenmemiş taksitte vade `resolveInstallmentDueTrForGrid`
 * ile hesaplanır (başlangıç + plan; bugün çapası değil).
 */
export function installmentDueUiWithBaslangic(
  installmentIndex: number,
  paymentCellRaw: string,
  baslangicTr: string,
  now = new Date()
): InstallmentDueUi {
  const { paid, planned } = parsePaymentCellFull(paymentCellRaw);
  if (paid.has(installmentIndex)) {
    return {
      state: "paid",
      paymentDate: paid.get(installmentIndex) ?? null,
    };
  }
  const plannedDue = planned.get(installmentIndex);
  const computedDue = resolveInstallmentDueTrForGrid(
    installmentIndex,
    paymentCellRaw,
    baslangicTr,
    now
  );
  const due = plannedDue ?? computedDue;
  if (!due) return { state: "no_schedule" };
  const days = diffCalendarDaysFromToday(due, now);
  if (days === null) return { state: "no_schedule" };
  if (days < 0) return { state: "overdue", dueDate: due };
  if (days <= AYLIK_ODEME_HATIRLATMA_GUN) {
    return { state: "due_soon", dueDate: due, daysLeft: days };
  }
  return { state: "pending", dueDate: due, daysLeft: days };
}

/** En son ödenen taksitin takvim ayı (ödeme tarihi varsa o; yoksa grid vadesi). */
export function lastPaidInstallmentCalendarShortLabel(
  paymentCellRaw: string,
  baslangicTr: string,
  now = new Date()
): string | null {
  const { paid } = parsePaymentCellFull(paymentCellRaw);
  let maxIdx: number | null = null;
  for (const k of paid.keys()) {
    if (k >= 1 && (maxIdx === null || k > maxIdx)) maxIdx = k;
  }
  if (maxIdx === null) return null;
  const storedRaw = paid.get(maxIdx);
  let tr: string | null = null;
  if (storedRaw) {
    const c = canonicalTrDate(storedRaw);
    if (c && trDateStartOfDayMs(c) !== null) tr = c;
  }
  if (!tr) {
    tr = resolveInstallmentDueTrForGrid(maxIdx, paymentCellRaw, baslangicTr, now);
  }
  if (!tr) return null;
  return installmentDueTrToCalendarShortLabel(tr);
}

/** Ödendi, fakat tarih yok (`1,2,3` ile uyumlu). */
export function setInstallmentPaidBare(
  serialized: string,
  installment: number,
  maxAy: number
): string {
  if (installment < 1 || installment > maxAy) return serialized;
  const { paid, planned } = parsePaymentCellFull(serialized);
  paid.set(installment, null);
  planned.delete(installment);
  return serializePaymentCellFull(paid, planned);
}

export function setInstallmentPlannedPayDate(
  serialized: string,
  installment: number,
  maxAy: number,
  plannedDateTr: string
): string {
  const d = canonicalTrDate(plannedDateTr);
  if (!d || trDateStartOfDayMs(d) === null) return serialized;
  if (installment < 1 || installment > maxAy) return serialized;
  const { paid, planned } = parsePaymentCellFull(serialized);
  if (paid.has(installment)) return serialized;
  planned.set(installment, d);
  return serializePaymentCellFull(paid, planned);
}

export function clearInstallmentPlannedPayDate(
  serialized: string,
  installment: number
): string {
  const { paid, planned } = parsePaymentCellFull(serialized);
  planned.delete(installment);
  return serializePaymentCellFull(paid, planned);
}

export function clearInstallmentPaid(
  serialized: string,
  installment: number
): string {
  const { paid, planned } = parsePaymentCellFull(serialized);
  paid.delete(installment);
  return serializePaymentCellFull(paid, planned);
}

/**
 * Ödeme hücresindeki taksit indekslerini süre ile sınırlar.
 * Açık uçlu sözleşmede `sureAy` sheet’te 1 kalsa bile, hücredeki ödenen/plan
 * indeksleri korunur (API PATCH sonrası silinmesin diye).
 */
export function sanitizePaidMonthsForSureAy(
  sureAy: string,
  serialized: string,
  row?: WorkContractRowInput
): string {
  const sureN = parseInt(sureAy.replace(/\D/g, ""), 10);
  if (!Number.isFinite(sureN) || sureN < 1) return "";
  const { paid, planned } = parsePaymentCellFull(serialized);
  let maxKey = 0;
  for (const k of paid.keys()) if (k > maxKey) maxKey = k;
  for (const k of planned.keys()) if (k > maxKey) maxKey = k;
  const cap =
    row && isUzunSureliOpenEndedSchedule(row)
      ? Math.min(240, Math.max(sureN, maxKey))
      : sureN;
  const nextPaid = new Map<number, string | null>();
  const nextPlanned = new Map<number, string>();
  for (const [k, v] of paid) {
    if (k >= 1 && k <= cap) nextPaid.set(k, v);
  }
  for (const [k, v] of planned) {
    if (k >= 1 && k <= cap) nextPlanned.set(k, v);
  }
  return serializePaymentCellFull(nextPaid, nextPlanned);
}

export function paidMonthCounts(
  sureAy: string,
  aylikTutar: string,
  serialized: string
): { paid: number; total: number } | null {
  const c = parseWorkContract(sureAy, aylikTutar);
  if (!c) return null;
  const map = parsePaymentCell(serialized);
  const paid = [...map.keys()].filter((n) => n <= c.ay).length;
  return { paid, total: c.ay };
}

export type PaidInstallmentCounts = {
  paid: number;
  /** null → arayüzde paid/+ (toplam taksit bilinmiyor) */
  total: number | null;
};

export function paidMonthCountsForRow(
  r: WorkContractRowInput,
  serialized: string
): PaidInstallmentCounts | null {
  const c = resolvePaymentScheduleBreakdown(r);
  if (!c) return null;
  const openEnded = isUzunSureliOpenEndedSchedule(r);
  const map = parsePaymentCellFull(serialized).paid;
  let paid = openEnded
    ? [...map.keys()].filter((n) => n >= 1).length
    : [...map.keys()].filter((n) => n <= c.ay).length;

  if (workRowSkipsPaymentAlerts(r.durum)) {
    if (openEnded) {
      paid = Math.max(paid, 1);
    } else {
      paid = c.ay;
    }
  }

  return { paid, total: openEnded ? null : c.ay };
}

/** Ödenen sütunu: 3/12 veya 2/+ */
export function formatPaidInstallmentRatio(pm: PaidInstallmentCounts | null): string {
  if (!pm) return "—";
  return `${pm.paid}/${pm.total == null ? "+" : pm.total}`;
}

export type InstallmentDueUi =
  | { state: "paid"; paymentDate: string | null }
  | { state: "overdue"; dueDate: string }
  | { state: "due_soon"; dueDate: string; daysLeft: number }
  | { state: "pending"; dueDate: string; daysLeft: number }
  | { state: "no_schedule" };

export function installmentDueUi(
  installmentIndex: number,
  paymentCellRaw: string,
  now = new Date()
): InstallmentDueUi {
  const { paid, planned } = parsePaymentCellFull(paymentCellRaw);
  if (paid.has(installmentIndex)) {
    return {
      state: "paid",
      paymentDate: paid.get(installmentIndex) ?? null,
    };
  }
  const plannedDue = planned.get(installmentIndex);
  const computedDue = installmentDueDateFromSchedule(installmentIndex, now);
  const due = plannedDue ?? computedDue;
  if (!due) return { state: "no_schedule" };
  const days = diffCalendarDaysFromToday(due, now);
  if (days === null) return { state: "no_schedule" };
  if (days < 0) return { state: "overdue", dueDate: due };
  if (days <= AYLIK_ODEME_HATIRLATMA_GUN) {
    return { state: "due_soon", dueDate: due, daysLeft: days };
  }
  return { state: "pending", dueDate: due, daysLeft: days };
}

/** İlk açık (ödenmemiş) taksit için kısa özet metni. */
export function nextUnpaidInstallmentSummary(
  r: WorkContractRowInput,
  paymentCellRaw: string,
  now = new Date()
): string {
  if (workRowSkipsPaymentAlerts(r.durum)) return "—";
  const c = resolvePaymentScheduleBreakdown(r);
  if (!c) return "—";
  const openEnded = isUzunSureliOpenEndedSchedule(r);
  const baslangic = r.tarih.trim();
  const gridOn = usesContractStartPaymentGrid(r);

  function dueUiFor(m: number) {
    return gridOn
      ? installmentDueUiWithBaslangic(m, paymentCellRaw, baslangic, now)
      : installmentDueUi(m, paymentCellRaw, now);
  }
  function monthLabelFor(m: number): string | null {
    return gridOn
      ? installmentTurkishMonthYearLabelForGrid(
          m,
          paymentCellRaw,
          baslangic,
          now
        )
      : installmentTurkishMonthYearLabel(m, now);
  }

  for (let m = 1; m <= c.ay; m++) {
    const ui = dueUiFor(m);
    if (ui.state === "paid") continue;
    const cal = monthLabelFor(m);
    const calPart = cal ? `${cal} · ` : "";
    if (ui.state === "overdue") {
      return `${calPart}vade ${ui.dueDate} · gecikmiş`;
    }
    if (ui.state === "due_soon") {
      return `${calPart}vade ${ui.dueDate} · ${ui.daysLeft === 0 ? "bugün" : `${ui.daysLeft} gün`}`;
    }
    if (ui.state === "pending") {
      return `${calPart}vade ${ui.dueDate}`;
    }
    if (ui.state === "no_schedule") {
      return cal ?? "—";
    }
    return "—";
  }
  if (openEnded) {
    const { paid } = parsePaymentCellFull(paymentCellRaw);
    let m = c.ay + 1;
    while (paid.has(m)) m++;
    const cal = monthLabelFor(m);
    if (!cal) return "—";
    const ui = dueUiFor(m);
    const calPart = `${cal} · `;
    if (ui.state === "overdue") {
      return `${calPart}vade ${ui.dueDate} · gecikmiş`;
    }
    if (ui.state === "due_soon") {
      return `${calPart}vade ${ui.dueDate} · ${ui.daysLeft === 0 ? "bugün" : `${ui.daysLeft} gün`}`;
    }
    if (ui.state === "pending") {
      return `${calPart}vade ${ui.dueDate}`;
    }
    if (ui.state === "no_schedule") {
      return cal;
    }
    return cal;
  }
  return "Taksitler tamam";
}

export type WorkPaymentAlert = {
  row: number;
  baslik: string;
  installment: number;
  dueDate: string;
  kind: "overdue" | "due_soon";
  daysLeft?: number;
};

export type WorkPaymentAlertsRowInput = {
  row: number;
  baslik: string;
  durum?: string;
  tarih: string;
  bitisTarihi: string;
  sureAy: string;
  aylikTutar: string;
  tutar?: string;
  aylikOdemeAylar: string;
  sozlesmeTipi?: string;
  /** Bakiye özetinde birlikte; yoksa TRY sayılır. */
  paraBirimi?: string;
};

function dueTrToInstallmentDueUi(due: string, now: Date): InstallmentDueUi {
  const days = diffCalendarDaysFromToday(due, now);
  if (days === null) return { state: "no_schedule" };
  if (days < 0) return { state: "overdue", dueDate: due };
  if (days <= AYLIK_ODEME_HATIRLATMA_GUN) {
    return { state: "due_soon", dueDate: due, daysLeft: days };
  }
  return { state: "pending", dueDate: due, daysLeft: days };
}

/** Tek seferlik tek taksit: önce bitiş, yoksa başlangıç tarihi. */
export function tekSeferlikFirstDueDate(r: WorkContractRowInput): string | null {
  const b = r.bitisTarihi?.trim()
    ? canonicalTrDate(r.bitisTarihi.trim())
    : "";
  const t = r.tarih?.trim() ? canonicalTrDate(r.tarih.trim()) : "";
  if (b && trDateStartOfDayMs(b) !== null) return b;
  if (t && trDateStartOfDayMs(t) !== null) return t;
  return null;
}

/**
 * Tek seferlik (plan yoksa bitiş/başlangıç vadesi) + uzun süreli grid; hatırılatma ve bakiye için.
 */
export function installmentDueUiForWorkRow(
  installmentIndex: number,
  paymentCellRaw: string,
  r: WorkPaymentAlertsRowInput,
  now = new Date()
): InstallmentDueUi {
  const rInput: WorkContractRowInput = {
    tarih: r.tarih,
    sureAy: r.sureAy,
    aylikTutar: r.aylikTutar,
    bitisTarihi: r.bitisTarihi,
    sozlesmeTipi: r.sozlesmeTipi,
    tutar: r.tutar,
    durum: r.durum,
  };
  const gridOn = usesContractStartPaymentGrid(r);
  let st: InstallmentDueUi;
  if (gridOn) {
    st = installmentDueUiWithBaslangic(
      installmentIndex,
      paymentCellRaw,
      r.tarih.trim(),
      now
    );
  } else {
    st = installmentDueUi(installmentIndex, paymentCellRaw, now);
  }
  const { paid, planned } = parsePaymentCellFull(paymentCellRaw);
  if (paid.has(installmentIndex)) return st;
  if (inferSozlesmeTipi(rInput) === "tekSeferlik" && installmentIndex === 1) {
    if (!planned.has(1)) {
      const tekDue = tekSeferlikFirstDueDate(rInput);
      if (tekDue) return dueTrToInstallmentDueUi(tekDue, now);
    }
  }
  return st;
}

export function trDateYearMonth(tr: string): { year: number; month: number } | null {
  const c = canonicalTrDate(tr);
  const m = c.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  const month = parseInt(m[2], 10);
  const year = parseInt(m[3], 10);
  if (!Number.isFinite(month) || month < 1 || month > 12) return null;
  if (!Number.isFinite(year)) return null;
  return { year, month };
}

/** Takvim yılı eşleşmeli; ay verilmişse ay da eşleşmeli (1–12). */
export function trDateInSelectedTrPeriod(
  trDate: string,
  calendarYear: number,
  calendarMonth: number | null
): boolean {
  const ym = trDateYearMonth(trDate);
  if (!ym) return false;
  if (ym.year !== calendarYear) return false;
  if (calendarMonth != null && ym.month !== calendarMonth) return false;
  return true;
}

/**
 * Tek seferlik satırın başlangıç/bitiş tarihlerine göre seçilen TR dönemiyle kesişir mi.
 * Özetlerde: hücrede ödeme tarihi yok / sadece «1» veya durum kapatılmış ama hücre boş.
 */
export function tekSeferlikOverlapsTrPeriod(
  r: WorkPaymentAlertsRowInput,
  calendarYear: number,
  calendarMonth: number | null
): boolean {
  const rInput: WorkContractRowInput = {
    tarih: r.tarih,
    sureAy: r.sureAy,
    aylikTutar: r.aylikTutar,
    bitisTarihi: r.bitisTarihi,
    sozlesmeTipi: r.sozlesmeTipi,
    tutar: r.tutar,
    durum: r.durum,
  };
  if (inferSozlesmeTipi(rInput) !== "tekSeferlik") return false;

  const t0 = canonicalTrDate(r.tarih.trim());
  const t1 = r.bitisTarihi?.trim()
    ? canonicalTrDate(r.bitisTarihi.trim())
    : "";
  const start =
    t0 && trDateStartOfDayMs(t0) !== null
      ? t0
      : t1 && trDateStartOfDayMs(t1) !== null
        ? t1
        : "";
  const end =
    t1 && trDateStartOfDayMs(t1) !== null
      ? t1
      : t0 && trDateStartOfDayMs(t0) !== null
        ? t0
        : start;
  if (!start || trDateStartOfDayMs(start) === null) return false;
  const endEff =
    end && trDateStartOfDayMs(end) !== null ? end : start;

  const sp = trDateYearMonth(start);
  const ep = trDateYearMonth(endEff);
  if (!sp || !ep) return false;
  const loIdx = Math.min(sp.year * 12 + sp.month, ep.year * 12 + ep.month);
  const hiIdx = Math.max(sp.year * 12 + sp.month, ep.year * 12 + ep.month);

  if (calendarMonth == null) {
    const yLo = Math.min(sp.year, ep.year);
    const yHi = Math.max(sp.year, ep.year);
    return calendarYear >= yLo && calendarYear <= yHi;
  }
  const selIdx = calendarYear * 12 + calendarMonth;
  return selIdx >= loIdx && selIdx <= hiIdx;
}

function installment1PaidBare(paymentCellRaw: string): boolean {
  const { paid } = parsePaymentCellFull(paymentCellRaw);
  if (!paid.has(1)) return false;
  const raw = paid.get(1);
  return raw == null || String(raw).trim() === "";
}

function resolvedPaidInstallmentTrDate(
  r: WorkPaymentAlertsRowInput,
  installmentIndex: number,
  paymentCellRaw: string,
  paymentDateFromUi: string | null,
  now: Date
): string | null {
  if (paymentDateFromUi?.trim()) {
    const c = canonicalTrDate(paymentDateFromUi.trim());
    if (c && trDateStartOfDayMs(c) !== null) return c;
  }
  const { paid } = parsePaymentCellFull(paymentCellRaw);
  const raw = paid.get(installmentIndex);
  if (raw != null && String(raw).trim() !== "") {
    const loose = canonicalTrDateLoose(String(raw).trim());
    if (loose && trDateStartOfDayMs(loose) !== null) return loose;
  }
  const rInput: WorkContractRowInput = {
    tarih: r.tarih,
    sureAy: r.sureAy,
    aylikTutar: r.aylikTutar,
    bitisTarihi: r.bitisTarihi,
    sozlesmeTipi: r.sozlesmeTipi,
    tutar: r.tutar,
    durum: r.durum,
  };
  if (usesContractStartPaymentGrid(r)) {
    const d = resolveInstallmentDueTrForGrid(
      installmentIndex,
      paymentCellRaw,
      r.tarih.trim(),
      now
    );
    if (d && trDateStartOfDayMs(d) !== null) return d;
  }
  if (inferSozlesmeTipi(rInput) === "tekSeferlik" && installmentIndex === 1) {
    const t = tekSeferlikFirstDueDate(rInput);
    if (t) return t;
  }
  return installmentDueDateFromSchedule(installmentIndex, now);
}

export type WorkMoneyByCurrency = {
  paraBirimi: string;
  tutarMinor: number;
};

function mergeMinorByCurrency(
  entries: Iterable<[string, number]>
): WorkMoneyByCurrency[] {
  const agg = new Map<string, number>();
  for (const [pb, v] of entries) {
    if (v <= 0) continue;
    agg.set(pb, (agg.get(pb) ?? 0) + v);
  }
  return [...agg.entries()]
    .map(([paraBirimi, tutarMinor]) => ({ paraBirimi, tutarMinor }))
    .sort((a, b) => a.paraBirimi.localeCompare(b.paraBirimi, "tr"));
}

/**
 * Seçilen TR takvim döneminde ödeme tarihi düşen taksitler (İş satırı Tamamlandı/Ödendi dahil).
 * `calendarMonth`: null → tüm yıl.
 */
export function summarizeWorkPaidForSelectedPeriod(
  rows: WorkPaymentAlertsRowInput[],
  calendarYear: number,
  calendarMonth: number | null,
  now = new Date()
): WorkMoneyByCurrency[] {
  const agg = new Map<string, number>();

  for (const r of rows) {
    const tip = inferSozlesmeTipi(r);
    if (tip !== "uzunSureli" && tip !== "tekSeferlik") continue;
    const c = resolvePaymentScheduleBreakdown(r);
    if (!c) continue;
    const rInput: WorkContractRowInput = {
      tarih: r.tarih,
      sureAy: r.sureAy,
      aylikTutar: r.aylikTutar,
      bitisTarihi: r.bitisTarihi,
      sozlesmeTipi: r.sozlesmeTipi,
      tutar: r.tutar,
      durum: r.durum,
    };
    const cap = paymentInstallmentCapForContractRow(
      rInput,
      c.ay,
      r.aylikOdemeAylar
    );
    const currency = (r.paraBirimi ?? "TRY").trim() || "TRY";
    const amtPer = installmentExpectedAmountMinor(r);
    if (amtPer <= 0) continue;

    let tekInstallment1Counted = false;

    for (let m = 1; m <= cap; m++) {
      const st = installmentDueUiForWorkRow(m, r.aylikOdemeAylar, r, now);
      if (st.state !== "paid") continue;
      const trWhen = resolvedPaidInstallmentTrDate(
        r,
        m,
        r.aylikOdemeAylar,
        st.paymentDate,
        now
      );
      if (!trWhen || !trDateInSelectedTrPeriod(trWhen, calendarYear, calendarMonth)) {
        continue;
      }
      agg.set(currency, (agg.get(currency) ?? 0) + amtPer);
      if (tip === "tekSeferlik" && m === 1) tekInstallment1Counted = true;
    }

    /**
     * Tek seferlik: ödeme hücresinde sadece «1» (tarih yok) veya hiç işaret yokken
     * Tamamlandı/Ödendi — çözülen ödeme tarihi vadeye düşüp seçilen yıldan çıkıyordu.
     * Sözleşme dönemi seçilen filtreyle kesişiyorsa bu ödemeyi özete dahil et.
     */
    if (
      tip === "tekSeferlik" &&
      !tekInstallment1Counted &&
      c.ay === 1 &&
      tekSeferlikOverlapsTrPeriod(r, calendarYear, calendarMonth)
    ) {
      const { paid } = parsePaymentCellFull(r.aylikOdemeAylar);
      const has1 = paid.has(1);
      const bare = installment1PaidBare(r.aylikOdemeAylar);
      const implicitClosed = workRowSkipsPaymentAlerts(r.durum) && !has1;
      if (implicitClosed || bare) {
        agg.set(currency, (agg.get(currency) ?? 0) + amtPer);
      }
    }
  }

  return mergeMinorByCurrency(agg);
}

/**
 * Seçilen dönemde vadesi düşen ödenmemiş taksitler (açık İş satırları).
 * `calendarMonth`: null → tüm yıl.
 */
export function summarizeWorkUnpaidForSelectedPeriod(
  rows: WorkPaymentAlertsRowInput[],
  calendarYear: number,
  calendarMonth: number | null,
  now = new Date()
): WorkMoneyByCurrency[] {
  const agg = new Map<string, number>();

  for (const r of rows) {
    if (workRowSkipsPaymentAlerts(r.durum)) continue;
    const tip = inferSozlesmeTipi(r);
    if (tip !== "uzunSureli" && tip !== "tekSeferlik") continue;
    const c = resolvePaymentScheduleBreakdown(r);
    if (!c) continue;
    const rInput: WorkContractRowInput = {
      tarih: r.tarih,
      sureAy: r.sureAy,
      aylikTutar: r.aylikTutar,
      bitisTarihi: r.bitisTarihi,
      sozlesmeTipi: r.sozlesmeTipi,
      tutar: r.tutar,
      durum: r.durum,
    };
    const cap = paymentInstallmentCapForContractRow(
      rInput,
      c.ay,
      r.aylikOdemeAylar
    );
    const currency = (r.paraBirimi ?? "TRY").trim() || "TRY";
    const amtPer = installmentExpectedAmountMinor(r);
    if (amtPer <= 0) continue;

    for (let m = 1; m <= cap; m++) {
      const st = installmentDueUiForWorkRow(m, r.aylikOdemeAylar, r, now);
      if (st.state === "paid" || st.state === "no_schedule") continue;
      if (!("dueDate" in st)) continue;
      const due = st.dueDate;
      if (!trDateInSelectedTrPeriod(due, calendarYear, calendarMonth)) continue;
      agg.set(currency, (agg.get(currency) ?? 0) + amtPer);
    }
  }

  return mergeMinorByCurrency(agg);
}

function installmentExpectedAmountMinor(r: WorkPaymentAlertsRowInput): number {
  const rInput: WorkContractRowInput = {
    tarih: r.tarih,
    sureAy: r.sureAy,
    aylikTutar: r.aylikTutar,
    bitisTarihi: r.bitisTarihi,
    sozlesmeTipi: r.sozlesmeTipi,
    tutar: r.tutar,
    durum: r.durum,
  };
  const tip = inferSozlesmeTipi(rInput);
  const src =
    tip === "tekSeferlik"
      ? ((r.tutar?.trim() ? r.tutar : r.aylikTutar) ?? "")
      : r.aylikTutar;
  const digits = String(src ?? "").replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

function plannedDueTrForInstallmentDisplay(
  r: WorkPaymentAlertsRowInput,
  installmentIndex: number,
  paymentCellRaw: string,
  now: Date
): string {
  if (usesContractStartPaymentGrid(r)) {
    const d = resolveInstallmentDueTrForGrid(
      installmentIndex,
      paymentCellRaw,
      r.tarih.trim(),
      now
    );
    if (d && trDateStartOfDayMs(d) !== null) return d;
  }
  const rInput: WorkContractRowInput = {
    tarih: r.tarih,
    sureAy: r.sureAy,
    aylikTutar: r.aylikTutar,
    bitisTarihi: r.bitisTarihi,
    sozlesmeTipi: r.sozlesmeTipi,
    tutar: r.tutar,
    durum: r.durum,
  };
  if (inferSozlesmeTipi(rInput) === "tekSeferlik" && installmentIndex === 1) {
    const t = tekSeferlikFirstDueDate(rInput);
    if (t) return t;
  }
  return installmentDueDateFromSchedule(installmentIndex, now) ?? "";
}

/**
 * İş ödemesi olarak işaretlenmiş taksitleri Finans Gelir satırına dönüştürür (salt okunur UI; negatif `row`).
 */
export function listFinansGelirRowsFromWorkPaidInstallments(
  rows: WorkPaymentAlertsRowInput[],
  now = new Date()
): FinansRowWithRow[] {
  const out: FinansRowWithRow[] = [];
  let seq = 0;

  for (const r of rows) {
    const tip = inferSozlesmeTipi(r);
    if (tip !== "uzunSureli" && tip !== "tekSeferlik") continue;
    const c = resolvePaymentScheduleBreakdown(r);
    if (!c) continue;
    const rInput: WorkContractRowInput = {
      tarih: r.tarih,
      sureAy: r.sureAy,
      aylikTutar: r.aylikTutar,
      bitisTarihi: r.bitisTarihi,
      sozlesmeTipi: r.sozlesmeTipi,
      tutar: r.tutar,
      durum: r.durum,
    };
    const cap = paymentInstallmentCapForContractRow(
      rInput,
      c.ay,
      r.aylikOdemeAylar
    );
    const amtPer = installmentExpectedAmountMinor(r);
    if (amtPer <= 0) continue;
    const currency = (r.paraBirimi ?? "TRY").trim() || "TRY";

    let tekInstallment1Pushed = false;

    for (let m = 1; m <= cap; m++) {
      const st = installmentDueUiForWorkRow(m, r.aylikOdemeAylar, r, now);
      if (st.state !== "paid") continue;
      const payTr = resolvedPaidInstallmentTrDate(
        r,
        m,
        r.aylikOdemeAylar,
        st.paymentDate,
        now
      );
      if (!payTr || trDateStartOfDayMs(payTr) === null) continue;

      seq += 1;
      const vade = plannedDueTrForInstallmentDisplay(
        r,
        m,
        r.aylikOdemeAylar,
        now
      );

      out.push({
        row: -seq,
        tip: "Gelir",
        tarih: payTr,
        tutar: String(amtPer),
        paraBirimi: currency,
        baslik: `${r.baslik?.trim() || "İş"} · taksit ${m}`,
        kategori: "İş / müşteri",
        durum: "Tahsil edildi",
        vadeTarihi: vade,
        belgeNo: "",
        isSheetRow: String(r.row),
        link: "",
        notlar: `İş ödemesi (senkron) · İş satırı ${r.row}`,
        ek: "",
      });
      if (tip === "tekSeferlik" && m === 1) tekInstallment1Pushed = true;
    }

    if (tip === "tekSeferlik" && !tekInstallment1Pushed && c.ay === 1) {
      const { paid } = parsePaymentCellFull(r.aylikOdemeAylar);
      const has1 = paid.has(1);
      const bare = installment1PaidBare(r.aylikOdemeAylar);
      const implicitClosed = workRowSkipsPaymentAlerts(r.durum) && !has1;
      if (!(implicitClosed || bare)) continue;

      const payTr =
        tekSeferlikFirstDueDate(rInput) ??
        canonicalTrDate(r.tarih.trim()) ??
        formatTodayTrDate(now);
      if (!payTr || trDateStartOfDayMs(payTr) === null) continue;

      seq += 1;
      const vade = plannedDueTrForInstallmentDisplay(
        r,
        1,
        r.aylikOdemeAylar,
        now
      );

      out.push({
        row: -seq,
        tip: "Gelir",
        tarih: payTr,
        tutar: String(amtPer),
        paraBirimi: currency,
        baslik: `${r.baslik?.trim() || "İş"} · tek seferlik`,
        kategori: "İş / müşteri",
        durum: "Tahsil edildi",
        vadeTarihi: vade,
        belgeNo: "",
        isSheetRow: String(r.row),
        link: "",
        notlar: `İş ödemesi (senkron, vade/tarih) · İş satırı ${r.row}`,
        ek: "",
      });
    }
  }

  out.sort((a, b) => {
    const tb = trDateStartOfDayMs(b.tarih) ?? 0;
    const ta = trDateStartOfDayMs(a.tarih) ?? 0;
    return tb - ta;
  });
  return out;
}

export type WorkPaymentPaidInstallment = {
  row: number;
  baslik: string;
  installment: number;
  paymentDate: string | null;
};

export function collectWorkPaymentAlerts(
  rows: WorkPaymentAlertsRowInput[],
  now = new Date()
): { overdue: WorkPaymentAlert[]; dueSoon: WorkPaymentAlert[] } {
  const overdue: WorkPaymentAlert[] = [];
  const dueSoon: WorkPaymentAlert[] = [];
  for (const r of rows) {
    if (workRowSkipsPaymentAlerts(r.durum)) continue;
    const tip = inferSozlesmeTipi(r);
    if (tip !== "uzunSureli" && tip !== "tekSeferlik") continue;
    const c = resolvePaymentScheduleBreakdown(r);
    if (!c) continue;
    const rInput: WorkContractRowInput = {
      tarih: r.tarih,
      sureAy: r.sureAy,
      aylikTutar: r.aylikTutar,
      bitisTarihi: r.bitisTarihi,
      sozlesmeTipi: r.sozlesmeTipi,
      tutar: r.tutar,
      durum: r.durum,
    };
    const cap = paymentInstallmentCapForContractRow(
      rInput,
      c.ay,
      r.aylikOdemeAylar
    );
    for (let m = 1; m <= cap; m++) {
      const st = installmentDueUiForWorkRow(m, r.aylikOdemeAylar, r, now);
      if (st.state === "paid") continue;
      if (st.state === "overdue") {
        overdue.push({
          row: r.row,
          baslik: r.baslik,
          installment: m,
          dueDate: st.dueDate,
          kind: "overdue",
        });
      } else if (st.state === "due_soon") {
        dueSoon.push({
          row: r.row,
          baslik: r.baslik,
          installment: m,
          dueDate: st.dueDate,
          kind: "due_soon",
          daysLeft: st.daysLeft,
        });
      }
    }
  }
  overdue.sort((a, b) => {
    const ta = trDateStartOfDayMs(a.dueDate) ?? 0;
    const tb = trDateStartOfDayMs(b.dueDate) ?? 0;
    return ta - tb;
  });
  dueSoon.sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));
  return { overdue, dueSoon };
}

/** İş ödeme hücresinde işaretlenmiş ödenen taksitler (Tümü satır bazında; Tamamlandı/Ödendi dahil). */
export function collectPaidWorkInstallments(
  rows: WorkPaymentAlertsRowInput[],
  now = new Date(),
  limit = 50
): WorkPaymentPaidInstallment[] {
  const out: WorkPaymentPaidInstallment[] = [];
  for (const r of rows) {
    const tip = inferSozlesmeTipi(r);
    if (tip !== "uzunSureli" && tip !== "tekSeferlik") continue;
    const c = resolvePaymentScheduleBreakdown(r);
    if (!c) continue;
    const rInput: WorkContractRowInput = {
      tarih: r.tarih,
      sureAy: r.sureAy,
      aylikTutar: r.aylikTutar,
      bitisTarihi: r.bitisTarihi,
      sozlesmeTipi: r.sozlesmeTipi,
      tutar: r.tutar,
      durum: r.durum,
    };
    const cap = paymentInstallmentCapForContractRow(
      rInput,
      c.ay,
      r.aylikOdemeAylar
    );
    for (let m = 1; m <= cap; m++) {
      const st = installmentDueUiForWorkRow(m, r.aylikOdemeAylar, r, now);
      if (st.state === "paid") {
        out.push({
          row: r.row,
          baslik: r.baslik,
          installment: m,
          paymentDate: st.paymentDate,
        });
      }
    }
  }
  out.sort((a, b) => {
    const tb = trDateStartOfDayMs(b.paymentDate ?? "") ?? 0;
    const ta = trDateStartOfDayMs(a.paymentDate ?? "") ?? 0;
    return tb - ta;
  });
  return out.slice(0, limit);
}

/**
 * Sabit süreli (bitiş/süre bilinen): 1…N taksitin hepsi ödendi → Tamam, aksi Eksik
 * (vade gelecek olsa bile ödenmemiş taksit varsa Eksik).
 * Açık uçlu uzun süreli: yalnız vadesi geçmiş ödenmemiş taksit varsa Eksik (önceki uyarı mantığı).
 * İş durumu Tamamlandı/Ödendi ise Tamam.
 */
export function paymentScheduleVadeTamamEksik(
  r: WorkContractRowInput,
  paymentCellRaw: string,
  now = new Date()
): "Tamam" | "Eksik" {
  if (workRowSkipsPaymentAlerts(r.durum)) return "Tamam";
  const tip = inferSozlesmeTipi(r);
  if (tip !== "uzunSureli" && tip !== "tekSeferlik") return "Tamam";
  const c = resolvePaymentScheduleBreakdown(r);
  if (!c) return "Tamam";

  const { paid } = parsePaymentCellFull(paymentCellRaw);
  const openEnded = isUzunSureliOpenEndedSchedule(r);
  const gridOn = usesContractStartPaymentGrid(r);
  const baslangic = r.tarih.trim();

  if (!openEnded) {
    for (let m = 1; m <= c.ay; m++) {
      if (!paid.has(m)) return "Eksik";
    }
    return "Tamam";
  }

  const cap = paymentInstallmentCap(r, c.ay, paymentCellRaw);
  for (let m = 1; m <= cap; m++) {
    const st = gridOn
      ? installmentDueUiWithBaslangic(m, paymentCellRaw, baslangic, now)
      : installmentDueUi(m, paymentCellRaw, now);
    if (st.state === "overdue") return "Eksik";
  }
  return "Tamam";
}

/** Tutar sütunu: sözleşme toplamı ve/veya tek seferlik tutar. */
export function formatWorkTutarCell(
  tutar: string,
  sureAy: string,
  aylikTutar: string
): string {
  const c = parseWorkContract(sureAy, aylikTutar);
  const one = formatTrAmountDisplay(tutar);
  if (c && one) {
    return `${formatTrAmountDisplay(String(c.totalNumeric))} (∑) · ${one}`;
  }
  if (c) {
    return `${formatTrAmountDisplay(String(c.totalNumeric))} (∑)`;
  }
  return one || "—";
}
