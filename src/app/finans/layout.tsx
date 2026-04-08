import { AppNav } from "@/components/AppNav";
import { FinansSubNav } from "@/components/finance/FinansSubNav";

export default function FinansLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <AppNav current="finans" />
      <main className="mx-auto max-w-[1600px] flex-1 px-4 py-6">
        <FinansSubNav />
        {children}
      </main>
    </>
  );
}
