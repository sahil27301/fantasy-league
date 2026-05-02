import { NextResponse } from "next/server";
import { getLeagueComputation } from "@/lib/data/score-service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get("refresh") === "1";

  console.info("[api/leaderboard] Request received", { forceRefresh });

  try {
    const result = await getLeagueComputation(forceRefresh);
    return NextResponse.json({
      generatedAt: result.generatedAt,
      standings: result.snapshot.standings,
      insights: result.teamInsights,
    });
  } catch (error) {
    console.error("[api/leaderboard] Failed to compute leaderboard", { error });
    return NextResponse.json(
      { error: "Unable to compute leaderboard" },
      { status: 500 },
    );
  }
}
