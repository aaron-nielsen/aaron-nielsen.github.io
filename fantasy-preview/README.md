# Da Vinci Fantasy Lab

This checkout contains the fantasy app and its GitHub checks. Unrelated website files are excluded using sparse checkout. The app is a static HTML/CSS/JavaScript dashboard; no installation or build step is needed.

## Preview

From the workspace root, run `python3 -m http.server 8766` and open `http://localhost:8766/fantasy-preview/`.

## Where things live

- `index.html`: dashboard pages, league switching and startup.
- `planning-model.js`: replacement values, recipient-specific lineup impact, fantasy opponent weaknesses and conservative trade-target screening.
- `planning-view.js` and `planning.css`: Player values and Schedule views, filters and CSV export.
- `roster-advice.js`: legal nine-slot lineup optimizer and pickup recommendations.
- `marginal-arbitrage.js`: owner/recipient counterfactuals and tested two-sided swaps, calculated when expanded.
- `data/`: CSU snapshots. `data/nebraska/`: separate Nebraska snapshots and scoring.
- `data/nfl-schedule.json`: one bulk schedule snapshot from nflverse, checked against every forecasted opponent.
- `data/player-values.json`: collected CSU values. Nebraska has its own file. These contain every collected player, including explicit missing values, and dated provenance.
- `scripts/`: reproducible collection and forecast evaluation tools. `tests/`: model and dashboard checks.

## Recalculate without browsing

Run `node fantasy-preview/scripts/collect-values.cjs` from the workspace root. This enriches the saved forecasts with the same eligibility, return, workload and K/DEF models used by the browser and saves values for both leagues. It makes no network requests. Changing the recipient in the browser recomputes team-specific impact locally.

Run `node --test fantasy-preview/tests/*.test.cjs` to check both leagues, legal starting lineups, replacement values, injury handling, future pairings and schedule consistency.

## Meaning and limits

Above replacement compares each player with the best available same-position player each week. It is a league benchmark, can be negative, and accounts for bye weeks. Lineup impact compares complete starting lineups for the selected recipient, including FLEX and a roster-capacity drop. The two measures answer different questions.

Player values cover the saved rosters, sampled available players and modeled player universe. A missing forecast or unverifiable availability stays unknown; no zero or invented value fills that gap. Projection, roster and available-player dates are displayed separately. Current rosters do not make old projections current.

Roster-fit targets exclude the top six modeled RB/WR and top three QB/TE, and favor players who add more to your lineup than they cost their owner. Tested 1-for-1 exchanges require at least 0.5 projected points/week for each team. A QB offer must improve an existing healthy starter by 1.5 points in at least four weeks; bye coverage alone is insufficient. These are explicit screening heuristics, not market prices or acceptance probabilities. No matching small trade means no matching small trade.

The Schedule view separates fantasy-manager weaknesses (below-median projected slot groups) from NFL opponent ratings (the existing position-specific model factor). Unknown playoff pairings remain unscheduled. K/DEF estimates remain experimental.

Public schedule source: https://github.com/nflverse/nfldata/blob/master/data/games.csv. League snapshots come from Flaim Fantasy / Yahoo. Researching player news is still needed before making a real transaction; the app does not submit trades or change lineups.

Trade search defaults to 1-for-1, 1-for-2, 2-for-1, 2-for-2, 3-for-2 and 2-for-3. It selects up to 12 forecast-covered players per roster (plus explicit selections), ranks acquisition gains against removal costs, retains up to 12 packages per manager and shape (a positive roster-fit screen can exceed the 65% raw-point gap), and evaluates up to 936 candidates with roster repair and legal lineups. This is a bounded search, not proof that no other trade works. The page reports candidate coverage, complete estimates and passing offers. User-reported rejections are stored in `data/trade-negotiations.json` for filtering; negotiation history is not displayed.

Trade suggestions default to **positive marginal arbitrage**, whether the opportunity comes from selling your player or acquiring another player. The package must have positive net marginal arbitrage, improve your Yahoo lineup, and not worsen the partner’s Yahoo lineup. Single-player spreads are a screen; full-package lineup impacts are independently recomputed. The alternative **Da Vinci upside** mode uses Yahoo fairness for the partner with Da Vinci upside for you. Yahoo must project nonnegative partner impact; Da Vinci must project at least 0.5 points/week for you. The alternative requires both teams to gain under Yahoo. Missing Yahoo coverage never falls back to Da Vinci. Position metadata comes from the verified current rosters; a missing position cannot be silently omitted from lineup valuation. Current weekly Yahoo forecasts take precedence over saved screenshot evaluations. The dated October 12 cases remain regression fixtures, not overrides of refreshed trade values.

Navigation groups activity under Trades (Trade ideas / Trades & signings), values under Players, and projections/performance under Analysis. Old hash links still work.

### Yahoo weekly values

