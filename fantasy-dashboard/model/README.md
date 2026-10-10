# Opportunity-based fantasy projection model (v0.1)

**Status:** The projection engine has been implemented and tested on synthetic examples, but not backtested against actual past seasons and not yet run on the live 2026 feed. Treat all coefficients as provisional, not validated.

## Input and execution

From the `fantasy-dashboard/` directory:

```bash
python -m unittest discover -s tests -v
python model/build.py
```

No R and no Python packages beyond the standard library are required. The build reads the saved 14-team CSU Stats rosters and 36 Yahoo scoring modifiers. It downloads weekly player stats for 2025 and 2026 from the *maintained* nflverse `stats_player` release, plus DynastyProcess player-ID crosswalk (`yahoo_id` to `gsis_id`). It writes `data/projections.json` only when reasonable join coverage is achieved. The Yahoo roster snapshot itself is not automatically refreshed by this script.

## Model details

- Opportunities per active game: 2026 played-game EWMA (2.5 game half-life); shrink toward the player's 2025 usage and a conservative position-role prior using 1.4 pseudo-games. Inactive or absent weeks are not blindly entered as zero opportunities.
- Efficiency: observed passing yards/attempt, rushing yards/carry, catch rate, receiving yards/target, interceptions/attempt, sacks/attempt, each strongly regularized toward position priors. Prior-season player efficiency contributes a capped effective sample.
- Touchdowns: modeled as expected counts per attempt, carry, or target using provisional position-level rates. **Observed TD counts do not enter the projection**. Upgrade to red-zone/goal-line opportunity features later.
- Scoring: apply the **actual CSU Stats Yahoo rules** (including 6 points per passing TD, -3 per interception, -1 per QB sack and half-PPR), rather than ordinary default fantasy rules.

The output includes sample sizes, fantasy team ownership, projected opportunity/stat components, estimated conditional points per game, and coverage/mismatch flags.

## What is not yet modeled

These are **conditional per-game estimates**, not weekly start/sit or rest-of-season expected points. Injury/availability probabilities, QB changes, bye weeks, opposing defenses, special teams/2-point events, fumbles, game environment, and the K/DST scoring process are not yet implemented. Report these caveats until the corresponding features exist. A roster slot marked IR is retained as metadata only.

## Validation before use for roster decisions

1. Rolling-origin backtest across multiple completed years; score only future games as of each historical forecast date.
2. Compare mean absolute error, RMSE and ranking ability against last-three-game mean, season mean, and available consensus projections.
3. Tune shrinkage and opportunity half-life on training years only; hold out later years.
4. Validate player scoring on completed 2026 weeks against Yahoo actual totals, including unusual QB and kicker categories.
5. Add schedule/availability, matchup adjustments, separate K/DST estimators, then lineup optimization to support acquisition and trade recommendations.

Sources: [nflverse player stats](https://github.com/nflverse/nflverse-data/releases/tag/stats_player), [DynastyProcess IDs](https://github.com/dynastyprocess/data/blob/master/files/db_playerids.csv). Retain nflverse attribution (CC BY 4.0).
