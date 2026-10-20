(function(root){
'use strict';
function decided(match){
 if(match?.status==='final')return true;
 return Number(match?.home?.points||0)+Number(match?.away?.points||0)>0&&
  [0,1].includes(match?.home?.winProbability)&&[0,1].includes(match?.away?.winProbability)&&match.home.winProbability!==match.away.winProbability;
}
function planningWeek(week,teamId,end=17){
 const current=Number(week.week),match=week.matchups?.find(m=>[m.home,m.away].some(t=>String(t.id)===String(teamId)));
 return Math.min(end,current+Number(decided(match)));
}
function result(match,teamId){
 if(!decided(match))return null;
 const home=String(match.home.id)===String(teamId);
 const difference=match.status==='final'?Number(match.home.points)-Number(match.away.points):match.home.winProbability-match.away.winProbability;
 return Math.sign(difference)*(home?1:-1);
}
root.DaVinciDashboardContext={planningWeek,result};
})(typeof window!=='undefined'?window:globalThis);
