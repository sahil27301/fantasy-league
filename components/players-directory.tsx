"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPoints } from "@/lib/utils/format";

export interface PlayerDirectoryRow {
  fantasyTeamId: string;
  fantasyTeamName: string;
  fantasyOwnerName: string;
  playerId: number;
  playerName: string;
  iplTeamShortName: string;
  basePoints: number;
  boostedPoints: number;
  captainWindows: number[];
  viceCaptainWindows: number[];
}

export function PlayersDirectory({ rows }: { rows: PlayerDirectoryRow[] }) {
  const [query, setQuery] = useState("");
  const [selectedIplTeam, setSelectedIplTeam] = useState("all");
  const [selectedFantasyTeam, setSelectedFantasyTeam] = useState("all");
  const [pointsMode, setPointsMode] = useState<"base" | "boosted">("base");

  const iplOptions = useMemo(
    () => [...new Set(rows.map((row) => row.iplTeamShortName))].sort(),
    [rows],
  );
  const fantasyOptions = useMemo(
    () => [...new Set(rows.map((row) => row.fantasyTeamName))].sort(),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      const queryMatches =
        normalizedQuery.length === 0 ||
        row.playerName.toLowerCase().includes(normalizedQuery) ||
        row.fantasyTeamName.toLowerCase().includes(normalizedQuery) ||
        row.iplTeamShortName.toLowerCase().includes(normalizedQuery);
      const iplMatches =
        selectedIplTeam === "all" || row.iplTeamShortName === selectedIplTeam;
      const fantasyMatches =
        selectedFantasyTeam === "all" || row.fantasyTeamName === selectedFantasyTeam;
      return queryMatches && iplMatches && fantasyMatches;
    });
    return filtered.sort(
      (a, b) =>
        (pointsMode === "base" ? b.basePoints - a.basePoints : b.boostedPoints - a.boostedPoints) ||
        a.playerName.localeCompare(b.playerName),
    );
  }, [rows, query, selectedIplTeam, selectedFantasyTeam, pointsMode]);

  useEffect(() => {
    console.info("[players-directory] Filter state updated", {
      query,
      selectedIplTeam,
      selectedFantasyTeam,
      pointsMode,
      visibleRows: filteredRows.length,
    });
  }, [query, selectedIplTeam, selectedFantasyTeam, pointsMode, filteredRows.length]);

  return (
    <section className="glass-card rounded-[1.6rem] p-4 md:p-5">
      <div className="flex flex-wrap items-end gap-2.5">
        <div className="min-w-[200px] flex-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Search
          </label>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Player, IPL team, fantasy team"
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
          />
        </div>
        <div className="min-w-[140px]">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            IPL Team
          </label>
          <select
            value={selectedIplTeam}
            onChange={(event) => setSelectedIplTeam(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
          >
            <option value="all">All</option>
            {iplOptions.map((team) => (
              <option key={`ipl-${team}`} value={team}>
                {team}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[160px]">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Fantasy Team
          </label>
          <select
            value={selectedFantasyTeam}
            onChange={(event) => setSelectedFantasyTeam(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
          >
            <option value="all">All</option>
            {fantasyOptions.map((team) => (
              <option key={`fantasy-${team}`} value={team}>
                {team}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[180px]">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Points Mode
          </label>
          <div className="mt-1 inline-flex rounded-full bg-white/85 p-1 ring-1 ring-indigo-100">
            <button
              type="button"
              onClick={() => setPointsMode("base")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                pointsMode === "base" ? "bg-indigo-600 text-white" : "text-slate-700"
              }`}
            >
              Base
            </button>
            <button
              type="button"
              onClick={() => setPointsMode("boosted")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                pointsMode === "boosted" ? "bg-indigo-600 text-white" : "text-slate-700"
              }`}
            >
              With C/VC
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl ring-1 ring-slate-200/80">
        <table className="min-w-full divide-y divide-slate-200 bg-white/85 text-sm">
          <thead className="bg-slate-50/90">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-600">Player</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600">IPL Team</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600">
                Fantasy Team
              </th>
              <th className="px-3 py-2 text-right font-semibold text-slate-600">
                {pointsMode === "base" ? "Base Points" : "Points (With C/VC)"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRows.map((row) => (
              <tr key={`${row.fantasyTeamId}-${row.playerId}`}>
                <td className="px-3 py-2 font-medium text-slate-800">
                  <div className="flex flex-wrap items-center gap-1">
                    <span>{row.playerName}</span>
                    {row.captainWindows.map((window) => (
                      <span
                        key={`c-${row.fantasyTeamId}-${row.playerId}-${window}`}
                        className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700"
                      >
                        C{window}
                      </span>
                    ))}
                    {row.viceCaptainWindows.map((window) => (
                      <span
                        key={`vc-${row.fantasyTeamId}-${row.playerId}-${window}`}
                        className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700"
                      >
                        VC{window}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2 text-slate-600">{row.iplTeamShortName}</td>
                <td className="px-3 py-2 text-slate-600">{row.fantasyTeamName}</td>
                <td className="px-3 py-2 text-right font-semibold text-slate-900">
                  {formatPoints(
                    pointsMode === "base" ? row.basePoints : row.boostedPoints,
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredRows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No players match current filters.</p>
      ) : null}
    </section>
  );
}
