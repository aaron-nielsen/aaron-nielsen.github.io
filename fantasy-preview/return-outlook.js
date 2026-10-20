/* Research-driven return availability for explicitly verified roster cases.
 * Sources (checked 2026-10-10):
 * Alec Pierce: https://www.reuters.com/sports/colts-place-wr-alec-pierce-ir-elevate-wr-anthony-gould--flm-2026-09-26/
 * Josh Jacobs (checked 2026-10-19): https://www.packers.com/news/packers-rb-josh-jacobs-to-get-full-week-of-practice-game-status-tbd-oct-19-2026
 * Probabilities BELOW are scenario estimates, not team or league announcements.
 * Do not generalize a four-week IR clock to an unverified injury.
 */
(function(root){
'use strict';
const paths={
 '34008':{name:'Alec Pierce',reason:'Heel injury · injured reserve',earliest:7,
  probability:{5:0,6:0,7:.35,8:.55,9:.70,10:.80,11:.85,12:.88,13:.90,14:.90,15:.92,16:.92,17:.92}},
 '31856':{name:'Josh Jacobs',reason:'Eligible from Week 7; game status pending. Future estimates assume participation.',earliest:7,asOf:'2026-10-19',
  probability:{5:0,6:0,7:1,8:1,9:1,10:1,11:1,12:1,13:1,14:1,15:1,16:1,17:1}}
};
const round=n=>Math.round(n*100)/100;
function apply({futureData,weekly}){
 let changed=0;
 for(const p of futureData?.players||[]){
  const info=paths[String(p.yahooId)];
  if(!info||p.name!==info.name)continue;
  p.returnOutlook={reason:info.reason,earliestWeek:info.earliest,method:'news-informed scenario',asOf:info.asOf||'2026-10-10'};
  for(const frame of p.weeks||[]){
   const prob=info.probability[Number(frame.week)];
   if(prob===undefined)continue;
   const conditional=frame.activePoints??frame.points;
   frame.conditionalPoints=Number.isFinite(Number(conditional))?Number(conditional):null;
   frame.availabilityProbability=prob;
   if(frame.state==='bye')continue;
   frame.points=frame.conditionalPoints===null?null:round(frame.conditionalPoints*prob);
   frame.state=prob===0?'unavailable_reported':prob===1?'assuming_active':'return_uncertain';
  }
  changed++;
 }
 // Keep the current-week score and future scenarios in agreement.
 for(const p of weekly?.players||[]){
  const info=paths[String(p.yahooId)];
  if(!info||p.name!==info.name)continue;
  const prob=info.probability[Number(weekly.week)]??0;
  p.availabilityProbability=prob;
  if(prob===0){p.weeklyProjectedPoints=0;p.forecastStatus='unavailable_reported';}
 }
 return {changed};
}
root.DaVinciReturns={apply,paths,ready:(forecast,w,threshold=.55)=>{
 const frame=forecast?.weeks?.find(g=>Number(g.week)===Number(w));
 return frame?.availabilityProbability!=null&&frame.availabilityProbability>=threshold&&frame.state!=='bye';
}};
})(typeof window!=='undefined'?window:globalThis);
