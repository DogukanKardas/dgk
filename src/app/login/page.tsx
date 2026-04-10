import { redirect } from "next/navigation";
import {
  AUTH_SESSION_COOKIE,
  getAuthSigningMaterial,
  isAppAuthEnabled,
  verifySessionToken,
} from "@/lib/auth-session";
import { cookies } from "next/headers";
import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  if (!isAppAuthEnabled()) {
    redirect("/medya");
  }

  const material = await getAuthSigningMaterial();
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
  if (material && (await verifySessionToken(material, token))) {
    redirect("/medya");
  }

  const { from } = await searchParams;
  const safeFrom =
    from && from.startsWith("/") && !from.startsWith("//") ? from : "/medya";

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-xl backdrop-blur">
        <h1 className="text-lg font-semibold text-zinc-100">DGK · Giriş</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Devam etmek için kullanıcı adı ve şifrenizi girin.
        </p>
        <LoginForm redirectTo={safeFrom} />
      </div>
    </div>
  );
}
