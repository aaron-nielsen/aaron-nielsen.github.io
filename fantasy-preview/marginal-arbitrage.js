/* Da Vinci Fantasy Lab — two-way marginal value and 1-for-1 arbitrage.
   Counterfactuals are lineup-valued in THIS league. No fantasy transactions.
   Stale player status/forecasts are shown as caveats, not hidden. */
(function(root){
'use strict';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=x=>Number(x).toFixed(1);
const signed=x=>(x>=0?'+':'')+fmt(x);
const blocked=new Set(['IR','IR-R','PUP','PUP-R','NFI','NFI-R','CEL','SUSP','SUS','NA','N/A']);
const positions=['QB','RB','WR','TE','K','DEF'];
const byId=p=>String(p.id||p.yahooId);
let state=null,job=0,rowsOther=[],rowsMine=[],deals=[],lastWeeks=[],sortBy='edge',sortDir=-1,done=false;
function weeks(){
 const start=Number($('marginalHorizon')?.value||6);
 const end=start===6?17:start===7?17:start===15?17:start+3;
 return Array.from({length:Math.max(0,Math.min(end,Number(state.future.endWeek))-start+1)},(_,i)=>i+start);
}
function score(players,range){
 let out=0;
 for(const w of range){
  const x=state.optimize(players,w);
  if(!x||!Number.isFinite(x.score))return null;
  out+=x.score;
 }
 return out;
}
function info(p){
 return state.forecasts.get(byId(p));
}
function points(p,range){
 const f=info(p);
 if(!f)return -Infinity;
 let sum=0;
 for(const w of range){
  const frame=f.weeks?.find(x=>Number(x.week)===w);
  if(!frame||frame.points==null)return -Infinity;
  sum+=Number(frame.points);
 }
 return sum;
}
function buildPool(range){
 const owned=new Set(state.rosters.teams.flatMap(t=>t.players.map(byId)));
 const pool={};
 for(const pos of positions){
  pool[pos]=(state.available.players||[]).filter(p=>p.position===pos&&!owned.has(byId(p))&&p.nflTeam&&
   !blocked.has(String(p.status||'').toUpperCase())&&Number.isFinite(points(p,range)))
   .sort((a,b)=>points(b,range)-points(a,range)).slice(0,5)
   .map(p=>({...p,slot:'BN'}));
 }
 return pool;
}
function setStatus(message){
 const el=$('marginalStatus');if(el)el.textContent=message;
}
function heading(){
 const teams=state.rosters.teams.filter(t=>String(t.id)!==String(state.teamId));
 const select=$('marginalTeam');
 if(select&&select.options.length===1){
  for(const t of teams.sort((a,b)=>a.name.localeCompare(b.name))){
   const opt=document.createElement('option');opt.value=String(t.id);opt.textContent=t.name;select.appendChild(opt);
  }
 }
}
function baseline(team,range){
 return score(team.players,range);
}
function cacheContext(range){
 const teamBase=new Map(),removal=new Map(),addition=new Map(),weak=new Map();
 const pool=buildPool(range);
 for(const team of state.rosters.teams)teamBase.set(String(team.id),baseline(team,range));
 function without(team,p){
  const key=team.id+'|'+byId(p);
  if(removal.has(key))return removal.get(key);
  const original=teamBase.get(String(team.id));
  const rest=team.players.filter(x=>byId(x)!==byId(p));
  let after=score(rest,range),replacement=null;
  // Any single available waiver substitute is permitted in the owner-cost
  // counterfactual; this is NOT an assumption about a completed trade.
  if(p.slot!=='IR'){
   for(const fa of pool[p.position]||[]){
    const val=score(rest.concat(fa),range);
    if(val!==null&&(after===null||val>after)){after=val;replacement=fa.name;}
   }
  }
  const result=after===null||original===null?null:{
   loss:Math.max(0,original-after),raw:original-after,replacement};
  removal.set(key,result);
  return result;
 }
 function dropCandidates(team){
  const id=String(team.id);if(weak.has(id))return weak.get(id);
  const base=teamBase.get(id);
  const choices=team.players.filter(x=>x.slot!=='IR').map(p=>{
   const v=score(team.players.filter(x=>byId(x)!==byId(p)),range);
   return {p,loss:v===null?Infinity:base-v};
  }).sort((a,b)=>a.loss-b.loss);
  const found=choices.slice(0,6).filter(x=>x.p);
  weak.set(id,found);return found;
 }
 function added(team,p){
  const key=team.id+'|'+byId(p);
  if(addition.has(key))return addition.get(key);
  const start=teamBase.get(String(team.id));
  const active=team.players.filter(x=>x.slot!=='IR').length;
  const scenarios=active>=15?dropCandidates(team).map(x=>({players:team.players.filter(q=>byId(q)!==byId(x.p)),dropped:x.p.name})):
     [{players:team.players,dropped:null}];
  let best=null,dropped=null;
  for(const scenario of scenarios){
   const potential=score(scenario.players.concat({...p,slot:'BN'}),range);
   if(potential!==null&&(best===null||potential>best)){best=potential;dropped=scenario.dropped;}
  }
  const result=best===null||start===null?null:{gain:Math.max(0,best-start),raw:best-start,dropped};
  addition.set(key,result);return result;
 }
 return {teamBase,without,added};
}
function computeOne(p,owner,target,base,type,range){
 const loss=base.without(owner,p),gain=base.added(target,p);
 if(!loss||!gain)return null;
 const row={
  id:byId(p),name:p.name,pos:p.position,from:owner.name,fromId:String(owner.id),
  to:target.name,toId:String(target.id),status:p.status||null,slot:p.slot,
  loss:loss.loss,gain:gain.gain,edge:gain.gain-loss.loss,
  ownerReplacement:loss.replacement,buyerDrop:gain.dropped,kind:type,
  forecast:info(p)?.name||null
 };
 return row;
}
function pairings(base,range){
 const own=state.rosters.teams.find(t=>String(t.id)===String(state.teamId));
 const mineByOwner=new Map();
 for(const x of rowsMine){if(!mineByOwner.has(x.toId))mineByOwner.set(x.toId,[]);mineByOwner.get(x.toId).push(x);}
 const options=[];
 for(const inrow of rowsOther){
  if(inrow.slot==='IR'||blocked.has(String(inrow.status||'').toUpperCase()))continue;
  for(const outrow of mineByOwner.get(inrow.fromId)||[]){
   if(outrow.slot==='IR'||blocked.has(String(outrow.status||'').toUpperCase()))continue;
   // A fast screen, NOT the final valuation. All suggested trades are
   // recomputed as actual two-sided swaps below.
   const mineDelta=inrow.gain-outrow.loss;
   const theirDelta=outrow.gain-inrow.loss;
   const screen=Math.min(mineDelta,theirDelta)+.18*(mineDelta+theirDelta);
   options.push({inrow,outrow,mineDelta,theirDelta,screen});
  }
 }
 options.sort((a,b)=>b.screen-a.screen);
 const pool=[],counts=new Map();
 for(const o of options){
  const count=counts.get(o.inrow.fromId)||0;
  if(count>=28)continue;
  counts.set(o.inrow.fromId,count+1);pool.push(o);
  if(pool.length>=240)break;
 }
 return {options:pool,own};
}
function exactPair(o,own,range,teamBase){
 const other=state.rosters.teams.find(t=>String(t.id)===o.inrow.fromId);
 const inbound=other?.players.find(p=>byId(p)===o.inrow.id);
 const outbound=own.players.find(p=>byId(p)===o.outrow.id);
 if(!other||!inbound||!outbound)return null;
 const myAfter=own.players.filter(p=>byId(p)!==byId(outbound)).concat({...inbound,slot:'BN'});
 const theirAfter=other.players.filter(p=>byId(p)!==byId(inbound)).concat({...outbound,slot:'BN'});
 const myVal=score(myAfter,range),theirVal=score(theirAfter,range);
 if(myVal===null||theirVal===null)return null;
 const gainMe=myVal-teamBase.get(String(own.id)),gainThem=theirVal-teamBase.get(String(other.id));
 return {...o,gainMe,gainThem,minGain:Math.min(gainMe,gainThem),totalGain:gainMe+gainThem,
  rank:Math.min(gainMe,gainThem)+.12*(gainMe+gainThem)};
}
function sortRows(rows){
 const key=sortBy;
 return rows.slice().sort((a,b)=>{
  let d=0;
  if(['name','from','to','pos'].includes(key))d=String(a[key]).localeCompare(String(b[key]));
  else d=(a[key]-b[key]);
  return d*sortDir||a.name.localeCompare(b.name);
 });
}
function renderTables(){
 const team=$('marginalTeam')?.value||'all',q=String($('marginalSearch')?.value||'').trim().toLowerCase();
 const pos=$('marginalPosition')?.value||'all',limit=$('marginalLimit')?.value||'25';
 function relevant(row){
  return (team==='all'||(row.kind==='incoming'?row.fromId:row.toId)===team)&&
   (pos==='all'||row.pos===pos)&&
   (!q||[row.name,row.from,row.to,row.pos].join(' ').toLowerCase().includes(q));
 }
 const make=(direction,source,title)=>{
  const rows=sortRows(source.filter(relevant)),show=limit==='all'?rows:rows.slice(0,Number(limit));
  const labels=direction==='incoming'?
   {owner:'Current team',loss:'Their loss',buyer:'Your gain'}:
   {owner:'Potential recipient',loss:'Your loss',buyer:'Their gain'};
  const header='<thead><tr><th data-marginal-sort="name">Player</th><th data-marginal-sort="'+(direction==='incoming'?'from':'to')+'">'+labels.owner+'</th>'+
    '<th data-marginal-sort="loss">'+labels.loss+'</th><th data-marginal-sort="gain">'+labels.buyer+'</th><th data-marginal-sort="edge">Value gap</th></tr></thead>';
  const body=show.map(r=>'<tr><td><strong>'+esc(r.name)+'</strong><small>'+esc(r.pos)+(r.status?' · '+esc(r.status):'')+'</small></td>'+
    '<td>'+esc(direction==='incoming'?r.from:r.to)+'</td><td class="marginal-num">'+fmt(r.loss)+'</td>'+
    '<td class="marginal-num">'+fmt(r.gain)+'</td><td class="marginal-num">'+signed(r.edge)+'</td></tr>').join('');
  return '<section class="marginal-list"><div class="marginal-title"><strong>'+title+'</strong><span>'+rows.length+' evaluations'+(show.length<rows.length?' · showing '+show.length:'')+'</span></div>'+
   '<div class="marginal-scroll"><table class="marginal-table">'+header+'<tbody>'+body+'</tbody></table></div>'+
   (!show.length?'<p class="marginal-blank">No matching player projections.</p>':'')+'</section>';
 };
 $('marginalRows').innerHTML=make('incoming',rowsOther,'Other teams → You')+make('outgoing',rowsMine,'You → Other teams');
}
function renderDeals(){
 const target=$('marginalDeals');if(!target)return;
 const team=$('marginalTeam')?.value||'all';
 const chosen=deals.filter(d=>team==='all'||d.inrow.fromId===team);
 const favorable=chosen.filter(d=>d.gainMe>.01&&d.gainThem>.01);
 const show=(favorable.length?favorable:chosen).slice(0,12);
 target.innerHTML='<div class="marginal-title"><strong>Tested 1-for-1 exchanges</strong><span>'+
   (favorable.length?favorable.length+' mutually positive matches':'No mutually positive matches in the screened shortlist')+'</span></div>'+
  '<p class="marginal-explain">These are fully recalculated two-team swaps, not sums of individual values. Other multi-player combinations may work even when single-player swaps do not.</p>'+
  '<div class="marginal-scroll"><table class="marginal-table"><thead><tr><th>You send</th><th>You receive</th><th>Partner</th><th>Your gain</th><th>Their gain</th></tr></thead><tbody>'+
  show.map(x=>'<tr><td>'+esc(x.outrow.name)+'</td><td><strong>'+esc(x.inrow.name)+'</strong></td>'+
   '<td>'+esc(x.inrow.from)+'</td><td class="marginal-num">'+signed(x.gainMe)+'</td><td class="marginal-num">'+signed(x.gainThem)+'</td></tr>').join('')+
   '</tbody></table></div>';
}
function render(){
 if(!done)return;
 renderDeals();renderTables();
}
function run(){
 if(!state)return;
 const runId=++job;done=false;rowsOther=[];rowsMine=[];deals=[];
 const range=weeks();lastWeeks=range;
 setStatus('Preparing lineup baselines…');
 const own=state.rosters.teams.find(t=>String(t.id)===String(state.teamId));
 if(!own){setStatus('Your roster is unavailable.');return;}
 const other=state.rosters.teams.filter(t=>String(t.id)!==String(state.teamId));
 let base;
 try{base=cacheContext(range);}catch(error){setStatus('Could not prepare marginal values.');return;}
 const tasks=other.flatMap(t=>t.players.map(p=>({p,owner:t,to:own,kind:'incoming'}))).concat(
  own.players.flatMap(p=>other.map(t=>({p,owner:own,to:t,kind:'outgoing'}))));
 let n=0;
 const queue=()=>{
  if(runId!==job)return;
  const end=Math.min(n+7,tasks.length);
  for(;n<end;n++){
   const t=tasks[n];
   try{
    const row=computeOne(t.p,t.owner,t.to,base,t.kind,range);
    if(row)(t.kind==='incoming'?rowsOther:rowsMine).push(row);
   }catch(error){/* unscoreable players remain absent, never imputed */}
  }
  setStatus('Valuing '+n+' / '+tasks.length+' player-team combinations…');
  if(n<tasks.length){setTimeout(queue,0);return;}
  const {options,own:manager}=pairings(base,range);
  let idx=0;
  setStatus('Verifying complete two-team trades…');
  const validate=()=>{
   if(runId!==job)return;
   for(let j=0;j<5&&idx<options.length;j++,idx++){
    try{const trade=exactPair(options[idx],manager,range,base.teamBase);if(trade)deals.push(trade);}catch(error){}
   }
   if(idx<options.length){setStatus('Verifying trades '+idx+' / '+options.length+'…');setTimeout(validate,0);return;}
   deals.sort((a,b)=>b.rank-a.rank);
   done=true;
   setStatus(rowsOther.length+' other-team players · '+rowsMine.length+' values for your players · Weeks '+range[0]+'–'+range.at(-1)+' · Model uses stats through Week '+(state.future.statsThroughWeek||'?'));
   render();
  };
  setTimeout(validate,0);
 };
 setTimeout(queue,0);
}
function init(options){
 const el=$('marginalLab');
 if(!el)return;
 if(options.leagueKey!=='csu'||String(options.teamId)!=='7'){el.hidden=true;return;}
 el.hidden=false;
 state={...options,forecasts:new Map(options.future.players.map(p=>[String(p.yahooId),p]))};
 heading();
 for(const id of ['marginalSearch','marginalTeam','marginalPosition','marginalLimit']){
  const control=$(id);if(control)control.addEventListener(id==='marginalSearch'?'input':'change',render);
 }
 const horizon=$('marginalHorizon');if(horizon)horizon.addEventListener('change',run);
 const rows=$('marginalRows');
 if(rows)rows.addEventListener('click',e=>{
  const th=e.target.closest('[data-marginal-sort]');if(!th)return;
  const sort=th.dataset.marginalSort;
  if(sortBy===sort)sortDir*=-1;else{sortBy=sort;sortDir=['name','from','to','pos'].includes(sort)?1:-1;}
  renderTables();
 });
 const trigger=$('marginalRecalculate');if(trigger)trigger.addEventListener('click',run);
 run();
}
root.DaVinciMarginal={init};
})(typeof window!=='undefined'?window:globalThis);
