"use client";

import { useMemo, useState } from "react";
import {
  canonicalTrDate,
  diffCalendarDaysFromToday,
  trDateStartOfDayMs,
} from "@/lib/tr-date-input";
import { getTurkeyYmd } from "@/lib/turkey-time";
import {
  AYLIK_ODEME_HATIRLATMA_GUN,
  calendarMonthBeforeContractStart,
  clearInstallmentPaid,
  installmentDueCalendarShortLabel,
  installmentDueCalendarShortLabelForGrid,
  installmentDueDateFromContractStart,
  installmentDueDateFromSchedule,
  installmentDueUi,
  installmentDueUiWithBaslangic,
  installmentIndexForCalendarMonthFromStart,
  installmentIndexForTurkeyCalendarMonth,
  installmentTurkishMonthYearLabel,
  installmentTurkishMonthYearLabelForGrid,
  isUzunSureliOpenEndedSchedule,
  lastPaidInstallmentCalendarShortLabel,
  parsePaymentCellFull,
  parseWorkContract,
  paymentInstallmentCap,
  resolveInstallmentDueTrForGrid,
  setInstallmentPaid,
  type WorkContractRowInput,
} from "@/lib/work-contract-helpers";

type Props = {
  baslangicTarihi: string;
  sureAy: string;
  aylikTutar: string;
  value: string;
  onChange: (nextSerialized: string) => void;
  disabled?: boolean;
  compact?: boolean;
  bitisTarihi?: string;
  sozlesmeTipi?: string;
  tutar?: string;
};

