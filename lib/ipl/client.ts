import { z } from "zod";
import type { IplLivePlayer } from "@/lib/types";

const gamedayPlayerSchema = z.object({
  Id: z.number(),
  TeamId: z.number(),
  ShortName: z.string(),
  TeamShortName: z.string(),
  OverallPoints: z.number(),
});

const gamedayResponseSchema = z.object({
  Data: z.object({
    Value: z.object({
      Players: z.array(gamedayPlayerSchema),
    }),
  }),
});

const popupResponseSchema = z.object({
  Data: z
    .object({
      Value: z.unknown().optional(),
    })
    .optional(),
  Value: z.unknown().optional(),
});

interface GamedayContext {
  tourgamedayId: number;
  teamgamedayId: number;
}

const GAME_DAY_CACHE_TTL_MS = 1000 * 60 * 30;
const GAMEDAY_SCAN_MAX = 120;
const globalGamedayCache = globalThis as typeof globalThis & {
  __iplGamedayContext?: { value: GamedayContext; cachedAt: number };
};

function buildLivePlayersUrl(context: GamedayContext) {
  return `https://fantasy.iplt20.com/classic/api/feed/live/gamedayplayers?lang=en&tourgamedayId=${context.tourgamedayId}&teamgamedayId=${context.teamgamedayId}`;
}

async function tryFetchPlayersForContext(context: GamedayContext) {
  const url = buildLivePlayersUrl(context);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    return null;
  }

  const json = await response.json();
  const parsed = gamedayResponseSchema.safeParse(json);
  if (!parsed.success) {
    return null;
  }

  const players = parsed.data.Data.Value.Players;
  if (players.length === 0) {
    return null;
  }

  return players.map((player) => ({
    id: player.Id,
    teamId: player.TeamId,
    shortName: player.ShortName,
    teamShortName: player.TeamShortName,
    overallPoints: player.OverallPoints,
  })) as IplLivePlayer[];
}

export async function resolveGamedayContext(): Promise<GamedayContext> {
  const cached = globalGamedayCache.__iplGamedayContext;
  if (cached && Date.now() - cached.cachedAt < GAME_DAY_CACHE_TTL_MS) {
    return cached.value;
  }

  console.info("[ipl-client] Resolving latest gameday via descending scan", {
    scanMax: GAMEDAY_SCAN_MAX,
  });
  for (let id = GAMEDAY_SCAN_MAX; id >= 1; id -= 1) {
    const candidate = { tourgamedayId: id, teamgamedayId: id };
    const players = await tryFetchPlayersForContext(candidate);
    if (!players) {
      continue;
    }
    globalGamedayCache.__iplGamedayContext = {
      value: candidate,
      cachedAt: Date.now(),
    };
    console.info("[ipl-client] Resolved latest gameday context", {
      resolved: candidate,
      playerCount: players.length,
    });
    return candidate;
  }

  throw new Error(
    `Unable to resolve a valid IPL gameday within 1..${GAMEDAY_SCAN_MAX}`,
  );
}

export function parseLivePlayersPayload(payload: unknown): IplLivePlayer[] {
  const parsed = gamedayResponseSchema.safeParse(payload);
  if (!parsed.success) {
    console.error("[ipl-client] Invalid live players payload", {
      issues: parsed.error.issues,
    });
    throw new Error("Unexpected live player payload");
  }

  return parsed.data.Data.Value.Players.map((player) => ({
    id: player.Id,
    teamId: player.TeamId,
    shortName: player.ShortName,
    teamShortName: player.TeamShortName,
    overallPoints: player.OverallPoints,
  }));
}

export async function fetchLivePlayers(): Promise<IplLivePlayer[]> {
  const context = await resolveGamedayContext();
  const url = buildLivePlayersUrl(context);

  console.info("[ipl-client] Fetching live players", {
    url,
    tourgamedayId: context.tourgamedayId,
    teamgamedayId: context.teamgamedayId,
  });

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    console.error("[ipl-client] Failed to fetch live players", {
      status: response.status,
      statusText: response.statusText,
    });
    throw new Error(`Unable to fetch IPL live players (${response.status})`);
  }

  const json = await response.json();
  const players = parseLivePlayersPayload(json);

  console.info("[ipl-client] Live players fetched", {
    playerCount: players.length,
    firstPlayer: players[0]?.shortName ?? null,
  });

  return players;
}

export async function fetchPlayerPopupCards(teamId: number, playerId: number) {
  const url = `https://fantasy.iplt20.com/classic/api/feed/live/gameday-player/popup-cards?teamId=${teamId}&playerId=${playerId}`;

  console.info("[ipl-client] Fetching player popup cards", { teamId, playerId });
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    console.error("[ipl-client] Failed popup cards fetch", {
      teamId,
      playerId,
      status: response.status,
    });
    throw new Error(`Unable to fetch player popup cards (${response.status})`);
  }

  const json = await response.json();
  const parsed = popupResponseSchema.safeParse(json);
  if (!parsed.success) {
    console.error("[ipl-client] Invalid popup cards payload", {
      teamId,
      playerId,
      issues: parsed.error.issues,
    });
    throw new Error("Unexpected popup cards payload");
  }

  console.info("[ipl-client] Popup cards fetched", { teamId, playerId });
  return parsed.data.Data?.Value ?? parsed.data.Value ?? null;
}
