import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../src/sim.mjs';
import { BODY_MOVES, BODY_TIMING, foeAction } from '../src/starter-combat.mjs';
import { windOf, clashTimes, moveStats, clashOdds, resolveSwing, selfTarget, comprehensionSource, artById } from '../src/arts.mjs';
import { MONSTERS, SOURCES, DAY } from '../src/data.mjs';

test('N32 白身無武學、起手秒數與野狗從邊緣走來', () => {
  const s = createState(27, { kind: 'bare', askMajor: false }), d = s.ds.find((d) => d.id === 'hero');
  assert.deepEqual(d.arts, {}); assert.equal(selfTarget(d),null);d.pendingArt='basicSword';assert.equal(selfTarget(d),null);assert.equal(comprehensionSource(d,artById('basicSword')),null);d.pendingArt=null; assert.ok(d.moves.includes('bodyKick')); assert.ok(!d.moves.includes('fist'));
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
  assert.ok(s.ds.every(a=>a.best===0&&a.insight&&a.away===false),'所有新出身經共同初始化就有存檔基準欄，不等load才補');
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
  const {adopt}=await import('../src/sect.mjs');d.trainingWish={kind:'timing'};d.raging=true;d.glimmer={known:['disarm'],progress:{disarm:100}};d.timePrev={day:1,elapsed:DAY,free:400,guided:100};const child=adopt(s,d,s.ds[1],()=>.5);assert.deepEqual(child.practice,{hands:{},eyes:{},origin:{}});assert.equal(child.glimmer,undefined);assert.equal(child.trainingWish,undefined);assert.equal(child.raging,false);assert.equal(child.timePrev,undefined);assert.ok(child.bare);
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
  const {prepareCombatMove,beginCombatFrame,declareCombatSwing,flushCombatSwings,combatSwingReady,windOf,delayCombatSwing}=await import('../src/arts.mjs');
  const clock=createState(83,{kind:'bare',askMajor:false}),body=clock.ds[0];clock.ds=[body];body.pos=[0,0];
  const blade={k:'bandit',uid:'blade',hp:40,pos:[20,0],weapon:'blade'};clock.mons=[blade];clock.captureEvents=true;
  beginCombatFrame(clock);assert.equal(prepareCombatMove(clock,body,blade,()=>rand(clock)),null);
  flushCombatSwings(clock);const paid=body.combatDecision.seconds,ready=body.combatDecision.readyAt;
  assert.ok(paid>0&&body.busyUntil===ready);assert.ok(!body.swing&&!body.bswing,'思考不是已露起手');
  assert.equal(clock.fx.filter(x=>x.kind==='warn').length,0);
  // Deadline is not visible until the next common observation frame.
  const incoming=declareCombatSwing(clock,blade,body,()=>.5,{mv:'looterBlade',tgt:body.id,wind:.8});
  assert.equal(chooseCombatMove(clock,body,blade,()=>.5).available,null,'不預知同拍後宣告來招');flushCombatSwings(clock);
  assert.equal(incoming.opening.at,clock.t);assert.equal(incoming.at,clock.t+.8);assert.ok(body.hp===100);
  assert.equal(combatSwingReady(clock,blade,body,incoming),false,'起手同刻不得瞬移反擊');
  clock.t+=.25;beginCombatFrame(clock);assert.equal(chooseCombatMove(clock,body,blade,()=>.5).available,.55);
  assert.equal(prepareCombatMove(clock,body,blade,()=>.5),null);assert.equal(body.busyUntil,ready,'未到期不能重抽/退費');
  delayCombatSwing(incoming,.25);assert.equal(incoming.at,1.05);assert.equal(incoming.opening.T.windowEnd,1.05,'放慢須同步絕對來招期限');
  // Same published body actions must produce the same load/busy windows in either declaration order.
  function simultaneous(reverse){const q=createState(90,{kind:'bare',askMajor:false}),a=q.ds[0];q.ds=[a];a.pos=[0,0];const b={k:'bandit',uid:'b',hp:40,pos:[20,0],weapon:'blade'};q.mons=[b];beginCombatFrame(q);
    const jobs=[()=>declareCombatSwing(q,a,b,()=>.5,{mv:'bodyPunch',tgt:'b',wind:windOf(a,'bodyPunch',1)}),()=>declareCombatSwing(q,b,a,()=>.5,{mv:'looterBlade',tgt:a.id,wind:.8})];if(reverse)jobs.reverse();jobs.forEach(f=>f());flushCombatSwings(q);return [a.swing.opening.T,b.swing.opening.T];}
  assert.deepEqual(simultaneous(false),simultaneous(true),'先發佈全體，再計算所有起手反應');
  // 公開短史，不指定免費老師/ARTS/n/f：先真砍柴拿刀、真自修，再邀請。
  const {setOrder}=await import('../src/sim.mjs'),q=createState(17,{kind:'bare',askMajor:false});q.captureEvents=true;
  for(const a of q.ds)setOrder(q,a.id,'chop');
  while(q.t<60&&!q.ds.every(a=>a.tools?.knife))tick(q,.25);
  assert.ok(q.ds.every(a=>a.tools?.knife));for(const a of q.ds)setOrder(q,a.id,'train');
  while(q.t<70)tick(q,.25);
  for(const a of q.ds)if(a.id!=='hero')setOrder(q,a.id,null);setOrder(q,'hero','spar');
  while(q.t<110)tick(q,.25);
  const hero=q.ds[0],drills=q.events.filter(e=>e.type==='drill'&&e.student==='hero'&&e.move==='toolKnife');
  assert.ok(drills.some(e=>e.eyeGain>0),'真同時到場/真前搖餵招後才有眼熟');
  for(const row of drills){assert.ok(row.t>=row.arrival&&row.arrival>row.start);assert.ok(row.eye<=row.source);}
  assert.ok(hero.practice.eyes['human:toolKnife']>0);assert.equal(hero.practice.eyes['bandit:looterBlade'],undefined,'不能把同門柴刀假充刀賊的砍');
  assert.ok(q.ds.every(a=>a.hp===100&&!(a.wounds?.length)),'同門放慢安全餵招不套實戰傷口/悟招獎勵');

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
 const {assessLoad,composure,interceptOpening}=await import('../src/arts.mjs');
 const {COVERS,chooseTactic,stepTactic,rememberEscape,restoreSurvivor,moveToward}=await import('../src/tactics.mjs');
 const s=createState(41,{kind:'bare',askMajor:false}),d=s.ds[0];s.ds=[d];d.pos=[800,400];
 const {loadFromForecast}=await import('../src/tactics.mjs');
 // 同一段.2秒不能在兩個.8秒窗口各收一次：每人真工作.25秒，率=.625。
 const rate=loadFromForecast(d,[{need:.25,window:.8,travel:0},{need:.25,window:.8,travel:0}]);assert.equal(rate.L,.625);
 assert.equal(2*(.25+.2)/.8,1.125,'舊算式會把同一初始busy乘兩次');

 const dogs=Array.from({length:4},(_,i)=>({k:'dog',uid:`dog${i}`,hp:14,max:14,pos:[820+i,400],intentTarget:d.id}));
 // 真20次接法記錄，不直接灌f；此為單元fixture，不是自然玩法存活率。
 for(let i=0;i<20;i++){d.busyUntil=0;d.posture=100;d.raging=false;d.rageUntil=0;d.fret=0;resolveSwing(s,dogs[0],d,()=>.5,{move:'dogBite',wind:.4});}
 d.busyUntil=0;d.raging=false;d.rageUntil=0;d.fret=0;s.mons=dogs;
 assert.ok(assessLoad(s,d).L>=1);
 const base=assessLoad(s,d);d.busyUntil=s.t+.2;const occupied=assessLoad(s,d);assert.equal(base.L,occupied.L,'busy不是額外週期性敵人需求');assert.equal(occupied.busy,.2);const T=clashTimes(s,dogs[0],d,{move:'dogBite',wind:.4});assert.equal(T.windowStart,s.t+.2);assert.equal(T.wind,.2,'忙碌仍真扣實際可用窗一次');d.busyUntil=0;

 assert.equal(assessLoad(s,dogs[0]).L,0,'待命人物沒有宣告攻擊，不虛構連續來招造成死鎖');
 d.swing={mv:'bodyPunch',tgt:'dog0',wind:.45,at:s.t+.45};assert.ok(assessLoad(s,dogs[0]).L>0);d.swing=null;
 for(let i=0;i<20;i++){d.busyUntil=0;const r=resolveSwing(s,dogs[i%4],d,()=>.00001,{move:'dogBite',wind:.4});assert.ok(!r.counter);}
 // N37：連擋造成真長破綻；等身體資料的回正完成，才比較新一輪空地/牆邊負荷。
 s.t=Math.max(s.t,d.balanceOpenUntil||0);(await import('../src/arts.mjs')).postureRegen(s,d,0);
 d.busyUntil=0;d.raging=false;d.rageUntil=0;d.fret=0;
 d.pos=[...COVERS.find(c=>c.id==='guardTree').stand];dogs.forEach((m,i)=>m.pos=[d.pos[0]+20+i,d.pos[1]]);
 assert.ok(assessLoad(s,d).L<1);
 const before=[...d.pos];moveToward(d,[d.pos[0]+100,d.pos[1]],60,.25);assert.equal(d.pos[0]-before[0],15);
 rememberEscape(s,dogs[0]);const fresh=restoreSurvivor(s,'dog',{k:'dog',uid:'new',hp:14,max:14});assert.equal(fresh.uid,'dog0');assert.deepEqual(fresh.practice,dogs[0].practice);assert.ok(fresh.survived);
 d.personality=['honest'];const calm=chooseTactic(s,d,{L:1.2},{temper:composure(d),enemies:dogs.slice(0,2),friends:[]});
 d.personality=['brave'];const rash=chooseTactic(s,d,{L:1.2},{temper:composure(d),enemies:dogs.slice(0,2),friends:[]});
 assert.ok(rash.morale.reserve>calm.morale.reserve,'急躁不是膽怯，風險承受沿同一N29表');assert.equal(calm.action,'cover');assert.equal(rash.action,'hold'); // 謹慎先靠牆；不能將兩個人頭再重算成必逃
 assert.equal(stepTactic(s,d,{L:1.6},.25,{temper:composure(d),enemies:dogs.slice(0,2),friends:[]}),true,'背到掩體仍超載要留時間應接，不另起手');
 // Both defenses see the same real [0,1] windup; processing at t=1 cannot
 // replay the first .7-second reaction/step in the future or reuse it twice.
 const q=createState(41,{kind:'bare',askMajor:false}),v=q.ds[0];q.ds=[v];q.t=0;v.pos=[800,400];
 const pack=[0,1].map(i=>({k:'dog',uid:`clock${i}`,hp:14,max:14,pos:[820+i,400],intentTarget:v.id}));q.mons=pack;
 pack[0].next=2;
 assert.equal(assessLoad(q,v).rows.find(r=>r.attacker==='clock0').readyDelay,2,'有目標但冷卻未到，不是可立刻再打一招');
 pack[0].swing={mv:'dogBite',tgt:v.id,wind:.4,at:.4};
 assert.equal(assessLoad(q,v).rows.find(r=>r.attacker==='clock0').readyDelay,0,'已發出的來招不可再借未來冷卻延後');
 pack[0].swing=null;
 assert.equal(assessLoad(q,v,pack[0],{move:'dogBite',wind:.4}).rows.find(r=>r.attacker==='clock0').readyDelay,0,'正在結算的來招也不能重新收其冷卻');
 pack[0].next=0;
 const openings=pack.map(a=>interceptOpening(q,a,v,()=>.5,{move:'dogBite',wind:1}));
 assert.ok(openings.every(a=>!a.read));q.t=1;
 const one=resolveSwing(q,pack[0],v,()=>.5,{move:'dogBite',wind:1,opening:openings[0].opening});
 assert.equal(one.kind,'dodge');assert.ok(v.busyUntil<q.t,'已在前搖內完成的移步不能在落下後再占一次');
 const two=resolveSwing(q,pack[1],v,()=>.5,{move:'dogBite',wind:1,opening:openings[1].opening});
 assert.equal(two.kind,'hit','同時第二招仍扣掉前招真正用去的過去區間，不能一秒用兩次');
 assert.ok(Math.abs(v.busyUntil-1.35)<1e-9,'受擊回復從接觸算，不排到先前反應尾端再算');
 // 真trace的18.5精力落在舊自理15/守柵20之間；不是只對主角的補丁。
 const {setOrder}=await import('../src/sim.mjs');
 const recovery=createState(17,{kind:'bare',askMajor:false}),guard=recovery.ds[1];
 guard.needs.energy=18.5;setOrder(recovery,guard.id,'defend');tick(recovery,.25);
 assert.equal(guard.task?.act,'rest');assert.equal(guard.order,'defend');
 for(let i=0;i<240&&guard.needs.energy<80;i++)tick(recovery,.25);
 assert.ok(guard.needs.energy>=80,'花真路程與休息時間，不在18.5精力原地失敗');
 const hurt=createState(17,{kind:'bare',askMajor:false}),patient=hurt.ds[0];patient.hp=18.5;patient.needs.energy=100;
 setOrder(hurt,patient.id,'defend');tick(hurt,.25);assert.equal(patient.task?.act,'rest');
 for(let i=0;i<240&&patient.hp<40;i++)tick(hurt,.25);
 assert.ok(patient.hp>=40,'精力已滿也得真的休養到同一活動氣血門檻');
 const {newBand,FENCE}=await import('../src/threat.mjs'),{NODES}=await import('../src/data.mjs');
 const watch=createState(17,{kind:'bare',askMajor:false}),watcher=watch.ds[0];watch.ds=[watcher];
 watcher.pos=[...NODES[FENCE.node]];watcher.at=FENCE.node;watcher.needs.energy=100;
 watch.band=newBand({pts:57,n:1,day:8},FENCE.node,watch);setOrder(watch,watcher.id,'defend');
 const skill=watcher.skills[watcher.style];
 for(let i=0;i<32;i++)tick(watch,.25);
 assert.equal(watcher.task?.act,'defend');assert.equal(watcher.task?.phase,'do');
 assert.ok(watcher.task.timer>6,'守柵不每6秒丟失守者/重排走位');
 assert.equal(watcher.needs.energy,100,'敵人未進攻，等候不能當8精力的練功');
 assert.equal(watcher.skills[watcher.style],skill,'空等也不能憑6秒周期練出武藝');
 watcher.bswing={mv:'bodyPunch',tgt:watch.band.members[0].uid,at:watch.t+1,wind:1};watcher.needs.energy=19;
 tick(watch,.25);assert.equal(watcher.task?.act,'defend','已起手的動作不能因活動周期/耗能先移出結算者');
 assert.ok(watcher.bswing);watcher.bcool=2;watcher.busyUntil=watch.t+2;
 setOrder(watch,watcher.id,'rest');assert.equal(watcher.bswing,null,'明確改派取消在途招，不留下過期攻擊');
 assert.equal(watcher.bcool,2);assert.equal(watcher.busyUntil,watch.t+2,'取消不退回已占用時間');



});

