import { WorkFinanceBoard } from "@/components/work/WorkFinanceBoard";

export const metadata = {
  title: "İş · Ödemeler · DGK",
};

export default function IsFinansPage() {
  return (
    <>
      <h1 className="mb-2 text-xl font-semibold tracking-tight text-zinc-100">
        Ödemeler
      </h1>
      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-zinc-400">
        Ödeme yapılan ayı doğrudan seçin (ör. <span className="text-zinc-300">Nisan
        2026</span>), ardından ödeme tarihini kaydedin. Uzun süreli kayıtta bitiş
        veya süre yoksa önce tek ay açılır; tüm aylar için İşler’de tarih aralığı
        veya süre doldurun. Gecikmiş ve yaklaşan vadeler üstte listelenir.
      </p>
      <WorkFinanceBoard />
    </>
  );
}
