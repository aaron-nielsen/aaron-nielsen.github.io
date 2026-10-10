import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "model"))
from identity import normalized_name, yahoo_crosswalk, resolve_players
from project import project_player, project_pool

RULES = {"4": .04, "5": 6, "6": -3, "7": -1, "9": .1, "10": 6,
         "11": .5, "12": .1, "13": 6}

def row(pid, name, pos, team, season=2026, week=1, **kw):
    return {"player_id": pid, "player_display_name": name,
            "position": pos, "recent_team": team, "season": season,
            "week": week, "season_type": "REG", **kw}

def player(pid, name, pos, team):
    return {"id": pid, "name": name, "position": pos, "nflTeam": team}

class IdentityTests(unittest.TestCase):
    def test_suffix_and_apostrophe(self):
        self.assertEqual(normalized_name("A.J. Brown Jr."), normalized_name("AJ Brown"))
        self.assertEqual(normalized_name("D'Andre Swift"), normalized_name("DAndre Swift"))
    def test_na_crosswalk_ignored(self):
        mapping, ambiguous = yahoo_crosswalk([
            {"yahoo_id": "NA", "gsis_id": "00-012"},
            {"yahoo_id": "41791", "gsis_id": "00-014"},
            {"yahoo_id": "41791", "gsis_id": "00-014"}])
        self.assertNotIn("NA", mapping)
        self.assertNotIn("NA", ambiguous)
        self.assertEqual(mapping["41791"], "00-014")
    def test_exact_team_position_match(self):
        stats = [row("00-new", "Ashton Jeanty", "RB", "LV", carries=19, rushing_yards=81)]
        matched, missing, clashes = resolve_players(
            [player("41791", "Ashton Jeanty", "RB", "LV")], stats, {})
        self.assertEqual(matched["41791"]["gsisId"], "00-new")
        self.assertEqual(matched["41791"]["method"], "exact_name_position_team")
        self.assertEqual(missing, [])
        self.assertEqual(clashes, [])
    def test_duplicate_name_not_guessed(self):
        stats = [row("00-111", "Alex Smith", "QB", "SF"),
                 row("00-222", "Alex Smith", "QB", "KC")]
        matched, missing, _ = resolve_players([player("999", "Alex Smith", "QB", "KC")], stats, {})
        self.assertEqual(matched, {})
        self.assertEqual(len(missing), 1)
    def test_player_with_only_historical_different_team_not_guessed(self):
        stats = [row("00-old", "Alex Example", "WR", "CHI", season=2025)]
        matched, missing, _ = resolve_players([player("999", "Alex Example", "WR", "BUF")], stats, {})
        self.assertEqual(matched, {})
        self.assertEqual(len(missing), 1)
    def test_pool_includes_available_players(self):
        rosters={"teams":[{"id":"7","name":"Cats","players":[
            dict(player("1","Starter One","RB","GB"),slot="RB",status=None)]}]}
        available={"players":[player("2","Rookie Two","WR","CLE")]}
        stats=[
            row("00-111","Starter One","RB","GB",carries=15,rushing_yards=61,targets=2,receptions=2,receiving_yards=16),
            row("00-222","Rookie Two","WR","CLE",targets=7,receptions=5,receiving_yards=68)]
        result=project_pool(rosters,available,stats,{},RULES)
        self.assertEqual(result["coverage"]["rosteredProjected"],1)
        self.assertEqual(result["coverage"]["availableProjected"],1)
        self.assertEqual({p["ownership"] for p in result["players"]},{"available","rostered"})
    def test_qb_int_and_sack_penalties_use_real_source_columns(self):
        base=[row("00-qb","Quarterback One","QB","KC",attempts=34,passing_yards=260,carries=3,rushing_yards=12)]
        changed=[dict(base[0],interceptions=8,sacks=10)]
        first=project_player(base,"QB")["stats"]
        second=project_player(changed,"QB")["stats"]
        self.assertGreater(second["interceptions"],first["interceptions"])
        self.assertGreater(second["sacksSuffered"],first["sacksSuffered"])

if __name__=="__main__":
    unittest.main()
