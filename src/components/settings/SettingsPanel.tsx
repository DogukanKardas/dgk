"use client";

import { useState } from "react";
import type { SettingsSnapshot } from "@/lib/settings-snapshot";

function base64Utf8(text: string): string {
  return btoa(unescape(encodeURIComponent(text)));
}

function buildEnvLocalText(params: {
  spreadsheetId: string;
  sheetMedia: string;
  sheetTasks: string;
  sheetWork: string;
  sheetFinans: string;
  serviceAccountJson: string;
}): string {
  const lines: string[] = [
    "# Bu bloğu proje kökündeki .env.local dosyasına yapıştırın.",
    "# Sunucuyu (npm run dev) kaydettikten sonra yeniden başlatın.",
    "",
    `GOOGLE_SPREADSHEET_ID=${params.spreadsheetId.trim() || "BURAYA_SPREADSHEET_ID"}`,
    `SHEET_MEDIA_NAME=${params.sheetMedia.trim() || "Medya"}`,
    `SHEET_TASKS_NAME=${params.sheetTasks.trim() || "Görevler"}`,
    `SHEET_WORK_NAME=${params.sheetWork.trim() || "İş"}`,
    `SHEET_FINANS_NAME=${params.sheetFinans.trim() || "Finans"}`,
    "",
  ];

  const trimmed = params.serviceAccountJson.trim();
  if (!trimmed) {
    lines.push(
      "# Aşağıdaki satırı doldurun: Service Account JSON (tek satır veya Base64).",
      "GOOGLE_SERVICE_ACCOUNT_JSON="
    );
    return lines.join("\n");
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("Geçerli bir JSON nesnesi değil");
    }
    const compact = JSON.stringify(parsed);
    const b64 = base64Utf8(trimmed);
    lines.push(
      "# Önerilen (Vercel/tek satır uyumlu): Base64.",
      `GOOGLE_SERVICE_ACCOUNT_JSON=${b64}`,
      "",
      "# Alternatif: minifikasyon JSON (bazı ortamlarda tırnak kaçışı gerekebilir):",
      `# GOOGLE_SERVICE_ACCOUNT_JSON=${compact}`
    );
  } catch {
    lines.push(
      "# JSON ayrıştırılamadı; ham metni tek satır olarak ekleyebilirsiniz (risk: tırnaklar).",
      `GOOGLE_SERVICE_ACCOUNT_JSON=${trimmed.replace(/\r?\n/g, "")}`
    );
  }

  return lines.join("\n");
}

