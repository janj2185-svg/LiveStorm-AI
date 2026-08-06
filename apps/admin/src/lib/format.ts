export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat(undefined).format(value);
}

export function formatMinorCurrency(minor: number | null | undefined, currency = "USD"): string {
  if (minor === null || minor === undefined || Number.isNaN(minor)) return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(minor / 100);
}

export function formatMicrosUsd(micros: number | null | undefined): string {
  if (micros === null || micros === undefined || Number.isNaN(micros)) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 4,
  }).format(micros / 1_000_000);
}

export function titleCase(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
