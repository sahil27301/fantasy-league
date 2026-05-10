export function formatPoints(value: number) {
  return Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatDelta(value: number) {
  if (value > 0) {
    return `↑ ${value}`;
  }
  if (value < 0) {
    return `↓ ${Math.abs(value)}`;
  }
  return "→ 0";
}

function parseDateValue(value: string | number | Date): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const slashDateMatch =
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
  if (slashDateMatch) {
    const month = Number(slashDateMatch[1]);
    const day = Number(slashDateMatch[2]);
    const year = Number(slashDateMatch[3]);
    const hour = Number(slashDateMatch[4]);
    const minute = Number(slashDateMatch[5]);
    const second = Number(slashDateMatch[6] ?? "0");
    const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    return Number.isNaN(utcDate.getTime()) ? null : utcDate;
  }

  const hasTimezone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed);
  const normalized = trimmed.includes(" ") ? trimmed.replace(" ", "T") : trimmed;
  const isoCandidate = hasTimezone ? normalized : `${normalized}Z`;
  const isoDate = new Date(isoCandidate);
  if (!Number.isNaN(isoDate.getTime())) {
    return isoDate;
  }

  const fallbackDate = new Date(trimmed);
  return Number.isNaN(fallbackDate.getTime()) ? null : fallbackDate;
}

export function formatDateTimeIST(
  value: string | number | Date | null | undefined,
  fallback = "Time unavailable",
) {
  if (value === null || value === undefined) {
    return fallback;
  }
  const parsed = parseDateValue(value);
  if (!parsed) {
    return fallback;
  }
  const formatted = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(parsed);
  return `${formatted} IST`;
}
