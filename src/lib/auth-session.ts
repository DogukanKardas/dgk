export const AUTH_SESSION_COOKIE = "dgk_session";

export function isAppAuthEnabled(): boolean {
  return Boolean(
    process.env.AUTH_USERNAME?.trim() && process.env.AUTH_PASSWORD?.trim()
  );
}

async function sha256Hex(message: string): Promise<string> {
  const data = new TextEncoder().encode(message);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** AUTH_SECRET varsa o; yoksa kullanıcı bilgilerinden türetilir (sunucuda kalır). */
export async function getAuthSigningMaterial(): Promise<string> {
  const explicit = process.env.AUTH_SECRET?.trim();
  if (explicit) return explicit;
  const u = process.env.AUTH_USERNAME?.trim();
  const p = process.env.AUTH_PASSWORD?.trim();
  if (!u || !p) return "";
  return sha256Hex(`dgk-auth|${u}|${p}`);
}

async function importHmacKey(secretMaterial: string): Promise<CryptoKey> {
  const keyBytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secretMaterial)
  );
  return crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function base64UrlEncodeBytes(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlEncodeUtf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecodeToBytes(b64url: string): Uint8Array {
  const pad = b64url.length % 4 === 0 ? "" : "=".repeat(4 - (b64url.length % 4));
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function signSessionToken(
  secretMaterial: string,
  expMs: number
): Promise<string> {
  const payloadJson = JSON.stringify({ exp: expMs });
  const payloadB64 = base64UrlEncodeUtf8(payloadJson);
  const key = await importHmacKey(secretMaterial);
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payloadB64)
  );
  const sigB64 = base64UrlEncodeBytes(sig);
  return `v1.${payloadB64}.${sigB64}`;
}

export async function verifySessionToken(
  secretMaterial: string,
  token: string | undefined
): Promise<boolean> {
  if (!secretMaterial || !token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const payloadB64 = parts[1]!;
  const sigB64 = parts[2]!;
  try {
    const key = await importHmacKey(secretMaterial);
    const sigBytes = base64UrlDecodeToBytes(sigB64);
    const sigBuf = new Uint8Array(sigBytes.byteLength);
    sigBuf.set(sigBytes);
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBuf,
      new TextEncoder().encode(payloadB64)
    );
    if (!ok) return false;
    const json = new TextDecoder().decode(base64UrlDecodeToBytes(payloadB64));
    const payload = JSON.parse(json) as { exp?: number };
    if (typeof payload.exp !== "number" || Date.now() > payload.exp) return false;
    return true;
  } catch {
    return false;
  }
}

export function timingSafeStringEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i)! ^ b.charCodeAt(i)!;
  return diff === 0;
}
