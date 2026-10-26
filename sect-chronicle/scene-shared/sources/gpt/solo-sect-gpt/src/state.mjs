import {Q,DAY,VERSION,TEMPLATES,STORY_IDS,FACILITIES,LEGENDS} from './data.mjs';
import {stations,bedSlots,position,walkable} from './map.mjs';
export const sorted=o=>Object.keys(o).sort().map(k=>o[k]);
export const uid=(w,prefix)=>prefix+'.'+w.nextId++;
export function event(w,type,actors=[],data={}){const e={id:uid(w,'event'),tick:w.tick,type,actors:[...actors],...data};w.journal.push(e);if(w.journal.length>500)w.journal.shift();w.facts[type]=(w.facts[type]||0)+1;return e;}
export function draw(w,stream='world'){let s=w.random[stream],x=s.value;x^=x<<13;x^=x>>>17;x^=x<<5;s.value=x>>>0;s.draws++;return s.value;}
export function inventory(w,id,items={},capacity=96){w.inventories[id]={id,items:{...items},capacity};return id;}
const opening=new WeakMap();
export function openTick(w){opening.set(w,Object.fromEntries(Object.entries(w.inventories).map(([id,inv])=>[id,{...inv.items}])));}
export function closeTick(w){opening.delete(w);}
export function availableQty(w,id,item){const supply=opening.get(w)?.[id];return supply?Math.min(qty(w,id,item),supply[item]||0):qty(w,id,item);}
export const qty=(w,id,item)=>w.inventories[id]?.items[item]||0;
export function add(w,id,item,n,source,internalTransfer=false){if(n<0&&!internalTransfer)productionMove(w,id,null,item,-n);if(item==='ration'&&n<0&&!internalTransfer){const cargo=ensureCaveCargo(w).filter(t=>t.owner===id&&!t.consumedAt);const plain=qty(w,id,item)-cargo.length;for(const t of cargo.slice(0,Math.max(0,-n-plain))){t.owner=null;t.consumedAt=w.tick;}}const inv=w.inventories[id];const supply=opening.get(w)?.[id];if(supply&&n<0)supply[item]=Math.max(0,(supply[item]||0)+n);inv.items[item]=(inv.items[item]||0)+n;if(inv.items[item]<0)throw Error('negative '+id+' '+item);if(!inv.items[item])delete inv.items[item];if(source){w.ledger[item]??={initial:0,produced:0,consumed:0};w.ledger[item][n>0?'produced':'consumed']+=Math.abs(n);if(w.opsPlan){const f=opsFlow(w,item)[n>0?'produced':'consumed'];f[source]=(f[source]||0)+Math.abs(n);}}}
export function transfer(w,from,to,item,n){if(n<=0||qty(w,from,item)<n)throw Error('invalid transfer');const tags=item==='ration'?ensureCaveCargo(w).filter(t=>t.owner===from&&!t.consumedAt).slice(0,n):[];add(w,from,item,-n,undefined,true);add(w,to,item,n,undefined,true);for(const t of tags){t.owner=to;if(from==='cave.food')t.origin=w.expedition?.id||null;}productionMove(w,from,to,item,n);if(w.opsPlan){const stock=['store','vat','table'];if(stock.includes(to)&&!stock.includes(from))opsFlow(w,item).delivered+=n;else if(stock.includes(from)&&!stock.includes(to))opsFlow(w,item).withdrawn+=n;}const moved=event(w,'transfer',[],{from,to,item,n});if(to==='store'&&tags.some(t=>t.deliveredAt===null)){const fresh=tags.filter(t=>t.deliveredAt===null);const delivery=event(w,'cave-cargo-delivered',[],{tokens:fresh.map(t=>t.id),from,to,n:fresh.length});w.keyFacts??={};w.keyFacts[delivery.id]={...delivery};for(const t of fresh){t.deliveredAt=w.tick;t.deliveryEvent=delivery.id;}const promise=w.promises.cave;if(promise&&['partial','unfulfilled'].includes(promise.status)&&promise.expedition){const count=ensureCaveCargo(w).filter(t=>t.origin===promise.expedition&&t.deliveredAt!==null).length;promise.foodDelivered=count;if(!promise.personExpected&&count>=promise.foodExpected){promise.status='fulfilled';event(w,'promise-later-fulfilled',[],{expedition:promise.expedition});}}}}
function productionMove(w,from,to,item,n){for(const f of Object.values(w.facilities)){const batch=f.wip?.output;if(!batch||batch.item!==item)continue;const moved=Math.min(n,batch.locations[from]||0);if(!moved)continue;batch.locations[from]-=moved;if(!batch.locations[from])delete batch.locations[from];if(to===batch.target)batch.delivered+=moved;else if(to===null)batch.consumed+=moved;else batch.locations[to]=(batch.locations[to]||0)+moved;if(batch.delivered+batch.consumed===batch.total&&batch.doneAt===undefined){batch.doneAt=w.tick;if(w.lifePolicy)for(const p of Object.values(w.people))if(p.temporary?.originId===(batch.orderOrigin||batch.id))p.temporary.unitDelivered=true;event(w,'recipe-complete',[batch.actor],{recipe:f.wip.recipe,batch:batch.id,delivered:batch.delivered,consumed:batch.consumed});if(!w.activities[f.wip.activity])f.wip=null;}}}
export function inventorySpace(w,id,item,activity=null){return Math.max(0,(w.inventories[id]?.capacity||0)-qty(w,id,item)-Object.values(w.reservations).filter(r=>r.key==='dest:'+id+':'+item&&r.activity!==activity).reduce((n,r)=>n+r.n,0));}
// M9: same day bucket as economy.today, inlined to keep state.mjs free of imports.
function opsFlow(w,item){const d=String(Math.floor(w.tick/DAY)),m=w.opsPlan;if(!m.days[d]){m.days[d]={ticks:0,flows:{},time:{},blocked:{}};const keys=Object.keys(m.days).map(Number).sort((a,b)=>a-b);while(keys.length>4)delete m.days[String(keys.shift())];}return m.days[d].flows[item]??={produced:{},consumed:{},delivered:0,withdrawn:0};}
export function recordProduced(w,item,n,source){const f=opsFlow(w,item).produced;f[source]=(f[source]||0)+n;}
export const sourceFor=item=>item==='water'?'vat':item==='meal'?'table':'store';
export const itemTotal=(w,item)=>sorted(w.inventories).reduce((n,i)=>n+(i.items[item]||0),0);
export const bagWeight=(w,p)=>Object.entries(w.inventories[p.bag].items).reduce((n,[i,q])=>n+q*(i==='stone'?2:i==='money'?0:1),0);
export const day=w=>Math.floor(w.tick/DAY);
export function makePerson(w,id,name,pos,options={}){
 const stats=options.stats||[4,4,4,4,4],p={id,name,x:Math.round(pos[0]*Q),y:Math.round(pos[1]*Q),angle:0,adult:true,
  kind:'human',canonicalIdentity:null,residence:'resident',rank:'outer',stats:[...stats],traits:[0,0],color:'#8c7655',
  energy:10000,hp:80+stats[0]*5,maxHp:80+stats[0]*5,injury:0,bag:'bag.'+id,bed:null,family:null,
  activity:null,intent:null,revision:0,manualStop:false,path:[],routeAt:0,distance:0,walkRemainder:0,energyRemainder:0,
  skill:{punch:{U:5,F:0,I:0,contexts:[],practice:0,sources:[]}},weapon:'punch',move:'punch',action:null,stun:0,
  observation:{},known:{},meals:0,mealDay:0,contribution:{},reason:'等候方針',next:'自由活動',blocked:'',auto:true,
  primary:options.rank==='worker'?'build':'gather',secondary:'production',moving:false,waitSince:null,recovering:false,visits:0,...structuredClone(options),stats:[...stats],traits:[...(options.traits||[0,0])]};
 w.people[id]=p;inventory(w,p.bag,{},4);p.equipment='equipment.'+id;inventory(w,p.equipment,{},2);return p;
}
export function createWorld(config={}){
 const seed=Number(config.seed??11),template=config.template||'custom',t=Object.hasOwn(TEMPLATES,template)?TEMPLATES[template]:null;
 if(!Number.isInteger(seed)||seed<1||seed>4294967295)throw Error('種子需為 1–4294967295 整數');
 if(!t)throw Error('未知模板');const stats=config.stats||t.stats;
 if(stats.length!==5||stats.some(v=>!Number.isInteger(v)||v<1||v>7)||stats.reduce((a,b)=>a+b,0)!==20)throw Error('五屬性每項1–7，合計20點');
 const w={...VERSION,seed,worldId:'gpt-'+seed,nextId:1,tick:0,commandSeq:0,commandArrivalSeq:0,pendingCommands:[],commands:[],seenCommands:{},
  random:Object.fromEntries([['world',0x9e3779b9],['events',0x85ebca6b],['npc',0xc2b2ae35]].map(([k,v])=>[k,{value:(seed^v)>>>0||0x6d2b79f5,draws:0}])),
  people:{},facilities:{},inventories:{},activities:{},reservations:{},queues:{},bridge:{holder:null,direction:null,batch:0,lastDirection:null,queue:[]},
  journal:[],facts:{},ledger:{},relationships:{},families:{},memories:[],stories:Object.fromEntries(STORY_IDS.map(id=>[id,{id,status:'unseen',progress:0,cast:[],facts:[]} ])),
  identityMode:config.identityMode||'youngRecruitable',template,policy:'build',goals:{water:6,meal:6},visitorQueue:[],expedition:null,drill:null,
  plots:{},ecology:{homeEncounter:false},completed:false,sectName:'未題名的山居',tutorial:0,completionIds:{},metrics:{actions:0,hits:0,misses:0,walked:0},promises:{},storyChoice:null};
 for(const id of Object.keys(FACILITIES)){w.facilities[id]={id,stage:0,active:false,work:0,wip:null};inventory(w,'site.'+id,{},200);}
 inventory(w,'store',{money:30,veg:8,herb:2},24);inventory(w,'vat',{water:4},8);inventory(w,'table',{meal:6},96);inventory(w,'pot',{},96);inventory(w,'camp',{},8);inventory(w,'cave.food',{ration:4},4);
 const hero=makePerson(w,'leader',template==='custom'?(config.name?.trim().slice(0,16)||'雲生'):t.name,[940,1100],{rank:'leader',stats,color:t.color,traits:config.traits||t.traits,canonicalIdentity:template==='custom'?null:template,bed:'hall.bed.0'});
 makePerson(w,'child','小禾',[970,1100],{adult:false,rank:'family',stats:[2,2,4,4,4],color:'#be805c',bed:'hall.bed.1',kin:['leader']});
 makePerson(w,'amu','阿木',[900,1100],{rank:'worker',bed:'hall.bed.2',color:'#777d58',paidThrough:1});
 for(const [i,pos]of [[1490,630],[1550,600],[1580,560],[1510,720],[1640,540]].entries()){
  const id=i<3?'rat.'+(i+1):'boar.'+(i-2),kind=i<3?'rat':'boar';
  const p=makePerson(w,id,kind==='rat'?'林鼠':'野豬',pos,{kind,rank:'wild',residence:'wild',maxHp:kind==='rat'?16:48,hp:kind==='rat'?16:48,habitat:pos,mode:'forage',color:kind==='rat'?'#8c8473':'#7b6457',auto:false});p.angle=draw(w,'world')%360;
 }
 for(let i=0;i<2;i++)makePerson(w,'warden.'+i,'守路人'+(i+1),[2130+i*36,255-i*12],{residence:'wild',rank:'warden',hp:60,maxHp:60,color:'#685e63',auto:false,home:[2130+i*36,255-i*12]});
 makePerson(w,'zhou','周行',[2240,130],{residence:'cave',rank:'traveler',hp:30,injury:55,color:'#9c8a70',auto:false});
 for(const item of ['wood','stone','veg','herb']){w.ecology[item]={remaining:item==='wood'?240:item==='stone'?160:8,day:0};}
 for(const id of ['garden','herb'])for(let i=0;i<2;i++)w.plots[id+'.'+i]={id:id+'.'+i,kind:id,stage:'empty',progress:0,watered:false};
 for(const [item,n]of Object.entries(w.inventories).flatMap(([,v])=>Object.entries(v.items))) {w.ledger[item]??={initial:0,produced:0,consumed:0};w.ledger[item].initial+=n;}
 ensureCaveCargo(w);event(w,'new-world',['leader','amu','child'],{text:'破廳仍可棲身。先取木石修宿舍，留下小禾的床。'});
 hero.reason='依你的配點與性向，先安置家人';return w;
}
export function reserve(w,activity,key,n=1,limit=1){if(key.startsWith('dest:')){const [,id,item]=key.split(':');limit=Math.min(limit,(w.inventories[id]?.capacity||0)-qty(w,id,item));}if(key.startsWith('station:')){const q=w.queues[key]??=[];if(!q.some(r=>r.activity===activity.id))q.push({activity:activity.id,actor:activity.actor,tick:w.tick});q.sort((a,b)=>a.tick-b.tick||a.actor.localeCompare(b.actor));const owns=Object.values(w.reservations).some(r=>r.activity===activity.id&&r.key===key);if(!owns&&q[0]?.activity!==activity.id)return false;}const others=Object.values(w.reservations).filter(r=>r.key===key&&r.activity!==activity.id).reduce((a,r)=>a+r.n,0);if(others+n>limit)return false;w.reservations[activity.id+'|'+key]={activity:activity.id,actor:activity.actor,key,n,tick:w.tick};return true;}
// Acquire a whole shared session or retain only its FIFO requests, never partial locks.
export function reserveBundle(w,a,requests){const before=new Set(Object.keys(w.reservations));let ok=true;for(const [key,n=1,limit=1]of requests)if(!reserve(w,a,key,n,limit))ok=false;if(!ok)for(const [id,r]of Object.entries(w.reservations))if(r.activity===a.id&&!before.has(id))delete w.reservations[id];return ok;}
export function release(w,id){for(const [key,q]of Object.entries(w.queues))w.queues[key]=q.filter(r=>r.activity!==id);for(const key of Object.keys(w.reservations))if(w.reservations[key].activity===id)delete w.reservations[key];}
export function assignBeds(w){const available=bedSlots(w),used=new Set();for(const p of sorted(w.people).filter(p=>p.residence==='resident')){
 if(p.bed&&available.includes(p.bed)&&!used.has(p.bed)){used.add(p.bed);continue;}p.bed=null;
 }for(const p of sorted(w.people).filter(p=>p.residence==='resident'&&!p.bed)){p.bed=available.find(b=>!used.has(b))||null;if(p.bed)used.add(p.bed);}}
