import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE } from "@/lib/auth-session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
