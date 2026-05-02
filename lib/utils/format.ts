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
