// N38 真自然bot（非N55受控工作輪替），所有人格走公開createState規格；不灌n/f。
import {createState,tick} from '../src/sim.mjs';
import {DAY} from '../src/data.mjs';
import {bodyAssessment,favoriteMove} from '../src/body-level.mjs';
import {botDaily,ALL_ON} from '../test/harness/bot.mjs';
const argv=process.argv.slice(2),get=(k,def)=>{const i=argv.indexOf('--'+k);return i>=0?argv[i+1]:argv.find(a=>a.startsWith('--'+k+'='))?.split('=')[1]??def;};
const seed=Number(get('seed',17)),days=Number(get('days',30)),types=get('types','ISTJ,INTP,ESTP').split(',');
if(!Number.isSafeInteger(seed)||!Number.isInteger(days)||days<1)throw Error('--seed需整數，--days正整數');
const runs=[];
for(const mbti of types){
 const s=createState(seed,{kind:'bare',mbti,askMajor:false,...ALL_ON});s.captureEvents=true;
 const formalAcquisitions=[],knownArts=new Set(),seen=new WeakSet(),participation=new Map(),humanIds=new Set(s.ds.map(d=>d.id));let firstSoloBoarEscapeDay=null;
 const hero=()=>s.ds.find(d=>d.id==='hero'),levels=[],reached={},pursuit={running:{attempts:0,hits:0},holding:{attempts:0,hits:0}};
 const collect=()=>{for(const id of Object.keys(hero().arts||{}))if(!knownArts.has(id)){knownArts.add(id);formalAcquisitions.push({id,day:s.day,t:s.t,context:s.log.slice(0,8)});}for(const d of s.ds)humanIds.add(d.id);for(const e of s.events||[]){if(seen.has(e))continue;seen.add(e);
  if(e.type==='exchange'){for(const [human,enemy]of [[e.attacker,e.defender],[e.defender,e.attacker]])if(humanIds.has(human)&&!humanIds.has(enemy)){const p=participation.get(enemy)||new Set();p.add(human);participation.set(enemy,p);}
   if(e.move==='dogBite'&&e.defender==='hero'){const row=hero().tactics?.action==='flee'?pursuit.running:pursuit.holding;row.attempts++;row.hits+=Number(e.kind==='hit');}}
  if(e.type==='escape'){const p=participation.get(e.who);if(e.kind==='boar'&&p?.size===1&&p.has('hero'))firstSoloBoarEscapeDay??=e.day;participation.delete(e.who);}
 }};
 const observe=day=>{const assessment=bodyAssessment(s,hero());levels.push({day,...assessment});for(const row of assessment.rows)if(row.probability>.5)reached[row.level]??=day;};
 let lastDay=s.day;observe(0);
 for(let i=0;i<days*DAY/.25;i++){tick(s,.25);collect();if(s.alert)s.alert=null;if(s.day!==lastDay){lastDay=s.day;observe(s.day-1);botDaily(s);}}
 const h=hero();runs.push({mbti,personality:h.personality,reached,levels,formalAcquisitions,firstDiscoveryDay:h.glimmer?.firstDay??null,firstSoloBoarEscapeDay,favorite:favoriteMove(h),pursuit,guidance:s.ds.filter(d=>d.guidanceMentor).map(d=>({id:d.id,mentor:d.guidanceMentor,totalReceived:d.guidanceTotal||0})),famous:s.ds.filter(d=>d.xia).length});
 console.error(`seed ${seed} ${mbti}: ${days}日完成`);
}
const specialties=new Set(runs.map(r=>r.favorite.move).filter(Boolean));
const summary={seed,days,dt:.25,scenario:'自然bot，無指派輪替/補血/補資源/灌n/f；只換日botDaily，真主模擬',runs,specialtyKinds:specialties.size,
 // #441: arrival dates and the number of favourite moves are C design observations.
 // Keep every value visible, but only gate the A rule that a displayed rank follows
 // the current probability projection instead of a second XP or stored rank.
 balanceTargets:{dog3to5:runs.every(r=>r.reached[1]>=3&&r.reached[1]<=5),dodge10to15:runs.every(r=>r.reached[2]>=10&&r.reached[2]<=15),soloBoar10to15:runs.every(r=>r.firstSoloBoarEscapeDay>=10&&r.firstSoloBoarEscapeDay<=15),farmer20to30:runs.every(r=>r.reached[4]>=20&&r.reached[4]<=30),specialtiesAtLeast2:specialties.size>=2},
 rulePass:runs.every(r=>r.levels.every(a=>a.level===a.rows.reduce((level,row)=>row.probability>.5?row.level:level,0)))};
console.log(JSON.stringify(summary,null,2));

if(argv.includes('--check')&&!summary.rulePass)process.exitCode=1;
