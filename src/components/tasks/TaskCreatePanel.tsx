"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GOREV_KATEGORILER_DIGER,
  GOREV_ONCELIK,
  GOREV_SON_DURUM,
} from "@/lib/constants";
import { TrDateInput } from "@/components/TrDateInput";
import { composeTaskNotlar, type TaskNotlarMeta } from "@/lib/task-notlar-meta";
import { getTurkeyYmd } from "@/lib/turkey-time";

export type TaskFormPayload = {
  tarih: string;
  gorevler: string;
  kategori: string;
  oncelik: string;
  sonDurum: string;
  bitisTarihi: string;
  ilerleme: string;
  dosya: string;
  notlar: string;
};

type Alan = "evrentek" | "vihsoft" | "gunluk";

function todayTrString(): string {
  const { y, m, d } = getTurkeyYmd();
  return `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.${y}`;
}

function alanToKategori(alan: Alan, gunlukKategori: string): string {
  if (alan === "evrentek") return "Evrentek";
  if (alan === "vihsoft") return "Vih Soft Inc.";
  return gunlukKategori;
}

const input =
  "mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600";
const label = "block text-xs font-medium text-zinc-400";
const section =
  "rounded-lg border border-zinc-700/80 bg-zinc-950/60 p-4 shadow-sm";

