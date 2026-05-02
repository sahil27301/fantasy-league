"use client";

import { useMemo, useState } from "react";
import { HorizontalBars } from "@/components/charts/horizontal-bars";
import { formatPoints } from "@/lib/utils/format";
import type { TeamPlayerContribution } from "@/lib/types";

interface LeadershipWindowView {
  windowIndex: 1 | 2 | 3;
  fromMatch: number;
  toMatch: number;
  captainName: string;
  viceCaptainName: string;
  captainBonus: number;
  viceCaptainBonus: number;
}

interface TeamLeadershipBreakdownProps {
  contributors: TeamPlayerContribution[];
  leadershipWindows: LeadershipWindowView[];
}

export function TeamLeadershipBreakdown({
  contributors,
  leadershipWindows,
}: TeamLeadershipBreakdownProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [activeWindow, setActiveWindow] = useState<1 | 2 | 3>(1);

  const sortedWindows = useMemo(
    () => [...leadershipWindows].sort((a, b) => a.windowIndex - b.windowIndex),
    [leadershipWindows],
  );

  const active = sortedWindows.find((window) => window.windowIndex === activeWindow);
  const window1 = sortedWindows.find((window) => window.windowIndex === 1);
  const window2 = sortedWindows.find((window) => window.windowIndex === 2);
  const hasChanged =
    Boolean(window1 && window2) &&
    (window1.captainName !== window2.captainName ||
      window1.viceCaptainName !== window2.viceCaptainName);

  return (
    <>
      <section className="glass-card rounded-3xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Leadership Windows</h2>
            <p className="text-sm text-slate-500">
              Captain and vice-captain setup by transfer window
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              hasChanged ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-700"
            }`}
          >
            {hasChanged ? "Changed after Match 35" : "No C/VC change in Window 2"}
          </span>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {sortedWindows
            .filter((window) => window.windowIndex <= 2)
            .map((window) => (
              <button
                key={window.windowIndex}
                type="button"
                onClick={() => setActiveWindow(window.windowIndex)}
                className={`rounded-2xl border p-4 text-left transition ${
                  activeWindow === window.windowIndex
                    ? "border-indigo-300 bg-indigo-50/80"
                    : "border-slate-200 bg-white/75 hover:bg-slate-50"
                }`}
              >
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Window {window.windowIndex} (M{window.fromMatch}-{window.toMatch})
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Captain:
                  <span
                    className="ml-1 cursor-pointer font-semibold text-slate-900 underline decoration-dotted"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setSelectedPlayer(window.captainName);
                    }}
                  >
                    {window.captainName}
                  </span>
                </p>
                <p className="text-sm text-slate-600">
                  Vice-Captain:
                  <span
                    className="ml-1 cursor-pointer font-semibold text-slate-900 underline decoration-dotted"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setSelectedPlayer(window.viceCaptainName);
                    }}
                  >
                    {window.viceCaptainName}
                  </span>
                </p>
                <div className="mt-2 flex gap-2 text-xs">
                  <span className="rounded-full bg-white px-2 py-1 text-slate-700 ring-1 ring-slate-200">
                    C Bonus {formatPoints(window.captainBonus)}
                  </span>
                  <span className="rounded-full bg-white px-2 py-1 text-slate-700 ring-1 ring-slate-200">
                    VC Bonus {formatPoints(window.viceCaptainBonus)}
                  </span>
                </div>
              </button>
            ))}
        </div>

        {active ? (
          <p className="mt-3 text-xs text-slate-500">
            Viewing Window {active.windowIndex}: captain/vice selections and bonus impact.
          </p>
        ) : null}
      </section>

      <section className="glass-card rounded-3xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Player Contribution Chart</h2>
            <p className="text-sm text-slate-500">
              Total season contribution after captain and vice-captain multipliers
            </p>
          </div>
          {selectedPlayer ? (
            <button
              type="button"
              onClick={() => setSelectedPlayer(null)}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
            >
              Highlight: {selectedPlayer} (Clear)
            </button>
          ) : null}
        </div>
        <div className="mt-4">
          <HorizontalBars
            data={contributors.map((player) => ({
              label: player.playerName,
              value: player.pointsAfterMultiplier,
            }))}
            highlightedLabel={selectedPlayer}
            onSelectLabel={(label) =>
              setSelectedPlayer((current) => (current === label ? null : label))
            }
          />
        </div>
      </section>
    </>
  );
}
