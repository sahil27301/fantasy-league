"use client";

import { useMemo, useState } from "react";
import { MultiLineChart } from "@/components/charts/multi-line-chart";
import type { MatchProgressionResult, TeamMatchProgression } from "@/lib/types";

type ViewMode = "top3" | "all";

function formatPoints(value: number) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function getLatestPoints(team: TeamMatchProgression) {
  return team.series.at(-1)?.cumulativePoints ?? 0;
}

function getLatestRank(team: TeamMatchProgression) {
  return team.series.at(-1)?.rank ?? 0;
}

export function ProgressionDashboard({ progression }: { progression: MatchProgressionResult }) {
  const [viewMode, setViewMode] = useState<ViewMode>("top3");
  const sortedTeams = useMemo(
    () =>
      [...progression.teams]
        .filter((team) => team.series.length > 0)
        .sort((a, b) => getLatestPoints(b) - getLatestPoints(a)),
    [progression.teams],
  );

  const [playerAId, setPlayerAId] = useState(sortedTeams[0]?.leagueTeamId ?? "");
  const [playerBId, setPlayerBId] = useState(sortedTeams[1]?.leagueTeamId ?? "");

  const visibleTeams = viewMode === "top3" ? sortedTeams.slice(0, 3) : sortedTeams;
  const palette = [
    "#4f46e5",
    "#0284c7",
    "#16a34a",
    "#ca8a04",
    "#db2777",
    "#9333ea",
    "#ea580c",
    "#0f766e",
    "#ef4444",
  ];

  const cumulativeSeries = visibleTeams.map((team, index) => ({
    label: team.displayName,
    color: palette[index % palette.length],
    points: team.series.map((point) => ({
      x: point.matchNumber,
      y: point.cumulativePoints,
    })),
  }));

  const rankSeries = visibleTeams.map((team, index) => ({
    label: team.displayName,
    color: palette[index % palette.length],
    points: team.series.map((point) => ({
      x: point.matchNumber,
      y: point.rank,
    })),
  }));

  const playerA = sortedTeams.find((team) => team.leagueTeamId === playerAId) ?? null;
  const playerB = sortedTeams.find((team) => team.leagueTeamId === playerBId) ?? null;
  const isSameHeadToHead = Boolean(playerA && playerB && playerA.leagueTeamId === playerB.leagueTeamId);

  const headToHeadSeries = [playerA, playerB]
    .filter((value): value is TeamMatchProgression => value !== null)
    .map((team, index) => ({
      label: isSameHeadToHead ? `${team.displayName} ${index === 0 ? "(A)" : "(B)"}` : team.displayName,
      color: index === 0 ? "#0f172a" : "#2563eb",
      points: team.series.map((point) => ({
        x: point.matchNumber,
        y: point.cumulativePoints,
      })),
    }));

  const headToHeadStats = useMemo(() => {
    if (!playerA || !playerB) {
      return null;
    }

    const commonMatches = progression.matches.filter((match) => {
      const a = playerA.series.find((point) => point.matchNumber === match);
      const b = playerB.series.find((point) => point.matchNumber === match);
      return Boolean(a && b);
    });

    let matchWinsA = 0;
    let matchWinsB = 0;
    for (const match of commonMatches) {
      const a = playerA.series.find((point) => point.matchNumber === match)!;
      const b = playerB.series.find((point) => point.matchNumber === match)!;
      if (a.points > b.points) {
        matchWinsA += 1;
      } else if (b.points > a.points) {
        matchWinsB += 1;
      }
    }

    const latestA = playerA.series.at(-1);
    const latestB = playerB.series.at(-1);
    const pointsGap = Math.abs((latestA?.cumulativePoints ?? 0) - (latestB?.cumulativePoints ?? 0));

    return {
      matchWinsA,
      matchWinsB,
      pointsGap,
      latestA,
      latestB,
    };
  }, [playerA, playerB, progression.matches]);

  return (
    <div className="space-y-5">
      <section className="glass-card rounded-3xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Cumulative Points by Match</h2>
            <p className="text-sm text-slate-500">
              {viewMode === "top3" ? "Top 3 teams" : "All teams"} across all completed matches
            </p>
          </div>
          <div className="inline-flex rounded-full bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setViewMode("top3")}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                viewMode === "top3" ? "bg-slate-900 text-white" : "text-slate-700"
              }`}
            >
              Top 3
            </button>
            <button
              type="button"
              onClick={() => setViewMode("all")}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                viewMode === "all" ? "bg-slate-900 text-white" : "text-slate-700"
              }`}
            >
              All Teams
            </button>
          </div>
        </div>
        <div className="mt-3 rounded-2xl bg-white/80 p-3">
          <MultiLineChart series={cumulativeSeries} height={280} key={`cumulative-${viewMode}`} />
        </div>
      </section>

      <section className="glass-card rounded-3xl p-5">
        <h2 className="text-lg font-semibold text-slate-900">Rank Movement by Match</h2>
        <p className="text-sm text-slate-500">Lower line means better rank</p>
        <div className="mt-3 rounded-2xl bg-white/80 p-3">
          <MultiLineChart
            series={rankSeries}
            minY={1}
            maxY={9}
            height={280}
            key={`rank-${viewMode}`}
          />
        </div>
      </section>

      <section className="glass-card rounded-3xl p-5">
        <h2 className="text-lg font-semibold text-slate-900">Head-to-Head Comparison</h2>
        <p className="text-sm text-slate-500">
          Compare progression, C/VC impact and top scorers for any two teams
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <select
            value={playerAId}
            onChange={(event) => setPlayerAId(event.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
          >
            {sortedTeams.map((team) => (
              <option key={team.leagueTeamId} value={team.leagueTeamId}>
                {team.displayName}
              </option>
            ))}
          </select>
          <select
            value={playerBId}
            onChange={(event) => setPlayerBId(event.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
          >
            {sortedTeams.map((team) => (
              <option key={team.leagueTeamId} value={team.leagueTeamId}>
                {team.displayName}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 rounded-2xl bg-white/80 p-3">
          <MultiLineChart series={headToHeadSeries} height={260} />
        </div>

        {playerA && playerB && headToHeadStats ? (
          <>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {[playerA, playerB].map((team, index) => (
                <div key={`${team.leagueTeamId}-${index}`} className="rounded-2xl bg-white/80 p-4 ring-1 ring-slate-200/60">
                  <h3 className="text-base font-semibold text-slate-900">
                    {team.displayName}
                    {isSameHeadToHead ? ` (${index === 0 ? "A" : "B"})` : ""}
                  </h3>
                  <p className="text-sm text-slate-500">
                    Rank #{getLatestRank(team)} • {formatPoints(getLatestPoints(team))}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-indigo-100 px-2 py-1 font-semibold text-indigo-700">
                      C Bonus {formatPoints(team.captainBonus)}
                    </span>
                    <span className="rounded-full bg-sky-100 px-2 py-1 font-semibold text-sky-700">
                      VC Bonus {formatPoints(team.viceCaptainBonus)}
                    </span>
                  </div>
                  <p className="mt-3 text-xs font-semibold uppercase text-slate-500">Top Scorers</p>
                  <p className="text-sm text-slate-700">
                    {team.contributors
                      .slice(0, 3)
                      .map((player) => `${player.playerName} (${formatPoints(player.pointsAfterMultiplier)})`)
                      .join(" • ")}
                  </p>
                  <p className="mt-2 text-xs text-slate-600">
                    Match Wins: {index === 0 ? headToHeadStats.matchWinsA : headToHeadStats.matchWinsB}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-3 text-sm text-slate-600">
              Current points gap: <span className="font-semibold text-slate-900">{formatPoints(headToHeadStats.pointsGap)}</span>
            </p>
          </>
        ) : null}
      </section>
    </div>
  );
}
