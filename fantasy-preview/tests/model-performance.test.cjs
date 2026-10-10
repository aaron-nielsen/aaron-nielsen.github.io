'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.resolve(__dirname,'..');
const accuracy=require('../forecast-accuracy.js');
const source=fs.readFileSync(path.join(base,'model-performance.js'),'utf8');
const row={season:2026,week:5,playerId:'1',position:'RB',actual:10,daVinci:12,yahoo:14,
 predictedAt:'2026-10-09T15:00:00Z',kickoffAt:'2026-10-11T17:00:00Z'};
const node={innerHTML:'',textContent:''};
const context={window:{DaVinciAccuracy:accuracy},document:{getElementById:()=>node},
 fetch:async()=>({ok:true,json:async()=>[row]})};
vm.runInNewContext(source,context);
(async()=>{
 await context.window.DaVinciPerformance.render('csu');
 assert.match(node.innerHTML,/RMSE/);
 assert.match(node.innerHTML,/Da Vinci wins/);
 assert.match(node.innerHTML,/All positions/);
 assert.match(node.innerHTML,/RB/);
 assert.match(node.innerHTML,/100\.0%/);
 assert.doesNotMatch(node.innerHTML,/undefined/);
 console.log('Model Performance browser rendering smoke checks passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
