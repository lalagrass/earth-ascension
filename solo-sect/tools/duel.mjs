import {distance,moveToward,movementSpeed} from '../src/tactics.mjs';
// 實際共用選招/接招的受控單挑，不是完整野外存活率。
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createState,rand,clone,facStage} from '../src/sim.mjs';
import {chooseCombatMove,resolveSwing,postureRegen,postureMax,fretStep,CLASH,windOf} from '../src/arts.mjs';
import {DAY} from '../src/data.mjs';
import {CORE} from '../src/core.mjs';
import {BODY_TIMING} from '../src/starter-combat.mjs';
import {growthSnapshots} from './growth-scenario.mjs';
const argv=process.argv.slice(2),get=(k,f)=>{const i=argv.indexOf('--'+k);return i>=0?argv[i+1]:argv.find(x=>x.startsWith('--'+k+'='))?.split('=')[1]??f;};
const seed=Number(get('seed',1)),range=get('seeds',String(seed)).split('-').map(Number),seeds=range.length===2?Array.from({length:range[1]-range[0]+1},(_,i)=>range[0]+i):[range[0]],aName=get('a','day1'),bName=get('b','day1');
if(!seeds.length||!seeds.every(Number.isSafeInteger)||![aName,bName].every(n=>['day1','day60'].includes(n)))throw Error('需合法seed/seeds與day1/day60');
const trainingSeed=Number(get('training-seed',seed));
const novice=createState(trainingSeed,{kind:'bare',askMajor:false}).ds[0];
// --seeds改交手亂數；同一命令共用一段真60日訓練史。--seed也改變訓練史，不載作者機器檔案。
const master=[aName,bName].includes('day60')?growthSnapshots(trainingSeed,[60]).snapshots[0].hero:null;
function run(seed,a0,b0){
  const s=createState(seed,{kind:'bare',askMajor:false});s.ds=[clone(a0),clone(b0)];s.fx=[];
  for(const[d,i]of s.ds.map((d,i)=>[d,i])){d.id=i?'B':'A';d.uid=d.id;d.faction=d.id;d.pos=[100+i*20,100];d.hp=100;d.needs.energy=CORE.wakeAt;d.posture=postureMax(d);d.busyUntil=0;d.fret=0;d.raging=false;d.rageUntil=0;d.swing=null;d.bswing=null;d.next=0;d.downUntil=0;d.faintUntil=0;d.balanceOpenUntil=0;d.wounds=[];d.part=null;d.pain=0;d.painAt=-1e9;d.task=null;d.away=false;}
  const rows=[],injuries={A:0,B:0},breaths={A:0,B:0},minimal={A:0,B:0},incoming={A:0,B:0},counters={A:0,B:0};let untouched=0;
  for(;s.t<DAY&&s.ds.every(d=>d.hp>25);s.t+=.25){for(const d of s.ds){postureRegen(s,d,.25);fretStep(s,d);const other=s.ds.find(o=>o!==d);
    if(d.resting){d.needs.energy=Math.min(CORE.wakeAt,d.needs.energy+(facStage(s,'hall').restRate||1)*.25);if(d.needs.energy>=CORE.wakeAt)d.resting=false;continue;}
    if(d.downUntil>s.t)continue;
    if(d.swing&&s.t+1e-9>=d.swing.at){const w=d.swing;d.swing=null;if(distance(d.pos,other.pos)>w.mv.range*1.3)continue;const result=resolveSwing(s,d,other,()=>rand(s),{move:w.mv.id,wind:w.wind});let injured=false;
      // #475：瘀青仍是接觸中招，N34「受傷」只計皮破及更深層。
      if(result.kind==='hit'){const dmg=w.mv.dmg*(1+(d.skills[w.mv.skill]||0)/50)*(result.heavy?CLASH.heavy:1);other.hp-=dmg*result.contact.damageFactor;if(result.contact.depth>=1){injuries[other.id]++;injured=true;}}
      if(result.counter){d.hp-=result.counterDamage;counters[other.id]++;if(result.counterContact.depth>=1){injuries[d.id]++;injured=true;}}
      if(!injured)untouched++;incoming[other.id]++;if(result.kind==='dodge'&&(result.timing?.step??Infinity)<=BODY_TIMING.simple/2)minimal[other.id]++;
      const t=result.timing,m=result.kind==='read'?t?.strike:result.kind==='dodge'?(t?.step+(result.counter?t?.strike:0)):result.kind==='parry'?t?.guard:0;
      rows.push({t:s.t,attacker:d.id,defender:other.id,move:w.mv.id,decision:w.decision,kind:result.kind,T:t?.T??null,r:t?.r??null,m:m??null,movement:t?.step??null,L:t?.L??null,margin:t?t.T-t.r-m:null,counter:!!result.counter,forced:!t,injured});
    }
    if(d.swing||s.t<d.next||(d.busyUntil||0)>s.t)continue;
    if(d.needs.energy<=CORE.sleepAt){d.resting=true;breaths[d.id]++;continue;}
    const pick=chooseCombatMove(s,d,other,()=>rand(s));if(!pick)continue;const mv=pick.move;if(distance(d.pos,other.pos)>mv.range){moveToward(d,other.pos,movementSpeed(d),.25);continue;}const wind=windOf(d,mv.id,mv.cd)+pick.seconds;
    d.swing={mv,wind,decision:pick.seconds,at:s.t+wind};d.next=s.t+mv.cd+pick.seconds;d.needs.energy--;
  }}
  return {seed,exchanges:rows.length,injuries,breaths,uninjured:untouched/Math.max(1,rows.length),minimal,incoming,counters,rows};
}
const results=seeds.map(n=>run(n,aName==='day60'?master:novice,bName==='day60'?master:novice)),baseline=aName==='day60'?seeds.map(n=>run(n,novice,novice)):results;
const med=v=>[...v].sort((a,b)=>a-b)[Math.floor(v.length/2)],sum=(arr,f)=>arr.reduce((a,r)=>a+f(r),0),ratio=(arr,k)=>sum(arr,r=>r.minimal[k])/Math.max(1,sum(arr,r=>r.incoming[k]));
const summary={a:aName,b:bName,trainingSeed,combatSeeds:seeds,medianExchanges:med(results.map(r=>r.exchanges)),uninjured:sum(results,r=>r.uninjured*r.exchanges)/Math.max(1,sum(results,r=>r.exchanges)),meanBreaths:sum(results,r=>r.breaths.A+r.breaths.B)/results.length,minimalA:ratio(results,'A'),baselineMinimalA:ratio(baseline,'A'),sameBeatCountersA:sum(results,r=>r.counters.A)};
// #444 2026-11-07：原七成／三倍／五次是 C 平衡報告；只有真正的秒數規則和反向成長擋驗收。
summary.balanceTargets=aName==='day60'?{minimalThreefold:summary.minimalA>0&&summary.minimalA>=3*summary.baselineMinimalA,countersAtLeastFive:summary.sameBeatCountersA>=5}:{exchangesAtLeastThirty:summary.medianExchanges>=30,uninjuredAtLeastSeventyPercent:summary.uninjured>=.7};
summary.timingPass=results.every(result=>result.rows.every(row=>row.forced||row.kind==='hit'||row.margin>=-1e-9));
summary.directionPass=aName!=='day60'||summary.minimalA>=summary.baselineMinimalA;
summary.pass=summary.timingPass&&summary.directionPass;
for(const r of results)console.log(JSON.stringify({seed:r.seed,exchanges:r.exchanges,injuries:r.injuries,breaths:r.breaths,uninjured:r.uninjured}));console.log(JSON.stringify(summary));
const log=get('log',null);if(log){await mkdir(path.dirname(path.resolve(log)),{recursive:true});await writeFile(log,JSON.stringify({summary,results},null,2));}if(!summary.pass)process.exitCode=1;
