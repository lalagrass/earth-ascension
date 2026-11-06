import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../src/sim.mjs';
import { BODY_MOVES, BODY_TIMING, foeAction } from '../src/starter-combat.mjs';
import { windOf, clashTimes, moveStats, clashOdds, resolveSwing } from '../src/arts.mjs';
import { MONSTERS, SOURCES } from '../src/data.mjs';

test('N32 白身無武學、起手秒數與野狗從邊緣走來', () => {
  const s = createState(27, { kind: 'bare', askMajor: false }), d = s.ds.find((d) => d.id === 'hero');
  assert.deepEqual(d.arts, {}); assert.ok(d.moves.includes('bodyKick')); assert.ok(!d.moves.includes('fist'));
  assert.equal(windOf(d, 'bodyPunch', 1), .45);
  assert.ok(windOf(d,'bodyPunch',1) < windOf(d,'bodyPush',1) && windOf(d,'bodyPush',1) < windOf(d,'bodyKick',1));
  const charge = foeAction({ k: 'boar' }, 70), T = clashTimes(s, { k:'boar' }, d, { move:charge.id, wind:charge.wind });
  assert.ok(T.reaction + T.step < charge.wind); assert.ok(Math.abs(T.reaction-BODY_TIMING.reaction)<1e-12);
  assert.ok(moveStats({k:'boar'}).armor > moveStats(d,'bodyPunch').force);
  assert.equal(foeAction({k:'dog'}).wind,.4); assert.equal(MONSTERS.dog.sprite,'dog');
  while (!s.mons.some((m) => m.trial) && s.t < 600) { tick(s,.25); s.alert = null; }
  const dog = s.mons.find((m) => m.trial); assert.equal(dog.k,'dog'); assert.deepEqual(dog.pos, SOURCES.den.pos); assert.ok(dog.path.length);
  const pos = [...dog.pos]; tick(s,.25); assert.notDeepEqual(dog.pos,pos);
  assert.equal(Object.keys(d.arts).length,0);
  assert.ok(Object.keys(createState(27).ds[0].arts).length > 0, '既有非白身開局保留');
  assert.ok(BODY_MOVES.every((m) => m.wind > 0 && m.cd > m.wind));
});


test('N33 同一底層累積w，手熟縮前搖、眼熟縮反應，人獸都有紀錄', async () => {
  const { learningWeight, practiceWindow, practiceResidual, ensurePractice, rehearse } = await import('../src/practice.mjs');
  assert.equal(learningWeight(.5),1); assert.ok(Math.abs(learningWeight(.9)-.36)<1e-12);
  assert.ok(learningWeight(.99)>0); assert.equal(practiceResidual(50),.5);
  const s = createState(39,{kind:'bare',askMajor:false}), d=s.ds[0], dog={k:'dog',uid:'testdog',pos:[800,400],hp:14};
  ensurePractice(dog); const before=clashTimes(s,dog,d,{move:'dogBite',wind:.4}).reaction;
  const hitBefore=clashOdds(s,dog,d,{move:'dogBite',wind:.4}).hit;
  for(let i=0;i<20;i++) { d.busyUntil=0; d.raging=false; d.rageUntil=0; d.fret=0; d.posture=100; dog.posture=30; resolveSwing(s,dog,d,()=>.5,{move:'dogBite',wind:.4}); }
  d.busyUntil=0; d.raging=false; d.rageUntil=0; d.fret=0;
  assert.ok(clashTimes(s,dog,d,{move:'dogBite',wind:.4}).reaction<before);
  assert.ok(clashOdds(s,dog,d,{move:'dogBite',wind:.4}).hit<hitBefore/2);
  assert.ok(dog.practice.hands.dogBite>0); assert.ok(d.practice.eyes['dog:dogBite']>0);
  const start=windOf(d,'bodyPunch',1); rehearse(s,d,BODY_MOVES.filter((m)=>!m.tool),600);
  assert.ok(windOf(d,'bodyPunch',1)<start);
  const fake={skills:{agility:20},practice:{hands:{bodyPunch:50}}}; const w=practiceWindow(fake,'bodyPunch',.45);
  assert.ok(Math.abs((w.wind-w.floor)/(w.start-w.floor)-.5)<1e-12);
});


