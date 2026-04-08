"use client";

import {
  MEDIA_TURLER,
  MEDIA_TURLER_BESERI,
  MEDIA_TURLER_GENEL,
  MEDIA_TURLER_SANAT,
  MEDIA_TURLER_STEM,
  MEDIA_TURLER_YASAM,
} from "@/lib/constants";

export function MediaTurSelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const known = new Set(MEDIA_TURLER);
  const unknown = value.trim() !== "" && !known.has(value);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    >
      <optgroup label="Genel">
        {MEDIA_TURLER_GENEL.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </optgroup>
      <optgroup label="Bilim & teknoloji">
        {MEDIA_TURLER_STEM.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </optgroup>
      <optgroup label="Beşeri bilimler & toplum">
        {MEDIA_TURLER_BESERI.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </optgroup>
      <optgroup label="Sanat & edebiyat">
        {MEDIA_TURLER_SANAT.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </optgroup>
      <optgroup label="Yaşam & güncel">
        {MEDIA_TURLER_YASAM.map((k) => (
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
