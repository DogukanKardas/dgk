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

  if (lower.includes("sayfa bulunamadı")) {
    return [
      raw,
      "Sheets’te bu isimde bir sekme yok veya .env’deki ad eşleşmiyor: sekme adı birebir aynı olmalı (boşluk, büyük/küçük harf, tire). CRM için SHEET_CRM_LEADS_NAME ve SHEET_CRM_TEMPLATES_NAME değerlerini kontrol edin.",
    ].join(" ");
  }

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
    const apiSnippet =
      raw.length > 0 && raw.length <= 240 && !raw.includes("\n")
        ? ` Google API: ${raw}`
        : "";
    return [
      "E-tablo veya sekme bulunamadı." + apiSnippet,
      "Not: Kimlik doğru görünüp de bu hata sürüyorsa Google bazen erişim yokluğunu da 404 ile döndürür; Service Account e-postasını tabloda Düzenleyici olarak paylaştığınızdan emin olun.",
      "Kontrol listesi: (1) GOOGLE_SPREADSHEET_ID, adres çubuğundaki /spreadsheets/d/…/edit kimliği ile aynı mı? (2) Service Account e-postası bu dosyada Düzenleyici mi?",
      "(3) Sayfa adları .env’deki isimlerle birebir aynı mı? Medya, Görevler, İş, Finans; CRM için SHEET_CRM_LEADS_NAME (varsayılan CRM_Leads) ve SHEET_CRM_TEMPLATES_NAME (varsayılan CRM_Sablonlar) sekmelerini oluşturun.",
      "(4) İlk satır başlık ise sütun sırası README’deki CRM / diğer modüllerle uyumlu olmalıdır.",
    ].join(" ");
  }

  return raw;
}
