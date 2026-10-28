// M28 recent chronicle: a read-only adapter from this core's journal to the adopted public event view (vendor/public/ef823ac, see SOURCES.md).
// Nothing is written back; see createGptEventFeed for how the cursor follows the journal.
import{maskHealthText}from'./health-view.mjs';import{eventView}from'../vendor/public/ef823ac/event-view/contract.mjs';import{CORE_SOURCE}from'./public-view.mjs';import{TASKNAME}from'./data.mjs';
// Supported catalog: event types whose own fields are projected as the result; any other type keeps an unknown result and reason.
export const SUPPORTED={'activity-complete':'活動完成',growth:'武學成長',harvest:'採集完成','building-complete':'建物完成','temporary-return':'回復原安排','recipe-complete':'做好一鍋','recipe-cooked':'出鍋','joint-drill-start':'聯合演練開始','joint-drill-assemble':'聯合演練集合','joint-drill-review':'聯合演練回顧','mentor-event':'師徒後續','mentor-event-void':'師徒談話作廢','mentor-direction-proposed':'提出練功方向','mentor-direction-accepted':'答應練功方向','mentor-direction-cancelled':'取消練功方向','mentor-direction-unreachable':'方向無法達成',followup:'後續','content-move-learned':'研讀學會招式','spar-end':'切磋結束',memory:'共同記憶',joined:'入門','school-complete':'義學完成',ate:'用餐','tea-drunk':'喝藥茶',insight:'體悟'};
const INTERNAL=new Set(['command','transfer']);
const KIND_FACILITY={cook:'kitchen',train:'yard',gather:'store'};
const pick=(e,keys)=>Object.fromEntries(keys.filter(k=>e[k]!=null&&['string','number','boolean'].includes(typeof e[k])).map(k=>[k,e[k]]));
function visibleNow(w,e){return!INTERNAL.has(e.type)&&(e.actors||[]).every(id=>{const p=w.people[id];return p&&!p.inactive&&!['wild','cave','departed'].includes(p.residence);});}
function project(w,e,source,epoch,seq){const ok=SUPPORTED[e.type],visible=visibleNow(w,e),facility=e.type==='building-complete'?(['store','kitchen','yard'].includes(e.facility)?e.facility:null):e.type==='activity-complete'?(KIND_FACILITY[e.kind]||null):null,martial=!!(e.art||e.move||/^(growth|insight|content-move-learned|spar-end|joint-drill)/.test(e.type));
 return eventView({sequence:seq,id:`${source}:${epoch}:${seq}:${e.id}`,source,stream:'journal',tick:e.tick,unit:'20Hz tick（1/20 遊戲秒）',kind:e.type,actors:e.actors||[],facility,action:e.art||e.move||e.kind||null,category:martial?'martial':['activity-complete','harvest','building-complete','recipe-complete','recipe-cooked'].includes(e.type)?'work':'life',
  result:ok?{text:maskHealthText(w,e.text)||(e.type==='activity-complete'&&TASKNAME[e.kind]?TASKNAME[e.kind]+'完成':ok),...pick(e,['kind','units','art','U','F','I','item','n','stage','outcome','returnTo'])}:null,reason:ok?(e.reason||null):null,visibility:visible?'known':'hidden'});}
// One adapter per page; epoch changes when the world object changes or time runs backwards.
// M31: native ids are not all event.N (mentor events keep ids such as 'mentor.direction-set', repeated across cycles).
// M37: the reader remembers the journal entries it saw last time (the core only push()es and shift()s, so the objects stay the same).
// New entries are those in the ring now that were not there before, in ring order: non-numeric and repeated ids, same-tick order and
// the first entry of a rolled-over window are all kept; entries the ring already dropped are not made up. The memory is the current ring (500).
export function createGptEventFeed({getWorld}){let world=null,tick=-1,epoch=0,seen=new Set(),seq=0;const source=CORE_SOURCE+':journal';
 const reset=()=>{world=getWorld();tick=-1;epoch++;seen=new Set();seq=0;};
 return{reset,get epoch(){return epoch;},snapshot(){const w=getWorld();if(w!==world||w.tick<tick)reset();tick=w.tick;const J=w.journal,fresh=J.filter(e=>!seen.has(e));seen=new Set(J);
  return{source,epoch,events:fresh.map(e=>project(w,e,source,epoch,++seq))};}};}
