/* Da Vinci Fantasy Lab — actionable, nine-slot roster decisions.
   All projected gains are recomputed against legal full-team starters.
   Yahoo ownership is read-only, never an automatic transaction. */
(function (root) {
'use strict';
const POSITIONS=['RB','WR','TE','QB','K','DEF'];
const SLOTS=[['QB'],['RB'],['RB'],['WR'],['WR'],['TE'],['RB','WR','TE'],['K'],['DEF']];
const SLOT_NAMES=['QB','RB','RB','WR','WR','TE','FLEX','K','DEF'];
const BENCH='BN';
const EXCLUDED=new Set(['IR','IR-R','PUP','PUP-R','NFI','NFI-R','NA','N/A','CEL','SUSP','SUS']);
const OUT=new Set(['OUT','O','D','DOUBTFUL']);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>Number(v).toFixed(1);
const $=id=>document.getElementById(id);
let state=null, byId=null;
function status(p){return String(p.status||p.injuryStatus||'').toUpperCase().trim();}
function inaccessible(p,w){const code=status(p);return p.slot==='IR'||p.rosterSlot==='IR'||EXCLUDED.has(code)||code.startsWith('IR-')||code.startsWith('PUP-')||(w<=state.week&&OUT.has(code));}
function points(p,w){
 const f=byId.get(String(p.id||p.yahooId));
 const frame=f?.weeks?.find(x=>Number(x.week)===w);
 if(!frame)return null;
 if(frame.state==='bye')return 0;
 return frame.points==null||!Number.isFinite(Number(frame.points))?null:Number(frame.points);
}
function lineup(players,w){
 const dp=Array(512).fill(null);
 dp[0]={score:0,selections:[]};
 for(const p of players){
  if(inaccessible(p,w))continue;
  const score=points(p,w);
  if(score==null)continue;
  const allowed=[];
  for(let i=0;i<9;i++)if(SLOTS[i].includes(p.position))allowed.push(i);
  if(!allowed.length)continue;
  for(let mask=511;mask>=0;mask--){
   const old=dp[mask];if(!old)continue;
   for(const slot of allowed){
    const bit=1<<slot;if(mask&bit)continue;
    const next=mask|bit, total=old.score+score;
    if(!dp[next]||total>dp[next].score)
     dp[next]={score:total,selections:[...old.selections,{player:p,slot,points:score}]};
   }
  }
 }
 return dp[511];
}
function mine(){return state.rosters.teams.find(t=>String(t.id)===String(state.teamId))?.players||[];}
function horizon(){
 const first=Math.max(state.week+1,Number(state.future.startWeek),6);
 const last=Number(state.future.endWeek)||17;
 const mode=$('waiverHorizon')?.value||'next_week';
 const count=mode==='next_week'?1:mode==='four_weeks'?4:last-first+1;
 return Array.from({length:Math.max(0,Math.min(count,last-first+1))},(_,i)=>first+i);
}
function renderRecommendations(){
 if(!state)return;
 const target=$('lineupRecommendations');if(!target)return;
 const w=Number($('lineupWeek')?.value||state.week);
 const chip=$('lineupChangeWeek');if(chip)chip.textContent='WEEK '+w;
 const roster=mine(),original=roster.filter(p=>!['BN','IR'].includes(p.slot));
 const best=lineup(roster,w);
 if(!best){target.innerHTML='<div class="decision-empty">A full nine-player lineup could not be projected.</div>';return;}
 const chosenIds=new Set(best.selections.map(x=>String(x.player.id)));
 const currentIds=new Set(original.map(x=>String(x.id)));
 const additions=best.selections.filter(x=>!currentIds.has(String(x.player.id)));
 const removals=original.filter(p=>!chosenIds.has(String(p.id)));
 let current=0,complete=original.length===9;
 for(const p of original){
  const value=points(p,w);
  if(value==null || inaccessible(p,w)){complete=false;continue;}
  current+=value;
 }
 const gain=complete?Math.max(0,best.score-current):null;
 const statusFlags=original.filter(p=>OUT.has(status(p))||status(p)==='Q'||status(p)==='GTD');
 const summaries=[];
 if(additions.length){
  for(const a of additions.slice(0,3)){
   let removed=removals.find(x=>x.position===a.player.position);
   if(!removed)removed=removals[0];
   if(removed)removals.splice(removals.indexOf(removed),1);
   const compared=removed?points(removed,w):null;
   const detail=removed?'Sit '+esc(removed.name)+(compared==null?'':' · '+fmt(compared)):'Use '+SLOT_NAMES[a.slot]+' slot';
   summaries.push('<div class="decision-row"><span class="decision-position">'+esc(SLOT_NAMES[a.slot])+'</span><span class="decision-main"><strong>Start '+esc(a.player.name)+'</strong><small>'+detail+'</small></span><b>'+fmt(a.points)+' pts</b></div>');
  }
 }else{
  const reserves=roster.filter(p=>p.slot==='BN'&&!inaccessible(p,w)).map(p=>({p,points:points(p,w)})).filter(x=>x.points!=null).sort((a,b)=>b.points-a.points);
  let nearest=null;
  for(const backup of reserves){
   const eligible=original.filter(p=>SLOTS.some((slots,i)=>slots.includes(backup.p.position)&&slots.includes(p.position)&&SLOT_NAMES[i]!=='FLEX') || ['RB','WR','TE'].includes(p.position)&&['RB','WR','TE'].includes(backup.p.position));
   for(const p of eligible){
    const v=points(p,w);
    if(v!=null&&v>=backup.points){
     const margin=v-backup.points;
     if(!nearest||margin<nearest.margin)nearest={starter:p,backup,margin};
    }
   }
  }
  if(nearest)summaries.push('<div class="decision-row"><span class="decision-position">KEEP</span><span class="decision-main"><strong>'+esc(nearest.starter.name)+'</strong><small>Over '+esc(nearest.backup.p.name)+'</small></span><b>+'+fmt(nearest.margin)+' pts</b></div>');
  else summaries.push('<div class="decision-row"><span class="decision-position">SET</span><span class="decision-main"><strong>Current starters are the top modeled lineup</strong></span></div>');
 }
 const flagText=statusFlags.length?'<div class="decision-alert">Check status: '+statusFlags.map(p=>esc(p.name)+' ('+esc(status(p))+')').join(', ')+'</div>':'';
 target.innerHTML=(gain!=null && additions.length?'<div class="decision-result">Optimized lineup <strong>+'+fmt(gain)+' pts</strong></div>':'')+
  '<div class="decision-list">'+summaries.join('')+'</div>'+flagText;
}
function renderWaivers(){
 if(!state)return;
 const rootEl=$('waiverRecommendations');if(!rootEl)return;
 const dup=$('specialPickupResults');if(dup)dup.innerHTML='';
 const weeks=horizon();
 if(!weeks.length){rootEl.innerHTML='<p class="decision-empty">No upcoming weeks.</p>';return;}
 const roster=mine();
 const baselines=weeks.map(w=>lineup(roster,w));
 const allReady=baselines.every(Boolean);
 const availableIds=new Set(state.available.players.map(p=>String(p.id)));
 const pool=state.future.players.filter(p=>availableIds.has(String(p.yahooId))&&p.ownership==='available'&&POSITIONS.includes(p.position))
  .filter(p=>!inaccessible(p,weeks[0])&&!OUT.has(status(p)));
 const availableMap=new Map(state.available.players.map(p=>[String(p.id),p]));
 const totals=p=>weeks.reduce((sum,w)=>sum+(points({id:p.yahooId},w)||0),0);
 const ordered=pool.map(p=>({...p,id:String(p.yahooId),total:totals(p),market:availableMap.get(String(p.yahooId))?.yahooWideRosteredPercent??null}))
  .filter(p=>weeks.some(w=>points(p,w)!=null))
  .sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name));
 const bestByPosition=POSITIONS.map(pos=>{
  const list=ordered.filter(p=>p.position===pos && (pos!=='K'||p.market==null||p.market>=5));
  return {pos,list:list.slice(0,3)};
 });
 const dropChoices=roster.filter(p=>p.slot==='BN'&&!EXCLUDED.has(status(p))&&!OUT.has(status(p)));
 const moveCandidates=bestByPosition.flatMap(x=>x.list.slice(0,2));
 const changes=[];
 if(allReady){
  const baseTotal=baselines.reduce((n,x)=>n+x.score,0);
  for(const candidate of moveCandidates){
   const possible=dropChoices.filter(p=>candidate.position!=='K'&&candidate.position!=='DEF');
   if(['K','DEF'].includes(candidate.position))
    possible.push(...roster.filter(p=>p.position===candidate.position&&p.slot!=='IR'));
   if(!possible.length)continue;
   let bestMove=null;
   for(const drop of possible){
    const modified=roster.filter(p=>String(p.id)!==String(drop.id)).concat([{...candidate,slot:'BN'}]);
    const forecasts=weeks.map(w=>lineup(modified,w));
    if(forecasts.some(x=>!x))continue;
    const gain=forecasts.reduce((n,x)=>n+x.score,0)-baseTotal;
    if(!bestMove||gain>bestMove.gain)bestMove={gain,drop};
   }
   if(bestMove && bestMove.gain>0.03)changes.push({...bestMove,p:candidate});
  }
 }
 changes.sort((a,b)=>b.gain-a.gain);
 const shown=changes.filter(c=>c.gain/weeks.length>=0.65).slice(0,3);
 const highlights=shown.length?'<div class="decision-section-title">Potential upgrades</div>'+shown.map(c=>{
  const rate=c.gain/weeks.length;
  return '<div class="decision-row pickup-move"><span class="decision-position">'+esc(c.p.position)+'</span>'+
   '<span class="decision-main"><strong>Add '+esc(c.p.name)+'</strong><small>Drop '+esc(c.drop.name)+'</small></span>'+
   '<b>+'+fmt(rate)+' <small>pts/wk</small></b></div>';
 }).join(''):'';
 const label=weeks.length===1?'Week '+weeks[0]+' projection':'Average points / week';
 const watch='<div class="decision-section-title">Top available by position</div>'+
  bestByPosition.map(({pos,list})=>{
   const p=list[0];
   if(!p)return '';
   const avg=p.total/weeks.length;
   return '<div class="decision-row pickup-watch"><span class="decision-position">'+pos+'</span>'+
    '<span class="decision-main"><strong>'+esc(p.name)+'</strong><small>'+esc(p.nflTeam||'')+(status(p)?' · '+esc(status(p)):'')+'</small></span>'+
    '<b>'+fmt(avg)+' <small>pts'+(weeks.length>1?'/wk':'')+'</small></b></div>';
  }).join('');
 rootEl.innerHTML=highlights+watch;
 rootEl.setAttribute('aria-label','Roster pickup advice, '+label);
}
function init(data){
 state=data;
 byId=new Map(state.future.players.map(p=>[String(p.yahooId),p]));
 renderRecommendations();renderWaivers();
 $('lineupWeek')?.addEventListener('change',renderRecommendations);
}
root.DaVinciAdvice={init,renderRecommendations,renderWaivers,
 /* Accessible for deterministic unit tests outside the browser. */
 lineup:(players,w)=>state?lineup(players,w):null};
})(typeof window!=='undefined'?window:globalThis);
