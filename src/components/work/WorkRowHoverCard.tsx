"use client";

import type { ReactNode } from "react";
import { formatTrAmountDisplay } from "@/lib/tr-amount-input";
import { canonicalTrPhone } from "@/lib/tr-phone-input";
import type { WorkRowWithRow } from "@/lib/sheets/work-sheet";
import {
  effectiveSureAyString,
  formatPaidInstallmentRatio,
  formatWorkTutarCell,
  inferSozlesmeTipi,
  nextUnpaidInstallmentSummary,
  paidInstallmentStoredDatesSummary,
  paidMonthCountsForRow,
  paymentScheduleVadeTamamEksik,
  resolvePaymentScheduleBreakdown,
  resolveWorkContractBreakdown,
  type WorkContractRowInput,
} from "@/lib/work-contract-helpers";
import { WORK_SOZLESME_OPTIONS } from "@/lib/constants";

function toContractInput(r: WorkRowWithRow): WorkContractRowInput {
  return {
    tarih: r.tarih,
    sureAy: r.sureAy,
    aylikTutar: r.aylikTutar,
    bitisTarihi: r.bitisTarihi,
    tutar: r.tutar,
    durum: r.durum,
    sozlesmeTipi: r.sozlesmeTipi,
  };
}

function sozlesmeLabel(raw: string): string {
  const id = raw.trim();
  const hit = WORK_SOZLESME_OPTIONS.find((o) => o.id === id);
  return hit?.label ?? (id || "—");
}

function RowLine({
  label,
  value,
  muted,
}: {
  label: string;
  value: ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="grid grid-cols-[6.25rem_minmax(0,1fr)] gap-x-2 gap-y-0.5 text-[11px] leading-snug">
      <span className="text-zinc-500">{label}</span>
      <span className={muted ? "text-zinc-500" : "text-zinc-200"}>{value}</span>
    </div>
  );
}

/** Viewport içinde kalacak şekilde kutu; alt üst kesilme olmaması için maxHeight ile birlikte top ayarlanır. */
export function clampWorkRowHoverCardBox(
  clientX: number,
  clientY: number,
  preferredWidth = 352
): { left: number; top: number; width: number; maxHeight: number } {
  if (typeof window === "undefined") {
    return {
      left: clientX + 12,
      top: clientY + 12,
      width: preferredWidth,
      maxHeight: 420,
    };
  }
  const pad = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(preferredWidth, vw - pad * 2);

  let left = clientX + 12;
  if (left + width > vw - pad) left = vw - width - pad;
  if (left < pad) left = pad;

  const maxContentCap = Math.min(28 * 16, vh - pad * 2);

  let top = clientY + 12;
  let maxHeight = maxContentCap;

  const spaceBelow = vh - top - pad;
  if (spaceBelow < 200) {
    const flippedTop = clientY - maxContentCap - 8;
    if (flippedTop >= pad) {
      top = flippedTop;
      maxHeight = Math.min(maxContentCap, clientY - pad - 8);
    } else {
      top = pad;
      maxHeight = vh - pad * 2;
    }
  } else {
    maxHeight = Math.min(maxContentCap, spaceBelow);
  }

  if (top + maxHeight > vh - pad) {
    maxHeight = Math.max(200, vh - pad - top);
  }
  if (top < pad) {
    top = pad;
    maxHeight = Math.min(maxHeight, vh - pad * 2);
  }

  maxHeight = Math.max(200, Math.min(maxHeight, maxContentCap));

  return { left, top, width, maxHeight };
}

