import type { InputHTMLAttributes } from "react";
import { normalizeTrDayMonthInput } from "@/lib/tr-date-input";

type TrDayMonthInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "inputMode"
> & {
  value: string;
  onValueChange: (value: string) => void;
};

export function TrDayMonthInput({
  value,
  onValueChange,
  className,
  placeholder = "gg.aa",
  ...rest
}: TrDayMonthInputProps) {
  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      spellCheck={false}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onValueChange(normalizeTrDayMonthInput(e.target.value))}
      className={className}
    />
  );
}
