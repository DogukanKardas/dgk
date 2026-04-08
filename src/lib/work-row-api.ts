import type { WorkRowWithRow } from "@/lib/sheets/work-sheet";
import { inferSozlesmeTipi } from "@/lib/work-contract-helpers";

/** PATCH/POST gövdesi: sheet satırından API alanları. */
export function workRowToApiBody(r: WorkRowWithRow): Record<string, string> {
  return {
    tarih: r.tarih,
    sirket: r.sirket,
    isTuru: r.isTuru,
    baslik: r.baslik,
    durum: r.durum,
    tutar: r.tutar,
    paraBirimi: r.paraBirimi,
    bitisTarihi: r.bitisTarihi,
    link: r.link,
    notlar: r.notlar,
    musteriIsmi: r.musteriIsmi,
    iletisim: r.iletisim,
    sureAy: r.sureAy,
    aylikTutar: r.aylikTutar,
    aylikOdemeAylar: r.aylikOdemeAylar,
    sozlesmeTipi:
      r.sozlesmeTipi === "uzunSureli" || r.sozlesmeTipi === "tekSeferlik"
        ? r.sozlesmeTipi
        : inferSozlesmeTipi(r),
  };
}
