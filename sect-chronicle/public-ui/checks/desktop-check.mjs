import { createRequire } from 'node:module';
import { spawn,execFileSync } from 'node:child_process';
import { mkdir,writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sect=new URL('../../',import.meta.url).pathname,out=new URL('../evidence/',import.meta.url),port=8836,origin=`http://127.0.0.1:${port}`;
const baseline='bb251ab78e4bc0579e3e750afd0cc7fe2a9c6dd5';
const baselinePaths=['character-card/style.css','resource-view/style.css','intent-view/style.css','event-view/style.css','experiments/water-carry/demo/style.css','character-card/render.mjs','resource-view/render.mjs','intent-view/render.mjs','event-view/render.mjs','martial-view/render.mjs'];
const before=new Map(baselinePaths.map(p=>[p,execFileSync('git',['show',`${baseline}:sect-chronicle/${p}`],{cwd:sect,encoding:'utf8'})]));
const result={base:baseline,viewport:{width:1440,height:1000},checks:[],errors:[],screenshots:[]};
let page,context,browser,server;
const check=(ok,label)=>{assert.ok(ok,label);result.checks.push(label);console.log('PASS',label);};
const wait=fn=>page.waitForFunction(fn,undefined,{polling:50,timeout:120000});
const snap=()=>page.evaluate(()=>demo.snapshot());
const pause=async()=>{if((await snap()).playing)await page.click('#play');};
const cmd=key=>page.locator(`#panel [data-intent-command="${key}"]`).click();
const shot=async name=>{await page.screenshot({path:new URL(name,out).pathname,type:'jpeg',quality:72});result.screenshots.push(name);};
try {
 await mkdir(out,{recursive:true});
 server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory',sect],{stdio:'ignore'});
 for(let i=0;i<30;i++){try{if((await fetch(origin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 if(server.exitCode!==null)throw Error('Owned server failed');
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});result.browser=browser.version();
 context=await browser.newContext({viewport:result.viewport});page=await context.newPage();page.on('pageerror',e=>result.errors.push(String(e)));
 const baselineRoute=async route=>{
  const p=decodeURIComponent(new URL(route.request().url()).pathname).slice(1);
  if(before.has(p))await route.fulfill({body:before.get(p),contentType:p.endsWith('.css')?'text/css':'text/javascript'});
  else await route.continue();
 };
 await page.route('**/*',baselineRoute);
 await page.goto(origin);await wait(()=>window.demo?.snapshot().frames>3);await pause();await page.click('#reset');await page.click('#roster [data-person="hero"]');
 await shot('official-before.jpg');
 await page.unroute('**/*',baselineRoute);
 await page.goto(origin);await wait(()=>window.demo?.snapshot().frames>3);await pause();await page.click('#reset');await page.click('#roster [data-person="hero"]');
 check(new URL(page.url()).pathname==='/experiments/water-carry/demo/','same official entry and true core');
 const intentSummary=()=>page.locator('.public-intent details[data-view-key="intent"] > summary');
 await intentSummary().click();await page.keyboard.press('Tab');await intentSummary().focus();
 result.focusStyle=await intentSummary().evaluate(e=>({style:getComputedStyle(e).outlineStyle,width:getComputedStyle(e).outlineWidth,color:getComputedStyle(e).outlineColor}));
 check(result.focusStyle.style==='solid'&&result.focusStyle.width==='2px','summary has effective visible keyboard focus');
 await page.click('[data-speed="4"]');await page.click('#play');await intentSummary().focus();await page.waitForTimeout(1000);
 check(await page.evaluate(()=>document.activeElement?.matches('.public-intent summary'))&&await page.locator('.public-intent details[data-view-key="intent"]').evaluate(e=>e.open),'working playback retains own details and focus');await pause();
 const frozen=await page.evaluate(()=>demo.exportState());
 await page.click('#roster [data-person="cousin"]');check(!await page.locator('.public-intent details[data-view-key="intent"]').evaluate(e=>e.open),'other person does not inherit details');
 check(await page.locator('#p-cmds [data-intent-actor="hero"]').count()===0,'person switch does not retain old actor bindings');
 await page.click('#roster [data-person="hero"]');check(await page.locator('.public-intent details[data-view-key="intent"]').evaluate(e=>e.open),'returning person restores details');
 assert.deepEqual(await page.evaluate(()=>demo.exportState()),frozen);result.checks.push('paused UI reads and person switches preserve complete original authority');
 await cmd('dispatch:work:herb');check((await snap()).people.hero.pending==='herb','original work command remains the one native pending');
 check((await page.locator('[data-intent-result]').innerText()).length>0,'original command result is retained in shared status');
 await cmd('dispatch:restAfterTrip');await page.click('#play');await wait(()=>demo.snapshot().people.hero.mode==='seated');
 await intentSummary().focus();await page.waitForTimeout(900);
 check(await page.evaluate(()=>document.activeElement?.matches('.public-intent summary'))&&await page.locator('.public-intent details[data-view-key="intent"]').evaluate(e=>e.open),'sitting playback retains details and focus');await pause();
 check((await snap()).people.hero.rest==='manual','native manual stop remains distinct from automatic recovery');
 await page.locator('#panel').evaluate(e=>e.scrollTop=0);await shot('official-after.jpg');
 await page.click('#resource-toggle');await page.locator('.resource-row').first().locator('summary').first().click();
 check(await page.locator('.resource-row [data-availability="known"]').count()>0,'real resource values retain availability and original source');
 const state=await page.evaluate(()=>demo.exportState());await page.locator('.resource-row summary').first().focus();await page.waitForTimeout(150);assert.deepEqual(await page.evaluate(()=>demo.exportState()),state);
 await page.goto(origin+'/character-card/showcase.html');await page.waitForSelector('#fixture-intent .public-intent');
 check(await page.locator('h1').innerText()==='公版元件開發預覽','existing showcase explicitly labels developer preview');
 await page.locator('#fixture-card .public-background summary').click();
 check(await page.locator('#fixture-card .public-background').evaluate(e=>e.scrollWidth<=e.clientWidth),'long public background wraps inside preview');
 await page.locator('#fixture-card .public-background summary').click();
 await page.locator('#fixture-card .public-fields > summary').click();
 const hidden=page.locator('#fixture-card [data-availability="hidden"]');
 check(await hidden.count()===1&&await hidden.getAttribute('title')===null&&await hidden.innerText()==='隱藏','hidden fixture has label only and no tooltip');
 check((await page.locator('#fixture-resources [data-availability="known"]').first().innerText()).startsWith('0'),'known zero is visibly distinct');
 const disabled=page.locator('#fixture-intent button:disabled');
 result.disabledStyle=await disabled.evaluate(e=>({color:getComputedStyle(e).color,opacity:getComputedStyle(e).opacity,border:getComputedStyle(e).borderStyle}));
 check(result.disabledStyle.opacity==='1'&&result.disabledStyle.border==='dashed','disabled control remains readable and visibly disabled');
 result.errorStyle=await page.locator('[role="alert"]').evaluate(e=>({color:getComputedStyle(e).color,border:getComputedStyle(e).borderLeftStyle}));
 check(result.errorStyle.border==='solid','fixture error is visually distinct with explicit wording');
 await page.locator('#fixture-intent details[data-view-key="intent"] summary').click();await page.locator('#fixture-intent [data-intent-command="fixture:enabled"]').click();
 check((await page.locator('#fixture-intent [data-intent-result]').innerText()).includes('未送往任何核心'),'preview action is clearly a fixture result');
 await page.keyboard.press('Tab');await page.locator('#fixture-intent details[data-view-key="intent"] summary').focus();await shot('preview-states.jpg');
 assert.deepEqual(result.errors,[]);result.passed=true;
} catch(e) {result.passed=false;result.failure=e.stack||String(e);process.exitCode=1;}
finally {
 if(page&&!page.isClosed()){await page.evaluate(()=>{if(window.demo?.snapshot().playing)document.getElementById('play').click();}).catch(()=>{});await page.setViewportSize(result.viewport).catch(()=>{});await page.close();}
 await context?.close();await browser?.close();if(server&&server.exitCode===null&&server.signalCode===null){server.kill('SIGTERM');await new Promise(r=>server.once('exit',r));}
 result.cleanup={pageClosed:!page||page.isClosed(),contextClosed:!context||context.pages().length===0,browserClosed:!browser||!browser.isConnected(),serverStopped:!server||server.exitCode!==null||server.signalCode!==null,viewport:'owned viewport restored then context closed'};
 await writeFile(new URL('desktop-results.json',out),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}
