/** Tailwind sınıfları: arka plan + metin (koyu mod uyumlu) */

export function mediaDurumClass(durum: string): string {
  switch (durum) {
    case "Planlandı":
      return "bg-slate-600/30 text-slate-200 border-slate-500/40";
    case "Kuyrukta":
      return "bg-blue-500/20 text-blue-200 border-blue-500/40";
    case "Yarım bırakıldı":
      return "bg-violet-500/20 text-violet-200 border-violet-500/40";
    case "Devam ediyor":
      return "bg-amber-500/20 text-amber-200 border-amber-500/40";
    case "Tamamlandı":
    case "İzlendi":
    case "Okundu":
    case "Dinlendi":
      return "bg-emerald-500/20 text-emerald-200 border-emerald-500/40";
    case "Okunmadı":
    case "İzlenmedi":
      return "bg-red-500/20 text-red-200 border-red-500/40";
    case "İptal":
      return "bg-zinc-600/40 text-zinc-300 border-zinc-500/40";
    default:
      return "bg-zinc-500/15 text-zinc-300 border-zinc-500/35";
  }
}

const MEDIA_KAT_BADGE: Record<string, string> = {
  Film: "bg-sky-500/20 text-sky-200 border-sky-500/35",
  Dizi: "bg-sky-600/25 text-sky-100 border-sky-500/45",
  "Mini dizi": "bg-sky-500/15 text-sky-100 border-sky-500/30",
  Belgesel: "bg-teal-500/20 text-teal-100 border-teal-500/40",
  Video: "bg-cyan-500/20 text-cyan-200 border-cyan-500/35",
  "Kısa film": "bg-cyan-600/15 text-cyan-100 border-cyan-500/35",
  "Canlı / yayın kaydı": "bg-fuchsia-500/20 text-fuchsia-100 border-fuchsia-500/40",
  Podcast: "bg-violet-500/20 text-violet-200 border-violet-500/40",
  Müzik: "bg-pink-500/20 text-pink-200 border-pink-500/40",
  "Sesli kitap": "bg-purple-500/20 text-purple-200 border-purple-500/40",
  "Radyo programı": "bg-indigo-500/20 text-indigo-200 border-indigo-500/40",
  Kitap: "bg-amber-500/20 text-amber-200 border-amber-500/35",
  "Çizgi roman & manga": "bg-orange-500/20 text-orange-100 border-orange-500/40",
  "Makale & blog": "bg-lime-500/15 text-lime-100 border-lime-500/35",
  Dergi: "bg-yellow-500/15 text-yellow-100 border-yellow-500/35",
  "Haber bülteni": "bg-rose-500/15 text-rose-100 border-rose-500/35",
  "E-kitap": "bg-amber-600/20 text-amber-100 border-amber-600/40",
  Oyun: "bg-emerald-600/20 text-emerald-100 border-emerald-500/40",
  Uygulama: "bg-sky-500/15 text-sky-100 border-sky-500/30",
  "Web & kaynak": "bg-blue-500/15 text-blue-100 border-blue-500/35",
  "Sergi & müze": "bg-stone-500/25 text-stone-100 border-stone-500/40",
  "Tiyatro & sahne": "bg-red-400/15 text-red-100 border-red-400/35",
  Konser: "bg-pink-600/20 text-pink-100 border-pink-500/45",
  "Online kurs": "bg-green-600/20 text-green-100 border-green-500/40",
  Diğer: "bg-zinc-600/35 text-zinc-200 border-zinc-500/40",
};

export function mediaKategoriClass(kategori: string): string {
  return (
    MEDIA_KAT_BADGE[kategori] ??
    "bg-zinc-500/15 text-zinc-300 border-zinc-500/35"
  );
}

