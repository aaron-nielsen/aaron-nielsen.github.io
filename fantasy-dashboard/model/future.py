"""Generate Week 5–17 matchup-aware conditional forecasts and scoring components.

As-of the roster Week 5 snapshot. Beyond current week, each forecast is
*conditional on participating* — injuries are not assigned probabilities.
No fictional injury odds, snap volume trends, or future stats leakage.
"""
from datetime import datetime, timezone
import json
from pathlib import Path
from build import BASE, STATS_URL, SCHEDULE_URL, csv_rows, normalize_weekly_stats
from project import score
from weekly import parse_games, matchup_factors, availability_status, NFL_TEAMS
from identity import normalized_team

SEASON = 2026
FIELDS = (
    ("passYards","4","Passing yards"),
    ("passTD","5","Passing TD"),
    ("interceptions","6","Interceptions"),
    ("sacksSuffered","7","Sacks taken"),
    ("rushYards","9","Rushing yards"),
    ("rushTD","10","Rushing TD"),
    ("receptions","11","Receptions"),
    ("receivingYards","12","Receiving yards"),
    ("receivingTD","13","Receiving TD"),
)
def components(stats,factor,rules):
    details=[]
    for field,code,label in FIELDS:
        original=float(stats.get(field) or 0)
        amount=round(original*factor,3)
        per=float(rules.get(code,0))
        points=round(amount*per,3)
        details.append({"stat":field,"label":label,"projected":amount,
                        "rate":per,"points":points})
    return details

def build_future(projections,weekly,schedule,season_history,scoring,current_week,end_week):
    if current_week != weekly["week"]:
        raise ValueError("Week mismatch between Yahoo roster snapshot and model file")
    live = {str(p["yahooId"]):p for p in weekly["players"]}
    factors=matchup_factors(season_history,schedule,SEASON,current_week,scoring)
    projected=[]
    schedules={}
    for week in range(current_week,end_week+1):
        _,teams=parse_games(schedule,SEASON,week)
        schedules[week]=teams
    for p in projections["players"]:
        yahoo=str(p["yahooId"])
        cur=live.get(yahoo)
        if cur is None:
            continue
        player={"yahooId":yahoo,"name":p["name"],"position":p["position"],
                "fantasyTeamId":p.get("fantasyTeamId"),"fantasyTeam":p.get("fantasyTeam"),
                "nflTeam":p.get("nflTeam"),"ownership":p.get("ownership"),
                "rosterSlot":p.get("rosterSlot"),"injuryStatus":p.get("injuryStatus"),
                "sampleGames2026":p.get("sampleGames2026"),
                "baselineStats":p.get("stats"),"weeks":[]}
        team=normalized_team(p.get("nflTeam"))
        for week in range(current_week,end_week+1):
            game=schedules[week].get(team)
            if not game:
                state="bye" if team in NFL_TEAMS else "unknown_schedule"
                row={"week":week,"opponent":None,"home":None,"date":None,
                     "factor":None,"activePoints":0 if state=="bye" else None,
                     "points":0 if state=="bye" else None,"state":state}
            else:
                if week==current_week:
                    factor=float(cur.get("matchupFactor") or 1.)
                    state=cur.get("forecastStatus") or "unknown"
                else:
                    factor=float(factors.get((game["opponent"],p["position"]),1.))
                    state="assumed_active_future"
                stat_lines=components(p["stats"],factor,scoring)
                total=round(sum(v["points"] for v in stat_lines),2)
                if state in ("unavailable_reported","bye"):
                    points=0.
                elif state in ("needs_availability_confirmation","schedule_unavailable"):
                    points=None
                else:
                    points=total
                row={"week":week,"opponent":game["opponent"],
                     "home":game["home"],"date":game.get("gameDate"),"factor":round(factor,3),
                     "activePoints":total,"points":points,"state":state}
            player["weeks"].append(row)
        projected.append(player)
    return {
        "modelVersion":"future-scenario-v0.1",
        "season":SEASON,"startWeek":current_week,"endWeek":end_week,
        "generatedAt":datetime.now(timezone.utc).isoformat(),
        "rosterSnapshotAt":weekly.get("rosterSnapshotAt"),
        "statsThroughWeek":projections.get("statsThroughWeek"),
        "scoringCategories":[{"key":key,"yahooStatId":code,"label":label,
                              "pointsPerUnit":float(scoring.get(code,0))}
                             for key,code,label in FIELDS],
        "forecastNotice":"Weeks after current week are conditional healthy/active scenarios, NOT availability-adjusted expectations. Injuries, transactions, playing time and team assignments may change. Defensive factors based on completed weeks and capped at 10%. K/DEF are not modeled.",
        "players":projected,
        "coverage":{"projected":len(projected),"weeks":end_week-current_week+1,
                    "currentWeekUncertain":sum(p["weeks"][0]["points"] is None for p in projected),
                    "futureActiveScenarios":True}
    }

def main():
    league=json.loads((BASE/"data/league.json").read_text())
    prior=json.loads((BASE/"data/projections.json").read_text())
    weekly=json.loads((BASE/"data/weekly.json").read_text())
    current=int(league["currentWeekAtSnapshot"])
    schedule=csv_rows(SCHEDULE_URL)
    history=normalize_weekly_stats(csv_rows(STATS_URL.format(season=SEASON)))
    history=[r for r in history if r.get("season_type")=="REG" and int(r.get("week") or 0)<current]
    result=build_future(prior,weekly,schedule,history,
                        league["scoringByYahooStatId"],current,
                        int(league["endWeek"]))
    if len(result["players"])<400:
        raise ValueError("Future projection coverage too low")
    output=BASE/"data/future.json"
    output.write_text(json.dumps(result,separators=(",",":"))+"\n")
    print("FUTURE FORECAST",json.dumps(result["coverage"]))
if __name__=="__main__":
    main()
