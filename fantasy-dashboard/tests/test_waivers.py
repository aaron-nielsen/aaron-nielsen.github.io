import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"model"))
from waivers import lineup_dp,added_score,candidates,FULL

def player(pid,name,pos,slot="BN"):
    return {"id":str(pid),"name":name,"position":pos,"slot":slot}
def base():
    ps=[
      player(1,"QB","QB","QB"),
      player(2,"RB a","RB","RB"),player(3,"RB b","RB","RB"),
      player(4,"WR a","WR","WR"),player(5,"WR b","WR","WR"),
      player(6,"TE","TE","TE"),player(7,"Flex","WR","W/R/T"),
      player(8,"Bench WR","WR","BN")]
    return ps

class WaiverTests(unittest.TestCase):
    def test_excludes_double_counting_flex(self):
        ps=base()
        values={(p["id"],6):10 for p in ps}
        arr=lineup_dp(ps,values,6)
        self.assertEqual(arr[FULL],70.)
    def test_add_rushing_back_in_flex_slot(self):
        ps=base()
        values={(p["id"],6):10 for p in ps}
        dp=lineup_dp(ps,values,6)
        self.assertEqual(added_score(dp,"RB",18),78.)
    def test_ir_not_a_drop_and_reports_horizon_gain(self):
        ps=base()+[player(9,"IR stash","RB","IR")]
        rosters={"teams":[{"id":"7","name":"My team","players":ps}]}
        free={"players":[{"id":"20","name":"Available RB","position":"RB",
                          "nflTeam":"CHI","status":None}]}
        def f(p,points):
            return {"yahooId":str(p),"name":"Name","position":"RB",
                    "ownership":"available","matchMethod":"test",
                    "weeks":[{"week":w,"points":points,"activePoints":points}
                             for w in range(5,18)]}
        futures={"endWeek":17,"players":[f(p["id"],10) for p in ps]+[f("20",20)]}
        # Correct missing role types in fixture
        for r,p in zip(futures["players"],ps):
            r["position"]=p["position"]
        horizons,ranking,baseline,existing,pool,drops=candidates(rosters,free,futures)
        self.assertEqual(len(horizons["next_week"]),1)
        self.assertEqual(horizons["four_weeks"],[6,7,8,9])
        self.assertEqual(horizons["rest_of_season"][-1],17)
        self.assertTrue(all(d["id"]!="9" for d in drops))
        self.assertAlmostEqual(ranking["next_week"][0]["lineupGain"],10.)
        self.assertAlmostEqual(ranking["four_weeks"][0]["lineupGain"],40.)

if __name__=="__main__":
    unittest.main()
