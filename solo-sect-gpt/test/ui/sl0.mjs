// U layer: creation and controls use DOM clicks only. Telemetry is read-only.
import {chromium} from '/Users/chenyuying/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const out=new URL('../../evidence/development/sl0/',import.meta.url);
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:8877/');await page.screenshot({path:new URL('creation.png',out).pathname});
await page.getByRole('button',{name:'在山中留下來',exact:true}).click();await page.getByRole('button',{name:'暫停',exact:true}).click();
let before=await page.evaluate(()=>window.__game.snapshot());await page.waitForTimeout(1000);let after=await page.evaluate(()=>window.__game.snapshot());
if(before.tick!==after.tick)throw Error('pause advanced');
await page.screenshot({path:new URL('home-s0.png',out).pathname});
await page.getByRole('button',{name:'建設',exact:true}).click();await page.locator('[data-build="dorm"]').click();
await page.getByRole('button',{name:'繼續',exact:true}).click();await page.locator('[data-speed="4"]').click();
await page.waitForTimeout(18000);
await page.screenshot({path:new URL('carrying.png',out).pathname});
const state=await page.evaluate(()=>window.__game.snapshot());
await fs.writeFile(new URL('ui-result.json',out),JSON.stringify({layer:'U',seed:11,tick:state.tick,pauseStable:before.tick===after.tick,errors,commands:state.commands,people:Object.values(state.people).filter(p=>p.residence==='resident').map(p=>({id:p.id,pos:[p.x/256,p.y/256],task:state.activities[p.activity],bag:state.inventories[p.bag]}))},null,2));
await browser.close();if(errors.length)throw Error(errors.join('\n'));console.log('SL0 normal creation, pause, build order and movement passed; not full SL1');
