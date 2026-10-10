/* Compare the managers' submitted Yahoo lineups under the same league scoring. */
(function(root){
'use strict';
const slots=['QB','RB','RB','WR','WR','TE','W/R/T','K','DEF'];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function submitted(data,teamId){
 const waiting=(data.rosters.teams.find(t=>String(t.id)===String(teamId))?.players||[]).filter(p=>!['BN','IR'].includes(p.slot)).slice();
 const forecasts=new Map((data.future?.players||[]).map(p=>[String(p.yahooId),p]));
 const reports=new Map((data.weekly?.players||[]).map(p=>[String(p.yahooId),p]));
 const rows=slots.map(slot=>{
  const i=waiting.findIndex(p=>p.slot===slot||(slot==='W/R/T'&&p.slot==='FLEX'));
  const p=i<0?null:waiting.splice(i,1)[0];
  if(!p)return {slot,player:null,points:null,label:'—',opponent:'Empty slot'};
  const report=reports.get(String(p.id));
  const frame=forecasts.get(String(p.id))?.weeks?.find(w=>Number(w.week)===Number(data.week));
  const state=report?.forecastStatus??frame?.state;
  const raw=report?report.weeklyProjectedPoints:frame?.points;
  const code=String(p.status||'').toUpperCase();
  const out=['O','OUT','IR','IR-R','PUP','PUP-R','NFI','NA','N/A','SUSP','SUS','CEL'].includes(code)||state==='unavailable_reported';
  const bye=state==='bye';
  const points=out||bye?0:raw!=null&&Number.isFinite(Number(raw))?Number(raw):null;
  const opponent=report?.opponent??frame?.opponent;
  const home=report?report.location==='home':frame?.home;
  return {slot,player:p,points,label:out?'OUT':bye?'BYE':points==null?'—':points.toFixed(1),opponent:bye?'Bye week':opponent?(home?'vs ':'@ ')+opponent:'Schedule unavailable'};
 });
 return {rows,total:rows.every(r=>r.points!=null)?rows.reduce((s,r)=>s+r.points,0):null};
}
function render(data){
 const target=document.getElementById('matchupLineups');if(!target)return;
 const a=submitted(data,data.you.id),b=submitted(data,data.other.id);
 const person=(r,side)=>{
  const identity='<span class="matchup-identity"><strong>'+esc(r.player?.name||'Empty slot')+'</strong><small>'+esc([r.player?.nflTeam,r.opponent,r.player?.status].filter(Boolean).join(' · '))+'</small></span>';
  const score='<b title="'+(r.points==null?'Projection pending':r.label==='OUT'?'Out':r.label==='BYE'?'Bye week':'Da Vinci projected points')+'">'+esc(r.label)+'</b>';
  return '<div class="matchup-player '+side+'">'+(side==='left'?identity+score:score+identity)+'</div>';
 };
 target.innerHTML=a.rows.map((r,i)=>'<div class="matchup-starter-row">'+person(r,'left')+'<span class="matchup-slot">'+(r.slot==='W/R/T'?'FLEX':r.slot)+'</span>'+person(b.rows[i],'right')+'</div>').join('')+
  '<details class="projection-details"><summary>Projection details</summary><p>Da Vinci and Yahoo totals use each manager’s current starters. OUT and BYE count as zero; — means a projection is missing, including any team total that depends on it. Projections assume participation unless adjusted for availability. K/DEF estimates are experimental.</p></details>';

}
root.DaVinciMatchup={submitted,render};
})(typeof window!=='undefined'?window:globalThis);
