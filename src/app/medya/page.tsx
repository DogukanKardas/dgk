import { AppNav } from "@/components/AppNav";
import { MediaBoard } from "@/components/media/MediaBoard";

export const metadata = {
  title: "Medya · DGK",
};

export default function MedyaPage() {
  return (
    <>
      <AppNav current="medya" />
      <main className="mx-auto max-w-[1600px] flex-1 px-4 py-6">
        <h1 className="mb-6 text-xl font-semibold tracking-tight text-zinc-100">
          Medya kütüphanesi
        </h1>
        <MediaBoard />
      </main>
    </>
  );
}
