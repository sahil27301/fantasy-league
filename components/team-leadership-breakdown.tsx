"use client";

import { useMemo, useRef, useState } from "react";
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
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [selectedRolesByPlayer, setSelectedRolesByPlayer] = useState<
    Record<string, "captain" | "viceCaptain">
  >({});
  const [activeWindow, setActiveWindow] = useState<1 | 2 | 3>(1);
  const chartSectionRef = useRef<HTMLElement | null>(null);

  const sortedWindows = useMemo(
    () => [...leadershipWindows].sort((a, b) => a.windowIndex - b.windowIndex),
    [leadershipWindows],
  );

  const active = sortedWindows.find((window) => window.windowIndex === activeWindow);
  const window1 = sortedWindows.find((window) => window.windowIndex === 1);
  const window2 = sortedWindows.find((window) => window.windowIndex === 2);
  const hasChanged =
    window1 && window2
      ? window1.captainName !== window2.captainName ||
        window1.viceCaptainName !== window2.viceCaptainName
      : false;

  const handleLeadershipPlayerSelect = (
    playerName: string,
    role: "captain" | "viceCaptain",
  ) => {
    console.info("[team-leadership] Leadership player selected", {
      playerName,
      role,
      activeWindow,
    });
    setSelectedPlayers([playerName]);
    setSelectedRolesByPlayer({ [playerName]: role });
    chartSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleWindowSelect = (window: LeadershipWindowView) => {
    console.info("[team-leadership] Window selected", {
      windowIndex: window.windowIndex,
      captainName: window.captainName,
      viceCaptainName: window.viceCaptainName,
    });
    setActiveWindow(window.windowIndex);
    const labels = [...new Set([window.captainName, window.viceCaptainName])];
    setSelectedPlayers(labels);
    setSelectedRolesByPlayer({
      [window.captainName]: "captain",
      [window.viceCaptainName]: "viceCaptain",
    });
    chartSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

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
                onClick={() => handleWindowSelect(window)}
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
                    className={`ml-1 cursor-pointer rounded-md px-1 font-semibold underline decoration-dotted transition ${
                      selectedPlayers.includes(window.captainName)
                        ? "bg-indigo-100 text-indigo-700"
                        : "text-slate-900"
                    }`}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      handleLeadershipPlayerSelect(window.captainName, "captain");
                    }}
                  >
                    {window.captainName}
                  </span>
                </p>
                <p className="text-sm text-slate-600">
                  Vice-Captain:
                  <span
                    className={`ml-1 cursor-pointer rounded-md px-1 font-semibold underline decoration-dotted transition ${
                      selectedPlayers.includes(window.viceCaptainName)
                        ? "bg-indigo-100 text-indigo-700"
                        : "text-slate-900"
                    }`}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      handleLeadershipPlayerSelect(
                        window.viceCaptainName,
                        "viceCaptain",
                      );
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

      <section ref={chartSectionRef} className="glass-card rounded-3xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Player Contribution Chart</h2>
            <p className="text-sm text-slate-500">
              Total season contribution after captain and vice-captain multipliers
            </p>
            {active ? (
              <p className="mt-1 text-xs text-slate-500">
                Active window {active.windowIndex}: card click highlights captain by default.
              </p>
            ) : null}
          </div>
          {selectedPlayers.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setSelectedPlayers([]);
                setSelectedRolesByPlayer({});
              }}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
            >
              Highlight: {selectedPlayers.join(" + ")} (Clear)
            </button>
          ) : null}
        </div>
        <div className="mt-4">
          <HorizontalBars
            data={contributors.map((player) => ({
              label: player.playerName,
              value: player.pointsAfterMultiplier,
            }))}
            highlightedLabels={selectedPlayers}
            highlightRoles={selectedRolesByPlayer}
            onSelectLabel={(label) => {
              setSelectedPlayers((current) => {
                if (current.includes(label)) {
                  return current.filter((item) => item !== label);
                }
                return [...current, label];
              });
              setSelectedRolesByPlayer((current) => ({
                ...current,
                [label]: current[label] ?? "captain",
              }));
            }}
          />
        </div>
      </section>
    </>
  );
}
