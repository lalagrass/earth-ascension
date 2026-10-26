// A single official Cloud page and owned temporary server; no test-only world mutation.
import { createRequire } from 'node:module';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sect=new URL('../../',import.meta.url).pathname,out=new URL('../evidence/',import.meta.url);
await mkdir(out,{recursive:true});
const result={checkpoint:execFileSync('git',['rev-parse','HEAD'],{cwd:sect,encoding:'utf8'}).trim(),viewport:{width:1440,height:1000},checks:[],errors:[],screenshots:[]};
const port=Number(process.env.MARTIAL_TEST_PORT||8818),origin=`http://127.0.0.1:${port}`;
let browser,page,server;
const snap=()=>page.evaluate(()=>demo.snapshot());
const wait=fn=>page.waitForFunction(fn,undefined,{polling:20,timeout:60000});
const check=(ok,name)=>{assert.ok(ok,name);result.checks.push(name);console.log('PASS',name);};
const shot=async name=>{await page.screenshot({path:new URL(name,out).pathname});result.screenshots.push(name);};
async function pause(){if((await snap()).playing)await page.click('#play');}
try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 result.browser=browser.version();
 server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory',sect],{stdio:'ignore'});
 for(let n=0;n<30;n++){try{if((await fetch(origin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 if(server.exitCode!==null)throw Error('Owned server did not start');
 page=await browser.newPage({viewport:result.viewport});page.on('pageerror',e=>result.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});
 await page.goto(origin);await wait(()=>window.demo?.snapshot().frames>3);await pause();await page.click('#reset');
 check(new URL(page.url()).pathname==='/experiments/water-carry/demo/','single official entry');
 await page.click('#roster [data-person="hero"]');await page.click('#panel [data-tab="martial"]');
 check((await page.locator('.public-martial').innerText()).includes('已學既有第一式'),'card follows original learned first palm');
 await page.locator('.public-martial summary').click();
 check((await page.locator('.public-martial').innerText()).includes('未知不表示安全'),'four condition layers expose unsupported/unknown without safety inference');
 await shot('official-martial-card.jpg');
 const start=await page.evaluate(()=>demo.exportState());
 await page.click('#roster [data-person="cousin"]');await page.click('#panel [data-tab="life"]');await page.click('#roster [data-person="hero"]');
 assert.deepEqual(await page.evaluate(()=>demo.exportState()),start);result.checks.push('paused person/tab changes preserve full authority');
 // Legal original training command for each existing person; no setPalm/test granting.
 await page.click('#p-cmds [data-cmd="train"]');await page.click('#roster [data-person="cousin"]');await page.click('#p-cmds [data-cmd="train"]');
 await page.click('[data-view="yard"]');await page.click('#play');
 await wait(()=>{const s=demo.snapshot();return s.people.hero.motion?.phase==='windup'&&s.people.cousin.mode==='train'&&s.palmArm.cousin;});await pause();
 let s=await snap();result.windup={tick:s.tick,hero:s.people.hero.motion,cousin:s.people.cousin.motion,energy:[s.people.hero.energy,s.people.cousin.energy]};
 check(s.people.hero.motion.actionId==='martial.basic-palm'&&s.palmArm.hero,'true training windup uses shared semantic and original palm overlay');
 check(s.people.cousin.mode==='train'&&s.people.cousin.motion.actionId==='martial.basic-palm','second real person uses the same martial semantics');
 check(s.people.hero.motion.attachments.shoulder[0]!==s.people.cousin.motion.attachments.shoulder?.[0],'two skins retain distinct shoulder adaptation');
 await page.click('#roster [data-person="hero"]');await page.click('#panel [data-tab="martial"]');await shot('official-two-skins-windup.jpg');
 const frozen=await page.evaluate(()=>demo.exportState());await page.click('[data-speed="4"]');await page.click('#roster [data-person="cousin"]');await page.click('#roster [data-person="hero"]');await page.waitForTimeout(180);
 assert.deepEqual(await page.evaluate(()=>demo.exportState()),frozen);result.checks.push('paused rate/selection and repeated render do not advance or replay authority');
 await page.click('[data-speed="1"]');await page.click('#play');
 await wait(()=>demo.snapshot().people.hero.motion?.phase==='strike');await pause();s=await snap();
 check(s.people.hero.motion.corePhase==='recover'&&s.people.hero.train01.units===0,'strike display is inside original recovery and does not award premature training');
 result.strike={tick:s.tick,motion:s.people.hero.motion,unitK:s.people.hero.train01.unitK};
 await shot('official-palm-strike.jpg');
 await page.click('#play');await wait(()=>demo.snapshot().people.hero.motion?.phase==='recover');await pause();s=await snap();
 check(s.people.hero.motion.corePhase==='recover'&&s.people.hero.motion.phase==='recover','true complete windup/strike/recovery presentation');
 result.recovery={tick:s.tick,motion:s.people.hero.motion};
 await page.click('[data-speed="4"]');await page.click('#play');
 await wait(()=>{const s=demo.snapshot();return s.people.hero.train01.adept&&s.people.cousin.train01.adept;});await pause();s=await snap();
 check(s.people.hero.train01.units===6&&s.people.cousin.train01.units===6,'both original training results complete at 4x');
 const final=await page.evaluate(()=>demo.exportState());const skills=final.log.filter(e=>e.kind==='palm:skill'&&e.src==='train');
 check(skills.length===2&&new Set(skills.map(e=>e.person)).size===2,'exactly one original adept event per person');
 result.completed={tick:s.tick,hero:{palm:s.people.hero.palm,train01:s.people.hero.train01,energy:s.people.hero.energy},cousin:{palm:s.people.cousin.palm,train01:s.people.cousin.train01,energy:s.people.cousin.energy},skills};
 await page.click('#roster [data-person="cousin"]');await page.click('#panel [data-tab="martial"]');
 check((await page.locator('.public-martial').innerText()).includes('起手 24／收勢 18 tick'),'card updates to true learned proficiency with native tick units');
 await shot('official-trained-card.jpg');await page.waitForTimeout(100);assert.deepEqual(await page.evaluate(()=>demo.exportState()),final);result.checks.push('final observation remains paused');
 assert.deepEqual(result.errors,[]);result.passed=true;
}catch(e){result.passed=false;result.failure=e.stack||String(e);process.exitCode=1;if(page){result.snapshot=await snap().catch(()=>null);await page.screenshot({path:'/tmp/martial350-failure.jpg'}).catch(()=>{});}}
finally{
 if(page&&!page.isClosed()){await pause().catch(()=>{});await page.setViewportSize(result.viewport).catch(()=>{});await page.close();}
 await browser?.close();if(server&&server.exitCode===null&&server.signalCode===null){server.kill('SIGTERM');await new Promise(r=>server.once('exit',r));}
 result.cleanup={pageClosed:!page||page.isClosed(),browserClosed:!browser||!browser.isConnected(),serverStopped:!server||server.exitCode!==null||server.signalCode!==null,viewport:'owned viewport restored then browser closed'};
 await writeFile(new URL('desktop-results.json',out),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:result.passed,checks:result.checks.length,failure:result.failure,cleanup:result.cleanup}));
}