test('N37 共用受力/分層/手側/長破綻，局部hitstop不改模擬',async()=>{
  const {contactImpact,bodyOf,partWound}=await import('../src/contact.mjs');
  const {postureRegen,combatMoves}=await import('../src/arts.mjs');
  const {impactVisual,hitstopSeconds}=await import('../src/contact-view.mjs');
  const s=createState(17,{kind:'bare',askMajor:false}),a=s.ds[0];s.t=20;a.uid=a.id;a.pos=[0,0];
  const dog={k:'dog',uid:'dog',hp:14,pos:[20,0]},boar={k:'boar',uid:'boar',hp:48,pos:[20,0]},punch=BODY_MOVES[0];
  const small=contactImpact(s,a,dog,{move:punch,force:22,armor:2}),large=contactImpact(s,a,boar,{move:punch,force:22,armor:32});
  assert.notEqual(small.layer,large.layer);assert.ok(small.knock>large.knock);assert.equal(large.injured,false);assert.equal(large.damageFactor,0);
  const distributed=contactImpact(s,a,structuredClone(a),{move:BODY_MOVES.find(m=>m.id==='bodyPush'),force:16,armor:5});assert.equal(distributed.contactSites,2);assert.equal(distributed.pressure,3);assert.equal(distributed.injured,false);
  // 同一重手真招架直到重心歸零，期間沒有另加傷口，也不能下一擊就瞬回半條。
  const target=structuredClone(a);target.id='target';target.uid='target';target.pos=[20,0];target.posture=bodyOf(target).balance;target.wounds=[];
  const heavy={...punch,balanceImpulse:90};let count=0;
  while(target.posture>0&&count++<20)contactImpact(s,a,target,{move:heavy,force:40,blocked:true});
  assert.ok(count<20);assert.equal(target.posture,0);assert.ok(Math.abs(target.balanceOpenUntil-s.t-bodyOf(target).openSeconds)<1e-12);assert.equal(target.wounds.length,0);
  s.t+=bodyOf(target).openSeconds-.01;postureRegen(s,target,.25);assert.equal(target.posture,0);
  s.t+=.02;postureRegen(s,target,.25);assert.ok(target.posture>0);
  const legacy={...structuredClone(target),posture:0,balanceOpenUntil:undefined};postureRegen(s,legacy,.25);assert.equal(legacy.balanceOpenUntil,s.t+bodyOf(legacy).openSeconds);
  target.wounds=[];const blade={...punch,type:'blade',contactPart:'hand',limbs:['rightHand']};
  contactImpact(s,a,target,{move:blade,force:35});assert.equal(partWound(target,'hand','右').layer,'tendon');assert.ok(windOf(target,'bodyPunch',1)>.45);
  const left={...punch,limbs:['leftHand']};assert.equal((await import('../src/contact.mjs')).woundWind(target,left),1);
  contactImpact(s,a,target,{move:blade,force:100});assert.equal(partWound(target,'hand','右').layer,'bone');assert.ok(!combatMoves(target).some(m=>m.id==='bodyPunch'));assert.ok(combatMoves(target).some(m=>m.id==='bodyKick'));
  assert.ok(Math.abs(hitstopSeconds(12)-.1)<1e-12);assert.equal(hitstopSeconds(72),.5);assert.ok(hitstopSeconds(72,4)<.5);
  const victim=s.fx.at(-1),before=JSON.stringify(s),time=victim.at+.02;
  const va=impactVisual(s,a,time),vt=impactVisual(s,target,time),stranger=impactVisual(s,{uid:'uninvolved',pos:[80,80]},time);
  assert.ok(va.paused&&vt.paused);assert.ok(Math.abs(vt.shake)>Math.abs(va.shake));assert.equal(stranger.paused,false);assert.equal(impactVisual(s,target,time,false).paused,false);assert.equal(JSON.stringify(s),before);
  const dust=(await import('../src/techniques.mjs')).TECHNIQUE_MOVES.find(m=>m.id==='dustCast'),unhurt=structuredClone(a);unhurt.pos=[20,0];unhurt.wounds=[];unhurt.pain=0;const beforePos=[...unhurt.pos],irritant=contactImpact(s,a,unhurt,{move:dust,force:10000});assert.equal(irritant.force,0);assert.equal(irritant.injured,false);assert.equal(irritant.balance,0);assert.deepEqual(unhurt.pos,beforePos);
});


