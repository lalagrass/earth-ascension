// One Cloud page/context/server; official commands and original clock only.
import {createRequire} from 'node:module';
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=new URL('../evidence/',import.meta.url),sect=new URL('../../',import.meta.url).pathname;
await mkdir(out,{recursive:true});
const result={checkpoint:execFileSync('git',['rev-parse','HEAD'],{cwd:sect,encoding:'utf8'}).trim(),viewport:{width:1440,height:1000},checks:[],errors:[],screenshots:[]};
const port=Number(process.env.RESOURCE_TEST_PORT||8821),origin=`http://127.0.0.1:${port}`;let browser,context,page,server;
const check=(v,label)=>{assert.ok(v,label);result.checks.push(label);console.log('PASS',label);},snap=()=>page.evaluate(()=>demo.snapshot());
const wait=fn=>page.waitForFunction(fn,undefined,{polling:50,timeout:100000});
const pause=async()=>{if((await snap()).playing)await page.click('#play');};
const actor=id=>page.click(`#roster [data-person="${id}"]`);
const row=id=>page.locator(`#resources [data-resource="${id}"]`);
async function shot(name){await page.screenshot({path:new URL(name,out).pathname});result.screenshots.push(name);}
try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});result.browser=browser.version();
 server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory',sect],{stdio:'ignore'});
 for(let i=0;i<30;i++){try{if((await fetch(origin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}if(server.exitCode!==null)throw Error('Owned server failed');
 context=await browser.newContext({viewport:result.viewport});page=await context.newPage();page.on('pageerror',e=>result.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});
 await page.goto(origin);await wait(()=>window.demo?.snapshot().frames>3);await pause();await page.click('#reset');
 check(new URL(page.url()).pathname==='/experiments/water-carry/demo/','single official player entry');
 for(const id of ['hero','cousin']){await actor(id);await page.click('#p-cmds [data-cmd="restAfterTrip"]');}
 await actor('hero');await page.click('#resource-toggle');await row('water').locator(':scope > summary').click();await row('herb').locator(':scope > summary').click();
 check((await row('herb').innerText()).includes('0 份'),'known zero herb remains listed with original unit and source link');
 const paused=await page.evaluate(()=>demo.exportState());await page.waitForTimeout(100);assert.deepEqual(await page.evaluate(()=>demo.exportState()),paused);result.checks.push('opening resources and paused inspection do not mutate world');
 await row('water').locator('[data-resource-link="vat"]').click();await page.waitForSelector('#menu:not([hidden])');
 check((await page.locator('#menu').innerText()).includes('在途')&&!(await page.locator('#menu').innerText()).includes('在途預約'),'water link opens existing facility with corrected incoming wording');
 await page.click('#menu [data-cmd="work:water"]');await actor('cousin');await row('herb').locator('[data-resource-link="rack"]').click();await page.click('#menu [data-cmd="work:herb"]');
 await page.click('[data-speed="4"]');await page.click('#play');await row('water').locator(':scope > summary').focus();
 await wait(()=>demo.snapshot().inFlight>0&&demo.snapshot().herbInFlight>0);const first=await snap();
 check(first.resources.find(r=>r.nativeId==='water').fields.incoming.value===first.inFlight,'water incoming reads native inFlight without entering stock');
 check(first.resources.find(r=>r.nativeId==='herb').fields.reserved.value===0,'herb incoming is separate from true consumption reservation');
 await page.waitForTimeout(900);
 check(await row('water').evaluate(e=>e.open)&&await row('herb').evaluate(e=>e.open),'resource expansion remains stable while original world plays');
 check(await page.evaluate(()=>document.activeElement?.matches('[data-resource="water"] > summary')),'resource summary focus survives live refresh');
 await wait(()=>{const s=demo.snapshot();return s.people.hero.done.water>0&&s.people.cousin.done.herb>0;});await pause();
 const delivered=await snap();result.delivered={tick:delivered.tick,water:delivered.resources[0].fields,herb:delivered.resources[1].fields};
 check(delivered.vat>3&&delivered.herbs>0,'original water/herb long routes actually deliver into original stores');
 await page.locator('#resources').evaluate(e=>e.scrollTop=0);await shot('official-resource-delivery.jpg');
 await actor('hero');await page.click('#p-cmds [data-cmd="tea"]');await page.click('#play');await wait(()=>demo.snapshot().people.hero.mode==='brew');await pause();
 const brew=await snap(),water=brew.resources.find(r=>r.nativeId==='water'),herb=brew.resources.find(r=>r.nativeId==='herb');result.brew={tick:brew.tick,water:water.fields,herb:herb.fields};
 check(water.fields.reserved.value===1&&herb.fields.reserved.value===1,'original tea seat reserves water/herb once at brew');
 check(water.fields.available.value===water.fields.amount.value-1&&herb.fields.available.value===herb.fields.amount.value-1,'original tea available matches held consumption and never subtracts incoming again');
 await page.locator('#resources').evaluate(e=>e.scrollTop=0);await shot('official-resource-tea-held.jpg');
 await page.click('#p-cmds [data-cmd="teaCancel"]');const cancelled=await snap();
 check(cancelled.vat===brew.vat&&cancelled.herbs===brew.herbs&&cancelled.resources[0].fields.reserved.value===0,'native cancellation releases holds without spending stored resources');
 await row('herb').locator(':scope > summary').click();await row('wood').locator(':scope > summary').click();await row('wood').locator('[data-resource-link="dorm"]').click();
 check((await snap()).cam.zoom!==brew.cam.zoom,'wood resource link uses existing dorm camera and original person operations');
 // Same page, explicit development proof over the already fixed second core.
 await page.goto(origin+'/resource-view/checks/gpt.html');await wait(()=>window.resourceProof);
 for(const id of ['water','herb','wood'])await row(id).locator(':scope > summary').click();
 for(let n=0;n<8&&!await page.evaluate(()=>resourceProof.snapshot().delivered);n++)await page.click('#step');
 const gpt=await page.evaluate(()=>resourceProof.snapshot());result.gpt=gpt;
 check(gpt.delivered>0,'second fixed real GPT core harvests and returns to original warehouse');
 check(gpt.resources.every(r=>r.fields.incoming.availability==='unsupported'&&r.unit.includes('原生計數')),'same renderer preserves second-core native count and missing incoming capability');
 await page.locator('#resources').evaluate(e=>e.scrollTop=0);await page.evaluate(()=>scrollTo(0,0));await shot('gpt-resource-source.jpg');
 assert.deepEqual(result.errors,[]);result.passed=true;
}catch(e){result.passed=false;result.failure=e.stack||String(e);process.exitCode=1;if(page)await page.screenshot({path:'/tmp/resource358-failure.jpg'}).catch(()=>{});}
finally{
 if(page&&!page.isClosed()){await pause().catch(()=>{});await page.setViewportSize(result.viewport).catch(()=>{});await page.close();}await context?.close();await browser?.close();
 if(server&&server.exitCode===null&&server.signalCode===null){server.kill('SIGTERM');await new Promise(r=>server.once('exit',r));}
 result.cleanup={pageClosed:!page||page.isClosed(),contextClosed:!context||context.pages().length===0,browserClosed:!browser||!browser.isConnected(),serverStopped:!server||server.exitCode!==null||server.signalCode!==null,viewport:'owned viewport restored then context closed'};
 await writeFile(new URL('desktop-results.json',out),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:result.passed,checks:result.checks.length,failure:result.failure,cleanup:result.cleanup}));
}
