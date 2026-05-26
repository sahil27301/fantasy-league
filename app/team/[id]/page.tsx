import { TeamLeadershipBreakdown } from "@/components/team-leadership-breakdown";
import { getLeagueComputation } from "@/lib/data/score-service";
import { getCaptainWindows, getNormalizedRoster } from "@/lib/data/seed";
import { getMatchProgression } from "@/lib/progression/match-progression";
import { formatPoints } from "@/lib/utils/format";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getLeagueComputation(false);
  const progression = await getMatchProgression(false);
  const team = result.snapshot.standings.find(
    (standing) => standing.leagueTeamId === id,
  );
  const insight = result.teamInsights.find((item) => item.leagueTeamId === id);
  const progressionTeam = progression.teams.find(
    (entry) => entry.leagueTeamId === id,
  );

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
    (progressionTeam.windowBonuses ?? []).map((window) => [
      window.windowIndex,
      window,
    ]),
  );
  const leadershipWindows = getCaptainWindows()
    .filter((window) => window.leagueTeamId === id)
    .sort((a, b) => a.windowIndex - b.windowIndex)
    .map((window) => ({
      windowIndex: window.windowIndex,
      fromMatch: window.fromMatch,
      toMatch: window.toMatch,
      captainName:
        nameByPlayerId.get(window.captainPlayerId) ??
        `Player ${window.captainPlayerId}`,
      viceCaptainName:
        nameByPlayerId.get(window.viceCaptainPlayerId) ??
        `Player ${window.viceCaptainPlayerId}`,
      captainBonus:
        windowBonusByIndex.get(window.windowIndex)?.captainBonus ?? 0,
      viceCaptainBonus:
        windowBonusByIndex.get(window.windowIndex)?.viceCaptainBonus ?? 0,
    }));
  console.info("[team-page] Leadership windows prepared", {
    leagueTeamId: id,
    windowIndexes: leadershipWindows.map((window) => window.windowIndex),
    leadershipWindowsCount: leadershipWindows.length,
  });
  const theoreticalWindows = progressionTeam.theoreticalCaptaincy.windows
    .sort((a, b) => a.windowIndex - b.windowIndex)
    .map((window) => ({
      ...window,
      actualCaptainName: window.actualCaptainPlayerId
        ? (nameByPlayerId.get(window.actualCaptainPlayerId) ??
          `Player ${window.actualCaptainPlayerId}`)
        : "N/A",
      actualViceCaptainName: window.actualViceCaptainPlayerId
        ? (nameByPlayerId.get(window.actualViceCaptainPlayerId) ??
          `Player ${window.actualViceCaptainPlayerId}`)
        : "N/A",
      theoreticalCaptainName: window.theoreticalCaptainPlayerId
        ? (nameByPlayerId.get(window.theoreticalCaptainPlayerId) ??
          `Player ${window.theoreticalCaptainPlayerId}`)
        : "N/A",
      theoreticalViceCaptainName: window.theoreticalViceCaptainPlayerId
        ? (nameByPlayerId.get(window.theoreticalViceCaptainPlayerId) ??
          `Player ${window.theoreticalViceCaptainPlayerId}`)
        : "N/A",
    }));

  return (
    <main className="flex flex-col gap-4 pb-10 md:gap-5">
      <div className="glass-card-strong rounded-[1.75rem] p-5">
        <p className="muted-label">Team Overview</p>
        <h1 className="section-title mt-2">{team.displayName}</h1>
        <p className="text-sm text-slate-500">Owner: {team.ownerName}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div className="metric-tile">
            <p className="text-slate-500">Total</p>
            <p className="text-lg font-semibold">
              {formatPoints(team.totalPoints)}
            </p>
          </div>
          <div className="metric-tile">
            <p className="text-slate-500">Rank</p>
            <p className="text-lg font-semibold">#{team.rank}</p>
          </div>
          <div className="metric-tile">
            <p className="text-slate-500">Captain ROI</p>
            <p className="text-lg font-semibold">
              {formatPoints(insight.statsV1.captainRoi)}
            </p>
          </div>
          <div className="metric-tile">
            <p className="text-slate-500">Consistency</p>
            <p className="text-lg font-semibold">
              {formatPoints(insight.statsV1.consistencyIndex)}
            </p>
          </div>
        </div>
      </div>

      <section className="glass-card rounded-[1.6rem] p-4 md:p-5">
        <p className="muted-label">Theoretical Max So Far</p>
        <h2 className="mt-2 text-lg font-semibold text-slate-900">
          Captaincy optimization (all windows)
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div className="metric-tile">
            <p className="text-slate-500">Actual Total</p>
            <p className="text-lg font-semibold">
              {formatPoints(team.totalPoints)}
            </p>
          </div>
          <div className="metric-tile">
            <p className="text-slate-500">Theoretical Max</p>
            <p className="text-lg font-semibold">
              {formatPoints(
                progressionTeam.theoreticalCaptaincy.totalPotentialPoints,
              )}
            </p>
          </div>
          <div className="col-span-2 rounded-2xl bg-indigo-50 p-3 ring-1 ring-indigo-100">
            <p className="text-slate-500">Unrealized Captaincy Points</p>
            <p className="text-lg font-semibold text-indigo-700">
              +
              {formatPoints(
                progressionTeam.theoreticalCaptaincy.unrealizedPoints,
              )}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {theoreticalWindows.map((window) => (
            <div
              key={window.windowIndex}
              className="rounded-2xl bg-white/80 p-4 ring-1 ring-slate-200/70"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Window {window.windowIndex}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Actual: C {window.actualCaptainName} / VC{" "}
                {window.actualViceCaptainName}
              </p>
              <p className="text-sm text-slate-600">
                Optimal: C {window.theoreticalCaptainName} / VC{" "}
                {window.theoreticalViceCaptainName}
              </p>
              <p className="mt-2 text-sm font-medium text-slate-800">
                Delta:{" "}
                {formatPoints(
                  window.theoreticalCaptainBonus +
                    window.theoreticalViceCaptainBonus -
                    window.actualCaptainBonus -
                    window.actualViceCaptainBonus,
                )}
              </p>
            </div>
          ))}
        </div>
      </section>

      <TeamLeadershipBreakdown
        contributors={team.contributors}
        leadershipWindows={leadershipWindows}
      />

      <Link href="/" className="back-link">
        ← Back to leaderboard
      </Link>
    </main>
  );
}
