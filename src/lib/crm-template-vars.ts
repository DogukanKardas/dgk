/** Şablon değişkenleri: {{isletme_adi}}, {{adres}}, {{telefon}}, {{web}} */

export type CrmTemplateLeadContext = {
  ad: string;
  adres: string;
  telefon: string;
  webSitesi: string;
};

export function applyCrmTemplateVars(
  text: string,
  ctx: CrmTemplateLeadContext
): string {
  let s = text;
  s = s.replace(/\{\{isletme_adi\}\}/gi, ctx.ad ?? "");
  s = s.replace(/\{\{adres\}\}/gi, ctx.adres ?? "");
  s = s.replace(/\{\{telefon\}\}/gi, ctx.telefon ?? "");
  s = s.replace(/\{\{web\}\}/gi, ctx.webSitesi ?? "");
  return s;
}
