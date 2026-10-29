// H24: actual UI-only route, reads debug state for assertions; never grants assets/XP or advances ticks directly.
import {fileURLToPath} from'node:url';import fs from'node:fs/promises';import assert from'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const root=fileURLToPath(new URL('../',import.meta.url)),browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const errors=[],events=[],start=Date.now();let speed=1;
try{const p=await browser.newPage({viewport:{width:1440,height:1000}});p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.HOMESTEAD_URL||'http://127.0.0.1:8795/homestead.html');await p.fill('#name','小禾');await p.click('#begin');
 const pace=async n=>{await p.click(`[data-speed="${n}"]`);speed=n;};
 const record=async name=>{const r=await p.evaluate(()=>{const s=window.__homestead;return {t:s.t,day:s.day,skills:{...s.person.skills},stock:{...s.stock},hunger:s.person.hunger,energy:s.person.energy,feelings:{...s.person.feelings},unlocked:[...s.unlocked],fac:Object.fromEntries(Object.entries(s.fac).map(([id,f])=>[id,f.stage]))};});events.push({name,wallSeconds:(Date.now()-start)/1000,speed,...r});console.log(name,r.t);};
 const wait=async(fn,arg,timeout=60000)=>p.waitForFunction(fn,arg,{timeout});
 const shot=async name=>{await p.evaluate(()=>{document.querySelector('aside').scrollTop=0;scrollTo(0,0)});await p.screenshot({path:root+'shots/'+name+'.png',fullPage:true});};
 const build=async(id,stage=1)=>{await p.click(`[data-build="${id}"]`);await wait(([id,stage])=>window.__homestead.fac[id].stage===stage,[id,stage]);await record(id+' '+stage);};
 await pace(0);assert.equal(await p.locator('#social-card').isVisible(),false);await shot('homestead-h24-start');await record('new solitary game');await p.click('[data-build="hut"]');await pace(16);await wait(()=>window.__homestead.fac.hut.stage===1);await record('first house');await pace(0);await shot('homestead-h24-first-home');await pace(16);
 for(const id of['garden','kitchen','bed'])await build(id);
 await wait(()=>window.__homestead.stock.meal>0);await record('basic meal made; cooking Lv1');
 await p.click('[data-recipe="salad"]');await wait(()=>window.__homestead.stock.salad>0);await record('salad made');
 await wait(()=>window.__homestead.person.feelings.freshMeal>window.__homestead.t);await record('salad actually eaten');
 for(const id of['workbench','kitchen','bed'])await build(id,id==='workbench'?1:2);
 await p.click('[data-act="rest"]');await wait(()=>window.__homestead.person.feelings.rested>window.__homestead.t&&window.__homestead.person.energy>=99);await pace(0);await record('comfortable bed actually used');await shot('homestead-h24-comfortable-rest');await p.click('#clear');await pace(16);
 for(const id of['hut','store','bench','flowers'])await build(id,id==='hut'?2:1);
 await wait(()=>window.__homestead.person.skills.cook>=5,undefined,180000);await record('cooking Lv2 naturally reached');
 await wait(()=>!document.querySelector('[data-recipe="stew"]').disabled,undefined,90000);await p.click('[data-recipe="stew"]');await wait(()=>window.__homestead.stock.stew>0);await record('stew made');
 await wait(()=>window.__homestead.person.feelings.heartyMeal>window.__homestead.t,undefined,120000);await record('stew actually eaten');
 await p.click('[data-act="leisure"]');await wait(()=>window.__homestead.person.task?.place==='bench'&&window.__homestead.person.task.phase==='do'&&window.__homestead.person.feelings.flowers>window.__homestead.t);await pace(0);await record('stable home and chosen leisure');await shot('homestead-h24-grown-home');
 const before=await p.evaluate(()=>window.__homestead.t);await p.waitForTimeout(800);assert.equal(await p.evaluate(()=>window.__homestead.t),before);assert.deepEqual(errors,[]);
 await fs.writeFile(root+'HOMESTEAD-H24-UI.json',JSON.stringify({route:'new solo, normal UI only, no material/XP/state grants; mixed pause/16x; AI not human; world DAY=240s',engine:await browser.version(),events,errors},null,2));console.log('H24 PASS',events.at(-1));
}catch(e){console.error(e);throw e;}finally{await browser.close();}