test('N55 只有播放參數變、沒有第二份熟練pose且繪製不回寫模擬', async () => {
  const {routineFrame,WORK_POSES}=await import('../src/routines.mjs');
  const {playbackParams}=await import('../src/growth-playback.mjs');
  const {displayPose,drawPoseActor}=await import('../src/pose-render.mjs');
  const s=createState(17,{kind:'bare',askMajor:false}),d=s.ds[0];
  const master=structuredClone(d);for(const id of ['bodyPunch','bodyPush','work:chop','work:water'])master.practice.hands[id]=500;
  master.skills.agility=40;
  const a=playbackParams(d),b=playbackParams(master);
  for(const k of ['pause','wind','hipHeight','sway','chopPause','waterTilt','formSeconds'])assert.ok(b[k]<a[k],k);
  assert.equal(routineFrame(null,d,a.formSeconds*.5).poses,routineFrame(null,master,b.formSeconds*.5).poses);
  for(const act of ['train','chop','water']) {
    d.task={act,phase:'do'};master.task={act,phase:'do'};
    const before=JSON.stringify([d,master]),v=displayPose({t:3,fx:[]},d,null,null),w=displayPose({t:3,fx:[]},master,null,null);
    if(WORK_POSES[act])assert.equal(v.poses,w.poses);
    // 僅驗證共用Canvas指令會產生不同座標；不是遊戲實拍或真人盲測。
    const calls=[],ctx=new Proxy({}, {get:(_,k)=>(...args)=>calls.push([k,...args]),set:()=>true});
    drawPoseActor(ctx,d,v);const first=JSON.stringify(calls);calls.length=0;drawPoseActor(ctx,master,w);
    assert.notEqual(JSON.stringify(calls),first);assert.equal(JSON.stringify([d,master]),before);
  }
});


test('N34 情境識別穩定後零決策時間，選招/心願所有人共用',async()=>{
  const {chooseCombatMove,resolveSwing}=await import('../src/arts.mjs');
  const {contextKey,recordChoice,finishTrainingWish}=await import('../src/decision.mjs');
  const {rand}=await import('../src/sim.mjs');
  const s=createState(17,{kind:'bare',askMajor:false}),d=s.ds[0],t=structuredClone(d);t.id='target';d.pos=[0,0];t.pos=[20,0];
  const initial=chooseCombatMove(s,d,t,()=>rand(s));assert.ok(initial.seconds>0);
  const key=initial.context;d.selection.contexts[key]=Object.fromEntries(BODY_MOVES.filter(m=>!m.tool).map(m=>[m.id,{win:m.id==='bodyPunch'?1000:0,loss:m.id==='bodyPunch'?0:1000}]));
  const known=chooseCombatMove(s,d,t,()=>rand(s));assert.equal(known.move.id,'bodyPunch');assert.equal(known.seconds,0);
  // 相同世界種子/身體/均等觀測，性格的通用效用目標應能產生不同偏好。
  const favorites=[];
  for(const trait of ['honest','bold','clever']){
    const q=createState(71,{kind:'bare',askMajor:false}),a=q.ds[0];a.personality=[trait];a.pos=[0,0];const b=structuredClone(t);const counts={};
    for(let i=0;i<160;i++){const pick=chooseCombatMove(q,a,b,()=>rand(q));recordChoice(q,a,b,pick.move.id,.5,{expected:true});counts[pick.move.id]=(counts[pick.move.id]||0)+1;}
    favorites.push(Object.keys(counts).sort((x,y)=>counts[y]-counts[x])[0]);
  }
  assert.ok(new Set(favorites).size>=2,JSON.stringify(favorites));
  t.busyUntil=0;t.posture=100;resolveSwing(s,d,t,()=>.999,{move:'bodyPunch',wind:.45});assert.ok(t.trainingWish?.evidence);finishTrainingWish(t,'spar');
});


