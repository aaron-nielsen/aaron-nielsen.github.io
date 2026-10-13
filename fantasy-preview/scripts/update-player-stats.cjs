#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const fields={passAttempts:'attempts',passYards:'passing_yards',passTD:'passing_tds',interceptions:'passing_interceptions',sacksSuffered:'sacks_suffered',carries:'carries',rushYards:'rushing_yards',rushTD:'rushing_tds',targets:'targets',receptions:'receptions',receivingYards:'receiving_yards',receivingTD:'receiving_tds'};
const rates={passYards:'4',passTD:'5',interceptions:'6',sacksSuffered:'7',rushYards:'9',rushTD:'10',receptions:'11',receivingYards:'12',receivingTD:'13'};
const round=n=>Math.round(n*100)/100;
function scoreStats(s,rules){return round(Object.entries(rates).reduce((n,[k,id])=>n+Number(s[k]||0)*Number(rules[id]||0),0));}
function blend(prior,rows,weight){return Object.fromEntries(Object.keys(fields).map(k=>[k,round((Number(prior[k]||0)*weight+rows.reduce((n,r)=>n+Number(r[fields[k]]||0),0))/(weight+rows.length))]));}
function update(base,rows,historical,at=new Date().toISOString()){
 const read=n=>JSON.parse(fs.readFileSync(path.join(base,n+'.json'),'utf8'));
 const write=(n,d)=>fs.writeFileSync(path.join(base,n+'.json'),JSON.stringify(d,null,2)+'\n');
 const league=read('league'),week=read('week'),model=read('projections'),future=read('future'),weekly=read('weekly');
 const through=Number(week.week)-1;
 const current=rows.filter(r=>Number(r.season)===2026&&r.season_type==='REG'&&Number(r.week)<=through);
 if(!current.some(r=>Number(r.week)===through))throw Error('Completed-week stats unavailable');
 const byGsis=new Map();for(const r of current){const list=byGsis.get(r.player_id)||[];list.push(r);byGsis.set(r.player_id,list);}
 const rules=league.scoringByYahooStatId,cutoff=Number(future.statsThroughWeek),source='https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_2026.csv';
 const archive='historical/model-through-week'+cutoff;
 if(cutoff<through&&!fs.existsSync(path.join(base,archive+'.json')))write(archive,{future,weekly,model});
 const byId=new Map(model.players.map(p=>[String(p.yahooId),p]));let updated=0;
 if(cutoff<through){
  for(const p of future.players){
   const baseline=byId.get(String(p.yahooId));if(!baseline?.gsisId)continue;
   const fresh=(byGsis.get(baseline.gsisId)||[]).filter(r=>Number(r.week)>cutoff);
   if(!fresh.length)continue;
   const weight=Math.max(4,Number(p.sampleGames2026||0)+4);
   const stats=blend(p.baselineStats||baseline.stats,fresh,weight),active=scoreStats(stats,rules);
   p.baselineStats=stats;p.sampleGames2026=Number(p.sampleGames2026||0)+fresh.length;
   p.updateMethod={method:'Saved empirical-Bayes baseline plus new completed games',priorWeight:weight,newGames:fresh.length,throughWeek:through};
   baseline.stats=stats;baseline.sampleGames2026=p.sampleGames2026;baseline.sampleGamesCurrentSeason=p.sampleGames2026;baseline.conditionalPointsPerGame=active;
   for(const frame of p.weeks){
    if(Number(frame.week)<=through||frame.state==='bye')continue;
    frame.activePoints=round(active*Number(frame.factor??1));
    frame.points=['unavailable_reported'].includes(frame.state)?0:frame.state==='needs_availability_confirmation'?null:frame.activePoints;
    delete frame.projectedStats;delete frame.playingTime;
   }
   const report=weekly.players.find(r=>String(r.yahooId)===String(p.yahooId)),frame=p.weeks.find(w=>Number(w.week)===Number(weekly.week));
   if(report&&frame){report.stats=stats;report.activeGamePoints=frame.activePoints;report.weeklyProjectedPoints=frame.points;report.conditionalPointsPerGame=active;report.sampleGames2026=p.sampleGames2026;}
   updated++;
  }
  future.generatedAt=at;future.statsThroughWeek=through;future.modelVersion='opportunity-eb-v0.3-incremental-v0.1';future.updateSource=source;
  future.updateNotice='New completed games blended with the saved baseline using four prior games plus the previous current-season sample. Existing opponent factors, snap models, and K/DEF team context retain their original dates.';
  weekly.generatedAt=at;weekly.statsThroughWeek=through;weekly.note=future.updateNotice;model.generatedAt=at;model.statsThroughWeek=through;model.modelVersion=future.modelVersion;
  write('future',future);write('weekly',weekly);write('projections',model);
 }
 const identities=new Map(read('rosters').teams.flatMap(t=>t.players.map(p=>[String(p.id),p])));
 for(const p of read('available').players)if(!identities.has(String(p.id)))identities.set(String(p.id),p);
 for(const p of future.players)if(!identities.has(String(p.yahooId)))identities.set(String(p.yahooId),{id:p.yahooId,name:p.name,position:p.position,nflTeam:p.nflTeam});
 const actuals=new Map();
 for(const h of historical)for(const t of h.teams)for(const p of t.players){if(typeof p.actual==='number')actuals.set(String(p.playerId)+'/'+h.week,{points:p.actual,source:'Yahoo historical roster',week:h.week});}
 const players=[];
 for(const [id,p] of identities){
  const m=byId.get(id);let games=byGsis.get(m?.gsisId)||[];
  if(!games.length){const names=current.filter(r=>r.position===p.position&&r.player_display_name===p.name);const ids=new Set(names.map(r=>r.player_id));if(ids.size===1)games=names;}
  const results=Array.from({length:through},(_,i)=>{
   const w=i+1,r=games.find(r=>Number(r.week)===w),known=actuals.get(id+'/'+w),stats=r?Object.fromEntries(Object.entries(fields).map(([k,f])=>[k,Number(r[f]||0)])):null;
   let points=known?.points??null,origin=known?.source||null;
   if(points===null&&r){
    const n=k=>Number(r[k]||0),rate=id=>Number(rules[id]||0);
    points=scoreStats(stats,rules)+n('special_teams_tds')*rate('15')+(n('passing_2pt_conversions')+n('rushing_2pt_conversions')+n('receiving_2pt_conversions'))*rate('16')+n('fumbles_lost_total')*rate('18')+n('fumble_recovery_tds')*rate('57');
    if(p.position==='K'){
     for(const [bucket,make,miss] of [['0_19','19','24'],['20_29','20','25'],['30_39','21','26'],['40_49','22','27'],['50_59','23','28'],['60_','23','28']])points+=n('fg_made_'+bucket)*rate(make)+n('fg_missed_'+bucket)*rate(miss);
     points+=n('fg_made_distance')*rate('84')+n('pat_made')*rate('29')+n('pat_missed')*rate('30');
    }
    points=round(points);origin='nflverse stats · league scoring';
   }
   return {week:w,points,source:origin,opponent:r?.opponent_team||null,stats};
  });
  players.push({id,name:p.name,position:p.position,nflTeam:p.nflTeam,results});
 }
 write('player-results',{schemaVersion:1,leagueId:league.leagueId,season:2026,throughWeek:through,collectedAt:at,source,players});
 return {updated,throughWeek:through,players:players.length,knownResults:players.reduce((n,p)=>n+p.results.filter(r=>r.points!==null).length,0)};
}
module.exports={blend,scoreStats,update};
if(require.main===module){
 const rows=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),base=path.resolve(__dirname,'../data');
 const historical=[1,2,3,4,5].map(w=>JSON.parse(fs.readFileSync(path.join(base,'historical/csu-week-'+w+'.json'),'utf8')));
 console.log(update(base,rows,historical));
}
