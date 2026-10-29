// 純顯示：只讀現有狀態，不推進世界、不替人物作決定。
import { ACTIONS, FACILITIES, DAY, blockReason } from './homestead.mjs';
export const materialName = {wood:'木料', berries:'野果', veg:'青菜', herbs:'草藥'};
export function activityText(s, p = s.person) {
  const t = p?.task;
  if (!t) return '正在看看接下來做什麼';
  const target = FACILITIES[t.place]?.stages[s.fac[t.place]?.stage + (t.act === 'build' ? 1 : 0)]?.name || ({home:'住處',visitor:'村路'}[t.place]) || t.place;
  if (t.phase === 'fetch') return `去儲物處取${materialName[t.mat] || t.mat}，準備建${target}`;
  if (t.phase === 'deliver') return `搬${p.carry?.amount || 1}根木料到「${target}」工地`;
  if (t.act === 'return') return `把${materialName[p.carry?.kind] || '物資'}帶回儲物處`;
  if (t.act === 'build') return t.phase === 'go' ? `走向「${target}」工地` : `正在建造「${target}」`;
  if (t.act === 'leave') return '沿村路回村';
  if (t.phase === 'go') return `走向${target}，準備${ACTIONS[t.act]?.name || '休息'}`;
  if (t.act === 'farm') return s.plot.state === 'ripe' ? '正在收青菜' : '正在菜園播種';
  if (t.act === 'herbFarm') return s.herbPlot.state === 'ripe' ? '正在收藥田草藥' : '正在藥田插穗';
  if (t.act === 'rest') return s.fac.hut.stage ? `在${FACILITIES.hut.stages[s.fac.hut.stage].name}休息` : '在空地席地休息';
  if (t.act === 'leisure') return t.place === 'bench' ? '坐在屋前長凳看雲' : '在屋前閒坐看雲';
  return `正在${ACTIONS[t.act]?.name || '生活'}`;
}
export function activityReason(s, p = s.person, who = 'person') {
  if (p.carry) return p.carry.origin === 'site' ? '這根木料已從儲物處取出，送達工地才算交料。' : '採下的物資要實際搬回，才會入庫。';
  const blocked = p.order && p.task?.act !== p.order ? blockReason(s, p.order, who) : null;
  if (blocked) return `指派暫候：${blocked}；先${activityText(s,p)}。`;
  if (p.order && p.task?.act === p.order) return '正在執行你的指派；缺糧或疲累時會先照顧自己。';
  if (p.task?.act === 'eat' || p.task?.act === 'forage') return '先照顧吃飯與可用食物。';
  if (p.task?.act === 'rest') return '先補回精力，休息後再繼續。';
  if (p.task?.act === 'build') return '已有家園藍圖，正逐件備料施工。';
  if (p.task?.act === 'leisure') {
    const reason = Object.values(s.fac).some(f=>f.site) ? blockReason(s,'build',who) : null;
    return reason ? `工程暫候：${reason}；現在先歇一會。` : '目前沒有急需處理的生活工作，可以安心歇一會。';
  }
  return '依食物、精力、工程與性情自主安排；可以隨時改派。';
}
export function facilityEffect(id, stage) {
  if (id === 'hut') return `休息每秒恢復 ${stage.rest} 精力`;
  if (id === 'store') return stage.name === '儲物棚' ? '容量：果20／木20／種10／菜16／飯15／藥10' : '容量：果8／木8／種5／菜8／飯8／藥6';
  if (id === 'garden') return stage.offers.includes('farm') ? '可播種；生長34秒後收2菜與2種' : '尚不能種菜';
  if (id === 'kitchen') return stage.offers.includes('cook') ? '2菜＋1木 → 3份熱飯' : '尚不能料理';
  if (id === 'herbGarden') return stage.offers.includes('herbFarm') ? '1草藥插穗；生長50秒後收2–3草藥' : '尚不能栽藥';
  if (id === 'bench') return stage.offers.includes('leisure') ? '閒坐改在長凳；無額外數值加成' : '尚無座位';
  if (id === 'flowers') return stage.name === '庭院花叢' ? '純外觀，不增加產量或能力' : '尚未植栽';
  return '';
}
export function buildingInfo(s,id) {
  const f=FACILITIES[id], st=s.fac[id], next=f.stages[st.stage+1], site=st.site;
  const missing=site ? Math.max(0,site.need.wood-site.delivered.wood-site.reserved.wood) : (next?.cost.wood||0);
  return {current:facilityEffect(id,f.stages[st.stage]), next:next ? facilityEffect(id,next):null, missing, shortage:Math.max(0,missing-s.stock.wood)};
}
export function projectMaterials(s) {
  const sites=Object.values(s.fac).filter(f=>f.site);
  const needed=sites.reduce((n,f)=>n+Math.max(0,f.site.need.wood-f.site.delivered.wood-f.site.reserved.wood),0);
  return {count:sites.length,needed,shortage:Math.max(0,needed-s.stock.wood)};
}
export function nextStep(s) {
  if (s.person.hunger < 38) return '先吃點東西；缺糧時採野果，搬回後才能吃。';
  if (s.person.energy < 24) return `先歇息。${FACILITIES.hut.stages[s.fac.hut.stage].name}每秒恢復${FACILITIES.hut.stages[s.fac.hut.stage].rest}精力。`;
  const sites=Object.keys(s.fac).filter(id=>s.fac[id].site);
  const active=s.person.task?.act==='build' ? s.person.task.place : null;
  const pending=(active && s.fac[active]?.site ? active : null) || sites.find(id=>s.fac[id].site.delivered.wood>=s.fac[id].site.need.wood) || sites[0];
  if(pending) {const b=buildingInfo(s,pending), all=projectMaterials(s);return `目前工程：${FACILITIES[pending].stages[s.fac[pending].stage+1].name}。${b.shortage ? `此項還缺${b.shortage}木，可砍柴補足。` : '自主生活會接著搬料施工；也可指派建造。'}${all.count>1 ? ` 共${all.count}項工程共用庫存；待運${all.needed}木，現存${s.stock.wood}木，合計尚缺${all.shortage}木。` : ''}`;}
  if(!s.fac.hut.stage)return '第一個家：在下方立「簡陋木屋」藍圖；需5木，會逐根搬料。';
  if(!s.fac.garden.stage || !s.fac.kitchen.stage)return '有屋可睡了。可選菜園與露天灶，慢慢把野果生活變成熱飯生活。';
  if(s.fac.hut.stage===1)return '吃住漸穩。修繕小屋讓休息每秒6→9；也可以先建儲物棚或留居。';
  return s.fac.bench && (!s.fac.bench.stage || !s.fac.flowers.stage) ? '生活安穩後，可自由選長凳或庭院花叢；不做也能繼續住。' : '小家已是自己的樣子。留居、與人相識或接回山門紀，都由你決定。';
}
export function foodDays(s) { return ((s.stock.meal*52+s.stock.berries*26)/((s.helper?2:1)*.14*DAY)).toFixed(1); }
