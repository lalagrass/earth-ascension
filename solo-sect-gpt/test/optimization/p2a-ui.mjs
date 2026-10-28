import assert from'node:assert/strict';import{launch}from'./ui-kit.mjs';
// #372 P2-A (Mac local normal UI): with 掌門簿 closed (the new-game default), 導覽 opens on its own and is really visible; opening/closing
// 掌門簿 does not hide it; its own toggle, Escape and focus return work; the camera frame follows the canvas width. Usage: node p2a-ui.mjs <label> <w> <h>
const [label='initial',width='1440',height='900']=process.argv.slice(2),k=await launch('372-p2a-ui-'+label+'-'+width,{width:Number(width),height:Number(height)}),page=k.page,story={checks:[]};
const ok=(name,cond,detail)=>story.checks.push({name,pass:!!cond,detail});
const box=()=>page.evaluate(()=>{const n=document.querySelector('#nav-panel'),r=n.getBoundingClientRect(),cs=getComputedStyle(n);return{display:cs.display,w:Math.round(r.width),h:Math.round(r.height),inView:r.width>0&&r.height>0&&r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,hidden:n.hidden,expanded:document.querySelector('#nav-toggle').getAttribute('aria-expanded')};});
// The frame is span wide; its height is canvas CSS height x span / canvas CSS width, so it changes when the sidebar changes the canvas width.
const frameW=()=>page.evaluate(()=>{const f=document.querySelector('#nav-panel .navigation-frame'),c=document.querySelector('#world');return{h:Number(f?.getAttribute('height')),w:Number(f?.getAttribute('width')),cw:c.clientWidth,ch:c.clientHeight};});
const world=()=>page.evaluate(()=>JSON.stringify(window.__game.snapshot()));
let failure=null;
try{await k.open();await k.newGame();await k.pause(true);ok('book-closed-by-default',await page.locator('main.panel-hidden').count()===1);const w0=await world();
 await k.click('#nav-toggle');await page.waitForTimeout(200);let b=await box();story.closedBook=b;ok('visible-with-book-closed',b.display!=='none'&&b.w>0&&b.h>0&&b.inView&&!b.hidden&&b.expanded==='true',b);await k.shot('01-nav-book-closed');const fClosed=await frameW();
 await k.click('#panel-toggle');await page.waitForTimeout(200);b=await box();ok('visible-book-open',b.display!=='none'&&b.w>0&&b.inView,b);const fOpen=await frameW();story.frames={fClosed,fOpen};const exp=f=>f.ch*f.w/f.cw;ok('frame-follows-canvas',fClosed.cw!==fOpen.cw&&Math.abs(fClosed.h-exp(fClosed))<1&&Math.abs(fOpen.h-exp(fOpen))<1&&Math.abs(fOpen.h-fClosed.h)>1,story.frames);
 await k.click('#panel-toggle');await page.waitForTimeout(200);b=await box();ok('visible-book-closed-again',b.display!=='none'&&b.w>0&&b.inView,b);
 await k.click('#nav-toggle');await page.waitForTimeout(150);b=await box();ok('own-toggle-closes',b.hidden&&b.expanded==='false',b);await k.click('#nav-toggle');await page.waitForTimeout(150);
 await page.locator('#nav-panel [data-nav-layer="actors"]').focus();await page.keyboard.press('Escape');await page.waitForTimeout(150);b=await box();ok('escape-closes-focus-returns',b.hidden&&await page.evaluate(()=>document.activeElement?.id)==='nav-toggle',b);
 ok('paused-world-unchanged',(await world())===w0);ok('no-page-errors',k.errors.length===0,k.errors);await k.shot('02-end');
 const failed=story.checks.filter(c=>!c.pass);await k.log('done',{failed:failed.map(c=>c.name)});if(failed.length)throw Error('checks failed: '+failed.map(c=>c.name).join(', '));
}catch(e){failure=e.stack;await k.shot('failure').catch(()=>{});}
const s=await k.finish({label,viewport:[width,height],failure,story});console.log(failure?'FAILED':'PASSED',s.wallSeconds);if(failure){console.error(failure.split('\n')[0]);process.exit(1);}
