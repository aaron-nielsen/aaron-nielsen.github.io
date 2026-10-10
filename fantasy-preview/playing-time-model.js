/* Da Vinci role forecast v0.2.
 * Recency-weighted 2026 game-by-game snap shares and opportunity rates.
 * Confirmed news overrides are separate from the historical role estimator.
 * Player log snapshot: DavidJCrawford/nfl-analysis (PFR/nflverse sources).
 * This is a role forecast, not a guaranteed snap count or injury outcome.
 */
(function(root){
'use strict';
const DEFAULTS={
 week:5,team:'GB',position:'RB',baselineSnapShares:{
  '40971':.37, // MarShawn Lloyd
  '41881':.23, // Kaleb Johnson
  '40625':.40  // Chris Brooks
 },
 projectedSnapShares:{
  '40971':.57, // scenario reallocating Brooks's vacated workload
  '41881':.33,
  '40625':0
 },unmodeledSnapShare:.10,notes:'Brooks ruled out Week 5; Pierre Strong elevated.'
};
const round=n=>Math.round(Number(n)*100)/100;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const mean=xs=>xs.reduce((s,x)=>s+x,0)/Math.max(1,xs.length);
function trend(record,position){
 const games=(record?.games||[]).filter(g=>Number.isFinite(g.snapShare)&&g.snapShare>0).sort((a,b)=>a.week-b.week);
 if(games.length<2)return null;
 const shares=games.map(g=>g.snapShare),avg=mean(shares),latest=games.at(-1).week;
 const weight=g=>Math.pow(.72,latest-g.week);
 const ew=key=>{
  const usable=games.filter(g=>Number.isFinite(g[key]));
  const sum=usable.reduce((s,g)=>s+weight(g),0);
  return sum?usable.reduce((s,g)=>s+weight(g)*g[key],0)/sum:null;
 };
 const snapTrend=ew('snapShare')/avg;
 const workloadKey=position==='QB'?'passAttempts':position==='RB'?'carries':'targets';
 const seasonMean=mean(games.map(g=>Number(g[workloadKey])||0));
 const recentWorkload=ew(workloadKey);
 const volumeTrend=seasonMean>.1&&recentWorkload!=null?recentWorkload/seasonMean:1;
 // Shrink recent-game signals heavily; a small sample must not dominate history.
 const raw=position==='QB'?.25*snapTrend+.75*volumeTrend:
  position==='RB'?.7*snapTrend+.3*volumeTrend:
  .6*snapTrend+.4*volumeTrend;
 const weightHistory=games.length/(games.length+2);
 const multiplier=clamp(1+(raw-1)*weightHistory,.75,1.25);
 return {snapShare:avg,recentSnapShare:ew('snapShare'),multiplier,
  games:games.length,latestWeek:latest};
}
function apply({futureData,weekly,history,context}){
 const scenarios=Array.isArray(context?.scenarios)?context.scenarios:[DEFAULTS];
 const news=new Map();
 for(const plan of scenarios){
  for(const [idStr,base] of Object.entries(plan.baselineSnapShares||{})){
   const target=plan.projectedSnapShares?.[idStr];
   if(Number.isFinite(base)&&base>0&&Number.isFinite(target)&&target>=0)
    news.set(idStr+'@'+plan.week,{base,target,plan});
  }
 }
 const logs=new Map((history?.players||[]).map(p=>[String(p.id),p]));
 const startWeek=Number(futureData?.startWeek)||5;
 let adjusted=0,historical=0,newsApplied=0;
 for(const p of futureData?.players||[]){
  if(!['QB','RB','WR','TE'].includes(p.position))continue;
  const games=p.weeks||[];
  for(const frame of games){
   if(frame.week<startWeek||frame.state==='bye'||frame.points==null)continue;
   const override=news.get(String(p.yahooId)+'@'+frame.week);
   const role=trend(logs.get(String(p.yahooId)),p.position,Number(frame.week));
   if(!override&&!role)continue;
   if(override&&(String(p.nflTeam||'').toUpperCase()!==override.plan.team||
      p.position!==override.plan.position))continue;
   let m=1,source=null,projectedSnap=null,baselineSnap=null;
   if(override){
    m=clamp(override.target/override.base,0,2);projectedSnap=override.target;
    baselineSnap=override.base;source=override.plan.notes||'Verified teammate absence scenario';
    newsApplied++;
   }else{
    const decay=Math.pow(.86,Math.max(0,frame.week-startWeek));
    m=1+(role.multiplier-1)*decay;
    baselineSnap=role.snapShare;
    projectedSnap=role.snapShare*m;
    source='Recent snap and opportunity history';
    historical++;
   }
   // If known inactive, never revive the player via a role model.
   if(frame.state==='unavailable_reported'&&!(override&&override.target===0))continue;
   const previous=frame.points,active=frame.activePoints;
   const prob=frame.availabilityProbability==null?1:frame.availabilityProbability;
   if(override&&override.target===0) {
    frame.points=0;frame.activePoints=0;frame.state='unavailable_reported';
   }else{
    frame.points=round(previous*m);
    if(active!=null)frame.activePoints=round(active*m);
   }
   const factor=frame.factor==null?1:clamp(Number(frame.factor)||1,.85,1.15);
   const stats=p.baselineStats||{};
   frame.projectedStats=Object.fromEntries(
    ['carries','targets','receptions','passAttempts'].map(k=>[k,
     round((Number(stats[k])||0)*factor*m)])
   );
   frame.playingTime={observedSnapShare:round(baselineSnap),projectedSnapShare:round(projectedSnap),
    label:source,basis:role?.games?role.games+' game-level 2026 logs':'2026 observed snap split',
    adjustment:round(m),conditionalOnPlaying:prob<1};
   if(Number(weekly?.week)===Number(frame.week)){
    const now=weekly.players?.find(x=>String(x.yahooId)===String(p.yahooId));
    if(now){
     now.weeklyProjectedPoints=frame.points;
     if(now.activeGamePoints!=null)now.activeGamePoints=frame.activePoints;
     if(override&&override.target===0)now.forecastStatus='unavailable_reported';
    }
   }
   adjusted++;
  }
 }
 return {adjusted,historical,newsApplied,sourcePlayers:logs.size};
}
root.DaVinciPlayingTime={apply,trend};
})(typeof window!=='undefined'?window:globalThis);
