import { getSheetsClient } from "@/lib/google-auth";
import { getSheetTasksName, getSpreadsheetId } from "@/lib/env-sheets";
import { a1SheetName, getSheetIdByTitle } from "@/lib/sheets/sheet-id";
import { tasksDataStartIndex } from "@/lib/sheets/data-start-row";

export type TaskRow = {
  tarih: string;
  gorevler: string;
  kategori: string;
  oncelik: string;
  sonDurum: string;
  bitisTarihi: string;
  ilerleme: string;
  dosya: string;
  notlar: string;
};

export type TaskRowWithRow = TaskRow & { row: number };

const COL_LAST = "I";

function asRow(arr: unknown[]): TaskRow {
  const cell = (i: number) =>
    arr[i] != null && arr[i] !== undefined ? String(arr[i]) : "";
  return {
    tarih: cell(0),
    gorevler: cell(1),
    kategori: cell(2),
    oncelik: cell(3),
    sonDurum: cell(4),
    bitisTarihi: cell(5),
    ilerleme: cell(6),
    dosya: cell(7),
    notlar: cell(8),
  };
}

function toValues(r: TaskRow): string[][] {
  return [
    [
      r.tarih,
      r.gorevler,
      r.kategori,
      r.oncelik,
      r.sonDurum,
      r.bitisTarihi,
      r.ilerleme,
      r.dosya,
      r.notlar,
    ],
  ];
}

export async function listTaskRows(): Promise<TaskRowWithRow[]> {
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const name = getSheetTasksName();
  const range = `${a1SheetName(name)}!A1:${COL_LAST}`;
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const values = res.data.values ?? [];
  const start = tasksDataStartIndex(values);
  const dataRows = values.slice(start);
  return dataRows.map((row, i) => ({
    row: i + start + 1,
    ...asRow(row),
  }));
}

export async function appendTaskRow(row: TaskRow): Promise<void> {
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const name = getSheetTasksName();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${a1SheetName(name)}!A1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: toValues(row) },
  });
}

export async function updateTaskRow(
  sheetRow: number,
  row: TaskRow
): Promise<void> {
  if (sheetRow < 1) {
    throw new Error("Geçersiz satır numarası.");
  }
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const name = getSheetTasksName();
  const range = `${a1SheetName(name)}!A${sheetRow}:${COL_LAST}${sheetRow}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: toValues(row) },
  });
}

export async function deleteTaskRow(sheetRow: number): Promise<void> {
  if (sheetRow < 1) {
    throw new Error("Geçersiz satır numarası.");
  }
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const name = getSheetTasksName();
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
