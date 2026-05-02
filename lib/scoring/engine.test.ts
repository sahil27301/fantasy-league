import { describe, expect, it } from "vitest";
import { computeScores } from "@/lib/scoring/engine";

describe("computeScores", () => {
  it("applies captain and vice-captain multipliers correctly", () => {
    const result = computeScores({
      matchNumber: 36,
      teams: [{ id: "sahil", ownerName: "Sahil", displayName: "Sahil XI" }],
      roster: [
        {
          ownerName: "Sahil",
          playerNameRaw: "A",
          playerNameNormalized: "A",
          iplTeamShortName: "MI",
          windowIndex: 2,
          captaincyRole: "normal",
          sourceRow: 1,
          matchConfidence: "high",
          resolvedPlayerId: 1,
          resolvedTeamId: 100,
        },
        {
          ownerName: "Sahil",
          playerNameRaw: "B",
          playerNameNormalized: "B",
          iplTeamShortName: "RCB",
          windowIndex: 2,
          captaincyRole: "normal",
          sourceRow: 2,
          matchConfidence: "high",
          resolvedPlayerId: 2,
          resolvedTeamId: 101,
        },
      ],
      captainWindows: [
        {
          leagueTeamId: "sahil",
          windowIndex: 2,
          fromMatch: 36,
          toMatch: 70,
          captainPlayerId: 1,
          viceCaptainPlayerId: 2,
        },
      ],
      livePlayers: [
        {
          id: 1,
          teamId: 100,
          shortName: "A",
          teamShortName: "MI",
          overallPoints: 10,
        },
        {
          id: 2,
          teamId: 101,
          shortName: "B",
          teamShortName: "RCB",
          overallPoints: 8,
        },
      ],
    });

    const standing = result.snapshot.standings[0];
    expect(standing.totalPoints).toBe(32);
    expect(standing.captainBonus).toBe(10);
    expect(standing.viceCaptainBonus).toBe(4);
  });
});
