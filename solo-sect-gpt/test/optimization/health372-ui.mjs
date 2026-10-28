import assert from'node:assert/strict';import{launch}from'./ui-kit.mjs';
// #372 health mask (Mac local normal UI): a hurt undisclosed member (沈禾, normal-UI rescue save) and a full one show a health band, never hp/maxHp,
// in text, tooltip, aria-label or data-*; the bar width is the band's fixed width; the leader still shows exact hp; switching people, tabs and
// redraws while playing leave no old numbers. Usage: node health372-ui.mjs <label> <w> <h>
const [label='initial',width='1440',height='900']=process.argv.slice(2),k=await launch('372-health-ui-'+label+'-'+width,{width:Number(width),height:Number(height)}),page=k.page,story={checks:[]};
const hurt=new URL('../../evidence/development/u05-rescue-current/normal-failed-journey-rescued.save.json',import.meta.url).pathname;
const ok=(name,cond,detail)=>story.checks.push({name,pass:!!cond,detail});
const life=async id=>{await k.person(id);await k.click('[data-person-tab="life"]');};
// Everything a player or assistive tech can read in the side panel: text plus title / aria-label / data-* attributes and inline bar widths.
const surface=()=>page.evaluate(()=>{const p=document.querySelector('#panel'),attrs=[...p.querySelectorAll('*')].flatMap(n=>[...n.attributes].filter(a=>/^(title|aria-|data-|style)/.test(a.name)).map(a=>a.value));return{text:p.innerText,attrs:attrs.join('\n'),bar:p.querySelector('.bar.hp i')?.style.width||null};});
const leaks=(s,p)=>{const re=new RegExp('(^|\\D)'+Math.ceil(p.hp)+'\\s*/\\s*'+p.maxHp+'(\\D|$)');return re.test(s.text)||re.test(s.attrs)||new RegExp('生命\\s*'+Math.ceil(p.hp)+'\\b').test(s.text);};
let failure=null;
try{await k.open();await k.newGame();await k.importSave(hurt);let w=await k.snap();const shen=w.people.shen,amu=w.people.amu,lead=w.people.leader;
 await life('shen');let s=await surface();story.shen={bar:s.bar,excerpt:s.text.match(/健康[^\n]*/)?.[0]};ok('shen-band',/健康\s*重傷/.test(s.text),story.shen);ok('shen-no-exact',!leaks(s,shen));ok('shen-bar-band-width',s.bar==='30%',s.bar);await k.shot('01-shen-band');
 await life('amu');s=await surface();ok('amu-full-band',/健康\s*完好/.test(s.text)&&s.bar==='100%',s.bar);ok('amu-no-exact',!leaks(s,amu));
 await life('leader');s=await surface();ok('leader-exact',new RegExp('生命\\s*'+lead.hp+'/'+lead.maxHp).test(s.text),s.text.match(/生命[^\n]*/)?.[0]);
 await life('shen');await k.click('[data-person-tab="martial"]');await k.click('[data-person-tab="life"]');await k.until(x=>x.tick>w.tick+200,'redraws',60000,2);w=await k.snap();s=await surface();ok('after-redraw-no-exact',!leaks(s,w.people.shen),{hp:w.people.shen.hp});ok('after-redraw-band',/健康\s*(重傷|帶傷|輕傷|完好|倒地)/.test(s.text));
 for(const t of['people','travel','records','build']){await k.tab(t);s=await surface();ok('tab-'+t+'-no-exact',!leaks(s,w.people.shen)&&!leaks(s,w.people.amu));}
 await k.shot('02-end');ok('no-page-errors',k.errors.length===0,k.errors);
 const failed=story.checks.filter(c=>!c.pass);await k.log('done',{failed:failed.map(c=>c.name)});if(failed.length)throw Error('checks failed: '+failed.map(c=>c.name).join(', '));
}catch(e){failure=e.stack;await k.shot('failure').catch(()=>{});}
const s=await k.finish({label,viewport:[width,height],failure,story});console.log(failure?'FAILED':'PASSED',s.wallSeconds);if(failure){console.error(failure.split('\n')[0]);process.exit(1);}
