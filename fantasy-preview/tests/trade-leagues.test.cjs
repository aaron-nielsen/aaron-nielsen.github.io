'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const file=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
require(path.join(ROOT,'special-teams-model.js'));
const contextData=read('data/special-teams-context.json');
for(const {prefix,teamId,name} of [
 {prefix:'data/',teamId:'7',name:'CSU Stats'},
 {prefix:'data/nebraska/',teamId:'6',name:'Nebraska'}
]){
 const rosters=read(prefix+'rosters.json'),available=read(prefix+'available.json'),
  future=read(prefix+'future.json'),weekly=read(prefix+'weekly.json'),league=read(prefix+'league.json');
 globalThis.DaVinciSpecialTeams.enrich({context:contextData,league,rosters,available,futureData:future,weekly});
 const elements=new Map();
 function elem(id){
  if(!elements.has(id))elements.set(id,{
   innerHTML:'',textContent:'',hidden:false,
   value:id==='tradeFromWeek'?'6':id==='tradePackageFilter'?'balanced_all':
    id==='tradePosition'?'all':id==='tradePartner'?'all':id==='lineupWeek'?'5':'',
   listeners:{},addEventListener(type,fn){this.listeners[type]=fn;},
   setAttribute(key,v){this[key]=v;}
  });
  return elements.get(id);
 }
 const sandbox={document:{getElementById:elem},
  DaVinciLab:{rankTrades(){elem('tradeResults').innerHTML='Legacy results';}}};
 vm.runInNewContext(file('roster-advice.js'),sandbox);
 vm.runInNewContext(file('trade-preferences.js'),sandbox);
 sandbox.DaVinciAdvice.init({rosters,available,future,week:5,teamId});
 sandbox.DaVinciPersonalTrades.init({
  rosters,available,future,week:5,teamId,leagueKey:name==='Nebraska'?'nebraska':'csu',
  optimize:sandbox.DaVinciAdvice.lineup
 });
 assert.match(elem('tradePreferenceBuilder').innerHTML,/Players I want/);
 const roster=rosters.teams.find(t=>String(t.id)===teamId);
 const ownCandidate=roster.players.find(p=>p.position==='WR'&&p.slot==='BN'&&!p.status)
  ||roster.players.find(p=>p.position==='WR'&&p.slot==='WR');
 assert.ok(ownCandidate,'No outgoing candidate');
 let started=Date.now();
 const pick=elem('tradeSendChoices');
 assert.equal(typeof pick.listeners.change,'function');
 pick.listeners.change({target:{type:'checkbox',checked:true,dataset:{id:ownCandidate.id}}});
 const elapsed=Date.now()-started;
 const html=elem('tradeResults').innerHTML;
 assert.ok(html.includes('trade-personal-card')||html.includes('No trades here improve BOTH'),
  name+' did not return ranked or honest empty result');
 assert.equal(sandbox.DaVinciPersonalTrades.active(),true);
 assert.ok(elapsed<15000,name+' trade response took '+elapsed+' ms');
 if(html.includes('trade-personal-card')){
  assert.doesNotMatch(html,/Their lineup −|Their lineup -/,name+' negative ROS offer is forbidden');
  assert.match(html,/trade-team-summary.*trade-gain">\+/,name+' must display the other manager\'s positive gain');
  assert.match(html,/ROS/,name+' must show rest-of-season total gain');
 }
 console.log(name+': '+ownCandidate.name+' target evaluated in '+elapsed+' ms, offers='+
  (html.match(/trade-personal-card/g)||[]).length);

 // A user who only specifies a desired incoming player should also get options.
 elem('tradePreferenceClear').listeners.click();
 const targets=rosters.teams.filter(t=>String(t.id)!==teamId).flatMap(t=>t.players)
  .filter(p=>p.position==='RB'&&!p.status&&p.slot!=='IR');
 const wanted=targets.find(p=>future.players.some(f=>String(f.yahooId)===String(p.id)));
 assert.ok(wanted,'No eligible RB targets');
 const startWant=Date.now();
 elem('tradeReceiveChoices').listeners.change({target:{type:'checkbox',checked:true,dataset:{id:wanted.id}}});
 const elapsedWant=Date.now()-startWant;
 const incomingHTML=elem('tradeResults').innerHTML;
 assert.ok(incomingHTML.includes('trade-personal-card')||incomingHTML.includes('No trades here improve BOTH'),
  name+' incoming-only preference failed');
 assert.ok(elapsedWant<15000,name+' inbound targeted trade took '+elapsedWant+' ms');
 if(incomingHTML.includes('trade-personal-card'))assert.ok(incomingHTML.includes(wanted.name),name+' selected target omitted');
 console.log(name+': wanted '+wanted.name+' evaluated in '+elapsedWant+' ms, offers='+
  (incomingHTML.match(/trade-personal-card/g)||[]).length);

}
