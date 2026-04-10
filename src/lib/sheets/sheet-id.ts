import type { sheets_v4 } from "googleapis";

export function a1SheetName(name: string): string {
  const escaped = name.replace(/'/g, "''");
  return `'${escaped}'`;
}

export type ResolvedSheet = { sheetId: number; title: string };

/**
 * Sekme adını API’deki gerçek başlıkla eşleştirir; values.get aralığında bu başlık kullanılmalı
 * (aksi halde "Unable to parse range" oluşabilir: yanlış ID, trim, büyük/küçük harf, Unicode).
 */
export async function resolveSheetByTitle(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  requestedTitle: string
): Promise<ResolvedSheet> {
  const trimmed = requestedTitle.trim();
  const res = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(sheetId,title))",
  });
  const entries =
    res.data.sheets
      ?.map((s) => ({
        sheetId: s.properties?.sheetId,
        title: s.properties?.title ?? "",
      }))
      .filter(
        (e): e is { sheetId: number; title: string } =>
          e.sheetId != null && e.title !== ""
      ) ?? [];

  let match = entries.find((e) => e.title === trimmed);
  if (!match) {
    match = entries.find(
      (e) => e.title.normalize("NFC") === trimmed.normalize("NFC")
    );
  }
  if (!match) {
    const lower = trimmed.toLowerCase();
    match = entries.find((e) => e.title.toLowerCase() === lower);
  }

  if (!match) {
    const names = entries.map((e) => `"${e.title}"`).join(", ");
    throw new Error(
      `Sayfa bulunamadı: "${trimmed}". Bu e-tablodaki sekmeler: ${names || "(yok)"}`
    );
  }

  return { sheetId: match.sheetId, title: match.title };
}

export async function getSheetIdByTitle(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  title: string
): Promise<number> {
  const { sheetId } = await resolveSheetByTitle(sheets, spreadsheetId, title);
  return sheetId;
}
