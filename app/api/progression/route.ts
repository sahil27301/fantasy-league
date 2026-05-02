import { NextResponse } from "next/server";
import { getMatchProgression } from "@/lib/progression/match-progression";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get("refresh") === "1";
  console.info("[api/progression] Progression request received");
  try {
    const progression = await getMatchProgression(forceRefresh);
    return NextResponse.json({
      progression,
    });
  } catch (error) {
    console.error("[api/progression] Failed to fetch progression", { error });
    return NextResponse.json({ error: "Unable to fetch progression" }, { status: 500 });
  }
}
