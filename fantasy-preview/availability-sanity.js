/* Keep live Yahoo availability authoritative over stale model roster/team labels.
   In particular, NA players have no active NFL assignment and cannot earn points. */
(function(root){
'use strict';
const NOT_ACTIVE=new Set(['NA','N/A']);
function reconcile({available,futureData,weekly}){
 const source=new Map((available?.players||[]).map(p=>[String(p.id),String(p.status||'').toUpperCase().trim()]));
 let excluded=0;
 for(const p of futureData?.players||[]){
  if(p.ownership!=='available'||!source.has(String(p.yahooId)))continue;
  const code=source.get(String(p.yahooId));
  if(code)p.injuryStatus=code;
  if(!NOT_ACTIVE.has(code))continue;
  p.nflEligibility='inactive';
  excluded++;
  for(const w of p.weeks||[]){
   w.points=0;w.activePoints=0;w.state='unavailable_reported';
   if(w.components)w.components=[];
  }
 }
 for(const p of weekly?.players||[]){
  if(p.ownership!=='available'||!source.has(String(p.yahooId)))continue;
  const code=source.get(String(p.yahooId));
  if(code)p.injuryStatus=code;
  if(!NOT_ACTIVE.has(code))continue;
  p.nflEligibility='inactive';
  p.weeklyProjectedPoints=0;p.activeGamePoints=0;p.forecastStatus='unavailable_reported';
 }
 return {excluded};
}
root.DaVinciEligibility={reconcile};
})(typeof window!=='undefined'?window:globalThis);
