// Normal UI only. Select an allowed installed Playwright/browser via environment.
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const {chromium}=await import(process.env.HOMESTEAD_PLAYWRIGHT||'playwright');
const round=process.argv[2]||'R12',browser=await chromium.launch({executablePath:process.env.HOMESTEAD_CHROMIUM||undefined,headless:true,args:['--no-sandbox']});
try{
 const p=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto((process.env.HOMESTEAD_URL||'http://127.0.0.1:8804')+'/homestead.html?frontier');
 await p.selectOption('#frontier-approach','peace');await p.click('#begin');await p.click('[data-speed="16"]');
 await p.waitForFunction(()=>window.__homestead.t>=50);await p.click('[data-speed="0"]');
 const s=await p.evaluate(()=>structuredClone(window.__homestead));await p.waitForTimeout(300);assert.equal(await p.evaluate(()=>window.__homestead.t),s.t);
 assert.equal(s.version,5);assert.equal(s.person.order,null);assert.deepEqual(errors,[]);
 await p.screenshot({path:`shots/frontier-${round}.png`});await p.setViewportSize({width:390,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await fs.writeFile(`FRONTIER-${round}-UI.json`,JSON.stringify({round,normalUI:true,noWorldInjection:true,t:s.t,hut:s.fac.hut.stage,activity:s.person.task,errors,pausedStable:true,narrowOverflow:false},null,2)+'\n');console.log(round+' UI passed');
}finally{await browser.close();}
