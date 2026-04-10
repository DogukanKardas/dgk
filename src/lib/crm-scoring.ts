export type CrmScoreCriterion = {
  id: string;
  label: string;
  /** Pozitif: ihtiyaç sinyali; negatif: olumsuz veya düşük öncelik */
  points: number;
};

export const CRM_SCORE_CRITERIA: CrmScoreCriterion[] = [
  {
    id: "no_website",
    label: "Web sitesi yok veya zayıf görünüyor",
    points: 2,
  },
  {
    id: "has_website_strong",
    label: "Kurumsal web sitesi güçlü",
    points: -1,
  },
  {
    id: "social_missing",
    label: "Sosyal medya kanalı görünmüyor",
    points: 1,
  },
  {
    id: "local_seo_gap",
    label: "Yerel arama / harita görünürlüğü zayıf (tahmini)",
    points: 1,
  },
  {
    id: "multi_branch",
    label: "Çok şubeli / ölçeklenebilir potansiyel",
    points: 1,
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
