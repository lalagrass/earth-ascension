import assert from'node:assert/strict';import{launch}from'./ui-kit.mjs';
// Normal-UI M9: showcase import, adopt the ledger, one real activity day per focus at 4x. Usage: node m9-ui.mjs <label> <w> <h>
const [label='initial',width='1440',height='900']=process.argv.slice(2),k=await launch('m9-ui-'+label+'-'+width,{width:Number(width),height:Number(height)}),page=k.page;
const showcase=new URL('../../evidence/optimization/showcase/showcase-all-features.save.json',import.meta.url).pathname,DAY=12000,days={};
const read=async()=>({stock:await page.locator('#ops-stock').innerText(),time:await page.locator('#ops-time').innerText(),blocked:await page.locator('#ops-blocked').innerText(),yesterday:await page.locator('#ops-yesterday').innerText()});
const capture=async name=>{await k.tab('ops');const text=await read();for(const id of['#ops-stock','#ops-time','#ops-blocked'])assert.ok((await page.locator(id).innerText()).length>10,id);await page.locator('#ops-stock').scrollIntoViewIfNeeded();await k.shot(name+'-a-stock');await page.locator('#ops-blocked').scrollIntoViewIfNeeded();await k.shot(name+'-b-time-blocked');return text;};
let failure=null;
try{await k.open();await k.newGame();await k.importSave(showcase);await k.tab('ops');await k.shot('00-before-adopt');await k.click('[data-ops-adopt]');let w=await k.snap();assert.equal(w.rulesVersion,'chapter1-ops-1');
 for(const focus of['food','train']){await k.tab('ops');await k.click('[data-ops-focus="'+focus+'"]');w=await k.snap();assert.equal(w.policy,focus);const start=w.tick,fullDay=Math.floor(start/DAY)+(start%DAY>0?1:0);await k.log('focus-'+focus,{tick:start,fullDay});
  w=await k.until(x=>Math.floor(x.tick/DAY)===fullDay&&x.tick%DAY>=11900,'end-of-full-day-'+focus,600000);await k.tab('ops');days[focus]=await capture('focus-'+focus);days[focus].ticksRun=w.tick-start;await k.log('captured-'+focus,{ticksRun:w.tick-start,yesterday:days[focus].yesterday});}
 assert.notEqual(days.food.stock,days.train.stock,'two full days recorded different flows');
}catch(e){failure=e.stack;await k.shot('failure').catch(()=>{});}
const s=await k.finish({label,viewport:[width,height],failure,days});console.log(failure?'FAILED':'PASSED',s.wallSeconds);if(failure){console.error(failure);process.exit(1);}
