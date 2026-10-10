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
let draftData = null;
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
// Future totals are HEALTHY-PLAY SCENARIOS, not injury-adjusted expectations.
// Players with no current NFL availability (NA) get no actionable forecast.
const NONACTIVE = new Set(['NA','N/A','IR','IR-R','PUP','PUP-R','NFI','NFI-R','CEL','SUSP','SUS']);
const UNCERTAIN = new Set(['O','OUT','Q','D','GTD','QUESTIONABLE','DOUBTFUL']);
function liveStatus(p){
  const yid=String(p.yahooId);
  const entry=available?.players?.find(x=>String(x.id)===yid);
  const owner=rosters?.teams?.flatMap(t=>t.players).find(x=>String(x.id)===yid);
  return String(entry?.status || owner?.status || p.injuryStatus || '').toUpperCase().trim();
}
function access(p){
  const code=liveStatus(p);
  if(NONACTIVE.has(code)||code.startsWith('IR-')||code.startsWith('PUP-'))return {usable:false,review:true,status:code,reason:'Not currently active / no actionable projection'};
  if(UNCERTAIN.has(code))return {usable:true,review:true,status:code,reason:'Playing status uncertain — conditional if active'};
  return {usable:true,review:false,status:code,reason:'Assuming participation'};
}
function activeValue(p,w){
  if(!w)return null;
  if(w.state==='bye')return 0;
  if(!access(p).usable)return null;
  const n=Number(w.activePoints ?? w.points);
  return Number.isFinite(n)?n:null;
}
function horizon(p){
  const start=Math.max(6,selectedWeek);
  const future=(p.weeks||[]).filter(w=>w.week>=start);
  const played=future.filter(w=>w.opponent&&w.state!=='bye'&&w.state!=='unknown_schedule');
  const four=played.slice(0,4);
  const tally=rows=>{
    if(!access(p).usable)return null;
    const values=rows.map(w=>activeValue(p,w));
    if(values.some(v=>v==null))return null;
    return values.reduce((a,b)=>a+b,0);
  };
  return {start, next:played[0], four, ros:future,
          nextPts:tally(played.slice(0,1)),
          fourPts:four.length===4?tally(four):null,
          rosPts:tally(future),
          games:played.length};
}
const statValue=v=>{const a=Math.abs(Number(v));const precision=a>0&&a<0.1?3:a<1?2:1;return Number(v).toFixed(precision).replace(/\.?0+$/,'');};
function summaryPts(value){return value==null?'—':num(value);}
function breakdown(p,w){
  const state=access(p);
  if(!state.usable)return '<p class="detail-message caution"><strong>Not active:</strong> '+clean(p.name)+' has Yahoo designation '+clean(state.status)+'. Historical production is not an actionable forecast. No next-four or ROS points are claimed.</p>';
  if(!w || w.state==='bye')return '<p class="detail-message">No game is scheduled for the selected week.</p>';
  if(w.factor==null)return '<p class="detail-message">Opponent or schedule information is unavailable for this week.</p>';
  const cats=futureData.scoringCategories;
  const rows=cats.map(c=>{
    const value=Number(p.baselineStats?.[c.key]||0)*Number(w.factor||1);
    const rate=Number(c.pointsPerUnit||0);
    return {name:c.label,stat:value,rate,points:value*rate};
  }).filter(x=>Math.abs(x.stat)>.004||Math.abs(x.points)>.004);
  const total=rows.reduce((n,x)=>n+x.points,0);
  const h=horizon(p);
  const caution=state.review?'<p class="detail-message caution">Yahoo status '+clean(state.status)+': playing availability is uncertain; all future totals below assume full participation.</p>':'';
  const cards='<div class="player-horizons">'+
    '<div><span>Next scheduled game</span><strong>'+summaryPts(h.nextPts)+'</strong><small>'+(h.next?'Week '+h.next.week:'No game')+'</small></div>'+
    '<div><span>Next 4 games</span><strong>'+summaryPts(h.fourPts)+'</strong><small>'+h.four.map(v=>'W'+v.week).join(' · ')+'</small></div>'+
    '<div><span>Rest of season</span><strong>'+summaryPts(h.rosPts)+'</strong><small>Weeks '+h.start+'–'+futureData.endWeek+' · bye weeks = 0</small></div>'+
    '</div>';
  const compact=rows.map(x=>'<div class="stat-component"><span>'+clean(x.name)+'</span><span>'+statValue(x.stat)+' × '+statValue(x.rate)+'</span><strong>'+num(x.points)+'</strong></div>').join('');
  return caution+cards+
    '<div class="stat-compact-heading">Selected-week scoring details <small>Opponent factor '+num(w.factor)+'×</small></div>'+
    '<div class="stat-components">'+compact+'</div>'+
    '<div class="stat-component total"><span>Conditional points</span><span>Model total</span><strong>'+num(total)+'</strong></div>'+
    '<p class="detail-disclaimer">Expected stats may be fractional. Missing fumbles, two-point plays, return scores and special teams. Four-game and ROS numbers are scenarios assuming participation, not injury-adjusted expected points.</p>';
}
function renderFutureProjections(){
  if(!futureData?.players?.length)return;
  const q=($el('projectionSearch')?.value||'').trim().toLowerCase();
  const pos=$el('projectionPos')?.value||'all';
  const scope=$el('projectionOwnership')?.value||'all';
  const mineId='7';
  const list=futureData.players.filter(p=>{
    if(pos!=='all' && !(pos==='offense_no_qb' ? ['RB','WR','TE'].includes(p.position):p.position===pos))return false;
    if(scope==='mine'&&String(p.fantasyTeamId)!==mineId)return false;
    if(scope==='available'&&p.ownership!=='available')return false;
    if(scope==='other'&&(p.ownership!=='rostered'||String(p.fantasyTeamId)===mineId))return false;
    return !q||[p.name,p.fantasyTeam,p.nflTeam,record(p,selectedWeek)?.opponent].some(x=>String(x||'').toLowerCase().includes(q));
  }).sort((a,b)=>{
    const av=activeValue(a,record(a,selectedWeek));
    const bv=activeValue(b,record(b,selectedWeek));
    return (bv??-100)-(av??-100)||a.name.localeCompare(b.name);
  });
  const listHtml=list.map(p=>{
    const w=record(p,selectedWeek),a=access(p),h=horizon(p);
    const stateLabel=!a.usable?'Not active':a.review?'Status: '+a.status:w?.state==='bye'?'Bye':selectedWeek>5?'If active':'Model';
    const current=!a.usable?'—':w?.state==='bye'?'BYE':display(w,selectedWeek);
    return '<details class="stat-details'+(String(p.fantasyTeamId)===mineId?' my-player':'')+(a.usable?'':' no-availability')+'">'+
      '<summary><span class="mini-position">'+clean(p.position)+'</span>'+
      '<span class="stat-identity"><strong>'+clean(p.name)+'</strong><small>'+clean(p.fantasyTeam)+' · '+clean(p.nflTeam)+' · '+clean(opp(w))+' <span class="forecast-flag">'+clean(stateLabel)+'</span></small></span>'+
      '<strong class="stat-value">'+clean(current)+'</strong>'+
      '<strong class="stat-value">'+summaryPts(h.fourPts)+'</strong>'+
      '<strong class="stat-value">'+summaryPts(h.rosPts)+'</strong>'+
      '<span class="expand-chevron" aria-hidden="true">⌄</span></summary>'+
      '<div class="stat-expand">'+breakdown(p,w)+'</div></details>';
  }).join('');
  $el('allProjections').innerHTML=
    '<div class="stat-column-head"><span>Player / matchup</span><span>Week '+selectedWeek+'</span><span>Next 4 games</span><span>ROS</span></div>'+
    (listHtml||'<div class="empty-copy">No matching players.</div>');
  $el('projectionCoverage').textContent=futureData.coverage.projected+' modeled skill players · stats through completed Week '+futureData.statsThroughWeek;
  $el('forecastContext').textContent='Week '+selectedWeek+' points and future totals assume participation unless marked otherwise. Next four means four scheduled NFL games, skipping byes; ROS begins Week '+Math.max(6,selectedWeek)+'. Players not currently active are not given actionable point totals.';
}
function renderMine(){
  if(!futureData?.players?.length)return;
  const mine=futureData.players.filter(p=>String(p.fantasyTeamId)==='7'&&SKILL.has(p.position));
  mine.sort((a,b)=>(activeValue(b,record(b,selectedWeek))??-100)-(activeValue(a,record(a,selectedWeek))??-100));
  const preferred=mine.slice(0,9);
  $el('modelStatus').innerHTML='<div class="my-week-heading">Week '+selectedWeek+' <span>Experimental</span></div>'+
    '<div class="compact-projection-list">'+preferred.map(p=>{
      const w=record(p,selectedWeek),h=horizon(p),a=access(p);
      const current=!a.usable?'—':display(w,selectedWeek);
      return '<div class="compact-projection-row"><span class="mini-position">'+clean(p.position)+'</span>'+
        '<div><strong>'+clean(p.name)+'</strong><small>'+clean(opp(w))+' · 4 games '+summaryPts(h.fourPts)+' · ROS '+summaryPts(h.rosPts)+(a.review?' · check status':'')+'</small></div><span>'+clean(current)+'</span></div>';
    }).join('')+'</div>'+
    '<p class="micro-note">Four-game and ROS figures are healthy-play scenarios, not injury-adjusted expectations. Expand a player below for the scoring calculation.</p>';
}
const lookup=(id)=>futureById.get(String(id));

