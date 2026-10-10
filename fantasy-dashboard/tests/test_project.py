import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "model"))
from project import project_player, score, project_rostered

RULES = {"4":.04,"5":6,"6":-3,"7":-1,"9":.1,"10":6,"11":.5,"12":.1,"13":6}

def row(season, week, pid="00-abc", pos="RB", **kw):
    return {"season":season, "week":week, "player_id":pid,
            "position":pos, "season_type":"REG", **kw}

class ProjectTests(unittest.TestCase):
    def test_score_league_specific(self):
        self.assertEqual(score({"passYards":250,"passTD":2,"interceptions":1,"sacksSuffered":3},RULES),16.0)
    def test_observed_touchdowns_do_not_drive_forecasts(self):
        base = [row(2026,i,carries=15,targets=3,rushing_yards=65,
                    receptions=2,receiving_yards=16) for i in (1,2,3,4,5)]
        changed = [dict(g,rushing_tds=4,receiving_tds=3,passing_tds=2) for g in base]
        self.assertEqual(project_player(base,"RB"),project_player(changed,"RB"))
    def test_recent_role_change_matters(self):
        old = [row(2025,i,carries=1,targets=1,rushing_yards=4,
                   receptions=1,receiving_yards=4) for i in range(1,8)]
        early = [row(2026,i,carries=2,targets=1,rushing_yards=6,
                     receptions=1,receiving_yards=5) for i in (1,2)]
        recent = [row(2026,i,carries=22,targets=4,rushing_yards=95,
                      receptions=3,receiving_yards=20) for i in (3,4,5)]
        high = project_player(old+early+recent,"RB")["stats"]["carries"]
        low = project_player(old+early,"RB")["stats"]["carries"]
        self.assertGreater(high,low+8)
        self.assertLess(high,22)
    def test_missing_weeks_are_not_zeros(self):
        p = project_player([row(2026,1,carries=10),
                            row(2026,5,carries=10)],"RB")
        self.assertEqual(p["sampleGames2026"],2)
        self.assertGreater(p["stats"]["carries"],7)
    def test_uses_yahoo_id_not_name_to_match(self):
        rosters={"teams":[{"id":"7","name":"Cats","players":[
            {"id":"100","name":"A","position":"RB","nflTeam":"GB","slot":"RB","status":None}]}]}
        out=project_rostered(rosters,[row(2026,1,carries=12,rushing_yards=50,
                                           targets=3,receptions=2,receiving_yards=10)],
                               {"100":"00-abc"},RULES)
        self.assertEqual(out["coverage"]["projected"],1)
        self.assertEqual(out["players"][0]["fantasyTeamId"],"7")
    def test_empty_player_has_no_prediction(self):
        self.assertIsNone(project_player([],"WR"))

if __name__ == "__main__":
    unittest.main()
