import {Q,DAY,VERSION,TEMPLATES,STORY_IDS,FACILITIES,LEGENDS} from './data.mjs';
import {stations,bedSlots,position,walkable} from './map.mjs';
export const sorted=o=>Object.keys(o).sort().map(k=>o[k]);
export const uid=(w,prefix)=>prefix+'.'+w.nextId++;
export function event(w,type,actors=[],data={}){const e={id:uid(w,'event'),tick:w.tick,type,actors:[...actors],...data};w.journal.push(e);if(w.journal.length>500)w.journal.shift();w.facts[type]=(w.facts[type]||0)+1;return e;}
export function draw(w,stream='world'){let s=w.random[stream],x=s.value;x^=x<<13;x^=x>>>17;x^=x<<5;s.value=x>>>0;s.draws++;return s.value;}
export function inventory(w,id,items={},capacity=96){w.inventories[id]={id,items:{...items},capacity};return id;}
export const qty=(w,id,item)=>w.inventories[id]?.items[item]||0;
export function add(w,id,item,n,source){const inv=w.inventories[id];inv.items[item]=(inv.items[item]||0)+n;if(inv.items[item]<0)throw Error('negative '+id+' '+item);if(!inv.items[item])delete inv.items[item];if(source){w.ledger[item]??={initial:0,produced:0,consumed:0};w.ledger[item][n>0?'produced':'consumed']+=Math.abs(n);}}
export function transfer(w,from,to,item,n){if(n<=0||qty(w,from,item)<n)throw Error('invalid transfer');add(w,from,item,-n);add(w,to,item,n);event(w,'transfer',[],{from,to,item,n});}
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
  moving:false,waitSince:null,recovering:false,visits:0,...options};
 w.people[id]=p;inventory(w,p.bag,{},4);return p;
}
export function createWorld(config={}){
 const seed=Number(config.seed??11),template=config.template||'custom',t=TEMPLATES[template];
 if(!Number.isInteger(seed)||seed<1||seed>4294967295)throw Error('種子需為 1–4294967295 整數');
 if(!t)throw Error('未知模板');const stats=config.stats||t.stats;
 if(stats.length!==5||stats.some(v=>!Number.isInteger(v)||v<1||v>7)||stats.reduce((a,b)=>a+b,0)!==20)throw Error('五屬性每項1–7，合計20點');
 const w={...VERSION,seed,worldId:'gpt-'+seed,nextId:1,tick:0,commandSeq:0,commands:[],seenCommands:{},
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
 event(w,'new-world',['leader','amu','child'],{text:'破廳仍可棲身。先取木石修宿舍，留下小禾的床。'});
 hero.reason='依你的配點與性向，先安置家人';return w;
}
export function reserve(w,activity,key,n=1,limit=1){const others=Object.values(w.reservations).filter(r=>r.key===key&&r.activity!==activity.id).reduce((a,r)=>a+r.n,0);if(others+n>limit)return false;w.reservations[activity.id+'|'+key]={activity:activity.id,actor:activity.actor,key,n,tick:w.tick};return true;}
export function release(w,id){for(const key of Object.keys(w.reservations))if(w.reservations[key].activity===id)delete w.reservations[key];}
export function assignBeds(w){const available=bedSlots(w),used=new Set();for(const p of sorted(w.people).filter(p=>p.residence==='resident')){
 if(p.bed&&available.includes(p.bed)&&!used.has(p.bed)){used.add(p.bed);continue;}p.bed=null;
 }for(const p of sorted(w.people).filter(p=>p.residence==='resident'&&!p.bed)){p.bed=available.find(b=>!used.has(b))||null;if(p.bed)used.add(p.bed);}}
export function invariants(w){const errors=[],ids=new Set(),beds=new Set();for(const p of sorted(w.people)){
 if(ids.has(p.id))errors.push('duplicate '+p.id);ids.add(p.id);
 if(!Number.isSafeInteger(p.x)||!Number.isSafeInteger(p.y))errors.push('position '+p.id);
 if(p.residence!=='departed'&&!walkable(w,...position(p)))errors.push('geometry '+p.id+' '+position(p));
 if(p.bed){if(beds.has(p.bed))errors.push('double bed');beds.add(p.bed);}
 if(p.activity&&!w.activities[p.activity])errors.push('activity '+p.id);
 if(p.energy<0||p.energy>10000||p.hp<0||p.hp>p.maxHp)errors.push('vitals '+p.id);
 }
 for(const inv of sorted(w.inventories))for(const [item,n]of Object.entries(inv.items))if(!Number.isSafeInteger(n)||n<0)errors.push('inventory '+inv.id+' '+item);
 for(const [item,l]of Object.entries(w.ledger))if(l.initial+l.produced-l.consumed!==itemTotal(w,item))errors.push('ledger '+item);
 if(sorted(w.people).filter(p=>p.residence==='resident').length>8)errors.push('resident cap');
 if(sorted(w.people).filter(p=>p.residence==='visitor').length>2)errors.push('visitor cap');
 for(const r of Object.values(w.reservations))if(!w.activities[r.activity])errors.push('orphan token');
 return errors;
}
