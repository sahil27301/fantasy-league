import Link from "next/link";
import { getLeagueComputation } from "@/lib/data/score-service";
import { RefreshButton } from "@/components/refresh-button";
import { ExitAdminButton } from "@/components/exit-admin-button";
import { formatDelta, formatPoints } from "@/lib/utils/format";
import { HorizontalBars } from "@/components/charts/horizontal-bars";
import { isAdminSession } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export default async function Home() {
  const isAdmin = await isAdminSession();
  const result = await getLeagueComputation(false);
  const standings = result.snapshot.standings;
  const insightByTeam = new Map(
    result.teamInsights.map((insight) => [insight.leagueTeamId, insight]),
  );
  const gapToNextByTeam = new Map<string, number>();
  standings.forEach((team, index) => {
    if (index === 0) {
      const second = standings[1];
      gapToNextByTeam.set(
        team.leagueTeamId,
        Number(((team.totalPoints ?? 0) - (second?.totalPoints ?? team.totalPoints)).toFixed(1)),
      );
      return;
    }

    const nextHigher = standings[index - 1];
    gapToNextByTeam.set(
      team.leagueTeamId,
      Number(((nextHigher?.totalPoints ?? team.totalPoints) - team.totalPoints).toFixed(1)),
    );
  });

  return (
    <main className="flex flex-col gap-5 pb-10">
      <section className="glass-card-strong rounded-3xl p-6">
        <p className="muted-label">
          IPL Fantasy League
        </p>
        <h1 className="section-title mt-2 text-slate-900">Live Leaderboard</h1>
        <p className="mt-2 text-sm text-slate-600">
          Updated {new Date(result.generatedAt).toLocaleString("en-IN")}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {isAdmin ? <RefreshButton /> : null}
          {isAdmin ? <ExitAdminButton /> : null}
        </div>
      </section>

      <section className="glass-card rounded-3xl p-5">
        <h2 className="text-lg font-semibold text-slate-900">Points Comparison</h2>
        <p className="text-sm text-slate-500">Current total points by team</p>
        <div className="mt-4">
          <HorizontalBars
            data={standings.map((team) => ({
              label: team.ownerName,
              value: team.totalPoints,
            }))}
          />
        </div>
      </section>

      <section className="grid gap-3">
        {standings.map((team) => {
          const insight = insightByTeam.get(team.leagueTeamId);
          const rankCardStyle =
            team.rank === 1
              ? "border-yellow-400/90 bg-gradient-to-br from-yellow-100 via-amber-100 to-orange-200 shadow-[0_10px_25px_rgba(234,179,8,0.22)]"
              : team.rank === 2
                ? "border-indigo-300/85 bg-gradient-to-br from-indigo-100 via-sky-100 to-blue-200 shadow-[0_10px_25px_rgba(59,130,246,0.2)]"
                : team.rank === 3
                  ? "border-rose-300/85 bg-gradient-to-br from-orange-100 via-amber-100 to-rose-200 shadow-[0_10px_25px_rgba(249,115,22,0.2)]"
                  : "glass-card";
          const rankChipStyle =
            team.rank === 1
              ? "bg-yellow-600 text-white"
              : team.rank === 2
                ? "bg-indigo-700 text-white"
                : team.rank === 3
                  ? "bg-orange-700 text-white"
                  : "bg-slate-900 text-white";
          const metricCellStyle =
            team.rank <= 3
              ? "rounded-2xl bg-white/88 p-3 ring-1 ring-slate-200/50"
              : "rounded-2xl bg-white/80 p-3";
          return (
            <Link
              href={`/team/${team.leagueTeamId}`}
              key={team.leagueTeamId}
              className={`${rankCardStyle} rounded-3xl border p-5 shadow-sm transition hover:-translate-y-0.5`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-600">
                    Rank #{team.rank}
                  </p>
                  <h2 className="text-lg font-semibold tracking-tight">{team.displayName}</h2>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold">{formatPoints(team.totalPoints)}</p>
                  <p className="text-xs text-slate-500">Total Points</p>
                </div>
              </div>

              <div className="mt-3">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${rankChipStyle}`}>
                  {team.rank <= 3 ? `Top ${team.rank}` : "Contender"}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className={metricCellStyle}>
                  <p className="text-slate-500">Momentum</p>
                  <p className="font-semibold">
                    {formatDelta(insight?.statsV1.rankMomentum ?? 0)}
                  </p>
                </div>
                <div className={metricCellStyle}>
                  <p className="text-slate-500">Captain ROI</p>
                  <p className="font-semibold">
                    {formatPoints(insight?.statsV1.captainRoi ?? 0)}
                  </p>
                </div>
                <div className={metricCellStyle}>
                  <p className="text-slate-500">
                    {team.rank === 1 ? "Lead to #2" : "Gap to Next"}
                  </p>
                  <p className="font-semibold">
                    {formatPoints(gapToNextByTeam.get(team.leagueTeamId) ?? 0)}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
