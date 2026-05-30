import { NextResponse } from "next/server";
import { getLeagueComputation } from "@/lib/data/score-service";
import { getMatchAnalysisComputation } from "@/lib/matches/match-analysis";
import { getMatchProgression } from "@/lib/progression/match-progression";
import { buildWrappedPayload } from "@/lib/wrapped/build-wrapped";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  console.info("[api/wrapped] Wrapped request received", { teamId: id });

  try {
    const [score, progression, matchAnalysis] = await Promise.all([
      getLeagueComputation(false),
      getMatchProgression(false),
      getMatchAnalysisComputation(false),
    ]);
    const payload = buildWrappedPayload({ teamId: id, score, progression, matchAnalysis });
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Team not found")) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }
    console.error("[api/wrapped] Failed to build wrapped payload", {
      teamId: id,
      error,
    });
    return NextResponse.json({ error: "Unable to fetch wrapped payload" }, { status: 500 });
  }
}
