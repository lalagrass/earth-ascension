// Normal-UI driver for M7–M11: only forms, buttons and canvas clicks; window.__game is read-only telemetry.
import{chromium}from'/Users/chenyuying/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';import fs from'node:fs/promises';import{createHash}from'node:crypto';
export const PORT=Number(process.env.SOLO_PORT||8879);
export async function launch(dir,viewport={width:1440,height:900}){const out=new URL('../../evidence/optimization/'+dir+'/',import.meta.url);await fs.mkdir(out,{recursive:true});const fp={};for(const f of(await fs.readdir(new URL('../../src/',import.meta.url))).filter(f=>f.endsWith('.mjs')).sort())fp[f]=createHash('sha256').update(await fs.readFile(new URL('../../src/'+f,import.meta.url))).digest('hex');await fs.writeFile(new URL('runtime-fingerprint.json',out),JSON.stringify({recordedAt:new Date().toISOString(),viewport,files:fp},null,2));
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true}),page=await browser.newPage({viewport}),errors=[],steps=[],started=Date.now();page.on('pageerror',e=>errors.push(e.stack||e.message));
 const k={out,page,errors,steps,browser,
  snap:()=>page.evaluate(()=>window.__game.snapshot()),status:()=>page.evaluate(()=>window.__game.status()),
  click:async s=>{await page.locator(s).first().click();},
  pause:async v=>{for(let i=0;i<6&&(await k.status()).paused!==v;i++){await k.click('#pause');await page.waitForTimeout(60);}if((await k.status()).paused!==v)throw Error('pause toggle did not take effect');},
  speed:async n=>k.click('[data-speed="'+n+'"]'),
  tab:async t=>{if(await page.locator('main.panel-hidden').count())await k.click('#panel-toggle');await k.click('[data-tab="'+t+'"]');},
  person:async id=>{await k.tab('people');await k.click('[data-person="'+id+'"]');},
  toast:()=>page.locator('#toast').textContent(),
  shot:async name=>{await page.screenshot({path:new URL(name+'.png',out).pathname});},
  log:async(label,data={})=>{const w=await k.snap();const row={label,wallSeconds:(Date.now()-started)/1000,tick:w?.tick,...data};steps.push(row);console.log(label,JSON.stringify(data).slice(0,200));return row;},
  open:async()=>{await page.goto('http://127.0.0.1:'+PORT+'/');await page.waitForFunction(()=>window.__game);},
  newGame:async()=>{await k.click('button[type=submit]');await k.pause(true);},
  importSave:async file=>{await k.tab('save');await page.locator('#import-file').setInputFiles(file);await k.click('[data-special="import"]');await k.click('#confirm-import');await k.pause(true);},
  until:async(fn,label,timeoutMs=240000,speed=4)=>{await k.speed(speed);await k.pause(false);const t0=Date.now();while(Date.now()-t0<timeoutMs){const w=await k.snap();if(fn(w)){await k.pause(true);await k.log(label);return k.snap();}if(errors.length)throw Error(errors.join('\n'));await page.waitForTimeout(200);}await k.pause(true);const w=await k.snap();await fs.writeFile(new URL('failure-world.json',out),JSON.stringify(w));throw Error('UI timeout: '+label);},
  calm:async()=>{for(const p of Object.values((await k.snap()).people).filter(p=>p.adult&&p.residence==='resident')){await k.person(p.id);await k.click('[data-action="stop"]');if((await k.snap()).people[p.id].auto)await k.click('[data-action="toggleAuto"]');}},
  finish:async(extra={})=>{const summary={source:'normal UI only (forms/buttons); no World injection',wallSeconds:(Date.now()-started)/1000,errors,steps,...extra};await fs.writeFile(new URL('summary.json',out),JSON.stringify(summary,null,2));await browser.close();return summary;}};
 return k;}