export function TaskCreatePanel({
  busy,
  onSave,
  onCancel,
}: {
  busy: boolean;
  onSave: (row: TaskFormPayload) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [alan, setAlan] = useState<Alan>("gunluk");
  const [gunlukKategori, setGunlukKategori] = useState<string>(
    GOREV_KATEGORILER_DIGER[0] ?? "Plan & hedef"
  );
  const [tarih, setTarih] = useState("");
  const [gorevler, setGorevler] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [bitisTarihi, setBitisTarihi] = useState("");
  const [hatirlatma, setHatirlatma] = useState("");
  const [oncelik, setOncelik] = useState("P2");
  const [sonDurum, setSonDurum] = useState("Başlanmadı");
  const [ilerleme, setIlerleme] = useState("0");
  const [dosya, setDosya] = useState("");
  const [altSatirlar, setAltSatirlar] = useState<string[]>([""]);
  const [etiketlerRaw, setEtiketlerRaw] = useState("");
  const [validation, setValidation] = useState<string | null>(null);

  useEffect(() => {
    setTarih(todayTrString());
  }, []);

  const kategori = useMemo(
    () => alanToKategori(alan, gunlukKategori),
    [alan, gunlukKategori]
  );

  const setBugun = useCallback(() => {
    setTarih(todayTrString());
  }, []);

  const addAltSatir = useCallback(() => {
    setAltSatirlar((s) => [...s, ""]);
  }, []);

  const updateAlt = useCallback((i: number, v: string) => {
    setAltSatirlar((s) => {
      const next = [...s];
      next[i] = v;
      return next;
    });
  }, []);

  const removeAlt = useCallback((i: number) => {
    setAltSatirlar((s) => s.filter((_, j) => j !== i));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const title = gorevler.trim();
    if (!title) {
      setValidation("Görev başlığı zorunludur.");
      return;
    }
    setValidation(null);

    const etiketler = etiketlerRaw
      .split(/[,;]/)
      .map((t) => t.trim())
      .filter(Boolean);

    const meta: TaskNotlarMeta = {};
    if (hatirlatma.trim()) meta.hatirlatma = hatirlatma.trim();
    const alts = altSatirlar.map((x) => x.trim()).filter(Boolean);
    if (alts.length) meta.altGorevler = alts;
    if (etiketler.length) meta.etiketler = etiketler;

    const notlar = composeTaskNotlar(aciklama, meta);

    const row: TaskFormPayload = {
      tarih,
      gorevler: title,
      kategori,
      oncelik,
      sonDurum,
      bitisTarihi,
      ilerleme,
      dosya,
      notlar,
    };
    await onSave(row);
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-1"
    >
      <div className="space-y-4 p-3 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">
              Yeni görev
            </h2>
            <p className="mt-0.5 max-w-xl text-xs text-zinc-500">
              Şirket (Evrentek / Vih Soft) veya gündelik görev; hatırlatma, alt
              maddeler ve etiketler notlara eklenir.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
          >
            İptal
          </button>
        </div>

        {validation ? (
          <div className="rounded-lg border border-red-500/35 bg-red-950/30 px-3 py-2 text-sm text-red-200">
            {validation}
          </div>
        ) : null}

        <div className={section}>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Alan ve kategori
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex cursor-pointer flex-col gap-2 rounded-lg border border-zinc-600 bg-zinc-950 p-3 has-[:checked]:border-lime-500/50 has-[:checked]:bg-lime-950/20">
              <span className="flex items-center gap-2 text-sm text-zinc-200">
                <input
                  type="radio"
                  name="alan"
                  checked={alan === "evrentek"}
                  onChange={() => setAlan("evrentek")}
                  className="border-zinc-500"
                />
                Evrentek
              </span>
              <span className="text-[11px] text-zinc-500">
                Şirket görevi — kategori Evrentek
              </span>
            </label>
            <label className="flex cursor-pointer flex-col gap-2 rounded-lg border border-zinc-600 bg-zinc-950 p-3 has-[:checked]:border-indigo-500/50 has-[:checked]:bg-indigo-950/20">
              <span className="flex items-center gap-2 text-sm text-zinc-200">
                <input
                  type="radio"
                  name="alan"
                  checked={alan === "vihsoft"}
                  onChange={() => setAlan("vihsoft")}
                  className="border-zinc-500"
                />
                Vih Soft Inc.
              </span>
              <span className="text-[11px] text-zinc-500">
                Şirket görevi — kategori Vih Soft Inc.
              </span>
            </label>
            <label className="flex cursor-pointer flex-col gap-2 rounded-lg border border-zinc-600 bg-zinc-950 p-3 has-[:checked]:border-sky-500/50 has-[:checked]:bg-sky-950/20">
              <span className="flex items-center gap-2 text-sm text-zinc-200">
                <input
                  type="radio"
                  name="alan"
                  checked={alan === "gunluk"}
                  onChange={() => setAlan("gunluk")}
                  className="border-zinc-500"
                />
                Gündelik / kişisel
              </span>
              <span className="text-[11px] text-zinc-500">
                Kültür, eğitim, bakım vb.
              </span>
            </label>
          </div>
          {alan === "gunluk" ? (
            <label className={`${label} mt-3`}>
              Alt kategori
              <select
                value={gunlukKategori}
                onChange={(e) => setGunlukKategori(e.target.value)}
                className={input}
              >
                {GOREV_KATEGORILER_DIGER.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="mt-3 text-xs text-zinc-500">
              Seçilen kategori:{" "}
              <span className="font-medium text-zinc-300">{kategori}</span>
            </p>
          )}
        </div>

        <div className={section}>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Görev içeriği
          </h3>
          <div className="grid gap-3">
            <label className={label}>
              Başlık <span className="text-red-400">*</span>
              <input
                value={gorevler}
                onChange={(e) => setGorevler(e.target.value)}
                className={input}
                placeholder="Kısa ve net başlık"
                autoComplete="off"
              />
            </label>
            <label className={label}>
              Açıklama / bağlam (isteğe bağlı)
              <textarea
                value={aciklama}
                onChange={(e) => setAciklama(e.target.value)}
                rows={4}
                className={`${input} min-h-[88px] resize-y`}
                placeholder="Detay, bağlam, yapılacaklar listesinin özeti…"
              />
            </label>
          </div>
        </div>

        <div className={section}>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Planlama ve öncelik
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className={label}>
              <span className="flex items-center justify-between gap-2">
                Başlangıç tarihi
                <button
                  type="button"
                  onClick={setBugun}
                  className="font-normal text-sky-400 hover:text-sky-300"
                >
                  Bugün
                </button>
              </span>
              <TrDateInput
                value={tarih}
                onValueChange={setTarih}
                className={input}
              />
            </label>
            <label className={label}>
              Bitiş tarihi
              <TrDateInput
                value={bitisTarihi}
                onValueChange={setBitisTarihi}
                className={input}
              />
            </label>
            <label className={label}>
              Hatırlatma (isteğe bağlı)
              <TrDateInput
                value={hatirlatma}
                onValueChange={setHatirlatma}
                className={input}
              />
            </label>
            <label className={label}>
              Öncelik
              <select
                value={oncelik}
                onChange={(e) => setOncelik(e.target.value)}
                className={input}
              >
                {GOREV_ONCELIK.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <label className={`${label} sm:col-span-2`}>
              Son durum
              <select
                value={sonDurum}
                onChange={(e) => setSonDurum(e.target.value)}
                className={input}
              >
                {GOREV_SON_DURUM.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <label className={label}>
              İlerleme (0–100)
              <input
                type="number"
                min={0}
                max={100}
                value={ilerleme}
                onChange={(e) => setIlerleme(e.target.value)}
                className={input}
              />
            </label>
          </div>
        </div>

        <div className={section}>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Alt maddeler ve etiketler
          </h3>
          <div className="space-y-2">
            {altSatirlar.map((line, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={line}
                  onChange={(e) => updateAlt(i, e.target.value)}
                  className={input}
                  placeholder={`Alt madde ${i + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removeAlt(i)}
                  disabled={altSatirlar.length <= 1}
                  className="shrink-0 rounded border border-zinc-600 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"
                  aria-label="Satırı kaldır"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addAltSatir}
              className="text-xs text-sky-400 hover:text-sky-300"
            >
              + Alt madde ekle
            </button>
          </div>
          <label className={`${label} mt-3`}>
            Etiketler (virgül veya noktalı virgül ile)
            <input
              value={etiketlerRaw}
              onChange={(e) => setEtiketlerRaw(e.target.value)}
              className={input}
              placeholder="örn. fatura, acil, ev"
            />
          </label>
        </div>

        <div className={section}>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Ekler
          </h3>
          <label className={label}>
            Dosya veya bağlantı
            <input
              value={dosya}
              onChange={(e) => setDosya(e.target.value)}
              className={input}
              placeholder="https://… veya dosya yolu"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            Kaydet
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
          >
            Vazgeç
          </button>
        </div>
      </div>
    </form>
  );
}
