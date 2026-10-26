import assert from'node:assert/strict';import{launch}from'./ui-kit.mjs';
// Normal-UI M22: a saved normal-UI game (journey-03), a real school lesson, adopt follow-ups, revisit, then re-invite and read Lin Qing's own answer. Usage: node m22-ui.mjs <label> <w> <h>
const [label='initial',width='1440',height='900']=process.argv.slice(2),k=await launch('m22-ui-'+label+'-'+width,{width:Number(width),height:Number(height)}),page=k.page,story={};
const save=new URL('../../evidence/development/journey-03/amu-joined.save.json',import.meta.url).pathname;
const line=async()=>{await k.tab('stories');const box=page.locator('#followups');await box.scrollIntoViewIfNeeded();return box.innerText();};
const free=async id=>{const w=await k.snap(),p=w.people[id];if(p.activity&&!['talk'].includes(w.activities[p.activity]?.kind)){await k.person(id);await k.click('[data-person-tab="life"]');await k.click('[data-action="stop"]');story.stopped=(story.stopped||[]).concat(id);}};
let failure=null;
try{await k.open();await k.newGame();await k.importSave(save);await k.calm();await k.person('leader');await k.tab('stories');await k.click('[data-special="school"]');let w=await k.until(x=>x.stories['recruit.school'].status==='completed','school-done',300000);
 story.before=await line();assert.match(story.before,/採用後續/);await k.click('[data-follow-adopt]');w=await k.snap();assert.equal(w.rulesVersion,'chapter1-follow-1',await k.toast());story.adopted=await line();assert.match(story.adopted,/還沒有兩位成年人結伴|還沒有和非門人/);await k.shot('01-adopted');
 for(const n of[1,2]){await free('lin');await free('leader');await line();await k.click('[data-followup="school"]');w=await k.snap();assert.ok(w.people.leader.activity,'segment started: '+await k.toast());w=await k.until(x=>x.followPlan.lines.school?.segs[n-1],'segment-'+n,300000);story['seg'+n]=await line();await k.shot('0'+(n+1)+'-segment-'+n);}
 story.answer=w.followPlan.lines.school.answer;story.journal=w.journal.filter(e=>e.type==='followup').map(e=>e.text);assert.match(story.seg2,/再邀（(答應|延後|婉拒)）/);assert.equal(w.people.lin.rank==='outer',false,'answer alone does not make lin join');
 await k.log('done',{answer:story.answer});
}catch(e){failure=e.stack;await k.shot('failure').catch(()=>{});}
const s=await k.finish({label,viewport:[width,height],failure,story});console.log(failure?'FAILED':'PASSED',s.wallSeconds);if(failure){console.error(failure);process.exit(1);}
