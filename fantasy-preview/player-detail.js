(function(root){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number.isFinite(n)?n.toFixed(1):'Pending';
const pid=p=>String(p.id||p.yahooId);
const date=v=>v&&Number.isFinite(Date.parse(v))?new Date(v).toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'America/Denver'}):'Unavailable';
let state=null,bound=false;
function link(p){return '<button type="button" class="player-detail-link" data-player-id="'+esc(pid(p))+'" aria-label="View '+esc(p.name)+'">'+esc(p.name)+'</button>';}
function build(data,id){
 id=String(id);
 const owner=data.rosters.teams.find(t=>t.players.some(p=>pid(p)===id));
 const forecast=data.future?.players.find(p=>pid(p)===id);
 const identity=owner?.players.find(p=>pid(p)===id)||data.available?.players.find(p=>pid(p)===id)||forecast;
 if(!identity)return null;
 const past=data.results?.players.find(p=>pid(p)===id)?.results||[];
 const through=Math.min(Number(data.week)-1,Number(data.results?.throughWeek||0));
 const actuals=Array.from({length:Math.max(0,Number(data.week)-1)},(_,i)=>past.find(r=>Number(r.week)===i+1)||{week:i+1,points:null});
 const yahoo=data.yahoo?.players.find(p=>pid(p)===id);
 const projected=Array.from({length:Math.max(0,17-Number(data.week)+1)},(_,i)=>{
  const w=Number(data.week)+i,frame=forecast?.weeks.find(f=>Number(f.week)===w),yf=yahoo?.weeks.find(f=>Number(f.week)===w);
  const conditional=frame?.points==null&&frame?.activePoints!=null&&frame?.state==='needs_availability_confirmation';
  return {week:w,opponent:frame?.state==='bye'?'BYE':frame?.opponent?(frame.home?'vs ':'@ ')+frame.opponent:'Pending',davinci:conditional?frame.activePoints:frame?.points??null,yahoo:yf?.points??null,conditional,state:frame?.state,factor:frame?.factor??null};
 });
 const known=actuals.filter(r=>Number.isFinite(r.points));
 const total=key=>projected.every(r=>Number.isFinite(r[key]))?projected.reduce((s,r)=>s+r[key],0):null;
 return {identity,owner:owner?.name||'Available / unverified',actuals,projected,through,known:known.length,actualTotal:known.length?known.reduce((s,r)=>s+r.points,0):null,davinciTotal:total('davinci'),yahooTotal:total('yahoo'),conditional:projected.some(r=>r.conditional)};
}
function show(id){
 const p=build(state,id);if(!p)return;
 const dialog=document.getElementById('playerDetail'),content=document.getElementById('playerDetailContent');
 const metric=(label,value,note='')=>'<div><small>'+label+'</small><strong>'+fmt(value)+'</strong><span>'+esc(note)+'</span></div>';
 const usage=s=>!s?'—':p.identity.position==='QB'?s.passAttempts+' att · '+s.passYards+' pass yd':p.identity.position==='RB'?s.carries+' carries · '+s.targets+' targets':p.identity.position==='WR'||p.identity.position==='TE'?s.targets+' targets · '+s.receptions+' rec':'—';
 content.innerHTML='<header class="player-detail-header"><div><h2 id="playerDetailTitle">'+esc(p.identity.name)+'</h2><p>'+esc([p.identity.position,p.identity.nflTeam,p.identity.status||p.identity.injuryStatus,p.owner].filter(Boolean).join(' · '))+'</p></div><button type="button" class="player-detail-close" data-player-close aria-label="Close player details">×</button></header>'+
  '<div class="player-detail-metrics">'+metric(p.known===p.actuals.length?'Season points':'Known points',p.actualTotal,p.known+'/'+p.actuals.length+' weeks')+metric('Points / week',p.known?p.actualTotal/p.known:null)+metric('Da Vinci remaining',p.davinciTotal,p.conditional?'Includes if-active estimates':'Assumes participation')+metric('Yahoo remaining',p.yahooTotal,'Saved '+date(state.yahoo?.players.find(q=>pid(q)===String(id))?.collectedAt||state.yahoo?.collectedAt))+'</div>'+
  '<div class="player-detail-panels"><section><h3>Results so far</h3><div class="player-detail-scroll"><table><thead><tr><th>Week</th><th>Usage</th><th>Points</th></tr></thead><tbody>'+p.actuals.map(r=>'<tr><th>W'+r.week+'</th><td>'+esc(usage(r.stats))+'</td><td title="'+esc(r.source||'Result not collected')+'">'+fmt(r.points)+'</td></tr>').join('')+'</tbody></table></div></section>'+
  '<section><h3>Rest of season</h3><div class="player-detail-scroll"><table><thead><tr><th>Week</th><th>Opponent</th><th>Da Vinci</th><th>Yahoo</th></tr></thead><tbody>'+p.projected.map(r=>'<tr><th>W'+r.week+'</th><td title="'+esc(['QB','RB','WR','TE'].includes(p.identity.position)&&r.factor!=null?'Defense adjustment: '+(r.factor>=1?'+':'')+((r.factor-1)*100).toFixed(1)+'% · through Week '+(state.future.defenseThroughWeek||'?'):'')+'">'+esc(r.opponent)+'</td><td>'+fmt(r.davinci)+(r.conditional?' †':'')+'</td><td>'+fmt(r.yahoo)+'</td></tr>').join('')+'</tbody></table></div></section></div>'+
  '<details class="player-detail-sources"><summary>Sources & assumptions</summary><p>Results: Yahoo historical points where available; otherwise NFL stats scored with this league’s rules. Pending means uncollected. Da Vinci: '+esc(date(state.future.generatedAt))+' · offense through Week '+state.future.statsThroughWeek+' · defense through Week '+(state.future.defenseThroughWeek||'unknown')+'. Yahoo: '+esc(date(state.yahoo?.players.find(q=>pid(q)===String(id))?.collectedAt||state.yahoo?.collectedAt))+'. † assumes the player is active. Future participation is assumed unless an explicit return scenario applies. No general injury-probability discount is applied. Role changes and K/DEF estimates remain uncertain.</p></details>';
 if(!dialog.open)dialog.showModal();
}
function init(data){
 state=data;if(bound)return;bound=true;
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-player-id]');
  if(button){event.preventDefault();event.stopPropagation();show(button.dataset.playerId);}
  if(event.target.closest('[data-player-close]'))document.getElementById('playerDetail').close();
 });
 document.getElementById('playerDetail').addEventListener('click',event=>{if(event.target===event.currentTarget)event.currentTarget.close();});
}
root.DaVinciPlayerDetail={link,build,init,show};
})(typeof window!=='undefined'?window:globalThis);
