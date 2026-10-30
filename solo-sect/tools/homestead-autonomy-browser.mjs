import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const {chromium}=await import('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const milestone=process.argv[2]||'A01',until=Number(process.argv[3]||260),personality=process.argv[4]||'quiet',requireTaste=process.argv[5]||null;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],events=[],images=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8804/homestead.html');await page.fill('#name','獨居試居');await page.selectOption('#personality',personality);await page.click('#begin');await page.click('[data-speed="0"]');
 await page.screenshot({path:`/workspace/earth-ascension/solo-sect/shots/autonomy-${milestone}-start.png`});
 let last='',minH=100,minE=100,restUsed=false;
 await page.click('[data-speed="16"]');
 while(true){await page.waitForTimeout(180);const s=await page.evaluate(()=>structuredClone(window.__homestead));assert.ok(s.autonomy);minH=Math.min(minH,s.person.hunger);minE=Math.min(minE,s.person.energy);if(s.fac.hut.stage&&s.person.task?.act==='rest')restUsed=true;
  const key=JSON.stringify([s.autonomy.goal,Object.values(s.fac).map(f=>f.stage)]);if(key!==last){events.push({t:s.t,goal:s.autonomy.goal,fac:Object.fromEntries(Object.entries(s.fac).map(([k,f])=>[k,f.stage]))});last=key;}
  const satisfied=requireTaste==='settled'?s.autonomy.completed.filter(id=>['stew','herbs','personalize'].includes(id)).length>=s.autonomy.interestLimit&&!s.autonomy.goal&&!s.autonomy.waiting&&!s.autonomy.recess&&s.autonomy.tastes.salad>0:requireTaste==='herbs'?s.autonomy.completed.includes('herbs'):s.autonomy.tastes?.[requireTaste]>0;
  if(s.t>=until&&(!requireTaste||satisfied))break;
  assert.ok(s.t<until+2400,'expected taste did not occur within bounded extra10 days');
 }
 await page.click('[data-speed="0"]');const state=await page.evaluate(()=>structuredClone(window.__homestead));assert.ok(state.fac.hut.stage>=1);assert.ok(minH>0);assert.equal(errors.length,0);
 const t=state.t;await page.waitForTimeout(700);assert.equal(await page.evaluate(()=>window.__homestead.t),t);
 await page.locator('#land').scrollIntoViewIfNeeded();await page.screenshot({path:`/workspace/earth-ascension/solo-sect/shots/autonomy-${milestone}-home.png`});
 await page.locator('#next-step').scrollIntoViewIfNeeded();await page.screenshot({path:`/workspace/earth-ascension/solo-sect/shots/autonomy-${milestone}-plan.png`});
 await page.setViewportSize({width:390,height:844});await page.locator('#next-step').scrollIntoViewIfNeeded();await page.screenshot({path:`/workspace/earth-ascension/solo-sect/shots/autonomy-${milestone}-narrow.png`});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);
 let compatUI=null;
 if(milestone==='A20-diligent'){
  await paceForCompat();
  const compatState=await page.evaluate(()=>JSON.stringify(window.__homestead));await page.click('#save');
  const storageBefore=await page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(localStorage))));
  await page.click('#transfer-preview');const previewText=await page.locator('#transfer-detail').innerText();assert.match(previewText,/v4/);assert.match(previewText,/配色/);await page.click('#transfer-cancel');
  assert.equal(await page.evaluate(()=>JSON.stringify(window.__homestead)),compatState);assert.equal(await page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(localStorage)))),storageBefore);
  compatUI={phase:'AFTER zero-input journey, separate existing-save/preview compatibility only',actions:['speed4 to safe leisure','pause','existing save','existing preview','cancel'],previewText,worldUnchanged:true,storageUnchangedOnPreviewCancel:true};

 }
 async function paceForCompat(){await page.click('[data-speed="4"]');await page.waitForFunction(()=>{const s=window.__homestead;return !s.person.carry&&!Object.values(s.fac).some(f=>f.site)&&s.person.task?.act==='leisure'&&s.person.task.phase==='do';},undefined,{timeout:60000});await page.click('[data-speed="0"]');}
 const result={milestone,personality,mode:'normal UI; only new-game/start/speed controls; no orders, blueprints, injection',speed:16,worldEnd:t,compatUI,observedMinH:minH,observedMinE:minE,restUsed,events,errors,state};
 await fs.writeFile(`/workspace/earth-ascension/solo-sect/AUTONOMY-${milestone}-UI.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,state:undefined}));
}finally{await browser.close();}
