/* Historical Yahoo lineup analysis. Actual points only, no fabricated transaction counterfactuals. */
(function(root){
'use strict';
const valid=p=>p&&Number.isFinite(p.actual)&&['QB','RB','WR','TE','K','DEF'].includes(p.position);
const id=p=>String(p.playerId);
function optimal(players){
 const pool=players.filter(valid);
 const take=(position,n,used)=>{
  const candidates=pool.filter(p=>p.position===position&&!used.has(id(p))).sort((a,b)=>b.actual-a.actual);
  if(candidates.length<n)return null;
  const chosen=candidates.slice(0,n);chosen.forEach(p=>used.add(id(p)));return chosen;
 };
 const used=new Set(),selected=[];
 for(const [position,n] of [['QB',1],['RB',2],['WR',2],['TE',1],['K',1],['DEF',1]]){
  const next=take(position,n,used);if(!next)return null;selected.push(...next);
 }
 const flex=pool.filter(p=>['RB','WR','TE'].includes(p.position)&&!used.has(id(p))).sort((a,b)=>b.actual-a.actual)[0];
 if(!flex)return null;
 selected.push(flex);
 return {points:selected.reduce((s,p)=>s+p.actual,0),players:selected};
}
function analyze(weeks){
 const teams=new Map();
 for(const w of weeks){
  for(const team of w.teams||[]){
   if(!team.players?.length)continue;
   const players=team.players.filter(valid);
   const actual=players.filter(p=>!['BN','IR','IL','NA'].includes(p.slot));
   const actualPoints=actual.reduce((sum,p)=>sum+p.actual,0);
   const best=optimal(players);
   const key=String(team.teamId),rows=teams.get(key)||[];
   rows.push({week:w.week,teamId:key,teamName:team.teamName||'Team '+key,
    actualPoints,starterCount:actual.length,optimalPoints:best?.points??null,
    missedPoints:best&&actual.length===9?Math.max(0,best.points-actualPoints):null,
    actualPlayers:actual.length,benchPlayers:players.length-actual.length});
   teams.set(key,rows);
  }
 }
 return [...teams].map(([teamId,rows])=>{
  const complete=rows.filter(r=>r.missedPoints!=null);
  const total=xs=>xs.reduce((s,x)=>s+x,0);
  return {teamId,teamName:rows[0].teamName,weeks:rows.length,
   actualPoints:total(rows.map(r=>r.actualPoints)),
   evaluatedWeeks:complete.length,
   missedPoints:complete.length?total(complete.map(r=>r.missedPoints)):null,
   byWeek:rows};
 }).sort((a,b)=>b.actualPoints-a.actualPoints);
}
root.DaVinciHistorical={optimal,analyze};
if(typeof module!=='undefined'&&module.exports)module.exports={optimal,analyze};
})(typeof window!=='undefined'?window:globalThis);
