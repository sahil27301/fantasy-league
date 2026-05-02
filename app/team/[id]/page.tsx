import Link from "next/link";
import { notFound } from "next/navigation";
import { getLeagueComputation } from "@/lib/data/score-service";
import { getCaptainWindows, getNormalizedRoster } from "@/lib/data/seed";
import { getMatchProgression } from "@/lib/progression/match-progression";
import { formatPoints } from "@/lib/utils/format";
import { TeamLeadershipBreakdown } from "@/components/team-leadership-breakdown";

export const dynamic = "force-dynamic";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getLeagueComputation(false);
  const progression = await getMatchProgression(false);
  const team = result.snapshot.standings.find((standing) => standing.leagueTeamId === id);
  const insight = result.teamInsights.find((item) => item.leagueTeamId === id);
  const progressionTeam = progression.teams.find((entry) => entry.leagueTeamId === id);

  if (!team || !insight || !progressionTeam) {
    notFound();
  }

  const roster = getNormalizedRoster().filter(
    (entry) => entry.ownerName.toLowerCase() === team.ownerName.toLowerCase(),
  );
  const nameByPlayerId = new Map<number, string>();
  for (const entry of roster) {
    if (!nameByPlayerId.has(entry.resolvedPlayerId)) {
      nameByPlayerId.set(entry.resolvedPlayerId, entry.playerNameNormalized);
    }
  }

  const windowBonusByIndex = new Map(
    (progressionTeam.windowBonuses ?? []).map((window) => [window.windowIndex, window]),
  );
  const leadershipWindows = getCaptainWindows()
    .filter((window) => window.leagueTeamId === id && window.windowIndex <= 2)
    .sort((a, b) => a.windowIndex - b.windowIndex)
    .map((window) => ({
      windowIndex: window.windowIndex,
      fromMatch: window.fromMatch,
      toMatch: window.toMatch,
      captainName: nameByPlayerId.get(window.captainPlayerId) ?? `Player ${window.captainPlayerId}`,
      viceCaptainName:
        nameByPlayerId.get(window.viceCaptainPlayerId) ?? `Player ${window.viceCaptainPlayerId}`,
      captainBonus: windowBonusByIndex.get(window.windowIndex)?.captainBonus ?? 0,
      viceCaptainBonus: windowBonusByIndex.get(window.windowIndex)?.viceCaptainBonus ?? 0,
    }));

  return (
    <main className="flex flex-col gap-5 pb-10">
      <div className="glass-card-strong rounded-3xl p-5">
        <p className="muted-label">Team Overview</p>
        <h1 className="section-title mt-2">{team.displayName}</h1>
        <p className="text-sm text-slate-500">Owner: {team.ownerName}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-2xl bg-white/75 p-3">
            <p className="text-slate-500">Total</p>
            <p className="text-lg font-semibold">{formatPoints(team.totalPoints)}</p>
          </div>
          <div className="rounded-2xl bg-white/75 p-3">
            <p className="text-slate-500">Rank</p>
            <p className="text-lg font-semibold">#{team.rank}</p>
          </div>
          <div className="rounded-2xl bg-white/75 p-3">
            <p className="text-slate-500">Captain ROI</p>
            <p className="text-lg font-semibold">{formatPoints(insight.statsV1.captainRoi)}</p>
          </div>
          <div className="rounded-2xl bg-white/75 p-3">
            <p className="text-slate-500">Consistency</p>
            <p className="text-lg font-semibold">
              {formatPoints(insight.statsV1.consistencyIndex)}
            </p>
          </div>
        </div>
      </div>

      <TeamLeadershipBreakdown
        contributors={team.contributors}
        leadershipWindows={leadershipWindows}
      />

      <Link href="/" className="text-sm font-semibold text-indigo-700">
        ← Back to leaderboard
      </Link>
    </main>
  );
}
