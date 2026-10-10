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

def project_player_legacy(rows, position, season=2026):
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
    int_rate = shrink_rate(cur, old, "interceptions", "attempts", rates["int_rate"], 150.) if position == "QB" else 0.
    sack_rate = shrink_rate(cur, old, "sacks", "attempts", rates["sack_rate"], 100.) if position == "QB" else 0.
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


# Multiseason priors. Recent workload adjusts quickly; ability/efficiency is
# regularized using several seasons rather than trusting a four-game sample.
HISTORY_YEARS = 4
ROLE_ANNUAL_DECAY = 0.36
EFFICIENCY_ANNUAL_DECAY = 0.72

def historical_role(rows, field, season, years, baseline):
    """Recency-weighted prior for player opportunity per active game.

    Old seasons matter far less for workload, since coaching/teams/roles change.
    Missing seasons are not counted as zero-volume games.
    """
    weighted, denominator = 0., 0.
    for lag in range(1, years + 1):
        season_games = [r for r in rows if int(r["season"]) == season - lag]
        ordered = sorted(season_games, key=lambda r: int(r["week"]), reverse=True)
        for i, game in enumerate(ordered):
            weight = ROLE_ANNUAL_DECAY ** (lag - 1) * 2 ** (-i / 8.)
            weighted += weight * num(game, field)
            denominator += weight
    if not denominator:
        return baseline
    credibility = min(1., denominator / 3.)
    player_mean = weighted / denominator
    return credibility * player_mean + (1. - credibility) * baseline

def historical_efficiency_rate(cur, history, numerator, denominator, baseline,
                               strength, season, years):
    """Bayes-style regularization; historical sample size is capped.

    2026 usage (cur) is full weight, earlier years decay; individual
    efficiency history has greater persistence than the opportunity forecast.
    """
    prior_num, prior_den = 0., 0.
    for r in history:
        lag = season - int(r["season"])
        if 1 <= lag <= years:
            w = EFFICIENCY_ANNUAL_DECAY ** (lag - 1)
            prior_num += w * num(r, numerator)
            prior_den += w * num(r, denominator)
    # Cap retained historical evidence to reduce stale efficiency dominance.
    retained = min(prior_den, strength * 2.5)
    hist_rate = prior_num / prior_den if prior_den else baseline
    now_num = sum(num(r, numerator) for r in cur)
    now_den = sum(num(r, denominator) for r in cur)
    return max(0., (now_num + retained * hist_rate + strength * baseline)
               / (now_den + retained + strength))

