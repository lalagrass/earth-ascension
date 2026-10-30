import fs from'node:fs/promises';import assert from'node:assert/strict';
const{chromium}=await import(process.env.HOMESTEAD_PLAYWRIGHT||'playwright');const round=process.argv[2]||'R14';const b=await chromium.launch({executablePath:process.env.HOMESTEAD_CHROMIUM,headless:true,args:['--no-sandbox']});
try{const p=await b.newPage({viewport:{width:1440,height:1000}}),errors=[],events=[];p.on('pageerror',e=>errors.push(e.message));const read=()=>p.evaluate(()=>structuredClone(window.__homestead));
await p.goto((process.env.HOMESTEAD_URL||'http://127.0.0.1:8804')+'/homestead.html?frontier');await p.selectOption('#frontier-approach','peace');await p.click('#begin');await p.click('[data-speed="16"]');
await p.waitForFunction(()=>window.__homestead.frontier.threat.phase==='warning',undefined,{timeout:140000});assert.equal(await p.locator('[data-speed="1"]').getAttribute('aria-pressed'),'true');assert.match(await p.locator('#event-slow-note').innerText(),/預警/);events.push({kind:'warning',t:(await read()).t});
await p.uncheck('#watch-events');await p.click('[data-speed="16"]');await p.waitForFunction(()=>window.__homestead.frontier.trip.phase==='source',undefined,{timeout:100000});assert.equal(await p.locator('[data-speed="16"]').getAttribute('aria-pressed'),'true');events.push({kind:'source while disabled',t:(await read()).t});
await p.click('[data-speed="0"]');const before=await read();await p.check('#watch-events');await p.waitForTimeout(200);assert.equal((await read()).t,before.t);await p.click('[data-speed="16"]');
await p.waitForFunction(()=>window.__homestead.frontier.source.cleared,undefined,{timeout:30000});assert.equal(await p.locator('[data-speed="1"]').getAttribute('aria-pressed'),'true');events.push({kind:'clear',t:(await read()).t});await p.screenshot({path:'shots/frontier-R14-clear.png'});
await p.click('[data-speed="16"]');await p.waitForFunction(()=>window.__homestead.frontier.trip.returns===1);assert.equal(await p.locator('[data-speed="1"]').getAttribute('aria-pressed'),'true');events.push({kind:'home',t:(await read()).t});await p.click('[data-speed="0"]');
assert.deepEqual(errors,[]);await p.setViewportSize({width:390,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await p.screenshot({path:'shots/frontier-R14-narrow.png'});
if(round==='R15'){
 await p.locator('#frontier-history>summary').click();assert.equal(await p.locator('#frontier-events li').count(),6);await p.screenshot({path:'shots/frontier-R15-history.png'});
 const before=await read();await p.click('#save');await p.click('#load');assert.deepEqual(await read(),before);assert.equal(await p.locator('#event-slow-note').innerText(),'');assert.equal(await p.locator('#frontier-events li').count(),0);assert.match(await p.locator('#frontier-history-summary').innerText(),/探行1\/1/);
 await p.click('#new');await p.uncheck('#frontier-mode');await p.click('#begin');assert.equal((await read()).version,4);assert.equal(await p.locator('#event-slow-note').isHidden(),true);assert.equal(await p.locator('#event-slow-note').textContent(),'');
}
await fs.writeFile(`FRONTIER-${round}-UI.json`,JSON.stringify({normalUI:true,noWorldInjection:true,events,final:await read(),errors,disabledKeeps16:true,pausedStable:true},null,2)+'\n');console.log({round,events,resetVerified:round==='R15'});
}finally{await b.close();}
