#!/usr/bin/env node
/* Import a complete Flaim league snapshot; roll dated forecasts to its week offline. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
function refresh(base,raw,at=new Date().toISOString()){
 const read=name=>JSON.parse(fs.readFileSync(path.join(base,name+'.json'),'utf8'));
 const write=(name,value)=>fs.writeFileSync(path.join(base,name+'.json'),JSON.stringify(value,null,2)+'\n');
 const league=read('league'),oldWeek=read('week'),oldRosters=read('rosters'),weekly=read('weekly'),future=read('future');
 const info=raw.league?.data,board=raw.matchups?.data,standings=raw.standings?.data;
 const current=Number(board?.matchupWeek);
 if(!raw.league?.success||!raw.matchups?.success||!raw.standings?.success||info?.leagueKey!==league.leagueId||board?.leagueKey!==league.leagueId||standings?.leagueKey!==league.leagueId||current!==Number(info.currentWeek)||current<oldWeek.week)throw Error('Refresh requires matching, successful league snapshots and a current week');
 const teams=raw.rosters?.map(r=>{
  if(!r?.success||r.data?.snapshot?.type!=='current'||!r.data.teamKey?.startsWith(league.leagueId+'.t.'))throw Error('Invalid current roster');
  const d=r.data;
  return {id:d.teamKey.split('.').at(-1),key:d.teamKey,name:d.teamName,owner:d.ownerName,players:d.players.map(p=>({id:String(p.playerId),key:p.playerKey,name:p.name,nflTeam:p.team,position:p.position,slot:p.selectedPosition,status:p.status||null}))};
 });
 if(teams?.length!==Number(info.numTeams)||new Set(teams.map(t=>t.id)).size!==teams.length)throw Error('Incomplete roster refresh');
 const side=s=>({...s,id:String(s.teamId),name:s.teamName});
 const matchups=board.matchups.map(m=>({...m,id:m.matchupId,week:current,home:side(m.home),away:side(m.away)}));
 const paired=matchups.flatMap(m=>[m.home.id,m.away.id]);
 if(paired.length!==teams.length||new Set(paired).size!==teams.length||!teams.every(t=>paired.includes(t.id))||standings.standings.length!==teams.length)throw Error('Incomplete scoreboard or standings');
 const owners=new Map(teams.flatMap(t=>t.players.map(p=>[p.id,{team:t,player:p}])));
 const oldReports=new Map(weekly.players.map(p=>[String(p.yahooId),p]));
 const reports=[];
 for(const p of future.players){
  const owner=owners.get(String(p.yahooId)),previous=oldReports.get(String(p.yahooId));
  if(owner){p.injuryStatus=owner.player.status;p.rosterSlot=owner.player.slot;p.fantasyTeamId=owner.team.id;p.fantasyTeam=owner.team.name;p.ownership='rostered';}
  const frame=p.weeks.find(w=>Number(w.week)===current);
  if(!frame)continue;
  const code=String(p.injuryStatus||'').toUpperCase();
  const blocked=/^(IR|PUP|NFI|OUT|O|NA|N\/A|CEL|SUSP|SUS)$|^(IR|PUP|NFI)-/.test(code);
  const uncertain=['Q','QUESTIONABLE','D','DOUBTFUL','GTD'].includes(code)||owner?.player.slot==='IR';
  if(frame.state!=='bye'){
   frame.points=blocked?0:uncertain?null:frame.activePoints;
   frame.state=blocked?'unavailable_reported':uncertain?'needs_availability_confirmation':'assuming_active';
  }
  reports.push({...previous,yahooId:p.yahooId,name:p.name,position:p.position,nflTeam:p.nflTeam,fantasyTeamId:p.fantasyTeamId,fantasyTeam:p.fantasyTeam,ownership:p.ownership,rosterSlot:p.rosterSlot,injuryStatus:p.injuryStatus,opponent:frame.opponent,gameDate:frame.date,gameTime:null,location:frame.home===null?null:frame.home?'home':'away',matchupFactor:frame.factor,activeGamePoints:frame.activePoints,weeklyProjectedPoints:frame.points,forecastStatus:frame.state,injurySnapshotAt:owner?at:previous?.injurySnapshotAt});
 }
 // Preserve model generation/stat dates: rolling a saved scenario is not fresh research.
 future.currentWeekAtSnapshot=current;future.preparedAt=at;future.rosterSnapshotAt=at;
 weekly.week=current;weekly.players=reports;weekly.preparedAt=at;weekly.generatedAt=future.generatedAt;weekly.rosterSnapshotAt=at;
 weekly.note='Rolled from saved future scenarios; model and stats dates are unchanged. Current roster statuses refreshed via Flaim.';
 const history=path.join(base,'historical');fs.mkdirSync(history,{recursive:true});
 const archive=path.join(history,'snapshot-week-'+oldWeek.week+'.json');
 if(current>oldWeek.week&&!fs.existsSync(archive))fs.writeFileSync(archive,JSON.stringify({week:oldWeek,rosters:oldRosters,weekly:read('weekly')},null,2)+'\n');
 write('rosters',{...oldRosters,retrievedAt:at,source:'Yahoo Fantasy via Flaim Fantasy',teams});
 write('week',{...oldWeek,retrievedAt:at,week:current,matchups,standings:standings.standings.map(s=>({...s,teamId:String(s.teamId),rank:Number(s.rank),wins:Number(s.wins),losses:Number(s.losses),ties:Number(s.ties),pointsFor:Number(s.pointsFor),pointsAgainst:Number(s.pointsAgainst)}))});
 league.retrievedAt=at;league.currentWeekAtSnapshot=current;league.scoringByYahooStatId=Object.fromEntries(info.statModifiers.map(s=>[s.statId,Number(s.value)]));
 write('league',league);write('weekly',weekly);write('future',future);
 return {week:current,teams:teams.length,players:teams.reduce((n,t)=>n+t.players.length,0),forecastGeneratedAt:future.generatedAt,statsThroughWeek:future.statsThroughWeek};
}
module.exports={refresh};
if(require.main===module){
 const input=process.argv[2];if(!input)throw Error('Usage: node refresh-week.cjs /path/to/flaim-snapshot.json [data-directory]');
 console.log(refresh(path.resolve(process.argv[3]||path.join(__dirname,'../data')),JSON.parse(fs.readFileSync(input,'utf8'))));
}
