/* Compact starter, complete bench and injured-reserve roster for the homepage. */
(function(root){
'use strict';
const slots=['QB','RB','RB','WR','WR','TE','W/R/T','K','DEF'];
const positions=new Set(['QB','RB','WR','TE','K','DEF']);
const order={QB:0,RB:1,WR:2,TE:3,K:4,DEF:5};
const excludedNow=new Set(['O','OUT','IR','IR-R','NA','N/A','PUP','PUP-R','CEL','SUSP','SUS']);
const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let state=null;
let forecasts=null,reports=null;
function lookup(p,w){
 const id=String(p.id);
 const f=forecasts.get(id);
 const frame=f?.weeks?.find(x=>Number(x.week)===w);
 if(w===Number(state.snapshotWeek)){
  const report=reports.get(id);
  if(report)return {points:report.weeklyProjectedPoints,state:report.forecastStatus,opp:report.opponent,home:report.location==='home'};
 }
 return frame?{points:frame.points,state:frame.state,opp:frame.opponent,home:frame.home,probability:frame.availabilityProbability}:null;
}
function score(p,w,isReserve){
 if(p.slot==='IR'&&w===Number(state.snapshotWeek))return 'OUT';
 const code=String(p.status||'').toUpperCase();
 if(w===Number(state.snapshotWeek)&&excludedNow.has(code))return 'OUT';
 const frame=lookup(p,w);
 if(!frame)return '—';
 if(frame.state==='bye')return 'BYE';
 if(frame.state==='unavailable_reported')return 'OUT';
 if(frame.points==null||!Number.isFinite(Number(frame.points)))return '—';
 return Number(frame.points).toFixed(1);
}
function workload(p,w){
 const player=forecasts.get(String(p.id));
 const stats=player?.baselineStats;
 const frame=player?.weeks?.find(g=>Number(g.week)===Number(w));
 if(!stats||!frame||frame.state==='bye'||frame.state==='unavailable_reported')return '';
 // Baseline opportunity adjusted modestly for opponent; conditional on playing.
 const factor=Number.isFinite(Number(frame.factor))&&frame.factor!=null?
  Math.max(.85,Math.min(1.15,Number(frame.factor))):1;
 const rounded=(key)=>Math.max(0,Math.round(Number(frame.projectedStats?.[key]??((Number(stats[key])||0)*factor))));
 if(p.position==='RB')return rounded('carries')+' carries · '+rounded('targets')+' targets';
 if(p.position==='WR'||p.position==='TE')return rounded('targets')+' targets · '+rounded('receptions')+' catches';
 if(p.position==='QB')return rounded('passAttempts')+' pass att · '+rounded('carries')+' carries';
 return '';
}
function person(p,slot,w,isReserve){
 const v=score(p,w,isReserve);
 const frame=lookup(p,w);
 const matchup=frame?.state==='bye'?'Bye':
  frame?.opp?(frame.home?'vs ':'@ ')+frame.opp:'';
 const code=String(p.status||'').trim();
 const scenario=frame?.probability!=null&&w>Number(state.snapshotWeek)?Math.round(frame.probability*100)+'% active · ':'';
 const badge=code?'<span class="roster-board-status">'+esc(code)+'</span>':'';
 const activity=workload(p,w);
 const detail=[scenario+matchup,activity].filter(Boolean).join(' · ');
 return '<div class="roster-board-row'+(p.slot==='IR'?' is-ir':'')+'">'+
  '<span class="roster-board-position">'+esc(slot)+'</span>'+
  '<span class="roster-board-player"><strong>'+(root.DaVinciPlayerDetail?.link(p)||esc(p.name))+badge+'</strong>'+
  (detail?'<small>'+esc(detail)+'</small>':'')+'</span>'+
  '<span class="roster-board-points">'+esc(v)+'</span></div>';
}
function render(chosenWeek){
 if(!state)return;
 const rootEl=document.getElementById('myLineup');
 if(!rootEl)return;
 const w=Number(chosenWeek)||Number(state.snapshotWeek);
 const roster=state.rosters.teams.find(t=>String(t.id)===String(state.teamId))?.players||[];
 const yahoo=w===Number(state.snapshotWeek);
 const active=roster.filter(p=>positions.has(p.position)&&(p.slot!=='IR'||(!yahoo&&forecasts.get(String(p.id))?.returnOutlook)));
 const injured=roster.filter(p=>p.slot==='IR');
 const selected=[];
 if(yahoo){
  const waiting=active.filter(p=>p.slot!=='BN');
  for(const slot of slots){const i=waiting.findIndex(p=>p.slot===slot);if(i>=0)selected.push({p:waiting.splice(i,1)[0],slot});}
  selected.push(...waiting.map(p=>({p,slot:p.slot})));
 }else{
  const optimized=state.optimize?.(state.teamId,w);
  if(optimized?.ids){
   for(const item of optimized.ids.slice().sort((a,b)=>a.slot-b.slot)){
    const p=active.find(x=>String(x.id)===String(item.id));
    if(p)selected.push({p,slot:slots[item.slot]||p.position});
   }
  }
 }
 const used=new Set(selected.map(x=>String(x.p.id)));
 const rank=(a,b)=>(order[a.position]??9)-(order[b.position]??9)||
  (Number(lookup(b,w)?.points)||0)-(Number(lookup(a,w)?.points)||0)||a.name.localeCompare(b.name);
 const reserves=active.filter(p=>yahoo?p.slot==='BN':p.slot!=='IR'&&!used.has(String(p.id))).sort(rank);
 const stillInjured=injured.filter(p=>!used.has(String(p.id))).sort(rank);
 const source=yahoo?'Yahoo lineup':'Optimized lineup';
 const starting=selected.length?selected.map(x=>person(x.p,x.slot,w,false)).join(''):
  '<div class="roster-board-empty">No full lineup projection for Week '+esc(w)+'</div>';
 rootEl.innerHTML='<section class="roster-board-section"><div class="roster-board-heading"><strong>Starters</strong><small>'+source+' · '+selected.length+'</small></div>'+
  starting+'</section>'+
  '<section class="roster-board-section"><div class="roster-board-heading"><strong>Bench</strong><small>'+reserves.length+' players</small></div>'+
  (reserves.length?reserves.map(p=>person(p,p.position,w,true)).join(''):'<div class="roster-board-empty">No bench players</div>')+
  (stillInjured.length?'<div class="roster-ir-heading">Injured reserve · '+stillInjured.length+'</div>'+
   stillInjured.map(p=>person(p,p.position,w,true)).join(''):'')+
  '</section>';
}
function init(data){
 state=data;
 forecasts=new Map((state.future?.players||[]).map(p=>[String(p.yahooId),p]));
 reports=new Map((state.weekly?.players||[]).map(p=>[String(p.yahooId),p]));
 render(state.snapshotWeek);
}
root.DaVinciRosterOverview={init,render};
})(typeof window!=='undefined'?window:globalThis);
