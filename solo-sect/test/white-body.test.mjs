import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../src/sim.mjs';
import { BODY_MOVES, BODY_TIMING, foeAction } from '../src/starter-combat.mjs';
import { windOf, clashTimes, moveStats, clashOdds, resolveSwing, selfTarget, learnArt, gainArt } from '../src/arts.mjs';
import { MONSTERS, SOURCES, DAY } from '../src/data.mjs';

test('N32 白身無武學、起手秒數與野狗從邊緣走來', () => {
  const s = createState(27, { kind: 'bare', askMajor: false }), d = s.ds.find((d) => d.id === 'hero');
  assert.deepEqual(d.arts, {}); assert.equal(selfTarget(d),null); assert.ok(d.moves.includes('bodyKick')); assert.ok(!d.moves.includes('fist'));
  const learner=structuredClone(d);learnArt(learner,'basicFist');gainArt(learner,600,1,s.t);assert.equal(learner.pendingArt,null,'即使從真教材學會一門，白身不能憑熟練憑空取得下一本正式譜');
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
  const { learningWeight, practiceWindow, practiceResidual, ensurePractice, rehearse, handUses, familiarUses, recordExchange } = await import('../src/practice.mjs');
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
  const veteran=createState(3).ds[0], rat={k:'rat'};
  veteran.arts.basicFist={xp:150,bt1:true,bt2:true};
  assert.equal(handUses(veteran,'fist'),250);
  assert.ok(familiarUses(veteran,rat,'fist')>=250);
  const veteranOdds=clashOdds(s,rat,veteran,{wind:.54});
  assert.ok(veteranOdds.read+veteranOdds.dodgeCounter>.9,'已練過的高手能截擊或移步反擊短招');
  assert.equal(familiarUses(d,{k:'dog'},'dogBite'),d.practice.eyes['dog:dogBite']);
  const novice=createState(4,{kind:'bare',askMajor:false}).ds[0];
  assert.equal(familiarUses(novice,{k:'dog'},'dogBite'),0,'白身初遇野狗仍陌生');
  recordExchange(s,{k:'boar',uid:'sample'},novice,'boarCharge',.5,{kind:'hit'});
  assert.ok(familiarUses(novice,{k:'boar'},'boarToss')>0,'同類衝撞可折算眼熟');
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
  // #445 9c: the three contexts are reachable through actual exchanges, including
  // the opponent's real windup/approach state and the defender's real dodge record.
  const q=createState(17,{kind:'bare'}),hero=q.ds[0];hero.pos=[0,0];q.ds=[hero];q.captureTechniqueContexts=true;
  const boar2={k:'boar',uid:'boar2',hp:48,max:48,pos:[50,0],posture:70,practice:{hands:{},eyes:{},origin:{}}};q.mons=[boar2];
  assert.equal(resolveSwing(q,boar2,hero,()=>.5,{move:'boarCharge',wind:1}).kind,'dodge');
  resolveSwing(q,hero,boar2,()=>.99,{move:'bodyKick',wind:.6});assert.ok(q.techniqueContextCounts.flankStrike.heroSeen);
  const {COVERS}=await import('../src/tactics.mjs');hero.hp=40;hero.pos=[...COVERS[0].stand];
  const dog={k:'dog',uid:'dog',hp:14,max:14,pos:[hero.pos[0]+20,hero.pos[1]],practice:{hands:{},eyes:{},origin:{}}};q.mons=[dog];
  assert.equal(resolveSwing(q,dog,hero,()=>.99,{move:'dogBite',wind:.4}).kind,'hit');assert.ok(q.techniqueContextCounts.dustCast.heroLost);
  hero.pos=[0,0];hero.tools.stone=true;hero.moves.push('toolStone');
  const traveler={k:'bandit',uid:'traveler',hp:60,max:60,pos:[90,0],path:[[0,0]],practice:{hands:{},eyes:{},origin:{}}};q.mons=[traveler];
  const approaching=(await import('../src/arts.mjs')).techniqueFacts(q,hero,traveler,'toolStone').approaching;assert.equal(approaching,true);
  traveler.path=[];resolveSwing(q,hero,traveler,()=>.99,{move:'toolStone',wind:.8,targetApproachingAtWindup:approaching});assert.ok(q.techniqueContextCounts.stoneOpening.heroSeen);
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
 // N37：連擋造成真長破綻；等身體資料的回正完成，才比較新一輪空地/牆邊負荷。
 s.t=Math.max(s.t,d.balanceOpenUntil||0);(await import('../src/arts.mjs')).postureRegen(s,d,0);
 d.busyUntil=0;d.raging=false;d.rageUntil=0;d.fret=0;
 d.pos=[...COVERS.find(c=>c.id==='guardTree').stand];dogs.forEach((m,i)=>m.pos=[d.pos[0]+20+i,d.pos[1]]);
 assert.ok(assessLoad(s,d).L<1);
 const before=[...d.pos];moveToward(d,[d.pos[0]+100,d.pos[1]],60,.25);assert.equal(d.pos[0]-before[0],15);
 rememberEscape(s,dogs[0]);const fresh=restoreSurvivor(s,'dog',{k:'dog',uid:'new',hp:14,max:14});assert.equal(fresh.uid,'dog0');assert.deepEqual(fresh.practice,dogs[0].practice);assert.ok(fresh.survived);
 d.personality=['honest'];const calm=chooseTactic(s,d,{L:1.2},{temper:composure(d),enemies:dogs.slice(0,2),friends:[]});
 d.personality=['brave'];const rash=chooseTactic(s,d,{L:1.2},{temper:composure(d),enemies:dogs.slice(0,2),friends:[]});
 assert.ok(rash.morale.reserve>calm.morale.reserve,'急躁不是膽怯，風險承受沿同一N29表');assert.equal(calm.action,'cover','謹慎者在兩敵逼近時先靠樹');assert.equal(rash.action,'hold','急躁者暫時守位');
 assert.equal(stepTactic(s,d,{L:1.6},.25,{temper:composure(d),enemies:dogs.slice(0,2),friends:[]}),true,'背到掩體仍超載要留時間應接，不另起手');
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
 const {admissionStatus,bedCount}=await import('../src/admission.mjs'),{join,makeXiaCandidate}=await import('../src/wuxia.mjs');
 const s=createState(17,{kind:'bare'});assert.equal(s.ds.length,3);assert.ok(s.ds.slice(1).every(d=>d.bare&&d.originRelation&&!Object.keys(d.arts).length));assert.ok(s.ds.every(d=>!['senior','junior'].includes(d.id)));assert.deepEqual(s.ds.slice(1).map(d=>d.sprite),['senior','cousin']);
 const classic=createState(17,{kind:'template',id:'guojing'}),{visualSpriteOf}=await import('../src/visual-gender.mjs');assert.equal(classic.ds[1].name,'李萍');assert.equal(visualSpriteOf(classic.ds[1]),'sister');
 // Controlled capacity fixture: hall3+dorm2, four residents, one physical free bed.
 s.fac.dorm.stage=1;s.res.food=100;s.ds.push({...structuredClone(s.ds[1]),id:'resident',companion:false});const master=s.ds[0];master.practice.hands=Object.fromEntries((await import('../src/starter-combat.mjs')).BODY_BASE.map(id=>[id,500]));master.skills.palm=100;master.timePrev={day:0,elapsed:DAY,free:400,guided:0};
 const first=makeXiaCandidate(s,'guojing'),before=JSON.stringify(s),preview=admissionStatus(s,first);assert.equal(JSON.stringify(s),before);assert.equal(bedCount(s)-s.ds.length,1);assert.equal(preview.ok,true,preview.why);
 assert.ok(join(s,'guojing'));assert.equal(s.ds.length,bedCount(s));assert.equal(join(s,'linghuchong'),null);assert.equal(s.ds.length,5);assert.match(admissionStatus(s,makeXiaCandidate(s,'linghuchong')).why,/床位已滿/);
});


test('N38 接法機率改變即改名稱，不存level/XP且不消耗逃敵',async()=>{
 const {rankFromProbabilities,bodyAssessment}=await import('../src/body-level.mjs');
 const p={1:.51,2:.51,3:.51,4:.51,5:.51};assert.equal(rankFromProbabilities(p).name,'好手');p[5]=.5;p[4]=.5;assert.equal(rankFromProbabilities(p).name,'會截');for(const k in p)p[k]=.5;assert.equal(rankFromProbabilities(p).name,'挨打');
 const s=createState(17,{kind:'bare'});s.survivors={returnDog:{k:'dog',uid:'returnDog',hp:12,max:14,escapedAt:0,practice:{hands:{dogBite:2},eyes:{},origin:{}}}};const before=JSON.stringify(s),report=bodyAssessment(s,s.ds[0]);assert.equal(report.rows[0].sources[0].uid,'returnDog');assert.equal(report.rows[0].sources[0].source,'returned survivor');assert.equal(JSON.stringify(s),before);assert.equal(s.ds[0].level,undefined);assert.equal(s.ds[0].xp,undefined);
});
