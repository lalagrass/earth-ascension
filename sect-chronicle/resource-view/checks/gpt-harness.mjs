import { createWorld,step,command } from '../../scene-shared/sources/gpt/solo-sect-gpt/src/world.mjs';
import { gptResources } from '../gpt.mjs';
import { resourcesHtml } from '../render.mjs';
import { createViewWriter } from '../../public-fix/view-state.mjs';
const world=createWorld({seed:11}),put=createViewWriter();
const order=command(world,{actor:'leader',type:'task',kind:'gather',args:{item:'herb'}});
function draw(){const rows=gptResources(world);document.querySelector('#source').textContent=rows[0].source;document.querySelector('#status').textContent=`原tick ${world.tick} · 原指令 ${order.ok?'已接受':order.reason}`;put('resources',document.querySelector('#resources'),resourcesHtml(rows));}
document.querySelector('#step').onclick=()=>{for(let n=0;n<400;n++)step(world);draw();};
window.resourceProof={snapshot:()=>({tick:world.tick,resources:gptResources(world),delivered:world.journal.filter(e=>e.type==='transfer'&&e.to==='store'&&e.item==='herb').length})};draw();
