import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const {chromium}=await import('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const b=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']}),p=await b.newPage({viewport:{width:390,height:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto('http://127.0.0.1:8804/homestead.html');await p.selectOption('#personality','sociable');await p.locator('#begin').focus();await p.keyboard.press('Enter');await p.click('[data-speed="0"]');
 await p.locator('#life-direction').focus();await p.keyboard.press('c');await p.selectOption('#life-direction','comfort');
 const start=await p.evaluate(()=>structuredClone(window.__homestead));assert.equal(start.autonomy.direction,'comfort');
 await p.click('[data-speed="16"]');await p.waitForFunction(()=>window.__homestead.t>=450,undefined,{timeout:70000});await p.click('[data-speed="0"]');
 const before=await p.evaluate(()=>structuredClone(window.__homestead));assert.equal(before.autonomy.goal,'comfort');const id=Object.entries(before.fac).find(([,f])=>f.site)?.[0];assert.ok(id);
 await p.locator('#defer-goal').focus();await p.keyboard.press('Enter');const held=await p.evaluate(()=>structuredClone(window.__homestead));assert.equal(held.fac[id].site.paused,true);assert.deepEqual(held.stock,before.stock);
 await p.click('#save');await p.click('#load');const loaded=await p.evaluate(()=>structuredClone(window.__homestead));assert.deepEqual(loaded,held);
 await p.click('[data-speed="16"]');await p.waitForFunction(t=>window.__homestead.t>=t+200,held.t,{timeout:40000});await p.click('[data-speed="0"]');const after=await p.evaluate(()=>structuredClone(window.__homestead));assert.deepEqual(after.fac[id].site,held.fac[id].site);assert.ok(after.person.hunger>0);
 await p.locator('#next-step').scrollIntoViewIfNeeded();await p.screenshot({path:'/workspace/earth-ascension/solo-sect/shots/autonomy-A08-controls.png'});const time=after.t;await p.waitForTimeout(500);assert.equal(await p.evaluate(()=>window.__homestead.t),time);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
 const result={case:'MANUAL direction and veto, not autonomous no-input acceptance',inputs:['start sociable','comfort direction','speed16','pause','Enter veto','save/load existing UI','speed16','pause'],initialWorld:start.t,heldAt:held.t,afterAt:after.t,paused:id,errors,state:after};await fs.writeFile('/workspace/earth-ascension/solo-sect/AUTONOMY-A08-UI.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,state:undefined}));
}finally{await b.close();}
