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


## October 9 visual redesign and live league snapshots

The published **read-only** preview lives at [Fantasy Fieldhouse](https://aaron-nielsen.github.io/fantasy-preview/), sourced from the `master/fantasy-preview/` directory. The development copy and model code remain on this branch.

The redesign uses four screens:

1. **Overview:** Yahoo Week 5 matchup against Bench Warmers, Yahoo projected final points (108.70 vs 96.06), actual points at snapshot time, 0-4 record, waiver priority, current Yahoo starting lineup, and a 7-matchup league scoreboard.
2. **Rosters:** Only one team is shown at once (Ten Feline Overlords initially); dropdown switches to the other 13; starters, bench, and IR are grouped.
3. **Player Finder:** Combined search over the 217 Yahoo-rostered players and 454 league-available players. Includes position and ownership filters. **The connected Yahoo feed does not establish which available players require waivers versus immediate free-agent adds**; avoid asserting that distinction.
4. **Projections:** Yahoo's **actual provider weekly team forecasts** for all 14 managers. A separate model section clearly says the independent player forecast is unvalidated or not yet generated.

Data files include `data/rosters.json`, `data/league.json`, `data/available.json` (top 100 per position where available, not exhaustive), and `data/week.json` (scoring snapshot, standings and weekly Yahoo team projection). `data/projections.json` is optional, and is not part of the initial published site.

**Refresh limitation:** The public preview is static, not a live Yahoo OAuth application. Week, roster, and availability snapshots require explicit re-imports. The independent model data-builder does not refresh rosters or Yahoo team projections. Do not call Yahoo forecasts outputs of the independent statistical model.

All owner names and OAuth tokens are omitted from published preview files. Fantasy team names, player ownership, and Yahoo projections are publicly visible in the preview.
