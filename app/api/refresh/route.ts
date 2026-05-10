import { getLeagueComputation } from "@/lib/data/score-service";
import { NextResponse } from "next/server";

export async function POST() {
  console.info("[api/refresh] Public refresh triggered");
  try {
    const result = await getLeagueComputation(true);
    return NextResponse.json({
      generatedAt: result.generatedAt,
      message: "Scores refreshed",
    });
  } catch (error) {
    console.error("[api/refresh] Refresh failed", { error });
    return NextResponse.json({ error: "Refresh failed" }, { status: 500 });
  }
}
