import assert from'node:assert/strict';import{launch}from'./ui-kit.mjs';
// Normal-UI M39: the start dialog shows each opening's look; 郭靖 / 令狐沖 cards use the same whole portrait, expandable to 3:4 and kept per person while playing;
// a renamed custom leader keeps the crop; an old 郭靖 save shows 郭靖; a missing image (labeled UI fixture: the browser answers 404) falls back once. Usage: node m39-ui.mjs <label> <w> <h>
const [label='initial',width='1440',height='900']=process.argv.slice(2),k=await launch('m39-ui-'+label+'-'+width,{width:Number(width),height:Number(height)}),page=k.page,story={dialog:{}};
const guoSave=new URL('../../evidence/development/u04-guo/normal-template-start.save.json',import.meta.url).pathname;
const life=async id=>{await k.person(id);await k.click('[data-person-tab="life"]');};
const card=()=>page.evaluate(()=>{const b=document.querySelector('#panel .portrait .portrait-box');return{appearance:b?.dataset.appearance,asset:b?.dataset.assetId||null,whole:!!b?.classList.contains('portrait-whole')};});
const expand=()=>page.locator('#panel details.portrait-expand');
let failure=null;
try{await k.open();
 // 1 start dialog: four openings
 for(const t of['custom','guo','linghu','yue']){await page.locator('#template').selectOption(t);const art=page.locator('#creation-art,.creation-art').first();story.dialog[t]={appearance:await art.getAttribute('data-appearance'),asset:await art.getAttribute('data-asset-id'),text:await art.innerText()};await k.shot('01-dialog-'+t);}
 assert.equal(story.dialog.guo.asset,'person.research.guojing.portrait');assert.equal(story.dialog.linghu.asset,'person.research.linghuchong.portrait');assert.equal(story.dialog.custom.asset,'person.hero.sheet');assert.equal(story.dialog.yue.appearance,'unsupported');assert.match(story.dialog.guo.text,/公開立繪/);assert.match(story.dialog.custom.text,/活動圖裁切/);
 // 2 郭靖: same portrait, expand to 3:4, kept per person while playing
 await page.locator('#template').selectOption('guo');await k.newGame();await life('leader');let c=await card();assert.deepEqual(c,{appearance:'known',asset:'person.research.guojing.portrait',whole:true});
 await expand().locator('summary').click();const img=expand().locator('img.portrait-full');await img.waitFor();await page.waitForFunction(()=>document.querySelector('#panel img.portrait-full')?.naturalWidth>0);const box=await img.boundingBox(),nat=await img.evaluate(e=>[e.naturalWidth,e.naturalHeight]);story.full={box,nat};assert.deepEqual(nat,[864,1152]);assert.ok(Math.abs(box.width/box.height-0.75)<0.01,'3:4');await k.shot('02-guo-expanded');
 let t0=(await k.snap()).tick;await k.until(x=>x.tick>t0+60,'playing',60000,1);assert.equal(await expand().evaluate(e=>e.open),true,'kept open while playing');await life('amu');assert.equal(await expand().count(),0,'amu has no portrait');assert.equal((await card()).appearance,'unsupported');await life('child');assert.equal((await card()).appearance,'missing');await life('leader');assert.equal(await expand().evaluate(e=>e.open),true);
 // keyboard: Space on the summary toggles it and does not pause
 const sum=expand().locator('summary');await sum.focus();const p0=(await k.status()).paused;await page.keyboard.press('Space');await page.waitForTimeout(200);assert.equal(await expand().evaluate(e=>e.open),false);assert.equal((await k.status()).paused,p0);await page.keyboard.press('Space');await page.waitForTimeout(200);assert.equal(await expand().evaluate(e=>e.open),true);
 // long background next to the portrait
 await page.locator('#panel .portrait+.public-profile .public-background summary').click();story.layout=await page.evaluate(()=>{const p=document.querySelector('#panel');return{scrollW:p.scrollWidth,clientW:p.clientWidth};});assert.ok(story.layout.scrollW<=story.layout.clientW+1,'no sideways overflow');await k.shot('03-guo-background');
 // 3 令狐沖
 await k.open();await page.locator('#template').selectOption('linghu');await k.newGame();await life('leader');c=await card();assert.equal(c.asset,'person.research.linghuchong.portrait');await expand().locator('summary').click();await page.waitForFunction(()=>document.querySelector('#panel img.portrait-full')?.naturalWidth>0);assert.deepEqual(await expand().locator('img.portrait-full').evaluate(e=>[e.naturalWidth,e.naturalHeight]),[480,640]);await k.shot('04-linghu');
 // 4 custom renamed 郭靖 keeps the crop; an old 郭靖 save shows 郭靖
 await k.open();await page.locator('#template').selectOption('custom');await page.locator('#creation [name="name"]').fill('郭靖');await k.newGame();await life('leader');c=await card();assert.equal(c.asset,'person.hero.sheet');assert.equal(c.whole,false);assert.equal(await expand().count(),0);
 await k.importSave(guoSave);await life('leader');c=await card();assert.equal(c.asset,'person.research.guojing.portrait');await k.shot('05-old-guo-save');
 // 5 missing image (labeled UI fixture: the page's request for guojing.png gets a 404)
 const hits=[];await page.route('**/assets/shared/3079a03/guojing.png',r=>{hits.push(Date.now());return r.fulfill({status:404,body:'missing'});});
 await k.open();await page.locator('#template').selectOption('guo');await page.waitForFunction(()=>document.querySelector('.creation-art')?.dataset.appearance==='failed');story.dialogMissing=await page.locator('.creation-art').innerText();assert.match(story.dialogMissing,/本地圖片缺失/);await k.newGame();await life('leader');await page.waitForTimeout(300);story.missingCard=await page.locator('#panel .portrait').innerText();assert.equal((await card()).appearance,'failed');assert.match(await page.locator('#panel').innerText(),/本地圖片缺失，使用文字代替。/);assert.match(story.missingCard,/郭靖/);
 const n0=hits.length;t0=(await k.snap()).tick;await k.until(x=>x.tick>t0+60,'playing-missing',60000,1);await life('leader');story.requests={before:n0,after:hits.length};assert.equal(hits.length,n0,'no new request after the first failure');assert.ok(await page.locator('#p-cmds button').count()>0,'buttons still there');await k.shot('06-missing-image');
 await k.log('done',{requests:story.requests});
}catch(e){failure=e.stack;await k.shot('failure').catch(()=>{});}
const s=await k.finish({label,viewport:[width,height],failure,story});console.log(failure?'FAILED':'PASSED',s.wallSeconds);if(failure){console.error(failure);process.exit(1);}
