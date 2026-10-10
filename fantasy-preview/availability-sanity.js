/* Keep live Yahoo availability authoritative over stale model roster/team labels.
   In particular, NA players have no active NFL assignment and cannot earn points. */
(function(root){
'use strict';
const NOT_ACTIVE=new Set(['NA','N/A']);
function reconcile({available,rosters,futureData,weekly}){
 const source=new Map([...(available?.players||[]),...(rosters?.teams||[]).flatMap(t=>t.players)].map(p=>[String(p.id),String(p.status||'').toUpperCase().trim()]));
 const blocked=code=>/^(IR|PUP|NFI|OUT|O|NA|N\/A|CEL|SUSP|SUS)$|^(IR|PUP|NFI)-/.test(code);
 let excluded=0;
 for(const p of futureData?.players||[]){
  if(!source.has(String(p.yahooId)))continue;
  const code=source.get(String(p.yahooId));
  if(code)p.injuryStatus=code;
  const seasonOut=String(p.yahooId)==='40118'&&p.name==="De'Von Achane";
  if(seasonOut)p.seasonUnavailable={asOf:'2026-10-10',reason:'Season-ending ACL injury',source:'https://amp.nfl.com/news/dolphins-rb-devon-achane-miss-2026-season-acl-tear'};
  if(!NOT_ACTIVE.has(code)){
   if(blocked(code)||seasonOut){for(const w of p.weeks||[]){if(seasonOut||Number(w.week)===Number(weekly?.week??futureData.startWeek)){w.points=0;w.state='unavailable_reported';}}}
   continue;
  }
  p.nflEligibility='inactive';
  excluded++;
  for(const w of p.weeks||[]){
   w.points=0;w.activePoints=0;w.state='unavailable_reported';
   if(w.components)w.components=[];
  }
 }
 for(const p of weekly?.players||[]){
  if(!source.has(String(p.yahooId)))continue;
  const code=source.get(String(p.yahooId));
  if(code)p.injuryStatus=code;
  if(!blocked(code))continue;
  p.nflEligibility='inactive';
  p.weeklyProjectedPoints=0;if(NOT_ACTIVE.has(code))p.activeGamePoints=0;p.forecastStatus='unavailable_reported';
 }
 return {excluded};
}
root.DaVinciEligibility={reconcile};
})(typeof window!=='undefined'?window:globalThis);
