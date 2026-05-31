"use client";

import type { WrappedLeagueBestPlayersBreakdown } from "@/lib/wrapped/types";

interface WrappedLeagueBestPlayersCardMotion {
  introDelayMs: number;
  tableInMs: number;
  rowInMs: number;
  rowStaggerMs: number;
}

interface WrappedLeagueBestPlayersCardProps {
  breakdown: WrappedLeagueBestPlayersBreakdown;
  motion: WrappedLeagueBestPlayersCardMotion;
}

function renderRoleBadge(role: "captain" | "viceCaptain" | "normal") {
  if (role === "captain") {
    return (
      <span className="inline-flex min-w-[30px] justify-center rounded-full border border-cyan-200/50 bg-cyan-300/20 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-[0.1em] text-cyan-100">
        C
      </span>
    );
  }
  if (role === "viceCaptain") {
    return (
      <span className="inline-flex min-w-[30px] justify-center rounded-full border border-indigo-200/45 bg-indigo-300/20 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-[0.06em] text-indigo-100">
        VC
      </span>
    );
  }
  return null;
}

export function WrappedLeagueBestPlayersCard({
  breakdown,
  motion,
}: WrappedLeagueBestPlayersCardProps) {
  const { introDelayMs, tableInMs, rowInMs, rowStaggerMs } = motion;

  return (
    <div
      className="mt-4 overflow-hidden rounded-xl border border-white/14 bg-white/[0.03] opacity-0"
      style={{
        animationName: "wrapped-league-best-card-in",
        animationDuration: `${tableInMs}ms`,
        animationTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        animationFillMode: "forwards",
        animationDelay: `${introDelayMs}ms`,
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
      onTouchEnd={(event) => event.stopPropagation()}
    >
      <div className="border-b border-white/10 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">
          League Best Players
        </p>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_80px_64px] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">
        <span>Player</span>
        <span>Team</span>
        <span className="text-right">Points</span>
      </div>
      <div className="space-y-1 px-2 pb-2">
        {breakdown.topPlayers.map((player, index) => (
          <div
            key={`${player.playerId}-${player.fantasyTeamName}`}
            className={`grid grid-cols-[minmax(0,1fr)_80px_64px] items-center rounded-lg border px-2 py-2 text-sm opacity-0 ${
              index === 0
                ? "border-cyan-300/35 bg-cyan-300/10 text-white"
                : "border-white/8 bg-white/[0.04] text-white/90"
            }`}
            style={{
              animationName: "wrapped-league-best-row-in",
              animationDuration: `${rowInMs}ms`,
              animationTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
              animationFillMode: "forwards",
              animationDelay: `${introDelayMs + index * rowStaggerMs}ms`,
            }}
          >
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-1.5">
                <p className="min-w-0 truncate font-medium">{player.playerName}</p>
                {renderRoleBadge(player.role)}
              </div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-white/55">
                {player.iplTeamShortName}
              </p>
            </div>
            <div className="min-w-0 pr-2">
              <p className="truncate text-xs text-white/75">{player.fantasyTeamName}</p>
            </div>
            <span className="text-right font-semibold tabular-nums text-cyan-100">
              {player.totalPoints.toFixed(1)}
            </span>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes wrapped-league-best-card-in {
          0% {
            opacity: 0;
            transform: translateY(8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes wrapped-league-best-row-in {
          0% {
            opacity: 0;
            transform: translateY(8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
