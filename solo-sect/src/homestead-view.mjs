import{leisureUseText}from'./homestead-autonomy-learning.mjs';
import{LEISURE,leisureReason}from'./homestead-autonomy-leisure.mjs';
import {RECIPES,edibleEnergy,preparedCount} from './homestead-content.mjs';
import {restRate,at} from './homestead-living.mjs';
// 純顯示：只讀現有狀態，不推進世界、不替人物作決定。
import { ACTIONS, FACILITIES, PLACES, DAY, nextProject, blockReason } from './homestead.mjs';
export const materialName = {wood:'木料', berries:'野果', veg:'青菜', herbs:'草藥'};
export function activityText(s, p = s.person) {
  const t = p?.task;
  if (!t) return '正在看看接下來做什麼';
  const target = FACILITIES[t.place]?.stages[s.fac[t.place]?.stage + (t.act === 'build' ? 1 : 0)]?.name || ({home:'住處',visitor:'村路'}[t.place]) || t.place;
  if (t.phase === 'fetch') return `去儲物處取${materialName[t.mat] || t.mat}，準備建${target}`;
  if (t.phase === 'deliver') return `搬${p.carry?.amount || 1}根木料到「${target}」工地`;
  if (t.act === 'return') return `把${materialName[p.carry?.kind] || '物資'}帶回儲物處`;
  if(t.act==='build'&&t.step==='craft')return t.phase==='go'?'走向木作台，準備加工床部件':'在木作台製作舒適床部件';
  if(t.act==='build'&&t.step==='pickup')return '去取回上次放下的床部件';
  if(t.act==='build'&&t.step==='install'&&t.phase==='go')return at({pos:s.fac.bed.site.assemblyAt},PLACES.bed)?'走回屋內，接續安裝已就位的床部件':'把已做好的床部件搬回屋內';
  if (t.act === 'build') return t.phase === 'go' ? `走向「${target}」工地` : `正在建造「${target}」`;
  if (t.act === 'leave') return '沿村路回村';
  if(t.act==='cook')return t.phase==='go'?`走向露天灶，準備${RECIPES[t.recipe||'basic'].name}`:`正在做${RECIPES[t.recipe||'basic'].name}${t.manual?'（這一鍋）':''}`;
  if(t.act==='leisure'&&t.leisureKind&&LEISURE[t.leisureKind])return (t.phase==='go'?'前往休憩地點：':'')+LEISURE[t.leisureKind].name;
  if (t.phase === 'go') return `走向${target}，準備${ACTIONS[t.act]?.name || '休息'}`;
  if(t.act==='eat'&&t.foodId)return `正在吃${RECIPES[t.foodId].name}`;
  if (t.act === 'farm') return s.plot.state === 'ripe' ? '正在收青菜' : '正在菜園播種';
  if (t.act === 'herbFarm') return s.herbPlot.state === 'ripe' ? '正在收藥田草藥' : '正在藥田插穗';
  if (t.act === 'rest') return s.fac.hut.stage ? `在${FACILITIES.hut.stages[s.fac.hut.stage].name}${s.fac.bed?.stage?'的床鋪':''}休息` : '在空地席地休息';
  if (t.act === 'leisure') return t.place === 'bench' ? '坐在屋前長凳看雲' : '在屋前閒坐看雲';
  return `正在${ACTIONS[t.act]?.name || '生活'}`;
}
export function activityReason(s, p = s.person, who = 'person') {
  if (p.carry) return p.carry.origin === 'site' ? '這根木料已從儲物處取出，送達工地才算交料。' : '手上物資要實際搬回，才會入庫。';
  const blocked = p.order && p.task?.act !== p.order ? blockReason(s, p.order, who) : null;
  if (blocked) return `指派暫候：${blocked}；先${activityText(s,p)}。`;
  if (p.order && p.task?.act === p.order && !['cook','eat','rest'].includes(p.order)) return '正在執行你的指派；缺糧或疲累時會先照顧自己。';
  if(p.task?.act==='eat')return p.task.foodId==='salad'?'這次選清爽小份，省柴的成果在實吃時恢復38飽腹。':p.task.foodId==='stew'?'這次需要較飽足的一餐，實吃燉菜恢復70飽腹與6精力。':'先吃現成食物，不必為新菜耽誤求生。';
  if(p.task?.act==='forage')return '先照顧吃飯與可用食物。';
  if(p.task?.act==='rest')return (s.mode==='solo'&&p.order==='rest'?'這次歇到100後恢復自主。':'')+(!s.fac.hut.stage?'在空地席地休息，每秒恢復3精力；醒來再繼續求生。':`先補回精力。到屋內使用${s.fac.bed?.stage===2?'舒適床鋪':s.fac.bed?.stage?'木床鋪':'現有鋪蓋'}時，每秒恢復${restRate(s,{pos:[440,225]})}精力；休息後再繼續。`);
  if(p.task?.act==='chop')return Object.values(s.fac).some(f=>f.site&&!f.site.paused) ? '已有工程需要木料，先準備可用建材／燃料。' : '補足日常柴火；達到夠用存量就歇一會。';
  if(p.task?.act==='cook')return p.task.recipe==='salad'?'用菜與野果拌食，這一鍋不耗柴。':p.task.recipe==='stew'?'用較多菜與柴慢燉，換較飽足的一餐與有限恢復。':'用菜與柴煮成基本熱飯，補足日常食物。';
  if(p.task?.act==='farm')return '照料一塊菜園，供日後料理；田間收成要搬回才可用。';
  if (p.task?.act === 'build') return '已有家園藍圖，正逐件備料施工。';
  if (p.task?.act === 'leisure') {
    if(s.autonomy&&p.task.leisureKind)return leisureReason(s,p.task)+' '+leisureUseText(s,p.task.leisureKind);
    const reason = Object.values(s.fac).some(f=>f.site) ? blockReason(s,'build',who) : null;
    return reason ? `工程暫候：${reason}；現在先歇一會。` : '目前沒有急需處理的生活工作，可以安心歇一會。';
  }
  return '依食物、精力、工程與性情自主安排；可以隨時改派。';
}
export function facilityEffect(id, stage, mode='solo',autonomy=false) {
  if(id==='fence')return stage.name==='林緣空地'?'尚無屏障':'固定林緣短柵欄，耐久24；關門繞行，開門可通過，兩端並未封閉';
  if (id === 'hut') return `休息每秒恢復 ${stage.rest} 精力`;
  if (id === 'store') return stage.name === '儲物棚' ? '容量：果20／木20／種10／菜16／飯15／藥10' : '容量：果8／木8／種5／菜8／飯8／藥6';
  if (id === 'garden') return stage.offers.includes('farm') ? '可播種；生長34秒後收2菜與2種' : '尚不能種菜';
  if(id==='workbench')return stage.offers.includes('craft')?'可在台前加工床部件，之後搬回屋內安裝':'尚無家具加工處';
  if(id==='kitchen'&&stage.name==='改良灶具')return '保留基本熱飯與拌食，料理Lv2可做燉菜；不免費省柴';
  if (id === 'kitchen') return stage.offers.includes('cook') ? '2菜＋1木 → 3份熱飯' : '尚不能料理';
  if (id === 'herbGarden') return stage.offers.includes('herbFarm') ? '1草藥插穗；生長50秒後收2–3草藥' : '尚不能栽藥';
  if(id==='bed'&&stage.name==='舒適床鋪')return '木作台加工12秒＋屋內安裝6秒；使用時床休息額外+5/秒（原木床+1）';
  if (id === 'bed') return stage.name==='木床鋪' ? '在屋內使用時休息每秒額外+1精力；休息完成短暫安睡感受' : '尚無木床，不增加休息效率';
  if(mode==='legacy'&&id==='bench')return stage.offers.includes('leisure')?'閒坐改在長凳；舊版無額外加成':'尚無座位';
  if(mode==='legacy'&&id==='flowers')return stage.name==='庭院花叢'?'舊版純外觀，不增加產量或能力':'尚未植栽';
  if (id === 'bench') return stage.offers.includes('leisure') ? '到長凳閒坐完成後，舒服感受+2持續60秒；不加工作增益' : '尚無座位';
  if(id==='flowers'&&autonomy)return stage.name==='庭院花叢'?'近前賞花完成後，看花感受+1持續60秒；長凳不再隔空給此感受':'尚未植栽';
  if (id === 'flowers') return stage.name === '庭院花叢' ? '長凳小憩完成可得看花感受+1持續60秒；不增加產量' : '尚未植栽';
  return '';
}
export function buildingInfo(s,id) {
  const f=FACILITIES[id], st=s.fac[id], next=f.stages[st.stage+1], site=st.site;
  const missing=site ? Math.max(0,site.need.wood-site.delivered.wood-site.reserved.wood) : (next?.cost.wood||0);
  return {current:facilityEffect(id,f.stages[st.stage],s.mode,!!s.autonomy), next:next ? facilityEffect(id,next,s.mode,!!s.autonomy):null, missing, shortage:Math.max(0,missing-s.stock.wood)};
}
export function projectMaterials(s) {
  const sites=Object.values(s.fac).filter(f=>f.site);
  const needed=sites.reduce((n,f)=>n+Math.max(0,f.site.need.wood-f.site.delivered.wood-f.site.reserved.wood),0);
  return {count:sites.length,needed,shortage:Math.max(0,needed-s.stock.wood)};
}
export function nextStep(s) {
  if (s.person.hunger < 38) return '先吃點東西；缺糧時採野果，搬回後才能吃。';
  if (s.person.energy < 24) return `先歇息。${FACILITIES.hut.stages[s.fac.hut.stage].name}每秒恢復${restRate(s,{pos:[440,225]})}精力。`;
  const allSites=Object.keys(s.fac).filter(id=>s.fac[id].site);
  const sites=allSites.filter(id=>!s.fac[id].site.paused);
  if(allSites.length&&!sites.length)return '工程已暫停，已投入材料與施工進度保留；按繼續才會復工。也可以先吃飯休息。';
  const active=s.person.task?.act==='build' ? s.person.task.place : null;
  const pending=(active && s.fac[active]?.site ? active : null) || nextProject(s) || (sites.includes(s.focusProject)?s.focusProject:null) || sites[0];
  if(pending) {const b=buildingInfo(s,pending), all=projectMaterials(s);return `目前工程：${FACILITIES[pending].stages[s.fac[pending].stage+1].name}。${b.shortage ? `此項還缺${b.shortage}木，可砍柴補足。` : '自主生活會接著搬料施工；也可指派建造。'}${all.count>1 ? ` 共${all.count}項工程共用庫存；待運${all.needed}木，現存${s.stock.wood}木，合計尚缺${all.shortage}木。` : ''}`;}
  if(!s.fac.hut.stage)return '第一個家：在下方立「簡陋木屋」藍圖；需5木，會逐根搬料。';
  if(!s.fac.garden.stage || !s.fac.kitchen.stage)return '有屋可睡了。可選菜園與露天灶，慢慢把野果生活變成熱飯生活。';
  if(s.fac.hut.stage===1)return '吃住漸穩。修繕小屋讓休息每秒6→9；也可以先建儲物棚或留居。';
  if(s.mode==='solo'&&!s.fac.bed?.stage)return '可鋪一張木床：在屋內休息每秒再恢復1精力，也可以先做長凳或花叢。';
  return s.fac.bench && (!s.fac.bench.stage || !s.fac.flowers.stage) ? '生活安穩後，可自由選長凳或庭院花叢；不做也能繼續住。' : s.mode === 'solo' ? '小家已是自己的樣子。可以留居休閒，也可自行選擇既有轉接去向。' : '小家已是自己的樣子。留居、與人相識或接回山門紀，都由你決定。';
}
export function foodDays(s) { return ((edibleEnergy(s))/((s.helper?2:1)*.14*DAY)).toFixed(1); }

