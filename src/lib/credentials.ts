export type ServiceAccount = {
  client_email: string;
  private_key: string;
};

function loadRawServiceAccountString(): string {
  const fileEnv = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_FILE?.trim();
  const inline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();

  // Önce satır içi değer (Vercel’de FILE yanlışlıkla da tanımlı olsa bile JSON kullanılsın).
  if (inline) {
    return inline;
  }

  if (fileEnv && process.env.VERCEL) {
    throw new Error(
      "Vercel ortamında GOOGLE_SERVICE_ACCOUNT_JSON_FILE kullanılamaz (build çıktısında dosya yok). Project → Settings → Environment Variables içinde GOOGLE_SERVICE_ACCOUNT_JSON ekleyin: Ayarlar sayfasındaki «Yalnızca Base64 env satırını kopyala» veya tek satıra indirgenmiş JSON."
    );
  }

  if (fileEnv) {
    // Node-only; require ile fs üst seviye import NFT uyarısını azaltır
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("node:fs") as typeof import("node:fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("node:path") as typeof import("node:path");
    const resolved = path.isAbsolute(fileEnv)
      ? fileEnv
      : path.join(process.cwd(), fileEnv);
    if (!fs.existsSync(resolved)) {
      throw new Error(
        `GOOGLE_SERVICE_ACCOUNT_JSON_FILE bulunamıyor: ${resolved}`
      );
    }
    return fs.readFileSync(resolved, "utf8").trim();
  }

  throw new Error(
    "GOOGLE_SERVICE_ACCOUNT_JSON veya GOOGLE_SERVICE_ACCOUNT_JSON_FILE ayarlayın (yerel geliştirme için JSON dosya yolu en kolayıdır)."
  );
}

/** .env içinde yanlışlıkla yapıştırılmış tam satırı ayıkla; BOM kırp. */
function stripServiceAccountValue(raw: string): string {
  let s = raw.trim();
  if (s.charCodeAt(0) === 0xfeff) {
    s = s.slice(1).trim();
  }
  const assign = s.match(/^GOOGLE_SERVICE_ACCOUNT_JSON\s*=\s*([\s\S]*)$/);
  if (assign) {
    s = assign[1].trim();
    if (
      (s.startsWith('"') && s.endsWith('"')) ||
      (s.startsWith("'") && s.endsWith("'"))
    ) {
      s = s.slice(1, -1).replace(/\\n/g, "\n").replace(/\\"/g, '"');
    }
  }

  const keyPrefix = "GOOGLE_SERVICE_ACCOUNT_JSON=";
  while (s.startsWith(keyPrefix)) {
    s = s.slice(keyPrefix.length).trim();
  }

  return s.trim();
}

export function getServiceAccountCredentials(): ServiceAccount {
  const raw = loadRawServiceAccountString();
  const trimmed = stripServiceAccountValue(raw);
  if (!trimmed) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON boş görünüyor. .env dosyasını kontrol edin."
    );
  }

  let json: string;
  if (trimmed.startsWith("{")) {
    json = trimmed;
  } else {
    const b64 = trimmed.replace(/\s/g, "");
    try {
      json = Buffer.from(b64, "base64").toString("utf8");
    } catch {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON Base64 decode edilemedi.");
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    if (trimmed.startsWith("{")) {
      const likelyTruncated =
        json.length < 800 ||
        json === "{" ||
        (json.startsWith("{") && !json.includes("client_email"));
      if (likelyTruncated) {
        throw new Error(
          "GOOGLE_SERVICE_ACCOUNT_JSON çok satırlı .env formatında kırpılmış olabilir: dotenv tek satır okur, değer genelde yalnızca \"{\" kalır. Çözüm: Ayarlar → \"Yalnızca Base64 env satırını kopyala\" ile tek satır ekleyin veya JSON'u tek satıra indirip tüm değeri çift tırnak içine alın."
        );
      }
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON geçerli JSON değil.");
    }
    const dupHint = raw.includes(
      "GOOGLE_SERVICE_ACCOUNT_JSON=GOOGLE_SERVICE_ACCOUNT_JSON="
    )
      ? " Satırda değişken adı iki kez yazılmış olabilir (GOOGLE_SERVICE_ACCOUNT_JSON=...=...); yalnızca tek \"=\" ve sadece Base64 olmalı."
      : "";
    throw new Error(
      `GOOGLE_SERVICE_ACCOUNT_JSON (Base64) çözüldü ancak içerik geçerli JSON değil.${dupHint}`
    );
  }

  const o = parsed as Record<string, unknown>;
  const email = o.client_email;
  const key = o.private_key;
  if (typeof email !== "string" || typeof key !== "string") {
    throw new Error(
      "Service Account JSON içinde client_email veya private_key yok."
    );
  }
  return { client_email: email, private_key: key.replace(/\\n/g, "\n") };
}
