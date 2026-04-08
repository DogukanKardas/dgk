import { WorkBoard } from "@/components/work/WorkBoard";

export const metadata = {
  title: "İş · DGK",
};

export default function IsPage() {
  return (
    <>
      <h1 className="mb-6 text-xl font-semibold tracking-tight text-zinc-100">
        İş takibi (Evrentek, Vih Soft Inc.)
      </h1>
      <WorkBoard />
    </>
  );
}
