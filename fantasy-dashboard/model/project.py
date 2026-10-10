"""First-pass opportunity/efficiency football projections. Python stdlib only.

Produces neutral per-active-game means, NOT forecasts of player availability.
Hyperparameters are provisional and require rolling backtesting.
"""
from collections import defaultdict

SKILL = {"QB", "RB", "WR", "TE"}
# Conservative backup/low-usage defaults; not assumed-starter baselines.
OPPORTUNITY_PRIORS = {
    "QB": {"attempts": 15., "carries": 1.2, "targets": 0.},
    "RB": {"attempts": 0., "carries": 4.5, "targets": 1.5},
    "WR": {"attempts": 0., "carries": .15, "targets": 3.5},
    "TE": {"attempts": 0., "carries": 0., "targets": 2.7},
}
# Initial priors to be calibrated with rolling-origin historical tests.
EFFIC_PRIORS = {
    "QB": {"pass_ypa": 7.1, "ypc": 5.3, "catch_rate": 0., "rec_ypt": 0., "int_rate": .026, "sack_rate": .065},
    "RB": {"pass_ypa": 0., "ypc": 4.3, "catch_rate": .77, "rec_ypt": 6.1, "int_rate": 0., "sack_rate": 0.},
    "WR": {"pass_ypa": 0., "ypc": 6.1, "catch_rate": .63, "rec_ypt": 7.7, "int_rate": 0., "sack_rate": 0.},
    "TE": {"pass_ypa": 0., "ypc": 4.0, "catch_rate": .70, "rec_ypt": 6.9, "int_rate": 0., "sack_rate": 0.},
}
TD_PRIORS = {
    "QB": {"pass": .045, "rush": .023, "receive": .0},
    "RB": {"pass": .0, "rush": .028, "receive": .026},
    "WR": {"pass": .0, "rush": .020, "receive": .051},
    "TE": {"pass": .0, "rush": .020, "receive": .065},
}

def num(row, field):
    try:
        return max(0., float(row.get(field) or 0))
    except (TypeError, ValueError):
        return 0.

def weighted_mean(rows, field, half_life=2.5):
    """Decay by games with records, not calendar weeks."""
    ordered = sorted(rows, key=lambda r: (int(r["season"]), int(r["week"])), reverse=True)
    weights = [2 ** (-i / half_life) for i in range(len(ordered))]
    return ((sum(num(row, field) * w for row, w in zip(ordered, weights)) / sum(weights))
            if weights else None), sum(weights)

def shrink_rate(cur, old, numerator, denominator, baseline, strength):
    """Rate estimation shrunk to baseline; prior-year influence is capped."""
    old_n = sum(num(r, numerator) for r in old)
    old_d = sum(num(r, denominator) for r in old)
    old_strength = min(old_d, 25.)
    player_prior = ((old_n / old_d) * old_strength + baseline * strength) / (old_strength + strength) if old_d else baseline
    cur_n = sum(num(r, numerator) for r in cur)
    cur_d = sum(num(r, denominator) for r in cur)
    return max(0., (cur_n + strength * player_prior) / (cur_d + strength))

