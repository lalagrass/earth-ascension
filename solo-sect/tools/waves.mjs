// N36 受控交戰：真60日公開指派史、共用選招/接法/士氣/移動。不是自然放生存活率。
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createState,clone,rand} from '../src/sim.mjs';
import {assessLoad,combatTacticStep,chooseCombatMove,interceptOpening,resolveSwing,postureRegen,fretStep,windOf,CLASH} from '../src/arts.mjs';
import {movementSpeed,moveToward,COVERS,ringCapacity,distance,pursueFleeing,rememberEscape,restoreSurvivor} from '../src/tactics.mjs';
import {foeAction,commitCombatEffort} from '../src/starter-combat.mjs';
import {practiceWindow} from '../src/practice.mjs';
import {growthSnapshots} from './growth-scenario.mjs';
import {combatSnapshots} from './combat-history.mjs';
const argv=process.argv.slice(2),get=(key,fallback)=>{const i=argv.indexOf('--'+key);return i<0?argv.find(x=>x.startsWith('--'+key+'='))?.split('=')[1]??fallback:argv[i+1];};
const seed=Number(get('seed',1)),traits=get('trait','normal').split(',');
const traitMap={calm:['honest'],rash:['brave'],normal:[]};
if(!Number.isSafeInteger(seed)||!traits.every(t=>traitMap[t]))throw Error('--seed需整數；--trait可calm,rash,normal');
// Diagnostic cache is an unmodified public-schedule snapshot, not a fixture or a new growth source.
const snapshotIn=get('snapshot-in',null),snapshotOut=get('snapshot-out',null),history=get('history','labor');
if(!['labor','defend','trained-defend','prepared-defend'].includes(history))throw Error('--history需labor/defend/trained-defend/prepared-defend');
const cached=snapshotIn?JSON.parse(await readFile(snapshotIn,'utf8')):null;
if(cached&&(cached.seed!==seed||cached.snapshot?.day!==60||!cached.snapshot?.eventHash||cached.snapshot?.hero?.id!=='hero'))throw Error('snapshot需同seed的公開日程第60日原始輸出');
const generated=cached?null:history==='labor'?growthSnapshots(seed,[60]):combatSnapshots(seed,[60],{strategy:history});
const snapshot=cached?cached.snapshot:generated.snapshots[0],training=cached?.scenario||generated.scenario;
if(snapshotOut){await mkdir(path.dirname(path.resolve(snapshotOut)),{recursive:true});await writeFile(snapshotOut,JSON.stringify({seed,scenario:training,creationOptions:cached?.creationOptions||generated?.creationOptions||null,snapshot},null,2));}
function run(count,trait){
 const s=createState(seed,{kind:'bare',askMajor:false}),hero=clone(snapshot.hero);s.ds=[hero];s.mons=[];s.band=null;s.t=0;s.day=60;s.fx=[];
 hero.id='hero';hero.uid='hero';hero.personality=traitMap[trait];hero.hp=100;hero.max=100;hero.needs.energy=100;hero.posture=100;hero.busyUntil=0;hero.rageUntil=0;hero.raging=false;hero.fret=0;hero.swing=null;hero.bswing=null;hero.path=[];hero.gone=false;hero.downUntil=0;hero.faintUntil=0;hero.balanceOpenUntil=0;hero.wounds=[];hero.part=null;hero.pain=0;hero.painAt=-1e9;
 // 1/2路在真山門的兩席，4路在空地；不是替四路刪掉已發出的攻擊。
 hero.pos=count<3?[...COVERS.find(c=>c.id==='gate').stand]:[800,400];
 for(let i=0;i<count;i++)s.mons.push({k:'bandit',uid:`foe${i}`,hp:40,max:40,pos:[hero.pos[0]+20+i,hero.pos[1]],agi:20,weapon:'blade',energy:100,next:0,intentTarget:hero.id});
 const initialActorFingerprint=createHash('sha256').update(JSON.stringify({...hero,personality:undefined})).digest('hex');
 const rows=[],stats={count,trait,initialActorFingerprint,location:count<3?'gate(two slots)':'open',attacks:0,rushAttacks:0,hits:0,hpLost:0,counters:0,overloadBeats:0,overloadCounters:0};
 const actors=[hero,...s.mons];
 const capture=(t,a,w)=>({attack:{...w},actors:actors.map(u=>({who:u.uid||u.id,busyUntil:u.busyUntil||0,next:u.next||0,cool:u.cool||u.bcool||0,swing:u.swing?{...u.swing}:null,intentTarget:u.intentTarget||null})),busyUntil:t.busyUntil||0,swing:t.swing?{...t.swing}:null,downUntil:t.downUntil||0,posture:t.posture,fret:t.fret,rageUntil:t.rageUntil||0,part:t.part,eyes:{...t.practice?.eyes},forecast:assessLoad(s,t,a,{move:w.id,wind:w.wind})});
 const finish=(a,t,w,r,before,phase)=>{
   if(r.kind==='hit'){const dmg=a===hero?w.dmg*(1+(a.skills?.[w.skill]||0)/50):6;t.hp-=dmg*r.contact.damageFactor;if(t===hero){stats.hits++;stats.hpLost+=dmg*r.contact.damageFactor;}}
   if(r.counter){a.hp-=r.counterDamage;if(t===hero)stats.counters++;}
   const load=r.timing?.L??before.forecast.L;
   rows.push({t:s.t,who:t.uid||t.id,L:load,reaction:r.kind,counter:!!r.counter,type:'defense',phase,T:r.timing?.T??null,r:r.timing?.r??null,timing:r.timing??null,before,after:{busyUntil:t.busyUntil||0,posture:t.posture,fret:t.fret},attacker:a.uid||a.id,move:w.id});
   if(load>=1&&r.counter)stats.overloadCounters++;
 };
 for(;s.t<40&&hero.hp>25&&!hero.gone&&s.mons.some(m=>m.hp>0&&!m.gone);s.t+=.25){for(const a of actors){
   if(a.hp<=0||a.gone)continue;postureRegen(s,a,.25);fretStep(s,a);
   const candidates=a===hero?s.mons.filter(m=>m.hp>0&&!m.gone):[hero],target=candidates.sort((a,b)=>distance(a.pos,hero.pos)-distance(b.pos,hero.pos))[0];if(!target)continue;
   const L=assessLoad(s,a).L;let reaction='idle',counter=false;
   if(a.swing&&s.t+1e-9>=a.swing.at){const w=a.swing;a.swing=null;const t=actors.find(x=>(x.uid||x.id)===w.tgt);
     if(t?.hp>0&&distance(a.pos,t.pos)<=w.range*1.3){const before=capture(t,a,w);const r=resolveSwing(s,a,t,()=>rand(s),{move:w.id,wind:w.wind,opening:w.opening});reaction=r.kind;counter=!!r.counter;finish(a,t,w,r,before,'impact');
     }
   }
   if(!a.swing){const moved=combatTacticStep(s,a,.25,{exit:unit=>{rememberEscape(s,unit);unit.gone=true;}});reaction=moved?a.tactics.action:reaction;
     if(!moved&&(a.busyUntil||0)<=s.t&&!(a.downUntil>s.t)&&s.t>=(a.next||0)){
       if(a!==hero){const index=s.mons.filter(m=>m.hp>0&&!m.gone).indexOf(a);if(index>=ringCapacity(hero)){moveToward(a,[hero.pos[0]+50+index*4,hero.pos[1]],movementSpeed(a),.25);reaction='outer';rows.push({t:s.t,who:a.uid,L,reaction,counter:false,type:'beat'});continue;}}
       const pick=chooseCombatMove(s,a,target,()=>rand(s),{distance:distance(a.pos,target.pos)});
       if(pick){const m=pick.move;if(distance(a.pos,target.pos)>m.range){moveToward(a,target.pos,movementSpeed(a),.25);reaction='approach';}
         else{const wind=(windOf(a,m.id,m.cd))+pick.seconds;
           const w={mv:m.id,id:m.id,wind,range:m.range,dmg:m.dmg,skill:m.skill,tgt:target.uid||target.id,at:s.t+wind};const before=capture(target,a,w),start=interceptOpening(s,a,target,()=>rand(s),{move:m.id,wind});if(start.read)finish(a,target,w,start.read,before,'opening');else a.swing={...w,opening:start.opening};a.next=s.t+m.cd+pick.seconds;
           if(a===hero){stats.attacks++;if(a.raging)stats.rushAttacks++;commitCombatEffort(a);}else commitCombatEffort(a);reaction='wind';}
       }
     }
   }
   rows.push({t:s.t,who:a.uid||a.id,L,reaction,counter:false,type:'beat',tactic:a.tactics?.action||null});if(a===hero&&L>=1)stats.overloadBeats++;
 }}
 stats.hpLost=100-hero.hp; // 真正終局HP差，包含被反擊，不只主動挨打列的加總。
 stats.seconds=s.t;stats.escaped=actors.filter(a=>a.gone).map(a=>a.uid||a.id);return {stats,rows};
}
// 同一人物用真來招累積眼熟後，量四狗空地／牆邊；治療重置只在probe入場，不灌手熟眼熟。
function coverProbe(){const s=createState(seed,{kind:'bare',askMajor:false}),d=s.ds[0];s.ds=[d];d.pos=[800,400];const dog={k:'dog',uid:'trainedDog',hp:14,max:14,pos:[820,400]};
 for(let i=0;i<20;i++){s.t=i*1.2;d.busyUntil=0;d.raging=false;d.rageUntil=0;d.fret=0;const r=resolveSwing(s,dog,d,()=>rand(s),{move:'dogBite',wind:.4});if(r.kind==='hit')d.hp-=3*(r.heavy?CLASH.heavy:1)*r.contact.damageFactor;postureRegen(s,d,1.2);}
 s.t=Math.max(s.t,d.balanceOpenUntil||0);postureRegen(s,d,0);
 d.busyUntil=0;d.swing=null;d.bswing=null;d.raging=false;d.rageUntil=0;d.fret=0;
 s.mons=Array.from({length:4},(_,i)=>({...clone(dog),uid:`dog${i}`,pos:[820+i,400],intentTarget:d.id}));const open=assessLoad(s,d).L;
 const c=COVERS.find(c=>c.id==='guardTree');d.pos=[...c.stand];s.mons.forEach((m,i)=>m.pos=[d.pos[0]+20+i,d.pos[1]]);const cover=assessLoad(s,d).L;
 rememberEscape(s,s.mons[0]);const returned=restoreSurvivor(s,'dog',{k:'dog',hp:14,max:14,uid:'fresh'});
 return {open,cover,eyes:d.practice.eyes['dog:dogBite'],receptionHp:d.hp,sameUid:returned.uid===s.mons[0].uid,sameHands:JSON.stringify(returned.practice)===JSON.stringify(s.mons[0].practice)};}
