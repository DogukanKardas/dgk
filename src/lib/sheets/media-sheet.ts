import { getSheetsClient } from "@/lib/google-auth";
import { getSheetMediaName, getSpreadsheetId } from "@/lib/env-sheets";
import { a1SheetName, getSheetIdByTitle } from "@/lib/sheets/sheet-id";
import { mediaDataStartIndex } from "@/lib/sheets/data-start-row";

export type MediaRow = {
  baslik: string;
  kategori: string;
  durum: string;
  tur: string;
  link: string;
  tarih: string;
  notlar: string;
  puan: string;
};

export type MediaRowWithRow = MediaRow & { row: number };

const COL_LAST = "H";

function asRow(arr: unknown[]): MediaRow {
  const cell = (i: number) =>
    arr[i] != null && arr[i] !== undefined ? String(arr[i]) : "";
  return {
    baslik: cell(0),
    kategori: cell(1),
    durum: cell(2),
    tur: cell(3),
    link: cell(4),
    tarih: cell(5),
    notlar: cell(6),
    puan: cell(7),
  };
}

function toValues(r: MediaRow): string[][] {
  return [
    [
      r.baslik,
      r.kategori,
      r.durum,
      r.tur,
      r.link,
      r.tarih,
      r.notlar,
      r.puan,
    ],
  ];
}

export async function listMediaRows(): Promise<MediaRowWithRow[]> {
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const name = getSheetMediaName();
  const range = `${a1SheetName(name)}!A1:${COL_LAST}`;
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const values = res.data.values ?? [];
  const start = mediaDataStartIndex(values);
  const dataRows = values.slice(start);
  return dataRows.map((row, i) => ({
    row: i + start + 1,
    ...asRow(row),
  }));
}

export async function appendMediaRow(row: MediaRow): Promise<void> {
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const name = getSheetMediaName();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${a1SheetName(name)}!A1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: toValues(row) },
  });
}

export async function updateMediaRow(
  sheetRow: number,
  row: MediaRow
): Promise<void> {
  if (sheetRow < 1) {
    throw new Error("Geçersiz satır numarası.");
  }
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const name = getSheetMediaName();
  const range = `${a1SheetName(name)}!A${sheetRow}:${COL_LAST}${sheetRow}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: toValues(row) },
  });
}

export async function deleteMediaRow(sheetRow: number): Promise<void> {
  if (sheetRow < 1) {
    throw new Error("Geçersiz satır numarası.");
  }
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const name = getSheetMediaName();
  const sheetId = await getSheetIdByTitle(sheets, spreadsheetId, name);
  const startIndex = sheetRow - 1;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex,
              endIndex: startIndex + 1,
            },
          },
        },
      ],
    },
  });
}
