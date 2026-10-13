#!/usr/bin/env node
/* Rebuild collected values without browsing. Run from any working directory. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
global.document={getElementById:()=>null};
for(const module of ['availability-sanity','return-outlook','playing-time-model','special-teams-model','roster-advice','planning-model'])require(path.join(root,module+'.js'));
const shared=name=>JSON.parse(fs.readFileSync(path.join(root,'data',name+'.json'),'utf8'));
for(const slug of ['csu','nebraska']){
 const base=path.join(root,'data',slug==='csu'?'':'nebraska');
 const read=name=>JSON.parse(fs.readFileSync(path.join(base,name+'.json'),'utf8'));
 const league=read('league'),rosters=read('rosters'),available=read('available'),future=read('future'),weekly=read('weekly');
 const args={rosters,available,futureData:future,weekly};
 global.DaVinciEligibility.reconcile(args);global.DaVinciReturns.apply(args);
 global.DaVinciPlayingTime.apply({...args,history:shared('usage-history')});
 global.DaVinciSpecialTeams.enrich({...args,league,context:shared('special-teams-context')});
 global.DaVinciEligibility.reconcile(args);
 const data={rosters,available,future,week:read('week').week,teamId:league.userTeamId,schedule:read('matchup-schedule'),nflSchedule:shared('nfl-schedule'),negotiations:shared('trade-negotiations'),leagueKey:slug};
 global.DaVinciAdvice.init(data);data.optimize=global.DaVinciAdvice.lineup;
 const model=global.DaVinciPlanningModel.create(data),weeks=model.range(),impact=model.impactContext(weeks);
 const values=model.players.map(p=>{const v=model.value(p,weeks);return {id:String(p.id),name:p.name,position:p.position,nflTeam:p.nflTeam,owner:p.fantasyTeam,ownerId:p.fantasyTeamId,
  periodPoints:v.ros,aboveReplacement:v.vor,firstWeekPoints:v.next,replacementPoints:v.reference,coverage:v.coverage,...impact(p)};});
 const output={schemaVersion:1,leagueId:league.leagueId,teamId:league.userTeamId,leagueKey:slug,forecastGeneratedAt:future.generatedAt,rosterSnapshotAt:rosters.retrievedAt,statsThroughWeek:future.statsThroughWeek,weeks,
  method:'Streaming same-position replacement baseline; legal nine-slot lineup impact for the selected team; own players show loss if removed. This is a dated model snapshot, not market trade value.',
  coverage:{collected:values.length,replacementValues:values.filter(p=>p.aboveReplacement!==null).length,lineupImpacts:values.filter(p=>p.impact!==null).length},players:values,targets:model.targets(weeks)};
 fs.writeFileSync(path.join(base,'player-values.json'),JSON.stringify(output,null,2)+'\n');
 console.log(slug+': '+JSON.stringify(output.coverage));console.log('Roster-fit swaps:',JSON.stringify(output.targets));
 if(process.argv.includes('--all-teams')){
  const matrix={schemaVersion:1,source:'Da Vinci scenario model',calculatedAt:new Date().toISOString(),leagueId:league.leagueId,leagueKey:slug,forecastGeneratedAt:future.generatedAt,rosterSnapshotAt:rosters.retrievedAt,weeks,
   method:'Each collected player evaluated for every team. Own players show loss if removed with a replacement; other players show gain if added, with a roster drop when needed. These are separate counterfactuals, not additive package prices. Unknown values remain null.',
   players:values.map(p=>({id:p.id,name:p.name,position:p.position,ownerId:p.ownerId,aboveReplacement:p.aboveReplacement})),teams:[]};
  for(const team of rosters.teams){
   const valuation=global.DaVinciPlanningModel.create({...data,teamId:String(team.id)}),context=valuation.impactContext(weeks);
   const impacts=valuation.players.map(p=>({id:String(p.id),...context(p)}));
   matrix.teams.push({id:String(team.id),name:team.name,coverage:{known:impacts.filter(p=>p.impact!==null).length,total:impacts.length},impacts});
   console.log(slug+' / '+team.name+': '+matrix.teams.at(-1).coverage.known+'/'+impacts.length);
  }
  matrix.coverage={players:matrix.players.length,teams:matrix.teams.length,cells:matrix.players.length*matrix.teams.length,known:matrix.teams.reduce((n,t)=>n+t.coverage.known,0)};
  fs.writeFileSync(path.join(base,'team-player-values.json'),JSON.stringify(matrix,null,2)+'\n');
  console.log('Saved all-team matrix:',JSON.stringify(matrix.coverage));
 }
}
