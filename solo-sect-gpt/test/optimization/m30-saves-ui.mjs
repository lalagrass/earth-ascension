import assert from'node:assert/strict';import{launch}from'./ui-kit.mjs';
// Normal-UI M30: older saves (M16 and M23 showcases, GPT development journey-03) import and keep running; a remembered pack move falls back after importing a save without packs. Usage: node m30-saves-ui.mjs <label> <w> <h>
const [label='initial',width='1440',height='900']=process.argv.slice(2),k=await launch('m30-saves-ui-'+label+'-'+width,{width:Number(width),height:Number(height)}),page=k.page,story={runs:[]};
const ev=p=>new URL('../../evidence/'+p,import.meta.url).pathname;
let failure=null;
try{await k.open();await k.newGame();
 for(const f of['optimization/showcase-m16/showcase-m12-m16.save.json','optimization/showcase-m23/showcase-m17-m23.save.json','development/journey-03/amu-joined.save.json','optimization/m30/showcase-m24-m30.save.json']){await k.importSave(ev(f));const w0=await k.snap();const w=await k.until(x=>x.tick>=w0.tick+600,'run-'+f.split('/').at(-1),120000,4);story.runs.push({file:f,rules:w.rulesVersion,from:w0.tick,to:w.tick});assert.equal(k.errors.length,0,k.errors.join('\n'));for(const t of['people','build','records','travel'])await k.tab(t);}
 await k.importSave(ev('optimization/m30/showcase-m24-m30.save.json'));await k.person('amu');await k.click('[data-person-tab="martial"]');await k.click('[data-person-art="punch"]');await k.click('[data-person-move="advanced.closefist"]');await k.importSave(ev('optimization/candidate/final.save.json'));await k.person('leader');await k.click('[data-person-tab="martial"]');story.fallback=await page.locator('#art-detail').innerText();assert.match(story.fallback,/已回到招式清單|改看/);assert.equal(k.errors.length,0);await k.shot('pack-fallback');
 await k.log('done',{runs:story.runs.length});
}catch(e){failure=e.stack;await k.shot('failure').catch(()=>{});}
const s=await k.finish({label,viewport:[width,height],failure,story});console.log(failure?'FAILED':'PASSED',s.wallSeconds);if(failure){console.error(failure);process.exit(1);}
