import { ExpectedWorkPaymentsPanel } from "@/components/finance/ExpectedWorkPaymentsPanel";
import { FinansBoard } from "@/components/finance/FinansBoard";

export const metadata = {
  title: "Finans · Fatura · DGK",
};

export default function FinansFaturaPage() {
  return (
    <>
      <h1 className="mb-2 text-xl font-semibold tracking-tight text-zinc-100">
        Fatura
      </h1>
      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-zinc-400">
        Kesilen ve kesilecek faturalar. İş kaynaklı vade özeti altta; ödeme
        durumu yine İş → Ödemeler üzerinden güncellenir.
      </p>
      <div className="mb-8">
        <ExpectedWorkPaymentsPanel />
      </div>
      <FinansBoard fixedTip="Fatura" />
    </>
  );
}
