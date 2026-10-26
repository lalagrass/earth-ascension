// One Cloud desktop, one owned server, always cleaned up. No Mac fallback.
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH || '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=new URL('../evidence/',import.meta.url),sect=new URL('../../',import.meta.url).pathname;
await mkdir(out,{recursive:true});
const result={viewport:{width:1440,height:1000},checks:[],errors:[],screenshots:[],status:'running'};
const port=Number(process.env.CARD_TEST_PORT||8815),origin=`http://127.0.0.1:${port}`;
let server,browser,page;
try{
 // Fail before opening the server if this Cloud lacks a browser binary.
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory',sect],{stdio:'ignore'});
 for(let n=0;n<30;n++){try{if((await fetch(origin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 page=await browser.newPage({viewport:result.viewport});page.on('pageerror',e=>result.errors.push(String(e)));
 await page.goto(origin);await page.waitForFunction(()=>window.demo?.snapshot().frames>3);
 await page.click('#play');await page.click('#reset');await page.click('#roster [data-person="hero"]');
 await page.waitForFunction(()=>document.querySelector('#panel .public-action'));assert.ok((await page.locator('#panel').innerText()).includes('真實原因'));result.checks.push('public card in single official entry');
 const before=await page.evaluate(()=>window.demo.exportState());await page.mouse.move(400,300);await page.mouse.down();await page.mouse.move(430,330);await page.mouse.up();
 assert.deepEqual(await page.evaluate(()=>window.demo.exportState()),before);result.checks.push('pause camera leaves authority unchanged');
 await page.click('#p-cmds [data-cmd="work:herb"]');await page.click('[data-speed="4"]');await page.click('#play');
 await page.waitForFunction(()=>window.demo.snapshot().people.hero.done.herb>0,undefined,{timeout:120000});
 await page.click('#play');assert.ok((await page.locator('#panel').innerText()).includes('負重'));result.checks.push('legal herb command, long follow, real delivery');
 await page.screenshot({path:new URL('official-card.jpg',out).pathname});result.screenshots.push('official-card.jpg');
 await page.click('#panel [data-tab="martial"]');await page.click('.public-fields summary');assert.ok((await page.locator('#panel').innerText()).includes('起始快照'));result.checks.push('growth sources and initial separation');
 await page.screenshot({path:new URL('official-growth.jpg',out).pathname});result.screenshots.push('official-growth.jpg');
 await page.goto(`${origin}/character-card/checks/harness.html`);await page.waitForFunction(()=>window.cardHarness);
 await page.evaluate(()=>{window.cardHarness.adapter.command({actorId:window.cardHarness.state.ds[0].id,action:'train'});window.cardHarness.step(20);});
 assert.equal(await page.evaluate(()=>window.cardHarness.adapter.snapshot().actors[0].positionSource),'core.pos');result.checks.push('Grok true core native scene and same card');
 await page.screenshot({path:new URL('grok-native-card.jpg',out).pathname});result.screenshots.push('grok-native-card.jpg');
 assert.deepEqual(result.errors,[]);result.status='passed';
}catch(e){if(page){result.panel=await page.locator('#panel').textContent().catch(()=>null);await page.screenshot({path:'/tmp/card-failure.png'}).catch(()=>{});}result.status='failed';result.failure=String(e);process.exitCode=1;}
finally{await page?.close();await browser?.close();if(server){server.kill('SIGTERM');await new Promise(r=>{if(server.exitCode!==null)r();else server.once('exit',r);});}result.cleaned={pageClosed:!page||page.isClosed(),browserClosed:!browser||!browser.isConnected(),serverStopped:!server||server.exitCode!==null||server.signalCode!==null};await writeFile(new URL('desktop-results.json',out),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));}
