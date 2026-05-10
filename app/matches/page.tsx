import Link from "next/link";
import {
  getMatchAnalysisComputation,
  getUpcomingMatchPreview,
} from "@/lib/matches/match-analysis";
import { formatDateTimeIST } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

function formatMatchupLabel(teamCodes?: string[]) {
  const normalized = (teamCodes ?? []).filter(Boolean);
  if (normalized.length === 0) {
    return "Teams unavailable";
  }
  if (normalized.length === 1) {
    return normalized[0];
  }
  return `${normalized[0]} vs ${normalized[1]}`;
}

export default async function MatchesPage() {
  const [result, upcomingPreview] = await Promise.all([
    getMatchAnalysisComputation(false),
    getUpcomingMatchPreview(false),
  ]);
  const completedMatchesDesc = [...result.completedMatches].sort((a, b) => b - a);

  return (
    <main className="flex flex-col gap-5 pb-10">
      <header className="glass-card-strong rounded-3xl p-6">
        <p className="muted-label">Match Analysis</p>
        <h1 className="section-title mt-2">Match Cards</h1>
        <p className="mt-2 text-sm text-slate-600">
          Open any match card to view cricket player stats and fantasy team-level breakdown.
        </p>
      </header>

      {upcomingPreview ? (
        <section className="glass-card rounded-3xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Upcoming Match
          </p>
          <Link
            href={`/matches/${upcomingPreview.preview.matchNumber}?mode=upcoming`}
            className="mt-3 block rounded-2xl border border-sky-200 bg-sky-50/70 p-4 transition hover:-translate-y-0.5"
          >
            <h2 className="text-lg font-semibold text-slate-900">
              {upcomingPreview.upcoming.matchName}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {upcomingPreview.upcoming.matchDateIso
                ? `Starts: ${formatDateTimeIST(upcomingPreview.upcoming.matchDateIso)}`
                : "Schedule time not available"}
            </p>
            <p className="mt-2 text-xs font-semibold text-sky-700">
              Open preview (no points yet) →
            </p>
          </Link>
        </section>
      ) : null}

      <section className="glass-card rounded-3xl p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Completed Matches</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {completedMatchesDesc.length} completed
          </span>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {completedMatchesDesc.map((matchNumber) => (
            <Link
              key={matchNumber}
              href={`/matches/${matchNumber}`}
              className="rounded-2xl border border-slate-200 bg-white/80 p-4 transition hover:-translate-y-0.5 hover:bg-slate-50"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-slate-900">
                  Match {matchNumber}
                </h3>
                <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                  {formatMatchupLabel(result.analysesByMatch[matchNumber]?.playingIplTeams)}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Open detailed player and fantasy team stats
              </p>
            </Link>
          ))}
        </div>
      </section>

      <Link href="/" className="text-sm font-semibold text-indigo-700">
        ← Back to leaderboard
      </Link>
    </main>
  );
}
