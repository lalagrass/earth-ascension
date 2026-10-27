import assert from'node:assert/strict';import fs from'node:fs/promises';import{launch}from'./ui-kit.mjs';
// Normal-UI M35, while the game is playing: values read as words; open sections stay with their person / art; keyboard focus survives redraws; Space acts on the focused control; a refused load keeps view state, a successful one resets it. Usage: node m35-ui.mjs <label> <w> <h>
const [label='initial',width='1440',height='900']=process.argv.slice(2),k=await launch('m35-ui-'+label+'-'+width,{width:Number(width),height:Number(height)}),page=k.page,story={checks:[]};
const demo=new URL('../../evidence/optimization/m30/showcase-m24-m30.save.json',import.meta.url).pathname,bad=new URL('bad.save.json',k.out).pathname;
const ok=(name,cond,detail)=>{story.checks.push({name,pass:!!cond,detail});};
const life=async id=>{await k.person(id);await k.click('[data-person-tab="life"]');};
const isOpen=sel=>page.locator(sel).first().evaluate(e=>e.open);
const openIt=async sel=>{if(!await isOpen(sel))await page.locator(sel+' > summary').first().click();};
const play=async ms=>{await k.speed(1);await k.pause(false);await page.waitForTimeout(ms);};
const active=()=>page.evaluate(()=>{const a=document.activeElement;return a?{tag:a.tagName,cmd:a.dataset?.intentCommand||null,text:a.textContent.trim().slice(0,20)}:null;});
let failure=null;
try{const x=JSON.parse(await fs.readFile(demo,'utf8'));x.checksum='0'.repeat(64);await fs.writeFile(bad,JSON.stringify(x));
 await k.open();await k.newGame();await k.importSave(demo);await play(300);
 // 1 values
 await life('amu');await openIt('section.public-intent details[data-view-key="intent"]');let t=await page.locator('section.public-intent').innerText();story.intentText=t.slice(0,400);ok('values-words',!/\btrue\b|\bfalse\b/.test(t)&&/明確停工：(是|否)/.test(t),t.match(/明確停工：[^\n·]*/)?.[0]);
 // 2 open state per person
 await openIt('details[data-section="work"]');await life('lin');ok('intent-not-shared',!await isOpen('section.public-intent details[data-view-key="intent"]'));ok('work-not-shared',!await isOpen('details[data-section="work"]'));await play(400);await life('amu');ok('amu-kept-intent',await isOpen('section.public-intent details[data-view-key="intent"]'));ok('amu-kept-work',await isOpen('details[data-section="work"]'));
 await k.person('amu');await k.click('[data-person-tab="martial"]');const arts=await page.locator('[data-person-art]').evaluateAll(b=>b.map(x=>x.dataset.personArt));if(arts.length>1){await k.click('[data-person-art="'+arts[0]+'"]');await openIt('#art-conditions');await k.click('[data-person-art="'+arts[1]+'"]');ok('art-not-shared',!await page.locator('#art-conditions').count()||!await isOpen('#art-conditions'),arts.slice(0,2));await k.click('[data-person-art="'+arts[0]+'"]');ok('art-kept',await isOpen('#art-conditions'));}else ok('art-not-shared',false,'only one art '+arts);
 await k.tab('build');await openIt('details[data-resource="veg"]');await life('lin');await k.tab('build');ok('resource-global',await isOpen('details[data-resource="veg"]'));
 // 3 focus and keys
 await life('amu');await play(100);const stop=page.locator('#p-cmds [data-action="stop"]');await stop.focus();await page.keyboard.press('Tab');const f0=await active();await page.evaluate(()=>{document.activeElement.__m35=1;});const t0=(await k.snap()).tick;await page.waitForTimeout(1500);const f1=await active();story.redrawn=await page.evaluate(()=>!document.activeElement.__m35);story.focusTicks=(await k.snap()).tick-t0;story.focus=[f0,f1];ok('focus-kept',f0?.cmd&&f1?.cmd===f0.cmd&&story.redrawn,[f0,f1,story.redrawn]);
 const n0=(await k.snap()).commands.length;await page.keyboard.press('Enter');await page.waitForTimeout(200);ok('enter-once',(await k.snap()).commands.length===n0+1);
 await life('amu');const sum=page.locator('section.public-intent details[data-view-key="policies"] > summary');await sum.focus();let p0=(await k.status()).paused;const o0=await isOpen('section.public-intent details[data-view-key="policies"]');await page.keyboard.press('Space');await page.waitForTimeout(200);ok('space-summary',(await k.status()).paused===p0&&await isOpen('section.public-intent details[data-view-key="policies"]')!==o0,{p0,o0});
 await page.locator('#p-cmds [data-action="resume"]').focus();const n1=(await k.snap()).commands.length;p0=(await k.status()).paused;await page.keyboard.press('Space');await page.waitForTimeout(200);ok('space-button',(await k.status()).paused===p0&&(await k.snap()).commands.length===n1+1,{p0});
 await page.evaluate(()=>document.activeElement?.blur());p0=(await k.status()).paused;await page.keyboard.press('Space');await page.waitForTimeout(200);ok('space-pauses',(await k.status()).paused!==p0);
 await k.shot('01-playing-focus');
 // 4 disabled readable
 await life('child');t=await page.locator('section.public-intent').innerText();story.childText=t.slice(0,300);const dis=await page.locator('#p-cmds button:disabled').count();ok('disabled-reason',dis===0||await page.locator('#p-cmds .intent-disabled').count()===dis,dis);
 // 5 loads
 await k.pause(true);await life('amu');await page.locator('#import-file');await k.tab('save');await page.locator('#import-file').setInputFiles(bad);await k.click('[data-special="import"]');await page.waitForTimeout(300);story.badToast=await k.toast();await life('amu');ok('refused-load-keeps',await isOpen('details[data-section="work"]'),story.badToast);
 await k.importSave(demo);await life('amu');ok('good-load-resets',!await isOpen('details[data-section="work"]')&&!await isOpen('section.public-intent details[data-view-key="intent"]'));await k.shot('02-after-load');
 ok('no-page-errors',k.errors.length===0,k.errors);
 const failed=story.checks.filter(c=>!c.pass);await k.log('done',{failed:failed.map(c=>c.name)});if(failed.length)throw Error('checks failed: '+failed.map(c=>c.name).join(', '));
}catch(e){failure=e.stack;await k.shot('failure').catch(()=>{});}
const s=await k.finish({label,viewport:[width,height],failure,story});console.log(failure?'FAILED':'PASSED',s.wallSeconds);if(failure){console.error(failure.split('\n')[0]);process.exit(1);}