function StatusBadge({
  ok,
  label,
}: {
  ok: boolean;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${
        ok
          ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-200"
          : "border-amber-500/40 bg-amber-950/30 text-amber-100"
      }`}
    >
      {label}
    </span>
  );
}

export function SettingsPanel({
  initialStatus,
}: {
  initialStatus: SettingsSnapshot;
}) {
  const [status, setStatus] = useState<SettingsSnapshot>(initialStatus);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [sheetMedia, setSheetMedia] = useState(initialStatus.sheetMediaName);
  const [sheetTasks, setSheetTasks] = useState(initialStatus.sheetTasksName);
  const [sheetWork, setSheetWork] = useState(initialStatus.sheetWorkName);
  const [sheetFinans, setSheetFinans] = useState(initialStatus.sheetFinansName);
  const [serviceAccountJson, setServiceAccountJson] = useState("");
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  async function refresh() {
    setLoadError(null);
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      const data = (await res.json()) as SettingsSnapshot & { error?: string };
      if (!res.ok) {
        setLoadError(
          "error" in data ? String(data.error) : `Hata ${res.status}`
        );
        return;
      }
      setStatus({
        hasServiceAccountJson: data.hasServiceAccountJson,
        hasSpreadsheetId: data.hasSpreadsheetId,
        sheetMediaName: data.sheetMediaName,
        sheetTasksName: data.sheetTasksName,
        sheetWorkName: data.sheetWorkName,
        sheetFinansName: data.sheetFinansName,
      });
      setSheetMedia(data.sheetMediaName);
      setSheetTasks(data.sheetTasksName);
      setSheetWork(data.sheetWorkName);
      setSheetFinans(data.sheetFinansName);
    } catch {
      setLoadError("Durum alınamadı");
    }
  }

  async function copyEnv() {
    const text = buildEnvLocalText({
      spreadsheetId,
      sheetMedia,
      sheetTasks,
      sheetWork,
      sheetFinans,
      serviceAccountJson,
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopyMsg(".env.local örneği panoya kopyalandı.");
      setTimeout(() => setCopyMsg(null), 4000);
    } catch {
      setCopyMsg("Pano erişimi reddedildi; metni elle seçin.");
    }
  }

  async function copyBase64LineOnly() {
    const trimmed = serviceAccountJson.trim();
    if (!trimmed) {
      setCopyMsg("Önce Service Account JSON yapıştırın.");
      setTimeout(() => setCopyMsg(null), 3000);
      return;
    }
    try {
      JSON.parse(trimmed);
    } catch {
      setCopyMsg("Geçerli JSON değil; düzeltip tekrar deneyin.");
      setTimeout(() => setCopyMsg(null), 3000);
      return;
    }
    const line = `GOOGLE_SERVICE_ACCOUNT_JSON=${base64Utf8(trimmed)}`;
    try {
      await navigator.clipboard.writeText(line);
      setCopyMsg("Yalnızca Base64 env satırı kopyalandı.");
      setTimeout(() => setCopyMsg(null), 4000);
    } catch {
      setCopyMsg("Pano erişimi reddedildi.");
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-200">
          Sunucu ortamı (özet)
        </h2>
        <p className="text-sm text-zinc-400">
          Aşağıdaki bilgiler yalnızca değişkenlerin <strong>tanımlı olup olmadığını</strong> gösterir;
          gizli anahtar veya Spreadsheet ID gösterilmez.
        </p>
        {loadError ? (
          <p className="text-sm text-red-300">{loadError}</p>
        ) : null}
        <>
          <div className="flex flex-wrap gap-2">
            <StatusBadge
              ok={status.hasSpreadsheetId}
              label={
                status.hasSpreadsheetId
                  ? "GOOGLE_SPREADSHEET_ID tanımlı"
                  : "GOOGLE_SPREADSHEET_ID eksik"
              }
            />
            <StatusBadge
              ok={status.hasServiceAccountJson}
              label={
                status.hasServiceAccountJson
                  ? "GOOGLE_SERVICE_ACCOUNT_JSON tanımlı"
                  : "GOOGLE_SERVICE_ACCOUNT_JSON eksik"
              }
            />
          </div>
          <p className="text-xs text-zinc-500">
            Şu an kullanılan sekme adları: Medya →{" "}
            <code className="text-zinc-400">{status.sheetMediaName}</code>
            {", "}Görevler →{" "}
            <code className="text-zinc-400">{status.sheetTasksName}</code>
            {", "}İş →{" "}
            <code className="text-zinc-400">{status.sheetWorkName}</code>
            {", "}Finans →{" "}
            <code className="text-zinc-400">{status.sheetFinansName}</code>
          </p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800"
          >
            Sunucudan yenile
          </button>
        </>
      </section>

      <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-sm font-semibold text-zinc-200">
          .env.local şablonu (yalnızca tarayıcınızda)
        </h2>
        <p className="text-sm text-zinc-400">
          Bu alanlara yazdığınız veriler <strong>sunucuya gönderilmez</strong>. Oluşan metni
          kopyalayıp proje kökünde <code className="text-zinc-300">.env.local</code> dosyasına
          kaydedin; ardından geliştirme sunucusunu yeniden başlatın.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs text-zinc-400 sm:col-span-2">
            GOOGLE_SPREADSHEET_ID
            <input
              value={spreadsheetId}
              onChange={(e) => setSpreadsheetId(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/…/edit içinden"
              className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            />
            <span className="mt-1 block text-[11px] leading-relaxed text-amber-200/90">
              Drive’da klasör görünümündeki <code className="text-zinc-400">/folders/…</code>{" "}
              adresindeki ID e-tablo kimliği değildir. &quot;Medya&quot; vb. Sheets dosyasını
              açın; adres çubuğunda <code className="text-zinc-400">/spreadsheets/d/…/edit</code>{" "}
              görünmeli.
            </span>
          </label>
          <label className="block text-xs text-zinc-400">
            SHEET_MEDIA_NAME
            <input
              value={sheetMedia}
              onChange={(e) => setSheetMedia(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs text-zinc-400">
            SHEET_TASKS_NAME
            <input
              value={sheetTasks}
              onChange={(e) => setSheetTasks(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs text-zinc-400 sm:col-span-2">
            SHEET_WORK_NAME
            <input
              value={sheetWork}
              onChange={(e) => setSheetWork(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs text-zinc-400 sm:col-span-2">
            SHEET_FINANS_NAME
            <input
              value={sheetFinans}
              onChange={(e) => setSheetFinans(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs text-zinc-400 sm:col-span-2">
            Service Account JSON (indirdiğiniz .json içeriği — isteğe bağlı)
            <textarea
              value={serviceAccountJson}
              onChange={(e) => setServiceAccountJson(e.target.value)}
              rows={6}
              placeholder='{"type":"service_account",...}'
              className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100"
              spellCheck={false}
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copyEnv()}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
          >
            Tüm örnek .env.local metnini kopyala
          </button>
          <button
            type="button"
            onClick={() => void copyBase64LineOnly()}
            className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
          >
            Yalnızca Base64 env satırını kopyala
          </button>
        </div>
        {copyMsg ? (
          <p className="text-sm text-emerald-300/90">{copyMsg}</p>
        ) : null}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-200">
          Adım adım rehber (Markdown)
        </h2>
        <p className="text-sm text-zinc-400">
          Google Cloud, Sheets API, Service Account ve paylaşım adımlarının tamamı proje içinde:
        </p>
        <code className="block rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300">
          docs/LOCAL-GOOGLE-SHEETS-TR.md
        </code>
        <p className="text-sm text-zinc-500">
          Cursor veya VS Code ile bu dosyayı açıp okuyabilirsiniz. Özet:{" "}
          <a
            href="https://console.cloud.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-400 underline decoration-sky-400/30 hover:decoration-sky-400"
          >
            Google Cloud Console
          </a>{" "}
          → Sheets API etkin → Hizmet hesabı → JSON anahtar → e-postayı Sheets’e Düzenleyici
          olarak ekle → .env.local.
        </p>
      </section>
    </div>
  );
}
