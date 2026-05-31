import type { WrappedBestMatchBreakdown } from "@/lib/wrapped/types";

interface WrappedBestMatchTableMotion {
  introDelayMs: number;
  tableInMs: number;
  rowInMs: number;
  rowStaggerMs: number;
}

interface WrappedBestMatchBreakdownTableProps {
  breakdown: WrappedBestMatchBreakdown;
  motion: WrappedBestMatchTableMotion;
}

function formatAdjustedPoints({
  points,
  isCaptain,
  isViceCaptain,
}: {
  points: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
}) {
  if (isCaptain) {
    return points * 2;
  }
  if (isViceCaptain) {
    return points * 1.5;
  }
  return points;
}

function renderRoleBadge({
  isCaptain,
  isViceCaptain,
}: {
  isCaptain: boolean;
  isViceCaptain: boolean;
}) {
  if (isCaptain) {
    return (
      <span className="inline-flex min-w-[30px] justify-center rounded-full border border-cyan-200/50 bg-cyan-300/20 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-[0.1em] text-cyan-100">
        C
      </span>
    );
  }
  if (isViceCaptain) {
    return (
      <span className="inline-flex min-w-[30px] justify-center rounded-full border border-indigo-200/45 bg-indigo-300/20 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-[0.06em] text-indigo-100">
        VC
      </span>
    );
  }
  return null;
}

export function WrappedBestMatchBreakdownTable({
  breakdown,
  motion,
}: WrappedBestMatchBreakdownTableProps) {
  const { introDelayMs, rowInMs, rowStaggerMs, tableInMs } = motion;

  return (
    <div
      className="mt-8 flex max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/20 bg-black/20 opacity-0 backdrop-blur"
      style={{
        touchAction: "pan-y",
        animationName: "wrapped-best-match-table-in",
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
      <div className="border-b border-white/10 px-3 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">
          Matchup
        </p>
        <p className="mt-1 text-sm font-semibold text-cyan-100">
          {breakdown.matchupLabel}
        </p>
      </div>

      <div className="grid grid-cols-[1fr_64px_64px] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">
        <span>Player</span>
        <span className="text-right">Base</span>
        <span className="text-right">Final</span>
      </div>

      <div className="px-2 pb-3">
        <div className="space-y-1">
          {breakdown.players.map((player, index) => {
            const adjusted = formatAdjustedPoints(player);
            return (
              <div
                key={`${player.playerId}-${player.playerName}`}
                className="grid grid-cols-[1fr_64px_64px] items-center rounded-lg border border-white/8 bg-white/[0.04] px-2 py-2 text-sm text-white/90 opacity-0"
                style={{
                  animationName: "wrapped-best-match-row-in",
                  animationDuration: `${rowInMs}ms`,
                  animationTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                  animationFillMode: "forwards",
                  animationDelay: `${introDelayMs + index * rowStaggerMs}ms`,
                }}
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <p className="min-w-0 truncate text-sm font-medium">
                      {player.playerName}
                    </p>
                    {renderRoleBadge(player)}
                  </div>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-white/55">
                    {player.iplTeamShortName}
                  </p>
                </div>

                <span className="text-right text-sm tabular-nums text-white/75">
                  {player.points.toFixed(1)}
                </span>
                <span className="text-right text-sm font-semibold tabular-nums text-cyan-100">
                  {adjusted.toFixed(1)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        @keyframes wrapped-best-match-table-in {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes wrapped-best-match-row-in {
          0% {
            opacity: 0;
            transform: translateY(10px) scale(0.99);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

      `}</style>
    </div>
  );
}
