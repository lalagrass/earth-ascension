// Normal-player journey driver. No evaluated writes or programmatic model commands.
import {chromium} from '/Users/chenyuying/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';import crypto from 'node:crypto';
const root=new URL('../../',import.meta.url),out=new URL('evidence/development/journey-01/',root);await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true}),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const snap=()=>page.evaluate(()=>window.__game.snapshot());
const log=async(label,data={})=>{await fs.appendFile(new URL('progress.jsonl',out),JSON.stringify({label,wall:new Date().toISOString(),tick:(await snap())?.tick,...data})+'\n');console.log(label);};
const click=async(selector)=>{await page.locator(selector).click();};
const tab=async(name)=>click('[data-tab="'+name+'"]');
const wait=async(fn,label,timeout=300000)=>{const start=Date.now();while(Date.now()-start<timeout){const w=await snap();if(fn(w)){await log(label);return w;}if(errors.length)throw Error(errors.join('\n'));await page.waitForTimeout(1500);}await page.screenshot({path:new URL('failure.png',out).pathname});await fs.writeFile(new URL('failure-world.json',out),JSON.stringify(await snap()));throw Error('timeout '+label);};
async function checkpoint(name){await click('#pause');if((await page.evaluate(()=>window.__game.status())).paused===false)await click('#pause');await tab('save');await click('[data-special="save"]');await page.waitForTimeout(1000);const text=await page.evaluate(()=>localStorage.getItem('solo-sect-gpt.chapter1.v1.manual'));await fs.writeFile(new URL(name+'.save.json',out),text);await page.screenshot({path:new URL(name+'.png',out).pathname});await log(name);await click('#pause');}
async function build(id){await tab('build');let old=(await snap()).facilities[id].stage;await click('[data-build="'+id+'"]');await wait(w=>w.facilities[id].stage>old,'built '+id,420000);}
try{
await page.goto('http://127.0.0.1:8877/');await click('button[type=submit]');await click('[data-speed="4"]');await log('new seed11 normal UI');
await build('dorm');await build('hall');await checkpoint('first-hall');
await tab('people');await click('[data-person="leader"]');await page.locator('#meal-goal').fill('12');await click('[data-action="goals"]');
for(const id of ['store','store','kitchen','kitchen','dining','dining','yard','yard','garden','herb','annex','hall','quiet'])await build(id);
await checkpoint('s2-construction');
await tab('people');await click('[data-person="leader"]');await click('[data-action="stop"]');await click('[data-person="amu"]');await click('[data-action="stop"]');await click('[data-person="leader"]');await page.locator('#target').selectOption('amu');
for(const kind of ['talk','encourage','care','teach']){await click('[data-social="'+kind+'"]');await wait(w=>!w.people.leader.activity,'social '+kind,120000);}
await click('[data-action="invite"]');await log('worker invitation result',{rank:(await snap()).people.amu.rank});await checkpoint('worker-invitation');
await fs.writeFile(new URL('result.json',out),JSON.stringify({layer:'U',status:'checkpoint',errors,tick:(await snap()).tick,commands:(await snap()).commands},null,2));
}catch(e){await fs.writeFile(new URL('error.txt',out),e.stack);console.error(e);process.exitCode=1;}finally{await browser.close();}
