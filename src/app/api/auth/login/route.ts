import { NextResponse } from "next/server";
import {
  AUTH_SESSION_COOKIE,
  getAuthSigningMaterial,
  isAppAuthEnabled,
  signSessionToken,
  timingSafeStringEq,
} from "@/lib/auth-session";

const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  if (!isAppAuthEnabled()) {
    return NextResponse.json(
      { error: "Uygulama girişi yapılandırılmamış (AUTH_USERNAME / AUTH_PASSWORD)." },
      { status: 503 }
    );
  }

  let body: { username?: string; password?: string };
  try {
    body = (await request.json()) as { username?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const username = String(body.username ?? "");
  const password = String(body.password ?? "");
  const expectUser = process.env.AUTH_USERNAME!.trim();
  const expectPass = process.env.AUTH_PASSWORD!.trim();

  if (!timingSafeStringEq(username, expectUser) || !timingSafeStringEq(password, expectPass)) {
    return NextResponse.json(
      { error: "Kullanıcı adı veya şifre hatalı." },
      { status: 401 }
    );
  }

  const material = await getAuthSigningMaterial();
  if (!material) {
    return NextResponse.json({ error: "Oturum anahtarı oluşturulamadı." }, { status: 500 });
  }

  const exp = Date.now() + SESSION_MS;
  const token = await signSessionToken(material, exp);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_MS / 1000),
  });
  return res;
}
