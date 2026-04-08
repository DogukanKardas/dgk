import { getSheetsClient } from "@/lib/google-auth";
import { getSheetFinansName, getSpreadsheetId } from "@/lib/env-sheets";
import { a1SheetName, getSheetIdByTitle } from "@/lib/sheets/sheet-id";
import { finansNormalizeCell } from "@/lib/finance-tip-match";
import { finansDataStartIndex } from "@/lib/sheets/data-start-row";

/**
 * Finans sheet A–M:
 * tip, tarih, tutar, paraBirimi, baslik, kategori, durum, vadeTarihi,
 * belgeNo, isSheetRow, link, notlar, ek
 */
export type FinansRow = {
  tip: string;
  tarih: string;
  tutar: string;
  paraBirimi: string;
  baslik: string;
  kategori: string;
  durum: string;
  vadeTarihi: string;
  belgeNo: string;
  isSheetRow: string;
  link: string;
  notlar: string;
  ek: string;
};

export type FinansRowWithRow = FinansRow & { row: number };

const COL_LAST = "M";

function asRow(arr: unknown[]): FinansRow {
  const cell = (i: number) =>
    arr[i] != null && arr[i] !== undefined ? String(arr[i]) : "";
  return {
    tip: finansNormalizeCell(cell(0)),
    tarih: cell(1),
    tutar: cell(2),
    paraBirimi: cell(3),
    baslik: cell(4),
    kategori: cell(5),
    durum: cell(6),
    vadeTarihi: cell(7),
    belgeNo: cell(8),
    isSheetRow: cell(9),
    link: cell(10),
    notlar: cell(11),
    ek: cell(12),
  };
}

function toValues(r: FinansRow): string[][] {
  return [
    [
      r.tip,
      r.tarih,
      r.tutar,
      r.paraBirimi,
      r.baslik,
      r.kategori,
      r.durum,
      r.vadeTarihi,
      r.belgeNo,
      r.isSheetRow,
      r.link,
      r.notlar,
      r.ek,
    ],
  ];
}

export async function listFinansRows(): Promise<FinansRowWithRow[]> {
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const name = getSheetFinansName();
  const range = `${a1SheetName(name)}!A1:${COL_LAST}`;
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const values = res.data.values ?? [];
  const start = finansDataStartIndex(values);
  const dataRows = values.slice(start);
  return dataRows.map((row, i) => ({
    row: i + start + 1,
    ...asRow(row),
  }));
}

export async function appendFinansRow(row: FinansRow): Promise<void> {
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const name = getSheetFinansName();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${a1SheetName(name)}!A1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: toValues(row) },
  });
}

export async function updateFinansRow(
  sheetRow: number,
  row: FinansRow
): Promise<void> {
  if (sheetRow < 1) {
    throw new Error("Geçersiz satır numarası.");
  }
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const name = getSheetFinansName();
  const range = `${a1SheetName(name)}!A${sheetRow}:${COL_LAST}${sheetRow}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: toValues(row) },
  });
}

export async function deleteFinansRow(sheetRow: number): Promise<void> {
  if (sheetRow < 1) {
    throw new Error("Geçersiz satır numarası.");
  }
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const name = getSheetFinansName();
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
