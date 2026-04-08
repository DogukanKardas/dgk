import { NextResponse } from "next/server";
import {
  appendMediaRow,
  deleteMediaRow,
  listMediaRows,
  type MediaRow,
  updateMediaRow,
} from "@/lib/sheets/media-sheet";
import { formatSheetsApiError } from "@/lib/sheets/format-sheets-error";

export const dynamic = "force-dynamic";

function errStatus(msg: string): number {
  if (msg.includes("eksik") || msg.includes("Missing env")) return 503;
  if (msg.includes("Geçersiz")) return 400;
  if (msg.includes("izin vermiyor")) return 403;
  return 500;
}

function parseMediaRow(body: Record<string, unknown>): MediaRow {
  const s = (k: string) =>
    body[k] != null && body[k] !== undefined ? String(body[k]) : "";
  return {
    baslik: s("baslik"),
    kategori: s("kategori"),
    durum: s("durum"),
    tur: s("tur"),
    link: s("link"),
    tarih: s("tarih"),
    notlar: s("notlar"),
    puan: s("puan"),
  };
}

export async function GET() {
  try {
    const rows = await listMediaRows();
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
    await appendMediaRow(parseMediaRow(body));
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
    await updateMediaRow(row, parseMediaRow(payload));
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
    await deleteMediaRow(row);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = formatSheetsApiError(e);
    return NextResponse.json(
      { error: message },
      { status: errStatus(message) }
    );
  }
}
