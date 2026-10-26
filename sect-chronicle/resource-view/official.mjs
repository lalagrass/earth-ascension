import { resourceView, field } from './contract.mjs';
import { TEA } from '../experiments/water-carry/demo/tea.mjs';
import { SITE } from '../experiments/water-carry/demo/home02.mjs';
export const OFFICIAL_SHA = '2937dd017f8b5e6dea0a05e1ae120bd25499dc15';
const root = `official:${OFFICIAL_SHA}:sect-chronicle/experiments/water-carry/demo/`;
export function officialResources(model, actorId = 'hero') {
  const v=model.view(), h=v.home02, tea=v.people?.hero?.tea, options=model.actions(actorId);
  return [
    { id:'water',label:'水',unit:'擔',amount:v.vat,capacity:v.vatCapacity,incoming:v.inFlight,reserved:tea?.resv?.water,available:v.teaAvail?.water,
      paths:['model.mjs:view.vat','model.mjs:view.vatCapacity','model.mjs:view.inFlight','tea.mjs:view.resv.water','model.mjs:view.teaAvail.water ← tea.mjs:avail'],
      uses:[`泡茶：水 ${TEA.water}＋藥草 ${TEA.herb}（原茶座）`],usePath:'tea.mjs:TEA',actions:['work:water','tea'],
      links:[{kind:'facility',id:'vat',label:'水缸／挑水指派'},{kind:'facility',id:'spring',label:'泉眼'}],
      notes:['在途沿原 inFlight：已出發的交付額度，含尚未取水者；沒有計入實存。','耗用預約與可用是原茶系統 resv／avail，非另一個通用庫存公式。'] },
    { id:'herb',label:'藥草',unit:'份',amount:v.herbs,capacity:v.herbCapacity,incoming:v.herbInFlight,reserved:tea?.resv?.herb,available:v.teaAvail?.herb,
      paths:['model.mjs:view.herbs','model.mjs:view.herbCapacity','model.mjs:view.herbInFlight','tea.mjs:view.resv.herb','model.mjs:view.teaAvail.herb ← tea.mjs:avail'],
      uses:[`泡茶：水 ${TEA.water}＋藥草 ${TEA.herb}（原茶座）`],usePath:'tea.mjs:TEA',actions:['work:herb','tea'],
      links:[{kind:'facility',id:'rack',label:'藥架／採藥指派'},{kind:'facility',id:'herb',label:'藥圃'}],
      notes:['在途沿原 herbInFlight，不加到實存，也不再從茶可用重扣。','耗用預約與可用只讀原茶系統，保留其原作用範圍。'] },
    { id:'wood',label:'木料',unit:'捆',amount:h?.wood,capacity:h?.cap,incoming:h?.woodIn,reserved:h?.resv,available:h?.avail,
      paths:['home02.mjs:world.wood','home02.mjs:world.cap','home02.mjs:world.woodIn','home02.mjs:world.resv','home02.mjs:world.avail ← avail()'],
      uses:[`原寢舍修繕需木 ${SITE.wood}；沿原工地流程`],usePath:'home02.mjs:SITE',actions:['work:wood','build'],
      links:[{kind:'view',id:'dorm',label:'寢舍／院倉（原人物操作）'},{kind:'view',id:'woods',label:'林緣砍柴點'}],
      notes:['在途只讀 woodIn 採伐交付額度；已從院倉搬去工地的 bundle 不算回倉incoming。','耗用預約讀原工地 resv，可用讀原 home02.world.avail；木料／工地沿既有本局資料，不擴保存。'] },
  ].map(r=>{
    const keys=['amount','capacity','incoming','reserved','available'];
    return resourceView({namespace:'official',sha:OFFICIAL_SHA,nativeId:r.id,label:r.label,unit:r.unit,source:root+'model.mjs:view',
      values:Object.fromEntries(keys.map((key,i)=>[key,field(`resource.${key}`,r[key],{source:root+r.paths[i],unit:r.unit})])),
      uses:field('resource.uses',r.uses,{source:root+r.usePath}),links:r.links,notes:r.notes,
      commands:options.filter(a=>r.actions.includes(a.id)&&!a.hidden).map(a=>({id:a.id,label:a.label,enabled:a.enabled,reason:a.enabled?a.detail:a.reason,source:root+`model.mjs:actions(${actorId}).${a.id}`})) });
  });
}
