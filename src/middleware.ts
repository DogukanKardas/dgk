import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  AUTH_SESSION_COOKIE,
  getAuthSigningMaterial,
  isAppAuthEnabled,
  verifySessionToken,
} from "@/lib/auth-session";

export async function middleware(request: NextRequest) {
  if (!isAppAuthEnabled()) {
    return NextResponse.next();
  }

  const material = await getAuthSigningMaterial();
  if (!material) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_SESSION_COOKIE)?.value;
  const ok = await verifySessionToken(material, token);

  if (pathname === "/login") {
    if (ok) {
      return NextResponse.redirect(new URL("/medya", request.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/api/auth/login" && request.method === "POST") {
    return NextResponse.next();
  }
  if (pathname === "/api/auth/logout" && request.method === "POST") {
    return NextResponse.next();
  }

  if (!ok) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("from", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
