import {createRequire} from 'node:module';import {spawn,execFileSync} from 'node:child_process';import {mkdir,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=new URL('../evidence/',import.meta.url),sect=new URL('../../',import.meta.url).pathname;await mkdir(out,{recursive:true});
const result={checkpoint:execFileSync('git',['rev-parse','HEAD'],{cwd:sect,encoding:'utf8'}).trim(),viewport:{width:1440,height:1000},checks:[],errors:[],screenshots:[]};
const port=Number(process.env.INTENT_TEST_PORT||8821),origin=`http://127.0.0.1:${port}`;let page,context,browser,server;
const check=(ok,label)=>{assert.ok(ok,label);result.checks.push(label);console.log('PASS',label);},snap=()=>page.evaluate(()=>demo.snapshot());
const wait=fn=>page.waitForFunction(fn,undefined,{polling:50,timeout:120000});const pause=async()=>{if((await snap()).playing)await page.click('#play');};
const click=async key=>page.locator(`#panel [data-intent-command="${key}"]`).click();
async function shot(name){const intent=page.locator('.public-intent');if(await intent.count())await intent.scrollIntoViewIfNeeded();await page.screenshot({path:new URL(name,out).pathname});result.screenshots.push(name);}
try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});result.browser=browser.version();
 server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory',sect],{stdio:'ignore'});for(let i=0;i<30;i++){try{if((await fetch(origin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}if(server.exitCode!==null)throw Error('Owned server failed');
 context=await browser.newContext({viewport:result.viewport});page=await context.newPage();page.on('pageerror',e=>result.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});
 await page.goto(origin);await wait(()=>window.demo?.snapshot().frames>3);await pause();await page.click('#reset');await page.click('#roster [data-person="cousin"]');await click('dispatch:restAfterTrip');await page.click('#roster [data-person="hero"]');await click('dispatch:work:herb');
 check(new URL(page.url()).pathname==='/experiments/water-carry/demo/','single official entry with shared intent control');
 await page.click('[data-speed="4"]');await page.click('#play');await wait(()=>demo.snapshot().people.hero.mode==='carry');await pause();
 await click('dispatch:work:water');check((await snap()).people.hero.pending==='water','native single pending is reassign-to-water');
 await page.locator('.public-intent details[data-view-key="intent"] > summary').click();await shot('official-single-pending.jpg');
 await click('dispatch:cancel');check((await snap()).people.hero.pending===null,'native cancel removes only the original pending');
 await page.click('#panel [data-ui="toggleAdv"]');await click('policy:guard:allow');let s=await snap();check(s.people.hero.auto.allow&&!s.people.cousin.auto.allow,'original guard setter changes only bound hero');
 await click('policy:guard:late');await shot('official-policy-source.jpg');await click('policy:guard:allow');
 const frozen=await page.evaluate(()=>demo.exportState());await page.click('#roster [data-person="cousin"]');check((await page.locator('.public-intent details').evaluate(e=>e.open))===false,'other person has independent intent expansion');
 check(await page.locator('.adv-body').evaluate(e=>e.hidden),'other person has independent advanced policy expansion');
 check(await page.locator('#p-cmds [data-intent-actor="cousin"]').count()>0&&await page.locator('#p-cmds [data-intent-actor="hero"]').count()===0,'switch renders only current actor command bindings');
 await page.click('#roster [data-person="hero"]');assert.deepEqual(await page.evaluate(()=>demo.exportState()),frozen);result.checks.push('paused person switch and view state leave complete original authority unchanged');
 check(await page.locator('.public-intent details').evaluate(e=>e.open),'returning hero recovers its own expansion');
 await page.click('#play');await page.locator('.public-intent details[data-view-key="intent"] > summary').focus();await page.waitForTimeout(900);
 check(await page.locator('.public-intent details').evaluate(e=>e.open)&&await page.evaluate(()=>document.activeElement?.matches('.public-intent summary')),'live intent update keeps expansion and summary focus');
 await wait(()=>demo.snapshot().people.hero.rest==='auto');await pause();s=await snap();check(s.people.hero.intent.fields.rest.value==='自主恢復'&&!s.people.hero.resting,'true low-energy recovery is distinct from manual stop');
 result.autoRecovery={tick:s.tick,energy:s.people.hero.energy,rest:s.people.hero.rest,trips:s.people.hero.trips};await shot('official-auto-recovery.jpg');
 await page.click('#play');await wait(()=>{const p=demo.snapshot().people.hero;return p.rest===null&&p.mode==='carry';});await pause();check((await snap()).people.hero.rest===null,'native auto recovery actually resumes original work');
 await click('dispatch:restAfterTrip');check((await snap()).people.hero.pending==='rest','manual stop remains the one native pending');await page.click('#play');
 await wait(()=>{const p=demo.snapshot().people.hero;return p.rest==='manual'&&p.mode==='seated'&&p.energy===100;});s=await snap();const trips=s.people.hero.trips;await page.waitForTimeout(600);await pause();s=await snap();
 check(s.people.hero.trips===trips&&s.people.hero.rest==='manual'&&s.people.hero.energy===100,'explicit stop remains stopped after full recovery');
 result.manualStop={tick:s.tick,energy:s.people.hero.energy,trips:s.people.hero.trips};await shot('official-manual-stop.jpg');
 check((await page.locator('.public-intent').innerText()).includes('回滿也不續工'),'shared panel exposes native manual-stop guarantee');
 await click('dispatch:start');check((await snap()).people.hero.rest!=='manual'&&(await snap()).people.cousin.rest==='manual','original start clears only selected hero stop');
 await page.goto(origin+'/intent-view/checks/gpt.html');await wait(()=>window.intentHarness);
 await page.locator('.public-intent details[data-view-key="intent"] > summary').click();check((await page.locator('.public-intent').innerText()).includes('原生pendingCommands'),'same HTML renderer preserves second-core native queue distinction');
 const c=await page.evaluate(()=>intentHarness.snapshot().commands.find(c=>c.nativeId==='stop'));
 await page.locator('[data-intent-command]').filter({hasText:'停工'}).click();check(await page.evaluate(()=>intentHarness.world().people.leader.manualStop),'same renderer sends a true original GPT stop command');
 await page.click('#play');await page.waitForTimeout(300);await page.click('#play');check(await page.evaluate(()=>intentHarness.world().people.leader.manualStop),'GPT manual stop retains its original persistent intent');
 await shot('gpt-native-intent.jpg');
 await page.locator('[data-intent-command]').filter({hasText:'恢復自主'}).click();check(!(await page.evaluate(()=>intentHarness.world().people.leader.manualStop)),'GPT native resume uses original command payload');
 result.gpt={stopPayload:c.payload,snapshot:await page.evaluate(()=>intentHarness.snapshot())};assert.deepEqual(result.errors,[]);result.passed=true;
}catch(e){result.passed=false;result.failure=e.stack||String(e);process.exitCode=1;if(page)await page.screenshot({path:'/tmp/intent359-failure.jpg'}).catch(()=>{});}
finally{
 if(page&&!page.isClosed()){await page.evaluate(()=>{if(window.demo?.snapshot().playing)document.getElementById('play').click();window.intentHarness?.pause();}).catch(()=>{});await page.setViewportSize(result.viewport).catch(()=>{});await page.close();}await context?.close();await browser?.close();if(server&&server.exitCode===null&&server.signalCode===null){server.kill('SIGTERM');await new Promise(r=>server.once('exit',r));}
 result.cleanup={pageClosed:!page||page.isClosed(),contextClosed:!context||context.pages().length===0,browserClosed:!browser||!browser.isConnected(),serverStopped:!server||server.exitCode!==null||server.signalCode!==null,viewport:'owned viewport restored then context closed'};
 await writeFile(new URL('desktop-results.json',out),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:result.passed,checks:result.checks.length,failure:result.failure,cleanup:result.cleanup}));
}
