export type CrmScoreCriterion = {
  id: string;
  label: string;
  /** Gruplu başlık (Arayüzde bölüm adı) */
  category: string;
  /** Kısa açıklama — checkbox altında küçük metin */
  hint?: string;
  /** Pozitif: ihtiyaç sinyali; negatif: olumsuz veya düşük öncelik */
  points: number;
};

/**
 * Aday puanlama: saha keşfine göre manuel işaretleme.
 * Eski kayıtlarda `social_missing` vb. kalan anahtarlar JSON’da kalabilir; skor hesabında yalnızca buradaki id’ler toplanır.
 */
export const CRM_SCORE_CRITERIA: CrmScoreCriterion[] = [
  /* —— Web ve dijital görünürlük —— */
  {
    id: "no_website",
    category: "Web ve dijital görünürlük",
    label: "Web sitesi yok veya zayıf görünüyor",
    hint: "Alan adı yok, kapalı sayfa, yalnızca yönlendirme veya çok minimal içerik.",
    points: 2,
  },
  {
    id: "has_website_strong",
    category: "Web ve dijital görünürlük",
    label: "Kurumsal web sitesi güçlü",
    hint: "Tasarım, içerik derinliği, hız veya güven unsurları iyi.",
    points: -1,
  },
  {
    id: "site_mobile_or_outdated",
    category: "Web ve dijital görünürlük",
    label: "Mobil deneyim zayıf veya site güncelliği eski",
    points: 1,
  },
  {
    id: "no_https_or_trust",
    category: "Web ve dijital görünürlük",
    label: "HTTPS / güven sinyalleri eksik",
    hint: "SSL yok, güven rozeti veya gizlilik bilgisi zayıf.",
    points: 1,
  },
  {
    id: "thin_content_single_page",
    category: "Web ve dijital görünürlük",
    label: "Tek sayfa veya içerik çok sınırlı",
    points: 1,
  },

  /* —— İletişim ve erişilebilirlik —— */
  {
    id: "phone_missing_hidden",
    category: "İletişim ve erişilebilirlik",
    label: "Net telefon / iş hattı görünmüyor",
    points: 1,
  },
  {
    id: "only_form_weak_direct",
    category: "İletişim ve erişilebilirlik",
    label: "Yalnızca form; doğrudan hat / e-posta zayıf",
    points: 1,
  },
  {
    id: "hours_location_unclear",
    category: "İletişim ve erişilebilirlik",
    label: "Çalışma saatleri veya konum bilgisi belirsiz",
    points: 1,
  },

  /* —— CRM, süreç ve otomasyon (tahmini) —— */
  {
    id: "crm_manual_process_signal",
    category: "CRM, süreç ve otomasyon",
    label: "CRM / müşteri takibi dijitalleşmemiş görünüyor",
    hint: "Tekrarlayan manuel süreç, dağınık iletişim veya CRM ihtiyacı yüksek sinyali.",
    points: 2,
  },
  {
    id: "no_online_booking_when_fit",
    category: "CRM, süreç ve otomasyon",
    label: "Sektöre uygun online randevu / rezervasyon akışı yok",
    hint: "Berber, klinik, servis vb. için online slot veya talep formu zayıf.",
    points: 1,
  },
  {
    id: "lead_capture_weak",
    category: "CRM, süreç ve otomasyon",
    label: "Lead toplama zayıf (CTA, teklif, bülten vb.)",
    points: 1,
  },
  {
    id: "b2b_catalog_offline",
    category: "CRM, süreç ve otomasyon",
    label: "B2B / katalog veya fiyatlandırma dijitalde yok",
    hint: "Toptan, üretici veya kurumsal satışta ürün/hizmet listesi online değil.",
    points: 1,
  },
  {
    id: "pipeline_handoff_unclear",
    category: "CRM, süreç ve otomasyon",
    label: "Satış sonrası / destek süreci web üzerinden net değil",
    points: 1,
  },

  /* —— Yerel pazarlama ve haritalar —— */
  {
    id: "local_seo_gap",
    category: "Yerel pazarlama ve haritalar",
    label: "Yerel arama / harita görünürlüğü zayıf (tahmini)",
    points: 1,
  },
  {
    id: "maps_profile_incomplete",
    category: "Yerel pazarlama ve haritalar",
    label: "Harita / işletme profili bilgileri eksik",
    points: 1,
  },
  {
    id: "reviews_visibility_low",
    category: "Yerel pazarlama ve haritalar",
    label: "Yorum / puan görünürlüğü düşük veya yönetilmiyor",
    points: 1,
  },

  /* —— İş modeli ve ölçek —— */
  {
    id: "multi_branch",
    category: "İş modeli ve ölçek",
    label: "Çok şubeli / ölçeklenebilir potansiyel",
    points: 1,
  },
  {
    id: "franchise_chain_signal",
    category: "İş modeli ve ölçek",
    label: "Franchise veya zincir yapı sinyali",
    points: 1,
  },
  {
    id: "b2b_pro_services",
    category: "İş modeli ve ölçek",
    label: "Kurumsal veya profesyonel hizmet odağı",
    hint: "Sözleşme değeri veya proje bazlı iş potansiyeli.",
    points: 1,
  },

  /* —— Düşük öncelik sinyalleri —— */
  {
    id: "strong_inhouse_digital",
    category: "Düşük öncelik sinyalleri",
    label: "İçeride güçlü dijital / IT yatırımı sinyali",
    hint: "Dış müdahale ihtimali düşük olabilir.",
    points: -2,
  },
  {
    id: "national_brand_low_touch",
    category: "Düşük öncelik sinyalleri",
    label: "Ulusal marka; yerel müdahale alanı sınırlı",
    points: -1,
  },
];

export const CRM_ASAMALAR = [
  "yeni",
  "iletişim",
  "teklif",
  "kazanıldı",
  "kayip",
] as const;

export type CrmAsama = (typeof CRM_ASAMALAR)[number];

export function normalizeAsama(s: string): string {
  const t = s.trim().toLocaleLowerCase("tr-TR");
  if (t === "kayip" || t === "kayıp") return "kayip";
  if (CRM_ASAMALAR.includes(t as CrmAsama)) return t;
  return "yeni";
}

export type CriteriaState = Record<string, boolean>;

/** Kategorilere göre sıralı gruplar (CRM_SCORE_CRITERIA dizilim sırası korunur). */
export function groupedScoreCriteria(): {
  category: string;
  items: CrmScoreCriterion[];
}[] {
  const out: { category: string; items: CrmScoreCriterion[] }[] = [];
  const idx = new Map<string, number>();
  for (const c of CRM_SCORE_CRITERIA) {
    const i = idx.get(c.category);
    if (i === undefined) {
      idx.set(c.category, out.length);
      out.push({ category: c.category, items: [c] });
    } else {
      out[i]!.items.push(c);
    }
  }
  return out;
}

export function parseCriteriaJson(raw: string): CriteriaState {
  if (!raw.trim()) return {};
  try {
    const o = JSON.parse(raw) as unknown;
    if (typeof o !== "object" || o === null || Array.isArray(o)) return {};
    const out: CriteriaState = {};
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === "boolean") out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function stringifyCriteriaJson(state: CriteriaState): string {
  return JSON.stringify(state);
}

export function computeLeadScore(criteria: CriteriaState): number {
  let sum = 0;
  for (const c of CRM_SCORE_CRITERIA) {
    if (criteria[c.id]) sum += c.points;
  }
  return sum;
}
