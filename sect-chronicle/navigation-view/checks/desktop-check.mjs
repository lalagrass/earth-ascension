import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sect=new URL('../../',import.meta.url).pathname,out=new URL('../evidence/',import.meta.url),port=8837,origin=`http://127.0.0.1:${port}`;
const result={author:'Codex Cloud /root/presentation366_author',base:'3079a03de5c2e8c79af64b0962ae3da75f274466',viewport:{width:1440,height:1000},checks:[],errors:[],screenshots:[]};
let browser,context,page,server;
const check=(value,label)=>{assert.ok(value,label);result.checks.push(label);console.log('PASS',label);};
const wait=fn=>page.waitForFunction(fn,undefined,{polling:50,timeout:120000});
const snap=()=>page.evaluate(()=>demo.snapshot()),nav=()=>page.evaluate(()=>demo.navigation());
const pause=async()=>{if((await snap()).playing)await page.click('#play');};
const shot=async name=>{await page.screenshot({path:new URL(name,out).pathname,type:'jpeg',quality:72});result.screenshots.push(name);};
const frameMatches=async()=>page.evaluate(()=>{const n=demo.navigation(),s=demo.snapshot(),b=n.bounds,c=s.cam,x=Math.max(0,c.x-innerWidth/(2*c.zoom)),y=Math.max(0,c.y-innerHeight/(2*c.zoom));return Math.abs(n.frame.x-x)<1e-5&&Math.abs(n.frame.y-y)<1e-5&&Math.abs(n.frame.width-(Math.min(b.width,c.x+innerWidth/(2*c.zoom))-x))<1e-5&&Math.abs(n.frame.height-(Math.min(b.height,c.y+innerHeight/(2*c.zoom))-y))<1e-5;});
try{
 await mkdir(out,{recursive:true});
 server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory',sect],{stdio:'ignore'});
 for(let i=0;i<30;i++){try{if((await fetch(origin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}if(server.exitCode!==null)throw Error('Owned server failed');
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});result.browser=browser.version();
 context=await browser.newContext({viewport:result.viewport});page=await context.newPage();page.on('pageerror',e=>result.errors.push(String(e)));
 await page.goto(origin);await wait(()=>window.demo?.snapshot().frames>3);await pause();await page.click('#reset');await page.click('#navigation-toggle');
 check(new URL(page.url()).pathname==='/experiments/water-carry/demo/','one existing official player entry');
 let n=await nav();check(n.bounds.width===1600&&n.bounds.height===1350,'official bounds retain original 1600x1350 scale');
 const authority=await page.evaluate(()=>demo.exportState());
 await page.locator('#navigation svg [data-nav-id="cousin"]').click();
 check((await snap()).selected==='cousin'&&(await nav()).selectedId==='cousin',`map actor click calls original person selection and follow (${(await snap()).selected}/${(await nav()).selectedId})`);
 await page.locator('#navigation select').selectOption('spring');await page.waitForTimeout(150);
 const mapCamera=(await snap()).cam;await page.click('[data-view="spring"]');assert.deepEqual((await snap()).cam,mapCamera);result.checks.push('map facility uses same original landmark camera positioning');
 check(await frameMatches(),'viewport frame equals original camera after landmark locate');
 await page.mouse.move(650,550);await page.mouse.down();await page.mouse.move(760,620,{steps:5});await page.mouse.up();await page.waitForTimeout(100);
 check(await frameMatches(),'viewport frame tracks original scene drag');await page.mouse.wheel(0,-250);await page.waitForTimeout(150);check(await frameMatches(),'viewport frame tracks original scene zoom');
 assert.deepEqual(await page.evaluate(()=>demo.exportState()),authority);result.checks.push('selection/location/drag/zoom preserve complete paused world and native pending/commands');
 const oldActor=await page.locator('#navigation svg [data-nav-id="cousin"]').elementHandle();
 await page.locator('#navigation [data-nav-layer="actors"]').uncheck();check((await nav()).actors.length===0&&await page.locator('#navigation .navigation-point.actor').count()===0&&!await oldActor.evaluate(e=>e.isConnected),'actor layer removes DOM/pick surface and titles');
 await page.locator('#navigation [data-nav-layer="actors"]').check();await page.locator('#navigation [data-nav-layer="facilities"]').uncheck();
 check((await nav()).facilities.length===0&&await page.locator('#navigation select option').count()===1&&await page.locator('#navigation .navigation-point.facility').count()===0,'facility layer removes list and marker surfaces');await page.locator('#navigation [data-nav-layer="facilities"]').check();
 await page.locator('#navigation [data-nav-layer="actors"]').focus();await page.keyboard.press(' ');check(!(await snap()).playing,'navigation keyboard space never reaches global play command');await page.locator('#navigation [data-nav-layer="actors"]').check();
 await page.click('#navigation-toggle');check(await page.locator('#navigation').isHidden()&&await page.locator('#navigation-toggle').getAttribute('aria-expanded')==='false','official navigation collapses');await page.click('#navigation-toggle');
 assert.deepEqual(await page.evaluate(()=>demo.exportState()),authority);check((await snap()).menu===null,'navigation controls never open scene work menu or pass through');
 await shot('official-navigation.jpg');
 await page.locator('#navigation .navigation-actors [data-nav-id="hero"]').click();await page.click('[data-speed="4"]');await page.click('#play');await wait(()=>demo.snapshot().people.hero.y>940);await pause();
 const state=await snap();n=await nav();
 check(n.actors.every(a=>a.x===state.people[a.id].x&&a.y===state.people[a.id].y),'long commute map markers match true scene feet exactly');
 check(state.people.hero.tripSpeeds.empty<state.people.cousin.tripSpeeds.empty,'original speed difference remains unchanged');
 check(n.tick===state.tick&&n.route.availability==='unsupported'&&await page.locator('#navigation polyline,path').count()===0,'native tick and absent route are shown without invented lines');await shot('official-long-route.jpg');
 const frozen=await page.evaluate(()=>demo.exportState());await page.waitForTimeout(200);assert.deepEqual(await page.evaluate(()=>demo.exportState()),frozen);result.checks.push('paused minimap has no separate clock');
 const markerBeforeReset=await page.locator('#navigation .navigation-point.actor').first().elementHandle(),identity=n.identity;
 await page.click('#reset');await wait(()=>demo.snapshot().tick===0);check((await nav()).identity!==identity&&!await markerBeforeReset.evaluate(e=>e.isConnected),'official reset epoch discards old markers/focus/tooltip nodes');
 await page.goto(origin+'/scene-shared/harness/?core=gpt');await wait(()=>window.sceneHarness?.navigation());await page.evaluate(()=>sceneHarness.pause());await page.waitForTimeout(100);
 const second=await page.evaluate(()=>({nav:sceneHarness.navigation(),snapshot:sceneHarness.snapshot(),state:sceneHarness.state()}));
 check(second.nav.bounds.width===2400&&second.nav.bounds.height===1800,'same renderer retains true GPT 2400x1800 native map');
 check(second.nav.actors.every(a=>second.snapshot.actors.some(s=>s.id===a.id&&s.x===a.x&&s.y===a.y)),'second-core navigation uses original visible SceneSnapshot');
 await page.locator('#navigation .navigation-actors [data-nav-id="leader"]').click();await page.locator('#navigation select').selectOption('hall');await page.waitForTimeout(100);assert.deepEqual(await page.evaluate(()=>sceneHarness.state()),second.state);
 check((await page.evaluate(()=>sceneHarness.navigation())).route.availability==='unsupported','second-core missing route stays explicit and interactions change no world');await shot('gpt-native-navigation.jpg');
 // Existing #357 observer-placement proof; not actual gameplay movement or teleport UI.
 await page.goto(origin+'/public-fix/checks/gpt.html');await wait(()=>window.visibilityProof?.navigation());
 let proof=await page.evaluate(()=>({state:visibilityProof.snapshot(),nav:visibilityProof.navigation()}));const target=proof.state.target;
 check(!proof.state.visible&&!proof.nav.actors.some(a=>a.id===target)&&!(await page.locator('#navigation').innerHTML()).includes(target),'original GPT hidden actor absent from nav payload, DOM, title, list and pick');
 await page.click('#reveal');proof=await page.evaluate(()=>({state:visibilityProof.snapshot(),nav:visibilityProof.navigation()}));
 check(proof.state.visible&&proof.nav.actors.some(a=>a.id===target),'original LOS reveal creates current navigation marker');
 const targetMarker=await page.locator(`#navigation svg [data-nav-id="${target}"]`).elementHandle();await targetMarker.focus();await page.click('#conceal');
 proof=await page.evaluate(()=>({state:visibilityProof.snapshot(),nav:visibilityProof.navigation()}));
 check(!proof.state.visible&&!proof.nav.actors.some(a=>a.id===target)&&!await targetMarker.evaluate(e=>e.isConnected)&&!(await page.locator('#navigation').innerHTML()).includes(target),'conceal deletes old marker, focus/title/list and payload with no history');
 const existing=await page.locator('#navigation .navigation-point.actor').first().elementHandle(),preEpoch=await page.evaluate(()=>({world:visibilityProof.world(),identity:visibilityProof.navigation().identity}));await page.click('#epoch');
 check((await page.evaluate(()=>visibilityProof.navigation().identity))!==preEpoch.identity&&!await existing.evaluate(e=>e.isConnected),'presentation epoch recreates public markers and clears old DOM');assert.deepEqual(await page.evaluate(()=>visibilityProof.world()),preEpoch.world);result.checks.push('presentation epoch reset does not modify true GPT authority');
 assert.deepEqual(result.errors,[]);result.passed=true;
}catch(e){result.passed=false;result.failure=e.stack||String(e);process.exitCode=1;}
finally{
 if(page&&!page.isClosed()){await page.evaluate(()=>{if(window.demo?.snapshot().playing)document.getElementById('play').click();window.sceneHarness?.pause();}).catch(()=>{});await page.setViewportSize(result.viewport).catch(()=>{});await page.close();}
 await context?.close();await browser?.close();if(server&&server.exitCode===null&&server.signalCode===null){server.kill('SIGTERM');await new Promise(r=>server.once('exit',r));}
 result.cleanup={pageClosed:!page||page.isClosed(),contextClosed:!context||context.pages().length===0,browserClosed:!browser||!browser.isConnected(),serverStopped:!server||server.exitCode!==null||server.signalCode!==null,viewport:'owned viewport restored then context closed'};
 await writeFile(new URL('desktop-results.json',out),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}
