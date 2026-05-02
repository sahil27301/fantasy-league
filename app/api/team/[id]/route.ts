import { NextResponse } from "next/server";
import { getLeagueComputation } from "@/lib/data/score-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  console.info("[api/team] Team details request", { teamId: id });

  try {
    const result = await getLeagueComputation(false);
    const team = result.snapshot.standings.find((standing) => standing.leagueTeamId === id);
    const insights = result.teamInsights.find((insight) => insight.leagueTeamId === id);

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    return NextResponse.json({
      generatedAt: result.generatedAt,
      team,
      insights,
    });
  } catch (error) {
    console.error("[api/team] Failed to fetch team details", { teamId: id, error });
    return NextResponse.json({ error: "Unable to fetch team details" }, { status: 500 });
  }
}
