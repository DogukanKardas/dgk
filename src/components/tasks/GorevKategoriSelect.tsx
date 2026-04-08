"use client";

import {
  GOREV_KATEGORILER,
  GOREV_KATEGORILER_DIGER,
  GOREV_KATEGORILER_SIRKET,
} from "@/lib/constants";

export function GorevKategoriSelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const unknown =
    value.trim() !== "" &&
    !GOREV_KATEGORILER.some((k) => k === value);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    >
      <optgroup label="Şirket">
        {GOREV_KATEGORILER_SIRKET.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </optgroup>
      <optgroup label="Gündelik / diğer">
        {GOREV_KATEGORILER_DIGER.map((k) => (
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
