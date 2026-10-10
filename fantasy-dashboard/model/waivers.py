"""Calculate Yahoo-league available-player suggestions by *optimized lineup gain*.

Exact DP on 7 modeled skill starters: QB, RB, RB, WR, WR, TE, W/R/T.
K and defense are held fixed and cancel in comparisons.
A pickup is evaluated with a single bench drop (1-for-1 Yahoo roster size).
Output is comparative scenario gain, NOT injury-adjusted expected points.
"""
from datetime import datetime, timezone
import json
from pathlib import Path

BASE=Path(__file__).resolve().parents[1]
POSITIONS={"QB","RB","WR","TE"}
SLOTS=("QB","RB","RB","WR","WR","TE","W/R/T")
FULL=(1<<len(SLOTS))-1
ELIGIBLE={
    "QB":[0],
    "RB":[1,2,6],
    "WR":[3,4,6],
    "TE":[5,6],
}
UNAVAILABLE_CODES={"NA","N/A","IR","IR-R","PUP","PUP-R","NFI","NFI-R","CEL","SUSP","SUS","OUT"}

def lineup_dp(players, values, week):
    """Mask assignment DP, one player per slot, maximum projected starter total.

    Assignment excludes IR-slot stash but permits starting/bench Yahoo slots.
    The score is only the 7 forecastable offensive starting positions.
    """
    dp=[float("-inf")]*(FULL+1)
    dp[0]=0.
    for p in players:
        pos=p["position"]
        if pos not in ELIGIBLE:
            continue
        value=values.get((str(p["id"]),week))
        if value is None:
            continue
        value=float(value)
        for mask in range(FULL,-1,-1):
            if dp[mask]==float("-inf"):
                continue
            for slot in ELIGIBLE[pos]:
                bit=1<<slot
                if not mask&bit:
                    target=mask|bit
                    candidate=dp[mask]+value
                    if candidate>dp[target]:
                        dp[target]=candidate
    return dp

def added_score(dp,position,points):
    """Optimal lineup with the new player on top of a computed roster DP."""
    best=dp[FULL]
    if points is None:
        return best
    for slot in ELIGIBLE[position]:
        other=dp[FULL^(1<<slot)]
        if other!=float("-inf"):
            best=max(best,other+float(points))
    return best

def candidates(rosters,available,future,team_id="7",start=6):
    mine=next(t for t in rosters["teams"] if str(t["id"])==str(team_id))
    projected={str(p["yahooId"]):p for p in future["players"]}
    restricted_rostered={"CEL","SUSP","SUS","IR","IR-R","PUP","PUP-R","NFI","NFI-R","NA"}
    existing=[p for p in mine["players"] if p["position"] in POSITIONS
              and p["slot"]!="IR"
              and str(p.get("status") or "").upper() not in restricted_rostered
              and str(p["id"]) in projected]
    drops=[p for p in existing if p["slot"]=="BN"]
    if not drops:
        raise ValueError("No bench players to propose as drops")
    if not any(p["position"]=="QB" for p in existing):
        raise ValueError("No quarterback on current roster")
    horizons={"next_week":list(range(start,start+1)),
              "four_weeks":list(range(start,min(start+4,future["endWeek"]+1))),
              "rest_of_season":list(range(start,future["endWeek"]+1))}
    weeks=horizons["rest_of_season"]
    values={}
    for p in future["players"]:
        for w in p["weeks"]:
            if w["week"]>=start:
                # The future model treats every non-bye scheduled player as active.
                # Unknown schedule is zero, never invented points.
                values[(str(p["yahooId"]),w["week"])]=float(w["points"]) if w["points"] is not None else 0.
    baseline={week:lineup_dp(existing,values,week)[FULL] for week in weeks}
    if any(x==float("-inf") for x in baseline.values()):
        raise ValueError("Baseline legal lineup cannot be filled for some weeks")

    after_drop={
        d["id"]:{
            week:lineup_dp([p for p in existing if p["id"]!=d["id"]],values,week)
            for week in weeks
        }
        for d in drops
    }
    free=[
        p for p in available["players"]
        if p["position"] in POSITIONS
        and str(p["id"]) in projected
        and str(p.get("status") or "").upper() not in UNAVAILABLE_CODES
        and not any(str(p["id"])==str(q["id"]) for q in mine["players"])
    ]
    results={key:[] for key in horizons}
    for addition in free:
        pid=str(addition["id"]);forecast=projected[pid]
        projpoints={week:values.get((pid,week),0) for week in weeks}
        for key,period in horizons.items():
            baseline_sum=sum(baseline[week] for week in period)
            choices=[]
            for d in drops:
                d_id=str(d["id"])
                scores=[added_score(after_drop[d_id][week],addition["position"],
                                    projpoints[week])
                        for week in period]
                if any(x==float("-inf") for x in scores):
                    continue
                after=sum(scores)
                gain=after-baseline_sum
                risk=sum(values.get((d_id,week),0) for week in period)
                choices.append((gain,-risk,d,after,scores))
            if not choices:
                continue
            best=max(choices,key=lambda row:(row[0],row[1],-len(row[2]["name"])))
            gain,_,drop,after,scores=best
            if gain<=0.05:
                continue
            results[key].append({
                "yahooId":pid,"name":addition["name"],"position":addition["position"],
                "nflTeam":addition.get("nflTeam"),"status":addition.get("status"),
                "yahooWideRosteredPercent":addition.get("yahooWideRosteredPercent"),
                "suggestedDrop":{"yahooId":str(drop["id"]),"name":drop["name"],
                                 "position":drop["position"]},
                "lineupGain":round(gain,2),
                "baselineLineupPoints":round(baseline_sum,2),
                "withPickupLineupPoints":round(after,2),
                "addedPlayerRawPoints":round(sum(projpoints[w] for w in period),2),
                "weeklyGain": [{"week":w,"gain":round(score-baseline[w],2)}
                               for w,score in zip(period,scores)],
                "matchMethod":forecast.get("matchMethod"),
            })
    return horizons,results,baseline,existing,free,drops

