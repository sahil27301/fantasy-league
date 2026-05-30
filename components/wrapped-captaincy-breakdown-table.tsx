import type { WrappedCaptaincyBreakdown } from "@/lib/wrapped/types";

interface WrappedCaptaincyTableMotion {
  introDelayMs: number;
  tableInMs: number;
  rowInMs: number;
  rowStaggerMs: number;
}

interface WrappedCaptaincyBreakdownTableProps {
  breakdown: WrappedCaptaincyBreakdown;
  motion: WrappedCaptaincyTableMotion;
}

export function WrappedCaptaincyBreakdownTable({
  breakdown,
  motion,
}: WrappedCaptaincyBreakdownTableProps) {
  const { introDelayMs, tableInMs, rowInMs, rowStaggerMs } = motion;
  const totalRowDelay = introDelayMs + breakdown.players.length * rowStaggerMs;

  return (
    <div
      className="mt-8 max-w-2xl overflow-hidden rounded-2xl border border-white/20 bg-black/20 opacity-0 backdrop-blur"
      style={{
        animationName: "wrapped-captaincy-table-in",
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
      <div className="grid grid-cols-[70px_62px_1fr_84px] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">
        <span>Window</span>
        <span className="text-center">Role</span>
        <span>Player</span>
        <span className="text-right">Bonus</span>
      </div>

      <div className="space-y-1 px-2 pb-2">
        {breakdown.players.map((entry, index) => (
          <div
            key={`${entry.windowIndex}-${entry.role}-${entry.playerName}`}
            className="grid grid-cols-[70px_62px_1fr_84px] items-center rounded-lg border border-white/8 bg-white/[0.04] px-2 py-2 text-sm text-white/90 opacity-0"
            style={{
              animationName: "wrapped-captaincy-row-in",
              animationDuration: `${rowInMs}ms`,
              animationTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
              animationFillMode: "forwards",
              animationDelay: `${introDelayMs + index * rowStaggerMs}ms`,
            }}
          >
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">
              W{entry.windowIndex}
            </span>
            <div className="flex justify-center">
              {entry.role === "captain" ? (
                <span className="inline-flex min-w-[30px] justify-center rounded-full border border-cyan-200/50 bg-cyan-300/20 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-[0.1em] text-cyan-100">
                  C
                </span>
              ) : (
                <span className="inline-flex min-w-[30px] justify-center rounded-full border border-indigo-200/45 bg-indigo-300/20 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-[0.06em] text-indigo-100">
                  VC
                </span>
              )}
            </div>
            <span className="truncate pr-2 font-medium text-white/90">{entry.playerName}</span>
            <span className="text-right font-semibold tabular-nums text-white">
              +{entry.bonusPoints.toFixed(1)}
            </span>
          </div>
        ))}
      </div>

      <div
        className="border-t border-white/10 px-4 py-3 text-sm opacity-0"
        style={{
          animationName: "wrapped-captaincy-row-in",
          animationDuration: `${rowInMs}ms`,
          animationTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
          animationFillMode: "forwards",
          animationDelay: `${totalRowDelay}ms`,
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/55">
            Captain Total
          </span>
          <span className="font-semibold tabular-nums text-cyan-100">
            +{breakdown.captainBonus.toFixed(1)}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/55">
            Vice Captain Total
          </span>
          <span className="font-semibold tabular-nums text-indigo-100">
            +{breakdown.viceCaptainBonus.toFixed(1)}
          </span>
        </div>
      </div>

      <style jsx>{`
        @keyframes wrapped-captaincy-table-in {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes wrapped-captaincy-row-in {
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
