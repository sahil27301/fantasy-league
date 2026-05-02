import { describe, expect, it } from "vitest";
import { parseLivePlayersPayload } from "@/lib/ipl/client";

describe("parseLivePlayersPayload", () => {
  it("extracts players from IPL payload", () => {
    const players = parseLivePlayersPayload({
      Data: {
        Value: {
          Players: [
            {
              Id: 123,
              TeamId: 456,
              ShortName: "Virat Kohli",
              TeamShortName: "RCB",
              OverallPoints: 900,
            },
          ],
        },
      },
    });

    expect(players).toHaveLength(1);
    expect(players[0]).toEqual({
      id: 123,
      teamId: 456,
      shortName: "Virat Kohli",
      teamShortName: "RCB",
      overallPoints: 900,
    });
  });

  it("throws for invalid payloads", () => {
    expect(() => parseLivePlayersPayload({ bad: "payload" })).toThrow();
  });
});