// 固定步長真速度追及：初始相距一個狗咬射程+一步，不跑不算「被追上」。不冒充被咬/命中率。
function pursuit(run){const d=clone(createState(seed,{kind:'bare',askMajor:false}).ds[0]);d.pos=[800,400];d.tactics={action:run?'flee':'hold'};const dog={k:'dog',pos:[750,400]};let pursuitHits=0;
 for(let t=0;t<8;t+=.25){if(run){moveToward(d,[1500,400],movementSpeed(d),.25);pursueFleeing(dog,d,.25);if(distance(d.pos,dog.pos)<=foeAction(dog).range)pursuitHits++;}}
 return {running:run,followed:run,pursuitContactBeats:pursuitHits};}
const runs=traits.flatMap(t=>[1,2,4].map(n=>run(n,t))),cover=coverProbe(),summary={seed,trainingCreationOptions:cached?.creationOptions||generated?.creationOptions||null,pairedComparison:'同一snapshot/裝備/ARTS/n/f；只改personality資料（同時影響選招與定力），不是只改定力；相同路數initialActorFingerprint須一致',training:training+'；probe沿既有統一入場HP/精力/暫態，成長n/f不改',trainingEventHash:snapshot.eventHash,runs:runs.map(r=>r.stats),cover,pursuit:[pursuit(false),pursuit(true)]};
summary.pass=runs.every(r=>r.stats.overloadCounters===0)&&runs.some(r=>r.stats.overloadBeats>0)&&traits.every(t=>[1,2].every(n=>runs.some(r=>r.stats.trait===t&&r.stats.count===n&&r.stats.counters>0)))&&cover.open>=1&&cover.cover<1&&cover.sameUid&&cover.sameHands;
if(traits.includes('calm')&&traits.includes('rash')){const sum=(trait,k)=>runs.filter(r=>r.stats.trait===trait).reduce((n,r)=>n+r.stats[k],0);summary.personality={calmAttacks:sum('calm','attacks'),rashAttacks:sum('rash','attacks'),calmRush:sum('calm','rushAttacks'),rashRush:sum('rash','rushAttacks'),calmHpLost:sum('calm','hpLost'),rashHpLost:sum('rash','hpLost')};summary.personality.pass=summary.personality.rashRush>summary.personality.calmRush&&summary.personality.rashHpLost>summary.personality.calmHpLost;summary.pass&&=summary.personality.pass;}
console.log(JSON.stringify(summary,null,2));const log=get('log',null);if(log){await mkdir(path.dirname(path.resolve(log)),{recursive:true});await writeFile(log,JSON.stringify({summary,runs},null,2));}if(!summary.pass)process.exitCode=1;
