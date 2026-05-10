import Link from "next/link";
import { getLeagueComputation } from "@/lib/data/score-service";
import { getMatchProgression } from "@/lib/progression/match-progression";
import { RefreshButton } from "@/components/refresh-button";
import { ExitAdminButton } from "@/components/exit-admin-button";
import { formatDateTimeIST, formatDelta, formatPoints } from "@/lib/utils/format";
import { HorizontalBars } from "@/components/charts/horizontal-bars";
import { isAdminSession } from "@/lib/auth/admin";
import type { TeamStanding } from "@/lib/types";

export const dynamic = "force-dynamic";

type LeaderboardMode = "actual" | "theoretical" | "noCaptaincy";

const MODE_CONFIG: Record<
  LeaderboardMode,
  { label: string; pointsLabel: string; helper: string }
> = {
  actual: {
    label: "Actual",
    pointsLabel: "Total Points",
    helper: "Current points with actual C/VC decisions",
  },
  theoretical: {
    label: "Theoretical Max",
    pointsLabel: "Theoretical Max Points",
    helper: "Best possible total if top scorer was C and second scorer VC in each window",
  },
  noCaptaincy: {
    label: "No C/VC",
    pointsLabel: "No-Captaincy Points",
    helper: "Baseline points if no C/VC multipliers were used",
  },
};

function resolveMode(rawMode: string | undefined): LeaderboardMode {
  if (rawMode === "theoretical" || rawMode === "noCaptaincy") {
    return rawMode;
  }
  return "actual";
}

