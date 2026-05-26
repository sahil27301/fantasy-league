import { getSupabaseServerClient } from "@/lib/db/server";
import { getCaptainWindows, getLeagueTeams, getNormalizedRoster } from "@/lib/data/seed";
import type { ScoreComputationResult } from "@/lib/types";

interface SnapshotPayloadRow {
  snapshot_at: string;
  match_number: number;
  payload: ScoreComputationResult;
}

export async function persistScoreComputation(result: ScoreComputationResult) {
  const client = getSupabaseServerClient();
  if (!client) {
    return;
  }

  const snapshotAt = result.snapshot.snapshotAt;
  const matchNumber = result.snapshot.matchNumber;
  const standings = result.snapshot.standings;

  console.info("[snapshot-repo] Persisting score computation", {
    snapshotAt,
    matchNumber,
    teamCount: standings.length,
  });

  // Ensure FK parent rows exist before snapshot inserts.
  const leagueTeams = getLeagueTeams();
  const leagueTeamRows = leagueTeams.map((team) => ({
    id: team.id,
    name: team.displayName,
    owner_name: team.ownerName,
  }));

  const leagueTeamsWrite = await client
    .from("league_teams")
    .upsert(leagueTeamRows, { onConflict: "id" });

  if (leagueTeamsWrite.error) {
    console.error("[snapshot-repo] Failed to upsert league teams", {
      error: leagueTeamsWrite.error.message,
    });
    throw new Error("Failed to ensure league teams for snapshot persistence");
  }

  // Keep league roster config durable as well.
  const ownerToTeamId = new Map(
    leagueTeams.map((team) => [team.ownerName.toLowerCase(), team.id]),
  );
  const roster = getNormalizedRoster();
  const captainWindows = getCaptainWindows();

  const rosterDedupMap = new Map<
    string,
    {
      league_team_id: string;
      player_id: number;
      team_id: number;
      display_name: string;
      active_from_match: number;
      active_to_match: number;
    }
  >();

  for (const entry of roster) {
    const leagueTeamId = ownerToTeamId.get(entry.ownerName.toLowerCase());
    if (!leagueTeamId) {
      continue;
    }

    const activeFromMatch = entry.windowIndex === 1 ? 1 : entry.windowIndex === 2 ? 36 : 71;
    const activeToMatch = entry.windowIndex === 1 ? 35 : entry.windowIndex === 2 ? 70 : 999;
    const key = `${leagueTeamId}:${entry.resolvedPlayerId}:${activeFromMatch}:${activeToMatch}`;
    if (rosterDedupMap.has(key)) {
      continue;
    }
    rosterDedupMap.set(key, {
      league_team_id: leagueTeamId,
      player_id: entry.resolvedPlayerId,
      team_id: entry.resolvedTeamId,
      display_name: entry.playerNameNormalized,
      active_from_match: activeFromMatch,
      active_to_match: activeToMatch,
    });
  }

  const rosterRows = [...rosterDedupMap.values()];
  const captainWindowDedupMap = new Map<
    string,
    {
      league_team_id: string;
      window_index: number;
      from_match: number;
      to_match: number;
      captain_player_id: number;
      vice_captain_player_id: number;
    }
  >();
  for (const entry of captainWindows) {
    const key = `${entry.leagueTeamId}:${entry.windowIndex}`;
    captainWindowDedupMap.set(key, {
      league_team_id: entry.leagueTeamId,
      window_index: entry.windowIndex,
      from_match: entry.fromMatch,
      to_match: entry.toMatch,
      captain_player_id: entry.captainPlayerId,
      vice_captain_player_id: entry.viceCaptainPlayerId,
    });
  }
  const captainWindowRows = [...captainWindowDedupMap.values()];

  const teamIds = leagueTeams.map((team) => team.id);
  const deleteRoster = await client
    .from("league_team_players")
    .delete()
    .in("league_team_id", teamIds);

  if (deleteRoster.error) {
    console.error("[snapshot-repo] Failed clearing config rows before sync", {
      rosterDeleteError: deleteRoster.error?.message ?? null,
    });
    throw new Error("Failed to clear existing roster rows");
  }

  const [rosterWrite, captainWindowsWrite] = await Promise.all([
    client.from("league_team_players").insert(rosterRows),
    client
      .from("captain_windows")
      .upsert(captainWindowRows, { onConflict: "league_team_id,window_index" }),
  ]);

  if (rosterWrite.error || captainWindowsWrite.error) {
    console.error("[snapshot-repo] Failed syncing roster/captain config rows", {
      rosterError: rosterWrite.error?.message ?? null,
      captainWindowsError: captainWindowsWrite.error?.message ?? null,
    });
    throw new Error("Failed to sync league roster/captain windows");
  }

  const teamRows = standings.map((standing) => ({
    snapshot_at: snapshotAt,
    match_number: matchNumber,
    league_team_id: standing.leagueTeamId,
    total_points: standing.totalPoints,
    rank: standing.rank,
  }));

  const playerMap = new Map<number, number>();
  for (const standing of standings) {
    for (const contributor of standing.contributors) {
      playerMap.set(contributor.playerId, contributor.overallPoints);
    }
  }
  const playerRows = [...playerMap.entries()].map(([playerId, overallPoints]) => ({
    snapshot_at: snapshotAt,
    match_number: matchNumber,
    player_id: playerId,
    overall_points: overallPoints,
  }));

  const payloadRow: SnapshotPayloadRow = {
    snapshot_at: snapshotAt,
    match_number: matchNumber,
    payload: result,
  };

  const [teamWrite, playerWrite, payloadWrite] = await Promise.all([
    client
      .from("team_score_snapshots")
      .upsert(teamRows, { onConflict: "snapshot_at,league_team_id" }),
    client
      .from("player_points_snapshots")
      .upsert(playerRows, { onConflict: "snapshot_at,player_id" }),
    client
      .from("score_snapshot_payloads")
      .upsert(payloadRow, { onConflict: "snapshot_at" }),
  ]);

  if (teamWrite.error || playerWrite.error || payloadWrite.error) {
    console.error("[snapshot-repo] Failed to persist computation", {
      teamError: teamWrite.error?.message ?? null,
      playerError: playerWrite.error?.message ?? null,
      payloadError: payloadWrite.error?.message ?? null,
    });
    throw new Error("Failed to persist score computation to Supabase");
  }
}

export async function fetchLatestScoreComputation(): Promise<ScoreComputationResult | null> {
  const client = getSupabaseServerClient();
  if (!client) {
    return null;
  }

  const { data, error } = await client
    .from("score_snapshot_payloads")
    .select("payload,snapshot_at")
    .order("snapshot_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[snapshot-repo] Failed to fetch latest payload", {
      error: error.message,
    });
    return null;
  }

  if (!data?.payload) {
    return null;
  }

  return data.payload as ScoreComputationResult;
}
