import type { InputHTMLAttributes } from "react";
import { normalizeTrPhoneInput } from "@/lib/tr-phone-input";

type TrPhoneInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "inputMode"
> & {
  value: string;
  onValueChange: (value: string) => void;
};

export function TrPhoneInput({
  value,
  onValueChange,
  className,
  placeholder = "05XX XXX XX XX",
  ...rest
}: TrPhoneInputProps) {
  return (
    <input
      {...rest}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      value={value}
      onChange={(e) => onValueChange(normalizeTrPhoneInput(e.target.value))}
      className={className}
      placeholder={placeholder}
    />
  );
}
