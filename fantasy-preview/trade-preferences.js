/* Personalized trade preferences and full nine-starter trade simulation. */
(function(root){
'use strict';
const POSITION_ORDER={QB:0,RB:1,WR:2,TE:3,K:4,DEF:5};
const POSITIONS=new Set(Object.keys(POSITION_ORDER));
const BLOCK=new Set(['IR','IR-R','NA','N/A','PUP','PUP-R','NFI','NFI-R','CEL','SUSP','SUS']);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=id=>document.getElementById(id);
const fmt=v=>Number(v).toFixed(1);
const id=p=>String(p.id||p.yahooId);
let state=null, selectedOut=new Set(),selectedIn=new Set(),nextJob=0, oldFallback=null;
const status=p=>String(p.status||p.injuryStatus||'').toUpperCase();
const eligible=p=>POSITIONS.has(p.position)&&p.slot!=='IR'&&!BLOCK.has(status(p))&&!status(p).startsWith('IR-');
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
   for(const send of outgoing[n]){
    for(const receive of inbound[n]){
     const position=$('tradePosition')?.value||'all';
     if(!selectedIn.size&&position!=='all'&&position!=='offense_no_qb'&&!receive.players.some(p=>p.position===position))continue;
     if(!selectedIn.size&&position==='offense_no_qb'&&receive.players.some(p=>p.position==='QB'))continue;
     // Compare modeled rest-of-season value before more costly legal-lineup simulation.
     const gap=Math.abs(send.raw-receive.raw)/Math.max(12,send.raw,receive.raw);
     shortlist.push({partner:other,send,receive,gap,shape:n+'-for-'+n,
      balance:Math.abs(send.raw-receive.raw),key:other.id+'/'+send.key+'/'+receive.key});
    }
   }
  }
  shortlist.sort((a,b)=>a.gap-b.gap||a.balance-b.balance);
  // Retain variety of packages and targets rather than only near-identical deals.
  const retained=[], seen=new Set(),byShape={1:0,2:0,3:0};
  for(const item of shortlist){
   const n=item.send.count;
   if(item.gap>.5||byShape[n]>=3)continue;
   const shortKey=item.receive.players.map(x=>x.position).sort().join('-')+'/'+item.send.key;
   if(seen.has(shortKey))continue;
   seen.add(shortKey);byShape[n]++;
   retained.push(item);
  }
  proposals.push(...retained);
 }
 return proposals.sort((a,b)=>a.gap-b.gap).slice(0,90);
}
function evaluateOffer(c,original,baseline,weeks){
 const your=original;
 const theirs=c.partner.players;
 const sending=new Set(c.send.players.map(id)),receiving=new Set(c.receive.players.map(id));
 const yourAfter=your.filter(p=>!sending.has(id(p))).concat(c.receive.players.map(p=>({...p,slot:'BN'})));
 const theirAfter=theirs.filter(p=>!receiving.has(id(p))).concat(c.send.players.map(p=>({...p,slot:'BN'})));
 let gainYou=0,gainThem=0;
 for(let i=0;i<weeks.length;i++){
  const you=state.optimize(yourAfter,weeks[i]);
  const them=state.optimize(theirAfter,weeks[i]);
  if(!you||!them||!baseline.you[i]||!baseline.peers.get(c.partner.id)?.[i])return null;
  gainYou+=you.score-baseline.you[i].score;
  gainThem+=them.score-baseline.peers.get(c.partner.id)[i].score;
 }
 return {...c,gainYou,gainThem,avgYou:gainYou/weeks.length,avgThem:gainThem/weeks.length};
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
 return candidates.map(c=>evaluateOffer(c,mine.players,baseline,weeks)).filter(Boolean)
 .filter(t=>t.avgYou>0.15)
 .sort((a,b)=>{
  const as=a.avgYou+Math.min(1.5,a.avgThem)*1.25-(a.avgThem<0?Math.abs(a.avgThem)*1.4:0)-a.gap*2;
  const bs=b.avgYou+Math.min(1.5,b.avgThem)*1.25-(b.avgThem<0?Math.abs(b.avgThem)*1.4:0)-b.gap*2;
  return bs-as;
 });
}
function resultHTML(t){
 const formatList=p=>p.map(x=>'<span>'+esc(x.name)+' <small>'+esc(x.position)+'</small></span>').join('');
 const viability=t.avgThem>=0?'Both teams gain':'Their lineup −'+fmt(Math.abs(t.avgThem))+'/wk';
 return '<article class="trade-personal-card"><div class="trade-personal-head"><strong>'+esc(t.partner.name)+'</strong><span>'+t.shape+'</span></div>'+
 '<div class="trade-personal-sides"><div><small>SEND</small>'+formatList(t.send.players)+'</div><div><small>RECEIVE</small>'+formatList(t.receive.players)+'</div></div>'+
 '<div class="trade-personal-footer"><b>Your gain +'+fmt(t.avgYou)+' pts/wk</b><span>'+esc(viability)+'</span></div></article>';
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
  const strong=options.filter(o=>o.avgThem>=0).slice(0,6);
  const shown=strong.length?strong:options.slice(0,5);
  if(!shown.length){
   target.innerHTML='<div class="trade-personal-loading">No modeled lineup gains for these choices. Try another player or trading partner.</div>';
   return;
  }
  target.innerHTML=shown.map(resultHTML).join('')+
    '<p class="trade-personal-footnote">Projected lineup points per week, Weeks '+starts()[0]+'–17. Trades are hypothetical; manager acceptance and injuries are not predicted.</p>';
 };
 if(typeof requestAnimationFrame==='function')requestAnimationFrame(run);else run();
}
function active(){return selectedOut.size>0||selectedIn.size>0;}
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
  holder.innerHTML=filtered.slice(0,200).map(p=>'<label class="trade-player-option"><input type="checkbox" data-id="'+esc(id(p))+'" '+(selected.has(id(p))?'checked':'')+'><span><strong>'+esc(p.name)+'</strong><small>'+esc(p.position)+(type==='receive'?' · '+esc(p.owner):'')+'</small></span></label>').join('')||'<p class="trade-player-empty">No matching players</p>';
  badge.textContent=selected.size?selected.size+' selected':'Any';
  box.setAttribute('aria-label',selected.size+' preferred '+type+' players');
 }
}
function draw(){
 if(!state)return;
 const rootEl=$('tradePreferenceBuilder');
 if(!rootEl)return;
 rootEl.innerHTML='<div class="trade-personal-grid">'+
 '<details class="trade-player-dropdown" id="tradeSendBox"><summary>Players I would trade <strong id="tradeSendSelected">Any</strong></summary><input id="tradeSendSearch" type="search" placeholder="Find my players" aria-label="Search players to trade"><div class="trade-player-options" id="tradeSendChoices"></div></details>'+
 '<details class="trade-player-dropdown" id="tradeReceiveBox"><summary>Players I want <strong id="tradeReceiveSelected">Any</strong></summary><input id="tradeReceiveSearch" type="search" placeholder="Find league targets" aria-label="Search players to receive"><div class="trade-player-options" id="tradeReceiveChoices"></div></details>'+
 '</div><div class="trade-preference-footer"><span>Packages include at least one selected name.</span><button id="tradePreferenceClear" type="button">Clear choices</button></div>';
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
 state={...settings,futureMap:new Map(settings.future.players.map(p=>[String(p.yahooId),p]))};
 if(!state.optimize)throw Error('Full-lineup optimizer unavailable');
 const container=$('tradePreferenceBuilder');if(!container)return;
 oldFallback=root.DaVinciLab?.rankTrades;
 draw();
 $('tradeFromWeek')?.addEventListener('change',()=>{if(active())updated()});
 $('tradePartner')?.addEventListener('change',()=>{refresh();if(active())updated()});
 $('tradePackageFilter')?.addEventListener('change',()=>{if(active())updated()});
 $('tradePosition')?.addEventListener('change',()=>{if(active())updated()});
 updated();
}
root.DaVinciPersonalTrades={init,active,render};
})(typeof window!=='undefined'?window:globalThis);
