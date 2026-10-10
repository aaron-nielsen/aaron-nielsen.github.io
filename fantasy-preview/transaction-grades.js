/* Counterfactual transaction grades for completed Yahoo moves.
 * Expected delta = full legal nine-starter model with the move, minus without it,
 * for future weeks covered by the CURRENT model snapshot.
 * This is not a historical at-the-time estimate or actual points earned.
 */
(function(root){
'use strict';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const asId=x=>String(x||'').split('.t.').pop();
const key=x=>String(x?.id??x?.yahooId??'');
const fmt=x=>Number(x).toFixed(1);
let state=null,results=[],historicalRoster=null,loaded=false;
function own(id){return state.rosters.teams.find(t=>String(t.id)===String(asId(id)));}
function toPlayer(p){
 const f=state.forecasts.get(key(p));
 return {id:key(p),name:p.name||f?.name||'Unknown player',
  position:p.position||f?.position,nflTeam:p.team||f?.nflTeam||null,
  slot:f?.rosterSlot==='IR'?'IR':'BN',status:f?.injuryStatus||null};
}
function changeRoster(roster,remove,add){
 const removed=new Set((remove||[]).map(key));
 const kept=roster.filter(p=>!removed.has(key(p)));
 const current=new Set(kept.map(key));
 for(const p of add||[]){
  if(!p?.id||current.has(key(p)))continue;
  kept.push(toPlayer(p));current.add(key(p));
 }
 return kept;
}
function estimate(withRoster,withoutRoster,teamId){
 const weeks=state.weeks;
 const after=[],before=[];
 for(const w of weeks){
  const x=state.optimize(withRoster,w),y=state.optimize(withoutRoster,w);
  if(x&&y&&Number.isFinite(x.score)&&Number.isFinite(y.score)){
   after.push(x.score);before.push(y.score);
  }
 }
 // Only grade scenarios with adequate lineup coverage, not missing QBs/K/DEF.
 if(!weeks.length||after.length!==weeks.length)return null;
 const gain=after.reduce((s,n,i)=>s+n-before[i],0);
 return {avg:gain/after.length,ros:gain,weeks:after.length,teamId};
}
function grade(value){
 if(!value)return {grade:'—',label:'Not rateable'};
 const avg=value.avg;
 if(avg>=3)return {grade:'A+',label:'Major upgrade'};
 if(avg>=1.8)return {grade:'A',label:'Strong upgrade'};
 if(avg>=.8)return {grade:'B',label:'Helpful'};
 if(avg>=-.15)return {grade:'C',label:'Minimal impact'};
 if(avg>=-1)return {grade:'D',label:'Likely downgrade'};
 return {grade:'F',label:'Significant downgrade'};
}
function side(tx,teamId,acquired,dropped){
 const team=own(teamId),tid=String(asId(teamId));
 // Reverse-chronological replay recovers the best available before/after rosters.
 // Direct comparison with today's roster for EACH past move double-counts later transactions.
 const after=historicalRoster?.get(tid);
 if(!team||!after)return {teamId:tid,name:team?.name||'Unknown team',value:null,reason:'Roster not in snapshot'};
 if(!acquired.length&&!dropped.length)return {teamId:tid,name:team.name,value:null,reason:'No player roster change'};
 const missingAcquired=acquired.filter(p=>!after.some(x=>key(x)===key(p)));
 const missingForecast=[...acquired,...dropped].filter(p=>!state.forecasts.has(key(p)));
 const complete=!missingAcquired.length&&!missingForecast.length;
 // If an acquired player is absent from the reconstructed after-roster,
 // reverse replay is no longer anchored to a verified roster state.
 // Do not keep inventing earlier roster states for this manager.
 if(missingAcquired.length){
  historicalRoster.delete(tid);
  return {teamId:tid,name:team.name,value:null,
   reason:'Acquired player absent from reconstructed roster'};
 }
 const before=changeRoster(after,acquired,dropped);
 historicalRoster.set(tid,before);
 const v=complete?estimate(after,before,tid):null;
 return {teamId:tid,name:team.name,value:v,
  reason:missingForecast.length?'Missing player forecast':!v?'Incomplete projected starting lineup':null};
}
function evaluate(tx){
 const isTrade=tx.type==='trade'&&Array.isArray(tx.trade_sides)&&tx.trade_sides.length>=2;
 let sides=[];
 if(isTrade)for(const s of tx.trade_sides)
  sides.push(side(tx,s.team_id,s.acquired||[],s.gave_up||[]));
 else {
  const teamId=tx.team_ids?.[0];
  if(teamId)sides.push(side(tx,teamId,tx.players_added||[],tx.players_dropped||[]));
 }
 // Keep the displayed grade tied to the selected manager, even when ungraded.
 // Never silently substitute another manager's result for a trade.
 const my=sides.find(s=>s.teamId===String(state.teamId));
 const primary=my||sides[0];
 return {...tx,isTrade,sides,primary};
}
function names(players){
 return (players||[]).map(p=>p.name||state.forecasts.get(key(p))?.name||'Unknown').join(', ')||'—';
}
function description(tx){
 if(tx.isTrade)return tx.trade_sides.map(s=>{
  const t=own(s.team_id);
  return '<div class="txn-move"><strong>'+esc(t?.name||'Team')+'</strong>'+
   '<span>Gets '+esc(names(s.acquired))+'</span><small>Sends '+esc(names(s.gave_up))+'</small></div>';
 }).join('');
 const added=tx.players_added||[],dropped=tx.players_dropped||[];
 const pieces=[];
 if(added.length)pieces.push('<div class="txn-move"><strong>Added</strong><span>'+esc(names(added))+'</span></div>');
 if(dropped.length)pieces.push('<div class="txn-move"><strong>Dropped</strong><span>'+esc(names(dropped))+'</span></div>');
 return pieces.join('');
}
function impact(s){
 const g=grade(s.value);
 if(!s.value)return '<div class="txn-impact unscored"><strong>'+esc(s.name)+'</strong><small>Not graded'+(s.reason?' · '+esc(s.reason):'')+'</small></div>';
 const n=s.value.avg,total=s.value.ros,positive=total>.15,negative=total<-.15;
 return '<div class="txn-impact '+(positive?'positive':negative?'negative':'neutral')+'">'+
  '<strong>'+esc(s.name)+'</strong><b>'+(total>=0?'+':'')+fmt(total)+' <small>projected points added</small></b>'+
  '<span>'+(n>=0?'+':'')+fmt(n)+' pts/week · '+s.value.weeks+' remaining weeks</span>'+
  '<small>'+g.grade+' · '+esc(g.label)+'</small></div>';
}
function card(tx){
 const p=tx.primary,g=grade(p?.value);
 const type=tx.isTrade?'Trade':tx.type==='add'&&(tx.players_dropped?.length)?'Add / drop':tx.type==='add'?'Add':'Drop';
 const title=tx.isTrade?'Trade between '+tx.sides.map(s=>s.name).join(' and '):
  (tx.sides[0]?.name||'Manager')+' · '+type;
 const relation=tx.sides.length===2&&tx.sides.every(s=>s.value)?
  (tx.sides.every(s=>s.value.ros>0)?' · Both gain projected points':' · One or both lose projected points'):'';
 return '<article class="txn-card">'+
  '<div class="txn-top"><span class="txn-type">'+esc(type)+'</span><time>'+esc(tx.date||'Unknown date')+'</time>'+
  '<span class="txn-grade">'+(p?.value?esc(g.grade):'Not graded')+'</span></div>'+
  '<h3>'+esc(title)+relation+'</h3>'+
  '<div class="txn-moves">'+description(tx)+'</div>'+
  '<div class="txn-impacts">'+tx.sides.map(impact).join('')+'</div>'+
  '</article>';
}
function update(){
 if(!state)return;
 if(!loaded){
  loaded=true;
  historicalRoster=new Map(state.rosters.teams.map(t=>[String(t.id),t.players.map(p=>({...p}))]));
  const source=(state.transactions?.transactions||[]).filter(t=>t.status==='complete');
  // Replaying newer moves first preserves the team roster as of each transaction.
  source.sort((a,b)=>(b.timestamp||0)-(a.timestamp||0)||
   Number(String(b.transaction_id||'').split('.').pop())-Number(String(a.transaction_id||'').split('.').pop()));
  results=source.map(evaluate);
 }
 const team=$('txnTeam')?.value||'all',type=$('txnType')?.value||'all',sort=$('txnSort')?.value||'recent';
 let rows=results.filter(tx=>(team==='all'||tx.sides.some(s=>s.teamId===team))&&(type==='all'||(type==='trade'?tx.isTrade:type==='add'?(tx.type==='add'):tx.type==='drop')));
 const value=x=>{
  // When filtering a manager, rank transactions by THAT manager's impact.
  const selected=team==='all'?x.primary:x.sides.find(side=>side.teamId===team);
  return selected?.value?.ros;
 };
 // Missing grades are unknown, not negative outcomes: always sort them last.
 const compare=(a,b,direction)=>{
  const x=value(a),y=value(b);
  if(x==null&&y==null)return Number(b.timestamp||0)-Number(a.timestamp||0);
  if(x==null)return 1;
  if(y==null)return -1;
  return direction*(x-y)||Number(b.timestamp||0)-Number(a.timestamp||0);
 };
 if(sort==='best')rows.sort((a,b)=>compare(a,b,-1));
 if(sort==='worst')rows.sort((a,b)=>compare(a,b,1));
 if(sort==='recent')rows.sort((a,b)=>Number(b.timestamp||0)-Number(a.timestamp||0));
 const rated=rows.filter(x=>value(x)!=null).length;
 const missing=rows.length-rated;
 const reasons=new Map();
 for(const tx of rows){
  const selected=team==='all'?tx.primary:tx.sides.find(side=>side.teamId===team);
  if(selected?.value!=null)continue;
  const reason=selected?.reason||'No team-side data';
  reasons.set(reason,(reasons.get(reason)||0)+1);
 }
 const breakdown=[...reasons].sort((a,b)=>b[1]-a[1]).map(([reason,n])=>n+' '+reason.toLowerCase()).join(' · ');
 $('txnStats').textContent=rows.length+' transactions · '+rated+' projected point estimates'+
  (missing?' · '+missing+' ungraded':'');
 $('txnStats').title=breakdown||'All visible transactions graded';
 $('transactionCards').innerHTML=rows.length?rows.map(tx=>{
  const selected=team==='all'?tx.primary:tx.sides.find(side=>side.teamId===team);
  return card({...tx,primary:selected||tx.primary});
 }).join(''):'<p class="txn-empty">No transactions match these filters.</p>';
}
function init(data){
 // Each league has its own rosters, forecasts and transaction history.
 // Rebuild the cached evaluations when switching leagues or refreshing data.
 loaded=false;
 results=[];
 historicalRoster=null;
 state={...data,forecasts:new Map((data.future?.players||[]).map(p=>[String(p.yahooId),p]))};
 state.weeks=Array.from({length:Math.max(0,Number(data.future?.endWeek||17)-Number(data.week)+1)},(_,i)=>Number(data.week)+i);
 const source=data.transactions?.transactions||[];
 const picker=$('txnTeam');
 if(!picker)return;
 picker.innerHTML='<option value="all">All managers</option>'+
  '<option value="'+esc(state.teamId)+'">My team</option>'+
  state.rosters.teams.filter(t=>String(t.id)!==String(state.teamId))
   .slice().sort((a,b)=>a.name.localeCompare(b.name))
   .map(t=>'<option value="'+esc(t.id)+'">'+esc(t.name)+'</option>').join('');
 const coverage=$('txnCoverage');
 if(coverage&&source.length){
  const dates=source.map(t=>t.date).filter(Boolean).sort();
  coverage.textContent='Yahoo activity · '+dates[0]+' to '+dates[dates.length-1]+
   ' · Projected team lineup points added from Week '+data.week+' · current model/rosters · not actual points';
 }
 for(const id of ['txnTeam','txnType','txnSort'])$(id)?.addEventListener('change',update);
 if(!source.length){$('txnStats').textContent='No verified transactions available';return;}
 // Computing ratings only when the tab is opened prevents homepage lag.
 $('txnStats').textContent=source.length+' transactions · open this tab to calculate grades';
}
root.DaVinciTransactions={init,update};
})(typeof window!=='undefined'?window:globalThis);
