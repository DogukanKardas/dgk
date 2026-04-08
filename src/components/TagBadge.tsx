export function TagBadge({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span
      className={`inline-flex max-w-full truncate rounded-md border px-2 py-0.5 text-xs font-medium ${className}`}
      title={label}
    >
      {label || "—"}
    </span>
  );
}
