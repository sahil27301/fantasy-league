import { NextResponse } from "next/server";
import { getMatchAnalysisComputation } from "@/lib/matches/match-analysis";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get("refresh") === "1";
  console.info("[api/matches] Match list request", { forceRefresh });

  try {
    const result = await getMatchAnalysisComputation(forceRefresh);
    return NextResponse.json({
      generatedAt: result.generatedAt,
      completedMatches: result.completedMatches,
      upcomingMatches: result.upcomingMatches,
    });
  } catch (error) {
    console.error("[api/matches] Failed to compute match list", { error });
    return NextResponse.json(
      { error: "Unable to compute match list" },
      { status: 500 },
    );
  }
}
