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

The app now has a **Projections** page using generated nflverse data for 146/183 rostered skill players (October 9 snapshot, through completed Week 4). Numbers are explicitly unvalidated *conditional-on-active-game* estimates, not availability-adjusted ROS or weekly schedule projections; they exclude K and DEF. The league's roster snapshot is still manually refreshed. Next, backtest the model, reconcile missing Yahoo IDs, add the 2026 stats feed and fixture/availability logic, and implement transaction optimization.

Never publish OAuth tokens or league credentials into GitHub Pages. Owner names are intentionally omitted.

## Run locally

`python -m http.server 8000` from the `fantasy-dashboard/` directory, then open `http://localhost:8000/`. Plain file:// mode will not allow the JSON fetch in some browsers.


## October 9 visual redesign and live league snapshots

The published **read-only** preview lives at [Fantasy Fieldhouse](https://aaron-nielsen.github.io/fantasy-preview/), sourced from the `master/fantasy-preview/` directory. The development copy and model code remain on this branch.

The redesign uses four screens:

1. **Overview:** Yahoo Week 5 matchup against Bench Warmers, Yahoo projected final points (108.70 vs 96.06), actual points at snapshot time, 0-4 record, waiver priority, current Yahoo starting lineup, and a 7-matchup league scoreboard.
2. **Rosters:** Only one team is shown at once (Ten Feline Overlords initially); dropdown switches to the other 13; starters, bench, and IR are grouped.
3. **Player Finder:** Combined search over the 217 Yahoo-rostered players and 454 league-available players. Includes position and ownership filters. **The connected Yahoo feed does not establish which available players require waivers versus immediate free-agent adds**; avoid asserting that distinction.
4. **Projections:** Yahoo's **actual provider weekly team forecasts** for all 14 managers, plus independently estimated per-active-game fantasy points for 146 rostered skill-position players. The model estimates are labeled unvalidated, with a searchable league table.

Data files include `data/rosters.json`, `data/league.json`, `data/available.json` (top 100 per position where available, not exhaustive), `data/week.json` (scoring snapshot, standings and weekly Yahoo team projection), and `data/projections.json` (provisional model estimates).

**Refresh limitation:** The public preview is static, not a live Yahoo OAuth application. Week, roster, and availability snapshots require explicit re-imports. The independent model data-builder does not refresh rosters or Yahoo team projections. Do not call Yahoo forecasts outputs of the independent statistical model.

All owner names and OAuth tokens are omitted from published preview files. Fantasy team names, player ownership, and Yahoo projections are publicly visible in the preview.


## October 9 typography and provisional player projections

- Rebranded the site masthead with **Felipa** (Italian chancery-inspired calligraphy) for “Da Vinci” and Cormorant Garamond for “Fantasy Lab.” Removed editorial subtitles and slogans; kept functional descriptions.
- The projection build passes unit tests and downloads real nflverse data in GitHub Actions. To avoid incorporating partially completed fantasy weeks, it now excludes Yahoo's snapshot current week (Week 5), using completed Weeks 1–4.
- In the public preview, the Projections page leads with the user's player forecasts and provides a searchable all-league projection table. The file covers 146 of 183 rostered QB/RB/WR/TE; 36 Yahoo IDs need reconciliation (mostly newer players), and one mapped player lacks weekly history. **Unvalidated** and **conditional on active game**, so injury/status and bye schedule are NOT reflected in expected points.
- Next: resolve missing IDs with high-confidence unique name/position/NFL-team crosswalks, build correct weekly schedule and active probability adjustments, historical rolling-origin backtests and consensus benchmarks, then model unrostered players. Only then rank adds, drops and trades.


## October 9 model v0.2: ID coverage, available players, and backtesting

The pipeline now includes **model/identity.py** for exact, provenance-aware Yahoo-to-GSIS matching. Primary path uses DynastyProcess `yahoo_id`→`gsis_id`; secondary path demands unique normalized full name, matching position, and ideally matching NFL team from stats history. No fuzzy surname matching or duplicate-name guessing. The 2026 `stats_player` release changed some field names; **model/build.py** normalizes `team`→`recent_team`, `passing_interceptions`→`interceptions`, and `sacks_suffered`→`sacks` to make scoring consistent with legacy data.

Current completed-Week-4 provisional input produced **421** conditional player projections: **180/183** rostered QB/RB/WR/TE plus **241/397** sampled league-available skill-position players. The other 159 of the combined pool have no defensible model projection, and are left blank. Coverage and match-method counts are in `data/projections.json`. Fallback and scoring regression checks are in `tests/test_identity.py`.

**model/backtest.py** performs a rolling-origin diagnostic on historical 2025 weeks 5–17 (2024 history plus earlier 2025 weeks as predictors), recording `data/backtest.json` in GitHub Actions. Its target includes the same nine modeled Yahoo scoring categories; it **excludes the availability problem, unmodeled scoring, opponents and missed games**. First diagnostic: 4,139 observed player-weeks, MAE model 4.226 vs last-three-active-games 4.517; RMSE model 6.026 vs benchmark 6.633. Results are encouraging but not an independent assessment of optimized hyperparameters or a valid start/sit benchmark for the full scoring system.

Published public preview (master/fantasy-preview/) now has 421 model estimates, sortable/scope-filtered projections, experimental model PPG on Player Finder, and a historical-validation summary. The Yahoo roster, available pool, and matchup data are static snapshots from October 9, 2026; they are not connected for autonomous live refresh.

**Next decision-critical milestone:** replace conditional per-active-game estimates with forecast-week and ROS expected points, using NFL schedules, bye weeks, probable snap/usage roles, injury availability, then estimate legal-lineup optimization and add/drop impact. Benchmark against actual league weekly scores and external consensus projections. Only then provide ranked waiver/trade recommendations.


## October 2026: Future weeks, score details, and trade scenarios

The public preview at https://aaron-nielsen.github.io/fantasy-preview/ now includes:

- An enlarged, simplified Source Sans dashboard beneath the approved Renaissance analytics banner.
- `data/future.json` generated by `model/future.py`, forecasting Weeks **5–17**, with NFL schedule, opponents, bye weeks and heavily shrunk defense factors. Future weeks after Week 5 are **conditional healthy-player scenarios**, NOT injury-adjusted expected points; 2026 usage and Yahoo rosters are held fixed as of the Week 5 snapshot.
- A week selector, per-player expanding stat calculations, all nine modeled categories, Yahoo point multipliers, and point contributions. Unmodeled scoring events remain excluded.
- A **Trade Suggestions** page for exploratory **one-for-one** trades across the other 13 teams, using legal weekly skill-player lineups (QB, RB, RB, WR, WR, TE, W/R/T). Both teams must gain at least 0.15 projected points per week. Filter by counterparty and projection horizon (Weeks 6–17, 7–17, etc.). The optimization deliberately omits K/DEF because they don't change in these one-for-one skill-position swaps; rostered players in IR slots and currently unavailable players are excluded as exchange candidates. **No Yahoo trades are submitted**.
- A clear disclaimer that NFL injuries, return dates, future team moves, new performance data, model errors and trade acceptance are unmodeled; trade gains are scenario analysis rather than guaranteed improvements.

**Validation:** The original historical test covers modeled category points *conditional on a statistical appearance*, not weekly availability or future trade optimization. No rolling-origin validation has yet been run for the new Week 5–17 opponent and future-weeks trade scenario layer. Current values and roster membership require refresh when the actual league changes.

**Build:** From `fantasy-dashboard/`, run `python model/build.py`, `python model/future.py` (the future builder expects the current `projections.json` and `weekly.json`), and `python model/backtest.py`. GitHub Actions runs these automatically in order on relevant development commits.
