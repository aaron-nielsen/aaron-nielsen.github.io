/* Da Vinci Fantasy Lab — actionable, nine-slot roster decisions.
   All projected gains are recomputed against legal full-team starters.
   Yahoo ownership is read-only, never an automatic transaction. */
(function (root) {
'use strict';
const POSITIONS=['QB','RB','WR','TE','K','DEF'];
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
function inaccessible(p,w){
 const code=status(p);
 const frame=byId?.get(String(p.id||p.yahooId))?.weeks?.find(g=>Number(g.week)===Number(w));
 const conditionalReturn=Number(w)>Number(state.week)&&
  frame?.availabilityProbability!=null&&frame.availabilityProbability>=.55&&frame.state!=='bye';
 const rosterBlocked=p.slot==='IR'||p.rosterSlot==='IR'||EXCLUDED.has(code)||code.startsWith('IR-')||code.startsWith('PUP-');
 return (rosterBlocked&&!conditionalReturn)||(w<=state.week&&OUT.has(code));
}
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
 const first=Math.max(state.week,Number(state.future.startWeek));
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
  // Compare the two full lineups; a one-to-one player pairing can be wrong
  // when the optimizer moves starters between WR/RB/TE and FLEX slots.
  for(const a of additions){
   summaries.push('<div class="decision-row"><span class="decision-position">'+esc(SLOT_NAMES[a.slot])+'</span><span class="decision-main"><strong>Start '+esc(a.player.name)+'</strong></span></div>');
  }
  for(const p of removals){
   summaries.push('<div class="decision-row"><span class="decision-position">SIT</span><span class="decision-main"><strong>'+esc(p.name)+'</strong></span></div>');
  }
 }else{
  summaries.push('<div class="decision-row"><span class="decision-position">SET</span><span class="decision-main"><strong>No changes recommended</strong><small>Current starters match the top projected lineup</small></span></div>');
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
 const availableMap=new Map(state.available.players.map(p=>[String(p.id),p]));
 const pool=state.future.players.filter(p=>availableMap.has(String(p.yahooId))&&p.ownership==='available'&&POSITIONS.includes(p.position))
  // Available-player statuses from Yahoo take priority over cached projections.
  .filter(p=>{
   const live=availableMap.get(String(p.yahooId));
   const merged={...p,status:live?.status||p.injuryStatus||p.status};
   return !inaccessible(merged,weeks[0])&&!OUT.has(status(merged));
  });
 const first=Math.max(state.week,Number(state.future.startWeek));
 const rosWeeks=Array.from({length:Math.max(0,Number(state.future.endWeek)-first+1)},(_,i)=>first+i);
 const totalFor=(p,range)=>{
  const values=range.map(w=>points({id:p.yahooId},w));
  return values.length&&values.every(v=>v!=null)?values.reduce((sum,v)=>sum+v,0):null;
 };
 const totals=p=>totalFor(p,weeks);
 const ordered=pool.map(p=>({...p,id:String(p.yahooId),total:totals(p),market:availableMap.get(String(p.yahooId))?.yahooWideRosteredPercent??null}))
  .filter(p=>p.total!=null)
  .sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name));
 const bestByPosition=POSITIONS.map(pos=>{
  const list=ordered.filter(p=>p.position===pos);
  return {pos,list:list.slice(0,3)};
 });
 const dropChoices=roster.filter(p=>p.slot==='BN'&&!EXCLUDED.has(status(p))&&!OUT.has(status(p)));
 const moveCandidates=bestByPosition.flatMap(x=>x.list.slice(0,2));
 // The kicker forecast is based on the NFL offense's FG/PAT opportunities,
 // not kicker-specific accuracy. Do not recommend streaming a healthy kicker
 // for small, unvalidated week-to-week model differences.
 const needsKicker=roster.filter(p=>p.position==='K'&&p.slot!=='IR')
  .every(p=>inaccessible(p,weeks[0])||!Number.isFinite(points(p,weeks[0]))||points(p,weeks[0])===0);
 const changes=[];
 if(allReady){
  const baseTotal=baselines.reduce((n,x)=>n+x.score,0);
  for(const candidate of moveCandidates){
   if(candidate.position==='K'&&!needsKicker)continue;
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
 // Defense streaming needs a more substantial modeled edge than a skill
 // position; kicker additions are only suggested when the current K cannot
 // supply points (bye/inactive/empty), not as speculative marginal swaps.
 const shown=changes.filter(c=>c.gain/weeks.length>=
  (c.p.position==='DEF'?1.75:c.p.position==='K'?0.8:0.85)).slice(0,4);
 const highlights=shown.length?'<div class="decision-section-title">Potential upgrades</div>'+shown.map(c=>{
  const rate=c.gain/weeks.length;
  return '<div class="decision-row pickup-move"><span class="decision-position">'+esc(c.p.position)+'</span>'+
   '<span class="decision-main"><strong>Add '+esc(c.p.name)+'</strong><small>Drop '+esc(c.drop.name)+'</small></span>'+
   '<b>+'+fmt(rate)+' <small>pts/wk</small></b></div>';
 }).join(''):'';
 const label=weeks.length===1?'Week '+weeks[0]+' projection':'Total projected points for selected horizon';
 const value=v=>v==null?'—':fmt(v);
 const watch='<div class="decision-section-title">Top available by position</div>'+
  '<div class="available-position-grid">'+bestByPosition.map(({pos,list})=>
   '<section class="available-position" aria-label="Top available '+pos+'"><h3>'+pos+'</h3>'+
   '<div class="available-columns"><span>Player / next matchup</span><span>Next game</span><span>ROS total</span></div>'+
   (list.length?list.map(p=>{
    const frame=p.weeks?.find(g=>Number(g.week)>=first&&g.state!=='bye');
    const next=frame?points(p,Number(frame.week)):null;
    const live=availableMap.get(String(p.yahooId));
    const code=status({...p,status:live?.status||p.injuryStatus||p.status});
    const matchup=frame?.opponent?(frame.home?'vs ':'@ ')+frame.opponent:'Schedule unavailable';
    const note=(frame?'W'+frame.week+' · ':'')+matchup+(code?' · '+code:'');
    return '<div class="decision-row pickup-watch"><span class="decision-position">'+pos+'</span>'+
     '<span class="decision-main"><strong>'+esc(p.name)+'</strong><small>'+esc(p.nflTeam||'')+' · '+esc(note)+'</small></span>'+
     '<b>'+value(next)+'</b><b>'+value(totalFor(p,rosWeeks))+'</b></div>';
   }).join(''):'<div class="decision-empty">No eligible modeled players.</div>')+'</section>'
  ).join('')+'</div>';
 const notice='<p class="available-notice">Next game skips byes. ROS is the total for Weeks '+first+'–'+state.future.endWeek+', including the current week and zero for byes. Estimates assume participation except explicit availability adjustments; check injuries and Yahoo waiver status. Missing forecasts show —. K/DEF projections are experimental.</p>';
 rootEl.innerHTML=highlights+watch+notice+(!allReady?'<p class="available-notice">Pickup gains unavailable: a complete baseline lineup could not be projected.</p>':'');
 rootEl.setAttribute('aria-label','Roster pickup advice, ranked by '+label);

}
function init(data){
 state=data;
 const first=Math.max(state.week,Number(state.future.startWeek));
 const last=Number(state.future.endWeek)||17;
 const selector=$('waiverHorizon');
 if(selector){
  const modes=[['next_week','Week '+first],
   ['four_weeks','Weeks '+first+'–'+Math.min(last,first+3)],
   ['rest_of_season','Rest of season · Weeks '+first+'–'+last]];
  for(const [value,label] of modes){const option=Array.from(selector.options||[]).find(o=>o.value===value);if(option)option.textContent=label;}
 }
 byId=new Map(state.future.players.map(p=>[String(p.yahooId),p]));
 renderRecommendations();renderWaivers();
 $('lineupWeek')?.addEventListener('change',renderRecommendations);
}
root.DaVinciAdvice={init,renderRecommendations,renderWaivers,
 /* Accessible for deterministic unit tests outside the browser. */
 lineup:(players,w)=>state?lineup(players,w):null};
})(typeof window!=='undefined'?window:globalThis);
