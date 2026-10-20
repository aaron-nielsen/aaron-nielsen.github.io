#!/usr/bin/env node
/* Offline import and all-team counterfactuals from already saved Yahoo tables. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
require(path.join(root,'yahoo-values.js'));
const read=name=>JSON.parse(fs.readFileSync(path.join(root,'data',name+'.json'),'utf8'));
const raw=read('yahoo-weekly-rosters'),rosters=read('rosters'),players=new Map();
// Retain verified identities for players who have been dropped since collection.
const identities=new Map(read('yahoo-projections').players.map(p=>[String(p.yahooId),p]));
for(const t of rosters.teams)for(const p of t.players)identities.set(String(p.id),p);
for(const rows of Object.values(raw.teams))for(const row of rows)for(const p of row.players){
 const identity=identities.get(String(p.id)),position=identity?.position||p.position;
 if(!['QB','RB','WR','TE','K','DEF'].includes(position))throw Error('Verified position missing for '+p.id);
 if(!players.has(p.id))players.set(p.id,{yahooId:p.id,name:identity?.name||p.name,position,positionSource:identity?'Verified current roster':'Yahoo weekly roster',weeks:[],collectedAt:row.collectedAt||raw.collectedAt});
 const saved=players.get(p.id);
 const collectedAt=row.collectedAt||raw.collectedAt;if(Date.parse(collectedAt)<Date.parse(saved.collectedAt))saved.collectedAt=collectedAt;
 if(!saved.weeks.some(w=>w.week===row.week))saved.weeks.push({week:row.week,points:p.points,state:p.state,collectedAt});
}
for(const t of rosters.teams)for(const p of t.players)if(!players.has(p.id))players.set(p.id,{yahooId:p.id,name:p.name,position:p.position,positionSource:'Verified current roster',collectedAt:null,weeks:raw.weeks.map(week=>({week,points:null,state:'projection_not_collected',collectedAt:null}))});
const dates=[...players.values()].flatMap(p=>p.weeks.map(w=>w.collectedAt).filter(Boolean)).sort(),freshness={oldest:dates[0]||null,newest:dates.at(-1)||null};
const data={schemaVersion:1,source:'Yahoo weekly projections · optimal lineups',collectedAt:freshness.oldest,updatedAt:raw.updatedAt,freshness,collection:raw.collection,leagueId:rosters.leagueId,weeks:raw.weeks,coverage:raw.coverage,players:[...players.values()]};
const model=global.YahooValues.create(data),matrix={schemaVersion:1,source:data.source,collectedAt:data.collectedAt,updatedAt:data.updatedAt,freshness,weeks:data.weeks,method:'Gain if added; loss if removed. Existing roster only, no assumed free-agent pickups or drops. Individual values are not additive trade prices.',players:data.players.map(p=>({id:p.yahooId,name:p.name,position:p.position,collectedAt:p.collectedAt})),teams:[]};
data.rosterSnapshotAt=rosters.retrievedAt;matrix.rosterSnapshotAt=rosters.retrievedAt;
data.coverage={...data.coverage,completeTeams:rosters.teams.filter(t=>raw.weeks.every(w=>model.score(t.players,w)!==null)).map(t=>String(t.id)),missingPlayers:rosters.teams.flatMap(t=>t.players.filter(p=>!raw.weeks.every(w=>players.get(p.id)?.weeks.some(f=>f.week===w&&Number.isFinite(f.points)))).map(p=>({id:p.id,name:p.name,teamId:String(t.id),team:t.name})))};
data.coverage.complete=data.coverage.completeTeams.length===rosters.teams.length;
for(const team of rosters.teams){
 const baseline=raw.weeks.map(w=>model.score(team.players,w)),complete=baseline.every(n=>n!==null);
 const impacts=matrix.players.map(p=>{const result=model.marginal(team.players,p,raw.weeks);return {id:p.id,kind:result.owned?'Loss if removed':'Gain if added',impact:result.owned?result.lossIfRemoved:result.gainIfAdded,...result};});
 matrix.teams.push({id:String(team.id),name:team.name,complete,baseline,coverage:{known:impacts.filter(p=>p.impact!==null).length,total:impacts.length},impacts});
}
const owners=new Map(rosters.teams.flatMap(t=>t.players.map(p=>[String(p.id),String(t.id)]))),teamValues=new Map(matrix.teams.map(t=>[t.id,new Map(t.impacts.map(p=>[p.id,p]))]));
for(const team of matrix.teams)for(const p of team.impacts){
 p.ownerId=owners.get(p.id)||null;p.ownerLoss=teamValues.get(p.ownerId)?.get(p.id)?.lossIfRemoved??null;
 p.arbitrage=p.owned||p.gainIfAdded===null||p.ownerLoss===null?null:Math.round((p.gainIfAdded-p.ownerLoss)*100)/100;
}
matrix.coverage={players:matrix.players.length,completeTeams:matrix.teams.filter(t=>t.complete).length,totalTeams:matrix.teams.length,knownCells:matrix.teams.reduce((n,t)=>n+t.coverage.known,0)};
matrix.coverage.knownTransferSpreads=matrix.teams.reduce((n,t)=>n+t.impacts.filter(p=>p.arbitrage!==null).length,0);
for(const [name,value] of [['yahoo-projections',data],['yahoo-team-player-values',matrix]])fs.writeFileSync(path.join(root,'data',name+'.json'),JSON.stringify(value,null,2)+'\n');
fs.writeFileSync(path.join(root,'yahoo-matrix.html'),require('./render-yahoo-matrix.cjs').render(matrix,rosters));
console.log(matrix.coverage);
