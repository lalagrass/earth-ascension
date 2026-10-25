import {VERSION,ITEM,ART,MOVES,FACILITIES,STORY_IDS,RECIPES} from './data.mjs';
import {invariants,sorted} from './state.mjs';
import {walkable,position,stations,bedSlots} from './map.mjs';
export const PREFIX='solo-sect-gpt.chapter1.v1.';
export function canonical(value){if(value===null||typeof value!=='object')return JSON.stringify(value);if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';}
export async function hash(value){const bytes=new TextEncoder().encode(canonical(value)),sum=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(sum)].map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function encode(world){const payload=structuredClone(world),checksum=await hash(payload);return JSON.stringify({format:'solo-sect-gpt',...VERSION,savedAt:new Date().toISOString(),payload,checksum});}
const record=o=>o!==null&&typeof o==='object'&&!Array.isArray(o),int=(n,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const safeId=id=>typeof id==='string'&&/^[-a-zA-Z0-9._]+$/.test(id)&&!['__proto__','constructor','prototype'].includes(id);
const kinds=new Set(['class','unloadQuest','drink','move','return','gather','build','train','study','rest','sleep','eat','cook','craft','talk','encourage','care','teach','greet','farm','harvestHaul','delivery','school','reception','learn','equip','story','pack','aid','collect','paired']);
function validate(w){
 for(const k of ['people','facilities','inventories','activities','reservations','queues','bridge','random','relationships','families','stories','ledger','plots','metrics','facts','seenCommands'])if(!record(w[k]))throw Error('缺少世界欄位：'+k);
 for(const k of ['journal','memories','commands'])if(!Array.isArray(w[k]))throw Error('記錄格式錯誤：'+k);
 if(!int(w.seed,1,4294967295)||!int(w.tick)||!int(w.nextId,1)||!int(w.commandSeq)||!w.people.leader||!w.people.child)throw Error('世界識別／時間不合法');
 for(const key of ['world','events','npc']){const s=w.random[key];if(!record(s)||!int(s.value,1,4294967295)||!int(s.draws))throw Error('亂數流不合法');}
 for(const [id,f]of Object.entries(FACILITIES))if(!w.facilities[id]||!int(w.facilities[id].stage,0,f.stages.length)||!int(w.facilities[id].work))throw Error('設施階段／工量不合法');
 for(const f of Object.values(w.facilities)){const b=f.wip?.output;if(b&&(!Object.hasOwn(ITEM,b.item)||!w.inventories[b.source]||!w.inventories[b.target]||!w.people[b.actor]||!record(b.locations)||!int(b.total,1,4)||!int(b.delivered,0,b.total)||!int(b.consumed,0,b.total)||Object.entries(b.locations).some(([id,n])=>!w.inventories[id]||!int(n,1,b.total)||(w.inventories[id].items[b.item]||0)<n)||Object.values(b.locations).reduce((n,v)=>n+v,0)+b.delivered+b.consumed!==b.total))throw Error('成品批次引用／數量不合法');}
 for(const id of STORY_IDS)if(!w.stories[id]||!['unseen','active','completed'].includes(w.stories[id].status))throw Error('故事節點缺失');
 for(const [id,inv]of Object.entries(w.inventories)){
  if(inv.id!==id||!safeId(id)||!record(inv.items)||!int(inv.capacity,1,100000))throw Error('物資位置／容量不合法');
  for(const [item,n]of Object.entries(inv.items))if(!Object.hasOwn(ITEM,item)||!int(n))throw Error('物資種類／數量不合法');
 }
 for(const [id,p]of Object.entries(w.people)){
  if(p.id!==id||!safeId(id)||typeof p.name!=='string'||!p.name.length||p.name.length>40||!/^#[0-9a-fA-F]{6}$/.test(p.color))throw Error('人物欄位不合法');
  if(typeof p.adult!=='boolean'||!['human','rat','boar'].includes(p.kind)||!['resident','visitor','departed','wild','cave','training'].includes(p.residence)||!['leader','worker','outer','inner','family','guest','traveler','wild','warden','training','rescuer'].includes(p.rank))throw Error('人物身份不合法');
  if(!Array.isArray(p.stats)||p.stats.length!==5||p.stats.some(n=>!int(n,1,7))||!Array.isArray(p.traits)||p.traits.length!==2||p.traits.some(n=>!int(n,-2,2))||!int(p.energy,0,10000)||!int(p.injury,0,100)||!int(p.hp,0,p.maxHp)||!int(p.maxHp,1,10000)||!int(p.angle,0,359))throw Error('人物數值不合法');
  if(!['punch','staff','sword'].includes(p.weapon)||p.weapon!=='punch'&&!(w.inventories[p.equipment]?.items[p.weapon]>0))throw Error('裝備與實際器械不符');
  if(!w.inventories[p.bag]||p.equipment&&!w.inventories[p.equipment])throw Error('人物包裹引用失效');
  if(!Array.isArray(p.path)||!int(p.routeAt,0,p.path.length)||p.path.some(q=>!Array.isArray(q)||q.length!==2||q.some(n=>!Number.isSafeInteger(n))))throw Error('路徑索引／座標不合法');
  if(!record(p.skill))throw Error('武學欄位缺失');for(const [art,s]of Object.entries(p.skill))if(!Object.hasOwn(ART,art)||!record(s)||!int(s.U,0,100)||!int(s.F,0,100)||!int(s.I,0,100)||!Array.isArray(s.contexts)||new Set(s.contexts).size!==s.contexts.length||s.contexts.some(c=>!['guard','dodge','protect','return'].includes(c)))throw Error('武學來源／數值不合法');
  if(p.classSession&&(!w.activities[p.classSession]||w.activities[p.classSession].kind!=='class'||![w.activities[p.classSession].actor,...w.activities[p.classSession].args.students].includes(p.id)))throw Error('人物授課引用失效');
  if(!record(p.observation)||Object.entries(p.observation).some(([id,o])=>!w.people[id]||!record(o)||!int(o.continuous)||!int(o.patterns)||!Array.isArray(o.seen)))throw Error('觀察引用／進度不合法');
  const a=p.action;if(a&&(!Object.hasOwn(MOVES,a.move)||!['windup','active','recover'].includes(a.phase)||!int(a.remaining,1,10000)||!int(a.wind,1,1000)||!int(a.active,1,1000)||!int(a.recover,1,1000)||a.target&&!w.people[a.target]||!Array.isArray(a.hitSet)||new Set(a.hitSet).size!==a.hitSet.length||a.hitSet.some(id=>!w.people[id])))throw Error('進行中招式不合法');
 }
 for(const [id,a]of Object.entries(w.activities)){
  if(a.id!==id||!safeId(id)||!kinds.has(a.kind)||!w.people[a.actor]||!record(a.args)||!int(a.progress||0))throw Error('活動狀態不合法');
  if(w.completionIds?.[id])throw Error('已完成活動不能再次掛回');
  if(['talk','encourage','care','teach','greet','reception','aid'].includes(a.kind)&&!w.people[a.args.target])throw Error('活動人物引用失效');
  if(a.kind==='paired'&&(!w.people[a.partner]||!w.activities[a.session]))throw Error('雙人活動引用失效');
  if(a.kind==='cook'&&!Object.hasOwn(RECIPES,a.args.recipe||'meal')||a.kind==='craft'&&!['staff','sword'].includes(a.args.art))throw Error('配方引用失效');
  if(['train','study','learn','equip'].includes(a.kind)&&!Object.hasOwn(ART,a.args.art||'punch'))throw Error('武學引用失效');
  if(a.kind==='story'&&a.selfcare&&Object.entries(a.selfcare).some(([id,c])=>![a.actor,a.args.partner].includes(id)||!stations[c.key]||!['sleep','rest'].includes(c.kind)))throw Error('約定自理引用失效');
  if(a.kind==='class'&&(!Array.isArray(a.args.students)||a.args.students.length>4||new Set(a.args.students).size!==a.args.students.length||a.args.students.some(id=>!w.people[id]?.adult||w.people[id].classSession!==a.id)||!record(a.classSlots)||Object.entries(a.classSlots).some(([id,key])=>!a.args.students.includes(id)||!/^hall\.student\.[0-3]$/.test(key))||new Set(Object.values(a.classSlots)).size!==a.args.students.length))throw Error('同堂授課引用失效');
  if(a.kind==='build'&&!Object.hasOwn(FACILITIES,a.args.facility))throw Error('工地引用失效');
  if(a.kind==='farm'&&a.plot&&!w.plots[a.plot])throw Error('田畦引用失效');
  if(a.kind==='harvestHaul'&&!w.inventories[a.harvest]||a.kind==='collect'&&!w.inventories[a.args.inventory])throw Error('搬運來源引用失效');
  if(a.kind==='story'&&(!w.stories[a.args.node]||!w.people[a.args.partner]))throw Error('約定引用失效');
  if(['pack','unloadQuest'].includes(a.kind)&&(!w.expedition||!w.expedition.actors.includes(a.actor)))throw Error('遠征活動引用失效');
 }
 for(const [id,f]of Object.entries(w.families)){if(f.id!==id||!Array.isArray(f.members)||f.members.length!==2||new Set(f.members).size!==2||f.members.some(id=>!w.people[id]?.adult)||!['partnered','moving','cohabiting','separated'].includes(f.status))throw Error('家庭身份不合法');if(f.status!=='separated'&&f.members.some(id=>w.people[id].family!==f.id))throw Error('家庭雙向引用失效');if(['moving','cohabiting'].includes(f.status)&&(!Array.isArray(f.beds)||f.beds.length!==2||new Set(f.beds).size!==2||f.beds.some(b=>!bedSlots(w).includes(b))))throw Error('同住床位不合法');}
 for(const p of Object.values(w.people))if(p.family&&(!w.families[p.family]?.members.includes(p.id)||w.families[p.family].status==='separated'))throw Error('人物家庭引用失效');
 for(const [key,queue]of Object.entries(w.queues))if(!Array.isArray(queue)||queue.some(r=>!w.activities[r.activity]||w.activities[r.activity].actor!==r.actor||!int(r.tick,0,w.tick))||new Set(queue.map(r=>r.activity)).size!==queue.length)throw Error('站位候位引用失效');
 for(const [tokenId,r]of Object.entries(w.reservations)){
  const a=w.activities[r.activity];if(tokenId!==r.activity+'|'+r.key||!int(r.tick,0,w.tick)||!a||a.actor!==r.actor||!w.people[r.actor]||!int(r.n,1)||typeof r.key!=='string'||!['station','source','dest','participant','plot'].includes(r.key.split(':')[0]))throw Error('預約失效');const [kind,id,item]=r.key.split(':');const station=r.key.slice(8);if(kind==='station'&&!Object.hasOwn(stations,station)&&!(/^point\.\d+\.\d+$/.test(station)&&walkable(w,...station.slice(6).split('.').map(Number)))&&!Object.keys(FACILITIES).some(f=>station.startsWith(f+'.builder.')||station===f+'.delivery')&&!station.startsWith('aid:')&&!station.startsWith('ground:')&&!station.startsWith('harvest.')&&!station.startsWith('pair.activity.')&&!station.startsWith('story:'))throw Error('站位預約目標不存在');if((kind==='source'||kind==='dest')&&(!w.inventories[id]||!Object.hasOwn(ITEM,item))||kind==='participant'&&!w.people[id]||kind==='plot'&&!w.plots[id])throw Error('預約目標引用失效');
 }
 if(w.bridge.holder){const p=w.people[w.bridge.holder];if(!p||!['east','west'].includes(w.bridge.direction)||p.x/256<1840||p.x/256>1970||p.y/256<410||p.y/256>470)throw Error('橋上通行權不合法');}
 if(!Array.isArray(w.bridge.queue)||w.bridge.queue.some(q=>!w.people[q.id]||!int(q.tick,0,w.tick)||!['east','west'].includes(q.dir)))throw Error('候橋順序不合法');
 if(w.pendingCommands&&(!Array.isArray(w.pendingCommands)||w.pendingCommands.some(c=>!safeId(c.id)||!int(c.executeTick,w.tick+1)||c.actor&&!Object.hasOwn(w.people,c.actor))))throw Error('排程指令不合法');
 if(w.caveCargo){if(!Array.isArray(w.caveCargo)||w.caveCargo.length!==4||new Set(w.caveCargo.map(t=>t.id)).size!==4)throw Error('古洞有限糧身份不合法');const held={};for(const t of w.caveCargo){if(!/^cave\.ration\.[1-4]$/.test(t.id)||t.owner&&!w.inventories[t.owner]||t.deliveredAt!==null&&!int(t.deliveredAt,0,w.tick)||t.consumedAt!==null&&!int(t.consumedAt,0,w.tick))throw Error('古洞糧來源引用失效');if(t.owner)held[t.owner]=(held[t.owner]||0)+1;}for(const [id,n]of Object.entries(held))if((w.inventories[id].items.ration||0)<n)throw Error('古洞糧來源大於實物');}
 const allocated=[...w.journal.map(e=>e.id),...Object.keys(w.activities),...w.memories.map(m=>m.id),...Object.keys(w.families),...(w.pendingCommands||[]).map(c=>c.id),...Object.values(w.people).map(p=>p.action?.id).filter(Boolean)];
 const largest=allocated.reduce((n,id)=>{const m=/^(event|activity|action|memory|family|queued-command)\.(\d+)$/.exec(id);return m?Math.max(n,Number(m[2])):n;},0);if(w.nextId<=largest)throw Error('下一個身份序號會覆蓋既有記錄');
 const e=invariants(w);if(e.length)throw Error('存檔事實不合法：'+e.slice(0,4).join('、'));
}
export async function decode(text){
 if(typeof text!=='string'||new TextEncoder().encode(text).length>8*1024*1024)throw Error('檔案超過8MiB或格式不符');
 const x=JSON.parse(text,(key,v)=>{if(['__proto__','constructor','prototype'].includes(key))throw Error('不允許的欄位');if(typeof v==='number'&&!Number.isFinite(v))throw Error('非有限數');return v;});
 if(x.format!=='solo-sect-gpt')throw Error('非本遊戲存檔');for(const k of Object.keys(VERSION))if(x[k]!==VERSION[k])throw Error('不支援的版本：'+k);
 if(!x.payload||x.checksum!==await hash(x.payload))throw Error('校驗碼不符，原存檔已保留');
 const w=x.payload;for(const k of Object.keys(VERSION))if(w[k]!==VERSION[k])throw Error('內容版本不符');
 try{validate(w);}catch(e){if(e instanceof TypeError)throw Error('存檔內容欄位缺失／型別不合法');throw e;}return w;
}
export async function safeWrite(storage,key,world){const text=await encode(world),temp=PREFIX+'pending';
 try{storage.setItem(temp,text);const check=storage.getItem(temp);if(check!==text)throw Error('暫存重讀失敗');await decode(check);storage.setItem(key,text);storage.removeItem(temp);}catch(e){try{storage.removeItem(temp);}catch{}throw Error('保存失敗：'+e.message);}return text;}
