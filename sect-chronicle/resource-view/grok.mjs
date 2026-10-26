import { resourceView, field } from './contract.mjs';
export const GROK_SHA='6760f21c342cbf72fc9fb4baf0aec8655abd0dd2';
const root=`grok:${GROK_SHA}:solo-sect/src/`;
// Third-core capability inventory only. No simulation adaptation or guessed free stock.
export function grokResources(state) {
  return [['water','水'],['herb','藥草'],['wood','木']].map(([id,label])=>{
    const unit='原生計數（未標量綱）',f=(key,value,path,availability)=>field(`resource.${key}`,value,{source:root+path,unit,...(availability?{availability}:{})});
    return resourceView({namespace:'grok',sha:GROK_SHA,nativeId:id,label,unit,source:root+'sim.mjs:createState.res',
      values:{amount:f('amount',state.res?.[id],`sim.mjs:state.res.${id}`),capacity:f('capacity',state.cap?.[id],`sim.mjs:state.cap.${id}`),
        incoming:f('incoming',null,'sim.mjs:task delivery has no public aggregate','unsupported'),reserved:f('reserved',null,'core.mjs:stockReserved requires task lifecycle audit','unsupported'),available:f('available',null,'sim.mjs:context/stockReserved not adopted as a public resource query','unsupported')},
      uses:field('resource.uses',null,{source:root+'data.mjs:activities/facility costs (not adapted)',availability:'unsupported'}),
      notes:['只盤點固定真state.res／明列cap；herb無明列cap時保未知，不填Infinity或猜上限。','未將原任務stock預約、採集意願或食物安全推算成統一incoming／available；後續適配須再核原權威。']});
  });
}
