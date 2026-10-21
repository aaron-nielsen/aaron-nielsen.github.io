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
const $=id=>typeof document==='undefined'?null:document.getElementById(id);
let state=null, byId=null;
function status(p){return String(p.status||p.injuryStatus||'').toUpperCase().trim();}
function inaccessible(p,w){
 const code=status(p);
 const frame=byId?.get(String(p.id||p.yahooId))?.weeks?.find(g=>Number(g.week)===Number(w));
 const conditionalReturn=Number(w)>Number(state.week)&&
  frame?.availabilityProbability!=null&&frame.availabilityProbability>=.55&&frame.state!=='bye';
 const rosterBlocked=p.slot==='IR'||p.rosterSlot==='IR'||EXCLUDED.has(code)||code.startsWith('IR-')||code.startsWith('PUP-');
 // A dated OUT/doubtful designation cannot silently become a healthy future
 // starter. Only an explicit availability-adjusted return window may do that.
 return (rosterBlocked&&!conditionalReturn)||(OUT.has(code)&&!conditionalReturn);
}
function points(p,w){
 const f=byId.get(String(p.id||p.yahooId));
 const frame=f?.weeks?.find(x=>Number(x.week)===w);
 if(!frame)return null;
 if(frame.state==='bye')return 0;
 return frame.points==null||!Number.isFinite(Number(frame.points))?null:Number(frame.points);
}
function lineup(players,w,allowEmpty=false){
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
 if(dp[511]||!allowEmpty)return dp[511];
 const occupied=n=>n.toString(2).replaceAll('0','').length;
 return dp.map((value,mask)=>({value,mask})).filter(x=>x.value).sort((a,b)=>occupied(b.mask)-occupied(a.mask)||b.value.score-a.value.score)[0]?.value||null;
}
function mine(){return state.rosters.teams.find(t=>String(t.id)===String(state.teamId))?.players||[];}
function horizon(){
 const first=Math.max(state.recommendationWeek??state.week,Number(state.future.startWeek));
 const last=Number(state.future.endWeek)||17;
 const mode=$('waiverHorizon')?.value||'next_week';
 const count=mode==='next_week'?1:mode==='four_weeks'?4:last-first+1;
 return Array.from({length:Math.max(0,Math.min(count,last-first+1))},(_,i)=>first+i);
}
function renderRecommendations(){
 if(!state)return;
 const target=$('lineupRecommendations');if(!target)return;
 const w=Number((state.recommendationWeek!=null?$('decisionWeek')?.value:null)||$('lineupWeek')?.value||state.week);
 const chip=$('lineupChangeWeek');if(chip)chip.textContent='WEEK '+w;
 const roster=mine(),original=roster.filter(p=>!['BN','IR'].includes(p.slot));
 const best=lineup(roster,w);
 if(best)for(const pos of ['K','DEF']){
  const starter=original.find(p=>p.position===pos),chosen=best.selections.find(s=>s.player.position===pos);
  const currentPoints=starter&&!inaccessible(starter,w)?points(starter,w):null;
  const edge=chosen&&currentPoints!=null?chosen.points-currentPoints:null;
  if(starter&&chosen&&String(starter.id)!==String(chosen.player.id)&&currentPoints>0&&edge>=0&&edge<0.5){best.score-=edge;chosen.player=starter;chosen.points=currentPoints;}
 }
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
  summaries.push('<div class="decision-row lineup-set"><span class="decision-main"><strong>No changes recommended</strong></span></div>');
 }
 const flagText=statusFlags.length?'<div class="decision-alert">Check status: '+statusFlags.map(p=>esc(p.name)+' ('+esc(status(p))+')').join(', ')+'</div>':'';
 target.innerHTML=(gain!=null && additions.length?'<div class="decision-result">Optimized lineup <strong>+'+fmt(gain)+' pts</strong></div>':'')+
  '<div class="decision-list">'+summaries.join('')+'</div>'+flagText+nextWeekActions();
}
function nextWeekActions(){
 if(Number($('decisionWeek')?.value||state.week)>Number(state.week))return '';
 const w=Number(state.week)+1;if(w>Number(state.future.endWeek))return '';
 const roster=mine(),notes=[];
 for(const pos of ['QB','RB','WR','TE','K','DEF']){
  const needed={QB:1,RB:2,WR:2,TE:1,K:1,DEF:1}[pos];
  const eligible=roster.filter(p=>p.position===pos&&!inaccessible(p,w)&&points(p,w)!=null&&points(p,w)>0);
  if(eligible.length>=needed)continue;
  const pool=state.future.players.filter(p=>p.position===pos&&p.ownership==='available'&&state.available.players.some(a=>String(a.id)===String(p.yahooId))&&!inaccessible(p,w)&&points(p,w)>0).sort((a,b)=>points(b,w)-points(a,w));
  const name=pool[0]?.name;
  notes.push('<div class="next-week-action"><strong>'+(pos==='K'?'Add a kicker':pos==='DEF'?'Add a defense':'Find '+pos+' coverage')+'</strong><span>'+esc(name?'Consider '+name:'No eligible modeled pickup found')+'</span></div>');
 }
 return notes.length?'<section class="next-week-actions"><h3>Next week · W'+w+'</h3>'+notes.join('')+'</section>':'';
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
 const first=Math.max(state.recommendationWeek??state.week,Number(state.future.startWeek));
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
 const shown=changes.filter(c=>c.gain/weeks.length>=(['K','DEF'].includes(c.p.position)?0.5:0.85)).slice(0,4);
 const highlights=shown.length?'<div class="decision-section-title">Potential upgrades</div>'+shown.map(c=>{
  const rate=c.gain/weeks.length;
  return '<div class="decision-row pickup-move"><span class="decision-position">'+esc(c.p.position)+'</span>'+
   '<span class="decision-main"><strong>Add '+esc(c.p.name)+'</strong><small>Drop '+esc(c.drop.name)+'</small></span>'+
   '<b>+'+fmt(rate)+' <small>pts/wk</small></b></div>';
 }).join(''):'<div class="decision-empty">No projected lineup upgrades.</div>';
 const label=weeks.length===1?'Week '+weeks[0]+' projection':'Total projected points for selected horizon';
 const value=v=>v==null?'—':fmt(v);
 const watch=''+
  '<div class="available-position-grid">'+bestByPosition.map(({pos,list})=>
   '<section class="available-position" aria-label="Top available '+pos+'"><h3>'+pos+'</h3>'+
   '<div class="available-columns"><span>Player / next matchup</span><span>'+(['K','DEF'].includes(pos)?'Next / gain':'Next game')+'</span><span>ROS total</span></div>'+
   (list.length?list.map(p=>{
    const frame=p.weeks?.find(g=>Number(g.week)>=first&&g.state!=='bye');
    const next=frame?points(p,Number(frame.week)):null;
    const live=availableMap.get(String(p.yahooId));
    const code=status({...p,status:live?.status||p.injuryStatus||p.status});
    const matchup=frame?.opponent?(frame.home?'vs ':'@ ')+frame.opponent:'Schedule unavailable';
    const note=(frame?'W'+frame.week+' · ':'')+matchup+(code?' · '+code:'');
    const ownedScores=frame?roster.filter(r=>r.position===pos&&!inaccessible(r,Number(frame.week))).map(r=>points(r,Number(frame.week))).filter(v=>v!=null):[];
    const edge=['K','DEF'].includes(pos)&&next!=null&&ownedScores.length?next-Math.max(...ownedScores):null;
    const edgeText=edge==null?'':'<small class="streaming-gain" title="Projected gain versus your best owned '+pos+'">('+(edge>=0?'+':'')+fmt(edge)+')</small>';
    return '<div class="decision-row pickup-watch"><span class="decision-position">'+pos+'</span>'+
     '<span class="decision-main"><strong>'+(root.DaVinciPlayerDetail?.link(p)||esc(p.name))+'</strong><small>'+esc(p.nflTeam||'')+' · '+esc(note)+'</small></span>'+
     '<b>'+value(next)+edgeText+'</b><b>'+value(totalFor(p,rosWeeks))+'</b></div>';
   }).join(''):'<div class="decision-empty">No eligible modeled players.</div>')+'</section>'
  ).join('')+'</div>';
 const notice='<details class="projection-details"><summary>Projection details</summary><p>Next game skips byes. ROS is the total for Weeks '+first+'–'+state.future.endWeek+', including the current week and zero for byes. Estimates assume participation except explicit availability adjustments; check injuries and Yahoo waiver status. Missing forecasts show —. K/DEF projections are experimental.</p></details>';
 const research=state.pickupResearch;
 const researched=research&&Number(research.week)===Number(weeks[0])&&String(research.teamId)===String(state.teamId)?research.players.map(r=>({research:r,player:availableMap.get(String(r.id))})).filter(r=>r.player&&!roster.some(p=>String(p.id)===String(r.player.id))&&!OUT.has(status(r.player))&&!EXCLUDED.has(status(r.player))):[];
 const shortlist=researched.length?'<section class="pickup-shortlist" aria-label="Pickup shortlist"><h3>Consider adding</h3>'+researched.map(({research:r,player:p})=>'<article class="pickup-shortlist-row"><strong>'+(root.DaVinciPlayerDetail?.link(p)||esc(p.name))+' <small>'+esc(p.position)+'</small></strong><span>'+esc(r.reason)+'</span><a href="'+esc(r.source)+'" target="_blank" rel="noopener">Report</a></article>').join('')+'<p>'+esc(research.rosterMove)+'</p><small>Reviewed '+esc(research.reviewedAt)+' · Bench additions, separate from projected starter gains</small></section>':'';
 rootEl.innerHTML=shortlist+highlights+watch+notice+(!allReady?'<p class="available-notice">Pickup gains unavailable: a complete baseline lineup could not be projected.</p>':'');
 rootEl.setAttribute('aria-label','Roster pickup advice, ranked by '+label);

}
function init(data){
 state=data;
 const first=Math.max(state.recommendationWeek??state.week,Number(state.future.startWeek));
 const last=Number(state.future.endWeek)||17;
 const decision=$('decisionWeek');
 if(decision&&state.recommendationWeek!=null){decision.innerHTML=Array.from({length:last-Number(state.week)+1},(_,i)=>'<option value="'+(Number(state.week)+i)+'">Week '+(Number(state.week)+i)+'</option>').join('');decision.value=String(first);decision.addEventListener('change',renderRecommendations);}
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
 partialLineup:(players,w)=>state?lineup(players,w,true):null,
 lineup:(players,w)=>state?lineup(players,w):null};
})(typeof window!=='undefined'?window:globalThis);
