/** İlk satır beklenen başlık satırı mı? Değilse tüm satırlar veri kabul edilir. */

function cell0(values: unknown[][]): string {
  const v = values[0]?.[0];
  return String(v ?? "").trim().toLowerCase();
}

function cell0Tr(values: unknown[][]): string {
  const v = values[0]?.[0];
  return String(v ?? "").trim().toLocaleLowerCase("tr-TR");
}

/** Medya: A1 = Başlık (veya baslik). */
export function mediaDataStartIndex(values: unknown[][]): number {
  if (values.length === 0) return 0;
  const a = cell0(values);
  if (a === "başlık" || a === "baslik" || a === "title") return 1;
  return 0;
}

/** Görevler: A1 = Tarih (başlık kelimesi). */
export function tasksDataStartIndex(values: unknown[][]): number {
  if (values.length === 0) return 0;
  const a = cell0(values);
  if (a === "tarih" || a === "date") return 1;
  return 0;
}

/** İş: A1 = Tarih. */
export function workDataStartIndex(values: unknown[][]): number {
  return tasksDataStartIndex(values);
}

/** Finans: A1 = tip (kayıt türü). */
export function finansDataStartIndex(values: unknown[][]): number {
  if (values.length === 0) return 0;
  const a = cell0Tr(values);
  if (
    a === "tip" ||
    a === "tür" ||
    a === "tur" ||
    a === "type" ||
    a === "kayıt tipi" ||
    a === "kayit tipi" ||
    a === "işlem tipi" ||
    a === "islem tipi" ||
    a === "türü" ||
    a === "turu"
  ) {
    return 1;
  }
  const b1 = String(values[0]?.[1] ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR");
  if (
    (a === "" || a === "-" || a === "—") &&
    (b1 === "tarih" || b1 === "date")
  ) {
    return 1;
  }
  return 0;
}
