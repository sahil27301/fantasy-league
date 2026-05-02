import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";

const INPUT_PATH = process.argv[2];

if (!INPUT_PATH) {
  console.error("Usage: node scripts/normalize-csv.mjs <csv-file-path>");
  process.exit(1);
}

const root = process.cwd();
const teamFilePath = path.join(root, "data", "league-teams.json");
const rosterOutputPath = path.join(root, "data", "normalized_roster.json");
const captainOutputPath = path.join(root, "data", "captain_windows.json");
const unmatchedOutputPath = path.join(root, "data", "unmatched_or_ambiguous.csv");
const aliasesPath = path.join(root, "data", "player_aliases.json");
const confirmationsOutputPath = path.join(
  root,
  "data",
  "player_name_confirmations.json",
);

const windowRanges = {
  1: { fromMatch: 1, toMatch: 35 },
  2: { fromMatch: 36, toMatch: 70 },
  3: { fromMatch: 71, toMatch: 999 },
};

const livePlayersUrl =
  "https://fantasy.iplt20.com/classic/api/feed/live/gamedayplayers?lang=en&tourgamedayId=33&teamgamedayId=33";

function normalizeText(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function cleanPlayerName(name) {
  return name.replace(/\s*2\.0\s*$/i, "").trim();
}

function canonicalPlayerName(name, aliasMap) {
  const normalized = normalizeText(name);
  const canonical = aliasMap[normalized];
  return canonical ?? name;
}

function inferRole(rawRole) {
  const role = rawRole.toLowerCase();
  if (role.includes("vice")) {
    return "viceCaptain";
  }
  if (role.includes("captain")) {
    return "captain";
  }
  return "normal";
}

function rolePriority(role) {
  if (role === "captain") {
    return 3;
  }
  if (role === "viceCaptain") {
    return 2;
  }
  return 1;
}

function inferRoleWindowHints(rawRole) {
  const loweredRole = rawRole.toLowerCase();
  if (loweredRole.includes("1 & 2")) {
    return [1, 2];
  }
  const hints = [];
  if (/(^|[^0-9])1([^0-9]|$)/.test(loweredRole)) {
    hints.push(1);
  }
  if (/(^|[^0-9])2([^0-9]|$)/.test(loweredRole)) {
    hints.push(2);
  }
  return hints;
}

function inferWindows(rawName, rawRole) {
  const roleWindowHints = inferRoleWindowHints(rawRole);
  const loweredRole = rawRole.toLowerCase();
  const isDual = loweredRole.includes("1 & 2");
  const fromName = /\s2\.0\s*$/i.test(rawName) ? 2 : null;

  if (isDual) {
    return { windows: [1, 2], roleWindowHints };
  }

  if (fromName) {
    return { windows: [fromName], roleWindowHints };
  }
  if (roleWindowHints.length === 1) {
    return { windows: [roleWindowHints[0]], roleWindowHints };
  }

  // Default behavior: if no explicit window marker is present,
  // player is assumed retained across both pre-playoff windows.
  return { windows: [1, 2], roleWindowHints };
}

function resolvePlayer(normalizedName, teamShortName, candidates) {
  const normalizedNeedle = normalizeText(normalizedName);
  const teamCandidates = candidates.filter(
    (candidate) => candidate.TeamShortName.toUpperCase() === teamShortName.toUpperCase(),
  );

  const exact = teamCandidates.find(
    (candidate) => normalizeText(candidate.ShortName) === normalizedNeedle,
  );
  if (exact) {
    return { confidence: "high", player: exact, reason: "exact_confirmed" };
  }

  return { confidence: "low", player: null, reason: "unresolved" };
}

function ownerToTeamId(ownerName, teams) {
  const team = teams.find(
    (item) => item.ownerName.toLowerCase() === ownerName.toLowerCase(),
  );
  return team?.id ?? null;
}

async function main() {
  console.info("[normalize-csv] Starting normalization", { inputPath: INPUT_PATH });
  const [csvRaw, teamsRaw, aliasesRaw, playersResponse] = await Promise.all([
    fs.readFile(INPUT_PATH, "utf-8"),
    fs.readFile(teamFilePath, "utf-8"),
    fs.readFile(aliasesPath, "utf-8").catch(() => "{}"),
    fetch(livePlayersUrl),
  ]);

  if (!playersResponse.ok) {
    throw new Error(`Failed to fetch live players (${playersResponse.status})`);
  }

  const playersPayload = await playersResponse.json();
  const livePlayers = playersPayload?.Data?.Value?.Players ?? [];
  const teams = JSON.parse(teamsRaw);
  const aliases = JSON.parse(aliasesRaw);
  const aliasMap = aliases?.aliases ?? {};
  const rows = parse(csvRaw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });

  const normalized = [];
  const unresolvedRows = [];
  const confirmations = new Map();

  rows.forEach((row, index) => {
    const sourceRow = index + 2;
    const ownerName = (row["Team"] ?? "").trim();
    const playerNameRaw = (row["Player Name"] ?? "").trim();
    const roleRaw = (row["Role"] ?? "").trim();
    const iplTeamShortName = (row["IPL Team"] ?? "").trim().toUpperCase();

    if (!ownerName || !playerNameRaw || !iplTeamShortName) {
      return;
    }

    const { windows, roleWindowHints } = inferWindows(playerNameRaw, roleRaw);
    if (windows.length === 0) {
      unresolvedRows.push({
        sourceRow,
        ownerName,
        playerNameRaw,
        iplTeamShortName,
        reason: "window_conflict",
      });
      return;
    }

    const cleanedName = cleanPlayerName(playerNameRaw);
    const playerNameNormalized = canonicalPlayerName(cleanedName, aliasMap);
    const inferredRole = inferRole(roleRaw);
    const resolved = resolvePlayer(playerNameNormalized, iplTeamShortName, livePlayers);

    windows.forEach((windowIndex) => {
      if (!resolved.player) {
        unresolvedRows.push({
          sourceRow,
          ownerName,
          playerNameRaw,
          iplTeamShortName,
          reason: "no_player_match",
        });
        return;
      }

      const role =
        inferredRole !== "normal" &&
        roleWindowHints.length > 0 &&
        !roleWindowHints.includes(windowIndex)
          ? "normal"
          : inferredRole;

      normalized.push({
        ownerName,
        playerNameRaw,
        playerNameNormalized,
        iplTeamShortName,
        windowIndex,
        captaincyRole: role,
        sourceRow,
        matchConfidence: resolved.confidence,
        resolvedPlayerId: resolved.player.Id,
        resolvedTeamId: resolved.player.TeamId,
      });

      const key = `${normalizeText(playerNameNormalized)}::${iplTeamShortName}`;
      if (!confirmations.has(key)) {
        confirmations.set(key, {
          csvPlayerName: playerNameNormalized,
          csvTeamShortName: iplTeamShortName,
          apiPlayerName: resolved.player.ShortName,
          apiTeamName: resolved.player.TeamName,
          apiTeamShortName: resolved.player.TeamShortName,
          resolvedPlayerId: resolved.player.Id,
          resolvedTeamId: resolved.player.TeamId,
          confirmationMethod: "exact_normalized_name_and_team",
        });
      }
    });
  });

  // Deduplicate same owner + player + window by keeping the highest-priority role.
  const dedupedMap = new Map();
  for (const entry of normalized) {
    const key = `${entry.ownerName.toLowerCase()}::${entry.resolvedPlayerId}::${entry.windowIndex}`;
    const existing = dedupedMap.get(key);
    if (!existing || rolePriority(entry.captaincyRole) > rolePriority(existing.captaincyRole)) {
      dedupedMap.set(key, entry);
    }
  }
  const dedupedNormalized = [...dedupedMap.values()];

  const captainWindows = [];
  const owners = [...new Set(dedupedNormalized.map((entry) => entry.ownerName))];
  owners.forEach((ownerName) => {
    const leagueTeamId = ownerToTeamId(ownerName, teams);
    if (!leagueTeamId) {
      unresolvedRows.push({
        sourceRow: 0,
        ownerName,
        playerNameRaw: "",
        iplTeamShortName: "",
        reason: "unknown_owner",
      });
      return;
    }

    [1, 2].forEach((windowIndex) => {
      const windowEntries = dedupedNormalized.filter(
        (entry) => entry.ownerName === ownerName && entry.windowIndex === windowIndex,
      );
      const captains = windowEntries.filter((entry) => entry.captaincyRole === "captain");
      const viceCaptains = windowEntries.filter(
        (entry) => entry.captaincyRole === "viceCaptain",
      );
      const captain = captains[0];
      const viceCaptain = viceCaptains[0];

      if (!captain || !viceCaptain || captains.length !== 1 || viceCaptains.length !== 1) {
        unresolvedRows.push({
          sourceRow: 0,
          ownerName,
          playerNameRaw: "",
          iplTeamShortName: "",
          reason: `invalid_captain_or_vc_count_window_${windowIndex}`,
        });
        return;
      }

      captainWindows.push({
        leagueTeamId,
        windowIndex,
        fromMatch: windowRanges[windowIndex].fromMatch,
        toMatch: windowRanges[windowIndex].toMatch,
        captainPlayerId: captain.resolvedPlayerId,
        viceCaptainPlayerId: viceCaptain.resolvedPlayerId,
      });
    });
  });

  await fs.writeFile(rosterOutputPath, JSON.stringify(dedupedNormalized, null, 2));
  await fs.writeFile(captainOutputPath, JSON.stringify(captainWindows, null, 2));
  await fs.writeFile(
    confirmationsOutputPath,
    JSON.stringify([...confirmations.values()], null, 2),
  );

  const unmatchedHeader = "sourceRow,ownerName,playerNameRaw,iplTeamShortName,reason\n";
  const unmatchedBody = unresolvedRows
    .map(
      (row) =>
        `${row.sourceRow},${row.ownerName},${row.playerNameRaw},${row.iplTeamShortName},${row.reason}`,
    )
    .join("\n");
  await fs.writeFile(unmatchedOutputPath, unmatchedHeader + unmatchedBody);

  console.info("[normalize-csv] Normalization summary", {
    mode: "strict_api_confirmed_matching_only",
    normalizedRecords: dedupedNormalized.length,
    confirmedPlayerMappings: confirmations.size,
    captainWindows: captainWindows.length,
    unresolvedRows: unresolvedRows.length,
    rosterOutputPath,
    captainOutputPath,
    confirmationsOutputPath,
    unmatchedOutputPath,
  });

  if (unresolvedRows.length > 0) {
    throw new Error(
      `Normalization blocked due to ${unresolvedRows.length} unresolved records. Check unmatched_or_ambiguous.csv`,
    );
  }
}

main().catch((error) => {
  console.error("[normalize-csv] Failed", { message: error.message });
  process.exit(1);
});
