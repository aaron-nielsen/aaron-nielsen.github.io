/* Run the same trade evaluator without blocking the dashboard. */
'use strict';
importScripts('./roster-advice.js?v=20261021design','./yahoo-values.js','./trade-preferences.js?v=20261021design');
self.onmessage=event=>{
 try{
  const {settings,filters,selection}=event.data;
  self.DaVinciAdvice.init(settings);
  self.postMessage(self.DaVinciTradeSearch.calculate({...settings,optimize:self.DaVinciAdvice.lineup},filters,selection));
 }catch(error){self.postMessage({error:String(error.message||error)});}
};
