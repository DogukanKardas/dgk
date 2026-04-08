import { NextResponse } from "next/server";
import { getSettingsSnapshot } from "@/lib/settings-snapshot";

export const dynamic = "force-dynamic";

/** Gizli değer veya kimlik döndürülmez; yalnızca yapılandırma özeti. */
export async function GET() {
  return NextResponse.json(getSettingsSnapshot());
}
