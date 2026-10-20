/* Da Vinci Fantasy Lab — future-week player detail and legal-lineup trade simulator. */
(function () {
'use strict';
const LAB = {};
const $el = id => document.getElementById(id);
const clean = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = v => v == null || !Number.isFinite(Number(v)) ? '—' : Number(v).toFixed(2);
const SKILL = new Set(['QB','RB','WR','TE']);
const ALL_POSITIONS = new Set(['QB','RB','WR','TE','K','DEF']);
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
  if(w?.state==='assumed_active_future' && p?.injuryStatus)return '<span class="flag review">Status '+clean(p.injuryStatus)+' was reported in the roster snapshot</span>';
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
  const special=(p.position==='K'||p.position==='DEF')&&Array.isArray(w.components);
  const cats=futureData.scoringCategories;
  const rows=special?w.components.map(x=>({name:x.label,stat:x.stat,rate:null,points:x.points,attempts:x.attempts})):
   cats.map(c=>{
    const value=Number(p.baselineStats?.[c.key]||0)*Number(w.factor||1);
    const rate=Number(c.pointsPerUnit||0);
    return {name:c.label,stat:value,rate,points:value*rate};
   }).filter(x=>Math.abs(x.stat)>.004||Math.abs(x.points)>.004);
  const total=special?Number(w.points):rows.reduce((n,x)=>n+x.points,0);
  const h=horizon(p);
  const caution=state.review?'<p class="detail-message caution">Yahoo status '+clean(state.status)+': playing availability is uncertain; all future totals below assume full participation.</p>':'';
  const cards='<div class="player-horizons">'+
    '<div><span>Next scheduled game</span><strong>'+summaryPts(h.nextPts)+'</strong><small>'+(h.next?'Week '+h.next.week:'No game')+'</small></div>'+
    '<div><span>Next 4 games</span><strong>'+summaryPts(h.fourPts)+'</strong><small>'+h.four.map(v=>'W'+v.week).join(' · ')+'</small></div>'+
    '<div><span>Rest of season</span><strong>'+summaryPts(h.rosPts)+'</strong><small>Weeks '+h.start+'–'+futureData.endWeek+' · bye weeks = 0</small></div>'+
    '</div>';
  const compact=rows.map(x=>'<div class="stat-component"><span>'+clean(x.name)+'</span><span>'+(special?(x.attempts==null?statValue(x.stat):statValue(x.stat)+' made / '+statValue(x.attempts)+' attempts'):statValue(x.stat)+' × '+statValue(x.rate))+'</span><strong>'+num(x.points)+'</strong></div>').join('');
  return caution+cards+
    '<div class="stat-compact-heading">Selected-week scoring details <small>'+(special?'Opponent/venue adjusted':'Opponent factor '+num(w.factor)+'×')+'</small></div>'+
    '<div class="stat-components">'+compact+'</div>'+
    '<div class="stat-component total"><span>Conditional points</span><span>Model total</span><strong>'+num(total)+'</strong></div>'+
    '';

}
function renderFutureProjections(){
  if(!futureData?.players?.length)return;
  const q=($el('projectionSearch')?.value||'').trim().toLowerCase();
  const pos=$el('projectionPos')?.value||'all';
  const scope=$el('projectionOwnership')?.value||'all';
  const mineId=String(window.DaVinciLeague?.teamId||'7');
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
  const limit=$el('projectionLimit')?.value||'50';
  const shown=limit==='all'?list:list.slice(0,Number(limit)||50);
  const listHtml=shown.map(p=>{
    const w=record(p,selectedWeek),a=access(p),h=horizon(p);
    const stateLabel=!a.usable?'Not active':a.review?'Status: '+a.status:w?.state==='bye'?'Bye':'';
    const current=!a.usable?'—':w?.state==='bye'?'BYE':display(w,selectedWeek);
    return '<details class="stat-details'+(String(p.fantasyTeamId)===mineId?' my-player':'')+(a.usable?'':' no-availability')+'">'+
      '<summary><span class="mini-position">'+clean(p.position)+'</span>'+
      '<span class="stat-identity"><strong>'+(window.DaVinciPlayerDetail?.link(p)||clean(p.name))+'</strong><small>'+clean(p.fantasyTeam)+' · '+clean(p.nflTeam)+' · '+clean(opp(w))+' <span class="forecast-flag">'+clean(stateLabel)+'</span></small></span>'+
      '<strong class="stat-value">'+clean(current)+'</strong>'+
      '<strong class="stat-value">'+summaryPts(h.fourPts)+'</strong>'+
      '<strong class="stat-value">'+summaryPts(h.rosPts)+'</strong>'+
      '<span class="expand-chevron" aria-hidden="true">⌄</span></summary>'+
      '<div class="stat-expand">'+breakdown(p,w)+'</div></details>';
  }).join('');
  $el('allProjections').innerHTML=
    '<div class="stat-column-head"><span>Player / matchup</span><span>Week '+selectedWeek+'</span><span>Next 4 games</span><span>ROS</span></div>'+
    (listHtml||'<div class="empty-copy">No matching players.</div>');
  $el('projectionCoverage').textContent=shown.length+' of '+list.length+' matching players · model stats through Week '+futureData.statsThroughWeek;
  $el('forecastContext').textContent='Week '+selectedWeek+' points and future totals assume participation unless marked otherwise. Next four means four scheduled NFL games, skipping byes; ROS begins Week '+Math.max(6,selectedWeek)+'. Players not currently active are not given actionable point totals.';
}
function renderMine(){
  if(!futureData?.players?.length)return;
  const mine=futureData.players.filter(p=>String(p.fantasyTeamId)===String(window.DaVinciLeague?.teamId||'7')&&ALL_POSITIONS.has(p.position));
  mine.sort((a,b)=>(activeValue(b,record(b,selectedWeek))??-100)-(activeValue(a,record(a,selectedWeek))??-100));
  const preferred=mine.slice(0,12);
  $el('modelStatus').innerHTML='<div class="my-week-heading">Week '+selectedWeek+'</div>'+
    '<div class="compact-projection-list">'+preferred.map(p=>{
      const w=record(p,selectedWeek),h=horizon(p),a=access(p);
      const current=!a.usable?'—':display(w,selectedWeek);
      return '<div class="compact-projection-row"><span class="mini-position">'+clean(p.position)+'</span>'+
        '<div><strong>'+(window.DaVinciPlayerDetail?.link(p)||clean(p.name))+'</strong><small>'+clean(opp(w))+' · 4g '+summaryPts(h.fourPts)+' · ROS '+summaryPts(h.rosPts)+(a.review?' · check status':'')+'</small></div><span>'+clean(current)+'</span></div>';
    }).join('')+'</div>'+
    '';
}
const lookup=(id)=>futureById.get(String(id));

function draftPick(p){
 if(!draftData?.picks)return null;
 const id=String(p.yahooId);
 const match=draftData.picks.find(d=>String(d.playerId)===id);
 return match?.pick??null;
}
// Compare total modeled remaining production *above a positional replacement
// baseline*, not only the weekly lineup delta from the proposed exchange.
// Thresholds approximate depth in this fourteen-team, half-PPR league.
// This is a trade plausibility screen, not a market-price estimator.
const REPLACEMENT_RANK = {QB:18,RB:36,WR:42,TE:21};
function replacementLevels(start){
 const groups={QB:[],RB:[],WR:[],TE:[]};
 for(const p of futureData?.players||[]){
   if(!(p.position in groups))continue;
   const total=(p.weeks||[]).filter(w=>w.week>=start)
     .reduce((sum,w)=>sum+(Number(w.points)||0),0);
   groups[p.position].push(total);
 }
 const levels={};
 for(const pos of Object.keys(groups)){
   groups[pos].sort((a,b)=>b-a);
   levels[pos]=groups[pos][Math.min(groups[pos].length-1,REPLACEMENT_RANK[pos]-1)]||0;
 }
 return levels;
}
function playerRosPoints(p,start){
 const source=futureById.get(String(p.yahooId));
 if(!source)return null;
 return (source.weeks||[]).filter(w=>w.week>=start)
   .reduce((sum,w)=>sum+(Number(w.points)||0),0);
}
function tradeValueBalance(t,start,levels){
 function packageValue(players){
   let raw=0,excess=0;
   for(const p of players){
     const projected=playerRosPoints(p,start);
     if(projected==null)return null;
     raw+=projected;
     excess+=Math.max(0,projected-(levels[p.position]||0));
   }
   return {raw,excess};
 }
 const sent=packageValue(t.youSend),received=packageValue(t.youReceive);
 if(!sent||!received)return {ok:false,reason:'Incomplete remaining-season player projections'};
 // VOR is a rough positional-scarcity check on *cumulative* modeled ROS points.
 // An exchange with >30% imbalance requires manual review, even if both
 // optimizer lineups gain. It is not a proof of fair trade value.
 const imbalance=Math.abs(sent.excess-received.excess)/Math.max(25,sent.excess,received.excess);
 return {ok:imbalance<=.30,imbalance,sent,received,
   reason:imbalance>.30?'Projected positional value differs substantially between the packages':null};
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
 if(window.DaVinciPersonalTrades?.active())return;
 const area=$el('tradeResults'),count=$el('tradeCount');
 if(!tradeData?.trades || !draftData?.picks){
   count.textContent='Checking trade scenarios…';
   area.innerHTML='<div class="empty-copy">Lineup-adjusted trade analysis is being prepared.</div>';
   return;
 }
 const start=Number($el('tradeFromWeek')?.value||6);
 const partner=$el('tradePartner')?.value||'all';
 const pos=$el('tradePosition')?.value||'offense_no_qb';
 const packageFilter=$el('tradePackageFilter')?.value||'three_each';
 const duration=tradeData.endWeek-start+1;
 const thresholds={three_each:0.50,balanced:0.50,balanced_all:0.50,all:0.50};
 const minWeeklyGain=thresholds[packageFilter]??0.40;
 const levels=replacementLevels(start);
 const matches=tradeData.trades.flatMap(t=>{
   if(partner!=='all'&&t.partnerTeamId!==partner)return [];
   const check=premiumTradeCheck(t);
   const valueCheck=tradeValueBalance(t,start,levels);
   const sameSize=t.youSend.length===t.youReceive.length;
   if(packageFilter==='one_each'&&t.youSend.length!==1)return [];
   if(packageFilter==='two_each'&&t.youSend.length!==2)return [];
   if(packageFilter==='balanced'&&t.youSend.length<2)return [];
   if(packageFilter==='three_each'&&(t.youSend.length!==3||t.youReceive.length!==3))return [];
   // Any unequal package depends on an unmodeled add/drop; exclude it as unverified.
    if(!sameSize||!check.ok||!valueCheck.ok||t.requiresRosterAdjustment)return [];
   const both=[...t.youSend,...t.youReceive];
   if(pos==='offense_no_qb'&&both.some(p=>p.position==='QB'))return [];
   if(pos!=='offense_no_qb'&&pos!=='all'&&!t.youReceive.some(p=>p.position===pos))return [];
   const games=t.weeklyGains.filter(w=>w.week>=start);
   if(games.length!==duration)return [];
   const my=games.reduce((s,w)=>s+w.you,0);
   const theirs=games.reduce((s,w)=>s+w.them,0);
   if(my<minWeeklyGain*duration||theirs<minWeeklyGain*duration)return [];
   if(packageFilter==='three_each' && (!stableGain(games,'you')||!stableGain(games,'them')))return [];
   return [{...t,my,theirs,marketCheck:check,valueCheck,
     balanced:!t.requiresRosterAdjustment&&sameSize,
     score:Math.min(my,theirs)+0.12*Math.max(my,theirs)}];
 }).sort((a,b)=>b.score-a.score||b.my-a.my);
 const selected=[],teams=new Map();
 for(const p of matches){
   const already=teams.get(p.partnerTeamId)||0;
   if(partner==='all'&&already>=3)continue;
   selected.push(p);teams.set(p.partnerTeamId,already+1);
   if(selected.length>=Number($el('tradeLimit')?.value||6))break;
 }
 const displayNames={
   three_each:'3-for-3 trades',
   balanced:'equal-size trades',
   balanced_all:'all screened equal-size trades',
   all:'screened equal-size packages'
 };
 count.textContent=selected.length+' shown of '+matches.length+' '+(displayNames[packageFilter]||'trade scenarios')+' · '+duration+' weeks';
 if(!selected.length){
   area.innerHTML='<div class="no-trades">No deals meet these constraints. Try “2-for-2 or 3-for-3” or a different position. Small projected gains are intentionally hidden.</div>';
   return;
 }
 const renderPlayers=ps=>'<ul class="trade-person-list">'+ps.map(p=>
   '<li class="trade-person"><strong>'+(window.DaVinciPlayerDetail?.link(p)||clean(p.name))+'</strong><span class="trade-pos">'+clean(p.position)+'</span></li>'
 ).join('')+'</ul>';
 area.innerHTML=selected.map(t=>{
   const both=t.youSend.length+t.youReceive.length;
   const valueText=t.valueCheck.sent&&t.valueCheck.received
     ? 'Model ROS value above replacement: send '+Math.round(t.valueCheck.sent.excess)+
       ' · receive '+Math.round(t.valueCheck.received.excess)+' pts'
     : 'Projected positional value unavailable';
   const warnings=(!t.balanced?'<p class="trade-balance-note trade-warning">Roster adjustment required: package sizes differ; any extra add/drop is not included in the projected gains.</p>':'')+
     (!t.marketCheck.ok?'<p class="trade-balance-note trade-warning">Draft-value warning: '+clean(t.marketCheck.reason)+'</p>':'')+
     (!t.valueCheck.ok?'<p class="trade-balance-note trade-warning">Positional-value warning: '+clean(t.valueCheck.reason)+'</p>':'');
   const note=warnings;
   return '<article class="trade-card compact-trade trade-ledger">'+
    '<div class="trade-card-top"><strong class="trade-card-partner">'+clean(t.partnerTeam)+'</strong>'+
    '<span class="trade-package-label">'+clean(t.packageShape)+' · '+both+' players</span></div>'+
    '<div class="trade-exchange"><div class="trade-side"><div class="trade-side-heading">YOU SEND</div>'+renderPlayers(t.youSend)+'</div>'+
    '<div class="trade-side"><div class="trade-side-heading">YOU RECEIVE</div>'+renderPlayers(t.youReceive)+'</div></div>'+
    '<div class="trade-impact trade-impact-inline"><div><span>Your lineup</span><strong>+'+num(t.my/duration)+'</strong><small>pts/week · +'+num(t.my)+' total</small></div>'+
    '<div><span>Their lineup</span><strong>+'+num(t.theirs/duration)+'</strong><small>pts/week · +'+num(t.theirs)+' total</small></div></div>'+
    note+'</article>';
 }).join('');
}
function init(){
  if(!futureData||!futureData.players?.length){
    const area=$el('tradeResults');if(area)area.innerHTML='<p>Future-week data is unavailable; no trade projections are shown.</p>';
    return;
  }
  futureById=new Map(futureData.players.map(p=>[String(p.yahooId),p]));
  const first=Math.max(Number(week.week),Number(futureData.startWeek));
  const defaultWeek=typeof planningWeek==='function'?planningWeek():first;
  selectedWeek=defaultWeek;
  const weekSel=$el('futureWeek');
  if(weekSel){weekSel.innerHTML=Array.from({length:futureData.endWeek-first+1},(_,i)=>'<option value="'+(first+i)+'">Week '+(first+i)+'</option>').join('');weekSel.value=String(defaultWeek);weekSel.addEventListener('change',()=>{selectedWeek=Number(weekSel.value);renderFutureProjections();renderMine();});}
  $el('projectionLimit')?.addEventListener('change',renderFutureProjections);
  const tradeFirst=Math.max(6,Number(week.week));
  const tradeSel=$el('tradeFromWeek');
  if(tradeSel){tradeSel.innerHTML=Array.from({length:futureData.endWeek-tradeFirst+1},(_,i)=>'<option value="'+(tradeFirst+i)+'">Weeks '+(tradeFirst+i)+'–'+futureData.endWeek+'</option>').join('');tradeSel.addEventListener('change',showTrades);}
  $el('tradePosition')?.addEventListener('change',showTrades);
  $el('tradePackageFilter')?.addEventListener('change',showTrades);
  $el('tradeLimit')?.addEventListener('change',showTrades);
  const partner=$el('tradePartner');
  if(partner){partner.innerHTML='<option value="all">All other teams</option>'+rosters.teams.filter(t=>String(t.id)!==String(window.DaVinciLeague?.teamId||'7')).sort((a,b)=>a.name.localeCompare(b.name)).map(t=>'<option value="'+clean(t.id)+'">'+clean(t.name)+'</option>').join('');partner.addEventListener('change',showTrades);}
  renderFutureProjections();renderMine();showTrades();
  Promise.all([
    fetch((window.DaVinciLeague?.dataBase||'./data/')+'trades.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Trade dataset unavailable');return r.json();}),
    fetch((window.DaVinciLeague?.dataBase||'./data/')+'draft.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Draft capital unavailable');return r.json();})
  ]).then(([trades,draft])=>{
    if(!Array.isArray(trades.trades) || !Array.isArray(draft.picks) || draft.picks.length<100)
      throw Error('Draft or trade data incomplete');
    tradeData=trades;draftData=draft;
    showTrades();
  }).catch(()=>{
    $el('tradeCount').textContent='Trade screening unavailable';
    if(window.DaVinciPersonalTrades?.active())return;
    $el('tradeResults').innerHTML=window.DaVinciLeague?.key==='nebraska'?'<div class="empty-copy">Choose players above to build a trade.</div>':'<div class="empty-copy">Precomputed trades unavailable. Choose players above to explore new packages.</div>';
  });
}
LAB.init=init;
LAB.renderProjections=renderFutureProjections;
LAB.renderMine=renderMine;
LAB.rankTrades=showTrades;
LAB.optimize=(roster,weekNum)=>eligibleLineup(roster,weekNum);
window.DaVinciLab=LAB;
})();
