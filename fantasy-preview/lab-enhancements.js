/* Da Vinci Fantasy Lab — future-week player detail and legal-lineup trade simulator. */
(function () {
'use strict';
const LAB = {};
const $el = id => document.getElementById(id);
const clean = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = v => v == null || !Number.isFinite(Number(v)) ? '—' : Number(v).toFixed(2);
const SKILL = new Set(['QB','RB','WR','TE']);
const RESTRICTED = new Set(['IR','IR-R','O','OUT','CEL','SUSP','PUP','PUP-R','NFI']);
let selectedWeek = 5;
let futureById = new Map();
let selectedTradeFrom = 6;
let tradeData = null;
function record(p, week) { return p?.weeks?.find(w => Number(w.week) === Number(week)); }
function display(w, futureWeek) {
  if (!w) return '—';
  if (w.state === 'bye') return 'BYE';
  if (w.state === 'unavailable_reported') return 'OUT';
  if (w.state === 'needs_availability_confirmation') return 'CHECK';
  if (w.points == null) return '—';
  return num(w.points);
}
function opp(w) {return !w || !w.opponent ? (w?.state==='bye' ? 'BYE' : '—') : (w.home ? 'vs ' : '@ ') + w.opponent;}
function flag(w, p) {
  if(w?.state==='bye')return '<span class="flag bye">Bye</span>';
  if(w?.state==='unavailable_reported')return '<span class="flag inactive">Unavailable</span>';
  if(w?.state==='needs_availability_confirmation')return '<span class="flag review">Check injury</span>';
  if(w?.state==='assumed_active_future' && p?.injuryStatus)return '<span class="flag review">Status '+clean(p.injuryStatus)+' was reported in Week 5</span>';
  if(w?.state==='assumed_active_future')return '<span class="flag muted">Assuming active</span>';
  return '<span class="flag muted">If active</span>';
}
function eligibleLineup(roster, weekNum){
  let players = roster.filter(p=>SKILL.has(p.position)&&p.rosterSlot!=='IR');
  const score = p => {
    const w=record(p,weekNum);
    if(!w || w.state==='bye') return 0;
    const v=w.points;
    return typeof v==='number' && Number.isFinite(v)?v:0;
  };
  const sortPos = pos => players.filter(p=>p.position===pos).sort((a,b)=>score(b)-score(a));
  let chosen = new Set(), lineup=[];
  const choose = (pos,count) => {for(const p of sortPos(pos)){if(chosen.has(p.yahooId))continue;chosen.add(p.yahooId);lineup.push({p,points:score(p)});if(lineup.filter(x=>x.p.position===pos).length===count)break;}};
  choose('QB',1);choose('RB',2);choose('WR',2);choose('TE',1);
  const remaining = players.filter(p=>p.position!=='QB'&&!chosen.has(p.yahooId)).sort((a,b)=>score(b)-score(a));
  if(remaining.length){chosen.add(remaining[0].yahooId);lineup.push({p:remaining[0],points:score(remaining[0])});}
  return {total:lineup.reduce((a,x)=>a+x.points,0),lineup,covered:lineup.length};
}
function drawBreakdown(p,w) {
  if(!w || w.state==='bye')return '<p class="detail-note">Bye week: no scheduled NFL game.</p>';
  if(w.factor==null)return '<p class="detail-note">No reliable schedule or matchup factor.</p>';
  const cats=futureData.scoringCategories;
  const rows=cats.map(c=>{
    const n=Number(p.baselineStats?.[c.key]||0)*Number(w.factor||1);
    const pts=n*Number(c.pointsPerUnit||0);
    return {name:c.label,stat:n,rate:Number(c.pointsPerUnit),points:pts};
  }).filter(x=>Math.abs(x.stat)>.004||Math.abs(x.points)>.004);
  const statRows=rows.map(x=>'<tr><td>'+clean(x.name)+'</td><td>'+num(x.stat)+'</td><td>'+num(x.rate)+'</td><td>'+num(x.points)+'</td></tr>').join('');
  const sum=rows.reduce((a,x)=>a+x.points,0);
  let msg='<strong>Stat-line estimate and league scoring</strong> · matchup factor '+num(w.factor)+'×';
  if(w.state==='unavailable_reported')msg+=' · this player is marked unavailable; actual Week 5 projection is zero';
  if(w.state==='needs_availability_confirmation')msg+=' · actual Week 5 forecast withheld pending injury confirmation';
  if(w.state==='assumed_active_future')msg+=' · scenario assumes player participates (future injury status unknown)';
  return '<p class="detail-note">'+msg+'</p><div class="score-breakdown-wrap"><table class="score-breakdown"><thead><tr><th>Category</th><th>Proj stat</th><th>Pts/unit</th><th>Fantasy pts</th></tr></thead><tbody>'+statRows+'</tbody><tfoot><tr><td colspan="3">Conditional model total</td><td>'+num(sum)+'</td></tr></tfoot></table></div>'+
    '<p class="detail-note">Expected stat counts may be fractional. Totals exclude unmodeled fumbles, two-point conversions, return scores and special teams. Each component is scaled by the preliminary opponent factor.</p>';
}
function renderFutureProjections(){
  if(!futureData?.players?.length)return;
  const q=($el('projectionSearch')?.value||'').trim().toLowerCase();
  const pos=$el('projectionPos')?.value||'all';
  const scope=$el('projectionOwnership')?.value||'all';
  const mineId='7';
  const list=futureData.players.filter(p=>{
    if(pos!=='all'&&(pos==='offense_no_qb'?!['RB','WR','TE'].includes(p.position):p.position!==pos))return false;
    if(scope==='mine'&&String(p.fantasyTeamId)!==mineId)return false;
    if(scope==='available'&&p.ownership!=='available')return false;
    if(scope==='other'&&(p.ownership!=='rostered'||String(p.fantasyTeamId)===mineId))return false;
    return !q||[p.name,p.fantasyTeam,p.nflTeam,record(p,selectedWeek)?.opponent].some(x=>String(x||'').toLowerCase().includes(q));
  }).sort((a,b)=>{
    const x=record(a,selectedWeek)?.points,y=record(b,selectedWeek)?.points;
    return (y??-100)-(x??-100)||a.name.localeCompare(b.name);
  });
  const data=list.map(p=>{
    const w=record(p,selectedWeek);
    return '<details class="stat-details'+(String(p.fantasyTeamId)===mineId?' my-player':'')+'"><summary><span class="mini-position">'+clean(p.position)+'</span><span class="stat-identity"><strong>'+clean(p.name)+'</strong><small>'+clean(p.fantasyTeam)+' · '+clean(p.nflTeam)+' '+flag(w,p)+'</small></span><span class="stat-opponent">'+clean(opp(w))+'</span><strong class="stat-pts">'+clean(display(w,selectedWeek))+'</strong><span class="expand-chevron" aria-hidden="true">⌄</span></summary><div class="stat-expand">'+drawBreakdown(p,w)+'</div></details>';
  });
  $el('allProjections').innerHTML='<div class="stat-column-head"><span>Player · fantasy team</span><span>Opponent</span><span>Model pts</span></div>'+(data.length?data.join(''):'<div class="empty-copy">No matching players.</div>');
  const n0=futureData.coverage.projected;
  $el('projectionCoverage').textContent=n0+' skill players · Week '+selectedWeek+' · '+(selectedWeek===futureData.startWeek?'current injury status snapshot':'future healthy-play scenario');
  $el('forecastContext').textContent=selectedWeek===futureData.startWeek?
    'Week '+selectedWeek+': reported out/bye designations zeroed; questionable players require confirmation.':'Week '+selectedWeek+': conditional on participating. Future injuries, playing-time changes and trades are not forecast. Bye weeks are zero.';
}
function renderMine(){
  if(!futureData?.players?.length)return;
  const mine=futureData.players.filter(p=>String(p.fantasyTeamId)==='7'&&SKILL.has(p.position));
  mine.sort((a,b)=>(record(b,selectedWeek)?.points??-50)-(record(a,selectedWeek)?.points??-50));
  const preferred=mine.slice(0,9);
  $el('modelStatus').innerHTML='<div class="my-week-heading">Model Week '+selectedWeek+' <span>Experimental</span></div><div class="compact-projection-list">'+preferred.map(p=>{
    const w=record(p,selectedWeek);
    return '<div class="compact-projection-row"><span class="mini-position">'+clean(p.position)+'</span><div><strong>'+clean(p.name)+'</strong><small>'+clean(opp(w))+' · '+clean(p.rosterSlot||'')+'</small></div><span>'+clean(display(w,selectedWeek))+'</span></div>';
  }).join('')+'</div><p class="micro-note">'+(mine.length>9?'Top nine players shown. Expand any player below for stat and scoring details.':'Expand a player below to see the scoring calculation.')+'</p>';
}
const lookup=(id)=>futureById.get(String(id));
function showTrades(){
 const area=$el('tradeResults'),count=$el('tradeCount');
 if(!tradeData?.trades){
   count.textContent='Multi-player trade search loading…';
   area.innerHTML='<div class="empty-copy">Multi-player trade estimates are being prepared. No one-for-one rankings are substituted.</div>';
   return;
 }
 const start=Number($el('tradeFromWeek')?.value||6);
 const partner=$el('tradePartner')?.value||'all';
 const pos=$el('tradePosition')?.value||'offense_no_qb';
 const duration=tradeData.endWeek-start+1;
 const matches=tradeData.trades.flatMap(t=>{
   if(partner!=='all'&&t.partnerTeamId!==partner)return [];
   const both=[...t.youSend,...t.youReceive];
   if(pos==='offense_no_qb'&&both.some(x=>x.position==='QB'))return [];
   if(pos!=='offense_no_qb'&&pos!=='all'&&!t.youReceive.some(x=>x.position===pos))return [];
   const games=t.weeklyGains.filter(w=>w.week>=start);
   const my=games.reduce((s,w)=>s+w.you,0),theirs=games.reduce((s,w)=>s+w.them,0);
   if(my<.15*duration||theirs<.15*duration)return [];
   return [{...t,my,theirs,score:Math.min(my,theirs)+.12*Math.max(my,theirs)}];
 }).sort((a,b)=>b.score-a.score||b.my-a.my);
 const selected=[],teams=new Map();
 for(const p of matches){
   const n=teams.get(p.partnerTeamId)||0;
   if(n>=3)continue;
   selected.push(p);teams.set(p.partnerTeamId,n+1);
   if(selected.length>=10)break;
 }
 count.textContent=matches.length+' qualifying multi-player packages · '+duration+' projected weeks';
 if(!selected.length){
   area.innerHTML='<div class="no-trades">No modeled multi-player package improves both teams’ starting lineups under these filters. Try another team, position group or evaluation period.</div>';
   return;
 }
 const names=ps=>ps.map(p=>'<span class="trade-package-player">'+clean(p.name)+' <small>'+clean(p.position)+'</small></span>').join('');
 area.innerHTML=selected.map((t,i)=>{
   const note=t.requiresRosterAdjustment?'<div class="trade-balance-warning">Unequal player counts: further roster moves may be required by Yahoo.</div>':'';
   return '<article class="trade-card"><div class="trade-card-top"><span class="trade-rank">'+String(i+1).padStart(2,'0')+'</span><span class="trade-partner">'+clean(t.packageShape)+' · With '+clean(t.partnerTeam)+'</span></div>'+
    '<div class="trade-exchange"><div><small>YOU SEND</small><div class="trade-package-players">'+names(t.youSend)+'</div></div><span class="trade-arrow">→</span><div><small>YOU RECEIVE</small><div class="trade-package-players">'+names(t.youReceive)+'</div></div></div>'+
    '<div class="trade-impact"><div><small>Your lineup</small><strong>+'+num(t.my/duration)+'</strong><span>pts/week · +'+num(t.my)+' total</span></div>'+
    '<div><small>Their lineup</small><strong>+'+num(t.theirs/duration)+'</strong><span>pts/week · +'+num(t.theirs)+' total</span></div></div>'+note+'</article>';
 }).join('');
}
function init(){
  if(!futureData||!futureData.players?.length){
    const area=$el('tradeResults');if(area)area.innerHTML='<p>Future-week data is unavailable; no trade projections are shown.</p>';
    return;
  }
  futureById=new Map(futureData.players.map(p=>[String(p.yahooId),p]));
  const weekSel=$el('futureWeek');
  if(weekSel){weekSel.innerHTML=Array.from({length:futureData.endWeek-futureData.startWeek+1},(_,i)=>'<option value="'+(futureData.startWeek+i)+'">Week '+(futureData.startWeek+i)+'</option>').join('');weekSel.value=String(futureData.startWeek);weekSel.addEventListener('change',()=>{selectedWeek=Number(weekSel.value);renderFutureProjections();renderMine();});}
  const tradeSel=$el('tradeFromWeek');
  if(tradeSel){tradeSel.innerHTML=Array.from({length:futureData.endWeek-5},(_,i)=>'<option value="'+(6+i)+'">Weeks '+(6+i)+'–'+futureData.endWeek+'</option>').join('');tradeSel.addEventListener('change',showTrades);}
  $el('tradePosition')?.addEventListener('change',showTrades);
  const partner=$el('tradePartner');
  if(partner){partner.innerHTML='<option value="all">All other teams</option>'+rosters.teams.filter(t=>String(t.id)!=='7').sort((a,b)=>a.name.localeCompare(b.name)).map(t=>'<option value="'+clean(t.id)+'">'+clean(t.name)+'</option>').join('');partner.addEventListener('change',showTrades);}
  renderFutureProjections();renderMine();showTrades();
  fetch('./data/trades.json',{cache:'no-store'}).then(r=>{
    if(!r.ok)throw Error('Trade dataset unavailable');
    return r.json();
  }).then(payload=>{
    if(!Array.isArray(payload.trades))throw Error('Trade dataset incomplete');
    tradeData=payload;
    showTrades();
  }).catch(()=>{
    $el('tradeCount').textContent='Trade package search not yet available';
    $el('tradeResults').innerHTML='<div class="empty-copy">Multi-player trade rankings are being generated. No speculative results are shown.</div>';
  });
}
LAB.init=init;
LAB.renderProjections=renderFutureProjections;
LAB.renderMine=renderMine;
LAB.rankTrades=showTrades;
LAB.optimize=(roster,weekNum)=>eligibleLineup(roster,weekNum);
window.DaVinciLab=LAB;
})();