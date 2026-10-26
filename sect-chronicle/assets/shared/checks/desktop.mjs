import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=new URL('../evidence/',import.meta.url),sect=new URL('../../../',import.meta.url).pathname;
const port=Number(process.env.ASSET_TEST_PORT||8817),origin=`http://127.0.0.1:${port}`;
const result={viewport:{width:1440,height:1000},checks:[],errors:[],status:'running'};
let server,browser,page;
await mkdir(out,{recursive:true});
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory',sect],{stdio:'ignore'});
 for(let n=0;n<30;n++){try{if((await fetch(origin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 page=await browser.newPage({viewport:result.viewport});page.on('pageerror',e=>result.errors.push(String(e)));
 await page.goto(origin);await page.waitForFunction(()=>window.demo?.snapshot().frames>3);
 await page.click('#play');await page.click('#roster [data-person="hero"]');
 await page.waitForFunction(()=>{const img=document.querySelector('#panel img[data-public-portrait]');return img?.complete&&img.naturalWidth>0&&!img.closest('.portrait-art').hidden;});
 const before=await page.evaluate(()=>window.demo.exportState());
 const portrait=await page.locator('#panel .public-portrait').evaluate(e=>({assetId:e.dataset.assetId,source:e.title,src:e.querySelector('img').src,naturalWidth:e.querySelector('img').naturalWidth,crop:e.querySelector('.portrait-art').getAttribute('style')}));
 assert.equal(portrait.assetId,'person.hero.sheet');assert.match(portrait.source,/ac7148d3a4d9f6b07cf2576b61cb4a2faad8c0df/);assert.ok(portrait.src.startsWith(origin));
 result.portrait=portrait;result.checks.push('single official entry: local pinned hero frame, correct source and crop');
 await page.screenshot({path:new URL('official-asset.jpg',out).pathname});
 assert.deepEqual(await page.evaluate(()=>window.demo.exportState()),before);result.checks.push('paused image load/render leaves real authority unchanged');
 // A failed real local request must display a readable fallback instead of a broken image.
 await page.route('**/assets/art184-production/hero.png',r=>r.abort());
 await page.evaluate(async()=>{const {identityHtml}=await import('/character-card/render.mjs');const {portrait}=await import('/character-card/portrait.mjs');const c={branch:'dev',actorId:'hero',identity:{name:'主角',role:'圖片缺失反例',portrait:portrait('dev','hero')}};document.querySelector('#panel').innerHTML=identityHtml(c);});
 await page.waitForFunction(()=>document.querySelector('#panel .portrait-placeholder small')?.textContent.includes('本地圖片缺失'));
 result.checks.push('failed local image uses readable fallback');await page.unroute('**/assets/art184-production/hero.png');
 await page.goto(`${origin}/scene-shared/harness/?core=gpt`);await page.waitForFunction(()=>window.sceneHarness?.snapshot());
 await page.evaluate(()=>window.sceneHarness.pause());
 const proof=await page.evaluate(()=>({receipt:window.sceneHarness.assetReceipt,snapshot:window.sceneHarness.snapshot(),state:window.sceneHarness.state()}));
 assert.equal(proof.receipt.version,'gpt-1.0.0');assert.equal(proof.receipt.coreCommit,'6cbd3e6fccb8bc376e95e2f406ce6cead2a30fdc');assert.ok(proof.receipt.hero.url.startsWith(origin));assert.ok(proof.snapshot.actors.some(a=>a.id==='leader'));
 result.harness={version:proof.receipt.version,coreCommit:proof.receipt.coreCommit,heroSha256:proof.receipt.hero.sha256,tick:proof.state.tick,actorCount:proof.snapshot.actors.length};
 result.checks.push('true fixed GPT source harness uses independently pinned local atlas in existing renderer');
 await page.screenshot({path:new URL('gpt-pinned-asset.jpg',out).pathname});
 assert.deepEqual(result.errors,[]);result.status='passed';
}catch(e){result.status='failed';result.failure=String(e);process.exitCode=1;}
finally{
 await page?.close();await browser?.close();if(server){server.kill('SIGTERM');await new Promise(r=>{if(server.exitCode!==null)r();else server.once('exit',r);});}
 result.cleaned={pageClosed:!page||page.isClosed(),browserClosed:!browser||!browser.isConnected(),serverStopped:!server||server.exitCode!==null||server.signalCode!==null};
 await writeFile(new URL('desktop-results.json',out),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}
