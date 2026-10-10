# Da Vinci Fantasy Lab — kicker and defense projection v0.1

**Status (2026-10-10):** experimental and league-specific. The live dashboard models the seven skill/flex positions **plus kicker and D/ST** for both Yahoo leagues. It does not use Yahoo full-team forecasts in the Da Vinci model.

## Data, cutoff, and safeguards

- Source: public nflverse play-by-play game/team summaries [redistributed by the sleeper-dashboard-data project](https://github.com/antonwilms/sleeper-dashboard-data), plus the [nflverse schedule](https://github.com/nflverse/nfldata). The derived, reduced observations are in `data/special-teams-context.json`.
- Model includes completed **2024 and 2025 regular seasons** (544 team-game rows each), plus **2026 Weeks 1–3** (96 team-game rows). The partial Week 4 source was deliberately excluded, to prevent uneven team exposure. Total: **1,184 team-game observations**.
- Team averages are shrunk toward league priors using four pseudo-games. Observation weights: 2024 = 0.35, 2025 = 0.85, 2026 = 1.5. The 2026 fixture map includes venue roof information; game-day wind and temperature are only used if the schedule actually reports them, which most future weeks do not.
- All projections use the selected league's `data/league.json` scoring coefficients. The page must load and verify league identity; CSU and Nebraska models are **not interchangeable**.
- Future injury return dates, kicker benchings, and starting D/ST changes are not probability-modeled. Confirm roster statuses and use Yahoo for transactions.

## Kicker model

- Forecast red-zone field-goal opportunities from 60% shrunk offensive red-zone FG trips and 40% opponents' red-zone trips allowed net of opponent touchdowns; add a conservative 0.65 long-range attempts per game.
- PAT made estimates combine historical offensive red-zone TD trips and opposing red-zone touchdowns allowed, at a prior of 96.5% PAT conversion.
- FG attempt-distance prior, uncalibrated to individual kickers: 0–19 = 4%, 20–29 = 12%, 30–39 = 22%, 40–49 = 37%, 50+ = 25%. Distance-specific make-rate priors = 98%, 97%, 94%, 84%, 69%. These are heuristic model settings, **not claims about calibrated empirical current-year NFL rates**.
- Apply per-distance Yahoo made / missed FG scoring and applicable field-goal yardage modifier (CSU uses FG-yardage scoring), plus PAT made / missed scoring. Wind adjustment is applied only for a reported outdoor wind of at least 15 mph; no missing weather values are fabricated.
- **Important:** the historical source does not include individual kicker accuracy, distance and complete attempt data. Therefore, a kicker's personal ability and kicking style are not individually modeled. These are team-opportunity estimates.

## Defense/special teams model

- Points allowed forecast: half the opposing offense's shrunk points scored and half the defense's shrunk points allowed, plus a modest 1-point away/home context factor. Use a 10.3-point outcome SD to estimate probabilities of each Yahoo points-allowed scoring tier rather than classifying the mean alone.
- Sack and interception estimates use opponent QB model's expected sacks and INTs, shrunk through offensive/defensive EPA strength. Fumble recoveries, safeties, blocks, defensive TDs, return TDs and extra-point returns use conservative generic frequency priors and Yahoo scoring multipliers.
- This is **not** a fully fitted sack, pressure, fumble, interception or return model; individual coordinators and opponent offensive-line injuries are not incorporated. The expected points-allowed approximation may differ from Yahoo's exact defensive points-allowed definition, because some NFL scoring plays are excluded from Yahoo D/ST points allowed.

## Diagnostic test (NOT full fantasy-point backtest)

Historical test: 2025 Weeks 5–17, 384 team-game rows. Each predicted week uses only full 2024 plus **strictly earlier** 2025 games. Results in `data/special-teams-validation.json`:

| Proxy target | Model MAE | Constant benchmark MAE |
|---|---:|---:|
| Team points allowed | 7.586 | 7.870 |
| Red-zone FG trips | 0.774 | 0.809 |

These are small improvements. **They do not validate Yahoo K/DST fantasy-point accuracy or the rare-event priors.** The existing 2025 offensive player scoring MAE concerns QB/RB/WR/TE only and must not be presented as K/DST validation. A future full K/DST backtest needs actual field-goal distance/attempt history, defensive turnovers and sacks, and exact fantasy scoring.

## UI

The main-page Da Vinci projected matchup and Projections/Team Rankings optimize nine slots: QB/RB/RB/WR/WR/TE/W-R-T/K/DEF, using one distinct eligible player in each. K and D/ST estimates can be viewed by position in All Player Forecasts, with expected component scoring and known venue conditions. Home-page K/DST add/drop candidates compare the projected points of an available player against the best currently rostered K or D/ST across the selected period; they do **not** simulate cutting another player.

This model is static until a new data snapshot is generated and published; it is not connected to live Yahoo lineup transactions or live weather APIs.
