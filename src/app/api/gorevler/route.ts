import { NextResponse } from "next/server";
import {
  appendTaskRow,
  deleteTaskRow,
  listTaskRows,
  type TaskRow,
  updateTaskRow,
} from "@/lib/sheets/tasks-sheet";
import { formatSheetsApiError } from "@/lib/sheets/format-sheets-error";

export const dynamic = "force-dynamic";

function errStatus(msg: string): number {
  if (msg.includes("eksik") || msg.includes("Missing env")) return 503;
  if (msg.includes("Geçersiz")) return 400;
  if (msg.includes("izin vermiyor")) return 403;
  return 500;
}

function parseTaskRow(body: Record<string, unknown>): TaskRow {
  const s = (k: string) =>
    body[k] != null && body[k] !== undefined ? String(body[k]) : "";
  return {
    tarih: s("tarih"),
    gorevler: s("gorevler"),
    kategori: s("kategori"),
    oncelik: s("oncelik"),
    sonDurum: s("sonDurum"),
    bitisTarihi: s("bitisTarihi"),
    ilerleme: s("ilerleme"),
    dosya: s("dosya"),
    notlar: s("notlar"),
  };
}

export async function GET() {
  try {
    const rows = await listTaskRows();
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
    await appendTaskRow(parseTaskRow(body));
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
    await updateTaskRow(row, parseTaskRow(payload));
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
    await deleteTaskRow(row);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = formatSheetsApiError(e);
    return NextResponse.json(
      { error: message },
      { status: errStatus(message) }
    );
  }
}