export function invariants(w){const errors=[],ids=new Set(),beds=new Set(),identities=new Set();if(w.people.child?.adult!==false||w.people.child?.kind!=='human'||w.people.leader?.rank!=='leader'||w.people.leader?.adult!==true)errors.push('fixed identity boundary');for(const p of sorted(w.people)){
 if(ids.has(p.id))errors.push('duplicate '+p.id);ids.add(p.id);if(p.canonicalIdentity){if(identities.has(p.canonicalIdentity))errors.push('duplicate identity');identities.add(p.canonicalIdentity);}
 if(!Number.isSafeInteger(p.x)||!Number.isSafeInteger(p.y))errors.push('position '+p.id);
 if(p.residence!=='departed'&&!walkable(w,...position(p)))errors.push('geometry '+p.id+' '+position(p));
 if(p.bed){if(!bedSlots(w).includes(p.bed))errors.push('invalid bed '+p.id);if(beds.has(p.bed))errors.push('double bed');beds.add(p.bed);}
 if(p.action&&!p.adult)errors.push('minor action');
 if(p.activity&&!w.activities[p.activity])errors.push('activity '+p.id);
 if(p.energy<0||p.energy>10000||p.hp<0||p.hp>p.maxHp)errors.push('vitals '+p.id);
 }
 for(const inv of sorted(w.inventories))for(const [item,n]of Object.entries(inv.items))if(!Number.isSafeInteger(n)||n<0||item!=='money'&&n>inv.capacity)errors.push('inventory '+inv.id+' '+item);
 for(const p of sorted(w.people))if(bagWeight(w,p)>4)errors.push('carry capacity '+p.id);
 const sourceKeys=new Set(Object.values(w.reservations).map(r=>r.key).filter(k=>k.startsWith('source:')));for(const key of sourceKeys){const [,id,item]=key.split(':');const n=Object.values(w.reservations).filter(r=>r.key===key).reduce((n,r)=>n+r.n,0);if(!w.inventories[id]||n>qty(w,id,item))errors.push('source reservations '+key);}
 const destKeys=new Set(Object.values(w.reservations).map(r=>r.key).filter(k=>k.startsWith('dest:')));for(const key of destKeys){const [,id,item]=key.split(':');const n=Object.values(w.reservations).filter(r=>r.key===key).reduce((n,r)=>n+r.n,0);if(!w.inventories[id]||n+qty(w,id,item)>w.inventories[id].capacity)errors.push('destination reservations '+key);}
 for(const [item,l]of Object.entries(w.ledger))if(l.initial+l.produced-l.consumed!==itemTotal(w,item))errors.push('ledger '+item);
 if(sorted(w.people).filter(p=>p.residence==='resident').length>8)errors.push('resident cap');
 if(sorted(w.people).filter(p=>p.residence==='visitor').length>2)errors.push('visitor cap');
 for(const r of Object.values(w.reservations))if(!w.activities[r.activity])errors.push('orphan token');
 const exclusive={};for(const r of Object.values(w.reservations))if(r.key.startsWith('station:')||r.key.startsWith('participant:')||r.key.startsWith('plot:'))exclusive[r.key]=(exclusive[r.key]||0)+r.n;for(const [key,n]of Object.entries(exclusive))if(n>1)errors.push('exclusive token '+key);
 if(w.bridge.holder&&!w.people[w.bridge.holder])errors.push('bridge owner');
 for(const p of sorted(w.people))if(p.residence!=='departed'&&!p.inactive&&inRectBridge(p)&&w.bridge.holder!==p.id)errors.push('bridge capacity '+p.id);
 for(const [id,a]of Object.entries(w.activities))if(a.id!==id||!w.people[a.actor]||w.people[a.actor].activity!==id)errors.push('orphan activity '+id);
 return errors;
}

