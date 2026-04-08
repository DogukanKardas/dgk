import { FinansBoard } from "@/components/finance/FinansBoard";

export const metadata = {
  title: "Finans · Gider · DGK",
};

export default function FinansGiderPage() {
  return (
    <>
      <h1 className="mb-2 text-xl font-semibold tracking-tight text-zinc-100">
        Gider
      </h1>
      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-zinc-400">
        Sheet’teki <strong className="text-zinc-300">Gider</strong> kayıtları.
      </p>
      <FinansBoard fixedTip="Gider" />
    </>
  );
}
