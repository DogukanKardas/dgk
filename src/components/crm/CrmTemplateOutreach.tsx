"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CrmLeadRowWithRow } from "@/lib/sheets/crm-sheet";
import {
  CRM_AFTER_MAIL_STATUS_OPTIONS,
  CRM_ILETISIM_LABEL,
  iletisimSentAlready,
} from "@/lib/crm-outreach";

type MailTemplate = {
  row: number;
  ad: string;
  kanal: string;
  konu: string;
  govde: string;
};

const ASAMA_LABEL: Record<string, string> = {
  yeni: "Yeni",
  iletişim: "İletişim",
  teklif: "Teklif",
  kazanıldı: "Kazanıldı",
  kayip: "Kayıp",
};

const POSITIVE_ASAMA_DEFAULT = new Set(["iletişim", "teklif", "kazanıldı"]);

export function CrmTemplateOutreach() {
  const [leads, setLeads] = useState<CrmLeadRowWithRow[]>([]);
  const [templates, setTemplates] = useState<MailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [smtpOk, setSmtpOk] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendReport, setSendReport] = useState<string | null>(null);

  const [positiveAsama, setPositiveAsama] = useState<Set<string>>(
    () => new Set(POSITIVE_ASAMA_DEFAULT)
  );
  const [minSkor, setMinSkor] = useState("0");
  const [onlyWithEmail, setOnlyWithEmail] = useState(true);
  const [hideAlreadySent, setHideAlreadySent] = useState(true);
  const [search, setSearch] = useState("");

  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());
  const [templateRow, setTemplateRow] = useState<string>("");
  const [afterStatus, setAfterStatus] = useState("mail_gonderildi");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [lr, tr, smtp] = await Promise.all([
        fetch("/api/crm/leads", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/crm/templates", { cache: "no-store" }).then((r) =>
          r.json()
        ),
        fetch("/api/crm/leads/send-mail", { cache: "no-store" }).then((r) =>
          r.json()
        ),
      ]);
      if (lr.error) throw new Error(lr.error);
      if (tr.error) throw new Error(tr.error);
      setLeads(lr.rows ?? []);
      setTemplates(tr.rows ?? []);
      setSmtpOk(Boolean(smtp?.smtpConfigured));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yükleme hatası");
      setLeads([]);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const mailTemplates = useMemo(
    () => templates.filter((t) => String(t.kanal).toLowerCase() === "mail"),
    [templates]
  );

  const filteredLeads = useMemo(() => {
    const min = Number(minSkor);
    const minOk = Number.isFinite(min) ? min : 0;
    const q = search.trim().toLowerCase();
    return leads.filter((r) => {
      if (positiveAsama.size > 0 && !positiveAsama.has(r.asama)) return false;
      const sc = Number(r.skor);
      if (!Number.isFinite(sc) || sc < minOk) return false;
      if (onlyWithEmail && !r.eposta?.trim()) return false;
      if (
        hideAlreadySent &&
        iletisimSentAlready(r.iletisimDurumu ?? "")
      ) {
        return false;
      }
      if (q) {
        const blob = `${r.ad} ${r.adres} ${r.eposta} ${r.notlar}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [
    leads,
    positiveAsama,
    minSkor,
    onlyWithEmail,
    hideAlreadySent,
    search,
  ]);

  function toggleAsama(a: string) {
    setPositiveAsama((prev) => {
      const next = new Set(prev);
      if (next.has(a)) next.delete(a);
      else next.add(a);
      return next;
    });
  }

  function toggleLeadRow(row: number, on: boolean) {
    setSelectedLeads((prev) => {
      const next = new Set(prev);
      if (on) next.add(row);
      else next.delete(row);
      return next;
    });
  }

  function selectAllFiltered(on: boolean) {
    setSelectedLeads((prev) => {
      const next = new Set(prev);
      if (on) for (const r of filteredLeads) next.add(r.row);
      else for (const r of filteredLeads) next.delete(r.row);
      return next;
    });
  }

  async function sendMail() {
    const tpl = Number(templateRow);
    if (!Number.isFinite(tpl) || tpl < 1) {
      setError("Bir e-posta şablonu seçin.");
      return;
    }
    const rows = [...selectedLeads].sort((a, b) => a - b);
    if (rows.length === 0) {
      setError("En az bir aday seçin.");
      return;
    }
    if (!confirm(`${rows.length} adaya şablonla e-posta gönderilsin mi?`)) {
      return;
    }
    setBusy(true);
    setError(null);
    setSendReport(null);
    try {
      const res = await fetch("/api/crm/leads/send-mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateRow: tpl,
          leadRows: rows,
          setIletisimDurumu: afterStatus,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        summary?: { sent: number; failed: number; total: number };
        results?: { row: number; ok: boolean; error?: string; to?: string }[];
      };
      if (!res.ok) throw new Error(data.error ?? `Hata ${res.status}`);
      const s = data.summary;
      setSendReport(
        `Gönderim bitti: ${s?.sent ?? 0} başarılı, ${s?.failed ?? 0} başarısız (toplam ${s?.total ?? rows.length}).`
      );
      if (data.results?.length) {
        const fails = data.results.filter((x) => !x.ok);
        if (fails.length > 0) {
          setSendReport(
            (prev) =>
              `${prev ?? ""} Başarısız: ${fails.map((f) => `#${f.row} ${f.error ?? ""}`).join("; ")}`
          );
        }
      }
      setSelectedLeads(new Set());
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gönderim başarısız");
    } finally {
      setBusy(false);
    }
  }

  const allFilteredSelected =
    filteredLeads.length > 0 &&
    filteredLeads.every((r) => selectedLeads.has(r.row));

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <h3 className="text-sm font-semibold text-zinc-200">
        Adaylara e-posta (şablon + durum takibi)
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">
        <strong className="text-zinc-400">CRM_Leads</strong> sayfasına{" "}
        <code className="text-zinc-400">N: eposta</code> ve{" "}
        <code className="text-zinc-400">O: iletisim_durumu</code> sütunlarını
        ekleyin (mevcut M’den sonra). Gönderim için sunucuda SMTP ortam
        değişkenleri gerekir — bkz. <code className="text-zinc-400">.env.example</code>.
      </p>

      {smtpOk === false ? (
        <p className="mt-2 rounded-lg border border-amber-500/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
          SMTP yapılandırılmamış görünüyor; gönderim çalışmaz.{" "}
          <code className="text-amber-100/90">SMTP_HOST</code>,{" "}
          <code className="text-amber-100/90">CRM_MAIL_FROM</code> vb. tanımlayın.
        </p>
      ) : null}

      {error ? (
        <p className="mt-2 rounded-lg border border-red-500/40 bg-red-950/30 px-3 py-2 text-xs text-red-200">
          {error}
        </p>
      ) : null}
      {sendReport ? (
        <p className="mt-2 text-xs text-emerald-300/90">{sendReport}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800"
        >
          Adayları yenile
        </button>
      </div>

      <div className="mt-4 grid gap-3 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 lg:grid-cols-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            Pozitif / hedef filtre
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["iletişim", "teklif", "kazanıldı", "yeni"] as const).map(
              (a) => (
                <label
                  key={a}
                  className="flex cursor-pointer items-center gap-1.5 text-xs text-zinc-400"
                >
                  <input
                    type="checkbox"
                    checked={positiveAsama.has(a)}
                    onChange={() => toggleAsama(a)}
                  />
                  {ASAMA_LABEL[a] ?? a}
                </label>
              )
            )}
          </div>
          <p className="mt-2 text-[11px] text-zinc-600">
            İşaretli aşamalardan <span className="text-zinc-500">en az biri</span>{" "}
            eşleşmeli. Hepsini kapatırsanız aşama filtresi uygulanmaz.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="text-xs text-zinc-500">
            Min. skor
            <input
              type="number"
              value={minSkor}
              onChange={(e) => setMinSkor(e.target.value)}
              className="mt-1 block w-20 rounded border border-zinc-600 bg-zinc-950 px-2 py-1 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={onlyWithEmail}
              onChange={(e) => setOnlyWithEmail(e.target.checked)}
            />
            Yalnızca e-postası olanlar
          </label>
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={hideAlreadySent}
              onChange={(e) => setHideAlreadySent(e.target.checked)}
            />
            Mail/teklif gönderilmişleri gizle
          </label>
        </div>
      </div>

      <label className="mt-3 block text-xs text-zinc-500">
        Aday ara
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ad, adres, e-posta…"
          className="mt-1 w-full max-w-md rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
        />
      </label>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="block min-w-[12rem] text-xs text-zinc-500">
          Şablon (mail)
          <select
            value={templateRow}
            onChange={(e) => setTemplateRow(e.target.value)}
            className="mt-1 block w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
          >
            <option value="">Seçin…</option>
            {mailTemplates.map((t) => (
              <option key={t.row} value={String(t.row)}>
                {t.ad} (satır {t.row})
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-[11rem] text-xs text-zinc-500">
          Gönderim sonrası durum
          <select
            value={afterStatus}
            onChange={(e) => setAfterStatus(e.target.value)}
            className="mt-1 block w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
          >
            {CRM_AFTER_MAIL_STATUS_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={
            busy ||
            loading ||
            selectedLeads.size === 0 ||
            !templateRow ||
            smtpOk === false
          }
          onClick={() => void sendMail()}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40"
        >
          {busy ? "Gönderiliyor…" : `Seçilenlere gönder (${selectedLeads.size})`}
        </button>
      </div>

      <div className="mt-4 max-h-[320px] overflow-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className="sticky top-0 bg-zinc-900 text-zinc-500">
            <tr>
              <th className="w-10 px-2 py-2">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={(e) => selectAllFiltered(e.target.checked)}
                  disabled={loading || filteredLeads.length === 0}
                  aria-label="Filtrelenenlerin tümünü seç"
                />
              </th>
              <th className="px-2 py-2">Skor</th>
              <th className="px-2 py-2">Ad</th>
              <th className="px-2 py-2">Aşama</th>
              <th className="px-2 py-2">E-posta</th>
              <th className="px-2 py-2">İletişim durumu</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-2 py-4 text-zinc-500">
                  Yükleniyor…
                </td>
              </tr>
            ) : filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-2 py-4 text-zinc-500">
                  Filtreye uyan aday yok. Adaylar sekmesinde N sütununa e-posta
                  yazdığınızdan emin olun.
                </td>
              </tr>
            ) : (
              filteredLeads.map((r) => (
                <tr key={r.row} className="border-t border-zinc-800">
                  <td className="px-2 py-2">
                    <input
                      type="checkbox"
                      checked={selectedLeads.has(r.row)}
                      onChange={(e) =>
                        toggleLeadRow(r.row, e.target.checked)
                      }
                      aria-label={`Seç: ${r.ad}`}
                    />
                  </td>
                  <td className="px-2 py-2 text-zinc-400">{r.skor}</td>
                  <td className="px-2 py-2 font-medium text-zinc-200">
                    {r.ad}
                  </td>
                  <td className="px-2 py-2 text-zinc-500">
                    {ASAMA_LABEL[r.asama] ?? r.asama}
                  </td>
                  <td className="max-w-[180px] truncate px-2 py-2 text-zinc-400">
                    {r.eposta?.trim() || "—"}
                  </td>
                  <td className="px-2 py-2 text-zinc-500">
                    {CRM_ILETISIM_LABEL[r.iletisimDurumu ?? ""] ??
                      (r.iletisimDurumu || "—")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