function inRectBridge(p){return p.x/256>=1870&&p.x/256<=1940&&p.y/256>=425&&p.y/256<=455;}

// Four finite food units retain origin and first home delivery without duplicating inventory.
export function ensureCaveCargo(w){
 if(w.caveCargo)return w.caveCargo;w.caveCargo=[];let index=1;
 const put=(owner,n,origin=null,deliveredAt=null)=>{for(let i=0;i<n&&index<=4;i++)w.caveCargo.push({id:'cave.ration.'+index++,owner,origin,deliveredAt,consumedAt:null});};
 put('cave.food',qty(w,'cave.food','ration'));
 for(const p of sorted(w.people))put(p.bag,Math.min(p.caveFood||0,qty(w,p.bag,'ration')),w.expedition?.id||null);
 const previous=w.promises?.cave?.foodDelivered||0,stored=Math.min(previous,qty(w,'store','ration'),5-index);put('store',stored,w.expedition?.id||null,w.tick);
 while(index<=4)w.caveCargo.push({id:'cave.ration.'+index++,owner:null,origin:w.expedition?.id||null,deliveredAt:previous?w.tick:null,consumedAt:w.tick||1});
 return w.caveCargo;
}
export function caveFoodCarried(w,person,origin=null){return ensureCaveCargo(w).filter(t=>t.owner===person.bag&&!t.consumedAt&&(!origin||t.origin===origin)).length;}
export function caveFoodDelivered(w,origin){return ensureCaveCargo(w).filter(t=>t.origin===origin&&t.deliveredAt!==null).length;}
