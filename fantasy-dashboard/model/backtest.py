"""Compare 1-, 2-, 3-year historical shrinkage windows and legacy model.

2025 holdout weeks 5–17; 2022–2024 historical seasons, current 2025
games strictly before the forecast week. All candidate models evaluated on
the exact same player-weeks, conditional on recording a stat row.
"""
from collections import defaultdict
from datetime import datetime, timezone
import json
import math

from build import BASE, STATS_URL, csv_rows, normalize_weekly_stats
from project import SKILL, project_player, project_player_legacy, score

VALIDATION_YEAR = 2025
HOLDOUT_START, HOLDOUT_END = 5, 17
WINDOWS = (1, 2, 3)

def observed_stats(row):
    return {
        "passYards": float(row.get("passing_yards") or 0),
        "passTD": float(row.get("passing_tds") or 0),
        "interceptions": float(row.get("interceptions") or 0),
        "sacksSuffered": float(row.get("sacks") or 0),
        "rushYards": float(row.get("rushing_yards") or 0),
        "rushTD": float(row.get("rushing_tds") or 0),
        "receptions": float(row.get("receptions") or 0),
        "receivingYards": float(row.get("receiving_yards") or 0),
        "receivingTD": float(row.get("receiving_tds") or 0)
    }

def metrics(errors):
    if not errors:
        return None
    count = len(errors)
    return {
        "nPlayerWeeks": count,
        "MAE": round(sum(abs(x) for x in errors) / count, 3),
        "RMSE": round(math.sqrt(sum(x*x for x in errors) / count), 3),
        "bias": round(sum(errors) / count, 3),
    }

def backtest(history, modifiers):
    by_player = defaultdict(list)
    for game in history:
        if (game.get("position") in SKILL and game.get("season_type") == "REG"
            and game.get("player_id") and 2022 <= int(game.get("season") or 0) <= 2025):
            by_player[game["player_id"]].append(game)
    names = ["last3", "legacy"] + [f"history_{n}yr" for n in WINDOWS]
    errors = defaultdict(lambda: defaultdict(list))
    seen_total = 0
    duplicate = 0
    for games in by_player.values():
        games.sort(key=lambda r: (int(r["season"]), int(r["week"])))
        clean, seen = [], set()
        for game in games:
            identity = (int(game["season"]), int(game["week"]))
            if identity in seen:
                duplicate += 1
                continue
            seen.add(identity)
            clean.append(game)
        for actual in clean:
            if int(actual["season"]) != VALIDATION_YEAR:
                continue
            week = int(actual["week"])
            if not (HOLDOUT_START <= week <= HOLDOUT_END):
                continue
            position = actual["position"]
            preceding = [g for g in clean
                         if g.get("position") == position
                         and (int(g["season"]) < VALIDATION_YEAR
                              or int(g["week"]) < week)]
            if len(preceding) < 2:
                continue
            old = project_player_legacy(preceding, position, season=VALIDATION_YEAR)
            if old is None:
                # Fair, identical-sample comparison to the 2024/2025 model.
                continue
            future = score(observed_stats(actual), modifiers)
            last3 = preceding[-3:]
            predictions = {
                "last3": sum(score(observed_stats(g), modifiers) for g in last3) / len(last3),
                "legacy": score(old["stats"], modifiers),
            }
            for length in WINDOWS:
                projection = project_player(
                    preceding, position, season=VALIDATION_YEAR, history_years=length)
                if projection is None:
                    raise RuntimeError("Missing multi-year prediction on evaluated player-week")
                predictions[f"history_{length}yr"] = score(projection["stats"], modifiers)
            for name in names:
                errors[position][name].append(predictions[name] - future)
            seen_total += 1
    by_pos = {pos: {name: metrics(errors[pos][name]) for name in names}
              for pos in sorted(SKILL)}
    overall = {
        name: metrics([v for pos in SKILL for v in errors[pos][name]])
        for name in names
    }
    ranked = sorted(
        ({"name": name, "MAE": overall[name]["MAE"], "RMSE": overall[name]["RMSE"]}
         for name in names if overall[name]),
        key=lambda item: (item["MAE"], item["RMSE"])
    )
    return {
        "year": VALIDATION_YEAR,
        "holdoutWeeks": [HOLDOUT_START, HOLDOUT_END],
        "historicalSeasons": [2022, 2023, 2024],
        "model": "opportunity-eb-v0.3",
        "candidateHistoryYears": list(WINDOWS),
        "benchmark": "Mean of previous three active games' points on modeled scoring categories.",
        "target": "Yahoo CSU Stats modeled QB/RB/WR/TE categories (not all Yahoo scoring events).",
        "comparison": "All methods evaluated on the same 2025 player-weeks; forecasts use no later-week stats.",
        "overall": overall,
        "byPosition": by_pos,
        "rankedByMAE": ranked,
        "totalPlayerWeeks": seen_total,
        "duplicatePlayerWeeksSkipped": duplicate,
        "caveats": [
            "Evaluates only players with statistical game rows; misses and inactives are not forecast.",
            "Unmodeled points for fumbles, 2-point attempts, return scores and other events omitted.",
            "Comparing history-window choices on one holdout year is exploratory, NOT independent hyperparameter validation.",
            "Historical data for 2022–2024 is used only when predicting 2025; no 2026 information leaks into evaluation.",
            "The live 2026 model uses four prior seasons; 2025 comparisons have only three historical seasons."
        ],
    }

def main():
    league = json.loads((BASE / "data/league.json").read_text())
    all_rows = []
    for year in range(2022, 2026):
        rows = normalize_weekly_stats(csv_rows(STATS_URL.format(season=year)))
        if not rows:
            raise RuntimeError(f"Missing player stats for {year}")
        all_rows.extend(rows)
    result = backtest(all_rows, league["scoringByYahooStatId"])
    if result["totalPlayerWeeks"] < 1000:
        raise RuntimeError("Too few validation player-weeks")
    result["generatedAt"] = datetime.now(timezone.utc).isoformat()
    result["sources"] = [STATS_URL.format(season=y) for y in range(2022, 2026)]
    (BASE / "data/backtest.json").write_text(json.dumps(result, indent=2)+"\n")
    print("HISTORICAL BACKTEST", json.dumps({
        "overall": result["overall"],
        "rankedByMAE": result["rankedByMAE"],
        "playerWeeks": result["totalPlayerWeeks"]
    }, sort_keys=True))

if __name__ == "__main__":
    main()
