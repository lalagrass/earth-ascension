// 單招診斷：20 次獨立、充分休息的新野狗來招；不是20場戰鬥生存率。
import { createState, rand } from '../src/sim.mjs';
import { clashOdds, clashTimes, resolveSwing } from '../src/arts.mjs';
const argv=process.argv.slice(2), i=argv.indexOf('--seed');
const seed=Number(i>=0?argv[i+1]:argv.find(x=>x.startsWith('--seed='))?.split('=')[1]||17);
if (!Number.isSafeInteger(seed)) throw new Error('--seed 必須為整數');
const s=createState(seed,{kind:'bare',askMajor:false}), d=s.ds[0]; s.captureEvents=true;
const fresh=(i)=>({k:'dog',uid:`dog-${i}`,pos:[800,400],hp:14});
const snapshot=()=>{ const dog=fresh('panel'),ctx={move:'dogBite',wind:.4};return {reaction:clashTimes(s,dog,d,ctx).reaction,stand:1-clashOdds(s,dog,d,ctx).hit}; };
const out={seed,before:snapshot(),after4:null,after20:null};
for(let i=0;i<20;i++) {
  // 清除上一場的應接與惱羞，隔離眼熟；不灌n/f、身體、武學或成長值。
  d.busyUntil=0;d.fret=0;d.raging=false;d.rageUntil=0;d.posture=100;
  resolveSwing(s,fresh(i),d,()=>rand(s),{move:'dogBite',wind:.4});
  d.busyUntil=0;d.fret=0;d.raging=false;d.rageUntil=0;
  if(i===3)out.after4=snapshot();
}
out.after20=snapshot();out.events=s.events;out.pass=out.before.stand>=.1&&out.before.stand<=.3&&out.after20.stand>.5;
console.log(JSON.stringify(out,null,2)); if(!out.pass)process.exitCode=1;