export function WorkRowHoverCardContent({ r }: { r: WorkRowWithRow }) {
  const tip = inferSozlesmeTipi(r);
  const sched = resolvePaymentScheduleBreakdown(toContractInput(r));
  const pm = sched ? paidMonthCountsForRow(toContractInput(r), r.aylikOdemeAylar) : null;
  const needAmount =
    tip === "tekSeferlik" ? r.tutar.trim() : r.aylikTutar.trim();
  const odemeGoster =
    sched && pm && needAmount ? formatPaidInstallmentRatio(pm) : "—";

  const ödemeTarihiGoster = paidInstallmentStoredDatesSummary(
    r.aylikOdemeAylar,
    toContractInput(r),
    pm
  );

  const sıradaki =
    sched && (tip === "uzunSureli" || tip === "tekSeferlik")
      ? nextUnpaidInstallmentSummary(toContractInput(r), r.aylikOdemeAylar)
      : "—";

  const hücreVadeOzeti = sched
    ? paymentScheduleVadeTamamEksik(toContractInput(r), r.aylikOdemeAylar)
    : null;

  const uzun = resolveWorkContractBreakdown(toContractInput(r));
  const sureMetni =
    tip === "uzunSureli" && uzun
      ? `${effectiveSureAyString(r)} ay${
          !r.sureAy.trim() && r.bitisTarihi.trim() ? "*" : ""
        }`
      : "—";

  const aylıkGoster =
    tip === "uzunSureli" && r.aylikTutar.trim()
      ? `${formatTrAmountDisplay(r.aylikTutar)} /ay`
      : "—";

  const tipOzeti = tip === "uzunSureli" ? "Uzun süreli" : "Tek seferlik";
  const sozEtiket = sozlesmeLabel(r.sozlesmeTipi);
  const altBaslik =
    sozEtiket && sozEtiket !== tipOzeti ? `${tipOzeti} · ${sozEtiket}` : tipOzeti;

  return (
    <div className="min-w-0 p-3 text-left">
      <div className="mb-3 border-b border-zinc-700/80 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Satır {r.row}
        </p>
        <p className="mt-0.5 text-sm font-semibold leading-snug text-zinc-50">
          {r.baslik || "—"}
        </p>
        <p className="mt-1 text-[11px] text-zinc-400">{altBaslik}</p>
      </div>

      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-sky-400/90">
        İş detayları
      </p>
      <div className="mb-3 space-y-1.5">
        <RowLine label="Şirket" value={r.sirket || "—"} />
        <RowLine label="İş türü" value={r.isTuru || "—"} />
        <RowLine label="Müşteri" value={r.musteriIsmi || "—"} />
        <RowLine
          label="İletişim"
          value={
            r.iletisim.trim() ? (
              <span className="tabular-nums">{canonicalTrPhone(r.iletisim)}</span>
            ) : (
              "—"
            )
          }
        />
        <RowLine label="Durum" value={r.durum || "—"} />
        <div className="grid grid-cols-[6.25rem_minmax(0,1fr)] gap-x-2 text-[11px] leading-snug">
          <span className="text-zinc-500">Not</span>
          <span className="whitespace-pre-wrap break-words text-zinc-300">
            {r.notlar.trim() ? r.notlar : "—"}
          </span>
        </div>
      </div>

      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400/90">
        Tablo / ödeme özeti
      </p>
      <div className="space-y-1.5">
        <RowLine label="Başlangıç" value={r.tarih || "—"} />
        <RowLine label="Bitiş" value={r.bitisTarihi?.trim() ? r.bitisTarihi : "—"} />
        <RowLine label="Süre (ay)" value={sureMetni} />
        <RowLine label="Aylık" value={aylıkGoster} />
        <RowLine label="Ödeme" value={odemeGoster} />
        <RowLine
          label="Ödeme tarihi"
          value={ödemeTarihiGoster}
          muted={
            ödemeTarihiGoster === "-" ||
            ödemeTarihiGoster.includes("tarih net değil")
          }
        />
        <RowLine
          label="Sıradaki açık"
          value={sıradaki}
          muted={sıradaki === "—"}
        />
        <RowLine
          label="Tutar"
          value={
            <span className="break-words">
              {formatWorkTutarCell(r.tutar, r.sureAy, r.aylikTutar)}
              {r.paraBirimi ? (
                <span className="text-zinc-500"> · {r.paraBirimi}</span>
              ) : null}
            </span>
          }
        />
        <RowLine
          label="Link"
          value={
            r.link.trim() ? (
              <span className="break-all text-sky-400">{r.link}</span>
            ) : (
              "—"
            )
          }
        />
        <RowLine
          label="Ödeme hücresi"
          value={
            hücreVadeOzeti == null ? (
              "—"
            ) : (
              <span
                className={
                  hücreVadeOzeti === "Tamam"
                    ? "font-semibold text-emerald-300"
                    : "font-semibold text-rose-300"
                }
                title={
                  hücreVadeOzeti === "Tamam"
                    ? "Sabit planda tüm taksitler ödendi veya (açık uçlu) geciken vade yok."
                    : "Sabit planda ödenmemiş taksit var veya (açık uçlu) vadesi geçen ödenmemiş taksit var."
                }
              >
                {hücreVadeOzeti}
              </span>
            )
          }
        />
      </div>
      <p className="mt-3 text-[10px] text-zinc-600">
        İncele ile açılır; dışarı tıklayınca veya Esc ile kapanır. Ödeme için
        Ödemeler veya Düzenle.
      </p>
    </div>
  );
}
