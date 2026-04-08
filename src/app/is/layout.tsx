import { AppNav } from "@/components/AppNav";
import { IsSubNav } from "@/components/work/IsSubNav";

export default function IsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <AppNav current="is" />
      <main className="mx-auto max-w-[1600px] flex-1 px-4 py-6">
        <IsSubNav />
        {children}
      </main>
    </>
  );
}
