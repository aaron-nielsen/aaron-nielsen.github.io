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
from project import project_rostered

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

def crosswalk(rows):
    mapping, ambiguous = {}, set()
    for row in rows:
        yahoo_id, gsis_id = (row.get("yahoo_id") or "").strip(), (row.get("gsis_id") or "").strip()
        if not yahoo_id or not gsis_id or gsis_id.lower() in ("na", "nan", "none"):
            continue
        if yahoo_id in mapping and mapping[yahoo_id] != gsis_id:
            ambiguous.add(yahoo_id)
        else:
            mapping[yahoo_id] = gsis_id
    for key in ambiguous:
        mapping.pop(key, None)
    return mapping, sorted(ambiguous)

def main():
    rosters = json.loads((BASE / "data/rosters.json").read_text())
    league = json.loads((BASE / "data/league.json").read_text())
    if rosters["leagueId"] != league["leagueId"]:
        raise RuntimeError("League ID mismatch; refusing to update projections")
    ids, ambiguous = crosswalk(csv_rows(IDS_URL))
    rows = []
    for year in (SEASON - 1, SEASON):
        source_rows = csv_rows(STATS_URL.format(season=year))
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
    out = project_rostered(rosters, rows, ids, league["scoringByYahooStatId"], SEASON)
    total_skill = sum(p["position"] in ("QB", "RB", "WR", "TE") for t in rosters["teams"] for p in t["players"])
    if out["coverage"]["projected"] < total_skill * .5:
        raise RuntimeError(f"Low player ID match coverage: {out['coverage']['projected']}/{total_skill}")
    out.update({
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "rosterSnapshotAt": rosters.get("retrievedAt"),
        "statsThroughWeek": max(int(r["week"]) for r in current),
        "inputSources": [IDS_URL] + [STATS_URL.format(season=y) for y in (SEASON-1, SEASON)],
        "coverage": {**out["coverage"], "rosteredSkillPlayers": total_skill, "ambiguousCrosswalkIDs": ambiguous},
    })
    dest = BASE / "data/projections.json"
    dest.write_text(json.dumps(out, indent=2) + "\n")
    print(f"Projected {len(out['players'])}/{total_skill} rostered skill players; stats through week {out['statsThroughWeek']}")

if __name__ == "__main__":
    main()
