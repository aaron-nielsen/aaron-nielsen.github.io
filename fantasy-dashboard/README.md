# CSU Stats Fantasy Dashboard (draft)

This is an **unpublished** roster-mapping prototype on a separate Git branch. It has not changed the live GitHub Pages site.

## Files

- `index.html`: self-contained mobile-friendly roster browser (Team rosters and Player finder).
- `data/rosters.json`: all 14 current Yahoo rosters; stable Yahoo player IDs, fantasy team IDs, NFL team, position, roster slot, status.
- `data/league.json`: league identity, scoring modifiers keyed by Yahoo stat ID, lineup structure (inferred; verify), season metadata.

Snapshot UTC: 2026-10-10T02:53:22.198Z.

## Updating rosters

The current data is a snapshot, not a live API integration. Refresh by reading the 14 team rosters from the connected Yahoo/Flaim service and replacing `data/rosters.json`. Do not confuse this league with the separate 10-team Yahoo league.

## Projection model now included (draft)

- `model/project.py` implements opportunity-based EWMA plus empirical-Bayes shrinkage and applies this league's saved Yahoo stat scoring.
- `model/build.py` pulls publicly available nflverse weekly player statistics plus the Yahoo-to-GSIS player ID crosswalk, and writes `data/projections.json` if matching coverage passes safety checks.
- `model/README.md` explains the assumptions, omissions, data sources, and validation plan.
- `tests/test_project.py` has synthetic sanity checks. Run: `python -m unittest discover -s tests -v`.

The app now has a **Projections** tab which explicitly indicates the data has not been generated yet. No invented rankings are displayed. These are provisional *conditional-on-active-game* points, not availability-adjusted ROS or weekly schedule projections; they exclude K and DEF. The league's roster snapshot is still manually refreshed. Next, backtest the model, reconcile missing Yahoo IDs, add the 2026 stats feed and fixture/availability logic, and implement transaction optimization.

Never publish OAuth tokens or league credentials into GitHub Pages. Owner names are intentionally omitted.

## Run locally

`python -m http.server 8000` from the `fantasy-dashboard/` directory, then open `http://localhost:8000/`. Plain file:// mode will not allow the JSON fetch in some browsers.
