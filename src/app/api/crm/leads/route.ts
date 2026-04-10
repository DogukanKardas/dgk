import { NextResponse } from "next/server";
import {
  appendCrmLead,
  appendCrmLeadsBulk,
  deleteCrmLead,
  deleteCrmLeadsBulk,
  listCrmLeads,
  type CrmLeadRow,
  updateCrmLead,
} from "@/lib/sheets/crm-sheet";
import { formatSheetsApiError } from "@/lib/sheets/format-sheets-error";
import { normalizeIletisimDurumu } from "@/lib/crm-outreach";
import { computeLeadScore, parseCriteriaJson } from "@/lib/crm-scoring";

export const dynamic = "force-dynamic";

function errStatus(msg: string): number {
  if (msg.includes("eksik") || msg.includes("Missing env")) return 503;
  if (msg.includes("Geçersiz")) return 400;
  if (msg.includes("izin vermiyor")) return 403;
  if (msg.includes("bulunamadı")) return 404;
  return 500;
}

function parseLead(body: Record<string, unknown>): CrmLeadRow {
  const s = (k: string) =>
    body[k] != null && body[k] !== undefined ? String(body[k]) : "";
  const criteria = parseCriteriaJson(s("kriterJson"));
  const skor =
    s("skor").trim() || String(computeLeadScore(criteria));
  const today = new Date().toISOString().slice(0, 10);
  return {
    osmKey: s("osmKey"),
    ad: s("ad"),
    adres: s("adres"),
    telefon: s("telefon"),
    webSitesi: s("webSitesi"),
    webVarMi: s("webVarMi"),
    kaynak: s("kaynak") || "manuel",
    notlar: s("notlar"),
    asama: s("asama") || "yeni",
    skor,
    kriterJson: s("kriterJson") || "{}",
    olusturma: s("olusturma") || today,
    guncelleme: s("guncelleme") || today,
    eposta: s("eposta"),
    iletisimDurumu: normalizeIletisimDurumu(s("iletisimDurumu")),
  };
}

export async function GET() {
  try {
    const rows = await listCrmLeads();
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
    if (body.bulk === true && Array.isArray(body.rows)) {
      const rawRows = body.rows as Record<string, unknown>[];
      const parsed = rawRows.map((r) => parseLead(r));
      const existing = await listCrmLeads();
      const keys = new Set(
        existing.map((r) => r.osmKey.trim()).filter((k) => k.length > 0)
      );
      const dedupe = body.dedupeOsm !== false;
      const toAdd = dedupe
        ? parsed.filter((r) => {
            const k = r.osmKey.trim();
            if (!k) return true;
            if (keys.has(k)) return false;
            keys.add(k);
            return true;
          })
        : parsed;
      await appendCrmLeadsBulk(toAdd);
      return NextResponse.json({
        ok: true,
        added: toAdd.length,
        skipped: parsed.length - toAdd.length,
      });
    }
    await appendCrmLead(parseLead(body));
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
    const lead = parseLead(payload);
    lead.guncelleme = new Date().toISOString().slice(0, 10);
    await updateCrmLead(row, lead);
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
      await deleteCrmLeadsBulk(rows);
      return NextResponse.json({ ok: true, deleted: rows.length });
    }
    const row = Number(body.row);
    if (!Number.isFinite(row) || row < 1) {
      return NextResponse.json(
        { error: "Geçerli bir row (sayfa satırı, ≥1) veya rows: [] dizisi gerekli." },
        { status: 400 }
      );
    }
    await deleteCrmLead(row);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = formatSheetsApiError(e);
    return NextResponse.json(
      { error: message },
      { status: errStatus(message) }
    );
  }
}
