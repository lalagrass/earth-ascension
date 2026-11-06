// 公開玩家迎戰史：只呼叫主遊戲createState/tick/換日建舍招募/真pending迎戰。
// 不創造敵人、不改角色n/f/HP/資源；和N55純勞動日程是不同的驗收前提。
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createState,tick,clone,resolveRaid,startBuild,canRecruit,recruit,setOrder} from '../src/sim.mjs';
import {DAY} from '../src/data.mjs';
import {ALL_ON} from '../test/harness/bot.mjs';
export function combatSnapshots(seed,days=[60],{mbti='ISTJ',onEvent=null,strategy='defend'}={}){
 if(!['passive','defend','trained-defend'].includes(strategy))throw Error('strategy需passive/defend/trained-defend');
 const s=createState(seed,{kind:'bare',mbti,askMajor:false,...ALL_ON});s.captureEvents=true;
 const seen=new WeakSet(),digest=createHash('sha256'),snapshots=[],orders=[],counts={},exposure={};let count=0,lastDay=s.day,order=null,lastBuildDay=0;
 const collect=()=>{for(const e of s.events||[]){if(seen.has(e))continue;seen.add(e);digest.update(JSON.stringify(e)+'\n');count++;counts[e.type]=(counts[e.type]||0)+1;onEvent?.(e);
  if(e.type==='exchange'&&e.defender==='hero'){const x=exposure[e.move]??={attempts:0,hits:0,w:0};x.attempts++;x.hits+=Number(e.kind==='hit');x.w+=e.w;}}};
 const daily=()=>{const built=startBuild(s,'dorm');orders.push({t:s.t,day:s.day,op:'startBuild',arg:'dorm',result:built});const c=canRecruit(s);if(c.ok){const r=recruit(s);orders.push({t:s.t,day:s.day,op:'recruit',candidate:c.next?.id,result:r});}else orders.push({t:s.t,day:s.day,op:'canRecruit',result:c});};
 const clock=30,dt=.25,end=(Math.max(...days)-1)*DAY+clock;
 while(s.t<=end){
  if(strategy!=='passive'&&s.threat?.pending&&!s.band){const pending=clone(s.threat.pending),result=resolveRaid(s,1);orders.push({t:s.t,day:s.day,op:'resolveRaid',arg:1,pending,result});}
  if(strategy==='trained-defend'){
   if(!s.fac.well?.stage&&s.res.stone>=6&&lastBuildDay!==s.day){const result=startBuild(s,'well');orders.push({t:s.t,day:s.day,op:'startBuild',arg:'well',result});lastBuildDay=s.day;}
   const act=s.band?'defend':!s.fac.well?.stage?'quarry':['train','chop','water'][Math.floor((s.t%DAY)/(DAY/3))];
   if(act!==order){const result=setOrder(s,'hero',act);orders.push({t:s.t,day:s.day,op:'setOrder',id:'hero',arg:act,result});order=act;}
  }
  collect();
  if(days.includes(s.day)&&s.t===(s.day-1)*DAY+clock){const hero=s.ds.find(d=>d.id==='hero');if(!hero)throw Error('主角不在，不能產生合法主角snapshot');snapshots.push({day:s.day,t:s.t,hero:clone(hero),events:count,eventHash:digest.copy().digest('hex'),exposure:clone(exposure),counts:clone(counts)});}
  if(s.t>=end)break;tick(s,dt);if(s.alert)s.alert=null;
  if(s.day!==lastDay){lastDay=s.day;collect();daily();}
 }
 return {seed,mbti,strategy,clock,dt,scenario:'公開玩家史：換日建舍/可招才招'+(strategy!=='passive'?'；真pending立即迎戰1':'；來犯由原執事自決')+(strategy==='trained-defend'?'；採石建井→每200秒練拳/砍柴/挑水，真來犯改派守柵，結束才復工（受控公開日程，非自然放養）':'')+'；無補血/資源/n/f/新敵人',orders,snapshots};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const a=process.argv.slice(2),get=(k,d)=>{const i=a.indexOf('--'+k);return i>=0?a[i+1]:a.find(x=>x.startsWith('--'+k+'='))?.split('=')[1]??d;};
 const seed=Number(get('seed',17)),days=get('days','60').split(',').map(Number);if(!Number.isSafeInteger(seed)||!days.every(d=>Number.isInteger(d)&&d>0))throw Error('seed需整數/days需正整數');
 const raw=[],events=get('events',null),history=combatSnapshots(seed,days,{mbti:get('mbti','ISTJ'),strategy:get('strategy','defend'),onEvent:events?e=>raw.push(JSON.stringify(e)):null});
 const out=get('snapshot-out',null);for(const [file,data]of [[out,out?JSON.stringify({seed,scenario:history.scenario,snapshot:history.snapshots.at(-1)},null,2):null],[events,events?raw.join('\n')+'\n':null]])if(file){await mkdir(path.dirname(path.resolve(file)),{recursive:true});await writeFile(file,data);}
 console.log(JSON.stringify(history,null,2));
}
