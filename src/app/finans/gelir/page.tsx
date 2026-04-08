import { ExpectedWorkPaymentsPanel } from "@/components/finance/ExpectedWorkPaymentsPanel";
import { FinansBoard } from "@/components/finance/FinansBoard";

export const metadata = {
  title: "Finans · Gelir · DGK",
};

export default function FinansGelirPage() {
  return (
    <>
      <h1 className="mb-2 text-xl font-semibold tracking-tight text-zinc-100">
        Gelir
      </h1>
      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-zinc-400">
        Sheet’teki <strong className="text-zinc-300">Gelir</strong> kayıtlarını
        buradan ekleyip düzenleyin. İş sözleşmesinde{" "}
        <strong className="text-zinc-300">ödenen</strong> taksitler tabloda
        otomatik olarak birleştirilir (salt okunur; sheet’e yazılmaz); ödeme
        işaretlemek veya değiştirmek için{" "}
        <strong className="text-zinc-300">İş → Ödemeler</strong> kullanın.
      </p>
      <div className="mb-8">
        <ExpectedWorkPaymentsPanel />
      </div>
      <FinansBoard fixedTip="Gelir" syncWorkPaidGelir />
    </>
  );
}
