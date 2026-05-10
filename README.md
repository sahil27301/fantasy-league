# IPL Fantasy League Dashboard

Mobile-first dashboard for your IPL fantasy mini-league with:
- Live leaderboard from IPL Fantasy API
- Window-aware captain/vice-captain multipliers
- Team detail drilldowns
- Stats V1 + V2 insight cards
- Snapshot-based progression timeline

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy envs:
   ```bash
   cp .env.example .env.local
   ```
   Set `SUPABASE_SERVICE_ROLE_KEY` for server-side durability writes.
3. Normalize your raw CSV:
   ```bash
   npm run normalize:csv -- "/absolute/path/to/data.csv"
   ```

## Run

```bash
npm run dev
```

## Tests and lint

```bash
npm run test
npm run lint
```

## Data artifacts

Normalization script writes:
- `data/normalized_roster.json`
- `data/captain_windows.json`
- `data/unmatched_or_ambiguous.csv`

Normalization also reads optional canonical name aliases from:
- `data/player_aliases.json`

Scoring is blocked if `data/unmatched_or_ambiguous.csv` has unresolved rows.
Score refreshes are persisted in Supabase (`team_score_snapshots`, `player_points_snapshots`, `score_snapshot_payloads`) and reloaded after restarts.

## Refresh control

- Refresh is available to all users from the leaderboard.
