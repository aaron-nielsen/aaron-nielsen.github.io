/* League-specific values and future opponent planning. Uses the enriched,
   dated forecast, never online requests or generic market trade prices. */
(function(root){
'use strict';
const POS=['QB','RB','WR','TE','K','DEF'];
const SLOTS=['QB','RB','RB','WR','WR','TE','FLEX','K','DEF'];
const id=p=>String(p.id??p.yahooId);
const blocked=p=>p.slot==='IR'||/^(IR|PUP|NFI|NA|N\/A|CEL|SUSP|SUS|OUT|O|D|DOUBTFUL)(-|$)/.test(String(p.status||p.injuryStatus||'').toUpperCase());
const norm=t=>({LAR:'LA',JAC:'JAX',WSH:'WAS'}[String(t||'').toUpperCase()]||String(t||'').toUpperCase());
function create(data){
 const forecasts=new Map((data.future?.players||[]).map(p=>[id(p),p]));
 const owned=new Map(data.rosters.teams.flatMap(t=>t.players.map(p=>[id(p),{...p,fantasyTeam:t.name,fantasyTeamId:String(t.id)}])));
 const players=[...owned.values(),...(data.available.players||[]).filter(p=>!owned.has(id(p))).map(p=>({...p,fantasyTeam:'Available',fantasyTeamId:null}))];
 // Include modeled names outside the sampled waiver list without inventing ownership.
 const seen=new Set(players.map(id));
 for(const p of forecasts.values())if(!seen.has(id(p)))players.push({...p,id:id(p),fantasyTeam:'Ownership unverified',fantasyTeamId:null,unverified:true});
 const own=data.rosters.teams.find(t=>String(t.id)===String(data.teamId));
 const start=Math.max(Number(data.week)+1,Number(data.future?.startWeek));
 const end=Number(data.future?.endWeek)||17;
 function point(p,w){
  const f=forecasts.get(id(p)),frame=f?.weeks?.find(x=>Number(x.week)===Number(w));
  if(!frame)return null;
  if(frame.state==='bye'||f.seasonUnavailable)return 0;
  if(blocked(p)&&!f.returnOutlook)return null;
  const v=frame.points;
  return v!=null&&Number.isFinite(Number(v))?Number(v):null;
 }
 const range=(from=start,to=end)=>Array.from({length:Math.max(0,to-from+1)},(_,i)=>from+i);
 const total=(p,weeks)=>{const v=weeks.map(w=>point(p,w));return v.length&&v.every(x=>x!==null)?v.reduce((a,b)=>a+b,0):null;};
 function replacement(pos,w,exclude){
  const pool=players.filter(p=>p.position===pos&&!p.fantasyTeamId&&!p.unverified&&!blocked(p)&&id(p)!==exclude)
   .map(p=>({player:p,points:point(p,w)})).filter(x=>x.points!==null)
   .sort((a,b)=>b.points-a.points||a.player.name.localeCompare(b.player.name));
  return pool[0]||null;
 }
 function value(p,weeks){
  const ros=total(p,weeks),replacements=weeks.map(w=>replacement(p.position,w));
  const reference=replacements.length&&replacements.every(Boolean)?replacements.reduce((s,x)=>s+x.points,0):null;
  const f=forecasts.get(id(p));
  return {...p,ros,vor:ros!==null&&reference!==null?ros-reference:null,next:point(p,weeks[0]),reference,
   coverage:!f?'No forecast':ros===null?'Incomplete forecast / availability':p.unverified?'Ownership unverified':f.returnOutlook?'Conditional return':'Modeled',
   replacements:weeks.map((w,i)=>({week:w,name:replacements[i]?.player.name||null,points:replacements[i]?.points??null}))};
 }
 function score(roster,weeks){
  let sum=0;
  for(const w of weeks){const v=data.optimize(roster,w);if(!v||!Number.isFinite(v.score))return null;sum+=v.score;}
  return sum;
 }
 function impactContext(weeks){
  const baseline=own?score(own.players,weeks):null;
  const full=own?.players.filter(p=>p.slot!=='IR').length>=15;
  // Each drop is evaluated over the complete horizon, not week-by-week swaps.
  const drops=full?own.players.filter(p=>p.slot!=='IR').map(p=>({p,score:score(own.players.filter(q=>id(q)!==id(p)),weeks)}))
   .sort((a,b)=>(b.score??-Infinity)-(a.score??-Infinity)).slice(0,6).map(x=>x.p):[null];
  return p=>{
   if(baseline===null||!forecasts.has(id(p))||total(p,weeks)===null||p.unverified)return {impact:null,drop:null};
   if(String(p.fantasyTeamId)===String(data.teamId)){
    const rest=own.players.filter(q=>id(q)!==id(p));let best=score(rest,weeks),name=null;
    const alternatives=players.filter(q=>q.position===p.position&&!q.fantasyTeamId&&!q.unverified&&!blocked(q)&&id(q)!==id(p))
     .map(q=>({p:q,total:total(q,weeks)})).filter(x=>x.total!==null).sort((a,b)=>b.total-a.total).slice(0,5);
    if(p.slot!=='IR')for(const x of alternatives){const v=score(rest.concat({...x.p,slot:'BN'}),weeks);if(v!==null&&(best===null||v>best)){best=v;name=x.p.name;}}
    return {impact:best===null?null:Math.max(0,baseline-best),drop:name,kind:'Loss if removed'};
   }
   let best=null,drop=null;
   for(const d of drops){const after=own.players.filter(q=>!d||id(q)!==id(d)).concat({...p,slot:p.slot==='IR'?'IR':'BN'});
    const v=score(after,weeks);if(v!==null&&(best===null||v>best)){best=v;drop=d?.name||null;}}
   return {impact:best===null?null:best-baseline,drop,kind:'Gain if added'};
  };
 }
 function lineup(team,w){return data.optimize(team.players,w);}
 function positionScores(line){
  if(!line)return null;
  const groups={};for(const pick of line.selections||[]){const slot=SLOTS[pick.slot];groups[slot]=(groups[slot]||0)+pick.points;}
  return groups;
 }
 function schedule(){
  const rows=[];
  for(const w of range()){
   const game=data.schedule?.weeks?.find(r=>Number(r.week)===w)?.matchups?.find(m=>[m.home,m.away].some(t=>String(t.id)===String(data.teamId)));
   const opponent=game?(String(game.home.id)===String(data.teamId)?game.away:game.home):null;
   const team=opponent?data.rosters.teams.find(t=>String(t.id)===String(opponent.id)):null;
   const theirs=team?lineup(team,w):null,mine=own?lineup(own,w):null;
   const groups=positionScores(theirs);
   const all=data.rosters.teams.map(t=>positionScores(lineup(t,w))).filter(Boolean);
   const weaknesses=[],strengths=[];
   if(groups)for(const pos of Object.keys(groups)){
    const values=all.map(g=>g[pos]).filter(Number.isFinite).sort((a,b)=>a-b);
    if(!values.length)continue;
    const mid=Math.floor(values.length/2),median=values.length%2?values[mid]:(values[mid-1]+values[mid])/2;
    const gap=groups[pos]-median;
    if(gap<=-1)weaknesses.push({pos,gap});if(gap>=1)strengths.push({pos,gap});
   }
   weaknesses.sort((a,b)=>a.gap-b.gap);strengths.sort((a,b)=>b.gap-a.gap);
   const byes=own?.players.filter(p=>forecasts.get(id(p))?.weeks?.find(g=>Number(g.week)===w)?.state==='bye').map(p=>p.name)||[];
   rows.push({week:w,opponent:opponent?.name||null,yours:mine?.score??null,theirs:theirs?.score??null,
    margin:mine&&theirs?mine.score-theirs.score:null,weaknesses:weaknesses.slice(0,2),strengths:strengths.slice(0,2),byes});
  }
  return rows;
 }
 function nflGame(p,w){
  const games=data.nflSchedule?.games;
  if(!games)return null;
  const g=games.find(g=>Number(g.week)===w&&[g.home_team,g.away_team].includes(norm(p.nflTeam)));
  return g?{opponent:g.home_team===norm(p.nflTeam)?g.away_team:g.home_team,home:g.home_team===norm(p.nflTeam),date:g.gameday}:null;
 }
 function targets(weeks){
  if(!own)return [];
  const base=score(own.players,weeks);if(base===null)return [];
  const impact=impactContext(weeks),candidates=[];
  const ranks=new Map();
  for(const pos of ['RB','WR','TE','QB'])players.filter(p=>p.position===pos&&p.fantasyTeamId&&!blocked(p)&&total(p,weeks)!==null)
   .sort((a,b)=>total(b,weeks)-total(a,weeks)).forEach((p,i)=>ranks.set(id(p),i+1));
  for(const team of data.rosters.teams){
   if(String(team.id)===String(data.teamId))continue;
   const ownerBase=score(team.players,weeks);if(ownerBase===null)continue;
   for(const raw of team.players){
    const p=players.find(q=>id(q)===id(raw));
    if(!['RB','WR','TE','QB'].includes(p.position)||blocked(p)||total(p,weeks)===null)continue;
    // An explicit conservative screen, not a claim about manager willingness:
    // omit the top six modeled RB/WR and top three QB/TE from automatic targets.
    if((ranks.get(id(p))||0)<=(['RB','WR'].includes(p.position)?6:3))continue;
    const gain=impact(p).impact;if(gain===null||gain<weeks.length*.5)continue;
    const after=score(team.players.filter(q=>id(q)!==id(p)),weeks);
    const cost=after===null?Infinity:ownerBase-after;
    if(cost>gain*.7)continue;
    const offers=[];
    for(const outbound of own.players.filter(q=>['RB','WR','TE','QB'].includes(q.position)&&!blocked(q)&&total(q,weeks)!==null)){
     const negotiation=data.negotiations;
     if(negotiation?.leagueKey===data.leagueKey&&String(negotiation.teamId)===String(team.id)&&negotiation.avoidOfferingPositions?.includes(outbound.position))continue;
     // A capable starter does not create a QB need just because he has a bye.
     // Require a real QB upgrade in at least four overlapping active weeks.
     if(outbound.position==='QB'){
      let upgrades=0;
      for(const w of weeks){
       const current=team.players.filter(q=>q.position==='QB'&&!blocked(q)).map(q=>point(q,w)).filter(v=>v!==null&&v>0);
       const incoming=point(outbound,w);
       if(current.length&&incoming!==null&&incoming-Math.max(...current)>=1.5)upgrades++;
      }
      if(upgrades<Math.min(4,weeks.length))continue;
     }
     const yours=score(own.players.filter(q=>id(q)!==id(outbound)).concat({...p,slot:'BN'}),weeks);
     const theirs=score(team.players.filter(q=>id(q)!==id(p)).concat({...outbound,slot:'BN'}),weeks);
     if(yours!==null&&theirs!==null&&yours-base>=weeks.length*.5&&theirs-ownerBase>=weeks.length*.5)
      offers.push({send:outbound.name,gain:yours-base,partnerGain:theirs-ownerBase});
    }
    offers.sort((a,b)=>Math.min(b.gain,b.partnerGain)-Math.min(a.gain,a.partnerGain));
    candidates.push({name:p.name,position:p.position,team:team.name,teamId:String(team.id),id:id(p),gain,cost,offer:offers[0]||null});
   }
  }
  return candidates.sort((a,b)=>Number(Boolean(b.offer))-Number(Boolean(a.offer))||
   (b.offer?Math.min(b.offer.gain,b.offer.partnerGain):b.gain-b.cost)-(a.offer?Math.min(a.offer.gain,a.offer.partnerGain):a.gain-a.cost)).slice(0,8);
 }
 return {players,own,start,end,range,point,total,value,impactContext,schedule,forecasts,nflGame,targets};
}
root.DaVinciPlanningModel={create,norm};
})(typeof window!=='undefined'?window:globalThis);
