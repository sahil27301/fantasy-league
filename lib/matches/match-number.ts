const PLAYOFF_MATCH_NUMBER_BY_NAME: Record<string, number> = {
  qualifier1: 71,
  eliminator: 72,
  qualifier2: 73,
  final: 74,
};

function normalizeMatchLabel(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function resolveMatchNumberFromName(matchName: string): number | null {
  const numberedMatch = matchName.match(/match\s+(\d+)/i);
  if (numberedMatch) {
    return Number(numberedMatch[1]);
  }

  const normalized = normalizeMatchLabel(matchName);
  for (const [label, matchNumber] of Object.entries(PLAYOFF_MATCH_NUMBER_BY_NAME)) {
    if (normalized.includes(label)) {
      return matchNumber;
    }
  }

  return null;
}