const MEDIA_TUR_BADGE: Record<string, string> = {
  Genel: "bg-zinc-600/35 text-zinc-200 border-zinc-500/40",
  "Genel kültür": "bg-zinc-500/25 text-zinc-100 border-zinc-500/35",
  "Genel Kültür": "bg-zinc-500/25 text-zinc-100 border-zinc-500/35",
  Yazılım: "bg-sky-500/20 text-sky-200 border-sky-500/35",
  "Yazılım & IT": "bg-sky-600/25 text-sky-100 border-sky-500/45",
  Bilim: "bg-cyan-500/20 text-cyan-200 border-cyan-500/40",
  Teknoloji: "bg-blue-500/20 text-blue-200 border-blue-500/40",
  Tarih: "bg-amber-900/30 text-amber-100 border-amber-700/40",
  Felsefe: "bg-violet-600/20 text-violet-100 border-violet-500/40",
  Psikoloji: "bg-purple-500/20 text-purple-100 border-purple-500/40",
  Sosyoloji: "bg-orange-800/25 text-orange-100 border-orange-700/40",
  "Ekonomi & iş": "bg-emerald-800/25 text-emerald-100 border-emerald-700/40",
  "Siyaset & toplum": "bg-red-800/25 text-red-100 border-red-700/40",
  Hukuk: "bg-slate-600/35 text-slate-100 border-slate-500/45",
  Film: "bg-sky-500/15 text-sky-100 border-sky-500/30",
  Roman: "bg-amber-600/20 text-amber-100 border-amber-600/35",
  Edebiyat: "bg-rose-500/15 text-rose-100 border-rose-500/35",
  "Sanat & tasarım": "bg-fuchsia-500/15 text-fuchsia-100 border-fuchsia-500/35",
  "Sinema & dizi": "bg-indigo-500/15 text-indigo-100 border-indigo-500/35",
  Müzik: "bg-pink-500/20 text-pink-100 border-pink-500/40",
  Belgesel: "bg-teal-600/20 text-teal-100 border-teal-500/40",
  "Sağlık & spor": "bg-green-600/20 text-green-100 border-green-500/40",
  "Doğa & çevre": "bg-lime-600/20 text-lime-100 border-lime-500/40",
  "Haber & güncel": "bg-orange-500/15 text-orange-100 border-orange-500/35",
  "Yabancı Dil": "bg-cyan-600/15 text-cyan-100 border-cyan-500/35",
  "Yabancı dil": "bg-cyan-600/15 text-cyan-100 border-cyan-500/35",
  "Kişisel gelişim": "bg-violet-400/15 text-violet-100 border-violet-400/35",
  Hobi: "bg-amber-500/15 text-amber-100 border-amber-500/35",
  "Çocuk & aile": "bg-pink-400/20 text-pink-100 border-pink-400/40",
  Oyun: "bg-emerald-500/20 text-emerald-100 border-emerald-500/40",
  Spor: "bg-lime-500/20 text-lime-100 border-lime-500/40",
};

export function mediaTurClass(tur: string): string {
  return (
    MEDIA_TUR_BADGE[tur] ??
    "bg-zinc-600/30 text-zinc-200 border-zinc-500/30"
  );
}

export function gorevKategoriClass(kategori: string): string {
  switch (kategori) {
    case "Evrentek":
      return "bg-lime-500/20 text-lime-100 border-lime-500/35";
    case "Vih Soft Inc.":
      return "bg-indigo-500/20 text-indigo-200 border-indigo-500/40";
    case "Plan & hedef":
      return "bg-sky-500/20 text-sky-200 border-sky-500/35";
    case "Acil & önemli":
      return "bg-red-600/25 text-red-100 border-red-500/45";
    case "Aile & yakın çevre":
      return "bg-rose-500/20 text-rose-100 border-rose-500/40";
    case "Alışveriş & ihtiyaç":
      return "bg-amber-500/20 text-amber-100 border-amber-500/40";
    case "Bakım & Temizlik":
      return "bg-orange-900/40 text-orange-100 border-orange-700/40";
    case "Eğitim & gelişim":
      return "bg-zinc-700/50 text-zinc-100 border-zinc-500/40";
    case "Ev & düzen":
      return "bg-stone-500/20 text-stone-100 border-stone-500/40";
    case "Finans & ödeme":
      return "bg-emerald-600/20 text-emerald-100 border-emerald-500/40";
    case "Freelance & müşteri":
      return "bg-cyan-500/20 text-cyan-100 border-cyan-500/40";
    case "Hobi & yaratıcılık":
      return "bg-fuchsia-500/20 text-fuchsia-100 border-fuchsia-500/40";
    case "İdari & resmi":
      return "bg-slate-600/30 text-slate-100 border-slate-500/45";
    case "İletişim & toplantı":
      return "bg-blue-500/20 text-blue-100 border-blue-500/40";
    case "Kariyer":
      return "bg-teal-500/20 text-teal-100 border-teal-500/40";
    case "Kültürel":
      return "bg-purple-500/20 text-purple-200 border-purple-500/35";
    case "Okuma & medya":
      return "bg-violet-500/20 text-violet-100 border-violet-500/40";
    case "Sağlık & spor":
      return "bg-green-600/20 text-green-100 border-green-500/40";
    case "Sosyal & etkinlik":
      return "bg-pink-500/20 text-pink-100 border-pink-500/40";
    case "Ulaşım & seyahat":
      return "bg-yellow-500/15 text-yellow-100 border-yellow-500/35";
    case "Yazılım & teknoloji":
      return "bg-red-500/20 text-red-200 border-red-500/35";
    /** Eski sheet / geriye dönük */
    case "Kendi İşim":
      return "bg-sky-500/20 text-sky-200 border-sky-500/35";
    case "Eğitim":
      return "bg-zinc-700/50 text-zinc-100 border-zinc-500/40";
    case "Yazılım":
      return "bg-red-500/20 text-red-200 border-red-500/35";
    default:
      return "bg-zinc-500/15 text-zinc-300 border-zinc-500/35";
  }
}

