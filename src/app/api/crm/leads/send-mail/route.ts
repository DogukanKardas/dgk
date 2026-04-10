import { NextResponse } from "next/server";
import { applyCrmTemplateVars } from "@/lib/crm-template-vars";
import { sendCrmOutboundMail, isCrmSmtpConfigured } from "@/lib/crm-mail";
import { normalizeIletisimDurumu } from "@/lib/crm-outreach";
import {
  listCrmLeads,
  listCrmTemplates,
  updateCrmLead,
  type CrmLeadRow,
} from "@/lib/sheets/crm-sheet";
import { formatSheetsApiError } from "@/lib/sheets/format-sheets-error";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET() {
  return NextResponse.json({ smtpConfigured: isCrmSmtpConfigured() });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    if (!isCrmSmtpConfigured()) {
      return NextResponse.json(
        {
          error:
            "E-posta gönderimi için SMTP_HOST ve CRM_MAIL_FROM ortam değişkenleri gerekli. Ayrıntılar .env.example dosyasında.",
        },
        { status: 503 }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const templateRow = Number(body.templateRow);
    if (!Number.isFinite(templateRow) || templateRow < 1) {
      return NextResponse.json(
        { error: "Geçerli templateRow (şablon sayfa satırı, ≥1) gerekli." },
        { status: 400 }
      );
    }
    const leadRowsRaw = body.leadRows;
    if (!Array.isArray(leadRowsRaw) || leadRowsRaw.length === 0) {
      return NextResponse.json(
        { error: "leadRows boş olamaz; en az bir aday satır numarası gerekli." },
        { status: 400 }
      );
    }
    const leadRows = leadRowsRaw
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n >= 1);
    if (leadRows.length === 0) {
      return NextResponse.json(
        { error: "leadRows içinde geçerli satır numarası yok." },
        { status: 400 }
      );
    }

    const setDurum = normalizeIletisimDurumu(
      String(body.setIletisimDurumu ?? "mail_gonderildi")
    );

    const [leads, templates] = await Promise.all([
      listCrmLeads(),
      listCrmTemplates(),
    ]);

    const tpl = templates.find((t) => t.row === templateRow);
    if (!tpl) {
      return NextResponse.json(
        { error: `Şablon satırı ${templateRow} bulunamadı.` },
        { status: 404 }
      );
    }
    if (String(tpl.kanal).toLowerCase() !== "mail") {
      return NextResponse.json(
        { error: "Seçilen şablon kanalı 'mail' olmalı." },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    const results: {
      row: number;
      ok: boolean;
      to?: string;
      error?: string;
    }[] = [];

    for (const sheetRow of leadRows) {
      const lead = leads.find((l) => l.row === sheetRow);
      if (!lead) {
        results.push({ row: sheetRow, ok: false, error: "Aday bulunamadı" });
        continue;
      }
      const to = lead.eposta.trim();
      if (!to) {
        results.push({
          row: sheetRow,
          ok: false,
          error: "E-posta adresi boş",
        });
        continue;
      }
      if (!EMAIL_RE.test(to)) {
        results.push({
          row: sheetRow,
          ok: false,
          to,
          error: "E-posta formatı geçersiz",
        });
        continue;
      }

      const ctx = {
        ad: lead.ad,
        adres: lead.adres,
        telefon: lead.telefon,
        webSitesi: lead.webSitesi,
      };
      const subject = applyCrmTemplateVars(tpl.konu, ctx);
      const text = applyCrmTemplateVars(tpl.govde, ctx);

      try {
        await sendCrmOutboundMail({ to, subject, text });
        const updated: CrmLeadRow = {
          ...lead,
          iletisimDurumu: setDurum || lead.iletisimDurumu,
          guncelleme: today,
        };
        await updateCrmLead(sheetRow, updated);
        results.push({ row: sheetRow, ok: true, to });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Gönderim hatası";
        results.push({ row: sheetRow, ok: false, to, error: msg });
      }

      await new Promise((r) => setTimeout(r, 350));
    }

    const okCount = results.filter((r) => r.ok).length;
    return NextResponse.json({
      ok: true,
      templateRow,
      setIletisimDurumu: setDurum,
      results,
      summary: {
        total: results.length,
        sent: okCount,
        failed: results.length - okCount,
      },
    });
  } catch (e) {
    const message = formatSheetsApiError(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
