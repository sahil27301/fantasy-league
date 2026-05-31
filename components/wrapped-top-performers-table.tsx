import type { WrappedTopPerformersBreakdown } from "@/lib/wrapped/types";

interface WrappedTopPerformersTableMotion {
  introDelayMs: number;
  tableInMs: number;
  rowInMs: number;
  rowStaggerMs: number;
}

interface WrappedTopPerformersTableProps {
  breakdown: WrappedTopPerformersBreakdown;
  motion: WrappedTopPerformersTableMotion;
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

export function WrappedTopPerformersTable({
  breakdown,
  motion,
}: WrappedTopPerformersTableProps) {
  const { introDelayMs, tableInMs, rowInMs, rowStaggerMs } = motion;

  return (
    <div
      className="mt-8 max-w-2xl overflow-hidden rounded-2xl border border-white/20 bg-black/20 opacity-0 backdrop-blur"
      style={{
        animationName: "wrapped-performers-table-in",
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
      <div className="grid grid-cols-[1fr_74px] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">
        <span>Player</span>
        <span className="text-right">Points</span>
      </div>

      <div className="space-y-1 px-2 pb-2">
        {breakdown.topFive.map((player, index) => (
          <div
            key={`${player.playerId}-${player.playerName}`}
            className={`grid grid-cols-[1fr_74px] items-center rounded-lg border px-2 py-2 text-sm opacity-0 ${
              index === 0
                ? "border-cyan-300/35 bg-cyan-300/10 text-white"
                : "border-white/8 bg-white/[0.04] text-white/90"
            }`}
            style={{
              animationName: "wrapped-performers-row-in",
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
                {player.teamShortName}
              </p>
            </div>
            <span className="text-right font-semibold tabular-nums text-cyan-100">
              {player.totalPoints.toFixed(1)}
            </span>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes wrapped-performers-table-in {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes wrapped-performers-row-in {
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