interface LeaderboardRow extends TeamStanding {
  modePoints: number;
  modeRank: number;
  noCaptaincyPoints: number;
  theoreticalPoints: number;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode: requestedMode } = await searchParams;
  const mode = resolveMode(requestedMode);
  const [isAdmin, result, progression] = await Promise.all([
    isAdminSession(),
    getLeagueComputation(false),
    getMatchProgression(false),
  ]);
  const standings = result.snapshot.standings;
  const theoreticalByTeam = new Map(
    progression.teams.map((team) => [
      team.leagueTeamId,
      team.theoreticalCaptaincy.totalPotentialPoints,
    ]),
  );
  const insightByTeam = new Map(
    result.teamInsights.map((insight) => [insight.leagueTeamId, insight]),
  );
  const rankedRows: LeaderboardRow[] = standings
    .map((team) => {
      const noCaptaincyPoints = Number(
        (team.totalPoints - team.captainBonus - team.viceCaptainBonus).toFixed(2),
      );
      const theoreticalPoints = Number(
        (
          theoreticalByTeam.get(team.leagueTeamId) ?? team.totalPoints
        ).toFixed(2),
      );
      const modePoints =
        mode === "theoretical"
          ? theoreticalPoints
          : mode === "noCaptaincy"
            ? noCaptaincyPoints
            : team.totalPoints;
      return {
        ...team,
        noCaptaincyPoints,
        theoreticalPoints,
        modePoints: Number(modePoints.toFixed(2)),
        modeRank: 0,
      };
    })
    .sort((a, b) => b.modePoints - a.modePoints || b.totalPoints - a.totalPoints)
    .map((team, index) => ({ ...team, modeRank: index + 1 }));

  const gapToNextByTeam = new Map<string, number>();
  rankedRows.forEach((team, index) => {
    if (index === 0) {
      const second = rankedRows[1];
      gapToNextByTeam.set(
        team.leagueTeamId,
        Number(
          ((team.modePoints ?? 0) - (second?.modePoints ?? team.modePoints)).toFixed(1),
        ),
      );
      return;
    }

    const nextHigher = rankedRows[index - 1];
    gapToNextByTeam.set(
      team.leagueTeamId,
      Number(
        ((nextHigher?.modePoints ?? team.modePoints) - team.modePoints).toFixed(1),
      ),
    );
  });

  return (
    <main className="flex flex-col gap-4 pb-10 md:gap-5">
      <section className="glass-card-strong rounded-[1.75rem] p-5 md:p-6">
        <p className="muted-label">
          IPL Fantasy League
        </p>
        <h1 className="section-title mt-2 text-slate-900">Live Leaderboard</h1>
        <p className="mt-2 text-sm text-slate-600">
          Updated {formatDateTimeIST(result.generatedAt)}
        </p>
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Leaderboard Mode
          </p>
          <div className="mt-2 inline-flex rounded-full bg-white/80 p-1 ring-1 ring-indigo-100">
            {(Object.keys(MODE_CONFIG) as LeaderboardMode[]).map((entryMode) => {
              const href = entryMode === "actual" ? "/" : `/?mode=${entryMode}`;
              return (
                <Link
                  key={entryMode}
                  href={href}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    mode === entryMode
                      ? "bg-indigo-600 text-white"
                      : "text-slate-700 hover:bg-white"
                  }`}
                >
                  {MODE_CONFIG[entryMode].label}
                </Link>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-slate-500">{MODE_CONFIG[mode].helper}</p>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {isAdmin ? <RefreshButton /> : null}
          {isAdmin ? <ExitAdminButton /> : null}
        </div>
      </section>

      <section className="glass-card rounded-[1.6rem] p-4 md:p-5">
        <h2 className="text-lg font-semibold text-slate-900">Points Comparison</h2>
        <p className="text-sm text-slate-500">{MODE_CONFIG[mode].pointsLabel} by team</p>
        <div className="mt-4">
          <HorizontalBars
            data={rankedRows.map((team) => ({
              label: team.ownerName,
              value: team.modePoints,
            }))}
          />
        </div>
      </section>

      <section className="grid gap-3">
        {rankedRows.map((team) => {
          const insight = insightByTeam.get(team.leagueTeamId);
          const rankCardStyle =
            team.modeRank === 1
              ? "border-yellow-400/90 bg-gradient-to-br from-yellow-100 via-amber-100 to-orange-200 shadow-[0_10px_25px_rgba(234,179,8,0.22)]"
              : team.modeRank === 2
                ? "border-indigo-300/85 bg-gradient-to-br from-indigo-100 via-sky-100 to-blue-200 shadow-[0_10px_25px_rgba(59,130,246,0.2)]"
                : team.modeRank === 3
                  ? "border-rose-300/85 bg-gradient-to-br from-orange-100 via-amber-100 to-rose-200 shadow-[0_10px_25px_rgba(249,115,22,0.2)]"
                  : "glass-card";
          const rankChipStyle =
            team.modeRank === 1
              ? "bg-yellow-600 text-white"
              : team.modeRank === 2
                ? "bg-indigo-700 text-white"
                : team.modeRank === 3
                  ? "bg-orange-700 text-white"
                  : "bg-slate-900 text-white";
          const metricCellStyle =
            team.modeRank <= 3
              ? "rounded-2xl bg-white/88 p-3 ring-1 ring-slate-200/50"
              : "rounded-2xl bg-white/80 p-3";
          return (
            <Link
              href={`/team/${team.leagueTeamId}`}
              key={team.leagueTeamId}
              className={`${rankCardStyle} rounded-[1.6rem] border p-4 shadow-sm transition hover:-translate-y-0.5 md:p-5`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-600">
                    Rank #{team.modeRank}
                  </p>
                  <h2 className="text-lg font-semibold tracking-tight">{team.displayName}</h2>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold">{formatPoints(team.modePoints)}</p>
                  <p className="text-xs text-slate-500">{MODE_CONFIG[mode].pointsLabel}</p>
                  {mode !== "actual" ? (
                    <p className="mt-1 text-[11px] text-slate-500">
                      Actual: {formatPoints(team.totalPoints)}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-3">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${rankChipStyle}`}>
                  {team.modeRank <= 3 ? `Top ${team.modeRank}` : "Contender"}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
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
                    {team.modeRank === 1 ? "Lead to #2" : "Gap to Next"}
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
