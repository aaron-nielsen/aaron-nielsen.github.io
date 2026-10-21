/* Personalized trade preferences and full nine-starter trade simulation. */
(function(root){
'use strict';
const POSITION_ORDER={QB:0,RB:1,WR:2,TE:3,K:4,DEF:5};
const POSITIONS=new Set(Object.keys(POSITION_ORDER));
const BLOCK=new Set(['IR','IR-R','NA','N/A','PUP','PUP-R','NFI','NFI-R','CEL','SUSP','SUS']);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=id=>typeof document==='undefined'?null:document.getElementById(id);
let searchControls=null;
const control=id=>searchControls?searchControls[id]:$(id)?.value;
const fmt=v=>Number(v).toFixed(1);
const MIN_ROS_GAIN_PER_WEEK=.5; // For EACH fantasy manager, not just the requester.
const id=p=>String(p.id||p.yahooId);
let searchWorker=null,workerSettings=null,resultCache=new Map();
let state=null, selectedOut=new Set(),selectedIn=new Set(),nextJob=0, oldFallback=null,searchStats=null,lineupCache=new Map(),fitCache=new Map();
const status=p=>String(p.status||p.injuryStatus||'').toUpperCase();
const eligible=p=>{
 // User preference: Hall cannot be offered while his current injury persists.
 if(id(p)==='33991'&&['O','OUT','Q','QUESTIONABLE','D','DOUBTFUL','IR','IR-R','PUP'].includes(status(p)))return false;
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
 const week=Number(control('tradeFromWeek')||6);
 const end=Number(state.future.endWeek||17);
 return Array.from({length:Math.max(0,end-week+1)},(_,i)=>week+i);
}
function partnerFilter(){return control('tradePartner')||'all';}
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
function packages(players,selected,limit,priority){
 const weeks=starts();
 const ranked=possible(players).sort((a,b)=>(priority?priority(b)-priority(a):0)||playerPts(b,weeks)-playerPts(a,weeks));
 const chosen=ranked.filter(p=>selected.has(id(p)));
 const pool=[...chosen,...ranked.filter(p=>!selected.has(id(p))).slice(0,limit)];
 const result=[];
 for(let n=1;n<=Math.min(3,pool.length);n++){
  for(const ps of combinations(pool,n)){
   if(selected.size&&!ps.some(p=>selected.has(id(p))))continue;
   result.push({players:ps,count:n,core:ps.filter(p=>!['K','DEF'].includes(p.position)).reduce((sum,p)=>sum+playerPts(p,weeks),0),raw:ps.reduce((sum,p)=>sum+playerPts(p,weeks),0),key:ps.map(id).sort().join('.')});
  }
 }
 return result;
}
function groupsBySize(packages){
 const grouped={1:[],2:[],3:[]};
 packages.forEach(p=>grouped[p.count].push(p));return grouped;
}
function shape(offer){return offer.send.players.length+'-for-'+offer.receive.players.length;}
function rejectedOffer(teamId,send,receive){
 const notes=state.negotiations;if(!notes||notes.leagueKey!==state.leagueKey)return false;
 const names=xs=>xs.map(x=>String(typeof x==='string'?x:x.name).toLowerCase().replace(/[^a-z0-9]/g,'')).sort().join('|');
 return (notes.rejectedOffers||[]).some(r=>String(r.teamId)===String(teamId)&&names(r.send)===names(send)&&names(r.receive)===names(receive));
}
function requestedTargetCandidates(own,peers){
 const request=state.leagueKey===state.negotiations?.leagueKey?state.negotiations?.targetSearch:null;
 if(!request)return [];
 const partner=peers.find(t=>String(t.id)===String(request.partnerId));
 const target=partner?.players.find(p=>id(p)===String(request.targetId));
 const anchor=own.players.find(p=>id(p)===String(request.anchorId));
 const bonus=own.players.find(p=>id(p)===String(request.bonusId));
 if(!partner||!target||!anchor||!eligible(anchor)||!eligible(target))return [];
 const weeks=starts(),mode=control('tradePackageFilter');
 const healthy=p=>eligible(p)&&p.slot!=='IR'&&!BLOCK.has(status(p))&&!['O','OUT','D','DOUBTFUL'].includes(status(p));
 const companions=own.players.filter(p=>request.companionPositions.includes(p.position)&&healthy(p));
 const depth=partner.players.filter(p=>p.slot==='BN'&&['TE','WR'].includes(p.position)&&healthy(p)).sort((a,b)=>playerPts(a,weeks)-playerPts(b,weeks)).slice(0,2);
 const pack=players=>({players,count:players.length,key:players.map(id).sort().join('.'),raw:players.reduce((n,p)=>n+(playerPts(p,weeks)||0),0)});
 const results=[];
 for(const companion of companions)for(const extra of [false,true])for(const returnPlayer of [null,...depth]){
  if(extra&&!bonus)continue;
  const send=[anchor,companion,...(extra?[bonus]:[])],receive=[target,...(returnPlayer?[returnPlayer]:[])];
  const n=send.length,r=receive.length;
  const position=control('tradePosition')||'all';
  if(!selectedIn.size&&!['all','offense_no_qb'].includes(position)&&!receive.some(p=>p.position===position))continue;
  if(selectedOut.size&&!send.some(p=>selectedOut.has(id(p)))||selectedIn.size&&!receive.some(p=>selectedIn.has(id(p))))continue;
  if(['one_each','two_each','three_each'].includes(mode)&&(n!==r||n!=={one_each:1,two_each:2,three_each:3}[mode]))continue;
  if(mode?.includes('_for_')&&mode!==n+'_for_'+r||mode==='unequal'&&n===r||mode==='balanced'&&(n!==r||n===1)||mode==='balanced_all'&&n!==r)continue;
  if(rejectedOffer(partner.id,send,receive))continue;
  // Explicitly requested two-player core plus a defense can use 3-for-1.
  results.push({partner,send:pack(send),receive:pack(receive),gap:0,bonuses:extra?1:0,requestedTarget:true,shape:n+'-for-'+r,key:partner.id+'/'+pack(send).key+'/'+pack(receive).key});
 }
 return results;
}
function getCandidates(){
 const teams=state.rosters.teams,own=teams.find(t=>String(t.id)===String(state.teamId));
 const peers=teams.filter(t=>String(t.id)!==String(state.teamId)&&
  (partnerFilter()==='all'||String(t.id)===String(partnerFilter()))&&
  (!selectedIn.size||t.players.some(p=>selectedIn.has(id(p)))));
 const proposals=[];
 for(const other of peers){
  const weeks=starts();
  const edge=control('tradeGoal')==='edge';
  const premium=(owner,recipient,p)=>{
   const loss=state.yahooModel?.marginal(owner.players,p,weeks).lossIfRemoved;
   const gain=state.yahooModel?.marginal(recipient.players,p,weeks).gainIfAdded;
   const dv=edge?daVinciMarginal(own,p,weeks,String(owner.id)===String(own.id)):null;
   return Number.isFinite(loss)&&Number.isFinite(gain)?(edge&&Number.isFinite(dv)?String(owner.id)===String(own.id)?gain-dv:dv-loss:gain-loss):0;
  };
  const outgoing=groupsBySize(packages(own.players,selectedOut,12,p=>premium(own,other,p)));
  const inbound=groupsBySize(packages(other.players,selectedIn,12,p=>premium(other,own,p)));
  const positiveTarget=p=>{
   if(!state.yahooModel||['K','DEF'].includes(p.position))return false;
   const gain=state.yahooModel.marginal(own.players,p,weeks).gainIfAdded,loss=state.yahooModel.marginal(other.players,p,weeks).lossIfRemoved;
   return Number.isFinite(gain)&&Number.isFinite(loss)&&gain-loss>0;
  };
  const positiveTargets=new Set(other.players.filter(positiveTarget).map(id));
  const positiveSends=new Set(own.players.filter(p=>{
   if(!state.yahooModel||['K','DEF'].includes(p.position))return false;
   const gain=state.yahooModel.marginal(other.players,p,weeks).gainIfAdded,loss=state.yahooModel.marginal(own.players,p,weeks).lossIfRemoved;
   return Number.isFinite(gain)&&Number.isFinite(loss)&&gain>loss;
  }).map(id));
  if(control('tradeGoal')==='arbitrage'&&!positiveTargets.size&&!positiveSends.size)continue;
  const summarize=(pack,owner,recipient)=>{
   const values=pack.players.map(p=>({loss:state.yahooModel?.marginal(owner.players,p,weeks).lossIfRemoved,gain:state.yahooModel?.marginal(recipient.players,p,weeks).gainIfAdded,dv:edge?daVinciMarginal(own,p,weeks,String(owner.id)===String(own.id)):null}));
   if(values.some(v=>!Number.isFinite(v.loss)||!Number.isFinite(v.gain)))return null;
   return {loss:values.reduce((n,v)=>n+v.loss,0),gain:values.reduce((n,v)=>n+v.gain,0),dv:edge&&values.every(v=>Number.isFinite(v.dv))?values.reduce((n,v)=>n+v.dv,0):null};
  };
  for(const group of Object.values(outgoing))for(const p of group)p.fitValues=summarize(p,own,other);
  for(const group of Object.values(inbound))for(const p of group)p.fitValues=summarize(p,other,own);
  const shortlist=[];
  const mode=control('tradePackageFilter')||'balanced';
  const sizes=({one_each:[1],two_each:[2],three_each:[3],balanced:[2,3]})[mode]||[1,2,3];
  for(const n of sizes){
   for(const r of sizes){
    if(mode!=='all'&&mode!=='practical'&&mode!=='unequal'&&!mode.includes('_for_')&&n!==r)continue;
    if(mode==='practical'&&(n===3&&r===1||n===1&&r===3||n===3&&r===3))continue;
    if(mode==='unequal'&&n===r)continue;
    if(mode.includes('_for_')&&mode!==n+'_for_'+r)continue;
   for(const send of outgoing[n]){
    for(const receive of inbound[r]){
     if(control('tradeGoal')==='arbitrage'&&!receive.players.some(p=>positiveTargets.has(id(p)))&&!send.players.some(p=>positiveSends.has(id(p))))continue;
     if(receive.players.some(p=>['RB','WR','TE','QB'].includes(p.position))&&send.players.filter(p=>['K','DEF'].includes(p.position)).length>1)continue;
     if(rejectedOffer(other.id,send.players,receive.players))continue;
     const notes=state.negotiations;
     if(notes&&notes.leagueKey===state.leagueKey&&String(notes.teamId)===String(other.id)&&send.players.some(p=>notes.avoidOfferingPositions?.includes(p.position)))continue;
     const position=control('tradePosition')||'all';
     if(!selectedIn.size&&position!=='all'&&position!=='offense_no_qb'&&!receive.players.some(p=>p.position===position))continue;
     if(!selectedIn.size&&position==='offense_no_qb'&&receive.players.some(p=>!['RB','WR','TE'].includes(p.position)))continue;
     // K/DEF are throw-ins: their season totals cannot buy an offensive asset.
     const sendCore=send.core,receiveCore=receive.core;
     if((sendCore===0)!==(receiveCore===0))continue;
     const fairSend=sendCore||send.raw,fairReceive=receiveCore||receive.raw;
     const gap=Math.abs(fairSend-fairReceive)/Math.max(12,fairSend,fairReceive);
     const a=send.fitValues,b=receive.fitValues;
     const fit=a&&b?{you:b.gain-a.loss,them:a.gain-b.loss,dvYou:Number.isFinite(a.dv)&&Number.isFinite(b.dv)?b.dv-a.dv:null}:null;
     const screenYou=edge&&Number.isFinite(fit?.dvYou)?fit.dvYou:fit?.you;
     shortlist.push({partner:other,send,receive,gap,fit,fitScore:fit?Math.min(screenYou,fit.them)*3+(screenYou+fit.them)*.2:null,bonuses:send.players.filter(p=>['K','DEF'].includes(p.position)).length,shape:n+'-for-'+r,
      balance:Math.abs(send.raw-receive.raw),key:other.id+'/'+send.key+'/'+receive.key});
    }
   }
  }
  }
  shortlist.sort((a,b)=>(b.fitScore??-Infinity)-(a.fitScore??-Infinity)||a.gap-b.gap||a.bonuses-b.bonuses||a.balance-b.balance);
  // Retain variety of packages and targets rather than only near-identical deals.
  const retained=[], seen=new Set(),byShape={},byTarget={},byReturn={};
  const arbitrageMode=control('tradeGoal')==='arbitrage',shapeLimit=arbitrageMode?24:12;
  for(const item of shortlist){
   const n=item.shape;
   if((item.gap>.65&&!(item.fit&&(edge?item.fit.dvYou:item.fit.you)>0&&item.fit.them>0))||(byShape[n]||0)>=shapeLimit)continue;
   const anchor=item.receive.players.find(p=>positiveTargets.has(id(p))),targetKey=n+'/'+(anchor?id(anchor):item.receive.key),returnKey=n+'/'+item.receive.key;
   if(arbitrageMode&&((byTarget[targetKey]||0)>=8||(byReturn[returnKey]||0)>=3))continue;
   const shortKey=item.shape+'/'+item.receive.key+'/'+item.send.key;
   if(seen.has(shortKey))continue;
   seen.add(shortKey);byShape[n]=(byShape[n]||0)+1;
   byTarget[targetKey]=(byTarget[targetKey]||0)+1;byReturn[returnKey]=(byReturn[returnKey]||0)+1;
   retained.push(item);
  }
  proposals.push(...retained);
 }
 // Round-robin managers within each shape so one team cannot consume the search.
 const buckets=new Map();
 for(const c of proposals){const key=c.shape+'/'+c.partner.id;(buckets.get(key)||buckets.set(key,[]).get(key)).push(c);}
 const result=[];
 for(let i=0;i<24;i++)for(const list of buckets.values())if(list[i])result.push(list[i]);
 const observed=[];
 for(const e of state.yahooEvaluations?.evaluations||[]){
  if(String(e.teamId)!==String(state.teamId))continue;
  const partner=peers.find(t=>String(t.id)===String(e.partnerId));if(!partner)continue;
  const send=e.send.map(pid=>own.players.find(p=>id(p)===String(pid))),receive=e.receive.map(pid=>partner.players.find(p=>id(p)===String(pid)));
  if([...send,...receive].some(p=>!p)||rejectedOffer(partner.id,send,receive))continue;
  if(selectedOut.size&&!send.some(p=>selectedOut.has(id(p)))||selectedIn.size&&!receive.some(p=>selectedIn.has(id(p))))continue;
  const n=send.length,r=receive.length,mode=control('tradePackageFilter')||'balanced';
  if(n>3||r>3||mode==='practical'&&!['1-1','1-2','2-1','2-2','3-2','2-3'].includes(n+'-'+r))continue;
  if(['one_each','two_each','three_each'].includes(mode)&&(n!==r||n!=={one_each:1,two_each:2,three_each:3}[mode]))continue;
  if(mode.includes('_for_')&&mode!==n+'_for_'+r||mode==='unequal'&&n===r||mode==='balanced'&&(n!==r||n===1)||mode==='balanced_all'&&n!==r)continue;
  const position=control('tradePosition')||'all';
  if(!selectedIn.size&&position==='offense_no_qb'&&receive.some(p=>!['RB','WR','TE'].includes(p.position)))continue;
  if(!selectedIn.size&&!['all','offense_no_qb'].includes(position)&&!receive.some(p=>p.position===position))continue;
  const pack=players=>({players,count:players.length,key:players.map(id).sort().join('.'),raw:players.reduce((n,p)=>n+(playerPts(p,starts())||0),0)});
  const request=state.leagueKey===state.negotiations?.leagueKey?state.negotiations?.targetSearch:null;
  const requestedTarget=Boolean(request&&String(request.partnerId)===String(partner.id)&&send.some(p=>id(p)===String(request.anchorId))&&receive.some(p=>id(p)===String(request.targetId)));
  observed.push({partner,send:pack(send),receive:pack(receive),shape:n+'-for-'+r,gap:0,requestedTarget,bonuses:send.filter(p=>['K','DEF'].includes(p.position)).length,key:partner.id+'/'+pack(send).key+'/'+pack(receive).key});
 }
 const unique=new Map([...observed,...result,...requestedTargetCandidates(own,peers)].map(c=>[c.key,c]));
 const candidates=[...unique.values()];
 if(control('tradeGoal')==='arbitrage')return candidates.filter(c=>c.receive.players.some(p=>{
  if(!state.yahooModel||['K','DEF'].includes(p.position))return false;
  const gain=state.yahooModel.marginal(own.players,p,starts()).gainIfAdded,loss=state.yahooModel.marginal(c.partner.players,p,starts()).lossIfRemoved;
  return Number.isFinite(gain)&&Number.isFinite(loss)&&gain>loss;
 })||c.send.players.some(p=>{
  if(!state.yahooModel||['K','DEF'].includes(p.position))return false;
  const gain=state.yahooModel.marginal(c.partner.players,p,starts()).gainIfAdded,loss=state.yahooModel.marginal(own.players,p,starts()).lossIfRemoved;
  return Number.isFinite(gain)&&Number.isFinite(loss)&&gain>loss;
 })).slice(0,936);
 return candidates.sort((a,b)=>Number(Boolean(b.requestedTarget))-Number(Boolean(a.requestedTarget))).slice(0,936);
}
function daVinciMarginal(team,p,weeks,owned){
 const key=String(team.id)+'/'+id(p)+'/'+weeks.join('.')+'/'+owned;
 if(fitCache.has(key))return fitCache.get(key);
 const after=owned?team.players.filter(q=>id(q)!==id(p)):team.players.concat({...p,slot:'BN'});
 let value=0;
 for(const w of weeks){const before=optimized(team.players,w),next=optimized(after,w);if(!before||!next){fitCache.set(key,null);return null;}value+=(owned?-1:1)*(next.score-before.score);}
 fitCache.set(key,value);return value;
}
// Single-player acquisition gains and removal losses identify roster-fit spreads.
// The shortlisted packages are subsequently optimized in full; these sums are a screen.
function packageFit(own,partner,send,receive,weeks){
 if(!state.yahooModel)return null;
 const entries=[];
 for(const [players,owner,recipient] of [[send,own,partner],[receive,partner,own]])for(const p of players){
  const loss=state.yahooModel.marginal(owner.players,p,weeks).lossIfRemoved;
  const gain=state.yahooModel.marginal(recipient.players,p,weeks).gainIfAdded;
  if(!Number.isFinite(loss)||!Number.isFinite(gain))return null;
  entries.push({player:p,ownerId:String(owner.id),ownerLoss:loss,recipientGain:gain,premium:gain-loss});
 }
 const you=entries.reduce((n,e)=>n+(e.ownerId===String(own.id)?-e.ownerLoss:e.recipientGain),0);
 const them=entries.reduce((n,e)=>n+(e.ownerId===String(own.id)?e.recipientGain:-e.ownerLoss),0);
 return {you,them,entries};
}
// Balance roster capacity before measuring any unequal offer; expose these assumptions.
function repairRoster(players,original,protectedIds,weeks){
 return balanceRoster(players,original,protectedIds,weeks);
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
  const you=optimized(yours.players,weeks[i]);
  const them=optimized(theirsFixed.players,weeks[i]);
  if(!you||!them||!baseline.you[i]||!baseline.peers.get(c.partner.id)?.[i])return null;
  gainYou+=you.score-baseline.you[i].score;
  gainThem+=them.score-baseline.peers.get(c.partner.id)[i].score;
 }
 const beforeYou=baseline.you.reduce((sum,r)=>sum+r.score,0),beforeThem=baseline.peers.get(c.partner.id).reduce((sum,r)=>sum+r.score,0);
 const yahoo=yahooEvaluation(c,weeks,yours.players,theirsFixed.players);
 const injuryAssumptions=[...c.send.players,...c.receive.players].filter(p=>['O','OUT','D','DOUBTFUL'].includes(status(p))&&!state.futureMap.get(id(p))?.returnOutlook).map(p=>p.name);
 return {...c,yahoo,injuryAssumptions,beforeYou,beforeThem,afterYou:beforeYou+gainYou,afterThem:beforeThem+gainThem,adjustments:{you:yours.notes,them:theirsFixed.notes},gainYou,gainThem,avgYou:gainYou/weeks.length,avgThem:gainThem/weeks.length};
}
function yahooEvaluation(c,weeks,yours,theirs){
 const mine=state.rosters.teams.find(t=>String(t.id)===String(state.teamId));
 // Refreshed projections take precedence over dated screenshot evaluations.
 if(state.yahooFuture?.players)return state.yahooModel?.trade(mine.players,c.partner.players,c.send.players,c.receive.players,weeks)||null;
 const same=(a,b)=>a.map(String).sort().join('.')===b.map(String).sort().join('.');
 const observed=state.yahooEvaluations?.evaluations?.find(e=>String(e.teamId)===String(state.teamId)&&String(e.partnerId)===String(c.partner.id)&&e.startWeek===weeks[0]&&e.endWeek===weeks.at(-1)&&same(e.send,c.send.players.map(id))&&same(e.receive,c.receive.players.map(id)));
 if(observed)return {gainYou:observed.gainYou,gainThem:observed.gainThem,source:observed.source||state.yahooEvaluations.source};
 // Match Evaluate Trade: evaluate the package on the existing rosters.
 // Da Vinci's assumed roster repairs are displayed separately and do not alter Yahoo.
 return null;
}
function optimized(players,week){
 const key=week+'/'+players.map(p=>[id(p),p.slot||p.rosterSlot||'',status(p)].join(':')).sort().join('|');
 if(!lineupCache.has(key))lineupCache.set(key,state.optimize(players,week));
 return lineupCache.get(key);
}
function evaluate(){
 const weeks=starts(),mine=state.rosters.teams.find(t=>String(t.id)===String(state.teamId));
 if(!weeks.length)return [];
 const candidates=getCandidates();
 searchStats={candidates:candidates.length,valid:0,passed:0,shapes:{}};
 for(const c of candidates)searchStats.shapes[c.shape]=(searchStats.shapes[c.shape]||0)+1;
 if(!candidates.length)return [];
 const verifiedMode=['arbitrage','edge','yahoo'].includes(control('tradeGoal'));
 const covered=verifiedMode?candidates.filter(c=>yahooEvaluation(c,weeks,[],[])!==null):candidates;
 searchStats.yahooCovered=covered.length;
 const viable=control('tradeGoal')==='arbitrage'?covered.filter(c=>{
  const yahoo=yahooEvaluation(c,weeks,[],[]);
  return yahoo?.gainYou>0&&yahoo?.gainThem>=0&&arbitrageValues(c,mine,weeks).total>0&&bonusIsThrowin(c,mine,weeks,yahoo);
 }):covered;

 const otherIds=new Set(viable.map(x=>x.partner.id));
 const baseline={
  you:weeks.map(w=>optimized(mine.players,w)),
  peers:new Map(state.rosters.teams.filter(t=>otherIds.has(t.id)).map(t=>[t.id,weeks.map(w=>optimized(t.players,w))]))
 };
 if(baseline.you.some(x=>!x))return [];
 // A proposed trade must make BOTH nine-position projected lineups better
 // over the entire selected remainder of the season. Small noisy gains do not count.
 const evaluated=viable.map(c=>evaluateOffer(c,mine.players,baseline,weeks)).filter(Boolean);
 searchStats.valid=evaluated.length;
 const results=evaluated
 .filter(t=>control('tradeGoal')==='arbitrage'?t.yahoo?.gainYou>0&&t.yahoo?.gainThem>=0&&arbitrageValues(t,mine,weeks).total>0:control('tradeGoal')==='edge'?t.avgYou>=MIN_ROS_GAIN_PER_WEEK&&t.yahoo?.gainThem>=0:control('tradeGoal')==='yahoo'?t.yahoo?.gainYou>=weeks.length*MIN_ROS_GAIN_PER_WEEK&&t.yahoo?.gainThem>=weeks.length*MIN_ROS_GAIN_PER_WEEK:t.avgYou>=MIN_ROS_GAIN_PER_WEEK&&t.avgThem>=MIN_ROS_GAIN_PER_WEEK)
 .filter(t=>bonusIsThrowin(t,mine,weeks,t.yahoo))
 .sort((a,b)=>{
  if(control('tradeGoal')==='arbitrage')return arbitrageValues(b,mine,weeks).total-arbitrageValues(a,mine,weeks).total||Math.min(b.yahoo.gainYou,b.yahoo.gainThem)-Math.min(a.yahoo.gainYou,a.yahoo.gainThem);
  if(Boolean(a.requestedTarget)!==Boolean(b.requestedTarget))return a.requestedTarget?-1:1;
  if(Boolean(a.bonuses)!==Boolean(b.bonuses))return a.bonuses?1:-1;
  // Prioritize balance: maximizing the smaller team's benefit is a better
  // starting point for a mutually acceptable offer than maximizing just ours.
  if(Boolean(a.injuryAssumptions.length)!==Boolean(b.injuryAssumptions.length))return a.injuryAssumptions.length?1:-1;
  if(control('tradeGoal')==='edge')return b.gainYou-a.gainYou;
  if(control('tradeGoal')==='yahoo')return Math.min(b.yahoo.gainYou,b.yahoo.gainThem)-Math.min(a.yahoo.gainYou,a.yahoo.gainThem)||(b.yahoo.gainYou+b.yahoo.gainThem)-(a.yahoo.gainYou+a.yahoo.gainThem);
  const as=Math.min(a.avgYou,a.avgThem)*3+(a.avgYou+a.avgThem)*.20-a.gap*1.2;
  const bs=Math.min(b.avgYou,b.avgThem)*3+(b.avgYou+b.avgThem)*.20-b.gap*1.2;
  return bs-as;
 });
 searchStats.passed=results.length;return results;
}
function bonusIsThrowin(c,mine,weeks,yahoo){
 if(!c.bonuses||!state.yahooModel||!yahoo)return true;
 const coreSend=c.send.players.filter(p=>!['K','DEF'].includes(p.position));
 const base=state.yahooModel.trade(mine.players,c.partner.players,coreSend,c.receive.players,weeks);
 const ownerCost=c.receive.players.filter(p=>!['K','DEF'].includes(p.position)).reduce((n,p)=>n+(state.yahooModel.marginal(c.partner.players,p,weeks).lossIfRemoved||0),0);
 // A bonus can close a modest gap; it cannot provide most of the payment.
 return base!==null&&base.gainThem>=-Math.min(weeks.length*.5,ownerCost*.3)&&yahoo.gainThem>base.gainThem+.05;
}
function resultHTML(t){
 const weeks=starts();
 const mine=state.rosters.teams.find(team=>String(team.id)===String(state.teamId));
 const arbitrage=arbitrageValues(t,mine,weeks),byPlayer=new Map(arbitrage.players.map(p=>[id(p.player),p]));
 const valueHTML=v=>'<b class="trade-marginal '+(v===null?'':v<0?'negative':v>0?'positive':'neutral')+'">'+(v===null?'Unknown':(v<0?'−':'+')+fmt(Math.abs(v)))+'</b>';
 const formatList=players=>'<div class="trade-marginal-heading"><span></span><span>Points (arbitrage)</span></div>'+players.map(p=>{const value=byPlayer.get(id(p)),points=tradePlayerPoints(p,weeks),arb=value?.arbitrage??null;const signed=arb===null?'Unknown':(arb<0?'−':'+')+Math.abs(arb).toFixed(2);return '<div class="trade-player-row trade-marginal-row"><span>'+(root.DaVinciPlayerDetail?.link(p)||esc(p.name))+' <small>('+esc(p.position)+(['K','DEF'].includes(p.position)?' · bonus':'')+')</small></span><span class="trade-player-value"><b>'+(points===null?'Unknown':points.toFixed(2))+'</b> <b class="trade-marginal '+(arb===null?'':arb<0?'negative':arb>0?'positive':'neutral')+'">('+signed+')</b></span></div>';}).join('');
 const totals='<div class="trade-arbitrage-totals"><div title="Sum of each recipient’s acquisition gain minus the current owner’s removal loss."><strong>Total marginal value</strong>'+valueHTML(arbitrage.total)+'</div></div>';
 const summary=(name,before,after,gain,avg)=>'<div class="trade-team-summary"><strong>'+esc(name)+'</strong><span>Lineup ROS <b>'+fmt(before)+' → '+fmt(after)+'</b></span><b class="trade-gain">'+(gain>=0?'+':'')+fmt(gain)+' pts · '+(avg>=0?'+':'')+fmt(avg)+' /wk</b></div>';
 if(['arbitrage','edge','yahoo'].includes(control('tradeGoal'))){
  const signed=n=>(n>=0?'+':'')+Number(n).toFixed(2);
  const metric=(title,n)=>'<div class="trade-team-summary"><strong>'+title+'</strong><b class="trade-gain">'+signed(n)+' period pts</b></div>';
  return '<article class="trade-personal-card" aria-label="'+esc(t.partner.name+' '+t.shape)+'"><p class="plan-context">'+esc(t.partner.name)+' · Weeks '+weeks[0]+'–'+weeks.at(-1)+' · '+esc(snapshotRange([mine,t.partner],weeks))+'</p><div class="trade-personal-sides"><div><div class="trade-list-label"><small>YOU SEND</small></div>'+formatList(t.send.players)+metric('Your Da Vinci upside',t.gainYou)+metric('Your lineup impact',t.yahoo.gainYou)+'</div><div><div class="trade-list-label"><small>YOU RECEIVE</small></div>'+formatList(t.receive.players)+metric('Partner’s lineup impact',t.yahoo.gainThem)+'</div></div>'+totals+'</article>';
 }
 return '<article class="trade-personal-card" aria-label="'+esc(t.partner.name+' '+t.shape)+'"><p class="plan-context">'+esc(t.partner.name)+'<span class="trade-source-badge">Da Vinci · '+esc(t.shape)+'</span></p>'+
 '<div class="trade-personal-sides"><div><div class="trade-list-label"><small>YOU SEND</small></div>'+formatList(t.send.players)+summary(mine?.name||'Your team',t.beforeYou,t.afterYou,t.gainYou,t.avgYou)+'</div><div><div class="trade-list-label"><small>YOU RECEIVE</small></div>'+formatList(t.receive.players)+summary(t.partner.name,t.beforeThem,t.afterThem,t.gainThem,t.avgThem)+'</div></div>'+totals
 +(t.yahoo?'<div class="trade-yahoo-comparison" title="'+esc(t.yahoo.source)+'">Yahoo ROS · You '+(t.yahoo.gainYou>=0?'+':'')+fmt(t.yahoo.gainYou)+' · Theirs '+(t.yahoo.gainThem>=0?'+':'')+fmt(t.yahoo.gainThem)+'</div>':'')+'</article>';
}
function tradePlayerPoints(p,weeks){
 if(control('tradeGoal')==='model'||!state.yahooModel)return playerPts(p,weeks);
 const player=state.yahooFuture.players.find(q=>id(q)===id(p));
 const frames=weeks.map(w=>player?.weeks.find(f=>Number(f.week)===w));
 if(frames.some(f=>!Number.isFinite(f?.points)))return null;
 return Math.round(frames.reduce((n,f)=>n+f.points,0)*100)/100;
}
function arbitrageValues(t,mine,weeks){
 const useYahoo=Boolean(state.yahooModel)&&control('tradeGoal')!=='model';
 const source=useYahoo?'Yahoo':'Da Vinci';
 const marginal=(team,p,owned)=>{if(useYahoo){const v=state.yahooModel.marginal(team.players,p,weeks);return owned?v.lossIfRemoved:v.gainIfAdded;}return daVinciMarginal(team,p,weeks,owned);};
 const players=[];
 for(const [list,owner,recipient] of [[t.send.players,mine,t.partner],[t.receive.players,t.partner,mine]])for(const player of list){
  const loss=marginal(owner,player,true),gain=marginal(recipient,player,false);
  players.push({player,ownerLoss:loss,recipientGain:gain,arbitrage:Number.isFinite(loss)&&Number.isFinite(gain)?Math.round((gain-loss)*100)/100:null});
 }
 const exact=useYahoo?state.yahooModel.trade(mine.players,t.partner.players,t.send.players,t.receive.players,weeks):null;
 return {source,players,total:players.some(p=>p.arbitrage===null)?null:Math.round(players.reduce((n,p)=>n+p.arbitrage,0)*100)/100,
  fullTrade:useYahoo?(exact?Math.round((exact.gainYou+exact.gainThem)*100)/100:null):Number.isFinite(t.gainYou)&&Number.isFinite(t.gainThem)?Math.round((t.gainYou+t.gainThem)*100)/100:null};
}
function snapshotRange(teams,weeks){
 const ids=new Set(teams.flatMap(t=>t.players.map(id))),dates=[];
 for(const p of state.yahooFuture?.players||[])if(ids.has(id(p)))for(const w of p.weeks||[])if(weeks.includes(Number(w.week)))dates.push(w.collectedAt||p.collectedAt||state.yahooFuture.collectedAt);
 const valid=dates.filter(d=>Number.isFinite(Date.parse(d))).sort();if(!valid.length)return 'date unknown';
 const date=d=>new Date(d).toLocaleDateString('en-US',{timeZone:'America/Denver',month:'short',day:'numeric'});
 const a=date(valid[0]),b=date(valid.at(-1));return a===b?a:a+'–'+b;
}
function partnersHTML(options){
 const best=new Map();for(const t of options)if(!best.has(String(t.partner.id)))best.set(String(t.partner.id),t);
 const rows=[...best.values()].slice(0,5);if(!rows.length)return '';
 const yahooOnly=['arbitrage','yahoo'].includes(control('tradeGoal'));
 return '<div class="trade-partner-fits"><strong>Best partner fits</strong>'+rows.map(t=>{const you=yahooOnly?t.yahoo.gainYou:t.gainYou,them=yahooOnly||control('tradeGoal')==='edge'?t.yahoo?.gainThem:t.gainThem;return '<button type="button" data-trade-partner="'+esc(t.partner.id)+'"><span>'+esc(t.partner.name)+'</span><small>You '+(you>=0?'+':'')+fmt(you)+(yahooOnly?' Yahoo':' DV')+' · Partner '+(them>=0?'+':'')+fmt(them)+(yahooOnly||control('tradeGoal')==='edge'?' Yahoo':' DV')+'</small></button>';}).join('')+'</div>';
}
function distinctTrades(options){
 const seenTargets=new Set(),result=[];
 for(const trade of options){
  const skill=trade.receive.players.filter(p=>!['K','DEF'].includes(p.position));
  const targets=skill.length?skill:trade.receive.players;
  if(targets.some(p=>seenTargets.has(id(p))))continue;
  for(const player of targets)seenTargets.add(id(player));
  result.push(trade);
 }
 return result;
}
function render(){
 const target=$('tradeResults');if(!target||!state)return;
 const job=++nextJob;
 searchWorker?.terminate();searchWorker=null;
 target.setAttribute?.('aria-busy','true');
 target.innerHTML='<div class="trade-personal-loading search-progress" role="status"><span class="search-spinner" aria-hidden="true"></span><span>Comparing both teams’ lineups…</span><button type="button" class="plan-export" id="cancelTradeSearch">Cancel</button></div>';
 $('cancelTradeSearch')?.addEventListener('click',()=>{nextJob++;searchWorker?.terminate();searchWorker=null;target.setAttribute?.('aria-busy','false');target.innerHTML='<div class="trade-personal-loading">Search cancelled. Adjust the filters or select Find trades.</div>';});
 // Defer lineup calculations until the loading row paints; ignore outdated requests.
 const finish=(options,stats)=>{
  if(job!==nextJob)return;
  searchStats=stats;target.setAttribute?.('aria-busy','false');
  const shape=control('tradePackageFilter');
  if(['one_each','two_each','three_each'].includes(shape)){const n={one_each:1,two_each:2,three_each:3}[shape];options=options.filter(t=>t.send.players.length===n&&t.receive.players.length===n);}
  options=distinctTrades(options);
  const info=$('targetResults');if(info&&searchStats){info.innerHTML='<div class="trade-result-summary"><strong>'+options.length+' distinct trade ideas</strong><details><summary>Coverage & calculation</summary><p>'+searchStats.candidates+' packages screened'+(control('tradeGoal')==='model'?' · Da Vinci lineup projections.</p>':' · '+(searchStats.yahooCovered||0)+' with Yahoo coverage.</p>'+yahooCoverageHTML()+'<p>Yahoo: existing rosters, no waiver moves. Da Vinci upside is calculated separately.</p>'+yahooChecksHTML())+'</details></div>'+partnersHTML(options)+(['one_each','two_each','three_each'].includes(control('tradePackageFilter'))?'<button type="button" class="plan-export" id="broadenTrades">Include multi-player trades</button>':'');
   $('broadenTrades')?.addEventListener('click',()=>{$('tradePackageFilter').value='practical';render();});
   for(const button of info.querySelectorAll?.('[data-trade-partner]')||[])button.addEventListener('click',()=>{$('tradePartner').value=button.dataset.tradePartner;refresh();render();});
  }
  const shown=options.slice(0,Number(control('tradeLimit')||12));
  if(!shown.length){
   if(['arbitrage','edge','yahoo'].includes(control('tradeGoal'))){
    const missing=missingYahooPlayers();
    target.innerHTML='<div class="trade-empty-state"><span class="empty-state-label">'+(missing.length?'FORECAST COVERAGE':'TRADE SEARCH')+'</span><h3>'+(missing.length?'Yahoo forecasts needed':'No matching trades in this period')+'</h3><p>'+(missing.length?'Saved Yahoo forecasts are incomplete for '+esc(missing.slice(0,3).join(', '))+(missing.length>3?' and '+(missing.length-3)+' more players':'')+'.':'No packages meet these filters and both teams’ value requirements.')+'</p><button type="button" class="plan-export" id="showModelTrades">Explore Da Vinci trade ideas</button><small>Uses model projections for both teams.</small></div>';
    $('showModelTrades')?.addEventListener('click',()=>{$('tradeGoal').value='model';render();});return;
   }
   target.innerHTML='<div class="trade-personal-loading">No trades here improve BOTH lineups by at least '+fmt(MIN_ROS_GAIN_PER_WEEK)+' pts/week over the rest of the season. Try another player or manager.</div>';
   return;
  }
  target.innerHTML=shown.map(resultHTML).join('');
 };
 const filters=Object.fromEntries(['tradeFromWeek','tradePartner','tradePackageFilter','tradeGoal','tradePosition'].map(k=>[k,control(k)]));
 const selection={send:[...selectedOut],receive:[...selectedIn]},key=JSON.stringify([filters,selection]);
 const deliver=result=>{resultCache.set(key,result);if(resultCache.size>12)resultCache.delete(resultCache.keys().next().value);finish(result.options,result.stats);};
 const fail=()=>{if(job!==nextJob)return;searchWorker?.terminate();searchWorker=null;target.setAttribute?.('aria-busy','false');target.innerHTML='<div class="trade-empty-state"><h3>Trade search could not finish</h3><p>Try fewer players or a specific trade partner, then select Find trades.</p></div>';};
 if(resultCache.has(key)){const result=resultCache.get(key);finish(result.options,result.stats);return;}
 if(typeof Worker==='function'&&root.location?.protocol!=='file:'&&workerSettings){
  try{
   searchWorker=new Worker('./trade-search-worker.js?v=20261021design');
   const worker=searchWorker;
   worker.onmessage=event=>{worker.terminate();if(job!==nextJob)return;searchWorker=null;if(event.data.error){fail();return;}deliver(event.data);};
   worker.onerror=fail;
   worker.postMessage({settings:workerSettings,filters,selection});
  }catch(error){fail();}
 }else{
  const run=()=>{if(job!==nextJob)return;try{deliver({options:evaluate(),stats:searchStats});}catch(error){fail();}};
  if(typeof requestAnimationFrame==='function')requestAnimationFrame(run);else run();
 }
}
function missingYahooPlayers(){
 if(!state.yahooFuture)return [];
 const mine=state.rosters.teams.find(t=>String(t.id)===String(state.teamId));
 return (mine?.players||[]).filter(p=>starts().some(w=>!Number.isFinite(state.yahooFuture?.players?.find(f=>id(f)===id(p))?.weeks?.find(f=>Number(f.week)===w)?.points))).map(p=>p.name);
}
function calculate(settings,filters,selection){
 searchControls=filters;selectedOut=new Set(selection.send);selectedIn=new Set(selection.receive);
 lineupCache=new Map();fitCache=new Map();
 state={...settings,yahooModel:settings.yahooFuture&&root.YahooValues?.create(settings.yahooFuture),futureMap:new Map(settings.future.players.map(p=>[String(p.yahooId),p]))};
 const options=evaluate();return {options,stats:searchStats};
}
root.DaVinciTradeSearch={calculate};
function yahooCoverageHTML(){
 const coverage=state.yahooFuture?.coverage;
 if(!coverage)return '';
 return '<p><strong>Yahoo coverage: '+coverage.completeTeams.length+' of '+state.rosters.teams.length+' teams · '+state.yahooFuture.players.length+' players · Weeks 6–17.</strong> Snapshots '+esc(snapshotRange(state.rosters.teams,starts()))+'. '+(state.yahooFuture.collection?.state==='paused_by_user'?'Refresh paused. ':state.yahooFuture.coverage.complete?'All rostered players covered. ':'Missing teams remain unknown. ')+'<a href="./data/yahoo-team-player-values.json" download>Download gain/loss values</a>.</p>';
}
function yahooChecksHTML(){
 const checks=(state.yahooEvaluations?.evaluations||[]).filter(e=>e.reportedAt==='2026-10-12'&&String(e.teamId)===String(state.teamId));
 if(!checks.length)return '';
 const players=state.rosters.teams.flatMap(t=>t.players),names=ids=>ids.map(pid=>players.find(p=>id(p)===String(pid))?.name||pid).join(' + ');
 const signed=n=>(n>=0?'+':'')+Number(n).toFixed(2);
 return '<details class="plan-method"><summary>Yahoo projection checks</summary><p>Yahoo evaluations · October 12 · Weeks 6–17.</p><div class="plan-scroll"><table class="plan-table"><thead><tr><th>Exchange</th><th>Your Yahoo impact</th><th>Partner’s Yahoo impact</th></tr></thead><tbody>'+checks.map(e=>'<tr><td>'+esc(names(e.send)+' → '+names(e.receive))+'</td><td>'+signed(e.gainYou)+'</td><td>'+signed(e.gainThem)+'</td></tr>').join('')+'</tbody></table></div></details>';
}
function active(){const mode=control('tradePackageFilter')||'';return selectedOut.size>0||selectedIn.size>0||mode==='all'||mode==='practical'||mode==='unequal'||mode.includes('_for_')||Boolean(control('tradeGoal'));}
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

/* For a fixed unequal offer, fill vacancies by REAL lineup marginal gain,
   not raw QB totals; trim the partner's least useful expendable assets. */
function balanceRoster(players,original,protectedIds,weeks){
 const notes=[];let roster=players.slice();
 const total=group=>{
  let sum=0;
  for(const week of weeks){
   const lineup=optimized(group,week);
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
function draw(){
 if(!state)return;
 const rootEl=$('tradePreferenceBuilder');
 if(!rootEl)return;
 rootEl.innerHTML='<div class="trade-personal-grid">'+
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
 searchControls=null;searchWorker?.terminate();searchWorker=null;resultCache=new Map();
 const {optimize,...serializable}=settings;workerSettings=serializable;
 lineupCache=new Map();fitCache=new Map();
 state={...settings,yahooModel:settings.yahooFuture&&root.YahooValues?.create(settings.yahooFuture),futureMap:new Map(settings.future.players.map(p=>[String(p.yahooId),p]))};
 if(!state.optimize)throw Error('Full-lineup optimizer unavailable');
 if(settings.planningWeek&&$('tradeFromWeek'))$('tradeFromWeek').value=String(settings.planningWeek);
 const container=$('tradePreferenceBuilder');if(!container)return;
 oldFallback=root.DaVinciLab?.rankTrades;
 draw();
 const opponent=state.rosters.teams.find(t=>String(t.id)===String(state.opponentId));
 const notice=$('tradeOpponentNotice');if(notice)notice.textContent=opponent?'You play '+opponent.name+' this week. Consider waiting until after the matchup to trade with them.':'';
 $('tradeFromWeek')?.addEventListener('change',()=>{if(active())updated()});
 $('tradePartner')?.addEventListener('change',()=>{refresh();if(active())updated()});
 $('tradePackageFilter')?.addEventListener('change',()=>{if(active())updated()});
 $('tradeLimit')?.addEventListener('change',()=>{if(active())updated()});
 $('tradeGoal')?.addEventListener('change',updated);
 $('tradePosition')?.addEventListener('change',()=>{if(active())updated()});
 if(!settings.deferSearch)updated();
}
root.DaVinciPersonalTrades={init,active,render};
})(typeof window!=='undefined'?window:globalThis);
