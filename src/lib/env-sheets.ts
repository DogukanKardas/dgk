export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export function getSpreadsheetId(): string {
  return requireEnv("GOOGLE_SPREADSHEET_ID");
}

export function getSheetMediaName(): string {
  return process.env.SHEET_MEDIA_NAME ?? "Medya";
}

export function getSheetTasksName(): string {
  return process.env.SHEET_TASKS_NAME ?? "Görevler";
}

export function getSheetWorkName(): string {
  return process.env.SHEET_WORK_NAME ?? "İş";
}

export function getSheetFinansName(): string {
  return process.env.SHEET_FINANS_NAME ?? "Finans";
}
