"use client";

import { memo, type MouseEvent } from "react";
import { TagBadge } from "@/components/TagBadge";
import { isDurumClass, isSirketClass, isTurClass } from "@/lib/badge-classes";
import { formatWorkTutarCell, inferSozlesmeTipi } from "@/lib/work-contract-helpers";
import type { WorkRowWithRow } from "@/lib/sheets/work-sheet";

const td =
  "border-b border-zinc-800 px-1.5 py-1.5 align-top text-xs text-zinc-200";

type Props = {
  r: WorkRowWithRow;
  busy: boolean;
  onEdit: (r: WorkRowWithRow) => void;
  onDelete: (rowNum: number) => void;
  onInspect?: (r: WorkRowWithRow, e: MouseEvent<HTMLButtonElement>) => void;
};

export const WorkBoardTableRow = memo(function WorkBoardTableRow({
  r,
  busy,
  onEdit,
  onDelete,
  onInspect,
}: Props) {
  return (
    <tr className="hover:bg-zinc-900/40">
      <td className={`${td} text-zinc-500`}>{r.row}</td>
      <td
        className={`${td} text-zinc-400`}
        title={
          inferSozlesmeTipi(r) === "uzunSureli"
            ? "Uzun süreli"
            : "Tek seferlik"
        }
      >
        {inferSozlesmeTipi(r) === "uzunSureli" ? "Uzun" : "Tek"}
      </td>
      <td className={td}>{r.tarih || "—"}</td>
      <td className={td}>
        <TagBadge label={r.sirket} className={isSirketClass(r.sirket)} />
      </td>
      <td className={td}>
        <TagBadge label={r.isTuru} className={isTurClass(r.isTuru)} />
      </td>
      <td className={`${td} font-medium`}>
        <span className="block break-words leading-snug" title={r.baslik}>
          {r.baslik || "—"}
        </span>
      </td>
      <td className={td} title={r.musteriIsmi}>
        <span className="block break-words leading-snug">
          {r.musteriIsmi || "—"}
        </span>
      </td>
      <td className={td}>
        <TagBadge
          label={r.durum}
          className={`${isDurumClass(r.durum)} text-left`}
        />
      </td>
      <td className={td}>
        {r.bitisTarihi.trim() ? r.bitisTarihi : "—"}
      </td>
      <td
        className={`${td} tabular-nums whitespace-nowrap`}
        title={formatWorkTutarCell(r.tutar, r.sureAy, r.aylikTutar)}
      >
        <span className="block">
          {formatWorkTutarCell(r.tutar, r.sureAy, r.aylikTutar)}
        </span>
        {r.paraBirimi ? (
          <span className="block text-[10px] text-zinc-500">
            {r.paraBirimi}
          </span>
        ) : null}
      </td>
      <td className={td}>
        <div className="flex flex-col gap-0.5">
          {onInspect ? (
            <button
              type="button"
              data-inspect-trigger
              disabled={busy}
              onClick={(e) => onInspect(r, e)}
              className="rounded border border-sky-500/50 px-1.5 py-0.5 text-[10px] text-sky-200 hover:bg-sky-950/50"
            >
              İncele
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => onEdit(r)}
            className="rounded border border-zinc-600 px-1.5 py-0.5 text-[10px] hover:bg-zinc-800"
          >
            Düzenle
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onDelete(r.row)}
            className="rounded border border-red-500/40 px-1.5 py-0.5 text-[10px] text-red-300 hover:bg-red-950/50"
          >
            Sil
          </button>
        </div>
      </td>
    </tr>
  );
});
