// #441 2026-11-07 A/B：固定情境核對規則，再用公式與 99.9% 信賴區間核對隨機結果。
import assert from 'node:assert/strict';
import {createState,clone,rand} from '../src/sim.mjs';
import {clashTimes,clashOdds,resolveSwing,assessLoad,learnArt} from '../src/arts.mjs';
import {TIERS} from '../src/data.mjs';
import {learnFromLoss} from '../src/techniques.mjs';
import {learningWeight} from '../src/practice.mjs';
import {COVERS} from '../src/tactics.mjs';
import {BAND_CLASH} from '../src/threat.mjs';
import {growthSnapshots} from './growth-scenario.mjs';
import {makeBare} from '../src/starter-combat.mjs';

const seed=Number(process.argv.find(x=>x.startsWith('--seed='))?.slice(7)??17);
if(!Number.isSafeInteger(seed))throw Error('--seed 須為整數');
// R9：白身是固定交手探針，不再是可選開局；使用同一人物後明確清空起手武學。
const bareState=()=>{const s=createState(seed,{kind:'custom',opening:'solo',askMajor:false});makeBare(s.ds[0]);return s;};
const novice=bareState().ds[0];
const master=makeBare(growthSnapshots(seed,[60]).snapshots[0].hero);
master.skills.agility=100; // 固定高手情境沿原技能滿值 100；隱居成長上限不應把 N34 的反應探針悄悄改成新手。
// N51 的登門理由會改變自然日程能否巧遇武學。A/B 固定高手情境明確補同一武學火候，
// 仍由 N33/N42 的真反應公式判定，不以偶遇江湖客作高手的隱性前置。
learnArt(master,'basicFist');master.arts.basicFist.xp=TIERS[3][0];
const fastWind=.4; // 固定情境：和起手表的狗咬同量級，並非遊戲新增常數。
function humanScene(base,wind=fastWind){
  const s=bareState(),atk=clone(novice),def=clone(base);
  atk.id='attacker';atk.uid='attacker';atk.pos=[100,100];atk.posture=100;atk.busyUntil=0;atk.swing=null;atk.bswing=null;
  def.id='defender';def.uid='defender';def.pos=[120,100];def.posture=100;def.busyUntil=0;def.downUntil=0;def.swing=null;def.bswing=null;def.fret=0;def.raging=false;def.rageUntil=0;
  s.ds=[atk,def];s.mons=[];s.band=null;
  return {s,atk,def,ctx:{move:'bodyPunch',wind}};
}
const n=humanScene(novice),m=humanScene(master),tn=clashTimes(n.s,n.atk,n.def,n.ctx),tm=clashTimes(m.s,m.atk,m.def,m.ctx);
const nr=resolveSwing(n.s,n.atk,n.def,()=>.5,n.ctx),mr=resolveSwing(m.s,m.atk,m.def,()=>.5,m.ctx);
assert.ok(tn.reaction+tn.step>tn.wind,'N34 A：新手中位反應來不及側身');
assert.ok(tm.reaction+tm.step+tm.strike<tm.wind&&mr.kind==='dodge'&&mr.counter,'N34 A：高手中位反應側身即反擊');
assert.notEqual(nr.kind,'dodge','N34 A：新手不能完成同一最小側身');

// B：抽樣真正的 resolveSwing；每次重置人物與判讀史，只讓種子亂數前進。
const reference=humanScene(master),expected=clashOdds(reference.s,reference.atk,reference.def,reference.ctx).read;
const sampleState=bareState(),samples=5000;
let reads=0;
for(let i=0;i<samples;i++){
  const q=humanScene(master),u=rand(sampleState);
  if(resolveSwing(q.s,q.atk,q.def,()=>u,q.ctx).kind==='read')reads++;
}
const observed=reads/samples,z=3.290526731,halfWidth=z*Math.sqrt(expected*(1-expected)/samples)+1/samples;
assert.ok(Math.abs(observed-expected)<=halfWidth,`N34 B：截擊 ${observed} 不在公式 ${expected} ± ${halfWidth}`);

