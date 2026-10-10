/* Role-aware opportunity adjustment to the already-scored weekly player forecasts.
 * Does not extrapolate a one-week teammate injury to future weeks.
 * Snap shares are sourced evidence; projected shares are explicitly scenarios.
 */
(function(root){
'use strict';
const DEFAULTS={
 week:5,team:'GB',position:'RB',baselineSnapShares:{
  '40971':.37, // MarShawn Lloyd, 94 of team RB snaps across Weeks 1-4
  '41881':.23, // Kaleb Johnson
  '40625':.40  // Chris Brooks, confirmed OUT Week 5
 },
 projectedSnapShares:{
  '40971':.57, // Brooks vacated snaps split with Johnson/Strong
  '41881':.33,
  '40625':0
 },unmodeledSnapShare:.10,notes:'Brooks ruled out Week 5; Pierre Strong elevated.'
};
const round=n=>Math.round(n*100)/100;
function apply({futureData,weekly,context}){
 const scenarios=Array.isArray(context?.scenarios)?context.scenarios:[DEFAULTS];
 let adjusted=0;
 for(const plan of scenarios){
  const week=Number(plan.week);
  for(const [idStr,base] of Object.entries(plan.baselineSnapShares||{})){
   const target=plan.projectedSnapShares?.[idStr];
   if(!Number.isFinite(base)||base<=0||!Number.isFinite(target)||target<0)continue;
   const p=(futureData?.players||[]).find(x=>String(x.yahooId)===idStr&&
    x.position===plan.position&&String(x.nflTeam||'').toUpperCase()===plan.team);
   if(!p)continue;
   const game=p.weeks?.find(g=>Number(g.week)===week);
   if(!game||game.state==='bye'||game.points==null)continue;
   const multiplier=target/base;
   game.playingTime={
    observedSnapShare:base,projectedSnapShare:target,
    label:plan.notes||'Role scenario',basis:'2026 snaps through Week 4',
    adjustment:round(multiplier)
   };
   const original=game.points;
   const originalActive=game.activePoints;
   game.points=round(original*multiplier);
   if(originalActive!=null)game.activePoints=round(originalActive*multiplier);
   if(game.points===0)game.state='unavailable_reported';
   const factor=Number.isFinite(Number(game.factor))&&game.factor!=null?
    Math.max(.85,Math.min(1.15,Number(game.factor))):1;
   const stats=p.baselineStats||{};
   game.projectedStats=Object.fromEntries(
    ['carries','targets','receptions','passAttempts'].map(k=>[k,round((Number(stats[k])||0)*factor*multiplier)])
   );
   // Keep the overview's current-week result in sync with future projections.
   const now=(weekly?.players||[]).find(x=>String(x.yahooId)===idStr);
   if(now&&Number(weekly.week)===week){
    if(Number.isFinite(Number(now.weeklyProjectedPoints)))now.weeklyProjectedPoints=game.points;
    if(now.activeGamePoints!=null)now.activeGamePoints=game.activePoints;
    if(target===0)now.forecastStatus='unavailable_reported';
   }
   adjusted++;
  }
 }
 return {adjusted};
}
root.DaVinciPlayingTime={apply};
})(typeof window!=='undefined'?window:globalThis);
