"""Generate current QB/RB/WR/TE projections from public nflverse data.

From fantasy-dashboard/: python model/build.py
No Yahoo credentials required; consumes the mapped roster snapshot.
"""
import csv
from datetime import datetime, timezone
import io
import json
from pathlib import Path
from urllib.request import Request, urlopen
from project import project_pool, HISTORY_YEARS
from identity import yahoo_crosswalk

BASE = Path(__file__).resolve().parents[1]
SEASON = 2026
STATS_URL = "https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_{season}.csv"
IDS_URL = "https://raw.githubusercontent.com/dynastyprocess/data/master/files/db_playerids.csv"

def csv_rows(url):
    with urlopen(Request(url, headers={"User-Agent": "CSU-Stats-Fantasy-Dashboard/0.1"}), timeout=90) as response:
        payload = response.read()
    if not payload.strip():
        raise RuntimeError("Empty data source: " + url)
    return list(csv.DictReader(io.StringIO(payload.decode("utf-8-sig"))))

def normalize_weekly_stats(rows):
    """Reconcile current nflverse release columns with their legacy equivalents.

    New stats_player CSV: team / passing_interceptions / sacks_suffered.
    Older loaders: recent_team / interceptions / sacks.
    Fail closed if these important QB columns are absent.
    """
    if not rows:
        return rows
    columns = set(rows[0].keys())
    for alternatives in [("recent_team", "team"),
                         ("interceptions", "passing_interceptions"),
                         ("sacks", "sacks_suffered")]:
        if not (columns & set(alternatives)):
            raise RuntimeError("Missing expected player-stats columns: " + "/".join(alternatives))
    for row in rows:
        if not row.get("recent_team"):
            row["recent_team"] = row.get("team") or ""
        if row.get("interceptions") in (None, ""):
            row["interceptions"] = row.get("passing_interceptions") or "0"
        if row.get("sacks") in (None, ""):
            row["sacks"] = row.get("sacks_suffered") or "0"
    return rows

def main():
    rosters = json.loads((BASE / "data/rosters.json").read_text())
    available = json.loads((BASE / "data/available.json").read_text())
    league = json.loads((BASE / "data/league.json").read_text())
    if rosters["leagueId"] != league["leagueId"] or available["leagueId"] != league["leagueId"]:
        raise RuntimeError("League ID mismatch; refusing to update projections")
    ids, ambiguous = yahoo_crosswalk(csv_rows(IDS_URL))
    rows = []
    for year in range(SEASON - HISTORY_YEARS, SEASON + 1):
        source_rows = normalize_weekly_stats(csv_rows(STATS_URL.format(season=year)))
        if not source_rows:
            raise RuntimeError("No player stats available for year " + str(year))
        rows.extend(source_rows)
    # Snapshot Yahoo's current week and *exclude* it from model inputs:
    # Thursday/Monday games can enter nflverse while that fantasy week is incomplete.
    current_week = int(league["currentWeekAtSnapshot"])
    if current_week < 2:
        raise RuntimeError("Historical current-week cutoff missing or too early")
    rows = [r for r in rows if str(r.get("season")) != str(SEASON)
            or (r.get("season_type") == "REG" and int(r.get("week") or 0) < current_week)]
    current = [r for r in rows if str(r.get("season")) == str(SEASON) and r.get("season_type") == "REG"]
    if not current:
        raise RuntimeError("No completed current-season regular-season player stats")
    out = project_pool(rosters, available, rows, ids, league["scoringByYahooStatId"], SEASON)
    total_skill = sum(p["position"] in ("QB", "RB", "WR", "TE") for t in rosters["teams"] for p in t["players"])
    if out["coverage"]["rosteredProjected"] < total_skill * .5:
        raise RuntimeError(f"Low rostered player match coverage: {out['coverage']['rosteredProjected']}/{total_skill}")
    out.update({
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "rosterSnapshotAt": rosters.get("retrievedAt"),
        "availableSnapshotAt": available.get("retrievedAt"),
        "statsThroughWeek": max(int(r["week"]) for r in current),
        "historicalSeasons": list(range(SEASON-HISTORY_YEARS, SEASON)),
        "inputSources": [IDS_URL] + [STATS_URL.format(season=y) for y in range(SEASON-HISTORY_YEARS, SEASON+1)],
        "coverage": {**out["coverage"], "rosteredSkillPlayers": total_skill, "ambiguousCrosswalkIDs": ambiguous},
    })
    dest = BASE / "data/projections.json"
    dest.write_text(json.dumps(out, indent=2) + "\n")
    print(f"Projected {out['coverage']['rosteredProjected']}/{total_skill} rostered and {out['coverage']['availableProjected']}/{out['coverage']['availableSkillPlayersSampled']} sampled available skill players; stats through week {out['statsThroughWeek']}")

if __name__ == "__main__":
    main()
