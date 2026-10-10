import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"model"))
from trades import trade_eligible_score, search, players_for_team, candidate_pool
from waivers import lineup_dp, FULL

def mk(pid,pos,slot="BN"):
    return {"id":str(pid),"name":"Player "+str(pid),"position":pos,"slot":slot,"status":None,"nflTeam":"GB"}

class PackageTests(unittest.TestCase):
    def test_multiple_additions_fill_different_slots(self):
        base=[mk(1,"QB"),mk(2,"RB"),mk(3,"WR"),mk(4,"TE")]
        vals={(str(p["id"]),6):10 for p in base}
        vals[("5",6)]=20;vals[("6",6)]=17;vals[("7",6)]=13
        dp=lineup_dp(base,vals,6)
        self.assertEqual(trade_eligible_score(dp,[mk(5,"RB"),mk(6,"WR"),mk(7,"WR")],vals,6),90.)
    def test_bounds_and_skip_ir(self):
        fake={"teams":[{"id":"7","name":"Mine","players":[mk(1,"QB"),mk(2,"RB"),mk(3,"RB"),mk(4,"WR"),mk(5,"WR"),mk(6,"TE"),mk(7,"WR"),mk(8,"RB","IR")]}]}
        future={str(x["id"]):{"weeks":[{"week":6,"points":10}]} for x in fake["teams"][0]["players"]}
        p=players_for_team(fake["teams"][0],future)
        self.assertEqual(len(p),7)
        self.assertFalse(any(x["id"]=="8" for x in p))
        self.assertTrue(all(x["position"]!="K" for x in candidate_pool(p,future,[6])))
    def test_requires_both_teams_improve(self):
        # Equal base teams, all modeled at 10 points. No mutually beneficial deal.
        positions=["QB","RB","RB","WR","WR","TE","WR","RB"]
        teams=[]
        future=[]
        for t in range(2):
            rows=[]
            for j,pos in enumerate(positions):
                pid=str(t*100+j+1)
                rows.append(mk(pid,pos))
                future.append({"yahooId":pid,"name":"p"+pid,"position":pos,
                               "weeks":[{"week":w,"points":10} for w in range(6,18)]})
            teams.append({"id":"7" if t==0 else "9","name":"T"+str(t),"players":rows})
        data=search({"teams":teams,"leagueId":"abc"},
                    {"season":2026,"endWeek":17,"players":future})
        self.assertEqual(data["mutualPositiveCount"],0)
        self.assertGreater(data["candidatesChecked"],0)

if __name__=="__main__":
    unittest.main()
