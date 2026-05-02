create extension if not exists "uuid-ossp";

create table if not exists league_teams (
  id text primary key,
  name text not null,
  owner_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists league_team_players (
  id uuid primary key default uuid_generate_v4(),
  league_team_id text not null references league_teams(id) on delete cascade,
  player_id bigint not null,
  team_id bigint not null,
  display_name text not null,
  active_from_match integer not null,
  active_to_match integer not null
);

create table if not exists captain_windows (
  id uuid primary key default uuid_generate_v4(),
  league_team_id text not null references league_teams(id) on delete cascade,
  window_index integer not null check (window_index between 1 and 3),
  from_match integer not null,
  to_match integer not null,
  captain_player_id bigint not null,
  vice_captain_player_id bigint not null,
  unique (league_team_id, window_index)
);

create table if not exists player_points_snapshots (
  id uuid primary key default uuid_generate_v4(),
  snapshot_at timestamptz not null,
  match_number integer not null,
  player_id bigint not null,
  overall_points numeric(10, 2) not null,
  unique (snapshot_at, player_id)
);

create table if not exists team_score_snapshots (
  id uuid primary key default uuid_generate_v4(),
  snapshot_at timestamptz not null,
  match_number integer not null,
  league_team_id text not null references league_teams(id) on delete cascade,
  total_points numeric(10, 2) not null,
  rank integer not null,
  unique (snapshot_at, league_team_id)
);

create table if not exists score_snapshot_payloads (
  snapshot_at timestamptz primary key,
  match_number integer not null,
  payload jsonb not null
);

alter table if exists player_points_snapshots
  add column if not exists match_number integer;

alter table if exists team_score_snapshots
  add column if not exists match_number integer;

create index if not exists idx_league_team_players_team
  on league_team_players (league_team_id, active_from_match, active_to_match);

create index if not exists idx_captain_windows_team
  on captain_windows (league_team_id, from_match, to_match);

create index if not exists idx_team_score_snapshots_lookup
  on team_score_snapshots (league_team_id, snapshot_at desc);
