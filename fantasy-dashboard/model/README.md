# Da Vinci Fantasy Lab — statistical projection engine v0.3

**Status:** First experimental model and historical backtest completed. Projections are **fantasy points per active game**, not weekly points, ROS expected values, start/sit advice, or injury forecasts.

## Run

From the \`fantasy-dashboard\` directory:

\`\`\`bash
python -m unittest discover -s tests -v
python model/build.py
python model/backtest.py
\`\`\`

Python standard library only. The model reads CSU Stats' league settings, the 14-team roster map, and the sampled available-player pool. Stats from [nflverse stats_player](https://github.com/nflverse/nflverse-data/releases/tag/stats_player) and a [DynastyProcess ID crosswalk](https://github.com/dynastyprocess/data/blob/master/files/db_playerids.csv) match Yahoo players to GSIS IDs. Fallback matching requires a unique exact normalized full name plus position and confirmed team/history; unmapped players are reported, never guessed.

## Inputs and priors

- The **2026 forecast uses 2022–2026**, stopping at completed Week 4 based on the Yahoo Week 5 league snapshot.
- Recent **opportunity** (targets, carries, pass attempts) gets a 2.5-game EWMA and shrinks toward historical per-game workload (recent prior seasons heavily preferred; annual weight 0.36^age) and a conservative position baseline.
- **Efficiency** (yards per attempt/target/carry, catch rate, interceptions and sacks) borrows more heavily from historical data (annual weight 0.72^age), regularized with a positional prior and capped historical pseudo-exposure. 2026 evidence receives full weight.
- **Touchdowns** currently use position-level expected opportunity rates, not the player's observed TD rate. Red-zone volume and individual scoring roles are future work.
- Uses the league's Yahoo scoring modifiers for modeled stat categories. Fumbles, 2-point tries, special teams, kicker/defense stats, availability, matchups and byes remain unmodeled.
- Name matching, missing projections, and historic sample sizes are surfaced in data/projections.json.

## Historical evaluation

\`data/backtest.json\` contains a **2025 rolling-origin holdout** using 2022–2024 prior-year history and 2025 games only from strictly earlier weeks. Compares last-three-active-game mean, the original single-prior-season model, and 1-, 2-, 3-prior-season shrinkage models **on exactly the same future player-weeks**.

Preliminary results on 4,165 player-weeks, restricted to the modeled Yahoo scoring categories and to players with a stats row:

| Method | MAE | RMSE |
|---|---:|---:|
| Last three played games | 4.500 | 6.614 |
| Legacy single-year model | 4.221 | 6.016 |
| One prior year | 4.217 | 6.014 |
| Two prior years | **4.215** | 6.018 |
| Three prior years | 4.217 | 6.019 |

These **tiny differences among 1–3 historical years are not strong evidence** of an optimal window. The live model retains four prior seasons as a candidate; that exact four-year setting has not been independently validated. Evaluation on 2024 and later seasons and confidence intervals are needed before selecting hyperparameters.

## Next steps

1. Make per-week, opponent-aware playing-time forecasts, including actual byes, injuries and opportunity if inactive.
2. Evaluate forecasts for everyone eligible to start, not just those recording stats in a game; test across multiple historical seasons.
3. Integrate schedule, K/DEF projections, fumbles and specialty scoring. Validate Yahoo scoring against actual Yahoo totals.
4. Calculate add/drop and trade impact by optimizing legal starting lineups, handling positional replacement and flex.

The public preview at [Da Vinci Fantasy Lab](https://aaron-nielsen.github.io/fantasy-preview/) is a static read-only site; changes to league rosters, waiver status and Yahoo's week forecast require refresh and republishing. Historical nflverse credit: CC BY 4.0.
