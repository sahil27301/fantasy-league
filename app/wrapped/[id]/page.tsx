import { notFound } from "next/navigation";
import { getLeagueComputation } from "@/lib/data/score-service";
import { getMatchAnalysisComputation } from "@/lib/matches/match-analysis";
import { getMatchProgression } from "@/lib/progression/match-progression";
import { buildWrappedPayload } from "@/lib/wrapped/build-wrapped";
import type { TeamWrappedPayload } from "@/lib/wrapped/types";
import { WrappedStoryViewer } from "@/components/wrapped-story-viewer";

export const dynamic = "force-dynamic";

export default async function WrappedTeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  console.info("[wrapped-page] Rendering team wrapped page", { teamId: id });
  const [score, progression, matchAnalysis] = await Promise.all([
    getLeagueComputation(false),
    getMatchProgression(false),
    getMatchAnalysisComputation(false),
  ]);
  const hasTeam = score.snapshot.standings.some((standing) => standing.leagueTeamId === id);
  if (!hasTeam) {
    notFound();
  }

  let payload: TeamWrappedPayload;
  try {
    payload = buildWrappedPayload({ teamId: id, score, progression, matchAnalysis });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Team not found")) {
      notFound();
    }
    throw error;
  }

  return (
    <main className="fixed inset-0 z-10 flex h-[100dvh] flex-col bg-[#020617]">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[#020617]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_12%_16%,rgba(76,29,149,0.34),transparent_34%),radial-gradient(circle_at_88%_24%,rgba(6,182,212,0.24),transparent_38%),radial-gradient(circle_at_54%_86%,rgba(79,70,229,0.2),transparent_42%)]" />
      <div className="relative z-10 flex-1">
        <WrappedStoryViewer payload={payload} />
      </div>
    </main>
  );
}
