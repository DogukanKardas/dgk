import { NextResponse } from "next/server";
import {
  appendCrmTemplate,
  deleteCrmTemplate,
  deleteCrmTemplatesBulk,
  listCrmTemplates,
  type CrmTemplateRow,
  updateCrmTemplate,
} from "@/lib/sheets/crm-sheet";
import { formatSheetsApiError } from "@/lib/sheets/format-sheets-error";

export const dynamic = "force-dynamic";

function errStatus(msg: string): number {
  if (msg.includes("eksik") || msg.includes("Missing env")) return 503;
  if (msg.includes("Geçersiz")) return 400;
  if (msg.includes("izin vermiyor")) return 403;
  if (msg.includes("bulunamadı")) return 404;
  return 500;
}

function parseTemplate(body: Record<string, unknown>): CrmTemplateRow {
  const s = (k: string) =>
    body[k] != null && body[k] !== undefined ? String(body[k]) : "";
  return {
    ad: s("ad"),
    kanal: s("kanal") || "mail",
    konu: s("konu"),
    govde: s("govde"),
  };
}

export async function GET() {
  try {
    const rows = await listCrmTemplates();
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
    await appendCrmTemplate(parseTemplate(body));
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
    await updateCrmTemplate(row, parseTemplate(payload));
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
    if (Array.isArray(body.rows)) {
      const rows = (body.rows as unknown[])
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n) && n >= 1);
      if (rows.length === 0) {
        return NextResponse.json(
          { error: "rows dizisinde en az bir geçerli satır numarası (≥1) gerekli." },
          { status: 400 }
        );
      }
      await deleteCrmTemplatesBulk(rows);
      return NextResponse.json({ ok: true, deleted: rows.length });
    }
    const row = Number(body.row);
    if (!Number.isFinite(row) || row < 1) {
      return NextResponse.json(
        { error: "Geçerli bir row (sayfa satırı, ≥1) veya rows: [] dizisi gerekli." },
        { status: 400 }
      );
    }
    await deleteCrmTemplate(row);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = formatSheetsApiError(e);
    return NextResponse.json(
      { error: message },
      { status: errStatus(message) }
    );
  }
}
