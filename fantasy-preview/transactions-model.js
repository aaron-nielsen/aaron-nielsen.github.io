/* Transaction grades: replay verified Yahoo ledger backwards from current league rosters.
 * Grades compare optimal starting lineups using the CURRENT forward-looking model.
 * This is not an original-at-the-time prediction or verified realized point gain.
 */
(function(root){
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const fmt=n=>(n>=0?'+':'')+Number(n).toFixed(1);
const id=p=>String(p.id||p.yahooId);
const teamId=s=>String(s||'').split('.').pop();
const order=t=>Number(String(t.transaction_id||'').split('.').pop())||0;
function grade(avg){
 if(!Number.isFinite(avg))return {label:'—',tone:'unknown'};
 if(avg>=1.6)return {label:'A',tone:'good'};
 if(avg>=.8)return {label:'B',tone:'good'};
 if(avg>=-.65)return {label:'C',tone:'neutral'};
 if(avg>=-1.6)return {label:'D',tone:'bad'};
 return {label:'F',tone:'bad'};
}
function replaySide(side,rosters,forecasts){
 const after=rosters.get(side.teamId)?.map(p=>({...p}));
 if(!after)return {after:null,before:null,complete:false};
 const current=new Set(after.map(id));
 const complete=side.acquired.every(p=>current.has(String(p.id)))&&
  [...side.acquired,...side.gaveUp].every(p=>forecasts.has(String(p.id)));
 const removed=new Set(side.acquired.map(p=>String(p.id)));
 const before=after.filter(p=>!removed.has(id(p)));
 for(const p of side.gaveUp){
  if(before.some(x=>id(x)===String(p.id)))continue;
  const f=forecasts.get(String(p.id));
  before.push({
   id:String(p.id),name:p.name||f?.name||'Unknown player',
   position:p.position||f?.position,nflTeam:p.team||f?.nflTeam,
   slot:'BN',status:f?.injuryStatus||null
  });
 }
 return {after,before,complete};
}
function sidesOf(tx){
 if(tx.type==='trade'&&Array.isArray(tx.trade_sides)&&tx.trade_sides.length)
  return tx.trade_sides.map(s=>({
   teamId:teamId(s.team_id),acquired:s.acquired||[],gaveUp:s.gave_up||[]
  }));
 const team=teamId(tx.team_ids?.[0]);
 return team?[{teamId:team,acquired:tx.players_added||[],gaveUp:tx.players_dropped||[]}]:[];
}
function analyze({transactions,rosters,future,week,optimize,horizon='ros'}){
 if(!transactions?.transactions?.length||!rosters?.teams?.length||typeof optimize!=='function')return [];
 const forecasts=new Map((future?.players||[]).map(p=>[String(p.yahooId),p]));
 const rosterMap=new Map(rosters.teams.map(t=>[String(t.id),t.players.map(p=>({...p}))]));
 const labels=new Map(rosters.teams.map(t=>[String(t.id),t.name]));
 const lower=Math.max(Number(week)||5,Number(future.startWeek)||5),last=Number(future.endWeek)||17;
 const weeks=Array.from({length:Math.max(0,horizon==='next4'?Math.min(4,last-lower+1):last-lower+1)},(_,i)=>lower+i);
 const ledger=transactions.transactions.slice().sort((a,b)=>(b.timestamp||0)-(a.timestamp||0)||order(b)-order(a));
 const rows=[];
 for(const tx of ledger){
  const sides=sidesOf(tx);
  for(const side of sides){
   const {after,before,complete}=replaySide(side,rosterMap,forecasts);
   const applicable=after&&before&&complete&&weeks.length>0;
   let actualImpact=null,weekly=null;
   if(applicable){
    const delta=[];
    for(const w of weeks){
     const a=optimize(after,w),b=optimize(before,w);
     if(!a||!b||!Number.isFinite(a.score)||!Number.isFinite(b.score)){delta.length=0;break;}
     delta.push({week:w,gain:a.score-b.score});
    }
    if(delta.length===weeks.length){
     actualImpact=delta.reduce((n,p)=>n+p.gain,0);
     weekly=delta;
    }
   }
   const gainPerWeek=actualImpact==null?null:actualImpact/weeks.length;
   rows.push({id:String(tx.transaction_id)+'/'+side.teamId,date:tx.date,
    timestamp:tx.timestamp||0,type:tx.type||'unknown',teamId:side.teamId,
    teamName:labels.get(side.teamId)||'Team '+side.teamId,
    added:side.acquired,dropped:side.gaveUp,
    expectedTotal:actualImpact,expectedPerWeek:gainPerWeek,
    grade:grade(gainPerWeek),weeks:weekly,covered:weeks.length,
    reason:actualImpact==null?'Incomplete player projections or historical roster':null
   });
   // Work backwards through completed transactions, building the team's earlier roster.
   if(before)rosterMap.set(side.teamId,before);
  }
 }
 return rows;
}
function labelMove(row){
 const joined=ps=>ps.length?ps.map(p=>esc(p.name||p.id)).join(', '):'—';
 if(row.type==='trade')return '<b>Receive '+joined(row.added)+'</b><small>Send '+joined(row.dropped)+'</small>';
 if(row.added.length&&row.dropped.length)return '<b>Add '+joined(row.added)+'</b><small>Drop '+joined(row.dropped)+'</small>';
 if(row.added.length)return '<b>Add '+joined(row.added)+'</b>';
 if(row.dropped.length)return '<b>Drop '+joined(row.dropped)+'</b>';
 return '<b>Roster transaction</b>';
}
let state=null,cache=new Map(),ready=false;
function draw(){
 const area=$('transactionRows');if(!area||!state)return;
 const horizon=$('transactionHorizon')?.value||'ros';
 if(!cache.has(horizon))cache.set(horizon,analyze({...state,horizon}));
 let rows=cache.get(horizon);
 const team=$('transactionTeam')?.value||'all',type=$('transactionType')?.value||'all',sort=$('transactionSort')?.value||'impact';
 if(team!=='all')rows=rows.filter(r=>r.teamId===team);
 if(type!=='all')rows=rows.filter(r=>type==='moves'?r.type!=='trade':r.type===type);
 rows=rows.slice().sort((a,b)=>{
  if(sort==='date')return b.timestamp-a.timestamp;
  return (b.expectedPerWeek??-Infinity)-(a.expectedPerWeek??-Infinity)||b.timestamp-a.timestamp;
 });
 const graded=rows.filter(r=>r.expectedTotal!=null);
 const wins=graded.filter(r=>r.expectedPerWeek>=.8).length,
  losses=graded.filter(r=>r.expectedPerWeek<=-.8).length;
 const summary=$('transactionSummary');
 if(summary)summary.textContent=rows.length+' team impacts · '+graded.length+' graded · '+wins+' strong gains · '+losses+' costly moves';
 area.innerHTML=rows.length?rows.map(r=>{
  const forecast=r.expectedTotal==null?'<span class="tx-unrated">Unrated</span>':
   '<strong class="tx-impact '+(r.expectedPerWeek>0.05?'positive':r.expectedPerWeek<-.05?'negative':'neutral')+'">'+fmt(r.expectedTotal)+' <small>pts ROS</small></strong>'+
   '<small>'+fmt(r.expectedPerWeek)+' pts/week</small>';
  const detail=r.weeks?'<details class="tx-detail"><summary>Weekly impact</summary><div class="tx-weeks">'+
   r.weeks.map(w=>'<span>W'+w.week+' <b>'+fmt(w.gain)+'</b></span>').join('')+
   '</div></details>':'';
  return '<article class="tx-row"><span class="tx-grade '+r.grade.tone+'">'+r.grade.label+'</span>'+
   '<div class="tx-main"><div class="tx-meta">'+esc(r.teamName)+' · '+esc(r.date||'')+
   (r.type==='trade'?' · Trade':'')+'</div>'+labelMove(r)+detail+'</div>'+
   '<div class="tx-score">'+forecast+'</div></article>';
 }).join(''):'<div class="tx-empty">No transactions match these filters.</div>';
}
function render(){
 if(!state)return;
 if(!ready){
  ready=true;
  const select=$('transactionTeam');
  if(select){
   select.innerHTML='<option value="all">All teams</option>'+
    '<option value="'+esc(String(state.teamId))+'">My team</option>'+
    state.rosters.teams.filter(t=>String(t.id)!==String(state.teamId))
     .sort((a,b)=>a.name.localeCompare(b.name))
     .map(t=>'<option value="'+esc(String(t.id))+'">'+esc(t.name)+'</option>').join('');
  }
  for(const key of ['transactionTeam','transactionType','transactionSort','transactionHorizon'])
   $(key)?.addEventListener('change',draw);
  const coverage=state.transactions?.coverage?.window;
  const range=$('transactionCoverage');
  if(range&&coverage?.start_timestamp_ms&&coverage?.end_timestamp_ms){
   const date=x=>new Date(x).toLocaleDateString(undefined,{month:'short',day:'numeric'});
   range.textContent='Yahoo transactions · '+date(coverage.start_timestamp_ms)+'–'+date(coverage.end_timestamp_ms);
  }
 }
 draw();
}
function init(data){state=data;cache=new Map();ready=false;}
root.DaVinciTransactions={init,analyze,render,grade};
})(typeof window!=='undefined'?window:globalThis);
