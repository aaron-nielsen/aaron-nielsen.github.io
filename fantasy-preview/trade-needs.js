/* Positional starter strength, independent of exact-offer Yahoo coverage. */
(function(root){
'use strict';
const slots={QB:1,RB:2,WR:2,TE:1};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function assess(settings){
 const start=Number(settings.planningWeek||settings.week),end=Math.min(start+3,Number(settings.future.endWeek)||17);
 const weeks=Array.from({length:Math.max(0,end-start+1)},(_,i)=>start+i),map=new Map(settings.future.players.map(p=>[String(p.yahooId),p]));
 const teams=settings.rosters.teams.map(team=>{
  const strengths={};
  for(const [pos,count]of Object.entries(slots)){
   const players=team.players.filter(p=>p.position===pos),totals=[];
   for(const week of weeks){
    const scores=players.map(p=>map.get(String(p.id))?.weeks.find(w=>Number(w.week)===week)?.points);
    if(scores.some(v=>!Number.isFinite(v))){totals.push(null);continue;}
    totals.push(scores.sort((a,b)=>b-a).slice(0,count).reduce((a,b)=>a+b,0)/count);
   }
   strengths[pos]=totals.length&&totals.every(Number.isFinite)?totals.reduce((a,b)=>a+b,0)/totals.length:null;
  }
  return {...team,strengths};
 });
 const median={};for(const pos of Object.keys(slots)){const a=teams.map(t=>t.strengths[pos]).filter(Number.isFinite).sort((a,b)=>a-b);median[pos]=a.length?(a[Math.floor((a.length-1)/2)]+a[Math.floor(a.length/2)])/2:null;}
 for(const t of teams){t.edges=Object.fromEntries(Object.keys(slots).map(pos=>[pos,t.strengths[pos]===null||median[pos]===null?null:t.strengths[pos]-median[pos]]));t.strong=Object.keys(slots).filter(p=>t.edges[p]>=.75).sort((a,b)=>t.edges[b]-t.edges[a]);t.weak=Object.keys(slots).filter(p=>t.edges[p]!==null&&t.edges[p]<=-.75).sort((a,b)=>t.edges[a]-t.edges[b]);}
 const mine=teams.find(t=>String(t.id)===String(settings.teamId));
 return {start,end,teams:teams.filter(t=>t!==mine).map(t=>({...t,offer:t.weak.filter(p=>mine?.edges[p]>=.75),target:t.strong.filter(p=>mine?.edges[p]!==null&&mine?.edges[p]<0)})).sort((a,b)=>(b.offer.length+b.target.length)-(a.offer.length+a.target.length)),mine};
}
function render(settings){
 const el=typeof document!=='undefined'&&document.getElementById('tradeTeamNeeds');if(!el)return;
 const result=assess(settings);
 el.innerHTML='<div class="panel-header"><div><div class="panel-title">Who needs what?</div><div class="panel-sub">Da Vinci · next '+(result.end-result.start+1)+' weeks · strength versus league median</div></div></div><div class="trade-needs-grid">'+result.teams.map(t=>{
  const strong=t.strong.length?'Strong: '+t.strong.join(', '):'No clear positional strength';
  const weak=t.weak.length?'Needs: '+t.weak.join(', '):'No clear positional gap';
  const idea=t.offer.length&&t.target.length?'Explore your '+t.offer.join('/')+' for their '+t.target.join('/')+'.':t.offer.length?'Your '+t.offer.join('/')+' depth could address their needs.':t.target.length?'Explore their '+t.target.join('/')+' depth.':'No obvious complementary fit.';
  const partial=Object.values(t.edges).some(v=>v===null);
  return '<article class="trade-needs-card"><strong>'+esc(t.name)+'</strong><p>'+esc(strong)+'<br>'+esc(weak)+'</p><p>'+esc(idea)+'</p>'+(String(t.id)===String(settings.opponentId)?'<small>This week’s opponent · consider waiting</small>':'')+(partial?'<small>Some positions need projections</small>':'')+'</article>';
 }).join('')+'</div>';
}
root.DaVinciTradeNeeds={assess,render};
})(typeof window!=='undefined'?window:globalThis);
