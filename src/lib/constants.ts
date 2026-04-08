/** Film, dizi ve görüntülü içerik */
export const MEDIA_KAT_GORUNTU = [
  "Film",
  "Dizi",
  "Mini dizi",
  "Belgesel",
  "Video",
  "Kısa film",
  "Canlı / yayın kaydı",
] as const;

/** Podcast, müzik vb. */
export const MEDIA_KAT_SES = [
  "Podcast",
  "Müzik",
  "Sesli kitap",
  "Radyo programı",
] as const;

/** Kitap, yazı, bülten */
export const MEDIA_KAT_METIN = [
  "Kitap",
  "Çizgi roman & manga",
  "Makale & blog",
  "Dergi",
  "Haber bülteni",
  "E-kitap",
] as const;

/** Oyun, etkinlik, kurs vb. */
export const MEDIA_KAT_DIGER = [
  "Oyun",
  "Uygulama",
  "Web & kaynak",
  "Sergi & müze",
  "Tiyatro & sahne",
  "Konser",
  "Online kurs",
  "Diğer",
] as const;

export const MEDIA_KATEGORILER = [
  ...MEDIA_KAT_GORUNTU,
  ...MEDIA_KAT_SES,
  ...MEDIA_KAT_METIN,
  ...MEDIA_KAT_DIGER,
] as const;

export const MEDIA_DURUMLAR = [
  "Planlandı",
  "Kuyrukta",
  "Devam ediyor",
  "Yarım bırakıldı",
  "Tamamlandı",
  "İzlendi",
  "Okundu",
  "Dinlendi",
  "İzlenmedi",
  "Okunmadı",
  "İptal",
] as const;

/** Konu / tür (içeriğin konusu) — optgroup ile gruplandırılır */
export const MEDIA_TURLER_GENEL = [
  "Genel",
  "Genel kültür",
  "Genel Kültür",
] as const;

export const MEDIA_TURLER_STEM = [
  "Yazılım",
  "Yazılım & IT",
  "Bilim",
  "Teknoloji",
  "Tarih",
] as const;

export const MEDIA_TURLER_BESERI = [
  "Felsefe",
  "Psikoloji",
  "Sosyoloji",
  "Ekonomi & iş",
  "Siyaset & toplum",
  "Hukuk",
] as const;

export const MEDIA_TURLER_SANAT = [
  "Film",
  "Roman",
  "Edebiyat",
  "Sanat & tasarım",
  "Sinema & dizi",
  "Müzik",
  "Belgesel",
] as const;

export const MEDIA_TURLER_YASAM = [
  "Sağlık & spor",
  "Doğa & çevre",
  "Haber & güncel",
  "Yabancı Dil",
  "Yabancı dil",
  "Kişisel gelişim",
  "Hobi",
  "Çocuk & aile",
  "Oyun",
  "Spor",
] as const;

const MEDIA_TURLER_ALL = [
  ...MEDIA_TURLER_GENEL,
  ...MEDIA_TURLER_STEM,
  ...MEDIA_TURLER_BESERI,
  ...MEDIA_TURLER_SANAT,
  ...MEDIA_TURLER_YASAM,
] as const;

/** Tekilleştirilmiş konu listesi (filtre / doğrulama için) */
export const MEDIA_TURLER: readonly string[] = Array.from(
  new Set<string>(MEDIA_TURLER_ALL)
);

/** Şirket görevleri — Evrentek & Vih Soft Inc. */
export const GOREV_KATEGORILER_SIRKET = ["Evrentek", "Vih Soft Inc."] as const;

/**
 * Gündelik / kişisel görev kategorileri (şirket satırları hariç).
 * Yaşam, ev, sağlık, finans, iletişim ve kişisel profesyonel işler dahil.
 */
export const GOREV_KATEGORILER_DIGER = [
  "Plan & hedef",
  "Acil & önemli",
  "Aile & yakın çevre",
  "Alışveriş & ihtiyaç",
  "Bakım & Temizlik",
  "Eğitim & gelişim",
  "Ev & düzen",
  "Finans & ödeme",
  "Freelance & müşteri",
  "Hobi & yaratıcılık",
  "İdari & resmi",
  "İletişim & toplantı",
  "Kariyer",
  "Kültürel",
  "Okuma & medya",
  "Sağlık & spor",
  "Sosyal & etkinlik",
  "Ulaşım & seyahat",
  "Yazılım & teknoloji",
] as const;

export const GOREV_KATEGORILER = [
  ...GOREV_KATEGORILER_SIRKET,
  ...GOREV_KATEGORILER_DIGER,
] as const;

export const GOREV_ONCELIK = ["P0", "P1", "P2", "P3"] as const;

export const GOREV_SON_DURUM = [
  "Tamamlandı",
  "İptal",
  "Telafi",
  "Başlanmadı",
] as const;

export const IS_SIRKET = ["Evrentek", "Vih Soft Inc."] as const;

export const IS_TUR = ["Yazılım", "IT"] as const;

export const IS_DURUM = [
  "Beklemede",
  "Başlandı",
  "Revizyonda",
  "Tamamlandı",
  "Ödeme Bekleniyor",
  "Ödendi",
] as const;

export const IS_PARA_BIRIMI = ["TRY", "USD", "EUR", "CAD"] as const;

/** Finans sheet `tip` sütunu */
export const FINANS_TIP = ["Gelir", "Gider", "Fatura"] as const;

export const FINANS_GELIR_KATEGORI = [
  "İş / müşteri",
  "Freelance",
  "Faiz & yatırım",
  "Kira geliri",
  "İade & düzeltme",
  "Diğer gelir",
] as const;

export const FINANS_GIDER_KATEGORI = [
  "Ofis & yazılım",
  "Pazarlama",
  "Maaş & hizmet",
  "Vergi & SGK",
  "Kira & faturalar",
  "Seyahat & yemek",
  "Eğitim",
  "Diğer gider",
] as const;

export const FINANS_FATURA_KATEGORI = [
  "Satış",
  "Hizmet",
  "İade",
  "Proforma",
  "Düzeltme",
  "Diğer",
] as const;

export const FINANS_GELIR_DURUM = [
  "Planlandı",
  "Bekleniyor",
  "Tahsil edildi",
  "İptal",
] as const;

export const FINANS_GIDER_DURUM = [
  "Planlandı",
  "Bekliyor",
  "Ödendi",
  "İptal",
] as const;

export const FINANS_FATURA_DURUM = [
  "Taslak",
  "Kesildi",
  "Gönderildi",
  "Ödeme bekleniyor",
  "Ödendi",
  "Vadesi geçti",
  "İptal",
] as const;

/** İş kaydı: uzun süreli = aylık / aralık; tek seferlik = tek tutar */
export const WORK_SOZLESME_OPTIONS = [
  { id: "tekSeferlik", label: "Tek seferlik" },
  { id: "uzunSureli", label: "Uzun süreli" },
] as const;

export type WorkSozlesmeTipiId =
  (typeof WORK_SOZLESME_OPTIONS)[number]["id"];
