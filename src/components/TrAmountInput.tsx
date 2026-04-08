import type { InputHTMLAttributes } from "react";
import { normalizeTrAmountInput } from "@/lib/tr-amount-input";

type TrAmountInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "inputMode"
> & {
  value: string;
  onValueChange: (value: string) => void;
};

export function TrAmountInput({
  value,
  onValueChange,
  className,
  placeholder = "10.000",
  ...rest
}: TrAmountInputProps) {
  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      spellCheck={false}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onValueChange(normalizeTrAmountInput(e.target.value))}
      className={className}
    />
  );
}
