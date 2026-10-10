# CSU Stats Fantasy Dashboard (draft)

This is an **unpublished** roster-mapping prototype on a separate Git branch. It has not changed the live GitHub Pages site.

## Files

- `index.html`: self-contained mobile-friendly roster browser (Team rosters and Player finder).
- `data/rosters.json`: all 14 current Yahoo rosters; stable Yahoo player IDs, fantasy team IDs, NFL team, position, roster slot, status.
- `data/league.json`: league identity, scoring modifiers keyed by Yahoo stat ID, lineup structure (inferred; verify), season metadata.

Snapshot UTC: 2026-10-10T02:53:22.198Z.

## Updating rosters

The current data is a snapshot, not a live API integration. Refresh by reading the 14 team rosters from the connected Yahoo/Flaim service and replacing `data/rosters.json`. Do not confuse this league with the separate 10-team Yahoo league.

## Next stage

Build a projection engine and normalized player-week projection file, then waiver and trade optimizers. Add a secure scheduled Yahoo ingestion mechanism if unattended refresh is required.

Never publish OAuth tokens or league credentials into GitHub Pages. Owner names are intentionally omitted.

## Run locally

`python -m http.server 8000` from the `fantasy-dashboard/` directory, then open `http://localhost:8000/`. Plain file:// mode will not allow the JSON fetch in some browsers.
