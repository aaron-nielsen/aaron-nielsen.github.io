# Fantasy Lab forecast validation

This module evaluates **frozen pregame player-week predictions**, not the latest
`future.json` forecasts. A refreshed future forecast is not historical evidence.

## Record format

Provide an array of records to `DaVinciAccuracy.evaluate(records)`:

```json
{
  "season": 2026,
  "week": 5,
  "playerId": "12345",
  "position": "RB",
  "predictedAt": "2026-10-09T15:00:00Z",
  "kickoffAt": "2026-10-11T17:00:00Z",
  "daVinci": 13.4,
  "yahoo": 12.8,
  "actual": 11.6
}
```

The data pipeline must save the Da Vinci and Yahoo estimates **before kickoff**
with timestamps, and attach actual points only after the game. Use the same
league scoring rules for all three values. Store immutable snapshots by
league, season and week; never rewrite a historical prediction using newer
injury news or results.

`evaluate` rejects missing/non-numeric model or actual scores, invalid
timestamps, predictions at or after kickoff, and duplicate player-weeks.
For repeated pregame snapshots, choose a consistent cutoff (for example,
the last snapshot before kickoff) **before** passing rows to the evaluator.

Outputs include MAE, signed bias (predicted minus actual), and RMSE for each
position and overall. The `paired` result compares both models only where
Yahoo projections are present. Standalone model MAEs may use different
sample sizes and should not be compared as if paired.

No real accuracy numbers should be displayed until enough verified,
historical, pregame observations have been collected. Run:

```sh
node fantasy-preview/tests/forecast-accuracy.test.cjs
```

## Collection and publication workflow

1. Before games, freeze each league's current forecast snapshot:
   `node fantasy-preview/scripts/freeze-forecasts.cjs fantasy-preview/data/future.json 5 archive/csu-2026-w05.json`
   (Use the corresponding Nebraska data path for that league.)
2. Save Yahoo's **timestamped pregame** player forecasts separately. Do not
   reconstruct them from later Yahoo projections.
3. After games, obtain verified actual fantasy points under the league's
   scoring rules and player kickoff times.
4. Join the three files:
   `node fantasy-preview/scripts/join-forecast-results.cjs archive/csu-2026-w05.json actuals.json yahoo-pregame.json observations.json`
5. Evaluate:
   `node fantasy-preview/scripts/evaluate-forecasts.cjs observations.json`
6. Publish only reviewed observations as
   `fantasy-preview/data/forecast-observations.json` (and the analogous
   `data/nebraska/` path). The Performance tab then reads those records.

**Current limitation:** The site does not yet have a verified automated
historical Yahoo projection feed or completed player-week actuals. Snapshot
export is a command, not an unattended scheduler. Do not advertise automatic
collection or accuracy results until that integration is running.
