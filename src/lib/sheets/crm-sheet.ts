import { getSheetsClient } from "@/lib/google-auth";
import {
  getSheetCrmLeadsName,
  getSheetCrmTemplatesName,
  getSpreadsheetId,
} from "@/lib/env-sheets";
import { a1SheetName, resolveSheetByTitle } from "@/lib/sheets/sheet-id";
import {
  crmLeadsDataStartIndex,
  crmTemplatesDataStartIndex,
} from "@/lib/sheets/data-start-row";

export type CrmLeadRow = {
  osmKey: string;
  ad: string;
  adres: string;
  telefon: string;
  webSitesi: string;
  webVarMi: string;
  kaynak: string;
  notlar: string;
  asama: string;
  skor: string;
  kriterJson: string;
  olusturma: string;
  guncelleme: string;
  /** N sütunu — e-posta gönderimi */
  eposta: string;
  /** O sütunu — iletişim / teklif durumu (ör. mail_gonderildi) */
  iletisimDurumu: string;
};

export type CrmLeadRowWithRow = CrmLeadRow & { row: number };

export type CrmTemplateRow = {
  ad: string;
  kanal: string;
  konu: string;
  govde: string;
};

export type CrmTemplateRowWithRow = CrmTemplateRow & { row: number };

const LEADS_COL_LAST = "O";
const TEMPLATE_COL_LAST = "D";

/**
 * Google Sheets USER_ENTERED: 604-555… veya = ile başlayan metinleri sayı/formül
 * sanmaması için hücreyi düz metin olarak yazar (görünürde ' gösterilmez).
 */
function sheetsForcePlainText(value: string): string {
  if (!value) return "";
  const inner = value.replace(/^'+/, "").replace(/'/g, "''");
  return `'${inner}`;
}

/** API bazen metin hücrelerini başında ' ile döndürür. */
function stripSheetsQuotedText(value: string): string {
  if (!value.startsWith("'")) return value;
  return value.slice(1).replace(/''/g, "'");
}

function asLeadRow(arr: unknown[]): CrmLeadRow {
  const cell = (i: number) => {
    let v = arr[i] != null && arr[i] !== undefined ? String(arr[i]) : "";
    if (i === 3 || i === 10) v = stripSheetsQuotedText(v);
    return v;
  };
  return {
    osmKey: cell(0),
    ad: cell(1),
    adres: cell(2),
    telefon: cell(3),
    webSitesi: cell(4),
    webVarMi: cell(5),
    kaynak: cell(6),
    notlar: cell(7),
    asama: cell(8),
    skor: cell(9),
    kriterJson: cell(10),
    olusturma: cell(11),
    guncelleme: cell(12),
    eposta: cell(13),
    iletisimDurumu: cell(14),
  };
}

function leadToValues(r: CrmLeadRow): string[][] {
  const n = r.notlar;
  const notlarOut =
    n &&
    /^[=+\-@]/.test(n.replace(/^'+/, "").trimStart())
      ? sheetsForcePlainText(n)
      : n;

  const ep = r.eposta.trim();
  return [
    [
      r.osmKey,
      r.ad,
      r.adres,
      r.telefon ? sheetsForcePlainText(r.telefon) : "",
      r.webSitesi,
      r.webVarMi,
      r.kaynak,
      notlarOut,
      r.asama,
      r.skor,
      r.kriterJson ? sheetsForcePlainText(r.kriterJson) : "",
      r.olusturma,
      r.guncelleme,
      ep && /^[=+\-@]/.test(ep.replace(/^'+/, "").trimStart())
        ? sheetsForcePlainText(ep)
        : ep,
      r.iletisimDurumu ?? "",
    ],
  ];
}

function asTemplateRow(arr: unknown[]): CrmTemplateRow {
  const cell = (i: number) => {
    let v = arr[i] != null && arr[i] !== undefined ? String(arr[i]) : "";
    v = stripSheetsQuotedText(v);
    return v;
  };
  return {
    ad: cell(0),
    kanal: cell(1),
    konu: cell(2),
    govde: cell(3),
  };
}

function templateToValues(r: CrmTemplateRow): string[][] {
  const q = (s: string) => {
    const u = s.replace(/^'+/, "");
    if (s && /^[=+\-@]/.test(u.trimStart())) return sheetsForcePlainText(s);
    return s;
  };
  return [[q(r.ad), q(r.kanal), q(r.konu), q(r.govde)]];
}

export async function listCrmLeads(): Promise<CrmLeadRowWithRow[]> {
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const name = getSheetCrmLeadsName();
  const { title } = await resolveSheetByTitle(sheets, spreadsheetId, name);
  const range = `${a1SheetName(title)}!A1:${LEADS_COL_LAST}`;
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const values = res.data.values ?? [];
  const start = crmLeadsDataStartIndex(values);
  const dataRows = values.slice(start);
  return dataRows.map((row, i) => ({
    row: i + start + 1,
    ...asLeadRow(row),
  }));
}

export async function appendCrmLead(row: CrmLeadRow): Promise<void> {
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const name = getSheetCrmLeadsName();
  const { title } = await resolveSheetByTitle(sheets, spreadsheetId, name);
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${a1SheetName(title)}!A1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: leadToValues(row) },
  });
}

export async function appendCrmLeadsBulk(rows: CrmLeadRow[]): Promise<void> {
  if (rows.length === 0) return;
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const name = getSheetCrmLeadsName();
  const { title } = await resolveSheetByTitle(sheets, spreadsheetId, name);
  const values = rows.map((r) => leadToValues(r)[0]);
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${a1SheetName(title)}!A1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values },
  });
}

