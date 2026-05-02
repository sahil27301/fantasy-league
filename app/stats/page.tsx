import Link from "next/link";
import { getLeagueComputation } from "@/lib/data/score-service";
import { formatDelta, formatPoints } from "@/lib/utils/format";
import { HorizontalBars } from "@/components/charts/horizontal-bars";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const result = await getLeagueComputation(false);

  return (
    <main className="flex flex-col gap-5 pb-10">
      <header className="glass-card-strong rounded-3xl p-6">
        <p className="muted-label">League Insights</p>
        <h1 className="section-title mt-2">Stats Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">
          High-signal metrics designed to make the table more competitive.
        </p>
        <p className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200">
          Transfer Impact = sum of incoming Window 2 player points minus outgoing Window 1
          player points across matches 36-70.
        </p>
      </header>

      <section className="glass-card rounded-3xl p-5">
        <h2 className="text-lg font-semibold">Captain ROI Ranking</h2>
        <p className="text-sm text-slate-500">Extra points earned from C/VC multipliers</p>
        <div className="mt-4">
          <HorizontalBars
            data={result.snapshot.standings
              .map((team) => {
                const insight = result.teamInsights.find(
                  (item) => item.leagueTeamId === team.leagueTeamId,
                );
                return {
                  label: team.ownerName,
                  value: insight?.statsV1.captainRoi ?? 0,
                };
              })
              .sort((a, b) => b.value - a.value)}
          />
        </div>
      </section>

      {result.snapshot.standings.map((team) => {
        const insight = result.teamInsights.find((item) => item.leagueTeamId === team.leagueTeamId);
        if (!insight) {
          return null;
        }

        return (
          <Link
            key={team.leagueTeamId}
            href={`/team/${team.leagueTeamId}`}
            className="glass-card block rounded-3xl p-5 transition hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{team.displayName}</h2>
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-indigo-700">
                Rank #{team.rank}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-2xl bg-white/70 p-3">
                <p className="text-slate-500">Momentum</p>
                <p className="font-semibold">{formatDelta(insight.statsV1.rankMomentum)}</p>
              </div>
              <div className="rounded-2xl bg-white/70 p-3">
                <p className="text-slate-500">Gap to Leader</p>
                <p className="font-semibold">
                  {formatPoints(insight.statsV1.pointsBehindLeader)}
                </p>
              </div>
              <div className="rounded-2xl bg-white/70 p-3">
                <p className="text-slate-500">Top-3 Concentration</p>
                <p className="font-semibold">
                  {formatPoints(insight.statsV1.topContributorConcentration)}%
                </p>
              </div>
              <div className="rounded-2xl bg-white/70 p-3">
                <p className="text-slate-500">Transfer Impact (W2 Net)</p>
                <p className="font-semibold">
                  {formatPoints(insight.statsV2.transferImpactScore)}
                </p>
              </div>
            </div>
          </Link>
        );
      })}
    </main>
  );
}
