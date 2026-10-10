/* Da Vinci Fantasy Lab — forecast accuracy from frozen pregame observations.
 * Inputs are matched player-week rows; NEVER evaluate against refreshed future.json
 * as though it were a pregame snapshot. Pure module for Node and browser use.
 */
(function(root){
'use strict';
const finite=x=>typeof x==='number'&&Number.isFinite(x);
function summarize(rows,field){
 const valid=rows.filter(r=>finite(r[field])&&finite(r.actual));
 if(!valid.length)return {n:0,mae:null,bias:null,rmse:null};
 const errors=valid.map(r=>r[field]-r.actual);
 const n=errors.length;
 return {n,mae:errors.reduce((a,e)=>a+Math.abs(e),0)/n,
  bias:errors.reduce((a,e)=>a+e,0)/n,
  rmse:Math.sqrt(errors.reduce((a,e)=>a+e*e,0)/n)};
}
function evaluate(records){
 const eligible=[],excluded={invalid:0,notPregame:0,duplicate:0};
 const seen=new Set();
 for(const r of records||[]){
  if(!r||!r.playerId||!Number.isInteger(r.week)||!r.season||
     !finite(r.actual)||!finite(r.daVinci)){excluded.invalid++;continue;}
  const frozen=Date.parse(r.predictedAt),kickoff=Date.parse(r.kickoffAt);
  if(!Number.isFinite(frozen)||!Number.isFinite(kickoff)||frozen>=kickoff){
   excluded.notPregame++;continue;
  }
  const id=[r.season,r.week,r.playerId].join(':');
  if(seen.has(id)){excluded.duplicate++;continue;}
  seen.add(id);eligible.push(r);
 }
 const groups={all:eligible};
 for(const r of eligible)(groups[r.position||'Unknown']??=[]).push(r);
 const byPosition={};
 for(const [position,rows] of Object.entries(groups)){
  const paired=rows.filter(r=>finite(r.yahoo));
  byPosition[position]={daVinci:summarize(rows,'daVinci'),
   yahoo:summarize(rows,'yahoo'),
   paired:{n:paired.length,daVinci:summarize(paired,'daVinci'),
    yahoo:summarize(paired,'yahoo')}};
 }
 return {n:eligible.length,excluded,byPosition};
}
const api={evaluate,summarize};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.DaVinciAccuracy=api;
})(typeof globalThis!=='undefined'?globalThis:this);
