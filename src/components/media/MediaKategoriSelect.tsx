"use client";

import {
  MEDIA_KATEGORILER,
  MEDIA_KAT_DIGER,
  MEDIA_KAT_GORUNTU,
  MEDIA_KAT_METIN,
  MEDIA_KAT_SES,
} from "@/lib/constants";

export function MediaKategoriSelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const known = new Set<string>([...MEDIA_KATEGORILER]);
  const unknown =
    value.trim() !== "" && !known.has(value);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    >
      <optgroup label="Görüntülü">
        {MEDIA_KAT_GORUNTU.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </optgroup>
      <optgroup label="Ses">
        {MEDIA_KAT_SES.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </optgroup>
      <optgroup label="Metin">
        {MEDIA_KAT_METIN.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </optgroup>
      <optgroup label="Diğer">
        {MEDIA_KAT_DIGER.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </optgroup>
      {unknown ? (
        <optgroup label="Sheet'ten gelen">
          <option value={value}>{value}</option>
        </optgroup>
      ) : null}
    </select>
  );
}
