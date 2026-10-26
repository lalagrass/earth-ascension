import { resourceView, field } from './contract.mjs';
import { GPT_SHA } from '../scene-shared/adapters/gpt.mjs';
import { qty, availableQty, sourceFor } from '../scene-shared/sources/gpt/solo-sect-gpt/src/state.mjs';
import { ITEM, RECIPES } from '../scene-shared/sources/gpt/solo-sect-gpt/src/data.mjs';
const root=`gpt:${GPT_SHA}:solo-sect-gpt/src/`;
// Public warehouse inventories only; never total hidden bags, wild stocks or ecology.
export function gptResources(world) {
  return ['water','herb','wood'].map(item=>{
    const inv=sourceFor(item),source=root+`state.mjs:world.inventories.${inv}`,unit='原生計數（未標量綱）';
    const f=(key,value,path,availability)=>field(`resource.${key}`,value,{source:root+path,unit,...(availability?{availability}:{})});
    const reserved=Object.values(world.reservations).filter(r=>r.key===`source:${inv}:${item}`).reduce((n,r)=>n+r.n,0);
    const uses=Object.entries(RECIPES).filter(([,r])=>r.input[item]).map(([id,r])=>`原配方 ${id}：${ITEM[item]} ${r.input[item]}（原生計數）`);
    return resourceView({namespace:'gpt',sha:GPT_SHA,nativeId:item,label:ITEM[item],unit,source,
      values:{amount:f('amount',qty(world,inv,item),`state.mjs:qty(world,${inv},${item})`),capacity:f('capacity',world.inventories[inv]?.capacity,`state.mjs:world.inventories.${inv}.capacity`),
        incoming:f('incoming',null,'activities.mjs:gatherTick / state.mjs:dest reservations','unsupported'),
        reserved:f('reserved',reserved,`state.mjs:world.reservations[key=source:${inv}:${item}].n (exact sum)`),
        available:f('available',availableQty(world,inv,item),`state.mjs:availableQty(world,${inv},${item})`)},
      uses:field('resource.uses',uses.length?uses:null,{source:root+'data.mjs:RECIPES.input',availability:uses.length?'known':'unsupported'}),
      links:[{kind:'native',id:inv==='vat'?'kitchen':'store',label:inv==='vat'?'原廚房水缸':'原庫房'}],
      notes:['原 capacity 是本核心每品項容量，沒有換算成正式版擔／份／捆。','incoming無同口徑公開查詢：dest預約只是容量，並不證明貨已在路上，不能當incoming。','availableQty是原同tick供料查詢，未宣稱已扣所有source預約；原值與耗用預約分列，公版不猜淨額。'] });
  });
}
