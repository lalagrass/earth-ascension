import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {receiptAt,root} from '../tools/release.mjs';
const sourceSha=process.argv[2];
const receipt=await receiptAt(sourceSha,'gpt','central.fixed-gpt','6cbd3e6fccb8bc376e95e2f406ce6cead2a30fdc');
const manifestBytes=await readFile(new URL('../releases/1.0.0.json',import.meta.url));
assert.equal(createHash('sha256').update(manifestBytes).digest('hex'),receipt.manifestSha256,'serve exactly the committed candidate manifest');
const require=createRequire(import.meta.url),{chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=new URL('../evidence/',import.meta.url),port=8838,origin=`http://127.0.0.1:${port}`;
const result={author:'Codex Cloud /root/presentation366_author',host:'dddd1088786f',receipt,viewport:{width:1440,height:1000},checks:[],errors:[],screenshots:[]};
let browser,context,page,server;
const check=(ok,label)=>{assert.ok(ok,label);result.checks.push(label);console.log('PASS',label);};
const wait=fn=>page.waitForFunction(fn,undefined,{timeout:60000,polling:50});
try{
 await mkdir(out,{recursive:true});server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory',root],{stdio:'ignore'});
 for(let i=0;i<30;i++){try{if((await fetch(origin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}if(server.exitCode!==null)throw Error('Owned server failed');
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});result.browser=browser.version();
 context=await browser.newContext({viewport:result.viewport});page=await context.newPage();page.on('pageerror',e=>result.errors.push(String(e)));
 await page.goto(origin);await wait(()=>window.demo?.snapshot().frames>3);if(await page.evaluate(()=>demo.snapshot().playing))await page.click('#play');await page.click('#reset');
 const formal=await page.evaluate(()=>demo.exportState());await page.click('#resource-toggle');await page.locator('.resource-row>summary').first().click();await page.locator('.resource-row [data-resource-kind="facility"]').first().click();
 await page.waitForSelector('.facility-detail');check((await page.locator('.facility-detail').innerText()).includes('實存'),'formal existing facility still reads original stock');
 assert.deepEqual(await page.evaluate(()=>demo.exportState()),formal);result.checks.push('formal affected facility/resource reads never dispatch work or change authority');
 await page.goto(`${origin}/scene-shared/harness/?core=gpt&releaseSha=${sourceSha}`);await wait(()=>window.sceneHarness?.kitReceipt());await page.evaluate(()=>sceneHarness.pause());await page.waitForTimeout(100);
 assert.deepEqual(await page.evaluate(()=>sceneHarness.kitReceipt()),receipt);result.checks.push('browser caller pin equals exact git-source receipt and manifest/asset/adapter/core locks');
 check((await page.locator('#kit-source').innerText()).includes('public-kit@1.0.0'),'existing isolated harness visibly identifies package release and separate asset version');
 const before=await page.evaluate(()=>sceneHarness.state());await page.locator('#navigation .navigation-actors [data-nav-id="leader"]').click();await page.click('#kit-card>summary');await page.waitForTimeout(150);
 check(await page.locator('#kit-card-content .public-identity').count()===1,'thin runtime renderer reads true public fixed-GPT card');
 check((await page.locator('#kit-card-content').innerText()).includes('未知'),'absent initial/history fields remain explicitly unknown');
 await page.locator('#kit-card-content .public-fields>summary').click();await page.locator('#kit-card-content .public-fields>summary').focus();
 await page.locator('#navigation select').selectOption('hall');await page.waitForTimeout(100);assert.deepEqual(await page.evaluate(()=>sceneHarness.state()),before);result.checks.push('native selection/card/details/facility navigation preserve the complete paused true core');
 const view=await page.evaluate(()=>sceneHarness.navigation());check(view.bounds.width===2400&&view.bounds.height===1800&&view.route.availability==='unsupported','true core retains native map scale and unsupported actual-path capability');
 const marker=page.locator('#navigation [data-nav-layer="actors"]');await marker.uncheck();check((await page.evaluate(()=>sceneHarness.navigation())).actors.length===0,'new thin entry retains existing visibility/layer boundary');await marker.check();
 await page.locator('#kit-card').scrollIntoViewIfNeeded();await page.screenshot({path:new URL('fixed-gpt-release-pilot.jpg',out).pathname,type:'jpeg',quality:72});result.screenshots.push('fixed-gpt-release-pilot.jpg');
 assert.deepEqual(result.errors,[]);result.passed=true;
}catch(e){result.passed=false;result.failure=e.stack||String(e);process.exitCode=1;}
finally{
 if(page&&!page.isClosed()){await page.evaluate(()=>{if(window.demo?.snapshot().playing)document.getElementById('play').click();window.sceneHarness?.pause();}).catch(()=>{});await page.setViewportSize(result.viewport).catch(()=>{});await page.close();}
 await context?.close();await browser?.close();if(server&&server.exitCode===null&&server.signalCode===null){server.kill('SIGTERM');await new Promise(r=>server.once('exit',r));}
 result.cleanup={pageClosed:!page||page.isClosed(),contextClosed:!context||context.pages().length===0,browserClosed:!browser||!browser.isConnected(),serverStopped:!server||server.exitCode!==null||server.signalCode!==null,viewport:'owned viewport restored then context closed'};
 await writeFile(new URL('desktop-results.json',out),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}
