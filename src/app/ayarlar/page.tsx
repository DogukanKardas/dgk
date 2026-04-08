import { AppNav } from "@/components/AppNav";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { getSettingsSnapshot } from "@/lib/settings-snapshot";

export const metadata = {
  title: "Ayarlar · DGK",
};

export default function AyarlarPage() {
  const initialStatus = getSettingsSnapshot();
  return (
    <>
      <AppNav current="ayarlar" />
      <main className="mx-auto max-w-[960px] flex-1 px-4 py-6">
        <h1 className="mb-6 text-xl font-semibold tracking-tight text-zinc-100">
          Ayarlar · Google Sheets bağlantısı
        </h1>
        <SettingsPanel initialStatus={initialStatus} />
      </main>
    </>
  );
}