export function gorevOncelikClass(oncelik: string): string {
  switch (oncelik) {
    case "P0":
      return "bg-red-900/50 text-red-100 border-red-600/50";
    case "P1":
      return "bg-orange-500/25 text-orange-100 border-orange-500/40";
    case "P2":
      return "bg-yellow-500/20 text-yellow-100 border-yellow-500/35";
    case "P3":
      return "bg-emerald-500/20 text-emerald-100 border-emerald-500/35";
    default:
      return "bg-zinc-500/15 text-zinc-300 border-zinc-500/35";
  }
}

export function gorevSonDurumClass(sonDurum: string): string {
  switch (sonDurum) {
    case "Tamamlandı":
      return "bg-emerald-500/20 text-emerald-200 border-emerald-500/40";
    case "İptal":
      return "bg-zinc-600/40 text-zinc-200 border-zinc-500/40";
    case "Telafi":
      return "bg-blue-500/20 text-blue-200 border-blue-500/40";
    case "Başlanmadı":
      return "bg-red-500/20 text-red-200 border-red-500/40";
    default:
      return "bg-zinc-500/15 text-zinc-300 border-zinc-500/35";
  }
}

export function progressBarColor(pct: number): string {
  if (pct >= 100) return "bg-emerald-500";
  if (pct <= 0) return "bg-red-500/80";
  if (pct >= 75) return "bg-lime-500";
  return "bg-amber-500";
}

export function isSirketClass(sirket: string): string {
  switch (sirket) {
    case "Evrentek":
      return "bg-lime-500/20 text-lime-100 border-lime-500/35";
    case "Vih Soft Inc.":
      return "bg-indigo-500/20 text-indigo-200 border-indigo-500/40";
    default:
      return "bg-zinc-500/15 text-zinc-300 border-zinc-500/35";
  }
}

export function isTurClass(isTuru: string): string {
  switch (isTuru) {
    case "Yazılım":
      return "bg-sky-500/20 text-sky-200 border-sky-500/35";
    case "IT":
    case "IT Proje":
      return "bg-violet-500/20 text-violet-200 border-violet-500/40";
    case "Freelance":
      return "bg-amber-500/20 text-amber-200 border-amber-500/40";
    default:
      return "bg-zinc-500/15 text-zinc-300 border-zinc-500/35";
  }
}

/** İş durumu — Sheets veri doğrulama renklerine yakın (koyu arayüz). */
export function isDurumClass(durum: string): string {
  switch (durum) {
    case "Beklemede":
    case "Teklif":
      return "bg-rose-400/18 text-rose-200 border-rose-400/45";
    case "Başlandı":
    case "Devam ediyor":
      return "bg-orange-400/18 text-orange-200 border-orange-500/45";
    case "Revizyonda":
      return "bg-yellow-400/16 text-yellow-100 border-yellow-500/40";
    case "Tamamlandı":
      return "bg-green-500/20 text-green-200 border-green-500/45";
    case "Ödeme Bekleniyor":
    case "Faturalandı":
      return "bg-blue-400/18 text-blue-200 border-blue-400/45";
    case "Ödendi":
      return "bg-emerald-800 text-white border-emerald-700 shadow-sm";
    case "İptal":
      return "bg-zinc-600/40 text-zinc-200 border-zinc-500/40";
    default:
      return "bg-zinc-500/15 text-zinc-300 border-zinc-500/35";
  }
}

export function finansTipClass(tip: string): string {
  switch (tip) {
    case "Gelir":
      return "bg-emerald-500/20 text-emerald-100 border-emerald-500/40";
    case "Gider":
      return "bg-orange-500/20 text-orange-100 border-orange-500/40";
    case "Fatura":
      return "bg-indigo-500/20 text-indigo-100 border-indigo-500/40";
    default:
      return "bg-zinc-500/15 text-zinc-300 border-zinc-500/35";
  }
}

export function finansDurumClass(durum: string): string {
  switch (durum) {
    case "Planlandı":
    case "Taslak":
      return "bg-slate-600/30 text-slate-200 border-slate-500/40";
    case "Bekleniyor":
    case "Bekliyor":
    case "Ödeme bekleniyor":
      return "bg-amber-500/20 text-amber-100 border-amber-500/40";
    case "Tahsil edildi":
    case "Ödendi":
      return "bg-emerald-600/25 text-emerald-100 border-emerald-500/45";
    case "Kesildi":
    case "Gönderildi":
      return "bg-blue-500/20 text-blue-100 border-blue-500/40";
    case "Vadesi geçti":
      return "bg-red-600/25 text-red-100 border-red-500/45";
    case "İptal":
      return "bg-zinc-600/40 text-zinc-300 border-zinc-500/40";
    default:
      return "bg-zinc-500/15 text-zinc-300 border-zinc-500/35";
  }
}
