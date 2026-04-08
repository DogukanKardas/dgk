import { NextResponse } from "next/server";
import {
  appendFinansRow,
  deleteFinansRow,
  listFinansRows,
  type FinansRow,
  updateFinansRow,
} from "@/lib/sheets/finance-sheet";
import { formatSheetsApiError } from "@/lib/sheets/format-sheets-error";

export const dynamic = "force-dynamic";

function errStatus(msg: string): number {
  if (msg.includes("eksik") || msg.includes("Missing env")) return 503;
  if (msg.includes("Geçersiz")) return 400;
  if (msg.includes("izin vermiyor")) return 403;
  return 500;
}

function parseFinansRow(body: Record<string, unknown>): FinansRow {
  const s = (k: string) =>
    body[k] != null && body[k] !== undefined ? String(body[k]) : "";
  return {
    tip: s("tip"),
    tarih: s("tarih"),
    tutar: s("tutar"),
    paraBirimi: s("paraBirimi"),
    baslik: s("baslik"),
    kategori: s("kategori"),
    durum: s("durum"),
    vadeTarihi: s("vadeTarihi"),
    belgeNo: s("belgeNo"),
    isSheetRow: s("isSheetRow"),
    link: s("link"),
    notlar: s("notlar"),
    ek: s("ek"),
  };
}

export async function GET() {
  try {
    const rows = await listFinansRows();
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
    await appendFinansRow(parseFinansRow(body));
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
    await updateFinansRow(row, parseFinansRow(payload));
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
    await deleteFinansRow(row);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = formatSheetsApiError(e);
    return NextResponse.json(
      { error: message },
      { status: errStatus(message) }
    );
  }
}
