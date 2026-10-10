"""Da Vinci Fantasy Lab: multi-player hypothetical trade package search.

Both sides evaluated against their best legal QB, RB, RB, WR, WR, TE, flex
lineups, for every projected Week 6-17. Searches a bounded, reported
candidate pool (not every possible combination in a 14-team league).
Packages support 1..3 players sent by each side; 2-for-1 and 3-for-2 are
included but roster-spot balancing after unequal-count deals is NOT simulated.

Output is hypothetical conditional-on-active scenario value; no roster moves.
"""
from collections import defaultdict
from datetime import datetime, timezone
from itertools import combinations
import json
import math
from pathlib import Path

from waivers import FULL, ELIGIBLE, lineup_dp

BASE=Path(__file__).resolve().parents[1]
POSITIONS=set(ELIGIBLE)
RESTRICTED={"NA","N/A","IR","IR-R","PUP","PUP-R","NFI","NFI-R","CEL","SUSP","SUS"}
MINE="7"
MAX_POOL=6
MAX_PKG=3
MIN_WEEKLY_GAIN=.15

def players_for_team(team, future):
    ret=[]
    for p in team["players"]:
        pos=p.get("position")
        if pos not in POSITIONS or p.get("slot")=="IR":
            continue
        status=str(p.get("status") or "").upper()
        if status in RESTRICTED or status.startswith(("IR-","PUP-","NFI-")):
            continue
        if str(p["id"]) not in future:
            continue
        ret.append(p)
    return ret

def candidate_pool(players, future, weeks):
    """Five top non-QB pieces plus (at most) one QB, capped at six."""
    ranked=sorted(players,key=lambda p:-sum(float(w.get("points") or 0)
                 for w in future[str(p["id"])]["weeks"] if w["week"] in weeks))
    non_qb=[p for p in ranked if p["position"]!="QB"][:5]
    qb=[p for p in ranked if p["position"]=="QB"][:1]
    return (non_qb+qb)[:MAX_POOL]

def sets_of_players(pool):
    return [c for n in (1,2,3) for c in combinations(pool,n)]

def annotate_players(ps):
    return [{"yahooId":str(p["id"]),"name":p["name"],"position":p["position"],
             "nflTeam":p.get("nflTeam")} for p in ps]

def trade_eligible_score(dp, incoming, values, week):
    """Reuse DP for all pre-trade players not outgoing.

    Each incoming player can fill at most one lineup slot; this yields the
    exact optimal 7-slot lineup after an arbitrary multi-player acquisition.
    """
    state=dp.copy()
    for p in incoming:
        pid=str(p["id"]);pos=p["position"]
        value=float(values.get((pid,week),0))
        for mask in range(FULL,-1,-1):
            base=state[mask]
            if base==float("-inf"):
                continue
            for slot in ELIGIBLE[pos]:
                bit=1<<slot
                if not mask&bit:
                    dest=mask|bit
                    if base+value>state[dest]:
                        state[dest]=base+value
    return state[FULL]

def team_cache(players,pool,weeks,values):
    pools=sets_of_players(pool)
    cache={}
    for bundle in pools:
        ids={str(p["id"]) for p in bundle}
        remains=[p for p in players if str(p["id"]) not in ids]
        cache[tuple(sorted(ids))]={
            w:lineup_dp(remains,values,w) for w in weeks
        }
    baseline={w:lineup_dp(players,values,w)[FULL] for w in weeks}
    if any(not math.isfinite(val) for val in baseline.values()):
        return None
    return pools,cache,baseline

