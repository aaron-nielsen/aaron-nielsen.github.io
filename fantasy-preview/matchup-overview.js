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
function plannedDefense(data,teamId){
 const result=submitted(data,teamId),index=result.rows.findIndex(r=>r.slot==='DEF'&&(!r.player||r.label==='BYE'));
 if(index<0)return result;
 const forecasts=new Map((data.future?.players||[]).map(p=>[String(p.yahooId),p]));
 const roster=data.rosters.teams.find(t=>String(t.id)===String(teamId))?.players||[];
 const eligible=list=>list.filter(p=>p.position==='DEF'&&!['O','OUT','IR','NA'].includes(String(p.status||'').toUpperCase())).map(p=>({player:p,frame:forecasts.get(String(p.id))?.weeks?.find(w=>Number(w.week)===Number(data.week))})).filter(x=>x.frame&&x.frame.state!=='bye'&&x.frame.state!=='unavailable_reported'&&Number.isFinite(x.frame.points)).sort((a,b)=>b.frame.points-a.frame.points);
 const own=eligible(roster),open=eligible(data.available?.players||[]),choice=own[0]||open[0];
 if(!choice)return result;
 const {player,frame}=choice;
 result.rows[index]={slot:'DEF',player:{...player,slot:'DEF'},points:frame.points,label:Number(frame.points).toFixed(1),estimated:true,conditional:false,opponent:frame.opponent?(frame.home?'vs ':'@ ')+frame.opponent:'Schedule unavailable'};
 result.total=result.rows.every(r=>r.points!=null)?result.rows.reduce((sum,r)=>sum+r.points,0):null;
 result.defenseReplacement={name:player.name,source:own.length?'bench':'available'};
 return result;
}
function render(data){
 const target=document.getElementById('matchupLineups');if(!target)return;
 const future=Number(data.week)>Number(data.snapshotWeek??data.week);
 const a=future?projected(data,data.you.id):submitted(data,data.you.id),b=future?projected(data,data.other.id):plannedDefense(data,data.other.id);
 const scored=Boolean(data.hasStarted)||[...a.rows,...b.rows].some(r=>r.actual!=null&&r.actual!==0);
 const person=(r,side)=>{
  const identity='<span class="matchup-identity"><strong>'+(r.player?(root.DaVinciPlayerDetail?.link(r.player)||esc(r.player.name)):'Empty slot')+'</strong><small>'+esc([r.player?.nflTeam,r.opponent,r.player?.status].filter(Boolean).join(' · '))+'</small>'+(r.estimated?'<small class="matchup-estimate">Expected DEF replacement</small>':'')+'</span>';
  const score='<b title="'+(r.points==null?'Projection pending':r.label==='OUT'?'Out':r.label==='BYE'?'Bye week':'Projected fantasy points')+'">'+esc(r.label.replace('＊',''))+(r.conditional?'<sup class="forecast-conditional" title="Projected if active">†</sup>':'')+(scored&&r.actual!=null?'<small class="matchup-actual">'+r.actual.toFixed(1)+' scored</small>':'')+'</b>';
  return '<div class="matchup-player '+side+'">'+(side==='left'?identity+score:score+identity)+'</div>';
 };
 target.innerHTML='<div class="future-lineup-label">Projected points'+(scored?' · actual scores below':'')+'</div>'+a.rows.map((r,i)=>'<div class="matchup-starter-row">'+person(r,'left')+'<span class="matchup-slot">'+(r.slot==='W/R/T'?'FLEX':r.slot)+'</span>'+person(b.rows[i],'right')+'</div>').join('');
}
root.DaVinciMatchup={submitted,projected,plannedDefense,render};
})(typeof window!=='undefined'?window:globalThis);
