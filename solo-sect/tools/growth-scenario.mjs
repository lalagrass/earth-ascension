// 共用可重播驗收日程；只經公開玩家指令安排，不灌經驗／資源／身體數字。
import {createHash} from 'node:crypto';
import {createState,tick,setOrder,startBuild,clone} from '../src/sim.mjs';
import {DAY} from '../src/data.mjs';
import {playbackParams} from '../src/growth-playback.mjs';
import {windOf} from '../src/arts.mjs';
export function options(argv=process.argv.slice(2)) {
  const get=(k,def)=>{const i=argv.indexOf('--'+k);return i>=0?argv[i+1]:argv.find(a=>a.startsWith('--'+k+'='))?.split('=')[1]??def;};
  const seed=Number(get('seed',17)), days=get('days','1,60').split(',').map(Number).sort((a,b)=>a-b);
  if(!Number.isSafeInteger(seed)||!days.every(d=>Number.isInteger(d)&&d>=1))throw Error('seed需整數，days需正整數列表');
  return {seed,days,get};
}
export function growthSnapshots(seed,days=[1,60]) {
  const s=createState(seed,{kind:'bare',askMajor:false,steward:true});s.captureEvents=true;
  const hero=()=>s.ds.find(d=>d.id==='hero'), seen=new WeakSet(), digest=createHash('sha256'), eventHands={}, snapshots=[];
  let order=null, lastBuildDay=0, count=0;
  const collect=()=>{for(const row of s.events||[])if(!seen.has(row)) {seen.add(row);if(row.who==='hero'||row.attacker==='hero'||row.defender==='hero') {
    digest.update(JSON.stringify(row)+'\n');count++;
    if(row.who==='hero'&&row.type==='work')eventHands[row.move]=row.n;
    if(row.who==='hero'&&row.type==='practice')eventHands[row.move]=row.n;
    if(row.attacker==='hero'&&row.type==='exchange')eventHands[row.move]=row.hand;
  }}};
  const last=Math.max(...days), dt=.25, clock=30;
  while(s.t <= (last-1)*DAY+clock) {
    // 先採石並用真資源蓋井；之後每200遊戲秒切換練拳／砍柴／挑水。
    if(!s.fac.well?.stage&&s.res.stone>=6&&lastBuildDay!==s.day) {startBuild(s,'well');lastBuildDay=s.day;}
    const act=!s.fac.well?.stage?'quarry':['train','chop','water'][Math.floor((s.t%DAY)/(DAY/3))];
    if(act!==order){setOrder(s,'hero',act);order=act;}
    // 建井也是玩家公開指令；不以傳送、補血、改n/f跳過路程或風險。
    collect();
    if(days.includes(s.day)&&Math.abs(s.t-((s.day-1)*DAY+clock))<1e-8) {
      const d=hero();if(!d)throw Error('主角已不在此局，不能宣稱day60驗收通過');
      const hands=d.practice?.hands||{};
      for(const [mv,n]of Object.entries(hands))if(Math.abs(n-(eventHands[mv]||0))>1e-7)throw Error('事件流與存檔手熟不符: '+mv);
      const p=playbackParams(d);snapshots.push({day:s.day,t:s.t,hero:clone(d),eventHands:{...eventHands},events:count,eventHash:digest.copy().digest('hex'),
        metrics:{chopPause:p.chopPause,waterTilt:p.waterTilt,hipHeight:p.hipHeight,routineSeconds:3*p.formSeconds,combatWind:windOf(d,'bodyPunch',1),routinePause:p.pause,sway:p.sway}});
    }
    if(s.t >= (last-1)*DAY+clock)break;
    tick(s,dt);if(s.alert)s.alert=null;
  }
  if(snapshots.length!==new Set(days).size)throw Error('缺少指定日期snapshot');
  return {seed,clock,dt,scenario:'合法指派：採石蓋井→每200秒練拳/砍柴/挑水；完整模擬，無灌值',snapshots};
}
