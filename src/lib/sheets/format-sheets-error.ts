/** Google Sheets / Drive API hatalarını kullanıcıya anlaşılır Türkçe metne çevirir. */
export function formatSheetsApiError(e: unknown): string {
  let raw = "";
  if (e instanceof Error) {
    raw = e.message;
  } else if (typeof e === "object" && e !== null && "message" in e) {
    raw = String((e as { message: unknown }).message);
  } else {
    raw = String(e);
  }

  const lower = raw.toLowerCase();

  if (
    lower.includes("does not have permission") ||
    lower.includes("permission denied") ||
    lower.includes("insufficient permission") ||
    lower.includes("forbidden")
  ) {
    return [
      "Google Sheets bu isteğe izin vermiyor (403).",
      "Çözüm: Hedef e-tabloyu Google Sheets’te açın → Paylaş → Service Account e-postasını (JSON’daki client_email, örn. …@….iam.gserviceaccount.com) Düzenleyici olarak ekleyin.",
      "Spreadsheet ID’nin o dosyanın adres çubuğundaki /d/.../edit ile aynı olduğundan emin olun (Drive klasör linki değil).",
    ].join(" ");
  }

  if (
    lower.includes("not found") ||
    lower.includes("requested entity was not found") ||
    lower.includes("unable to parse range")
  ) {
    return [
      "E-tablo veya sekme bulunamadı.",
      "GOOGLE_SPREADSHEET_ID ve SHEET_* sekme adlarını kontrol edin; ilk satırda başlıklar README’deki sırayla olmalıdır.",
    ].join(" ");
  }

  return raw;
}
