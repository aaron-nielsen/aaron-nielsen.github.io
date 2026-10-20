#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {scoreStats}=require('./update-player-stats.cjs');
const positions=['QB','RB','WR','TE'];
const norm=t=>({LAR:'LA',JAC:'JAX',WSH:'WAS'}[String(t).toUpperCase()]||String(t).toUpperCase());
const fields={passYards:'passing_yards',passTD:'passing_tds',interceptions:'passing_interceptions',sacksSuffered:'sacks_suffered',rushYards:'rushing_yards',rushTD:'rushing_tds',receptions:'receptions',receivingYards:'receiving_yards',receivingTD:'receiving_tds'};
const clamp=x=>Math.max(.9,Math.min(1.1,x)),round=n=>Math.round(n*10000)/10000;
function ratings(players,teams,rules,through){
 const completed=teams.filter(r=>r.season_type==='REG'&&Number(r.week)<=through);
 const games=new Map(completed.map(r=>[r.game_id+'/'+norm(r.team),{week:Number(r.week),team:norm(r.team),opponent:norm(r.opponent_team),points:Object.fromEntries(positions.map(p=>[p,0]))}]));
 for(const r of players){
  if(r.season_type!=='REG'||Number(r.week)>through)continue;
  const game=games.get(r.game_id+'/'+norm(r.team));if(!game)throw Error('Player stats outside completed team coverage');
  const position=r.position==='FB'?'RB':r.position;if(!positions.includes(position))continue;
  const stats=Object.fromEntries(Object.entries(fields).map(([k,f])=>[k,Number(r[f]||0)]));
  game.points[position]+=scoreStats(stats,rules);
 }
 // Verify the bulk player feed covers each completed offense, rather than treating missing records as zero.
 for(const t of completed)for(const field of ['attempts','carries','receiving_yards']){
  const total=players.filter(p=>p.game_id===t.game_id&&norm(p.team)===norm(t.team)).reduce((n,p)=>n+Number(p[field]||0),0);
  if(Math.abs(total-Number(t[field]||0))>.1)throw Error('Incomplete player/team stats: '+t.game_id+' '+t.team+' '+field);
 }
 const list=[...games.values()],clubs=[...new Set(list.map(g=>g.team))].sort(),means=Object.fromEntries(positions.map(p=>[p,list.reduce((s,g)=>s+g.points[p],0)/list.length]));
 const output=clubs.map(team=>({team,positions:{}}));
 for(const pos of positions){
  const mean=means[pos],effects=[];
  for(const d of output){
   const faced=list.filter(g=>g.opponent===d.team);let residual=0;
   for(const game of faced){
    // Leave this game out of the opposing offense's baseline; shrink its other games to the league mean.
    const other=list.filter(g=>g.team===game.team&&g.week!==game.week);
    const expected=(other.reduce((s,g)=>s+g.points[pos],0)+3*mean)/(other.length+3);
    residual+=(game.points[pos]-expected)/Math.max(1,mean);
   }
   const factor=clamp(1+residual/(faced.length+6));
   d.positions[pos]={games:faced.length,allowedPerGame:round(faced.reduce((s,g)=>s+g.points[pos],0)/faced.length),leagueAverage:round(mean),factor};effects.push(d.positions[pos]);
  }
  // A matchup adjustment redistributes strength; it must not lift the whole league's scoring baseline.
  for(let i=0;i<40;i++){const offset=effects.reduce((s,e)=>s+e.factor,0)/effects.length-1;for(const e of effects)e.factor=clamp(e.factor-offset);}
  for(const e of effects)e.factor=round(e.factor);
 }
 return output;
}
function refresh(base,input,at=new Date().toISOString()){
 const read=n=>JSON.parse(fs.readFileSync(path.join(base,n+'.json'),'utf8')),write=(n,d)=>fs.writeFileSync(path.join(base,n+'.json'),JSON.stringify(d,null,2)+'\n');
 const league=read('league'),weekly=read('weekly'),future=read('future'),through=Number(weekly.week)-1;
 const teams=input.teams.filter(r=>Number(r.season)===2026&&Number(r.week)<=through&&r.season_type==='REG');
 const scores=new Map(input.games.map(g=>[g.game_id,g]));
 const required=input.games.filter(g=>Number(g.season)===2026&&g.game_type==='REG'&&Number(g.week)<=through&&g.home_score!==''&&g.away_score!=='');
 if(!required.length||teams.length!==required.length*2||new Set(teams.map(t=>t.game_id+'/'+norm(t.team))).size!==teams.length)throw Error('Incomplete completed-week team data');
 for(const g of required)for(const club of [g.home_team,g.away_team])if(!teams.some(t=>t.game_id===g.game_id&&norm(t.team)===norm(club)))throw Error('Missing scheduled team-game');
 const rows=ratings(input.players,teams,league.scoringByYahooStatId,through),byTeam=new Map(rows.map(r=>[r.team,r]));
 const report={schemaVersion:1,generatedAt:at,season:2026,leagueId:league.leagueId,throughWeek:through,method:'Position-specific fantasy points allowed, adjusted for opposing offenses using other games; six-game neutral prior, league-centered factors capped at +/-10%. Descriptive matchup estimates, not validated injury probabilities.',sources:['https://github.com/nflverse/nflverse-data/releases/tag/stats_player','https://github.com/nflverse/nflverse-data/releases/tag/stats_team'],teams:rows};
 let changed=0;
 for(const p of future.players){
  if(!positions.includes(p.position))continue;
  for(const w of p.weeks){
   if(Number(w.week)<=through||w.state==='bye')continue;
   const rating=byTeam.get(norm(w.opponent))?.positions[p.position];if(!rating)throw Error('Missing defense rating for '+p.name+' W'+w.week);
   const prior=w.factor;w.factor=rating.factor;w.defenseThroughWeek=through;
   w.activePoints=Math.round(scoreStats(p.baselineStats,league.scoringByYahooStatId)*w.factor*100)/100;
   w.points=w.state==='unavailable_reported'?0:w.state==='needs_availability_confirmation'?null:w.activePoints;
   if(prior!==w.factor)changed++;
  }
  const w=p.weeks.find(w=>Number(w.week)===Number(weekly.week)),now=weekly.players.find(w=>String(w.yahooId)===String(p.yahooId));
  if(w&&now){now.matchupFactor=w.factor;now.activeGamePoints=w.activePoints;now.weeklyProjectedPoints=w.points;}
 }
 future.generatedAt=at;future.defenseThroughWeek=through;future.defenseMethod=report.method;
 future.forecastNotice='Future offense estimates assume participation, except explicit return scenarios. Defense factors use completed games through Week '+through+' and are capped at +/-10%. Yahoo forecasts remain a separate dated source.';
 future.updateNotice='Offensive baselines and defensive matchup ratings refreshed through Week '+through+'. Snap history retains its original date; K/DEF team context has separately reported feature cutoffs.';
 weekly.generatedAt=at;weekly.defenseThroughWeek=through;
 // League-specific defense ratings can be refreshed independently of shared
 // red-zone context, whose collection date must remain unchanged.
 if(!input.context){
  write('defense-ratings',report);write('future',future);write('weekly',weekly);
  return {throughWeek:through,teams:rows.length,changedFrames:changed,redZoneThroughWeek:null};
 }
 const context=read('special-teams-context');
 const pbp=new Map(Object.entries(input.context.teams).flatMap(([team,t])=>t.games.filter(g=>g.seasonType==='REG').map(g=>[g.gameId+'/'+norm(team),g])));
 const counts=new Map();for(const g of pbp.values())counts.set(g.week,(counts.get(g.week)||0)+1);
 const completeRz=[...counts].filter(([w,n])=>n===teams.filter(t=>Number(t.week)===w).length).map(([w])=>w);
 const rzThrough=Math.max(0,...completeRz);
 const fresh=teams.map(t=>{
  const g=scores.get(t.game_id),home=norm(g.home_team)===norm(t.team),off=Number(home?g.home_score:g.away_score),against=Number(home?g.away_score:g.home_score);
  const p=completeRz.includes(Number(t.week))?pbp.get(t.game_id+'/'+norm(t.team)):null,opp=teams.find(o=>o.game_id===t.game_id&&norm(o.team)===norm(t.opponent_team));
  const plays=r=>Number(r.attempts)+Number(r.sacks_suffered)+Number(r.carries),epa=r=>(Number(r.passing_epa)+Number(r.rushing_epa))/plays(r);
  return [2026,Number(t.week),norm(t.team),norm(t.opponent_team),off,against,p?.off.rzTrips??null,p?.off.rzTdTrips??null,p?.off.rzFgTrips??null,p?.def.rzTripsAllowed??null,p?.def.rzTdTripsAllowed??null,round(epa(t)),round(epa(opp)),plays(t)];
 });
 context.games=context.games.filter(g=>g[0]!==2026).concat(fresh);context.generatedAt=at;context.dataThroughWeek=through;
 context.featureCoverage={pointsAndEpaThroughWeek:through,redZoneThroughWeek:rzThrough};
 context.source='nflverse completed team/player stats and schedule; red-zone drives from antonwilms/sleeper-dashboard-data';
 context.note='Complete points/EPA through Week '+through+'; complete red-zone drive context through Week '+rzThrough+'. Missing red-zone features are null, not zero.';
 write('defense-ratings',report);write('future',future);write('weekly',weekly);write('special-teams-context',context);
 return {throughWeek:through,teams:rows.length,changedFrames:changed,redZoneThroughWeek:rzThrough};
}
module.exports={ratings,refresh};
if(require.main===module){const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));console.log(refresh(path.resolve(__dirname,'../data'),{players:read(process.argv[2]),teams:read(process.argv[3]),games:read(process.argv[4]),context:read(process.argv[5])}));}
