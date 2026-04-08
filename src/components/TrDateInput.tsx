import type { InputHTMLAttributes } from "react";
import { normalizeTrDateInput } from "@/lib/tr-date-input";

type TrDateInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "inputMode"
> & {
  value: string;
  onValueChange: (value: string) => void;
};

export function TrDateInput({
  value,
  onValueChange,
  className,
  placeholder = "gg.aa.yyyy",
  ...rest
}: TrDateInputProps) {
  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      spellCheck={false}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onValueChange(normalizeTrDateInput(e.target.value))}
      className={className}
    />
  );
}
