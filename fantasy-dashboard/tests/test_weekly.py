import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"model"))
from weekly import parse_games, annotate_week, availability_status, matchup_factors

TEAMS="ARI ATL BAL BUF CAR CHI CIN CLE DAL DEN DET GB HOU IND JAX KC LV LAC LAR MIA MIN NE NO NYG NYJ PHI PIT SEA SF TB TEN WAS".split()
SCHEDULE=[{"season":"2026","game_type":"REG","week":"5",
            "home_team":TEAMS[2*i],"away_team":TEAMS[2*i+1],
            "gameday":"2026-10-11","gametime":"13:00","game_id":str(i)}
           for i in range(10)]
RULES={"4":.04,"5":6,"6":-3,"7":-1,"9":.1,"10":6,"11":.5,"12":.1,"13":6}

def p(pid,nfl_team,position="RB",status=None,slot="BN"):
    return {"yahooId":str(pid),"name":str(pid),"nflTeam":nfl_team,
            "position":position,"conditionalPointsPerGame":12.5,
            "rosterSlot":slot,"injuryStatus":status}

class WeekTests(unittest.TestCase):
    def test_schedule_pairs_and_byes(self):
        games,teams=parse_games(SCHEDULE,2026,5)
        self.assertEqual(len(games),10)
        self.assertEqual(teams["ARI"]["opponent"],"ATL")
        self.assertNotIn("TEN",teams)
    def test_injury_status_without_invented_probability(self):
        self.assertEqual(availability_status("Q","BN"),"uncertain")
        self.assertEqual(availability_status("IR-R","IR"),"out")
        self.assertEqual(availability_status("CEL","BN"),"out")
        self.assertEqual(availability_status(None,"IR"),"ir_slot_unknown")
    def test_weekly_forecast(self):
        items=[
            p(1,"ARI"),p(2,"ATL",status="Q"),
            p(3,"BAL",status="O"),p(4,"TEN"),
            p(5,"BUF",status=None,slot="IR")]
        arr=annotate_week(items,SCHEDULE,SCHEDULE,[],2026,5,RULES,
                          asof="2026-10-09T20:00:00Z")
        self.assertEqual(arr[0]["opponent"],"ATL")
        self.assertEqual(arr[0]["weeklyProjectedPoints"],12.5)
        self.assertIsNone(arr[1]["weeklyProjectedPoints"])
        self.assertGreater(arr[1]["activeGamePoints"],0)
        self.assertEqual(arr[2]["weeklyProjectedPoints"],0)
        self.assertEqual(arr[3]["weeklyProjectedPoints"],0)
        self.assertEqual(arr[3]["forecastStatus"],"bye")
        self.assertIsNone(arr[4]["weeklyProjectedPoints"])
    def test_defense_factor_shrunk_and_capped(self):
        schedules=SCHEDULE+[dict(x,week="4",game_id="4-"+x["game_id"]) for x in SCHEDULE]
        stats=[{"season":2026,"week":4,"season_type":"REG",
                "recent_team":"ATL","position":"RB","rushing_yards":600}]
        factors=matchup_factors(stats,schedules,2026,5,RULES)
        self.assertTrue(all(.9<=x<=1.1 for x in factors.values()))

if __name__=="__main__":
    unittest.main()