def project_player(rows, position, season=2026, history_years=HISTORY_YEARS):
    """Forecast an active-game statistical line from current + historical years.

    No forecast should use a current-week game that hasn't been completed.
    The caller must pass only rows available as of the forecast timestamp.
    """
    if position not in SKILL:
        return None
    history_years = max(1, min(5, int(history_years)))
    current = [r for r in rows if int(r["season"]) == season
               and r.get("season_type", "REG") == "REG"]
    history = [r for r in rows if 1 <= season - int(r["season"]) <= history_years
               and r.get("season_type", "REG") == "REG"]
    if not current and not history:
        return None
    opportunity = {}
    for metric, base in OPPORTUNITY_PRIORS[position].items():
        prior = historical_role(history, metric, season, history_years, base)
        recent_mean, effective_games = weighted_mean(current, metric)
        # 1.4 prior pseudo-games preserves sensitivity to workload changes.
        opportunity[metric] = max(0., ((recent_mean or 0) * effective_games + prior * 1.4)
                                  / (effective_games + 1.4))
    ef = EFFIC_PRIORS[position]
    def rate(n, d, baseline, strength):
        return historical_efficiency_rate(
            current, history, n, d, baseline, strength, season, history_years)
    py = rate("passing_yards", "attempts", ef["pass_ypa"], 110.) if position == "QB" else 0.
    ry = rate("rushing_yards", "carries", ef["ypc"], 75.)
    cr = min(1., rate("receptions", "targets", ef["catch_rate"], 50.))
    yt = rate("receiving_yards", "targets", ef["rec_ypt"], 70.)
    ir = rate("interceptions", "attempts", ef["int_rate"], 150.) if position == "QB" else 0.
    sr = rate("sacks", "attempts", ef["sack_rate"], 100.) if position == "QB" else 0.
    a, c, t = (opportunity[x] for x in ("attempts", "carries", "targets"))
    td = TD_PRIORS[position]
    return {
        "position": position,
        "sampleGames2026": len(current) if season == 2026 else 0,
        "sampleGames2025": len(history) if season == 2026 else len(current),
        "sampleGamesCurrentSeason": len(current),
        "sampleGamesHistory": len(history),
        "historyYearsUsed": history_years,
        "modelVersion": "opportunity-eb-v0.3",
        "availability": "not-modeled",
        "stats": {
            "passAttempts": round(a, 2), "passYards": round(a * py, 2),
            "passTD": round(a * td["pass"], 3), "interceptions": round(a * ir, 3),
            "sacksSuffered": round(a * sr, 3),
            "carries": round(c, 2), "rushYards": round(c * ry, 2),
            "rushTD": round(c * td["rush"], 3),
            "targets": round(t, 2), "receptions": round(t * cr, 2),
            "receivingYards": round(t * yt, 2),
            "receivingTD": round(t * td["receive"], 3),
        }
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
        if pid and r.get("position") in SKILL and season - HISTORY_YEARS <= int(r.get("season") or 0) <= season:
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


def project_pool(rosters, available, stats_rows, yahoo_to_gsis, modifiers, season=2026):
    """Project rostered AND league-available skill-position players.

    Report incomplete coverage honestly. Crosswalk and conservative fallback
    provenance are retained so uncertain identities are auditable.
    """
    from identity import resolve_players

    owned = []
    for t in rosters["teams"]:
        for p in t["players"]:
            if p["position"] in SKILL:
                owned.append(dict(p, fantasyTeamId=t["id"],
                                  fantasyTeam=t["name"], owned=True))
    owned_ids = {str(p["id"]) for p in owned}
    available_skill = [dict(p, fantasyTeamId=None, fantasyTeam="Available",
                            slot=None, status=None, owned=False)
                       for p in available["players"]
                       if p["position"] in SKILL and str(p["id"]) not in owned_ids]
    all_players = owned + available_skill
    matches, unmapped, collisions = resolve_players(
        all_players, stats_rows, yahoo_to_gsis, season=season)
    by_player = defaultdict(list)
    for r in stats_rows:
        pid = r.get("player_id") or r.get("gsis_id")
        if pid and r.get("position") in SKILL and season - HISTORY_YEARS <= int(r.get("season") or 0) <= season:
            by_player[pid].append(r)

    scored, missing_history = [], []
    methods = defaultdict(int)
    for p in all_players:
        key = str(p["id"])
        resolved = matches.get(key)
        if resolved is None:
            continue
        gsis_id = resolved["gsisId"]
        pred = project_player(by_player.get(gsis_id, []), p["position"], season)
        if pred is None:
            missing_history.append({"yahooId": key, "name": p["name"], "gsisId": gsis_id})
            continue
        methods[resolved["method"]] += 1
        pred.update({
            "yahooId": key, "gsisId": gsis_id, "matchMethod": resolved["method"],
            "name": p["name"], "nflTeam": p.get("nflTeam"),
            "fantasyTeamId": p["fantasyTeamId"], "fantasyTeam": p["fantasyTeam"],
            "ownership": "rostered" if p["owned"] else "available",
            "rosterSlot": p.get("slot"), "injuryStatus": p.get("status"),
            "conditionalPointsPerGame": score(pred["stats"], modifiers),
        })
        scored.append(pred)

    rostered_count = sum(p["ownership"] == "rostered" for p in scored)
    available_count = sum(p["ownership"] == "available" for p in scored)
    return {
        "modelVersion": "opportunity-eb-v0.3", "season": season,
        "historyYears": HISTORY_YEARS,
        "note": ("Conditional points per active game from completed weeks. "
                 "Not weekly predictions; injury, bye, matchup and role changes are not adjusted. "
                 "Name fallbacks are exact and conservative, not probabilistic."),
        "players": sorted(scored, key=lambda p: -p["conditionalPointsPerGame"]),
        "coverage": {
            "projected": len(scored),
            "rosteredSkillPlayers": len(owned),
            "availableSkillPlayersSampled": len(available_skill),
            "rosteredProjected": rostered_count,
            "availableProjected": available_count,
            "unmappedYahooIds": unmapped,
            "withoutWeeklyHistory": missing_history,
            "identityCollisions": collisions,
            "matchMethods": dict(methods),
        }
    }
