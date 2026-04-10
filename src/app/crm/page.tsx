import { AppNav } from "@/components/AppNav";
import { CrmApp } from "@/components/crm/CrmApp";

export const metadata = {
  title: "CRM · DGK",
};

export default function CrmPage() {
  return (
    <>
      <AppNav current="crm" />
      <main className="mx-auto max-w-[1600px] flex-1 px-4 py-6">
        <h1 className="mb-2 text-xl font-semibold tracking-tight text-zinc-100">
          CRM · Aday ve keşif
        </h1>
        <p className="mb-6 max-w-3xl text-sm text-zinc-400">
          OpenStreetMap + Overpass ile ücretsiz bölge keşfi; adaylar ve şablonlar
          Google Sheets üzerinde saklanır. E-tablonuzda{" "}
          <code className="text-zinc-300">CRM_Leads</code> ve{" "}
          <code className="text-zinc-300">CRM_Sablonlar</code> sekmelerini
          oluşturun (başlık satırı önerilir).
        </p>
        <CrmApp />
      </main>
    </>
  );
}
