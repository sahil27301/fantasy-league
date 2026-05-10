"use client";

import { useEffect, useMemo, useState } from "react";
import { HorizontalBars } from "@/components/charts/horizontal-bars";
import { formatDateTimeIST, formatPoints } from "@/lib/utils/format";
import type { MatchAnalysis, MatchUpcomingInfo } from "@/lib/types";

interface MatchListResponse {
  generatedAt: string;
  completedMatches: number[];
  upcomingMatches: MatchUpcomingInfo[];
}

interface MatchDetailResponse {
  generatedAt: string;
  match: MatchAnalysis;
  upcomingMatches: MatchUpcomingInfo[];
}

function parseErrorMessage(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }
  const raw = payload as { error?: unknown };
  return typeof raw.error === "string" ? raw.error : null;
}

export function MatchAnalysisDashboard() {
  const [completedMatches, setCompletedMatches] = useState<number[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<MatchUpcomingInfo[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<number | null>(null);
  const [matchAnalysis, setMatchAnalysis] = useState<MatchAnalysis | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingMatch, setIsLoadingMatch] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadMatchList = async (refresh = false) => {
    console.info("[match-analysis-ui] Loading match list", { refresh });
    setIsLoadingList(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/matches${refresh ? "?refresh=1" : ""}`);
      const payload = (await response.json()) as MatchListResponse;
      if (!response.ok) {
        throw new Error(parseErrorMessage(payload) ?? "Failed to load match list");
      }
      setCompletedMatches(payload.completedMatches);
      setUpcomingMatches(payload.upcomingMatches);
      setSelectedMatch((current) => current ?? payload.completedMatches.at(-1) ?? null);
      console.info("[match-analysis-ui] Match list loaded", {
        completedMatches: payload.completedMatches.length,
        upcomingMatches: payload.upcomingMatches.length,
      });
    } catch (error) {
      console.error("[match-analysis-ui] Match list load failed", { error });
      setErrorMessage("Unable to load completed matches right now.");
    } finally {
      setIsLoadingList(false);
    }
  };

  const loadMatchDetails = async (matchNumber: number, refresh = false) => {
    console.info("[match-analysis-ui] Loading match details", {
      matchNumber,
      refresh,
    });
    setIsLoadingMatch(true);
    setErrorMessage(null);
    try {
      const response = await fetch(
        `/api/matches/${matchNumber}${refresh ? "?refresh=1" : ""}`,
      );
      const payload = (await response.json()) as MatchDetailResponse;
      if (!response.ok) {
        throw new Error(parseErrorMessage(payload) ?? "Failed to load match details");
      }
      setMatchAnalysis(payload.match);
      setUpcomingMatches(payload.upcomingMatches);
      console.info("[match-analysis-ui] Match details loaded", {
        matchNumber,
        teams: payload.match.teamPerformances.length,
        players: payload.match.playerPerformances.length,
      });
    } catch (error) {
      console.error("[match-analysis-ui] Match details load failed", {
        matchNumber,
        error,
      });
      setErrorMessage("Unable to load this match analysis right now.");
    } finally {
      setIsLoadingMatch(false);
    }
  };

  useEffect(() => {
    void loadMatchList(false);
  }, []);

  useEffect(() => {
    if (selectedMatch === null) {
      return;
    }
    void loadMatchDetails(selectedMatch, false);
  }, [selectedMatch]);

  const playerNameById = useMemo(
    () =>
      new Map(
        (matchAnalysis?.playerPerformances ?? []).map((player) => [
          player.playerId,
          player.playerName,
        ]),
      ),
    [matchAnalysis?.playerPerformances],
  );

  const sortedTeamCards = useMemo(
    () =>
      [...(matchAnalysis?.teamPerformances ?? [])].sort(
        (a, b) => b.totalPoints - a.totalPoints,
      ),
    [matchAnalysis?.teamPerformances],
  );

  const topPlayers = useMemo(
    () => (matchAnalysis?.playerPerformances ?? []).slice(0, 40),
    [matchAnalysis?.playerPerformances],
  );

  if (isLoadingList) {
    return (
      <section className="glass-card rounded-[1.6rem] p-4 md:p-5">
        <p className="text-sm text-slate-500">Loading match analysis...</p>
      </section>
    );
  }

  if (completedMatches.length === 0) {
    return (
      <section className="glass-card rounded-3xl p-5">
        <p className="text-sm text-slate-500">
          No completed matches are available yet.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="glass-card rounded-3xl p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Select Completed Match
            </h2>
            <p className="text-sm text-slate-500">
              Choose a match to inspect player and team-level scoring breakdown.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void loadMatchList(true);
              if (selectedMatch !== null) {
                void loadMatchDetails(selectedMatch, true);
              }
            }}
            className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500"
          >
            Refresh Match Data
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <select
            value={selectedMatch ?? ""}
            onChange={(event) => setSelectedMatch(Number(event.target.value))}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800"
          >
            {completedMatches.map((matchNumber) => (
              <option key={matchNumber} value={matchNumber}>
                Match {matchNumber}
              </option>
            ))}
          </select>
          {matchAnalysis ? (
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
              Active Window {matchAnalysis.activeWindow}
            </span>
          ) : null}
        </div>

        {upcomingMatches.length > 0 ? (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Upcoming (from IPL feed)
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {upcomingMatches.slice(0, 8).map((match) => (
                <span
                  key={`${match.matchName}-${match.matchDateIso ?? "na"}`}
                  className="rounded-full bg-white/80 px-3 py-1 text-xs text-slate-700 ring-1 ring-slate-200"
                >
                  {match.matchName}
                  {match.matchDateIso
                    ? ` • ${formatDateTimeIST(match.matchDateIso)}`
                    : ""}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {errorMessage ? (
        <section className="glass-card rounded-[1.6rem] p-4 md:p-5">
          <p className="text-sm text-rose-600">{errorMessage}</p>
        </section>
      ) : null}

      {isLoadingMatch || !matchAnalysis ? (
        <section className="glass-card rounded-[1.6rem] p-4 md:p-5">
          <p className="text-sm text-slate-500">Loading selected match...</p>
        </section>
      ) : (
        <>
          <section className="glass-card rounded-[1.6rem] p-4 md:p-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Team Points for Match {matchAnalysis.matchNumber}
            </h2>
            <p className="text-sm text-slate-500">
              Total points include captain and vice-captain multipliers.
            </p>
            <div className="mt-4">
              <HorizontalBars
                data={sortedTeamCards.map((team) => ({
                  label: team.ownerName,
                  value: team.totalPoints,
                }))}
              />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {sortedTeamCards.map((team) => (
                <div
                  key={team.leagueTeamId}
                  className="rounded-2xl bg-white/80 p-4 ring-1 ring-slate-200/70"
                >
                  <h3 className="text-base font-semibold text-slate-900">
                    {team.displayName}
                  </h3>
                  <p className="text-sm text-slate-500">Owner: {team.ownerName}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-slate-50 p-2">
                      <p className="text-slate-500">Base</p>
                      <p className="font-semibold">{formatPoints(team.basePoints)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2">
                      <p className="text-slate-500">Total</p>
                      <p className="font-semibold">{formatPoints(team.totalPoints)}</p>
                    </div>
                    <div className="rounded-xl bg-indigo-50 p-2">
                      <p className="text-indigo-700">C Bonus</p>
                      <p className="font-semibold text-indigo-800">
                        +{formatPoints(team.captainBonus)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-sky-50 p-2">
                      <p className="text-sky-700">VC Bonus</p>
                      <p className="font-semibold text-sky-800">
                        +{formatPoints(team.viceCaptainBonus)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-600">
                    C:{" "}
                    <span className="font-semibold text-slate-800">
                      {team.captainPlayerId
                        ? (playerNameById.get(team.captainPlayerId) ??
                          `Player ${team.captainPlayerId}`)
                        : "N/A"}
                    </span>{" "}
                    • VC:{" "}
                    <span className="font-semibold text-slate-800">
                      {team.viceCaptainPlayerId
                        ? (playerNameById.get(team.viceCaptainPlayerId) ??
                          `Player ${team.viceCaptainPlayerId}`)
                        : "N/A"}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="glass-card rounded-[1.6rem] p-4 md:p-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Player-wise Performance (Match {matchAnalysis.matchNumber})
            </h2>
            <p className="text-sm text-slate-500">
              Sorted by match points. C/VC tags show leadership usage by fantasy teams.
            </p>
            <div className="mt-4 overflow-x-auto rounded-2xl ring-1 ring-slate-200/80">
              <table className="min-w-full divide-y divide-slate-200 bg-white/85 text-sm">
                <thead className="bg-slate-50/90">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">
                      Player
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">
                      IPL
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-slate-600">
                      Points
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">
                      Owned By
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">
                      C / VC
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topPlayers.map((player) => (
                    <tr key={player.playerId}>
                      <td className="px-3 py-2 font-medium text-slate-800">
                        {player.playerName}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{player.teamShortName}</td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900">
                        {formatPoints(player.points)}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {player.fantasyTeams.join(", ") || "-"}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        <div className="flex flex-wrap gap-1">
                          {player.captainedBy.length > 0 ? (
                            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                              C: {player.captainedBy.join(", ")}
                            </span>
                          ) : null}
                          {player.viceCaptainedBy.length > 0 ? (
                            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
                              VC: {player.viceCaptainedBy.join(", ")}
                            </span>
                          ) : null}
                          {player.captainedBy.length === 0 &&
                          player.viceCaptainedBy.length === 0 ? (
                            <span className="text-xs text-slate-400">-</span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {matchAnalysis.playerPerformances.length > topPlayers.length ? (
              <p className="mt-2 text-xs text-slate-500">
                Showing top {topPlayers.length} players by points for quick scan.
              </p>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