test('N35 母招/條件/效果全資料化，只有真失手加w，弱敵期望慢逾10倍',async()=>{
  const {TECHNIQUES,learnFromLoss,applyTechnique,learningRate}=await import('../src/techniques.mjs');
  const {breakWindup}=await import('../src/arts.mjs');
  const s=createState(17,{kind:'bare',askMajor:false}),d=s.ds[0],boar={k:'boar',uid:'boar',hp:100,pos:[20,0],posture:70,swing:{at:1,mv:'boarCharge',wind:1}};
  d.wu=3;const facts={hands:2,afterDodge:true,opponentCharge:true,force:24,opponentForce:40};
  assert.equal(learningRate(.5)/learningRate(.9)>10,true);
  for(let i=0;i<60;i++)learnFromLoss(s,d,['leg'],facts,.99,{lost:false});assert.equal(d.glimmer,undefined);
  for(let i=0;i<24;i++)learnFromLoss(s,d,['leg'],facts,.5,{lost:true});
  assert.ok(d.glimmer.known.includes('flankStrike'));assert.ok(d.moves.includes('flankStrike'));
  assert.equal(breakWindup(s,d,boar,'bodyKick',.6),false);
  const out=applyTechnique(s,d,boar,'flankStrike',facts);assert.equal(out.armorBypass,true);assert.equal(out.interrupt,true);assert.equal(boar.swing,null);
  assert.equal(TECHNIQUES.length,6);const enemy={k:'bandit',uid:'bandit',wu:3};
  for(let i=0;i<24;i++)learnFromLoss(s,enemy,['guard'],{hands:2,weapon:'blade',opponentWind:true},.5,{lost:true});assert.ok(enemy.glimmer.known.includes('disarm'));
});


test('N36 同一主角四狗空地超載、靠可見樹降負荷；超載零反擊、倖存者留眼熟',async()=>{
 const {assessLoad,composure}=await import('../src/arts.mjs');
 const {COVERS,chooseTactic,stepTactic,rememberEscape,restoreSurvivor,moveToward}=await import('../src/tactics.mjs');
 const s=createState(41,{kind:'bare',askMajor:false}),d=s.ds[0];s.ds=[d];d.pos=[800,400];
 const dogs=Array.from({length:4},(_,i)=>({k:'dog',uid:`dog${i}`,hp:14,max:14,pos:[820+i,400],intentTarget:d.id}));
 // 真20次接法記錄，不直接灌f；此為單元fixture，不是自然玩法存活率。
 for(let i=0;i<20;i++){d.busyUntil=0;d.posture=100;d.raging=false;d.rageUntil=0;d.fret=0;resolveSwing(s,dogs[0],d,()=>.5,{move:'dogBite',wind:.4});}
 d.busyUntil=0;d.raging=false;d.rageUntil=0;d.fret=0;s.mons=dogs;
 assert.ok(assessLoad(s,d).L>=1);
 assert.equal(assessLoad(s,dogs[0]).L,0,'待命人物沒有宣告攻擊，不虛構連續來招造成死鎖');
 d.swing={mv:'bodyPunch',tgt:'dog0',wind:.45,at:s.t+.45};assert.ok(assessLoad(s,dogs[0]).L>0);d.swing=null;
 for(let i=0;i<20;i++){d.busyUntil=0;const r=resolveSwing(s,dogs[i%4],d,()=>.00001,{move:'dogBite',wind:.4});assert.ok(!r.counter);}
 d.busyUntil=0;d.raging=false;d.rageUntil=0;d.fret=0;
 d.pos=[...COVERS.find(c=>c.id==='guardTree').stand];dogs.forEach((m,i)=>m.pos=[d.pos[0]+20+i,d.pos[1]]);
 assert.ok(assessLoad(s,d).L<1);
 const before=[...d.pos];moveToward(d,[d.pos[0]+100,d.pos[1]],60,.25);assert.equal(d.pos[0]-before[0],15);
 rememberEscape(s,dogs[0]);const fresh=restoreSurvivor(s,'dog',{k:'dog',uid:'new',hp:14,max:14});assert.equal(fresh.uid,'dog0');assert.deepEqual(fresh.practice,dogs[0].practice);assert.ok(fresh.survived);
 d.personality=['honest'];const calm=chooseTactic(s,d,{L:1.2},{temper:composure(d),enemies:dogs.slice(0,2),friends:[]});
 d.personality=['brave'];const rash=chooseTactic(s,d,{L:1.2},{temper:composure(d),enemies:dogs.slice(0,2),friends:[]});
 assert.ok(rash.morale.reserve>calm.morale.reserve,'急躁不是膽怯，風險承受沿同一N29表');assert.equal(calm.action,'flee');assert.equal(rash.action,'cover');
 assert.equal(stepTactic(s,d,{L:1.6},.25,{temper:composure(d),enemies:dogs.slice(0,2),friends:[]}),true,'背到掩體仍超載要留時間應接，不另起手');
});
