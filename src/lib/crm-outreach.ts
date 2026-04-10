/** CRM_Leads sayfası N: eposta, O: iletisim_durumu (makine anahtarı). */

export const CRM_ILETISIM_DURUM_IDS = [
  "",
  "yeni",
  "ilk_temas",
  "mail_gonderildi",
  "teklif_gonderildi",
  "yanit_bekleniyor",
  "olumlu",
  "olumsuz",
  "beklemede",
] as const;

export type CrmIletisimDurumId = (typeof CRM_ILETISIM_DURUM_IDS)[number];

export const CRM_ILETISIM_LABEL: Record<string, string> = {
  "": "—",
  yeni: "Yeni",
  ilk_temas: "İlk temas",
  mail_gonderildi: "E-posta gönderildi",
  teklif_gonderildi: "Teklif gönderildi",
  yanit_bekleniyor: "Yanıt bekleniyor",
  olumlu: "Olumlu",
  olumsuz: "Olumsuz",
  beklemede: "Beklemede",
};

export function normalizeIletisimDurumu(raw: string): string {
  const t = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if (CRM_ILETISIM_DURUM_IDS.includes(t as CrmIletisimDurumId)) return t;
  const aliases: Record<string, string> = {
    "e-posta_gönderildi": "mail_gonderildi",
    teklif: "teklif_gonderildi",
  };
  return aliases[t] ?? (t || "");
}

/** Gönderim sonrası önerilen varsayılan durumlar. */
export const CRM_AFTER_MAIL_STATUS_OPTIONS: { id: string; label: string }[] = [
  { id: "mail_gonderildi", label: "E-posta gönderildi" },
  { id: "teklif_gonderildi", label: "Teklif gönderildi" },
  { id: "ilk_temas", label: "İlk temas" },
  { id: "yanit_bekleniyor", label: "Yanıt bekleniyor" },
];

export function iletisimSentAlready(id: string): boolean {
  const t = normalizeIletisimDurumu(id);
  return t === "mail_gonderildi" || t === "teklif_gonderildi";
}
