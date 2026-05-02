import teams from "@/data/league-teams.json";
import roster from "@/data/normalized_roster.json";
import captainWindows from "@/data/captain_windows.json";
import type { CaptainWindow, LeagueTeam, NormalizedRosterEntry } from "@/lib/types";

export function getLeagueTeams(): LeagueTeam[] {
  return teams as LeagueTeam[];
}

export function getNormalizedRoster(): NormalizedRosterEntry[] {
  return roster as NormalizedRosterEntry[];
}

export function getCaptainWindows(): CaptainWindow[] {
  return captainWindows as CaptainWindow[];
}
