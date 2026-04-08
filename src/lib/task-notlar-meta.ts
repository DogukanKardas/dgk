/**
 * Görev `notlar` alanının sonuna eklenen yapılandırılmış blok (JSON).
 * Sheet’te düz metin + makine tarafından okunur ek bilgi.
 */

export type TaskNotlarMeta = {
  /** gg.aa.yyyy */
  hatirlatma?: string;
  altGorevler?: string[];
  etiketler?: string[];
};

const MARK = "\n---DGK---\n";

export function parseTaskNotlar(notlar: string): {
  body: string;
  meta: TaskNotlarMeta;
} {
  const t = notlar ?? "";
  const i = t.indexOf(MARK);
  if (i === -1) {
    return { body: t, meta: {} };
  }
  const body = t.slice(0, i).trimEnd();
  const raw = t.slice(i + MARK.length).trim();
  if (!raw) {
    return { body, meta: {} };
  }
  try {
    const meta = JSON.parse(raw) as TaskNotlarMeta;
    if (!meta || typeof meta !== "object") {
      return { body, meta: {} };
    }
    return { body, meta };
  } catch {
    return { body: t, meta: {} };
  }
}

export function composeTaskNotlar(
  body: string,
  meta: TaskNotlarMeta
): string {
  const b = body.trim();
  const hasExtra =
    (meta.hatirlatma && meta.hatirlatma.trim() !== "") ||
    (Array.isArray(meta.altGorevler) &&
      meta.altGorevler.some((x) => String(x).trim() !== "")) ||
    (Array.isArray(meta.etiketler) &&
      meta.etiketler.some((x) => String(x).trim() !== ""));
  if (!hasExtra) {
    return b;
  }
  const slim: TaskNotlarMeta = {};
  if (meta.hatirlatma?.trim()) {
    slim.hatirlatma = meta.hatirlatma.trim();
  }
  if (Array.isArray(meta.altGorevler)) {
    const a = meta.altGorevler.map((x) => String(x).trim()).filter(Boolean);
    if (a.length) slim.altGorevler = a;
  }
  if (Array.isArray(meta.etiketler)) {
    const e = meta.etiketler.map((x) => String(x).trim()).filter(Boolean);
    if (e.length) slim.etiketler = e;
  }
  return `${b}${MARK}${JSON.stringify(slim)}`;
}
