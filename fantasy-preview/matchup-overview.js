/* Compare the managers' submitted Yahoo lineups under the same league scoring. */
(function(root){
'use strict';
const slots=['QB','RB','RB','WR','WR','TE','W/R/T','K','DEF'];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function submitted(data,teamId){
 const waiting=(data.rosters.teams.find(t=>String(t.id)===String(teamId))?.players||[]).filter(p=>!['BN','IR'].includes(p.slot)).slice();
 const forecasts=new Map((data.future?.players||[]).map(p=>[String(p.yahooId),p]));
 const reports=new Map((Number(data.weekly?.week)===Number(data.week)?data.weekly?.players||[]:[]).map(p=>[String(p.yahooId),p]));
 const rows=slots.map(slot=>{
  const i=waiting.findIndex(p=>p.slot===slot||(slot==='W/R/T'&&p.slot==='FLEX'));
  const p=i<0?null:waiting.splice(i,1)[0];
  if(!p)return {slot,player:null,points:null,label:'—',opponent:'Empty slot'};
  const report=reports.get(String(p.id));
  const frame=forecasts.get(String(p.id))?.weeks?.find(w=>Number(w.week)===Number(data.week));
  const state=report?.forecastStatus??frame?.state;
  let raw=report?report.weeklyProjectedPoints:frame?.points;
  const uncertain=['Q','QUESTIONABLE','GTD'].includes(String(p.status||report?.injuryStatus||forecasts.get(String(p.id))?.injuryStatus||'').toUpperCase())||state==='needs_availability_confirmation';
  const conditional=raw==null&&uncertain&&(report?.activeGamePoints??frame?.activePoints)!=null;
  if(conditional)raw=report?.activeGamePoints??frame?.activePoints;
  const code=String(p.status||'').toUpperCase();
  const out=['O','OUT','IR','IR-R','PUP','PUP-R','NFI','NA','N/A','SUSP','SUS','CEL'].includes(code)||state==='unavailable_reported';
  const bye=state==='bye';
  const points=out||bye?0:raw!=null&&Number.isFinite(Number(raw))?Number(raw):null;
  const opponent=report?.opponent??frame?.opponent;
  const home=report?report.location==='home':frame?.home;
  const actual=Number(p.actualPointsWeek)===Number(data.week)&&Number.isFinite(p.actualPoints)?p.actualPoints:null;
  return {slot,player:p,points,actual,conditional,label:out?'OUT':bye?'BYE':points==null?'—':points.toFixed(1)+(conditional?'＊':''),opponent:bye?'Bye week':opponent?(home?'vs ':'@ ')+opponent:'Schedule unavailable'};
 });
 return {rows,conditional:rows.some(r=>r.conditional),total:rows.every(r=>r.points!=null)?rows.reduce((s,r)=>s+r.points,0):null};
}
function projected(data,teamId){
 const lineup=data.optimize?.(teamId,Number(data.week));
 const roster=data.rosters.teams.find(t=>String(t.id)===String(teamId));
 const forecasts=new Map((data.future?.players||[]).map(p=>[String(p.yahooId),p]));
 const rows=slots.map((slot,i)=>{
  const selection=lineup?.ids?.find(p=>p.slot===i);
  const player=roster?.players.find(p=>String(p.id)===String(selection?.id));
  if(!selection||!player)return {slot,player:null,points:null,label:'—',opponent:'Lineup incomplete'};
  const frame=forecasts.get(String(player.id))?.weeks?.find(w=>Number(w.week)===Number(data.week));
  const conditional=frame?.availabilityProbability!=null&&frame.availabilityProbability<1;
  const bye=frame?.state==='bye';
  return {slot,player:{...player,status:null},points:selection.points,conditional,
   label:bye?'BYE':Number(selection.points).toFixed(1)+(conditional?'＊':''),
   opponent:bye?'Bye week':frame?.opponent?(frame.home?'vs ':'@ ')+frame.opponent:'Schedule unavailable'};
 });
 return {rows,conditional:rows.some(r=>r.conditional),total:lineup?.points??null};
}
function render(data){
 const target=document.getElementById('matchupLineups');if(!target)return;
 const future=Number(data.week)>Number(data.snapshotWeek??data.week);
 const build=future?projected:submitted;
 const a=build(data,data.you.id),b=build(data,data.other.id);
 const person=(r,side)=>{
  const identity='<span class="matchup-identity"><strong>'+(r.player?(root.DaVinciPlayerDetail?.link(r.player)||esc(r.player.name)):'Empty slot')+'</strong><small>'+esc([r.player?.nflTeam,r.opponent,r.player?.status].filter(Boolean).join(' · '))+'</small></span>';
  const score=r.actual!=null?'<b title="Scored so far">'+r.actual.toFixed(1)+'</b>':'<b title="'+(r.points==null?'Projection pending':r.label==='OUT'?'Out':r.label==='BYE'?'Bye week':'Da Vinci projected points')+'">'+esc(r.label.replace('＊',''))+(r.conditional?'<sup class="forecast-conditional" title="Projected if active">†</sup>':'')+'</b>';
  return '<div class="matchup-player '+side+'">'+(side==='left'?identity+score:score+identity)+'</div>';
 };
 target.innerHTML=(!future&&a.rows.some(r=>r.actual!=null)?'<div class="future-lineup-label">Points scored</div>':'')+a.rows.map((r,i)=>'<div class="matchup-starter-row">'+person(r,'left')+'<span class="matchup-slot">'+(r.slot==='W/R/T'?'FLEX':r.slot)+'</span>'+person(b.rows[i],'right')+'</div>').join('')+
  '<details class="projection-details"><summary>Projection details</summary><p>'+(future?'Future weeks use optimized current rosters, without assumed pickups. Yahoo totals are omitted because submitted future lineups may differ. ':'')+'† means if active, including the team total. Da Vinci and Yahoo totals use each manager’s current starters. OUT and BYE count as zero; — means a projection is missing, including any team total that depends on it. Projections assume participation unless adjusted for availability. K/DEF estimates are experimental.</p></details>';

}
root.DaVinciMatchup={submitted,projected,render};
})(typeof window!=='undefined'?window:globalThis);