const TR_AY_KISA_GRID = [
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

function btnClasses(
  ui: ReturnType<typeof installmentDueUi> | ReturnType<
    typeof installmentDueUiWithBaslangic
  >,
  isPaid: boolean
): string {
  if (isPaid) {
    return "border-emerald-500/60 bg-emerald-600/25 text-emerald-200";
  }
  if (ui.state === "overdue") {
    return "border-red-500/60 bg-red-950/40 text-red-200";
  }
  if (ui.state === "due_soon") {
    return "border-amber-500/60 bg-amber-950/35 text-amber-100";
  }
  if (ui.state === "pending" || ui.state === "no_schedule") {
    return "border-zinc-600 bg-zinc-900 text-zinc-400 hover:border-zinc-500 hover:bg-zinc-800";
  }
  return "border-zinc-600 bg-zinc-900 text-zinc-400";
}

function contractFromProps(p: Props): WorkContractRowInput {
  return {
    tarih: p.baslangicTarihi,
    sureAy: p.sureAy,
    aylikTutar: p.aylikTutar,
    bitisTarihi: p.bitisTarihi ?? "",
    sozlesmeTipi: p.sozlesmeTipi,
    tutar: p.tutar,
  };
}

export function WorkAylikOdemeToggles({
  baslangicTarihi,
  sureAy,
  aylikTutar,
  value,
  onChange,
  disabled,
  compact,
  bitisTarihi,
  sozlesmeTipi,
  tutar,
}: Props) {
  const c = parseWorkContract(sureAy, aylikTutar);
  const [markingMonth, setMarkingMonth] = useState<number | null>(null);
  const [calendarYear, setCalendarYear] = useState(() => getTurkeyYmd().y);

  const rowInput = contractFromProps({
    baslangicTarihi,
    sureAy,
    aylikTutar,
    value,
    onChange,
    disabled,
    compact,
    bitisTarihi,
    sozlesmeTipi,
    tutar,
  });

  const yearOptions = useMemo(() => {
    const y0 = getTurkeyYmd().y;
    let yMin = y0 - 3;
    let yMax = y0 + 8;
    const b = baslangicTarihi.trim();
    const canon = canonicalTrDate(b);
    if (canon && trDateStartOfDayMs(canon) !== null) {
      const pr = canon.match(/\.(\d{4})$/);
      if (pr) {
        const sy = parseInt(pr[1], 10);
        if (Number.isFinite(sy)) {
          yMin = Math.min(sy, y0);
          yMax = Math.max(yMax, sy + 10, y0 + 2);
        }
      }
    }
    const opts: number[] = [];
    for (let y = yMin; y <= yMax; y++) opts.push(y);
    return opts;
  }, [baslangicTarihi]);

  const dialogYear =
    markingMonth != null
      ? yearOptions.includes(calendarYear)
        ? calendarYear
        : (yearOptions[0] ?? getTurkeyYmd().y)
      : calendarYear;

  const contractGrid = useMemo(() => {
    const canon = canonicalTrDate(baslangicTarihi.trim());
    return canon !== "" && trDateStartOfDayMs(canon) !== null;
  }, [baslangicTarihi]);

  const lastPaidCompactLabel = useMemo(
    () => lastPaidInstallmentCalendarShortLabel(value, baslangicTarihi.trim()),
    [value, baslangicTarihi]
  );

  /** Kompakt tabloda takvim yalnızca düğmeden açılır; ilk açık taksite odaklanır. */
  const firstUnpaidInstallmentForOpen = useMemo(() => {
    const wc = parseWorkContract(sureAy, aylikTutar);
    if (!wc) return 1;
    const bash = baslangicTarihi.trim();
    const now = new Date();
    const gridOn =
      canonicalTrDate(bash) !== "" && trDateStartOfDayMs(canonicalTrDate(bash)) !== null;
    const rInput: WorkContractRowInput = {
      tarih: baslangicTarihi,
      sureAy,
      aylikTutar,
      bitisTarihi: bitisTarihi ?? "",
      sozlesmeTipi,
      tutar,
    };
    const uiAt = (m: number) =>
      gridOn
        ? installmentDueUiWithBaslangic(m, value, bash, now)
        : installmentDueUi(m, value, now);
    for (let m = 1; m <= wc.ay; m++) {
      if (uiAt(m).state !== "paid") return m;
    }
    if (isUzunSureliOpenEndedSchedule(rInput)) {
      const { paid } = parsePaymentCellFull(value);
      let m = wc.ay + 1;
      while (paid.has(m)) m++;
      return Math.max(1, m);
    }
    return Math.max(1, wc.ay);
  }, [sureAy, aylikTutar, value, baslangicTarihi, bitisTarihi, sozlesmeTipi, tutar]);

  if (!c) return null;
  const scheduleAyCount = c.ay;

  function usesContractStartGrid(): boolean {
    return contractGrid;
  }

  function gridInstallmentForMonth(
    calendarY: number,
    monthNum: number
  ): number | null {
    const now = new Date();
    if (usesContractStartGrid()) {
      return installmentIndexForCalendarMonthFromStart(
        baslangicTarihi,
        calendarY,
        monthNum
      );
    }
    return installmentIndexForTurkeyCalendarMonth(calendarY, monthNum, now);
  }

  function gridCellInactive(
    calY: number,
    monthNum: number,
    inst: number | null
  ): boolean {
    if (usesContractStartGrid()) {
      if (calendarMonthBeforeContractStart(calY, monthNum, baslangicTarihi)) {
        return true;
      }
    }
    if (inst == null) return true;
    if (
      !isUzunSureliOpenEndedSchedule(rowInput) &&
      inst > scheduleAyCount
    ) {
      return true;
    }
    return false;
  }

  function openMarkDialog(m: number) {
    if (usesContractStartGrid()) {
      const due = installmentDueDateFromContractStart(m, baslangicTarihi);
      if (due) {
        const p = due.match(/\.(\d{4})$/);
        if (p) setCalendarYear(parseInt(p[1], 10));
      } else {
        setCalendarYear(getTurkeyYmd().y);
      }
    } else {
      const due = installmentDueDateFromSchedule(m, new Date());
      if (due) {
        const p = due.match(/\.(\d{4})$/);
        if (p) setCalendarYear(parseInt(p[1], 10));
      } else {
        setCalendarYear(getTurkeyYmd().y);
      }
    }
    setMarkingMonth(m);
  }

  function monthCellClasses(opts: {
    installment: number | null;
    isPaid: boolean;
    overdueUnpaid: boolean;
    inactive: boolean;
  }): string {
    const { installment, isPaid, overdueUnpaid, inactive } = opts;
    if (inactive || installment == null) {
      return "border-zinc-800 bg-zinc-950/80 text-zinc-600 cursor-default";
    }
    if (isPaid) {
      return "border-emerald-500/70 bg-emerald-950/40 text-emerald-100 hover:bg-emerald-950/55";
    }
    if (overdueUnpaid) {
      return "border-red-500/70 bg-red-950/35 text-red-100 hover:bg-red-950/50";
    }
    return "border-amber-500/55 bg-amber-950/25 text-amber-100 hover:bg-amber-950/40";
  }

  function onMonthClick(monthOneBased: number, calYear: number) {
    if (disabled) return;
    const now = new Date();
    const inst = gridInstallmentForMonth(calYear, monthOneBased);
    if (gridCellInactive(calYear, monthOneBased, inst)) return;
    const cap = paymentInstallmentCap(rowInput, scheduleAyCount, value);
    const { paid } = parsePaymentCellFull(value);
    const isPaid = paid.has(inst!);
    if (isPaid) {
      const label = `${TR_AY_KISA_GRID[monthOneBased - 1]} ${calYear}`;
      if (
        confirm(
          `${label}: Ödendi işaretini ve bu taksitteki ödeme tarihini kaldırmak istiyor musunuz?`
        )
      ) {
        onChange(clearInstallmentPaid(value, inst!));
      }
      return;
    }
    const due = resolveInstallmentDueTrForGrid(
      inst!,
      value,
      baslangicTarihi,
      now
    );
    const payTr =
      due ??
      `01.${String(monthOneBased).padStart(2, "0")}.${calYear}`;
    const next = setInstallmentPaid(value, inst!, cap, payTr);
    if (next === value) return;
    onChange(next);
  }

  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      {!compact ? (
        <p className="text-xs font-medium text-zinc-400">
          {usesContractStartGrid() ? (
            <>
              Taksit vadeleri ve ay etiketleri{" "}
              <span className="text-zinc-300">kayıt başlangıç tarihine</span> göre
              (takvim ızgarası ile aynı). Hatırlatma {AYLIK_ODEME_HATIRLATMA_GUN}{" "}
              gün (TRT).
            </>
          ) : (
            <>
              Taksit sırası ve ay adları{" "}
              <span className="text-zinc-300">Türkiye sistem tarihine (bugün)</span>{" "}
              göre; sözleşme başlangıç sütununa bağlı değil. Hatırlatma{" "}
              {AYLIK_ODEME_HATIRLATMA_GUN} gün (TRT).
            </>
          )}
        </p>
      ) : null}
      <div
        className={
          compact
            ? "flex max-w-full flex-nowrap gap-1 overflow-x-auto pb-0.5 [scrollbar-width:thin]"
            : "flex flex-wrap gap-1.5"
        }
      >
        {compact && usesContractStartGrid() ? (
          <>
            <span
              className={`max-w-[7rem] shrink-0 rounded border px-1 py-0.5 text-left text-[9px] font-semibold leading-tight tabular-nums ${
                lastPaidCompactLabel
                  ? "border-emerald-500/55 bg-emerald-950/35 text-emerald-200"
                  : "border-zinc-600 bg-zinc-900 text-zinc-500"
              }`}
              title="Son ödenen taksitin ayı (kayıtlı ödeme tarihi veya vade)"
            >
              <span className="block min-w-0 truncate">
                Son: {lastPaidCompactLabel ?? "—"}
              </span>
            </span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => openMarkDialog(firstUnpaidInstallmentForOpen)}
              className="shrink-0 rounded border border-sky-500/45 bg-sky-950/30 px-1.5 py-0.5 text-[9px] font-semibold text-sky-200 transition-colors hover:bg-sky-950/45 disabled:opacity-50"
              title="Ödeme takvimini aç (aylar, ilk açık taksit)"
            >
              Takvim
            </button>
          </>
        ) : null}
        {!(compact && usesContractStartGrid())
          ? Array.from({ length: scheduleAyCount }, (_, i) => {
          const m = i + 1;
          const now = new Date();
          const gridOn = usesContractStartGrid();
          const ui = gridOn
            ? installmentDueUiWithBaslangic(m, value, baslangicTarihi, now)
            : installmentDueUi(m, value, now);
          const isPaid = ui.state === "paid";
          const dueLabel =
            ui.state !== "paid" && ui.state !== "no_schedule"
              ? ui.dueDate
              : null;
          const monthYear = gridOn
            ? installmentTurkishMonthYearLabelForGrid(
                m,
                value,
                baslangicTarihi,
                now
              ) ?? `Taksit ${m}`
            : installmentTurkishMonthYearLabel(m, now) ?? `Taksit ${m}`;
          const monthShort = gridOn
            ? installmentDueCalendarShortLabelForGrid(
                m,
                value,
                baslangicTarihi,
                now
              ) ?? `T${m}`
            : installmentDueCalendarShortLabel(m, now) ?? `T${m}`;
          const { planned } = parsePaymentCellFull(value);
          const planShort = planned.get(m);

          let title = `${monthYear} (taksit ${m})`;
          if (planShort) title += ` · ödeme planı ${planShort}`;
          if (isPaid) {
            title += ui.paymentDate
              ? ` · ödendi (${ui.paymentDate})`
              : " · ödendi (tarih yok — eski kayıt)";
          } else if (ui.state === "overdue" && dueLabel) {
            title += ` · takip tarihi ${dueLabel} · gecikmiş`;
          } else if (ui.state === "due_soon" && dueLabel) {
            title += ` · ${dueLabel} · ${ui.daysLeft} gün kaldı`;
          } else if (ui.state === "pending" && dueLabel) {
            title += ` · takip ${dueLabel}`;
          } else if (ui.state === "no_schedule") {
            title += " · takvim hesaplanamadı";
          }

          return (
            <button
              key={m}
              type="button"
              disabled={disabled}
              title={title}
              onClick={() => {
                if (disabled) return;
                openMarkDialog(m);
              }}
              className={
                compact
                  ? `max-w-[4.5rem] shrink-0 rounded border px-1 py-0.5 text-left text-[9px] font-semibold leading-tight transition-colors disabled:opacity-50 ${btnClasses(
                      ui,
                      isPaid
                    )}`
                  : `max-w-[6.5rem] rounded border px-1.5 py-1 text-left text-[10px] font-medium leading-snug transition-colors disabled:opacity-50 sm:max-w-[7rem] sm:text-xs ${btnClasses(
                      ui,
                      isPaid
                    )}`
              }
            >
              {compact ? (
                <span className="flex items-baseline justify-between gap-0.5 tabular-nums">
                  <span className="min-w-0 truncate">{monthShort}</span>
                  <span className="shrink-0 text-[8px] font-normal opacity-90">
                    {isPaid ? "✓" : ui.state === "overdue" ? "!" : m}
                  </span>
                </span>
              ) : (
                <span className="flex flex-col gap-0.5">
                  <span className="line-clamp-2 text-[1em] font-semibold">
                    {monthYear}
                  </span>
                  <span className="text-[0.85em] font-normal opacity-80">
                    taksit {m}
                    {planShort ? ` · plan ${planShort}` : ""}
                    {isPaid ? " · ✓" : ui.state === "overdue" ? " · !" : ""}
                  </span>
                </span>
              )}
            </button>
          );
        })
        : null}
      </div>

      {markingMonth != null ? (
        <div
          className={`rounded-lg border border-sky-500/40 bg-zinc-900/80 p-3 ${compact ? "text-xs" : "text-sm"} space-y-3`}
        >
          <div className="space-y-2">
            <p className="font-medium text-zinc-200">
              Ödeme takvimi
              <span className="ml-2 font-normal text-zinc-500">
                (taksit {markingMonth})
              </span>
            </p>
            <p className="text-[11px] leading-relaxed text-zinc-500">
              {usesContractStartGrid() ? (
                <>
                  Takvim{" "}
                  <span className="text-zinc-400">
                    kayıt başlangıcından itibaren
                  </span>{" "}
                  (geçmiş aylar işaretlenebilir).{" "}
                </>
              ) : (
                <>
                  Başlangıç tarihi yoksa sıra{" "}
                  <span className="text-zinc-400">bugünün ayına</span> göre.{" "}
                </>
              )}
              <span className="text-emerald-400/90">Yeşil ödendi</span>
              {", "}
              <span className="text-amber-200/90">turuncu sırada veya gelecek</span>
              {", "}
              <span className="text-red-300">kırmızı vadesi geçmiş (ödenmedi)</span>
              . Ödendi hücreye tekrar tıklayınca kalkar.
            </p>
            {baslangicTarihi.trim() ? (
              <p className="text-[11px] text-zinc-600">
                Kayıt başlangıcı: {baslangicTarihi}
              </p>
            ) : (
              <p className="text-[11px] text-zinc-600">
                Kayıt başlangıcı boş — geçmişe dönük ay için başlangıç tarihi girin.
              </p>
            )}
          </div>

          <label className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
            <span>Yıl</span>
            <select
              value={dialogYear}
              disabled={disabled}
              onChange={(e) => setCalendarYear(parseInt(e.target.value, 10))}
              className="rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-zinc-200 disabled:opacity-50"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {TR_AY_KISA_GRID.map((label, idx) => {
              const monthNum = idx + 1;
              const now = new Date();
              const inst = gridInstallmentForMonth(dialogYear, monthNum);
              const inactive = gridCellInactive(dialogYear, monthNum, inst);
              const { paid } = parsePaymentCellFull(value);
              const isPaid = inst != null && paid.has(inst);
              let overdueUnpaid = false;
              if (inst != null && !isPaid) {
                const due = resolveInstallmentDueTrForGrid(
                  inst,
                  value,
                  baslangicTarihi,
                  now
                );
                if (due) {
                  const diff = diffCalendarDaysFromToday(due, now);
                  overdueUnpaid = diff !== null && diff < 0;
                }
              }
              const title = inactive
                ? `${label} ${dialogYear}: Bu ay için taksit yok veya sözleşme kapsamı dışı`
                : isPaid
                  ? `${label} ${dialogYear}: ödendi — tıklayınca kaldır`
                  : overdueUnpaid
                    ? `${label} ${dialogYear}: gecikmiş — tıklayınca ödendi`
                    : `${label} ${dialogYear}: ödenmedi — tıklayınca ödendi`;

              return (
                <button
                  key={label}
                  type="button"
                  disabled={disabled || inactive}
                  title={title}
                  onClick={() => onMonthClick(monthNum, dialogYear)}
                  className={`rounded-md border px-2 py-2 text-center text-[11px] font-semibold transition-colors disabled:opacity-50 sm:text-xs ${monthCellClasses(
                    {
                      installment: inst,
                      isPaid,
                      overdueUnpaid,
                      inactive,
                    }
                  )}`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={() => setMarkingMonth(null)}
            className="w-full rounded-lg border border-zinc-600 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 disabled:opacity-50"
          >
            Kapat
          </button>
        </div>
      ) : null}
    </div>
  );
}