def main():
    rosters=json.loads((BASE/"data/rosters.json").read_text())
    available=json.loads((BASE/"data/available.json").read_text())
    future=json.loads((BASE/"data/future.json").read_text())
    if rosters["leagueId"]!=available["leagueId"]:
        raise ValueError("Yahoo roster and available pool are different leagues")
    if future["season"]!=2026 or future["startWeek"]>6 or future["endWeek"]<17:
        raise ValueError("Future projection data is not appropriate for the requested horizons")
    horizons,results,baseline,existing,free,drops=candidates(rosters,available,future)
    for key,rows in results.items():
        rows.sort(key=lambda x:(-x["lineupGain"],-x["addedPlayerRawPoints"],x["name"]))
        print(key," | ".join(f'{x["name"]}: +{x["lineupGain"]:.2f} drop {x["suggestedDrop"]["name"]}'
                            for x in rows[:8]))
    output={
        "schemaVersion":1,"modelVersion":"lineup-gain-v0.1",
        "season":2026,"leagueId":rosters["leagueId"],"userTeamId":"7",
        "generatedAt":datetime.now(timezone.utc).isoformat(),
        "rosterSnapshotAt":rosters.get("userTeamLastRefreshedAt") or rosters.get("retrievedAt"),
        "availableSnapshotAt":available.get("retrievedAt"),
        "futureModelGeneratedAt":future.get("generatedAt"),
        "rosterConstraints":{"skillSlots":list(SLOTS),
                             "dropCandidates":"bench QB/RB/WR/TE with no active long-term reserve/exempt designation, one per acquisition",
                             "excluded":"K and DEF held fixed; current IR/exempt/suspended statuses excluded from baseline until cleared",
                             "fullLegalLineup":True},
        "horizons":{
            name:{"weeks":period,"baselineLineupPoints":round(sum(baseline[w] for w in period),2),
                  "recommendations":rows[:40]}
            for name,period in horizons.items()
            for rows in [results[name]]
        },
        "coverage":{"modeledAvailableCandidates":len(free),"dropChoices":len(drops),
                    "modeledActiveSkillRoster":len(existing)},
        "notice":("Lineup impact is cumulative fantasy points over the selected weeks, "
                  "optimizing QB/RB/RB/WR/WR/TE/flex separately each week. "
                  "It assumes all players with scheduled games are available in future weeks, "
                  "including short-term injured rostered players, but long-term reserve/exempt designations are held out until cleared; scores are SCENARIOS "
                  "not reliable injury-adjusted expectations. It does not estimate waivers, real "
                  "injury return dates, usage changes, K/DEF or trade fairness. "
                  "Free agent pool sampled from the top 100 at each position."),
    }
    (BASE/"data/waivers.json").write_text(json.dumps(output,indent=2)+"\n")
    print("WAIVER COVERAGE",output["coverage"])

if __name__=="__main__":
    main()
