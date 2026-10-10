"""Conservative matching of Yahoo players to nflverse GSIS IDs.

Prefer verified Yahoo/GSIS crosswalk. Exact full-name + position is the only
fallback; never fuzzy-match by surname or guess between duplicate names.
"""
from collections import defaultdict
import re
import unicodedata

SKILL = {"QB", "RB", "WR", "TE"}
ALIASES = {"JAC": "JAX", "WSH": "WAS", "LA": "LAR"}

def normalized_name(name):
    s = unicodedata.normalize("NFKD", str(name or "")).encode("ascii", "ignore").decode().lower()
    s = s.replace("’", "'").replace(".", "").replace("'", "")
    s = re.sub(r"\b(jr|sr|ii|iii|iv|v)\b", "", s)
    return re.sub(r"[^a-z0-9]+", "", s)

def normalized_team(team):
    val = str(team or "").strip().upper()
    return ALIASES.get(val, val)

def clean_id(value):
    v = str(value or "").strip()
    return "" if v.lower() in ("", "na", "nan", "null", "none") else v

def yahoo_crosswalk(rows):
    mapping, conflict = {}, set()
    for r in rows:
        yahoo, gsis = clean_id(r.get("yahoo_id")), clean_id(r.get("gsis_id"))
        if not yahoo or not gsis:
            continue
        if yahoo in mapping and mapping[yahoo] != gsis:
            conflict.add(yahoo)
        else:
            mapping[yahoo] = gsis
    for yahoo in conflict:
        mapping.pop(yahoo, None)
    return mapping, sorted(conflict)

def player_catalog(rows):
    """One record per player ID, indexed by exact normalized full name + position."""
    by_id = defaultdict(list)
    for r in rows:
        pid, pos = clean_id(r.get("player_id") or r.get("gsis_id")), r.get("position")
        if pid and pos in SKILL and r.get("season_type", "REG") == "REG":
            by_id[pid].append(r)
    by_name = defaultdict(set)
    teams_by_id = defaultdict(set)
    current_ids = set()
    for pid, games in by_id.items():
        for r in games:
            nm = normalized_name(r.get("player_display_name") or r.get("player_name"))
            pos = r.get("position")
            if nm:
                by_name[(nm, pos)].add(pid)
            if r.get("recent_team"):
                teams_by_id[pid].add(normalized_team(r["recent_team"]))
            if int(r.get("season") or 0) == 2026:
                current_ids.add(pid)
    return by_id, by_name, teams_by_id, current_ids

def resolve_players(players, stats_rows, id_crosswalk, season=2026):
    """Return IDs and provenance; never match by partial name or raw team alone.

    A fallback requires a unique full normalized name and same position.
    Prefer also verifying the team from the player's known game history.
    If the team disagrees, only accept a uniquely named player actually
    present in the current year's stats and label the lower-confidence method.
    """
    by_id, by_name, teams_by_id, _ = player_catalog(stats_rows)
    current_ids = {pid for pid, games in by_id.items()
                   if any(int(r.get("season") or 0) == season for r in games)}
    matched, unresolved, collisions = {}, [], []
    used = {}
    for p in players:
        yahoo = str(p["id"])
        pos = p.get("position")
        if pos not in SKILL:
            continue
        method = None
        candidate = clean_id(id_crosswalk.get(yahoo))
        if candidate and candidate in by_id and any(r["position"] == pos for r in by_id[candidate]):
            method = "crosswalk"
        else:
            candidate = None
            key = (normalized_name(p.get("name")), pos)
            possibilities = by_name.get(key, set())
            if len(possibilities) == 1:
                found = next(iter(possibilities))
                team = normalized_team(p.get("nflTeam"))
                if team and team in teams_by_id[found]:
                    candidate, method = found, "exact_name_position_team"
                elif found in current_ids:
                    candidate, method = found, "exact_name_position_current_year"
            # If multiple IDs share the same exact name, decline to guess.
        if candidate:
            if candidate in used and used[candidate] != yahoo:
                collisions.append({"yahooId": yahoo, "name": p.get("name"),
                                   "gsisId": candidate, "existingYahooId": used[candidate]})
                continue
            used[candidate] = yahoo
            matched[yahoo] = {"gsisId": candidate, "method": method}
        else:
            unresolved.append({"yahooId": yahoo, "name": p.get("name"),
                               "position": pos, "nflTeam": p.get("nflTeam")})
    return matched, unresolved, collisions
