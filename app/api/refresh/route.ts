import { NextResponse } from "next/server";
import { getLeagueComputation } from "@/lib/data/score-service";
import { isAdminSession } from "@/lib/auth/admin";

export async function POST() {
  const isAdmin = await isAdminSession();
  if (!isAdmin) {
    console.warn("[api/refresh] Unauthorized refresh attempt blocked");
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  console.info("[api/refresh] Manual refresh triggered");
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
