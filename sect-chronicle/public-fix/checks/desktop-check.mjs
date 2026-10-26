import {createRequire} from 'node:module';
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=new URL('../evidence/',import.meta.url),sect=new URL('../../',import.meta.url).pathname;
await mkdir(out,{recursive:true});
const result={checkpoint:execFileSync('git',['rev-parse','HEAD'],{cwd:sect,encoding:'utf8'}).trim(),viewport:{width:1440,height:1000},checks:[],errors:[],screenshots:[]};
const port=Number(process.env.PUBLIC_FIX_TEST_PORT||8819),origin=`http://127.0.0.1:${port}`;let browser,context,page,server;
const check=(v,label)=>{assert.ok(v,label);result.checks.push(label);console.log('PASS',label);},snap=()=>page.evaluate(()=>demo.snapshot());
const wait=fn=>page.waitForFunction(fn,undefined,{polling:50,timeout:120000});
const pause=async()=>{if((await snap()).playing)await page.click('#play');};
async function shot(name){await page.screenshot({path:new URL(name,out).pathname});result.screenshots.push(name);}
async function actor(id){await page.click(`#roster [data-person="${id}"]`);}
try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});result.browser=browser.version();
 server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory',sect],{stdio:'ignore'});
 for(let i=0;i<30;i++){try{if((await fetch(origin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}if(server.exitCode!==null)throw Error('Owned server failed');
 context=await browser.newContext({viewport:result.viewport});page=await context.newPage();page.on('pageerror',e=>result.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});
 await page.goto(origin);await wait(()=>window.demo?.snapshot().frames>3);await pause();await page.click('#reset');await actor('hero');
 check(new URL(page.url()).pathname==='/experiments/water-carry/demo/','single official player entry');
 const baseline=await page.evaluate(()=>{const d=document.createElement('div');d.innerHTML='<details open><summary>baseline</summary><p>1</p></details>';document.body.append(d);d.querySelector('summary').focus();d.innerHTML='<details><summary>baseline</summary><p>2</p></details>';const lost=!d.querySelector('details').open&&document.activeElement!==d.querySelector('summary');d.remove();return lost;});check(baseline,'F3 baseline raw innerHTML demonstrably loses open and summary focus');
 await page.click('#p-cmds [data-cmd="restAfterTrip"]');await actor('cousin');await page.click('#p-cmds [data-cmd="work:herb"]');await page.click('[data-speed="4"]');await page.click('#play');
 await page.click('#panel [data-tab="martial"]');await page.locator('.public-fields summary').click();await page.locator('.public-martial summary').click();
 const before=await snap();await page.waitForTimeout(1400);const after=await snap();
 check(after.tick>before.tick&&after.people.cousin.energy<before.people.cousin.energy,'F3 original work and energy continue while inspecting');
 check(await page.locator('.public-fields').evaluate(e=>e.open)&&await page.locator('.public-martial details').evaluate(e=>e.open),'F3 both details stay expanded through live value updates');
 check(await page.evaluate(()=>document.activeElement?.matches('.public-martial summary')),'F3 summary focus survives HTML refresh');
 await pause();await shot('official-live-details.jpg');
 await actor('hero');check(!(await page.locator('.public-fields').evaluate(e=>e.open))&&!(await page.locator('.public-martial details').evaluate(e=>e.open)),'F3 new person does not inherit previous open state');
 await actor('cousin');check(await page.locator('.public-fields').evaluate(e=>e.open)&&await page.locator('.public-martial details').evaluate(e=>e.open),'F3 returning person recovers own detail state');
 await page.click('#play');await wait(()=>demo.snapshot().herbs>=1);await pause();
 await actor('hero');await page.click('#panel [data-tab="life"]');await page.click('#p-cmds [data-cmd="tea"]');await page.click('#play');
 await wait(()=>demo.snapshot().people.hero.mode==='toTea');await pause();
 let action=await page.locator('.public-action').innerText();check(action.includes('茶座')&&action.includes('玩家指派：去茶座泡一杯茶')&&!action.includes('已在泡茶：改派'),'F2 tea travel displays its real order cause and tea target');
 result.toTea={tick:(await snap()).tick,action};
 await page.click('#play');await wait(()=>demo.snapshot().people.hero.mode==='brew');await pause();
 action=await page.locator('.public-action').innerText();check(action.includes('煮茶')&&action.includes('茶座')&&!action.includes('目標：挑水'),'F2 brew current/phase/target are one activity');await shot('official-brew-action.jpg');
 // Inspect while recovering as well as while working: both data sources update.
 await page.click('#play');await wait(()=>demo.snapshot().people.hero.mode==='sip');await pause();
 action=await page.locator('.public-action').innerText();check(action.includes('喝茶')&&action.includes('喝完精力 +40'),'F2 sip next comes from original tea view');await shot('official-sip-action.jpg');
 await page.click('#p-cmds [data-cmd="restAfterTrip"]');check((await page.locator('.public-action').innerText()).includes('玩家改令'),'F2 stopping tea displays the real cancel event');
 await page.click('#panel [data-tab="martial"]');await page.locator('.public-fields summary').click();await page.locator('.public-martial summary').click();await page.locator('.public-fields summary').focus();
 await page.click('#play');await page.locator('.public-fields summary').focus();
 await wait(()=>demo.snapshot().people.hero.mode==='seated');const recovery=await snap();await page.waitForTimeout(600);
 check(await page.locator('.public-fields').evaluate(e=>e.open)&&await page.locator('.public-martial details').evaluate(e=>e.open),'F3 recovery updates preserve both open panels');
 check(await page.evaluate(()=>document.activeElement?.matches('.public-fields summary')),'F3 focus survives recovery refresh');
 await pause();result.recovery={tick:recovery.tick,mode:recovery.people.hero.mode,energy:recovery.people.hero.energy};
 await page.click('#panel [data-tab="life"]');await page.click('#p-cmds [data-cmd="work:herb"]');await page.click('#play');
 await wait(()=>{const p=demo.snapshot().people.hero;return !p.tea.active&&p.job==='herb'&&p.mode==='carry';});await pause();action=await page.locator('.public-action').innerText();
 check(action.includes('目標：採藥')&&!action.includes('目標：茶座'),'F2 reassigned activity returns to native herb action source');
 const final=await page.evaluate(()=>demo.exportState());await page.waitForTimeout(100);assert.deepEqual(await page.evaluate(()=>demo.exportState()),final);result.checks.push('paused observation leaves complete original authority unchanged');
 // Navigate this same page to a clearly labelled GPT development proof.
 await page.goto(origin+'/public-fix/checks/gpt.html');await wait(()=>window.visibilityProof);
 const hidden=await page.evaluate(()=>visibilityProof.snapshot());check(!hidden.visible&&!hidden.rendered&&!hidden.card&&hidden.picked!==hidden.target,'F1 hidden original GPT actor absent from render, pick and card');
 await page.click('#reveal');const shown=await page.evaluate(()=>visibilityProof.snapshot());
 check(shown.visible&&shown.rendered&&shown.card&&shown.picked===shown.target,'F1 original LOS reveal appears and can be picked with same renderer');await shot('gpt-visibility-revealed.jpg');
 await page.click('#conceal');const concealed=await page.evaluate(()=>visibilityProof.snapshot());check(!concealed.visible&&!concealed.rendered&&concealed.picked!==concealed.target,'F1 conceal removes existing sprite and pick surface');
 result.visibility={hidden,shown,concealed};assert.deepEqual(result.errors,[]);result.passed=true;
}catch(e){result.passed=false;result.failure=e.stack||String(e);process.exitCode=1;if(page)await page.screenshot({path:'/tmp/public357-failure.jpg'}).catch(()=>{});}
finally{
 if(page&&!page.isClosed()){await pause().catch(()=>{});await page.setViewportSize(result.viewport).catch(()=>{});await page.close();}await context?.close();await browser?.close();
 if(server&&server.exitCode===null&&server.signalCode===null){server.kill('SIGTERM');await new Promise(r=>server.once('exit',r));}
 result.cleanup={pageClosed:!page||page.isClosed(),contextClosed:!context||context.pages().length===0,browserClosed:!browser||!browser.isConnected(),serverStopped:!server||server.exitCode!==null||server.signalCode!==null,viewport:'owned viewport restored then context closed'};
 await writeFile(new URL('desktop-results.json',out),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:result.passed,checks:result.checks.length,failure:result.failure,cleanup:result.cleanup}));
}
