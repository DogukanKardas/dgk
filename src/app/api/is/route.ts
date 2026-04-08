import { NextResponse } from "next/server";
import {
  appendWorkRow,
  deleteWorkRow,
  listWorkRows,
  type WorkRow,
  updateWorkRow,
} from "@/lib/sheets/work-sheet";
import { formatSheetsApiError } from "@/lib/sheets/format-sheets-error";
import {
  inferSozlesmeTipi,
  sanitizePaidMonthsForSureAy,
  sanitizeTekSeferlikOdemeCell,
} from "@/lib/work-contract-helpers";
import type { WorkSozlesmeTipiId } from "@/lib/constants";

export const dynamic = "force-dynamic";

function errStatus(msg: string): number {
  if (msg.includes("eksik") || msg.includes("Missing env")) return 503;
  if (msg.includes("Geçersiz")) return 400;
  if (msg.includes("izin vermiyor")) return 403;
  return 500;
}

function parseWorkRow(body: Record<string, unknown>): WorkRow {
  const s = (k: string) =>
    body[k] != null && body[k] !== undefined ? String(body[k]) : "";
  const sureAyIn = s("sureAy");
  const aylikIn = s("aylikTutar");
  const explicit = s("sozlesmeTipi").trim() as WorkSozlesmeTipiId | "";
  const tip: WorkSozlesmeTipiId =
    explicit === "uzunSureli" || explicit === "tekSeferlik"
      ? explicit
      : inferSozlesmeTipi({
          sozlesmeTipi: s("sozlesmeTipi"),
          sureAy: sureAyIn,
          aylikTutar: aylikIn,
        });

  const common = {
    tarih: s("tarih"),
    sirket: s("sirket"),
    isTuru: s("isTuru"),
    baslik: s("baslik"),
    durum: s("durum"),
    paraBirimi: s("paraBirimi"),
    link: s("link"),
    notlar: s("notlar"),
    musteriIsmi: s("musteriIsmi"),
    iletisim: s("iletisim"),
    sozlesmeTipi: tip,
  };

  if (tip === "tekSeferlik") {
    return {
      ...common,
      tutar: s("tutar"),
      bitisTarihi: s("bitisTarihi"),
      sureAy: "",
      aylikTutar: "",
      aylikOdemeAylar: sanitizeTekSeferlikOdemeCell(s("aylikOdemeAylar")),
    };
  }

  const sureAy = sureAyIn;
  const rowCtx = {
    tarih: s("tarih"),
    sureAy,
    aylikTutar: aylikIn,
    bitisTarihi: s("bitisTarihi"),
    tutar: s("tutar"),
    sozlesmeTipi: tip,
  } satisfies Parameters<typeof sanitizePaidMonthsForSureAy>[2];
  return {
    ...common,
    tutar: s("tutar"),
    bitisTarihi: s("bitisTarihi"),
    sureAy,
    aylikTutar: aylikIn,
    aylikOdemeAylar: sanitizePaidMonthsForSureAy(
      sureAy,
      s("aylikOdemeAylar"),
      rowCtx
    ),
  };
}

export async function GET() {
  try {
    const rows = await listWorkRows();
    return NextResponse.json({ rows });
  } catch (e) {
    const message = formatSheetsApiError(e);
    return NextResponse.json(
      { error: message },
      { status: errStatus(message) }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    await appendWorkRow(parseWorkRow(body));
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = formatSheetsApiError(e);
    return NextResponse.json(
      { error: message },
      { status: errStatus(message) }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const row = Number(body.row);
    if (!Number.isFinite(row) || row < 1) {
      return NextResponse.json(
        { error: "Geçerli bir row (sayfa satırı, ≥1) gerekli." },
        { status: 400 }
      );
    }
    const payload = { ...body };
    delete payload.row;
    await updateWorkRow(row, parseWorkRow(payload));
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = formatSheetsApiError(e);
    return NextResponse.json(
      { error: message },
      { status: errStatus(message) }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const row = Number(body.row);
    if (!Number.isFinite(row) || row < 1) {
      return NextResponse.json(
        { error: "Geçerli bir row (sayfa satırı, ≥1) gerekli." },
        { status: 400 }
      );
    }
    await deleteWorkRow(row);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = formatSheetsApiError(e);
    return NextResponse.json(
      { error: message },
      { status: errStatus(message) }
    );
  }
}
