"""Week-specific forecast enrichment for Da Vinci Fantasy Lab.

No injury likelihoods are invented. Yahoo status is a snapshot, and every
projection is preliminary, conditioned on the player actually playing.
"""
from collections import defaultdict
from identity import normalized_team

POSITIONS = {"QB", "RB", "WR", "TE"}
CLEARLY_UNAVAILABLE = {"O", "OUT", "IR", "IR-R", "PUP", "PUP-R", "NFI", "NFI-R", "CEL", "SUSP", "SUS"}
UNCERTAIN = {"Q", "D", "GTD", "DOUBTFUL", "QUESTIONABLE"}

def parse_games(rows, season, week):
    games = []
    for game in rows:
        if str(game.get("season")) != str(season) or game.get("game_type") != "REG":
            continue
        w = int(game.get("week") or 0)
        if w == week:
            home, away = normalized_team(game.get("home_team")), normalized_team(game.get("away_team"))
            if not home or not away:
                continue
            games.append({
                "week": week, "home": home, "away": away, "date": game.get("gameday"),
                "time": game.get("gametime"), "gameId": game.get("game_id")
            })
    if len(games) < 10 or len(games) > 16:
        raise ValueError(f"Schedule has {len(games)} matchups for NFL Week {week}, expected 10–16")
    teams = {}
    for game in games:
        if game["home"] in teams or game["away"] in teams:
            raise ValueError("Duplicate team in schedule")
        teams[game["home"]] = {
            "opponent": game["away"], "home": True, "gameDate": game["date"],
            "gameTime": game["time"]
        }
        teams[game["away"]] = {
            "opponent": game["home"], "home": False, "gameDate": game["date"],
            "gameTime": game["time"]
        }
    return games, teams

def fantasy_observed(row, yahoo_rules):
    """Subset of Yahoo scoring the model actually forecasts."""
    values = {
        "4": float(row.get("passing_yards") or 0), "5": float(row.get("passing_tds") or 0),
        "6": float(row.get("interceptions") or 0), "7": float(row.get("sacks") or 0),
        "9": float(row.get("rushing_yards") or 0), "10": float(row.get("rushing_tds") or 0),
        "11": float(row.get("receptions") or 0), "12": float(row.get("receiving_yards") or 0),
        "13": float(row.get("receiving_tds") or 0),
    }
    return sum(float(yahoo_rules.get(k, 0)) * v for k, v in values.items())

def matchup_factors(history, games, season, week, modifiers):
    """Shrink position-specific defensive allowance vs position league mean.

    Use TOTAL position-group production conceded in a game, rather than
    average fantasy points of each rostered WR or RB; limits bias from the
    number of teammates appearing in the weekly stats.
    """
    offense_opponent = {}
    for game in games:
        w = int(game.get("week") or 0)
        if int(game.get("season") or 0) != season or game.get("game_type") != "REG" or w >= week:
            continue
        h, a = normalized_team(game.get("home_team")), normalized_team(game.get("away_team"))
        offense_opponent[(w, h)] = a
        offense_opponent[(w, a)] = h
    totals = defaultdict(float)
    for row in history:
        if int(row.get("season") or 0) != season or row.get("season_type") != "REG":
            continue
        w = int(row.get("week") or 0)
        team = normalized_team(row.get("recent_team") or row.get("team"))
        position = row.get("position")
        if position in POSITIONS and w < week and (w, team) in offense_opponent:
            key = (w, offense_opponent[(w, team)], position)
            totals[key] += fantasy_observed(row, modifiers)
    by_pos = defaultdict(list)
    by_def_pos = defaultdict(list)
    for (_, defense, pos), points in totals.items():
        by_pos[pos].append(points)
        by_def_pos[(defense, pos)].append(points)
    mean_by_pos = {p: sum(v)/len(v) for p, v in by_pos.items() if v}
    factors = {}
    for (defense, pos), sample in by_def_pos.items():
        mean = mean_by_pos.get(pos) or 0
        raw = sum(sample)/len(sample)/mean if mean > 0 else 1
        shrink = len(sample)/(len(sample)+8)
        factors[(defense, pos)] = max(.90, min(1.10, 1 + shrink*(raw-1)))
    return factors

def availability_status(status, roster_slot):
    s = str(status or "").strip().upper()
    slot = str(roster_slot or "").strip().upper()
    if s in CLEARLY_UNAVAILABLE or s.startswith(("IR-", "PUP-", "SUSP-")):
        return "out"
    if s in UNCERTAIN:
        return "uncertain"
    # IR is a fantasy roster slot; not sufficient to assert that player
    # cannot play NFL this week. Preserve a warning instead.
    if slot == "IR":
        return "ir_slot_unknown"
    return "no_reported_restriction"

def annotate_week(players, week_games, schedule_rows, stats_rows, season, week, modifiers, asof=None):
    _, team_schedule = parse_games(week_games, season, week)
    factors = matchup_factors(stats_rows, schedule_rows, season, week, modifiers)
    augmented = []
    for p in players:
        row = dict(p)
        team = normalized_team(p.get("nflTeam"))
        game = team_schedule.get(team)
        base = p.get("conditionalPointsPerGame")
        status = availability_status(p.get("injuryStatus"), p.get("rosterSlot"))
        if game is None and team and team in NFL_TEAMS:
            row.update({"opponent":None,"gameDate":None,"location":None,
                        "matchupFactor":1., "activeGamePoints":0.,
                        "weeklyProjectedPoints":0.,"weeklyAvailability":"bye","forecastStatus":"bye"})
        elif game is None:
            row.update({"opponent":None,"gameDate":None,"location":None,
                        "matchupFactor":None,"activeGamePoints":None,
                        "weeklyProjectedPoints":None,"weeklyAvailability":"unknown",
                        "forecastStatus":"schedule_unavailable"})
        else:
            factor=factors.get((game["opponent"],p["position"]),1.)
            points=round(float(base)*factor,2) if base is not None else None
            if status=="out":
                expected=0.
                label="unavailable_reported"
            elif status in ("uncertain","ir_slot_unknown"):
                expected=None
                label="needs_availability_confirmation"
            else:
                expected=points
                label="assuming_active"
            row.update({"opponent":game["opponent"],"gameDate":game["gameDate"],
                        "gameTime":game["gameTime"],"location":"home" if game["home"] else "away",
                        "matchupFactor":round(factor,3),"activeGamePoints":points,
                        "weeklyProjectedPoints":expected,"weeklyAvailability":status,
                        "forecastStatus":label})
        row["injurySnapshotAt"] = asof
        augmented.append(row)
    return augmented

NFL_TEAMS = set("ARI ATL BAL BUF CAR CHI CIN CLE DAL DEN DET GB HOU IND JAX KC LV LAC LAR MIA MIN NE NO NYG NYJ PHI PIT SEA SF TB TEN WAS".split())
