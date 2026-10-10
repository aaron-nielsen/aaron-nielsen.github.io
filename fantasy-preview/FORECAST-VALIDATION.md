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