def search(rosters,future,start=6,end=17):
    projected={str(p["yahooId"]):p for p in future["players"]}
    weeks=list(range(start,end+1))
    values={}
    for p in future["players"]:
        for w in p["weeks"]:
            if w["week"] in weeks:
                values[(str(p["yahooId"]),w["week"])]=float(w.get("points") or 0)
    team_list=rosters["teams"]
    own=next(t for t in team_list if str(t["id"])==MINE)
    mine=players_for_team(own,projected)
    my_pool=candidate_pool(mine,projected,weeks)
    my_cache=team_cache(mine,my_pool,weeks,values)
    if my_cache is None:
        raise ValueError("Cannot optimize full starting lineup for user over all weeks")
    mine_sets,my_away,my_baseline=my_cache
    results=[]
    skipped=[]
    checked=0
    for partner in team_list:
        if str(partner["id"])==MINE:continue
        theirs=players_for_team(partner,projected)
        their_pool=candidate_pool(theirs,projected,weeks)
        second=team_cache(theirs,their_pool,weeks,values)
        if second is None:
            skipped.append({"id":str(partner["id"]),"team":partner["name"],
                            "reason":"Cannot fill projected baseline legal lineup in all weeks"})
            continue
        their_sets,their_away,their_baseline=second
        for outgoing in mine_sets:
            if len(outgoing)>MAX_PKG:continue
            my_key=tuple(sorted(str(p["id"]) for p in outgoing))
            mine_remains=my_away[my_key]
            for incoming in their_sets:
                nout,nin=len(outgoing),len(incoming)
                if nout==1 and nin==1:continue # require at least 3 total players
                if nout+nin>6:continue
                other_key=tuple(sorted(str(p["id"]) for p in incoming))
                theirs_remains=their_away[other_key]
                mine_delta=[];their_delta=[]
                possible=True
                for w in weeks:
                    next_mine=trade_eligible_score(mine_remains[w],incoming,values,w)
                    next_them=trade_eligible_score(theirs_remains[w],outgoing,values,w)
                    if not math.isfinite(next_mine) or not math.isfinite(next_them):
                        possible=False;break
                    mine_delta.append(round(next_mine-my_baseline[w],4))
                    their_delta.append(round(next_them-their_baseline[w],4))
                checked+=1
                if not possible:continue
                gain_a=sum(mine_delta);gain_b=sum(their_delta)
                threshold=MIN_WEEKLY_GAIN*len(weeks)
                if gain_a<threshold or gain_b<threshold:continue
                # Relative fairness matters more than the largest asymmetric gain.
                score=min(gain_a,gain_b)+.12*max(gain_a,gain_b)
                results.append({
                    "partnerTeamId":str(partner["id"]), "partnerTeam":partner["name"],
                    "youSend":annotate_players(outgoing),
                    "youReceive":annotate_players(incoming),
                    "packageShape":f"{nout}-for-{nin}",
                    "requiresRosterAdjustment":nout!=nin,
                    "yourGain":round(gain_a,2),"theirGain":round(gain_b,2),
                    "weeklyGains":[{"week":w,"you":round(a,2),"them":round(b,2)}
                                   for w,a,b in zip(weeks,mine_delta,their_delta)],
                    "balanceScore":round(score,3),
                    "positionsTraded":sorted({p["position"] for p in outgoing+incoming})
                })
    results.sort(key=lambda p:(-p["balanceScore"],-p["yourGain"],p["partnerTeam"]))
    # Reduce duplicate packages with the exact same targets and counterpart.
    diverse=[];used=set();partnerCounts=defaultdict(int)
    for p in results:
        incoming=tuple(sorted(x["yahooId"] for x in p["youReceive"]))
        outgoing=tuple(sorted(x["yahooId"] for x in p["youSend"]))
        key=(p["partnerTeamId"],incoming,outgoing)
        if key in used or partnerCounts[p["partnerTeamId"]]>=15:continue
        used.add(key);partnerCounts[p["partnerTeamId"]]+=1;diverse.append(p)
        if len(diverse)>=130:break
    return {
        "modelVersion":"multi-package-trades-v0.1","generatedAt":datetime.now(timezone.utc).isoformat(),
        "startWeek":start,"endWeek":end,"season":future["season"],
        "leagueId":rosters["leagueId"],"userTeamId":MINE,
        "rosterSnapshotAt":rosters.get("userTeamLastRefreshedAt") or rosters.get("retrievedAt"),
        "forecastGeneratedAt":future.get("generatedAt"),
        "evaluation":{"skillSlots":["QB","RB","RB","WR","WR","TE","W/R/T"],
                      "maxPlayersEachSide":3,
                      "candidatePoolMaxPerTeam":MAX_POOL,
                      "excludeIRSlots":True,
                      "method":"Exact legal-lineup dynamic programming per week on retained players plus traded package; both sides must gain"},
        "candidatesChecked":checked,"mutualPositiveCount":len(results),
        "partnerTeamsSkipped":skipped,
        "trades":diverse,
        "notice":"Hypothetical scenarios based on static October 2026 rosters and future healthy-active projection assumptions. This is a bounded package search, not an exhaustive auction of every team roster; projected injuries, acceptance probability, kicker/defense, and package salary/roster-slot constraints are unmodeled. Unequal-size packages may require subsequent roster cuts/adds to meet Yahoo roster limits. No moves performed.",
    }

def main():
    rosters=json.loads((BASE/"data/rosters.json").read_text())
    future=json.loads((BASE/"data/future.json").read_text())
    data=search(rosters,future)
    if data["candidatesChecked"]<100:
        raise RuntimeError("Package search too small")
    dest=BASE/"data/trades.json"
    dest.write_text(json.dumps(data,indent=2)+"\n")
    print("TRADE PACKAGES",json.dumps({
        "checked":data["candidatesChecked"],
        "mutualPositiveCount":data["mutualPositiveCount"],
        "showing":len(data["trades"]),
        "top":[{"partner":p["partnerTeam"],"package":p["packageShape"],
                "you":p["yourGain"],"them":p["theirGain"]}
               for p in data["trades"][:6]]
    }))
if __name__=="__main__":
    main()
