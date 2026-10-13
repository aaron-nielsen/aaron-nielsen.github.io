/* Da Vinci Fantasy Lab — preliminary opponent-adjusted K and D/ST model.
 * Training: 2024/2025 regular season and completed 2026 game contexts only.
 * Uses team scoring and red-zone possessions, venue roof, opponent performance,
 * plus QB turnovers/sacks from the existing offensive forecast. It does NOT
 * pretend that team PBP includes historical kicker-distance or DST sack logs.
 */
(function(root){
'use strict';
const NFL = new Set("ARI ATL BAL BUF CAR CHI CIN CLE DAL DEN DET GB HOU IND JAX KC LAC LA LV MIA MIN NE NO NYG NYJ PHI PIT SEA SF TB TEN WAS".split(" "));
const ALIASES={LAR:"LA",JAX:"JAX",JAC:"JAX",WSH:"WAS"};
const asTeam=t=>ALIASES[String(t||"").toUpperCase()]||String(t||"").toUpperCase();
const avg=(a,b)=>(a+b)/2;
const lim=(x,a,b)=>Math.min(b,Math.max(a,x));
const round=n=>Math.round(n*100)/100;
const val=(x,d=0)=>Number.isFinite(Number(x))&&x!==null&&x!==""?Number(x):d;
const erf=x=>{const sign=x<0?-1:1;const z=Math.abs(x),t=1/(1+.3275911*z);return sign*(1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-z*z));};
const cdf=(x,mean,sd)=>.5*(1+erf((x-mean)/(sd*Math.SQRT2)));
const expectedAllowed=(mean,sd,rules)=>{
 const boundaries=[.5,6.5,13.5,20.5,27.5,34.5];
 const probabilities=[];let previous=0;
 for(const b of boundaries){const v=cdf(b,mean,sd);probabilities.push(v-previous);previous=v;}
 probabilities.push(1-previous);
 return probabilities.reduce((sum,p,i)=>sum+p*val(rules[String(50+i)]),0);
};
function train(context){
 const obs={};const globals={offPts:22.5,defPts:22.5,rzFg:1.2,rzTd:2.1,rzTrips:3.3,rzAllowed:3.3,tdAllowed:2.1,epaOff:0,epaDef:0};
 const columns={offPts:4,defPts:5,rzTrips:6,rzTd:7,rzFg:8,rzAllowed:9,tdAllowed:10,epaOff:11,epaDef:12};
 for(const [team] of new Set(context.games.map(g=>g[2])).entries())obs[team]={};
 for(const game of context.games){
  const [season,wk,rawTeam]=game,team=asTeam(rawTeam),o=obs[team]||(obs[team]={});
  const weight=season===2026?1.5:season===2025?.85:.35;
  for(const [key,index] of Object.entries(columns)){
   const x=game[index];if(x===null||!Number.isFinite(Number(x)))continue;
   const r=o[key]||(o[key]={total:0,weight:0});
   r.total+=Number(x)*weight;r.weight+=weight;
  }
 }
 const get=(team,key)=>{const s=obs[asTeam(team)]?.[key];const prior=globals[key];return s?(s.total+prior*4)/(s.weight+4):prior;};
 return {get};
}
function kicker(team,opp,game,scoring,model){
 const rules=scoring,off=model.get(team,"rzFg"),denial=Math.max(.2,model.get(opp,"rzAllowed")-model.get(opp,"tdAllowed"));
 const rzFG=lim(.6*off+.4*denial,.4,2.7);
 const kickAttempts=lim(rzFG+.65,.8,3.6);
 const pats=lim(avg(model.get(team,"rzTd"),model.get(opp,"tdAllowed"))*.965,.5,4.3);
 // Historical long-range attempts are unavailable; these are intentionally
 // league-level bucket priors rather than player-specific kicking accuracy.
 const shares=[.04,.12,.22,.37,.25],conversion=[.98,.97,.94,.84,.69],mid=[17,25,35,45,54],fgIds=[19,20,21,22,23],missIds=[24,25,26,27,28];
 const outdoor=!/closed|dome|retractable.*closed/i.test(String(game.roof||"outdoors"));
 const wind=game.wind;
 const windPenalty=outdoor&&wind!==null&&wind!==undefined&&Number(wind)>=15?lim((Number(wind)-12)*.006,0,.09):0;
 const items=[];let pts=0,fgm=0,misses=0;
 for(let i=0;i<5;i++){
  const attempts=kickAttempts*shares[i],made=attempts*lim(conversion[i]-windPenalty,0,1),miss=attempts-made;
  const makeRate=val(rules[String(fgIds[i])])+val(rules["84"])*mid[i];
  const penalty=val(rules[String(missIds[i])]);
  const gained=made*makeRate+miss*penalty;pts+=gained;fgm+=made;misses+=miss;
  items.push({label:"FG "+["0–19","20–29","30–39","40–49","50+"][i]+" yd",stat:round(made),attempts:round(attempts),points:round(gained)});
 }
 const xp=val(rules["29"])*pats;pts+=xp;items.push({label:"PAT made",stat:round(pats),points:round(xp)});
 const xpMiss=(pats/.965)*.035;const missXP=val(rules["30"])*xpMiss;pts+=missXP;
 if(missXP)items.push({label:"PAT missed",stat:round(xpMiss),points:round(missXP)});
 return {points:round(pts),components:items,stats:{fgAttempts:round(kickAttempts),fgMade:round(fgm),fgMisses:round(misses),patMade:round(pats)},method:"Team RZ FG/PAT opportunity + opponent drives; league distance/make-rate priors",conditions:{roof:game.roof||"unknown",windMph:wind,weatherApplied:windPenalty>0}};
}
function defense(team,opp,game,scoring,model,opponentQB){
 const oppOff=model.get(opp,"offPts"),ownDef=model.get(team,"defPts"),home=asTeam(game.home)===asTeam(team);
 const expectedPts=lim(avg(oppOff,ownDef)+(home?-1:1),8,42);
 const oppEPA=model.get(opp,"epaOff"),ownEPA=model.get(team,"epaDef");
 const strength=lim(1+(oppEPA-ownEPA)*.32,.77,1.28);
 const sacks=lim(2.3*strength*Math.sqrt(lim(val(opponentQB?.sacksSuffered,2.3)/2.3,.5,2)),.7,4.8);
 const picks=lim(val(opponentQB?.interceptions,.84)*strength,.3,1.8);
 const fumbles=lim(.52*strength,.25,.9),td=.12*strength,safeties=.055,blocks=.14,returnTD=.035,xpRet=.01;
 const tiers=expectedAllowed(expectedPts,10.3,scoring);
 const components=[
  {label:"Sacks",stat:round(sacks),points:round(sacks*val(scoring["32"]))},
  {label:"Interceptions",stat:round(picks),points:round(picks*val(scoring["33"]))},
  {label:"Fumble recoveries",stat:round(fumbles),points:round(fumbles*val(scoring["34"]))},
  {label:"Defensive TD",stat:round(td),points:round(td*val(scoring["35"]))},
  {label:"Safeties",stat:round(safeties),points:round(safeties*val(scoring["36"]))},
  {label:"Blocked kicks",stat:round(blocks),points:round(blocks*val(scoring["37"]))},
  {label:"Return TD",stat:round(returnTD),points:round(returnTD*val(scoring["49"]))},
  {label:"Extra-point return",stat:round(xpRet),points:round(xpRet*val(scoring["82"]))},
  {label:"Points-allowed tiers",stat:round(expectedPts),points:round(tiers)}
 ];
 const total=sacks*val(scoring["32"])+picks*val(scoring["33"])+fumbles*val(scoring["34"])+td*val(scoring["35"])+safeties*val(scoring["36"])+blocks*val(scoring["37"])+returnTD*val(scoring["49"])+xpRet*val(scoring["82"])+tiers;
 return {points:round(total),components,stats:{pointsAllowed:round(expectedPts),sacks:round(sacks),interceptions:round(picks),fumbleRecoveries:round(fumbles),defensiveTD:round(td)},method:"Shrunk team points allowed + opponent offense + QB sacks/INT; rare-event priors",conditions:{roof:game.roof||"unknown",windMph:game.wind,weatherApplied:false}};
}
function enrich({context,league,rosters,available,futureData,weekly}){
 if(context.version!==1)throw Error("Special-teams context unavailable");
 const targetWeek=Number(league.currentWeekAtSnapshot)||Number(weekly?.week)||futureData.startWeek;
 const trainingContext={...context,games:context.games.filter(g=>g[0]!==2026||Number(g[1])<targetWeek)};
 const expectedLeague=String(league.leagueId);
 if(expectedLeague!==String(rosters.leagueId)||!league.scoringByYahooStatId)throw Error("Special-teams league scoring mismatch");
 const rules=league.scoringByYahooStatId,model=train(trainingContext),scores=new Map();
 const qbs=new Map();
 for(const p of futureData.players.filter(p=>p.position==="QB")){
  const injury=String(p.injuryStatus||"").toUpperCase();
  if(["O","OUT","IR","IR-R","SUSP","SUS","CEL","PUP","PUP-R","NFI","NFI-R"].includes(injury)||p.rosterSlot==="IR")continue;
  const k=asTeam(p.nflTeam),previous=qbs.get(k);
  if(!previous||val(p.baselineStats?.passAttempts)>val(previous.baselineStats?.passAttempts))qbs.set(k,p);
 }
 const schedule=new Map();
 for(const g of context.schedule){for(const [team,opp,home] of [[g.home,g.away,true],[g.away,g.home,false]]){
  schedule.set(g.week+"|"+asTeam(team),{week:g.week,team:asTeam(team),opp:asTeam(opp),home,roof:g.roof,wind:g.wind??null,temp:g.temp??null});
 }}
 const current=Number(league.currentWeekAtSnapshot)||futureData.startWeek,through=Number(futureData.endWeek)||17;
 const everyone=[...rosters.teams.flatMap(t=>t.players.map(p=>({...p,ownership:"rostered",fantasyTeam:t.name,fantasyTeamId:t.id}))),...available.players.map(p=>({...p,ownership:"available",fantasyTeam:"Available",fantasyTeamId:null}))];
 const seen=new Set(),newPlayers=[],newWeekly=[];
 for(const p of everyone){
  if(!["K","DEF"].includes(p.position)||seen.has(String(p.id)))continue;seen.add(String(p.id));
  const club=asTeam(p.nflTeam);if(!NFL.has(club))continue;
  const weeks=[];
  for(let w=current;w<=through;w++){
   const match=schedule.get(w+"|"+club);
   if(!match){weeks.push({week:w,opponent:null,home:null,state:"bye",points:0,activePoints:0,components:[]});continue;}
   const qbsOpp=qbs.get(match.opp);
   const value=p.position==="K"?kicker(club,match.opp,match,rules,model):
      defense(club,match.opp,match,rules,model,qbsOpp?.baselineStats);
   weeks.push({week:w,opponent:match.opp,home:match.home,state:w===current?"assuming_active":"assumed_active_future",date:null,factor:1,points:value.points,activePoints:value.points,components:value.components,stats:value.stats,conditions:value.conditions});
  }
  const result={yahooId:String(p.id),name:p.name,position:p.position,fantasyTeamId:p.fantasyTeamId,fantasyTeam:p.fantasyTeam,nflTeam:p.nflTeam,ownership:p.ownership,rosterSlot:p.slot||null,injuryStatus:p.status||null,baselineStats:{},method:p.position==="K"?"special-k-v0.1":"special-def-v0.1",weeks};
  newPlayers.push(result);
  const v=weeks.find(w=>w.week===current);
  newWeekly.push({...result,activeGamePoints:v?.activePoints??null,weeklyProjectedPoints:v?.points??null,forecastStatus:v?.state==="bye"?"bye":"assuming_active",opponent:v?.opponent??null,location:v?.home===true?"home":v?.home===false?"away":null});
 }
 futureData.players.push(...newPlayers);
 if(weekly?.players)weekly.players.push(...newWeekly);
 futureData.coverage={...futureData.coverage,modeledSpecialTeams:newPlayers.length};
 return {count:newPlayers.length,def:newPlayers.filter(p=>p.position==="DEF").length,k:newPlayers.filter(p=>p.position==="K").length,trainingGames:trainingContext.games.length};
}
root.DaVinciSpecialTeams={enrich};
})(typeof window!=="undefined"?window:globalThis);
