import Link from "next/link";
import { getLeagueComputation } from "@/lib/data/score-service";
import { getCaptainWindows } from "@/lib/data/seed";
import {
  PlayersDirectory,
  type PlayerDirectoryRow,
} from "@/components/players-directory";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  console.info("[players-page] Building player directory page");
  const result = await getLeagueComputation(false);
  const captainWindows = getCaptainWindows();

  const rows: PlayerDirectoryRow[] = result.snapshot.standings.flatMap((team) =>
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

  console.info("[players-page] Player directory prepared", {
    generatedAt: result.generatedAt,
    rows: rows.length,
  });

  return (
    <main className="flex flex-col gap-4 pb-10 md:gap-5">
      <header className="glass-card-strong rounded-[1.75rem] p-5 md:p-6">
        <p className="muted-label">Players</p>
        <h1 className="section-title mt-2">Player List</h1>
        <p className="mt-2 text-sm text-slate-600">
          Search and filter player rows by IPL team and fantasy team, sorted by
          points. Base points are default; C/VC-adjusted points are optional.
        </p>
      </header>

      <PlayersDirectory rows={rows} />

      <Link href="/" className="back-link">
        ← Back to leaderboard
      </Link>
    </main>
  );
}