// N35 A/B：只有失手累積，當拍的 p 帶入 w＝4p(1−p)，到門檻才悟。
const g=bareState(),hero=g.ds[0],facts={hands:2,afterDodge:true,opponentCharge:true,force:24,opponentForce:40};
hero.wu=3;
g.mons=[{k:'boar',uid:'fixed-boar',hp:48,max:48,pos:[hero.pos[0]+20,hero.pos[1]],swing:{mv:'boarCharge',wind:1,at:g.t+1,tgt:hero.id}}];
learnFromLoss(g,hero,['leg'],facts,.35,{lost:false});assert.equal(hero.glimmer,undefined);
learnFromLoss(g,hero,['leg'],facts,.35,{lost:true});
assert.ok(Math.abs(hero.glimmer.progress.flankStrike-learningWeight(.35))<1e-12,'N35 B：當拍失手只加 w');
assert.ok(!hero.glimmer.known.includes('flankStrike'));
for(let i=0;i<24;i++)learnFromLoss(g,hero,['leg'],facts,.5,{lost:true});
assert.ok(hero.glimmer.known.includes('flankStrike'),'N35 A：累計達難度/悟性才悟招');
const real=bareState(),guard=real.ds[0];guard.wu=3;guard.pos=[100,100];real.ds=[guard];
const blade={k:'bandit',uid:'bandit',hp:40,max:40,pos:[120,100],weapon:'blade',agi:20,swing:{mv:'looterBlade',at:.6,wind:.6,tgt:guard.id}};real.mons=[blade];
const predictedHit=clashOdds(real,blade,guard,{move:'looterBlade',wind:.6}).hit;
const hit=resolveSwing(real,blade,guard,()=>.999,{move:'looterBlade',wind:.6});
assert.equal(hit.kind,'hit');assert.ok(Math.abs(hit.learning.p-predictedHit)<1e-12);
assert.ok(Math.abs(guard.glimmer.progress.disarm-learningWeight(1-hit.learning.p))<1e-12,'N35 B：實際來招用當拍 p 加原 w');

// N36 A/B：一、二人守真山門兩席可反擊；四人空地超載，固定中位反應不能反擊。
const loads=[];
for(const count of [1,2,4]){
  const s=bareState(),def=clone(master);def.id='hero';def.uid='hero';def.pos=count<3?[...COVERS.find(c=>c.id==='gate').stand]:[800,400];def.hp=100;def.posture=100;def.busyUntil=0;def.downUntil=0;def.swing=null;def.bswing=null;def.fret=0;def.raging=false;def.rageUntil=0;s.ds=[def];s.band=null;
  s.mons=Array.from({length:count},(_,i)=>({k:'bandit',uid:`foe${i}`,hp:40,max:40,pos:[def.pos[0]+20+i*2,def.pos[1]],agi:20,weapon:'fist',energy:100,intentTarget:'hero',swing:{mv:'looterFist',wind:BAND_CLASH.cd,tgt:'hero',at:s.t+BAND_CLASH.cd}}));
  // 三個單敵應接時間是二人/四人門檻的中點；此處只安排可驗規則的來招窗口。
  const oneNeed=assessLoad(s,def,s.mons[0],{move:'looterFist',wind:BAND_CLASH.cd}).rows[0].need,groupWind=3*oneNeed;
  for(const m of s.mons){m.swing.wind=groupWind;m.swing.at=s.t+groupWind;}
  const atk=s.mons[0],ctx={move:'looterFist',wind:groupWind},assessment=assessLoad(s,def,atk,ctx);
  const terms=assessment.rows.map(row=>({need:row.need,window:row.window,travel:row.travel,share:row.need/(row.window+row.travel)}));
  assert.ok(Math.abs(assessment.L-terms.reduce((v,row)=>v+row.share,0))<1e-12,'N36 B：L 等於各來招所需時間/窗口的和');
  const result=resolveSwing(s,atk,def,()=>.5,ctx);
  if(count<3)assert.ok(assessment.L<1&&!!result.counter,'N36 A：一、二路中位反應可反擊');
  else assert.ok(assessment.L>=1&&!result.counter,`N36 A：四路超載不能反擊（L=${assessment.L}，counter=${!!result.counter}）`);
  loads.push({count,L:assessment.L,terms,counter:!!result.counter,kind:result.kind});
}
console.log(JSON.stringify({seed,N34:{day1:{r:tn.reaction,step:tn.step,wind:tn.wind,kind:nr.kind},day60:{r:tm.reaction,step:tm.step,strike:tm.strike,wind:tm.wind,kind:mr.kind},intercept:{expected,observed,samples,halfWidth}},N35:{known:hero.glimmer.known.includes('flankStrike'),w35:learningWeight(.35),actualP:1-hit.learning.p,actualGain:guard.glimmer.progress.disarm},N36:loads,pass:true},null,2));