def project_player(rows, position, season=2026):
    """Conditional mean stats. Missing/inactive weeks must not be padded with zero."""
    if position not in SKILL:
        return None
    cur = [r for r in rows if int(r["season"]) == season and r.get("season_type", "REG") == "REG"]
    old = [r for r in rows if int(r["season"]) == season - 1 and r.get("season_type", "REG") == "REG"]
    if not cur and not old:
        return None
    opp = {}
    for metric, baseline in OPPORTUNITY_PRIORS[position].items():
        old_mean, _ = weighted_mean(old, metric, half_life=6)
        old_confidence = min(1., len(old) / 5)
        prior = (old_mean * old_confidence + baseline * (1 - old_confidence)) if old_mean is not None else baseline
        recent_mean, n_eff = weighted_mean(cur, metric)
        opp[metric] = max(0., ((recent_mean or 0) * n_eff + prior * 1.4) / (n_eff + 1.4))
    rates = EFFIC_PRIORS[position]
    p_ypa = shrink_rate(cur, old, "passing_yards", "attempts", rates["pass_ypa"], 110.) if position == "QB" else 0.
    ypc = shrink_rate(cur, old, "rushing_yards", "carries", rates["ypc"], 75.)
    catch = shrink_rate(cur, old, "receptions", "targets", rates["catch_rate"], 50.)
    rec_ypt = shrink_rate(cur, old, "receiving_yards", "targets", rates["rec_ypt"], 70.)
    int_rate = shrink_rate(cur, old, "passing_interceptions", "attempts", rates["int_rate"], 150.) if position == "QB" else 0.
    sack_rate = shrink_rate(cur, old, "sacks_suffered", "attempts", rates["sack_rate"], 100.) if position == "QB" else 0.
    a, c, t = opp["attempts"], opp["carries"], opp["targets"]
    td = TD_PRIORS[position]
    return {
        "position": position, "sampleGames2026": len(cur), "sampleGames2025": len(old),
        "modelVersion": "opportunity-eb-v0.1", "availability": "not-modeled",
        "stats": {
            "passAttempts": round(a, 2), "passYards": round(a * p_ypa, 2),
            "passTD": round(a * td["pass"], 3), "interceptions": round(a * int_rate, 3),
            "sacksSuffered": round(a * sack_rate, 3),
            "carries": round(c, 2), "rushYards": round(c * ypc, 2),
            "rushTD": round(c * td["rush"], 3),
            "targets": round(t, 2), "receptions": round(t * min(1., catch), 2),
            "receivingYards": round(t * rec_ypt, 2),
            "receivingTD": round(t * td["receive"], 3),
        },
    }

def score(stats, yahoo_modifiers):
    """Use Yahoo CSU Stats coefficients for QB/RB/WR/TE modeled stats."""
    coefficients = {
        "passYards": "4", "passTD": "5", "interceptions": "6", "sacksSuffered": "7",
        "rushYards": "9", "rushTD": "10", "receptions": "11",
        "receivingYards": "12", "receivingTD": "13",
    }
    return round(sum(stats.get(stat, 0) * float(yahoo_modifiers.get(yahoo_id, 0))
                     for stat, yahoo_id in coefficients.items()), 2)

def project_rostered(rosters, stats_rows, yahoo_to_gsis, modifiers, season=2026):
    by_player = defaultdict(list)
    for r in stats_rows:
        pid = r.get("player_id") or r.get("gsis_id")
        if pid and r.get("position") in SKILL and str(r.get("season")) in (str(season), str(season - 1)):
            by_player[pid].append(r)
    players, unmapped, missing_history = [], [], []
    for team in rosters["teams"]:
        for p in team["players"]:
            if p["position"] not in SKILL:
                continue
            gsis_id = yahoo_to_gsis.get(str(p["id"]))
            if not gsis_id:
                unmapped.append({"yahooId": p["id"], "name": p["name"]})
                continue
            pred = project_player(by_player.get(gsis_id, []), p["position"], season)
            if pred is None:
                missing_history.append({"yahooId": p["id"], "name": p["name"], "gsisId": gsis_id})
                continue
            pred.update({"yahooId": p["id"], "gsisId": gsis_id, "name": p["name"],
                         "nflTeam": p["nflTeam"], "fantasyTeamId": team["id"],
                         "fantasyTeam": team["name"], "rosterSlot": p["slot"],
                         "injuryStatus": p["status"],
                         "conditionalPointsPerGame": score(pred["stats"], modifiers)})
            players.append(pred)
    return {
        "modelVersion": "opportunity-eb-v0.1", "season": season,
        "note": "Conditional on playing an ordinary game; not availability-adjusted or schedule-aware.",
        "players": sorted(players, key=lambda p: -p["conditionalPointsPerGame"]),
        "coverage": {"projected": len(players), "unmappedYahooIds": unmapped,
                     "withoutWeeklyHistory": missing_history},
    }
