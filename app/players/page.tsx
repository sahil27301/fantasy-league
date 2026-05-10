import Link from "next/link";
import { getLeagueComputation } from "@/lib/data/score-service";
import { getCaptainWindows } from "@/lib/data/seed";
import { fetchLivePlayers } from "@/lib/ipl/client";
import {
  PlayersDirectory,
  type PlayerDirectoryRow,
} from "@/components/players-directory";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  console.info("[players-page] Building player directory page");
  const [result, livePlayers] = await Promise.all([
    getLeagueComputation(false),
    fetchLivePlayers(),
  ]);
  const captainWindows = getCaptainWindows();

  const ownedRows: PlayerDirectoryRow[] = result.snapshot.standings.flatMap((team) =>
    team.contributors.map((player) => ({
      fantasyTeamId: team.leagueTeamId,
      fantasyTeamName: team.displayName,
      fantasyOwnerName: team.ownerName,
      playerId: player.playerId,
      playerName: player.playerName,
      iplTeamShortName: player.teamShortName,
      basePoints: player.overallPoints,
      boostedPoints: player.pointsAfterMultiplier,
      captainWindows: captainWindows
        .filter(
          (window) =>
            window.leagueTeamId === team.leagueTeamId &&
            window.captainPlayerId === player.playerId &&
            window.windowIndex <= 2,
        )
        .map((window) => window.windowIndex)
        .sort((a, b) => a - b),
      viceCaptainWindows: captainWindows
        .filter(
          (window) =>
            window.leagueTeamId === team.leagueTeamId &&
            window.viceCaptainPlayerId === player.playerId &&
            window.windowIndex <= 2,
        )
        .map((window) => window.windowIndex)
        .sort((a, b) => a - b),
    })),
  );
  const ownedPlayerIds = new Set(ownedRows.map((row) => row.playerId));
  const unownedRows: PlayerDirectoryRow[] = livePlayers
    .filter((player) => !ownedPlayerIds.has(player.id))
    .map((player) => ({
      fantasyTeamId: `unowned-${player.id}`,
      fantasyTeamName: "Unowned",
      fantasyOwnerName: "Unowned",
      playerId: player.id,
      playerName: player.shortName,
      iplTeamShortName: player.teamShortName,
      basePoints: player.overallPoints,
      boostedPoints: player.overallPoints,
      captainWindows: [],
      viceCaptainWindows: [],
    }));
  const rows: PlayerDirectoryRow[] = [...ownedRows, ...unownedRows];

  console.info("[players-page] Player directory prepared", {
    generatedAt: result.generatedAt,
    rows: rows.length,
    ownedRows: ownedRows.length,
    unownedRows: unownedRows.length,
  });

  return (
    <main className="flex flex-col gap-4 pb-10 md:gap-5">
      <header className="glass-card-strong rounded-[1.75rem] p-5 md:p-6">
        <p className="muted-label">Players</p>
        <h1 className="section-title mt-2">Player List</h1>
        <p className="mt-2 text-sm text-slate-600">
          Search and filter all IPL players by IPL team and fantasy team, sorted
          by points. Base points are default; C/VC-adjusted points are optional.
        </p>
      </header>

      <PlayersDirectory rows={rows} />

      <Link href="/" className="back-link">
        ← Back to leaderboard
      </Link>
    </main>
  );
}