export async function updateCrmLead(
  sheetRow: number,
  row: CrmLeadRow
): Promise<void> {
  if (sheetRow < 1) {
    throw new Error("Geçersiz satır numarası.");
  }
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const name = getSheetCrmLeadsName();
  const { title } = await resolveSheetByTitle(sheets, spreadsheetId, name);
  const range = `${a1SheetName(title)}!A${sheetRow}:${LEADS_COL_LAST}${sheetRow}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: leadToValues(row) },
  });
}

export async function deleteCrmLead(sheetRow: number): Promise<void> {
  if (sheetRow < 1) {
    throw new Error("Geçersiz satır numarası.");
  }
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const name = getSheetCrmLeadsName();
  const { sheetId } = await resolveSheetByTitle(sheets, spreadsheetId, name);
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

/** Tek batchUpdate = tek yazma kotası; satır başına ayrı çağrı dakikalık kotayı aşırır. */
const DELETE_ROWS_BATCH_CHUNK = 100;

async function deleteCrmSheetRows(
  sheetName: string,
  sheetRows: number[]
): Promise<void> {
  const unique = [...new Set(sheetRows)]
    .map((r) => Math.floor(Number(r)))
    .filter((r) => Number.isFinite(r) && r >= 1)
    .sort((a, b) => b - a);
  if (unique.length === 0) return;
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const { sheetId } = await resolveSheetByTitle(sheets, spreadsheetId, sheetName);
  for (let i = 0; i < unique.length; i += DELETE_ROWS_BATCH_CHUNK) {
    const chunk = unique.slice(i, i + DELETE_ROWS_BATCH_CHUNK);
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: chunk.map((sheetRow) => ({
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: sheetRow - 1,
              endIndex: sheetRow,
            },
          },
        })),
      },
    });
  }
}

export async function deleteCrmLeadsBulk(sheetRows: number[]): Promise<void> {
  await deleteCrmSheetRows(getSheetCrmLeadsName(), sheetRows);
}

export async function deleteCrmTemplatesBulk(sheetRows: number[]): Promise<void> {
  await deleteCrmSheetRows(getSheetCrmTemplatesName(), sheetRows);
}

export async function listCrmTemplates(): Promise<CrmTemplateRowWithRow[]> {
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const name = getSheetCrmTemplatesName();
  const { title } = await resolveSheetByTitle(sheets, spreadsheetId, name);
  const range = `${a1SheetName(title)}!A1:${TEMPLATE_COL_LAST}`;
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const values = res.data.values ?? [];
  const start = crmTemplatesDataStartIndex(values);
  const dataRows = values.slice(start);
  return dataRows.map((row, i) => ({
    row: i + start + 1,
    ...asTemplateRow(row),
  }));
}

export async function appendCrmTemplate(row: CrmTemplateRow): Promise<void> {
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const name = getSheetCrmTemplatesName();
  const { title } = await resolveSheetByTitle(sheets, spreadsheetId, name);
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${a1SheetName(title)}!A1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: templateToValues(row) },
  });
}

export async function updateCrmTemplate(
  sheetRow: number,
  row: CrmTemplateRow
): Promise<void> {
  if (sheetRow < 1) {
    throw new Error("Geçersiz satır numarası.");
  }
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const name = getSheetCrmTemplatesName();
  const { title } = await resolveSheetByTitle(sheets, spreadsheetId, name);
  const range = `${a1SheetName(title)}!A${sheetRow}:${TEMPLATE_COL_LAST}${sheetRow}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: templateToValues(row) },
  });
}

export async function deleteCrmTemplate(sheetRow: number): Promise<void> {
  if (sheetRow < 1) {
    throw new Error("Geçersiz satır numarası.");
  }
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const name = getSheetCrmTemplatesName();
  const { sheetId } = await resolveSheetByTitle(sheets, spreadsheetId, name);
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
