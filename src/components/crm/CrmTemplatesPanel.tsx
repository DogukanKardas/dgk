"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type TemplateRow = {
  row: number;
  ad: string;
  kanal: string;
  konu: string;
  govde: string;
};

const VARS = [
  { key: "{{isletme_adi}}", label: "İşletme adı" },
  { key: "{{adres}}", label: "Adres" },
  { key: "{{telefon}}", label: "Telefon" },
  { key: "{{web}}", label: "Web" },
] as const;

function applyVars(
  text: string,
  ctx: Record<string, string>
): string {
  let s = text;
  s = s.replace(/\{\{isletme_adi\}\}/gi, ctx.isletme_adi ?? "");
  s = s.replace(/\{\{adres\}\}/gi, ctx.adres ?? "");
  s = s.replace(/\{\{telefon\}\}/gi, ctx.telefon ?? "");
  s = s.replace(/\{\{web\}\}/gi, ctx.web ?? "");
  return s;
}

export function CrmTemplatesPanel() {
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    ad: "",
    kanal: "mail",
    konu: "",
    govde: "",
  });
  const [editRow, setEditRow] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewCtx, setPreviewCtx] = useState({
    isletme_adi: "Örnek İşletme A.Ş.",
    adres: "Örnek Mah. No:1",
    telefon: "+90 555 000 00 00",
    web: "https://ornek.com",
  });
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/crm/templates", { cache: "no-store" });
      const data = (await res.json()) as
        | { rows: TemplateRow[] }
        | { error: string };
      if (!res.ok) {
        setError("error" in data ? data.error : `Hata ${res.status}`);
        setRows([]);
        return;
      }
      setRows("rows" in data ? data.rows : []);
    } catch {
      setError("Ağ hatası");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave() {
    setBusy(true);
    setError(null);
    try {
      if (editRow != null) {
        const res = await fetch("/api/crm/templates", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ row: editRow, ...form }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? res.statusText);
        setEditRow(null);
      } else {
        const res = await fetch("/api/crm/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? res.statusText);
        setAdding(false);
      }
      setForm({ ad: "", kanal: "mail", konu: "", govde: "" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kaydedilemedi");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(row: number) {
    if (!confirm("Şablon silinsin mi?")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/crm/templates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ row }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      if (editRow === row) {
        setEditRow(null);
        setForm({ ad: "", kanal: "mail", konu: "", govde: "" });
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Silinemedi");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(r: TemplateRow) {
    setEditRow(r.row);
    setForm({
      ad: r.ad,
      kanal: r.kanal || "mail",
      konu: r.konu,
      govde: r.govde,
    });
    setAdding(true);
  }

  const previewSubject = useMemo(
    () => applyVars(form.konu, previewCtx),
    [form.konu, previewCtx]
  );
  const previewBody = useMemo(
    () => applyVars(form.govde, previewCtx),
    [form.govde, previewCtx]
  );

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyMsg("Panoya kopyalandı.");
      setTimeout(() => setCopyMsg(null), 2500);
    } catch {
      setCopyMsg("Pano erişilemedi.");
    }
  }

  function mailtoHref(): string {
    const subj = encodeURIComponent(previewSubject);
    const body = encodeURIComponent(previewBody);
    return `mailto:?subject=${subj}&body=${body}`;
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-lg border border-red-500/40 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      {copyMsg ? (
        <p className="text-sm text-emerald-300/90">{copyMsg}</p>
      ) : null}

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h3 className="mb-2 text-sm font-semibold text-zinc-200">
          Önizleme alanları
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-xs text-zinc-500">
            İşletme adı
            <input
              value={previewCtx.isletme_adi}
              onChange={(e) =>
                setPreviewCtx((c) => ({ ...c, isletme_adi: e.target.value }))
              }
              className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs text-zinc-500">
            Adres
            <input
              value={previewCtx.adres}
              onChange={(e) =>
                setPreviewCtx((c) => ({ ...c, adres: e.target.value }))
              }
              className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs text-zinc-500">
            Telefon
            <input
              value={previewCtx.telefon}
              onChange={(e) =>
                setPreviewCtx((c) => ({ ...c, telefon: e.target.value }))
              }
              className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs text-zinc-500">
            Web
            <input
              value={previewCtx.web}
              onChange={(e) =>
                setPreviewCtx((c) => ({ ...c, web: e.target.value }))
              }
              className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Şablonda kullanın: {VARS.map((v) => v.key).join(", ")}
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            if (adding && editRow == null) {
              setAdding(false);
              setForm({ ad: "", kanal: "mail", konu: "", govde: "" });
            } else {
              setEditRow(null);
              setForm({ ad: "", kanal: "mail", konu: "", govde: "" });
              setAdding(true);
            }
          }}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-500"
        >
          {adding && editRow == null ? "İptal" : "Yeni şablon"}
        </button>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-zinc-600 px-3 py-2 text-sm text-zinc-200"
        >
          Yenile
        </button>
      </div>

      {adding ? (
        <div className="space-y-3 rounded-xl border border-zinc-800 p-4">
          <h3 className="text-sm font-semibold text-zinc-200">
            {editRow != null ? `Düzenle (satır ${editRow})` : "Yeni şablon"}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-zinc-500 sm:col-span-2">
              Ad
              <input
                value={form.ad}
                onChange={(e) => setForm((f) => ({ ...f, ad: e.target.value }))}
                className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs text-zinc-500">
              Kanal
              <select
                value={form.kanal}
                onChange={(e) =>
                  setForm((f) => ({ ...f, kanal: e.target.value }))
                }
                className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
              >
                <option value="mail">E-posta</option>
                <option value="whatsapp">WhatsApp metni</option>
                <option value="dm">DM / genel</option>
              </select>
            </label>
            <label className="text-xs text-zinc-500 sm:col-span-2">
              Konu (mail)
              <input
                value={form.konu}
                onChange={(e) =>
                  setForm((f) => ({ ...f, konu: e.target.value }))
                }
                className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs text-zinc-500 sm:col-span-2">
              Gövde
              <textarea
                value={form.govde}
                onChange={(e) =>
                  setForm((f) => ({ ...f, govde: e.target.value }))
                }
                rows={6}
                className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 font-mono text-sm"
              />
            </label>
          </div>
          <div className="rounded-lg border border-zinc-700 bg-zinc-950/50 p-3 text-xs">
            <p className="font-medium text-zinc-400">Önizleme</p>
            <p className="mt-1 text-zinc-300">
              <span className="text-zinc-500">Konu:</span> {previewSubject}
            </p>
            <pre className="mt-2 whitespace-pre-wrap text-zinc-400">
              {previewBody}
            </pre>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !form.ad.trim()}
              onClick={() => void onSave()}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white"
            >
              Kaydet
            </button>
            <button
              type="button"
              onClick={() => void copyText(previewBody)}
              className="rounded-lg border border-zinc-600 px-3 py-2 text-sm"
            >
              Gövdeyi kopyala
            </button>
            {form.kanal === "mail" ? (
              <a
                href={mailtoHref()}
                className="rounded-lg border border-violet-500/50 px-3 py-2 text-sm text-violet-300"
              >
                Mail uygulamasında aç
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="min-w-[600px] w-full text-left text-sm">
          <thead className="border-b border-zinc-800 bg-zinc-900 text-xs text-zinc-500">
            <tr>
              <th className="px-3 py-2">Ad</th>
              <th className="px-3 py-2">Kanal</th>
              <th className="px-3 py-2">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="px-3 py-4 text-zinc-500">
                  Yükleniyor…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-4 text-zinc-500">
                  Şablon yok. Google Sheets’te &quot;CRM_Sablonlar&quot; sekmesini
                  oluşturup başlık satırı ekleyin: ad, kanal, konu, govde.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.row} className="border-b border-zinc-800">
                  <td className="px-3 py-2 font-medium text-zinc-200">{r.ad}</td>
                  <td className="px-3 py-2 text-zinc-500">{r.kanal}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => startEdit(r)}
                      className="mr-2 text-sky-400 underline text-xs"
                    >
                      Düzenle
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDelete(r.row)}
                      className="text-red-400 underline text-xs"
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
