import assert from'node:assert/strict';import{launch}from'./ui-kit.mjs';import{statusBadge}from'../../src/person-view.mjs';
// Normal-UI M8 check. Usage: node m8-ui.mjs <label> <width> <height>. Badge glyphs are computed from read-only snapshots.
const [label='initial',width='1440',height='900']=process.argv.slice(2),k=await launch('m8-ui-'+label+'-'+width,{width:Number(width),height:Number(height)}),page=k.page;
const showcase=new URL('../../evidence/optimization/showcase/showcase-all-features.save.json',import.meta.url).pathname,seen={},want=['▣','➤','☾','◆','✕'];
const overflow=()=>page.evaluate(()=>{const p=document.querySelector('#panel');return p.scrollWidth-p.clientWidth;});
const clickPerson=async id=>{const w=await k.snap(),v=await page.evaluate(()=>window.__game.view()),box=await page.locator('#world').boundingBox(),p=w.people[id],t=v.transform;await page.mouse.click(box.x+p.x/256*t.scale+t.ox,box.y+(p.y/256-14)*t.scale+t.oy);};
const hidePanel=async()=>{if(!await page.locator('main.panel-hidden').count())await k.click('#panel-toggle');};
const collect=async(tag)=>{const w=await k.snap();for(const p of Object.values(w.people).filter(p=>p.residence==='resident'&&p.adult)){const b=statusBadge(w,p);if(want.includes(b.glyph)&&!seen[b.glyph]){seen[b.glyph]={tick:w.tick,person:p.id,text:b.text,shot:tag};await k.shot('map-'+want.indexOf(b.glyph)+'-'+tag);}}};
let failure=null;
try{await k.open();await k.newGame();
 await k.person('leader');await page.locator('#situation-card').waitFor();let card=await page.locator('#situation-card').textContent();assert.match(card,/現在/);await k.log('new-game-card',{card:card.slice(0,120),overflow:await overflow()});assert.ok(await overflow()<=0);await k.shot('01-new-game-card');
 await page.locator('details[data-section="work"] summary').click();await k.person('amu');assert.equal(await page.locator('details[data-section="work"][open]').count(),1,'open section survives switching people');await page.locator('details[data-section="work"] summary').click();await k.person('leader');assert.equal(await page.locator('details[data-section="work"][open]').count(),0,'collapse survives too');await k.log('sections-persist');
 await clickPerson('amu');let v=await page.evaluate(()=>window.__game.view());assert.equal(v.selected,'amu','canvas click selects');await k.log('canvas-select',{selected:v.selected});await k.shot('02-canvas-selected');
 await k.importSave(showcase);await k.log('showcase-loaded');
 // M7 recoveries from the person card
 await k.tab('travel');for(const box of await page.locator('input[name=party]').all())await box.setChecked(['leader','amu'].includes(await box.getAttribute('value')));await page.locator('#destination').selectOption('forest');await k.click('[data-special="expedition"]');
 await k.person('amu');card=await page.locator('#situation-card').textContent();assert.match(card,/遠征隊/);await k.log('expedition-card',{card:card.slice(0,160)});await k.shot('03-expedition-owner-card');
 await page.locator('[data-sit]',{hasText:'全隊取消出發'}).click();let w=await k.snap();assert.equal(w.expedition.phase,'cancelled');card=await page.locator('#situation-card').textContent();assert.doesNotMatch(card,/遠征隊/);await k.log('expedition-cancel-from-card',{toast:await k.toast()});await k.shot('04-card-after-cancel');
 await k.person('lin');await page.locator('details[data-section="class"] summary').click();for(const box of await page.locator('input[name=pupil]').all())await box.setChecked(['amu','shen'].includes(await box.getAttribute('value')));await k.click('[data-action="startClass"]');w=await k.snap();assert.ok(w.people.amu.classSession,'class started via UI: '+await k.toast());
 await k.person('amu');card=await page.locator('#situation-card').textContent();assert.match(card,/同堂授課/);await k.shot('05-student-card');await page.locator('[data-sit]',{hasText:'退出同堂'}).click();w=await k.snap();assert.equal(w.people.amu.classSession,null);assert.ok(w.people.shen.classSession,'only the student left');await k.log('student-left-from-card');
 await k.person('lin');await page.locator('[data-sit]',{hasText:'結束同堂'}).click();w=await k.snap();assert.equal(w.people.shen.classSession,null);await k.log('teacher-ended-from-card');
 // Spar for a visible combat state, then restore autonomy for everyday states
 for(const id of['leader','amu','lin','shen']){await k.person(id);if(!(await k.snap()).people[id].auto)await k.click('[data-action="toggleAuto"]');await k.click('[data-action="resume"]');}
 await k.person('amu');await page.locator('details[data-section="social"] summary').click();await page.locator('#target').selectOption('shen');await k.click('[data-action="spar"]');await k.log('spar-ordered',{toast:await k.toast()});
 await hidePanel();await k.click('[data-speed="4"]');await k.pause(false);const t0=Date.now();while(Date.now()-t0<150000&&want.some(g=>!seen[g])){await collect(String(Math.round((Date.now()-t0)/1000)));await page.waitForTimeout(400);}await k.pause(true);await k.log('panel-hidden-states',{seen});
 await k.shot('06-panel-hidden');await k.click('#follow');await k.click('#roof');await k.shot('07-follow-roof');await k.log('follow-roof',{status:await k.status()});
 const before=(await k.status()).lowMotion;await k.tab('save');await k.click('#low-motion');const after=(await k.status()).lowMotion;await hidePanel();assert.notEqual(before,after);await k.pause(false);await page.waitForTimeout(1500);await k.pause(true);await k.shot('08-low-motion');await k.log('low-motion',{before,after});
 assert.ok(want.every(g=>seen[g]),'all five states visible with panel hidden: '+JSON.stringify(seen));
}catch(e){failure=e.stack;await k.shot('failure').catch(()=>{});}
const s=await k.finish({label,viewport:[width,height],failure,statesSeen:seen});console.log(failure?'FAILED':'PASSED',s.wallSeconds);if(failure){console.error(failure);process.exit(1);}
