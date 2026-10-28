#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
function refresh(base,raw,at=new Date().toISOString()){
 const read=n=>JSON.parse(fs.readFileSync(path.join(base,n+'.json'),'utf8'));
 const write=(n,d)=>fs.writeFileSync(path.join(base,n+'.json'),JSON.stringify(d,null,2)+'\n');
 const league=read('league'),rosters=read('rosters'),old=read('available');
 const positions=['QB','RB','WR','TE','K','DEF'];
 if(raw.available?.length!==positions.length||positions.some(pos=>!raw.available.some(r=>r.success&&r.data.position===pos&&(r.data.leagueKey||r.data.leagueId)===league.leagueId)))throw Error('Incomplete available-player refresh');
 if(!raw.transactions?.success)throw Error('Missing transaction refresh');
 const owned=new Set(rosters.teams.flatMap(t=>t.players.map(p=>String(p.id))));
 const counts={},players=[];
 for(const r of raw.available){
  const d=r.data;counts[d.position]=d.count;
  for(const p of d.freeAgents||[]){
   const id=String(p.id||p.playerId);
   if(owned.has(id))throw Error('Roster and available-player snapshots disagree for '+id);
   players.push({id,key:p.playerKey,name:p.name,nflTeam:p.team,position:p.position,yahooWideRosteredPercent:p.percentOwned??null,status:p.status||null,acquisitionState:p.acquisitionState??null,waiverClearsAt:p.waiverClearsAt??null});
  }
 }
 if(new Set(players.map(p=>p.id)).size!==players.length)throw Error('Duplicate available player');
 write('available',{...old,retrievedAt:at,injuryStatusSnapshotAt:at,counts,players,warnings:raw.available.flatMap(r=>r.data.warning?[r.data.warning]:[])});
 const tx=raw.transactions.data;
 write('transactions',{source:'Yahoo completed transactions, rolling 30-day window',leagueId:league.leagueId,season:2026,retrievedAt:at,coverage:{window:tx.window,limitations:tx.limitations||null,warning:tx.warning||null,truncated:tx.truncated||false},transactions:tx.transactions});
 const next=raw.nextWeek?.data;
 if(raw.nextWeek?.success&&next.leagueKey===league.leagueId){
  const schedule=read('matchup-schedule'),side=s=>({...s,id:String(s.teamId),name:s.teamName});
  const round={week:Number(next.matchupWeek),retrievedAt:at,matchups:next.matchups.map(m=>({...m,home:side(m.home),away:side(m.away)}))};
  schedule.weeks=schedule.weeks.filter(w=>w.week!==round.week).concat(round).sort((a,b)=>a.week-b.week);
  write('matchup-schedule',schedule);
 }
 return {available:players.length,transactions:tx.transactions.length};
}
module.exports={refresh};
if(require.main===module)console.log(refresh(path.resolve(__dirname,'../data'),JSON.parse(fs.readFileSync(process.argv[2],'utf8'))));
