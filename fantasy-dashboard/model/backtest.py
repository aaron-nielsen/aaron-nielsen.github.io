"""Rolling-origin backtest: 2025 holdout weeks 5–17 vs 2024 player history.

No future-week leakage: before forecasting week w, 2025 rows must have week < w.
Compare our shrinkage model to each player's last three active-game points,
computed on the same modeled Yahoo scoring categories as the actual target.
Uses stdlib only, and outputs model/backtest.json.
"""
from collections import defaultdict
from datetime import datetime, timezone
import json
import math
from pathlib import Path

from build import BASE, STATS_URL, csv_rows, normalize_weekly_stats
from project import SKILL, project_player, score

VALIDATION_YEAR = 2025
START_WEEK, END_WEEK = 5, 17

def observed_stats(row):
    """Same nine categories the preliminary model predicts, not Yahoo's full actual score."""
    return {
        "passYards": float(row.get("passing_yards") or 0),
        "passTD": float(row.get("passing_tds") or 0),
        "interceptions": float(row.get("interceptions") or 0),
        "sacksSuffered": float(row.get("sacks") or 0),
        "rushYards": float(row.get("rushing_yards") or 0),
        "rushTD": float(row.get("rushing_tds") or 0),
        "receptions": float(row.get("receptions") or 0),
        "receivingYards": float(row.get("receiving_yards") or 0),
        "receivingTD": float(row.get("receiving_tds") or 0),
    }

def metrics(errors):
    if not errors:
        return None
    n=len(errors)
    return {
        "nPlayerWeeks":n,
        "MAE":round(sum(abs(v) for v in errors)/n,3),
        "RMSE":round(math.sqrt(sum(v*v for v in errors)/n),3),
        "bias":round(sum(errors)/n,3),
    }

def backtest(history, modifiers):
    """Rows from 2024 and 2025; evaluate only player-weeks in 2025, w>=5."""
    by_id=defaultdict(list)
    for row in history:
        if row.get("position") not in SKILL or row.get("season_type") != "REG":
            continue
        pid=row.get("player_id")
        if pid and int(row.get("season") or 0) in (VALIDATION_YEAR-1, VALIDATION_YEAR):
            by_id[pid].append(row)

    all_errors=defaultdict(lambda:{"model":[],"baseline":[]})
    skipped_duplicate_weeks=0
    total_examples=0
    for games in by_id.values():
        games.sort(key=lambda g:(int(g["season"]),int(g["week"])))
        position=games[-1].get("position")
        # Verify unique player-week observations to avoid double-counting traded players.
        seen=set()
        clean=[]
        for row in games:
            key=(str(row["season"]),str(row["week"]))
            if key in seen:
                skipped_duplicate_weeks+=1
                continue
            seen.add(key)
            clean.append(row)
        for actual in clean:
            if int(actual["season"]) != VALIDATION_YEAR:
                continue
            week=int(actual["week"])
            if week<START_WEEK or week>END_WEEK:
                continue
            prior=[r for r in clean if int(r["season"])<VALIDATION_YEAR
                   or int(r["week"])<week]
            prior=[r for r in prior if r.get("position")==position]
            if len(prior)<2:  # same coverage for baseline and model
                continue
            prediction=project_player(prior,position,season=VALIDATION_YEAR)
            if not prediction:
                continue
            previous=prior[-3:]
            model_pts=score(prediction["stats"],modifiers)
            base_pts=sum(score(observed_stats(r),modifiers) for r in previous)/len(previous)
            actual_pts=score(observed_stats(actual),modifiers)
            total_examples+=1
            all_errors[position]["model"].append(model_pts-actual_pts)
            all_errors[position]["baseline"].append(base_pts-actual_pts)

    output={}
    for pos in sorted(SKILL):
        e=all_errors[pos]
        output[pos]={"model":metrics(e["model"]),"last3":metrics(e["baseline"])}
    overall_model=[e for v in all_errors.values() for e in v["model"]]
    overall_baseline=[e for v in all_errors.values() for e in v["baseline"]]
    return {
        "year": VALIDATION_YEAR,
        "holdoutWeeks":[START_WEEK,END_WEEK],
        "method":"Rolling as-of weekly forecast; train on 2024 + 2025 weeks before forecast week.",
        "target":"Modeled CSU Stats scoring categories only (excluding fumbles, 2PT and other unmodeled stats).",
        "model":"opportunity-eb-v0.2",
        "benchmark":"Last three active games' fantasy points from the same nine scoring categories.",
        "caveats":[
            "Forecast is conditional on the player recording a stat row that week. Missed games/injury availability are excluded.",
            "Do not interpret these results as a validated weekly lineup or rest-of-season model.",
            "Hyperparameters were not tuned on a separate training dataset.",
            "Duplicate player/week rows are excluded after keeping one observation; multi-team game totals may be incomplete.",
            "Week 5+ historical validation intentionally excludes 2026 and uses 2025 as holdout."
        ],
        "duplicatePlayerWeeksSkipped":skipped_duplicate_weeks,
        "totalPlayerWeeks":total_examples,
        "overall":{"model":metrics(overall_model),"last3":metrics(overall_baseline)},
        "byPosition":output,
    }

def main():
    league=json.loads((BASE/"data/league.json").read_text())
    modifiers=league["scoringByYahooStatId"]
    stats=[]
    for year in (VALIDATION_YEAR-1,VALIDATION_YEAR):
        stats.extend(normalize_weekly_stats(csv_rows(STATS_URL.format(season=year))))
    output=backtest(stats,modifiers)
    if output["totalPlayerWeeks"]<1000:
        raise RuntimeError("Not enough holdout player-weeks for validation: "+str(output["totalPlayerWeeks"]))
    output["generatedAt"]=datetime.now(timezone.utc).isoformat()
    output["sources"]=[STATS_URL.format(season=year) for year in (VALIDATION_YEAR-1,VALIDATION_YEAR)]
    destination=BASE/"data/backtest.json"
    destination.write_text(json.dumps(output,indent=2)+"\n")
    print("BACKTEST RESULTS",json.dumps({k:output[k] for k in ("overall","byPosition","totalPlayerWeeks")},sort_keys=True))

if __name__=="__main__":
    main()
