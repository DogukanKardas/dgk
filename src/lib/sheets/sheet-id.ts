import type { sheets_v4 } from "googleapis";

export function a1SheetName(name: string): string {
  const escaped = name.replace(/'/g, "''");
  return `'${escaped}'`;
}

export async function getSheetIdByTitle(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  title: string
): Promise<number> {
  const res = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(sheetId,title))",
  });
  const sheet = res.data.sheets?.find((s) => s.properties?.title === title);
  const id = sheet?.properties?.sheetId;
  if (id === undefined || id === null) {
    throw new Error(`Sayfa bulunamadı: "${title}"`);
  }
  return id;
}