export function resourceSummary(s) {
 const sites=Object.values(s.fac).filter(f=>f.site);
 return {available:{...s.stock},delivered:sites.reduce((n,f)=>n+f.site.delivered.wood,0),reserved:sites.reduce((n,f)=>n+f.site.reserved.wood,0),incoming:[s.person,s.helper].filter(p=>p?.carry?.origin==='wild').map(p=>({...p.carry})),...projectMaterials(s)};
}

export function homeBenefits(s){const leisure=s.autonomy?['屋前看雲',s.fac.bench.stage?'坐長凳':null,s.fac.flowers.stage?'近前賞花':null,s.fac.garden.stage&&s.plot.state!=='empty'?'看長成的菜畦':null].filter(Boolean).join('／'):s.fac.bench.stage?'可在長凳小憩'+(s.fac.flowers.stage?'看花':''):'在屋前閒坐';return `居住：${s.fac.bed?.stage?FACILITIES.bed.stages[s.fac.bed.stage].name:FACILITIES.hut.stages[s.fac.hut.stage].name}，到休息處每秒恢復${restRate(s,{pos:[440,225]})}精力。料理：${FACILITIES.kitchen.stages[s.fac.kitchen.stage].name}。閒暇：${leisure}。`;}
export function projectFocusText(s){if(s.autonomy&&s.person.order==='build'&&s.person.onceProject)return `本次完整施工鎖定${FACILITIES[s.person.onceProject].label}，搬料／加工／安裝完成才回自主；其他優先標記在本次之後生效，可改派或暫停取消。`;const id=s.focusProject,f=id&&s.fac[id];if(!f?.site)return '未選優先工地；按原順序做可行工程。可在原建造卡選這項先做，不必暫停其他藍圖。';const b=buildingInfo(s,id),v=f.site,name=FACILITIES[id].stages[f.stage+1].name;return `先改善「${name}」：${b.next}。木料已交${v.delivered.wood}/${v.need.wood}，在途${v.reserved.wood}，待運${b.missing}，庫存尚缺${b.shortage}；施工${Number(v.work.toFixed(1))}/${v.workNeed}。當前工序先完成；下次優先此項，缺料可做其他可行事。`;}
