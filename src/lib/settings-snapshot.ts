import {
  getSheetCrmLeadsName,
  getSheetCrmTemplatesName,
  getSheetFinansName,
  getSheetMediaName,
  getSheetTasksName,
  getSheetWorkName,
} from "@/lib/env-sheets";

export type SettingsSnapshot = {
  hasServiceAccountJson: boolean;
  hasSpreadsheetId: boolean;
  sheetMediaName: string;
  sheetTasksName: string;
  sheetWorkName: string;
  sheetFinansName: string;
  sheetCrmLeadsName: string;
  sheetCrmTemplatesName: string;
  crmDiscoveryNote: string;
};

export function getSettingsSnapshot(): SettingsSnapshot {
  const hasFile = Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON_FILE?.trim()
  );
  const hasInline = Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim());
  return {
    hasServiceAccountJson: hasInline || hasFile,
    hasSpreadsheetId: Boolean(process.env.GOOGLE_SPREADSHEET_ID?.trim()),
    sheetMediaName: getSheetMediaName(),
    sheetTasksName: getSheetTasksName(),
    sheetWorkName: getSheetWorkName(),
    sheetFinansName: getSheetFinansName(),
    sheetCrmLeadsName: getSheetCrmLeadsName(),
    sheetCrmTemplatesName: getSheetCrmTemplatesName(),
    crmDiscoveryNote:
      "CRM keşfi OpenStreetMap + Overpass kullanır; API anahtarı gerekmez. Kota için bbox ve arama sıklığını sınırlayın.",
  };
}
