import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getMatchAnalysisComputation,
  getUpcomingMatchPreview,
} from "@/lib/matches/match-analysis";
import { formatDateTimeIST, formatPoints } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

function formatTeamsLabel(teamCodes?: string[]) {
  const normalized = teamCodes ?? [];
  if (normalized.length === 0) {
    return "Teams unavailable";
  }
  if (normalized.length === 1) {
    return normalized[0];
  }
  return `${normalized[0]} vs ${normalized[1]}`;
}

export default async function MatchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ matchNumber: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const [{ matchNumber: rawMatchNumber }, { mode }] = await Promise.all([
    params,
    searchParams,
  ]);
  const matchNumber = Number(rawMatchNumber);
  if (!Number.isFinite(matchNumber) || matchNumber <= 0) {
    notFound();
  }

  const isUpcomingMode = mode === "upcoming";
  if (isUpcomingMode) {
    const upcomingPreview = await getUpcomingMatchPreview(false);
    if (!upcomingPreview || upcomingPreview.preview.matchNumber !== matchNumber) {
      notFound();
    }
    const preview = upcomingPreview.preview;
    const upcomingTeams = [
      upcomingPreview.upcoming.homeTeamShortName,
      upcomingPreview.upcoming.awayTeamShortName,
    ].filter((team): team is string => Boolean(team));
    const sortedPreviewTeamBreakdowns = [...(preview.fantasyTeamBreakdowns ?? [])].sort(
      (a, b) => b.players.length - a.players.length || a.displayName.localeCompare(b.displayName),
    );
    const visiblePreviewTeamBreakdowns = sortedPreviewTeamBreakdowns.filter(
      (team) => team.players.length > 0,
    );
    return (
      <main className="flex flex-col gap-4 pb-10 md:gap-5">
        <header className="glass-card-strong rounded-[1.75rem] p-5 md:p-6">
          <p className="muted-label">Upcoming Match Preview</p>
          <h1 className="section-title mt-2">{upcomingPreview.upcoming.matchName}</h1>
          <div className="mt-2">
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
              Teams: {formatTeamsLabel(upcomingTeams)}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {upcomingPreview.upcoming.matchDateIso
              ? `Starts: ${formatDateTimeIST(upcomingPreview.upcoming.matchDateIso)}`
              : "Schedule time not available"}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Points are hidden because this match is not completed yet.
          </p>
        </header>

        <section className="glass-card rounded-[1.6rem] p-4 md:p-5">
          <h2 className="text-lg font-semibold text-slate-900">Fantasy Teams</h2>
          <p className="text-sm text-slate-500">
            Window {preview.activeWindow} roster with C/VC tags for this upcoming match.
          </p>
          <div className="mt-4 grid gap-3">
            {visiblePreviewTeamBreakdowns.map((team) => (
              <div key={team.leagueTeamId} className="rounded-2xl bg-white/85 p-4 ring-1 ring-slate-200/70">
                <h3 className="text-base font-semibold text-slate-900">
                  {team.displayName}
                </h3>
                <p className="text-sm text-slate-500">Owner: {team.ownerName}</p>
                <div className="mt-3 overflow-x-auto rounded-xl ring-1 ring-slate-200/70">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50/90">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">
                          Player
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">
                          IPL Team
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white/80">
                      {team.players.map((player) => (
                        <tr key={`${team.leagueTeamId}-${player.playerId}`}>
                          <td className="px-3 py-2 text-slate-800">
                            <div className="flex flex-wrap items-center gap-1">
                              <span>{player.playerName}</span>
                              {player.isCaptain ? (
                                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                                  C
                                </span>
                              ) : null}
                              {player.isViceCaptain ? (
                                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
                                  VC
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {player.iplTeamShortName}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </section>

        <Link href="/matches" className="back-link">
          ← Back to match cards
        </Link>
      </main>
    );
  }

  const result = await getMatchAnalysisComputation(false);
  const analysis = result.analysesByMatch[matchNumber];
  if (!analysis) {
    notFound();
  }

  const analysisTeamBreakdowns = analysis.fantasyTeamBreakdowns ?? [];
  const analysisPlayerPerformances = analysis.playerPerformances ?? [];
  const sortedAnalysisTeamBreakdowns = [...analysisTeamBreakdowns].sort(
    (a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0),
  );
  const visibleAnalysisTeamBreakdowns = sortedAnalysisTeamBreakdowns.filter(
    (team) => team.players.length > 0,
  );
  return (
    <main className="flex flex-col gap-4 pb-10 md:gap-5">
      <header className="glass-card-strong rounded-[1.75rem] p-5 md:p-6">
        <p className="muted-label">Completed Match</p>
        <h1 className="section-title mt-2">Match {analysis.matchNumber}</h1>
        <div className="mt-2">
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
            Teams: {formatTeamsLabel(analysis.playingIplTeams)}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Player and fantasy team stats using Window {analysis.activeWindow} rules.
        </p>
      </header>

      <section className="glass-card rounded-[1.6rem] p-4 md:p-5">
        <h2 className="text-lg font-semibold text-slate-900">Fantasy Teams</h2>
        <p className="text-sm text-slate-500">
          Team totals, C/VC bonus impact, and player rows for this match.
        </p>
        <div className="mt-4 grid gap-3">
          {visibleAnalysisTeamBreakdowns.map((team) => (
            <div
              key={team.leagueTeamId}
              className="rounded-2xl bg-white/85 p-4 ring-1 ring-slate-200/70"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    {team.displayName}
                  </h3>
                  <p className="text-sm text-slate-500">Owner: {team.ownerName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500">Total</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {formatPoints(team.totalPoints ?? 0)}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                  Base {formatPoints(team.basePoints ?? 0)}
                </span>
                <span className="rounded-full bg-indigo-100 px-2 py-1 font-semibold text-indigo-700">
                  C Bonus +{formatPoints(team.captainBonus ?? 0)}
                </span>
                <span className="rounded-full bg-sky-100 px-2 py-1 font-semibold text-sky-700">
                  VC Bonus +{formatPoints(team.viceCaptainBonus ?? 0)}
                </span>
              </div>
              <div className="mt-3 overflow-x-auto rounded-xl ring-1 ring-slate-200/70">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50/90">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">
                        Player
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">
                        IPL Team
                      </th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-600">
                        Points
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white/80">
                    {team.players.map((player) => (
                      <tr key={`${team.leagueTeamId}-${player.playerId}`}>
                        <td className="px-3 py-2 text-slate-800">
                          <div className="flex flex-wrap items-center gap-1">
                            <span>{player.playerName}</span>
                            {player.isCaptain ? (
                              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                                C
                              </span>
                            ) : null}
                            {player.isViceCaptain ? (
                              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
                                VC
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {player.iplTeamShortName}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-slate-900">
                          {formatPoints(player.points ?? 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-card rounded-[1.6rem] p-4 md:p-5">
        <h2 className="text-lg font-semibold text-slate-900">Cricket Players</h2>
        <p className="text-sm text-slate-500">
          Overall match performance with fantasy-team ownership context.
        </p>
        <div className="mt-4 overflow-x-auto rounded-2xl ring-1 ring-slate-200/80">
          <table className="min-w-full divide-y divide-slate-200 bg-white/85 text-sm">
            <thead className="bg-slate-50/90">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Player</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">IPL Team</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600">Points</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">
                  Fantasy Teams
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {analysisPlayerPerformances.map((player) => (
                <tr key={player.playerId}>
                  <td className="px-3 py-2 font-medium text-slate-800">
                    <div className="flex flex-wrap items-center gap-1">
                      <span>{player.playerName}</span>
                      {player.captainedBy.length > 0 ? (
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                          C
                        </span>
                      ) : null}
                      {player.viceCaptainedBy.length > 0 ? (
                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
                          VC
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{player.teamShortName}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-900">
                    {formatPoints(player.points)}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {player.fantasyTeams.join(", ") || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Link href="/matches" className="back-link">
        ← Back to match cards
      </Link>
    </main>
  );
}
