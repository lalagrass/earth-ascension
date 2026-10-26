// One cumulative official Cloud flow; ordinary UI and original clock only.
import { createRequire } from 'node:module';
import { spawn,execFileSync } from 'node:child_process';
import { mkdir,writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sect=new URL('../../',import.meta.url).pathname,out=new URL('../evidence/',import.meta.url);
await mkdir(out,{recursive:true});
const result={checkpoint:execFileSync('git',['rev-parse','HEAD'],{cwd:sect,encoding:'utf8'}).trim(),viewport:{width:1440,height:1000},checks:[],errors:[],screenshots:[]};
const port=Number(process.env.EVENT_TEST_PORT||8819),origin=`http://127.0.0.1:${port}`;let browser,page,server;
const snap=()=>page.evaluate(()=>demo.snapshot()),wait=fn=>page.waitForFunction(fn,undefined,{timeout:100000,polling:30});
const check=(ok,name)=>{assert.ok(ok,name);result.checks.push(name);console.log('PASS',name);};
async function pause(){if((await snap()).playing)await page.click('#play');}
async function facility(key){await page.click('[data-view="yard"]');const s=await snap(),p=s[key+'Screen'];await page.mouse.click(p.x,p.y);await page.waitForSelector('#menu:not([hidden])');}
async function shot(name){await page.screenshot({path:new URL(name,out).pathname});result.screenshots.push(name);}
try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});result.browser=browser.version();
 server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory',sect],{stdio:'ignore'});
 for(let n=0;n<30;n++){try{if((await fetch(origin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}if(server.exitCode!==null)throw Error('Owned server failed');
 page=await browser.newPage({viewport:result.viewport});page.on('pageerror',e=>result.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});
 await page.goto(origin);await wait(()=>window.demo?.snapshot().frames>3);await pause();await page.click('#reset');
 check(new URL(page.url()).pathname==='/experiments/water-carry/demo/','single official entry combines prior public slices');
 await page.click('#roster [data-person="hero"]');check((await page.locator('.public-action').innerText()).includes('真實原因'),'selected real person shows native current action and reason');
 const before=await page.evaluate(()=>demo.exportState());
 await page.click('#panel [data-tab="martial"]');check((await page.locator('.public-martial').innerText()).includes('已學既有第一式'),'original learned palm remains visible');await page.click('#panel [data-tab="life"]');
 await page.click('#panel [data-event-filter="work"]');assert.deepEqual(await page.evaluate(()=>demo.exportState()),before);result.checks.push('paused cards and event filter leave authority unchanged');
 // Facility commands are the same native commands introduced in #349.
 await facility('vat');await page.click('#menu [data-cmd="work:water"]');
 await page.click('#roster [data-person="cousin"]');await facility('rack');await page.click('#menu [data-cmd="work:herb"]');
 let s=await snap();check(s.tick===0&&s.people.cousin.done.herb===0,'facility reassignment at pause neither moves nor delivers');
 check(s.people.hero.tripSpeeds.empty<s.people.cousin.tripSpeeds.empty&&s.lengths.water>1650,'true native long route and distinct two-person speeds retained');
 result.start={tick:s.tick,lengths:s.lengths,heroSpeed:s.people.hero.tripSpeeds,cousinSpeed:s.people.cousin.tripSpeeds};
 await page.click('[data-speed="4"]');await page.click('#play');
 await wait(()=>{const s=demo.snapshot();return s.people.cousin.done.herb>=1&&s.people.hero.done.water===0;});await pause();s=await snap();
 check(s.people.hero.phase!=='idle'&&s.herbs>0,'herbs really delivered while slow long water commute continues');result.firstDelivery={tick:s.tick,hero:{phase:s.people.hero.phase,x:s.people.hero.x,y:s.people.hero.y,water:s.people.hero.done.water},cousin:{herb:s.people.cousin.done.herb},herbs:s.herbs};
 await page.locator('#panel [data-event-filter="work"]').click();
 check((await page.locator('.public-events').innerText()).includes('完成一趟採藥'),'recent record reflects true original herb completion');
 const rows=await page.locator('.public-events li').count();check(rows<=24,'visible recent list obeys 24-row cap');
 await page.locator('.public-events [data-event-facility="rack"]').first().click();check((await snap()).menu==='rack','event links to actual supported facility');await page.click('#menu [data-facility-card="cousin"]');
 await page.locator('.public-events [data-event-actor="cousin"]').first().click();check((await snap()).selected==='cousin','event links back to original person card');
 await page.locator('.public-events').scrollIntoViewIfNeeded();await shot('official-herb-recent.jpg');
 await page.click('#play');await wait(()=>demo.snapshot().people.hero.done.water>=1);await pause();s=await snap();
 result.waterDelivered={tick:s.tick,vat:s.vat,herbs:s.herbs,heroDone:s.people.hero.done.water};check(s.vat>3,'true water trip updates original vat');
 await page.click('#roster [data-person="hero"]');await page.locator('#panel [data-event-filter="work"]').click();
 check((await page.locator('.public-events').innerText()).includes('完成一趟挑水'),'person selection filters original water completion');
 const final=await page.evaluate(()=>demo.exportState()),ids=(await snap()).recentEvents.map(e=>e.id);
 await page.click('#panel [data-event-filter="martial"]');check((await snap()).recentEvents.every(e=>e.category==='martial'),'martial filter never substitutes nearby work as training');
 await page.click('#panel [data-event-filter="work"]');await page.waitForTimeout(100);assert.deepEqual((await snap()).recentEvents.map(e=>e.id),ids);assert.deepEqual(await page.evaluate(()=>demo.exportState()),final);result.checks.push('repeated paused render neither duplicates events nor changes world');
 await page.locator('.public-events').scrollIntoViewIfNeeded();await shot('official-water-recent.jpg');
 // The cumulative flow accepts completed existing work; #350 training evidence
 // is reused, and native training events are verified in the targeted tests.
 await page.click('#reset');check((await snap()).recentEvents.length===0&&(await snap()).eventCacheSize===0,'reset removes previous run presentation without core history edits');
 assert.deepEqual(result.errors,[]);result.passed=true;
}catch(e){result.passed=false;result.failure=e.stack||String(e);process.exitCode=1;if(page){result.snapshot=await snap().catch(()=>null);await page.screenshot({path:'/tmp/events351-failure.jpg'}).catch(()=>{});}}
finally{
 if(page&&!page.isClosed()){await pause().catch(()=>{});await page.setViewportSize(result.viewport).catch(()=>{});await page.close();}await browser?.close();
 if(server&&server.exitCode===null&&server.signalCode===null){server.kill('SIGTERM');await new Promise(r=>server.once('exit',r));}
 result.cleanup={pageClosed:!page||page.isClosed(),browserClosed:!browser||!browser.isConnected(),serverStopped:!server||server.exitCode!==null||server.signalCode!==null,viewport:'owned viewport restored then browser closed'};
 await writeFile(new URL('desktop-results.json',out),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:result.passed,checks:result.checks.length,failure:result.failure,cleanup:result.cleanup}));
}
