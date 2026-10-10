#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const {evaluate}=require('../forecast-accuracy.js');
const input=process.argv[2];
if(!input){
 console.error('Usage: node fantasy-preview/scripts/evaluate-forecasts.cjs frozen-player-weeks.json');
 process.exitCode=2;
}else{
 try{
  const rows=JSON.parse(fs.readFileSync(input,'utf8'));
  if(!Array.isArray(rows))throw new Error('Expected an array of frozen player-week records');
  const result=evaluate(rows);
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  if(!result.n){
   console.error('No eligible pregame forecasts with verified actuals; no accuracy claims possible.');
   process.exitCode=1;
  }
 }catch(err){
  console.error('Cannot evaluate forecasts: '+err.message);
  process.exitCode=2;
 }
}
