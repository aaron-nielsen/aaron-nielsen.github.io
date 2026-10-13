#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),base=path.resolve(__dirname,'../data');
global.document={getElementById:()=>null};
for(const name of ['availability-sanity','return-outlook','playing-time-model','special-teams-model'])require('../'+name+'.js');
const read=n=>JSON.parse(fs.readFileSync(path.join(base,n+'.json'),'utf8'));
const rosters=read('rosters'),available=read('available'),futureData=read('future'),weekly=read('weekly'),yahoo=read('yahoo-projections');
DaVinciEligibility.reconcile({rosters,available,futureData,weekly});DaVinciReturns.apply({futureData,weekly});
DaVinciPlayingTime.apply({futureData,weekly,history:read('usage-history')});
DaVinciSpecialTeams.enrich({rosters,available,futureData,weekly,league:read('league'),context:read('special-teams-context')});
DaVinciEligibility.reconcile({rosters,available,futureData,weekly});
const status=new Map(rosters.teams.flatMap(t=>t.players.map(p=>[String(p.id),p.status])));
const own=new Set(rosters.teams.find(t=>t.id==='7').players.map(p=>String(p.id)));
function compare(future){
 const forecast=new Map(future.players.map(p=>[String(p.yahooId),p])),rows=[];
 for(const p of yahoo.players)for(const w of p.weeks){
  const frame=forecast.get(String(p.yahooId))?.weeks.find(f=>f.week===w.week);
  if(!frame||!(w.points>0))continue;
  const conditional=frame.points==null&&frame.state==='needs_availability_confirmation';
  const dv=conditional?frame.activePoints:frame.points;if(!Number.isFinite(dv))continue;
  rows.push({id:String(p.yahooId),name:p.name,position:p.position,status:status.get(String(p.yahooId))||null,week:w.week,dv,yahoo:w.points,gap:dv-w.points,conditional});
 }
 return rows;
}
function summary(rows){
 if(!rows.length)return null;
 const ratios=rows.map(r=>r.dv/r.yahoo).sort((a,b)=>a-b),n=rows.length,round=x=>Math.round(x*1000)/1000;
 return {n,higher:round(rows.filter(r=>r.gap>0).length/n*100),meanGap:round(rows.reduce((s,r)=>s+r.gap,0)/n),medianRatio:round(n%2?ratios[(n-1)/2]:(ratios[n/2-1]+ratios[n/2])/2)};
}
const rows=compare(futureData),prior=process.argv[2]?compare(JSON.parse(fs.readFileSync(process.argv[2],'utf8'))):[];
const afterIds=new Set(rows.map(r=>r.id+'/'+r.week)),priorIds=new Set(prior.map(r=>r.id+'/'+r.week));
const output={generatedAt:new Date().toISOString(),leagueId:rosters.leagueId,period:[6,17],yahooCollectedAt:yahoo.collectedAt,yahooUpdatedAt:yahoo.updatedAt,
 scope:'Same player and week, positive Yahoo forecast, enriched Da Vinci estimates as displayed. Current-week questionable fallback is if-active. Missing and Yahoo-zero rows excluded. Differences from Yahoo are not prediction accuracy or estimates of Yahoo injury probability.',
 before:summary(prior.filter(r=>afterIds.has(r.id+'/'+r.week))),after:summary(rows.filter(r=>!prior.length||priorIds.has(r.id+'/'+r.week))),
 healthy:summary(rows.filter(r=>!r.status)),healthyByPosition:Object.fromEntries(['QB','RB','WR','TE','K','DEF'].map(pos=>[pos,summary(rows.filter(r=>r.position===pos&&!r.status))])),
 own:summary(rows.filter(r=>own.has(r.id))),ownCurrent:rows.filter(r=>own.has(r.id)&&r.week===Number(weekly.week))};
fs.writeFileSync(path.join(base,'projection-audit.json'),JSON.stringify(output,null,2)+'\n');
console.log({paired:rows.length,healthy:output.healthy,own:output.own});
