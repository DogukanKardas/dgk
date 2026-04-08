import { getSheetsClient } from "@/lib/google-auth";
import { getSheetWorkName, getSpreadsheetId } from "@/lib/env-sheets";
import { a1SheetName, getSheetIdByTitle } from "@/lib/sheets/sheet-id";
import { workDataStartIndex } from "@/lib/sheets/data-start-row";

/**
 * Sheet kolon sırası (A–Q):
 * … | Aylık ödemeler | Sözleşme tipi (uzunSureli | tekSeferlik)
 * Aylık ödemeler: "1=gg.aa.yyyy" gerçekleşen ödeme; "2^gg.aa.yyyy" planlanan ödeme
 * tarihi (henüz ödenmedi); eski "1,2,3".
 */
export type WorkRow = {
  tarih: string;
  sirket: string;
  isTuru: string;
  baslik: string;
  durum: string;
  tutar: string;
  paraBirimi: string;
  bitisTarihi: string;
  link: string;
  notlar: string;
  musteriIsmi: string;
  iletisim: string;
  sureAy: string;
  aylikTutar: string;
  aylikOdemeAylar: string;
  sozlesmeTipi: string;
};

export type WorkRowWithRow = WorkRow & { row: number };

const COL_LAST = "Q";

function asRow(arr: unknown[]): WorkRow {
  const cell = (i: number) =>
    arr[i] != null && arr[i] !== undefined ? String(arr[i]) : "";
  return {
    tarih: cell(0),
    sirket: cell(1),
    isTuru: cell(2),
    baslik: cell(3),
    durum: cell(4),
    tutar: cell(5),
    paraBirimi: cell(6),
    bitisTarihi: cell(7),
    link: cell(8),
    notlar: cell(9),
    musteriIsmi: cell(10),
    iletisim: cell(11),
    sureAy: cell(12),
    aylikTutar: cell(13),
    aylikOdemeAylar: cell(14),
    sozlesmeTipi: cell(15),
  };
}

function toValues(r: WorkRow): string[][] {
  return [
    [
      r.tarih,
      r.sirket,
      r.isTuru,
      r.baslik,
      r.durum,
      r.tutar,
      r.paraBirimi,
      r.bitisTarihi,
      r.link,
      r.notlar,
      r.musteriIsmi,
      r.iletisim,
      r.sureAy,
      r.aylikTutar,
      r.aylikOdemeAylar,
      r.sozlesmeTipi,
    ],
  ];
}

export async function listWorkRows(): Promise<WorkRowWithRow[]> {
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const name = getSheetWorkName();
  const range = `${a1SheetName(name)}!A1:${COL_LAST}`;
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const values = res.data.values ?? [];
  const start = workDataStartIndex(values);
  const dataRows = values.slice(start);
  return dataRows.map((row, i) => ({
    row: i + start + 1,
    ...asRow(row),
  }));
}

export async function appendWorkRow(row: WorkRow): Promise<void> {
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const name = getSheetWorkName();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${a1SheetName(name)}!A1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: toValues(row) },
  });
}

export async function updateWorkRow(
  sheetRow: number,
  row: WorkRow
): Promise<void> {
  if (sheetRow < 1) {
    throw new Error("Geçersiz satır numarası.");
  }
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const name = getSheetWorkName();
  const range = `${a1SheetName(name)}!A${sheetRow}:${COL_LAST}${sheetRow}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: toValues(row) },
  });
}

export async function deleteWorkRow(sheetRow: number): Promise<void> {
  if (sheetRow < 1) {
    throw new Error("Geçersiz satır numarası.");
  }
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const name = getSheetWorkName();
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