test('N50 兩個普通出身同伴與真床位剩一時第二名俠不入門',async()=>{
 const {admissionStatus,bedCount,foodStockTarget,dailyRations}=await import('../src/admission.mjs'),{join,makeXiaCandidate}=await import('../src/wuxia.mjs');
 const s=createState(17,{kind:'bare'});assert.equal(s.ds.length,3);assert.ok(s.ds.slice(1).every(d=>d.bare&&d.originRelation&&!Object.keys(d.arts).length));assert.ok(s.ds.every(d=>!['senior','junior'].includes(d.id)));
 // Controlled capacity fixture: hall3+dorm2, four residents, one physical free bed.
 s.fac.dorm.stage=1;s.res.food=100;s.ds.push({...structuredClone(s.ds[1]),id:'resident',companion:false});const master=s.ds[0];master.practice.hands=Object.fromEntries((await import('../src/starter-combat.mjs')).BODY_BASE.map(id=>[id,500]));master.skills.palm=100;master.timePrev={day:0,elapsed:DAY,free:400,guided:0};
 const pantry=createState(17,{kind:'bare',askMajor:false});assert.ok(foodStockTarget(pantry)>=pantry.ds.length*dailyRations(pantry));assert.equal(foodStockTarget(pantry,{heard:true,foodNeed:14}),14);assert.equal(foodStockTarget(pantry,{heard:false,foodNeed:99}),Math.max(10,pantry.ds.length*dailyRations(pantry)));
 const first=makeXiaCandidate(s,'guojing'),before=JSON.stringify(s),preview=admissionStatus(s,first);assert.equal(JSON.stringify(s),before);assert.equal(bedCount(s)-s.ds.length,1);assert.equal(preview.ok,true,preview.why);
 assert.ok(join(s,'guojing'));assert.equal(s.ds.length,bedCount(s));assert.equal(join(s,'linghuchong'),null);assert.equal(s.ds.length,5);assert.match(admissionStatus(s,makeXiaCandidate(s,'linghuchong')).why,/床位已滿/);
 const {setOrder}=await import('../src/sim.mjs'),{learnManual,startTeachArt,teachStage}=await import('../src/bonds.mjs');
 const c=createState(17,{kind:'bare',askMajor:false}),reader=c.ds[0];c.ds=[reader];c.captureEvents=true;reader.pendingArt='basicFist';setOrder(c,reader.id,'learn');
 for(let i=0;i<40;i++)tick(c,.25);assert.equal(reader.arts.basicFist,undefined,'資格不是教材，不可讓單人learn召喚師父');
 c.manuals=[{k:'page1',art:'basicFist'}];assert.ok(learnManual(c,0,reader.id).ok);assert.equal(reader.arts.basicFist,undefined,'按秘笈只排研讀，不立即學會');
 for(let i=0;i<120&&!reader.arts.basicFist;i++)tick(c,.25);
 assert.ok(reader.arts.basicFist,'須真到場研讀');assert.equal(c.manuals.length,0);
 assert.ok(c.events.some(e=>e.type==='lesson'&&e.source.kind==='manual'&&e.seconds>=e.required));
 const t=createState(17,{kind:'bare',askMajor:false}),m=t.ds[0],p=t.ds[1];t.ds=[m,p];t.captureEvents=true;
 (await import('../src/arts.mjs')).learnArt(m,'basicFist',t.t);Object.assign(m.arts.basicFist,{xp:85,bt1:true,bt2:true});p.master=m.id;
 (await import('../src/social.mjs')).initPair(t,m,p,70);
 assert.ok(startTeachArt(t,m,p,'basicFist'));assert.equal(p.arts.basicFist,undefined,'師父答應不是已經授課');assert.ok(teachStage(t,m,p,'basicFist'));
 for(let i=0;i<400&&!p.arts.basicFist;i++)tick(t,.25);
 assert.ok(p.arts.basicFist,'真師父同場花時後入門');assert.ok(t.events.some(e=>e.type==='lesson'&&e.source.teacher===m.id&&e.seconds>=e.required));
 console.log('N50 source proof '+JSON.stringify({manual:c.events.find(e=>e.type==='lesson'),teacher:t.events.find(e=>e.type==='lesson')}));

});


test('N38 接法機率改變即改名稱，不存level/XP且不消耗逃敵',async()=>{
 const {rankFromProbabilities,bodyAssessment}=await import('../src/body-level.mjs');
 const p={1:.51,2:.51,3:.51,4:.51,5:.51};assert.equal(rankFromProbabilities(p).name,'好手');p[5]=.5;p[4]=.5;assert.equal(rankFromProbabilities(p).name,'會截');for(const k in p)p[k]=.5;assert.equal(rankFromProbabilities(p).name,'挨打');
 const s=createState(17,{kind:'bare'});s.survivors={returnDog:{k:'dog',uid:'returnDog',hp:12,max:14,escapedAt:0,practice:{hands:{dogBite:2},eyes:{},origin:{}}}};const before=JSON.stringify(s),report=bodyAssessment(s,s.ds[0]);assert.equal(report.rows[0].sources[0].uid,'returnDog');assert.equal(report.rows[0].sources[0].source,'returned survivor');assert.equal(JSON.stringify(s),before);assert.equal(s.ds[0].level,undefined);assert.equal(s.ds[0].xp,undefined);
});
