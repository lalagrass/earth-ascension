// M28 recent chronicle: a read-only adapter from this core's journal to the adopted public event view (vendor/public/ef823ac, see SOURCES.md).
// Nothing is written back; see createGptEventFeed for how the cursor follows the journal.
import{eventView}from'../vendor/public/ef823ac/event-view/contract.mjs';import{CORE_SOURCE}from'./public-view.mjs';import{TASKNAME}from'./data.mjs';
// Supported catalog: event types whose own fields are projected as the result; any other type keeps an unknown result and reason.
export const SUPPORTED={'activity-complete':'活動完成',growth:'武學成長',harvest:'採集完成','building-complete':'建物完成','temporary-return':'回復原安排','recipe-complete':'做好一鍋','recipe-cooked':'出鍋','joint-drill-start':'聯合演練開始','joint-drill-assemble':'聯合演練集合','joint-drill-review':'聯合演練回顧','mentor-event':'師徒後續','mentor-event-void':'師徒談話作廢','mentor-direction-proposed':'提出練功方向','mentor-direction-accepted':'答應練功方向','mentor-direction-cancelled':'取消練功方向','mentor-direction-unreachable':'方向無法達成',followup:'後續','content-move-learned':'研讀學會招式','spar-end':'切磋結束',memory:'共同記憶',joined:'入門','school-complete':'義學完成',ate:'用餐','tea-drunk':'喝藥茶',insight:'體悟'};
const INTERNAL=new Set(['command','transfer']);
const KIND_FACILITY={cook:'kitchen',train:'yard',gather:'store'};
const pick=(e,keys)=>Object.fromEntries(keys.filter(k=>e[k]!=null&&['string','number','boolean'].includes(typeof e[k])).map(k=>[k,e[k]]));
const num=id=>Number(String(id).split('.').at(-1));
function visibleNow(w,e){return!INTERNAL.has(e.type)&&(e.actors||[]).every(id=>{const p=w.people[id];return p&&!p.inactive&&!['wild','cave','departed'].includes(p.residence);});}
function project(w,e,source,epoch,seq){const ok=SUPPORTED[e.type],visible=visibleNow(w,e),facility=e.type==='building-complete'?(['store','kitchen','yard'].includes(e.facility)?e.facility:null):e.type==='activity-complete'?(KIND_FACILITY[e.kind]||null):null,martial=!!(e.art||e.move||/^(growth|insight|content-move-learned|spar-end|joint-drill)/.test(e.type));
 return eventView({sequence:seq,id:`${source}:${epoch}:${seq}:${e.id}`,source,stream:'journal',tick:e.tick,unit:'20Hz tick（1/20 遊戲秒）',kind:e.type,actors:e.actors||[],facility,action:e.art||e.move||e.kind||null,category:martial?'martial':['activity-complete','harvest','building-complete','recipe-complete','recipe-cooked'].includes(e.type)?'work':'life',
  result:ok?{text:e.text||(e.type==='activity-complete'&&TASKNAME[e.kind]?TASKNAME[e.kind]+'完成':ok),...pick(e,['kind','units','art','U','F','I','item','n','stage','outcome','returnTo'])}:null,reason:ok?(e.reason||null):null,visibility:visible?'known':'hidden'});}
// One adapter per page; epoch changes when the world object changes or time runs backwards.
// M31: native ids are not all event.N (mentor events keep ids such as 'mentor.direction-set', repeated across cycles).
// The read-only cursor is the last event.N seen plus how many non-numeric entries followed it, located by journal order; history is never rewritten.
// If that event.N has left the 500-entry ring, entries after the first larger event.N are new; non-numeric entries before it cannot be proven unseen and are skipped.
const NUMERIC=/^event\.\d+$/;
export function createGptEventFeed({getWorld}){let world=null,tick=-1,epoch=0,cur={n:0,k:0},seq=0;const source=CORE_SOURCE+':journal';
 const reset=()=>{world=getWorld();tick=-1;epoch++;cur={n:0,k:0};seq=0;};
 return{reset,get epoch(){return epoch;},snapshot(){const w=getWorld();if(w!==world||w.tick<tick)reset();tick=w.tick;const J=w.journal;let start;
  if(cur.n===0&&cur.k===0)start=0;else{const at=cur.n?J.findIndex(e=>NUMERIC.test(e.id)&&num(e.id)===cur.n):-1;if(at>=0)start=at+1+cur.k;else if(!cur.n)start=cur.k;else{const next=J.findIndex(e=>NUMERIC.test(e.id)&&num(e.id)>cur.n);start=next<0?J.length:next;}}
  const fresh=J.slice(start);for(const e of fresh){if(NUMERIC.test(e.id))cur={n:num(e.id),k:0};else cur={n:cur.n,k:cur.k+1};}
  return{source,epoch,events:fresh.map(e=>project(w,e,source,epoch,++seq))};}};}
