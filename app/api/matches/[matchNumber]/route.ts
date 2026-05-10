import { NextResponse } from "next/server";
import {
  getMatchAnalysisComputation,
  getUpcomingMatchPreview,
} from "@/lib/matches/match-analysis";

export async function GET(
  request: Request,
  context: { params: Promise<{ matchNumber: string }> },
) {
  const { matchNumber: rawMatchNumber } = await context.params;
  const matchNumber = Number(rawMatchNumber);
  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get("refresh") === "1";
  const mode = url.searchParams.get("mode");
  console.info("[api/matches/:matchNumber] Match analysis request", {
    matchNumber,
    forceRefresh,
    mode,
  });

  if (!Number.isFinite(matchNumber) || matchNumber <= 0) {
    return NextResponse.json({ error: "Invalid match number" }, { status: 400 });
  }

  try {
    if (mode === "upcoming") {
      const upcomingPreview = await getUpcomingMatchPreview(forceRefresh);
      if (!upcomingPreview) {
        return NextResponse.json(
          { error: "No upcoming match available" },
          { status: 404 },
        );
      }
      if (upcomingPreview.preview.matchNumber !== matchNumber) {
        return NextResponse.json(
          { error: "Requested upcoming match preview is not available" },
          { status: 404 },
        );
      }
      return NextResponse.json({
        generatedAt: upcomingPreview.generatedAt,
        match: upcomingPreview.preview,
        upcoming: upcomingPreview.upcoming,
        upcomingMatches: [upcomingPreview.upcoming],
      });
    }

    const result = await getMatchAnalysisComputation(forceRefresh);
    const analysis = result.analysesByMatch[matchNumber];
    if (!analysis) {
      return NextResponse.json(
        { error: "Match not available in completed data" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      generatedAt: result.generatedAt,
      match: analysis,
      upcomingMatches: result.upcomingMatches,
    });
  } catch (error) {
    console.error("[api/matches/:matchNumber] Failed to compute match analysis", {
      matchNumber,
      error,
    });
    return NextResponse.json(
      { error: "Unable to compute match analysis" },
      { status: 500 },
    );
  }
}