`data/yahoo-weekly-rosters.json` preserves the collected weekly tables for 217 players, dated October 12–13 in Denver. The October 19 roster refresh contains 218 rostered players; 16 of them lack saved Yahoo weekly forecasts. Imported projections explicitly include these players as unknown. Only four current rosters retain complete forecast coverage. The remaining collection checkpoint is preserved. Original reads were sequential, initially 45 seconds and then 30 seconds apart, with no retries on denial. No network requests are needed to rebuild the imported projections and matrix:

```sh
node fantasy-preview/scripts/collect-yahoo-values.cjs
```

`yahoo-values.js` independently optimizes Yahoo projections at QB, RB/RB, WR/WR, TE, W/R/T, K and DEF each week, with empty slots scoring zero. It uses Yahoo future injury projections directly and never borrows Da Vinci points. Both sides and every weekly impact of the three October 12 reference trades match their frozen forecast fixture exactly. This validates those cases; projections can change later.

`data/yahoo-team-player-values.json` recomputes player/team counterfactuals against the current rosters. Missing weekly forecasts leave affected lineup units unknown; a newly added bench player cannot silently be assigned zero points. QB, K, DEF and the combined RB/WR/TE/FLEX unit optimize independently, so an unchanged unit cancels exactly from a trade's impact even when its total is unknown. Thus an uncollected defense does not block an offense-only trade. Current coverage includes 2,086 marginal values and 1,256 transfer spreads. Each known entry identifies the applicable gain if acquired or loss if traded, with weekly breakdowns and collection dates. Values measure gain if added or loss if removed from the existing roster, without assumed waiver moves. Complete trade packages are recomputed; individual values are not additive. These Yahoo numbers are shown separately from Da Vinci's roster repair and upside estimates.

The readable `yahoo-matrix.html` is linked from Trades. It has separate Players I can trade and Players I can acquire views. It embeds the saved matrix so it also opens directly as a local file. Cells show recipient acquisition gain minus current-owner removal loss; positive means the recipient values the player more. Every displayed row involves Ten Feline Overlords: your players rank by their best receiving-team spread; other players rank by their spread to your team. Selecting a partner shows only your players and that partner’s players. Team columns show signed Felines and other-team impacts, with their sum as arbitrage. Filters cover players, positions, ownership, receiving team, and ROS/short-term/playoff horizons. Trade search uses marginal spreads to shortlist packages, then fully recomputes both teams’ lineups. Best partner fits and signed player arbitrage are visible on trade cards. Total marginal value sums the player spreads. Individual full-package lineup impacts are shown for you and the partner; the redundant combined full-trade total is omitted.

### Week refresh

`node fantasy-preview/scripts/refresh-week.cjs /path/to/flaim-snapshot.json` imports a complete, validated CSU league snapshot (league, matchups, standings, and all current rosters). It archives the previous week before advancing the dashboard. Weekly model scores roll from saved future scenarios; their original model generation date and stats cutoff remain unchanged. A roster refresh does not refresh the dated Yahoo trade projection dataset.

`refresh-market.cjs /path/to/flaim-market-snapshot.json` imports six positional available-player pools, transactions, and the next matchup round. Current player scores carry an explicit week and appear separately from pregame forecasts. The October 19 refresh has all 14 rosters, 451 available players, 71 recent transactions, Week 6 scores, and Week 7 matchups. NFL Week 6 remains incomplete, so model training retains the complete Week 5 cutoff. Jacobs's eligibility scenario was separately updated from the October 19 Packers report; future participation is assumed, not confirmed.

### Player detail and completed games

Click a player name on the overview, rosters, values, trade cards or projections to see weekly results and remaining forecasts. Results prefer Yahoo historical league points; uncollected players use NFL stats scored with this league’s rules, with missing weeks explicitly pending. Yahoo projection dates remain separate.

`node fantasy-preview/scripts/update-player-stats.cjs /path/to/normalized-nfl-stats.json` imports one bulk nflverse player-stat download, validates the completed-week cutoff, and updates CSU offensive baselines with new games. This incremental update uses the previous empirical-Bayes baseline as a prior weighted by four games plus the previous season sample. It preserves past forecast frames and archives the old model; existing opponent factors, snap models and K/DEF context are not retrained. Re-running the same completed week does not apply it twice.

### Defensive refresh and projection comparisons

`refresh-defense.cjs` imports completed NFL player/team stats and final scores. It estimates position-specific points allowed relative to opposing offenses, using a six-game neutral prior, league-centering and a ±10% cap. Future offense frames change; completed frames remain intact. Points/EPA and red-zone data carry separate cutoffs. Special-team training excludes the target week even when the shared dataset is newer than a league snapshot.

`data/projection-audit.json` compares the same player and week against the saved Yahoo forecast, using the app’s enriched estimates. Differences from Yahoo do not measure prediction accuracy or identify Yahoo’s injury-probability algorithm. Da Vinci generally assumes future participation except for explicit return scenarios; no universal injury haircut is invented.