function draftPick(p){
 if(!draftData?.picks)return null;
 const id=String(p.yahooId);
 const match=draftData.picks.find(d=>String(d.playerId)===id);
 return match?.pick??null;
}
function premiumTradeCheck(t){
 const firstRound=ps=>ps.filter(p=>{const pick=draftPick(p);return pick!=null&&pick<=14;});
 const outgoing=firstRound(t.youSend), incoming=firstRound(t.youReceive);
 if(incoming.length && !outgoing.length){
   return {ok:false, reason:'Premium asset: '+incoming.map(p=>p.name+' (draft pick #'+draftPick(p)+')').join(', ')+'. No first-round player offered in return.'};
 }
 if(outgoing.length && !incoming.length){
   return {ok:false, reason:'You would surrender a first-round asset without receiving one.'};
 }
 return {ok:true,reason:null};
}
function stableGain(games,key){
 if(!games.length)return false;
 const gains=games.map(w=>Number(w[key]||0));
 const total=gains.reduce((a,b)=>a+b,0);
 return total-Math.max(...gains)>=0;
}
function showTrades(){
 const area=$el('tradeResults'),count=$el('tradeCount');
 if(!tradeData?.trades || !draftData?.picks){
   count.textContent='Loading modeled trades…';
   area.innerHTML='<div class="empty-copy">Multi-player trade estimates are being prepared.</div>';
   return;
 }
 const start=Number($el('tradeFromWeek')?.value||6);
 const partner=$el('tradePartner')?.value||'all';
 const pos=$el('tradePosition')?.value||'offense_no_qb';
 const packageFilter=$el('tradePackageFilter')?.value||'balanced';
 const duration=tradeData.endWeek-start+1;
 const minimumWeeklyGain=packageFilter==='balanced'?0.5:0.15;
 const matches=tradeData.trades.flatMap(t=>{
   if(partner!=='all'&&t.partnerTeamId!==partner)return [];
   const check=premiumTradeCheck(t);
   if(packageFilter!=='all' && (t.requiresRosterAdjustment || !check.ok))return [];
   const both=[...t.youSend,...t.youReceive];
   if(pos==='offense_no_qb'&&both.some(p=>p.position==='QB'))return [];
   if(pos!=='offense_no_qb'&&pos!=='all'&&!t.youReceive.some(p=>p.position===pos))return [];
   const games=t.weeklyGains.filter(w=>w.week>=start);
   if(games.length!==duration)return [];
   const my=games.reduce((s,w)=>s+w.you,0);
   const theirs=games.reduce((s,w)=>s+w.them,0);
   if(my<minimumWeeklyGain*duration||theirs<minimumWeeklyGain*duration)return [];
   // The favored horizon should not depend entirely on one spectacular bye week.
   if(packageFilter==='balanced' && (!stableGain(games,'you')||!stableGain(games,'them')))return [];
   return [{...t,my,theirs,marketCheck:check,score:Math.min(my,theirs)+0.12*Math.max(my,theirs)}];
 }).sort((a,b)=>b.score-a.score||b.my-a.my);
 const selected=[],teams=new Map();
 for(const p of matches){
   const countForPartner=teams.get(p.partnerTeamId)||0;
   if(countForPartner>=2)continue;
   selected.push(p);teams.set(p.partnerTeamId,countForPartner+1);
   if(selected.length>=8)break;
 }
 const label=packageFilter==='balanced'?'balanced trades with meaningful gains':
             packageFilter==='balanced_all'?'balanced trades':'multi-player packages';
 count.textContent=matches.length+' modeled '+label+' · '+duration+' weeks';
 if(!selected.length){
   area.innerHTML='<div class="no-trades">No qualifying packages for this combination. Try a different partner or select “All balanced trades” to see smaller modeled gains.</div>';
   return;
 }
 const names=ps=>'<ul class="trade-person-list">'+ps.map(p=>
   '<li class="trade-person"><span>'+clean(p.name)+'</span><span class="trade-pos">'+clean(p.position)+'</span></li>'
 ).join('')+'</ul>';
 area.innerHTML=selected.map((t,i)=>{
   const note=(t.requiresRosterAdjustment?'<p class="trade-balance-note">Unequal player counts: Yahoo may require extra roster moves.</p>':'')+
      (!t.marketCheck.ok?'<p class="trade-balance-note trade-premium-warning">Market plausibility warning: '+clean(t.marketCheck.reason)+'</p>':'');
   return '<article class="trade-card compact-trade">'+
    '<div class="trade-card-top"><div class="trade-card-identity"><span class="trade-rank">'+String(i+1).padStart(2,'0')+'</span><strong>'+clean(t.partnerTeam)+'</strong></div>'+
    '<span class="trade-package-label">'+clean(t.packageShape)+'</span></div>'+
    '<div class="trade-exchange"><div class="trade-side"><div class="trade-side-heading">YOU SEND</div>'+names(t.youSend)+'</div>'+
    '<div class="trade-side"><div class="trade-side-heading">YOU RECEIVE</div>'+names(t.youReceive)+'</div></div>'+
    '<div class="trade-impact"><div><span>Your lineup</span><strong>+'+num(t.my/duration)+' <small>pts/wk</small></strong>'+
      '<small>+'+num(t.my)+' over '+duration+' weeks</small></div>'+
    '<div><span>Their lineup</span><strong>+'+num(t.theirs/duration)+' <small>pts/wk</small></strong>'+
      '<small>+'+num(t.theirs)+' over '+duration+' weeks</small></div></div>'+note+'</article>';
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
  $el('tradePackageFilter')?.addEventListener('change',showTrades);
  const partner=$el('tradePartner');
  if(partner){partner.innerHTML='<option value="all">All other teams</option>'+rosters.teams.filter(t=>String(t.id)!=='7').sort((a,b)=>a.name.localeCompare(b.name)).map(t=>'<option value="'+clean(t.id)+'">'+clean(t.name)+'</option>').join('');partner.addEventListener('change',showTrades);}
  renderFutureProjections();renderMine();showTrades();
  Promise.all([
    fetch('./data/trades.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Trade dataset unavailable');return r.json();}),
    fetch('./data/draft.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Draft capital unavailable');return r.json();})
  ]).then(([trades,draft])=>{
    if(!Array.isArray(trades.trades) || !Array.isArray(draft.picks) || draft.picks.length<100)
      throw Error('Draft or trade data incomplete');
    tradeData=trades;draftData=draft;
    showTrades();
  }).catch(()=>{
    $el('tradeCount').textContent='Trade screening unavailable';
    $el('tradeResults').innerHTML='<div class="empty-copy">Trade recommendations are withheld until league draft capital and forecasts can be verified.</div>';
  });
}
LAB.init=init;
LAB.renderProjections=renderFutureProjections;
LAB.renderMine=renderMine;
LAB.rankTrades=showTrades;
LAB.optimize=(roster,weekNum)=>eligibleLineup(roster,weekNum);
window.DaVinciLab=LAB;
})();