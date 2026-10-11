/* Personalized trade preferences and full nine-starter trade simulation. */
(function(root){
'use strict';
const POSITION_ORDER={QB:0,RB:1,WR:2,TE:3,K:4,DEF:5};
const POSITIONS=new Set(Object.keys(POSITION_ORDER));
const BLOCK=new Set(['IR','IR-R','NA','N/A','PUP','PUP-R','NFI','NFI-R','CEL','SUSP','SUS']);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=id=>document.getElementById(id);
const fmt=v=>Number(v).toFixed(1);
const MIN_ROS_GAIN_PER_WEEK=.5; // For EACH fantasy manager, not just the requester.
const id=p=>String(p.id||p.yahooId);
let state=null, selectedOut=new Set(),selectedIn=new Set(),nextJob=0, oldFallback=null;
const status=p=>String(p.status||p.injuryStatus||'').toUpperCase();
const eligible=p=>{
 const forecast=state?.futureMap?.get(id(p));
 const futureReturn=forecast?.returnOutlook&&starts().some(w=>
  forecast.weeks?.some(g=>Number(g.week)===w&&g.availabilityProbability>=.55&&g.state!=='bye'));
 return POSITIONS.has(p.position)&&
  ((p.slot!=='IR'&&!BLOCK.has(status(p))&&!status(p).startsWith('IR-'))||Boolean(futureReturn));
};
function playerPts(p,weeks){
 const f=state.futureMap.get(id(p));
 if(!f)return null;
 let sum=0,known=0;
 for(const w of weeks){
  const game=f.weeks?.find(x=>Number(x.week)===w);
  if(!game||game.points==null)continue;
  sum+=Number(game.points)||0;known++;
 }
 return known===weeks.length?sum:null;
}
function starts(){
 const week=Number($('tradeFromWeek')?.value||6);
 const end=Number(state.future.endWeek||17);
 return Array.from({length:Math.max(0,end-week+1)},(_,i)=>week+i);
}
function partnerFilter(){return $('tradePartner')?.value||'all';}
function possible(people){return people.filter(eligible).filter(p=>playerPts(p,starts())!==null);}
function combinations(arr,n){
 const result=[];
 function walk(index,current){
  if(current.length===n){result.push(current.slice());return;}
  for(let i=index;i<arr.length-(n-current.length)+1;i++){
   current.push(arr[i]);walk(i+1,current);current.pop();
  }
 }
 walk(0,[]);return result;
}
function packages(players,selected,limit){
 const weeks=starts();
 const ranked=possible(players).sort((a,b)=>playerPts(b,weeks)-playerPts(a,weeks));
 const chosen=ranked.filter(p=>selected.has(id(p)));
 const pool=[...chosen,...ranked.filter(p=>!selected.has(id(p))).slice(0,limit)];
 const result=[];
 for(let n=1;n<=Math.min(3,pool.length);n++){
  for(const ps of combinations(pool,n)){
   if(selected.size&&!ps.some(p=>selected.has(id(p))))continue;
   result.push({players:ps,count:n,raw:ps.reduce((sum,p)=>sum+playerPts(p,weeks),0),key:ps.map(id).sort().join('.')});
  }
 }
 return result;
}
function groupsBySize(packages){
 const grouped={1:[],2:[],3:[]};
 packages.forEach(p=>grouped[p.count].push(p));return grouped;
}
function shape(offer){return offer.send.players.length+'-for-'+offer.receive.players.length;}
function getCandidates(){
 const teams=state.rosters.teams,own=teams.find(t=>String(t.id)===String(state.teamId));
 const outgoing=groupsBySize(packages(own.players,selectedOut,8));
 const peers=teams.filter(t=>String(t.id)!==String(state.teamId)&&
  (partnerFilter()==='all'||String(t.id)===String(partnerFilter()))&&
  (!selectedIn.size||t.players.some(p=>selectedIn.has(id(p)))));
 const proposals=[];
 for(const other of peers){
  const inbound=groupsBySize(packages(other.players,selectedIn,9));
  const shortlist=[];
  const mode=$('tradePackageFilter')?.value||'balanced';
  const sizes=mode==='three_each'?[3]:mode==='balanced'?[2,3]:[1,2,3];
  for(const n of sizes){
   for(const r of sizes){
    if(mode!=='all'&&mode!=='unequal'&&!mode.includes('_for_')&&n!==r)continue;
    if(mode==='unequal'&&n===r)continue;
    if(mode.includes('_for_')&&mode!==n+'_for_'+r)continue;
   for(const send of outgoing[n]){
    for(const receive of inbound[r]){
     const position=$('tradePosition')?.value||'all';
     if(!selectedIn.size&&position!=='all'&&position!=='offense_no_qb'&&!receive.players.some(p=>p.position===position))continue;
     if(!selectedIn.size&&position==='offense_no_qb'&&receive.players.some(p=>!['RB','WR','TE'].includes(p.position)))continue;
     // Compare modeled rest-of-season value before more costly legal-lineup simulation.
     const gap=Math.abs(send.raw-receive.raw)/Math.max(12,send.raw,receive.raw);
     shortlist.push({partner:other,send,receive,gap,shape:n+'-for-'+r,
      balance:Math.abs(send.raw-receive.raw),key:other.id+'/'+send.key+'/'+receive.key});
    }
   }
  }
  }
  shortlist.sort((a,b)=>a.gap-b.gap||a.balance-b.balance);
  // Retain variety of packages and targets rather than only near-identical deals.
  const retained=[], seen=new Set(),byShape={};
  for(const item of shortlist){
   const n=item.shape;
   if(item.gap>.5||(byShape[n]||0)>=5)continue;
   const shortKey=item.shape+'/'+item.receive.players.map(x=>x.position).sort().join('-')+'/'+item.send.key;
   if(seen.has(shortKey))continue;
   seen.add(shortKey);byShape[n]=(byShape[n]||0)+1;
   retained.push(item);
  }
  proposals.push(...retained);
 }
 const counts={};
 return proposals.sort((a,b)=>a.gap-b.gap).filter(c=>{counts[c.shape]=(counts[c.shape]||0)+1;return counts[c.shape]<=20;}).slice(0,180);
}
// Balance roster capacity before measuring any unequal offer; expose these assumptions.
function repairRoster(players,original,protectedIds,weeks){
 const notes=[];let roster=players.slice();
 const value=p=>playerPts(p,weeks)??-1;
 while(roster.length>original.length){
  const choices=roster.filter(p=>!protectedIds.has(id(p))).sort((a,b)=>value(a)-value(b));
  const drop=choices.find(p=>weeks.every(w=>state.optimize(roster.filter(x=>id(x)!==id(p)),w)));
  if(!drop)return null;
  roster=roster.filter(p=>id(p)!==id(drop));notes.push('Drop '+drop.name+' ('+drop.position+')');
 }
 while(roster.length<original.length){
  const owned=new Set(state.rosters.teams.flatMap(t=>t.players.map(id)).concat(roster.map(id)));
  const pool=possible(state.available?.players||[]).filter(p=>!owned.has(id(p))).sort((a,b)=>value(b)-value(a));
  const add=pool.find(p=>weeks.every(w=>state.optimize(roster.concat({...p,slot:'BN'}),w)))||pool[0];
  if(!add)return null;
  roster.push({...add,slot:'BN'});notes.push('Add '+add.name+' ('+add.position+')');
 }
 return {players:roster,notes};
}
function evaluateOffer(c,original,baseline,weeks){
 const your=original;
 const theirs=c.partner.players;
 const sending=new Set(c.send.players.map(id)),receiving=new Set(c.receive.players.map(id));
 const yourAfter=your.filter(p=>!sending.has(id(p))).concat(c.receive.players.map(p=>({...p,slot:'BN'})));
 const theirAfter=theirs.filter(p=>!receiving.has(id(p))).concat(c.send.players.map(p=>({...p,slot:'BN'})));
 const yours=repairRoster(yourAfter,your,receiving,weeks),theirsFixed=repairRoster(theirAfter,theirs,sending,weeks);
 if(!yours||!theirsFixed)return null;
 let gainYou=0,gainThem=0;
 for(let i=0;i<weeks.length;i++){
  const you=state.optimize(yours.players,weeks[i]);
  const them=state.optimize(theirsFixed.players,weeks[i]);
  if(!you||!them||!baseline.you[i]||!baseline.peers.get(c.partner.id)?.[i])return null;
  gainYou+=you.score-baseline.you[i].score;
  gainThem+=them.score-baseline.peers.get(c.partner.id)[i].score;
 }
 const beforeYou=baseline.you.reduce((sum,r)=>sum+r.score,0),beforeThem=baseline.peers.get(c.partner.id).reduce((sum,r)=>sum+r.score,0);
 const yahoo=yahooEvaluation(c,weeks,yours.players,theirsFixed.players);
 return {...c,yahoo,beforeYou,beforeThem,afterYou:beforeYou+gainYou,afterThem:beforeThem+gainThem,adjustments:{you:yours.notes,them:theirsFixed.notes},gainYou,gainThem,avgYou:gainYou/weeks.length,avgThem:gainThem/weeks.length};
}
function yahooEvaluation(c,weeks,yours,theirs){
 const same=(a,b)=>a.map(String).sort().join('.')===b.map(String).sort().join('.');
 const observed=state.yahooEvaluations?.evaluations?.find(e=>String(e.teamId)===String(state.teamId)&&String(e.partnerId)===String(c.partner.id)&&e.startWeek===weeks[0]&&e.endWeek===weeks.at(-1)&&same(e.send,c.send.players.map(id))&&same(e.receive,c.receive.players.map(id)));
 if(observed)return {gainYou:observed.gainYou,gainThem:observed.gainThem,source:state.yahooEvaluations.source};
 if(!state.yahooFuture?.players)return null;
 const frames=new Map(state.yahooFuture.players.map(p=>[String(p.yahooId),p]));
 const slots=[['QB'],['RB'],['RB'],['WR'],['WR'],['TE'],['RB','WR','TE'],['K'],['DEF']];
 function score(players,w){
  const dp=Array(512).fill(null);dp[0]=0;
  for(const p of players.filter(eligible)){
   const frame=frames.get(id(p))?.weeks?.find(g=>Number(g.week)===w);
   // Unknown Yahoo values must never be replaced with Da Vinci or actual points.
   if(frame?.points==null||!Number.isFinite(Number(frame.points)))return null;
   const value=Number(frame.points);
   for(let mask=511;mask>=0;mask--){if(dp[mask]==null)continue;
    for(let i=0;i<9;i++)if(!(mask&(1<<i))&&slots[i].includes(p.position)){
     const next=mask|(1<<i);dp[next]=Math.max(dp[next]??-Infinity,dp[mask]+value);
    }
   }
  }
  return dp[511];
 }
 let gainYou=0,gainThem=0;
 const mine=state.rosters.teams.find(t=>String(t.id)===String(state.teamId));
 for(const w of weeks){
  const totals=[score(mine.players,w),score(c.partner.players,w),score(yours,w),score(theirs,w)];
  if(totals.some(v=>v==null))return null;
  gainYou+=totals[2]-totals[0];gainThem+=totals[3]-totals[1];
 }
 return {gainYou,gainThem,source:state.yahooFuture.source||'Yahoo player projections'};
}
function evaluate(){
 const weeks=starts(),mine=state.rosters.teams.find(t=>String(t.id)===String(state.teamId));
 if(!weeks.length)return [];
 const candidates=getCandidates();
 if(!candidates.length)return [];
 const otherIds=new Set(candidates.map(x=>x.partner.id));
 const baseline={
  you:weeks.map(w=>state.optimize(mine.players,w)),
  peers:new Map(state.rosters.teams.filter(t=>otherIds.has(t.id)).map(t=>[t.id,weeks.map(w=>state.optimize(t.players,w))]))
 };
 if(baseline.you.some(x=>!x))return [];
 // A proposed trade must make BOTH nine-position projected lineups better
 // over the entire selected remainder of the season. Small noisy gains do not count.
 return candidates.map(c=>evaluateOffer(c,mine.players,baseline,weeks)).filter(Boolean)
 .filter(t=>$('tradeGoal')?.value==='edge'?t.avgYou>=MIN_ROS_GAIN_PER_WEEK&&t.yahoo?.gainThem>=0:t.avgYou>=MIN_ROS_GAIN_PER_WEEK&&t.avgThem>=MIN_ROS_GAIN_PER_WEEK)
 .sort((a,b)=>{
  // Prioritize balance: maximizing the smaller team's benefit is a better
  // starting point for a mutually acceptable offer than maximizing just ours.
  if($('tradeGoal')?.value==='edge')return b.gainYou-a.gainYou;
  const as=Math.min(a.avgYou,a.avgThem)*3+(a.avgYou+a.avgThem)*.20-a.gap*1.2;
  const bs=Math.min(b.avgYou,b.avgThem)*3+(b.avgYou+b.avgThem)*.20-b.gap*1.2;
  return bs-as;
 });
}
function resultHTML(t){
 const weeks=starts();
 const formatList=players=>players.map(p=>'<span class="trade-player-row"><span>'+esc(p.name)+' <small>('+esc(p.position)+')</small></span><b>'+((playerPts(p,weeks)==null)?'—':fmt(playerPts(p,weeks)))+'</b></span>').join('');
 const summary=(name,before,after,gain,avg)=>'<div class="trade-team-summary"><strong>'+esc(name)+'</strong><span>Lineup ROS <b>'+fmt(before)+' → '+fmt(after)+'</b></span><b class="trade-gain">'+(gain>=0?'+':'')+fmt(gain)+' pts · '+(avg>=0?'+':'')+fmt(avg)+' /wk</b></div>';
 const mine=state.rosters.teams.find(team=>String(team.id)===String(state.teamId));
 return '<article class="trade-personal-card"><div class="trade-personal-head"><strong>'+esc(t.partner.name)+'</strong><span>'+t.shape+'</span></div>'+
 '<div class="trade-personal-sides"><div><div class="trade-list-label"><small>YOU SEND</small><small>ROS PTS</small></div>'+formatList(t.send.players)+summary(mine?.name||'Your team',t.beforeYou,t.afterYou,t.gainYou,t.avgYou)+'</div><div><div class="trade-list-label"><small>YOU RECEIVE</small><small>ROS PTS</small></div>'+formatList(t.receive.players)+summary(t.partner.name,t.beforeThem,t.afterThem,t.gainThem,t.avgThem)+'</div></div>'
 +(t.yahoo?'<div class="trade-yahoo-comparison" title="'+esc(t.yahoo.source)+'">Yahoo ROS · You '+(t.yahoo.gainYou>=0?'+':'')+fmt(t.yahoo.gainYou)+' · Theirs '+(t.yahoo.gainThem>=0?'+':'')+fmt(t.yahoo.gainThem)+'</div>':'')+((t.adjustments.you.length||t.adjustments.them.length)?'<details><summary>Roster moves assumed</summary><p>'+esc(['You: '+t.adjustments.you.join('; '),t.partner.name+': '+t.adjustments.them.join('; ')].join(' · '))+'</p></details>':'')+'</article>';
}
function render(){
 const target=$('tradeResults');if(!target||!state)return;
 const job=++nextJob;
 target.innerHTML='<div class="trade-personal-loading">Evaluating roster-fit trades…</div>';
 // Defer lineup calculations until the loading row paints; ignore outdated requests.
 const run=()=>{
  if(job!==nextJob)return;
  let options=[];
  try{options=evaluate()}catch(error){target.innerHTML='<div class="trade-personal-loading">Could not calculate these packages.</div>';return;}
  if(job!==nextJob)return;
  const shape=$('tradePackageFilter')?.value;
  if(['one_each','two_each','three_each'].includes(shape)){const n={one_each:1,two_each:2,three_each:3}[shape];options=options.filter(t=>t.send.players.length===n&&t.receive.players.length===n);}
  const shown=options.slice(0,Number($('tradeLimit')?.value||6));
  if(!shown.length){
   if($('tradeGoal')?.value==='edge'){target.innerHTML='<div class="trade-personal-loading">No Yahoo-verified matches. Flaim currently supplies team totals, but not the player projections needed to screen new trades.</div>';return;}
   target.innerHTML='<div class="trade-personal-loading">No trades here improve BOTH lineups by at least '+fmt(MIN_ROS_GAIN_PER_WEEK)+' pts/week over the rest of the season. Try another player or manager.</div>';
   return;
  }
  target.innerHTML=shown.map(resultHTML).join('');
 };
 if(typeof requestAnimationFrame==='function')requestAnimationFrame(run);else run();
}
function active(){const mode=$('tradePackageFilter')?.value||'';return selectedOut.size>0||selectedIn.size>0||mode==='all'||mode==='unequal'||mode.includes('_for_')||Boolean($('tradeGoal')?.value);}
function refresh(){
 for(const [type,selected] of [['send',selectedOut],['receive',selectedIn]]){
  const box=$('trade'+(type==='send'?'Send':'Receive')+'Box');
  const badge=$('trade'+(type==='send'?'Send':'Receive')+'Selected');
  const all=state.rosters.teams.flatMap(t=>t.players.map(p=>({...p,owner:t.name,ownerId:t.id})));
  const list=all.filter(p=>type==='send'?String(p.ownerId)===String(state.teamId):String(p.ownerId)!==String(state.teamId))
   .filter(eligible)
   .filter(p=>type==='send'||partnerFilter()==='all'||String(p.ownerId)===String(partnerFilter()))
   .sort((a,b)=>POSITION_ORDER[a.position]-POSITION_ORDER[b.position]||a.name.localeCompare(b.name));
  const query=($('trade'+(type==='send'?'Send':'Receive')+'Search')?.value||'').toLowerCase().trim();
  const filtered=list.filter(p=>!query||[p.name,p.position,p.owner].some(x=>String(x).toLowerCase().includes(query)));
  const holder=$('trade'+(type==='send'?'Send':'Receive')+'Choices');
  const previousScroll=holder.scrollTop||0;
  holder.innerHTML=filtered.slice(0,200).map(p=>'<label class="trade-player-option"><input type="checkbox" data-id="'+esc(id(p))+'" '+(selected.has(id(p))?'checked':'')+'><span><strong>'+esc(p.name)+'</strong><small>'+esc(p.position)+(type==='receive'?' · '+esc(p.owner):'')+'</small></span></label>').join('')||'<p class="trade-player-empty">No matching players</p>';
  holder.scrollTop=previousScroll;
  const chosenNames=list.filter(p=>selected.has(id(p))).map(p=>p.name);
  badge.textContent=selected.size?(selected.size+' selected'+(chosenNames.length===1?' · '+chosenNames[0]:'')):'Any';
  box.setAttribute('aria-label',selected.size+' preferred '+type+' players');
 }
}

/* Featured user-requested trade: two alternative execution windows. */
function gradeTrade(avg){
 if(!Number.isFinite(avg))return '—';
 return avg>=3?'A+':avg>=1.8?'A':avg>=.8?'B':avg>=-.15?'C':avg>=-1?'D':'F';
}

/* For a fixed unequal offer, fill vacancies by REAL lineup marginal gain,
   not raw QB totals; trim the partner's least useful expendable assets. */
function featuredRosterFix(players,original,protectedIds,weeks){
 const notes=[];let roster=players.slice();
 const total=group=>{
  let sum=0;
  for(const week of weeks){
   const lineup=state.optimize(group,week);
   if(!lineup)return null;
   sum+=lineup.score;
  }
  return sum;
 };
 while(roster.length>original.length){
  const choices=roster.filter(p=>!protectedIds.has(id(p))).map(p=>{
   const next=roster.filter(x=>id(x)!==id(p)),points=total(next);
   return points===null?null:{p,next,points,raw:playerPts(p,weeks)??0};
  }).filter(Boolean).sort((a,b)=>b.points-a.points||a.raw-b.raw);
  if(!choices.length)return null;
  roster=choices[0].next;
  notes.push('Drop '+choices[0].p.name+' ('+choices[0].p.position+')');
 }
 while(roster.length<original.length){
  const owned=new Set(state.rosters.teams.flatMap(t=>t.players.map(id)).concat(roster.map(id)));
  const count=pos=>roster.filter(p=>p.position===pos&&p.slot!=='IR').length;
  const grouped={};
  for(const p of possible(state.available?.players||[])){
   if(owned.has(id(p))||!p.nflTeam||['FA','NA','N/A','FREE','UNK'].includes(String(p.nflTeam).toUpperCase()))continue;
   if(p.position==='QB'&&count('QB')>=2)continue;
   if(['K','DEF'].includes(p.position)&&count(p.position)>=1)continue;
   (grouped[p.position]??=[]).push(p);
  }
  const shortlist=Object.values(grouped).flatMap(items=>items.sort((a,b)=>playerPts(b,weeks)-playerPts(a,weeks)).slice(0,10));
  const before=total(roster);
  const possibleAdds=shortlist.map(p=>{
   const next=roster.concat({...p,slot:'BN'}),points=total(next);
   return points===null?null:{p,next,gain:points-(before??0),raw:playerPts(p,weeks)??0};
  }).filter(Boolean).sort((a,b)=>b.gain-a.gain||b.raw-a.raw);
  if(!possibleAdds.length)return null;
  const chosen=possibleAdds[0];
  roster=chosen.next;
  notes.push('Add '+chosen.p.name+' ('+chosen.p.position+')');
 }
 return {players:roster,notes};
}
function featuredEvaluate(offer,own,weeks,beforeYou,beforeThem){
 const send=new Set(offer.send.players.map(id)),receive=new Set(offer.receive.players.map(id));
 const mine=featuredRosterFix(own.filter(p=>!send.has(id(p))).concat(offer.receive.players.map(p=>({...p,slot:'BN'}))),own,receive,weeks);
 const partner=featuredRosterFix(offer.partner.players.filter(p=>!receive.has(id(p))).concat(offer.send.players.map(p=>({...p,slot:'BN'}))),offer.partner.players,send,weeks);
 if(!mine||!partner)return null;
 let gainYou=0,gainThem=0;
 for(let i=0;i<weeks.length;i++){
  const a=state.optimize(mine.players,weeks[i]),b=state.optimize(partner.players,weeks[i]);
  if(!a||!b||!beforeYou[i]||!beforeThem[i])return null;
  gainYou+=a.score-beforeYou[i].score;
  gainThem+=b.score-beforeThem[i].score;
 }
 const beforeY=beforeYou.reduce((a,r)=>a+r.score,0),beforeT=beforeThem.reduce((a,r)=>a+r.score,0);
 return {gainYou,gainThem,avgYou:gainYou/weeks.length,avgThem:gainThem/weeks.length,
  beforeYou:beforeY,beforeThem:beforeT,afterYou:beforeY+gainYou,afterThem:beforeT+gainThem,
  adjustments:{you:mine.notes,them:partner.notes}};
}


/* An optimistic, NON-TRANSACTIONAL scenario: two players already on the
   manager's IR return to the active roster using the two openings created
   by the four-for-two exchange. Never clone or acquire those players.
   Forecast overrides are scoped to this one calculation and restored. */
function featuredGhostEvaluate(offer,own,weeks,baselineYou,baselineThem){
 const returnIds=['33991','34008'],returnSet=new Set(returnIds);
 const returnees=returnIds.map(pid=>own.find(p=>id(p)===pid));
 if(returnees.some(p=>!p)||returnees.some(p=>!['IR','BN','RB','WR'].includes(p.slot)))return null;
 const sendIds=new Set(offer.send.players.map(id));
 if(returnIds.some(pid=>sendIds.has(pid)))return null;
 const youAfter=own.filter(p=>!sendIds.has(id(p)))
  .concat(offer.receive.players.map(p=>({...p,slot:'BN'})))
  .map(p=>returnSet.has(id(p))?{...p,slot:'BN',status:null}:p);
 // These are already owned. Do not also fill the freed slots with free agents.
 const previousActive=own.filter(p=>p.slot!=='IR').length;
 const nowActive=youAfter.filter(p=>p.slot!=='IR').length;
 if(nowActive>previousActive||nowActive<9)return null;
 const saved=[];
 let youTotal=0;
 try{
  for(const pid of returnIds){
   const forecast=state.futureMap.get(pid);
   if(!forecast)return null;
   for(const frame of forecast.weeks||[]){
    if(!weeks.includes(Number(frame.week))||frame.state==='bye')continue;
    const healthy=Number(frame.conditionalPoints??frame.activePoints??frame.points);
    if(!Number.isFinite(healthy))return null;
    saved.push({frame,points:frame.points,availabilityProbability:frame.availabilityProbability,state:frame.state});
    frame.points=healthy;
    frame.availabilityProbability=1;
    frame.state='hypothetical_return';
   }
  }
  for(let i=0;i<weeks.length;i++){
   const lineup=state.optimize(youAfter,weeks[i]);
   if(!lineup||!baselineYou[i])return null;
   youTotal+=lineup.score-baselineYou[i].score;
  }
 }finally{
  for(const x of saved){
   x.frame.points=x.points;
   x.frame.availabilityProbability=x.availabilityProbability;
   x.frame.state=x.state;
  }
 }
 // Partner's roster and pickups are identical to the standard four-for-two.
 const standard=featuredEvaluate(offer,own,weeks,baselineYou,baselineThem);
 if(!standard)return null;
 return {...standard,gainYou:youTotal,avgYou:youTotal/weeks.length,
  afterYou:standard.beforeYou+youTotal,
  returnBoost:youTotal-standard.gainYou,standardGainYou:standard.gainYou,
  adjustments:{you:['Activate Breece Hall (RB) from IR','Activate Alec Pierce (WR) from IR; no free-agent additions'],them:standard.adjustments.them},
  hypothetical:true};
}

function featuredTrade(){
 const el=$('featuredTrade');if(!el||!state)return;
 if(state.leagueKey!=='csu'){el.hidden=true;return;}
 el.hidden=false;
 const mine=state.rosters.teams.find(t=>String(t.id)===String(state.teamId));
 const partner=state.rosters.teams.find(t=>String(t.id)==='1');
 const proposals=[
  {label:'Burrow + Deebo + Lloyd + Chiefs → McMillan + Herbert',out:['32671','31868','40971','100012'],in:['41793','32676']},
  {label:'Same 4-for-2 + Hall & Pierce return (hypothetical)',out:['32671','31868','40971','100012'],in:['41793','32676'],ghost:true},
  {label:'Burrow → McMillan',out:['32671'],in:['41793']},
  {label:'Burrow + Deebo → McMillan',out:['32671','31868'],in:['41793']}
 ];
 const windows=[{start:6,label:'After Week 5'},{start:7,label:'After Week 6'}];
 const signed=x=>(x>=0?'+':'')+fmt(x);
 const fmtList=xs=>xs.map(p=>'<span>'+esc(p.name)+' <small>'+esc(p.position)+'</small></span>').join('');
 const baseline=new Map();
 function lineupBaseline(start){
  if(baseline.has(start))return baseline.get(start);
  const weeks=Array.from({length:Math.max(0,Number(state.future.endWeek)-start+1)},(_,i)=>start+i);
  const yours=weeks.map(w=>state.optimize(mine.players,w));
  const theirs=weeks.map(w=>state.optimize(partner.players,w));
  const value={weeks,yours,theirs,valid:weeks.length>0&&[...yours,...theirs].every(Boolean)};
  baseline.set(start,value);return value;
 }
 function card(spec){
  const send=spec.out.map(pid=>mine?.players.find(p=>id(p)===pid));
  const receive=spec.in.map(pid=>partner?.players.find(p=>id(p)===pid));
  const shape=spec.out.length+'-for-'+spec.in.length;
  const heading='<header class="featured-trade-heading"><strong>'+esc(spec.label)+'</strong><span>'+shape+' · Blitzmaster'+(spec.ghost?' · Simulation':'')+'</span></header>';
  if(String(mine?.id)!=='7'||!partner||[...send,...receive].some(x=>!x))
   return '<section class="featured-trade-card">'+heading+'<p class="featured-trade-notice">Cannot grade using current rosters: at least one player is no longer on the specified team.</p></section>';
  const offer={partner,send:{players:send},receive:{players:receive},shape};
  const exchange='<div class="featured-trade-sides"><div><small>YOU SEND</small>'+fmtList(send)+'</div><div><small>YOU RECEIVE</small>'+fmtList(receive)+'</div></div>';
  const eachWindow=({start,label})=>{
   const base=lineupBaseline(start),weeks=base.weeks;
   if(!base.valid)return '<div class="featured-trade-window"><strong>'+label+'</strong><p>Complete legal-lineup forecasts unavailable.</p></div>';
   const t=(spec.ghost?featuredGhostEvaluate:featuredEvaluate)(offer,mine.players,weeks,base.yours,base.theirs);
   if(!t)return '<div class="featured-trade-window"><strong>'+label+'</strong><p>Cannot balance rosters with available pickups/drops. No grade.</p></div>';
   const assessment=t.avgYou>=MIN_ROS_GAIN_PER_WEEK&&t.avgThem>=MIN_ROS_GAIN_PER_WEEK?'Both teams gain':'Not mutually beneficial';
   const boost=t.hypothetical?'<p class="featured-trade-ghost-boost"><strong>Return scenario value:</strong> '+signed(t.returnBoost)+' pts compared with the normal 4-for-2 and its assumed waiver pickups. Your combined total is not the trade-only gain.</p>':'';
   return '<div class="featured-trade-window"><div class="featured-trade-window-heading"><strong>'+label+'</strong><small>Weeks '+start+'–'+weeks.at(-1)+'</small><em>'+assessment+'</em></div>'+
    '<div class="featured-trade-grades"><div><small>'+(spec.ghost?'You · combined scenario':'Ten Feline Overlords')+'</small><strong>'+gradeTrade(t.avgYou)+'</strong><span>'+signed(t.gainYou)+' ROS pts</span><small>'+signed(t.avgYou)+' pts/wk</small></div>'+
    '<div><small>Blitzmaster</small><strong>'+gradeTrade(t.avgThem)+'</strong><span>'+signed(t.gainThem)+' ROS pts</span><small>'+signed(t.avgThem)+' pts/wk</small></div></div>'+
    boost+'<details><summary>Roster assumptions and projected starters</summary><p>After roster moves: You '+fmt(t.beforeYou)+' → '+fmt(t.afterYou)+' points; Blitzmaster '+fmt(t.beforeThem)+' → '+fmt(t.afterThem)+' points.</p>'+
    '<p>You: '+esc(t.adjustments.you.join('; ')||'No adjustments')+'. Blitzmaster: '+esc(t.adjustments.them.join('; ')||'No adjustments')+'.</p></details></div>';
  };
  return '<section class="featured-trade-card">'+heading+exchange+
   '<div class="featured-trade-windows">'+windows.map(eachWindow).join('')+'</div></section>';
 }
 if(!mine||!partner){el.innerHTML='<p class="featured-trade-notice">Current CSU league rosters are unavailable.</p>';return;}
 el.innerHTML='<div class="featured-trade-suite-heading"><strong>Saved trade proposals</strong><span>Not submitted</span></div>'+
  proposals.map(card).join('')+
  '<p class="featured-trade-disclaimer">Grades use the Transactions tab projected-points-per-week scale. The Hall/Pierce simulation assumes BOTH already-owned players are healthy and activated from the first evaluated week, even if medically unavailable. Its grade includes their hypothetical return value, not just the trade. No duplicate players or additional waiver pickups are credited in that scenario. Each offer is an alternative from the current Yahoo roster, not a completed transaction or Yahoo trade evaluation.</p>';
}

function draw(){
 if(!state)return;
 const rootEl=$('tradePreferenceBuilder');
 if(!rootEl)return;
 rootEl.innerHTML='<div id="featuredTrade"></div><div class="trade-personal-grid">'+
 '<details class="trade-player-dropdown" id="tradeSendBox"><summary>Players I would trade <strong id="tradeSendSelected">Any</strong></summary><input id="tradeSendSearch" type="search" placeholder="Find my players" aria-label="Search players to trade"><div class="trade-player-options" id="tradeSendChoices"></div></details>'+
 '<details class="trade-player-dropdown" id="tradeReceiveBox"><summary>Players I want <strong id="tradeReceiveSelected">Any</strong></summary><input id="tradeReceiveSearch" type="search" placeholder="Find league targets" aria-label="Search players to receive"><div class="trade-player-options" id="tradeReceiveChoices"></div></details>'+
 '</div><div class="trade-preference-footer"><button id="tradePreferenceClear" type="button">Clear choices</button></div>';
 for(const [type,set] of [['Send',selectedOut],['Receive',selectedIn]]){
  $('trade'+type+'Search').addEventListener('input',refresh);
  $('trade'+type+'Choices').addEventListener('change',event=>{
   const input=event.target;if(input?.type!=='checkbox')return;
   if(input.checked)set.add(input.dataset.id);else set.delete(input.dataset.id);
   refresh();updated();
  });
 }
 $('tradePreferenceClear').addEventListener('click',()=>{
  selectedOut.clear();selectedIn.clear();refresh();updated();
 });
 refresh();
 featuredTrade();
}
function updated(){
 if(!state)return;
 const count=$('tradeCount');if(count)count.hidden=active()||state.leagueKey==='nebraska';
 if(active())render();
 else {
  nextJob++;
  if(state.leagueKey==='nebraska'){
   $('tradeResults').innerHTML='<div class="trade-personal-loading">Choose a player to send or receive to see trade options.</div>';
  } else if(oldFallback)oldFallback();
 }
}
function init(settings){
 state={...settings,futureMap:new Map(settings.future.players.map(p=>[String(p.yahooId),p]))};
 if(!state.optimize)throw Error('Full-lineup optimizer unavailable');
 const container=$('tradePreferenceBuilder');if(!container)return;
 oldFallback=root.DaVinciLab?.rankTrades;
 draw();
 $('tradeFromWeek')?.addEventListener('change',()=>{if(active())updated()});
 $('tradePartner')?.addEventListener('change',()=>{refresh();if(active())updated()});
 $('tradePackageFilter')?.addEventListener('change',()=>{if(active())updated()});
 $('tradeLimit')?.addEventListener('change',()=>{if(active())updated()});
 $('tradeGoal')?.addEventListener('change',updated);
 $('tradePosition')?.addEventListener('change',()=>{if(active())updated()});
 updated();
}
root.DaVinciPersonalTrades={init,active,render};
})(typeof window!=='undefined'?window:globalThis);
