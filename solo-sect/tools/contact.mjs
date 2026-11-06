// 指定N37受力驗收，不是自然玩法存活率；無外部相依、任選seed。
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createState,tick,clone} from '../src/sim.mjs';
import {resolveSwing,clashTimes,postureRegen} from '../src/arts.mjs';
import {BODY_MOVES} from '../src/starter-combat.mjs';
import {contactImpact,bodyOf} from '../src/contact.mjs';
import {impactVisual,hitstopSeconds} from '../src/contact-view.mjs';
import {displayPose} from '../src/pose-render.mjs';
const args=process.argv.slice(2),get=(k,f)=>{const i=args.indexOf('--'+k);return i<0?f:args[i+1];},seed=Number(get('seed',17));
if(!Number.isSafeInteger(seed))throw Error('seed必須為安全整數');
const s=createState(seed,{kind:'bare',askMajor:false});s.t=10;s.captureEvents=true;
const attacker=s.ds[0],defender=clone(attacker);attacker.id='heavy';attacker.uid='heavy';attacker.skills.strength=140;attacker.pos=[500,400];defender.id='guard';defender.uid='guard';defender.pos=[520,400];s.ds=[attacker,defender];
// 受控重手的force=12+140×.2=40；反應由opening固定為.2，只隔離招架受力，不挑亂數賭招架。
let parries=0;while(defender.posture!==0&&parries<20){const T=clashTimes(s,attacker,defender,{move:'bodyPunch',wind:1});T.wind=.2+(Math.min(T.step,T.strike)+T.guard)/2;const result=resolveSwing(s,attacker,defender,()=>.5,{move:'bodyPunch',wind:T.wind,opening:{at:s.t,T,reaction:.2,p:.5}});if(result.kind!=='parry')throw Error('probe不是招架：'+result.kind);parries++;s.t+=1;}
const brokenAt=s.events.find(e=>e.type==='balanceBreak'&&e.who==='guard')?.t,openSeconds=defender.balanceOpenUntil-brokenAt;
s.t=defender.balanceOpenUntil-.001;postureRegen(s,defender,0);const stillOpen=defender.posture===0;s.t+=.002;postureRegen(s,defender,0);const recovered=defender.posture>0;
const kick=BODY_MOVES.find(m=>m.id==='bodyKick'),dog={k:'dog',uid:'dog',hp:14,pos:[520,400]},boar={k:'boar',uid:'boar',hp:48,pos:[520,400]};
const dogContact=contactImpact(s,attacker,dog,{move:kick,force:kick.force,armor:2}),boarContact=contactImpact(s,attacker,boar,{move:kick,force:kick.force,armor:32});
const on=clone(s),off=clone(s),hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
// 實際tick前後插入唯讀開/關渲染查詢，兩份模擬逐位元應相同，不以改golden檔代替證據。
for(let i=0;i<8;i++){for(const a of on.ds){impactVisual(on,a,on.t+.02,true);displayPose(on,a,null,null,on.t+.02,true);}for(const a of off.ds){impactVisual(off,a,off.t+.02,false);displayPose(off,a,null,null,off.t+.02,false);}tick(on,.25);tick(off,.25);}
const result={seed,kind:'controlled-contact-not-natural-play',parries,force:40,openSeconds,expectedOpen:bodyOf(defender).openSeconds,stillOpen,recovered,dog:dogContact,boar:boarContact,hitstop:{fist:hitstopSeconds(12),bone:hitstopSeconds(72),crowdBone:hitstopSeconds(72,4)},simulationWithHitstop:hash(on),simulationWithoutHitstop:hash(off),events:s.events};
result.pass=parries<20&&stillOpen&&recovered&&Math.abs(openSeconds-result.expectedOpen)<1e-9&&dogContact.layer!==boarContact.layer&&dogContact.knock>boarContact.knock&&boarContact.damageFactor===0&&result.simulationWithHitstop===result.simulationWithoutHitstop;
console.log(JSON.stringify(result,null,2));const log=get('log',null);if(log){await mkdir(path.dirname(path.resolve(log)),{recursive:true});await writeFile(log,JSON.stringify(result,null,2));}if(!result.pass)process.exitCode=1;
